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
  createSessionStatusStore,
  selectSessionStatusService,
} from '../packages/dsh-workspace-split/src/session-status.js'

function makeSource(name, snapshot = new Map(), events = []) {
  const listeners = new Set()
  return {
    name,
    snapshot,
    subscribeCalls: 0,
    unsubscribeCalls: 0,
    getSnapshotCalls: 0,
    subscribe(listener) {
      this.subscribeCalls += 1
      events.push(`subscribe:${name}`)
      listeners.add(listener)
      return () => {
        this.unsubscribeCalls += 1
        events.push(`unsubscribe:${name}`)
        listeners.delete(listener)
      }
    },
    getSnapshot() {
      this.getSnapshotCalls += 1
      return this.snapshot
    },
    emit() {
      for (const listener of [...listeners]) listener()
    },
  }
}

/** Deterministic intervals: no test sleeps, and active timer count is observable. */
function fakeClock() {
  let nextId = 0
  const timers = new Map()
  return {
    setInterval(fn, delay) {
      const id = (nextId += 1)
      timers.set(id, { fn, delay })
      return id
    },
    clearInterval(id) {
      timers.delete(id)
    },
    tick(ms) {
      for (const [id, task] of [...timers]) {
        if (task.delay <= ms && timers.has(id)) task.fn()
      }
    },
    get size() {
      return timers.size
    },
    get delay() {
      return timers.size === 1 ? [...timers.values()][0].delay : undefined
    },
  }
}

const service = makeSource('service')

describe('selectSessionStatusService', () => {
  it('prefers the 0.2.3 Cordis service from ctx.get', () => {
    const ctx = { get: (name) => (name === 'uiSession.sessionStatus' ? service : undefined) }
    assert.equal(selectSessionStatusService(ctx, { sessionStatus: { other: true } }), service)
  })

  it('falls back to the 0.2.2 uiSession member when ctx.get has no service', () => {
    const member = makeSource('0.2.2')
    const ctx = { get: () => undefined }
    assert.equal(selectSessionStatusService(ctx, { sessionStatus: member }), member)
  })

  it('returns undefined when neither version exposes it', () => {
    assert.equal(selectSessionStatusService({ get: () => undefined }, {}), undefined)
    assert.equal(selectSessionStatusService({}, undefined), undefined)
  })

  it('survives a throwing ctx.get and still falls back', () => {
    const member = makeSource('0.2.2')
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
    const first = makeSource('first')
    const second = makeSource('second')
    let current = first
    const get = createSessionStatusGetter({ get: () => current }, {})
    assert.equal(get(), first)
    current = second
    assert.equal(get(), second)
  })

  it('does not return a removed service from a stale cache', () => {
    let current = service
    const get = createSessionStatusGetter({ get: () => current }, {})
    assert.equal(get(), service)
    current = undefined
    assert.equal(get(), undefined)
  })

  it('keeps instances isolated', () => {
    const a = makeSource('a')
    const b = makeSource('b')
    const getA = createSessionStatusGetter({ get: () => a }, {})
    const getB = createSessionStatusGetter({ get: () => b }, {})
    assert.equal(getA(), a)
    assert.equal(getB(), b)
  })
})

describe('createSessionStatusStore', () => {
  it('attaches and notifies immediately, with one slow identity timer', () => {
    const clock = fakeClock()
    const source = makeSource('now', new Map([['s1', { kind: 'approval' }]]))
    const store = createSessionStatusStore(() => source, { timers: clock })
    let reads = 0
    const off = store.subscribe(() => {
      reads += 1
    })
    assert.equal(source.subscribeCalls, 1)
    assert.equal(reads, 1)
    assert.deepEqual(store.getSnapshot(), source.snapshot)
    assert.equal(clock.size, 1)
    assert.equal(clock.delay, 1000)
    off()
    off()
    assert.equal(source.unsubscribeCalls, 1)
    assert.equal(clock.size, 0)
  })

  it('picks up a late source and notifies before pending state is read', () => {
    const clock = fakeClock()
    let current
    const store = createSessionStatusStore(() => current, { timers: clock })
    let reads = 0
    const off = store.subscribe(() => {
      reads += 1
    })
    assert.equal(reads, 0)
    assert.equal(store.getSnapshot(), undefined)
    assert.equal(clock.delay, 200)
    current = makeSource('late', new Map([['s1', { kind: 'question' }]]))
    clock.tick(200)
    assert.equal(current.subscribeCalls, 1)
    assert.equal(reads, 1)
    assert.deepEqual(store.getSnapshot(), current.snapshot)
    assert.equal(clock.delay, 1000)
    off()
  })

  it('normalizes a non-function upstream unsubscribe', () => {
    const clock = fakeClock()
    const store = createSessionStatusStore(() => ({ subscribe: () => undefined }), {
      timers: clock,
    })
    const off = store.subscribe(() => {})
    assert.equal(typeof off, 'function')
    assert.doesNotThrow(off)
    assert.equal(clock.size, 0)
  })

  it('retries a throwing source subscribe without exposing its stale snapshot', () => {
    const clock = fakeClock()
    const stale = new Map([['stale', true]])
    let attempts = 0
    const source = {
      subscribe() {
        attempts += 1
        if (attempts === 1) throw new Error('attach failed')
        return () => {}
      },
      getSnapshot: () => stale,
    }
    const store = createSessionStatusStore(() => source, { timers: clock })
    let reads = 0
    let off
    assert.doesNotThrow(() => {
      off = store.subscribe(() => {
        reads += 1
      })
    })
    assert.equal(attempts, 1)
    assert.equal(store.getSnapshot(), undefined)
    assert.equal(reads, 1, 'a failed attach still clears any previously rendered state')
    assert.equal(clock.size, 1)

    assert.doesNotThrow(() => clock.tick(200))
    assert.equal(attempts, 2)
    assert.equal(reads, 2, 'the successful retry must notify listeners')
    assert.equal(store.getSnapshot(), stale)
    off()
  })

  it('detaches before identity replacement and clears a disappeared source', () => {
    const clock = fakeClock()
    const events = []
    const first = makeSource('first', new Map([['old', true]]), events)
    const second = makeSource('second', new Map([['new', true]]), events)
    let current = first
    const store = createSessionStatusStore(() => current, { timers: clock })
    let reads = 0
    const off = store.subscribe(() => {
      reads += 1
    })
    assert.deepEqual(store.getSnapshot(), first.snapshot)

    current = second
    clock.tick(1000)
    assert.deepEqual(events, ['subscribe:first', 'unsubscribe:first', 'subscribe:second'])
    assert.equal(reads, 2)
    assert.deepEqual(store.getSnapshot(), second.snapshot)
    first.emit()
    assert.equal(reads, 2, 'the replaced source must not reach listeners')

    current = undefined
    clock.tick(1000)
    assert.equal(second.unsubscribeCalls, 1)
    assert.equal(reads, 3)
    const oldReads = second.getSnapshotCalls
    assert.equal(store.getSnapshot(), undefined)
    assert.equal(second.getSnapshotCalls, oldReads, 'a removed source must not be read')
    off()
  })

  it('clears everything after the last listener and reattaches on a later subscribe', () => {
    const clock = fakeClock()
    let probes = 0
    const source = makeSource('source')
    const store = createSessionStatusStore(
      () => {
        probes += 1
        return source
      },
      { timers: clock },
    )
    const off = store.subscribe(() => {})
    off()
    assert.equal(source.unsubscribeCalls, 1)
    assert.equal(clock.size, 0)
    clock.tick(1000)
    assert.equal(probes, 1, 'no listener means no slow probe')

    const offAgain = store.subscribe(() => {})
    assert.equal(source.subscribeCalls, 2)
    assert.equal(probes, 2)
    assert.equal(clock.size, 1)
    offAgain()
    assert.equal(source.unsubscribeCalls, 2)
  })
})

describe('createSessionStatusStore sharing and polling', () => {
  it('shares one timer and upstream subscription across multiple listeners', () => {
    const clock = fakeClock()
    let probes = 0
    const source = makeSource('shared')
    const store = createSessionStatusStore(
      () => {
        probes += 1
        return source
      },
      { timers: clock },
    )
    let a = 0
    let b = 0
    const offA = store.subscribe(() => {
      a += 1
    })
    const offB = store.subscribe(() => {
      b += 1
    })
    assert.equal(source.subscribeCalls, 1)
    assert.equal(clock.size, 1)
    source.emit()
    assert.equal(a, 2)
    assert.equal(b, 1)
    clock.tick(1000)
    assert.equal(probes, 2, 'one timer performs one probe for all listeners')
    assert.equal(source.subscribeCalls, 1)
    offA()
    assert.equal(source.unsubscribeCalls, 0)
    source.emit()
    assert.equal(b, 2)
    offB()
    assert.equal(source.unsubscribeCalls, 1)
    assert.equal(clock.size, 0)
  })

  it('does not let one duplicate disposer remove the other registration', () => {
    const clock = fakeClock()
    const source = makeSource('duplicate')
    const store = createSessionStatusStore(() => source, { timers: clock })
    let reads = 0
    const listener = () => {
      reads += 1
    }
    const offFirst = store.subscribe(listener)
    const offSecond = store.subscribe(listener)
    assert.equal(reads, 1)
    offFirst()
    assert.equal(source.unsubscribeCalls, 0)
    source.emit()
    assert.equal(reads, 2)
    offSecond()
    assert.equal(source.unsubscribeCalls, 1)
    assert.equal(clock.size, 0)
  })

  it('keeps getSnapshot pure: no probe, attach, notify, or timer change', () => {
    const clock = fakeClock()
    let probes = 0
    const source = makeSource('pure')
    const store = createSessionStatusStore(
      () => {
        probes += 1
        return source
      },
      { timers: clock },
    )
    let reads = 0
    const off = store.subscribe(() => {
      reads += 1
    })
    assert.deepEqual([probes, source.subscribeCalls, reads, clock.size], [1, 1, 1, 1])
    store.getSnapshot()
    store.getSnapshot()
    store.getSnapshot()
    assert.deepEqual([probes, source.subscribeCalls, reads, clock.size], [1, 1, 1, 1])
    assert.equal(source.getSnapshotCalls, 3)
    off()
  })

  it('switches from 25 fast probes to permanent slow probes without multiplying timers', () => {
    const clock = fakeClock()
    let probes = 0
    let current
    const store = createSessionStatusStore(
      () => {
        probes += 1
        return current
      },
      { timers: clock },
    )
    let reads = 0
    const off = store.subscribe(() => {
      reads += 1
    })
    for (let n = 0; n < 25; n += 1) {
      assert.equal(clock.delay, 200)
      clock.tick(200)
    }
    assert.equal(probes, 26)
    assert.equal(clock.size, 1)
    assert.equal(clock.delay, 1000)
    clock.tick(200)
    assert.equal(probes, 26)
    clock.tick(1000)
    assert.equal(probes, 27)
    assert.equal(clock.size, 1)

    current = makeSource('after-fast-phase')
    clock.tick(1000)
    assert.equal(current.subscribeCalls, 1)
    assert.equal(reads, 1)
    assert.equal(clock.size, 1)
    off()
  })

  it('isolates listener exceptions during attach and upstream notifications', () => {
    const clock = fakeClock()
    let current
    const store = createSessionStatusStore(() => current, { timers: clock })
    const offBad = store.subscribe(() => {
      throw new Error('one listener failed')
    })
    let goodReads = 0
    const offGood = store.subscribe(() => {
      goodReads += 1
    })
    const source = makeSource('resilient')
    current = source
    assert.doesNotThrow(() => clock.tick(200))
    assert.equal(goodReads, 1)
    assert.doesNotThrow(() => source.emit())
    assert.equal(goodReads, 2)
    offBad()
    offGood()
  })
})
