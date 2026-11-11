/**
 * The native-follow decision is the safety core of the split panel's
 * openSession + re-select workaround: every branch below maps to a way the
 * naive call either throws, destroys the native subagent view, or re-retains
 * the same Session on every click.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { nativeSyncTarget } from '../packages/dsh-workspace-split/src/native-context.js'

// Field names mirror the public SessionSummary: the link is `parentId`, not
// the internal lineage record's `parentSessionId` (renamed in the DSH list
// snapshot mapping); dsh-contract.test.js pins that mapping.
const rows = {
  's-parent': { id: 's-parent' },
  's-other': { id: 's-other' },
  's-child': { id: 's-child', origin: 'subagent', parentId: 's-parent' },
  's-archived': { id: 's-archived' },
}
const archived = new Set(['s-archived'])

function decide(overrides = {}) {
  return nativeSyncTarget({
    targetId: 's-parent',
    byId: rows,
    archived,
    archivedReady: true,
    currentKey: 's-other',
    ...overrides,
  })
}

describe('nativeSyncTarget', () => {
  it('follows an occupied tile whose Session is not the native current', () => {
    assert.equal(decide(), 's-parent')
  })

  it('ignores an empty or absent tile', () => {
    assert.equal(decide({ targetId: null }), null)
    assert.equal(decide({ targetId: undefined }), null)
    assert.equal(decide({ targetId: '' }), null)
  })

  it('waits for a freshly created Session to reach the catalog', () => {
    // sessions.create resolves before the Host session-added event: retaining
    // the id here would throw `sessions.retain: unknown session`.
    assert.equal(decide({ targetId: 's-late' }), null)
    const withLate = { ...rows, 's-late': { id: 's-late' } }
    assert.equal(decide({ targetId: 's-late', byId: withLate }), 's-late')
  })

  it('never opens an archived Session as the native current', () => {
    assert.equal(decide({ targetId: 's-archived' }), null)
  })

  it('waits for the Workspace archive baseline before any sync', () => {
    // A pending Workspace snapshot carries an empty archivedSessionIds: a
    // restored archived tile would pass the archived guard, and DSH would
    // clear the main view (ejecting the split panel) once the baseline lands.
    assert.equal(decide({ archivedReady: false }), null)
    assert.equal(decide({ archivedReady: undefined }), null)
    assert.equal(decide({ archivedReady: false, targetId: 's-archived' }), null)
  })

  it('is a no-op when the native current already is the tile Session', () => {
    // mousedown and focus capture both activate a tile; without this guard
    // each click would re-retain and rewrite the persisted selection twice.
    assert.equal(decide({ currentKey: 's-parent' }), null)
  })

  it('leaves the native subagent view alone on its parent tile', () => {
    // The current key is the child id; opening the parent would release the
    // child's mainView reference and destroy the view being read.
    assert.equal(decide({ currentKey: 's-child' }), null)
  })

  it('still syncs on activation when the native subagent view belongs to another Session', () => {
    const foreignChild = { id: 's-foreign-child', origin: 'subagent', parentId: 's-other' }
    const byId = { ...rows, 's-foreign-child': foreignChild }
    assert.equal(decide({ byId, currentKey: 's-foreign-child' }), 's-parent')
  })

  it('spares any native subagent view during background re-syncs', () => {
    // Catalog churn is not a user action: it must never tear down the view the
    // reader is inspecting, whatever Session that view belongs to.
    const foreignChild = { id: 's-foreign-child', origin: 'subagent', parentId: 's-other' }
    const byId = { ...rows, 's-foreign-child': foreignChild }
    assert.equal(decide({ byId, currentKey: 's-foreign-child', background: true }), null)
    assert.equal(decide({ currentKey: 's-child', background: true }), null)
    assert.equal(decide({ background: true }), 's-parent')
  })

  it('compares ids by value so a numeric id cannot defeat the guards', () => {
    // normalizeCell enforces string ids on tiles, but the Host can hand out
    // numeric ids; a strict === would re-open the Session on every snapshot.
    const numericRows = { 42: { id: 42 }, 's-other': { id: 's-other' } }
    assert.equal(decide({ targetId: 42, byId: numericRows, currentKey: '42' }), null)
    assert.equal(decide({ targetId: 42, byId: numericRows, currentKey: 42 }), null)
    assert.equal(decide({ targetId: 42, byId: numericRows }), '42')
    const numericChild = { id: 7, origin: 'subagent', parentId: 42 }
    const withChild = { ...numericRows, 7: numericChild }
    assert.equal(decide({ targetId: 42, byId: withChild, currentKey: 7 }), null)
  })

  it('follows a tile that itself holds a subagent Session', () => {
    assert.equal(decide({ targetId: 's-child', currentKey: 's-other' }), 's-child')
  })

  it('syncs when the native main view is empty', () => {
    // DSH startup restore uses 'preserve' and never closes the panel; blocking
    // on an undefined key would wedge the feature on an empty native view.
    assert.equal(decide({ currentKey: undefined }), 's-parent')
    assert.equal(decide({ currentKey: null }), 's-parent')
  })

  it('tolerates a current key the catalog does not know', () => {
    assert.equal(decide({ currentKey: 's-gone' }), 's-parent')
  })
})
