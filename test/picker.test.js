/**
 * Session-picker rules.
 *
 * The picker replaced a native `<select>`, so its search, keyboard cursor and
 * panel geometry are ours now; these are the three places a regression would be
 * invisible until someone tried to pick a session in a narrow tile.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  filterPickerRows,
  initialPickerIndex,
  movePickerIndex,
  pickerPanelBox,
  pickerRowOf,
  pickerTitleOf,
  resolvePickerKey,
} from '../packages/dsh-workspace-split/src/picker.js'

const rows = [
  { id: 'a', title: 'Fix the grid', project: 'Split view', running: false },
  { id: 'b', title: 'Write the score', project: 'Music', running: true },
  { id: 'c', title: 'Music notes', project: 'Split view', running: false },
]

describe('filterPickerRows', () => {
  it('matches the title and the project, case-insensitively', () => {
    assert.deepEqual(
      filterPickerRows(rows, 'MUSIC').map((row) => row.id),
      ['b', 'c'],
    )
    assert.deepEqual(
      filterPickerRows(rows, 'score').map((row) => row.id),
      ['b'],
    )
  })

  it('keeps everything for an empty or blank query', () => {
    assert.equal(filterPickerRows(rows, '').length, 3)
    assert.equal(filterPickerRows(rows, '   ').length, 3)
    assert.equal(filterPickerRows(rows, undefined).length, 3)
  })

  it('survives junk input', () => {
    assert.deepEqual(filterPickerRows(undefined, 'x'), [])
    assert.deepEqual(filterPickerRows([{ id: 'z' }], 'x'), [])
  })
})

describe('movePickerIndex', () => {
  it('wraps at both ends', () => {
    assert.equal(movePickerIndex(0, -1, 3), 2)
    assert.equal(movePickerIndex(2, 1, 3), 0)
    assert.equal(movePickerIndex(1, 1, 3), 2)
  })

  it('stays at 0 without rows', () => {
    assert.equal(movePickerIndex(5, 1, 0), 0)
    assert.equal(movePickerIndex(5, 1, undefined), 0)
  })
})

describe('initialPickerIndex', () => {
  it('opens on the bound row', () => {
    assert.equal(initialPickerIndex(rows, 'b'), 1)
  })

  it('falls back to the first row', () => {
    assert.equal(initialPickerIndex(rows, 'missing'), 0)
    assert.equal(initialPickerIndex(rows, ''), 0)
    assert.equal(initialPickerIndex(rows, null), 0)
    assert.equal(initialPickerIndex([], 'b'), 0)
  })
})

describe('resolvePickerKey', () => {
  it('moves, closes and chooses', () => {
    assert.deepEqual(resolvePickerKey('ArrowDown', 1, 3), { type: 'move', index: 2 })
    assert.deepEqual(resolvePickerKey('ArrowUp', 0, 3), { type: 'move', index: 2 })
    assert.deepEqual(resolvePickerKey('Home', 2, 3), { type: 'move', index: 0 })
    assert.deepEqual(resolvePickerKey('End', 0, 3), { type: 'move', index: 2 })
    assert.deepEqual(resolvePickerKey('Enter', 1, 3), { type: 'choose' })
    assert.deepEqual(resolvePickerKey('Escape', 1, 3), { type: 'close' })
    // Tab must not steal focus back to the trigger.
    assert.deepEqual(resolvePickerKey('Tab', 1, 3), { type: 'close', refocus: false })
  })

  it('ignores other keys and an empty list', () => {
    assert.deepEqual(resolvePickerKey('a', 1, 3), { type: 'none' })
    assert.deepEqual(resolvePickerKey('Enter', 0, 0), { type: 'choose' })
    assert.deepEqual(resolvePickerKey('End', 0, 0), { type: 'move', index: 0 })
  })
})

describe('pickerTitleOf / pickerRowOf', () => {
  it('falls back from display title to durable title to the id prefix', () => {
    assert.equal(pickerTitleOf({ displayTitle: 'Shown', title: 'Durable' }), 'Shown')
    assert.equal(pickerTitleOf({ title: 'Durable' }), 'Durable')
    assert.equal(pickerTitleOf({ id: 'abcdef123456' }), 'abcdef12')
    assert.equal(pickerTitleOf(undefined), '')
  })

  it('shapes a row without inventing a project or a running flag', () => {
    assert.deepEqual(pickerRowOf({ id: 'a', displayTitle: 'A', running: true }, 'Split view'), {
      id: 'a',
      title: 'A',
      project: 'Split view',
      running: true,
    })
    assert.deepEqual(pickerRowOf({ id: 'b' }, undefined), {
      id: 'b',
      title: 'b',
      project: '',
      running: false,
    })
  })
})

describe('pickerPanelBox', () => {
  const viewport = { width: 1200, height: 800 }
  const preferred = { width: 360, maxHeight: 320 }

  it('opens below the trigger when the panel fits', () => {
    const box = pickerPanelBox({ top: 100, right: 900, bottom: 130 }, viewport, preferred)
    assert.equal(box.top, 136)
    assert.equal(box.left, 540)
    assert.equal(box.width, 360)
    assert.equal(box.maxHeight, 320)
  })

  it('flips above the trigger near the bottom edge', () => {
    const box = pickerPanelBox({ top: 760, right: 900, bottom: 790 }, viewport, preferred)
    assert.equal(box.top, 760 - 6 - 320)
  })

  it('clamps inside a narrow viewport', () => {
    const box = pickerPanelBox(
      { top: 10, right: 40, bottom: 40 },
      { width: 300, height: 200 },
      preferred,
    )
    assert.equal(box.width, 284)
    assert.equal(box.left, 8)
    assert.equal(box.maxHeight, 184)
    assert.equal(box.top, 8)
  })
})
