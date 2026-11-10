/**
 * Empty-tile creation drafts and target inheritance.
 *
 * The tile used to mint a Session as soon as it rendered; these rules are what
 * let it wait for an explicit click while keeping one identity per tile across
 * retries and renderer reloads. They are React-free on purpose so they can be
 * tested directly.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { CellDrafts, newChatTarget } from '../packages/dsh-workspace-split/src/new-chat.js'

/** In-memory localStorage stand-in. */
function storage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    values,
  }
}

/** Deterministic mint so tests can name the identity they expect. */
function minter() {
  let next = 0
  return () => {
    next += 1
    return `session-${next}`
  }
}

describe('CellDrafts', () => {
  it('mints one identity per tile and target, and reuses it on retry', async () => {
    const store = storage()
    const drafts = new CellDrafts(store, minter())
    const requests = []
    const create = async (request) => {
      requests.push(request)
      return { ok: true, value: { sessionId: request.sessionId } }
    }

    assert.equal(await drafts.ensure(0, { workspaceId: 'w1' }, create), 'session-1')
    // A settled creation stays cached: the tile cannot mint a second Session.
    assert.equal(await drafts.ensure(0, { workspaceId: 'w1' }, create), 'session-1')
    assert.deepEqual(
      requests.map((request) => request.sessionId),
      ['session-1'],
    )
    assert.equal(requests[0].workspaceId, 'w1')
  })

  it('deduplicates concurrent creation for one tile', async () => {
    const drafts = new CellDrafts(storage(), minter())
    let calls = 0
    let release
    const gate = new Promise((resolve) => {
      release = resolve
    })
    const create = async () => {
      calls += 1
      await gate
      return { ok: true, value: { sessionId: 's' } }
    }

    const first = drafts.ensure(0, { workspaceId: 'w1' }, create)
    const second = drafts.ensure(0, { workspaceId: 'w1' }, create)
    assert.equal(first, second)
    release()
    await first
    assert.equal(calls, 1)
  })

  it('keeps a different identity for a different target', async () => {
    const drafts = new CellDrafts(storage(), minter())
    const create = async (request) => ({ ok: true, value: { sessionId: request.sessionId } })
    assert.equal(await drafts.ensure(0, { workspaceId: 'w1' }, create), 'session-1')
    assert.equal(await drafts.ensure(0, { cwd: 'C:/work' }, create), 'session-2')
  })

  it('forgets one tile without touching the others', async () => {
    const drafts = new CellDrafts(storage(), minter())
    const create = async (request) => ({ ok: true, value: { sessionId: request.sessionId } })
    await drafts.ensure(0, { workspaceId: 'w1' }, create)
    await drafts.ensure(1, { workspaceId: 'w1' }, create)
    drafts.forget(0)
    assert.equal(await drafts.ensure(0, { workspaceId: 'w1' }, create), 'session-3')
    assert.equal(await drafts.ensure(1, { workspaceId: 'w1' }, create), 'session-2')
  })

  it('retries after a failed creation with the same identity', async () => {
    const drafts = new CellDrafts(storage(), minter())
    let attempts = 0
    const create = async (request) => {
      attempts += 1
      if (attempts === 1) return { ok: false, error: { message: 'refused' } }
      return { ok: true, value: { sessionId: request.sessionId } }
    }
    await assert.rejects(drafts.ensure(0, { workspaceId: 'w1' }, create), /refused/)
    assert.equal(await drafts.ensure(0, { workspaceId: 'w1' }, create), 'session-1')
  })

  it('survives unavailable storage and malformed saved identities', async () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    const drafts = new CellDrafts(broken, minter())
    const create = async (request) => ({ ok: true, value: { sessionId: request.sessionId } })
    assert.equal(await drafts.ensure(0, { workspaceId: 'w1' }, create), 'session-1')

    const malformed = new CellDrafts(storage({ 'dsws-new-chat-ids': '[]' }), minter())
    assert.equal(await malformed.ensure(0, { workspaceId: 'w1' }, create), 'session-1')
  })
})

describe('newChatTarget', () => {
  const workspaces = [{ workspaceId: 'w1', sessionIds: ['s1'] }]
  const items = [
    { id: 's1', cwd: 'C:/one' },
    { id: 's2', cwd: 'C:/two' },
  ]

  it('uses the tile Workspace first', () => {
    assert.deepEqual(newChatTarget({ t: 'workspace', ws: 'w9' }, null, items, workspaces), {
      workspaceId: 'w9',
    })
  })

  it('inherits the tile Session project, then the active tile', () => {
    assert.deepEqual(
      newChatTarget({ t: 'session', id: 's1' }, { t: 'workspace', ws: 'w9' }, items, workspaces),
      { workspaceId: 'w1' },
    )
    assert.deepEqual(newChatTarget(null, { t: 'session', id: 's2' }, items, workspaces), {
      cwd: 'C:/two',
    })
  })

  it('falls back to a recent Session and then the first Workspace', () => {
    const ungrouped = [{ id: 's9', cwd: 'C:/nine' }]
    assert.deepEqual(newChatTarget(null, null, ungrouped, workspaces), { cwd: 'C:/nine' })
    assert.deepEqual(newChatTarget(null, null, [], workspaces), { workspaceId: 'w1' })
  })

  it('returns an empty target when no project is known', () => {
    assert.deepEqual(newChatTarget(null, null, [], []), {})
  })
})
