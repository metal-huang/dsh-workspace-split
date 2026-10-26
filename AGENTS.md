# AGENTS.md

Rules for AI coding agents working in this repository. Humans are welcome to read
it too: nothing here is agent-specific except the tone.

产品与设计文档的阅读顺序见 [CLAUDE.md](CLAUDE.md)，用户文档见
[README](README.md) / [README 中文](README.zh-CN.md)。

## 仓库长什么样

```text
packages/dsh-workspace-split/
├── index.js          # Host 半侧（手写）：持久化，走 ctx.storageDomain
├── src/
│   ├── client.js     # 客户端源码（手写）：布局、格子、渲染、输入框
│   ├── composer-images.js # 图片入队与 prompt parts 的纯函数（有测试）
│   ├── transcript.js # 事件窗口折叠成渲染行（有测试）
│   ├── zoom.js       # 格子文字缩放的纯函数（有测试）
│   ├── i18n.js       # 取词函数
│   ├── messages.js   # 中文词表
│   └── locale/en.json# 英文覆盖
├── client.js         # 客户端产物（GENERATED，不入库；npm run build 生成）
├── build.mjs         # esbuild 打包脚本
└── cordis.patch.yml  # 插件行
```

客户端有构建步骤，因为浏览器侧只能 `require` 平台模块表里那 11 个包，
其余依赖（mdast、KaTeX 等）必须在构建时内联进 `client.js`。

## 三条不能破的

**1. 不手改产物，产物也不入库。** `packages/dsh-workspace-split/client.js` 由
`npm run build` 从 `src/` 生成，`.gitignore` 已挡住它。改完 `src/` 在包目录跑一次
构建（或 `npm install`，包的 `prepare` 会自动构建）就能在 web profile 里看到变化。
npm 上那份也一样：CI 与 `prepare` 都在打包前重建，所以它永远和 tag 里的源码同源。
`test/artifact.test.js` 校验的是构建结果本身——loader envelope、只 `require` 平台
模块、两次构建逐字节一致、产物不被 git 跟踪——不再比对某个提交里的文件。

**2. 只 add 自己的文件。** 用 `git add <路径>`，不用 `git add -A`、不用 `git add .`。
提交前 `git diff --cached --stat` 逐条对一遍：暂存区里每个路径，都得是自己这轮改的。
发现陌路径就 `git reset HEAD <路径>` 摘掉。

**3. 提交前跑 `npm run check`。** 钩子只检查暂存区，全局数字要自己看。

## 门禁

```bash
npm run check        # 全档：lint + 重复代码 + 格式 + 测试
npm run check:fast   # 跳过测试
npm run test:e2e     # 浏览器 E2E（需要本机 Chrome/Chromium，找不到会跳过）
npm run build        # 重建产物
```

判定依据是**基线文件**，不是任何文档里的数字（数字会随收紧变化）：

| 基线 | 文件 |
|---|---|
| lint 警告数 | `gate/lint_baseline.json` |
| 重复代码 | `gate/dup_baseline.json` |
| 格式豁免清单 | `gate/format_baseline.json` |
| 构建产物契约 | `test/artifact.test.js` |

`npm run ratchet:tighten` **只向下写**：测出来比基线高只报警、不落盘。
基线只在确有必要时用 `--seed` 上调，并在提交信息里写明理由。

三条硬线：

- ESLint **error 必须为 0**（钩子会拦）
- 警告数、重复块数**不得超过基线**
- 新增文件**零警告**，格式必须 Prettier-clean

## 提交信息

Conventional Commits，由 `gate/commit_msg.mjs` 校验：

```
type(scope): description
```

- type：`feat` `fix` `refactor` `docs` `test` `chore` `perf` `ci` `build` `style` `revert`
- 主题 ≤ 72 字符，结尾不加句号
- body 可选，用 `- ` 列条目；**写「为什么」**，不写「改了什么」

一次提交只表达一件事。

## 改代码时

- **先读再改。** 文件可能被别的会话改过，读到的版本才是真的。
- **注释写「为什么」，不写「是什么」。** 踩过的坑要写清：原来怎么写 → 什么现象
  → 现在为什么这样。
- **声称要有证据。** 「修好了」要能附命令输出；没跑过就不要写「实测」。
- **碰浏览器/服务端验证时**：用空闲端口起自己的实例，不要动别人正在用的实例。
- 修完自己做一次反证：把修复前的现象复现一遍，确认新代码真的挡住了它。

## 发布

```bash
npm run release      # 构建 + 复制到 .release/，桌面 profile 用的快照
```

发布是「先暂存再换名」：整包复制到 `.release/.staging`，校验通过后才切换，
失败或中断不会留下残缺快照；上一版留在 `.release/.previous` 可回滚。

`.release/` 不入库。发布脚本按 `package.json` 的 `files` 取文件，并要求该包
没有运行时依赖（`dependencies` / `peerDependencies` / `optionalDependencies`
都查）——运行时依赖必须打进 bundle。

## 文档

七类型词表（PRD / DESIGN / TECH / IMPL / CR / SPEC / BACKLOG），目录即大类，
快照类文件名前置日期，活文档不带日期。详见
[docs/spec/SPEC_文档规范.md](docs/spec/SPEC_文档规范.md)。
