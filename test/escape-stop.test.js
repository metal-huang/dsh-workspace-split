import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  createEscapeStopHandler,
  DoubleEscape,
  isPlainEscape,
  sessionStoppable,
} from '../packages/dsh-workspace-split/src/escape-stop.js'

describe('DoubleEscape', () => {
  it('stops only on the second independent press inside the window', () => {
    const sequence = new DoubleEscape(500)
    assert.equal(sequence.press(1000), false)
    assert.equal(sequence.press(1400), true)
    assert.equal(sequence.press(1500), false)
  })

  it('expires an old first press instead of stopping late', () => {
    const sequence = new DoubleEscape(500)
    assert.equal(sequence.press(1000), false)
    assert.equal(sequence.press(1600), false)
    assert.equal(sequence.press(1800), true)
  })

  it('resets after success, on request, and on a broken clock', () => {
    const sequence = new DoubleEscape()
    sequence.press(100)
    sequence.reset()
    assert.equal(sequence.press(200), false)
    assert.equal(sequence.press(250), true)
    assert.equal(sequence.press(Number.NaN), false)
    assert.equal(sequence.press(300), false)
    assert.equal(sequence.press(100), false)
  })
})

describe('isPlainEscape', () => {
  const plain = { key: 'Escape' }

  it('accepts an unmodified fresh Escape', () => {
    assert.equal(isPlainEscape(plain), true)
  })

  it('rejects another key, repeats, composition, and claimed input', () => {
    assert.equal(isPlainEscape({ key: 'Enter' }), false)
    assert.equal(isPlainEscape({ ...plain, repeat: true }), false)
    assert.equal(isPlainEscape({ ...plain, isComposing: true }), false)
    assert.equal(isPlainEscape({ ...plain, defaultPrevented: true }), false)
  })

  it('rejects every modifier', () => {
    for (const modifier of ['ctrlKey', 'altKey', 'shiftKey', 'metaKey']) {
      assert.equal(isPlainEscape({ ...plain, [modifier]: true }), false)
    }
  })
})

describe('sessionStoppable', () => {
  it('accepts a running ordinary or continuable Session', () => {
    assert.equal(sessionStoppable({ running: true }), true)
    assert.equal(
      sessionStoppable({ running: true, subagent: { address: { mode: 'continuable' } } }),
      true,
    )
  })

  it('refuses idle, removed, and non-continuable Sessions', () => {
    assert.equal(sessionStoppable({ running: false }), false)
    assert.equal(sessionStoppable({ running: true, removed: true }), false)
    assert.equal(
      sessionStoppable({ running: true, subagent: { address: { mode: 'read-only' } } }),
      false,
    )
    assert.equal(sessionStoppable(undefined), false)
  })
})

describe('createEscapeStopHandler', () => {
  function fixture({ belongs = true, ownsLayer = false, stop, cancelling } = {}) {
    let now = 0
    const handler = createEscapeStopHandler({
      stop: stop ?? (() => {}),
      timeoutMs: 500,
      ownsLayer: () => ownsLayer,
      belongsToCell: () => belongs,
      now: () => now,
      cancelling,
    })
    return {
      handler,
      advance: (ms) => {
        now += ms
      },
    }
  }

  function event() {
    return {
      key: 'Escape',
      prevented: 0,
      stopped: 0,
      preventDefault() {
        this.prevented += 1
      },
      stopImmediatePropagation() {
        this.stopped += 1
      },
    }
  }

  it('stops on the second in-cell Escape and consumes only the confirming press', () => {
    let calls = 0
    const { handler, advance } = fixture({
      stop: () => {
        calls += 1
      },
    })
    const first = event()
    handler.onKeyDown(first)
    assert.equal(calls, 0)
    assert.equal(first.prevented, 0)
    assert.equal(first.stopped, 0)
    advance(400)
    const second = event()
    handler.onKeyDown(second)
    assert.equal(calls, 1)
    assert.equal(second.prevented, 1)
    assert.equal(second.stopped, 1)
  })

  it('ignores Escape from another cell and from an owned layer', () => {
    for (const options of [{ belongs: false }, { ownsLayer: true }]) {
      let calls = 0
      const { handler, advance } = fixture({
        ...options,
        stop: () => {
          calls += 1
        },
      })
      const input = event()
      handler.onKeyDown(input)
      advance(100)
      handler.onKeyDown(event())
      assert.equal(calls, 0)
      assert.equal(input.prevented, 0)
      assert.equal(input.stopped, 0)
    }
  })

  it('deduplicates an in-flight cancellation and resets a partial sequence', async () => {
    let calls = 0
    let release
    const { handler, advance } = fixture({
      stop: () => {
        calls += 1
        return new Promise((resolve) => {
          release = resolve
        })
      },
    })
    handler.onKeyDown(event())
    advance(100)
    handler.onKeyDown(event())
    advance(100)
    handler.onKeyDown(event())
    advance(100)
    handler.onKeyDown(event())
    assert.equal(calls, 1)
    release()
    await Promise.resolve()
    handler.onKeyDown(event())
    handler.reset()
    advance(100)
    handler.onKeyDown(event())
    assert.equal(calls, 1, 'a reset first press cannot stop by itself')
    advance(100)
    handler.onKeyDown(event())
    assert.equal(calls, 2, 'a fresh double press works after cancellation settles')
  })

  it('keeps the cancellation lock when the effect installs a new handler', async () => {
    let calls = 0
    let release
    const cancelling = { current: false }
    const stop = () => {
      calls += 1
      return new Promise((resolve) => {
        release = resolve
      })
    }
    const first = fixture({ stop, cancelling })
    first.handler.onKeyDown(event())
    first.advance(100)
    first.handler.onKeyDown(event())
    assert.equal(calls, 1)

    const reinstalled = fixture({ stop, cancelling })
    reinstalled.handler.onKeyDown(event())
    reinstalled.advance(100)
    reinstalled.handler.onKeyDown(event())
    assert.equal(calls, 1, 'the new handler must see the old in-flight lock')
    release()
    await Promise.resolve()
    reinstalled.handler.onKeyDown(event())
    reinstalled.advance(100)
    reinstalled.handler.onKeyDown(event())
    assert.equal(calls, 2)
  })
})
