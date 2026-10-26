/**
 * In-cell approval and question cards.
 *
 * The official UI packages publish live pending objects into
 * `ctx.uiSession.sessionStatus`; this module renders a compact seat for one
 * split cell and calls the object's own `answer()`. The approval waterfall is
 * still owned by the official listener, so a cell answering is equivalent to
 * clicking the main panel.
 */
import React from 'react'
import {
  approvalAnswerable,
  approvalHeadline,
  buildAnswerBatch,
  countdownText,
  interactionKey,
  questionAnswerable,
} from './pending.js'

const h = React.createElement
const { useEffect, useRef, useState, useSyncExternalStore } = React

const cardStyles = {
  approval: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    margin: '0 6px',
    padding: '8px 10px',
    border: '0.5px solid var(--dsw-alias-state-warning, #e6a23c)',
    borderRadius: 'var(--dsw-radius-md, 8px)',
    background: 'var(--dsw-alias-bg-layer-1, rgba(30,30,30,.92))',
    flexShrink: 0,
  },
  question: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    margin: '0 6px',
    padding: '8px 10px',
    border: '0.5px solid var(--dsw-alias-state-business-primary, #4a9eff)',
    borderRadius: 'var(--dsw-radius-md, 8px)',
    background: 'var(--dsw-alias-bg-layer-1, rgba(30,30,30,.92))',
    flexShrink: 0,
    maxHeight: 300,
    overflow: 'auto',
  },
  headline: {
    fontSize: 'var(--dsh-content-font-size-secondary, 12px)',
    lineHeight: '18px',
    fontWeight: 600,
    color: 'var(--dsw-alias-label-primary, inherit)',
  },
  detail: {
    fontSize: 11,
    lineHeight: '16px',
    color: 'var(--dsw-alias-label-secondary, #999)',
  },
  row: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  button: (primary) => ({
    padding: '3px 9px',
    border: primary ? 'none' : '0.5px solid var(--dsw-alias-border-l2, #555)',
    borderRadius: 'var(--dsw-radius-sm, 6px)',
    background: primary ? 'var(--dsw-alias-state-business-primary, #4a9eff)' : 'transparent',
    color: primary
      ? 'var(--dsw-alias-label-primary-inverted, #fff)'
      : 'var(--dsw-alias-label-primary, inherit)',
    fontSize: 12,
    lineHeight: '18px',
    cursor: 'pointer',
  }),
  option: (selected) => ({
    textAlign: 'start',
    padding: '4px 8px',
    border: `0.5px solid ${selected ? 'var(--dsw-alias-state-business-primary, #4a9eff)' : 'var(--dsw-alias-border-l2, #555)'}`,
    borderRadius: 'var(--dsw-radius-sm, 6px)',
    background: selected
      ? 'var(--dsw-alias-interactive-bg-hover, rgba(74,158,255,.16))'
      : 'transparent',
    color: 'var(--dsw-alias-label-primary, inherit)',
    fontSize: 12,
    lineHeight: '18px',
    cursor: 'pointer',
  }),
  item: { display: 'flex', flexDirection: 'column', gap: 4 },
  custom: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '4px 6px',
    border: '0.5px solid var(--dsw-alias-border-l2, #555)',
    borderRadius: 'var(--dsw-radius-sm, 6px)',
    background: 'transparent',
    color: 'var(--dsw-alias-label-primary, inherit)',
    fontSize: 12,
    lineHeight: '18px',
  },
  error: {
    fontSize: 11,
    lineHeight: '16px',
    color: 'var(--dsw-alias-state-error-primary, #e5484d)',
  },
}

/** Busy/error/alive state shared by both answer seats. */
function useAnswerState() {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const alive = useRef(true)
  useEffect(
    () => () => {
      alive.current = false
    },
    [],
  )
  return { busy, setBusy, error, setError, alive }
}

/**
 * Compact approval seat.
 * @param props - `pending`, translator, and current language prefix.
 */
export function ApprovalCard(props) {
  const { pending, t, lang } = props
  const { busy, setBusy, error, setError, alive } = useAnswerState()

  const decide = (outcome) => {
    if (busy || !approvalAnswerable(pending)) return
    setBusy(true)
    setError('')
    pending.answer(outcome).catch((failure) => {
      // Only re-arm while the object still accepts an answer; a withdrawn or
      // already-answered request must stay disabled until the registry removes it.
      if (!alive.current) return
      if (approvalAnswerable(pending)) {
        setBusy(false)
        setError(failure instanceof Error ? failure.message : String(failure))
      }
    })
  }

  return h(
    'div',
    {
      style: cardStyles.approval,
      'data-dsws-interaction': 'approval',
      'data-interaction-key': pending.key,
      'aria-busy': busy,
      onKeyDown: (event) => {
        if (event.key !== 'Escape' || busy) return
        event.preventDefault()
        decide('rejected')
      },
    },
    h('div', { style: cardStyles.headline }, approvalHeadline(pending, lang, t)),
    pending.toolName
      ? h(
          'div',
          { style: cardStyles.detail },
          t('cell.approval.tool', { toolName: pending.toolName }),
        )
      : null,
    error === '' ? null : h('div', { style: cardStyles.error }, error),
    h(
      'div',
      { style: cardStyles.row },
      h(
        'button',
        {
          type: 'button',
          style: cardStyles.button(false),
          disabled: busy,
          'data-dsws-approval-action': 'reject',
          onClick: () => decide('rejected'),
        },
        t('cell.approval.reject'),
      ),
      h(
        'button',
        {
          type: 'button',
          style: cardStyles.button(true),
          disabled: busy,
          'data-dsws-approval-action': 'allow-once',
          onClick: () => decide('allowed-once'),
        },
        t('cell.approval.allowOnce'),
      ),
    ),
  )
}

/**
 * Compact question / plan-review seat.
 * @param props - `pending` and translator.
 */
export function QuestionCard(props) {
  const { pending, t } = props
  const snapshot = useSyncExternalStore(
    pending.subscribe,
    pending.snapshot,
    pending.getSnapshot ?? pending.snapshot,
  )
  const [drafts, setDrafts] = useState({})
  const { busy, setBusy, error, setError, alive } = useAnswerState()

  const patch = (id, changes) => {
    try {
      pending.engage?.()
    } catch {}
    setDrafts((previous) => ({ ...previous, [id]: { ...previous[id], ...changes } }))
  }

  const submit = () => {
    if (busy || !questionAnswerable(snapshot)) return
    setBusy(true)
    setError('')
    pending.answer(buildAnswerBatch(pending.questions, drafts)).catch((failure) => {
      if (!alive.current) return
      if (questionAnswerable(pending.snapshot())) {
        setBusy(false)
        setError(failure instanceof Error ? failure.message : String(failure))
      }
    })
  }

  const disabled = busy || !questionAnswerable(snapshot)
  const timer = countdownText(snapshot)
  return h(
    'div',
    {
      style: cardStyles.question,
      'data-dsws-interaction': pending.kind,
      'data-interaction-key': interactionKey(pending),
      'aria-busy': busy,
    },
    h(
      'div',
      { style: cardStyles.headline },
      t('cell.question.strip'),
      timer === '' ? '' : ` · ${timer}`,
    ),
    h('div', { style: cardStyles.detail }, disabled ? t('cell.question.channelPending') : ''),
    pending.questions.map((question) =>
      h(
        'div',
        { key: question.id, style: cardStyles.item, 'data-dsws-question': question.id },
        h('div', { style: cardStyles.headline }, question.header ?? question.question),
        question.question === question.header
          ? null
          : h('div', { style: cardStyles.detail }, question.question),
        (question.options ?? []).map((option) =>
          h(
            'button',
            {
              key: option.label,
              type: 'button',
              disabled,
              style: cardStyles.option(
                (drafts[question.id]?.selected ?? []).includes(option.label),
              ),
              'data-selected': (drafts[question.id]?.selected ?? []).includes(option.label)
                ? 'true'
                : 'false',
              title: option.description ?? '',
              onClick: () => {
                const current = drafts[question.id]?.selected ?? []
                const selected = question.multiSelect
                  ? current.includes(option.label)
                    ? current.filter((label) => label !== option.label)
                    : [...current, option.label]
                  : [option.label]
                patch(question.id, { selected })
              },
            },
            option.label,
          ),
        ),
        h('input', {
          type: 'text',
          disabled,
          style: cardStyles.custom,
          placeholder: t('cell.question.custom'),
          value: drafts[question.id]?.custom ?? '',
          onChange: (event) => patch(question.id, { custom: event.target.value }),
        }),
      ),
    ),
    error === '' ? null : h('div', { style: cardStyles.error }, error),
    h(
      'div',
      { style: cardStyles.row },
      snapshot.countdown?.running === true
        ? h(
            'button',
            {
              type: 'button',
              style: cardStyles.button(false),
              disabled,
              onClick: () => {
                try {
                  pending.takeTime?.()
                } catch {}
              },
            },
            t('cell.question.takeTime'),
          )
        : null,
      h(
        'button',
        {
          type: 'button',
          style: cardStyles.button(true),
          disabled,
          'data-dsws-question-submit': 'true',
          onClick: submit,
        },
        t('cell.question.submit'),
      ),
    ),
  )
}
