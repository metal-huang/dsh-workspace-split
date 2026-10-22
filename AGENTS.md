# AGENTS.md

给在本仓库工作的 Agent 的硬规则。文档规范与阅读顺序见 [CLAUDE.md](CLAUDE.md)。

## 门禁总账

最近一次全量 `npm run check` 的数字：

| 项 | 数值 | 上限 |
|---|---|---|
| ESLint error | 0 | 0（硬） |
| ESLint warning | 9 | 9（棘轮，只降不升） |
| 重复代码 | 2 块 / 17 行 / 0.82% | 2 / 17 / 0.94% |
| 格式 | 2 个文件冻结，其余必须干净 | 冻结清单只减不增 |
| 测试 | 12 项通过 | 不得减少 |

数字会随收紧变化，判断依据看**基线文件**，不要照抄本表。

## 基线在哪、怎么收紧

| 基线 | 文件 | 收紧方式 |
|---|---|---|
| lint 警告数 | `gate/lint_baseline.json` | `npm run ratchet:tighten` |
| 重复代码 | `gate/dup_baseline.json` | 同上，三个维度同时下降 |
| 格式冻结清单 | `gate/format_baseline.json` | 格式化某个冻结文件后跑 tighten，该文件自动移出 |

`ratchet:tighten` **只向下写**：测出来比基线高就只报警、不落盘。首次落地或确需接受一次上涨时用 `--seed`。

基线变更必须与产生它的代码改动**同一个提交**。

## 三档门禁

| 档位 | 命令 | 内容 |
|---|---|---|
| 钩子 | 自动，`git commit` 时 | 暂存区冲突标记 → 暂存文件格式 → 暂存文件 error → 新增文件零警告 |
| 快档 | `npm run check:fast` | lint + 重复 + 格式 |
| 全档 | `npm run check` | 快档 + 测试 |
| 发版档 | `npm run check:full` | 全档 + 构建 |

钩子只检查**暂存区**里的文件，不看工作区其他未提交改动。全局计数类检查不进钩子，避免存量违规把提交锁死。

## 客户端产物：不要手改

`packages/dsh-workspace-split/client.js` 是构建产物（内部含 mdast/micromark 内联代码，8000+ 行）。

- 改逻辑或样式：改 `packages/dsh-workspace-split/src/client.js`，然后 `npm run build`
- 直接改产物会被 `test/artifact.test.js` 拦下（它重新构建并与提交的产物逐字节比对）
- 产物文件在 `.prettierignore`、ESLint `ignores`、重复扫描范围之外，都不要纳进去

## 提交信息

Conventional Commits，由 `gate/commit_msg.mjs` 校验：

```
type(scope): description
```

- type 取值：`feat` `fix` `refactor` `docs` `test` `chore` `perf` `ci` `build` `style` `revert`
- 主题 ≤ 72 字符，结尾不加句号
- `Merge ` / `Revert "` / `fixup!` 开头豁免
- body 可选，用 `- ` 列条目

## 开发纪律（单人）

1. **只 add 自己的文件**。不要用 `git add -A` / `git add .`，逐条指定路径。
2. **原子提交**。一次提交只表达一件事，产物与源码同提交。
3. **提交前跑 `npm run check`**。钩子只做定向检查，全局数字要自己看。
4. **不动别人的未提交改动**。工作区里不属于本次任务的修改，不暂存、不还原、不格式化。
5. **收紧基线要谨慎**。把警告数压下去靠改代码，不靠改基线；确需接受上涨用 `--seed` 并在提交信息里说明原因。
6. **新增文件零警告**。钩子会拦，写完先跑 `npx eslint <file>`。
7. **改了 `src/client.js` 必须重新构建并一并提交产物**，否则 `check` 的产物一致性测试会红。
