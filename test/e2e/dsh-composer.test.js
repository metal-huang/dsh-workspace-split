/* eslint-disable max-lines-per-function -- the fixture sequence is one scenario, split only by assertions */
/**
 * Browser regression for the split cell's chat-parity seats.
 *
 * Boots a throwaway DSH web profile with this package linked, opens the client
 * with `?dsws-test`, and drives the guarded fixture hook. The hook only exists
 * behind that query parameter, so a real page never renders fake approvals.
 *
 * Skipped when DSH, Chrome, or the built client artifact is absent.
 */

import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { after, before, describe, it } from 'node:test'

const ROOT = resolve(import.meta.dirname, '..', '..')
const PACKAGE = join(ROOT, 'packages', 'dsh-workspace-split')
const ARTIFACT = join(PACKAGE, 'client.js')
const READY_TIMEOUT_MS = 30000

const CHROME_CANDIDATES = [
  process.env.DSWS_CHROME,
  process.env.CHROME_BIN,
  '/snap/bin/chromium',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
]

function firstExisting(candidates) {
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== '' && existsSync(candidate)) return candidate
  }
  return null
}

function findOnPath(command) {
  try {
    const locator = process.platform === 'win32' ? 'where.exe' : 'which'
    const output = execFileSync(locator, [command], { encoding: 'utf8' })
    const lines = output
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line !== '')
    // `where` also lists the extensionless POSIX shim, which Node cannot spawn
    // on Windows; prefer the .cmd/.exe launcher when both exist.
    return lines.find((line) => /\.(?:cmd|exe|bat)$/iu.test(line)) ?? lines[0] ?? null
  } catch {
    return null
  }
}

const chromePath = firstExisting(CHROME_CANDIDATES)
const dshPath = process.env.DSH_BIN ?? findOnPath('dsh')

/** Spawn DSH through its JS entry when the launcher is a shim. */
function dshInvocation() {
  if (dshPath === null) return null
  const entry = join(resolve(dshPath, '..'), 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
  if (existsSync(entry)) return { command: process.execPath, prefix: [entry], shell: false }
  return { command: dshPath, prefix: [], shell: process.platform === 'win32' }
}

const dshCommand = dshInvocation()

const skip =
  chromePath === null
    ? 'no Chromium/Chrome binary; set DSWS_CHROME'
    : dshCommand === null
      ? 'no dsh binary; set DSH_BIN'
      : !existsSync(ARTIFACT)
        ? 'client.js is not built; run npm run build'
        : false

/** Free TCP port. */
async function freePort() {
  const probe = createServer()
  await new Promise((done) => probe.listen(0, '127.0.0.1', done))
  const port = probe.address().port
  await new Promise((done) => probe.close(done))
  return port
}

/** Wait for Chromium's DevTools endpoint. */
async function waitForDevTools(port, deadline) {
  for (;;) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (response.ok) return
    } catch {}
    if (Date.now() > deadline) throw new Error('Chromium DevTools endpoint never answered')
    await new Promise((done) => setTimeout(done, 100))
  }
}

/** Minimal DevTools client. */
function connect(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl)
  const pending = new Map()
  let nextId = 0
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    const waiter = pending.get(message.id)
    if (waiter === undefined) return
    pending.delete(message.id)
    waiter(message)
  })
  const opened = new Promise((done, fail) => {
    socket.addEventListener('open', done, { once: true })
    socket.addEventListener('error', () => fail(new Error('DevTools socket failed')), {
      once: true,
    })
  })
  return {
    opened,
    close: () => socket.close(),
    send: (method, params) =>
      new Promise((done) => {
        nextId += 1
        pending.set(nextId, done)
        socket.send(JSON.stringify({ id: nextId, method, params }))
      }),
  }
}

async function evaluate(client, expression) {
  const reply = await client.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  })
  if (reply.error !== undefined) throw new Error(JSON.stringify(reply.error))
  if (reply.result.exceptionDetails !== undefined) {
    throw new Error(reply.result.exceptionDetails.exception?.description ?? 'page threw')
  }
  return reply.result.result.value
}

/** Wait until the tab has a real HTTP origin (not about:blank). */
async function waitForOrigin(client) {
  const deadline = Date.now() + READY_TIMEOUT_MS
  for (;;) {
    const origin = await evaluate(client, 'location.origin').catch(() => 'null')
    if (origin.startsWith('http')) return
    if (Date.now() > deadline) throw new Error('the DSH tab never reached an HTTP origin')
    await new Promise((done) => setTimeout(done, 150))
  }
}

/** Wait until the page published the fixture hook. */
async function waitForHook(client) {
  const deadline = Date.now() + READY_TIMEOUT_MS
  for (;;) {
    const ready = await evaluate(client, 'typeof window.__dswsTest?.render === "function"').catch(
      () => false,
    )
    if (ready === true) return
    if (Date.now() > deadline) throw new Error('the split fixture hook never appeared')
    await new Promise((done) => setTimeout(done, 150))
  }
}

describe('split composer parity (headless DSH)', { skip }, () => {
  let home = null
  let dsh = null
  let browser = null
  let profileDir = null
  let page = null
  let url = null

  before(async () => {
    home = await mkdtemp(join(tmpdir(), 'dsws-dsh-e2e-'))
    const env = { ...process.env, DSH_HOME: home }
    const { command, prefix, shell } = dshCommand
    execFileSync(command, [...prefix, 'plugin', '--profile', 'web', 'add', PACKAGE], {
      env,
      stdio: 'ignore',
      shell,
    })
    const port = await freePort()
    dsh = spawn(command, [...prefix, 'web', '--no-open', '--port', String(port)], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell,
    })
    url = await new Promise((done, fail) => {
      let output = ''
      const timer = setTimeout(
        () => fail(new Error(`dsh web never printed a URL: ${output}`)),
        60000,
      )
      const read = (chunk) => {
        output += String(chunk)
        const match = /http:\/\/127\.0\.0\.1:\d+\/\?token=[\w-]+/u.exec(output)
        if (match !== null) {
          clearTimeout(timer)
          done(`${match[0]}&dsws-test`)
        }
      }
      dsh.stdout.on('data', read)
      dsh.stderr.on('data', read)
      dsh.once('exit', (code) => {
        clearTimeout(timer)
        fail(new Error(`dsh web exited ${code}: ${output}`))
      })
    })

    const debugPort = await freePort()
    profileDir = await mkdtemp(join(tmpdir(), 'dsws-dsh-chrome-'))
    browser = spawn(
      chromePath,
      [
        '--headless=new',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        `--remote-debugging-port=${debugPort}`,
        `--user-data-dir=${profileDir}`,
        'about:blank',
      ],
      { stdio: 'ignore' },
    )
    await waitForDevTools(debugPort, Date.now() + READY_TIMEOUT_MS)
    const created = await fetch(
      `http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(url)}`,
      { method: 'PUT' },
    ).then((response) => response.json())
    page = connect(created.webSocketDebuggerUrl)
    await page.opened
    await waitForOrigin(page)
    // The app rewrites the URL and drops the query before the plugin bundle
    // evaluates, so persist the flag and reload with the token URL once.
    await evaluate(
      page,
      `localStorage.setItem('dsws-test', '1'); location.href = ${JSON.stringify(url)}; true`,
    )
    await waitForHook(page)
  })

  after(async () => {
    page?.close()
    await stop(browser)
    await stop(dsh)
    if (profileDir !== null) {
      await rm(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
    }
    if (home !== null) {
      await rm(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
    }
  })

  it('answers an approval once and disables on the second decision', async () => {
    const result = await evaluate(
      page,
      `(async () => {
        const root = document.createElement('div')
        document.body.append(root)
        const pending = {
          kind: 'approval',
          key: 'test-approval',
          sessionId: 's1',
          toolName: 'bash',
          reason: 'needs to write outside',
          answerable: true,
          answer: (outcome) => { window.__approvalDecision = outcome; return Promise.resolve() },
        }
        window.__dswsTest.render('approval', root, { pending })
        await new Promise((done) => setTimeout(done, 100))
        const allow = root.querySelector('[data-dsws-approval-action="allow-once"]')
        const reject = root.querySelector('[data-dsws-approval-action="reject"]')
        allow.click()
        await new Promise((done) => setTimeout(done, 50))
        return {
          decision: window.__approvalDecision ?? '',
          busy: root.querySelector('[data-dsws-interaction="approval"]')?.getAttribute('aria-busy'),
          buttons: Boolean(allow && reject),
        }
      })()`,
    )
    assert.deepEqual(result, { decision: 'allowed-once', busy: 'true', buttons: true })
  })

  it('submits selected labels and custom text from a question card', async () => {
    const result = await evaluate(
      page,
      `(async () => {
        const root = document.createElement('div')
        document.body.append(root)
        const snapshot = { channel: 'waterfall', closed: false, state: 'open', waitState: 'counting', countdown: undefined }
        const pending = {
          kind: 'question',
          key: 'q1',
          sessionId: 's1',
          callId: 'c1',
          questions: [{ id: 'q1', header: 'Pick', question: 'Which one?', options: [{ label: 'A' }, { label: 'B' }] }],
          subscribe: () => () => {},
          snapshot: () => snapshot,
          getSnapshot: () => snapshot,
          engage: () => {},
          answer: (batch) => { window.__questionBatch = batch; return Promise.resolve() },
        }
        window.__dswsTest.render('question', root, { pending })
        await new Promise((done) => setTimeout(done, 100))
        const option = [...root.querySelectorAll('[data-dsws-question="q1"] button')].find((b) => b.innerText === 'A')
        option.click()
        await new Promise((done) => setTimeout(done, 50))
        root.querySelector('[data-dsws-question-submit]').click()
        await new Promise((done) => setTimeout(done, 50))
        return window.__questionBatch
      })()`,
    )
    assert.deepEqual(result, { answers: [{ id: 'q1', selected: ['A'] }] })
  })

  it('shows a completed process duration and the context footer', async () => {
    const result = await evaluate(
      page,
      `(async () => {
        const processRoot = document.createElement('div')
        const metaRoot = document.createElement('div')
        document.body.append(processRoot, metaRoot)
        window.__dswsTest.render('process', processRoot, {
          group: {
            kind: 'process',
            running: false,
            startedAt: 1000,
            endedAt: 2600,
            items: [{ kind: 'tool', tool: { name: 'bash', argsRaw: '{}', resultText: 'ok' } }],
          },
        })
        window.__dswsTest.render('meta', metaRoot, {
          occupancy: { percent: 42, usedTokens: 42000, contextWindow: 100000 },
          controls: null,
          metaError: '',
        })
        await new Promise((done) => setTimeout(done, 100))
        return {
          duration: processRoot.querySelector('[data-dsws-process-duration]')?.innerText ?? '',
          context: metaRoot.querySelector('[data-dsws-context]')?.innerText ?? '',
        }
      })()`,
    )
    assert.deepEqual(result, { duration: '1.6s', context: '42% · ~42.0k / 100k' })
  })

  it('renders @ candidates as selectable rows', async () => {
    const result = await evaluate(
      page,
      `(async () => {
        const root = document.createElement('div')
        document.body.append(root)
        window.__dswsTest.render('mention', root, {
          candidates: [{ path: 'src/client.js', kind: 'file' }],
          index: 0,
          onChoose: () => {},
        })
        await new Promise((done) => setTimeout(done, 100))
        return {
          rows: root.querySelectorAll('[data-dsws-mention]').length,
          text: root.querySelector('[data-dsws-mention]')?.innerText ?? '',
        }
      })()`,
    )
    assert.deepEqual(result, { rows: 1, text: 'client.js\nsrc' })
  })

  it('puts a project badge before the session title on one aligned row', async () => {
    const result = await evaluate(
      page,
      `(async () => {
        const root = document.createElement('div')
        document.body.append(root)
        window.__dswsTest.render('title', root, {
          sessions: {},
          sessionId: 's1',
          title: 'Long session title',
          running: false,
          project: 'dsh-workspace-split',
        })
        await new Promise((done) => setTimeout(done, 100))
        const badge = root.querySelector('[data-dsws-project]')
        const dot = root.querySelector('span[style*="border-radius: 50%"]')
        const row = badge.parentElement
        const titleButton = row.querySelector('button[title="切换会话"]')
        const b = badge.getBoundingClientRect()
        const d = dot.getBoundingClientRect()
        return {
          badge: badge.innerText,
          rowHeight: row.getBoundingClientRect().height,
          badgeCenter: b.y + b.height / 2,
          dotCenter: d.y + d.height / 2,
          badgeFont: getComputedStyle(badge).fontSize,
          titleFont: titleButton === null ? '' : getComputedStyle(titleButton).fontSize,
          title: titleButton?.innerText ?? '',
        }
      })()`,
    )
    assert.equal(result.badge, 'dsh-workspace-split')
    assert.equal(result.rowHeight, 30)
    assert.ok(Math.abs(result.badgeCenter - result.dotCenter) < 0.6)
    assert.equal(result.badgeFont, result.titleFont)
    assert.equal(result.title, 'Long session title')
  })

  it('scales the header by tile width but not by a manual zoom override', async () => {
    const result = await evaluate(
      page,
      `(async () => {
        const roots = [document.createElement('div'), document.createElement('div')]
        for (const root of roots) root.style.width = '400px'
        document.body.append(...roots)
        window.__dswsTest.render('zoom', roots[0], { zoom: 0.6 })
        window.__dswsTest.render('zoom', roots[1], { zoom: 1 })
        await new Promise((done) => setTimeout(done, 180))
        const measure = (root) => {
          const header = root.querySelector('[data-probe="header"]').getBoundingClientRect()
          const body = root.querySelector('[data-probe="body"]').getBoundingClientRect()
          return { header: header.height, body: body.height }
        }
        return { small: measure(roots[0]), normal: measure(roots[1]) }
      })()`,
    )
    // 400px is below ZOOM_FULL_WIDTH, so the width-driven factor is its 0.78
    // floor; both headers must use it even though their manual zooms differ.
    assert.ok(Math.abs(result.small.header - 23.4) < 0.6)
    assert.ok(Math.abs(result.normal.header - 23.4) < 0.6)
    assert.equal(result.small.header, result.normal.header)
    assert.ok(result.small.body < result.normal.body - 2)
  })

  it('opens the model menu and reports a selection', async () => {
    const result = await evaluate(
      page,
      `(async () => {
        const root = document.createElement('div')
        document.body.append(root)
        window.__dswsTest.render('model', root, {
          catalog: {
            default: { provider: 'p', model: 'm1' },
            groups: [{ id: 'p', name: 'Provider', models: [{ id: 'm1', name: 'Model One' }, { id: 'm2', name: 'Model Two' }] }],
          },
          selection: null,
          onSelect: (value) => { window.__modelPick = value },
        })
        await new Promise((done) => setTimeout(done, 100))
        root.querySelector('[data-dsws-model] button').click()
        await new Promise((done) => setTimeout(done, 80))
        const items = [...root.querySelectorAll('[data-dsws-model] [role="menuitem"]')]
        items.find((b) => b.innerText.includes('Model Two')).click()
        await new Promise((done) => setTimeout(done, 80))
        return { items: items.length, pick: window.__modelPick ?? null }
      })()`,
    )
    assert.equal(result.items, 2)
    assert.deepEqual(result.pick, { provider: 'p', model: 'm2' })
  })

  it('asks for confirmation before full access', async () => {
    const result = await evaluate(
      page,
      `(async () => {
        const root = document.createElement('div')
        document.body.append(root)
        window.__dswsTest.render('permission', root, {
          catalog: { options: [
            { value: 'read-only', name: 'Read only' },
            { value: 'workspace-write', name: 'Workspace write' },
            { value: 'danger-full-access', name: 'Full access' },
          ] },
          current: 'workspace-write',
          onSelect: (value) => { window.__permissionPick = value },
        })
        await new Promise((done) => setTimeout(done, 100))
        root.querySelector('[data-dsws-permission] button').click()
        await new Promise((done) => setTimeout(done, 80))
        const full = [...root.querySelectorAll('[data-dsws-permission] [role="menuitem"]')].find((b) => b.innerText.includes('Full access'))
        full.click()
        await new Promise((done) => setTimeout(done, 80))
        const confirm = root.querySelector('[data-dsws-permission-confirm]')
        const before = window.__permissionPick ?? null
        confirm.click()
        await new Promise((done) => setTimeout(done, 80))
        return { confirm: Boolean(confirm), before, after: window.__permissionPick ?? null }
      })()`,
    )
    assert.deepEqual(result, { confirm: true, before: null, after: 'danger-full-access' })
  })

  it('removes one staged file without touching the others', async () => {
    const result = await evaluate(
      page,
      `(async () => {
        const root = document.createElement('div')
        document.body.append(root)
        window.__dswsTest.render('files', root, {
          files: [
            { id: 'f1', name: 'one.txt', size: 1024, status: 'ready' },
            { id: 'f2', name: 'two.txt', size: 2048, status: 'ready' },
          ],
          onRemove: (id) => { window.__removedFile = id },
        })
        await new Promise((done) => setTimeout(done, 100))
        root.querySelector('button[aria-label="移除文件"]').click()
        await new Promise((done) => setTimeout(done, 50))
        return { removed: window.__removedFile ?? '', rows: root.querySelectorAll('[data-dsws-files] > div').length }
      })()`,
    )
    assert.deepEqual(result, { removed: 'f1', rows: 2 })
  })
})

/** Stop one child process and wait for it to release files. */
function stop(child) {
  return new Promise((done) => {
    if (child === null || child.exitCode !== null) {
      done()
      return
    }
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      done()
    }, 5000)
    child.once('exit', () => {
      clearTimeout(timer)
      done()
    })
    child.kill()
  })
}
