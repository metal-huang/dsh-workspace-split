/**
 * Sidebar control placement, in a real browser.
 *
 * The unit tests pin the arithmetic, but the bug that reached the desktop client
 * was a DOM assumption: the slot system wraps every footer entry in
 * `display: contents` elements, so the control's next sibling is another entry,
 * not the account row. Only a browser lays that out — this test boots the
 * fixture in headless Chromium and asserts the control lands centred on the
 * account row, with the offset actually applied and the collapsed rail
 * overriding it.
 *
 * No dependencies: a local static server plus the DevTools protocol over the
 * WebSocket client Node ships. It is skipped when no Chromium/Chrome binary is
 * available (`DSWS_CHROME` overrides the search).
 */

import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { extname, join, resolve, sep } from 'node:path'
import { after, before, describe, it } from 'node:test'

const ROOT = resolve(import.meta.dirname, '..', '..')
const FIXTURE = '/test/e2e/sidebar-align.html'
const READY_TIMEOUT_MS = 15000

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
}

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

/** First Chromium-family binary that exists, or null. */
function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    if (candidate !== undefined && candidate !== '' && existsSync(candidate)) return candidate
  }
  return null
}

/** Serve the repository so the fixture can import the real layout module. */
async function startServer() {
  const server = createServer(async (request, response) => {
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    const file = resolve(ROOT, `.${path}`)
    if (file !== ROOT && !file.startsWith(ROOT + sep)) {
      response.writeHead(403).end()
      return
    }
    try {
      const body = await readFile(file)
      response.writeHead(200, {
        'content-type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
      })
      response.end(body)
    } catch {
      response.writeHead(404).end()
    }
  })
  await new Promise((done) => server.listen(0, '127.0.0.1', done))
  return { port: server.address().port, close: () => new Promise((done) => server.close(done)) }
}

/** Wait until the browser's DevTools endpoint answers. */
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

/** Minimal DevTools client: one evaluate call at a time, values by JSON. */
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

/** Evaluate one expression in the page and return its JSON value. */
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

const chromePath = findChrome()
const skip = chromePath === null ? 'no Chromium/Chrome binary found; set DSWS_CHROME' : false

describe('sidebar control alignment (headless browser)', { skip }, () => {
  let server = null
  let browser = null
  let profileDir = null
  let page = null
  let results = null

  before(async () => {
    server = await startServer()
    const debugPort = await startDebugPort()
    profileDir = await mkdtemp(join(tmpdir(), 'dsws-e2e-'))
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
      `http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(fixtureUrl(server.port))}`,
      { method: 'PUT' },
    ).then((response) => response.json())
    page = connect(created.webSocketDebuggerUrl)
    await page.opened
    results = await waitForMeasurements(page)
  })

  after(async () => {
    page?.close()
    // The browser keeps profile files open until it exits; unlinking first fails
    // with EBUSY on Windows.
    await stopBrowser(browser)
    await server?.close()
    if (profileDir !== null) {
      await rm(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
    }
  })

  it('centres the control on the account row', () => {
    const { offset, delta, selfCenter, accountCenter } = results.expanded
    assert.ok(offset !== null, 'the account row was found')
    assert.ok(
      Math.abs(offset - 60.3) < 0.1,
      `measured offset ${offset} should match the 60.3px between the rows`,
    )
    assert.ok(
      delta < 0.6,
      `control centre ${selfCenter} should sit on the account row centre ${accountCenter}`,
    )
    assert.equal(results.expanded.inlineTransform, 'translateY(60.3px)')
  })

  it('lets the collapsed rail drop the measured offset', () => {
    assert.equal(results.collapsed.computedTransform, 'none')
    assert.match(results.collapsed.inlineTransform, /^translateY\(/)
  })
})

/** Terminate the browser and wait for it to release its profile files. */
function stopBrowser(child) {
  return new Promise((done) => {
    if (child === null || child.exitCode !== null) {
      done()
      return
    }
    const deadline = setTimeout(() => {
      child.kill('SIGKILL')
      done()
    }, 3000)
    child.once('exit', () => {
      clearTimeout(deadline)
      done()
    })
    child.kill()
  })
}

/** Free port for Chromium's DevTools endpoint. */
async function startDebugPort() {
  const probe = createServer()
  await new Promise((done) => probe.listen(0, '127.0.0.1', done))
  const port = probe.address().port
  await new Promise((done) => probe.close(done))
  return port
}

/** Fixture URL on the local server. */
function fixtureUrl(port) {
  return `http://127.0.0.1:${port}${FIXTURE}`
}

/** Poll the fixture until its module script has published its measurements. */
async function waitForMeasurements(client) {
  const deadline = Date.now() + READY_TIMEOUT_MS
  for (;;) {
    const ready = await evaluate(client, 'window.__ready === true').catch(() => false)
    if (ready === true) {
      return evaluate(client, '({ expanded: window.__expanded, collapsed: window.__collapsed })')
    }
    if (Date.now() > deadline) throw new Error('fixture never finished measuring')
    await new Promise((done) => setTimeout(done, 100))
  }
}
