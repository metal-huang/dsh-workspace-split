/**
 * Format gate for the "constrain new code only" posture.
 *
 * There is no repo-wide clean baseline: gate/format_baseline.json lists the
 * files that were already unformatted when the gate landed, and they are
 * frozen. Any file outside that list must be Prettier-clean, so formatting
 * spreads file by file as they are touched. `ratchet:tighten` removes entries
 * once a file is cleaned.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import prettier from 'prettier'
import { heading, readBaseline, ROOT } from './lib.mjs'

const BASELINE_FILE = join(ROOT, 'gate', 'format_baseline.json')
const baseline = readBaseline(BASELINE_FILE)
const frozen = new Set(baseline?.files ?? [])

const SCAN_ROOTS = ['packages/dsh-workspace-split/src', 'gate', 'test']
const SCAN_FILES = [
  'packages/dsh-workspace-split/index.js',
  'packages/dsh-workspace-split/build.mjs',
]

/**
 * Collect .js/.mjs files under one directory, recursively.
 * @param relativeDir - directory relative to the repo root.
 * @returns repo-relative file paths with forward slashes.
 */
function walk(relativeDir) {
  const out = []
  let entries
  try {
    entries = readdirSync(join(ROOT, relativeDir), { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const child = `${relativeDir}/${entry.name}`
    if (entry.isDirectory()) {
      out.push(...walk(child))
    } else if (/\.(js|mjs)$/.test(entry.name)) {
      out.push(child)
    }
  }
  return out
}

const candidates = [...SCAN_ROOTS.flatMap(walk), ...SCAN_FILES]
const dirty = []
let checked = 0

for (const file of candidates) {
  if (frozen.has(file)) continue
  const absolute = join(ROOT, file)
  let source
  try {
    source = readFileSync(absolute, 'utf8')
  } catch {
    continue
  }
  const info = await prettier.getFileInfo(absolute)
  if (info.ignored) continue
  checked += 1
  const options = await prettier.resolveConfig(absolute)
  if (!(await prettier.check(source, { ...options, filepath: absolute }))) dirty.push(file)
}

heading('format')
console.log(`  checked: ${checked}`)
console.log(`  frozen (pre-existing): ${frozen.size}`)
console.log(`  new dirty files: ${dirty.length}`)
for (const file of dirty) console.log(`    ${file}`)

if (dirty.length > 0) {
  console.error('\nformat gate failed: files outside the baseline must be Prettier-clean')
  console.error('run `npm run format`, or `npx prettier --write <file>`')
  process.exit(1)
}
console.log('  ok')
