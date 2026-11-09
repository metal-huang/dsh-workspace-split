/** Native stop uses two independent Escape presses, not a single accidental key. */
export class DoubleEscape {
  constructor(timeoutMs = 500) {
    this.timeoutMs = timeoutMs
    this.firstAt = null
  }

  reset() {
    this.firstAt = null
  }

  /**
   * Record one eligible Escape. Returns true only for the second press in time.
   * No timer is needed: an expired first press simply becomes the new first one.
   */
  press(now) {
    if (!Number.isFinite(now)) {
      this.reset()
      return false
    }
    const firstAt = this.firstAt
    this.firstAt = now
    if (firstAt === null || now < firstAt || now - firstAt > this.timeoutMs) return false
    this.reset()
    return true
  }
}

/**
 * Build the DOM-free half of the active-cell Escape handler. The caller injects
 * its visibility and layer predicates, so the exact stop behavior is testable.
 */
export function createEscapeStopHandler({
  stop,
  timeoutMs,
  ownsLayer,
  belongsToCell,
  now,
  cancelling = { current: false },
}) {
  const sequence = new DoubleEscape(timeoutMs)
  const clock = now ?? (() => performance.now())
  const onKeyDown = (event) => {
    if (event.key !== 'Escape') {
      sequence.reset()
      return
    }
    if (!isPlainEscape(event) || cancelling.current) {
      sequence.reset()
      return
    }
    if (!belongsToCell(event) || ownsLayer(event)) {
      sequence.reset()
      return
    }
    // Let the first press reach other plugins; only the confirming second press
    // is claimed for cancellation.
    if (!sequence.press(clock())) return
    event.preventDefault()
    event.stopImmediatePropagation()
    cancelling.current = true
    Promise.resolve(stop()).finally(() => {
      cancelling.current = false
    })
  }
  return { onKeyDown, reset: () => sequence.reset() }
}

/** Native Escape cancellation refuses removed and non-continuable Sessions. */
export function sessionStoppable(state, running = state?.running) {
  const mode = state?.subagent?.address?.mode
  return (
    running === true && state?.removed !== true && (mode === undefined || mode === 'continuable')
  )
}

/** Whether a keydown is an unmodified, fresh, unclaimed Escape. */
export function isPlainEscape(event) {
  return (
    event.key === 'Escape' &&
    event.defaultPrevented !== true &&
    event.repeat !== true &&
    event.isComposing !== true &&
    event.ctrlKey !== true &&
    event.altKey !== true &&
    event.shiftKey !== true &&
    event.metaKey !== true
  )
}
