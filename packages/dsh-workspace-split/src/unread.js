/**
 * Clearing the "completed" dot from a split tile.
 *
 * DSH lights `SessionStatus.completionUnread` when a Session finishes, and
 * clears it on two normal paths: that Session is retained by the main view, or
 * it starts running again (a Session that leaves the catalog is cleaned up as
 * well). A tile retains through its own source (`source: 'controllerOperation'`)
 * and is never the main view, so without this module the dot stays lit until
 * the reader opens Chat.
 *
 * There is no public write path for the marker: `ctx.uiSession.sessionStatus` is
 * read-only. So this module reaches the client-side `uiSession` instance's own
 * `completionUnread` set and calls its `publishStatus()` to make the sidebar
 * redraw. That is a deliberate boundary crossing — both member names are
 * TypeScript-private, and `test/dsh-contract.test.js` asserts them against the
 * installed build, so an upstream rename fails a gate instead of breaking
 * quietly. The helper also degrades to "leave the dot lit" rather than throwing
 * when the internals moved or the Session is gone.
 */

/**
 * Clear the complete-and-unread marker of one Session.
 *
 * No marker means no publish: `publishStatus()` wakes every status subscriber,
 * so firing it for a Session that was already read would redraw the sidebar for
 * nothing.
 *
 * @param uiSession - injected `ctx.uiSession` instance.
 * @param sessionId - Session to mark as read.
 * @returns true only when the marker was cleared and the status was published.
 */
export function acknowledgeUnread(uiSession, sessionId) {
  const unread = uiSession?.completionUnread
  const publish = uiSession?.publishStatus
  // Either member missing means the internals moved: keep the dot, do not throw.
  if (!(unread instanceof Set) || typeof publish !== 'function') return false
  if (!clearMarker(unread, sessionId)) return false
  try {
    publish.call(uiSession)
  } catch {
    return false
  }
  return true
}

/**
 * Drop one id from the completion set.
 * @param unread - the instance's own set.
 * @param sessionId - Session to clear; an absent id has nothing to clear.
 * @returns whether an entry was actually removed.
 */
function clearMarker(unread, sessionId) {
  if (sessionId === null || sessionId === undefined) return false
  try {
    return unread.delete(typeof sessionId === 'string' ? sessionId : String(sessionId))
  } catch {
    return false
  }
}
