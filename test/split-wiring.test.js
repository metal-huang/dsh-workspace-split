/**
 * Source-shape guard for wiring that lives inside the React tree.
 *
 * Clearing the completed dot hangs off `SplitCell`'s `onMouseDown`, and the
 * archive filter hangs off the stale-reference effect in `SplitMain`. Slash
 * admission and the frozen draft live in `Composer`. These are plain lines of
 * JSX/effect code: they only run against a live DSH page, and a unit test cannot
 * mount one here. Deleting one is therefore silent — the module tests stay green
 * while the feature stops working.
 *
 * So the guard asserts the wiring itself, against the real source of
 * `src/client.js`, with whitespace collapsed (Prettier may re-wrap a line).
 * Matching is case-sensitive on purpose: `onMouseDown: onActivate` is the
 * reverted wiring, and a case-insensitive or bare-identifier match would keep
 * this guard green through exactly that revert. The acknowledged cost: these
 * fragments are tied to the current source shape, so re-writing this code means
 * updating the fragment — which is the point of a shape guard.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

const CLIENT = join(
  import.meta.dirname,
  '..',
  'packages',
  'dsh-workspace-split',
  'src',
  'client.js',
)

const SOURCE = readFileSync(CLIENT, 'utf8')

/** Collapse every whitespace run to one space so a Prettier re-wrap still matches. */
function normalize(text) {
  return text.replace(/\s+/g, ' ').trim()
}

/** How many times `fragment` occurs; `String.includes` alone cannot tell a second copy. */
function occurrences(text, fragment) {
  return text.split(fragment).length - 1
}

/**
 * The wirings, each exactly once:
 * - a click on a tile acknowledges the unread marker it shows;
 * - a released cell is decided by the same step that drops stale Sessions,
 *   which is what lets the archive set release a tile the catalog still lists;
 * - one archive Set per Workspace snapshot, so that effect can depend on it.
 */
const WIRING = [
  'onMouseDown: activate',
  'acknowledgeUnread(uiSession, sid)',
  'setCells((prev) => reconcileCells(prev, known, archived))',
  'const archived = useMemo(() => archivedSessionIds(wsState), [wsState])',
  'admission = await admitSlashLine(session, remote.skills, text.trim(), hasAttachments)',
  'readOnly: sending',
  'latestSessionRef = useRef(session) useLayoutEffect(() => { latestSessionRef.current = session }, [session])',
  'outcome = await promptWhileCurrent( session, isCurrentSession, async () => {',
  'const readSendMode = useCallback(',
  '() => sendMode(readBusyEnter?.(), readRunning?.() === true)',
  'const readRunning = useCallback(',
  'runningState(sessions.list.getSnapshot(), sessionId, binding?.session?.getSnapshot() ?? null)',
  "'configForms',",
  "const conversationForm = ctx.configForms?.get?.('ui-conversation')",
  "return snapshot?.status === 'ready' ? snapshot.value?.busyEnter : undefined",
  'const cancelling = useRef(false)',
  'const handler = createEscapeStopHandler({',
  "document.addEventListener('keydown', handler.onKeyDown, true)",
  'belongsToCell: (event) => escapeBelongsToCell(event, textareaRef),',
  'const stopSequenceMs = ctx.shortcuts.stopSequenceMs',
  'frozen: dragging > 0',
  'if (frozen) return if (!event.ctrlKey) return',
  'readMetrics() const sizePx = extentOf()',
  'const delta = gutterKeyDelta(axis, event.key)',
  'onChange(commitRatios(state.next, ratios))',
  'onLostPointerCapture: () => stop(false)',
  "const summary = processSummary(group.items, { reasoning: t('reasoning.label') })",
  'h(ReasoningItem, { key: item.key, item })',
  "h('div', { style: reasoningStyles.body, 'data-dsws-reasoning': 'true' }, item.text)",
]

describe('split-cell wiring', () => {
  const source = normalize(SOURCE)

  for (const fragment of WIRING) {
    it(`keeps ${fragment} exactly once`, () => {
      assert.equal(
        occurrences(source, fragment),
        1,
        `src/client.js must carry ${JSON.stringify(fragment)} exactly once`,
      )
    })
  }

  it('keeps the reshape hook above the single-track early return', () => {
    const hook = source.indexOf(
      'useEffect(() => { if (drag.current !== null && drag.current.ratios.length !== ratios.length) stop(false)',
    )
    const earlyReturn = source.indexOf('if (ratios.length < 2) return null')
    assert.ok(hook >= 0 && earlyReturn > hook)
  })

  it('keeps reasoning in the process group instead of dropping it', () => {
    // PR #3 merged the contributor's tool-only body. This fails if that step
    // comes back: a reasoning-only group must render, not return null.
    assert.equal(occurrences(source, 'if (toolItems.length === 0) return null'), 0)
    assert.equal(occurrences(source, 'toolItems'), 0)
    assert.ok(source.includes('data-dsws-reasoning-row'))
  })

  it('counts both axis drags instead of storing one boolean', () => {
    const fragment =
      'onDraggingChange: (active) => setDragging((count) => Math.max(0, count + (active ? 1 : -1)))'
    assert.equal(occurrences(source, fragment), 2)
  })

  it('goes red when the wiring is reverted', () => {
    // Same normalization, one revert: this is the failure the guard exists for.
    const reverted = source.replace('onMouseDown: activate', 'onMouseDown: onActivate')
    assert.equal(occurrences(reverted, 'onMouseDown: activate'), 0)
    // The import line carries the identifier but not the call, so the call-shaped
    // fragment cannot be satisfied by an import alone.
    const withoutCall = source.replace('acknowledgeUnread(uiSession, sid)', '')
    assert.equal(occurrences(withoutCall, 'acknowledgeUnread(uiSession, sid)'), 0)
  })
})
