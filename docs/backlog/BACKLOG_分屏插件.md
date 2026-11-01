# BACKLOG 分屏插件

> 活文档 · 条目解决后直接删除，历史交给 git log。

## 待验证

### 分屏网格选择器与格子上限设置

- 来源：2026-10-23 网格选择器会话。`docs/test/TESTCASES.md` 中 TC-13、TC-13a、
  TC-13b、TC-14、TC-16、TC-17 仍标 ⏳。
- 待办：在 web profile（空闲端口）逐条手测：悬停与键盘选择、6/7/10/12 格边界、
  设置行即时生效、旧 `gridSize` 迁移与缩容后分配恢复、确认框焦点不被会话更新抢走、
  窄窗口下选择面板不被裁切。
- 备注：实现已存在（`packages/dsh-workspace-split/src/client.js` 的
  `GridPickerPanel` 与 `LimitsRow`），只缺浏览器验证与状态回填。
- 顺带：TC-13 写的「10×10」与当前实现的 5 行 × 6 列不一致；TC-08 仍写
  `gridSize`，应改为 `rows/cols`。

## 待补测试

### 网格选择器缺少自动化回归

- 现状：`test/` 下没有覆盖网格选择器、6/10 边界或设置行的用例；
  `test/e2e/dsh-composer.test.js` 只覆盖输入框相关能力。
- 待办：给选择器加 DSH 浏览器 fixture，或至少给 `fitGeometry` / `normalizeLimits`
  加纯函数测试；断言 6 格直通、8 格确认、12 格被拦、设置调大后放行。

## 待评估

### 向 DSH 申请公开的「确认完成 / 标记已读」接口

- 现状：分屏点格子清「已完成」亮点读的是 `ctx.uiSession` 上未公开的
  `completionUnread` 集合与 `publishStatus()`（越界依赖，理由与降级见
  [TECH 13.5](../tech/TECH_DSH现有能力盘点.md)；`test/dsh-contract.test.js` 盯着
  这两个成员名兜底）。
- 待办：向 DSH 申请公开「确认完成 / 标记已读」的方法，或允许非主视图的持有者声明
  已读；拿到后改调公开接口，删掉 `src/unread.js` 里的私有访问与 TECH 13.5 的例外说明。

### 格子上限设置的跨 profile 同步

- 现状：上限存 `localStorage['dsws-limits']`，与布局一样按浏览器 profile 隔离；
  web 与桌面 profile 各自独立，清缓存会回到 10/6。
- 待办：若要求「设置一次到处生效」，改走 DSH settings 服务或 host 侧配置通道。
  当前实现不阻塞单机使用。

### npm test 的 glob 把 E2E 一起跑了

- 现状：`package.json` 的 `test` 是 `node --test "test/**/*.test.js"`，实测展开后 16 个
  文件，含 `test/e2e/dsh-composer.test.js` 与 `test/e2e/sidebar-align.test.js`——也就是
  `npm test`（以及 `npm run check`）会顺带启动浏览器 E2E，与 AGENTS.md 写的「check 只
  跑 lint + 重复代码 + 格式 + 测试，E2E 走 `npm run test:e2e`」不一致。
- 待办：定夺是把这个 glob 收紧成不含 `test/e2e/` 的集合，还是把 AGENTS.md 与 README
  改成「check 含 E2E」；顺带确认 CI 是否具备浏览器。

### 归档释放格子会丢掉该格未发出的草稿

- 现状：格子的草稿存在 `CellView` 的组件 state（`inputText`），不随布局持久化。会话被
  归档后格子释放、`CellView` 卸载，草稿随之丢弃；旧路径（会话离开清单）本来也这样，
  但归档是高频动作，更容易撞上。
- 待办（可二选一或都做）：释放前提示一次「该格有未发送草稿」；或把每格草稿按会话 id
  暂存，重新选中该会话时回填。当前不阻塞使用。
