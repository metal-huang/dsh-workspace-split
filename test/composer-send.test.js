import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { promptWhileCurrent, sendMode } from '../packages/dsh-workspace-split/src/composer-send.js'
import { runningState } from '../packages/dsh-workspace-split/src/session-state.js'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

const PARTS = [{ type: 'text', text: '/todo 123' }]

describe('promptWhileCurrent', () => {
  it('does not prompt the old Session when the tile rebinds during encoding', async () => {
    const encoding = deferred()
    const oldSession = { prompt: async () => ({ ok: true }) }
    let current = oldSession
    let promptCalls = 0
    oldSession.prompt = async () => {
      promptCalls += 1
      return { ok: true }
    }
    let draft = '/todo 123'
    const pending = (async () => {
      const outcome = await promptWhileCurrent(
        oldSession,
        () => current === oldSession,
        async () => {
          await encoding.promise
          return PARTS
        },
      )
      if (outcome.action === 'sent') draft = ''
      return outcome
    })()

    current = { prompt: async () => ({ ok: true }) }
    encoding.resolve()
    const outcome = await pending
    assert.deepEqual(outcome, { action: 'stale' })
    assert.equal(promptCalls, 0)
    assert.equal(draft, '/todo 123')
  })

  it('does not clear the rebound draft when the tile rebinds during prompt', async () => {
    const prompted = deferred()
    const oldSession = { prompt: async () => prompted.promise }
    let current = oldSession
    let draft = '/todo 123'
    const pending = (async () => {
      const outcome = await promptWhileCurrent(
        oldSession,
        () => current === oldSession,
        async () => PARTS,
      )
      if (outcome.action === 'sent') draft = ''
      return outcome
    })()
    await new Promise((resolve) => setImmediate(resolve))

    current = { prompt: async () => ({ ok: true }) }
    prompted.resolve({ ok: true })
    const outcome = await pending
    assert.deepEqual(outcome, { action: 'stale' })
    assert.equal(draft, '/todo 123')
  })

  it('clears the draft only for an accepted prompt on the same Session', async () => {
    const session = { prompt: async (parts, mode) => ({ ok: true, parts, mode }) }
    let draft = '/todo 123'
    const outcome = await promptWhileCurrent(
      session,
      () => true,
      async () => PARTS,
    )
    if (outcome.action === 'sent') draft = ''
    assert.deepEqual(outcome, { action: 'sent' })
    assert.equal(draft, '')
  })

  it('keeps encoding and prompt failures on their own stages', async () => {
    const encodeError = new Error('read failed')
    const encoding = await promptWhileCurrent(
      {},
      () => true,
      async () => {
        throw encodeError
      },
    )
    assert.deepEqual(encoding, { action: 'error', stage: 'encode', error: encodeError })

    const remote = { code: 'session/agent-busy', message: 'busy' }
    const prompting = await promptWhileCurrent(
      { prompt: async () => ({ ok: false, error: remote }) },
      () => true,
      async () => PARTS,
    )
    assert.deepEqual(prompting, { action: 'error', stage: 'prompt', error: remote })
  })

  it('suppresses an old encoding failure after a rebind', async () => {
    const oldSession = {}
    let current = oldSession
    const outcome = await promptWhileCurrent(
      oldSession,
      () => current === oldSession,
      async () => {
        current = {}
        throw new Error('old failure')
      },
    )
    assert.deepEqual(outcome, { action: 'stale' })
  })

  it('passes the resolved mode through to the prompt call', async () => {
    const modes = []
    const session = {
      prompt: async (_parts, mode) => {
        modes.push(mode)
        return { ok: true }
      },
    }
    await promptWhileCurrent(
      session,
      () => true,
      async () => PARTS,
      'steer',
    )
    await promptWhileCurrent(
      session,
      () => true,
      async () => PARTS,
    )
    assert.deepEqual(modes, ['steer', 'queue'])
  })
})

describe('promptWhileCurrent mode resolution', () => {
  it('resolves a mode function after encoding, at prompt time', async () => {
    const order = []
    const session = {
      prompt: async (_parts, mode) => {
        order.push(`prompt:${mode}`)
        return { ok: true }
      },
    }
    const outcome = await promptWhileCurrent(
      session,
      () => true,
      async () => {
        order.push('encode')
        return PARTS
      },
      () => {
        order.push('mode')
        return 'steer'
      },
    )
    assert.deepEqual(outcome, { action: 'sent' })
    assert.deepEqual(order, ['encode', 'mode', 'prompt:steer'])
  })

  it('queues when the catalog settled the turn but the binding still runs', () => {
    // The binding snapshot can lag after settlement; the catalog is authoritative.
    const catalog = { phase: 'ready', byId: { s1: { running: false } } }
    const mode = sendMode('steer', runningState(catalog, 's1', { running: true }))
    assert.equal(mode, 'queue')
  })

  it('sees a phase change that happens during encoding', async () => {
    let running = true
    const modes = []
    const session = {
      prompt: async (_parts, mode) => {
        modes.push(mode)
        return { ok: true }
      },
    }
    await promptWhileCurrent(
      session,
      () => true,
      async () => {
        running = false
        return PARTS
      },
      () => sendMode('steer', running),
    )
    assert.deepEqual(modes, ['queue'])
  })
})

describe('sendMode', () => {
  it('steers only a running Session whose setting asks for it', () => {
    assert.equal(sendMode('steer', true), 'steer')
  })

  it('falls back to queue for every other combination', () => {
    assert.equal(sendMode('queue', true), 'queue')
    assert.equal(sendMode('steer', false), 'queue')
    assert.equal(sendMode('steer', undefined), 'queue')
    assert.equal(sendMode(undefined, true), 'queue')
    assert.equal(sendMode('unexpected', true), 'queue')
  })
})
