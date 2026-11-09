/**
 * Size floors for the split grid, derived from text rather than from a constant.
 *
 * A tile that cannot show a useful number of characters, or a few lines of
 * them, is not worth keeping on screen: the reader would drag it wider anyway.
 * Both floors therefore scale with the text: a tile the reader magnified needs
 * a wider column before its text stops wrapping into confetti, and a tile they
 * shrank can go narrower.
 *
 * Columns and rows are shared across the grid, so a track's floor is the
 * strictest one among the cells it holds.
 *
 * Kept free of React and the DOM so the arithmetic is tested directly.
 */

/** Characters a column must show before a drag stops shrinking it. */
export const MIN_CHARS = 18

/** Text lines a row must keep. */
export const MIN_LINES = 4

/** Horizontal cell chrome (borders and the transcript's own padding) in pixels. */
const CELL_INSET_PX = 24

/**
 * Largest override among the cells of one track.
 * @param zooms - per-cell overrides, sparse and possibly shorter than the grid.
 * @param start - first cell index of the track.
 * @param step - cells per track (1 for rows, the column count for columns).
 * @param end - exclusive upper bound of the cell range.
 * @returns the strictest override, never below 1 when no cell sets one.
 */
function trackZoom(zooms, start, step, end) {
  let max = 0
  for (let i = start; i < end; i += step) {
    const value = Number(zooms[i])
    if (Number.isFinite(value) && value > max) max = value
  }
  return max > 0 ? max : 1
}

/**
 * Narrowest each column may become, in pixels.
 * @param zooms - per-cell text overrides.
 * @param cols - column count.
 * @param rows - row count.
 * @param fontPx - the grid's computed font size; one Chinese glyph is one em.
 * @returns one width per column.
 */
export function columnMins(zooms, cols, rows, fontPx) {
  if (!(cols > 0) || !(fontPx > 0)) return []
  const cells = Math.max(0, rows) * cols
  const out = []
  for (let c = 0; c < cols; c += 1) {
    const zoom = trackZoom(zooms, c, cols, cells)
    out.push(Math.round(MIN_CHARS * fontPx * zoom + CELL_INSET_PX))
  }
  return out
}

/**
 * Shortest each row may become, in pixels.
 *
 * A row holds its tile header plus the text: the header is a fixed strip the
 * reader cannot shrink, so counting only the lines would leave a row that shows
 * a title and no transcript at all.
 * @param zooms - per-cell text overrides.
 * @param cols - column count.
 * @param rows - row count.
 * @param ctx - `linePx` is the grid's line height, `headerPx` the tile header strip.
 * @returns one height per row.
 */
export function rowMins(zooms, cols, rows, ctx) {
  const linePx = ctx?.linePx ?? 0
  const headerPx = ctx?.headerPx ?? 0
  if (!(rows > 0) || !(linePx > 0) || !(cols > 0)) return []
  const out = []
  for (let r = 0; r < rows; r += 1) {
    const zoom = trackZoom(zooms, r * cols, 1, (r + 1) * cols)
    out.push(Math.round(headerPx + MIN_LINES * linePx * zoom))
  }
  return out
}
