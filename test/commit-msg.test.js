/**
 * commit-msg gate tests: the rules the hook enforces, exercised through the
 * real script so a refactor of the regex cannot silently loosen the gate.
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'

const GATE = join(import.meta.dirname, '..', 'gate', 'commit_msg.mjs')

/**
 * Run the gate against one message.
 * @param message - commit message body.
 * @returns exit status and stderr.
 */
function check(message) {
  const file = join(scratch, 'MSG')
  writeFileSync(file, message, 'utf8')
  try {
    execFileSync(process.execPath, [GATE, file], { stdio: 'pipe' })
    return { status: 0, stderr: '' }
  } catch (error) {
    return { status: error.status ?? 1, stderr: String(error.stderr ?? '') }
  }
}

let scratch

describe('commit-msg gate', () => {
  before(() => {
    scratch = mkdtempSync(join(tmpdir(), 'dsws-msg-'))
  })

  after(() => {
    rmSync(scratch, { recursive: true, force: true })
  })

  it('accepts the conventional shape this repo uses', () => {
    assert.equal(check('feat: render Markdown with mdast\n').status, 0)
    assert.equal(check('fix: keep the reader scroll position\n').status, 0)
    assert.equal(check('style(sidebar): gapless tiles\n').status, 0)
  })

  it('rejects an unknown type', () => {
    const result = check('wip: something\n')
    assert.equal(result.status, 1)
    assert.match(result.stderr, /is not one of/)
  })

  it('rejects a subject without a type prefix', () => {
    const result = check('just some words\n')
    assert.equal(result.status, 1)
    assert.match(result.stderr, /type\(scope\): description/)
  })

  it('rejects a trailing period', () => {
    const result = check('feat: add cells.\n')
    assert.equal(result.status, 1)
    assert.match(result.stderr, /must not end with a period/)
  })

  it('rejects an over-long subject', () => {
    const result = check(`feat: ${'x'.repeat(80)}\n`)
    assert.equal(result.status, 1)
    assert.match(result.stderr, /limit is 72/)
  })

  it('rejects an empty message', () => {
    assert.equal(check('\n').status, 1)
  })

  it('exempts merge and revert commits', () => {
    assert.equal(check('Merge branch "main"\n').status, 0)
    assert.equal(check('Revert "feat: add cells"\n').status, 0)
    assert.equal(check('fixup! feat: add cells\n').status, 0)
  })

  it('ignores comment lines from the template', () => {
    assert.equal(check('feat: add cells\n\n# Please enter the message\n').status, 0)
  })
})
