# 开源仓库说明（接线顺序 / 目录约定）

本文件是**指针页**，只说「第一步看哪、第二步看哪」，不复制文档正文。
权威内容在各文档内，本页不重复。

## 本仓库是什么

一个面向 DSH（DeepSeek Harness）桌面端的**多会话并置**插件：把多个进行中的
会话同时摆到屏幕上，每个格子都能直接输入，用于并行监督多个项目。

它不重新实现会话界面。会话渲染、多会话并发存活、进度信号这几件事 DSH 已经
提供了能力，本插件只做「布局编排」和「当前格标记」两层。

## 阅读顺序

| 顺序 | 文档 | 说明 |
|---|---|---|
| 1 | [PRD 多会话并置](docs/prd/20261022_PRD_多会话并置.md) | 需求与全部设计决策，开工前必读 |
| 2 | [DESIGN 多会话并置](docs/design/20261022_DESIGN_多会话并置.md) | 数据模型、槽位接线、里程碑 |
| 3 | [TECH DSH 现有能力盘点](docs/tech/TECH_DSH现有能力盘点.md) | 复用边界与已确认不具备的能力 |

## 文档类型词表（本仓库采用）

沿用通用规范，七类：PRD / DESIGN / TECH / IMPL / CR / SPEC / BACKLOG。

- 快照类（PRD / DESIGN / IMPL / CR）：文件名前置创建日期，`docs/<类型目录>/`
- 活文档（TECH / SPEC）：文件名不带日期，留各自目录的根
- 目录即大类：文档进与自身类型同名的目录

完整条文在真源仓 `engineering-standards`（本机路径不入本仓库），本仓库只在
[SPEC_文档规范](docs/spec/SPEC_文档规范.md) 留指针与本项目选择。

## 代码在哪、怎么构建

```text
packages/dsh-workspace-split/
├── index.js          # Host 半侧，手写
├── src/client.js     # 客户端源码，改这个
├── client.js         # 客户端产物，GENERATED FILE，不入库，`npm run build` 生成
├── build.mjs         # esbuild 打包脚本
└── cordis.patch.yml  # 插件行与 Config
```

客户端有构建步骤：依赖（React 除外）全部内联进 `client.js`，
因为浏览器侧只能 `require` 平台模块表里那 11 个包。改完源码跑：

```bash
cd packages/dsh-workspace-split
npm install     # 首次；包的 prepare 会顺带构建一次
npm run build
```

产物不入库（`.gitignore` 挡住）：npm 包里的那份由 `prepare` 在打包前重建，
所以 clone 下来没有 `client.js` 是正常的，构建一次即可。

## 开发版与桌面版隔离

桌面 profile 链接的是 `.release/dsh-workspace-split`，**不是**开发目录。
在 `packages/` 里怎么重构、怎么重建都不会影响桌面版，只有显式发布才更新：

```bash
npm run release   # 构建 + 复制到 .release/，桌面版下次启动生效
```

- 日常验证走 web profile，它链接 `packages/dsh-workspace-split`；包的 `exports`
  指向构建产物 `client.js`，所以**改完 `src/client.js` 必须 `npm run build`** 才看得到变化
- 发布是「先暂存再换名」：复制到 `.release/.staging`，整包校验通过后才切换，
  失败或中断都不会留下残缺快照，上一版留在 `.release/.previous` 可回滚
- `.release/` 不入库；发布脚本按 `package.json` 的 `files` 取文件，并要求该包
  无运行时依赖（`dependencies` / `peerDependencies` / `optionalDependencies` 都查）
- 桌面 profile 的 `package.json` 由 Electron 独占管理，`dsh plugin` 与
  `dsh --dump-config` 都拒绝操作它；改配置只能编辑文件后在该目录跑 `pnpm install`

## 目录结构

```text
docs/
├── prd/       # 需求（快照）
├── design/    # 技术设计（快照）
├── tech/      # 技术现状活文档 + impl/ + codereview/
├── spec/      # 规范类活文档
├── backlog/   # 点子备忘
└── archive/   # 归档（唯一去向，历史在 git log）
```
