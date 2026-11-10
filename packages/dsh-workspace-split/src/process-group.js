/**
 * Rules for the process-group disclosure inside a split cell.
 *
 * The header names what ran; the body keeps Tool rows and reasoning blocks in
 * their original order. Reasoning stays folded inside its own "Think" row, the
 * way Chat keeps it in the group without dumping the text on expand. Kept free
 * of React and DOM so the rules can be tested directly.
 */

/** First non-empty line of a text block, trimmed. */
function firstLine(text) {
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed !== '') return trimmed
  }
  return ''
}

/**
 * Header summary of one process group.
 *
 * Tool names are the useful summary. A reasoning-only group still needs a
 * title: Chat keeps that group visible instead of dropping it, so the caller
 * falls back to its translated reasoning label.
 * @param items - process group items, `kind: 'tool'` or `kind: 'reasoning'`.
 * @param labels - translated labels; `reasoning` names a reasoning-only group.
 * @returns summary text, or '' when the group has nothing to name.
 */
export function processSummary(items, labels) {
  const names = toolNames(items)
  if (names.length > 0) return names.join(', ')
  const fallback = labels?.reasoning
  return hasReasoning(items) && typeof fallback === 'string' ? fallback : ''
}

/** Tool names in the order they appear, without duplicates. */
function toolNames(items) {
  const names = []
  for (const item of Array.isArray(items) ? items : []) {
    if (item?.kind !== 'tool') continue
    const name = item.tool?.name
    if (typeof name === 'string' && name !== '' && !names.includes(name)) names.push(name)
  }
  return names
}

/** Whether any group member is a reasoning block. */
function hasReasoning(items) {
  return (Array.isArray(items) ? items : []).some((item) => item?.kind === 'reasoning')
}

/**
 * Collapsed preview of one reasoning block.
 *
 * While text streams, the newest line is usually half a sentence; Chat previews
 * the first line of the latest completed paragraph instead, and shows nothing
 * until a line has completed. A settled block previews its first line.
 * @param text - reasoning text, complete or streaming.
 * @param streaming - whether more text is still arriving.
 * @returns one line of preview text, or '' when no complete line exists.
 */
export function reasoningPreview(text, streaming) {
  const source = typeof text === 'string' ? text : ''
  if (source.trim() === '') return ''
  if (!streaming) return firstLine(source)
  let summary = ''
  let start = 0
  const separator = /\r?\n(?:[\t ]*\r?\n)+/g
  for (;;) {
    const next = separator.exec(source)
    const paragraphEnd = next === null ? source.length : next.index + next[0].indexOf('\n')
    const newline = source.indexOf('\n', start)
    if (newline !== -1 && newline <= paragraphEnd) {
      const candidate = source.slice(start, newline).trim()
      if (candidate !== '') summary = candidate
    }
    if (next === null) return summary
    start = next.index + next[0].length
  }
}
