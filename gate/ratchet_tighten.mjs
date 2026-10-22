/**
 * Ratchet tightening: recompute every baseline from the current tree.
 *
 * Two rules keep this honest:
 * - numbers only move DOWN; a measured value above the stored one is reported
 *   and left alone, because raising a ceiling is not tightening
 * - a missing baseline is created on the spot, so a cold repository is never
 *   stuck between "no baseline" and "refuses to write one"
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { ESLint } from 'eslint'
import prettier from 'prettier'
import { ROOT } from './lib.mjs'

const LINT_FILE = join(ROOT, 'gate', 'lint_baseline.json')
const DUP_FILE = join(ROOT, 'gate', 'dup_baseline.json')
const FORMAT_FILE = join(ROOT, 'gate', 'format_baseline.json')
const DUP_SCAN = [
  'packages/dsh-workspace-split/src',
  'packages/dsh-workspace-split/index.js',
  'packages/dsh-workspace-split/build.mjs',
  'gate',
]

/**
 * Read a JSON file, returning undefined when absent.
 * @param file - absolute path.
 */
function read(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return undefined
  }
}

/**
 * `--seed` is the one sanctioned way to write a baseline at or above the stored
 * value. It exists for the first landing (and for deliberately accepting a
 * one-off increase); normal runs only ever move numbers down.
 */
const SEED = process.argv.includes('--seed')

/**
 * Persist a baseline and report the movement.
 * @param input - file, complete value, previous and measured numbers, dimension key.
 */
function save({ file, value, before, after, key }) {
  if (before !== undefined && after > before && !SEED) {
    console.log(`  ${key}: ${after} > ${before} — baseline NOT raised (pass --seed to accept)`)
    return
  }
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
  console.log(
    `  ${key}: ${before ?? '(new)'} -> ${after}${before !== undefined && after > before ? ' (seeded)' : ''}`,
  )
}

// ---- lint warnings -------------------------------------------------------
const eslint = new ESLint({ cwd: ROOT })
const results = await eslint.lintFiles(['.'])
const warnings = results.reduce((total, result) => total + result.warningCount, 0)
const errors = results.reduce((total, result) => total + result.errorCount, 0)
const eslintVersion = createRequire(import.meta.url)('eslint/package.json').version

console.log('\nlint')
if (errors > 0) console.log(`  ${errors} error(s) present — fix them before tightening`)
const storedLint = read(LINT_FILE)
save({
  file: LINT_FILE,
  value: {
    max_warnings: SEED ? warnings : Math.min(warnings, storedLint?.max_warnings ?? warnings),
    tool_version: eslintVersion,
    scan_args: ['eslint', '.'],
  },
  before: storedLint?.max_warnings,
  after: warnings,
  key: 'max_warnings',
})

// ---- duplication ---------------------------------------------------------
let dupOutput = ''
try {
  dupOutput = execFileSync(
    process.execPath,
    [
      join(ROOT, 'node_modules', 'jscpd', 'run-jscpd.js'),
      ...DUP_SCAN,
      '--min-tokens',
      '50',
      '--reporters',
      'console',
      '--silent',
    ],
    { cwd: ROOT, encoding: 'utf8' },
  )
} catch (error) {
  dupOutput = `${error.stdout ?? ''}${error.stderr ?? ''}`
}
const dupMatch = /Found (\d+) exact clones with (\d+)\(([\d.]+)%\) duplicated lines/.exec(dupOutput)

console.log('\nduplication')
if (dupMatch === null) {
  console.log('  could not parse jscpd output — baseline left unchanged')
} else {
  const stored = read(DUP_FILE)
  const measured = {
    clones: Number(dupMatch[1]),
    lines: Number(dupMatch[2]),
    percentage: Number(dupMatch[3]),
  }
  // Clones is the only dimension that tightens on its own: lines and
  // percentage drift with the total line count, so a percentage that fell
  // because the codebase grew would bounce straight back on the next edit.
  // All three are re-recorded together, and only when clones genuinely drops.
  const tighter = SEED || stored === undefined || measured.clones < stored.clones
  const next = tighter
    ? { ...measured, tool_version: '5', scan_args: ['jscpd', ...DUP_SCAN, '--min-tokens', '50'] }
    : {
        clones: stored.clones,
        lines: stored.lines,
        percentage: stored.percentage,
        tool_version: '5',
        scan_args: ['jscpd', ...DUP_SCAN, '--min-tokens', '50'],
      }
  save({
    file: DUP_FILE,
    value: next,
    before: stored?.clones,
    after: measured.clones,
    key: 'clones',
  })
}

// ---- format --------------------------------------------------------------
/**
 * Collect .js/.mjs files under a directory, recursively.
 * @param relativeDir - directory relative to the repo root.
 * @returns repo-relative paths.
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
    if (entry.isDirectory()) out.push(...walk(child))
    else if (/\.(js|mjs)$/.test(entry.name)) out.push(child)
  }
  return out
}

const candidates = [
  ...walk('packages/dsh-workspace-split/src'),
  ...walk('gate'),
  ...walk('test'),
  'packages/dsh-workspace-split/index.js',
  'packages/dsh-workspace-split/build.mjs',
]

const dirty = []
for (const file of candidates) {
  const absolute = join(ROOT, file)
  if (!existsSync(absolute)) continue
  const info = await prettier.getFileInfo(absolute)
  if (info.ignored) continue
  const options = await prettier.resolveConfig(absolute)
  if (!(await prettier.check(readFileSync(absolute, 'utf8'), { ...options, filepath: absolute }))) {
    dirty.push(file)
  }
}

console.log('\nformat')
const previousFiles = read(FORMAT_FILE)?.files ?? []
// Only files that were already frozen may stay frozen; a newly dirty file is a
// regression and must be formatted instead of joining the baseline.
const regressed = dirty.filter((file) => previousFiles.length > 0 && !previousFiles.includes(file))
const kept = dirty.filter((file) => previousFiles.length === 0 || previousFiles.includes(file))
if (regressed.length > 0) {
  console.log(`  ${regressed.length} file(s) newly unformatted — NOT frozen, format them:`)
  for (const file of regressed) console.log(`    ${file}`)
}
writeFileSync(FORMAT_FILE, `${JSON.stringify({ files: kept.sort() }, null, 2)}\n`)
console.log(`  frozen files: ${previousFiles.length} -> ${kept.length}`)

console.log('\nbaselines updated — commit them with the change they measure')
