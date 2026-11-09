/**
 * Track-ratio rules for the split grid.
 *
 * The gutter drag is DOM code that only runs against a live panel, so the rules
 * it depends on live in `split-ratios.js` and are pinned here: equal tracks for
 * a fresh grid, a stored list coerced into one that fits, and a drag that keeps
 * both neighbours above their own floor without changing what it does not
 * touch.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  equalRatios,
  gutterPercents,
  normalizeRatios,
  ratioTemplate,
  resizeTracks,
} from '../packages/dsh-workspace-split/src/split-ratios.js'

describe('equalRatios', () => {
  it('gives every track the same weight', () => {
    assert.deepEqual(equalRatios(3), [1, 1, 1])
  })

  it('returns nothing for a grid with no tracks', () => {
    assert.deepEqual(equalRatios(0), [])
    assert.deepEqual(equalRatios(-2), [])
    assert.deepEqual(equalRatios(1.5), [])
  })
})

describe('normalizeRatios', () => {
  it('falls back to equal tracks when the layout predates ratios', () => {
    assert.deepEqual(normalizeRatios(undefined, 2), [1, 1])
  })

  it('keeps valid weights and repairs the rest', () => {
    assert.deepEqual(normalizeRatios([2, 'x', -1, 0], 4), [2, 1, 1, 1])
  })

  it('pads and truncates to the current track count', () => {
    assert.deepEqual(normalizeRatios([3], 3), [3, 1, 1])
    assert.deepEqual(normalizeRatios([3, 2, 1], 2), [3, 2])
  })
})

describe('ratioTemplate', () => {
  it('keeps a zero minimum so a long cell scrolls instead of widening the grid', () => {
    assert.equal(ratioTemplate([1, 2]), 'minmax(0, 1fr) minmax(0, 2fr)')
  })

  it('describes an empty grid as none', () => {
    assert.equal(ratioTemplate([]), 'none')
  })

  it('rounds weights to three decimals', () => {
    assert.equal(ratioTemplate([1.23456]), 'minmax(0, 1.235fr)')
  })
})

describe('gutterPercents', () => {
  it('places one boundary between every two tracks', () => {
    assert.deepEqual(gutterPercents([1, 1]), [50])
    assert.deepEqual(gutterPercents([1, 1, 2]), [25, 50])
  })

  it('has no boundary in a single track or an empty grid', () => {
    assert.deepEqual(gutterPercents([1]), [])
    assert.deepEqual(gutterPercents([]), [])
  })
})

describe('resizeTracks', () => {
  const size = 1000
  const ctx = { sizePx: size, mins: [240, 240] }

  it('moves the pair while keeping its sum', () => {
    const next = resizeTracks([1, 1], 0, 100, ctx)
    assert.deepEqual(next, [1.2, 0.8])
    assert.equal(next[0] + next[1], 2)
  })

  it('stops at each neighbour own floor', () => {
    const next = resizeTracks([1, 1], 0, 1000, ctx)
    const rightPx = (next[1] / (next[0] + next[1])) * size
    assert.ok(rightPx >= 240 - 0.001, `right track ${rightPx}px`)
  })

  it('respects an asymmetric floor', () => {
    const next = resizeTracks([1, 1], 0, 1000, { sizePx: size, mins: [0, 400] })
    const rightPx = (next[1] / (next[0] + next[1])) * size
    assert.ok(rightPx >= 400 - 0.001, `right track ${rightPx}px`)
  })

  it('leaves tracks the drag does not separate untouched', () => {
    const next = resizeTracks([1, 1, 1], 1, 50, { sizePx: 1500, mins: [0, 0, 0] })
    assert.equal(next[0], 1)
    assert.ok(next[1] > 1)
    assert.ok(next[2] < 1)
  })

  it('ignores a drag with no usable size or an unknown gutter', () => {
    const ratios = [1, 1]
    assert.equal(resizeTracks(ratios, 0, 40, { sizePx: 0, mins: [] }), ratios)
    assert.equal(resizeTracks(ratios, 5, 40, ctx), ratios)
    assert.equal(resizeTracks(ratios, 0, 0, ctx), ratios)
  })

  it('works without a floor list', () => {
    const next = resizeTracks([1, 1], 0, 100, { sizePx: size })
    assert.deepEqual(next, [1.2, 0.8])
  })

  it('never returns a weight at or below zero', () => {
    const next = resizeTracks([1, 1], 0, 10000, ctx)
    assert.ok(next[0] > 0 && next[1] > 0)
  })
})
