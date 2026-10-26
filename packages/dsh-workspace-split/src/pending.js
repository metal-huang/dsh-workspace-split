/**
 * Pending interaction rules for a split cell.
 *
 * The official approval and user-question packages publish their live pending
 * objects into `ctx.uiSession.sessionStatus`; a cell reads that registry and
 * calls the object's own `answer()`. These helpers keep the decision logic and
 * answer batch shape free of React and DSH imports so they are directly testable.
 */

/**
 * The one pending interaction a Session exposes today.
 * @param status - `sessionStatus` snapshot (`Map<SessionId, {pendingInteraction}>`).
 * @param sessionId - Session to look up.
 * @returns a known pending object, or undefined.
 */
export function pendingOf(status, sessionId) {
  const pending = status?.get?.(sessionId)?.pendingInteraction
  if (pending === null || typeof pending !== 'object') return undefined
  if (
    pending.kind !== 'approval' &&
    pending.kind !== 'question' &&
    pending.kind !== 'plan-review'
  ) {
    return undefined
  }
  return pending
}

/** Whether the approval object itself still accepts a decision. */
export function approvalAnswerable(pending) {
  return pending?.answerable === true
}

/** Whether a question card has a live channel and is not closed. */
export function questionAnswerable(snapshot) {
  if (snapshot?.closed === true) return false
  return snapshot?.channel === 'waterfall' || snapshot?.channel === 'rpc'
}

/**
 * Build the question answer batch, one item per question in question order.
 * @param questions - pending question items (`{id}`).
 * @param drafts - per-question `{ selected?: string[], custom?: string }`.
 * @returns `{ answers: [{id, selected, custom?}] }`.
 */
export function buildAnswerBatch(questions, drafts) {
  return {
    answers: questions.map((question) => {
      const draft = drafts[question.id] ?? {}
      const selected = Array.isArray(draft.selected) ? [...draft.selected] : []
      const custom = typeof draft.custom === 'string' ? draft.custom.trim() : ''
      return { id: question.id, selected, ...(custom === '' ? {} : { custom }) }
    }),
  }
}

/**
 * Approval headline: requester reason, then a localized display reason, then a
 * generic escalation line.
 * @param pending - pending approval.
 * @param lang - current language prefix (`zh` / `en`).
 * @param t - translator.
 * @returns one line of copy.
 */
export function approvalHeadline(pending, lang, t) {
  if (typeof pending?.reason === 'string' && pending.reason !== '') return pending.reason
  const localized = displayReasonOf(pending, lang)
  if (localized !== undefined) return localized
  return t('cell.approval.escalation', { toolName: pending?.toolName ?? '' })
}

/** Localized requester copy, if the request carried any. */
function displayReasonOf(pending, lang) {
  const localized = pending?.displayReason
  if (localized === null || typeof localized !== 'object') return undefined
  return localized[lang] ?? localized.en
}

/**
 * Stable identity for a pending card. Approval keys change on reconnect; a
 * question keyed by tool call stays stable.
 * @param pending - pending interaction.
 * @returns key used for React identity and draft reset.
 */
export function interactionKey(pending) {
  if (pending?.kind === 'approval') return pending.key
  if (pending?.callId === undefined) return pending?.key ?? 'pending'
  return `question:${pending.sessionId}:${pending.callId}`
}

/** Countdown text (`m:ss`) when the card published a remaining duration. */
export function countdownText(snapshot) {
  const ms = snapshot?.countdown?.remainingMs
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return ''
  const total = Math.max(0, Math.floor(ms / 1000))
  return `${String(Math.floor(total / 60))}:${String(total % 60).padStart(2, '0')}`
}

/**
 * One-shot action gate: the first call wins, and a failed call may only unlock
 * while the pending object still says it is answerable.
 * @returns `{ run, reset, busy }`.
 */
export function onceGate() {
  let busy = false
  return {
    get busy() {
      return busy
    },
    run(task) {
      if (busy) return false
      busy = true
      Promise.resolve()
        .then(task)
        .catch(() => {})
        .finally(() => {})
      return true
    },
    reset() {
      busy = false
    },
  }
}
