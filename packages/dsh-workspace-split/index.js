/** Host-owned layout persistence using the native Harness storage-domain API. */
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import { z } from 'zod'

const LAYOUT = defineDomain({ name: 'workspace_split', version: 1, tables: { layout: domainTable(z.unknown()) } })
const KEY = 'windows'
export const inject = ['storageDomain']

/** Open once for this plugin, and close only after its registered requests settle. */
export async function apply(ctx) {
  const domain = await ctx.storageDomain.open(LAYOUT)
  const pending = new Set()
  let closing = false
  ctx.effect(() => async () => {
    closing = true
    await Promise.allSettled(pending)
    await domain.close()
  })
  ctx.on('workspace-split/rpc', (request) => {
    const operation = (async () => {
      if (closing) return { ok: false, error: 'storage-unavailable' }
      if (request === null || typeof request !== 'object' || Array.isArray(request)) return { ok: false, error: 'bad-request' }
      try {
        const table = domain.table('layout')
        if (request.method === 'load') {
          const value = table.get(KEY)
          return { ok: true, value: value === undefined ? null : value }
        }
        if (request.method === 'save') {
          if (request.value === undefined) return { ok: false, error: 'bad-layout' }
          await table.put(KEY, request.value)
          return { ok: true }
        }
        return { ok: false, error: 'unknown-method' }
      } catch (error) {
        return { ok: false, error: String(error) }
      }
    })()
    pending.add(operation)
    return operation.finally(() => pending.delete(operation))
  })
}
