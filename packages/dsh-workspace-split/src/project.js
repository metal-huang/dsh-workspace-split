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
