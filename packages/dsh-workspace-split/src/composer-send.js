/**
 * Send one prompt only while the tile still owns the same Session.
 *
 * An accepted prompt cannot be recalled client-side. Therefore identity is
 * checked immediately before sending and again on settlement; a stale result
 * never clears the rebound tile's draft or surfaces the old Session's error.
 */

/**
 * Prompt mode for one split-composer send.
 *
 * Native's plain-Enter rule: the Host preference decides only while a turn is
 * already running; an idle Session always starts a new turn, and a preference
 * that cannot be read falls back to the Host default `queue`. Hardcoding either
 * value would make the same Enter key behave differently here and in the main
 * composer.
 * @param busyEnter - the Host `ui-conversation.busyEnter` value, when readable.
 * @param running - whether the Session is running at send time.
 * @returns the mode to pass to `session.prompt`.
 */
export function sendMode(busyEnter, running) {
  return running === true && busyEnter === 'steer' ? 'steer' : 'queue'
}

/** Keep the Host default when a caller cannot name a mode. */
function queueMode(mode) {
  return mode === 'steer' ? 'steer' : 'queue'
}

/**
 * Encode and send one prompt with the chosen mode while the tile still owns the
 * same Session.
 * @param session - Session face the composer is bound to.
 * @param isCurrentSession - identity guard checked before and after sending.
 * @param encode - builds the prompt parts.
 * @param mode - prompt mode; `queue` unless the caller resolved a running steer.
 * @returns settled outcome for the composer's draft and error handling.
 */
export async function promptWhileCurrent(session, isCurrentSession, encode, mode) {
  let parts
  try {
    parts = await encode()
  } catch (error) {
    return isCurrentSession() ? { action: 'error', stage: 'encode', error } : { action: 'stale' }
  }

  if (!isCurrentSession()) return { action: 'stale' }
  let result
  try {
    result = await session.prompt(parts, queueMode(mode))
  } catch (error) {
    return isCurrentSession() ? { action: 'error', stage: 'prompt', error } : { action: 'stale' }
  }

  if (!isCurrentSession()) return { action: 'stale' }
  if (result?.ok !== true) return { action: 'error', stage: 'prompt', error: result?.error }
  return { action: 'sent' }
}
