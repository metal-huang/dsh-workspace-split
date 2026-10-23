/**
 * User-facing strings for the split-view plugin.
 *
 * Keys are English-friendly; values here are Chinese (zh-CN). The English
 * version lives in locale/en.json and replaces any key it defines at runtime.
 * This matches DSH's convention of small per-package language packs.
 *
 * Every string the plugin renders goes through `t()` so the two languages stay
 * in step; values must match the placeholders used at the call sites.
 */

export const CHINESE = {
  // --- general ---
  'split.button.toggle': '切换分屏视图',
  'split.button.label': '分屏',
  'split.grid.pick': '选择网格大小',
  'split.grid.trigger': '网格 {{rows}} × {{cols}}',
  'split.grid.preview.caption': '{{rows}} 行 × {{cols}} 列',
  'split.grid.cellSuffix': '格',
  'split.grid.hint.max': '建议不超过 {{count}} 格',
  'split.grid.hint.confirm': '超过 {{count}} 格，确认后继续',
  'split.grid.hint.blocked': '超过上限 {{max}} 格，去设置解锁',
  'split.dialog.unlock.title': '需要解锁 {{count}} 格',
  'split.dialog.unlock.body':
    '单个界面默认最多 {{max}} 格。要使用 {{count}} 格，需要先在设置里解锁上限。',
  'split.dialog.unlock.note':
    '打开 设置 → 通用 → 分屏网格，把「最多格子数」调到 {{count}} 或更大；改完立即生效。',
  'split.dialog.unlock.btn': '知道了',
  'split.dialog.confirm.title': '打开 {{count}} 个格子？',
  'split.dialog.confirm.body':
    '单屏超过 {{confirm}} 个会话时，每个格子都会持有一个会话，同时输出可能造成卡顿。',
  'split.dialog.confirm.note': '确认后仍将使用 {{count}} 格，可以随时改回更小的网格。',
  'split.dialog.confirm.btn': '仍然继续',
  'split.cell.empty.placeholder': '第 {{n}} 格',
  'split.cell.rename.tooltip': '重命名会话',
  'split.cell.rename.saving': '正在保存',
  'split.session.picker.aria': '切换会话',
  'split.session.pick': '选择会话…',
  'split.session.pickScoped': '{{ws}}（选会话）',
  'split.session.running': '（运行中）',
  'split.workspace.empty': '项目「{{ws}}」还没有会话',
  'split.cell.pickFromAbove': '从上方选择会话',
  'split.workspace.title': '项目',
  'split.settings.row.label': '分屏网格',
  'split.settings.row.maxLabel': '最多格子数',
  'split.settings.row.confirmLabel': '超过几格时确认',
  'split.settings.row.hint': '默认最多 10 格；调到 10 以上即解锁。修改立即生效。',
  'split.sidebar.hint': '左键切换分屏，右键选网格',
  'split.sidebar.tip.grid': '网格 {{rows}} × {{cols}}',

  // --- composer / cell content ---
  'composer.placeholder': '输入消息…',
  'composer.send': '发送',
  'composer.cancel': '取消',
  'toolrow.expanded.aria': '展开/收起',
  'toolrow.expand': '展开',
  'toolrow.collapse': '收起',
  'toolrow.failed': '执行失败',
  'toolrow.labels.params': '参数',
  'toolrow.labels.output': '输出',
  'toolrow.labels.errorOutput': '错误输出',
  'toolrow.noOutput': '无输出',
  'toolrow.result.name': '工具结果',

  // --- error / loading states ---
  'cell.loading': '加载中…',
  'cell.loading.waiting': '等待会话列表…',
  'cell.loadError.timeout': '打开会话超时（{{sec}} 秒）',
  'cell.loadError.generic': '加载失败：{{error}}',
  'cell.retry': '重试',

  // --- divider / turn rail ---
  'turn.divider': '— 第 {{n}} 轮 —',
  'turnRail.preview.turn': '第 {{n}} 轮',
  'turnRail.aria.turn': '第 {{n}} 轮',

  // --- aria-labels (not shown, but must match translation) ---
  'aria.split.panel': '分屏视图',
  'aria.chooseGrid': '选择行数与列数',
  'aria.gridCell': '{{rows}} 行 × {{cols}} 列，共 {{count}} 格',
}

export default CHINESE
