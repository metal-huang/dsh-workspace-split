/**
 * Minimal `@` candidate popup for the split composer.
 *
 * The main composer's trigger machinery is private to its own draft editor, so
 * the cell queries the same public Remote providers and inserts the same plain
 * text token. Candidates are fetched on a short debounce per active token.
 */
import React from 'react'
import { activeAtToken, candidateLabel, formatFileMention, replaceMention } from './mention.js'

const h = React.createElement
const { useCallback, useEffect, useRef, useState } = React

const styles = {
  panel: {
    position: 'absolute',
    bottom: 'calc(100% + 5px)',
    left: 6,
    right: 6,
    zIndex: 55,
    maxHeight: 200,
    overflowY: 'auto',
    padding: 4,
    border: '0.5px solid var(--dsw-alias-border-l2, #555)',
    borderRadius: 'var(--dsw-radius-md, 8px)',
    background: 'var(--dsw-alias-bg-layer-1, #1e1e1e)',
    boxShadow: 'var(--dsw-elevation-panel, 0 4px 16px rgba(0,0,0,.35))',
  },
  row: (active) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: 1,
    width: '100%',
    padding: '4px 7px',
    border: 'none',
    borderRadius: 'var(--dsw-radius-sm, 6px)',
    background: active
      ? 'var(--dsw-alias-interactive-bg-hover, rgba(74,158,255,.16))'
      : 'transparent',
    color: 'var(--dsw-alias-label-primary, inherit)',
    textAlign: 'start',
    cursor: 'pointer',
  }),
  name: { fontSize: 12, lineHeight: '18px' },
  parent: { fontSize: 10, lineHeight: '14px', color: 'var(--dsw-alias-label-caption, #888)' },
  empty: { padding: '6px 8px', fontSize: 11, color: 'var(--dsw-alias-label-caption, #888)' },
}

/** One file/session candidate row. */
function MentionRow(props) {
  const { candidate, active, onChoose } = props
  const label = candidateLabel(candidate)
  return h(
    'button',
    {
      type: 'button',
      style: styles.row(active),
      'data-dsws-mention': 'true',
      onClick: () => onChoose(candidate),
    },
    h('span', { style: styles.name }, label.name),
    label.parent === '' ? null : h('span', { style: styles.parent }, label.parent),
  )
}

/** Candidate list above the composer. */
export function MentionPopup(props) {
  const { candidates, index, onChoose, t } = props
  return h(
    'div',
    { style: styles.panel, role: 'listbox', 'data-dsws-mentions': 'true' },
    candidates.length === 0
      ? h('div', { style: styles.empty }, t('composer.mention.empty'))
      : candidates.map((candidate, at) =>
          h(MentionRow, {
            key: `${candidate.mention ?? candidate.path}-${at}`,
            candidate,
            active: at === index,
            onChoose,
          }),
        ),
  )
}

/**
 * Track the active `@` token and its candidates.
 * @param props - remote service, Session id, draft text, setter, textarea ref.
 * @returns popup state plus refresh / keydown / choose handlers.
 */
export function useMentionPicker(props) {
  const { remote, sessionId, text, onText, textareaRef, t } = props
  const [state, setState] = useState({ open: false, token: undefined, candidates: [], index: 0 })
  const timer = useRef(null)
  const seq = useRef(0)

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current)
    },
    [],
  )

  const close = useCallback(() => {
    setState({ open: false, token: undefined, candidates: [], index: 0 })
  }, [])

  const refresh = useCallback(
    (value, caret) => {
      const token = activeAtToken(value, caret)
      if (token === undefined) {
        close()
        return
      }
      if (timer.current !== null) clearTimeout(timer.current)
      const ticket = (seq.current += 1)
      timer.current = setTimeout(() => {
        const files = remote?.fileReferences?.list
          ? Promise.resolve(remote.fileReferences.list(sessionId, token.query))
          : Promise.resolve({ ok: true, value: [] })
        const sessions = remote?.sessionReferenceResolver?.candidates
          ? Promise.resolve(remote.sessionReferenceResolver.candidates(sessionId, token.query))
          : Promise.resolve({ ok: true, value: [] })
        Promise.all([files, sessions]).then(
          ([fileResult, sessionResult]) => {
            if (ticket !== seq.current) return
            const fileValue = fileResult?.ok === true ? fileResult.value : []
            const sessionValue = sessionResult?.ok === true ? sessionResult.value : []
            setState({
              open: true,
              token,
              candidates: [...(fileValue ?? []), ...(sessionValue ?? [])].slice(0, 30),
              index: 0,
            })
          },
          () => {},
        )
      }, 120)
    },
    [remote, sessionId, close],
  )

  const choose = useCallback(
    (candidate) => {
      const token = state.token
      if (token === undefined) return
      const mention =
        typeof candidate.mention === 'string'
          ? candidate.mention
          : formatFileMention(candidate, token.quoted)
      if (mention === undefined) return
      const next = replaceMention(text, token, mention)
      onText(next)
      close()
      requestAnimationFrame(() => {
        const area = textareaRef.current
        if (area === null) return
        const caret = token.start + mention.length
        area.focus()
        try {
          area.setSelectionRange(caret, caret)
        } catch {}
      })
    },
    [state.token, text, onText, textareaRef, close],
  )

  const onKeyDown = useCallback(
    (event) => {
      if (!state.open) return false
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return true
      }
      if (state.candidates.length === 0) return false
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const delta = event.key === 'ArrowDown' ? 1 : -1
        setState((previous) => ({
          ...previous,
          index: (previous.index + delta + previous.candidates.length) % previous.candidates.length,
        }))
        return true
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        choose(state.candidates[state.index])
        return true
      }
      return false
    },
    [state, close, choose],
  )

  return { state, refresh, onKeyDown, choose, close, t }
}
