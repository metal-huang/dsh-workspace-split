# 分屏插件测试用例

## 环境
- DSH web profile，WSL Ubuntu-22.04，dsh 0.2.1-rc.2
- 插件包 `@local/dsh-workspace-split` 已 link 安装

## 用例

### TC-01 插件加载
- 步骤：启动 `dsh web`，浏览器打开首页
- 预期：侧边栏正常渲染，无 "Failed to load plugins" 报错

### TC-02 入口可见性（hero 页面）
- 步骤：未选任何会话，停留在 hero 页面
- 预期：「⊞ Split」按钮出现在 hero 区域 options 行（「标准模式」旁）

### TC-03 切换到分屏
- 步骤：hero 页面点「⊞ Split」
- 预期：主区域从 hero 切换为分屏面板，显示 "Split view placeholder"

### TC-04 切回会话
- 步骤：分屏面板下再点「⊞ Split」
- 预期：主区域恢复 hero 页面

### TC-05 入口可见性（激活会话）
- 步骤：进入一个激活会话（有对话记录）
- 预期：「⊞ Split」按钮出现在会话 header actions 行

### TC-06 激活会话切换分屏
- 步骤：激活会话页面点「⊞ Split」
- 预期：主区域切换为分屏面板；再点恢复会话内容

### TC-07 分屏面板格渲染
- 步骤：进入分屏面板
- 预期：显示 N 个格子，每格有会话选择器占位

### TC-08 刷新持久化
- 步骤：分屏状态下刷新页面，再点「⊞ 分屏」
- 预期：格子分配恢复（gridSize + 每格选中的会话）

### TC-09 格子内会话内容渲染
- 步骤：格子选中会话后，格内显示该会话的消息流
- 预期：user/message、assistant/message、turn 分隔线等内容按序渲染，自动滚动到底部

## 当前状态
- TC-01 ✅ 通过（sidebar 正常渲染）
- TC-02 ✅ 通过（hero 页面有「⊞ 分屏」按钮，conversation.hero.options 槽位）
- TC-03 ✅ 通过（hero 页面点按钮切到分屏面板）
- TC-04 ✅ 通过（分屏面板点「退出分屏」恢复会话页面）
- TC-05 ✅ 通过（激活会话 header 有「⊞ 分屏」按钮，conversation.session.header.actions 槽位）
- TC-06 ✅ 通过（会话页面点按钮切到分屏，再点恢复）
- TC-07 ✅ 通过（2×2/3×3/4×4 网格渲染，每格有会话下拉框，可选中会话显示 ID/目录/状态）
- TC-08 ✅ 通过（刷新后格子分配保留，localStorage 持久化生效）
- TC-09 ✅ 通过（格子内渲染会话消息流：用户消息、assistant 回复、turn 分隔线）
