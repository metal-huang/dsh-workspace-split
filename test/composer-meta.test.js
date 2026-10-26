/**
 * Context footer arithmetic.
 *
 * The main composer shows `projectedTokens ?? pressureTokens` over the model's
 * context window; a split cell must agree, and must hide the footer when either
 * half is absent instead of drawing 0%.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  contextOccupancy,
  effectiveModel,
  formatTokens,
  modelChoices,
  modelDisplay,
  parseSlashLine,
  permissionLabel,
  permissionRequiresConfirm,
} from '../packages/dsh-workspace-split/src/composer-meta.js'

describe('contextOccupancy', () => {
  it('prefers the projected prompt over the last provider measurement', () => {
    assert.deepEqual(
      contextOccupancy({ projectedTokens: 500, pressureTokens: 400, contextWindow: 1000 }),
      { percent: 50, usedTokens: 500, contextWindow: 1000 },
    )
  })

  it('falls back to the provider measurement when projection is absent', () => {
    assert.deepEqual(contextOccupancy({ pressureTokens: 250, contextWindow: 1000 }), {
      percent: 25,
      usedTokens: 250,
      contextWindow: 1000,
    })
  })

  it('hides the footer when either half is missing', () => {
    assert.equal(contextOccupancy(undefined), null)
    assert.equal(contextOccupancy({ pressureTokens: 10 }), null)
    assert.equal(contextOccupancy({ contextWindow: 1000 }), null)
  })

  it('never divides by zero and caps at 100 percent', () => {
    assert.equal(contextOccupancy({ projectedTokens: 10, contextWindow: 0 }), null)
    assert.deepEqual(contextOccupancy({ projectedTokens: 10, contextWindow: -1 }), null)
    assert.equal(contextOccupancy({ projectedTokens: 1500, contextWindow: 1000 }).percent, 100)
  })
})

describe('formatTokens', () => {
  it('keeps small counts whole', () => {
    assert.equal(formatTokens(0), '0')
    assert.equal(formatTokens(999), '999')
  })

  it('uses one decimal below 100k and none above', () => {
    assert.equal(formatTokens(1200), '1.2k')
    assert.equal(formatTokens(99_400), '99.4k')
    assert.equal(formatTokens(123_456), '123k')
  })

  it('switches to millions', () => {
    assert.equal(formatTokens(1_234_567), '1.2M')
    assert.equal(formatTokens(123_456_789), '123M')
  })

  it('treats junk as zero', () => {
    assert.equal(formatTokens(undefined), '0')
    assert.equal(formatTokens('nope'), '0')
    assert.equal(formatTokens(-5), '0')
  })
})

describe('model catalog helpers', () => {
  const catalog = {
    default: { provider: 'p1', model: 'm1' },
    groups: [
      {
        id: 'p1',
        name: 'Provider One',
        models: [
          {
            id: 'm1',
            name: 'Model One',
            reasoning: {
              efforts: [
                { id: 'low', name: 'Low' },
                { id: 'high', name: 'High' },
              ],
              defaultEffort: 'low',
            },
          },
          { id: 'm2', name: 'Model Two' },
        ],
      },
    ],
  }

  it('flattens provider groups', () => {
    assert.deepEqual(
      modelChoices(catalog).map((row) => [row.provider, row.model, row.modelName]),
      [
        ['p1', 'm1', 'Model One'],
        ['p1', 'm2', 'Model Two'],
      ],
    )
  })

  it('prefers next over lastUsed', () => {
    const selection = { lastUsed: { provider: 'p1', model: 'm2' }, next: null }
    assert.deepEqual(effectiveModel(selection), selection.lastUsed)
    const next = { provider: 'p1', model: 'm1', reasoningEffort: 'high' }
    assert.deepEqual(effectiveModel({ lastUsed: null, next }), next)
    assert.equal(effectiveModel(null), null)
  })

  it('resolves the display name and effort', () => {
    assert.deepEqual(
      modelDisplay(catalog, {
        lastUsed: null,
        next: { provider: 'p1', model: 'm1', reasoningEffort: 'high' },
      }),
      {
        name: 'Model One',
        effortName: 'High',
        row: modelChoices(catalog)[0],
      },
    )
    assert.equal(
      modelDisplay(catalog, { lastUsed: null, next: { provider: 'x', model: 'y' } }),
      null,
    )
  })
})

describe('permission helpers', () => {
  const catalog = {
    options: [
      { value: 'read-only', name: 'Read only' },
      { value: 'workspace-write', name: 'Workspace write' },
      { value: 'danger-full-access', name: 'Full access' },
      { value: 'custom', name: 'Custom' },
    ],
  }

  it('maps values to catalog labels and falls back to the raw value', () => {
    assert.equal(permissionLabel(catalog, 'read-only'), 'Read only')
    assert.equal(permissionLabel(catalog, 'custom'), 'Custom')
    assert.equal(permissionLabel(catalog, 'unknown'), 'unknown')
    assert.equal(permissionLabel(catalog, undefined), '')
  })

  it('uses the built-in copy when the catalog only carries values', () => {
    assert.equal(
      permissionLabel(
        { options: [{ value: 'workspace-write', label: 'Workspace write' }] },
        'workspace-write',
      ),
      'Workspace write',
    )
    assert.equal(
      permissionLabel({ options: [] }, 'danger-full-access', (key) => `t:${key}`),
      't:permission.dangerFullAccess',
    )
    assert.equal(
      permissionLabel(
        { options: [{ value: 'workspace-write', name: 'workspace-write' }] },
        'workspace-write',
        (key) => `t:${key}`,
      ),
      't:permission.workspaceWrite',
    )
  })

  it('requires confirmation only for the two risky presets', () => {
    assert.equal(permissionRequiresConfirm('danger-full-access'), true)
    assert.equal(permissionRequiresConfirm('auto'), true)
    assert.equal(permissionRequiresConfirm('workspace-write'), false)
  })
})

describe('parseSlashLine', () => {
  it('parses a command and its args', () => {
    assert.deepEqual(parseSlashLine('/permission workspace-write'), {
      name: 'permission',
      args: 'workspace-write',
    })
    assert.deepEqual(parseSlashLine('  /compact  '), { name: 'compact', args: '' })
  })

  it('ignores plain prompts and multi-line drafts', () => {
    assert.equal(parseSlashLine('hello'), null)
    assert.equal(parseSlashLine('/'), null)
    assert.equal(parseSlashLine('// not a command'), null)
    assert.equal(parseSlashLine('/model\nsecond line'), null)
  })
})
