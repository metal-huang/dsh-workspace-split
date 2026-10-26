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
