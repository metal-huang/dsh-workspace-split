import { parseSlashLine } from './composer-meta.js'

/**
 * Decide what one slash line is allowed to do after command and skill admission.
 *
 * `matched` is undefined when attachments prevented us from executing the Host
 * command first. A listed user skill always continues as a prompt; every other
 * unmatched line keeps the old error instead of becoming accidental model input.
 */
export function slashAdmission(matched, line, skills, hasAttachments) {
  if (matched === true) return hasAttachments ? 'attachments' : 'command'
  const isSkill =
    line !== null &&
    line !== undefined &&
    Array.isArray(skills) &&
    skills.some((skill) => skill?.name === line.name)
  if (isSkill) return 'prompt'
  return hasAttachments ? 'attachments' : 'unknown-command'
}

function admissionFailure(key, error) {
  return { action: 'error', key, error }
}

/** Fold a thrown transport error and a Remote error branch into one result. */
async function callRemote(call, key) {
  let result
  try {
    result = await call()
  } catch (failure) {
    return { failure: admissionFailure(key, failure) }
  }
  if (result?.ok !== true) return { failure: admissionFailure(key, result?.error) }
  return { result }
}

async function matchCommand(session, text) {
  const { result, failure } = await callRemote(
    () => session.command(text),
    'composer.commandFailed',
  )
  if (failure) return { failure }
  return { matched: result.value?.matched === true }
}

async function listSkills(remote, sessionId) {
  const { result, failure } = await callRemote(
    () => remote.list({ sessionId }),
    'composer.skillListFailed',
  )
  if (failure) return { failure }
  return { skills: result.value?.skills }
}

/**
 * Admit one slash line without touching the draft or executing anything twice.
 *
 * Commands with no attachments run first. An unmatched line then checks the
 * session's user-skill catalog; with attachments that order is reversed so a
 * real Host command cannot execute before we refuse its attachments.
 */
export async function admitSlashLine(session, skillsRemote, text, hasAttachments) {
  const line = parseSlashLine(text)
  if (line === null) return { action: 'prompt' }
  let matched
  if (!hasAttachments) {
    const command = await matchCommand(session, text)
    if (command.failure) return command.failure
    matched = command.matched
  }

  let skills = []
  if (matched !== true) {
    const catalog = await listSkills(skillsRemote, session.sessionId)
    if (catalog.failure) return catalog.failure
    skills = catalog.skills
  }
  return { action: slashAdmission(matched, line, skills, hasAttachments) }
}
