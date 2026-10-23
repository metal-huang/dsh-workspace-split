/**
 * Artifact contract tests.
 *
 * The browser half ships as a generated file, so two things must hold:
 * the committed artifact matches a fresh build (nobody hand-edited it), and it
 * keeps the loader envelope the harness expects.
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'

const PLUGIN_DIR = join(import.meta.dirname, '..', 'packages', 'dsh-workspace-split')
const COMMITTED = join(PLUGIN_DIR, 'client.js')

describe('built client artifact', () => {
  let scratch
  let rebuilt

  before(() => {
    scratch = mkdtempSync(join(tmpdir(), 'dsws-artifact-'))
    const target = join(scratch, 'client.js')
    execFileSync(process.execPath, ['build.mjs', target], { cwd: PLUGIN_DIR, stdio: 'pipe' })
    rebuilt = readFileSync(target, 'utf8')
  })

  after(() => {
    rmSync(scratch, { recursive: true, force: true })
  })

  it('is in sync with src/client.js', () => {
    const committed = readFileSync(COMMITTED, 'utf8')
    assert.equal(
      committed,
      rebuilt,
      'client.js is stale or hand-edited — run `npm run build` in packages/dsh-workspace-split',
    )
  })

  it('carries the generated-file marker', () => {
    const committed = readFileSync(COMMITTED, 'utf8')
    assert.ok(committed.startsWith('// GENERATED FILE'), 'artifact must open with the marker')
  })

  it('wraps the bundle in the module-loader envelope', () => {
    const committed = readFileSync(COMMITTED, 'utf8')
    assert.match(committed, /window\.__ModuleLoader__\.load\(\{/)
    // The id the loader keys the plugin by must be the package name; read it
    // instead of repeating it here so a rename cannot drift out of sync.
    const manifest = JSON.parse(readFileSync(join(PLUGIN_DIR, 'package.json'), 'utf8'))
    assert.ok(
      committed.includes(`id: ${JSON.stringify(manifest.name)}`),
      `loader id must be ${manifest.name}`,
    )
    assert.match(committed, /factory\(require\)/)
  })

  it('requires nothing beyond the platform module table', () => {
    const committed = readFileSync(COMMITTED, 'utf8')
    const required = [...committed.matchAll(/require\("([^"]+)"\)/g)].map((match) => match[1])
    const unique = [...new Set(required)]
    // react is the only external this plugin legitimately needs.
    assert.deepEqual(unique, ['react'])
  })
})
