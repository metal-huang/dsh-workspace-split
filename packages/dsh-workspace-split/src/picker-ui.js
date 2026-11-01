/**
 * Session picker for one split tile.
 *
 * A native `<select>` was here first, kept for its system popup and keyboard
 * handling. Its options are plain text, though, so the only way to say which
 * project a row belonged to was a text suffix — while the tile header names the
 * project with a coloured badge. The two surfaces could never match. This
 * listbox draws the same badge per row, carries the running state, and filters
 * (a free tile offers the whole catalog), at the cost of owning the keyboard and
 * outside-click behaviour itself.
 *
 * The panel renders through a portal on `document.body`: a tile clips its
 * contents and scales its body, so a panel positioned inside it would be cut.
 */
import React from 'react'
import { createPortal } from 'react-dom'
import { filterPickerRows, initialPickerIndex, pickerPanelBox, resolvePickerKey } from './picker.js'
import { projectBadgeStyle, projectColor } from './project.js'

const h = React.createElement
const { useCallback, useEffect, useRef, useState } = React

/** Preferred panel size; the viewport may shrink both. */
const PANEL_WIDTH = 360
const PANEL_HEIGHT = 320

const styles = {
  trigger: (open, hover) => ({
    position: 'relative',
    flex: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 30,
    marginLeft: 6,
    padding: 0,
    border: '0.5px solid var(--dsw-alias-border-l2, #555)',
    borderRadius: 'var(--dsw-radius-sm, 6px)',
    background:
      open || hover
        ? 'var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.16))'
        : 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.08))',
    color:
      open || hover
        ? 'var(--dsw-alias-label-primary, inherit)'
        : 'var(--dsw-alias-label-secondary, #999)',
    cursor: 'pointer',
  }),
  glyph: { fontSize: 16, lineHeight: 1, pointerEvents: 'none', transform: 'translateY(-1px)' },
  panel: (box) => ({
    position: 'fixed',
    top: box.top,
    left: box.left,
    width: box.width,
    maxHeight: box.maxHeight,
    zIndex: 60,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: 6,
    boxSizing: 'border-box',
    border: '0.5px solid var(--dsw-alias-border-l2, #555)',
    borderRadius: 'var(--dsw-radius-lg, 10px)',
    background: 'var(--dsw-alias-bg-layer-1, #1e1e1e)',
    boxShadow: 'var(--dsw-elevation-panel, 0 4px 16px rgba(0,0,0,.35))',
  }),
  search: {
    flex: 'none',
    padding: '4px 7px',
    border: '0.5px solid var(--dsw-alias-border-l2, #555)',
    borderRadius: 'var(--dsw-radius-sm, 6px)',
    background: 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.10))',
    color: 'var(--dsw-alias-label-primary, inherit)',
    fontSize: 12,
    lineHeight: '18px',
    outline: 'none',
  },
  list: { display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', minHeight: 0 },
  row: (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    padding: '4px 6px',
    border: 'none',
    borderRadius: 'var(--dsw-radius-sm, 6px)',
    background: active
      ? 'var(--dsw-alias-interactive-bg-hover, rgba(74,158,255,.16))'
      : 'transparent',
    color: 'var(--dsw-alias-label-primary, inherit)',
    fontSize: 12,
    lineHeight: '18px',
    textAlign: 'start',
    cursor: 'pointer',
  }),
  title: {
    flex: '1 1 auto',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  running: {
    flex: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    lineHeight: '16px',
    color: 'var(--dsw-alias-label-caption, #888)',
  },
  runningDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--dsw-alias-state-success, #4caf50)',
  },
  check: {
    flex: 'none',
    fontSize: 12,
    lineHeight: '16px',
    color: 'var(--dsw-alias-state-business-primary, #4a9eff)',
  },
  empty: {
    padding: '6px 8px',
    fontSize: 11,
    color: 'var(--dsw-alias-label-caption, #888)',
  },
  clear: {
    flex: 'none',
    padding: '4px 6px',
    border: 'none',
    borderTop: '0.5px solid var(--dsw-alias-border-l3, #444)',
    borderRadius: 0,
    background: 'transparent',
    color: 'var(--dsw-alias-label-secondary, #999)',
    fontSize: 11,
    lineHeight: '16px',
    textAlign: 'start',
    cursor: 'pointer',
  },
}

/** One Session row: project badge, title, running state, current mark. */
function PickerRow(props) {
  const { row, active, showProject, current, onHover, onChoose, t } = props
  return h(
    'button',
    {
      type: 'button',
      role: 'option',
      'aria-selected': current,
      'data-dsws-picker-row': String(row.id ?? ''),
      style: styles.row(active),
      onMouseEnter: onHover,
      onClick: onChoose,
    },
    showProject && row.project !== ''
      ? h(
          'span',
          {
            // The shared pill, tightened for a dense list: a project name may not
            // take half a 360px row, or the Session title loses its own space.
            style: {
              ...projectBadgeStyle(projectColor(row.project)),
              maxWidth: '40%',
              fontSize: 11,
              lineHeight: '18px',
            },
            title: row.project,
          },
          row.project,
        )
      : null,
    h('span', { style: styles.title }, row.title),
    row.running
      ? h(
          'span',
          { style: styles.running },
          h('span', { style: styles.runningDot, 'aria-hidden': 'true' }),
          t('split.session.running.short'),
        )
      : null,
    current ? h('span', { style: styles.check, 'aria-hidden': 'true' }, '✓') : null,
  )
}

/**
 * The open panel: search field, filtered rows, and a clear action.
 * @param props - picker props plus `box` and the `onClose(refocus)` callback.
 */
function PickerPanel(props) {
  const { rows, value, showProject, searchPlaceholder, t, onChoose, onClose, box } = props
  const [query, setQuery] = useState('')
  // Seeded from the bound row so opening lands on the current Session.
  const [active, setActive] = useState(() => initialPickerIndex(filterPickerRows(rows, ''), value))
  const inputRef = useRef(null)
  const filtered = filterPickerRows(rows, query)

  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const onKeyDown = (event) => {
    const action = resolvePickerKey(event.key, active, filtered.length)
    if (action.type === 'none') return
    event.preventDefault()
    if (action.type === 'close') {
      onClose(action.refocus !== false)
      return
    }
    if (action.type === 'move') {
      setActive(action.index)
      return
    }
    const row = filtered[active]
    if (row !== undefined) onChoose(row.id)
  }

  return createPortal(
    h(
      'div',
      { 'data-dsws-picker': 'true', style: styles.panel(box), onKeyDown, role: 'presentation' },
      h('input', {
        ref: inputRef,
        type: 'search',
        value: query,
        placeholder: searchPlaceholder,
        'aria-label': searchPlaceholder,
        'data-dsws-picker-search': 'true',
        style: styles.search,
        onChange: (event) => {
          setQuery(event.target.value)
          setActive(0)
        },
      }),
      h(
        'div',
        { role: 'listbox', 'aria-label': t('split.session.picker.aria'), style: styles.list },
        filtered.length === 0
          ? h('div', { style: styles.empty }, t('split.session.picker.none'))
          : filtered.map((row, at) =>
              h(PickerRow, {
                key: String(row.id ?? at),
                row,
                active: at === active,
                showProject,
                current: String(row.id) === String(value),
                t,
                onHover: () => setActive(at),
                onChoose: () => onChoose(row.id),
              }),
            ),
      ),
      value === '' || value === null || value === undefined
        ? null
        : h(
            'button',
            {
              type: 'button',
              'data-dsws-picker-clear': 'true',
              style: styles.clear,
              onClick: () => onChoose(null),
            },
            t('split.session.picker.clear'),
          ),
    ),
    document.body,
  )
}

/**
 * Chevron seat plus its listbox.
 * @param props - `rows`, `value`, `showProject`, `searchPlaceholder`, `emptyTitle`,
 *   `t`, and `onChange(id|null)`.
 */
export function SessionPicker(props) {
  const { rows, value, searchPlaceholder, emptyTitle, t, onChange } = props
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(false)
  const [box, setBox] = useState(null)
  const triggerRef = useRef(null)

  const close = useCallback((refocus = true) => {
    setOpen(false)
    if (refocus) requestAnimationFrame(() => triggerRef.current?.focus())
  }, [])

  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect === undefined) return
    setBox(
      pickerPanelBox(
        rect,
        { width: window.innerWidth, height: window.innerHeight },
        { width: PANEL_WIDTH, maxHeight: PANEL_HEIGHT },
      ),
    )
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      // The panel is portalled onto `document.body`, so it is NOT inside the
      // trigger's subtree. Closing on any press outside the trigger alone removed
      // a row on mousedown, before its click could choose: a real mouse press
      // never selected anything (Enter did). Both live regions are checked.
      if (triggerRef.current?.contains(event.target) === true) return
      const target = event.target
      if (target instanceof Element && target.closest('[data-dsws-picker]') !== null) return
      close(false)
    }
    const follow = () => place()
    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('resize', follow)
    window.addEventListener('scroll', follow, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('resize', follow)
      window.removeEventListener('scroll', follow, true)
    }
  }, [open, close, place])

  const choose = useCallback(
    (id) => {
      onChange(id)
      close()
    },
    [onChange, close],
  )

  const toggle = () => {
    if (open) {
      close(false)
      return
    }
    place()
    setOpen(true)
  }

  return h(
    React.Fragment,
    null,
    h(
      'button',
      {
        ref: triggerRef,
        type: 'button',
        'aria-haspopup': 'listbox',
        'aria-expanded': open,
        'aria-label': t('split.session.picker.aria'),
        title: emptyTitle,
        style: styles.trigger(open, hover),
        onMouseEnter: () => setHover(true),
        onMouseLeave: () => setHover(false),
        onClick: toggle,
        onKeyDown: (event) => {
          if (event.key !== 'ArrowDown' || open) return
          event.preventDefault()
          toggle()
        },
      },
      h('span', { style: styles.glyph, 'aria-hidden': true }, '▾'),
    ),
    open && box !== null
      ? h(PickerPanel, {
          rows,
          value,
          showProject: props.showProject,
          searchPlaceholder,
          t,
          box,
          onChoose: choose,
          onClose: close,
        })
      : null,
  )
}
