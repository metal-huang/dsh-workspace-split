/**
 * Sidebar control placement.
 *
 * The control sits in the footer-actions row but must read as part of the
 * account row below it. A fixed translateY assumed both rows' heights, and the
 * shell's own footer changed under it — the control ended up floating between
 * the footer icons and the account row. These tests pin the arithmetic that
 * replaced the constant.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { centerOffset } from '../packages/dsh-workspace-split/src/layout.js'

/** A viewport box with only the fields the placement math reads. */
const box = (top, height) => ({ top, height })

describe('centerOffset', () => {
  it('moves a control down onto a row that sits below it', () => {
    // Measured from a screenshot of the reported misalignment: the 28px control
    // sat at 713.7..741.7 CSS px while the account row ran 753.7..822.3.
    assert.ok(Math.abs(centerOffset(box(713.7, 28), box(753.7, 68.6)) - 60.3) < 1e-9)
  })

  it('reproduces the constant the web layout used to need', () => {
    // Web profile: a 28px actions row above a 52px account row, which the old
    // fixed translateY(40px) matched exactly. That is why the control looked
    // right in the browser and floated between rows in the desktop client,
    // whose footer is taller (mobile-access button, roomier account row).
    assert.equal(centerOffset(box(700, 28), box(728, 52)), 40)
  })

  it('returns zero when the boxes are already centred', () => {
    assert.equal(centerOffset(box(100, 28), box(100, 28)), 0)
    assert.equal(centerOffset(box(90, 20), box(80, 40)), 0)
  })

  it('moves up when the control sits below the row', () => {
    assert.equal(centerOffset(box(200, 28), box(100, 40)), -94)
  })

  it('refuses to guess for an unlaid-out box', () => {
    assert.equal(centerOffset(box(0, 0), box(100, 40)), 0)
    assert.equal(centerOffset(box(100, 28), box(0, 0)), 0)
    assert.equal(centerOffset(null, box(100, 40)), 0)
    assert.equal(centerOffset(box(100, 28), undefined), 0)
  })
})
