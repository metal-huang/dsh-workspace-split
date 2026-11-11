/**
 * Archived-Session rules for the split grid.
 *
 * Archiving is a Workspace-registry fact, not a Session-catalog change, so these
 * rules are what keep a tile from holding a Session the reader put away. Plain
 * objects stand in for the snapshot and the cell list.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  archivedSessionIds,
  isArchivedSession,
  pickableSessions,
  reconcileCells,
  restoredActiveCell,
  runningState,
} from '../packages/dsh-workspace-split/src/session-state.js'

const ids = (...values) => new Set(values)

describe('restoredActiveCell', () => {
  it('clamps an oversized index like the runtime shrink path', () => {
    // Refreshing with saved=5 on a 2×2 grid must land where the live shrink
    // (Math.min(prev, size - 1)) would: tile 3, not tile 0.
    assert.equal(restoredActiveCell({ activeCell: 5 }, 4), 3)
    assert.equal(restoredActiveCell({ activeCell: 3 }, 4), 3)
  })

  it('falls back to tile 0 for invalid or missing values', () => {
    assert.equal(restoredActiveCell({}, 4), 0)
    assert.equal(restoredActiveCell(undefined, 4), 0)
    assert.equal(restoredActiveCell({ activeCell: -1 }, 4), 0)
    assert.equal(restoredActiveCell({ activeCell: 1.5 }, 4), 0)
    assert.equal(restoredActiveCell({ activeCell: '2' }, 4), 0)
    assert.equal(restoredActiveCell({ activeCell: 2 }, 0), 0)
  })
})

describe('archivedSessionIds', () => {
  it('reads the archive set off a Workspace snapshot', () => {
    assert.deepEqual([...archivedSessionIds({ archivedSessionIds: ['a', 'b'] })], ['a', 'b'])
  })

  it('treats a missing or non-array set as empty', () => {
    assert.equal(archivedSessionIds({}).size, 0)
    assert.equal(archivedSessionIds({ archivedSessionIds: null }).size, 0)
    assert.equal(archivedSessionIds({ archivedSessionIds: 'a' }).size, 0)
    assert.equal(archivedSessionIds(undefined).size, 0)
    assert.equal(archivedSessionIds(null).size, 0)
  })

  it('stringifies ids so a numeric id still matches', () => {
    const archived = archivedSessionIds({ archivedSessionIds: [42] })
    assert.equal(archived.has('42'), true)
    assert.equal(isArchivedSession(archived, '42'), true)
    assert.equal(isArchivedSession(archived, 42), true)
  })
})

describe('isArchivedSession', () => {
  it('answers membership by value', () => {
    const archived = ids('a')
    assert.equal(isArchivedSession(archived, 'a'), true)
    assert.equal(isArchivedSession(archived, 'b'), false)
  })

  it('treats an absent id or set as not archived', () => {
    assert.equal(isArchivedSession(ids('a'), null), false)
    assert.equal(isArchivedSession(ids('a'), undefined), false)
    assert.equal(isArchivedSession(undefined, 'a'), false)
    assert.equal(isArchivedSession({}, 'a'), false)
  })
})

describe('pickableSessions', () => {
  it('drops archived rows and keeps the caller order', () => {
    const rows = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    assert.deepEqual(pickableSessions(rows, ids('b')), [{ id: 'a' }, { id: 'c' }])
  })

  it('drops null rows and survives a missing archive set', () => {
    assert.deepEqual(pickableSessions([{ id: 'a' }, null, undefined], ids()), [{ id: 'a' }])
    assert.deepEqual(pickableSessions([{ id: 'a' }], undefined), [{ id: 'a' }])
  })

  it('returns an empty list for a non-array input', () => {
    assert.deepEqual(pickableSessions(undefined, ids('a')), [])
  })
})

describe('reconcileCells', () => {
  const known = ids('alive', 'gone', 'archived')

  it('empties a Session cell whose Session was archived', () => {
    const cells = [{ t: 'session', id: 'archived' }]
    assert.deepEqual(reconcileCells(cells, known, ids('archived')), [null])
  })

  it('keeps the project scope of an archived Workspace cell', () => {
    const cells = [{ t: 'workspace', ws: 'p1', id: 'archived' }]
    assert.deepEqual(reconcileCells(cells, known, ids('archived')), [
      { t: 'workspace', ws: 'p1', id: null },
    ])
  })

  it('treats an unknown Session the same way', () => {
    assert.deepEqual(reconcileCells([{ t: 'session', id: 'gone' }], ids('alive'), ids()), [null])
    assert.deepEqual(
      reconcileCells([{ t: 'workspace', ws: 'p1', id: 'gone' }], ids('alive'), ids()),
      [{ t: 'workspace', ws: 'p1', id: null }],
    )
  })

  it('leaves known, unarchived cells and empty slots alone', () => {
    const cells = [{ t: 'session', id: 'alive' }, null, { t: 'workspace', ws: 'p1', id: null }]
    assert.deepEqual(reconcileCells(cells, known, ids('archived')), cells)
  })

  it('returns the very same array when nothing changed', () => {
    const cells = [{ t: 'session', id: 'alive' }, null]
    assert.equal(reconcileCells(cells, known, ids()), cells)
    assert.equal(reconcileCells(cells, known, undefined), cells)
  })

  it('releases nothing extra when the archive set is empty', () => {
    // A known-but-unarchived Session must survive: the empty set means "nothing
    // is archived", not "nothing is usable".
    const cells = [
      { t: 'session', id: 'alive' },
      { t: 'session', id: 'archived' },
    ]
    assert.equal(reconcileCells(cells, known, ids()), cells)
  })
})

describe('runningState', () => {
  it('prefers a ready Host catalog over a stale retained binding', () => {
    const catalog = { phase: 'ready', byId: { s1: { running: false } } }
    assert.equal(runningState(catalog, 's1', { running: true }), false)
    catalog.byId.s1.running = true
    assert.equal(runningState(catalog, 's1', { running: false }), true)
  })

  it('falls back to the binding while the catalog is not ready', () => {
    const catalog = { phase: 'pending', byId: { s1: { running: false } } }
    assert.equal(runningState(catalog, 's1', { running: true }), true)
    assert.equal(runningState(catalog, 's1', { running: false }), false)
    assert.equal(runningState(undefined, 's1', { running: true }), true)
    assert.equal(runningState(undefined, 's1', undefined), false)
  })
})
