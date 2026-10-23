/**
 * Transcript folding rules.
 *
 * A live Assistant attempt reaches the cell as one transient entry per model
 * token. Rendering those entries one-to-one put every token in its own
 * paragraph, so a reply inside a split cell read as one character per line
 * (`不` / `要` / `用` / `` ` `` / `js` ...). These tests pin the fold: one row
 * per attempt, the settlement wins, and a retry drops the abandoned text.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildTranscript, streamText } from '../packages/dsh-workspace-split/src/transcript.js'

/** Minimal `t` so labels do not depend on the harness language. */
const t = (key, vars = {}) => `${key}${vars.n === undefined ? '' : `:${vars.n}`}`

let seq = 0
/** One transient live-chunk entry, as the event source hands it to the cell. */
function live(turn, step, chunk) {
  seq += 1
  return {
    type: 'transient',
    event: {
      type: 'assistant/live-chunk',
      seq: 1000 - 1 / seq,
      time: 0,
      data: { attemptId: 'attempt-1', turn, step, chunk },
    },
  }
}

/** A text-delta chunk for one block index. */
function delta(index, text) {
  return { type: 'text-delta', index, text }
}

describe('buildTranscript: live Assistant chunks', () => {
  it('folds a token stream into one row instead of one row per token', () => {
    // The exact shape that produced the screenshot: markdown punctuation is its
    // own token, so one-to-one rendering split `` `js`/`ts` `` across four rows.
    const entries = [
      { type: 'event', event: { type: 'turn/start', seq: 1, time: 0, data: { turn: 3 } } },
      live(3, 1, { type: 'block-start', index: 0, blockType: 'text' }),
      live(3, 1, delta(0, '不要')),
      live(3, 1, delta(0, '用')),
      live(3, 1, delta(0, ' `')),
      live(3, 1, delta(0, 'js')),
      live(3, 1, delta(0, '`/')),
      live(3, 1, delta(0, 'ts')),
      live(3, 1, delta(0, '`。')),
      live(3, 1, {
        type: 'block-end',
        index: 0,
        block: { type: 'text', text: '不要用 `js`/`ts`。' },
      }),
    ]

    const rows = buildTranscript(entries, t)
    const assistants = rows.filter((row) => row.kind === 'assistant')

    assert.equal(assistants.length, 1, 'the attempt owns exactly one row')
    assert.equal(assistants[0].text, '不要用 `js`/`ts`。')
    assert.equal(assistants[0].text.includes('\n'), false, 'one paragraph, not one per token')
    assert.equal(assistants[0].streaming, true)
    assert.equal(assistants[0].turn, 3)
  })

  it('keeps the row where the attempt started as more tokens arrive', () => {
    const entries = [
      {
        type: 'event',
        event: {
          type: 'user/message',
          seq: 1,
          time: 0,
          data: { turn: 1, content: [{ type: 'text', text: 'hi' }] },
        },
      },
      live(1, 1, delta(0, 'a')),
      { type: 'event', event: { type: 'turn/start', seq: 2, time: 0, data: { turn: 2 } } },
      live(1, 1, delta(0, 'b')),
    ]

    const rows = buildTranscript(entries, t)
    assert.deepEqual(
      rows.map((row) => row.kind),
      ['user', 'assistant', 'divider'],
    )
    assert.equal(rows[1].text, 'ab')
  })

  it('separates text blocks split by a tool call and ignores reasoning', () => {
    const entries = [
      live(1, 1, delta(0, 'first')),
      live(1, 1, { type: 'block-end', index: 0, block: { type: 'text', text: 'first' } }),
      live(1, 1, { type: 'block-start', index: 1, blockType: 'tool_use' }),
      live(1, 1, {
        type: 'tool-call-delta',
        index: 1,
        id: 'call-1',
        name: 'read',
        argumentsDelta: '{"p":1}',
      }),
      live(1, 1, {
        type: 'block-end',
        index: 1,
        block: { type: 'tool_use', id: 'call-1', name: 'read', input: {} },
      }),
      live(1, 1, { type: 'block-start', index: 2, blockType: 'reasoning' }),
      live(1, 1, { type: 'reasoning-delta', index: 2, text: 'thinking' }),
      live(1, 1, delta(3, 'second')),
    ]

    const rows = buildTranscript(entries, t)
    assert.equal(rows.length, 1, 'one assistant row for the attempt')
    assert.equal(rows[0].text, 'first\n\nsecond')
  })

  it('gives each step its own row', () => {
    const entries = [live(1, 1, delta(0, 'one')), live(1, 2, delta(0, 'two'))]
    const rows = buildTranscript(entries, t)
    assert.deepEqual(
      rows.map((row) => row.text),
      ['one', 'two'],
    )
  })

  it('draws nothing until a chunk carries text', () => {
    const entries = [live(1, 1, { type: 'block-start', index: 0, blockType: 'text' })]
    assert.deepEqual(buildTranscript(entries, t), [])
  })
})

describe('buildTranscript: settlements', () => {
  it('lets the durable message supersede the folded row in place', () => {
    const entries = [
      live(1, 1, delta(0, 'partial')),
      {
        type: 'event',
        event: {
          type: 'assistant/message',
          seq: 5,
          time: 0,
          data: {
            turn: 1,
            step: 1,
            message: { content: [{ type: 'text', text: 'partial answer' }] },
          },
        },
      },
    ]

    const rows = buildTranscript(entries, t)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].text, 'partial answer')
    assert.equal(rows[0].streaming, false)
  })

  it('renders a durable message on its own when no live row exists', () => {
    const entries = [
      {
        type: 'event',
        event: {
          type: 'assistant/message',
          seq: 9,
          time: 0,
          data: { turn: 1, step: 1, message: { content: [{ type: 'text', text: 'settled' }] } },
        },
      },
    ]
    const rows = buildTranscript(entries, t)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].text, 'settled')
  })

  it('shows the streamed text of an attempt that settled without a message', () => {
    const entries = [
      {
        type: 'event',
        event: {
          type: 'assistant/attempt',
          seq: 7,
          time: 0,
          data: {
            turn: 1,
            step: 1,
            stream: [
              { type: 'text-chunks', time0: 0, index: 0, dt: [1, 1], texts: ['inter', 'rupted'] },
              { type: 'chunk', time: 9, chunk: { type: 'usage', usage: {} } },
            ],
          },
        },
      },
    ]
    const rows = buildTranscript(entries, t)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].text, 'interrupted')
  })

  it('drops the abandoned text of a retried attempt', () => {
    const entries = [
      live(1, 1, delta(0, 'oops')),
      { type: 'event', event: { type: 'llm/retry', seq: 4, time: 0, data: { turn: 1, step: 1 } } },
      live(1, 1, delta(0, 'fixed')),
    ]

    const rows = buildTranscript(entries, t)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].text, 'fixed')
  })

  it('also drops it when the retry cannot name the attempt', () => {
    const entries = [
      live(2, 1, delta(0, 'oops')),
      { type: 'event', event: { type: 'llm/retry', seq: 4, time: 0, data: {} } },
      live(2, 1, delta(0, 'fixed')),
    ]

    const rows = buildTranscript(entries, t)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].text, 'fixed')
  })

  it('folds an abandoned attempt into the row its chunks already own', () => {
    const entries = [
      live(1, 1, delta(0, '半句')),
      {
        type: 'event',
        event: {
          type: 'assistant/attempt',
          seq: 7,
          time: 0,
          data: {
            turn: 1,
            step: 1,
            stream: [{ type: 'text-chunks', time0: 0, index: 0, dt: [1], texts: ['半句'] }],
          },
        },
      },
    ]

    const rows = buildTranscript(entries, t)
    assert.equal(rows.length, 1, 'the settlement must not add a second row')
    assert.equal(rows[0].text, '半句')
    assert.equal(rows[0].streaming, false)
  })
})

describe('buildTranscript: other rows', () => {
  it('pairs a tool call with the result that answers it', () => {
    const entries = [
      {
        type: 'event',
        event: {
          type: 'tool/call',
          seq: 1,
          time: 0,
          data: { callId: 'c1', name: 'read', arguments: '{"p":1}' },
        },
      },
      {
        type: 'event',
        event: {
          type: 'tool/result',
          seq: 2,
          time: 0,
          data: { message: { toolCallId: 'c1', content: [{ type: 'text', text: 'body' }] } },
        },
      },
    ]

    const rows = buildTranscript(entries, t)
    assert.equal(rows.length, 1, 'the result row folds into the call row')
    assert.deepEqual(rows[0].tool, {
      name: 'read',
      argsRaw: '{"p":1}',
      resultText: 'body',
      isError: false,
      errorReason: '',
    })
  })

  it('keeps an orphan result as its own row', () => {
    const entries = [
      {
        type: 'event',
        event: {
          type: 'tool/result',
          seq: 2,
          time: 0,
          data: { message: { toolCallId: 'gone', content: [{ type: 'text', text: 'body' }] } },
        },
      },
    ]
    const rows = buildTranscript(entries, t)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].tool.name, 'toolrow.result.name')
    assert.equal(rows[0].tool.resultText, 'body')
  })

  it('keeps user prompts, turn dividers, and ignores unrelated events', () => {
    const entries = [
      { type: 'event', event: { type: 'turn/start', seq: 1, time: 0, data: { turn: 2 } } },
      {
        type: 'event',
        event: {
          type: 'user/message',
          seq: 2,
          time: 0,
          data: { content: [{ type: 'text', text: 'go' }] },
        },
      },
      { type: 'event', event: { type: 'step/start', seq: 3, time: 0, data: { turn: 2, step: 1 } } },
    ]
    const rows = buildTranscript(entries, t)
    assert.deepEqual(
      rows.map((row) => [row.kind, row.text, row.turn]),
      [
        ['divider', 'turn.divider:2', 2],
        ['user', 'go', undefined],
      ],
    )
  })

  it('tolerates junk entries', () => {
    assert.deepEqual(buildTranscript(undefined, t), [])
    assert.deepEqual(buildTranscript([null, {}, { event: null }], t), [])
  })
})

describe('streamText', () => {
  it('joins packed text runs and raw text deltas only', () => {
    assert.equal(
      streamText([
        { type: 'text-chunks', time0: 0, index: 0, dt: [1], texts: ['a', 'b'] },
        { type: 'reasoning-chunks', time0: 0, index: 1, dt: [1], texts: ['no'] },
        { type: 'chunk', time: 2, chunk: { type: 'text-delta', index: 2, text: 'c' } },
        {
          type: 'chunk',
          time: 3,
          chunk: { type: 'block-end', index: 2, block: { type: 'text', text: 'c' } },
        },
      ]),
      'abc',
    )
  })

  it('returns an empty string for a missing stream', () => {
    assert.equal(streamText(undefined), '')
    assert.equal(streamText([]), '')
  })
})
