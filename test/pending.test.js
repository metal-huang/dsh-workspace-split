/**
 * Pending approval / question rules.
 *
 * The official packages publish live objects into `ctx.uiSession.sessionStatus`;
 * the split cell only needs these structural rules, so they stay testable with
 * plain fake objects.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  approvalAnswerable,
  approvalHeadline,
  buildAnswerBatch,
  countdownText,
  interactionKey,
  onceGate,
  pendingOf,
  questionAnswerable,
} from '../packages/dsh-workspace-split/src/pending.js'

const t = (key, vars = {}) => `${key}${vars.toolName === undefined ? '' : `:${vars.toolName}`}`

describe('pendingOf', () => {
  it('returns only known pending kinds for the requested session', () => {
    const approval = { kind: 'approval', key: 'approval:1' }
    const status = new Map([['s1', { pendingInteraction: approval }]])
    assert.equal(pendingOf(status, 's1'), approval)
    assert.equal(pendingOf(status, 's2'), undefined)
  })

  it('ignores unknown domains and junk', () => {
    assert.equal(
      pendingOf(new Map([['s1', { pendingInteraction: { kind: 'other' } }]]), 's1'),
      undefined,
    )
    assert.equal(pendingOf(new Map([['s1', { pendingInteraction: null }]]), 's1'), undefined)
    assert.equal(pendingOf(undefined, 's1'), undefined)
    assert.equal(pendingOf({}, 's1'), undefined)
  })
})

describe('answerability', () => {
  it('trusts only explicit approval answerability', () => {
    assert.equal(approvalAnswerable({ answerable: true }), true)
    assert.equal(approvalAnswerable({ answerable: false }), false)
    assert.equal(approvalAnswerable({}), false)
  })

  it('requires a live question channel and an open card', () => {
    assert.equal(questionAnswerable({ channel: 'waterfall' }), true)
    assert.equal(questionAnswerable({ channel: 'rpc' }), true)
    assert.equal(questionAnswerable({ channel: 'none' }), false)
    assert.equal(questionAnswerable({ channel: 'waterfall', closed: true }), false)
    assert.equal(questionAnswerable(undefined), false)
  })
})

describe('buildAnswerBatch', () => {
  const questions = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }]

  it('answers every question once, in order', () => {
    const batch = buildAnswerBatch(questions, {
      q1: { selected: ['A', 'B'] },
      q2: {},
      q3: { custom: '  other  ' },
    })
    assert.deepEqual(batch, {
      answers: [
        { id: 'q1', selected: ['A', 'B'] },
        { id: 'q2', selected: [] },
        { id: 'q3', selected: [], custom: 'other' },
      ],
    })
    assert.equal(batch.answers.length, questions.length)
    assert.deepEqual(
      batch.answers.map((answer) => answer.id),
      ['q1', 'q2', 'q3'],
    )
  })

  it('does not mutate the drafts', () => {
    const drafts = { q1: { selected: ['A'] } }
    buildAnswerBatch(questions, drafts)
    assert.deepEqual(drafts, { q1: { selected: ['A'] } })
  })
})

describe('approvalHeadline', () => {
  it('prefers the request reason', () => {
    assert.equal(
      approvalHeadline({ reason: 'write outside the workspace' }, 'zh', t),
      'write outside the workspace',
    )
  })

  it('falls through the localized display reason to the generic line', () => {
    assert.equal(
      approvalHeadline({ displayReason: { en: 'English', zh: '中文' } }, 'zh', t),
      '中文',
    )
    assert.equal(approvalHeadline({ displayReason: { en: 'English' } }, 'zh', t), 'English')
    assert.equal(approvalHeadline({ toolName: 'bash' }, 'zh', t), 'cell.approval.escalation:bash')
  })
})

describe('interactionKey', () => {
  it('uses the approval key', () => {
    assert.equal(interactionKey({ kind: 'approval', key: 'approval:2' }), 'approval:2')
  })

  it('uses a stable call-based key for questions', () => {
    assert.equal(
      interactionKey({ kind: 'question', sessionId: 's1', callId: 'c1', key: 'x' }),
      'question:s1:c1',
    )
    assert.equal(interactionKey({ kind: 'question', key: 'x' }), 'x')
  })
})

describe('countdownText', () => {
  it('formats remaining milliseconds', () => {
    assert.equal(countdownText({ countdown: { remainingMs: 59_999 } }), '0:59')
    assert.equal(countdownText({ countdown: { remainingMs: 60_000 } }), '1:00')
    assert.equal(countdownText({ countdown: { remainingMs: -1 } }), '0:00')
    assert.equal(countdownText({}), '')
  })
})

describe('onceGate', () => {
  it('runs one task at a time and unlocks only on reset', () => {
    const gate = onceGate()
    assert.equal(
      gate.run(() => {}),
      true,
    )
    assert.equal(
      gate.run(() => {}),
      false,
    )
    assert.equal(gate.busy, true)
    gate.reset()
    assert.equal(
      gate.run(() => {}),
      true,
    )
  })
})
