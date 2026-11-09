# IMPL PR 质量门禁与 OCR 审查（2026-11-09）

> 快照 · 按 [DESIGN PR 质量门禁与 OCR 审查](../design/20261109_DESIGN_PR质量门禁与OCR审查.md)
> 落地。本文记录实际文件、远端设置与验证证据。

## 落地内容

| 内容 | 位置或设置 |
|---|---|
| PR 确定性门禁 | `.github/workflows/ci.yml` 的 `verify` job |
| 本地与 PR 共用标题规则 | `gate/commit_subject.mjs`、`gate/commit_msg.mjs`、`gate/pr_title.mjs` |
| 标题入口反例 | `test/pr-title.test.js` |
| OCR 自动与手动触发 | `.github/workflows/ocr-review.yml` |
| 项目语义审查规则 | `.opencodereview/rule.json` |

CI 在非草稿 PR、`main` 推送和手动触发时运行。PR 打开、更新、重新打开、转为 Ready
以及标题编辑都会重跑。检查依次覆盖差异卫生、PR 标题、现有全量门禁与构建。

OCR 使用官方 Action v1.13.6 与相同版本 CLI，两者均固定版本，Action 固定完整提交 SHA。
同仓非草稿 PR 自动运行；授权维护者可通过 `/open-code-review` 或
`@open-code-review` 审查包括 fork 在内的 PR。sticky summary 与 incremental 已开启。

## 远端设置

`main` 分支保护已配置：

- 必需状态检查为 `verify`，要求合并前跟上最新 `main`。
- 必须经过 PR；当前不强制另一人批准。
- 新提交使旧批准失效，审查对话必须解决。
- 禁止强制推送与删除，规则适用于管理员。
- 要求线性历史；仓库仅允许 squash merge，合并后删除远端分支。

`OCR_ENABLED` 仓库变量已建立并设为 `false`。模型地址、认证令牌和模型名尚未配置，
所以 OCR 当前不会运行，也不会产生可预见的失败。

## 验证证据

本地：

```text
npm run check:full
244 tests passed；lint、重复代码、格式与构建通过

npx @alibaba-group/open-code-review@1.13.6 rules check packages/dsh-workspace-split/src/client.js
命中项目 .opencodereview/rule.json 的客户端规则
```

云端 PR #11：

- 正常 PR 的 `verify` 运行通过。
- 将标题改成 `invalid title` 后，运行 42512264439 按预期失败。
- 恢复合法标题后，运行 42512325242 通过，证明标题编辑会触发重新验证。
- 独立只读审查发现的手动 OCR 上下文缺失、`edited` 与 `ready_for_review` 触发缺口
  均已修复并推送。

Actionlint 因本机无法连接 Go 模块代理而未运行；GitHub 已实际解析并成功执行 CI
workflow。OCR 尚未调用模型，不能据此声称行级评论已经实测。

## 踩过的坑

- `issue_comment` 事件没有 `github.event.pull_request`。手动审查必须通过 API 查询
  PR 的 base 与 head，再显式传给 OCR Action，否则无法计算 merge-base。
- 仅监听 PR 打开和更新不够：squash merge 使用最新标题，标题编辑必须重跑门禁。
- `pull_request_target` 下仍使用官方 Action 的默认基础分支检出。不能额外检出 PR head，
  也不能在该 job 安装项目依赖或运行项目脚本。
- MOLIO 的审查重点来自 `rule.json`。本次使用 `merge_system_rule: false`，不在
  workflow 中增加正则过滤或重复评论清理。

## 后续启用 OCR

需要配置 Actions secrets：`OCR_LLM_URL`、`OCR_LLM_AUTH_TOKEN`；Actions variables：
`OCR_LLM_MODEL`、`OCR_LLM_USE_ANTHROPIC`。配置完整后才把 `OCR_ENABLED` 改为 `true`，
再用同仓 PR 与授权维护者手动触发 fork PR 各验证一次。

跨平台锁文件修复与 `npm ci`、浏览器 E2E 必检、第二位维护者批准及 CODEOWNERS 均不在
本次落地范围内。

## 后续修正与实测（2026-11-09）

- OCR 已配置 Kimi Coding：`kimi-for-coding`、OpenAI Chat Completions、`high` 推理。
- fork PR #1 的手动验收运行 42599111065 成功，Kimi 调用、差异解析、汇总与两条
  行级评论均已回写，证明模型与评论链路可用。
- 随后按维护者要求改为 CI `workflow_run` 成功后才自动审查。所有非草稿 PR 都覆盖，
  包括 fork；基础门禁失败、`main` 推送、Draft、已关闭或 head 已变化的 PR 不调用模型。
- OCR 通过当前开放 PR 列表按 CI head 查找目标，避免依赖 fork 中可能为空的
  `workflow_run.pull_requests`，也避免同一 head 关联多个 PR 时误选陈旧首项。
- `checkpoint_range` 已开启，代码 head 未变化的重复 CI 不重复审查相同范围。
- 为覆盖 Update branch 产生的新 head，OCR 在调用模型前复用历史检查点中的 head 与
  merge-base，使用 `git patch-id --stable --verbatim` 比较实际补丁。只有配置指纹相同、
  历史记录完整且补丁等价时才跳过；对象缺失、记录异常与比较失败都回退到正常审查。
- Git 验证中，PR #1 模拟合并最新 `main` 前后的 patch-id 一致；PR #2 的不同补丁
  得到不同 ID。比较保留空白差异，YAML 缩进变化不会被误判为等价。
