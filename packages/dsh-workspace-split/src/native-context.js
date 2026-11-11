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
 *   mainView reference and destroy the view the reader is looking at. An
 *   explicit tile activation only spares the tile's own child (clicking another
 *   tile is an deliberate navigation); a background re-sync spares ANY subagent
 *   view, because catalog churn must never tear down a view the reader is
 *   inspecting without a user action.
 *
 * Ids are normalized to strings before every comparison: the archive set is
 * stringified for the same reason (Host rows can carry numeric ids), and a
 * strict `===` between a numeric current key and a string tile id would
 * silently disable the duplicate guard and re-open the Session on every
 * catalog snapshot.
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

/** Ids compare by value: Host rows can carry numeric ids beside string ones. */
function sameId(a, b) {
  if (a === undefined || a === null || b === undefined || b === null) return false
  return String(a) === String(b)
}

/** Normalize a tile's Session id to a non-empty string, or null when unusable. */
function normalizeTargetId(id) {
  if (typeof id !== 'string' && typeof id !== 'number') return null
  const target = String(id)
  return target === '' ? null : target
}

/**
 * Whether the native current view must be left alone: it is a subagent view,
 * and either the sync is background-driven (any subagent view is protected),
 * or the view belongs to this tile's own Session (explicit activation spares
 * only that child). The public SessionSummary calls the link `parentId` (the
 * internal lineage record's `parentSessionId` is renamed in the list mapping).
 */
function protectSubagentView(current, targetId, background) {
  if (current?.origin !== 'subagent') return false
  if (background === true) return true
  return sameId(current.parentId, targetId)
}

/**
 * @param targetId - Session id of the active tile, if any.
 * @param byId - `ctx.sessions.list.getSnapshot().byId` catalog rows.
 * @param archived - set from `archivedSessionIds`.
 * @param archivedReady - whether the Workspace snapshot left its pending
 *   phase; until then the archive set is an empty placeholder, not a fact.
 * @param currentKey - `uiSession.adapter.current.getSnapshot().key`; the native
 *   main view's Session id (a child id while a subagent view is open).
 * @param background - true for effect-driven re-syncs (no user action): any
 *   native subagent view then blocks the sync, not just the tile's own child.
 * @returns the id to pass to `uiWorkspace.openSession`, or null for no sync.
 */
export function nativeSyncTarget({
  targetId,
  byId,
  archived,
  archivedReady,
  currentKey,
  background,
}) {
  const target = normalizeTargetId(targetId)
  if (target === null) return null
  // mousedown and focus capture both activate a tile; without this guard each
  // click would re-retain and rewrite the persisted selection twice.
  if (sameId(currentKey, target)) return null
  if (archivedReady !== true) return null
  // sessions.create resolves before the Host session-added event: retaining
  // an id the catalog does not know yet throws `unknown session`. The caller
  // re-runs on the next catalog snapshot, so the sync happens on arrival.
  if (rowOf(byId, target) === undefined) return null
  // Archived Sessions stay in the catalog; opening one as current makes the
  // native archive watcher clear the main view.
  if (isArchivedSession(archived, target)) return null
  if (protectSubagentView(rowOf(byId, currentKey), target, background)) return null
  return target
}
