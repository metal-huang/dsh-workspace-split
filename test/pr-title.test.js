/** Exercise the real PR-title entry point, including its CI environment input. */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { describe, it } from 'node:test'

const GATE = join(import.meta.dirname, '..', 'gate', 'pr_title.mjs')

function check(title) {
  try {
    execFileSync(process.execPath, [GATE], {
      env: { ...process.env, PR_TITLE: title },
      stdio: 'pipe',
    })
    return { status: 0, stderr: '' }
  } catch (error) {
    return { status: error.status ?? 1, stderr: String(error.stderr ?? '') }
  }
}

describe('PR title gate', () => {
  it('uses the same conventional shape as the local commit hook', () => {
    assert.equal(check('feat(split): resize cells').status, 0)
  })

  it('rejects Git-generated commit exemptions in squash-merge titles', () => {
    const result = check('Merge branch "feature"')
    assert.equal(result.status, 1)
    assert.match(result.stderr, /type\(scope\): description/)
  })

  it('rejects an empty environment value', () => {
    assert.equal(check('').status, 1)
  })
})
