#!/usr/bin/env node
// Thin shell around `dsh-plugin-e2e run`.
//
// Concurrency and cleanup belong to the library now: `dsh-isolated-env` owns a
// machine-wide N-slot semaphore (`acquireSlot`) plus `sweep`, and
// `dsh-plugin-e2e run` already takes a slot, waits for one, and auto-sweeps when
// it finishes. This wrapper forwards every argument unchanged. Its extra clean
// is limited to homes older than this run, and is skipped whenever retained
// homes or unlimited (unregistered) instances could still be alive.
//
// Usage:
//   npm run test:e2e:live                 # default slots
//   npm run test:e2e:live -- --max-parallel 5
//   DSH_E2E_MAX_PARALLEL=3 npm run test:e2e:live
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { findIsolatedBin } from './find-isolated-env.mjs'

const repoRoot = resolve(import.meta.dirname, '..')
const e2eBin = join(repoRoot, 'node_modules', 'dsh-plugin-e2e', 'bin', 'dsh-plugin-e2e.mjs')

function run(command, args) {
  return new Promise((done) => {
    const child = spawn(process.execPath, [command, ...args], {
      stdio: 'inherit',
      env: process.env,
    })
    child.once('exit', (code, signal) => done(code ?? (signal ? 1 : 0)))
    child.once('error', () => done(1))
  })
}

function optionValue(args, name) {
  const index = args.indexOf(name)
  if (index < 0) return undefined
  const next = args[index + 1]
  return next === undefined || next.startsWith('--') ? true : next
}

async function readConfig(args) {
  try {
    const configPath = resolve(process.cwd(), optionValue(args, '--config') || 'e2e.config.mjs')
    const mod = await import(pathToFileURL(configPath).href)
    return mod.default || mod
  } catch {
    // The library remains the authority for config errors and exit codes.
    return {}
  }
}

function isZero(value) {
  return value !== undefined && value !== true && value !== '' && Number(value) === 0
}

function hasUnlimitedParallelism(args, config, env) {
  const cliValue = optionValue(args, '--max-parallel')
  const configured = cliValue === undefined ? config.maxParallel : cliValue
  if (configured !== undefined) return isZero(configured)
  return env.DSH_E2E_MAX_PARALLEL !== undefined && Number(env.DSH_E2E_MAX_PARALLEL) === 0
}

function shouldSkipClean(args, config, env) {
  return (
    args.includes('--keep-home') ||
    args.includes('--keep-on-failure') ||
    args.includes('--no-sweep') ||
    env.DSH_E2E_NO_SWEEP === '1' ||
    Boolean(config.keepHome) ||
    Boolean(config.keepOnFailure) ||
    hasUnlimitedParallelism(args, config, env)
  )
}

if (!existsSync(e2eBin)) {
  console.error(`[e2e] 找不到 ${e2eBin}；请先把 dsh-plugin-e2e 链接进 node_modules。`)
  process.exit(2)
}

const forwarded = process.argv.slice(2)
const startedAt = Date.now()
const code = await run(e2eBin, ['run', ...forwarded])
const config = await readConfig(forwarded)

// An unbounded clean can delete a retained home or a live instance that has no
// slot registration. The age bound also protects homes created by other runs
// after this one started.
if (!shouldSkipClean(forwarded, config, process.env)) {
  const isolated = findIsolatedBin()
  if (isolated !== undefined) {
    const olderThan = String(Math.ceil((Date.now() - startedAt) / 60000))
    const cleanCode = await run(isolated, ['clean', '--older-than', olderThan])
    if (cleanCode !== 0) console.warn('[e2e] 清理残留返回非零，但不影响本次结果')
  }
}

process.exit(code)
