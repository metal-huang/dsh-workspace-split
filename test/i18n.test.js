/**
 * i18n gate.
 *
 * Two things must hold: the Chinese table and the English overlay define the
 * same keys, and the client source carries no hardcoded Han text outside
 * comments — every user-visible string goes through `t()`.
 *
 * The assertions live in `it()` blocks on purpose: assertions at describe level
 * still throw, but the runner reports zero tests, so a regression looks like a
 * missing test rather than a failure.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

const SRC_DIR = join(import.meta.dirname, '..', 'packages', 'dsh-workspace-split', 'src')
const ZH_FILE = join(SRC_DIR, 'messages.js')
const EN_FILE = join(SRC_DIR, 'locale', 'en.json')
const CLIENT_SRC = join(SRC_DIR, 'client.js')

/** Keys declared in the Chinese table, in file order. */
function chineseKeys() {
  const source = readFileSync(ZH_FILE, 'utf8')
  return Array.from(source.matchAll(/^\s*'([\w.]+)'\s*:/gm)).map((match) => match[1])
}

/**
 * Han text that survives comment stripping.
 *
 * Only the part before a line comment is inspected, so a Chinese comment at the
 * end of a code line does not count as copy.
 * @param source - file contents.
 * @returns offending lines with their 1-based numbers.
 */
function hardcodedChineseLines(source) {
  const offending = []
  const lines = source.split('\n')
  let inBlockComment = false
  for (let i = 0; i < lines.length; i += 1) {
    let line = lines[i]
    if (inBlockComment) {
      const end = line.indexOf('*/')
      if (end === -1) continue
      line = line.slice(end + 2)
      inBlockComment = false
    }
    line = line.replace(/\/\*.*?\*\//g, '')
    const blockStart = line.indexOf('/*')
    if (blockStart !== -1) {
      line = line.slice(0, blockStart)
      inBlockComment = true
    }
    const lineComment = line.indexOf('//')
    if (lineComment !== -1) line = line.slice(0, lineComment)
    if (/\p{Script=Han}/u.test(line)) offending.push(`${i + 1}: ${line.trim()}`)
  }
  return offending
}

describe('translation tables', () => {
  it('defines the same keys in Chinese and English', () => {
    const zh = chineseKeys()
    const en = Object.keys(JSON.parse(readFileSync(EN_FILE, 'utf8')))
    assert.ok(zh.length > 0, 'no keys found in messages.js')
    const missingInEnglish = zh.filter((key) => !en.includes(key))
    const missingInChinese = en.filter((key) => !zh.includes(key))
    assert.deepEqual(missingInEnglish, [], 'keys missing from locale/en.json')
    assert.deepEqual(missingInChinese, [], 'keys missing from messages.js')
  })

  it('keeps every placeholder on both sides', () => {
    const zh = readFileSync(ZH_FILE, 'utf8')
    const en = JSON.parse(readFileSync(EN_FILE, 'utf8'))
    const placeholders = (text) =>
      Array.from(text.matchAll(/\{\{(\w+)\}\}/g))
        .map((m) => m[1])
        .sort()
    for (const key of chineseKeys()) {
      const zhLine = zh.match(new RegExp(`'${key.replaceAll('.', '\\.')}':\\s*'([^']*)'`))
      if (zhLine === null) continue
      assert.deepEqual(
        placeholders(zhLine[1]),
        placeholders(en[key] ?? ''),
        `placeholder mismatch for ${key}`,
      )
    }
  })
})

describe('client source', () => {
  it('carries no hardcoded Han text outside comments', () => {
    const offending = hardcodedChineseLines(readFileSync(CLIENT_SRC, 'utf8'))
    assert.deepEqual(offending, [], `hardcoded Chinese in client source:\n${offending.join('\n')}`)
  })

  it('only calls t() with keys that exist', () => {
    const source = readFileSync(CLIENT_SRC, 'utf8')
    const used = new Set(Array.from(source.matchAll(/\bt\('([\w.]+)'/g)).map((m) => m[1]))
    const known = new Set(chineseKeys())
    const unknown = [...used].filter((key) => !known.has(key))
    assert.deepEqual(unknown, [], `t() called with undeclared keys: ${unknown.join(', ')}`)
  })
})
