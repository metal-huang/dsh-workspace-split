/**
 * Lint gate: errors block, warnings ratchet against gate/lint_baseline.json.
 *
 * The baseline lives in a file rather than `--max-warnings` in a script so that
 * tightening can land in the same commit as the code it measures.
 */

import { ESLint } from 'eslint'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { heading, readBaseline, relPath, REPORTS_DIR, ROOT } from './lib.mjs'

const BASELINE_FILE = join(ROOT, 'gate', 'lint_baseline.json')

const baseline = readBaseline(BASELINE_FILE)
const eslint = new ESLint({ cwd: ROOT })
const results = await eslint.lintFiles(['.'])

mkdirSync(REPORTS_DIR, { recursive: true })
writeFileSync(
  join(REPORTS_DIR, 'eslint.json'),
  JSON.stringify(
    results.map((r) => ({ file: relPath(r.filePath), ...r })),
    null,
    2,
  ),
)

let errors = 0
let warnings = 0
const perFile = []
for (const result of results) {
  if (result.errorCount === 0 && result.warningCount === 0) continue
  errors += result.errorCount
  warnings += result.warningCount
  perFile.push({
    file: relPath(result.filePath),
    errors: result.errorCount,
    warnings: result.warningCount,
    messages: result.messages.map((m) => ({
      line: m.line,
      rule: m.ruleId,
      severity: m.severity === 2 ? 'error' : 'warn',
      message: m.message,
    })),
  })
}

heading('lint')
for (const row of perFile) {
  console.log(`  ${row.file}: ${row.errors} error(s), ${row.warnings} warning(s)`)
  for (const m of row.messages) {
    if (m.severity === 'error') console.log(`    L${m.line} ${m.rule}: ${m.message}`)
  }
}

if (baseline === undefined) {
  console.log('\nno baseline yet — run `npm run ratchet:tighten` to create it')
  console.log(`errors=${errors} warnings=${warnings}`)
  process.exit(errors === 0 ? 0 : 1)
}

const ceiling = baseline.max_warnings
const version = (await eslint.calculateConfigForFile('eslint.config.mjs'))?.linterVersion
console.log(`\n  errors=${errors} (limit 0)  warnings=${warnings} (limit ${ceiling})`)
if (
  baseline.tool_version !== undefined &&
  version !== undefined &&
  baseline.tool_version !== version
) {
  console.log(`  note: baseline recorded eslint ${baseline.tool_version}, running ${version}`)
}

if (errors > 0) {
  console.error('\nlint failed: errors must be zero')
  process.exit(1)
}
if (warnings > ceiling) {
  console.error(`\nlint failed: ${warnings} warnings exceeds the baseline of ${ceiling}`)
  console.error('fix them, or run `npm run ratchet:tighten` only after they are genuinely cleaned')
  process.exit(1)
}
console.log('  ok')
