#!/usr/bin/env node
// Locate the `dsh-isolated-env` CLI without hard-coding a checkout path.
//
// The package is a dependency of `dsh-plugin-e2e`, and that link may point at a
// devtools checkout (junction), so resolution must start from the real directory
// and walk up to the nearest package.json. `package.json` is not an exported
// subpath of the library, so the entry module is resolved instead.
import { createRequire } from 'node:module'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { join, resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '..')
const e2eDir = join(repoRoot, 'node_modules', 'dsh-plugin-e2e')

/**
 * Locate the `dsh-isolated-env` CLI through the e2e package's own resolution, so
 * a hoisted or nested install both work without hard-coding a checkout path.
 * `package.json` is not an exported subpath, so the entry module is resolved and
 * the package root is found by walking up to the nearest package.json.
 * @returns the CLI path, or undefined when the dependency is missing.
 */
export function findIsolatedBin() {
  const candidates = []
  try {
    const realE2e = existsSync(e2eDir) ? realpathSync(e2eDir) : e2eDir
    const require = createRequire(join(realE2e, 'package.json'))
    const entry = require.resolve('dsh-isolated-env')
    let dir = resolve(entry, '..')
    for (let i = 0; i < 4; i += 1) {
      const pkgPath = join(dir, 'package.json')
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
        const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.['dsh-isolated-env']
        if (typeof bin === 'string') candidates.push(join(dir, bin))
        break
      }
      dir = resolve(dir, '..')
    }
  } catch {
    // fall through to the direct guesses below
  }
  candidates.push(
    join(repoRoot, 'node_modules', 'dsh-isolated-env', 'bin', 'dsh-isolated-env.mjs'),
    join(e2eDir, 'node_modules', 'dsh-isolated-env', 'bin', 'dsh-isolated-env.mjs'),
  )
  return candidates.find((candidate) => existsSync(candidate))
}
