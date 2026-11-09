import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  admitSlashLine,
  slashAdmission,
} from '../packages/dsh-workspace-split/src/composer-slash.js'

function commandSession(result, calls) {
  return {
    sessionId: 'session-1',
    command: async (line) => {
      calls.push(line)
      if (result instanceof Error) throw result
      return result
    },
  }
}

function skillRemote(entries, calls) {
  return {
    list: async (request) => {
      calls.push(request)
      if (entries instanceof Error) throw entries
      if (entries?.ok === false) return entries
      return { ok: true, value: { skills: entries.map((name) => ({ name })) } }
    },
  }
}

describe('admitSlashLine', () => {
  it('executes a matched Host command without reading skills', async () => {
    const commands = []
    const skillCalls = []
    const session = commandSession({ ok: true, value: { matched: true } }, commands)
    const result = await admitSlashLine(session, skillRemote([], skillCalls), '/compact', false)
    assert.deepEqual(result, { action: 'command' })
    assert.deepEqual(commands, ['/compact'])
    assert.equal(skillCalls.length, 0)
  })

  it('admits an unmatched user skill as a prompt for the same session', async () => {
    const commands = []
    const skillCalls = []
    const session = commandSession({ ok: true, value: { matched: false } }, commands)
    const result = await admitSlashLine(
      session,
      skillRemote(['todo'], skillCalls),
      '/todo 123',
      false,
    )
    assert.deepEqual(result, { action: 'prompt' })
    assert.deepEqual(commands, ['/todo 123'])
    assert.deepEqual(skillCalls, [{ sessionId: 'session-1' }])
  })

  it('keeps an unknown command and a misspelled skill out of the prompt path', async () => {
    const session = commandSession({ ok: true, value: { matched: false } }, [])
    assert.equal(
      (await admitSlashLine(session, skillRemote(['todo'], []), '/hlep', false)).action,
      'unknown-command',
    )
    assert.equal(
      (await admitSlashLine(session, skillRemote(['todo'], []), '/Todo', false)).action,
      'unknown-command',
    )
  })

  it('allows a skill with attachments without executing the Host command first', async () => {
    const commands = []
    const session = commandSession({ ok: true, value: { matched: true } }, commands)
    const result = await admitSlashLine(session, skillRemote(['todo'], []), '/todo 123', true)
    assert.deepEqual(result, { action: 'prompt' })
    assert.equal(commands.length, 0)
  })

  it('refuses attachments for a non-skill without executing the Host command', async () => {
    const commands = []
    const session = commandSession({ ok: true, value: { matched: true } }, commands)
    const result = await admitSlashLine(session, skillRemote([], []), '/compact', true)
    assert.deepEqual(result, { action: 'attachments' })
    assert.equal(commands.length, 0)
  })

  it('reports command transport and Remote failures separately', async () => {
    const thrown = new Error('offline')
    const thrownResult = await admitSlashLine(
      commandSession(thrown, []),
      skillRemote([], []),
      '/compact',
      false,
    )
    assert.equal(thrownResult.action, 'error')
    assert.equal(thrownResult.key, 'composer.commandFailed')
    assert.equal(thrownResult.error, thrown)

    const remote = { code: 'gateway/internal', message: 'boom' }
    const failedResult = await admitSlashLine(
      commandSession({ ok: false, error: remote }, []),
      skillRemote([], []),
      '/compact',
      false,
    )
    assert.equal(failedResult.key, 'composer.commandFailed')
    assert.equal(failedResult.error, remote)
  })

  it('reports a skill-catalog failure instead of guessing at a prompt', async () => {
    const session = commandSession({ ok: true, value: { matched: false } }, [])
    const thrown = new Error('catalog unavailable')
    const thrownResult = await admitSlashLine(session, skillRemote(thrown, []), '/todo', false)
    assert.equal(thrownResult.key, 'composer.skillListFailed')
    assert.equal(thrownResult.error, thrown)

    const remote = { code: 'gateway/internal', message: 'boom' }
    const failedResult = await admitSlashLine(
      session,
      skillRemote({ ok: false, error: remote }, []),
      '/todo',
      false,
    )
    assert.equal(failedResult.key, 'composer.skillListFailed')
    assert.equal(failedResult.error, remote)
  })

  it('leaves a non-slash draft on the ordinary prompt path without RPCs', async () => {
    const commands = []
    const skillCalls = []
    const result = await admitSlashLine(
      commandSession(null, commands),
      skillRemote([], skillCalls),
      'hello',
      false,
    )
    assert.deepEqual(result, { action: 'prompt' })
    assert.equal(commands.length, 0)
    assert.equal(skillCalls.length, 0)
  })
})

describe('slashAdmission', () => {
  it('keeps command, prompt, unknown, and attachment outcomes distinct', () => {
    const line = { name: 'todo', args: '123' }
    const skills = [{ name: 'todo' }]
    assert.equal(slashAdmission(true, line, skills, false), 'command')
    assert.equal(slashAdmission(true, line, skills, true), 'attachments')
    assert.equal(slashAdmission(false, line, skills, false), 'prompt')
    assert.equal(slashAdmission(false, line, [], false), 'unknown-command')
    assert.equal(slashAdmission(undefined, line, skills, true), 'prompt')
    assert.equal(slashAdmission(undefined, line, [], true), 'attachments')
  })
})
