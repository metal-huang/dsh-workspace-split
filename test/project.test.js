/**
 * Project badge identity.
 *
 * Sessions remember their Workspace only indirectly, so the header resolves it
 * from the Workspace catalog, then from the working directory.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  cwdName,
  projectBadgeStyle,
  projectColor,
  projectIndex,
  projectNameFrom,
  projectNameOf,
} from '../packages/dsh-workspace-split/src/project.js'

describe('cwdName', () => {
  it('takes the leaf of Windows and POSIX paths', () => {
    assert.equal(cwdName('D:\\Proj\\github\\dsh-workspace-split'), 'dsh-workspace-split')
    assert.equal(cwdName('/home/me/project/'), 'project')
  })

  it('returns empty for junk or a root', () => {
    assert.equal(cwdName(undefined), '')
    assert.equal(cwdName(''), '')
    assert.equal(cwdName('   '), '')
    assert.equal(cwdName('D:\\'), '')
  })
})

describe('projectNameOf', () => {
  const workspaces = [
    { workspaceId: 'w1', title: 'Split view', sessionIds: ['s1', 2] },
    { workspaceId: 'w2', title: 'Music', sessionIds: [] },
  ]

  it('prefers the Workspace that lists the Session', () => {
    assert.equal(projectNameOf({ sessionId: 's1' }, workspaces), 'Split view')
    assert.equal(projectNameOf({ id: 2 }, workspaces), 'Split view')
  })

  it('falls back to the cwd leaf outside a Workspace', () => {
    assert.equal(
      projectNameOf({ sessionId: 's9', cwd: 'D:\\Proj\\github\\other' }, workspaces),
      'other',
    )
  })

  it('returns empty when neither source exists', () => {
    assert.equal(projectNameOf({ sessionId: 's9' }, workspaces), '')
    assert.equal(projectNameOf(undefined, undefined), '')
  })
})

describe('projectColor', () => {
  it('is stable for the same name', () => {
    assert.equal(projectColor('Split view'), projectColor('Split view'))
  })

  it('usually separates different projects and always returns a color', () => {
    const colors = new Set(
      ['Split view', 'Music', 'void', 'AI', 'docs'].map((name) => projectColor(name)),
    )
    assert.ok(colors.size >= 2)
    assert.match(projectColor(''), /^#[0-9a-f]{6}$/u)
  })
})

describe('projectIndex / projectNameFrom', () => {
  const workspaces = [
    { workspaceId: 'w1', title: 'Split view', sessionIds: ['s1', 2] },
    { workspaceId: 'w2', title: 'Music', sessionIds: ['s1', 's3'] },
  ]

  it('maps stringified ids and keeps the first Workspace, like projectNameOf', () => {
    const index = projectIndex(workspaces)
    assert.equal(index.get('s1'), 'Split view')
    assert.equal(index.get('2'), 'Split view')
    assert.equal(index.get('s3'), 'Music')
    assert.equal(projectNameFrom(index, { id: 's3' }), 'Music')
    assert.equal(
      projectNameFrom(index, { sessionId: 's1' }),
      projectNameOf({ id: 's1' }, workspaces),
    )
  })

  it('falls back to the cwd leaf, then to nothing', () => {
    const index = projectIndex(workspaces)
    assert.equal(projectNameFrom(index, { id: 's9', cwd: 'D:\\proj\\other' }), 'other')
    assert.equal(projectNameFrom(index, { id: 's9' }), '')
    assert.equal(projectNameFrom(new Map(), undefined), '')
    assert.equal(projectNameFrom(undefined, { id: 's9' }), '')
  })

  it('tolerates a catalog without entries', () => {
    assert.equal(projectIndex(undefined).size, 0)
    assert.equal(projectIndex([{ title: 'no sessions' }]).size, 0)
  })
})

describe('projectBadgeStyle', () => {
  it('derives the pill from the project color', () => {
    const style = projectBadgeStyle('#5aa9ff')
    assert.equal(style.color, '#5aa9ff')
    assert.equal(style.border, '0.5px solid #5aa9ff66')
    assert.equal(style.background, '#5aa9ff24')
    assert.equal(style.borderRadius, 7)
    // The header and the picker rows share this, so it must stay a pill, not a
    // full-width bar: the badge yields before the session title.
    assert.equal(style.maxWidth, '46%')
  })
})
