/**
 * `@` mention grammar, modelled on the harness's file-reference tests.
 * The token is plain text in the prompt, so the exact spelling matters.
 */

import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  activeAtToken,
  candidateLabel,
  formatFileMention,
  replaceMention,
} from '../packages/dsh-workspace-split/src/mention.js'

describe('activeAtToken', () => {
  it('finds a plain token at the caret', () => {
    const text = 'look at @src/cli'
    const token = activeAtToken(text, text.length)
    assert.equal(token.query, 'src/cli')
    assert.equal(token.quoted, false)
    assert.equal(token.start, 8)
    assert.equal(token.end, text.length)
  })

  it('finds a quoted token with spaces', () => {
    const text = 'open @"src/a b'
    const token = activeAtToken(text, text.length)
    assert.equal(token.query, 'src/a b')
    assert.equal(token.quoted, true)
  })

  it('does not trigger on email-like text or a token before the caret', () => {
    assert.equal(activeAtToken('mail a@b', 9), undefined)
    assert.equal(activeAtToken('@done now', 9), undefined)
    assert.equal(activeAtToken('plain text', 10), undefined)
  })

  it('returns an empty query for a bare @ token', () => {
    assert.deepEqual(activeAtToken('@', 1), {
      prefix: '@',
      query: '',
      quoted: false,
      start: 0,
      end: 1,
    })
  })
})

describe('formatFileMention', () => {
  it('leaves simple paths unquoted and appends a slash to directories', () => {
    assert.equal(formatFileMention({ path: 'src/cli.js', kind: 'file' }), '@src/cli.js')
    assert.equal(formatFileMention({ path: 'src', kind: 'directory' }), '@src/')
  })

  it('quotes paths with spaces', () => {
    assert.equal(formatFileMention({ path: 'a b/c.txt', kind: 'file' }), '@"a b/c.txt"')
    assert.equal(formatFileMention({ path: 'a b', kind: 'directory' }), '@"a b/')
  })

  it('preserves an open quote the reader typed', () => {
    assert.equal(formatFileMention({ path: 'plain.txt', kind: 'file' }, true), '@"plain.txt"')
  })

  it('refuses control characters and embedded quotes', () => {
    assert.equal(formatFileMention({ path: 'a"b', kind: 'file' }), undefined)
    assert.equal(formatFileMention({ path: 'a\nb', kind: 'file' }), undefined)
  })
})

describe('replaceMention', () => {
  it('replaces only the active token', () => {
    const text = 'look @sr now'
    const token = activeAtToken(text, 8)
    assert.equal(replaceMention(text, token, '@src/'), 'look @src/ now')
  })
})

describe('candidateLabel', () => {
  it('splits file paths into leaf and parent', () => {
    assert.deepEqual(candidateLabel({ path: 'src/client.js' }), {
      name: 'client.js',
      parent: 'src',
    })
    assert.deepEqual(candidateLabel({ path: 'README.md' }), {
      name: 'README.md',
      parent: '',
    })
  })

  it('uses the session mention label and workspace hint', () => {
    assert.deepEqual(
      candidateLabel({
        mention: '@[S](dsh-session:x)',
        displayTitle: 'Session',
        sameWorkspace: false,
        workspaceTitle: 'Other',
      }),
      { name: 'Session', parent: 'Other' },
    )
  })
})
