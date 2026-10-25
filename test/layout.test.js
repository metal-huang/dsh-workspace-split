/**
 * Sidebar control placement.
 *
 * The control must read as part of the account row, but the slot system wraps
 * every `sidebar.footer.action` entry in `display: contents` elements. Those
 * wrappers have no box, so the control's DOM parent is not the footer row and
 * its next sibling is another entry (or nothing) — the first attempt to find the
 * row that way centred the control on its own row, which is exactly the
 * misalignment that came back from the desktop client. These tests pin the walk
 * up to the layout container plus the offset arithmetic.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  accountRowOf,
  centerOffset,
  layoutContainer,
} from '../packages/dsh-workspace-split/src/layout.js'

/** A viewport box with only the fields the placement math reads. */
const box = (top, height) => ({ top, height })

/** Minimal element tree: parent link, child list, and sibling wiring. */
function element(display, parent = null) {
  const node = {
    display,
    parentElement: parent,
    nextElementSibling: null,
    children: [],
    get lastElementChild() {
      return this.children.at(-1) ?? null
    },
  }
  if (parent !== null) {
    const previous = parent.children.at(-1)
    if (previous !== undefined) previous.nextElementSibling = node
    parent.children.push(node)
  }
  return node
}

const displayOf = (el) => el.display

describe('accountRowOf', () => {
  it('walks past the display:contents slot wrappers to the footer row', () => {
    // SidebarRoot.module.css: footArea > [footerActions, settingsArea], and the
    // footer action slot renders div[data-slot] + per-entry wrappers, all with
    // display:contents.
    const footArea = element('flex')
    const footerActions = element('flex', footArea)
    const anchor = element('contents', footerActions)
    const firstEntry = element('contents', anchor)
    const button = element('inline-flex', firstEntry)
    // Another plugin's footer action sits next to ours inside the anchor.
    element('contents', anchor)
    const settingsArea = element('flex', footArea)

    assert.equal(layoutContainer(button, displayOf), footerActions)
    assert.equal(accountRowOf(button, displayOf), settingsArea)
  })

  it('still works when the control is a direct child of the footer row', () => {
    const footArea = element('flex')
    const footerActions = element('flex', footArea)
    const button = element('inline-flex', footerActions)
    const settingsArea = element('flex', footArea)

    assert.equal(accountRowOf(button, displayOf), settingsArea)
  })

  it('does not mistake a sibling slot entry for the account row', () => {
    const footArea = element('flex')
    const footerActions = element('flex', footArea)
    const anchor = element('contents', footerActions)
    const entry = element('contents', anchor)
    const button = element('inline-flex', entry)
    const neighbour = element('contents', anchor)
    element('inline-flex', neighbour)

    assert.notEqual(accountRowOf(button, displayOf), neighbour)
    assert.equal(accountRowOf(button, displayOf), null)
  })

  it('returns null when the shell provides no following row', () => {
    const body = element('block')
    const wrapper = element('contents', body)
    const button = element('inline-flex', wrapper)
    assert.equal(accountRowOf(button, displayOf), null)
    assert.equal(accountRowOf(null, displayOf), null)
  })
})

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
