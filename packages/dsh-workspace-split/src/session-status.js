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
 * The getter deliberately has no cache. Only the shared store's subscription
 * machinery calls it, so render-time snapshot reads stay pure, and a service
 * removed by HMR cannot leave an old registry visible through a stale cache.
 *
 * @param ctx - the plugin client context.
 * @param uiSession - the injected `ctx.uiSession`.
 * @returns a function returning the current status source, or undefined.
 */
export function createSessionStatusGetter(ctx, uiSession) {
  return () => selectSessionStatusService(ctx, uiSession)
}

/**
 * Share one status-source subscription and one identity poll per plugin instance.
 *
 * `getSnapshot` only reads the currently attached source. All probing happens
 * on the first subscription and the single timer: missing services are checked
 * quickly at first, then forever at the slow cadence. An existing service keeps
 * the slow cadence too, because HMR can replace or remove its object identity.
 * The last unsubscribe releases both resources and clears the source so a later
 * subscription starts with a fresh attach.
 *
 * @param getSource - returns the current source, or undefined when unavailable.
 * @param options - polling cadence and an optional timer implementation for tests.
 * @returns a store with pure `getSnapshot` and idempotent `subscribe` disposers.
 */
export function createSessionStatusStore(
  getSource,
  { intervalMs = 200, maxTries = 25, slowIntervalMs = 1000, timers = globalThis } = {},
) {
  // Counts rather than a Set preserve duplicate subscribe calls: React may tear
  // down and establish subscriptions independently, and one disposer must not
  // remove another registration of the same callback.
  const listeners = new Map()
  const noop = () => {}
  let source
  let stopSource = noop
  let timer = null
  let timerDelay
  let misses = 0

  const notify = () => {
    for (const listener of [...listeners.keys()]) {
      try {
        listener()
      } catch {
        // One cell's listener must not prevent the others from seeing a change.
      }
    }
  }

  const clearPoll = () => {
    if (timer !== null) timers.clearInterval(timer)
    timer = null
    timerDelay = undefined
  }

  const detach = () => {
    const stop = stopSource
    stopSource = noop
    try {
      stop()
    } catch {
      // A broken old service must not block attachment to its replacement.
    }
  }

  const attach = (next) => {
    if (next === undefined) return
    try {
      const stop = next.subscribe(notify)
      source = next
      stopSource = typeof stop === 'function' ? stop : noop
    } catch {}
  }

  const ensurePoll = () => {
    if (listeners.size === 0) return
    const delay = source !== undefined || misses >= maxTries ? slowIntervalMs : intervalMs
    if (timer !== null && timerDelay === delay) return
    clearPoll()
    timer = timers.setInterval(tick, delay)
    timerDelay = delay
  }

  const probe = (countMiss = false) => {
    const found = getSource?.()
    const next = typeof found?.subscribe === 'function' ? found : undefined
    if (next !== source) {
      // Detach before touching the replacement: old registries can outlive their
      // Cordis registration during HMR and must receive no further notifications.
      detach()
      // Do not expose a source until its subscription succeeds. A throwing
      // attach must leave an empty snapshot and be retried by the next tick,
      // rather than escaping the interval and pinning a dead registry forever.
      source = undefined
      attach(next)
      // A late source may already contain pending interactions, so attachment
      // itself is a change even if the source does not emit an initial event.
      notify()
    }
    if (source === undefined) {
      if (countMiss) misses += 1
    } else {
      misses = 0
    }
  }

  function tick() {
    if (listeners.size === 0) {
      clearPoll()
      return
    }
    probe(true)
    ensurePoll()
  }

  const subscribe = (listener) => {
    const wasEmpty = listeners.size === 0
    listeners.set(listener, (listeners.get(listener) ?? 0) + 1)
    if (wasEmpty) {
      misses = 0
      probe()
      ensurePoll()
    }

    let active = true
    return () => {
      if (!active) return
      active = false
      const count = listeners.get(listener)
      if (count === undefined) return
      if (count > 1) listeners.set(listener, count - 1)
      else listeners.delete(listener)
      if (listeners.size > 0) return
      clearPoll()
      detach()
      source = undefined
      misses = 0
    }
  }

  const getSnapshot = () => source?.getSnapshot?.()
  return { subscribe, getSnapshot }
}
