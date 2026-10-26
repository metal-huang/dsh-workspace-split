/**
 * Compact model / permission seats for a split composer.
 *
 * Both seats read the catalogs through `ctx.remote` (public Remote services) and
 * submit through the same paths the main composer uses: `session.selectModel`
 * for models and `/permission <preset>` for access presets.
 */
import React from 'react'
import {
  modelChoices,
  modelDisplay,
  permissionLabel,
  permissionRequiresConfirm,
} from './composer-meta.js'

const h = React.createElement
const { useState } = React

const styles = {
  wrap: { position: 'relative', flex: 'none', display: 'inline-flex', minWidth: 0 },
  trigger: {
    maxWidth: 180,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    padding: '2px 7px',
    border: '0.5px solid var(--dsw-alias-border-l2, #555)',
    borderRadius: 'var(--dsw-radius-sm, 6px)',
    background: 'transparent',
    color: 'var(--dsw-alias-label-secondary, #999)',
    fontSize: 11,
    lineHeight: '16px',
    cursor: 'pointer',
  },
  triggerActive: {
    color: 'var(--dsw-alias-label-primary, inherit)',
    background: 'var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.14))',
  },
  panel: {
    position: 'absolute',
    bottom: 'calc(100% + 5px)',
    left: 0,
    zIndex: 45,
    width: 240,
    maxWidth: 'calc(100vw - 16px)',
    maxHeight: 280,
    overflowY: 'auto',
    padding: 6,
    border: '0.5px solid var(--dsw-alias-border-l2, #555)',
    borderRadius: 'var(--dsw-radius-md, 8px)',
    background: 'var(--dsw-alias-bg-layer-1, #1e1e1e)',
    boxShadow: 'var(--dsw-elevation-panel, 0 4px 16px rgba(0,0,0,.35))',
  },
  group: {
    padding: '5px 7px 3px',
    color: 'var(--dsw-alias-label-caption, #888)',
    fontSize: 10,
    lineHeight: '14px',
  },
  option: (selected) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
    padding: '4px 7px',
    border: 'none',
    borderRadius: 'var(--dsw-radius-sm, 6px)',
    background: selected
      ? 'var(--dsw-alias-interactive-bg-hover, rgba(74,158,255,.16))'
      : 'transparent',
    color: 'var(--dsw-alias-label-primary, inherit)',
    fontSize: 12,
    lineHeight: '18px',
    textAlign: 'start',
    cursor: 'pointer',
  }),
  check: { flex: 'none', color: 'var(--dsw-alias-state-business-primary, #4a9eff)', fontSize: 12 },
  hint: { padding: '2px 7px 5px', color: 'var(--dsw-alias-label-caption, #888)', fontSize: 11 },
  confirm: {
    margin: 6,
    padding: 8,
    border: '0.5px solid var(--dsw-alias-state-warning, #e6a23c)',
    borderRadius: 'var(--dsw-radius-sm, 6px)',
    color: 'var(--dsw-alias-state-warning, #e6a23c)',
    fontSize: 11,
    lineHeight: '16px',
  },
  row: { display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 6 },
  small: (primary) => ({
    padding: '2px 8px',
    border: primary ? 'none' : '0.5px solid var(--dsw-alias-border-l2, #555)',
    borderRadius: 'var(--dsw-radius-sm, 6px)',
    background: primary ? 'var(--dsw-alias-state-business-primary, #4a9eff)' : 'transparent',
    color: primary
      ? 'var(--dsw-alias-label-primary-inverted, #fff)'
      : 'var(--dsw-alias-label-primary, inherit)',
    fontSize: 11,
    lineHeight: '16px',
    cursor: 'pointer',
  }),
}

/** One model row inside a provider group. */
function ModelRow(props) {
  const { group, model, current, onSelect, close } = props
  const selected = current !== null && current.provider === group.id && current.model === model.id
  return h(
    'button',
    {
      type: 'button',
      role: 'menuitem',
      style: styles.option(selected),
      onClick: () => {
        close()
        onSelect({
          provider: group.id,
          model: model.id,
          reasoningEffort: model.reasoning?.defaultEffort,
        })
      },
    },
    h('span', null, model.name),
    selected ? h('span', { style: styles.check }, '✓') : null,
  )
}

/** One provider heading plus its models. */
function ModelGroup(props) {
  const { group, current, onSelect, close } = props
  return h(
    React.Fragment,
    null,
    h('div', { style: styles.group }, group.name),
    (group.models ?? []).map((model) =>
      h(ModelRow, {
        key: model.id,
        group,
        model,
        current,
        onSelect,
        close,
      }),
    ),
  )
}

/** Catalog body of the model menu. */
function ModelGroups(props) {
  const { catalog, current, onSelect, close, t } = props
  if (catalog === null) return h('div', { style: styles.hint }, t('composer.model.loading'))
  const groups = Array.isArray(catalog.groups) ? catalog.groups : []
  if (groups.length === 0) return h('div', { style: styles.hint }, t('composer.model.empty'))
  return h(
    React.Fragment,
    null,
    groups.map((group) =>
      h(ModelGroup, {
        key: group.id,
        group,
        current,
        onSelect,
        close,
      }),
    ),
  )
}

/** Reasoning-effort rows for the selected model. */
function EffortRows(props) {
  const { efforts, current, onSelect, close, t } = props
  if (efforts.length <= 1) return null
  return h(
    React.Fragment,
    null,
    h('div', { style: styles.group }, t('composer.model.effort')),
    efforts.map((effort) =>
      h(
        'button',
        {
          key: effort.id,
          type: 'button',
          role: 'menuitem',
          style: styles.option(current?.reasoningEffort === effort.id),
          onClick: () => {
            close()
            onSelect({
              provider: current.provider,
              model: current.model,
              reasoningEffort: effort.id,
            })
          },
        },
        h('span', null, effort.name),
        current?.reasoningEffort === effort.id ? h('span', { style: styles.check }, '✓') : null,
      ),
    ),
  )
}

/** Current selection with the catalog default as fallback. */
function currentModel(catalog, selection) {
  return selection?.next ?? selection?.lastUsed ?? catalog?.default ?? null
}

/** Resolve display, current selection, and effort rows in one place. */
function modelState(catalog, selection) {
  const display = modelDisplay(catalog, selection)
  const current = currentModel(catalog, selection)
  const row =
    current === null
      ? null
      : modelChoices(catalog).find(
          (candidate) =>
            candidate.provider === current.provider && candidate.model === current.model,
        )
  return { display, current, efforts: row?.reasoning?.efforts ?? [] }
}

/** Trigger button of the model menu. */
function ModelTrigger(props) {
  const { display, open, hover, setHover, toggle, t } = props
  const title =
    display === null
      ? t('composer.model.choose')
      : `${display.name}${display.effortName === '' ? '' : ` · ${display.effortName}`}`
  return h(
    'button',
    {
      type: 'button',
      title,
      style: { ...styles.trigger, ...(hover || open ? styles.triggerActive : {}) },
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      onClick: toggle,
      'aria-expanded': open,
    },
    title,
  )
}

/**
 * Provider-grouped model menu.
 * @param props - catalog, effective selection, select callback, and translator.
 */
export function ModelControl(props) {
  const { catalog, selection, onSelect, t } = props
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(false)
  const { display, current, efforts } = modelState(catalog, selection)
  return h(
    'span',
    { style: styles.wrap, 'data-dsws-model': 'true' },
    h(ModelTrigger, {
      display,
      open,
      hover,
      setHover,
      toggle: () => setOpen((value) => !value),
      t,
    }),
    open
      ? h(
          'div',
          { style: styles.panel, role: 'menu' },
          h(ModelGroups, {
            catalog,
            current,
            onSelect,
            close: () => setOpen(false),
            t,
          }),
          h(EffortRows, {
            efforts,
            current,
            onSelect,
            close: () => setOpen(false),
            t,
          }),
        )
      : null,
  )
}

/**
 * Permission preset menu with the same risk confirmation the main chip uses.
 * @param props - catalog, current value, select callback, translator.
 */
export function PermissionControl(props) {
  const { catalog, current, onSelect, t } = props
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const label = permissionLabel(catalog, current, t)
  if (label === '') return null
  const options = Array.isArray(catalog?.options) ? catalog.options : []
  return h(
    'span',
    { style: styles.wrap, 'data-dsws-permission': 'true' },
    h(
      'button',
      {
        type: 'button',
        title: t('composer.permission.title'),
        style: styles.trigger,
        'aria-expanded': open,
        onClick: () => setOpen((value) => !value),
      },
      label,
    ),
    open
      ? h(
          'div',
          { style: styles.panel, role: 'menu' },
          confirm === null
            ? options.map((option) =>
                h(
                  'button',
                  {
                    key: option.value,
                    type: 'button',
                    role: 'menuitem',
                    style: styles.option(option.value === current),
                    onClick: () => {
                      if (permissionRequiresConfirm(option.value)) {
                        setConfirm(option)
                        return
                      }
                      setOpen(false)
                      onSelect(option.value)
                    },
                  },
                  h('span', null, permissionLabel(catalog, option.value, t)),
                  option.value === current ? h('span', { style: styles.check }, '✓') : null,
                ),
              )
            : h(
                'div',
                { style: styles.confirm },
                t('composer.permission.risk', {
                  name: permissionLabel(catalog, confirm.value, t),
                }),
                h(
                  'div',
                  { style: styles.row },
                  h(
                    'button',
                    {
                      type: 'button',
                      style: styles.small(false),
                      onClick: () => setConfirm(null),
                    },
                    t('composer.cancel'),
                  ),
                  h(
                    'button',
                    {
                      type: 'button',
                      style: styles.small(true),
                      'data-dsws-permission-confirm': confirm.value,
                      onClick: () => {
                        setOpen(false)
                        setConfirm(null)
                        onSelect(confirm.value)
                      },
                    },
                    t('composer.permission.confirm'),
                  ),
                ),
              ),
        )
      : null,
  )
}
