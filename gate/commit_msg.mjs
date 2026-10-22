/**
 * commit-msg gate: Conventional Commits, matching the history this repo already
 * carries (`feat:` / `fix:` / `style:` / `docs:` + English subject, optional
 * bullet body).
 */

import { readFileSync } from 'node:fs'

const TYPES = [
  'feat',
  'fix',
  'refactor',
  'docs',
  'test',
  'chore',
  'perf',
  'ci',
  'build',
  'style',
  'revert',
]

/** Merge, revert-by-git and fixup commits keep their own shapes. */
const EXEMPT = /^(Merge |Revert "|fixup! |squash! |amend! )/

const MAX_SUBJECT = 72

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

if (subject === '') {
  console.error('commit-msg: empty subject')
  process.exit(1)
}
if (EXEMPT.test(subject)) process.exit(0)

const problems = []
const match = /^([a-z]+)(\([^)]*\))?!?: (.+)$/.exec(subject)

if (match === null) {
  problems.push('subject must look like `type(scope): description`')
} else {
  const [, type, , description] = match
  if (!TYPES.includes(type)) problems.push(`type "${type}" is not one of: ${TYPES.join(', ')}`)
  if (description.trim().length === 0) problems.push('description is empty')
  if (description.endsWith('.')) problems.push('description must not end with a period')
}
if (subject.length > MAX_SUBJECT) {
  problems.push(`subject is ${subject.length} chars, limit is ${MAX_SUBJECT}`)
}

if (problems.length > 0) {
  console.error('commit-msg failed:')
  for (const problem of problems) console.error(`  - ${problem}`)
  console.error(`\nsubject: ${subject}`)
  process.exit(1)
}
