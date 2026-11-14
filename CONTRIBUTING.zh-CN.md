# 为 dsh-workspace-split 做贡献

感谢你愿意花时间贡献。这是一个小型、由维护者主导的项目：欢迎修 bug 和改文档，
产品决定权在维护者。

[English](CONTRIBUTING.md)

## 先看这里

- **修 bug** —— 可以直接提 PR。请附复现步骤；改到行为时请补测试。有对应 issue
  就链接上。
- **新功能、行为变更、改默认值、新增依赖、提高最低 DSH 版本** —— 请先开 issue，
  等维护者确认方向后再动手。确认之前不要写实现 PR。
- **文档、测试、杂务** —— 可以直接提 PR。
- **一个 PR 只做一件事。** 无关改动会拖慢评审，也会被回退。

未经批准就改变产品行为的 PR 可能被直接关闭。这不是针对你的工作，而是为了保证
产品方向一致。

## 动手之前

1. 先搜一遍已有的 issue 和 PR。
2. 只要不是小 bug，先按模板开 issue。
3. 等维护者确认方向。
4. 保持改动聚焦；说清问题是什么、你的改动为什么能解决它。

## 开发环境

需要 Node.js（当前 LTS）和 npm。

```bash
npm install
npm run build        # 重建 packages/dsh-workspace-split/client.js
npm run check        # lint + 重复代码 + 格式 + 测试
npm run test:e2e     # 浏览器 E2E；需要本机 Chrome/Chromium
```

几个要点：

- `packages/dsh-workspace-split/src/client.js` 是源码；构建产物是包根目录的
  `packages/dsh-workspace-split/client.js`，由 `npm run build` 生成、不入库——
  不要手改。
- `npm run check` 是评审会跑的门禁。报错请修；不要为了让警告消失去调高
  `gate/` 里的基线。
- 纯逻辑放在小模块里（`composer-images.js`、`transcript.js`、`zoom.js`、
  `session-state.js` 等），并且有单测。改行为时请补测试。只能在真实 DSH 页面里
  跑的接线由 `test/split-wiring.test.js` 的源码形状守卫盯着。
- DSH 契约测试读取本机 DSH 安装：`node test/dsh-contract.test.js`
  （用 `DSH_CONTRACT_ROOT` 指向别的安装）。没装 DSH 时整组跳过。
- Web 开发用 web profile，直接链接包目录；桌面版链接 `.release/`，只有跑
  `npm run release` 才会更新。
- 仓库内部结构、门禁基线与发布步骤见 [AGENTS.md](AGENTS.md)。

## 验证要求

PR 是在声称「这个改动有效」。请用证据支撑这个声称：

- **构建并运行它。** 本地必须通过 `npm install`、`npm run build`、`npm run check`、
  `npm run test:e2e`，然后把插件加载进真实的 DSH web profile，实际操作你改动的
  行为。只过语法检查或 pre-commit 钩子不算验证；「未做本地构建」不是可接受的
  验证说明。
- **写代码前先确认平台 API 存在。** 本插件运行在 DSH 内部，只能使用目标 DSH
  版本实际提供的能力。确认你调用的每个方法、每个选项都真实存在：读平台源码或
  类型定义（DSH 安装目录的 `node_modules/@deepseek-ai/*`，或公开仓库
  deepseek-harness 对应 tag 的源码），或跑 DSH 契约测试。不要对着「你以为存在」
  「别的版本里有」或「上游以后会加」的 API 写代码。如果功能需要平台尚不具备的
  能力，请先开 issue——依赖假设中的上游改动的 PR 会被关闭。
- **展示行为，而不只是 diff。** UI 改动附前后截图或录屏；修 bug 先复现 bug，
  再证明你的改动挡住了它。把相关命令输出贴进 PR 描述。
- **欢迎 AI 辅助贡献，但验证责任在你。** 如果代码是工具写的，你仍然必须构建它、
  运行它、核对它调用的每一个平台 API。未经验证的生成代码浪费评审时间，会被
  关闭。

## Pull Request

- 基于 `main`。
- 标题用 Conventional Commits：`type(scope): summary`
  （`feat`、`fix`、`refactor`、`docs`、`test`、`chore`、`perf`、`ci`、`build`、
  `style`、`revert`），主题不超过 72 字符。
- 按 PR 模板填写。有 issue 就用 `Fixes #123` 链接。
- 满足[验证要求](#验证要求)，贴上 `npm run check` 的输出。UI 改动请附前后截图或
  录屏，并说明怎么验证的。
- 不要提交产物（`packages/*/client.js`、`.release/`），也不要夹带无关的格式改动。
- 描述用自己的话，尽量短。大段 AI 生成的说明很难评审，可能被忽略。

## 提交规范

一次提交只表达一件事。body 写「为什么」，不写「改了什么」。只 add 自己的文件
（`git add <路径>`），不要用 `git add -A` 或 `git add .`。

## 评审

- 维护者时间有限，没有固定的评审时限。
- 评审可能要求补测试、补文档或缩小范围。
- 产品决定（默认值、布局、交互模型）由维护者做，不取决于 PR 的大小。

## 安全

不要把 token、私人路径或客户数据贴进 issue 或 PR。日志请先脱敏。
