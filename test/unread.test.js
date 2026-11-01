/**
 * Clearing the "completed" dot from a split tile.
 *
 * DSH's public status map is read-only, so the write goes through the
 * `uiSession` instance's own private set. The fake below models both sides: the
 * call must clear exactly the requested id, and every degradation path must be
 * a no-op instead of a throw.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { acknowledgeUnread } from '../packages/dsh-workspace-split/src/unread.js'

/** A uiSession stand-in carrying the private bits and a call counter. */
function fakeSession(unreadIds = []) {
  return {
    completionUnread: new Set(unreadIds),
    publishes: 0,
    publishStatus() {
      this.publishes += 1
    },
  }
}

describe('acknowledgeUnread', () => {
  it('clears the target id and publishes once', () => {
    const uiSession = fakeSession(['a', 'b'])
    assert.equal(acknowledgeUnread(uiSession, 'a'), true)
    assert.deepEqual([...uiSession.completionUnread], ['b'])
    assert.equal(uiSession.publishes, 1)
  })

  it('leaves other ids marked', () => {
    const uiSession = fakeSession(['a', 'b'])
    acknowledgeUnread(uiSession, 'b')
    assert.equal(uiSession.completionUnread.has('a'), true)
    assert.equal(uiSession.completionUnread.has('b'), false)
  })

  it('does not publish when there was no marker to clear', () => {
    const uiSession = fakeSession(['a'])
    assert.equal(acknowledgeUnread(uiSession, 'b'), false)
    assert.equal(uiSession.publishes, 0)
    assert.deepEqual([...uiSession.completionUnread], ['a'])
  })

  it('degrades when completionUnread is no longer a Set', () => {
    const renamed = fakeSession(['a'])
    renamed.completionUnread = ['a']
    assert.equal(acknowledgeUnread(renamed, 'a'), false)
    assert.equal(renamed.publishes, 0)
  })

  it('degrades when publishStatus is gone', () => {
    const moved = fakeSession(['a'])
    delete moved.publishStatus
    assert.equal(acknowledgeUnread(moved, 'a'), false)
    // The marker is only touched behind both guards, so it survives intact.
    assert.deepEqual([...moved.completionUnread], ['a'])
  })

  it('swallows a throwing publishStatus', () => {
    const throwing = fakeSession(['a'])
    throwing.publishStatus = () => {
      throw new Error('subscriber exploded')
    }
    assert.equal(acknowledgeUnread(throwing, 'a'), false)
  })

  it('returns false without a Session or an id', () => {
    assert.equal(acknowledgeUnread(undefined, 'a'), false)
    assert.equal(acknowledgeUnread(null, 'a'), false)
    assert.equal(acknowledgeUnread(fakeSession(['a']), null), false)
    assert.equal(acknowledgeUnread(fakeSession(['a']), undefined), false)
  })
})
