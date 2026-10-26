/**
 * Artifact contract tests.
 *
 * The browser half ships as a generated file that git does not track: npm gets
 * it from `prepare` (build.mjs runs while packing), a fresh checkout gets it
 * from `npm run build`. So there is no committed copy to compare against — what
 * must hold is that the build produces the shape the harness loads, and that it
 * does so reproducibly on the machine that packs it.
 */

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, it } from 'node:test'

const ROOT = join(import.meta.dirname, '..')
const PLUGIN_DIR = join(ROOT, 'packages', 'dsh-workspace-split')
const ARTIFACT_REL = 'packages/dsh-workspace-split/client.js'

/** Build the client half into `target` and return what was written. */
function buildTo(target) {
  execFileSync(process.execPath, ['build.mjs', target], { cwd: PLUGIN_DIR, stdio: 'pipe' })
  return readFileSync(target, 'utf8')
}

describe('built client artifact', () => {
  let scratch
  let built
  let rebuilt

  before(() => {
    scratch = mkdtempSync(join(tmpdir(), 'dsws-artifact-'))
    built = buildTo(join(scratch, 'a.js'))
    rebuilt = buildTo(join(scratch, 'b.js'))
  })

  after(() => {
    rmSync(scratch, { recursive: true, force: true })
  })

  it('carries the generated-file marker', () => {
    assert.ok(built.startsWith('// GENERATED FILE'), 'artifact must open with the marker')
  })

  it('wraps the bundle in the module-loader envelope', () => {
    assert.match(built, /window\.__ModuleLoader__\.load\(\{/)
    // The id the loader keys the plugin by must be the package name; read it
    // instead of repeating it here so a rename cannot drift out of sync.
    const manifest = JSON.parse(readFileSync(join(PLUGIN_DIR, 'package.json'), 'utf8'))
    assert.ok(
      built.includes(`id: ${JSON.stringify(manifest.name)}`),
      `loader id must be ${manifest.name}`,
    )
    assert.match(built, /factory\(require\)/)
  })

  it('requires nothing beyond the platform module table', () => {
    const required = [...built.matchAll(/require\("([^"]+)"\)/g)].map((match) => match[1])
    // react and react-dom/client are the only platform externals this plugin needs.
    assert.deepEqual([...new Set(required)], ['react', 'react-dom/client'])
  })

  it('builds to the same bytes twice', () => {
    // The published tarball is built on CI from the tag, not from a developer's
    // tree, so the output must not depend on ambient state such as the working
    // directory, mtimes, or hash-map iteration order.
    assert.equal(rebuilt, built, 'two builds of the same source must agree byte for byte')
  })

  it('stays out of git', () => {
    // `prepare` regenerates the artifact before packing; a tracked copy would
    // be the one reviewers read and could quietly disagree with the source.
    assert.throws(
      () =>
        execFileSync('git', ['ls-files', '--error-unmatch', ARTIFACT_REL], {
          cwd: ROOT,
          stdio: 'pipe',
        }),
      /Command failed/,
      'client.js must not be tracked — `git rm --cached` it',
    )
  })
})
