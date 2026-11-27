import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'

const repoRoot = resolve(import.meta.dirname, '..')
const scriptNames = ['e2e-live.mjs', 'find-isolated-env.mjs', 'isolated-env.mjs']

function writeFixtureFile(root, relative, content) {
  const path = join(root, relative)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

function makeFixture(t, config = 'export default {}\n') {
  const root = mkdtempSync(join(tmpdir(), 'split-e2e-wrapper-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, 'scripts'), { recursive: true })
  for (const name of scriptNames) {
    copyFileSync(join(repoRoot, 'scripts', name), join(root, 'scripts', name))
  }
  writeFixtureFile(root, 'e2e.config.mjs', config)
  writeFixtureFile(
    root,
    'node_modules/dsh-plugin-e2e/bin/dsh-plugin-e2e.mjs',
    `import { appendFileSync } from 'node:fs'
appendFileSync(process.env.E2E_FIXTURE_LOG, JSON.stringify({ cli: 'e2e', args: process.argv.slice(2) }) + '\\n')
if (process.env.FAKE_E2E_DELAY) await new Promise((resolve) => setTimeout(resolve, Number(process.env.FAKE_E2E_DELAY)))
process.exit(Number(process.env.FAKE_E2E_EXIT || 0))
`,
  )
  writeFixtureFile(
    root,
    'node_modules/dsh-isolated-env/bin/dsh-isolated-env.mjs',
    `import { appendFileSync } from 'node:fs'
appendFileSync(process.env.E2E_FIXTURE_LOG, JSON.stringify({ cli: 'isolated', args: process.argv.slice(2) }) + '\\n')
process.exit(Number(process.env.FAKE_ISOLATED_EXIT || 0))
`,
  )
  return { root, log: join(root, 'calls.jsonl') }
}

function runScript(fixture, script, args = [], extraEnv = {}) {
  const env = { ...process.env }
  delete env.DSH_E2E_HOME
  delete env.DSH_E2E_MAX_PARALLEL
  delete env.DSH_E2E_NO_SWEEP
  Object.assign(env, extraEnv, { E2E_FIXTURE_LOG: fixture.log })
  return spawnSync(process.execPath, [join(fixture.root, 'scripts', script), ...args], {
    cwd: fixture.root,
    env,
    encoding: 'utf8',
  })
}

function runLive(fixture, args = [], env = {}) {
  return runScript(fixture, 'e2e-live.mjs', args, env)
}

function readCalls(fixture) {
  if (!existsSync(fixture.log)) return []
  return readFileSync(fixture.log, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
}

function assertOnlyE2eRun(fixture, result, forwarded) {
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(readCalls(fixture), [{ cli: 'e2e', args: ['run', ...forwarded] }])
}

test('e2e-live forwards max-parallel and cleans only pre-run homes', (t) => {
  const fixture = makeFixture(t)
  const result = runLive(fixture, ['--max-parallel', '1', '--json'])
  assert.equal(result.status, 0, result.stderr)
  const calls = readCalls(fixture)
  assert.deepEqual(calls[0], {
    cli: 'e2e',
    args: ['run', '--max-parallel', '1', '--json'],
  })
  assert.equal(calls.length, 2)
  assert.deepEqual(calls[1].args.slice(0, 2), ['clean', '--older-than'])
  assert.ok(Number.isFinite(Number(calls[1].args[2])))
  assert.ok(Number(calls[1].args[2]) >= 0)
  assert.equal(calls[1].args.length, 3)
})

for (const flag of ['--keep-home', '--keep-on-failure', '--no-sweep']) {
  test(`e2e-live does not clean after ${flag}`, (t) => {
    const fixture = makeFixture(t)
    const forwarded = [flag, '--max-parallel', '2']
    assertOnlyE2eRun(fixture, runLive(fixture, forwarded), forwarded)
  })
}

test('e2e-live honors DSH_E2E_NO_SWEEP', (t) => {
  const fixture = makeFixture(t)
  assertOnlyE2eRun(fixture, runLive(fixture, [], { DSH_E2E_NO_SWEEP: '1' }), [])
})

test('e2e-live reads keepHome from the selected config', (t) => {
  const fixture = makeFixture(t)
  writeFixtureFile(fixture.root, 'config/keep.mjs', 'export default { keepHome: true }\n')
  const forwarded = ['--config', 'config/keep.mjs', '--max-parallel', '2']
  assertOnlyE2eRun(fixture, runLive(fixture, forwarded), forwarded)
})

test('e2e-live does not clean a config-retained failed run', (t) => {
  const fixture = makeFixture(t)
  writeFixtureFile(
    fixture.root,
    'config/keep-on-failure.mjs',
    'export default { keepOnFailure: true }\n',
  )
  const forwarded = ['--config', 'config/keep-on-failure.mjs']
  const result = runLive(fixture, forwarded, { FAKE_E2E_EXIT: '1' })
  assert.equal(result.status, 1, result.stderr)
  assert.deepEqual(readCalls(fixture), [{ cli: 'e2e', args: ['run', ...forwarded] }])
})

const unlimitedCases = [
  { name: 'CLI', args: ['--max-parallel', '0'] },
  { name: 'config', config: 'export default { maxParallel: 0 }\n' },
  { name: 'environment', env: { DSH_E2E_MAX_PARALLEL: '0' } },
]
for (const item of unlimitedCases) {
  test(`e2e-live does not clean with unlimited parallelism from ${item.name}`, (t) => {
    const fixture = makeFixture(t, item.config)
    const args = item.args || []
    assertOnlyE2eRun(fixture, runLive(fixture, args, item.env), args)
  })
}

test('e2e-live returns the child exit code unchanged', (t) => {
  const fixture = makeFixture(t)
  const result = runLive(fixture, ['--max-parallel', '1'], { FAKE_E2E_EXIT: '2' })
  assert.equal(result.status, 2, result.stderr)
  const calls = readCalls(fixture)
  assert.equal(calls.length, 2)
  assert.equal(calls[1].cli, 'isolated')
  assert.equal(calls[1].args[0], 'clean')
})

for (const args of [['clean'], ['clean', '--dry-run']]) {
  test(`isolated-env dry-runs ${args.join(' ') || '(default)'}`, (t) => {
    const fixture = makeFixture(t)
    const result = runScript(fixture, 'isolated-env.mjs', args)
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(readCalls(fixture), [{ cli: 'isolated', args: ['clean', '--dry-run'] }])
  })
}

test('isolated-env removes --yes for an explicit real clean', (t) => {
  const fixture = makeFixture(t)
  const result = runScript(fixture, 'isolated-env.mjs', ['clean', '--yes', '--older-than', '5'])
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(readCalls(fixture), [{ cli: 'isolated', args: ['clean', '--older-than', '5'] }])
})

test('isolated-env gives --dry-run priority over --yes', (t) => {
  const fixture = makeFixture(t)
  const result = runScript(fixture, 'isolated-env.mjs', ['clean', '--yes', '--dry-run'])
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(readCalls(fixture), [{ cli: 'isolated', args: ['clean', '--dry-run'] }])
})

test('isolated-env forwards slots unchanged', (t) => {
  const fixture = makeFixture(t)
  const result = runScript(fixture, 'isolated-env.mjs', ['slots'])
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(readCalls(fixture), [{ cli: 'isolated', args: ['slots'] }])
})
