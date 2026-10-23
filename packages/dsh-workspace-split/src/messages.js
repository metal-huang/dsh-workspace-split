/**
 * User-facing strings for the split-view plugin.
 *
 * Keys are English-friendly; values here are Chinese (zh-CN). The English
 * version lives in locale/en.json and is merged on runtime: if a key exists
 * there, it replaces the zh-CN value. This matches DSH's convention of having
 * per-package small language-pack overrides (as seen in bundled plugins).
 */

export const CHINESE = {
  // --- general ---
  'split.button.toggle': '切换分屏视图',
  'split.button.label': '⊞ 分屏',
  'split.grid.pick': '选择网格大小',
  'split.grid.trigger': '网格 {{rows}} × {{cols}}',
  'split.grid.preview.caption': '{{rows}} 行 × {{cols}} 列',
  'split.grid.hint.max': '最多 {{count}} 格',
  'split.grid.hint.confirm': '超过 {{count}} 格需确认',
  'split.grid.hint.blocked': '去设置调高上限',
  'split.dialog.unlock.title': '需要 {{count}} 格',
  'split.dialog.unlock.body': '当前上限 {{max}} 格，先在 设置 → 通用 → 分屏网格 调高。',
  'split.dialog.unlock.btn': '好',
  'split.dialog.confirm.title': '打开 {{count}} 格？',
  'split.dialog.confirm.body': '同时运行 {{count}} 个会话可能卡顿，之后可改回。',
  'split.dialog.confirm.btn': '继续',
  'split.cell.empty.placeholder': '第 1 格',
  'split.cell.rename.tooltip': '重命名会话',
  'split.session.picker.aria': '切换会话',
  'split.session.running': '（运行中）',
  'split.workspace.empty': '此项目暂无会话',
  'split.settings.row.label': '分屏网格',
  'split.settings.row.maxLabel': '最多格子数',
  'split.settings.row.confirmLabel': '超过几格时确认',
  'split.sidebar.hint': '右键调整网格',
  'split.sidebar.tip.grid': '网格 {{rows}} × {{cols}}',

  // --- composer / cell content ---
  'composer.placeholder': '输入消息…',
  'composer.send': '发送',
  'toolrow.expanded.aria': '展开/收起',
  'toolrow.labels.params': '参数',
  'toolrow.labels.output': '输出',
  'toolrow.labels.errorOutput': '错误输出',
  'toolrow.noOutput': '无输出',

  // --- error / loading states ---
  'cell.loading': '载入中',
  'cell.loadError.timeout': '打开会话超时（{{sec}} 秒）',
  'cell.loadError.generic': '加载失败：{{error}}',
  'cell.retry': '重试',

  // --- divider / turn rail ---
  'turn.divider': '— 第 {{n}} 轮 —',
  'turnRail.preview.turn': '第 {{n}} 轮',

  // --- aria-labels (not shown, but must match translation) ---
  'aria.split.panel': '分屏视图',
  'aria.chooseGrid': '选择行数与列数',
}

// Simple interpolation helper: replaces {key} with values[...].
export function t(key, vars = {}) {
  const msg = CHINESE[key] || `[missing:${key}]`
  return String(msg).replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = vars[k]
    return typeof v === 'number' ? v : ''
  })
}

// Export default as CHINESE for fallback usage.
export default CHINESE
