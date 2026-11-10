# Changelog / 变更日志

## 0.1.14 — 2026-11-10

### English

#### Added

- **Resizable split grids.** Drag column and row gutters, double-click to restore equal sizes, and keep the ratios across reloads. Gutters also support keyboard resizing with arrow keys and Home. (#10, #28)
- **Slash skills in split composers.** User-invocable skills such as `/todo 123` now use the same native skill-loading path as the main composer, including attachments. (#1, #19)
- **Visible model retries.** Retry scheduling and restart notices show the attempt, retry budget, backoff, and failure code. Running state now prefers the ready Host catalog. (#6, #24)

#### Changed

- **Escape stops the active tile only.** Use two independent Escape presses, matching the native gesture; menus, approvals, editors, terminals, and other tiles keep their own behavior. (#5, #22)
- **Harness language selection.** Prefer a supported Host language, then a supported browser language, then English. An unsupported Host no longer hides a usable browser translation. (#7, #25, #26)
- **Automatic text density stays available during resizing.** Header and transcript scale freeze during a drag and recompute once on release, without per-frame jitter. (#28)

#### Fixed

- Prevent slow sends and session switches from clearing a newly rebound tile's draft or sending to the old Session. (#19, #21)
- Settle live stream and tool-running indicators when a turn closes, and keep tools from an earlier turn out of the current status line. (#6, #24)
- Detach drag listeners and restore the previous text-selection behavior on cancellation, blur, capture loss, and unmount. (#28)

### 中文

#### 新增

- **分屏网格可调整大小。** 拖动列、行分隔条即可调整比例，双击恢复等分，刷新后比例仍保留；分隔条也支持用方向键和 Home 键调整。 (#10, #28)
- **分屏输入框支持斜杠技能。** 用户可调用的技能（例如 `/todo 123`）现在与主输入框走同一条原生技能加载路径，也支持附件。 (#1, #19)
- **模型重试可见。** 重试排期与开始通知会显示当前次数、重试预算、退避时间和失败 code；运行状态优先使用已就绪的 Host 目录。 (#6, #24)

#### 变更

- **Esc 只停止当前格子。** 与主界面一致，需要连续按两次 Esc；菜单、审批、编辑器、终端和其他格子保持各自原有行为。 (#5, #22)
- **Harness 语言选择。** 优先使用已支持的 Host 语言，其次是已支持的浏览器语言，最后回退英文；不受支持的 Host 不再遮挡浏览器里可用的翻译。 (#7, #25, #26)
- **调整大小时仍保留自动文字密度。** 拖动期间表头和正文倍率冻结，松手后按最终宽度重算一次，不再逐帧抖动。 (#28)

#### 修复

- 修复发送较慢或切换会话时，新格子的草稿被清空、或旧内容继续发给原会话的问题。 (#19, #21)
- 本轮结束后会清理思考与工具的运行标记；上一轮未返回的工具不会再污染当前状态行。 (#6, #24)
- 取消、失焦、捕获丢失和卸载时都会拆除拖动监听器，并恢复原来的文字选择行为。 (#28)
