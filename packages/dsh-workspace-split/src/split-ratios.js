/**
 * Track-ratio math for the split grid.
 *
 * The grid places its cells with `repeat(count, minmax(0, 1fr))`, which gives
 * every column and row the same size. Dragging a gutter rewrites the two `fr`
 * weights it separates, so the geometry stops being "equal tracks" and becomes
 * a list of weights.
 *
 * Weights are relative rather than pixels: one saved layout renders correctly at
 * any window size, and a drag rewrites only the pair it touches. Floors arrive
 * as pixels from the caller — columns and rows measure their minimum in
 * different units — so this module stays free of text metrics.
 */

/** Smallest weight a track may keep, so a collapsed track never divides by zero. */
const MIN_WEIGHT = 1e-3

/** Round a weight to three decimals, the precision the template string keeps. */
const round3 = (value) => Math.round(value * 1000) / 1000

/**
 * Equal tracks for a fresh grid.
 * @param count - number of columns or rows.
 * @returns `count` weights of 1, or an empty list when `count` is not positive.
 */
export function equalRatios(count) {
  const n = Number.isInteger(count) && count > 0 ? count : 0
  return Array.from({ length: n }, () => 1)
}

/**
 * Coerce a persisted weight list into one that fits the current grid.
 *
 * Older layouts carry no ratio list at all, and a layout saved with three
 * columns may be restored while the grid holds two. Both cases resolve to equal
 * tracks for the missing entries instead of a broken template.
 * @param list - candidate weights from storage; anything else is ignored.
 * @param count - number of tracks the grid currently renders.
 * @returns a fresh array of `count` positive, finite weights.
 */
export function normalizeRatios(list, count) {
  const n = Number.isInteger(count) && count > 0 ? count : 0
  const source = Array.isArray(list) ? list : []
  const out = []
  for (let i = 0; i < n; i += 1) {
    const value = Number(source[i])
    out.push(Number.isFinite(value) && value > 0 ? value : 1)
  }
  return out
}

/**
 * `grid-template-*` value for a weight list.
 *
 * `minmax(0, …)` keeps a track's minimum at zero: a bare `fr` resolves its
 * minimum to `auto`, which lets a long transcript push the grid wider than the
 * panel instead of scrolling inside its cell. The floors a drag respects are
 * applied by {@link resizeTracks}, not here, so the grid never overflows when
 * the panel is too narrow to honour them.
 * @param ratios - weights, one per column or row.
 * @returns the track list, or `none` for an empty grid.
 */
export function ratioTemplate(ratios) {
  if (ratios.length === 0) return 'none'
  return ratios.map((weight) => `minmax(0, ${round3(Math.max(MIN_WEIGHT, weight))}fr)`).join(' ')
}

/**
 * Position of every gutter, as a percentage of the grid size.
 *
 * Tracks are proportional to their weights while every minimum stays at zero,
 * so a percentage places the gutter exactly, with no measurement pass.
 * @param ratios - weights, one per column or row.
 * @returns one percentage per boundary, start to end; empty below two tracks.
 */
export function gutterPercents(ratios) {
  const total = ratios.reduce((sum, weight) => sum + weight, 0)
  if (!(total > 0) || ratios.length < 2) return []
  const out = []
  let acc = 0
  for (let i = 0; i < ratios.length - 1; i += 1) {
    acc += ratios[i]
    out.push((acc / total) * 100)
  }
  return out
}

/**
 * Move one gutter by `deltaPx`, keeping both neighbours at or above their floor.
 *
 * The pair keeps its sum, so dragging one boundary never reflows the tracks it
 * does not separate, and the weights never leave the positive range the
 * template needs.
 * @param ratios - current weights, one per track.
 * @param index - gutter index: it separates tracks `index` and `index + 1`.
 * @param deltaPx - pointer movement in pixels; positive moves the gutter forward.
 * @param ctx - `sizePx` is the measured grid extent, `mins` the per-track floors.
 * @returns new weights, or the input array when the drag cannot apply.
 */
/**
 * Collect the pair a drag can move, or null when this drag cannot apply.
 * @param ratios - current weights.
 * @param index - gutter index.
 * @param sizePx - measured grid extent.
 * @returns the pair and its pixel-per-weight scale, or null.
 */
function movablePair(ratios, index, sizePx) {
  if (index < 0 || index + 1 >= ratios.length) return null
  if (!(sizePx > 0)) return null
  const total = ratios.reduce((sum, weight) => sum + weight, 0)
  if (!(total > 0)) return null
  return { left: ratios[index], right: ratios[index + 1], pxPerWeight: sizePx / total }
}

/**
 * Move one gutter by \`deltaPx\`, keeping both neighbours at or above their floor.
 *
 * The pair keeps its sum, so dragging one boundary never reflows the tracks it
 * does not separate, and the weights never leave the positive range the
 * template needs.
 * @param ratios - current weights, one per track.
 * @param index - gutter index: it separates tracks \`index\` and \`index + 1\`.
 * @param deltaPx - pointer movement in pixels; positive moves the gutter forward.
 * @param ctx - \`sizePx\` is the measured grid extent, \`mins\` the per-track floors.
 * @returns new weights, or the input array when the drag cannot apply.
 */
export function resizeTracks(ratios, index, deltaPx, ctx) {
  const pair = movablePair(ratios, index, ctx?.sizePx ?? 0)
  if (pair === null) return ratios
  const mins = ctx?.mins ?? []
  const { left, right, pxPerWeight } = pair
  // A track already narrower than its floor is not forced to grow: the floor can
  // be unreachable when the panel holds more tracks than it can satisfy.
  const leftFloor = Math.min((mins[index] ?? 0) / pxPerWeight, left)
  const rightFloor = Math.min((mins[index + 1] ?? 0) / pxPerWeight, right)
  const applied = Math.min(right - rightFloor, Math.max(leftFloor - left, deltaPx / pxPerWeight))
  if (applied === 0) return ratios

  const next = ratios.slice()
  next[index] = Math.max(MIN_WEIGHT, left + applied)
  next[index + 1] = Math.max(MIN_WEIGHT, right - applied)
  return next
}
