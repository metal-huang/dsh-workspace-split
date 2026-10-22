/**
 * Duplication gate: three dimensions counted over the handwritten sources and
 * compared with gate/dup_baseline.json.
 *
 * jscpd 5.x is a Rust CLI with no JS API, so the runner shells out and parses
 * the console summary. All three dimensions must stay within the baseline —
 * percentage alone can fall while duplication rises when the codebase grows
 * faster, so clones is the dimension tightening trusts.
 */

import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { heading, readBaseline, ROOT } from './lib.mjs'

const BASELINE_FILE = join(ROOT, 'gate', 'dup_baseline.json')
const SCAN_PATHS = [
  'packages/dsh-workspace-split/src',
  'packages/dsh-workspace-split/index.js',
  'packages/dsh-workspace-split/build.mjs',
  'gate',
]
const MIN_TOKENS = '50'

const baseline = readBaseline(BASELINE_FILE)

let output = ''
try {
  output = execFileSync(
    process.execPath,
    [
      join(ROOT, 'node_modules', 'jscpd', 'run-jscpd.js'),
      ...SCAN_PATHS,
      '--min-tokens',
      MIN_TOKENS,
      '--reporters',
      'console',
      '--silent',
    ],
    { cwd: ROOT, encoding: 'utf8' },
  )
} catch (error) {
  output = `${error.stdout ?? ''}${error.stderr ?? ''}`
}

// "Found 3 exact clones with 120(2.4%) duplicated lines in 12 files"
const summary = /Found (\d+) exact clones with (\d+)\(([\d.]+)%\) duplicated lines/.exec(output)
if (summary === null) {
  console.error('dup gate: could not parse jscpd output')
  console.error(output.trim().split('\n').slice(-5).join('\n'))
  process.exit(1)
}

const measured = {
  clones: Number(summary[1]),
  lines: Number(summary[2]),
  percentage: Number(summary[3]),
}

heading('duplication')
console.log(
  `  clones=${measured.clones} lines=${measured.lines} percentage=${measured.percentage}%`,
)

if (baseline === undefined) {
  console.log('\nno baseline yet — run `npm run ratchet:tighten` to create it')
  process.exit(0)
}

console.log(
  `  baseline: clones=${baseline.clones} lines=${baseline.lines} percentage=${baseline.percentage}%`,
)

const over = []
if (measured.clones > baseline.clones) over.push(`clones ${measured.clones} > ${baseline.clones}`)
if (measured.lines > baseline.lines) over.push(`lines ${measured.lines} > ${baseline.lines}`)
if (measured.percentage > baseline.percentage) {
  over.push(`percentage ${measured.percentage}% > ${baseline.percentage}%`)
}

if (over.length > 0) {
  console.error(`\ndup gate failed: ${over.join(', ')}`)
  process.exit(1)
}
console.log('  ok')
