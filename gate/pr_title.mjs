/** Validate the PR title that GitHub will reuse for a squash merge. */

import { validateCommitSubject } from './commit_subject.mjs'

const title = (process.env.PR_TITLE ?? '').trim()
const problems = validateCommitSubject(title, { allowGitGenerated: false })
if (problems.length > 0) {
  console.error('PR title failed:')
  for (const problem of problems) console.error(`  - ${problem}`)
  console.error(`\ntitle: ${title}`)
  process.exit(1)
}
console.log('PR title follows Conventional Commits')
