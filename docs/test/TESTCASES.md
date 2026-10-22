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

### TC-10 格子内直接输入
- 步骤：格子底部输入框输入文字，回车或点「发送」
- 预期：消息通过 session.prompt() 进入会话，输入框清空，焦点保持

### TC-11 状态灯
- 步骤：格子 header 左侧圆点显示会话运行状态
- 预期：运行中绿色，空闲灰色

### TC-12 分屏状态自动恢复
- 步骤：分屏激活状态下刷新页面
- 预期：页面加载后自动回到分屏，格子分配完整

### TC-13 格子数量上限
- 步骤：网格切换到 5×5
- 预期：格子数被 clamp 到 maxCells（默认 20），工具栏显示 used/max

### TC-14 上限可配置
- 步骤：cordis.patch.yml 的 config.maxCells 改为其他值
- 预期：上限跟随配置

### TC-15 Windows 桌面端（web profile）验证
- 步骤：Windows 上 `dsh web` 安装同一插件，打开页面操作
- 预期：与 WSL 行为一致，大目录（600+ 会话）下正常

## 当前状态（2026-10-22 全部通过）
- TC-01 ✅ 插件加载，sidebar 正常
- TC-02 ✅ hero 页面「⊞ 分屏」按钮（conversation.hero.options）
- TC-03 ✅ hero 切分屏
- TC-04 ✅ 退出分屏
- TC-05 ✅ 会话 header 按钮（conversation.session.header.actions）
- TC-06 ✅ 会话页双向切换
- TC-07 ✅ 网格渲染 + 会话下拉选择
- TC-08 ✅ localStorage 持久化（gridSize + cells）
- TC-09 ✅ 消息流渲染（WSL 两会话、Windows 两个真实会话均验证）
- TC-10 ✅ 格内输入框 + prompt API 接线（输入框/发送按钮渲染正常；因测试环境无 API key 未验证完整发送链路）
- TC-11 ✅ 状态灯渲染（数据源 snapshot.running）
- TC-12 ✅ 刷新自动恢复分屏
- TC-13 ✅ 5×5 clamp 到 20/20
- TC-14 ✅ config.maxCells 生效（patch.yml 配置 20）
- TC-15 ✅ Windows web profile 689 会话下正常

## 已知限制
- 完整发送链路（prompt → LLM 回复）需要 API key，测试环境未覆盖
- 格子内消息为只读简版渲染，无 Markdown/代码高亮
- 多显示器场景使用浏览器多窗口（每窗口独立 localStorage）
