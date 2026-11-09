/** Shared subject rules for local commit messages and squash-merge PR titles. */

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

/** Git-generated local commits keep their own shapes; PR titles never do. */
const EXEMPT = /^(Merge |Revert "|fixup! |squash! |amend! )/
const MAX_SUBJECT = 72

function validateShape(subject) {
  const match = /^([a-z]+)(\([^)]*\))?!?: (.+)$/.exec(subject)
  if (match === null) return ['subject must look like `type(scope): description`']

  const problems = []
  const [, type, , description] = match
  if (!TYPES.includes(type)) problems.push(`type "${type}" is not one of: ${TYPES.join(', ')}`)
  if (description.trim().length === 0) problems.push('description is empty')
  if (description.endsWith('.')) problems.push('description must not end with a period')
  return problems
}

/**
 * Return human-readable problems; an empty list means the subject is valid.
 * @param {string} subject - first line of a commit message or a PR title.
 * @param {{allowGitGenerated?: boolean}} options - local-only exemptions.
 */
export function validateCommitSubject(subject, { allowGitGenerated = true } = {}) {
  if (subject === '') return ['subject must not be empty']
  if (allowGitGenerated && EXEMPT.test(subject)) return []

  const problems = validateShape(subject)
  if (subject.length > MAX_SUBJECT) {
    problems.push(`subject is ${subject.length} chars, limit is ${MAX_SUBJECT}`)
  }
  return problems
}
