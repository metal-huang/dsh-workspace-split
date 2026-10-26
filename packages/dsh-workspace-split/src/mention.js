/**
 * `@` reference grammar, copied from the harness's MIT-licensed
 * `dsh-file-reference` grammar so a split composer inserts the exact text the
 * main composer and the model-side prompt parser expect.
 */

/** Shape one regex match into a token, or undefined. */
function tokenFromMatch(match, column, quoted) {
  if (match?.[1] === undefined || match[2] === undefined) return undefined
  const lead = match[1].startsWith('@') ? 0 : 1
  return {
    prefix: match[1],
    query: match[2],
    quoted,
    start: column - match[1].length + lead,
    end: column,
  }
}

/** Quoted token (`@"a b`), or undefined. */
function quotedToken(before, column) {
  return tokenFromMatch(/(?:^|\s)(@"([^"]*))$/u.exec(before), column, true)
}

/** Plain token (`@src/cli`), or undefined. */
function plainToken(before, column) {
  return tokenFromMatch(/(?:^|\s)(@([^\s]*))$/u.exec(before), column, false)
}

/**
 * The `@` token under the caret.
 * @param line - current line text.
 * @param cursorCol - caret column.
 * @returns `{prefix, query, quoted, start, end}`, or undefined.
 */
export function activeAtToken(line, cursorCol) {
  if (typeof line !== 'string') return undefined
  const column = Number.isInteger(cursorCol) ? cursorCol : line.length
  const before = line.slice(0, column)
  return quotedToken(before, column) ?? plainToken(before, column)
}

/** Whether a path contains control characters or a double quote. */
function unsafePath(path) {
  for (const char of path) {
    const code = char.codePointAt(0)
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f) || char === '"') return true
  }
  return false
}

/**
 * Format one file candidate as a mention token.
 * @param candidate - `{path, kind}`.
 * @param preserveQuote - keep the opening quote the reader already typed.
 * @returns mention text, or undefined for an unsafe path.
 */
export function formatFileMention(candidate, preserveQuote) {
  const raw = typeof candidate?.path === 'string' ? candidate.path : ''
  const path = candidate?.kind === 'directory' ? `${raw}/` : raw
  if (unsafePath(path)) return undefined
  const quoted = preserveQuote === true || /\s/u.test(path)
  if (!quoted) return `@${path}`
  if (candidate?.kind === 'directory') return `@"${path}`
  return `@"${path}"`
}

/**
 * Replace the active token with one chosen mention.
 * @param text - full draft.
 * @param token - result of `activeAtToken`.
 * @param mention - replacement mention text.
 * @returns new draft with the token replaced.
 */
export function replaceMention(text, token, mention) {
  if (token === undefined || typeof mention !== 'string') return text
  return `${text.slice(0, token.start)}${mention}${text.slice(token.end)}`
}

/** Label of one session mention candidate. */
function sessionLabel(candidate) {
  return {
    name: candidate.displayTitle ?? candidate.label ?? candidate.mention,
    parent: candidate.sameWorkspace === false ? (candidate.workspaceTitle ?? '') : '',
  }
}

/** Label of one file or directory candidate. */
function pathLabel(candidate) {
  const path = typeof candidate?.path === 'string' ? candidate.path : ''
  const at = path.lastIndexOf('/')
  if (at < 0) return { name: path, parent: '' }
  return { name: path.slice(at + 1) || path, parent: path.slice(0, at) }
}

/**
 * Row labels for one candidate: leaf name and parent path.
 * @param candidate - file, directory, or session candidate.
 * @returns `{name, parent}`.
 */
export function candidateLabel(candidate) {
  return typeof candidate?.mention === 'string' ? sessionLabel(candidate) : pathLabel(candidate)
}
