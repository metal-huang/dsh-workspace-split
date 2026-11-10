/**
 * Process-group header and reasoning preview rules.
 *
 * The merged contributor change dropped reasoning from the group and returned
 * nothing for a reasoning-only group. Chat keeps both: a reasoning-only group
 * still has a title, and the text folds into its own "Think" row. These tests
 * pin the summary and the collapsed preview so the disclosure cannot silently
 * lose either half again.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  processSummary,
  reasoningPreview,
} from '../packages/dsh-workspace-split/src/process-group.js'

/** One Tool item with a display name. */
function tool(name) {
  return { kind: 'tool', key: `tool-${name}`, tool: { name } }
}

describe('processSummary', () => {
  it('joins unique tool names in the order they ran', () => {
    const items = [tool('bash'), tool('read'), tool('bash')]
    assert.equal(processSummary(items, { reasoning: 'Reasoning' }), 'bash, read')
  })

  it('names a reasoning-only group from the translated label', () => {
    const items = [{ kind: 'reasoning', key: 'r1', text: '想一想', streaming: false }]
    assert.equal(processSummary(items, { reasoning: 'Reasoning' }), 'Reasoning')
  })

  it('prefers tool names when the group has both members', () => {
    const items = [tool('bash'), { kind: 'reasoning', key: 'r1', text: '想一想' }]
    assert.equal(processSummary(items, { reasoning: 'Reasoning' }), 'bash')
  })

  it('returns nothing for an empty or malformed group', () => {
    assert.equal(processSummary([], { reasoning: 'Reasoning' }), '')
    assert.equal(processSummary(null, { reasoning: 'Reasoning' }), '')
    assert.equal(processSummary([null, {}, { kind: 'tool' }], { reasoning: 'Reasoning' }), '')
    assert.equal(processSummary([tool('')], { reasoning: 'Reasoning' }), '')
  })

  it('does not invent a label when the caller has none', () => {
    const items = [{ kind: 'reasoning', key: 'r1', text: '想一想' }]
    assert.equal(processSummary(items, undefined), '')
  })
})

describe('reasoningPreview', () => {
  it('shows the first line of a settled block', () => {
    assert.equal(reasoningPreview('先看目录\n再看文件', false), '先看目录')
    assert.equal(reasoningPreview('\n\n  第一行  \n第二行', false), '第一行')
    assert.equal(reasoningPreview('第一行\r\n第二行', false), '第一行')
  })

  it('shows nothing for an empty block', () => {
    assert.equal(reasoningPreview('   ', false), '')
    assert.equal(reasoningPreview(undefined, false), '')
  })

  it('waits for a complete line while streaming', () => {
    // The tail is half a sentence; previewing it would flicker on every delta.
    assert.equal(reasoningPreview('只有一行', true), '')
    assert.equal(reasoningPreview('第一行\n第二行', true), '第一行')
  })

  it('previews the latest completed paragraph while streaming', () => {
    assert.equal(reasoningPreview('第一段\n\n第二段还在写', true), '第一段')
    assert.equal(reasoningPreview('甲\n\n乙\n\n丙', true), '乙')
  })
})
