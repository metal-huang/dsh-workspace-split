/** Keep one creation request per empty tile, including across a renderer reload. */
export class CellDrafts {
  constructor(storage, mint = () => `session-${crypto.randomUUID()}`) {
    this.storage = storage
    this.mint = mint
    this.pending = new Map()
    try {
      this.ids = JSON.parse(storage.getItem('dsws-new-chat-ids') ?? '{}')
      if (!this.ids || typeof this.ids !== 'object' || Array.isArray(this.ids)) this.ids = {}
    } catch {
      this.ids = {}
    }
  }

  save() {
    try {
      this.storage.setItem('dsws-new-chat-ids', JSON.stringify(this.ids))
    } catch {
      // In-memory deduplication still works when browser storage is unavailable.
    }
  }

  forget(index) {
    for (const key of Object.keys(this.ids)) {
      if (key.startsWith(`${index}:`)) delete this.ids[key]
    }
    for (const key of this.pending.keys()) {
      if (key.startsWith(`${index}:`)) this.pending.delete(key)
    }
    this.save()
  }

  ensure(index, target, create) {
    const key = `${index}:${JSON.stringify(target)}`
    if (this.pending.has(key)) return this.pending.get(key)
    if (typeof this.ids[key] !== 'string' || this.ids[key] === '') {
      try {
        this.ids[key] = this.mint()
      } catch (error) {
        // Minting needs a secure context; keep the failure in the promise the
        // caller already awaits instead of throwing before it gets one.
        return Promise.reject(error)
      }
    }
    this.save()
    const request = { ...target, sessionId: this.ids[key] }
    const promise = Promise.resolve()
      .then(() => create(request))
      .then((result) => {
        if (result?.ok !== true) throw new Error(result?.error?.message ?? 'New chat failed')
        return result.value.sessionId
      })
    this.pending.set(key, promise)
    promise.catch(() => {
      if (this.pending.get(key) === promise) this.pending.delete(key)
    })
    return promise
  }
}

/**
 * Value of a tile after the picker's Clear action.
 *
 * A project tile keeps its Workspace scope: clearing the chat must not turn it
 * into a free tile that later creates the next chat in another project.
 * @param cell - the tile's current assignment.
 * @returns the empty assignment to store.
 */
export function clearedCell(cell) {
  return cell?.t === 'workspace' ? { t: 'workspace', ws: cell.ws, id: null } : null
}

/** Inherit the tile's project, then the active tile, then the most recent project. */
export function newChatTarget(cell, activeCell, items, workspaces) {
  for (const candidate of [cell, activeCell]) {
    if (candidate?.t === 'workspace') return { workspaceId: candidate.ws }
    const session = items.find((item) => item.id === candidate?.id)
    const target = targetForSession(session, workspaces)
    if (target) return target
  }
  const recent = targetForSession(
    items.find((item) => item.cwd),
    workspaces,
  )
  if (recent) return recent
  const workspaceId = workspaces[0]?.workspaceId
  return workspaceId ? { workspaceId: String(workspaceId) } : {}
}

function targetForSession(session, workspaces) {
  if (!session) return null
  const workspace = workspaces.find((item) => item.sessionIds?.includes(session.id))
  if (workspace) return { workspaceId: String(workspace.workspaceId) }
  return session.cwd ? { cwd: session.cwd } : null
}
