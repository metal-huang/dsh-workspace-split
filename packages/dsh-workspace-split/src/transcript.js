/**
 * Fold one session event window into the rows a split cell renders.
 *
 * DSH streams an Assistant attempt as many transient `assistant/live-chunk`
 * entries, one per model token. Rendering them one-to-one (what this plugin did
 * before) gave every token its own paragraph: a reply in a split cell showed up
 * as one character per line, because each row already carries the transcript's
 * paragraph rhythm. The harness's own chat does not render those rows — it folds
 * them into the step they belong to (`assistant-step` projection in ui-chat), so
 * a live attempt reads as one growing message.
 *
 * This module performs the same fold for the split transcript:
 *
 * - live chunks accumulate per Turn/Step and per block index, and the step owns
 *   exactly one row, updated in place as text arrives;
 * - a durable `assistant/message` supersedes the fold for that step (normally the
 *   event source has already retired the transient rows);
 * - `llm/retry` drops the partial text of the attempt it abandons;
 * - an `assistant/attempt` — an attempt that settled without a surface message —
 *   still shows the text it streamed, matching the harness's interrupted node;
 * - only what a reader wrote and read reaches the cell: replacement surface
 *   copies (compaction, pruning) stay model-only, and injected context messages
 *   (time context, job notices, catalogs, runtime snapshots, approvals) are not
 *   drawn as bubbles, exactly as Chat classifies them;
 * - a human prompt keeps the image attachment refs it carried, and an image-only
 *   prompt stays a row: dropping it removed a pasted screenshot from the cell
 *   while the model still answered it.
 *
 * Kept free of React and DOM so the rules can be tested directly.
 */

/** Only used when a caller forgets the translator: keys are better than a crash. */
const keyOnly = (key) => key

// ---------- text ----------

/**
 * Narration of an Assistant message or a user prompt.
 *
 * Blocks are separated by a blank line: a settlement that streamed text, a Tool
 * call, then more text carries two text blocks, and gluing them together would
 * read as one run-on sentence ("firstsecond").
 * @param content - content blocks.
 * @returns the joined text blocks.
 */
function contentText(content) {
  const blocks = Array.isArray(content) ? content : []
  return blocks
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n\n')
}

/**
 * Text one compact stream record contributes.
 *
 * A settlement stores its model stream compacted: text deltas are packed into
 * `text-chunks` runs, everything else stays a raw `chunk`. Only the text deltas
 * count as narration, which is the rule `joinAssistantStreamText` applies in the
 * harness.
 * @param record - one `AssistantStreamRecord`.
 * @returns its text contribution, or ''.
 */
function recordText(record) {
  if (record?.type === 'text-chunks') return (record.texts ?? []).join('')
  if (record?.type !== 'chunk') return ''
  if (record.chunk?.type !== 'text-delta') return ''
  return record.chunk.text ?? ''
}

/** Block index a compact record's text belongs to. */
function streamIndex(record) {
  const index = record?.type === 'chunk' ? record.chunk?.index : record?.index
  return Number.isInteger(index) ? index : 0
}

/**
 * Text streamed by one durable attempt.
 * @param records - compact stream records from `assistant/attempt`.
 * @returns joined text deltas, one paragraph per text block.
 */
export function streamText(records) {
  const list = Array.isArray(records) ? records : []
  const blocks = new Map()
  for (const record of list) {
    const text = recordText(record)
    if (text === '') continue
    accumulate(blocks, streamIndex(record), 'text', text)
  }
  return blockText(blocks)
}

// ---------- live chunk folding ----------

/** Key the fold's streaming state by the attempt it belongs to. */
function streamKey(turn, step) {
  return `${turn}:${step}`
}

/**
 * Append to the block at `index`, keeping the previous text of the same kind.
 * A block index that changes kind starts over: deltas only extend their own kind.
 * @param blocks - the attempt's block map, mutated in place.
 * @param index - block index inside the attempt.
 * @param kind - block kind the delta belongs to.
 * @param text - delta text.
 */
function accumulate(blocks, index, kind, text) {
  const previous = blocks.get(index)
  const base = previous?.kind === kind ? previous.text : ''
  blocks.set(index, { kind, text: base + text })
}

/** Block map entry for an assembled block. */
function blockState(block) {
  const kind = block?.type ?? ''
  return { kind, text: kind === 'text' ? (block.text ?? '') : '' }
}

/**
 * Writers for the chunk kinds the transcript folds, mirroring `updateChunk` in
 * ui-chat. `usage` and `finish` carry no narration and are not listed.
 */
const CHUNK_WRITERS = new Map([
  [
    'block-start',
    (blocks, index, chunk) => blocks.set(index, { kind: chunk.blockType ?? '', text: '' }),
  ],
  ['text-delta', (blocks, index, chunk) => accumulate(blocks, index, 'text', chunk.text ?? '')],
  [
    'reasoning-delta',
    (blocks, index, chunk) => accumulate(blocks, index, 'reasoning', chunk.text ?? ''),
  ],
  ['tool-call-delta', (blocks, index) => blocks.set(index, { kind: 'tool-call', text: '' })],
  // The assembled block is authoritative for its index and may replace a delta
  // run that was started but never completed (an interrupted block).
  ['block-end', (blocks, index, chunk) => blocks.set(index, blockState(chunk.block))],
])

/**
 * Apply one live chunk to the attempt's block map.
 * Block indexes correlate interleaved deltas, so a Tool call in the middle of a
 * step does not disturb the narration blocks around it.
 * @param blocks - the attempt's block map, mutated in place.
 * @param chunk - one `StreamChunk` from a live-chunk entry.
 */
function applyChunk(blocks, chunk) {
  if (chunk === null || typeof chunk !== 'object') return
  const index = Number.isInteger(chunk.index) ? chunk.index : 0
  const write = CHUNK_WRITERS.get(chunk.type)
  if (write === undefined) return
  write(blocks, index, chunk)
}

/** Narration of one attempt: its text blocks, in block order, as paragraphs. */
function blockText(blocks) {
  return [...blocks.entries()]
    .sort((left, right) => left[0] - right[0])
    .filter(([, block]) => block.kind === 'text' && block.text.trim() !== '')
    .map(([, block]) => block.text)
    .join('\n\n')
}

// ---------- rows ----------

/**
 * Result text of a tool/result event, flattened from its content blocks.
 * @param ev - the event's `data`.
 * @returns readable result text.
 */
export function toolResultText(ev) {
  const blocks = ev?.message?.content ?? ev?.data?.message?.content
  const list = Array.isArray(blocks) ? blocks : []
  return list.map(blockLabel).join('\n')
}

/**
 * Image attachments attached to a content block list.
 *
 * A prompt that carried pictures stores them as `{ type: 'image', attachment }`
 * blocks next to the text. They are refs, not bytes: the cell resolves each one
 * through `session.readAttachment` when it draws the row, because the transcript
 * fold is pure and the bytes arrive asynchronously.
 * @param content - content blocks of a `user/message`.
 * @returns attachment refs, in block order.
 */
function contentImages(content) {
  const blocks = Array.isArray(content) ? content : []
  return blocks
    .filter(
      (block) => block?.type === 'image' && typeof block.attachment?.attachmentId === 'string',
    )
    .map((block) => block.attachment)
}

/** One content block's readable label for the tool row. */
function blockLabel(block) {
  if (block?.type === 'text') return block.text
  if (block === undefined || block === null) return ''
  if (block.type === 'image') return '[image]'
  if (block.type === 'file') return '[file]'
  if (block.type === undefined) return ''
  return `[${block.type}]`
}

/**
 * One disclosure row for a tool call, carrying the result that answers it.
 * @param key - React key for the row.
 * @param call - name and raw arguments.
 * @param result - the answering result's `data`, when the window has it.
 */
function toolRow(key, call, result) {
  return {
    key,
    kind: 'tool',
    tool: {
      name: call.name,
      argsRaw: call.argsRaw ?? '',
      resultText: result === undefined ? '' : toolResultText(result),
      isError: resultFailed(result),
      errorReason: failureReason(result),
    },
  }
}

/** Whether a tool result marks itself as a failure. */
function resultFailed(result) {
  return Boolean(result?.message?.isError ?? result?.isError)
}

/** User-facing reason of a failed tool result. */
function failureReason(result) {
  return result?.error?.reason ?? result?.error?.name ?? ''
}

/**
 * Whether an event entered the transcript at its own log position.
 *
 * A surface event carries either `surfaceOp: 'append'` or a replacement range
 * (`{ op: 'replace', startSeq, endSeq }`). Replacement copies — a compaction
 * checkpoint, a pruned Tool result, a rewritten system message — exist for the
 * model only: the harness deliberately keeps them out of the human transcript,
 * because a landed replacement would erase what the reader already saw. The
 * plugin reads the same log, so it applies the same filter (isAppendSurfaceEvent
 * in ui-chat).
 * @param ev - one session event.
 * @returns true for events the transcript may draw.
 */
function isAppendSurface(ev) {
  return ev?.surfaceOp === 'append'
}

/**
 * Whether a `user/message` is a human prompt rather than injected context.
 *
 * Every non-human injection (time context, runtime snapshot, skill catalog,
 * model selection, job notice, subagent settlement, approval, compaction
 * checkpoint) is a durable `user/message` whose `source.kind` names its
 * producer. Chat draws only `kind: 'user'` as a bubble; everything else is a
 * folded context row with a producer label. The split cell keeps no context
 * rows, so those messages stay out of it entirely.
 * @param ev - one `user/message` event.
 * @returns true when a reader typed this message.
 */
function isHumanPrompt(ev) {
  if (!isAppendSurface(ev)) return false
  const source = ev.data?.source
  // Old logs predate `source`; a message without one can only be human input.
  return source === undefined || source?.kind === 'user'
}

/**
 * Pair tool results with the calls that answer them, in one pass.
 *
 * Only append-origin results count: a replacement copy is the pruned or
 * rewritten model-facing body, which is exactly what the reader should not see
 * in place of the output the call produced.
 */
function pairToolResults(list) {
  const results = new Map()
  const calls = new Set()
  for (const entry of list) {
    const ev = entry?.event
    if (ev?.type === 'tool/call') {
      if (ev.data?.callId !== undefined) calls.add(ev.data.callId)
    } else if (ev?.type === 'tool/result' && isAppendSurface(ev)) {
      results.set(resultCallId(ev), ev.data)
    }
  }
  return { results, calls }
}

/** Call id a tool/result event answers. */
function resultCallId(ev) {
  return ev?.data?.message?.toolCallId ?? ev?.data?.toolCallId
}

/**
 * Live chunk: extend the attempt it belongs to, creating its row on first text.
 * @param ev - one `assistant/live-chunk` event.
 * @param ctx - shared build state.
 */
function onLiveChunk(ev, ctx) {
  const turn = ev.data?.turn
  const step = ev.data?.step
  const key = streamKey(turn, step)
  // A reconnect baseline can replay an attempt's chunks *after* its settlement
  // row (the event source appends them at the tail), so a settled step must not
  // grow a second row for text it already shows.
  if (ctx.settled.has(key)) return
  let stream = ctx.streams.get(key)
  if (stream === undefined) {
    stream = { row: undefined, blocks: new Map() }
    ctx.streams.set(key, stream)
  }
  applyChunk(stream.blocks, ev.data?.chunk)
  const text = blockText(stream.blocks)
  if (text === '') return
  if (stream.row !== undefined) {
    stream.row.text = text
    return
  }
  stream.row = { key: `live-${key}`, kind: 'assistant', text, turn, streaming: true }
  ctx.rows.push(stream.row)
}

/** Drop one row, if it is still in the list. */
function dropRow(rows, row) {
  const at = rows.indexOf(row)
  if (at >= 0) rows.splice(at, 1)
}

/**
 * Drop the folded rows of abandoned attempts.
 *
 * A retry restarts the step in the harness, so the abandoned attempt's partial
 * text disappears rather than staying above the retried answer. A retry without
 * attempt identity can only belong to whatever is streaming now.
 * @param ev - one `llm/retry` event.
 * @param ctx - shared build state.
 */
function onRetry(ev, ctx) {
  const turn = ev.data?.turn
  const step = ev.data?.step
  const target = turn === undefined && step === undefined ? undefined : streamKey(turn, step)
  dropStreams(ctx, target)
  dropAttempts(ctx, target)
  if (target !== undefined) ctx.settled.delete(target)
}

/** Forget the open folds of the targeted step (every step when no target). */
function dropStreams(ctx, target) {
  for (const [attempt, stream] of ctx.streams) {
    if (target !== undefined && attempt !== target) continue
    dropRow(ctx.rows, stream.row)
    ctx.streams.delete(attempt)
  }
}

/** Forget the settled-attempt rows of the targeted step (every step when no target). */
function dropAttempts(ctx, target) {
  for (const [attempt, row] of ctx.attempts) {
    if (target !== undefined && attempt !== target) continue
    dropRow(ctx.rows, row)
    ctx.attempts.delete(attempt)
  }
}

/**
 * `assistant/attempt`: an attempt that settled without a surface message.
 *
 * The row is kept but tracked: a retry in the same step removes it, while an
 * attempt left as the step's last word keeps showing what it streamed.
 */
function onAttempt(ev, ctx) {
  const text = streamText(ev.data?.stream)
  const key = streamKey(ev.data?.turn, ev.data?.step)
  // Same ownership rule as a message: an attempt that already has a live row
  // keeps it, so the text does not appear twice when both rows are in the window.
  const stream = ctx.streams.get(key)
  if (settle(stream, text)) {
    ctx.attempts.set(key, stream.row)
    ctx.streams.delete(key)
    return
  }
  if (text.trim() === '') return
  const row = { key: `attempt-${key}`, kind: 'assistant', text, turn: ev.data?.turn }
  ctx.rows.push(row)
  ctx.attempts.set(key, row)
}

/**
 * Durable Assistant message: the settlement is authoritative, and it owns the
 * row the live chunks already occupy so the answer does not jump down the list.
 */
function onMessage(ev, ctx) {
  // A replacement copy (compaction rewriting an earlier answer) is model-only.
  if (!isAppendSurface(ev)) return
  const text = contentText(ev.data?.message?.content)
  const key = streamKey(ev.data?.turn, ev.data?.step)
  if (settle(ctx.streams.get(key), text)) {
    ctx.streams.delete(key)
    ctx.settled.add(key)
    return
  }
  if (text === '') return
  ctx.settled.add(key)
  ctx.rows.push({
    key: `message-${ev.seq ?? key}`,
    kind: 'assistant',
    text,
    turn: ev.data?.turn,
  })
}

/**
 * Hand one settlement to the row the attempt already owns, when it has one.
 * @param stream - the attempt's fold state, if still open.
 * @param text - settled message text.
 * @returns whether the settlement took over an existing row.
 */
function settle(stream, text) {
  if (stream === undefined || stream.row === undefined) return false
  if (text !== '') stream.row.text = text
  stream.row.streaming = false
  return true
}

/** Turn divider: the turn rail scrolls to this anchor. */
function onTurnStart(ev, ctx) {
  const turn = ev.data?.turn
  if (turn === undefined) return
  ctx.rows.push({
    key: `turn-${turn}`,
    kind: 'divider',
    text: ctx.t('turn.divider', { n: turn }),
    turn,
  })
}

/**
 * User prompt: literal text plus the image refs it carried, in the bubble style.
 *
 * Only what a reader typed: injected context and replacement copies are the
 * model's reading material, not the transcript's (see `isHumanPrompt`).
 *
 * An image-only prompt is a real turn and must reach the cell: requiring text
 * here dropped a pasted screenshot from the transcript entirely, so the reader
 * saw their message vanish while the model answered it.
 */
function onUserMessage(ev, ctx) {
  if (!isHumanPrompt(ev)) return
  const text = contentText(ev.data?.content)
  const images = contentImages(ev.data?.content)
  if (text === '' && images.length === 0) return
  ctx.rows.push({
    key: `user-${ev.seq ?? ctx.rows.length}`,
    kind: 'user',
    text,
    images,
    turn: ev.data?.turn,
  })
}

/** Tool call row, carrying its result when the answering event is loaded. */
function onToolCall(ev, ctx) {
  const id = ev.data?.callId
  const call = { name: ev.data?.name ?? 'tool', argsRaw: ev.data?.arguments }
  ctx.rows.push(toolRow(`call-${id ?? ctx.rows.length}`, call, ctx.tools.results.get(id)))
}

/** Orphan tool result: its call is outside the loaded window. */
function onToolResult(ev, ctx) {
  // A replacement copy is the pruned body the model sees; the call row keeps
  // whatever the append-origin result in the window says.
  if (!isAppendSurface(ev)) return
  const id = resultCallId(ev)
  // Drawn by its call row when that call is in the window.
  if (ctx.tools.calls.has(id)) return
  const call = { name: ctx.t('toolrow.result.name'), argsRaw: '' }
  ctx.rows.push(toolRow(`result-${id ?? ctx.rows.length}`, call, ev.data))
}

/** Event type -> row builder. A Map keeps prototype keys out of the dispatch. */
const HANDLERS = new Map([
  ['assistant/live-chunk', onLiveChunk],
  ['llm/retry', onRetry],
  ['assistant/attempt', onAttempt],
  ['assistant/message', onMessage],
  ['turn/start', onTurnStart],
  ['user/message', onUserMessage],
  ['tool/call', onToolCall],
  ['tool/result', onToolResult],
])

/**
 * Build the render rows for one cell's event window.
 *
 * Order is the window's own order: the first live chunk of an attempt takes the
 * row where that attempt started, and later chunks update it in place.
 * @param entries - session event entries (`{ event }`), including transient rows.
 * @param t - translation function, injectable for tests.
 * @returns rows of `{ key, kind, text, images, turn, streaming, tool }`.
 */
export function buildTranscript(entries, t = keyOnly) {
  const list = Array.isArray(entries) ? entries : []
  const ctx = {
    rows: [],
    streams: new Map(),
    // Attempts that settled without a message, and steps whose settlement is
    // already on screen, both keyed by Turn/Step.
    attempts: new Map(),
    settled: new Set(),
    tools: pairToolResults(list),
    t,
  }
  for (const entry of list) {
    const ev = entry?.event
    if (ev === undefined || ev === null) continue
    const handle = HANDLERS.get(ev.type)
    if (handle !== undefined) handle(ev, ctx)
  }
  return ctx.rows
}
