/**
 * commit-msg gate: Conventional Commits, matching the history this repo already
 * carries (`feat:` / `fix:` / `style:` / `docs:` + English subject, optional
 * bullet body).
 */

import { readFileSync } from 'node:fs'
import { validateCommitSubject } from './commit_subject.mjs'

const file = process.argv[2]
if (file === undefined) {
  console.error('usage: node gate/commit-msg.mjs <commit-msg-file>')
  process.exit(1)
}

// Comments carry the template help text; everything else is the real message.
const lines = readFileSync(file, 'utf8')
  .split('\n')
  .filter((line) => !line.startsWith('#'))

const subject = (lines[0] ?? '').trim()

const problems = validateCommitSubject(subject)

if (problems.length > 0) {
  console.error('commit-msg failed:')
  for (const problem of problems) console.error(`  - ${problem}`)
  console.error(`\nsubject: ${subject}`)
  process.exit(1)
}
