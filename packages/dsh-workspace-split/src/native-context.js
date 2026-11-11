/**
 * Decide which Session the native main view should follow for the active tile.
 *
 * DSH 0.2.2-rc.1 has no panel-preserving selection API: `uiWorkspace.openSession`
 * always reveals the Conversation (`replaceMain(..., 'reveal')` →
 * `layout.selectPanel(null)`). The split panel therefore calls `openSession` and
 * re-selects itself in the same synchronous block; React 18 batches the two
 * store writes so the panel never unmounts. This module owns the *whether* of
 * that call so every guard is testable without React or DSH.
 *
 * Guards, each tied to an observed failure:
 * - unknown/late target: `sessions.create` returns before the Host's
 *   session-added event lands, so a freshly assigned tile id may not be in the
 *   catalog yet; `sessions.retain` would throw `unknown session`. The caller
 *   re-runs on every catalog snapshot, so the sync happens when the row arrives.
 * - archived target: archived Sessions stay in the catalog, so presence alone
 *   cannot vouch for a tile; opening an archived Session as current makes the
 *   native archive watcher clear the main view.
 * - archive set not ready: `WorkspaceSnapshot` starts pending with an EMPTY
 *   `archivedSessionIds`, so reading it as "not archived" would open a
 *   restored archived tile as current on startup — and when the archive
 *   baseline lands, DSH's clearArchivedCurrent clears the main view and
 *   ejects the split panel. The sync waits for the ready phase instead.
 * - duplicate: `openSession` re-retains and rewrites the persisted selection,
 *   and the tile fires activation from both mousedown and focus capture, so an
 *   unchanged target must be a no-op.
 * - subagent view: the native current key is the *child* Session id while the
 *   reader inspects a subagent. Re-opening the parent would release the child's
 *   mainView reference and destroy the view the reader is looking at, so a tile
 *   whose Session is the current view's parent does not sync.
 *
 * An undefined current key does NOT block the sync. DSH's own startup restore
 * uses 'preserve' (it never closes the panel), and a fresh Host has no tile
 * Sessions to sync anyway; blocking on undefined would instead wedge the
 * feature whenever the native main view is empty.
 */

import { isArchivedSession } from './session-state.js'

/** Catalog row for an id, normalizing null/absent to undefined. */
function rowOf(byId, id) {
  if (id === undefined || id === null) return undefined
  const row = byId?.[id]
  return row === null ? undefined : row
}

/**
 * The native current view is a subagent of this tile's Session: the current
 * key is the child id, and re-opening the parent would release the child's
 * mainView reference and destroy the view the reader is looking at.
 * The public SessionSummary calls the link `parentId` (the internal lineage
 * record's `parentSessionId` is renamed in the list snapshot mapping).
 */
function currentIsChildOfTarget(current, targetId) {
  return (
    current?.origin === 'subagent' &&
    current.parentId !== undefined &&
    String(current.parentId) === targetId
  )
}

/**
 * @param targetId - Session id of the active tile, if any.
 * @param byId - `ctx.sessions.list.getSnapshot().byId` catalog rows.
 * @param archived - set from `archivedSessionIds`.
 * @param archivedReady - whether the Workspace snapshot left its pending
 *   phase; until then the archive set is an empty placeholder, not a fact.
 * @param currentKey - `uiSession.adapter.current.getSnapshot().key`; the native
 *   main view's Session id (a child id while a subagent view is open).
 * @returns the id to pass to `uiWorkspace.openSession`, or null for no sync.
 */
export function nativeSyncTarget({ targetId, byId, archived, archivedReady, currentKey }) {
  if (typeof targetId !== 'string' || targetId === '') return null
  // mousedown and focus capture both activate a tile; without this guard each
  // click would re-retain and rewrite the persisted selection twice.
  if (currentKey === targetId) return null
  if (archivedReady !== true) return null
  // sessions.create resolves before the Host session-added event: retaining
  // an id the catalog does not know yet throws `unknown session`. The caller
  // re-runs on the next catalog snapshot, so the sync happens on arrival.
  if (rowOf(byId, targetId) === undefined) return null
  // Archived Sessions stay in the catalog; opening one as current makes the
  // native archive watcher clear the main view.
  if (isArchivedSession(archived, targetId)) return null
  if (currentIsChildOfTarget(rowOf(byId, currentKey), targetId)) return null
  return targetId
}
