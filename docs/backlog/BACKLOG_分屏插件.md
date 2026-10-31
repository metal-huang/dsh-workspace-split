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

### 格子上限设置的跨 profile 同步

- 现状：上限存 `localStorage['dsws-limits']`，与布局一样按浏览器 profile 隔离；
  web 与桌面 profile 各自独立，清缓存会回到 10/6。
- 待办：若要求「设置一次到处生效」，改走 DSH settings 服务或 host 侧配置通道。
  当前实现不阻塞单机使用。
