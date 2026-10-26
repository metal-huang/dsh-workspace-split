/**
 * Pure composer metadata: context occupancy and compact token formatting.
 *
 * Mirrors the main composer's footer arithmetic (`ui-conversation` uses
 * `projectedTokens ?? pressureTokens` over `contextWindow`) so a split cell shows
 * the same number. Kept free of React and the Session services for direct tests.
 */

/**
 * Occupancy of one `contextPressure` projection.
 * @param pressure - `{ projectedTokens?, pressureTokens?, contextWindow? }`.
 * @returns `{ percent, usedTokens, contextWindow }`, or null when incomplete.
 */
export function contextOccupancy(pressure) {
  if (pressure === null || pressure === undefined) return null
  const usedTokens = pressure.projectedTokens ?? pressure.pressureTokens
  const contextWindow = pressure.contextWindow
  if (usedTokens === undefined || contextWindow === undefined) return null
  if (!(contextWindow > 0)) return null
  const percent = Math.min(100, Math.round((usedTokens / contextWindow) * 100))
  return { percent, usedTokens, contextWindow }
}

/**
 * Short token count for the footer: 999, 1.2k, 3.4M.
 * @param value - token count.
 * @returns compact text.
 */
export function formatTokens(value) {
  const tokens = Number(value)
  if (!Number.isFinite(tokens) || tokens < 0) return '0'
  if (tokens < 1000) return String(Math.round(tokens))
  if (tokens < 1_000_000) return `${(tokens / 1000).toFixed(tokens >= 100_000 ? 0 : 1)}k`
  return `${(tokens / 1_000_000).toFixed(tokens >= 100_000_000 ? 0 : 1)}M`
}

/** Effective model selection: the pending choice, then the last used one. */
export function effectiveModel(selection) {
  if (selection === null || selection === undefined) return null
  return selection.next ?? selection.lastUsed ?? null
}

/**
 * Flatten a provider-grouped catalog for a picker.
 * @param catalog - `ModelCatalog`.
 * @returns rows `{provider, providerName, model, modelName, reasoning}`.
 */
export function modelChoices(catalog) {
  const groups = Array.isArray(catalog?.groups) ? catalog.groups : []
  const rows = []
  for (const group of groups) {
    for (const model of group.models ?? []) {
      rows.push({
        provider: group.id,
        providerName: group.name,
        model: model.id,
        modelName: model.name,
        reasoning: model.reasoning,
      })
    }
  }
  return rows
}

/** Find the catalog row for one selection. */
function modelRowFor(catalog, target) {
  if (target === null) return null
  return (
    modelChoices(catalog).find(
      (candidate) => candidate.provider === target.provider && candidate.model === target.model,
    ) ?? null
  )
}

/** Effort caption for one row and selection. */
function effortNameOf(row, target) {
  const efforts = row.reasoning?.efforts ?? []
  const effort = efforts.find((candidate) => candidate.id === target.reasoningEffort)
  const fallback = efforts.find((candidate) => candidate.id === row.reasoning?.defaultEffort)
  return (effort ?? fallback)?.name ?? ''
}

/**
 * Display name and effort for one selection.
 * @param catalog - `ModelCatalog`.
 * @param selection - effective selection.
 * @returns `{name, effortName, row}` or null when not routable.
 */
export function modelDisplay(catalog, selection) {
  const target = effectiveModel(selection) ?? catalog?.default ?? null
  const row = modelRowFor(catalog, target)
  if (row === null) return null
  return { name: row.modelName, effortName: effortNameOf(row, target), row }
}

/** Built-in preset copy, used when the catalog carries only raw values. */
const BUILTIN_PERMISSIONS = {
  'read-only': 'permission.readOnly',
  'workspace-write': 'permission.workspaceWrite',
  'danger-full-access': 'permission.dangerFullAccess',
}

/** Catalog option for one preset value. */
function permissionOption(catalog, value) {
  const options = Array.isArray(catalog?.options) ? catalog.options : []
  return options.find((candidate) => candidate.value === value)
}

/** Localized built-in label, or the raw value without a translator. */
function builtinPermission(value, t) {
  const key = BUILTIN_PERMISSIONS[value]
  if (key === undefined || typeof t !== 'function') return value
  return t(key)
}

/** Catalog-provided name, ignoring a name that merely repeats the raw value. */
function optionName(option, value) {
  const named = option?.label ?? option?.name ?? option?.title
  return named !== undefined && named !== value ? named : undefined
}

/** Permission preset label from the catalog, falling back to the raw value. */
export function permissionLabel(catalog, value, t) {
  if (value === undefined || value === null || value === '') return ''
  const named = optionName(permissionOption(catalog, value), value)
  return named ?? builtinPermission(value, t)
}

/** Whether switching to this preset must show the risk confirmation. */
export function permissionRequiresConfirm(value) {
  return value === 'danger-full-access' || value === 'auto'
}

/**
 * Parse one slash-command line.
 * @param line - draft text.
 * @returns `{name, args}` for a single-line command, or null.
 */
export function parseSlashLine(line) {
  const text = typeof line === 'string' ? line.trim() : ''
  if (!text.startsWith('/') || text.includes('\n')) return null
  const body = text.slice(1)
  if (body === '' || body.startsWith('/')) return null
  const at = body.search(/\s/u)
  if (at < 0) return { name: body, args: '' }
  return { name: body.slice(0, at), args: body.slice(at + 1).trim() }
}
