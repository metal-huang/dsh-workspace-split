/**
 * Contract check against the installed DSH packages.
 *
 * The split cell is a reimplementation against public DSH services, so an
 * upstream rename or removal must fail this test instead of silently breaking
 * the UI. It skips when no DSH installation is present (CI without the desktop
 * app); set DSH_CONTRACT_ROOT to point at a different install.
 */

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'

const DEFAULT_ROOT =
  'D:\\nodejs\\node_global\\node_modules\\@deepseek-ai\\dsh\\node_modules\\@deepseek-ai'
const root = process.env.DSH_CONTRACT_ROOT ?? DEFAULT_ROOT
const installed = existsSync(root)

/** Read one DSH package file, or fail with the path that moved. */
function read(relative) {
  const path = join(root, relative)
  assert.equal(existsSync(path), true, `missing DSH contract file: ${relative}`)
  return readFileSync(path, 'utf8')
}

/** Assert every fragment still appears in one contract file. */
function includes(relative, fragments) {
  const text = read(relative)
  for (const fragment of fragments) {
    assert.equal(
      text.includes(fragment),
      true,
      `${relative} no longer contains ${JSON.stringify(fragment)}; update the split adapter`,
    )
  }
}

describe('DSH public contract', { skip: installed ? false : `no DSH install at ${root}` }, () => {
  it('keeps the platform module table the bundle externalizes', () => {
    const build = readFileSync('packages/dsh-workspace-split/build.mjs', 'utf8')
    const match = /const PLATFORM_EXTERNALS = \[([\s\S]*?)\n\]/u.exec(build)
    assert.notEqual(match, null, 'PLATFORM_EXTERNALS not found in build.mjs')
    const modules = [...match[1].matchAll(/'([^']+)'/gu)].map((entry) => entry[1])
    assert.deepEqual(modules, [
      'react',
      'react/jsx-runtime',
      'react-dom',
      'react-dom/client',
      '@deepseek-ai/cordis',
      'zod',
      '@tanstack/react-virtual',
      '@deepseek-ai/dsh-client-store',
      '@deepseek-ai/dsh-client-ui-slots',
      '@deepseek-ai/dsh-client-ui-primitives',
      '@deepseek-ai/dsh-client-ui-dockkit',
    ])
  })

  it('keeps the SessionFace methods the cell calls', () => {
    includes('dsh-api-session-controller/lib/types/client/contract/session.d.ts', [
      'prompt(',
      'cancel(',
      'command(',
      'readAttachment(',
      'updateQueue(',
      'faceOf(',
    ])
  })

  it('keeps model and permission Remote surfaces', () => {
    includes('dsh-api-session-controller/lib/typert.remote-client.d.ts', [
      'modelCatalog',
      'selectModel',
    ])
    includes('dsh-api-session-controller/lib/types/types.d.ts', [
      'SessionSelectModelRequest',
      'ModelCatalog',
      'reasoningEffort',
    ])
    includes('dsh-permission-presets/lib/types/types.d.ts', ['PermissionCatalog', 'PresetOption'])
    includes('dsh-permission-presets/lib/typert.remote-client.d.ts', ['catalog'])
  })

  it('keeps the user-skill catalog used by slash admission', () => {
    includes('dsh-api-session-controller/lib/types/types.d.ts', [
      'SkillListRequest',
      'SkillListValue',
      'SkillEntry',
    ])
    includes('dsh-api-session-controller/lib/typert.remote-client.d.ts', [
      'list: (request: SkillListRequest',
      "'skills/list'",
    ])
  })

  it('keeps the pending-interaction registry and both answer paths', () => {
    includes('dsh-client-ui-session/lib/types/client/index.d.ts', [
      'sessionStatus',
      'pendingInteraction',
    ])
    includes('dsh-client-ui-approval/lib/types/client/contract/slots.d.ts', [
      'answer(outcome: ApprovalDecision)',
      'answerable',
    ])
    includes('dsh-client-ui-user-questions/lib/types/client/contract/slots.d.ts', [
      'answer(',
      'snapshot:',
      'subscribe:',
      'getSnapshot:',
    ])
  })

  it('keeps the archived-Session set the grid filters against', () => {
    // Archiving never removes a Session from `ctx.sessions.list`, so this set is
    // the only way a tile learns that its Session was put away.
    //
    // The whole declaration, not the bare name: `archivedSessionIds` appears
    // seven times in this file (the snapshot field, a private field, two
    // `replaceArchived` parameters, a doc comment), so a bare-word assertion
    // stays green while the snapshot field — the only occurrence this plugin
    // reads — is renamed away. That is the exact silent failure the gate exists
    // to catch, so the fragment keeps the type and the terminator.
    includes('dsh-api-workspace-controller/lib/types/client/model.d.ts', [
      "readonly archivedSessionIds: WorkspaceArchiveValue['archivedSessionIds'];",
    ])
  })

  it('keeps the private unread writers the tile has to reach into', () => {
    // Boundary guard, not public contract: DSH clears `completionUnread` only
    // for the main view and exposes no write path, so a tile clears the
    // instance's own set and republishes it. The fragments are complete
    // declarations on purpose — `completionUnread` alone also matches the public
    // read-only status field, which would let a rename pass unnoticed.
    includes('dsh-client-ui-session/lib/types/client/index.d.ts', [
      'private readonly completionUnread;',
      'private publishStatus;',
    ])
  })

  it('keeps file upload and file-reference candidates', () => {
    includes('dsh-client-file-upload/lib/types/client/contract.d.ts', [
      'upload(',
      'FileUploadValue',
    ])
    includes('dsh-client-file-upload/lib/types/types.d.ts', ['receiptId', 'FileAttachmentRef'])
    includes('dsh-file-reference/lib/types/index.d.ts', ['FILE_REFERENCE_PROMPT'])
    includes('dsh-file-reference/lib/types/grammar.js', ['activeAtToken', 'formatFileMention'])
  })
})
