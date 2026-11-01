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

/**
 * Fixed box for the panel, anchored to its trigger.
 *
 * Opens below when the preferred height fits, otherwise above; always clamped
 * inside the viewport with an 8px margin, because the trigger sits at the tile's
 * right edge and the tile can be at the window's edge too.
 * @param rect - trigger box (`top`/`right`/`bottom`).
 * @param viewport - `{ width, height }` of the window.
 * @param preferred - `{ width, maxHeight }` the panel would like.
 * @returns `{ top, left, width, maxHeight }` for a fixed-positioned panel.
 */
export function pickerPanelBox(rect, viewport, preferred) {
  const width = Math.min(preferred.width, viewport.width - 16)
  const maxHeight = Math.min(preferred.maxHeight, viewport.height - 16)
  const left = Math.max(8, Math.min(rect.right - width, viewport.width - width - 8))
  const below = rect.bottom + 6
  const above = rect.top - 6 - maxHeight
  const top = below + maxHeight <= viewport.height ? below : Math.max(8, above)
  return { top, left, width, maxHeight }
}
