/**
 * Cell text scaling.
 *
 * A tile renders at the desktop text size only when it is about as wide as the
 * conversation column; narrower tiles shrink so the same screen area keeps
 * showing a useful amount of text. A reader can move one tile by hand with
 * ctrl+wheel, and that override is persisted per cell.
 *
 * Kept free of React and DOM so the rules can be tested directly.
 */

/** Inclusive bounds for a reader's override. */
export const ZOOM_MIN = 0.6
export const ZOOM_MAX = 1.6
/** Wheel step for the per-cell override. */
export const ZOOM_STEP = 0.05
/** Width at or above which a cell keeps the desktop text size. */
export const ZOOM_FULL_WIDTH = 820
/** Smallest automatic scale, so text never gets illegible. */
export const ZOOM_AUTO_FLOOR = 0.78

/**
 * Automatic scale for a cell of this width.
 * @param width - measured pixel width; non-positive means "not laid out yet".
 * @returns scale in [ZOOM_AUTO_FLOOR, 1].
 */
export function autoZoomForWidth(width) {
  const n = Number(width)
  if (!Number.isFinite(n) || n <= 0) return 1
  return Math.max(ZOOM_AUTO_FLOOR, Math.min(1, n / ZOOM_FULL_WIDTH))
}

/** Clamp one override into the allowed range. */
function clampZoom(value) {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, value))
}

/**
 * Read persisted overrides.
 *
 * A sparse array round-trips through JSON as null, and `Number(null)` is 0,
 * which would clamp to the floor and shrink cells nobody touched. Only a real
 * positive number counts as an override; anything else means "automatic".
 * @param saved - persisted layout record.
 * @returns dense list of overrides, 1 meaning untouched.
 */
export function savedZooms(saved) {
  const list = Array.isArray(saved?.zooms) ? saved.zooms : []
  return list.map((value) => {
    if (value === null || value === undefined) return 1
    const n = Number(value)
    return Number.isFinite(n) && n > 0 ? clampZoom(n) : 1
  })
}

/**
 * Apply one step to a cell's override, returning a dense list.
 * @param prev - current overrides.
 * @param index - cell index.
 * @param delta - signed step.
 * @returns a new dense list.
 */
export function stepZoom(prev, index, delta) {
  const source = Array.isArray(prev) ? prev : []
  const size = Math.max(source.length, index + 1)
  const next = Array.from({ length: size }, (_, i) => source[i] ?? 1)
  next[index] = clampZoom(next[index] + delta)
  return next
}

/**
 * Scale actually applied to a cell: the size-driven factor times the override.
 * @param auto - factor from `autoZoomForWidth`.
 * @param override - reader's multiplier.
 */
export function effectiveZoom(auto, override) {
  return clampZoom(auto * override)
}
