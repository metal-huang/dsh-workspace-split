/**
 * Archived-Session rules for the split grid.
 *
 * Archiving does not remove a Session from `ctx.sessions.list`: archiving is a
 * Workspace-registry fact, and the sidebar filters its own rows against that
 * set in the UI layer. So the grid has to read the set itself, or a tile keeps
 * showing — and keeps retaining — a Session the reader just put away.
 *
 * These helpers stay free of React and DSH imports so they are directly
 * testable with plain objects.
 */

/**
 * Registry-global archived Session ids carried by a Workspace snapshot.
 * @param workspaceSnapshot - `ctx.workspaces.list` snapshot.
 * @returns the ids as strings; empty when the snapshot carries no archive set.
 */
export function archivedSessionIds(workspaceSnapshot) {
  const ids = workspaceSnapshot?.archivedSessionIds
  if (!Array.isArray(ids)) return new Set()
  // SessionId is a branded string: compare by value, never by reference, because
  // the catalog and the Workspace registry hand out separate objects.
  return new Set(ids.map((id) => String(id)))
}

/**
 * Whether a Session is archived. An absent id is never archived.
 * @param archived - set from `archivedSessionIds`.
 * @param sessionId - Session id to test.
 * @returns true when the Session is in the archive set.
 */
export function isArchivedSession(archived, sessionId) {
  if (sessionId === null || sessionId === undefined) return false
  if (typeof archived?.has !== 'function') return false
  return archived.has(String(sessionId))
}

/**
 * Sessions a picker may offer, in the caller's order.
 *
 * Blank rows are kept: the callers already drop them where a blank is not a
 * choosable session, and dropping them twice would hide that decision here.
 * @param rows - candidate Session rows.
 * @param archived - set from `archivedSessionIds`.
 * @returns the rows that are neither absent nor archived.
 */
export function pickableSessions(rows, archived) {
  if (!Array.isArray(rows)) return []
  return rows.filter((row) => row != null && !isArchivedSession(archived, row.id))
}

/**
 * Drop cell assignments whose Session is no longer usable.
 *
 * A Workspace cell keeps its scope and only loses the Session id, so re-picking
 * inside the same project still works; every other kind empties completely.
 *
 * Archiving joins the staleness test right here on purpose: the archive set is a
 * registry fact and the Session catalog does not drop the Session, so "still
 * known" on its own can never release a cell. Putting both conditions in one
 * pure step also keeps the effect that calls this from having to know about
 * either source.
 *
 * @param cells - current assignments, one per grid position.
 * @param knownIds - ids still present in the Session catalog.
 * @param archived - set from `archivedSessionIds`.
 * @returns a new array, or the input array itself when nothing changed.
 */
export function reconcileCells(cells, knownIds, archived) {
  if (!Array.isArray(cells)) return cells
  let changed = false
  const next = cells.map((cell) => {
    if (cell === null || cell === undefined) return cell
    const id = cell.id
    if (id === null || id === undefined) return cell
    const known = typeof knownIds?.has === 'function' && knownIds.has(id)
    if (known && !isArchivedSession(archived, id)) return cell
    changed = true
    return cell.t === 'workspace' ? { ...cell, id: null } : null
  })
  // The caller decides whether to re-render from reference identity, so an
  // untouched grid must come back as the very same array.
  return changed ? next : cells
}

/**
 * Prefer the ready Host catalog over a retained history binding: the binding can
 * be stale after the turn settles, while the catalog receives Host status alone.
 */
export function runningState(catalog, sessionId, sessionState) {
  const hostRunning = catalog?.phase === 'ready' ? catalog.byId?.[sessionId]?.running : undefined
  return typeof hostRunning === 'boolean' ? hostRunning : sessionState?.running === true
}
