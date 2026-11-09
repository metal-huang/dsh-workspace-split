# DESIGN PR 质量门禁与 OCR 审查

创建日期：2026-11-09

> **后续修正（2026-11-09）**：OCR 改为由 CI 的 `workflow_run` 成功事件触发。
> 所有非草稿 PR（包括 fork）都在 `verify` 通过后自动审查；基础门禁失败不调用模型。
> 第五节中直接由 PR 触发、同仓自动与 fork 默认跳过的约定由本段替代。审查还必须
> 核对当前 PR head 与本次 CI 通过的 head 相同，避免验证旧提交却审查新提交。
>
> **后续补充（2026-11-09）**：`main` 更新后通过 GitHub API 自动更新所有目标为
> `main` 的非草稿 PR，使存量 PR 自动补跑 CI 并串联 OCR。更新携带列表读取时的
> `expected_head_sha`，防止覆盖作者并发推送；冲突、fork 未授权与已是最新只记录结果，
> 不检出或执行 PR 代码。内置 `GITHUB_TOKEN` 的更新不会触发下游 CI，因此使用仅拥有
> 主仓库内容读写与 PR 读写权限的维护者细粒度 PAT；它还需遵循 fork 的
> maintainer-can-modify 授权。该流程不使用 merge queue，PR 数量明显增加后再重新评估。
>
> **后续补充（2026-11-09）**：OCR 复用现有汇总评论中的上次 head 与 merge-base，
> 使用 Git 自带的 `git diff ... | git patch-id --stable` 比较前后实际补丁。Update branch
> 只改变提交 SHA 而补丁等价时跳过模型调用；真实修改与冲突解决产生不同补丁时照常审查。
> 历史缺失、对象不可读或比较失败一律继续审查，不因去重失败而漏审。

## 一、目标与边界

外部贡献已经增多，本地 Husky 与发布时检查无法保证每个 PR 都经过同一套验证。
本方案把现有门禁前移到 PR，并增加 Open Code Review（OCR）辅助审查。

目标：

1. 每个非草稿 PR 都在干净环境中运行 lint、重复代码、格式、测试与构建。
2. `main` 只接受通过必需检查的 PR，禁止直接推送、强制推送与删除。
3. PR 标题沿用 Conventional Commits，配合 squash merge 保持主分支历史一致。
4. OCR 只补充语义审查，不替代确定性检查与维护者判断。
5. 同仓 PR 自动审查；外部 fork 默认跳过，仅授权维护者可手动触发。

本次不接入浏览器 E2E 必检，不强制提交签名，不引入 merge queue，也不要求第二位
维护者批准。现有个人维护流程若强制他人批准，会阻塞维护者自己的 PR。

## 二、职责划分

```text
本地 Husky       暂存区快速反馈，可被绕过
PR Check         干净环境中的独立复验，作为合并门禁
Branch protection 强制执行 PR 与状态检查，禁止绕过
OCR              语义缺陷与缺失测试提示，不作为合并门禁
人工 Review       产品方向、架构取舍与 OCR 意见采信
```

CI 不直接执行依赖暂存区的 pre-commit 脚本。它复用底层 `npm run check:full`，
再对 PR 差异运行 `git diff --check`。提交标题校验逻辑抽成共用函数，供本地
commit-msg 与 PR 标题检查调用，避免两套规则漂移。

## 三、PR Check

新增 `.github/workflows/ci.yml`：

- 触发：非草稿 PR 的打开、更新、重新打开、转为 Ready；`main` 推送；手动触发。
- 环境：GitHub 托管 Ubuntu，Node.js 22，与发布环境一致。
- 权限：`contents: read`，不读取密钥。
- 安装：根目录与插件包分别安装依赖。
- 验证：PR 差异卫生、PR 标题、`npm run check:full`。
- 稳定性：固定 Action 提交 SHA，设置超时和按 PR 取消旧运行。

当前 Windows 锁文件缺少 Linux 可选二进制，首版沿用发布流程的 `npm install`。
跨平台锁文件修复与切换 `npm ci` 单独进行，避免扩大本次变更。

必需检查只选择稳定的 `verify` job。浏览器 E2E 仍由 `npm run test:e2e` 手动运行，
待 DSH 与 Chromium 环境固定且不可静默跳过后再纳入 CI。

## 四、GitHub 分支保护

对 `main` 启用：

- 必须经过 PR 与必需状态检查。
- 合并前分支必须跟上最新 `main`。
- 新提交使旧批准失效。
- 审查对话必须解决。
- 禁止强制推送与删除。
- 规则同样适用于管理员。

仓库采用 squash merge 和线性历史。当前不设置必需批准人数；外部 PR 仍由维护者
人工审查。后续有第二位维护者时再启用批准人数与 CODEOWNERS。

## 五、OCR 审查

新增 `.github/workflows/ocr-review.yml` 与 `.opencodereview/rule.json`，参考
MOLIO 的职责划分和触发策略，但使用 OCR 官方 Action，避免复制大段评论发布脚本。

### 5.1 触发与权限

- 同仓、非草稿 PR 的打开、更新、重新打开自动触发。
- `/open-code-review` 或 `@open-code-review` 评论可手动触发。
- 只有 OWNER、MEMBER、COLLABORATOR 能手动触发，忽略 Bot。
- fork 自动触发跳过，防止未经确认的模型费用。
- 使用 `pull_request_target` 获得评论权限与模型配置；权限仅限读取内容和写 PR。
- 不在 OCR job 中安装项目依赖、构建或执行 PR 脚本。
- Action 固定完整 SHA，OCR CLI 固定版本；规则取自受信任的基础分支。
- sticky summary 更新同一汇总评论，incremental 减少重复行级评论。
- OCR 不是必需检查，不自动批准、合并或提交修复。

模型地址、令牌与模型名分别使用 Actions secrets / variables。未配置完整前通过
`OCR_ENABLED=false` 停用运行，避免每次同仓 PR 都产生可预见的失败。

### 5.2 审查规则

使用 `merge_system_rule: false`，从规则源头抑制低价值评论，不在 workflow 中增加
正则过滤或内容去重。

禁止报告：

- ESLint、Prettier、jscpd 已覆盖的格式、命名与重复代码问题。
- 没有正确性影响的重构、文案与视觉偏好。
- 没有行动价值的确认性评论。

重点报告：

- 会话、草稿、队列、审批在格子之间串线。
- 异步状态竞争、stale closure、订阅与定时器泄漏。
- 输入、附件、Markdown 与路径的注入或数据损坏。
- 布局持久化兼容性与 Host/客户端状态不一致。
- 平台模块、构建产物与 DSH 接口契约破坏。
- 行为变化缺少有效回归测试。

测试、门禁脚本和关键配置仍在审查范围内；普通产品文档排除。

## 六、实施与验收

1. 先提交本 DESIGN，再实现 CI 与 OCR。
2. 本地运行 `npm run check:full`，对标题共用校验补充正反例测试。
3. 通过 PR 验证真实云端检查，再配置 `main` 必需检查。
4. 验证无效标题和失败测试会阻塞；fork 自动 OCR 跳过；未授权评论不能触发。
5. OCR 模型配置齐全后再开启 `OCR_ENABLED`，用一个小 PR 验证行级评论与汇总更新。
6. 实施后补 IMPL，记录实际配置、验证证据与尚未完成的项目。
