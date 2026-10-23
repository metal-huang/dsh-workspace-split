/**
 * Host half of the workspace-split plugin.
 *
 * Owns persistence: the Client half cannot reach any storage service, so it
 * calls `host.call('load' | 'save', payload)` and this half talks to
 * `ctx.storageDomain` on its behalf.
 */

const DOMAIN = 'workspace-split'
const TABLE = 'layout'
const KEY = 'windows'

async function openDomain(ctx) {
  const storageDomain = ctx.get('storageDomain')
  if (storageDomain === undefined) return undefined
  return storageDomain.open({ name: DOMAIN, tables: [TABLE] })
}

export function apply(ctx) {
  // Simple request/response RPC surface for the Client half.
  // The Client calls host.call('split.load') / host.call('split.save', layout).
  ctx.on('workspace-split/rpc', async (request) => {
    if (request === null || typeof request !== 'object') return { ok: false, error: 'bad-request' }
    const domain = await openDomain(ctx)
    if (domain === undefined) return { ok: false, error: 'storage-unavailable' }
    try {
      if (request.method === 'load') {
        const all = await domain.loadAll(TABLE)
        const record = all.find((r) => r.key === KEY)
        return { ok: true, value: record === undefined ? null : record.value }
      }
      if (request.method === 'save') {
        await domain.putRecord(TABLE, KEY, request.value)
        return { ok: true }
      }
      return { ok: false, error: 'unknown-method' }
    } catch (error) {
      return { ok: false, error: String(error) }
    }
  })
}
