/**
 * Project identity for a split-cell header.
 *
 * A Session's list entry only carries `cwd`; Workspace membership lives on the
 * Workspace list. The badge is therefore resolved from the same catalog the
 * picker already uses, with the folder leaf as a fallback so a session outside a
 * Workspace still says which project it belongs to.
 */

/** Stable badge hues; readable on the dark desktop theme. */
const PROJECT_COLORS = [
  '#5aa9ff',
  '#a78bfa',
  '#34d399',
  '#fbbf24',
  '#f472b6',
  '#22d3ee',
  '#fb7185',
  '#a3e635',
]

/** Leaf name of a filesystem path, without a trailing separator. */
export function cwdName(cwd) {
  if (typeof cwd !== 'string') return ''
  const trimmed = cwd.trim().replace(/[\\/]+$/u, '')
  if (trimmed === '' || /^[A-Za-z]:$/u.test(trimmed)) return ''
  const parts = trimmed.split(/[\\/]/u)
  return parts[parts.length - 1] ?? ''
}

/** Workspace title that lists one Session, or ''. */
function workspaceTitleFor(id, workspaceItems) {
  if (id === '') return ''
  const items = Array.isArray(workspaceItems) ? workspaceItems : []
  const workspace = items.find((item) =>
    (item?.sessionIds ?? []).some((candidate) => String(candidate) === id),
  )
  return typeof workspace?.title === 'string' ? workspace.title : ''
}

/**
 * Display project for one Session.
 * @param session - Session list entry (`sessionId`/`id`, `cwd`).
 * @param workspaceItems - Workspace catalog entries with `sessionIds`/`title`.
 * @returns Workspace title, or the cwd leaf, or ''.
 */
export function projectNameOf(session, workspaceItems) {
  const id = String(session?.sessionId ?? session?.id ?? '')
  return workspaceTitleFor(id, workspaceItems) || cwdName(session?.cwd)
}

/**
 * Session id → Workspace title, built once for callers that resolve many rows.
 *
 * `projectNameOf` scans the Workspace catalog on every call, which is fine for
 * one header but quadratic for a picker that lists the whole catalog on every
 * stream tick. The index keeps the same first-match rule as `projectNameOf`.
 * @param workspaceItems - Workspace catalog entries with `sessionIds`/`title`.
 * @returns map of stringified Session id to Workspace title.
 */
export function projectIndex(workspaceItems) {
  const index = new Map()
  for (const item of Array.isArray(workspaceItems) ? workspaceItems : []) {
    const title = typeof item?.title === 'string' ? item.title : ''
    for (const id of item?.sessionIds ?? []) {
      const key = String(id)
      // First Workspace wins, matching the `find` in projectNameOf.
      if (!index.has(key)) index.set(key, title)
    }
  }
  return index
}

/**
 * Display project for one Session, resolved through `projectIndex`.
 * @param index - map from `projectIndex`.
 * @param session - Session list entry (`sessionId`/`id`, `cwd`).
 * @returns Workspace title, or the cwd leaf, or ''.
 */
export function projectNameFrom(index, session) {
  const id = String(session?.sessionId ?? session?.id ?? '')
  const title = index instanceof Map ? index.get(id) : undefined
  return (typeof title === 'string' && title !== '' ? title : '') || cwdName(session?.cwd)
}

/**
 * Pill that names a project, in a tile header and in the picker rows.
 *
 * Shared instead of copied so the two surfaces cannot drift: the header's badge
 * and the picker's badge are the same object with the same color derivation.
 * @param color - from `projectColor`.
 * @returns the badge style.
 */
export function projectBadgeStyle(color) {
  return {
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '46%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    padding: '1px 8px',
    border: `0.5px solid ${color}66`,
    borderRadius: 7,
    background: `${color}24`,
    color,
    fontSize: 'inherit',
    lineHeight: '20px',
    fontWeight: 600,
    letterSpacing: 0,
  }
}

/**
 * Stable color for a project name; the same project keeps its hue across cells
 * and restarts, while different projects usually differ.
 * @param name - project title.
 * @returns one hex color.
 */
export function projectColor(name) {
  const text = typeof name === 'string' ? name : ''
  let hash = 0
  for (const char of text) hash = (hash * 31 + char.codePointAt(0)) >>> 0
  return PROJECT_COLORS[hash % PROJECT_COLORS.length]
}
