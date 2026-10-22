/**
 * Shared helpers for the gate scripts.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const GATE_DIR = join(ROOT, 'gate')
export const REPORTS_DIR = join(GATE_DIR, 'reports')

/** Path relative to the repo root, with forward slashes for stable baselines. */
export function relPath(absolute) {
  return relative(ROOT, absolute).split('\\').join('/')
}

/**
 * Run a git command and return its trimmed stdout.
 * @param args - git arguments.
 * @returns trimmed stdout.
 */
export function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim()
}

/** Print a gate header. */
export function heading(text) {
  console.log(`\n=== ${text} ===`)
}

/**
 * Read a JSON baseline, or undefined when the file does not exist yet.
 * @param file - absolute path.
 * @returns parsed baseline, or undefined.
 */
export function readBaseline(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return undefined
  }
}

/** Source paths every gate scans; the built artifact is deliberately absent. */
export const SOURCE_GLOBS = [
  'packages/*/src/**/*.{js,mjs}',
  'packages/*/index.js',
  'packages/*/build.mjs',
  'packages/*/test/**/*.js',
  'gate/**/*.mjs',
]
