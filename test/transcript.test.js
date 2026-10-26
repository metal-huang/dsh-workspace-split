/**
 * Transcript folding rules.
 *
 * Two behaviours came straight from bug reports:
 *
 * - a live Assistant attempt reaches the cell as one transient entry per model
 *   token, and rendering them one-to-one read as one character per line
 *   (`不` / `要` / `用` / `` ` `` / `js` ...), so the fold keeps one row per
 *   attempt;
 * - the log also carries model-facing injections (time context, job notices,
 *   catalogs, compaction checkpoints) as `user/message` events, which Chat does
 *   not draw as bubbles, so the cell must not draw them either.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildTranscript,
  runningHint,
  streamReasoning,
  streamText,
} from '../packages/dsh-workspace-split/src/transcript.js'

/** Minimal `t` so labels do not depend on the harness language. */
const t = (key, vars = {}) => `${key}${vars.n === undefined ? '' : `:${vars.n}`}`

/** A replacement surface marker, as a compaction or pruning event carries it. */
const REPLACED = { op: 'replace', startSeq: 1, endSeq: 2 }

let seq = 0

/** One durable surface event that appended to the transcript. */
function surface(type, data, extra = {}) {
  seq += 1
  return { type: 'event', event: { type, seq, time: 0, surfaceOp: 'append', data, ...extra } }
}

/** One transient live-chunk entry, as the event source hands it to the cell. */
function live(turn, step, chunk) {
  seq += 1
  return {
    type: 'transient',
    event: {
      type: 'assistant/live-chunk',
      seq: 10000 - 1 / seq,
      time: 0,
      data: { attemptId: 'attempt-1', turn, step, chunk },
    },
  }
}

/** A text-delta chunk for one block index. */
function delta(index, text) {
  return { type: 'text-delta', index, text }
}

/** A durable human prompt. */
function prompt(text, source = { kind: 'user' }) {
  return surface('user/message', { content: [{ type: 'text', text }], source })
}

/** One image content block, as a prompt that carried a picture stores it. */
function imageBlock(attachmentId, name = 'shot.png') {
  return {
    type: 'image',
    attachment: {
      attachmentId,
      mediaType: 'image/png',
      bytes: 2048,
      width: 800,
      height: 600,
      name,
    },
  }
}

/** A human prompt made of arbitrary content blocks. */
function promptBlocks(blocks, source = { kind: 'user' }) {
  return surface('user/message', { content: blocks, source })
}

/** A durable Assistant settlement. */
function reply(turn, step, text, extra = {}) {
  return surface(
    'assistant/message',
    { turn, step, message: { content: [{ type: 'text', text }] } },
    extra,
  )
}

/** A tool call row source. */
function toolCall(callId, name, args) {
  return {
    type: 'event',
    event: { type: 'tool/call', seq: (seq += 1), time: 0, data: { callId, name, arguments: args } },
  }
}

/** A tool result, append-origin unless a replacement marker is passed. */
function toolResult(callId, text, surfaceOp = 'append') {
  seq += 1
  return {
    type: 'event',
    event: {
      type: 'tool/result',
      seq,
      time: 0,
      surfaceOp,
      data: { message: { toolCallId: callId, content: [{ type: 'text', text }] } },
    },
  }
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
      prompt('hi'),
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
    const entries = [live(1, 1, delta(0, 'partial')), reply(1, 1, 'partial answer')]

    const rows = buildTranscript(entries, t)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].text, 'partial answer')
    assert.equal(rows[0].streaming, false)
  })

  it('renders a durable message on its own when no live row exists', () => {
    const rows = buildTranscript([reply(1, 1, 'settled')], t)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].text, 'settled')
  })

  it('keeps an interrupted message readable when a tool call splits its text', () => {
    // A cancelled turn settles its delivered prefix as `assistant/message`, and
    // the prefix can hold text on both sides of a Tool call.
    const entries = [
      surface('assistant/message', {
        turn: 1,
        step: 1,
        interrupted: true,
        message: {
          content: [
            { type: 'text', text: 'first' },
            { type: 'tool_use', id: 'c1', name: 'read', input: {} },
            { type: 'text', text: 'second' },
          ],
        },
      }),
    ]
    const rows = buildTranscript(entries, t)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].text, 'first\n\nsecond')
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
})

describe('buildTranscript: what the transcript hides', () => {
  it('draws a human prompt but not the context injected around it', () => {
    // The screenshot case: the job notice and the time context arrived as
    // `user/message` and rendered as if the reader had typed them.
    const entries = [
      prompt('真的问题', { kind: 'user', rpcId: 'r1' }),
      prompt('background job pwsh-1 finished [status: killed]. Read its output with job_output.', {
        kind: 'tool-jobs',
        form: 'notice',
      }),
      prompt('Time sampled while preparing turn 98, step 1: 2026-10-24T03:54:28+08:00', {
        kind: 'time-context',
      }),
      prompt(
        'Current runtime context. This snapshot supersedes earlier runtime-context snapshots.',
        {
          kind: 'runtime-context',
          form: 'snapshot',
        },
      ),
    ]

    const rows = buildTranscript(entries, t)
    assert.deepEqual(
      rows.map((row) => row.text),
      ['真的问题'],
    )
  })

  it('keeps a prompt that predates the source field', () => {
    const entries = [surface('user/message', { content: [{ type: 'text', text: 'old log' }] })]
    assert.deepEqual(
      buildTranscript(entries, t).map((row) => row.text),
      ['old log'],
    )
  })

  it('hides a compaction checkpoint replacing an earlier span', () => {
    const entries = [
      prompt('first prompt'),
      reply(1, 1, 'first answer'),
      surface(
        'user/message',
        {
          content: [{ type: 'text', text: 'This is an automatically generated checkpoint...' }],
          source: { kind: 'compact-checkpoint', compactionId: 'c1' },
        },
        { surfaceOp: REPLACED },
      ),
    ]

    const rows = buildTranscript(entries, t)
    assert.deepEqual(
      rows.map((row) => row.kind),
      ['user', 'assistant'],
      'the model-only replacement copy must not be drawn',
    )
  })

  it('hides an Assistant replacement copy', () => {
    const entries = [reply(1, 1, 'rewritten for the model', { surfaceOp: REPLACED })]
    assert.deepEqual(buildTranscript(entries, t), [])
  })

  it('keeps the append-origin tool result when a pruned copy follows it', () => {
    const entries = [
      toolCall('c1', 'read', '{"p":1}'),
      toolResult('c1', 'real output'),
      toolResult('c1', '[pruned 512 bytes]', REPLACED),
    ]

    const rows = buildTranscript(entries, t)
    assert.equal(rows.length, 1, 'the pruned copy is model-only')
    assert.equal(rows[0].tool.resultText, 'real output')
  })

  it('hides a pruned result whose call is outside the window', () => {
    const rows = buildTranscript([toolResult('gone', '[pruned 512 bytes]', REPLACED)], t)
    assert.deepEqual(rows, [])
  })
})

describe('buildTranscript: retries and replay', () => {
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

  it('drops a settled attempt when the step is retried afterwards', () => {
    // The agent loop settles a failed attempt as `assistant/attempt` and only
    // then emits `llm/retry`; the abandoned half-sentence must not sit above the
    // retried answer.
    const entries = [
      live(1, 1, delta(0, 'Hello wor')),
      {
        type: 'event',
        event: {
          type: 'assistant/attempt',
          seq: 4,
          time: 0,
          data: {
            turn: 1,
            step: 1,
            stream: [{ type: 'text-chunks', time0: 0, index: 0, dt: [1], texts: ['Hello wor'] }],
          },
        },
      },
      { type: 'event', event: { type: 'llm/retry', seq: 5, time: 0, data: { turn: 1, step: 1 } } },
      live(1, 1, delta(0, 'Hello world')),
      reply(1, 1, 'Hello world'),
    ]

    const rows = buildTranscript(entries, t)
    assert.deepEqual(
      rows.map((row) => row.text),
      ['Hello world'],
    )
  })

  it('does not grow a second row from chunks replayed after their settlement', () => {
    // A reconnect baseline appends the reconstructed chunks at the tail of the
    // window, after the durable message they belong to.
    const entries = [
      reply(1, 1, 'answer'),
      live(1, 1, delta(0, 'ans')),
      live(1, 1, delta(0, 'wer')),
    ]

    const rows = buildTranscript(entries, t)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].text, 'answer')
  })
})

describe('buildTranscript: prompts carrying images', () => {
  it('keeps an image-only prompt that has no text', () => {
    // The old rule drew only messages with text, so a pasted screenshot was
    // answered by the model but never appeared in the cell.
    const rows = buildTranscript([promptBlocks([imageBlock('a1')])], t)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].kind, 'user')
    assert.equal(rows[0].text, '')
    assert.deepEqual(
      rows[0].images.map((image) => [image.attachmentId, image.mediaType]),
      [['a1', 'image/png']],
    )
  })

  it('keeps text and images on the same row, in block order', () => {
    const rows = buildTranscript(
      [promptBlocks([{ type: 'text', text: 'look at this' }, imageBlock('a1'), imageBlock('a2')])],
      t,
    )
    assert.equal(rows.length, 1)
    assert.equal(rows[0].text, 'look at this')
    assert.deepEqual(
      rows[0].images.map((image) => image.attachmentId),
      ['a1', 'a2'],
    )
  })

  it('gives a text-only prompt an empty image list', () => {
    const rows = buildTranscript([prompt('plain')], t)
    assert.equal(rows.length, 1)
    assert.deepEqual(rows[0].images, [])
  })

  it('ignores an image block without an attachment ref', () => {
    const rows = buildTranscript([promptBlocks([{ type: 'image' }])], t)
    assert.deepEqual(rows, [], 'nothing readable and no ref: nothing to draw')
  })

  it('still hides an injected context message that carries images', () => {
    const rows = buildTranscript(
      [
        promptBlocks([imageBlock('a1')], { kind: 'time-context' }),
        promptBlocks([{ type: 'text', text: 'real' }, imageBlock('a2')]),
      ],
      t,
    )
    assert.deepEqual(
      rows.map((row) => row.text),
      ['real'],
    )
    assert.deepEqual(
      rows[0].images.map((image) => image.attachmentId),
      ['a2'],
    )
  })

  it('still hides a replacement copy that carries images', () => {
    const rows = buildTranscript(
      [promptBlocks([imageBlock('a1')], { kind: 'user' })].map((entry) => ({
        ...entry,
        event: { ...entry.event, surfaceOp: REPLACED },
      })),
      t,
    )
    assert.deepEqual(rows, [])
  })
})

describe('buildTranscript: other rows', () => {
  it('pairs a tool call with the result that answers it', () => {
    const entries = [toolCall('c1', 'read', '{"p":1}'), toolResult('c1', 'body')]

    const rows = buildTranscript(entries, t)
    assert.equal(rows.length, 1, 'the result row folds into the call row')
    assert.deepEqual(rows[0].tool, {
      name: 'read',
      argsRaw: '{"p":1}',
      resultText: 'body',
      isError: false,
      errorReason: '',
      running: false,
    })
  })

  it('keeps an orphan result as its own row', () => {
    const rows = buildTranscript([toolResult('gone', 'body')], t)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].tool.name, 'toolrow.result.name')
    assert.equal(rows[0].tool.resultText, 'body')
  })

  it('keeps user prompts, turn dividers, and ignores unrelated events', () => {
    const entries = [
      { type: 'event', event: { type: 'turn/start', seq: 1, time: 0, data: { turn: 2 } } },
      prompt('go'),
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
      'ab\n\nc',
      'a second text block is a second paragraph, not a run-on',
    )
  })

  it('keeps the paragraph break across a tool call', () => {
    assert.equal(
      streamText([
        { type: 'text-chunks', time0: 0, index: 0, dt: [1], texts: ['first'] },
        {
          type: 'chunk',
          time: 1,
          chunk: { type: 'block-end', index: 0, block: { type: 'text', text: 'first' } },
        },
        {
          type: 'chunk',
          time: 2,
          chunk: {
            type: 'block-end',
            index: 1,
            block: { type: 'tool_use', id: 'c1', name: 'read' },
          },
        },
        { type: 'text-chunks', time0: 3, index: 2, dt: [1], texts: ['second'] },
      ]),
      'first\n\nsecond',
    )
  })

  it('returns an empty string for a missing stream', () => {
    assert.equal(streamText(undefined), '')
    assert.equal(streamText([]), '')
  })
})

describe('buildTranscript: reasoning rows', () => {
  /** One reasoning delta for a block index. */
  const reasoning = (index, text) => ({ type: 'reasoning-delta', index, text })

  it('keeps a reasoning-only attempt visible before the first answer token', () => {
    const entries = [
      live(1, 1, { type: 'block-start', index: 0, blockType: 'reasoning' }),
      live(1, 1, reasoning(0, '先看看')),
      live(1, 1, reasoning(0, '目录')),
    ]
    const rows = buildTranscript(entries, t)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].kind, 'assistant')
    assert.equal(rows[0].text, '')
    assert.equal(rows[0].reasoning, '先看看目录')
    assert.equal(rows[0].streaming, true)
  })

  it('keeps reasoning and answer on the same attempt row', () => {
    const entries = [
      live(1, 1, { type: 'block-start', index: 0, blockType: 'reasoning' }),
      live(1, 1, reasoning(0, '想一想')),
      live(1, 1, { type: 'block-end', index: 0, block: { type: 'reasoning', text: '想一想' } }),
      live(1, 1, { type: 'block-start', index: 1, blockType: 'text' }),
      live(1, 1, delta(1, '答案')),
    ]
    const rows = buildTranscript(entries, t)
    assert.equal(rows.length, 1, 'one row owns the whole step')
    assert.equal(rows[0].reasoning, '想一想')
    assert.equal(rows[0].text, '答案')
  })

  it('settles reasoning from a durable Assistant message', () => {
    const entries = [
      live(2, 1, { type: 'block-start', index: 0, blockType: 'reasoning' }),
      live(2, 1, reasoning(0, '草稿')),
      surface('assistant/message', {
        turn: 2,
        step: 1,
        message: {
          content: [
            { type: 'reasoning', text: '最终推理' },
            { type: 'text', text: '最终回答' },
          ],
        },
      }),
    ]
    const rows = buildTranscript(entries, t)
    assert.equal(rows.length, 1, 'the settlement owns the live row')
    assert.equal(rows[0].reasoning, '最终推理')
    assert.equal(rows[0].text, '最终回答')
    assert.equal(rows[0].streaming, false)
  })

  it('draws an image-only prompt and its reasoning separately', () => {
    const rows = buildTranscript(
      [
        promptBlocks([imageBlock('a1')]),
        surface('assistant/message', {
          turn: 1,
          step: 1,
          message: {
            content: [
              { type: 'reasoning', text: '看图' },
              { type: 'text', text: '看到了' },
            ],
          },
        }),
      ],
      t,
    )
    assert.equal(rows[0].kind, 'user')
    assert.equal(rows[1].kind, 'assistant')
    assert.equal(rows[1].reasoning, '看图')
  })
})

describe('streamReasoning', () => {
  it('joins packed reasoning deltas per block', () => {
    assert.equal(
      streamReasoning([
        { type: 'chunk', time: 0, chunk: { type: 'reasoning-delta', index: 0, text: '想' } },
        { type: 'chunk', time: 1, chunk: { type: 'reasoning-delta', index: 0, text: '了' } },
        { type: 'chunk', time: 2, chunk: { type: 'text-delta', index: 1, text: 'no' } },
      ]),
      '想了',
    )
  })

  it('returns an empty string for a missing stream', () => {
    assert.equal(streamReasoning(undefined), '')
    assert.equal(streamReasoning([]), '')
  })
})

describe('tool rows: live execution state', () => {
  it('marks a call without its result as running', () => {
    const rows = buildTranscript([toolCall('c1', 'bash', '{"command":"echo hi"}')], t)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].tool.running, true)
    assert.equal(rows[0].tool.resultText, '')
  })

  it('clears running once the answering result is in the window', () => {
    const rows = buildTranscript(
      [toolCall('c1', 'bash', '{"command":"echo hi"}'), toolResult('c1', 'hi')],
      t,
    )
    assert.equal(rows[0].tool.running, false)
    assert.equal(rows[0].tool.resultText, 'hi')
  })
})

describe('runningHint', () => {
  const named = (key, vars = {}) => `${key}${vars.name === undefined ? '' : `:${vars.name}`}`

  it('names the tool that has not answered yet', () => {
    assert.equal(
      runningHint([toolCall('c1', 'bash', '{}'), toolCall('c2', 'read', '{}')], named),
      'running.tool:read',
    )
    assert.equal(
      runningHint([toolCall('c1', 'bash', '{}'), toolResult('c1', 'done')], named),
      'running.generic',
    )
  })

  it('distinguishes thinking from writing a reply', () => {
    assert.equal(
      runningHint([live(1, 1, { type: 'block-start', index: 0, blockType: 'reasoning' })], named),
      'running.thinking',
    )
    assert.equal(
      runningHint([live(1, 1, { type: 'reasoning-delta', index: 0, text: '想' })], named),
      'running.thinking',
    )
    assert.equal(runningHint([live(1, 1, delta(1, '答'))], named), 'running.replying')
  })
})

describe('buildTranscript: turn close rows', () => {
  const labelled = (key, vars = {}) =>
    `${key}${vars.message === undefined ? '' : `:${vars.message}:${vars.code}`}`

  it('draws a failed turn where the reader would otherwise see silence', () => {
    const rows = buildTranscript(
      [
        prompt('run it'),
        surface('turn/end', {
          turn: 1,
          reason: { kind: 'error', error: { message: 'boom', code: 'E_PROVIDER' } },
        }),
      ],
      labelled,
    )
    assert.equal(rows.length, 2)
    assert.equal(rows[1].kind, 'error')
    assert.equal(rows[1].text, 'turn.error:boom:E_PROVIDER')
  })

  it('does not add a row for a completed turn', () => {
    const rows = buildTranscript(
      [prompt('go'), surface('turn/end', { turn: 1, reason: { kind: 'completed' } })],
      t,
    )
    assert.equal(rows.length, 1, 'the prompt is the only visible row')
  })

  it('turns other non-completed causes into one notice', () => {
    const rows = buildTranscript(
      [surface('turn/end', { turn: 1, reason: { kind: 'aborted', reason: { kind: 'user' } } })],
      t,
    )
    assert.equal(rows.length, 1)
    assert.equal(rows[0].kind, 'notice')
    assert.equal(rows[0].text, 'turn.aborted')
  })
})
