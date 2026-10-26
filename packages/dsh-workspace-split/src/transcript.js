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

/** Reasoning one compact stream record contributes. */
function recordReasoning(record) {
  if (record?.type !== 'chunk') return ''
  if (record.chunk?.type !== 'reasoning-delta') return ''
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

/**
 * Reasoning a settled attempt streamed.
 *
 * `assistant/attempt` keeps the same compact records as a message but marks
 * reasoning deltas separately; the cell shows them in the same disclosure row
 * as live reasoning.
 * @param records - compact stream records from `assistant/attempt`.
 * @returns joined reasoning text.
 */
export function streamReasoning(records) {
  const list = Array.isArray(records) ? records : []
  const blocks = new Map()
  for (const record of list) {
    const text = recordReasoning(record)
    if (text === '') continue
    accumulate(blocks, streamIndex(record), 'reasoning', text)
  }
  return blockReasoning(blocks)
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
  const text = kind === 'text' || kind === 'reasoning' ? (block.text ?? '') : ''
  return { kind, text }
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

/** Reasoning of one attempt: its reasoning blocks, in block order. */
function blockReasoning(blocks) {
  return [...blocks.entries()]
    .sort((left, right) => left[0] - right[0])
    .filter(([, block]) => block.kind === 'reasoning' && block.text.trim() !== '')
    .map(([, block]) => block.text.trim())
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

/**
 * File attachments attached to a content block list.
 * @param content - content blocks of a `user/message`.
 * @returns durable file refs, in block order.
 */
function contentFiles(content) {
  const blocks = Array.isArray(content) ? content : []
  return blocks
    .filter((block) => block?.type === 'file' && typeof block.attachment?.attachmentId === 'string')
    .map((block) => block.attachment)
}

/**
 * Reasoning blocks of a durable Assistant message.
 * @param content - content blocks of an `assistant/message`.
 * @returns joined reasoning text, or ''.
 */
function contentReasoning(content) {
  const blocks = Array.isArray(content) ? content : []
  return blocks
    .filter((block) => block?.type === 'reasoning' && typeof block.text === 'string')
    .map((block) => block.text.trim())
    .filter((text) => text !== '')
    .join('\n\n')
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
function toolRow(key, call, result, at) {
  return {
    key,
    kind: 'tool',
    turn: at?.turn,
    step: at?.step,
    tool: {
      name: call.name,
      argsRaw: call.argsRaw ?? '',
      resultText: result === undefined ? '' : toolResultText(result),
      isError: resultFailed(result),
      errorReason: failureReason(result),
      // The call landed but its result has not: the row is the reader's proof
      // that the harness is executing rather than stuck.
      running: result === undefined,
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

/** Tool calls in the window, in order. */
function toolCalls(entries) {
  const calls = []
  for (const entry of entries) {
    const ev = entry?.event
    if (ev?.type === 'tool/call') {
      calls.push({ id: ev.data?.callId, name: ev.data?.name ?? 'tool' })
    }
  }
  return calls
}

/** Ids of Tool results that appended to the transcript. */
function answeredToolIds(entries) {
  const results = new Set()
  for (const entry of entries) {
    const ev = entry?.event
    if (ev?.type === 'tool/result' && isAppendSurface(ev)) results.add(resultCallId(ev))
  }
  return results
}

/** Last live chunk in the window, if any. */
function lastLiveChunk(entries) {
  let chunk = null
  for (const entry of entries) {
    if (entry?.event?.type === 'assistant/live-chunk') chunk = entry.event.data?.chunk ?? null
  }
  return chunk
}

/** Status text for one stream chunk kind. */
function chunkHint(chunk, t) {
  if (chunk === null) return t('running.generic')
  if (chunk.type === 'reasoning-delta') return t('running.thinking')
  if (chunk.type === 'block-start' && chunk.blockType === 'reasoning') {
    return t('running.thinking')
  }
  if (chunk.type === 'text-delta') return t('running.replying')
  return t('running.generic')
}

/**
 * One line describing what a running session is doing right now.
 *
 * The main conversation shows a live status while a turn runs; a split cell
 * gets the same confidence by naming the pending Tool call first, then the kind
 * of stream chunk that arrived last. The caller only renders this while the
 * Session snapshot says it is running.
 * @param entries - session event entries in window order.
 * @param t - translation function, injectable for tests.
 * @returns the status line.
 */
export function runningHint(entries, t = keyOnly) {
  const list = Array.isArray(entries) ? entries : []
  const results = answeredToolIds(list)
  const pending = toolCalls(list)
    .reverse()
    .find((call) => !results.has(call.id))
  if (pending !== undefined) return t('running.tool', { name: pending.name })
  return chunkHint(lastLiveChunk(list), t)
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
  const reasoning = blockReasoning(stream.blocks)
  if (text === '' && reasoning === '') return
  if (stream.row !== undefined) {
    stream.row.text = text
    stream.row.reasoning = reasoning
    return
  }
  stream.row = {
    key: `live-${key}`,
    kind: 'assistant',
    text,
    reasoning,
    turn,
    streaming: true,
  }
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
  const reasoning = streamReasoning(ev.data?.stream)
  const key = streamKey(ev.data?.turn, ev.data?.step)
  // Same ownership rule as a message: an attempt that already has a live row
  // keeps it, so the text does not appear twice when both rows are in the window.
  const settled = settleStep(ctx, key, text, reasoning)
  if (settled !== null) {
    ctx.attempts.set(key, settled)
    return
  }
  if (text.trim() === '' && reasoning === '') return
  const row = {
    key: `attempt-${key}`,
    kind: 'assistant',
    text,
    reasoning,
    turn: ev.data?.turn,
  }
  ctx.rows.push(row)
  ctx.attempts.set(key, row)
}

/**
 * Settle the open row of one Turn/Step, when it has one.
 * @param ctx - shared build state.
 * @param key - Turn/Step key.
 * @param text - settled text.
 * @param reasoning - settled reasoning.
 * @returns the settled row, or null when no live row owned this step.
 */
function settleStep(ctx, key, text, reasoning) {
  const stream = ctx.streams.get(key)
  if (stream === undefined) return null
  if (!settle(stream, text, reasoning)) return null
  ctx.streams.delete(key)
  ctx.settled.add(key)
  return stream.row
}

/** Text and reasoning of one durable Assistant message. */
function messageContent(ev) {
  const content = ev.data?.message?.content
  return { text: contentText(content), reasoning: contentReasoning(content) }
}

/** Push the settled row of a message that did not own a live row. */
function pushMessageRow(ctx, ev, key, content) {
  ctx.settled.add(key)
  ctx.rows.push({
    key: `message-${ev.seq ?? key}`,
    kind: 'assistant',
    text: content.text,
    reasoning: content.reasoning,
    turn: ev.data?.turn,
  })
}

/**
 * Durable Assistant message: the settlement is authoritative, and it owns the
 * row the live chunks already occupy so the answer does not jump down the list.
 */
function onMessage(ev, ctx) {
  // A replacement copy (compaction rewriting an earlier answer) is model-only.
  if (!isAppendSurface(ev)) return
  const { text, reasoning } = messageContent(ev)
  const key = streamKey(ev.data?.turn, ev.data?.step)
  if (settleStep(ctx, key, text, reasoning) !== null) return
  if (text === '' && reasoning === '') return
  pushMessageRow(ctx, ev, key, { text, reasoning })
}

/**
 * Hand one settlement to the row the attempt already owns, when it has one.
 * @param stream - the attempt's fold state, if still open.
 * @param text - settled message text.
 * @param reasoning - settled reasoning text.
 * @returns whether the settlement took over an existing row.
 */
function settle(stream, text, reasoning) {
  if (stream === undefined || stream.row === undefined) return false
  if (text !== '') stream.row.text = text
  if (reasoning !== '') stream.row.reasoning = reasoning
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

/** Muted one-line label for a turn that ended without an error. */
function turnNotice(reason, t) {
  switch (reason.kind) {
    case 'aborted':
      return t('turn.aborted')
    case 'max-tokens':
      return t('turn.maxTokens')
    case 'interrupted':
      return t('turn.interrupted')
    default:
      return t('turn.blocked')
  }
}

/** Text for a failed turn, keeping both the message and its routing code. */
function turnErrorText(error, t) {
  const message = error?.message ?? ''
  const code = error?.code ?? ''
  return t('turn.error', { message, code })
}

/**
 * Turn close. A failed turn is the reader's only proof that the prompt did not
 * run, so it becomes a visible error row instead of ending as silence; the
 * shorter non-completed causes become one muted notice row.
 */
function onTurnEnd(ev, ctx) {
  const turn = ev.data?.turn
  const reason = ev.data?.reason
  if (reason === undefined || reason === null) return
  if (reason.kind === 'completed' || reason.kind === 'forked') return
  const key = `turn-end-${turn === undefined ? ctx.rows.length : turn}`
  if (reason.kind === 'error') {
    ctx.rows.push({
      key,
      kind: 'error',
      text: turnErrorText(reason.error, ctx.t),
      turn,
    })
    return
  }
  ctx.rows.push({ key, kind: 'notice', text: turnNotice(reason, ctx.t), turn })
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
  const files = contentFiles(ev.data?.content)
  if (text === '' && images.length === 0 && files.length === 0) return
  ctx.rows.push({
    key: `user-${ev.seq ?? ctx.rows.length}`,
    kind: 'user',
    text,
    images,
    files,
    turn: ev.data?.turn,
  })
}

/** Tool call row, carrying its result when the answering event is loaded. */
function onToolCall(ev, ctx) {
  const id = ev.data?.callId
  const call = { name: ev.data?.name ?? 'tool', argsRaw: ev.data?.arguments }
  ctx.rows.push(
    toolRow(`call-${id ?? ctx.rows.length}`, call, ctx.tools.results.get(id), {
      turn: ev.data?.turn,
      step: ev.data?.step,
    }),
  )
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
  ctx.rows.push(
    toolRow(`result-${id ?? ctx.rows.length}`, call, ev.data, {
      turn: ev.data?.turn,
      step: ev.data?.step,
    }),
  )
}

/** Event type -> row builder. A Map keeps prototype keys out of the dispatch. */
const HANDLERS = new Map([
  ['assistant/live-chunk', onLiveChunk],
  ['llm/retry', onRetry],
  ['assistant/attempt', onAttempt],
  ['assistant/message', onMessage],
  ['turn/start', onTurnStart],
  ['turn/end', onTurnEnd],
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

/**
 * Fold reasoning and Tool rows of one Turn into the process group Chat shows.
 *
 * Chat's standard view folds a completed Turn's process rows under one header
 * and keeps the final answer outside; a running group stays open. The split cell
 * gets the same shape: a group owns its reasoning text and Tool rows, and an
 * Assistant row that carried both reasoning and an answer is split so the answer
 * never hides inside the disclosure.
 * @param rows - flat rows from `buildTranscript`.
 * @returns rows with `kind: 'process'` groups in place of their members.
 */
export function groupProcessRows(rows) {
  const list = Array.isArray(rows) ? rows : []
  const out = []
  let group = null

  const flush = () => {
    if (group !== null) out.push(group)
    group = null
  }
  const groupFor = (row) => {
    if (group === null || group.turn !== row.turn) {
      flush()
      group = {
        key: `process-${row.turn}-${row.key}`,
        kind: 'process',
        turn: row.turn,
        running: false,
        items: [],
      }
    }
    return group
  }

  for (const row of list) {
    if (row.kind === 'tool') {
      const current = groupFor(row)
      current.items.push({ kind: 'tool', key: row.key, tool: row.tool })
      current.running = current.running || row.tool.running === true
      continue
    }
    if (row.kind === 'assistant' && typeof row.reasoning === 'string' && row.reasoning !== '') {
      const current = groupFor(row)
      current.items.push({
        kind: 'reasoning',
        key: `${row.key}-reasoning`,
        text: row.reasoning,
        streaming: row.streaming === true,
      })
      current.running = current.running || row.streaming === true
      if (row.text !== '') {
        flush()
        out.push({ ...row, reasoning: '' })
      }
      continue
    }
    flush()
    out.push(row)
  }
  flush()
  return out
}
