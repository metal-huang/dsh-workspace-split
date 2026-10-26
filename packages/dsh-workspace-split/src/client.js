/**
 * Client half of the multi-session split view.
 *
 * This is the ESM source; `client.js` is the bundled artifact produced by
 * `pnpm build` (see build.mjs) and is what `dsh.client` points at.
 */

import React from 'react'
import { createRoot } from 'react-dom/client'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfm } from 'micromark-extension-gfm'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { math } from 'micromark-extension-math'
import { mathFromMarkdown } from 'mdast-util-math'
import katex from 'katex'

const h = React.createElement
const { useState, useEffect, useLayoutEffect, useCallback, useSyncExternalStore, useRef } = React

// ---------- i18n ----------
import { detectLanguage, t } from './i18n.js'

// ---------- cell text scaling ----------
import { ZOOM_STEP, autoZoomForWidth, effectiveZoom, savedZooms, stepZoom } from './zoom.js'

// ---------- composer metadata ----------
import { contextOccupancy, formatTokens, parseSlashLine } from './composer-meta.js'

// ---------- pending interactions ----------
import { interactionKey, pendingOf } from './pending.js'
import { ApprovalCard, QuestionCard } from './pending-ui.js'

// ---------- composer seats ----------
import { ModelControl, PermissionControl } from './composer-controls-ui.js'
import { MentionPopup, useMentionPicker } from './mention-ui.js'

// ---------- transcript folding ----------
import { buildTranscript, formatDuration, groupProcessRows, runningHint } from './transcript.js'

// ---------- composer image intake ----------
import {
  IMAGE_INTAKE_LIMITS,
  IMAGE_MEDIA_TYPES,
  buildPromptParts,
  bytesToBase64,
  dataUrlPayload,
  filePart,
  imagePart,
  intakeImages,
  isImageFile,
} from './composer-images.js'

// ---------- sidebar control placement ----------
import { SIDEBAR_STYLES, accountRowOf, alignToAccountRow } from './layout.js'

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
      // Horizontal wheels and trackpad noise report deltaY 0; those must not
      // count as a zoom step.
      if (event.deltaY === 0) return
      event.preventDefault()
      onZoom(event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onZoom])

  const scale = effectiveZoom(auto, zoom)
  return h(
    'div',
    {
      ref: outerRef,
      style: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0 },
    },
    h(
      'div',
      {
        // `zoom` scales text AND layout, so token-derived sizes (the markdown type
        // ladder, the composer) follow along instead of only my own font sizes.
        style: {
          zoom: scale,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          minWidth: 0,
        },
      },
      children,
    ),
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
    confirmOverCells: Math.min(
      clampLimit(value?.confirmOverCells, DEFAULT_CONFIRM_CELLS),
      maxCells,
    ),
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
    tree = {
      type: 'root',
      children: [{ type: 'paragraph', children: [{ type: 'text', value: text }] }],
    }
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
  hr: {
    border: 'none',
    height: '0.5px',
    margin: '32px 0',
    background: 'var(--dsw-alias-border-l2, #4a4a4a)',
  },
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
  mathInline: {
    display: 'inline-block',
    maxWidth: '100%',
    overflowX: 'auto',
    verticalAlign: 'middle',
  },
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
 * stylesheet work is needed here. MathML is kept (the default `htmlAndMathml`
 * output) so screen readers still get the formula; `throwOnError: false` makes
 * bad TeX render KaTeX's own error marker rather than throw, and the catch only
 * covers an internal failure.
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
      return h(
        'p',
        { key, style: mdStyles.p },
        node.children.map((c, i) => renderMdNode(c, `${key}-${i}`)),
      )

    case 'text':
      return node.value

    case 'strong':
      return h(
        'strong',
        { key, style: mdStyles.strong },
        node.children.map((c, i) => renderMdNode(c, `${key}-${i}`)),
      )

    case 'emphasis':
      return h(
        'em',
        { key },
        node.children.map((c, i) => renderMdNode(c, `${key}-${i}`)),
      )

    case 'delete':
      return h(
        'del',
        { key },
        node.children.map((c, i) => renderMdNode(c, `${key}-${i}`)),
      )

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
      return h(
        `h${Math.min(node.depth ?? 1, 6)}`,
        { key, style: mdStyles.h(node.depth ?? 1) },
        node.children.map((c, i) => renderMdNode(c, `${key}-${i}`)),
      )

    case 'list': {
      const items = node.children.map((child, i) => {
        const li = renderMdNode({ ...child, type: 'listItem' }, `${key}-li${i}`)
        return li
      })
      return h(
        node.ordered ? 'ol' : 'ul',
        {
          key,
          style: mdStyles.ul,
          start: node.ordered && typeof node.start === 'number' ? node.start : undefined,
        },
        items,
      )
    }

    case 'listItem': {
      const kids = node.children.map((c, i) => renderMdNode(c, `${key}-${i}`))
      // Task-list checkbox parity with the native renderer.
      const checked = node.checked
      return h(
        'li',
        { key, style: mdStyles.li },
        checked === undefined || checked === null
          ? kids
          : [
              h('input', {
                key: `${key}-cb`,
                type: 'checkbox',
                checked: Boolean(checked),
                readOnly: true,
                style: {
                  margin: '0 8px 0 0',
                  accentColor: 'var(--dsw-alias-label-secondary, #888)',
                },
              }),
              ...kids,
            ],
      )
    }

    case 'blockquote':
      return h(
        'blockquote',
        { key, style: mdStyles.blockquote },
        node.children.map((c, i) => renderMdNode(c, `${key}-${i}`)),
      )

    case 'thematicBreak':
      return h('hr', { key, style: mdStyles.hr })

    case 'code':
      return h(
        'div',
        { key, style: mdStyles.codeBlock },
        node.lang
          ? h(
              'div',
              { style: mdStyles.codeBanner },
              h(
                'span',
                { style: { fontFamily: 'var(--ds-font-family-code, monospace)', fontSize: 11 } },
                node.lang,
              ),
            )
          : null,
        h(
          'pre',
          { style: mdStyles.codePre },
          h('code', { style: { fontFamily: 'inherit' } }, node.value ?? ''),
        ),
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
      const renderRow = (row, r, isHead) =>
        h(
          'tr',
          { key: `${key}-r${r}` },
          row.children.map((cell, c) => {
            const Tag = isHead ? 'th' : 'td'
            const base = isHead ? mdStyles.th : mdStyles.td
            // The native 100px floor suits the wide conversation column; inside a
            // narrow cell it would push a filled table past the wrapper again.
            const style = wide ? base : { ...base, minWidth: 0, maxWidth: 'none' }
            return h(
              Tag,
              {
                key: `${key}-r${r}c${c}`,
                style,
              },
              cell.children.map((x, i) => renderMdNode(x, `${key}-r${r}c${c}-${i}`)),
            )
          }),
        )
      return h(
        'div',
        { key, style: mdStyles.tableScroll },
        h(
          'table',
          { style: tableStyle },
          rows.length > 0 ? h('thead', null, renderRow(rows[0], 0, true)) : null,
          rows.length > 1
            ? h(
                'tbody',
                null,
                rows.slice(1).map((row, i) => renderRow(row, i + 1, false)),
              )
            : null,
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
      return h(
        'sup',
        { key, style: { fontSize: '0.75em', opacity: 0.8 } },
        `[${node.identifier ?? ''}]`,
      )

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
    maskImage:
      fadeTop && fadeBottom
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
    background:
      state === 'active'
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
      const text = blocks
        .filter((b) => b?.type === 'text')
        .map((b) => b.text)
        .join(' ')
      if (text !== '' && ensure(turn).prompt === '') ensure(turn).prompt = text.slice(0, 120)
    } else if (ev.type === 'assistant/message') {
      const blocks = ev.data?.message?.content ?? []
      const text = blocks
        .filter((b) => b?.type === 'text')
        .map((b) => b.text)
        .join(' ')
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

  const jump = useCallback(
    async (item) => {
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
    },
    [bodyRef, session],
  )

  if (items.length < 2 || tooNarrow) return null
  const hovered = hoverTurn === null ? undefined : items.find((i) => i.turn === hoverTurn)

  return h(
    'div',
    { style: turnRailStyles.frame },
    h(
      'div',
      {
        ref: scrollerRef,
        style: turnRailStyles.scroller(scrolled.top, scrolled.bottom),
        onScroll: (e) => setRailScroll(e.currentTarget.scrollTop),
      },
      h(
        'div',
        { style: { position: 'relative' } },
        items.map((item) => {
          const state =
            item.turn === activeTurn
              ? 'active'
              : item.turn === hoverTurn
                ? 'hover'
                : item.seq === undefined
                  ? 'unloaded'
                  : 'rest'
          return h(
            'button',
            {
              key: item.turn,
              type: 'button',
              'data-rail-turn': item.turn,
              'aria-label': t('turnRail.aria.turn', { n: item.turn }),
              'aria-current': item.turn === activeTurn ? 'true' : undefined,
              style: { ...turnRailStyles.mark, opacity: item.turn === busyTurn ? 0.4 : 1 },
              onMouseEnter: () => setHoverTurn(item.turn),
              onMouseLeave: () => setHoverTurn((prev) => (prev === item.turn ? null : prev)),
              onFocus: () => setHoverTurn(item.turn),
              onBlur: () => setHoverTurn((prev) => (prev === item.turn ? null : prev)),
              onClick: () => {
                void jump(item)
              },
            },
            h('span', { style: turnRailStyles.tick(state) }),
          )
        }),
      ),
    ),
    hovered === undefined
      ? null
      : h(TurnPreview, {
          item: hovered,
          index: items.findIndex((i) => i.turn === hovered.turn),
          railScroll,
        }),
  )
}

/**
 * Tooltip for the tick under the pointer.
 * @param props - the item, its position in the rail, and the rail's scroll offset.
 */
function TurnPreview(props) {
  const { item, index, railScroll } = props
  return h(
    'div',
    {
      role: 'tooltip',
      style: {
        ...turnRailStyles.preview,
        // Track the hovered tick: its own offset inside the scroller, minus how
        // far that scroller has been scrolled, centered on the tick.
        top: TURN_RAIL_INSET + index * TURN_MARK_PITCH + TURN_MARK_PITCH / 2 - railScroll,
        transform: 'translateY(-50%)',
      },
    },
    h(
      'div',
      { style: turnRailStyles.previewPrompt },
      item.prompt || t('turnRail.preview.turn', { n: item.turn }),
    ),
    item.response === ''
      ? null
      : h('div', { style: turnRailStyles.previewResponse }, item.response),
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
    background: hover
      ? 'var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.14))'
      : 'transparent',
    cursor: 'pointer',
    color: hover
      ? 'var(--dsw-alias-label-primary, inherit)'
      : 'var(--dsw-alias-label-secondary, #888)',
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

const SIDEBAR_CONTROL_HINT = t('split.sidebar.hint')
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
  return h(
    'svg',
    {
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
/** Running-row animation, kept beside the placement rules for the same stylesheet. */
const TRANSCRIPT_STYLES = `
@keyframes dsws-pulse{0%,100%{opacity:.3}50%{opacity:1}}
.dsws-running-dot{animation:dsws-pulse 1.1s ease-in-out infinite}
`

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
  const top =
    below + panelHeight <= window.innerHeight
      ? below
      : Math.max(8, Math.min(aboveTop, window.innerHeight - panelHeight - 8))
  const left = Math.max(8, Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 8))
  return { top, left }
}

/**
 * Install the stylesheet that places the sidebar control.
 *
 * Horizontal placement depends on the shell's own `data-sidebar-collapsed`
 * attribute, so it is expressed in CSS: the sidebar remounts its subtree when it
 * collapses, which defeats a width observer or a mutation listener bound to one
 * node. Vertical placement is measured instead — see `useAccountRowAlignment`.
 * @returns disposer removing the stylesheet.
 */
function installSplitStyles() {
  const existing = document.getElementById(SPLIT_STYLE_ID)
  if (existing !== null) return () => {}
  const style = document.createElement('style')
  style.id = SPLIT_STYLE_ID
  style.textContent = `${SIDEBAR_STYLES}\n${TRANSCRIPT_STYLES}`
  document.head.append(style)
  return () => style.remove()
}

/**
 * Keep the sidebar control centred on the account row.
 *
 * The slot renders its entries in a row of its own, above the account row, and
 * wraps each entry in `display: contents` elements: those wrappers have no box,
 * so the control's DOM parent is not the footer row and its next sibling is
 * another slot entry (or nothing) rather than the account row. Walk up to the
 * first ancestor that participates in layout before looking for the row — the
 * first attempt trusted `parentElement.nextElementSibling` and, on the desktop
 * client, centred the control on its own row instead (offset 0, visibly off).
 *
 * How far down that row sits is the shell's business — font scale, the account
 * row's own padding, the other footer actions — so the old fixed
 * `translateY(40px)` only lined up by accident. Measure both boxes instead, and
 * re-measure when either changes size.
 *
 * The offset is written straight to the element's style rather than held in
 * state: it is a measurement of the layout, and routing it through a render
 * would make every pass depend on the transform it just applied. It runs before
 * paint so the control never shows up in its old spot first.
 * @param ref - the control's button.
 */
function useAccountRowAlignment(ref) {
  useLayoutEffect(() => {
    // A slot entry's ref can still be empty while the node is laid out, so fall
    // back to the rendered class; there is one control per page.
    const button = ref.current ?? document.querySelector('.dsws-icon-btn')
    if (button === null || button === undefined) return undefined
    const displayOf = (el) => getComputedStyle(el).display
    const row = accountRowOf(button, displayOf)
    if (row === null) return undefined
    let frame = 0
    const align = () => {
      frame = 0
      if (button.closest('[data-sidebar-collapsed="true"]') !== null) {
        button.style.removeProperty('transform')
        return
      }
      // `alignToAccountRow` re-reads the row on every pass, so a shell that
      // swaps the footer subtree still lands the control on the row that exists
      // now; `row` above only seeds the observer.
      alignToAccountRow(button, displayOf)
    }
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(align)
    }
    align()
    window.addEventListener('resize', schedule)
    let observer = null
    if (typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(schedule)
      observer.observe(row)
      observer.observe(button)
    }
    return () => {
      window.removeEventListener('resize', schedule)
      if (observer !== null) observer.disconnect()
      if (frame !== 0) cancelAnimationFrame(frame)
    }
  }, [ref])
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
  const buttonRef = useRef(null)
  useAccountRowAlignment(buttonRef)

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

  return h(
    React.Fragment,
    null,
    h(
      'button',
      {
        type: 'button',
        ref: buttonRef,
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
      },
      h(SplitIcon, { size: 15 }),
    ),
    hover && tip !== null
      ? h(
          'div',
          { role: 'tooltip', style: splitControlStyles.tip(tip.top, tip.left) },
          t('split.grid.trigger', { rows: geometry.rows, cols: geometry.cols }),
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
  return h(
    'button',
    {
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
    },
    h(SplitIcon, { size: 14 }),
    t('split.button.label'),
  )
}

// ---------- composer ----------
// Compact on purpose: a split cell spends its height on the transcript. The
// collapsed bar is one 26px control row; the textarea grows with its content
// (up to COLLAPSED_MAX_HEIGHT) and the chevron on the right expands it further
// so a multi-line draft can be read without scrolling inside one line. Colors
// and radii are --dsw-* theme tokens; the two --dsh-content-* tokens are the
// harness content-scale values the transcript already uses, so ctrl+wheel cell
// zoom scales the bar together with its text instead of leaving it at a fixed
// pixel size.
const COLLAPSED_MAX_HEIGHT = 72
const EXPANDED_MAX_HEIGHT = 260
const EXPANDED_MIN_HEIGHT = 96
const COMPOSER_CONTROL = 30

const composerWrapStyle = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  padding: '4px 6px',
  minWidth: 0,
  flexShrink: 0,
}
const composerCardStyle = (dragging, focused) => ({
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'flex-end',
  gap: 4,
  minWidth: 0,
  borderRadius: 'var(--dsw-radius-panel, 12px)',
  background: 'var(--dsw-specific-input-major, var(--dsw-alias-bg-elevated, #2a2a2a))',
  // The drop ring reuses the active-cell accent and is inset, so a drag reads as
  // "the composer takes files" without moving the card or its neighbours. The
  // focus ring mirrors the native composer: the same inset accent at half weight.
  boxShadow: dragging
    ? 'inset 0 0 0 1.5px var(--dsw-alias-state-business-primary, #4a9eff)'
    : focused
      ? 'inset 0 0 0 1px var(--dsw-alias-border-l2, #555)'
      : 'var(--dsw-elevation-soft, 0 1px 2px rgba(0,0,0,.12))',
  padding: '3px 4px 3px 8px',
})
const composerInputStyle = {
  flex: 1,
  minWidth: 0,
  resize: 'none',
  boxSizing: 'border-box',
  border: 'none',
  outline: 'none',
  padding: '3px 0',
  fontSize: 'var(--dsh-content-font-size, 13px)',
  lineHeight: 'calc(18px + var(--dsh-content-font-delta, 0px))',
  fontFamily: 'var(--dsw-font-family, inherit)',
  background: 'transparent',
  color: 'var(--dsw-alias-label-primary, inherit)',
  caretColor: 'var(--dsw-alias-state-business-primary, #4a9eff)',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
  height: 18,
  overflowY: 'hidden',
}
/** Circular send seat, matching the native composer's primary action shape. */
const composerSendStyle = {
  flex: 'none',
  width: COMPOSER_CONTROL,
  height: COMPOSER_CONTROL,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  border: 'none',
  borderRadius: '50%',
  // The theme's button-primary-fill is white in this theme; the send seat has to
  // stay the business accent so the white arrow remains visible (it disappeared
  // into a plain white circle when the fill token won).
  background: 'var(--dsw-alias-state-business-primary, #4a9eff)',
  color: 'var(--dsw-alias-label-primary-inverted, #fff)',
  fontSize: 15,
  lineHeight: 1,
  cursor: 'pointer',
}
const composerIconBtnStyle = {
  flex: 'none',
  width: COMPOSER_CONTROL,
  height: COMPOSER_CONTROL,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  border: 'none',
  borderRadius: 'var(--dsw-radius-sm, 6px)',
  background: 'transparent',
  color: 'var(--dsw-alias-label-secondary, #999)',
  cursor: 'pointer',
}
/** Text button for the cell's retry action; the composer itself uses icons. */
const retryBtnStyle = {
  flex: 'none',
  height: 24,
  padding: '0 10px',
  border: 'none',
  borderRadius: 'var(--dsw-radius-sm, 6px)',
  background: 'var(--dsw-alias-state-business-primary, #4a9eff)',
  color: 'var(--dsw-alias-label-primary-inverted, #fff)',
  fontSize: 12,
  lineHeight: '24px',
  cursor: 'pointer',
}
/** Expander between the text and Send; the glyph points at the action. */
const composerExpandStyle = (hover) => ({
  flex: 'none',
  width: 26,
  height: COMPOSER_CONTROL,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  border: '0.5px solid var(--dsw-alias-border-l2, #555)',
  borderRadius: 'var(--dsw-radius-sm, 6px)',
  background: hover
    ? 'var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.16))'
    : 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.08))',
  color: hover
    ? 'var(--dsw-alias-label-primary, inherit)'
    : 'var(--dsw-alias-label-secondary, #999)',
  cursor: 'pointer',
  fontSize: 13,
  lineHeight: 1,
})
const composerStripStyle = {
  display: 'flex',
  gap: 8,
  padding: '2px 2px 0',
  minWidth: 0,
  overflowX: 'auto',
  overflowY: 'hidden',
  flexShrink: 0,
}
const composerThumbStyle = {
  position: 'relative',
  flex: 'none',
  width: 46,
  height: 46,
}
const composerThumbImageStyle = {
  display: 'block',
  width: 46,
  height: 46,
  objectFit: 'cover',
  borderRadius: 'var(--dsw-radius-sm, 6px)',
  background: 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.18))',
}
const composerThumbFallbackStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 46,
  height: 46,
  padding: 2,
  boxSizing: 'border-box',
  borderRadius: 'var(--dsw-radius-sm, 6px)',
  background: 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.18))',
  color: 'var(--dsw-alias-label-caption, #999)',
  fontSize: 9,
  lineHeight: '11px',
  textAlign: 'center',
}
// Inside the thumbnail, not overhanging it: an overhanging 14px circle was both
// clipped by the strip's scroll box and scaled below a usable hit target by the
// cell zoom, which is why a picture looked impossible to remove.
const composerThumbRemoveStyle = {
  position: 'absolute',
  top: 2,
  right: 2,
  zIndex: 2,
  width: 22,
  height: 22,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  border: '0.5px solid var(--dsw-alias-border-l1, #555)',
  borderRadius: 11,
  background: 'var(--dsw-alias-bg-layer-1, rgba(20,20,20,.88))',
  color: 'var(--dsw-alias-label-primary, #fff)',
  boxShadow: '0 1px 3px rgba(0,0,0,.45)',
  fontSize: 15,
  lineHeight: '20px',
  cursor: 'pointer',
}
const composerErrorStyle = {
  color: 'var(--dsw-alias-state-error-primary, #e5484d)',
  fontSize: 'var(--dsh-content-font-size-secondary, 11px)',
  lineHeight: '14px',
  padding: '0 2px',
  wordBreak: 'break-word',
}
const composerContextStyle = {
  padding: '0 2px',
  textAlign: 'end',
  color: 'var(--dsw-alias-label-caption, #888)',
  fontSize: 10,
  lineHeight: '14px',
  flexShrink: 0,
}
const composerMetaRowStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 6,
  minWidth: 0,
  flexShrink: 0,
}
const composerControlsStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  minWidth: 0,
  overflow: 'visible',
}

/**
 * Read one image File as canonical base64 (no `data:` prefix).
 *
 * FileReader's data URL is the browser's native encoder; decoding the bytes by
 * hand would put a large image's byte loop on the main thread.
 * @param file - browser File.
 * @returns base64 payload for the prompt part.
 */
function readFileBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(dataUrlPayload(reader.result))
      } catch (failure) {
        reject(failure)
      }
    }
    reader.onerror = () => reject(reader.error ?? new Error('image read failed'))
    reader.readAsDataURL(file)
  })
}

/**
 * One readable line for a RemoteFailure.
 *
 * The RPC answers `{ ok: false, error: { code, message } }`; the old code
 * swallowed that result entirely, so a refused prompt looked like a sent one.
 * Both halves are shown: the code is what a reader can quote in a bug report,
 * the message is what says why.
 * @param error - RemoteFailure, or undefined.
 * @returns `code: message`, whichever halves exist.
 */
function remoteFailureText(error) {
  if (error === undefined || error === null) return ''
  if (typeof error === 'string') return error
  const code = error.code === undefined ? '' : String(error.code)
  const message = error.message === undefined ? '' : String(error.message)
  if (code === '' && message === '') return String(error)
  return message === '' ? code : `${code === '' ? '' : `${code}: `}${message}`
}

/** Message of a thrown value, for a composer error line. */
function thrownText(failure) {
  return failure instanceof Error ? failure.message : String(failure)
}

/** Running id for draft images; React keys only need stability within a draft. */
let draftImageSeq = 0

/**
 * Draft entry for one accepted file.
 *
 * The preview URL is created once, when the file joins the draft: a `blob:` URL
 * stays alive until revoked, so its owner must be the entry that gets removed
 * (or the unmount cleanup) rather than a render function that runs again.
 * @param file - browser File.
 * @returns draft image record.
 */
function draftImageOf(file) {
  draftImageSeq += 1
  let url = ''
  if (typeof URL.createObjectURL === 'function') {
    try {
      url = URL.createObjectURL(file)
    } catch {
      url = ''
    }
  }
  return {
    id: `draft-image-${draftImageSeq}`,
    file,
    name: typeof file.name === 'string' ? file.name : '',
    url,
  }
}

/** Revoke one draft preview URL (a no-op for the missing-URL fallback). */
function releaseDraftImage(image) {
  if (typeof image?.url === 'string' && image.url.startsWith('blob:')) {
    URL.revokeObjectURL(image.url)
  }
}

/**
 * Local copy for a file the intake refused.
 *
 * A refused drop must explain itself: silently ignoring a file is what made the
 * missing image support look like a broken picker. Bytes and pixels are not
 * checked here — the Host owns those limits and its refusal is shown verbatim.
 * @param rejection - `{ reason, name }` from `intakeImages`.
 * @returns the message the composer shows.
 */
function imageRejectText(rejection) {
  if (rejection?.reason === 'too-many') {
    return t('composer.image.tooMany', { count: IMAGE_INTAKE_LIMITS.maxImages })
  }
  return t('composer.image.unsupported', { name: rejection?.name ?? '' })
}

/** Whether a drag carries files, so a session drag keeps its own drop effect. */
function hasFilePayload(dataTransfer) {
  if (dataTransfer === null || dataTransfer === undefined) return false
  if (dataTransfer.types === undefined) return true
  return Array.from(dataTransfer.types).includes('Files')
}

/**
 * Write pasted text at the caret after image intake claimed the paste event.
 *
 * The browser's default paste is prevented when the clipboard also held images,
 * so the text half must be written by hand or it would be dropped. The caret is
 * restored on the next frame because React rewrites the textarea's value.
 * @param area - the textarea element.
 * @param text - pasted plain text.
 * @param onChange - draft text setter.
 */
function insertAtCaret(area, text, onChange) {
  if (area === null || area === undefined) return
  const start = area.selectionStart ?? area.value.length
  const end = area.selectionEnd ?? start
  onChange(`${area.value.slice(0, start)}${text}${area.value.slice(end)}`)
  requestAnimationFrame(() => {
    const at = start + text.length
    try {
      area.setSelectionRange(at, at)
    } catch {}
  })
}

/**
 * Draft images plus their preview URLs.
 *
 * Kept as one hook so the ownership rule lives in one place: every `blob:` URL is
 * created when a file joins the draft and revoked when it leaves or the cell
 * unmounts, because a leaked URL keeps the full image in memory for the life of
 * the page.
 * @returns draft images, the intake error, and the operations that change them.
 */
function useDraftImages() {
  const [images, setImages] = useState([])
  const [error, setError] = useState('')
  const imagesRef = useRef(images)
  imagesRef.current = images

  useEffect(
    () => () => {
      for (const image of imagesRef.current) releaseDraftImage(image)
    },
    [],
  )

  const addFiles = useCallback((picked) => {
    const { accepted, rejected } = intakeImages(
      picked,
      imagesRef.current.length,
      IMAGE_INTAKE_LIMITS,
    )
    if (accepted.length > 0) {
      const added = accepted.map((entry) => draftImageOf(entry.file))
      setImages((previous) => [...previous, ...added])
    }
    setError(rejected.length > 0 ? imageRejectText(rejected[0]) : '')
  }, [])

  const removeImage = useCallback((id) => {
    releaseDraftImage(imagesRef.current.find((image) => image.id === id))
    setImages((previous) => previous.filter((image) => image.id !== id))
    setError('')
  }, [])

  const clearImages = useCallback(() => {
    for (const image of imagesRef.current) releaseDraftImage(image)
    setImages([])
  }, [])

  return { images, error, setError, addFiles, removeImage, clearImages }
}

/** Precheck cap for generic attachments; the Host still owns the real budget. */
const FILE_INTAKE_MAX = 20
let draftFileSeq = 0

/** Human-readable byte count for a draft file row. */
function formatFileSize(bytes) {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value <= 0) return '0 B'
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`
  return `${(value / (1024 * 1024)).toFixed(1)} MiB`
}

/**
 * Draft generic files and their staged Host receipts.
 *
 * Images travel inline through the prompt, but ordinary files must be uploaded
 * first and referenced by receipt. The upload starts when the file joins the
 * draft so the reader sees progress; send stays disabled until every upload
 * settles, and removing a row aborts its upload.
 * @param fileUpload - injected `ctx.fileUpload` service, if available.
 * @param sessionId - Session that owns the staged receipts.
 * @returns draft files, upload state, and the operations that change them.
 */
function useDraftFiles(fileUpload, sessionId) {
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const filesRef = useRef(files)
  filesRef.current = files
  const controllers = useRef(new Map())

  useEffect(
    () => () => {
      for (const controller of controllers.current.values()) controller.abort()
      controllers.current.clear()
    },
    [],
  )

  const patch = useCallback((id, changes) => {
    setFiles((previous) =>
      previous.map((file) => (file.id === id ? { ...file, ...changes } : file)),
    )
  }, [])

  const start = useCallback(
    (entries) => {
      for (const entry of entries) {
        Promise.resolve()
          .then(() =>
            fileUpload.upload(
              sessionId,
              entry.file,
              entry.name,
              entry.controller.signal,
              (progress) =>
                patch(entry.id, {
                  progress: progress.loaded,
                  total: progress.total ?? entry.size,
                }),
            ),
          )
          .then(
            (result) => {
              if (entry.controller.signal.aborted) return
              if (result?.ok !== true) {
                patch(entry.id, {
                  status: 'error',
                  error: remoteFailureText(result?.error),
                })
                return
              }
              controllers.current.delete(entry.id)
              patch(entry.id, {
                status: 'ready',
                receiptId: result.value.receiptId,
                progress: result.value.file?.bytes ?? entry.size,
              })
            },
            (failure) => {
              if (entry.controller.signal.aborted) return
              patch(entry.id, { status: 'error', error: thrownText(failure) })
            },
          )
          .catch(() => {})
      }
    },
    [fileUpload, sessionId, patch],
  )

  const addFiles = useCallback(
    (picked) => {
      const list = Array.from(picked ?? []).filter((file) => !isImageFile(file))
      if (list.length === 0) return
      if (fileUpload === undefined || fileUpload === null || sessionId === undefined) {
        setError(t('composer.file.unavailable'))
        return
      }
      const room = Math.max(0, FILE_INTAKE_MAX - filesRef.current.length)
      if (room === 0) {
        setError(t('composer.file.tooMany', { count: FILE_INTAKE_MAX }))
        return
      }
      const accepted = list.slice(0, room)
      const entries = accepted.map((file) => {
        draftFileSeq += 1
        const controller = new AbortController()
        const entry = {
          id: `draft-file-${draftFileSeq}`,
          file,
          name: typeof file.name === 'string' && file.name !== '' ? file.name : 'file',
          size: Number(file.size) || 0,
          status: 'uploading',
          progress: 0,
          total: Number(file.size) || 0,
          receiptId: '',
          error: '',
          controller,
        }
        controllers.current.set(entry.id, controller)
        return entry
      })
      setFiles((previous) => [...previous, ...entries])
      setError(list.length > room ? t('composer.file.tooMany', { count: FILE_INTAKE_MAX }) : '')
      start(entries)
    },
    [fileUpload, sessionId, start],
  )

  const removeFile = useCallback((id) => {
    controllers.current.get(id)?.abort()
    controllers.current.delete(id)
    setFiles((previous) => previous.filter((file) => file.id !== id))
    setError('')
  }, [])

  const clearFiles = useCallback(() => {
    for (const controller of controllers.current.values()) controller.abort()
    controllers.current.clear()
    setFiles([])
  }, [])

  const uploading = files.some((file) => file.status === 'uploading')
  const failed = files.find((file) => file.status === 'error')
  const ready = files
    .filter((file) => file.status === 'ready')
    .map((file) => filePart(file.receiptId))
    .filter((part) => part !== null)
  return { files, error, setError, addFiles, removeFile, clearFiles, uploading, failed, ready }
}

/** Picture glyph for the attach button, drawn in the button's text color. */
function ImageIcon(props) {
  const size = props.size ?? 14
  return h(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 16 16',
      fill: 'none',
      'aria-hidden': true,
      style: { display: 'block' },
    },
    h('rect', {
      x: 1.6,
      y: 2.6,
      width: 12.8,
      height: 10.8,
      rx: 2.4,
      stroke: 'currentColor',
      strokeWidth: 1.2,
    }),
    h('circle', { cx: 5.4, cy: 6, r: 1.15, fill: 'currentColor' }),
    h('path', {
      d: 'M2.4 12.2l3.3-3.4 2.5 2.5 2.1-2.2 3.3 3.1',
      stroke: 'currentColor',
      strokeWidth: 1.2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
  )
}

/** Shared 16×16 glyph frame. */
function Glyph(props) {
  const size = props.size ?? 15
  return h(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 16 16',
      fill: 'none',
      'aria-hidden': true,
      style: { display: 'block' },
    },
    props.children,
  )
}

/** Plus glyph for the attach menu, matching the main composer's add control. */
function PlusIcon(props) {
  return h(
    Glyph,
    { size: props.size ?? 15 },
    h('path', {
      d: 'M8 3v10M3 8h10',
      stroke: 'currentColor',
      strokeWidth: 1.7,
      strokeLinecap: 'round',
    }),
  )
}

/** Document glyph for one staged generic file. */
function FileIcon(props) {
  const size = props.size ?? 14
  return h(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 16 16',
      fill: 'none',
      'aria-hidden': true,
      style: { display: 'block', flex: 'none' },
    },
    h('path', {
      d: 'M4 1.8h5l3 3v9.4H4z',
      stroke: 'currentColor',
      strokeWidth: 1.2,
      strokeLinejoin: 'round',
    }),
    h('path', {
      d: 'M9 1.8v3.4h3',
      stroke: 'currentColor',
      strokeWidth: 1.2,
      strokeLinejoin: 'round',
    }),
  )
}

/** Up arrow for the send seat; a glyph was too thin at split-cell zoom. */
function SendIcon(props) {
  return h(
    Glyph,
    { size: props.size ?? 15 },
    h('path', {
      d: 'M8 13V3M8 3L4 7M8 3l4 4',
      stroke: 'currentColor',
      strokeWidth: 1.8,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
  )
}

/** Add menu above the plus button: images go inline, other files upload. */
const attachMenuStyles = {
  wrap: { position: 'relative', flex: 'none', display: 'inline-flex' },
  panel: {
    position: 'absolute',
    bottom: 'calc(100% + 6px)',
    left: 0,
    zIndex: 40,
    minWidth: 132,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: 4,
    border: '0.5px solid var(--dsw-alias-border-l2, #555)',
    borderRadius: 'var(--dsw-radius-md, 8px)',
    background: 'var(--dsw-alias-bg-layer-1, #1e1e1e)',
    boxShadow: 'var(--dsw-elevation-panel, 0 4px 16px rgba(0,0,0,.35))',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '5px 8px',
    border: 'none',
    borderRadius: 'var(--dsw-radius-sm, 6px)',
    background: 'transparent',
    color: 'var(--dsw-alias-label-primary, inherit)',
    fontSize: 'var(--dsh-content-font-size-secondary, 12px)',
    lineHeight: '18px',
    textAlign: 'start',
    cursor: 'pointer',
  },
}

/** Chevron for the composer expander; points down when closed, up when open. */
function ChevronIcon(props) {
  const size = props.size ?? 12
  const d = props.up === true ? 'M4 10l4-4 4 4' : 'M4 6l4 4 4-4'
  return h(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 16 16',
      fill: 'none',
      'aria-hidden': true,
      style: { display: 'block' },
    },
    h('path', {
      d,
      stroke: 'currentColor',
      strokeWidth: 1.7,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
  )
}

/** Square stop glyph, the compact counterpart of the main composer's Stop. */
function StopIcon(props) {
  const size = props.size ?? 11
  return h(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 16 16',
      'aria-hidden': true,
      style: { display: 'block' },
    },
    h('rect', { x: 3.5, y: 3.5, width: 9, height: 9, rx: 1.5, fill: 'currentColor' }),
  )
}

/**
 * Thumbnails of the images waiting in the draft, each removable on its own.
 * @param props - draft `images` and the `onRemove(id)` handler.
 */
function DraftImageStrip(props) {
  const { images, onRemove } = props
  return h(
    'div',
    { style: composerStripStyle },
    images.map((image) =>
      h(
        'div',
        { key: image.id, style: composerThumbStyle, title: image.name },
        image.url === ''
          ? h('span', { style: composerThumbFallbackStyle }, t('composer.image.noPreview'))
          : h('img', { src: image.url, alt: image.name, style: composerThumbImageStyle }),
        h(
          'button',
          {
            type: 'button',
            title: t('composer.image.remove'),
            'aria-label': t('composer.image.remove'),
            onClick: () => onRemove(image.id),
            style: composerThumbRemoveStyle,
          },
          '×',
        ),
      ),
    ),
  )
}

/** Row/name geometry shared by staged and transcript file cards. */
const attachmentRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  minWidth: 0,
  fontSize: 'var(--dsh-content-font-size-secondary, 12px)',
  lineHeight: '18px',
  color: 'var(--dsw-alias-label-secondary, #999)',
}
const attachmentNameStyle = {
  flex: '1 1 auto',
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: 'var(--dsw-alias-label-primary, inherit)',
}

const fileStyles = {
  strip: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    padding: '2px 2px 0',
    maxHeight: 120,
    overflowY: 'auto',
    flexShrink: 0,
  },
  row: attachmentRowStyle,
  name: attachmentNameStyle,
  meta: (error) => ({
    flex: 'none',
    fontSize: 11,
    color: error
      ? 'var(--dsw-alias-state-error-primary, #e5484d)'
      : 'var(--dsw-alias-label-caption, #888)',
  }),
  remove: {
    flex: 'none',
    width: 20,
    height: 20,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    border: '0.5px solid var(--dsw-alias-border-l2, #555)',
    borderRadius: 10,
    background: 'var(--dsw-alias-bg-layer-1, rgba(20,20,20,.88))',
    color: 'var(--dsw-alias-label-primary, #fff)',
    fontSize: 13,
    lineHeight: 1,
    cursor: 'pointer',
  },
}

/** Upload state of one generic-file draft row. */
function fileMetaText(file) {
  if (file.status === 'error') return t('composer.file.failed')
  if (file.status === 'uploading') {
    return t('composer.file.progress', {
      loaded: formatFileSize(file.progress),
      total: formatFileSize(file.total || file.size),
    })
  }
  return formatFileSize(file.size)
}

/** Generic-file drafts above the composer, each removable on its own. */
function DraftFileStrip(props) {
  const { files, onRemove } = props
  return h(
    'div',
    { style: fileStyles.strip, 'data-dsws-files': 'true' },
    files.map((file) =>
      h(
        'div',
        { key: file.id, style: fileStyles.row },
        h(FileIcon, { size: 14 }),
        h('span', { style: fileStyles.name, title: file.name }, file.name),
        h('span', { style: fileStyles.meta(file.status === 'error') }, fileMetaText(file)),
        h(
          'button',
          {
            type: 'button',
            title: t('composer.file.remove'),
            'aria-label': t('composer.file.remove'),
            onClick: () => onRemove(file.id),
            style: fileStyles.remove,
          },
          '×',
        ),
      ),
    ),
  )
}

/**
 * The cell's input bar: text, images, and one ordered prompt per send.
 *
 * Images and the send state live here because the previews need an unmount hook;
 * the typed text is owned by CellView so changing a cell's session does not
 * silently discard it (the old bar kept it across the same switch). An
 * image-only draft is sendable: requiring text is what made a screenshot
 * impossible to submit.
 * @param props - `session` is the binding's session face, `text`/`onText` the
 *   cell-owned draft text.
 */
function Composer(props) {
  const { session, text, onText, running, fileUpload, occupancy, controls, metaError, remote } =
    props
  const [sending, setSending] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [focused, setFocused] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [hoverExpand, setHoverExpand] = useState(false)
  const [attachOpen, setAttachOpen] = useState(false)
  const {
    images,
    error: imageError,
    setError: setImageError,
    addFiles: addImageFiles,
    removeImage,
    clearImages,
  } = useDraftImages()
  const {
    files,
    error: fileError,
    setError: setFileError,
    addFiles: addGenericFiles,
    removeFile,
    clearFiles,
    uploading,
    failed,
    ready: fileParts,
  } = useDraftFiles(fileUpload, session?.sessionId)
  const textareaRef = useRef(null)
  const imageInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const attachRef = useRef(null)
  const attachPanelRef = useRef(null)
  const mention = useMentionPicker({
    remote,
    sessionId: session?.sessionId,
    text,
    onText,
    textareaRef,
    t,
  })
  const error = imageError || fileError || (failed === undefined ? '' : failed.error || '')
  const setError = useCallback(
    (message) => {
      setImageError(message)
      setFileError('')
    },
    [setImageError, setFileError],
  )

  useEffect(() => {
    if (!attachOpen) return undefined
    const close = (event) => {
      if (attachRef.current?.contains(event.target)) return
      if (attachPanelRef.current?.contains(event.target)) return
      setAttachOpen(false)
    }
    const key = (event) => {
      if (event.key === 'Escape') setAttachOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', key)
    }
  }, [attachOpen])

  // A plain textarea with rows=1 scrolls inside a single line instead of growing,
  // so a multi-line draft could not be read without scrolling. Size it from its
  // scrollHeight; the chevron raises the ceiling and gives a taller empty box.
  const resize = useCallback(() => {
    const area = textareaRef.current
    if (area === null) return
    const ceiling = expanded ? EXPANDED_MAX_HEIGHT : COLLAPSED_MAX_HEIGHT
    const floor = expanded ? EXPANDED_MIN_HEIGHT : 18
    area.style.height = 'auto'
    area.style.height = `${Math.max(floor, Math.min(area.scrollHeight, ceiling))}px`
    area.style.overflowY = area.scrollHeight > ceiling ? 'auto' : 'hidden'
  }, [expanded])

  useLayoutEffect(() => {
    resize()
  }, [text, expanded, resize])

  const send = useCallback(async () => {
    if (session === undefined || session === null || sending) return
    const line = parseSlashLine(text)
    if (line !== null) {
      if (images.length > 0 || files.length > 0) {
        setError(t('composer.commandAttachments'))
        return
      }
      setSending(true)
      setError('')
      try {
        const result = await session.command(text.trim())
        if (result?.ok !== true) {
          setError(t('composer.commandFailed', { error: remoteFailureText(result?.error) }))
        } else if (result.value?.matched !== true) {
          setError(t('composer.unknownCommand', { name: line.name }))
        } else {
          onText('')
          setExpanded(false)
        }
      } catch (failure) {
        setError(t('composer.commandFailed', { error: thrownText(failure) }))
      } finally {
        setSending(false)
      }
      return
    }
    if (uploading || failed !== undefined) return
    if (text.trim() === '' && images.length === 0 && files.length === 0) return
    setSending(true)
    setError('')
    let parts
    try {
      const encoded = await Promise.all(
        images.map((image) => imagePart(image.file, readFileBase64)),
      )
      parts = buildPromptParts(text, encoded, fileParts)
    } catch (failure) {
      setSending(false)
      setError(t('composer.image.readFailed', { error: thrownText(failure) }))
      return
    }
    try {
      const result = await session.prompt(parts, 'queue')
      if (result?.ok !== true) {
        setError(t('composer.sendFailed', { error: remoteFailureText(result?.error) }))
        return
      }
      clearImages()
      clearFiles()
      onText('')
      setExpanded(false)
      textareaRef.current?.focus()
    } catch (failure) {
      setError(t('composer.sendFailed', { error: thrownText(failure) }))
    } finally {
      setSending(false)
    }
  }, [
    session,
    text,
    onText,
    images,
    files.length,
    fileParts,
    uploading,
    failed,
    sending,
    setError,
    clearImages,
    clearFiles,
  ])

  const stop = useCallback(async () => {
    if (session === undefined || session === null || stopping) return
    setStopping(true)
    setError('')
    try {
      const result = await session.cancel()
      if (result?.ok !== true) {
        setError(t('composer.stopFailed', { error: remoteFailureText(result?.error) }))
      }
    } catch (failure) {
      setError(t('composer.stopFailed', { error: thrownText(failure) }))
    } finally {
      setStopping(false)
    }
  }, [session, stopping, setError])

  const onKeyDown = (event) => {
    if (mention.onKeyDown(event)) return
    if (event.key !== 'Enter' || event.shiftKey) return
    // Enter also confirms a Chinese/Japanese IME candidate. Sending there would
    // submit half-composed text, so the key belongs to the IME until it commits.
    if (event.nativeEvent?.isComposing === true || event.keyCode === 229) return
    event.preventDefault()
    send()
  }

  const classifyPicked = (picked) => {
    const imageList = picked.filter((file) => isImageFile(file))
    const fileList = picked.filter((file) => !isImageFile(file))
    if (imageList.length > 0) addImageFiles(imageList)
    if (fileList.length > 0) addGenericFiles(fileList)
  }

  const onPaste = (event) => {
    const clipboard = event.clipboardData
    if (clipboard === null || clipboard === undefined) return
    const picked = []
    for (const item of clipboard.items ?? []) {
      if (item.kind !== 'file') continue
      const file = item.getAsFile()
      if (file !== null) picked.push(file)
    }
    if (picked.length === 0) return
    event.preventDefault()
    classifyPicked(picked)
    const pasted = clipboard.getData('text/plain')
    if (pasted !== '') insertAtCaret(event.currentTarget, pasted, onText)
  }

  const onDragOver = (event) => {
    if (!hasFilePayload(event.dataTransfer)) return
    event.preventDefault()
    event.stopPropagation()
    try {
      event.dataTransfer.dropEffect = 'copy'
    } catch {}
    setDragging(true)
  }

  const onDragLeave = (event) => {
    // A drag leaving for a child still fires dragleave on the card; only a real
    // exit clears the highlight. relatedTarget can be null (left the window) or
    // a non-Node, which `contains` would reject.
    const next = event.relatedTarget
    if (next instanceof Node && event.currentTarget.contains(next)) return
    setDragging(false)
  }

  const onDrop = (event) => {
    const dropped = Array.from(event.dataTransfer?.files ?? [])
    if (dropped.length === 0) return
    // The tile behind the composer also accepts drops (a sidebar session move);
    // a file drop must stop here or it would also be read as "pick this session".
    event.preventDefault()
    event.stopPropagation()
    setDragging(false)
    classifyPicked(dropped)
  }

  const onFilesPicked = (event) => {
    const picked = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (picked.length > 0) addImageFiles(picked)
  }

  const onGenericFilesPicked = (event) => {
    const picked = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (picked.length > 0) addGenericFiles(picked)
  }

  const canSend =
    !sending &&
    !uploading &&
    failed === undefined &&
    (text.trim() !== '' || images.length > 0 || files.length > 0)
  const canStop = running === true && !canSend && !sending && !stopping
  const primaryAction = canStop ? stop : send
  const primaryLabel = canStop
    ? t('composer.stop')
    : sending
      ? t('composer.sending')
      : t('composer.send')

  return h(
    'div',
    {
      style: composerWrapStyle,
      'data-dsws-controls': controls === null ? 'none' : 'ready',
    },
    error === '' ? null : h('div', { role: 'status', style: composerErrorStyle }, error),
    images.length === 0 ? null : h(DraftImageStrip, { images, onRemove: removeImage }),
    files.length === 0 ? null : h(DraftFileStrip, { files, onRemove: removeFile }),
    mention.state.open
      ? h(MentionPopup, {
          candidates: mention.state.candidates,
          index: mention.state.index,
          onChoose: mention.choose,
          t,
        })
      : null,
    h(
      'div',
      { style: composerCardStyle(dragging, focused), onDragOver, onDragLeave, onDrop },
      h(
        'span',
        { ref: attachRef, style: attachMenuStyles.wrap },
        h(
          'button',
          {
            type: 'button',
            title: t('composer.attach'),
            'aria-label': t('composer.attach'),
            'aria-expanded': attachOpen,
            onClick: () => setAttachOpen((open) => !open),
            style: composerIconBtnStyle,
          },
          h(PlusIcon, { size: 17 }),
        ),
        attachOpen
          ? h(
              'div',
              { ref: attachPanelRef, style: attachMenuStyles.panel, role: 'menu' },
              h(
                'button',
                {
                  type: 'button',
                  role: 'menuitem',
                  style: attachMenuStyles.item,
                  onClick: () => {
                    setAttachOpen(false)
                    imageInputRef.current?.click()
                  },
                },
                h(ImageIcon, { size: 15 }),
                t('composer.attach.image'),
              ),
              h(
                'button',
                {
                  type: 'button',
                  role: 'menuitem',
                  disabled: fileUpload === undefined,
                  style: {
                    ...attachMenuStyles.item,
                    opacity: fileUpload === undefined ? 0.4 : 1,
                  },
                  onClick: () => {
                    setAttachOpen(false)
                    fileInputRef.current?.click()
                  },
                },
                h(FileIcon, { size: 15 }),
                t('composer.attach.file'),
              ),
            )
          : null,
      ),
      h('input', {
        ref: imageInputRef,
        type: 'file',
        accept: IMAGE_MEDIA_TYPES.join(','),
        multiple: true,
        style: { display: 'none' },
        onChange: onFilesPicked,
      }),
      h('input', {
        ref: fileInputRef,
        type: 'file',
        multiple: true,
        style: { display: 'none' },
        onChange: onGenericFilesPicked,
      }),
      h('textarea', {
        ref: textareaRef,
        value: text,
        onChange: (event) => {
          onText(event.target.value)
          mention.refresh(event.target.value, event.target.selectionStart)
        },
        onKeyDown,
        onPaste,
        onFocus: () => setFocused(true),
        onBlur: () => setFocused(false),
        placeholder: t('composer.placeholder'),
        'aria-label': t('composer.placeholder'),
        rows: 1,
        style: composerInputStyle,
      }),
      h(
        'button',
        {
          type: 'button',
          title: expanded ? t('composer.collapse') : t('composer.expand'),
          'aria-label': expanded ? t('composer.collapse') : t('composer.expand'),
          'aria-expanded': expanded,
          onMouseEnter: () => setHoverExpand(true),
          onMouseLeave: () => setHoverExpand(false),
          onClick: () => {
            setExpanded((open) => !open)
            requestAnimationFrame(() => textareaRef.current?.focus())
          },
          style: composerExpandStyle(hoverExpand),
        },
        h(ChevronIcon, { up: expanded, size: 13 }),
      ),
      h(
        'button',
        {
          type: 'button',
          title: primaryLabel,
          'aria-label': primaryLabel,
          onClick: primaryAction,
          disabled: !canSend && !canStop,
          style: {
            ...composerSendStyle,
            opacity: canSend || canStop ? 1 : 0.35,
            cursor: canSend || canStop ? 'pointer' : 'default',
          },
        },
        canStop ? h(StopIcon, { size: 11 }) : sending ? '…' : h(SendIcon, { size: 15 }),
      ),
    ),
    h(ComposerMeta, { controls, occupancy, metaError }),
  )
}

/** Footer row of the composer: model/permission seats and context occupancy. */
function ComposerMeta(props) {
  const { controls, occupancy, metaError } = props
  if (metaError !== '') {
    return h('div', { role: 'status', style: composerErrorStyle }, metaError)
  }
  if (controls === null && occupancy === null) return null
  return h(
    'div',
    { style: composerMetaRowStyle, 'data-dsws-composer-meta': 'true' },
    h('div', { style: composerControlsStyle }, controls),
    occupancy === null
      ? null
      : h(
          'span',
          { style: composerContextStyle, 'data-dsws-context': 'true' },
          t('composer.context', {
            percent: occupancy.percent,
            used: formatTokens(occupancy.usedTokens),
            window: formatTokens(occupancy.contextWindow),
          }),
        ),
  )
}

const queueStyles = {
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    margin: '0 6px',
    padding: '6px 8px',
    border: '0.5px solid var(--dsw-alias-border-l2, #555)',
    borderRadius: 'var(--dsw-radius-md, 8px)',
    background: 'var(--dsw-alias-bg-layer-1, rgba(30,30,30,.7))',
    maxHeight: 160,
    overflowY: 'auto',
    flexShrink: 0,
  },
  header: {
    fontSize: 'var(--dsh-content-font-size-secondary, 12px)',
    lineHeight: '16px',
    fontWeight: 600,
    color: 'var(--dsw-alias-label-secondary, #999)',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
    fontSize: 'var(--dsh-content-font-size-secondary, 12px)',
    lineHeight: '18px',
  },
  text: {
    flex: '1 1 auto',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: 'var(--dsw-alias-label-primary, inherit)',
  },
  action: {
    flex: 'none',
    padding: '0 6px',
    height: 20,
    border: '0.5px solid var(--dsw-alias-border-l2, #555)',
    borderRadius: 'var(--dsw-radius-sm, 6px)',
    background: 'transparent',
    color: 'var(--dsw-alias-label-secondary, #999)',
    fontSize: 11,
    lineHeight: '18px',
    cursor: 'pointer',
  },
  error: {
    fontSize: 11,
    lineHeight: '16px',
    color: 'var(--dsw-alias-state-error-primary, #e5484d)',
  },
}

/** Readable text of one queued user message. */
function queueText(message) {
  const blocks = Array.isArray(message?.content) ? message.content : []
  return (
    blocks
      .map((block) =>
        block?.type === 'text' ? block.text : block?.type === 'image' ? '[image]' : '',
      )
      .filter((text) => text !== '')
      .join(' ')
      .trim() || t('queue.imageOnly')
  )
}

/**
 * Queued prompts above the cell composer, matching Chat's QueueDock.
 *
 * `session.prompt(..., 'queue')` appends to the Host inbox while a turn runs;
 * without this dock the reader could not see that a message is waiting, remove
 * it, or steer it into the running turn. The dock is session-projection driven,
 * so another client's queued message appears here too.
 * @param props - queued inbox messages and the bound Session face.
 */
function QueueDock(props) {
  const { items, session } = props
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  if (items.length === 0) return null

  const act = async (item, action) => {
    setBusy(item.id)
    setError('')
    try {
      const result = await session.updateQueue(item.id, action)
      if (result?.ok !== true) {
        setError(t('queue.failed', { error: remoteFailureText(result?.error) }))
      }
    } catch (failure) {
      setError(t('queue.failed', { error: thrownText(failure) }))
    } finally {
      setBusy('')
    }
  }

  return h(
    'div',
    { style: queueStyles.wrap, 'data-dsws-queue': 'true' },
    h('div', { style: queueStyles.header }, t('queue.title', { count: items.length })),
    error === '' ? null : h('div', { style: queueStyles.error }, error),
    items.map((item) =>
      h(
        'div',
        { key: item.id, style: queueStyles.row },
        h('span', { style: queueStyles.text, title: queueText(item) }, queueText(item)),
        h(
          'button',
          {
            type: 'button',
            style: queueStyles.action,
            disabled: busy === item.id,
            title: t('queue.steer'),
            onClick: () => act(item, { kind: 'steer' }),
          },
          t('queue.steer'),
        ),
        h(
          'button',
          {
            type: 'button',
            style: queueStyles.action,
            disabled: busy === item.id,
            title: t('queue.remove'),
            'aria-label': t('queue.remove'),
            onClick: () => act(item, { kind: 'remove' }),
          },
          '×',
        ),
      ),
    ),
  )
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
    color:
      hover || expanded
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
  running: {
    flex: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
    color: 'var(--dsw-alias-state-business-primary, #4a9eff)',
    fontSize: 11,
    lineHeight: '16px',
  },
  runningDot: {
    flex: 'none',
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: 'var(--dsw-alias-state-business-primary, #4a9eff)',
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
    return String(argsRaw ?? '')
      .replace(/\s+/g, ' ')
      .slice(0, 120)
  }
  if (parsed === null || typeof parsed !== 'object') return String(parsed).slice(0, 120)
  const pick =
    parsed.description ??
    parsed.command ??
    parsed.file_path ??
    parsed.path ??
    parsed.pattern ??
    parsed.query ??
    parsed.url ??
    parsed.prompt
  if (typeof pick === 'string') return pick.replace(/\s+/g, ' ').slice(0, 200)
  const keys = Object.keys(parsed)
  if (keys.length === 0) return ''
  return keys
    .slice(0, 3)
    .map((k) => `${k}=${JSON.stringify(parsed[k]).slice(0, 40)}`)
    .join(' ')
}

/** Expandable tool call row: name, summary, and arguments/result on demand. */
function ToolRow(props) {
  const { name, argsRaw, resultText, isError, errorReason, running } = props
  const [expanded, setExpanded] = useState(false)
  const [hover, setHover] = useState(false)
  const summary = toolSummary(name, argsRaw)

  let prettyArgs = argsRaw
  try {
    prettyArgs = JSON.stringify(JSON.parse(argsRaw), null, 2)
  } catch {}

  return h(
    'div',
    {
      style: { display: 'flex', flexDirection: 'column', minWidth: 0, maxWidth: '100%' },
      'data-dsws-tool': name,
      'data-running': running === true ? 'true' : 'false',
    },
    h(
      'div',
      {
        style: toolStyles.row(hover, expanded),
        onMouseEnter: () => setHover(true),
        onMouseLeave: () => setHover(false),
        onClick: () => setExpanded((v) => !v),
        role: 'button',
        'aria-expanded': expanded,
        title: expanded ? t('toolrow.collapse') : t('toolrow.expand'),
      },
      h('span', { style: toolStyles.chevron(expanded) }, '▶'),
      h('span', { style: toolStyles.name }, name),
      summary ? h('span', { style: toolStyles.sep }) : null,
      summary ? h('span', { style: toolStyles.summary }, summary) : null,
      running
        ? h(
            'span',
            { style: toolStyles.running, title: t('toolrow.running') },
            h('span', { className: 'dsws-running-dot', style: toolStyles.runningDot }),
            t('toolrow.running'),
          )
        : null,
      isError ? h('span', { style: toolStyles.errorFlag, title: t('toolrow.failed') }) : null,
    ),
    expanded
      ? h(
          'div',
          { style: toolStyles.body },
          errorReason
            ? h(
                'div',
                {
                  style: {
                    ...toolStyles.label,
                    color: 'var(--dsw-alias-state-error-primary, #e5484d)',
                  },
                },
                errorReason,
              )
            : null,
          prettyArgs
            ? h(
                React.Fragment,
                null,
                h('div', { style: toolStyles.label }, t('toolrow.labels.params')),
                h('pre', { style: toolStyles.pre }, prettyArgs),
              )
            : null,
          resultText
            ? h(
                React.Fragment,
                null,
                h(
                  'div',
                  { style: toolStyles.label },
                  isError ? t('toolrow.labels.errorOutput') : t('toolrow.labels.output'),
                ),
                h('pre', { style: toolStyles.pre }, resultText),
              )
            : h(
                'div',
                { style: toolStyles.label },
                running ? t('toolrow.running') : t('toolrow.noOutput'),
              ),
        )
      : null,
  )
}

const reasoningStyles = {
  label: {
    flex: 'none',
    fontSize: 'var(--dsh-content-font-size-secondary, 12px)',
    fontWeight: 600,
    color: 'var(--dsw-alias-label-secondary, #999)',
  },
  preview: {
    flex: '1 1 auto',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 'var(--dsh-content-font-size-secondary, 12px)',
    color: 'var(--dsw-alias-label-tertiary, #888)',
  },
  dot: {
    flex: 'none',
    width: 5,
    height: 5,
    borderRadius: '50%',
    background: 'var(--dsw-alias-state-business-primary, #4a9eff)',
  },
  body: {
    margin: '2px 0 8px 18px',
    paddingLeft: 12,
    borderLeft: '2px solid var(--dsw-alias-border-l2, #4a4a4a)',
    fontSize: 'var(--dsh-content-font-size-secondary, 12px)',
    lineHeight: 1.6,
    color: 'var(--dsw-alias-label-secondary, #999)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    maxHeight: 220,
    overflow: 'auto',
  },
}

/**
 * One Turn's process group: reasoning text and Tool rows under one disclosure.
 *
 * Chat's standard view folds a completed Turn's process rows and leaves the
 * answer outside; a running group stays open. This is the same shape, sized for
 * a tile: the header names the tools and whether reasoning is present, and the
 * body keeps the existing Tool rows.
 * @param props - one `kind: 'process'` row from `groupProcessRows`.
 */
/** Elapsed label of one process group; ticks while the group is running. */
function GroupDuration(props) {
  const { group } = props
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (group.running !== true) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [group.running])
  if (group.startedAt === undefined) return null
  const end = group.running === true ? now : (group.endedAt ?? group.startedAt)
  if (!(end > group.startedAt)) return null
  return h(
    'span',
    { style: reasoningStyles.preview, 'data-dsws-process-duration': 'true' },
    formatDuration(end - group.startedAt),
  )
}

function ProcessGroup(props) {
  const { group } = props
  const [open, setOpen] = useState(group.running === true)
  const [hover, setHover] = useState(false)
  // Chat's standard view keeps a running process open and folds it once the
  // turn settles; a reader who opens a completed group keeps it open because the
  // effect only runs when `running` changes.
  useEffect(() => {
    setOpen(group.running === true)
  }, [group.running])

  const tools = group.items.filter((item) => item.kind === 'tool').map((item) => item.tool.name)
  const hasReasoning = group.items.some((item) => item.kind === 'reasoning')
  const summaryParts = []
  if (tools.length > 0) summaryParts.push([...new Set(tools)].join(', '))
  if (hasReasoning) summaryParts.push(t('reasoning.label'))
  const summary = summaryParts.join(' · ')
  return h(
    'div',
    {
      style: { minWidth: 0, maxWidth: '100%' },
      'data-dsws-process': 'true',
      'data-running': group.running === true ? 'true' : 'false',
    },
    h(
      'div',
      {
        style: toolStyles.row(hover, open),
        onMouseEnter: () => setHover(true),
        onMouseLeave: () => setHover(false),
        onClick: () => setOpen((value) => !value),
        role: 'button',
        'aria-expanded': open,
        title: open ? t('process.collapse') : t('process.expand'),
      },
      h('span', { style: toolStyles.chevron(open) }, '▶'),
      h(
        'span',
        { style: reasoningStyles.label },
        group.running === true ? t('process.running') : t('process.label'),
      ),
      group.running === true
        ? h('span', { className: 'dsws-running-dot', style: reasoningStyles.dot })
        : null,
      h(GroupDuration, { group }),
      summary === '' ? null : h('span', { style: reasoningStyles.preview }, summary),
    ),
    open
      ? h(
          'div',
          { style: { minWidth: 0 } },
          group.items.map((item) =>
            item.kind === 'tool'
              ? h(ToolRow, { key: item.key, ...item.tool })
              : h(
                  'div',
                  {
                    key: item.key,
                    style: reasoningStyles.body,
                    'data-dsws-reasoning': 'true',
                  },
                  item.text,
                ),
          ),
        )
      : null,
  )
}

const runningStyles = {
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 0 2px',
    color: 'var(--dsw-alias-label-secondary, #999)',
    fontSize: 'var(--dsh-content-font-size-secondary, 12px)',
    lineHeight: '18px',
  },
  dot: {
    flex: 'none',
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--dsw-alias-state-business-primary, #4a9eff)',
  },
}

/**
 * One live line under the transcript while the Session is running.
 * @param props - the status text chosen by `runningHint`.
 */
function RunningStatus(props) {
  return h(
    'div',
    { style: runningStyles.row, 'data-dsws-running': 'true' },
    h('span', { className: 'dsws-running-dot', style: runningStyles.dot }),
    h('span', null, props.text),
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
  if (kind === 'user')
    return {
      ...base,
      alignSelf: 'flex-end',
      background: 'var(--dsw-specific-bubble, var(--dsw-alias-interactive-bg-hover, #2f3b4a))',
      borderRadius: 'var(--dsw-radius-xl, 16px)',
      padding: '10px 16px',
      boxSizing: 'border-box',
    }
  if (kind === 'assistant')
    return {
      ...base,
      alignSelf: 'stretch',
      maxWidth: '100%',
      whiteSpace: 'normal',
      background: 'transparent',
      padding: '2px 0',
    }
  if (kind === 'tool')
    return {
      ...base,
      alignSelf: 'flex-start',
      color: 'var(--dsw-alias-label-tertiary, #888)',
      fontSize: 'var(--dsh-content-font-size-secondary, 12px)',
      lineHeight: 'calc(18px + var(--dsh-content-font-delta-secondary, 0px))',
      fontFamily: 'var(--dsw-font-markdown-code-block-small, monospace)',
      padding: '2px 0',
    }
  if (kind === 'divider')
    return {
      ...base,
      maxWidth: '100%',
      alignSelf: 'stretch',
      textAlign: 'center',
      color: 'var(--dsw-alias-label-caption, #999)',
      fontSize: 'var(--dsh-content-font-size-secondary, 11px)',
      padding: '2px 0',
      marginBottom: 6,
    }
  if (kind === 'error')
    return {
      ...base,
      maxWidth: '100%',
      alignSelf: 'stretch',
      background: 'rgba(229,72,77,.08)',
      borderLeft: '2px solid var(--dsw-alias-state-error-primary, #e5484d)',
      borderRadius: 6,
      padding: '6px 10px',
      color: 'var(--dsw-alias-state-error-primary, #e5484d)',
      fontSize: 'var(--dsh-content-font-size-secondary, 12px)',
      lineHeight: '18px',
    }
  if (kind === 'notice')
    return {
      ...base,
      maxWidth: '100%',
      alignSelf: 'stretch',
      color: 'var(--dsw-alias-label-caption, #999)',
      fontSize: 'var(--dsh-content-font-size-secondary, 12px)',
      lineHeight: '18px',
      padding: '2px 0',
    }
  return base
}

// ---------- transcript images ----------
// A user prompt stores its pictures as attachment refs, so the cell has to read
// them through the public `readAttachment` API and show the bytes it gets back.
// Everything here is sized for a narrow tile: thumbnails are 64px tall with a
// 120px cap, and they sit above the prompt text inside the same bubble.
const USER_IMAGE_HEIGHT = 64
const USER_IMAGE_MAX_WIDTH = 120

const userImageStyles = {
  strip: (hasText) => ({
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    minWidth: 0,
    marginBottom: hasText ? 6 : 0,
  }),
  image: {
    display: 'block',
    height: USER_IMAGE_HEIGHT,
    maxWidth: USER_IMAGE_MAX_WIDTH,
    objectFit: 'cover',
    borderRadius: 'var(--dsw-radius-md, 8px)',
    background: 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.18))',
  },
  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: USER_IMAGE_HEIGHT,
    height: USER_IMAGE_HEIGHT,
    padding: 4,
    boxSizing: 'border-box',
    borderRadius: 'var(--dsw-radius-md, 8px)',
    background: 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.18))',
    color: 'var(--dsw-alias-label-caption, #999)',
    fontSize: 'var(--dsh-content-font-size-secondary, 11px)',
    lineHeight: '14px',
    textAlign: 'center',
  },
}

/**
 * Display URL for one attachment's bytes.
 *
 * A `blob:` URL avoids base64-inflating the image in the DOM; the data-URL
 * fallback keeps the thumbnail working in a context without Blob URLs, the same
 * two-step the harness's own conversation service uses.
 * @param bytes - `Uint8Array` from `readAttachment`.
 * @param mediaType - the attachment's media type.
 * @returns a URL usable as an `img src`.
 */
function imageUrlOf(bytes, mediaType) {
  const list = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes ?? [])
  if (typeof URL.createObjectURL === 'function') {
    // Copy the array: a Uint8Array decoded from base64 can be a view over a
    // larger buffer, and a Blob built from that buffer would carry the slack.
    return URL.createObjectURL(new Blob([Uint8Array.from(list).buffer], { type: mediaType }))
  }
  return `data:${mediaType ?? ''};base64,${bytesToBase64(list)}`
}

/** Revoke a thumbnail URL when it is a `blob:` one. */
function releaseImageUrl(url) {
  if (typeof url === 'string' && url.startsWith('blob:')) URL.revokeObjectURL(url)
}

/**
 * One image from a user message, loaded from its attachment ref.
 *
 * The effect keys on the ref's own primitive fields rather than the attachment
 * object: `buildTranscript` rebuilds its rows on every streamed chunk, and a new
 * object identity would refetch the bytes (and recreate the blob URL) once per
 * token of the answer.
 * @param props - `session` and the row's `attachment` ref.
 */
function UserImageThumb(props) {
  const { session, attachment } = props
  const attachmentId = attachment.attachmentId
  const fallbackMediaType = attachment.mediaType
  const [url, setUrl] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    let created = ''
    setUrl('')
    setFailed(false)
    // A host build without the attachment face must show the placeholder rather
    // than throw out of an effect and take the whole cell down.
    if (typeof session.readAttachment !== 'function') {
      setFailed(true)
      return undefined
    }
    session.readAttachment(attachmentId).then(
      (result) => {
        if (cancelled) return
        if (result?.ok !== true) {
          setFailed(true)
          return
        }
        try {
          const mediaType = result.value?.attachment?.mediaType ?? fallbackMediaType
          created = imageUrlOf(result.value?.data, mediaType)
        } catch {
          setFailed(true)
          return
        }
        setUrl(created)
      },
      () => {
        if (!cancelled) setFailed(true)
      },
    )
    return () => {
      cancelled = true
      releaseImageUrl(created)
      created = ''
    }
  }, [session, attachmentId, fallbackMediaType])

  const name = typeof attachment.name === 'string' && attachment.name !== '' ? attachment.name : ''
  if (failed) {
    return h(
      'div',
      { style: userImageStyles.placeholder, title: t('transcript.image.failed') },
      '×',
    )
  }
  if (url === '') {
    return h(
      'div',
      { style: userImageStyles.placeholder, title: t('transcript.image.loading') },
      '…',
    )
  }
  return h('img', {
    src: url,
    alt: name === '' ? t('transcript.image.alt') : name,
    title: name,
    style: userImageStyles.image,
  })
}

/**
 * Thumbnails of the images one user message carried.
 * @param props - `session`, the row's image refs, and whether text follows.
 */
function UserImageStrip(props) {
  const { session, images, hasText } = props
  return h(
    'div',
    { style: userImageStyles.strip(hasText) },
    images.map((attachment, index) =>
      h(UserImageThumb, {
        // The same picture can legally appear twice in one prompt, so the ref id
        // alone is not a unique React key.
        key: `${attachment.attachmentId}-${index}`,
        session,
        attachment,
      }),
    ),
  )
}

const userFileStyles = {
  strip: {
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    minWidth: 0,
    marginBottom: 6,
  },
  row: attachmentRowStyle,
  name: attachmentNameStyle,
  size: {
    flex: 'none',
    color: 'var(--dsw-alias-label-caption, #888)',
  },
}

/** File attachments one user prompt carried, read straight from its refs. */
function UserFileStrip(props) {
  return h(
    'div',
    { style: userFileStyles.strip, 'data-dsws-user-files': 'true' },
    props.files.map((file, index) =>
      h(
        'div',
        { key: `${file.attachmentId}-${index}`, style: userFileStyles.row },
        h(FileIcon, { size: 14 }),
        h('span', { style: userFileStyles.name, title: file.name }, file.name),
        h('span', { style: userFileStyles.size }, formatFileSize(file.bytes)),
      ),
    ),
  )
}

/** Attachment stack of one user prompt; null when it carried none. */
function UserAttachments(props) {
  const { row, session } = props
  const files = Array.isArray(row.files) ? row.files : []
  const images = Array.isArray(row.images) ? row.images : []
  if (files.length === 0 && images.length === 0) return null
  return h(
    React.Fragment,
    null,
    files.length === 0 ? null : h(UserFileStrip, { files }),
    images.length === 0 ? null : h(UserImageStrip, { session, images, hasText: row.text !== '' }),
  )
}

/** One user prompt row: attachments above the literal text. */
function UserRow(props) {
  const { row, session } = props
  return h(
    'div',
    { key: row.key, style: eventStyle('user') },
    h(UserAttachments, { row, session }),
    row.text === '' ? null : h('div', null, row.text),
  )
}

/**
 * Render one transcript row by kind.
 *
 * Split out of CellView so its render arrow stays small enough for the lint
 * complexity budget; each branch is a component that owns its own details.
 * @param props - one transcript row and the bound Session face.
 */
function TranscriptRow(props) {
  const { row, session } = props
  if (row.kind === 'tool') return h(ToolRow, { ...row.tool })
  if (row.kind === 'process') return h(ProcessGroup, { group: row })
  if (row.kind === 'assistant') {
    return h('div', { style: eventStyle('assistant') }, h(Markdown, { text: row.text, k: row.key }))
  }
  if (row.kind === 'user') return h(UserRow, { row, session })
  return h(
    'div',
    {
      style: eventStyle(row.kind),
      'data-turn': row.kind === 'divider' ? row.turn : undefined,
    },
    row.text,
  )
}

/**
 * Queued inbox messages of one bound Session.
 *
 * Kept as a hook so CellView's render branches stay about rows, not about the
 * projection face and its optional chain.
 * @param binding - current Session binding, or null while opening.
 * @returns the `next-turn` queue, empty when the projection is unavailable.
 */
function useProjectionFace(binding, key) {
  const face = binding?.session?.projections?.faceOf?.(key)
  const subscribe = useCallback((cb) => face?.subscribe(cb) ?? (() => {}), [face])
  const snapshot = useCallback(() => face?.getSnapshot(), [face])
  return useSyncExternalStore(subscribe, snapshot)
}

function useInboxQueue(binding) {
  const inbox = useProjectionFace(binding, 'inbox')
  return Array.isArray(inbox?.['next-turn']) ? inbox['next-turn'] : []
}

/** Subscribe to the official pending-interaction registry for one Session. */
function usePendingInteraction(uiSession, sessionId) {
  const source = uiSession?.sessionStatus
  const subscribe = useCallback((cb) => source?.subscribe(cb) ?? (() => {}), [source])
  const snapshot = useCallback(() => source?.getSnapshot(), [source])
  const statusMap = useSyncExternalStore(subscribe, snapshot)
  return pendingOf(statusMap, sessionId)
}

/** Two-letter language prefix for requester-supplied copies. */
function languagePrefix() {
  return detectLanguage().startsWith('en') ? 'en' : 'zh'
}

/**
 * Model / permission seats plus their catalogs and mutation callbacks.
 *
 * Kept in one hook so CellView's render stays under the lint complexity budget;
 * the catalogs are Remote services and the selections are Session projections.
 * @param remote - injected `ctx.remote`.
 * @param binding - current Session binding.
 * @param sessionId - current Session identity.
 * @returns `{ controls, metaError }`.
 */
function useComposerSeats(remote, binding, sessionId) {
  const modelSelection = useProjectionFace(binding, 'modelSelection')
  const permissionSelection = useProjectionFace(binding, 'permissions')
  const [modelCatalog, setModelCatalog] = useState(null)
  const [permissionCatalog, setPermissionCatalog] = useState(null)
  const [metaError, setMetaError] = useState('')

  useEffect(() => {
    const api = remote?.session
    if (api?.modelCatalog === undefined) return undefined
    let alive = true
    Promise.resolve()
      .then(() => api.modelCatalog())
      .then(
        (result) => {
          if (alive && result?.ok === true) setModelCatalog(result.value)
        },
        () => {},
      )
    return () => {
      alive = false
    }
  }, [remote])

  useEffect(() => {
    const api = remote?.permissionPresets
    if (api?.catalog === undefined) return undefined
    let alive = true
    Promise.resolve()
      .then(() => api.catalog())
      .then(
        (result) => {
          if (alive && result?.ok === true) setPermissionCatalog(result.value)
        },
        () => {},
      )
    return () => {
      alive = false
    }
  }, [remote])

  const chooseModel = useCallback(
    (selection) => {
      const api = remote?.session
      if (api?.selectModel === undefined) return
      setMetaError('')
      Promise.resolve()
        .then(() =>
          api.selectModel({
            sessionId,
            provider: selection.provider,
            model: selection.model,
            ...(selection.reasoningEffort === undefined
              ? {}
              : { reasoningEffort: selection.reasoningEffort }),
          }),
        )
        .then(
          (result) => {
            if (result?.ok !== true) setMetaError(remoteFailureText(result?.error))
          },
          (failure) => setMetaError(thrownText(failure)),
        )
    },
    [remote, sessionId],
  )

  const choosePermission = useCallback(
    (value) => {
      const session = binding?.session
      if (session === undefined) return
      setMetaError('')
      Promise.resolve()
        .then(() => session.command(`/permission ${value}`))
        .then(
          (result) => {
            if (result?.ok !== true) {
              setMetaError(remoteFailureText(result?.error))
            } else if (result.value?.matched !== true) {
              setMetaError(t('composer.permission.unavailable'))
            }
          },
          (failure) => setMetaError(thrownText(failure)),
        )
    },
    [binding],
  )

  const controls =
    remote === undefined
      ? null
      : h(
          React.Fragment,
          null,
          h(PermissionControl, {
            catalog: permissionCatalog,
            current: permissionSelection?.currentValue,
            onSelect: choosePermission,
            t,
          }),
          h(ModelControl, {
            catalog: modelCatalog,
            selection: modelSelection,
            onSelect: chooseModel,
            t,
          }),
        )
  return { controls, metaError }
}

/**
 * One seat: the pending interaction takes over the composer, exactly like the
 * main conversation; otherwise the normal composer renders.
 */
function PendingSeat(props) {
  const { pending, t, composer } = props
  if (pending === undefined) return composer
  if (pending.kind === 'approval') {
    return h(ApprovalCard, { key: pending.key, pending, t, lang: languagePrefix() })
  }
  return h(QuestionCard, { key: interactionKey(pending), pending, t })
}

// ---------- single cell: live session events + input ----------
function CellView(props) {
  const { sessions, sessionId, fileUpload, uiSession, remote } = props
  const [binding, setBinding] = useState(null)
  const [error, setError] = useState(null)
  const [inputText, setInputText] = useState('')
  const [retry, setRetry] = useState(0)
  const refRef = useRef(null)
  const openTimerRef = useRef(null)
  const bodyRef = useRef(null)

  // Wait until the session appears in the host catalog before retaining.
  const catalogSubscribe = useCallback((cb) => sessions.list.subscribe(cb), [sessions])
  const catalogSnapshot = useCallback(() => sessions.list.getSnapshot(), [sessions])
  const catalog = useSyncExternalStore(catalogSubscribe, catalogSnapshot)
  const cataloged = !!sessionId && !!catalog?.ids?.includes(sessionId)

  // The live status needs the Session's own running flag, not just the event tail:
  // a turn can be between events while a Tool runs, and settlement has no chunk.
  const sessionSubscribe = useCallback(
    (cb) => binding?.session?.subscribe(cb) ?? (() => {}),
    [binding],
  )
  const sessionSnapshot = useCallback(() => binding?.session?.getSnapshot() ?? null, [binding])
  const sessionState = useSyncExternalStore(sessionSubscribe, sessionSnapshot)
  const running = sessionState?.running === true

  // Host inbox projection: queued prompts are not in the event window until the
  // Host admits them, so the dock needs this separate source.
  const queueItems = useInboxQueue(binding)
  const contextPressure = useProjectionFace(binding, 'contextPressure')
  const occupancy = contextOccupancy(contextPressure)

  // Official approval / question packages publish their pending objects here;
  // one registry entry per Session, and answer() is the object's own method.
  const pending = usePendingInteraction(uiSession, sessionId)
  const { controls, metaError } = useComposerSeats(remote, binding, sessionId)

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
      setError(t('cell.loadError.timeout', { sec: OPEN_TIMEOUT_MS / 1000 }))
    }, OPEN_TIMEOUT_MS)
    const finish = () => clearTimeout(openTimerRef.current)
    // Serialize the history open: concurrent opens leave some unsettled.
    enqueueOpen(() => {
      if (cancelled) return Promise.resolve()
      try {
        reference = sessions.retain(sessionId, {
          source: 'controllerOperation',
          signal: controller.signal,
        })
        refRef.current = reference
        return Promise.resolve(reference.ready).then(
          (b) => {
            if (cancelled) return
            finish()
            setBinding(b)
          },
          (e) => {
            if (cancelled) return
            finish()
            setError(String(e))
          },
        )
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
  }, [events.length, running])

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
        sess
          .loadOlder()
          .then(() => {
            // Keep the reader's place: the prepended page adds height above.
            const grown = bodyRef.current
            if (grown) grown.scrollTop += grown.scrollHeight - before
          })
          .catch(() => {})
      }
    }
  }, [binding])

  if (!sessionId) {
    return h(
      'div',
      {
        style: {
          textAlign: 'center',
          marginTop: 40,
          color: 'var(--dsw-alias-label-caption, #999)',
          flex: 1,
        },
      },
      t('split.cell.pickFromAbove'),
    )
  }
  if (error) {
    return h(
      'div',
      { style: { padding: 12, flex: 1, color: 'var(--dsw-alias-label-secondary, #888)' } },
      h('div', { style: { marginBottom: 8 } }, t('cell.loadError.generic', { error })),
      h(
        'button',
        {
          style: { ...retryBtnStyle, alignSelf: 'flex-start' },
          onClick: () => {
            setError(null)
            setBinding(null)
            setRetry((n) => n + 1)
          },
        },
        t('cell.retry'),
      ),
    )
  }
  if (!cataloged) {
    return h(
      'div',
      { style: { padding: 12, color: 'var(--dsw-alias-label-secondary, #888)', flex: 1 } },
      t('cell.loading.waiting'),
    )
  }
  if (!binding) {
    return h(
      'div',
      { style: { padding: 12, color: 'var(--dsw-alias-label-secondary, #888)', flex: 1 } },
      t('cell.loading'),
    )
  }

  // The binding's window already pages history, so render it whole: capping the
  // slice here only hid messages the reader had already loaded. The window is
  // folded into rows because a live Assistant attempt arrives as one transient
  // entry per token; drawing those one-to-one put every token in its own
  // paragraph (see transcript.js).
  const visible = events
  const rows = groupProcessRows(buildTranscript(visible, t))
  const railItems = turnRailItems(visible)

  return h(
    React.Fragment,
    null,
    // The scrollport and the turn rail share this box: the rail must not scroll
    // with the transcript, so it sits beside the scroller, not inside it.
    h(
      'div',
      {
        style: {
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
        },
      },
      h(
        'div',
        {
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
        rows.map((row) => h(TranscriptRow, { key: row.key, row, session: binding.session })),
        running ? h(RunningStatus, { text: runningHint(visible, t) }) : null,
        h(TurnRail, { items: railItems, bodyRef, session: binding.session }),
      ),
    ),
    // Image previews need the Composer's unmount hook, so the images live there;
    // the typed text stays in this cell's state because the old bar kept it
    // across a session switch on the same tile.
    h(QueueDock, { items: queueItems, session: binding.session }),
    h(PendingSeat, {
      pending,
      t,
      composer: h(Composer, {
        session: binding.session,
        text: inputText,
        onText: setInputText,
        running,
        fileUpload,
        occupancy,
        controls,
        metaError,
        remote,
      }),
    }),
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
    color:
      tone === 'warn'
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

  return h(
    'div',
    {
      style: pickerDialogStyles.backdrop,
      onMouseDown: (event) => {
        if (event.target === event.currentTarget) props.onCancel()
      },
    },
    h(
      'div',
      {
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
      h(
        'div',
        { style: pickerDialogStyles.actions },
        h(
          'button',
          {
            ref: cancelRef,
            type: 'button',
            style: pickerDialogStyles.button(false),
            onClick: props.onCancel,
          },
          t('composer.cancel'),
        ),
        h(
          'button',
          {
            type: 'button',
            style: pickerDialogStyles.button(true),
            onClick: props.onConfirm,
          },
          props.confirmLabel,
        ),
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
      title: t('split.dialog.unlock.title', { count }),
      body: t('split.dialog.unlock.body', { max: maxCells, count }),
      note: t('split.dialog.unlock.note', { count }),
      confirmLabel: t('split.dialog.unlock.btn'),
      onCancel,
      onConfirm,
    })
  }
  return h(GridDialog, {
    title: t('split.dialog.confirm.title', { count }),
    body: t('split.dialog.confirm.body', { confirm: confirmCells }),
    note: t('split.dialog.confirm.note', { count }),
    confirmLabel: t('split.dialog.confirm.btn'),
    onCancel,
    onConfirm,
  })
}

/** 10 × 10 hoverable square grid; arrows move the preview, Enter applies it. */
function GridChoiceGrid(props) {
  const { preview, maxCells, confirmCells, onPreview, onChoose, focusTick } = props
  const gridRef = useRef(null)
  const previewCount = preview.rows * preview.cols
  const tone =
    previewCount > maxCells ? 'blocked' : previewCount > confirmCells ? 'confirm' : 'active'
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
      cells.push(
        h('button', {
          key: `${r}.${c}`,
          type: 'button',
          tabIndex: -1,
          'aria-label': t('aria.gridCell', { rows: r, cols: c, count }),
          style: pickerStyles.cell(state),
          onMouseEnter: () => onPreview({ rows: r, cols: c }),
          onClick: () => onChoose(r, c),
        }),
      )
    }
  }

  return h(
    'div',
    {
      ref: gridRef,
      role: 'group',
      'aria-label': t('aria.chooseGrid'),
      tabIndex: 0,
      style: pickerStyles.grid,
      onKeyDown,
    },
    cells,
  )
}

/** Hint line: what clicking the highlighted block will do. */
function pickerHint(blocked, confirm, maxCells, confirmCells) {
  if (blocked) return { tone: 'warn', text: t('split.grid.hint.blocked', { max: maxCells }) }
  if (confirm) return { tone: 'warn', text: t('split.grid.hint.confirm', { count: confirmCells }) }
  return { tone: 'muted', text: t('split.grid.hint.max', { count: confirmCells }) }
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

  const close = useCallback(
    (refocus) => {
      onOpenChange(false)
      setPreview(null)
      if (refocus) anchorRef?.current?.focus()
    },
    [anchorRef, onOpenChange],
  )

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

  const commit = useCallback(
    (nextRows, nextCols) => {
      onApply(nextRows, nextCols)
      setDialog(null)
      close(true)
    },
    [onApply, close],
  )

  const choose = useCallback(
    (nextRows, nextCols) => {
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
    },
    [maxCells, confirmCells, rows, cols, commit],
  )

  const dialogNode =
    dialog === null
      ? null
      : h(GridPickerDialog, {
          dialog,
          maxCells,
          confirmCells,
          onCancel: closeDialog,
          onConfirm: () => {
            if (dialog.kind === 'confirm') commit(dialog.rows, dialog.cols)
            else closeDialog()
          },
        })

  return h(
    React.Fragment,
    null,
    open
      ? h(
          'div',
          {
            ref: panelRef,
            role: 'dialog',
            'aria-label': t('split.grid.pick'),
            style: {
              ...pickerStyles.panel,
              top: anchor === null ? 0 : anchor.top,
              left: anchor === null ? 0 : anchor.left,
            },
          },
          h(
            'div',
            { style: pickerStyles.caption },
            t('split.grid.preview.caption', { rows: shown.rows, cols: shown.cols }),
            h(
              'span',
              { style: pickerStyles.captionMeta },
              ` · ${count} ${t('split.grid.cellSuffix')}`,
            ),
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
        )
      : null,
    dialogNode,
  )
}

// ---------- cell title ----------
// The title doubles as the picker's trigger; the pencil beside it renames the
// Session itself through the session face (`rename`), which republishes the
// title projection the list already renders.

const titleStyles = {
  dot: (running) => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
    background: running
      ? 'var(--dsw-alias-state-success, #4caf50)'
      : 'var(--dsw-alias-label-caption, #999)',
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
    width: 30,
    height: 30,
    marginLeft: 4,
    padding: 0,
    border: 'none',
    borderRadius: 'var(--dsw-radius-sm, 6px)',
    background: hover
      ? 'var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.16))'
      : 'transparent',
    color: hover
      ? 'var(--dsw-alias-label-primary, inherit)'
      : 'var(--dsw-alias-label-tertiary, #999)',
    cursor: 'pointer',
    fontSize: 17,
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
  useEffect(
    () => () => {
      aliveRef.current = false
    },
    [],
  )

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
    const settle = () => {
      if (aliveRef.current) setSaving(false)
    }
    const timer = setTimeout(settle, RENAME_TIMEOUT_MS)
    Promise.resolve(face.rename(next))
      .then(settle, settle)
      .finally(() => clearTimeout(timer))
  }

  return h(
    React.Fragment,
    null,
    h('span', { style: titleStyles.dot(running) }),
    editing
      ? h('input', {
          autoFocus: true,
          value: draft,
          'aria-label': t('split.cell.rename.tooltip'),
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
      : h(
          'button',
          {
            type: 'button',
            title: saving ? t('split.cell.rename.saving') : t('split.session.picker.aria'),
            style: { ...titleStyles.text, opacity: saving ? 0.5 : 1 },
            onClick: openPicker,
          },
          title,
        ),
    editing
      ? null
      : h(
          'button',
          {
            type: 'button',
            title: t('split.cell.rename.tooltip'),
            'aria-label': t('split.cell.rename.tooltip'),
            style: titleStyles.action(hover),
            onMouseEnter: () => setHover(true),
            onMouseLeave: () => setHover(false),
            onClick: () => {
              setDraft(title)
              setEditing(true)
            },
          },
          '✎',
        ),
  )
}

// ---------- cell picker ----------
// A native <select> kept for its keyboard handling and system popup. The header
// already shows the session title, so the visible affordance is a chevron in a
// small bordered seat; it used to be a 9px glyph that readers could not see.
// The transparent <select> covers the whole seat, so clicking anywhere opens the
// system popup with a much larger hit target than the glyph suggests.

const cellPickerStyles = {
  wrap: (hover) => ({
    position: 'relative',
    flex: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 30,
    marginLeft: 6,
    border: '0.5px solid var(--dsw-alias-border-l2, #555)',
    borderRadius: 'var(--dsw-radius-sm, 6px)',
    background: hover
      ? 'var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.16))'
      : 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.08))',
    color: hover
      ? 'var(--dsw-alias-label-primary, inherit)'
      : 'var(--dsw-alias-label-secondary, #999)',
    cursor: 'pointer',
  }),
  glyph: {
    fontSize: 16,
    lineHeight: 1,
    pointerEvents: 'none',
    transform: 'translateY(-1px)',
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
  return h(
    'span',
    {
      style: cellPickerStyles.wrap(hover),
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
    },
    h('span', { style: cellPickerStyles.glyph, 'aria-hidden': true }, '▾'),
    h(
      'select',
      {
        style: cellPickerStyles.select,
        value: props.value,
        'aria-label': t('split.session.picker.aria'),
        onChange: (e) => props.onChange(e.target.value || null),
      },
      h('option', { value: '' }, props.placeholder),
      props.options.map((s) =>
        h(
          'option',
          { key: s.id, value: s.id },
          (s.displayTitle || s.title || s.id.slice(0, 8)) +
            (s.running ? t('split.session.running') : ''),
        ),
      ),
    ),
  )
}

// ---------- split grid panel ----------
function SplitMain(props) {
  const sessions = props.__sessions
  const workspaces = props.__workspaces
  const fileUpload = props.__fileUpload
  const uiSession = props.__uiSession
  const remote = props.__remote
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
    setZooms((prev) => stepZoom(prev, index, delta))
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
    return () =>
      unsubs.forEach((u) => {
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
  const sessionsOfWorkspace = useCallback(
    (workspaceId) => {
      const ws = workspaceItems.find((w) => String(w.workspaceId) === workspaceId)
      if (!ws) return []
      const ranked = []
      for (const id of ws.sessionIds ?? []) {
        const row = list?.byId?.[id]
        if (row && !row.blank) ranked.push(row)
      }
      return ranked
    },
    [workspaceItems, list],
  )

  /**
   * Resolve one drop into a cell assignment. Both sidebar row kinds publish a
   * bare id on `text/plain` (a Session id, or a Workspace id for a project
   * row), so the id is looked up in each catalog: Session first, then Workspace.
   * @param raw - dataTransfer text.
   * @returns the cell to assign, or null when the payload belongs to neither.
   */
  const cellFromDrop = useCallback(
    (raw) => {
      const payload = String(raw ?? '').trim()
      if (!payload) return null
      if (list?.byId?.[payload]) return { t: 'session', id: payload }
      const ws = workspaceItems.find((w) => String(w.workspaceId) === payload)
      if (!ws) return null
      const workspaceId = String(ws.workspaceId)
      const first = sessionsOfWorkspace(workspaceId)[0]
      return { t: 'workspace', ws: workspaceId, id: first?.id ?? null }
    },
    [list, workspaceItems, sessionsOfWorkspace],
  )

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
    minHeight: 36,
    padding: '8px 12px',
    borderBottom: '0.5px solid var(--dsw-alias-border-l3, #444)',
    fontSize: 15,
    lineHeight: '20px',
    fontWeight: 600,
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

  return h(
    'div',
    { style: gridStyle },
    Array.from({ length: total }, (_, i) =>
      h(SplitCell, {
        key: i,
        index: i,
        cell: cells[i],
        sessions,
        fileUpload,
        uiSession,
        remote,
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
          // Clear the drop highlight here: a successful drop often lands without a
          // following dragleave, which would leave the tile looking hovered.
          setDragOver(-1)
          const next = cellFromDrop(raw)
          if (next) setCell(i, next)
        },
        onPick: (id) => {
          const cell = cells[i]
          setCell(
            i,
            id === null
              ? null
              : cell?.t === 'workspace'
                ? { t: 'workspace', ws: cell.ws, id }
                : { t: 'session', id },
          )
        },
        onZoom: (delta) => zoomIn(i, delta),
      }),
    ),
  )
}

/**
 * One grid tile: shell, drag target, zoomed contents.
 * @param props - cell assignment, catalogs, styles, and the cell's handlers.
 */
function SplitCell(props) {
  const {
    index,
    cell,
    sessions,
    fileUpload,
    uiSession,
    remote,
    nonBlank,
    workspaceItems,
    sessionsOfWorkspace,
    active,
    dragOver,
    zoom,
    cellStyle,
    headerStyle,
    onActivate,
    onDragOverCell,
    onDragLeaveCell,
    onDropCell,
    onPick,
    onZoom,
  } = props
  const sid = cell?.id ?? null
  const sess = sid === null ? null : (nonBlank.find((s) => s.id === sid) ?? null)
  // A Workspace cell offers only that Workspace's Sessions in its picker.
  const options = cell?.t === 'workspace' ? sessionsOfWorkspace(cell.ws) : nonBlank
  const wsTitle =
    cell?.t === 'workspace'
      ? (workspaceItems.find((w) => String(w.workspaceId) === cell.ws)?.title ??
        t('split.workspace.title'))
      : null

  return h(
    'div',
    {
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
    h(
      CellZoom,
      { zoom, onZoom },
      h(
        'div',
        {
          style: {
            ...headerStyle,
            background: active
              ? 'var(--dsw-alias-interactive-bg-hover, #2f3b4a)'
              : 'var(--dsw-alias-bg-layer-1, transparent)',
          },
        },
        sess
          ? h(CellTitle, {
              sessions,
              sessionId: sess.id,
              title: sess.displayTitle || sess.title || sess.id.slice(0, 8),
              running: sess.running,
            })
          : h(
              'span',
              {
                style: {
                  flex: '1 1 auto',
                  color: 'var(--dsw-alias-label-caption, #999)',
                  whiteSpace: 'nowrap',
                },
              },
              t('split.cell.empty.placeholder', { n: index + 1 }),
            ),
        h(CellPicker, {
          value: sid ?? '',
          placeholder:
            wsTitle === null
              ? t('split.session.pick')
              : t('split.session.pickScoped', { ws: wsTitle }),
          options,
          onChange: onPick,
        }),
      ),
      cell?.t === 'workspace' && sess === null
        ? h(
            'div',
            { style: { flex: 1, padding: 12, color: 'var(--dsw-alias-label-secondary, #888)' } },
            options.length === 0
              ? t('split.workspace.empty', { ws: wsTitle })
              : t('split.cell.pickFromAbove'),
          )
        : h(CellView, { sessions, sessionId: sid, fileUpload, uiSession, remote }),
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
  return h(
    'div',
    { style: limitsRowStyles.row },
    h('span', { style: limitsRowStyles.label }, t('split.settings.row.label')),
    h(
      'label',
      { style: limitsRowStyles.field },
      t('split.settings.row.maxLabel'),
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
    h(
      'label',
      { style: limitsRowStyles.field },
      t('split.settings.row.confirmLabel'),
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
    h('span', { style: limitsRowStyles.hint }, t('split.settings.row.hint')),
  )
}

export const inject = [
  'slots',
  'layout',
  'sessions',
  'workspaces',
  'fileUpload',
  'uiSession',
  'remote',
  'remote.session',
  'remote.permissionPresets',
  'remote.fileReferences',
  'remote.sessionReferenceResolver',
]

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
  ctx.effect(
    () => () => {
      try {
        delete window.__dswsToggle
        delete window.__dswsInSplit
      } catch (_e) {}
    },
    'workspace-split: cleanup',
  )

  // Placement of the sidebar control, keyed on the shell's collapsed attribute.
  ctx.effect(() => installSplitStyles(), 'workspace-split: styles')

  // The one control for the whole feature: left click toggles the view, right
  // click opens the grid picker, hover says so.
  ctx.slots.inject('sidebar.footer.action', () =>
    ctx.slots.register(
      {
        name: 'sidebar.footer.action',
        id: 'workspace-split-sidebar',
        order: 5,
      },
      function SidebarEntry() {
        const limits = useSyncExternalStore(subscribeLimits, getLimits)
        return h(SidebarSplitControl, {
          maxCells: limits.maxCells,
          confirmCells: limits.confirmOverCells,
        })
      },
    ),
  )

  ctx.slots.inject('conversation.hero.options', () =>
    ctx.slots.register(
      {
        name: 'conversation.hero.options',
        id: 'workspace-split-btn-hero',
        order: 5,
      },
      SplitButton,
    ),
  )

  // The browser half cannot read cordis.patch.yml, so the cap lives in General
  // settings; this row is the unlock entry the picker points at.
  ctx.slots.inject('settings.general.item', () =>
    ctx.slots.register(
      {
        name: 'settings.general.item',
        id: 'workspace-split-limits',
        order: 30,
      },
      LimitsRow,
    ),
  )

  const sessionsRef = ctx.sessions
  const workspacesRef = ctx.workspaces
  const fileUploadRef = ctx.fileUpload
  const uiSessionRef = ctx.uiSession
  const remoteRef = ctx.remote
  ctx.slots.inject('main', () =>
    ctx.slots.register(
      {
        name: 'main',
        key: 'split',
      },
      function SplitPanel() {
        return h(SplitMain, {
          __sessions: sessionsRef,
          __workspaces: workspacesRef,
          __fileUpload: fileUploadRef,
          __uiSession: uiSessionRef,
          __remote: remoteRef,
        })
      },
    ),
  )

  // Auto-enter the split panel after the panel row is registered.
  if (inSplit) {
    try {
      ctx.layout.selectPanel('split')
    } catch (_e) {}
  }
}

// A guarded seam for the browser regression suite: the page can render one
// component with fake data without a live Session or approval. It is inert
// unless the URL carries `dsws-test` or the test sets the matching localStorage
// flag before navigation (the app rewrites the URL and drops the query).
if (
  typeof window !== 'undefined' &&
  (new URLSearchParams(window.location.search).has('dsws-test') ||
    window.localStorage?.getItem('dsws-test') === '1')
) {
  const fixtures = {
    approval: ApprovalCard,
    question: QuestionCard,
    process: ProcessGroup,
    meta: ComposerMeta,
    mention: MentionPopup,
    model: ModelControl,
    permission: PermissionControl,
    files: DraftFileStrip,
  }
  window.__dswsTest = {
    render(name, node, props = {}) {
      const Component = fixtures[name]
      if (Component === undefined || node === null) throw new Error(`unknown fixture: ${name}`)
      createRoot(node).render(h(Component, { ...props, t, lang: 'zh' }))
    },
  }
}
