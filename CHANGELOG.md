# Changelog / 变更日志

## 0.1.15 — 2026-11-11

### English

#### Added

- **The native Session follows the active tile.** Activating a tile also selects its Session in the native sidebar, so split tiles and native views stay on the same Session. The last active tile is restored across reloads, and native subagent views are protected from background re-syncs. (#9)
- **New chats in empty cells.** An empty tile offers an explicit new-chat action that opens an independent Session in that tile. (#4)

#### Changed

- **Reasoning folds into a Think row.** Reasoning is grouped into a Think disclosure instead of separate blocks, and commands without reasoning still appear in disclosures. (#3, #31)

#### Fixed

- Empty-cell chats are created only on request, never by rendering or retries. (#33)
- The split composer follows the Host busy-enter setting, and default-send steering targets running chats correctly. (#2, #32)

### 中文

#### 新增

- **原生会话跟随激活格。** 激活某个格子时，原生侧边栏的当前会话同步切到该格子的会话，分屏与原生视图始终指向同一会话；刷新后恢复上次激活的格子，后台同步不会打断正在查看的子代理视图。 (#9)
- **空格子里新建聊天。** 空格子提供显式的新建聊天入口，在该格子中打开独立的新会话。 (#4)

#### 变更

- **思考过程折叠为 Think 行。** 推理内容归入 Think 折叠行而不是独立块；没有推理的命令仍保留在折叠区中。 (#3, #31)

#### 修复

- 空格子的聊天只在显式操作时创建，渲染或重试不会误建会话。 (#33)
- 分屏输入框遵循 Host 的忙碌回车设置；默认发送模式下的转向正确作用于运行中的会话。 (#2, #32)

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
