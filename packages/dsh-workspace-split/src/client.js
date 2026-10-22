/**
 * Client half of the multi-session split view.
 *
 * This is the ESM source; `client.js` is the bundled artifact produced by
 * `pnpm build` (see build.mjs) and is what `dsh.client` points at.
 */

import React from 'react'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfm } from 'micromark-extension-gfm'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { math } from 'micromark-extension-math'
import { mathFromMarkdown } from 'mdast-util-math'

const h = React.createElement
const { useState, useEffect, useCallback, useSyncExternalStore, useRef } = React

// ---------- limits (PRD: 20 global default, 12 per-window hard default; both configurable) ----------
const DEFAULT_MAX_CELLS = 20
/** Bound for one retained Session's initial history open (see CellView). */
const OPEN_TIMEOUT_MS = 15000

// Opening several histories at once leaves some retains unsettled, so cells
// queue: one open in flight, the rest waiting their turn.
let openChain = Promise.resolve()
function enqueueOpen(task) {
  const run = openChain.then(task, task)
  openChain = run.catch(() => {})
  return run
}

// ---------- localStorage persistence ----------
const LS_KEY = 'dsws-layout'
function loadLayout() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
function saveLayout(gridSize, cells, inSplit) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ gridSize, cells, inSplit }))
  } catch {}
}

// ---------- Markdown ----------
// Parsed with the same package set the native renderer uses
// (mdast-util-from-markdown + gfm + math). Styles are copied from
// ui-primitives MarkdownText.module.css / CodeBlock.module.css; the native
// React component itself is off-limits to plugins (internal API).

const MD_EXTENSIONS = [gfm(), math()]
const MD_MDAST_EXTENSIONS = [gfmFromMarkdown(), mathFromMarkdown()]
const mdCache = new Map()

function parseMarkdown(text) {
  const hit = mdCache.get(text)
  if (hit !== undefined) return hit
  let tree
  try {
    tree = fromMarkdown(text, { extensions: MD_EXTENSIONS, mdastExtensions: MD_MDAST_EXTENSIONS })
  } catch {
    tree = { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', value: text }] }] }
  }
  // Bounded cache: transcripts re-render on every frame flush.
  if (mdCache.size > 200) mdCache.clear()
  mdCache.set(text, tree)
  return tree
}

const mdBlockGap = 16

const mdStyles = {
  root: {
    minWidth: 0,
    overflowWrap: 'anywhere',
    font: 'var(--dsw-font-markdown-base, inherit)',
    color: 'var(--dsw-alias-label-primary, inherit)',
  },
  p: { margin: `${mdBlockGap}px 0` },
  h: (level) => ({
    font: `var(--dsw-font-markdown-h${Math.min(level, 4)}, inherit)`,
    margin: level >= 4 ? '16px 0' : '32px 0 16px',
  }),
  ul: { margin: `${mdBlockGap}px 0`, paddingLeft: 18 },
  li: { marginTop: 6 },
  blockquote: {
    borderLeft: '2px solid var(--dsw-alias-label-caption, #888)',
    margin: `${mdBlockGap}px 0 0`,
    paddingLeft: 14,
  },
  hr: { border: 'none', height: '0.5px', margin: '32px 0', background: 'var(--dsw-alias-border-l2, #4a4a4a)' },
  inlineCode: {
    font: 'var(--dsw-font-markdown-code, inherit)',
    fontFamily: 'var(--ds-font-family-code, monospace)',
    fontSize: '0.875em',
    background: 'var(--dsw-alias-markdown-inline-code, rgba(128,128,128,.16))',
    border: '0.5px solid var(--dsw-alias-border-l1, #4a4a4a)',
    borderRadius: 'var(--dsw-radius-sm, 4px)',
    padding: '0 5px',
  },
  link: {
    color: 'var(--dsw-alias-link, #4a9eff)',
    fontWeight: 500,
    textDecoration: 'none',
  },
  strong: { fontWeight: 600 },
  codeBlock: {
    margin: `${mdBlockGap}px 0`,
    borderRadius: 'var(--dsw-radius-lg, 10px)',
    background: 'var(--dsw-alias-markdown-code-block, rgba(128,128,128,.10))',
    overflow: 'hidden',
  },
  codeBanner: {
    background: 'var(--dsw-alias-markdown-code-block-banner, rgba(128,128,128,.14))',
    padding: '9px 14px',
    font: '11px/18px var(--dsw-font-family, inherit)',
    fontFamily: 'var(--ds-font-family-code, monospace)',
    fontSize: 11,
    lineHeight: '18px',
    color: 'var(--dsw-alias-label-primary, inherit)',
  },
  codePre: {
    font: 'var(--dsw-font-markdown-code-block, inherit)',
    fontFamily: 'var(--ds-font-family-code, monospace)',
    padding: 16,
    margin: 0,
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    background: 'var(--dsw-alias-markdown-code-block, rgba(128,128,128,.10))',
  },
  tableScroll: { maxWidth: '100%', overflowX: 'auto', overscrollBehaviorX: 'contain', margin: `${mdBlockGap}px 0` },
  table: { borderCollapse: 'collapse', width: 'max-content', maxWidth: 'max-content' },
  th: {
    textAlign: 'start',
    padding: '10px 16px',
    borderBottom: '0.5px solid var(--dsw-alias-border-l3, #5a5a5a)',
    font: 'var(--dsw-font-markdown-table-head, inherit)',
    fontWeight: 600,
    maxWidth: 320,
    minWidth: 100,
  },
  td: {
    padding: '10px 16px',
    borderBottom: '0.5px solid var(--dsw-alias-border-l2, #4a4a4a)',
    font: 'var(--dsw-font-markdown-table, inherit)',
    maxWidth: 320,
    minWidth: 100,
  },
  math: {
    fontFamily: 'var(--ds-font-family-code, monospace)',
    fontSize: '0.875em',
    background: 'var(--dsw-alias-markdown-inline-code, rgba(128,128,128,.16))',
    borderRadius: 'var(--dsw-radius-sm, 4px)',
    padding: '0 5px',
  },
  mathBlock: {
    margin: `${mdBlockGap}px 0`,
    padding: '10px 14px',
    fontFamily: 'var(--ds-font-family-code, monospace)',
    fontSize: '0.875em',
    background: 'var(--dsw-alias-markdown-code-block, rgba(128,128,128,.10))',
    borderRadius: 'var(--dsw-radius-md, 8px)',
    overflowX: 'auto',
    whiteSpace: 'pre',
  },
}

/** Flatten an mdast node's text content (used for table cells and alt text). */
function nodeText(node) {
  if (node === undefined || node === null) return ''
  if (node.type === 'text' || node.type === 'inlineCode') return node.value ?? ''
  if (Array.isArray(node.children)) return node.children.map(nodeText).join('')
  return ''
}

function safeHref(url) {
  try {
    const protocol = new URL(url).protocol
    return protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:' ? url : undefined
  } catch {
    return undefined
  }
}

/**
 * Render one mdast tree to React nodes.
 * @param node - mdast node.
 * @param key - stable React key for this node.
 * @returns React children (an array or a single string).
 */
function renderMdNode(node, key) {
  if (node === undefined || node === null) return null
  switch (node.type) {
    case 'root':
      return node.children.map((child, i) => renderMdNode(child, `${key}-${i}`))

    case 'paragraph':
      return h('p', { key, style: mdStyles.p }, node.children.map((c, i) => renderMdNode(c, `${key}-${i}`)))

    case 'text':
      return node.value

    case 'strong':
      return h('strong', { key, style: mdStyles.strong }, node.children.map((c, i) => renderMdNode(c, `${key}-${i}`)))

    case 'emphasis':
      return h('em', { key }, node.children.map((c, i) => renderMdNode(c, `${key}-${i}`)))

    case 'delete':
      return h('del', { key }, node.children.map((c, i) => renderMdNode(c, `${key}-${i}`)))

    case 'inlineCode':
      return h('code', { key, style: mdStyles.inlineCode }, node.value)

    case 'link': {
      const href = safeHref(node.url)
      const children = node.children.map((c, i) => renderMdNode(c, `${key}-${i}`))
      return href === undefined
        ? h('span', { key }, children)
        : h('a', { key, href, target: '_blank', rel: 'noreferrer', style: mdStyles.link }, children)
    }

    case 'image':
      // Remote images stay out of the transcript; keep the alt text readable.
      return h('span', { key, style: { opacity: 0.7 } }, node.alt ?? node.url ?? '')

    case 'heading':
      return h(`h${Math.min(node.depth ?? 1, 6)}`, { key, style: mdStyles.h(node.depth ?? 1) },
        node.children.map((c, i) => renderMdNode(c, `${key}-${i}`)))

    case 'list': {
      const items = node.children.map((child, i) => {
        const li = renderMdNode({ ...child, type: 'listItem' }, `${key}-li${i}`)
        return li
      })
      return h(node.ordered ? 'ol' : 'ul', {
        key,
        style: mdStyles.ul,
        start: node.ordered && typeof node.start === 'number' ? node.start : undefined,
      }, items)
    }

    case 'listItem': {
      const kids = node.children.map((c, i) => renderMdNode(c, `${key}-${i}`))
      // Task-list checkbox parity with the native renderer.
      const checked = node.checked
      return h('li', { key, style: mdStyles.li },
        checked === undefined || checked === null
          ? kids
          : [
              h('input', {
                key: `${key}-cb`,
                type: 'checkbox',
                checked: Boolean(checked),
                readOnly: true,
                style: { margin: '0 8px 0 0', accentColor: 'var(--dsw-alias-label-secondary, #888)' },
              }),
              ...kids,
            ])
    }

    case 'blockquote':
      return h('blockquote', { key, style: mdStyles.blockquote },
        node.children.map((c, i) => renderMdNode(c, `${key}-${i}`)))

    case 'thematicBreak':
      return h('hr', { key, style: mdStyles.hr })

    case 'code':
      return h('div', { key, style: mdStyles.codeBlock },
        node.lang
          ? h('div', { style: mdStyles.codeBanner },
              h('span', { style: { fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 11 } }, node.lang))
          : null,
        h('pre', { style: mdStyles.codePre },
          h('code', { style: { fontFamily: 'inherit' } }, node.value ?? '')),
      )

    case 'table': {
      const rows = node.children
      const renderRow = (row, r, isHead) => h('tr', { key: `${key}-r${r}` },
        row.children.map((cell, c) => {
          const Tag = isHead ? 'th' : 'td'
          return h(Tag, {
            key: `${key}-r${r}c${c}`,
            style: isHead ? mdStyles.th : mdStyles.td,
          }, cell.children.map((x, i) => renderMdNode(x, `${key}-r${r}c${c}-${i}`)))
        }))
      return h('div', { key, style: mdStyles.tableScroll },
        h('table', { style: mdStyles.table },
          rows.length > 0 ? h('thead', null, renderRow(rows[0], 0, true)) : null,
          rows.length > 1 ? h('tbody', null, rows.slice(1).map((row, i) => renderRow(row, i + 1, false))) : null,
        ),
      )
    }

    case 'math':
      return h('div', { key, style: mdStyles.mathBlock }, node.value ?? '')

    case 'inlineMath':
      return h('code', { key, style: mdStyles.math }, node.value ?? '')

    case 'break':
      return h('br', { key })

    case 'footnoteReference':
      return h('sup', { key, style: { fontSize: '0.75em', opacity: 0.8 } }, `[${node.identifier ?? ''}]`)

    case 'footnoteDefinition':
      return null

    case 'html':
      // Raw HTML renders as literal text, matching the native policy.
      return h('span', { key }, node.value ?? '')

    case 'definition':
    case 'yaml':
    case 'toml':
      return null

    default:
      // Unknown node kinds degrade to their text content.
      return h('span', { key }, nodeText(node))
  }
}

/**
 * Render a Markdown document.
 * @param props - `text` is the source, `k` a render-scoped key prefix.
 */
function Markdown(props) {
  const tree = parseMarkdown(props.text ?? '')
  return h('div', { style: mdStyles.root }, renderMdNode(tree, props.k))
}

// ---------- toggle button ----------
// variant "sidebar": compact icon button for the sidebar footer row.
// variant "inline": labelled button for the hero options row.
function SplitButton(props) {
  const variant = props?.variant ?? 'inline'
  // Copied from ui-sidebar SidebarRoot.module.css `.iconButton`.
  if (variant === 'sidebar') {
    const [hover, setHover] = useState(false)
    return h('button', {
      className: 'dsws-icon-btn',
      title: '切换分屏视图',
      'aria-label': '切换分屏视图',
      style: {
        position: 'relative',
        flex: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        border: 'none',
        borderRadius: 'var(--dsw-radius-sm, 6px)',
        padding: 0,
        background: hover ? 'var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.14))' : 'transparent',
        cursor: 'pointer',
        color: hover ? 'var(--dsw-alias-label-primary, inherit)' : 'var(--dsw-alias-label-secondary, #888)',
        fontSize: 15,
        lineHeight: 1,
        // The footer action slot owns a 28px row above the account row; push
        // this control to that row's trailing edge and drop it one row down so
        // it reads as part of the account row itself.
        marginLeft: 'auto',
        marginRight: 4,
        transform: 'translateY(40px)',
      },
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      onClick: () => {
        try {
          window.__dswsToggle?.()
        } catch (_e) {}
      },
    }, '⊞')
  }
  return h('button', {
    title: '切换分屏视图',
    style: {
      padding: '4px 10px',
      fontSize: 12,
      lineHeight: '18px',
      border: '0.5px solid var(--dsw-alias-border-l2, #555)',
      borderRadius: 'var(--dsw-radius-sm, 6px)',
      background: 'transparent',
      color: 'var(--dsw-alias-label-primary, inherit)',
      cursor: 'pointer',
    },
    onClick: () => {
      try {
        window.__dswsToggle?.()
      } catch (_e) {}
    },
  }, '⊞ 分屏')
}

// ---------- composer ----------
// Copied from ui-conversation InputBar.module.css `.card` / `.input`.
const composerWrapStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '6px 8px',
  flexShrink: 0,
}
const composerCardStyle = {
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'flex-end',
  gap: 8,
  borderRadius: 'var(--dsw-radius-panel, 12px)',
  background: 'var(--dsw-specific-input-major, var(--dsw-alias-bg-elevated, #2a2a2a))',
  boxShadow: 'var(--dsw-elevation-soft, 0 1px 2px rgba(0,0,0,.12))',
  padding: '6px 8px 6px 12px',
}
const composerInputStyle = {
  flex: 1,
  resize: 'none',
  border: 'none',
  outline: 'none',
  padding: 0,
  fontSize: 'var(--dsh-content-font-size, 13px)',
  lineHeight: 'calc(20px + var(--dsh-content-font-delta, 0px))',
  fontFamily: 'var(--dsw-font-family, inherit)',
  background: 'transparent',
  color: 'var(--dsw-alias-label-primary, inherit)',
  caretColor: 'var(--dsw-alias-state-business-primary, #4a9eff)',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
  minHeight: 20,
  maxHeight: 80,
}
const composerBtnStyle = {
  flex: 'none',
  padding: '3px 10px',
  fontSize: 12,
  lineHeight: '18px',
  cursor: 'pointer',
  border: 'none',
  borderRadius: 'var(--dsw-radius-md, 8px)',
  background: 'var(--dsw-alias-state-business-primary, #4a9eff)',
  color: '#fff',
}

// Copied from ui-chat MessageItem.module.css `.bubble` / `.userRow`.
// User messages: right-aligned filled bubble. Assistant: plain flow.
function eventStyle(kind) {
  const base = {
    maxWidth: '82%',
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
    fontSize: 'var(--dsh-content-font-size, 13px)',
    lineHeight: 'calc(20px + var(--dsh-content-font-delta, 0px))',
    color: 'var(--dsw-alias-label-primary, inherit)',
    marginBottom: 8,
  }
  if (kind === 'user') return {
    ...base,
    alignSelf: 'flex-end',
    background: 'var(--dsw-specific-bubble, var(--dsw-alias-interactive-bg-hover, #2f3b4a))',
    borderRadius: 'var(--dsw-radius-xl, 16px)',
    padding: '10px 16px',
    boxSizing: 'border-box',
  }
  if (kind === 'assistant') return {
    ...base,
    alignSelf: 'stretch',
    maxWidth: '100%',
    whiteSpace: 'normal',
    background: 'transparent',
    padding: '2px 0',
  }
  if (kind === 'tool') return {
    ...base,
    alignSelf: 'flex-start',
    color: 'var(--dsw-alias-label-tertiary, #888)',
    fontSize: 'var(--dsh-content-font-size-secondary, 12px)',
    lineHeight: 'calc(18px + var(--dsh-content-font-delta-secondary, 0px))',
    fontFamily: 'var(--dsw-font-markdown-code-block-small, monospace)',
    padding: '2px 0',
  }
  if (kind === 'divider') return {
    ...base,
    maxWidth: '100%',
    alignSelf: 'stretch',
    textAlign: 'center',
    color: 'var(--dsw-alias-label-caption, #999)',
    fontSize: 'var(--dsh-content-font-size-secondary, 11px)',
    padding: '2px 0',
    marginBottom: 6,
  }
  return base
}

// ---------- single cell: live session events + input ----------
function CellView(props) {
  const { sessions, sessionId } = props
  const [binding, setBinding] = useState(null)
  const [error, setError] = useState(null)
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [retry, setRetry] = useState(0)
  const refRef = useRef(null)
  const openTimerRef = useRef(null)
  const bodyRef = useRef(null)
  const textareaRef = useRef(null)

  // Wait until the session appears in the host catalog before retaining.
  const catalogSubscribe = useCallback((cb) => sessions.list.subscribe(cb), [sessions])
  const catalogSnapshot = useCallback(() => sessions.list.getSnapshot(), [sessions])
  const catalog = useSyncExternalStore(catalogSubscribe, catalogSnapshot)
  const cataloged = !!sessionId && !!catalog?.ids?.includes(sessionId)

  // Retain session once catalogued.
  useEffect(() => {
    if (!sessionId || !cataloged) {
      if (!sessionId) {
        setBinding(null)
        setError(null)
      }
      return
    }
    let cancelled = false
    let reference = null
    const controller = new AbortController()
    openTimerRef.current = setTimeout(() => {
      if (cancelled) return
      try {
        controller.abort()
      } catch {}
      setError(`打开会话超时（${OPEN_TIMEOUT_MS / 1000}s）`)
    }, OPEN_TIMEOUT_MS)
    const finish = () => clearTimeout(openTimerRef.current)
    // Serialize the history open: concurrent opens leave some unsettled.
    enqueueOpen(() => {
      if (cancelled) return Promise.resolve()
      try {
        reference = sessions.retain(sessionId, { source: 'controllerOperation', signal: controller.signal })
        refRef.current = reference
        return Promise.resolve(reference.ready).then((b) => {
          if (cancelled) return
          finish()
          setBinding(b)
        }, (e) => {
          if (cancelled) return
          finish()
          setError(String(e))
        })
      } catch (e) {
        finish()
        setError(String(e))
        return Promise.resolve()
      }
    })
    return () => {
      cancelled = true
      clearTimeout(openTimerRef.current)
      try {
        controller.abort()
      } catch {}
      try {
        refRef.current?.release()
      } catch {}
      refRef.current = null
      setBinding(null)
    }
  }, [sessionId, cataloged, sessions, retry])

  // Subscribe to the event window.
  const [events, setEvents] = useState([])
  useEffect(() => {
    if (!binding?.eventSource) return
    const es = binding.eventSource
    const update = () => {
      const w = es.getSnapshot()
      setEvents(w?.entries ?? [])
    }
    update()
    return es.subscribe(update)
  }, [binding])

  // Subscribe to the session snapshot for running state.
  const [running, setRunning] = useState(false)
  useEffect(() => {
    if (!binding?.session) return
    const sess = binding.session
    const update = () => {
      const s = sess.getSnapshot()
      setRunning(s?.running ?? false)
    }
    update()
    return sess.subscribe(update)
  }, [binding])

  // Auto-scroll to the tail.
  useEffect(() => {
    const el = bodyRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [events.length])

  const send = useCallback(async () => {
    const text = inputText.trim()
    if (!text || !binding?.session || sending) return
    setSending(true)
    try {
      await binding.session.prompt([{ type: 'text', text }], 'queue')
      setInputText('')
    } catch (_e) {}
    setSending(false)
    textareaRef.current?.focus()
  }, [inputText, binding, sending])

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  if (!sessionId) {
    return h('div', { style: { textAlign: 'center', marginTop: 40, color: 'var(--dsw-alias-label-caption, #999)', flex: 1 } }, '从上方选择会话')
  }
  if (error) {
    return h('div', { style: { padding: 12, flex: 1, color: 'var(--dsw-alias-label-secondary, #888)' } },
      h('div', { style: { marginBottom: 8 } }, `加载失败: ${error}`),
      h('button', {
        style: { ...composerBtnStyle, alignSelf: 'flex-start' },
        onClick: () => {
          setError(null)
          setBinding(null)
          setRetry((n) => n + 1)
        },
      }, '重试'),
    )
  }
  if (!cataloged) {
    return h('div', { style: { padding: 12, color: 'var(--dsw-alias-label-secondary, #888)', flex: 1 } }, '等待会话目录…')
  }
  if (!binding) {
    return h('div', { style: { padding: 12, color: 'var(--dsw-alias-label-secondary, #888)', flex: 1 } }, '加载中…')
  }

  const visible = events.slice(-80)
  return h(React.Fragment, null,
    h('div', {
      ref: bodyRef,
      style: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'auto', padding: '10px 12px', minHeight: 0 },
    },
      visible.map((entry, idx) => {
        const ev = entry.event
        const type = ev?.type ?? 'unknown'
        let text = ''
        let kind = 'other'
        if (type === 'user/message') {
          const blocks = ev?.data?.content ?? []
          text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('')
          kind = 'user'
        } else if (type === 'assistant/message') {
          const blocks = ev?.data?.message?.content ?? []
          text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('')
          kind = 'assistant'
        } else if (type === 'assistant/live-chunk') {
          text = ev?.data?.chunk?.text ?? ''
          kind = 'assistant'
        } else if (type === 'tool/result') {
          text = `[tool] ${ev?.data?.name ?? ''}`
          kind = 'tool'
        } else if (type === 'turn/start') {
          text = `— 第 ${ev?.data?.turn} 轮 —`
          kind = 'divider'
        } else {
          return null
        }
        if (!text) return null
        // Assistant narration is Markdown; user prompts and status rows stay literal.
        if (kind === 'assistant') {
          return h('div', { key: idx, style: eventStyle(kind) }, h(Markdown, { text, k: `m${idx}` }))
        }
        return h('div', { key: idx, style: eventStyle(kind) }, text)
      }),
    ),
    h('div', { style: composerWrapStyle },
      h('div', { style: composerCardStyle },
        h('textarea', {
          ref: textareaRef,
          value: inputText,
          onChange: (e) => setInputText(e.target.value),
          onKeyDown,
          placeholder: '输入消息…',
          rows: 1,
          style: composerInputStyle,
        }),
        h('button', {
          onClick: send,
          disabled: !inputText.trim() || sending,
          style: { ...composerBtnStyle, opacity: !inputText.trim() || sending ? 0.4 : 1 },
        }, '发送'),
      ),
    ),
  )
}

// ---------- split grid panel ----------
function SplitMain(props) {
  const sessions = props.__sessions
  const subscribe = useCallback((cb) => sessions.list.subscribe(cb), [sessions])
  const getSnapshot = useCallback(() => sessions.list.getSnapshot(), [sessions])
  const list = useSyncExternalStore(subscribe, getSnapshot)

  const saved = useRef(loadLayout()).current
  const [gridSize, setGridSize] = useState(saved?.gridSize ?? 2)
  const [activeCell, setActiveCell] = useState(0)
  const [cells, setCells] = useState(() => {
    const s = saved?.cells ?? []
    const size = (saved?.gridSize ?? 2) ** 2
    const arr = Array(size).fill(null)
    for (let i = 0; i < Math.min(s.length, size); i++) arr[i] = s[i] ?? null
    return arr
  })

  const items = list?.ids?.map((id) => list.byId[id]).filter(Boolean) ?? []
  const nonBlank = items.filter((s) => !s.blank)

  // Track running state per session for the status dots.
  const runningMap = useRef({})
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const unsubs = []
    for (const s of nonBlank) {
      try {
        const info = sessions.retainInfo(s.id)
        const unsub = info.subscribe(() => {
          const snap = info.getSnapshot()
          const wasRunning = runningMap.current[s.id]
          const nowRunning = (snap?.retainedBy?.mainView ?? 0) > 0
          if (wasRunning !== nowRunning) {
            runningMap.current[s.id] = nowRunning
            forceUpdate((n) => n + 1)
          }
        })
        unsubs.push(unsub)
      } catch {}
    }
    return () => unsubs.forEach((u) => {
      try {
        u()
      } catch {}
    })
  }, [nonBlank.length])

  // Cell count is clamped to the global limit (default 20, configurable via Config).
  const maxCells = props.__maxCells ?? DEFAULT_MAX_CELLS
  const total = Math.min(gridSize * gridSize, maxCells)

  const setCell = (idx, sessionId) => {
    setCells((prev) => {
      const next = [...prev]
      next[idx] = sessionId
      return next
    })
  }

  useEffect(() => {
    const size = Math.min(gridSize * gridSize, maxCells)
    setCells((prev) => {
      const next = Array(size).fill(null)
      for (let i = 0; i < Math.min(prev.length, size); i++) next[i] = prev[i]
      return next
    })
  }, [gridSize, maxCells])

  useEffect(() => {
    saveLayout(gridSize, cells, window.__dswsInSplit ?? false)
  }, [gridSize, cells])

  // Drop stale references: cells pointing at sessions no longer in the catalog.
  useEffect(() => {
    if (list?.phase !== 'ready') return
    const known = new Set(list.ids ?? [])
    setCells((prev) => {
      if (prev.every((c) => c === null || known.has(c))) return prev
      return prev.map((c) => (c !== null && known.has(c) ? c : null))
    })
  }, [list])

  // Tiles butt against each other: no gap, no radius. Each tile draws its own
  // leading and top hairline, and the grid carries the trailing and bottom
  // ones, so neighbours share exactly one 0.5px rule instead of stacking two.
  const cellStyle = {
    borderTop: '0.5px solid var(--dsw-alias-border-l3, #444)',
    borderLeft: '0.5px solid var(--dsw-alias-border-l3, #444)',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minHeight: 0,
    minWidth: 0,
    background: 'var(--dsw-alias-bg-base, transparent)',
  }
  const cellHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    minHeight: 30,
    padding: '6px 12px',
    borderBottom: '0.5px solid var(--dsw-alias-border-l3, #444)',
    fontSize: 13,
    lineHeight: '16px',
    fontWeight: 500,
    color: 'var(--dsw-alias-label-primary, inherit)',
  }
  const selectStyle = {
    fontSize: 12,
    padding: '2px 6px',
    maxWidth: 160,
    background: 'var(--dsw-specific-input-major, transparent)',
    color: 'var(--dsw-alias-label-primary, inherit)',
    border: '0.5px solid var(--dsw-alias-border-l2, #555)',
    borderRadius: 'var(--dsw-radius-sm, 6px)',
  }
  const dotStyle = (running) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
    background: running ? 'var(--dsw-alias-state-success, #4caf50)' : 'var(--dsw-alias-label-caption, #999)',
    transition: 'background 0.3s',
  })
  const toolbarStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minHeight: 38,
    padding: '6px 20px',
    flexShrink: 0,
    borderBottom: '0.5px solid var(--dsw-alias-border-l3, #444)',
    color: 'var(--dsw-alias-label-primary, inherit)',
  }
  // minmax(0, 1fr) on both axes: a bare 1fr resolves its min to auto, so a
  // long transcript would grow its row past the viewport instead of scrolling.
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
    gap: 0,
    padding: 0,
    borderRight: '0.5px solid var(--dsw-alias-border-l3, #444)',
    borderBottom: '0.5px solid var(--dsw-alias-border-l3, #444)',
    boxSizing: 'border-box',
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  }
  const btnStyle = {
    padding: '2px 8px',
    fontSize: 12,
    lineHeight: '18px',
    cursor: 'pointer',
    border: '0.5px solid var(--dsw-alias-border-l2, #555)',
    borderRadius: 'var(--dsw-radius-sm, 6px)',
    background: 'transparent',
    color: 'var(--dsw-alias-label-primary, inherit)',
  }

  return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' } },
    h('div', { style: toolbarStyle },
      h('span', { style: { fontWeight: 600, fontSize: 15 } }, '分屏视图'),
      h('span', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary, #888)' } },
        `${nonBlank.length} 个会话 · ${total}/${maxCells} 格`),
      h('div', { style: { marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' } },
        h('span', { style: { fontSize: 12 } }, '网格:'),
        [1, 2, 3, 4, 5].map((n) =>
          h('button', {
            key: n,
            style: { ...btnStyle, fontWeight: gridSize === n ? 700 : 400 },
            onClick: () => setGridSize(n),
            title: `${n}×${n} = ${n * n} 格`,
          }, `${n}×${n}`),
        ),
        h('button', {
          style: btnStyle,
          onClick: () => {
            try {
              window.__dswsToggle?.()
            } catch (_e) {}
          },
        }, '退出分屏'),
      ),
    ),
    h('div', { style: gridStyle },
      Array.from({ length: total }, (_, i) => {
        const sid = cells[i]
        const sess = sid ? nonBlank.find((s) => s.id === sid) : null
        const isActive = i === activeCell
        return h('div', {
          key: i,
          style: {
            ...cellStyle,
            // Inset ring marks the active tile without touching the shared
            // dividers or shifting the tile's box.
            boxShadow: isActive
              ? 'inset 0 0 0 1.5px var(--dsw-alias-state-business-primary, #4a9eff)'
              : 'none',
          },
          onMouseDown: () => setActiveCell(i),
        },
          h('div', {
            style: {
              ...cellHeaderStyle,
              background: isActive ? 'var(--dsw-alias-interactive-bg-hover, #2f3b4a)' : 'transparent',
            },
          },
            sess
              ? h(React.Fragment, null,
                  h('span', { style: dotStyle(sess.running) }),
                  h('span', null, sess.displayTitle || sess.title || sess.id.slice(0, 8)),
                )
              : h('span', { style: { color: 'var(--dsw-alias-label-caption, #999)' } }, `格 ${i + 1}`),
            h('select', {
              style: { ...selectStyle, marginLeft: 'auto' },
              value: sid ?? '',
              onChange: (e) => setCell(i, e.target.value || null),
            },
              h('option', { value: '' }, '选择会话…'),
              nonBlank.map((s) =>
                h('option', { key: s.id, value: s.id },
                  (s.displayTitle || s.title || s.id.slice(0, 8)) + (s.running ? ' ●' : '')),
              ),
            ),
          ),
          h(CellView, { sessions, sessionId: sid }),
        )
      }),
    ),
  )
}

export const inject = ['slots', 'layout', 'sessions']

// Config: cell limits. Users override in cordis.patch.yml.
export function apply(ctx, config) {
  const maxCells = config?.maxCells ?? DEFAULT_MAX_CELLS
  // Restore split state from the previous page load.
  const saved = loadLayout()
  let inSplit = saved?.inSplit ?? false
  window.__dswsInSplit = inSplit

  window.__dswsToggle = () => {
    inSplit = !inSplit
    window.__dswsInSplit = inSplit
    try {
      ctx.layout.selectPanel(inSplit ? 'split' : null)
    } catch (_e) {}
    const cur = loadLayout() ?? {}
    saveLayout(cur.gridSize ?? 2, cur.cells ?? [], inSplit)
  }
  ctx.effect(() => () => {
    try {
      delete window.__dswsToggle
      delete window.__dswsInSplit
    } catch (_e) {}
  }, 'workspace-split: cleanup')

  // Primary entry: sidebar footer row, on the account row's trailing edge.
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'workspace-split-sidebar',
    order: 5,
  }, function SidebarSplitButton() {
    return h(SplitButton, { variant: 'sidebar' })
  }))

  ctx.slots.inject('conversation.hero.options', () => ctx.slots.register({
    name: 'conversation.hero.options',
    id: 'workspace-split-btn-hero',
    order: 5,
  }, SplitButton))

  const sessionsRef = ctx.sessions
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: 'split',
  }, function SplitPanel() {
    return h(SplitMain, { __sessions: sessionsRef, __maxCells: maxCells })
  }))

  // Auto-enter the split panel after the panel row is registered.
  if (inSplit) {
    try {
      ctx.layout.selectPanel('split')
    } catch (_e) {}
  }
}
