/**
 * pre-commit gate, four layers:
 *
 * 1. dirty-area guard — reject conflict markers and whitespace damage
 * 2. directed Prettier check — only the staged files
 * 3. directed ESLint errors — only the staged files, error severity only
 * 4. new-file zero warnings — a file added by this commit carries no warnings
 *
 * Everything runs on the staged set, so a commit never depends on whatever
 * uncommitted work happens to sit in the tree.
 */

import { ESLint } from 'eslint'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import prettier from 'prettier'
import { git, heading, readBaseline, ROOT } from './lib.mjs'

const SCANNABLE = /\.(js|mjs)$/
/** Files whose formatting predates the gate; see gate/format_check.mjs. */
const frozenFormat = new Set(readBaseline(join(ROOT, 'gate', 'format_baseline.json'))?.files ?? [])

function fail(title, details) {
  console.error(`\npre-commit failed: ${title}`)
  for (const line of details) console.error(`  ${line}`)
  process.exit(1)
}

// ---- 1. dirty-area guard -------------------------------------------------
heading('staged diff hygiene')
try {
  git(['diff', '--cached', '--check'])
} catch (error) {
  fail('conflict markers or whitespace damage in the staged diff', [
    String(error.stdout ?? error.message).trim(),
  ])
}
console.log('  ok')

// ---- staged inventory ----------------------------------------------------
const staged = git(['diff', '--cached', '--name-only', '--diff-filter=ACMR'])
  .split('\n')
  .filter(Boolean)
const stagedJs = staged.filter((file) => SCANNABLE.test(file))
const addedJs = git(['diff', '--cached', '--name-only', '--diff-filter=A'])
  .split('\n')
  .filter((file) => file !== '' && SCANNABLE.test(file))

// The built artifact is generated; it is never linted or formatted.
const lintable = stagedJs.filter((file) => !file.endsWith('/client.js'))

// ---- 2. directed Prettier check -----------------------------------------
heading('staged formatting')
const unformatted = []
for (const file of lintable) {
  if (frozenFormat.has(file)) continue
  const absolute = join(ROOT, file)
  if (!existsSync(absolute)) continue
  const info = await prettier.getFileInfo(absolute)
  if (info.ignored) continue
  const options = await prettier.resolveConfig(absolute)
  if (!(await prettier.check(readFileSync(absolute, 'utf8'), { ...options, filepath: absolute }))) {
    unformatted.push(file)
  }
}
if (unformatted.length > 0) {
  fail('staged files must be Prettier-clean', [
    ...unformatted,
    '',
    'run `npx prettier --write <file>`',
  ])
}
console.log(`  ok (${lintable.length} staged source file(s))`)

// ---- 3. directed ESLint errors ------------------------------------------
heading('staged lint errors')
if (lintable.length > 0) {
  const eslint = new ESLint({ cwd: ROOT })
  const results = await eslint.lintFiles(lintable)
  const errors = results.flatMap((result) =>
    result.messages
      .filter((message) => message.severity === 2)
      .map(
        (message) =>
          `${result.filePath.replace(`${ROOT}\\`, '')} L${message.line}: ${message.ruleId} ${message.message}`,
      ),
  )
  if (errors.length > 0) fail('error-severity findings in staged files', errors)
}
console.log('  ok')

// ---- 4. new-file zero warnings ------------------------------------------
heading('new files carry no warnings')
if (addedJs.length > 0) {
  const eslint = new ESLint({ cwd: ROOT })
  const results = await eslint.lintFiles(addedJs)
  const warnings = results.flatMap((result) =>
    result.messages
      .filter((message) => message.severity === 1)
      .map(
        (message) =>
          `${result.filePath.replace(`${ROOT}\\`, '')} L${message.line}: ${message.ruleId} ${message.message}`,
      ),
  )
  if (warnings.length > 0) fail('a newly added file must be warning-free', warnings)
  console.log(`  ok (${addedJs.length} new file(s))`)
} else {
  console.log('  ok (no new files)')
}

console.log('\npre-commit passed')
