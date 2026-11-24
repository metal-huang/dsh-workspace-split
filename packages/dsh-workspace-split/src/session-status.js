/**
 * Resolve the pending-interaction registry (`sessionStatus`) across DSH versions.
 *
 * DSH 0.2.2 exposes it as a plain member of the `uiSession` service. 0.2.3 moved
 * it to its own Cordis service `uiSession.sessionStatus`, gated behind `inject`;
 * a direct member read there throws `cannot get property ... without inject`
 * and crashes the tile. `ctx.get(name)` is the documented optional-service
 * access: it returns undefined instead of throwing when the service is absent,
 * so one probe works on both versions without declaring an inject entry that
 * 0.2.2 does not provide (which would instead wedge activation).
 *
 * @param ctx - the plugin client context (`ctx.get` optional access).
 * @param uiSession - the injected `ctx.uiSession`, the 0.2.2 host of the member.
 * @returns the status source, or undefined when neither version exposes it.
 */
export function selectSessionStatusService(ctx, uiSession) {
  let service
  try {
    service = ctx?.get?.('uiSession.sessionStatus')
  } catch {
    service = undefined
  }
  if (service !== undefined && service !== null) return service
  try {
    return uiSession?.sessionStatus ?? undefined
  } catch {
    return undefined
  }
}

/**
 * A per-plugin-instance getter for the status source.
 *
 * It is created inside `apply` so two plugin instances never share state. The
 * first successful probe is cached, but every call re-probes until then: 0.2.3
 * keeps `uiSession.sessionStatus` out of our `inject` list (declaring it would
 * wedge 0.2.2 activation), so Cordis gives no ordering edge and the service can
 * register after `apply` has run. Callers (see `usePendingInteraction`) poll a
 * few times to pick up a late registration instead of staying blind forever.
 *
 * @param ctx - the plugin client context.
 * @param uiSession - the injected `ctx.uiSession`.
 * @returns a function returning the status source, or undefined until it exists.
 */
export function createSessionStatusGetter(ctx, uiSession) {
  let cached
  return function getSessionStatusSource() {
    // Compare against a fresh probe by identity, not by the cached object's
    // shape: a replaced (HMR / re-registered) service still has `subscribe`, so
    // a shape check would return the dead registry forever.
    const found = selectSessionStatusService(ctx, uiSession)
    if (found !== undefined) cached = found
    return cached
  }
}

/**
 * Subscribe to a status source that may not exist yet.
 *
 * If the source is present now, subscribe and fire one read immediately (a
 * value may have changed between the render's snapshot and this subscription).
 * Otherwise poll fast (`intervalMs`) up to `maxTries`, then keep a slow
 * background poll until it appears — never permanently giving up, since a
 * missing late service is the whole reason this exists. This is what picks up
 * `uiSession.sessionStatus` when DSH 0.2.3 registers it after our `apply`.
 * @param getSource - returns the current source, or undefined.
 * @param onChange - store subscriber (React's re-read callback).
 * @param options - `intervalMs` and `maxTries` for the missing-source poll.
 * @returns an unsubscribe that also clears any pending poll.
 */
export function subscribeWhenAvailable(
  getSource,
  onChange,
  { intervalMs = 200, maxTries = 25 } = {},
) {
  const fire = () => {
    try {
      onChange()
    } catch {
      // A subscriber throw must not stop the poll/subscription setup.
    }
  }
  const source = getSource?.()
  if (typeof source?.subscribe === 'function') {
    const stop = source.subscribe(onChange)
    fire()
    // A store may return a non-function unsubscribe; hand React a safe one.
    return typeof stop === 'function' ? stop : () => {}
  }
  let stop = () => {}
  let timer = null
  let tries = 0
  // Fast poll first, then a slow background poll that never gives up: a service
  // that registers after maxTries is still picked up instead of leaving this
  // cell blind to approvals for the rest of the page's life. The slow interval
  // is one no-op per second while absent, cleared on unmount.
  let delay = intervalMs
  const tick = () => {
    const late = getSource?.()
    if (typeof late?.subscribe === 'function') {
      if (timer !== null) clearInterval(timer)
      timer = null
      const off = late.subscribe(onChange)
      stop = typeof off === 'function' ? off : () => {}
      fire()
      return
    }
    if (delay === intervalMs && (tries += 1) >= maxTries) {
      if (timer !== null) clearInterval(timer)
      delay = 1000
      timer = setInterval(tick, delay)
    }
  }
  timer = setInterval(tick, delay)
  return () => {
    if (timer !== null) clearInterval(timer)
    timer = null
    stop()
  }
}
