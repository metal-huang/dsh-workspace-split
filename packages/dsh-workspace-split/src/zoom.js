/**
 * Cell text scaling.
 *
 * A tile renders at the app's own text size. The reader can magnify one tile
 * with ctrl+wheel, and that override is persisted per cell. Nothing scales the
 * text by itself: a width-driven factor made two tiles of different widths show
 * different sizes, and recomputed the size on every frame of a gutter drag.
 *
 * Kept free of React and DOM so the rules can be tested directly.
 */

/** Inclusive bounds for a reader's override. */
export const ZOOM_MIN = 0.6
export const ZOOM_MAX = 1.6
/** Wheel step for the per-cell override. */
export const ZOOM_STEP = 0.05

/** Clamp one override into the allowed range. */
function clampZoom(value) {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, value))
}

/**
 * Read persisted overrides.
 *
 * A sparse array round-trips through JSON as null, and `Number(null)` is 0,
 * which would clamp to the floor and shrink cells nobody touched. Only a real
 * positive number counts as an override; anything else means "the app's size".
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
 * Scale actually applied to a cell.
 * @param override - the reader's multiplier; 1 means the app's own size.
 * @returns the multiplier inside the allowed range.
 */
export function effectiveZoom(override) {
  return clampZoom(override)
}
