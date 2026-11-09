/**
 * Track floors for the split grid.
 *
 * The rules under test are the ones the gutter drag leans on: a track is as
 * narrow as its strictest cell allows, the floor grows with a magnified cell
 * and shrinks with a reduced one, and a fresh grid gets the plain 18-character
 * and 4-line floors.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  MIN_CHARS,
  MIN_LINES,
  columnMins,
  rowMins,
} from '../packages/dsh-workspace-split/src/grid-limits.js'

const FONT = 15
const LINE = 22

describe('columnMins', () => {
  it('gives every column the plain character floor', () => {
    const mins = columnMins([1, 1, 1, 1], 2, 2, FONT)
    assert.equal(mins.length, 2)
    for (const value of mins) assert.equal(value, Math.round(MIN_CHARS * FONT + 24))
  })

  it('raises a whole column when one of its cells was magnified', () => {
    const base = columnMins([1, 1, 1, 1], 2, 2, FONT)
    const zoomed = columnMins([1.4, 1, 1, 1], 2, 2, FONT)
    assert.ok(zoomed[0] > base[0])
    assert.equal(zoomed[1], base[1])
  })

  it('lowers a column when its cells were reduced', () => {
    const base = columnMins([1, 1, 1, 1], 2, 2, FONT)
    const reduced = columnMins([0.8, 1, 0.8, 1], 2, 2, FONT)
    assert.ok(reduced[0] < base[0])
  })

  it('ignores gaps and a grid with no columns', () => {
    assert.deepEqual(columnMins([], 0, 0, FONT), [])
    const sparse = columnMins([null, 1, undefined, 1], 2, 2, FONT)
    assert.equal(sparse.length, 2)
  })
})

describe('rowMins', () => {
  const HEADER = 36

  it('reserves the header strip on top of the lines', () => {
    const mins = rowMins([1, 1, 1, 1], 2, 2, { linePx: LINE, headerPx: HEADER })
    assert.equal(mins.length, 2)
    for (const value of mins) assert.equal(value, HEADER + Math.round(MIN_LINES * LINE))
  })

  it('keeps the header once, not per line', () => {
    const mins = rowMins([1, 1, 1, 1], 2, 2, { linePx: LINE, headerPx: HEADER })
    assert.ok(mins[0] > MIN_LINES * LINE, 'a row must be taller than its text alone')
  })

  it('follows the strictest cell in the row', () => {
    const mins = rowMins([1, 1.5, 1, 1], 2, 2, { linePx: LINE, headerPx: HEADER })
    assert.ok(mins[0] > mins[1])
  })

  it('returns nothing for an empty grid', () => {
    assert.deepEqual(rowMins([], 0, 0, { linePx: LINE, headerPx: HEADER }), [])
  })
})
