/**
 * Encode and queue one prompt only while the tile still owns the same Session.
 *
 * An accepted prompt cannot be recalled client-side. Therefore identity is
 * checked immediately before queueing and again on settlement; a stale result
 * never clears the rebound tile's draft or surfaces the old Session's error.
 */
export async function promptWhileCurrent(session, isCurrentSession, encode) {
  let parts
  try {
    parts = await encode()
  } catch (error) {
    return isCurrentSession() ? { action: 'error', stage: 'encode', error } : { action: 'stale' }
  }

  if (!isCurrentSession()) return { action: 'stale' }
  let result
  try {
    result = await session.prompt(parts, 'queue')
  } catch (error) {
    return isCurrentSession() ? { action: 'error', stage: 'prompt', error } : { action: 'stale' }
  }

  if (!isCurrentSession()) return { action: 'stale' }
  if (result?.ok !== true) return { action: 'error', stage: 'prompt', error: result?.error }
  return { action: 'sent' }
}
