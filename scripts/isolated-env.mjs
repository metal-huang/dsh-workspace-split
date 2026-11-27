#!/usr/bin/env node
// Forward a command to the library's `dsh-isolated-env` CLI.
// Concurrency slots and temp-home cleanup are the library's job; this only makes
// them reachable as `npm run e2e:clean` / `npm run e2e:slots` from this repo.
//
// `npm run e2e:clean` is a safe dry-run by default, including when npm consumes
// a `--dry-run` written without the `--` separator. Only
// `npm run e2e:clean -- --yes` deletes; `--yes --dry-run` still previews.
// `--yes` belongs to this project shell and is never forwarded to the library.
import { spawn } from 'node:child_process'
import { findIsolatedBin } from './find-isolated-env.mjs'

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error(
    '用法: node scripts/isolated-env.mjs <clean|slots> [args...]\n' +
      'clean 默认 --dry-run；显式 --yes 才真删，--yes 与 --dry-run 同给时仍预览。',
  )
  process.exit(2)
}

const forwarded = [...args]
if (args[0] === 'clean') {
  const yes = args.includes('--yes')
  const dryRun = !yes || args.includes('--dry-run')
  for (let i = forwarded.length - 1; i >= 0; i -= 1) {
    if (forwarded[i] === '--yes') forwarded.splice(i, 1)
  }
  if (dryRun && !forwarded.includes('--dry-run')) forwarded.push('--dry-run')
}

const bin = findIsolatedBin()
if (bin === undefined) {
  console.error('[e2e] 找不到 dsh-isolated-env CLI；请先把 dsh-plugin-e2e 链接进 node_modules。')
  process.exit(2)
}

const child = spawn(process.execPath, [bin, ...forwarded], { stdio: 'inherit', env: process.env })
child.once('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)))
child.once('error', () => process.exit(1))
