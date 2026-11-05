/**
 * Cell text scaling rules.
 *
 * A sparse override list used to round-trip through JSON as nulls, and reading a
 * null as a number gave the floor instead of "untouched", so reloading shrank
 * cells the reader never touched. These tests pin the round-trip and the bounds.
 *
 * There is no automatic factor any more: a tile shows the app's text size until
 * the reader changes it.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  effectiveZoom,
  savedZooms,
  stepZoom,
} from '../packages/dsh-workspace-split/src/zoom.js'

describe('savedZooms', () => {
  it('treats a JSON null hole as untouched, not as the floor', () => {
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
  })

  it('moves only the target cell', () => {
    const next = stepZoom([1, 1, 1], 1, -ZOOM_STEP)
    assert.equal(next[0], 1)
    assert.equal(next[1], 1 - ZOOM_STEP)
    assert.equal(next[2], 1)
  })

  it('saturates at both bounds', () => {
    assert.equal(stepZoom([ZOOM_MAX], 0, ZOOM_STEP)[0], ZOOM_MAX)
    assert.equal(stepZoom([ZOOM_MIN], 0, -ZOOM_STEP)[0], ZOOM_MIN)
  })
})

describe('effectiveZoom', () => {
  it('passes a reader multiplier through', () => {
    assert.equal(effectiveZoom(1), 1)
    assert.equal(effectiveZoom(1.2), 1.2)
  })

  it('stays inside the bounds', () => {
    assert.equal(effectiveZoom(99), ZOOM_MAX)
    assert.equal(effectiveZoom(0.1), ZOOM_MIN)
  })
})
