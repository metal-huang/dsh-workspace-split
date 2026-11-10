/**
 * Cell text scaling rules.
 *
 * A sparse override list used to round-trip through JSON as nulls, and reading a
 * null as a number gave the floor instead of "automatic", so reloading shrank
 * cells the reader never touched. These tests pin the round-trip and the bounds.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  ZOOM_AUTO_FLOOR,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  autoZoomForWidth,
  effectiveZoom,
  savedZooms,
  stepZoom,
} from '../packages/dsh-workspace-split/src/zoom.js'

describe('autoZoomForWidth', () => {
  it('keeps the desktop size at and above the reference width', () => {
    assert.equal(autoZoomForWidth(820), 1)
    assert.equal(autoZoomForWidth(1600), 1)
  })

  it('shrinks below the reference width but never past the floor', () => {
    // 410 / 820 is 0.5, which is under the floor, so the floor wins.
    assert.equal(autoZoomForWidth(410), ZOOM_AUTO_FLOOR)
    assert.equal(autoZoomForWidth(1), ZOOM_AUTO_FLOOR)
    assert.equal(autoZoomForWidth(0), 1, 'an unlaid-out cell keeps the neutral size')
    assert.equal(autoZoomForWidth(-10), 1)
    assert.equal(autoZoomForWidth(Number.NaN), 1)
  })

  it('scales proportionally just above the floor', () => {
    const width = 700
    assert.equal(autoZoomForWidth(width), width / 820)
  })
})

describe('savedZooms', () => {
  it('treats a JSON null hole as automatic, not as the floor', () => {
    // A sparse list serialises to nulls; reading them as numbers would give 0.
    assert.deepEqual(savedZooms({ zooms: [1.3, null, null, null, 1.05] }), [1.3, 1, 1, 1, 1.05])
  })

  it('clamps stored values into range and rejects junk', () => {
    assert.deepEqual(savedZooms({ zooms: [0.1, 9, '0.9', 'x', 0, -2] }), [
      ZOOM_MIN,
      ZOOM_MAX,
      0.9,
      1,
      1,
      1,
    ])
  })

  it('returns an empty list for a missing record', () => {
    assert.deepEqual(savedZooms(null), [])
    assert.deepEqual(savedZooms({}), [])
    assert.deepEqual(savedZooms({ zooms: 'nope' }), [])
  })
})

describe('stepZoom', () => {
  it('fills the gap so the result never serialises to nulls', () => {
    const next = stepZoom([], 4, ZOOM_STEP)
    assert.equal(next.length, 5)
    assert.deepEqual(next.slice(0, 4), [1, 1, 1, 1])
    assert.equal(next[4], 1 + ZOOM_STEP)
    assert.equal(JSON.stringify(next).includes('null'), false)
  })

  it('moves only the target cell', () => {
    const next = stepZoom([1, 1, 1], 1, -ZOOM_STEP)
    assert.deepEqual(next, [1, 1 - ZOOM_STEP, 1])
  })

  it('saturates at both bounds', () => {
    let high = [1]
    for (let i = 0; i < 100; i += 1) high = stepZoom(high, 0, ZOOM_STEP)
    assert.equal(high[0], ZOOM_MAX)
    let low = [1]
    for (let i = 0; i < 100; i += 1) low = stepZoom(low, 0, -ZOOM_STEP)
    assert.equal(low[0], ZOOM_MIN)
  })
})

describe('effectiveZoom', () => {
  it('multiplies the automatic factor by the override', () => {
    assert.equal(effectiveZoom(0.788761, 1), 0.788761)
    assert.equal(effectiveZoom(1, 1.2), 1.2)
  })

  it('stays inside the bounds even when the product leaves them', () => {
    assert.equal(effectiveZoom(ZOOM_AUTO_FLOOR, ZOOM_MAX), ZOOM_AUTO_FLOOR * ZOOM_MAX)
    assert.equal(effectiveZoom(1, 99), ZOOM_MAX)
    assert.equal(effectiveZoom(0.1, 0.1), ZOOM_MIN)
  })
})
