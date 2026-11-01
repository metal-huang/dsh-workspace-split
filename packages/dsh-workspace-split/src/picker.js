/**
 * Rules behind the split tile's session picker.
 *
 * Kept out of the component so the three decisions that are easy to get wrong —
 * what a search keeps, where the keyboard cursor lands, and where the panel
 * fits — stay testable without a browser.
 */

/**
 * Row title: the display title, then the durable title, then the id prefix.
 * @param session - Session list entry.
 * @returns one line of text, never empty for a real row.
 */
export function pickerTitleOf(session) {
  const shown = textOf(session?.displayTitle) || textOf(session?.title)
  if (shown !== '') return shown
  return String(session?.id ?? '').slice(0, 8)
}

/**
 * One picker row for a Session, with the project resolved by the caller.
 * @param session - Session list entry.
 * @param project - display project, or '' when the tile is project-scoped.
 * @returns `{ id, title, project, running }`.
 */
export function pickerRowOf(session, project) {
  return {
    id: session?.id,
    title: pickerTitleOf(session),
    project: textOf(project),
    running: session?.running === true,
  }
}

/** The value if it is a string, else ''. */
function textOf(value) {
  return typeof value === 'string' ? value : ''
}

/**
 * Rows a search query keeps.
 *
 * Matches the title and the project name, case-insensitively: a reader who
 * remembers the project but not the title must still find the row, and the
 * project is exactly what the badge shows.
 * @param rows - picker rows (`title`, `project`).
 * @param query - what the reader typed.
 * @returns the matching rows, in the caller's order.
 */
export function filterPickerRows(rows, query) {
  const list = Array.isArray(rows) ? rows : []
  const text = typeof query === 'string' ? query.trim().toLowerCase() : ''
  if (text === '') return list
  return list.filter((row) => {
    const title = typeof row?.title === 'string' ? row.title.toLowerCase() : ''
    const project = typeof row?.project === 'string' ? row.project.toLowerCase() : ''
    return title.includes(text) || project.includes(text)
  })
}

/**
 * Move the keyboard cursor, wrapping at both ends.
 * @param index - current cursor.
 * @param delta - +1 down, -1 up.
 * @param length - row count.
 * @returns the next cursor, never out of range.
 */
export function movePickerIndex(index, delta, length) {
  if (!Number.isInteger(length) || length <= 0) return 0
  const from = Number.isInteger(index) ? index : 0
  return (((from + delta) % length) + length) % length
}

/**
 * Cursor to open with: the row already bound to the tile, else the first one.
 * @param rows - picker rows.
 * @param currentId - the tile's Session id, or null/'' when empty.
 * @returns an index inside `rows`, or 0.
 */
export function initialPickerIndex(rows, currentId) {
  const list = Array.isArray(rows) ? rows : []
  if (currentId === null || currentId === undefined || currentId === '') return 0
  const at = list.findIndex((row) => String(row?.id) === String(currentId))
  return at < 0 ? 0 : at
}

/**
 * What one key press should do inside the picker.
 *
 * The handler stays a switch because these keys are the whole keyboard surface;
 * keeping the mapping pure lets the browser test assert it without a keyboard.
 * @param key - `event.key`.
 * @param index - current cursor.
 * @param length - filtered row count.
 * @returns `{ type: 'move', index }`, `{ type: 'choose' }`, `{ type: 'close' }`
 *   (`refocus: false` for Tab), or `{ type: 'none' }`.
 */
export function resolvePickerKey(key, index, length) {
  if (key === 'Escape') return { type: 'close' }
  if (key === 'Tab') return { type: 'close', refocus: false }
  if (key === 'ArrowDown') return { type: 'move', index: movePickerIndex(index, 1, length) }
  if (key === 'ArrowUp') return { type: 'move', index: movePickerIndex(index, -1, length) }
  if (key === 'Home') return { type: 'move', index: 0 }
  if (key === 'End') return { type: 'move', index: Math.max(0, length - 1) }
  if (key === 'Enter') return { type: 'choose' }
  return { type: 'none' }
}

/** Breathing room kept between the panel and the window edge. */
const PANEL_MARGIN = 8
/** Gap between the trigger and the panel. */
const PANEL_GAP = 6
/** Below this much room, opening upward is worth it; above, never flip needlessly. */
const PANEL_MIN_USEFUL = 160

/**
 * Fixed box for the panel, anchored to its trigger.
 *
 * Opens below when there is useful room; otherwise above, anchored by its
 * `bottom` edge. Anchoring by the real edge matters: an "above" box computed
 * from the preferred height leaves a 150px hole between a short panel and its
 * trigger, because the panel's height is content-driven. The chosen side's
 * maxHeight is clamped to the room it actually has, so the panel never covers
 * the trigger, and both sides keep the 8px window margin.
 * @param rect - trigger box (`top`/`right`/`bottom`).
 * @param viewport - `{ width, height }` of the window.
 * @param preferred - `{ width, maxHeight }` the panel would like.
 * @returns `{ top, left, width, maxHeight }` when opening below, or
 *   `{ bottom, left, width, maxHeight }` when opening above.
 */
export function pickerPanelBox(rect, viewport, preferred) {
  const width = Math.min(preferred.width, viewport.width - PANEL_MARGIN * 2)
  const maxHeight = Math.min(preferred.maxHeight, viewport.height - PANEL_MARGIN * 2)
  const left = Math.max(
    PANEL_MARGIN,
    Math.min(rect.right - width, viewport.width - width - PANEL_MARGIN),
  )
  const spaceBelow = viewport.height - rect.bottom - PANEL_GAP - PANEL_MARGIN
  const spaceAbove = rect.top - PANEL_GAP - PANEL_MARGIN
  const wantsBelow = spaceBelow >= Math.min(maxHeight, PANEL_MIN_USEFUL)
  const wantsAbove = spaceAbove >= Math.min(maxHeight, PANEL_MIN_USEFUL)
  if (!wantsBelow && wantsAbove) {
    return {
      bottom: viewport.height - rect.top + PANEL_GAP,
      left,
      width,
      maxHeight: Math.min(maxHeight, Math.max(0, spaceAbove)),
    }
  }
  return {
    top: rect.bottom + PANEL_GAP,
    left,
    width,
    maxHeight: Math.min(maxHeight, Math.max(0, spaceBelow)),
  }
}
