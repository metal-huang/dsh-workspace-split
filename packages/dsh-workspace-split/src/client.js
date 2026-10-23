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
import katex from 'katex'

const h = React.createElement
const { useState, useEffect, useCallback, useSyncExternalStore, useRef } = React

// ---------- i18n ----------
import { t } from './i18n.js'

// ---------- limits ----------
// One screen holds ten cells at most by default. Six fit comfortably; each
// extra tile retains another live Session, so seven to ten ask for a
// confirmation first, and going past ten requires raising the limit in
// Settings (General → Split grid). DSH does not hand plugin config to the
// browser half, so the limit lives in localStorage instead of cordis.patch.yml.
const DEFAULT_MAX_CELLS = 10
const DEFAULT_CONFIRM_CELLS = 6
/** Largest row count the picker offers. */
const PICKER_MAX_ROWS = 5
/** Largest column count the picker offers. */
const PICKER_MAX_COLS = 6
const LIMIT_MAX = PICKER_MAX_ROWS * PICKER_MAX_COLS
/**
 * Cell text scaling. A cell renders at the desktop size only when it is about
 * as wide as the conversation column; narrower cells shrink so the same screen
 * area keeps showing a useful amount of text. `(ctrl) + wheel` over one cell
 * moves that cell alone.
 */
const ZOOM_MIN = 0.6
const ZOOM_MAX = 1.6
/** Wheel step for the per-cell override. */
const ZOOM_STEP = 0.05
/** Width at or above which a cell keeps the desktop text size. */
const ZOOM_FULL_WIDTH = 820
/** Smallest automatic scale, so text never gets illegible. */
const ZOOM_AUTO_FLOOR = 0.78
/** Automatic scale for a cell of this width. */
function autoZoomForWidth(width) {
  if (!(width > 0)) return 1
  return Math.max(ZOOM_AUTO_FLOOR, Math.min(1, width / ZOOM_FULL_WIDTH))
}

/**
 * Scales one cell's contents so a narrow tile keeps its information density.
 * Reads its own width, multiplies by the reader's per-cell override, and owns
 * the ctrl+wheel listener (passive listeners cannot cancel the page zoom).
 * @param props - `zoom` is the reader override, `onZoom` receives the next step.
 */
function CellZoom(props) {
  const { zoom, onZoom, children } = props
  const outerRef = useRef(null)
  const [auto, setAuto] = useState(1)

  useEffect(() => {
    const el = outerRef.current
    if (el === null || typeof ResizeObserver !== 'function') return undefined
    const read = () => setAuto(autoZoomForWidth(el.getBoundingClientRect().width))
    read()
    const observer = new ResizeObserver(read)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = outerRef.current
    if (el === null) return undefined
    const onWheel = (event) => {
      if (!event.ctrlKey) return
      event.preventDefault()
      onZoom(event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onZoom])

  const scale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, auto * zoom))
  return h('div', {
    ref: outerRef,
    style: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0 },
  },
    h('div', {
      // `zoom` scales text AND layout, so token-derived sizes (the markdown type
      // ladder, the composer) follow along instead of only my own font sizes.
      style: { zoom: scale, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0 },
    }, children),
  )
}

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
function saveLayout(next) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next))
  } catch {}
}

/** Per-cell text scale a reader has dialled in, keyed by cell index. */
function savedZooms(saved) {
  const list = Array.isArray(saved?.zooms) ? saved.zooms : []
  return list.map((value) => {
    const n = Number(value)
    return Number.isFinite(n) ? Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, n)) : 1
  })
}

/** Coerce a persisted span to a positive integer, falling back when invalid. */
function toSpan(value, fallback) {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 ? n : fallback
}

/** Read geometry from a saved layout, migrating the old square `gridSize` shape. */
function savedGeometry(saved) {
  if (Number.isInteger(saved?.rows) && Number.isInteger(saved?.cols)) {
    return { rows: toSpan(saved.rows, 2), cols: toSpan(saved.cols, 2) }
  }
  const n = Math.min(toSpan(saved?.gridSize, 2), PICKER_MAX_COLS)
  return { rows: n, cols: n }
}

/** Shrink a geometry until rows × cols fits `maxCells`, staying as square as possible. */
function fitGeometry(rows, cols, maxCells) {
  let r = Math.min(toSpan(rows, 1), PICKER_MAX_ROWS)
  let c = Math.min(toSpan(cols, 1), PICKER_MAX_COLS)
  while (r * c > maxCells) {
    if (r >= c && r > 1) r -= 1
    else if (c > 1) c -= 1
    else break
  }
  return { rows: r, cols: c }
}

/** Coerce a limit to a positive integer, capped to the picker's range. */
function clampLimit(value, fallback) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1) return fallback
  return Math.min(n, LIMIT_MAX)
}

/** Normalize one { maxCells, confirmOverCells } pair; confirm never exceeds max. */
function normalizeLimits(value) {
  const maxCells = clampLimit(value?.maxCells, DEFAULT_MAX_CELLS)
  return {
    maxCells,
    confirmOverCells: Math.min(clampLimit(value?.confirmOverCells, DEFAULT_CONFIRM_CELLS), maxCells),
  }
}

const LIMITS_KEY = 'dsws-limits'
function loadLimits() {
  try {
    const raw = localStorage.getItem(LIMITS_KEY)
    return normalizeLimits(raw ? JSON.parse(raw) : null)
  } catch {
    return normalizeLimits(null)
  }
}

// The split panel, the picker and the Settings row all read this one snapshot,
// so raising the cap in Settings takes effect without a reload.
let limitsSnapshot = loadLimits()
const limitListeners = new Set()

function subscribeLimits(listener) {
  limitListeners.add(listener)
  return () => limitListeners.delete(listener)
}
function getLimits() {
  return limitsSnapshot
}

// Geometry lives above the panel: the sidebar control owns the picker and is
// always mounted, while the panel only exists while the split view is open.
let geometrySnapshot = null
const geometryListeners = new Set()

/** Read the shared geometry, fitting it to the current cap on first use. */
function getGeometry() {
  if (geometrySnapshot === null) {
    const start = savedGeometry(loadLayout())
    geometrySnapshot = fitGeometry(start.rows, start.cols, limitsSnapshot.maxCells)
  }
  return geometrySnapshot
}

function subscribeGeometry(listener) {
  geometryListeners.add(listener)
  return () => geometryListeners.delete(listener)
}

/**
 * Apply a new grid geometry everywhere it is read.
 * @param nextRows - requested row count.
 * @param nextCols - requested column count.
 */
function updateGeometry(nextRows, nextCols) {
  const next = fitGeometry(nextRows, nextCols, limitsSnapshot.maxCells)
  const prev = getGeometry()
  if (next.rows === prev.rows && next.cols === prev.cols) return
  geometrySnapshot = next
  // Persist immediately: the picker works with the split view closed, where the
  // panel's own persistence effect is not mounted.
  const saved = loadLayout() ?? {}
  saveLayout({ ...saved, rows: next.rows, cols: next.cols })
  for (const listener of geometryListeners) listener()
}

/** Refit the shared geometry after the cap moves. */
function refitGeometry() {
  const prev = getGeometry()
  const fitted = fitGeometry(prev.rows, prev.cols, limitsSnapshot.maxCells)
  if (fitted.rows === prev.rows && fitted.cols === prev.cols) return
  geometrySnapshot = fitted
  for (const listener of geometryListeners) listener()
}

function updateLimits(patch) {
  limitsSnapshot = normalizeLimits({ ...limitsSnapshot, ...patch })
  try {
    localStorage.setItem(LIMITS_KEY, JSON.stringify(limitsSnapshot))
  } catch {}
  refitGeometry()
  for (const listener of limitListeners) listener()
}

/**
 * One cell holds either a pinned Session or a Workspace scope that still shows
 * exactly one Session. Client shapes:
 * `{ t: 'session', id }` and `{ t: 'workspace', ws, id }`.
 * Layouts saved before workspace scoping stored a bare Session id, so plain
 * strings normalize to the Session shape.
 * @param value - stored cell value.
 * @returns the normalized cell, or null for an empty cell.
 */
function normalizeCell(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return { t: 'session', id: value }
  if (typeof value !== 'object') return null
  if (value.t === 'session' && typeof value.id === 'string') return { t: 'session', id: value.id }
  if (value.t === 'workspace' && typeof value.ws === 'string') {
    return { t: 'workspace', ws: value.ws, id: typeof value.id === 'string' ? value.id : null }
  }
  return null
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
    maxWidth: '100%',
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
    minWidth: 0,
    maxWidth: '100%',
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
    minWidth: 0,
    maxWidth: '100%',
    font: 'var(--dsw-font-markdown-code-block, inherit)',
    fontFamily: 'var(--ds-font-family-code, monospace)',
    padding: 16,
    margin: 0,
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    background: 'var(--dsw-alias-markdown-code-block, rgba(128,128,128,.10))',
  },
  // `minWidth: 0` on every block that can hold wide content: a flex item's
  // default `min-width: auto` resolves to its content's min-content width, so
  // a wide table would stretch the block past the cell instead of scrolling
  // inside its own wrapper.
  tableScroll: {
    minWidth: 0,
    maxWidth: '100%',
    overflowX: 'auto',
    overscrollBehaviorX: 'contain',
    margin: `${mdBlockGap}px 0`,
  },
  table: { borderCollapse: 'collapse', width: 'max-content', maxWidth: 'max-content' },
  // `.tableFill` in the native sheet: fill the column so cells wrap instead of
  // forcing the reader to scroll sideways in a narrow cell.
  tableFill: { borderCollapse: 'collapse', width: '100%', maxWidth: 'none' },
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
  // KaTeX paints its own metrics; the wrapper only handles overflow and rhythm.
  mathInline: { display: 'inline-block', maxWidth: '100%', overflowX: 'auto', verticalAlign: 'middle' },
  mathBlock: {
    minWidth: 0,
    maxWidth: '100%',
    margin: `${mdBlockGap}px 0`,
    overflowX: 'auto',
    overflowY: 'hidden',
  },
}

/**
 * Render TeX the way the harness's own transcript does.
 *
 * The page already ships KaTeX's stylesheet with the vendor CSS, so no
 * stylesheet work is needed here; an unparsable expression falls back to its
 * source instead of breaking the turn.
 * @param value - TeX source.
 * @param displayMode - block expression when true, inline when false.
 * @returns a React node holding the rendered math.
 */
function texNode(value, displayMode) {
  const source = String(value ?? '')
  try {
    const html = katex.renderToString(source, {
      throwOnError: false,
      displayMode,
      output: 'html',
      strict: 'ignore',
      trust: false,
    })
    return h('span', { dangerouslySetInnerHTML: { __html: html } })
  } catch {
    return h('code', null, source)
  }
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
      // Copied from MarkdownText.module.css `.tableFill`: a table under four
      // columns fills the column and wraps its cells; only a genuinely wide
      // table keeps max-content and scrolls. Without this a 3-column table
      // would need horizontal scrolling inside a narrow cell.
      const columns = rows[0]?.children.length ?? 0
      const wide = columns >= 4
      const tableStyle = wide ? mdStyles.table : mdStyles.tableFill
      const renderRow = (row, r, isHead) => h('tr', { key: `${key}-r${r}` },
        row.children.map((cell, c) => {
          const Tag = isHead ? 'th' : 'td'
          const base = isHead ? mdStyles.th : mdStyles.td
          // The native 100px floor suits the wide conversation column; inside a
          // narrow cell it would push a filled table past the wrapper again.
          const style = wide ? base : { ...base, minWidth: 0, maxWidth: 'none' }
          return h(Tag, {
            key: `${key}-r${r}c${c}`,
            style,
          }, cell.children.map((x, i) => renderMdNode(x, `${key}-r${r}c${c}-${i}`)))
        }))
      return h('div', { key, style: mdStyles.tableScroll },
        h('table', { style: tableStyle },
          rows.length > 0 ? h('thead', null, renderRow(rows[0], 0, true)) : null,
          rows.length > 1 ? h('tbody', null, rows.slice(1).map((row, i) => renderRow(row, i + 1, false))) : null,
        ),
      )
    }

    case 'math':
      return h('div', { key, style: mdStyles.mathBlock }, texNode(node.value, true))

    case 'inlineMath':
      return h('span', { key, style: mdStyles.mathInline }, texNode(node.value, false))

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

// ---------- turn rail ----------
// Ported from ui-chat TurnNavigator.module.css / TurnNavigator.tsx: a
// fixed-pitch ladder of one tick per Turn, the active tick in the primary
// label color, hover previews, and a click that either scrolls to the loaded
// Turn or pages its history in through `loadThrough(seq)` first.

/** Fixed pitch between neighbouring ticks; overflow scrolls inside the frame. */
const TURN_MARK_PITCH = 10
/** Rail padding above the first tick and below the last one. */
const TURN_RAIL_INSET = 6
/** Fade band the mask reserves at a scrollable end. */
const TURN_FADE_PX = 24
/** Below this cell width the rail would crowd the transcript, so it hides. */
const TURN_RAIL_MIN_WIDTH = 420
/** Bound for a rename round-trip; the title stays put when it expires. */
const RENAME_TIMEOUT_MS = 8000

const turnRailStyles = {
  frame: {
    // Centered band, matching TurnNavigator.module.css: the rail floats at the
    // vertical middle of the scrollport instead of hugging its top edge.
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    right: 4,
    width: 20,
    maxHeight: 'calc(100% - 32px)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    pointerEvents: 'auto',
  },
  scroller: (fadeTop, fadeBottom) => ({
    position: 'relative',
    minHeight: 0,
    maxHeight: '100%',
    overflowY: 'auto',
    overflowX: 'hidden',
    overscrollBehavior: 'contain',
    scrollbarWidth: 'none',
    paddingTop: TURN_RAIL_INSET,
    paddingBottom: TURN_RAIL_INSET,
    maskImage: fadeTop && fadeBottom
      ? `linear-gradient(to bottom, transparent 0, #000 ${TURN_FADE_PX}px, #000 calc(100% - ${TURN_FADE_PX}px), transparent 100%)`
      : fadeTop
        ? `linear-gradient(to bottom, transparent 0, #000 ${TURN_FADE_PX}px, #000 100%)`
        : fadeBottom
          ? `linear-gradient(to bottom, #000 0, #000 calc(100% - ${TURN_FADE_PX}px), transparent 100%)`
          : undefined,
  }),
  mark: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: TURN_MARK_PITCH,
    width: '100%',
    padding: 0,
    border: 0,
    background: 'transparent',
    cursor: 'pointer',
  },
  tick: (state) => ({
    width: 20,
    height: 2,
    borderRadius: 2,
    transformOrigin: 'right center',
    transition: 'transform 140ms ease, background-color 140ms ease, opacity 140ms ease',
    transform: `scaleX(${
      state === 'active' ? 1 : state === 'hover' ? 0.9 : state === 'unloaded' ? 0.4 : 0.6
    })`,
    opacity: state === 'unloaded' ? 0.6 : 1,
    background: state === 'active'
      ? 'var(--dsw-alias-label-primary, #eee)'
      : state === 'hover'
        ? 'var(--dsw-alias-label-tertiary, #999)'
        : 'var(--dsw-alias-border-l4, #555)',
  }),
  preview: {
    position: 'absolute',
    right: 'calc(100% + 10px)',
    width: 260,
    maxHeight: 100,
    overflow: 'hidden',
    padding: '10px 12px',
    borderRadius: 'var(--dsw-radius-lg, 10px)',
    background: 'var(--dsw-alias-bg-layer-1, #1e1e1e)',
    boxShadow: 'var(--dsw-elevation-panel, 0 4px 16px rgba(0,0,0,.35))',
    pointerEvents: 'none',
    color: 'var(--dsw-alias-label-primary, #eee)',
    zIndex: 8,
  },
  previewPrompt: {
    font: 'var(--dsw-font-xs-strong-13, inherit)',
    fontWeight: 600,
    fontSize: 12,
    lineHeight: '17px',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 1,
    WebkitBoxOrient: 'vertical',
  },
  previewResponse: {
    marginTop: 4,
    color: 'var(--dsw-alias-label-caption, #888)',
    fontSize: 11,
    lineHeight: '16px',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
  },
}

/**
 * Derive the rail ladder from the loaded window.
 * @param events - visible session event entries.
 * @returns one item per Turn, ascending, with prompts and response previews.
 */
function turnRailItems(events) {
  const byTurn = new Map()
  const ensure = (turn) => {
    let item = byTurn.get(turn)
    if (item === undefined) {
      item = { turn, seq: undefined, prompt: '', response: '' }
      byTurn.set(turn, item)
    }
    return item
  }
  for (const entry of events) {
    const ev = entry?.event
    if (ev === undefined || ev === null) continue
    if (ev.type === 'turn/start') {
      const item = ensure(ev.data?.turn ?? 0)
      if (typeof ev.seq === 'number') item.seq = ev.seq
      continue
    }
    const turn = ev.data?.turn
    if (typeof turn !== 'number') continue
    if (ev.type === 'user/message') {
      const blocks = ev.data?.content ?? []
      const text = blocks.filter((b) => b?.type === 'text').map((b) => b.text).join(' ')
      if (text !== '' && ensure(turn).prompt === '') ensure(turn).prompt = text.slice(0, 120)
    } else if (ev.type === 'assistant/message') {
      const blocks = ev.data?.message?.content ?? []
      const text = blocks.filter((b) => b?.type === 'text').map((b) => b.text).join(' ')
      if (text !== '' && ensure(turn).response === '') ensure(turn).response = text.slice(0, 300)
    }
  }
  return [...byTurn.values()].sort((left, right) => left.turn - right.turn)
}

/**
 * Right-side Turn ladder for one cell.
 * @param props - `items`, the cell's scroll element, and its session face.
 */
function TurnRail(props) {
  const { items, bodyRef, session } = props
  const [activeTurn, setActiveTurn] = useState(null)
  const [hoverTurn, setHoverTurn] = useState(null)
  const [busyTurn, setBusyTurn] = useState(null)
  const [scrolled, setScrolled] = useState({ top: false, bottom: false })
  const [railScroll, setRailScroll] = useState(0)
  const [tooNarrow, setTooNarrow] = useState(false)
  const scrollerRef = useRef(null)

  // The native rail hides under a 900px container; a cell gets proportionally
  // less, so drop it before it crowds the transcript it is meant to index.
  useEffect(() => {
    const el = bodyRef.current
    if (el === null || typeof ResizeObserver !== 'function') return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0
      setTooNarrow(width > 0 && width < TURN_RAIL_MIN_WIDTH)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [bodyRef])

  // Track the Turn whose row sits at the reader's top edge.
  useEffect(() => {
    const el = bodyRef.current
    if (el === null) return
    let frame = 0
    const measure = () => {
      frame = 0
      const nodes = el.querySelectorAll('[data-turn]')
      if (nodes.length === 0) return
      const edge = el.scrollTop + 8
      let current = Number(nodes[0].getAttribute('data-turn'))
      for (const node of nodes) {
        if (node.offsetTop <= edge) current = Number(node.getAttribute('data-turn'))
        else break
      }
      setActiveTurn((prev) => (prev === current ? prev : current))
    }
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(measure)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    measure()
    return () => {
      el.removeEventListener('scroll', onScroll)
      if (frame !== 0) cancelAnimationFrame(frame)
    }
  }, [bodyRef, items.length])

  // Keep the active tick inside the rail's visible band.
  useEffect(() => {
    const el = scrollerRef.current
    if (el === null || activeTurn === null) return
    const mark = el.querySelector(`[data-rail-turn="${activeTurn}"]`)
    if (mark === null) return
    const total = el.scrollHeight
    const view = el.clientHeight
    const top = mark.offsetTop
    const bottom = top + mark.offsetHeight
    if (top < el.scrollTop + TURN_FADE_PX || bottom > el.scrollTop + view - TURN_FADE_PX) {
      el.scrollTop = top - view / 2 + mark.offsetHeight / 2
    }
    setScrolled({ top: el.scrollTop > 1, bottom: el.scrollTop < total - view - 1 })
  }, [activeTurn, items.length])

  const jump = useCallback(async (item) => {
    const el = bodyRef.current
    if (el === null) return
    const find = () => el.querySelector(`[data-turn="${item.turn}"]`)
    const node = find()
    if (node !== null) {
      el.scrollTop = node.offsetTop - 8
      return
    }
    // Turn is known but paged out: pull its history in, then scroll.
    if (session === undefined || session === null || typeof item.seq !== 'number') return
    setBusyTurn(item.turn)
    try {
      await session.loadThrough(item.seq)
    } catch {}
    requestAnimationFrame(() => {
      const late = find()
      if (late !== null) el.scrollTop = late.offsetTop - 8
      setBusyTurn(null)
    })
  }, [bodyRef, session])

  if (items.length < 2 || tooNarrow) return null
  const hovered = hoverTurn === null ? undefined : items.find((i) => i.turn === hoverTurn)

  return h('div', { style: turnRailStyles.frame },
    h('div', {
      ref: scrollerRef,
      style: turnRailStyles.scroller(scrolled.top, scrolled.bottom),
      onScroll: (e) => setRailScroll(e.currentTarget.scrollTop),
    },
      h('div', { style: { position: 'relative' } },
        items.map((item) => {
          const state = item.turn === activeTurn
            ? 'active'
            : item.turn === hoverTurn
              ? 'hover'
              : item.seq === undefined
                ? 'unloaded'
                : 'rest'
          return h('button', {
            key: item.turn,
            type: 'button',
            'data-rail-turn': item.turn,
            'aria-label': `第 ${item.turn} 轮`,
            'aria-current': item.turn === activeTurn ? 'true' : undefined,
            style: { ...turnRailStyles.mark, opacity: item.turn === busyTurn ? 0.4 : 1 },
            onMouseEnter: () => setHoverTurn(item.turn),
            onMouseLeave: () => setHoverTurn((prev) => (prev === item.turn ? null : prev)),
            onFocus: () => setHoverTurn(item.turn),
            onBlur: () => setHoverTurn((prev) => (prev === item.turn ? null : prev)),
            onClick: () => { void jump(item) },
          }, h('span', { style: turnRailStyles.tick(state) }))
        }),
      ),
    ),
    hovered === undefined ? null : h('div', {
      role: 'tooltip',
      style: {
        ...turnRailStyles.preview,
        // Track the hovered tick: its own offset inside the scroller, minus how
        // far that scroller has been scrolled, centered on the tick.
        top: TURN_RAIL_INSET
          + items.findIndex((i) => i.turn === hovered.turn) * TURN_MARK_PITCH
          + TURN_MARK_PITCH / 2
          - railScroll,
        transform: 'translateY(-50%)',
      },
    },
      h('div', { style: turnRailStyles.previewPrompt }, hovered.prompt || `第 ${hovered.turn} 轮`),
      hovered.response === '' ? null : h('div', { style: turnRailStyles.previewResponse }, hovered.response),
    ),
  )
}

// ---------- sidebar split control ----------
// One control for the whole split feature: left click toggles the view, right
// click opens the grid picker, hover explains both. Its row sits above the
// account row when the sidebar is expanded (dropped onto that row's trailing
// edge) and above the avatar when the sidebar is a rail.

const splitControlStyles = {
  button: (hover) => ({
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
    // Placement is stylesheet-driven (see installSplitStyles): it depends on the
    // shell's own collapsed attribute, which the sidebar republishes whenever it
    // remounts its subtree.
  }),
  tip: (top, left) => ({
    position: 'fixed',
    top,
    left,
    width: SPLIT_TIP_WIDTH,
    boxSizing: 'border-box',
    transform: 'translateX(-50%)',
    padding: '6px 10px',
    borderRadius: 'var(--dsw-radius-md, 8px)',
    background: 'var(--dsw-alias-bg-layer-1, #242424)',
    boxShadow: 'var(--dsw-elevation-panel, 0 4px 16px rgba(0,0,0,.35))',
    color: 'var(--dsw-alias-label-primary, #eee)',
    fontSize: 12,
    lineHeight: '16px',
    textAlign: 'center',
    pointerEvents: 'none',
    zIndex: 30,
  }),
  tipHint: {
    display: 'block',
    marginTop: 2,
    color: 'var(--dsw-alias-label-caption, #888)',
    fontSize: 11,
  },
}

const SIDEBAR_CONTROL_HINT = '左键切换分屏，右键选网格'
/** Rough rendered width of the hover tip, used to keep it inside the viewport. */
const SPLIT_TIP_WIDTH = 190

/**
 * Split-view glyph, drawn from the shipped `icon.svg`: four rounded panes in two
 * blues with opposing corners emphasised. Artwork keeps its own colours, which
 * the plugin icon rules allow.
 * @param props - `size` in pixels.
 */
function SplitIcon(props) {
  const size = props?.size ?? 16
  return h('svg', {
    width: size,
    height: size,
    viewBox: '0 0 64 64',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true,
    style: { display: 'block' },
  },
    h('rect', { x: 6, y: 6, width: 24, height: 24, rx: 4, fill: '#247bbf' }),
    h('rect', { x: 34, y: 6, width: 24, height: 24, rx: 4, fill: '#4a9fd8' }),
    h('rect', { x: 6, y: 34, width: 24, height: 24, rx: 4, fill: '#4a9fd8' }),
    h('rect', { x: 34, y: 34, width: 24, height: 24, rx: 4, fill: '#247bbf' }),
  )
}

const SPLIT_STYLE_ID = 'dsws-split-styles'

/**
 * Place the picker panel against the control that opened it.
 * @param rect - the trigger's viewport box.
 * @returns fixed top/left for the panel.
 */
function panelPosition(rect) {
  // Content-sized panel: 6 marks at 18px plus gaps and padding.
  const panelWidth = 168
  const panelHeight = 210
  const below = rect.bottom + 8
  const aboveTop = rect.top - 8 - panelHeight
  const top = below + panelHeight <= window.innerHeight
    ? below
    : Math.max(8, Math.min(aboveTop, window.innerHeight - panelHeight - 8))
  const left = Math.max(8, Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 8))
  return { top, left }
}

/**
 * Install the stylesheet that places the sidebar control.
 *
 * Placement depends on the shell's own `data-sidebar-collapsed` attribute, so
 * it is expressed in CSS: the sidebar remounts its subtree when it collapses,
 * which defeats a width observer or a mutation listener bound to one node.
 * @returns disposer removing the stylesheet.
 */
function installSplitStyles() {
  const existing = document.getElementById(SPLIT_STYLE_ID)
  if (existing !== null) return () => {}
  const style = document.createElement('style')
  style.id = SPLIT_STYLE_ID
  style.textContent = [
    // Expanded: the footer slot owns a row above the account row, so push to
    // that row's trailing edge and drop one row to sit on the account row.
    // The transform only moves paint, so a stack level keeps the later-painted
    // account row from covering the control.
    '.dsws-icon-btn{margin-left:auto;margin-right:4px;transform:translateY(40px);z-index:1}',
    // Rail: the footer row centres its children and the account row is a later
    // sibling, so dropping the offsets puts the control above the avatar.
    '[data-sidebar-collapsed="true"] .dsws-icon-btn{margin-left:0;margin-right:0;transform:none;z-index:auto}',
  ].join('\n')
  document.head.append(style)
  return () => style.remove()
}

/**
 * Sidebar footer control: toggle, grid picker, and its hover hint.
 * @param props - `maxCells` and `confirmCells` from the live limits snapshot.
 */
function SidebarSplitControl(props) {
  const { maxCells, confirmCells } = props
  const geometry = useSyncExternalStore(subscribeGeometry, getGeometry)
  const [hover, setHover] = useState(false)
  const [tip, setTip] = useState(null)
  const [pickOpen, setPickOpen] = useState(false)
  const [anchorPos, setAnchorPos] = useState(null)

  // Everything below reads the box off the event's own node: a ref on a slot
  // entry can stay empty while the element is already laid out.
  const showTip = (e) => {
    const el = e.currentTarget ?? e.target
    if (el === null || el === undefined) return
    const rect = el.getBoundingClientRect()
    setHover(true)
    // Clamp inside the viewport: in the rail the button hugs the left edge, so a
    // centred tip would start off-screen and lose its leading characters.
    const half = SPLIT_TIP_WIDTH / 2
    const center = rect.left + rect.width / 2
    const left = Math.max(half + 8, Math.min(center, window.innerWidth - half - 8))
    setTip({ top: Math.max(4, rect.top - 52), left })
  }
  const hideTip = () => {
    setHover(false)
    setTip(null)
  }

  return h(React.Fragment, null,
    h('button', {
      type: 'button',
      className: 'dsws-icon-btn',
      'aria-label': SIDEBAR_CONTROL_HINT,
      'aria-haspopup': 'dialog',
      'aria-expanded': pickOpen,
      style: splitControlStyles.button(hover),
      onMouseEnter: showTip,
      onMouseLeave: hideTip,
      onFocus: showTip,
      onBlur: hideTip,
      onClick: () => {
        try {
          window.__dswsToggle?.()
        } catch (_e) {}
      },
      onContextMenu: (e) => {
        // Right click opens the picker; the browser menu would hide it.
        e.preventDefault()
        e.stopPropagation()
        setAnchorPos(panelPosition(e.currentTarget.getBoundingClientRect()))
        setPickOpen((open) => !open)
      },
    }, h(SplitIcon, { size: 15 })),
    hover && tip !== null
      ? h('div', { role: 'tooltip', style: splitControlStyles.tip(tip.top, tip.left) },
          `网格 ${geometry.rows} × ${geometry.cols}`,
          h('span', { style: splitControlStyles.tipHint }, SIDEBAR_CONTROL_HINT),
        )
      : null,
    h(GridPickerPanel, {
      rows: geometry.rows,
      cols: geometry.cols,
      maxCells,
      confirmCells,
      onApply: updateGeometry,
      open: pickOpen,
      onOpenChange: setPickOpen,
      anchorPos,
    }),
  )
}

// ---------- toggle button ----------
// Labelled button for the hero options row.
function SplitButton() {
  return h('button', {
    title: t('split.button.toggle'),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
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
  }, h(SplitIcon, { size: 14 }), '分屏')
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

// ---------- tool call row ----------
// Disclosure pattern copied from ui-primitives DisclosureRow.module.css
// (24px row, 16px leading box, 13/24 title, tertiary → secondary on hover)
// and ui-tool ToolRow.module.css for the summary ellipsis.

const toolStyles = {
  row: (hover, expanded) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
    height: 'calc(24px + var(--dsh-content-font-delta, 0px))',
    overflow: 'hidden',
    cursor: 'pointer',
    userSelect: 'none',
    color: hover || expanded
      ? 'var(--dsw-alias-label-secondary, #999)'
      : 'var(--dsw-alias-label-tertiary, #888)',
    transition: 'color 100ms ease',
  }),
  chevron: (expanded) => ({
    flex: 'none',
    width: 12,
    textAlign: 'center',
    fontSize: 9,
    lineHeight: '12px',
    transform: expanded ? 'rotate(90deg)' : 'none',
    transition: 'transform 120ms ease',
  }),
  name: {
    flex: 'none',
    fontFamily: 'var(--ds-font-family-code, monospace)',
    fontSize: 'var(--dsh-content-font-size-secondary, 13px)',
    lineHeight: 'calc(24px + var(--dsh-content-font-delta, 0px))',
  },
  sep: {
    flex: 'none',
    width: 2,
    height: 2,
    borderRadius: 1,
    margin: '0 2px',
    background: 'var(--dsw-alias-label-caption, #777)',
  },
  summary: {
    flex: '1 1 auto',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 'var(--dsh-content-font-size-secondary, 13px)',
    lineHeight: 'calc(24px + var(--dsh-content-font-delta, 0px))',
  },
  // Copied from ui-tool ExitCodeBadge.module.css: a failed call marks itself
  // with a 4px dot, not a filled pill, so the row keeps its quiet rhythm.
  errorFlag: {
    flex: 'none',
    width: 4,
    height: 4,
    marginLeft: 8,
    borderRadius: '50%',
    background: 'var(--dsw-alias-state-error-primary, #e5484d)',
  },
  body: {
    margin: '2px 0 8px 18px',
    paddingLeft: 12,
    borderLeft: '2px solid var(--dsw-alias-border-l2, #4a4a4a)',
  },
  label: {
    fontSize: 11,
    lineHeight: '16px',
    color: 'var(--dsw-alias-label-caption, #888)',
    marginTop: 6,
  },
  pre: {
    minWidth: 0,
    maxWidth: '100%',
    margin: '4px 0',
    padding: '8px 10px',
    fontFamily: 'var(--ds-font-family-code, monospace)',
    fontSize: 'var(--dsh-content-font-size-secondary, 12px)',
    lineHeight: 1.5,
    background: 'var(--dsw-alias-markdown-code-block, rgba(128,128,128,.10))',
    border: '0.5px solid var(--dsw-alias-border-l1, #4a4a4a)',
    borderRadius: 'var(--dsw-radius-sm, 6px)',
    maxHeight: 240,
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
}

/** One-line hint for a tool call, derived from its JSON arguments. */
function toolSummary(name, argsRaw) {
  let parsed
  try {
    parsed = JSON.parse(argsRaw)
  } catch {
    return String(argsRaw ?? '').replace(/\s+/g, ' ').slice(0, 120)
  }
  if (parsed === null || typeof parsed !== 'object') return String(parsed).slice(0, 120)
  const pick = parsed.description
    ?? parsed.command
    ?? parsed.file_path
    ?? parsed.path
    ?? parsed.pattern
    ?? parsed.query
    ?? parsed.url
    ?? parsed.prompt
  if (typeof pick === 'string') return pick.replace(/\s+/g, ' ').slice(0, 200)
  const keys = Object.keys(parsed)
  if (keys.length === 0) return ''
  return keys.slice(0, 3).map((k) => `${k}=${JSON.stringify(parsed[k]).slice(0, 40)}`).join(' ')
}

/** Result text of a tool/result event, flattened from its content blocks. */
function toolResultText(ev) {
  const blocks = ev?.message?.content ?? ev?.data?.message?.content ?? []
  const parts = []
  for (const b of blocks) {
    if (b?.type === 'text') parts.push(b.text)
    else if (b?.type === 'image') parts.push('[image]')
    else if (b?.type === 'file') parts.push('[file]')
    else if (b?.type) parts.push(`[${b.type}]`)
  }
  return parts.join('\n')
}

/** Expandable tool call row: name, summary, and arguments/result on demand. */
function ToolRow(props) {
  const { name, argsRaw, resultText, isError, errorReason } = props
  const [expanded, setExpanded] = useState(false)
  const [hover, setHover] = useState(false)
  const summary = toolSummary(name, argsRaw)

  let prettyArgs = argsRaw
  try {
    prettyArgs = JSON.stringify(JSON.parse(argsRaw), null, 2)
  } catch {}

  return h('div', { style: { display: 'flex', flexDirection: 'column', minWidth: 0, maxWidth: '100%' } },
    h('div', {
      style: toolStyles.row(hover, expanded),
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      onClick: () => setExpanded((v) => !v),
      role: 'button',
      'aria-expanded': expanded,
      title: expanded ? '收起' : '展开',
    },
      h('span', { style: toolStyles.chevron(expanded) }, '▶'),
      h('span', { style: toolStyles.name }, name),
      summary ? h('span', { style: toolStyles.sep }) : null,
      summary ? h('span', { style: toolStyles.summary }, summary) : null,
      isError ? h('span', { style: toolStyles.errorFlag, title: '执行失败' }) : null,
    ),
    expanded
      ? h('div', { style: toolStyles.body },
          errorReason ? h('div', { style: { ...toolStyles.label, color: 'var(--dsw-alias-state-error-primary, #e5484d)' } }, errorReason) : null,
          prettyArgs ? h(React.Fragment, null,
            h('div', { style: toolStyles.label }, '参数'),
            h('pre', { style: toolStyles.pre }, prettyArgs),
          ) : null,
          resultText ? h(React.Fragment, null,
            h('div', { style: toolStyles.label }, isError ? '错误输出' : '输出'),
            h('pre', { style: toolStyles.pre }, resultText),
          ) : h('div', { style: toolStyles.label }, '无输出'),
        )
      : null,
  )
}

// Copied from ui-chat MessageItem.module.css `.bubble` / `.userRow`.
// User messages: right-aligned filled bubble. Assistant: plain flow.
function eventStyle(kind) {
  const base = {
    maxWidth: '82%',
    minWidth: 0,
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
      setError(`打开会话超时（${OPEN_TIMEOUT_MS / 1000} 秒）`)
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

  // Follow the tail only while the reader is already at the bottom. Scrolling
  // up parks the view where it is; coming back to the bottom resumes following.
  const followRef = useRef(true)
  useEffect(() => {
    const el = bodyRef.current
    if (el && followRef.current) el.scrollTop = el.scrollHeight
  }, [events.length])

  // On scroll: remember whether we are at the tail, and page older history in
  // when the reader reaches the top.
  const onScroll = useCallback(() => {
    const el = bodyRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24
    followRef.current = atBottom
    if (el.scrollTop < 48) {
      const sess = binding?.session
      const snap = sess?.getSnapshot()
      if (sess && snap?.hasMore && !snap.loadingOlder) {
        const before = el.scrollHeight
        sess.loadOlder().then(() => {
          // Keep the reader's place: the prepended page adds height above.
          const grown = bodyRef.current
          if (grown) grown.scrollTop += grown.scrollHeight - before
        }).catch(() => {})
      }
    }
  }, [binding])

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
      h('div', { style: { marginBottom: 8 } }, `加载失败：${error}`),
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
    return h('div', { style: { padding: 12, color: 'var(--dsw-alias-label-secondary, #888)', flex: 1 } }, '等待会话列表…')
  }
  if (!binding) {
    return h('div', { style: { padding: 12, color: 'var(--dsw-alias-label-secondary, #888)', flex: 1 } }, '加载中…')
  }

  // The binding's window already pages history, so render it whole: capping the
  // slice here only hid messages the reader had already loaded.
  const visible = events

  // Pair each tool call with the result that answers it, so one disclosure row
  // can show arguments and output together.
  const toolResults = new Map()
  const calledIds = new Set()
  for (const entry of visible) {
    const ev = entry.event
    if (ev?.type === 'tool/call') {
      const id = ev.data?.callId
      if (id !== undefined) calledIds.add(id)
    } else if (ev?.type === 'tool/result') {
      const id = ev.data?.message?.toolCallId ?? ev.data?.toolCallId
      if (id !== undefined) toolResults.set(id, ev.data)
    }
  }
  const railItems = turnRailItems(visible)

  return h(React.Fragment, null,
    // The scrollport and the turn rail share this box: the rail must not scroll
    // with the transcript, so it sits beside the scroller, not inside it.
    h('div', { style: { position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } },
      h('div', {
        ref: bodyRef,
        onScroll,
        // `overflowX: hidden` is the backstop: every wide block scrolls inside
        // its own wrapper, so the transcript itself must never scroll sideways.
        style: {
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '10px 12px',
          minHeight: 0,
          minWidth: 0,
        },
      },
        visible.map((entry, idx) => {
          const ev = entry.event
          const type = ev?.type ?? 'unknown'

          if (type === 'tool/call') {
            const id = ev.data?.callId
            const result = id === undefined ? undefined : toolResults.get(id)
            return h(ToolRow, {
              key: idx,
              name: ev.data?.name ?? 'tool',
            argsRaw: ev.data?.arguments ?? '',
            resultText: result ? toolResultText(result) : '',
            isError: Boolean(result?.message?.isError ?? result?.isError),
            errorReason: result?.error?.reason ?? result?.error?.name ?? '',
          })
        }
        if (type === 'tool/result') {
          const id = ev.data?.message?.toolCallId ?? ev.data?.toolCallId
          // Already rendered by its call row when that call is in the window.
          if (id !== undefined && calledIds.has(id)) return null
          return h(ToolRow, {
            key: idx,
            name: '工具结果',
            argsRaw: '',
            resultText: toolResultText(ev.data),
            isError: Boolean(ev.data?.message?.isError ?? ev.data?.isError),
            errorReason: ev.data?.error?.reason ?? ev.data?.error?.name ?? '',
          })
        }

        let text = ''
        let kind = 'other'
        let anchorTurn
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
        } else if (type === 'turn/start') {
          text = `— 第 ${ev?.data?.turn} 轮 —`
          kind = 'divider'
          // The turn rail scrolls to this anchor, so it must survive an empty label.
          anchorTurn = ev?.data?.turn
        } else {
          return null
        }
        if (!text) return null
        // Assistant narration is Markdown; user prompts and status rows stay literal.
        if (kind === 'assistant') {
          return h('div', { key: idx, style: eventStyle(kind) }, h(Markdown, { text, k: `m${idx}` }))
        }
        return h('div', {
          key: idx,
          style: eventStyle(kind),
          'data-turn': anchorTurn,
        }, text)
      }),
      h(TurnRail, { items: railItems, bodyRef, session: binding.session }),
      ),
    ),
    h('div', { style: composerWrapStyle },
      h('div', { style: composerCardStyle },
        h('textarea', {
          ref: textareaRef,
          value: inputText,
          onChange: (e) => setInputText(e.target.value),
          onKeyDown,
          placeholder: t('composer.placeholder'),
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

// ---------- grid picker ----------
// The familiar insert-table interaction: hover squares, read the size in the
// caption, click to apply. Rows and columns are independent, so six cells can
// be 2×3 instead of forcing the old square-only presets.

const pickerStyles = {
  wrap: { position: 'relative', display: 'inline-flex' },
  // Controlled by an outside button: this wrapper only carries the fixed panel.
  wrapControlled: { display: 'contents' },
  trigger: (open) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '2px 8px',
    fontSize: 12,
    lineHeight: '18px',
    cursor: 'pointer',
    border: '0.5px solid var(--dsw-alias-border-l2, #555)',
    borderRadius: 'var(--dsw-radius-sm, 6px)',
    background: open ? 'var(--dsw-alias-interactive-bg-hover, #2f3b4a)' : 'transparent',
    color: 'var(--dsw-alias-label-primary, inherit)',
  }),
  caret: { fontSize: 8, opacity: 0.7 },
  panel: {
    position: 'fixed',
    zIndex: 60,
    // Sized by its content: the ladder is 6 marks wide, so a fixed 240px panel
    // left a dead column on the right.
    width: 'max-content',
    maxWidth: 'calc(100vw - 16px)',
    maxHeight: 'calc(100vh - 16px)',
    overflow: 'auto',
    boxSizing: 'border-box',
    padding: '12px 14px 10px',
    border: '0.5px solid var(--dsw-alias-border-l2, #555)',
    borderRadius: 'var(--dsw-radius-lg, 10px)',
    background: 'var(--dsw-alias-bg-layer-1, #1e1e1e)',
    boxShadow: 'var(--dsw-elevation-panel, 0 4px 16px rgba(0,0,0,.35))',
    color: 'var(--dsw-alias-label-primary, inherit)',
  },
  caption: { fontSize: 13, fontWeight: 600, lineHeight: '20px' },
  captionMeta: {
    fontSize: 12,
    fontWeight: 400,
    color: 'var(--dsw-alias-label-secondary, #888)',
  },
  hint: (tone) => ({
    marginTop: 8,
    minHeight: 16,
    fontSize: 11,
    lineHeight: '16px',
    color: tone === 'warn'
      ? 'var(--dsw-alias-state-warning, #e6a23c)'
      : 'var(--dsw-alias-label-caption, #999)',
  }),
  grid: {
    display: 'grid',
    gridTemplateColumns: `repeat(${PICKER_MAX_COLS}, 18px)`,
    gridAutoRows: '18px',
    gap: 4,
    marginTop: 10,
    width: 'max-content',
    outlineOffset: 2,
  },
  cell: (state) => {
    const base = {
      width: 18,
      height: 18,
      padding: 0,
      boxSizing: 'border-box',
      borderRadius: 3,
      border: '0.5px solid var(--dsw-alias-border-l2, #555)',
      background: 'transparent',
      cursor: 'pointer',
      transition: 'background-color 90ms ease, border-color 90ms ease',
    }
    if (state === 'blocked') {
      return {
        ...base,
        cursor: 'not-allowed',
        borderColor: 'var(--dsw-alias-state-warning, #e6a23c)',
        background: 'rgba(230, 162, 60, 0.10)',
      }
    }
    if (state === 'confirm') {
      return {
        ...base,
        borderColor: 'var(--dsw-alias-state-warning, #e6a23c)',
        background: 'rgba(230, 162, 60, 0.45)',
      }
    }
    if (state === 'active') {
      return {
        ...base,
        borderColor: 'var(--dsw-alias-state-business-primary, #4a9eff)',
        background: 'var(--dsw-alias-state-business-primary, #4a9eff)',
      }
    }
    return base
  },
}

const pickerDialogStyles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    background: 'rgba(0, 0, 0, 0.45)',
  },
  card: {
    width: 380,
    maxWidth: '100%',
    boxSizing: 'border-box',
    padding: '18px 20px 16px',
    border: '0.5px solid var(--dsw-alias-border-l2, #555)',
    borderRadius: 'var(--dsw-radius-lg, 10px)',
    background: 'var(--dsw-alias-bg-layer-1, #1e1e1e)',
    boxShadow: 'var(--dsw-elevation-panel, 0 4px 16px rgba(0,0,0,.35))',
    color: 'var(--dsw-alias-label-primary, inherit)',
  },
  title: { fontSize: 15, fontWeight: 600, lineHeight: '22px' },
  body: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: '20px',
    color: 'var(--dsw-alias-label-secondary, #999)',
  },
  note: {
    marginTop: 10,
    padding: '8px 10px',
    borderRadius: 'var(--dsw-radius-sm, 6px)',
    background: 'rgba(230, 162, 60, 0.12)',
    color: 'var(--dsw-alias-state-warning, #e6a23c)',
    fontSize: 12,
    lineHeight: '18px',
  },
  code: {
    margin: '8px 0 0',
    padding: '6px 8px',
    borderRadius: 'var(--dsw-radius-sm, 6px)',
    background: 'var(--dsw-alias-markdown-code-block, rgba(128,128,128,.10))',
    color: 'var(--dsw-alias-label-primary, inherit)',
    fontFamily: 'var(--ds-font-family-code, monospace)',
    fontSize: 12,
    lineHeight: '18px',
    whiteSpace: 'pre-wrap',
  },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  button: (primary) => ({
    padding: '4px 12px',
    fontSize: 13,
    lineHeight: '20px',
    cursor: 'pointer',
    border: '0.5px solid var(--dsw-alias-border-l2, #555)',
    borderRadius: 'var(--dsw-radius-sm, 6px)',
    background: primary ? 'var(--dsw-alias-state-business-primary, #4a9eff)' : 'transparent',
    color: primary ? '#fff' : 'var(--dsw-alias-label-primary, inherit)',
  }),
}

/** Keep Tab and Shift+Tab inside a two-button dialog. */
function keepDialogFocus(event, card) {
  if (event.key !== 'Tab' || card === null) return
  const buttons = [...card.querySelectorAll('button')]
  if (buttons.length === 0) return
  const first = buttons[0]
  const last = buttons[buttons.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

/**
 * Modal used by the picker for the two limit gates: 7–10 cells need an explicit
 * "may lag" confirmation, and more than the current cap points at Settings
 * instead of applying.
 */
function GridDialog(props) {
  const cancelRef = useRef(null)
  const cardRef = useRef(null)
  // Live re-renders must not steal focus back from the confirm button.
  const onCancelRef = useRef(props.onCancel)
  onCancelRef.current = props.onCancel
  useEffect(() => {
    cancelRef.current?.focus()
    const onKey = (event) => {
      if (event.key === 'Escape') {
        onCancelRef.current()
        return
      }
      keepDialogFocus(event, cardRef.current)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return h('div', {
    style: pickerDialogStyles.backdrop,
    onMouseDown: (event) => {
      if (event.target === event.currentTarget) props.onCancel()
    },
  },
    h('div', {
      ref: cardRef,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': props.title,
      style: pickerDialogStyles.card,
    },
      h('div', { style: pickerDialogStyles.title }, props.title),
      h('div', { style: pickerDialogStyles.body }, props.body),
      props.note === undefined ? null : h('div', { style: pickerDialogStyles.note }, props.note),
      props.code === undefined ? null : h('pre', { style: pickerDialogStyles.code }, props.code),
      h('div', { style: pickerDialogStyles.actions },
        h('button', {
          ref: cancelRef,
          type: 'button',
          style: pickerDialogStyles.button(false),
          onClick: props.onCancel,
        }, '取消'),
        h('button', {
          type: 'button',
          style: pickerDialogStyles.button(true),
          onClick: props.onConfirm,
        }, props.confirmLabel),
      ),
    ),
  )
}

/** Choose the copy for the two dialogs; kept out of GridPicker's branch budget. */
function GridPickerDialog(props) {
  const { dialog, maxCells, confirmCells, onCancel, onConfirm } = props
  const count = dialog.rows * dialog.cols
  if (dialog.kind === 'unlock') {
    return h(GridDialog, {
      title: `需要解锁 ${count} 格`,
      body: `单个界面默认最多 ${maxCells} 格。要使用 ${count} 格，需要先在设置里解锁上限。`,
      note: `打开 设置 → 通用 → 分屏网格，把「最多格子数」调到 ${count} 或更大；改完立即生效。`,
      confirmLabel: '知道了',
      onCancel,
      onConfirm,
    })
  }
  return h(GridDialog, {
    title: `打开 ${count} 个格子？`,
    body: `单屏超过 ${confirmCells} 个会话时，每个格子都会持有一个会话，同时输出可能造成卡顿。`,
    note: `确认后仍将使用 ${count} 格，可以随时改回更小的网格。`,
    confirmLabel: '仍然继续',
    onCancel,
    onConfirm,
  })
}

/** 10 × 10 hoverable square grid; arrows move the preview, Enter applies it. */
function GridChoiceGrid(props) {
  const { preview, maxCells, confirmCells, onPreview, onChoose, focusTick } = props
  const gridRef = useRef(null)
  const previewCount = preview.rows * preview.cols
  const tone = previewCount > maxCells ? 'blocked' : previewCount > confirmCells ? 'confirm' : 'active'
  useEffect(() => {
    gridRef.current?.focus()
  }, [focusTick])

  const onKeyDown = (event) => {
    const delta = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }[event.key]
    if (delta !== undefined) {
      event.preventDefault()
      onPreview({
        rows: Math.min(PICKER_MAX_ROWS, Math.max(1, preview.rows + delta[0])),
        cols: Math.min(PICKER_MAX_COLS, Math.max(1, preview.cols + delta[1])),
      })
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onChoose(preview.rows, preview.cols)
    }
  }

  // Row index is the row count and column index is the column count, so the
  // matrix is rows-tall by cols-wide.
  const cells = []
  for (let r = 1; r <= PICKER_MAX_ROWS; r += 1) {
    for (let c = 1; c <= PICKER_MAX_COLS; c += 1) {
      const count = r * c
      const inside = r <= preview.rows && c <= preview.cols
      const state = inside ? tone : 'idle'
      cells.push(h('button', {
        key: `${r}.${c}`,
        type: 'button',
        tabIndex: -1,
        'aria-label': `${r} 行 × ${c} 列，共 ${count} 格`,
        style: pickerStyles.cell(state),
        onMouseEnter: () => onPreview({ rows: r, cols: c }),
        onClick: () => onChoose(r, c),
      }))
    }
  }

  return h('div', {
    ref: gridRef,
    role: 'group',
    'aria-label': '选择行数与列数',
    tabIndex: 0,
    style: pickerStyles.grid,
    onKeyDown,
  }, cells)
}

/** Hint line: what clicking the highlighted block will do. */
function pickerHint(blocked, confirm, maxCells, confirmCells) {
  if (blocked) return { tone: 'warn', text: `超过上限 ${maxCells} 格，去设置解锁` }
  if (confirm) return { tone: 'warn', text: `超过 ${confirmCells} 格，确认后继续` }
  return { tone: 'muted', text: `建议不超过 ${confirmCells} 格` }
}

/**
 * Grid chooser popover. The sidebar control owns the affordance and the open
 * state; this renders the panel and enforces the two-stage limit: silent up to
 * `confirmCells`, confirm up to `maxCells`, Settings unlock beyond.
 */
function GridPickerPanel(props) {
  const { rows, cols, maxCells, confirmCells, onApply, open, onOpenChange, anchorRef } = props
  const [preview, setPreview] = useState(null)
  const [dialog, setDialog] = useState(null)
  const [anchor, setAnchor] = useState(null)
  const [focusTick, setFocusTick] = useState(0)
  const panelRef = useRef(null)
  const shown = preview ?? { rows, cols }
  const count = shown.rows * shown.cols
  const blocked = count > maxCells
  const confirm = !blocked && count > confirmCells
  const hint = pickerHint(blocked, confirm, maxCells, confirmCells)

  // Fixed positioning escapes the sidebar's overflow:hidden. The owner computes
  // the spot when it opens; the class lookup is the last resort so the panel is
  // never left pinned to the top-left corner.
  const place = useCallback(() => {
    if (props.anchorPos !== undefined && props.anchorPos !== null) {
      setAnchor(props.anchorPos)
      return
    }
    const el = anchorRef?.current ?? document.querySelector('.dsws-icon-btn')
    if (el === null || el === undefined) return
    setAnchor(panelPosition(el.getBoundingClientRect()))
  }, [anchorRef, props.anchorPos])

  const close = useCallback((refocus) => {
    onOpenChange(false)
    setPreview(null)
    if (refocus) anchorRef?.current?.focus()
  }, [anchorRef, onOpenChange])

  const closeDialog = useCallback(() => {
    setDialog(null)
    // Put the keyboard back on the grid so arrows/Enter keep working.
    setFocusTick((value) => value + 1)
  }, [])

  // The outside trigger only flips `open`; anchoring happens on that edge.
  useEffect(() => {
    if (open) place()
  }, [open, place])

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      // Only the left button dismisses; the right button is the trigger's own
      // toggle. The trigger is matched by class so no ref is needed.
      if (event.button !== 0) return
      const target = event.target
      if (target instanceof Element && target.closest('.dsws-icon-btn') !== null) return
      if (panelRef.current?.contains(target)) return
      close(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape' && dialog === null) close(true)
    }
    const onReflow = () => place()
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onReflow)
    window.addEventListener('scroll', onReflow, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onReflow)
      window.removeEventListener('scroll', onReflow, true)
    }
  }, [open, dialog, close, place, anchorRef])

  const commit = useCallback((nextRows, nextCols) => {
    onApply(nextRows, nextCols)
    setDialog(null)
    close(true)
  }, [onApply, close])

  const choose = useCallback((nextRows, nextCols) => {
    const nextCount = nextRows * nextCols
    if (nextCount > maxCells) {
      setDialog({ kind: 'unlock', rows: nextRows, cols: nextCols })
      return
    }
    // Shrinking a layout that already exceeded the soft limit needs no warning.
    if (nextCount > confirmCells && nextCount > rows * cols) {
      setDialog({ kind: 'confirm', rows: nextRows, cols: nextCols })
      return
    }
    commit(nextRows, nextCols)
  }, [maxCells, confirmCells, rows, cols, commit])

  const dialogNode = dialog === null ? null : h(GridPickerDialog, {
    dialog,
    maxCells,
    confirmCells,
    onCancel: closeDialog,
    onConfirm: () => {
      if (dialog.kind === 'confirm') commit(dialog.rows, dialog.cols)
      else closeDialog()
    },
  })

  return h(React.Fragment, null,
    open ? h('div', {
      ref: panelRef,
      role: 'dialog',
      'aria-label': '选择网格大小',
      style: {
        ...pickerStyles.panel,
        top: anchor === null ? 0 : anchor.top,
        left: anchor === null ? 0 : anchor.left,
      },
    },
      h('div', { style: pickerStyles.caption },
        `${shown.rows} 行 × ${shown.cols} 列`,
        h('span', { style: pickerStyles.captionMeta }, ` · ${count} 格`),
      ),
      h(GridChoiceGrid, {
        preview: shown,
        maxCells,
        confirmCells,
        focusTick,
        onPreview: setPreview,
        onChoose: choose,
      }),
      h('div', { style: pickerStyles.hint(hint.tone) }, hint.text),
    ) : null,
    dialogNode,
  )
}

// ---------- cell title ----------
// The title doubles as the picker's trigger; the pencil beside it renames the
// Session itself through the session face (`rename`), which republishes the
// title projection the list already renders.

const titleStyles = {
  dot: (running) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
    background: running ? 'var(--dsw-alias-state-success, #4caf50)' : 'var(--dsw-alias-label-caption, #999)',
    transition: 'background 0.3s',
  }),
  text: {
    flex: '1 1 auto',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    border: 'none',
    background: 'transparent',
    padding: 0,
    font: 'inherit',
    color: 'inherit',
    textAlign: 'start',
    cursor: 'pointer',
  },
  input: {
    flex: '1 1 auto',
    minWidth: 0,
    border: 'none',
    borderBottom: '1px solid var(--dsw-alias-state-business-primary, #4a9eff)',
    background: 'transparent',
    padding: '0 0 1px',
    font: 'inherit',
    color: 'inherit',
    outline: 'none',
  },
  action: (hover) => ({
    flex: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
    marginLeft: 2,
    padding: 0,
    border: 'none',
    borderRadius: 'var(--dsw-radius-sm, 6px)',
    background: hover ? 'var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.16))' : 'transparent',
    color: 'var(--dsw-alias-label-tertiary, #999)',
    cursor: 'pointer',
    fontSize: 11,
    lineHeight: 1,
  }),
}

/**
 * Cell header title: status dot, the title (or its edit field), and rename.
 * @param props - sessions service, session id, title text, and running state.
 */
function CellTitle(props) {
  const { sessions, sessionId, title, running } = props
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [hover, setHover] = useState(false)
  const [saving, setSaving] = useState(false)
  const aliveRef = useRef(true)
  useEffect(() => () => { aliveRef.current = false }, [])

  const openPicker = (e) => {
    const select = e.currentTarget.parentElement?.querySelector('select')
    if (select === null || select === undefined) return
    try {
      select.showPicker()
    } catch (_e) {
      select.focus()
    }
  }

  const commit = () => {
    const next = draft.trim()
    setEditing(false)
    if (next === '' || next === title) return
    const face = sessions.binding(sessionId)?.session
    if (face === null || face === undefined) return
    // The host normalizes the title and republishes the projection, so the row
    // re-renders from the accepted value rather than from this draft. A host
    // that cannot resolve the Session's agent never settles, so the wait is
    // bounded and the title simply stays as it was.
    setSaving(true)
    const settle = () => { if (aliveRef.current) setSaving(false) }
    const timer = setTimeout(settle, RENAME_TIMEOUT_MS)
    Promise.resolve(face.rename(next)).then(settle, settle).finally(() => clearTimeout(timer))
  }

  return h(React.Fragment, null,
    h('span', { style: titleStyles.dot(running) }),
    editing
      ? h('input', {
          autoFocus: true,
          value: draft,
          'aria-label': '重命名会话',
          onChange: (e) => setDraft(e.target.value),
          onKeyDown: (e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              setEditing(false)
            }
          },
          onBlur: commit,
          style: titleStyles.input,
        })
      : h('button', {
          type: 'button',
          title: saving ? '正在保存' : '切换会话',
          style: { ...titleStyles.text, opacity: saving ? 0.5 : 1 },
          onClick: openPicker,
        }, title),
    editing
      ? null
      : h('button', {
          type: 'button',
          title: '重命名会话',
          'aria-label': '重命名会话',
          style: titleStyles.action(hover),
          onMouseEnter: () => setHover(true),
          onMouseLeave: () => setHover(false),
          onClick: () => {
            setDraft(title)
            setEditing(true)
          },
        }, '✎'),
  )
}

// ---------- cell picker ----------
// A native <select> kept for its keyboard handling and system popup, drawn as a
// small chevron: the header already shows the session title, so repeating the
// same text in a visible control only crowded the row.

const cellPickerStyles = {
  wrap: (hover) => ({
    position: 'relative',
    flex: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 22,
    height: 22,
    marginLeft: 4,
    borderRadius: 'var(--dsw-radius-sm, 6px)',
    background: hover ? 'var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.16))' : 'transparent',
    color: 'var(--dsw-alias-label-tertiary, #999)',
  }),
  glyph: {
    fontSize: 9,
    lineHeight: 1,
    pointerEvents: 'none',
  },
  select: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    opacity: 0,
    border: 'none',
    padding: 0,
    margin: 0,
    cursor: 'pointer',
    appearance: 'none',
  },
}

/**
 * Chevron-shaped session picker.
 * @param props - current value, option list, placeholder, and change handler.
 */
function CellPicker(props) {
  const [hover, setHover] = useState(false)
  return h('span', {
    style: cellPickerStyles.wrap(hover),
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
  },
    h('span', { style: cellPickerStyles.glyph, 'aria-hidden': true }, '▾'),
    h('select', {
      style: cellPickerStyles.select,
      value: props.value,
      'aria-label': '切换会话',
      onChange: (e) => props.onChange(e.target.value || null),
    },
      h('option', { value: '' }, props.placeholder),
      props.options.map((s) =>
        h('option', { key: s.id, value: s.id },
          (s.displayTitle || s.title || s.id.slice(0, 8)) + (s.running ? '（运行中）' : '')),
      ),
    ),
  )
}

// ---------- split grid panel ----------
function SplitMain(props) {
  const sessions = props.__sessions
  const workspaces = props.__workspaces
  const subscribe = useCallback((cb) => sessions.list.subscribe(cb), [sessions])
  const getSnapshot = useCallback(() => sessions.list.getSnapshot(), [sessions])
  const list = useSyncExternalStore(subscribe, getSnapshot)

  const wsSubscribe = useCallback((cb) => workspaces.list.subscribe(cb), [workspaces])
  const wsSnapshot = useCallback(() => workspaces.list.getSnapshot(), [workspaces])
  const wsState = useSyncExternalStore(wsSubscribe, wsSnapshot)

  const saved = useRef(loadLayout()).current
  // Shared with the sidebar control, which owns the picker for this panel.
  const geometry = useSyncExternalStore(subscribeGeometry, getGeometry)
  const { rows, cols } = geometry
  const [activeCell, setActiveCell] = useState(0)
  const [dragOver, setDragOver] = useState(-1)
  const [cells, setCells] = useState(() => {
    const s = saved?.cells ?? []
    // Keep assignments that the current (smaller) grid hides, so shrinking and
    // growing again does not silently throw away pinned sessions.
    const size = Math.max(geometry.rows * geometry.cols, s.length)
    const arr = Array(size).fill(null)
    for (let i = 0; i < s.length; i++) arr[i] = normalizeCell(s[i])
    return arr
  })
  // Reader overrides for the per-cell text scale, one multiplier per cell.
  const [zooms, setZooms] = useState(() => savedZooms(saved))

  const zoomIn = useCallback((index, delta) => {
    setZooms((prev) => {
      const next = [...prev]
      const current = next[index] ?? 1
      next[index] = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, current + delta))
      return next
    })
  }, [])

  const items = list?.ids?.map((id) => list.byId[id]).filter(Boolean) ?? []
  const nonBlank = items.filter((s) => !s.blank)
  const workspaceItems = wsState?.items ?? []

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

  const total = rows * cols

  const setCell = (idx, cell) => {
    setCells((prev) => {
      const next = [...prev]
      next[idx] = cell
      return next
    })
  }

  /** Sessions of one Workspace, in the Workspace's own order, blanks dropped. */
  const sessionsOfWorkspace = useCallback((workspaceId) => {
    const ws = workspaceItems.find((w) => String(w.workspaceId) === workspaceId)
    if (!ws) return []
    const ranked = []
    for (const id of ws.sessionIds ?? []) {
      const row = list?.byId?.[id]
      if (row && !row.blank) ranked.push(row)
    }
    return ranked
  }, [workspaceItems, list])

  /**
   * Resolve one drop into a cell assignment. Both sidebar row kinds publish a
   * bare id on `text/plain` (a Session id, or a Workspace id for a project
   * row), so the id is looked up in each catalog: Session first, then Workspace.
   * @param raw - dataTransfer text.
   * @returns the cell to assign, or null when the payload belongs to neither.
   */
  const cellFromDrop = useCallback((raw) => {
    const payload = String(raw ?? '').trim()
    if (!payload) return null
    if (list?.byId?.[payload]) return { t: 'session', id: payload }
    const ws = workspaceItems.find((w) => String(w.workspaceId) === payload)
    if (!ws) return null
    const workspaceId = String(ws.workspaceId)
    const first = sessionsOfWorkspace(workspaceId)[0]
    return { t: 'workspace', ws: workspaceId, id: first?.id ?? null }
  }, [list, workspaceItems, sessionsOfWorkspace])

  useEffect(() => {
    const size = rows * cols
    setCells((prev) => {
      // Never truncate: hidden assignments come back when the grid grows again.
      if (prev.length >= size) return prev
      return [...prev, ...Array(size - prev.length).fill(null)]
    })
    setActiveCell((prev) => Math.min(prev, size - 1))
  }, [rows, cols])

  useEffect(() => {
    saveLayout({ rows, cols, cells, zooms, inSplit: window.__dswsInSplit ?? false })
  }, [rows, cols, cells, zooms])

  // Drop stale references: a pinned cell whose Session left the catalog empties,
  // and a Workspace cell keeps its scope but lets the dead Session go.
  useEffect(() => {
    if (list?.phase !== 'ready') return
    const known = new Set(list.ids ?? [])
    setCells((prev) => {
      let changed = false
      const next = prev.map((cell) => {
        if (cell === null || cell.id === null || known.has(cell.id)) return cell
        changed = true
        return cell.t === 'workspace' ? { ...cell, id: null } : null
      })
      return changed ? next : prev
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
  // minmax(0, 1fr) on both axes: a bare 1fr resolves its min to auto, so a
  // long transcript would grow its row past the viewport instead of scrolling.
  // The grid IS the panel: no frame chrome, because the split toggle, the grid
  // picker and the way out all live on the sidebar control that opened it.
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
    gap: 0,
    padding: 0,
    borderRight: '0.5px solid var(--dsw-alias-border-l3, #444)',
    borderBottom: '0.5px solid var(--dsw-alias-border-l3, #444)',
    boxSizing: 'border-box',
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
  }

  return h('div', { style: gridStyle },
    Array.from({ length: total }, (_, i) => h(SplitCell, {
      key: i,
      index: i,
      cell: cells[i],
      sessions,
      nonBlank,
      workspaceItems,
      sessionsOfWorkspace,
      active: i === activeCell,
      dragOver: dragOver === i,
      zoom: zooms[i] ?? 1,
      cellStyle,
      headerStyle: cellHeaderStyle,
      onActivate: () => setActiveCell(i),
      onDragOverCell: () => setDragOver(i),
      onDragLeaveCell: () => setDragOver((current) => (current === i ? -1 : current)),
      onDropCell: (raw) => {
        const next = cellFromDrop(raw)
        if (next) setCell(i, next)
      },
      onPick: (id) => {
        const cell = cells[i]
        setCell(i, id === null
          ? null
          : cell?.t === 'workspace' ? { t: 'workspace', ws: cell.ws, id } : { t: 'session', id })
      },
      onZoom: (delta) => zoomIn(i, delta),
    })),
  )
}

/**
 * One grid tile: shell, drag target, zoomed contents.
 * @param props - cell assignment, catalogs, styles, and the cell's handlers.
 */
function SplitCell(props) {
  const {
    index, cell, sessions, nonBlank, workspaceItems, sessionsOfWorkspace,
    active, dragOver, zoom, cellStyle, headerStyle,
    onActivate, onDragOverCell, onDragLeaveCell, onDropCell, onPick, onZoom,
  } = props
  const sid = cell?.id ?? null
  const sess = sid === null ? null : nonBlank.find((s) => s.id === sid) ?? null
  // A Workspace cell offers only that Workspace's Sessions in its picker.
  const options = cell?.t === 'workspace' ? sessionsOfWorkspace(cell.ws) : nonBlank
  const wsTitle = cell?.t === 'workspace'
    ? (workspaceItems.find((w) => String(w.workspaceId) === cell.ws)?.title ?? '项目')
    : null

  return h('div', {
    style: {
      ...cellStyle,
      // Inset ring marks the active tile without touching the shared dividers
      // or shifting the tile's box.
      boxShadow: active
        ? 'inset 0 0 0 1.5px var(--dsw-alias-state-business-primary, #4a9eff)'
        : 'none',
      background: dragOver
        ? 'var(--dsw-alias-interactive-bg-hover, #2f3b4a)'
        : cellStyle.background,
    },
    onMouseDown: onActivate,
    // Accept a Sidebar drag: a Session row or a project row.
    onDragOver: (e) => {
      e.preventDefault()
      try {
        e.dataTransfer.dropEffect = 'move'
      } catch (_e) {}
      onDragOverCell()
    },
    onDragLeave: onDragLeaveCell,
    onDrop: (e) => {
      e.preventDefault()
      e.stopPropagation()
      let raw = ''
      try {
        raw = e.dataTransfer?.getData('text/plain') ?? ''
      } catch (_e) {}
      onDropCell(raw)
    },
  },
    h(CellZoom, { zoom, onZoom },
      h('div', {
        style: {
          ...headerStyle,
          background: active ? 'var(--dsw-alias-interactive-bg-hover, #2f3b4a)' : 'transparent',
        },
      },
        sess
          ? h(CellTitle, {
              sessions,
              sessionId: sess.id,
              title: sess.displayTitle || sess.title || sess.id.slice(0, 8),
              running: sess.running,
            })
          : h('span', { style: { flex: '1 1 auto', color: 'var(--dsw-alias-label-caption, #999)', whiteSpace: 'nowrap' } }, `第 ${index + 1} 格`),
        h(CellPicker, {
          value: sid ?? '',
          placeholder: wsTitle === null ? '选择会话…' : `${wsTitle}（选会话）`,
          options,
          onChange: onPick,
        }),
      ),
      cell?.t === 'workspace' && sess === null
        ? h('div', { style: { flex: 1, padding: 12, color: 'var(--dsw-alias-label-secondary, #888)' } },
            options.length === 0 ? `项目「${wsTitle}」还没有会话` : '从上方选择该项目的会话')
        : h(CellView, { sessions, sessionId: sid }),
    ),
  )
}

// ---------- settings row ----------
const limitsRowStyles = {
  row: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    padding: '10px 0',
    fontSize: 13,
    color: 'var(--dsw-alias-label-primary, inherit)',
  },
  label: { fontWeight: 500, minWidth: 96 },
  field: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: 'var(--dsw-alias-label-secondary, #999)',
  },
  input: {
    width: 64,
    padding: '3px 6px',
    boxSizing: 'border-box',
    fontSize: 13,
    background: 'var(--dsw-specific-input-major, transparent)',
    color: 'var(--dsw-alias-label-primary, inherit)',
    border: '0.5px solid var(--dsw-alias-border-l2, #555)',
    borderRadius: 'var(--dsw-radius-sm, 6px)',
  },
  hint: {
    flexBasis: '100%',
    fontSize: 12,
    lineHeight: '18px',
    color: 'var(--dsw-alias-label-caption, #999)',
  },
}

/** General-settings row: the only place the hard cap above ten is unlocked. */
function LimitsRow() {
  const limits = useSyncExternalStore(subscribeLimits, getLimits)
  const setMax = (event) => {
    const value = Number(event.target.value)
    if (Number.isInteger(value) && value >= 1) updateLimits({ maxCells: value })
  }
  const setConfirm = (event) => {
    const value = Number(event.target.value)
    if (Number.isInteger(value) && value >= 1) updateLimits({ confirmOverCells: value })
  }
  return h('div', { style: limitsRowStyles.row },
    h('span', { style: limitsRowStyles.label }, '分屏网格'),
    h('label', { style: limitsRowStyles.field },
      '最多格子数',
      h('input', {
        type: 'number',
        min: 1,
        max: LIMIT_MAX,
        step: 1,
        value: limits.maxCells,
        onChange: setMax,
        style: limitsRowStyles.input,
      }),
    ),
    h('label', { style: limitsRowStyles.field },
      '超过此数须确认',
      h('input', {
        type: 'number',
        min: 1,
        max: LIMIT_MAX,
        step: 1,
        value: limits.confirmOverCells,
        onChange: setConfirm,
        style: limitsRowStyles.input,
      }),
    ),
    h('span', { style: limitsRowStyles.hint },
      '默认最多 10 格；调到 10 以上即解锁。修改立即生效。'),
  )
}

export const inject = ['slots', 'layout', 'sessions', 'workspaces']

export function apply(ctx) {
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
    const start = savedGeometry(cur)
    const geo = fitGeometry(start.rows, start.cols, getLimits().maxCells)
    saveLayout({ ...cur, rows: geo.rows, cols: geo.cols, inSplit })
  }
  ctx.effect(() => () => {
    try {
      delete window.__dswsToggle
      delete window.__dswsInSplit
    } catch (_e) {}
  }, 'workspace-split: cleanup')

  // Placement of the sidebar control, keyed on the shell's collapsed attribute.
  ctx.effect(() => installSplitStyles(), 'workspace-split: styles')

  // The one control for the whole feature: left click toggles the view, right
  // click opens the grid picker, hover says so.
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'workspace-split-sidebar',
    order: 5,
  }, function SidebarEntry() {
    const limits = useSyncExternalStore(subscribeLimits, getLimits)
    return h(SidebarSplitControl, {
      maxCells: limits.maxCells,
      confirmCells: limits.confirmOverCells,
    })
  }))

  ctx.slots.inject('conversation.hero.options', () => ctx.slots.register({
    name: 'conversation.hero.options',
    id: 'workspace-split-btn-hero',
    order: 5,
  }, SplitButton))

  // The browser half cannot read cordis.patch.yml, so the cap lives in General
  // settings; this row is the unlock entry the picker points at.
  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'workspace-split-limits',
    order: 30,
  }, LimitsRow))

  const sessionsRef = ctx.sessions
  const workspacesRef = ctx.workspaces
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: 'split',
  }, function SplitPanel() {
    return h(SplitMain, {
      __sessions: sessionsRef,
      __workspaces: workspacesRef,
    })
  }))

  // Auto-enter the split panel after the panel row is registered.
  if (inSplit) {
    try {
      ctx.layout.selectPanel('split')
    } catch (_e) {}
  }
}
