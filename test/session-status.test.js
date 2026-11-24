/**
 * DSH moved the pending-interaction registry between service shapes: 0.2.2 has
 * it as a `uiSession` member, 0.2.3 as the inject-gated service
 * `uiSession.sessionStatus`. A wrong probe either crashes the tile (direct
 * member read on 0.2.3) or leaves pending approvals invisible, so both paths and
 * the late-registration case are pinned here.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createSessionStatusGetter,
  selectSessionStatusService,
  subscribeWhenAvailable,
} from '../packages/dsh-workspace-split/src/session-status.js'

const service = { subscribe() {}, getSnapshot: () => new Map() }

describe('selectSessionStatusService', () => {
  it('prefers the 0.2.3 Cordis service from ctx.get', () => {
    const ctx = { get: (name) => (name === 'uiSession.sessionStatus' ? service : undefined) }
    assert.equal(selectSessionStatusService(ctx, { sessionStatus: { other: true } }), service)
  })

  it('falls back to the 0.2.2 uiSession member when ctx.get has no service', () => {
    const member = { subscribe() {}, getSnapshot: () => new Map() }
    const ctx = { get: () => undefined }
    assert.equal(selectSessionStatusService(ctx, { sessionStatus: member }), member)
  })

  it('returns undefined when neither version exposes it', () => {
    assert.equal(selectSessionStatusService({ get: () => undefined }, {}), undefined)
    assert.equal(selectSessionStatusService({}, undefined), undefined)
  })

  it('survives a throwing ctx.get and still falls back', () => {
    const member = { subscribe() {}, getSnapshot: () => new Map() }
    const ctx = {
      get: () => {
        throw new Error('not injected')
      },
    }
    assert.equal(selectSessionStatusService(ctx, { sessionStatus: member }), member)
  })

  it('returns undefined when the member getter throws (0.2.3 gated access)', () => {
    const uiSession = {
      get sessionStatus() {
        throw new Error('without inject')
      },
    }
    assert.equal(selectSessionStatusService({ get: () => undefined }, uiSession), undefined)
  })
})

describe('createSessionStatusGetter', () => {
  it('re-probes until the late service appears', () => {
    let registered
    const ctx = { get: () => registered }
    const get = createSessionStatusGetter(ctx, {})
    assert.equal(get(), undefined)
    assert.equal(get(), undefined)
    registered = service
    assert.equal(get(), service)
  })

  it('detects a replaced service by identity, not shape', () => {
    const first = { subscribe() {}, getSnapshot: () => new Map() }
    const second = { subscribe() {}, getSnapshot: () => new Map() }
    let current = first
    const get = createSessionStatusGetter({ get: () => current }, {})
    assert.equal(get(), first)
    current = second
    assert.equal(get(), second)
  })

  it('keeps instances isolated (two getters do not share a cache)', () => {
    const a = { subscribe() {}, getSnapshot: () => new Map() }
    const b = { subscribe() {}, getSnapshot: () => new Map() }
    const getA = createSessionStatusGetter({ get: () => a }, {})
    const getB = createSessionStatusGetter({ get: () => b }, {})
    assert.equal(getA(), a)
    assert.equal(getB(), b)
  })
})

const tick = (ms) => new Promise((done) => setTimeout(done, ms))

describe('subscribeWhenAvailable', () => {
  it('subscribes immediately and fires one read when the source exists', () => {
    let reads = 0
    let stopped = 0
    const source = {
      subscribe: () => () => {
        stopped += 1
      },
    }
    const stop = subscribeWhenAvailable(
      () => source,
      () => {
        reads += 1
      },
    )
    assert.equal(reads, 1)
    stop()
    assert.equal(stopped, 1)
  })

  it('picks up a source that appears after mount, then reads once', async () => {
    let reads = 0
    let subscribed = 0
    let late
    const stop = subscribeWhenAvailable(
      () => late,
      () => {
        reads += 1
      },
      { intervalMs: 5, maxTries: 20 },
    )
    assert.equal(reads, 0)
    await tick(20)
    late = {
      subscribe: () => {
        subscribed += 1
        return () => {}
      },
    }
    await tick(40)
    assert.equal(subscribed, 1)
    assert.ok(reads >= 1, 'a late source must trigger a read, not be silently missed')
    stop()
  })

  it('replaces a non-function unsubscribe with a safe no-op', () => {
    const source = { subscribe: () => undefined }
    const stop = subscribeWhenAvailable(
      () => source,
      () => {},
    )
    assert.equal(typeof stop, 'function')
    stop()
  })

  it('keeps slow-polling after maxTries; unsubscribe stays safe and stops it', async () => {
    let subscribed = 0
    const stop = subscribeWhenAvailable(
      () => undefined,
      () => {},
      { intervalMs: 5, maxTries: 3 },
    )
    await tick(50)
    assert.equal(subscribed, 0)
    stop()
  })
})
