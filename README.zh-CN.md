# dsh-workspace-split

[![npm](https://img.shields.io/npm/v/@metal-huang/dsh-workspace-split)](https://www.npmjs.com/package/@metal-huang/dsh-workspace-split)
[![license](https://img.shields.io/npm/l/@metal-huang/dsh-workspace-split)](LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DSH-%E2%89%A50.2.1--rc.2-blue)](https://github.com/deepseek-ai/deepseek-harness)

[English](README.md) · 中文说明

把多个**正在运行**的 DeepSeek Harness 会话并排放在同一个窗口里，每个格子都能
直接输入。为「同时盯多个项目」而做：一屏看完所有会话的进展，不用来回切标签。

界面优先使用已支持的 Harness 页面语言，其次使用已支持的浏览器语言，
最后回退英文。Harness 语言不受支持时，不会挡住浏览器里可用的翻译。

<!-- 截图放在 docs/assets/split-view.png，拍好后取消注释。 -->

## 它能做什么

- **活的会话网格**。行列自己选，最多 5 行 × 6 列，每个格子是一个运行中的会话，
  带完整对话记录。
- **行列都能拖**。两个格子之间的分隔条可以拖动改大小，双击回到等分；比例会保存，
  刷新后还在。列拖到 18 个中文字宽停住，行拖到「表头 + 4 行文字」停住。
- **每个格子都能打字，也能放附件**。每格有独立输入框，可以粘贴、拖入或选择
  PNG / JPEG / WebP / GIF，也可以从 `+` 菜单附加任意文件；上传走
  `ctx.fileUpload`，文件随文字一起发出；分屏布局不会自己变。
- **每格可选模型、推理等级和访问模式**。输入框下方的座位读取与主会话相同的
  Session 投影和 Remote 目录，写入走 `session.selectModel` 与
  `/permission <preset>`；切到完全权限时同样要求风险确认。
- **斜杠命令与 `@` 引用**。`/命令` 走 `session.command`，不消耗一轮对话；
  `@` 通过公开引用接口列出文件与会话，插入的文本与主会话一致。
- **审批与提问直接在格子里回答**。该会话有等待中的审批或
  `ask_user_question` 时，输入框会换成一张紧凑卡片；回答调用的是主会话面板
  同一个 pending 对象。
- **上下文占用**。底部显示与主会话一致的 `projected / window` token 读数；
  投影缺失时整块隐藏。
- **一格放会话，或放项目**。可以钉住某个会话，也可以钉住一个项目，在格子里
  切换这个项目的不同会话；自由格的下拉里每行带彩色项目徽章（跟标题栏同一套），
  还能直接按标题或项目名搜索，↑↓ + Enter 选。
- **归档就让位**。在侧栏归档一个会话后，Host 确认归档时绑着它的格子就放开（同一轮
  更新，分屏自己不做乐观更新）：会话格子清空，项目格子只清会话、项目作用域还在；
  格子选择器和拖入解析都不再列出归档会话，取消归档后又能选回来。
- **实时状态**。标题上的圆点表示该会话是否正在跑；标题前还有一个彩色项目徽标，
  开了很久也能一眼看出这个会话属于哪个项目。
- **点一下就算读过**。会话跑完时侧栏亮起的「已完成」亮点，进分屏点一下那个格子就
  灭——不用切回主视图。
- **密度跟着格子走**。格子变窄时文字自动缩小，小格子里也能看到有用的信息量；
  在某格上 `Ctrl` + 滚轮只调这一格。标题头跟随格子宽度的自动缩放，但不跟随手动
  缩放，所以标题既不会比正文显得过大，也能保持对齐。
- **Markdown 与公式**。表格、代码块、任务清单，TeX 用 KaTeX 渲染。
- **图片点开看大图**。对话里的图片缩略图点一下就铺满窗口，点任意处或按 Esc 关闭；
  预览走独立浮层，不受格子缩放和裁切影响。
- **看到过程，不只看结果**。思考与工具调用按轮折叠成一个「处理过程」组，并显示耗时；
  工具执行期间标「运行中」，底部状态行说明当前在做什么；本轮失败会显示提供方错误
  而不是静默结束；草稿为空时发送键变成停止键。
- **队列、插话、移除**。运行中被排在后面的消息会列在输入框上方，可以「插话」或
  「移除」，与主会话的 QueueDock 一致。
- **工具调用可展开**。参数和输出就地展开，失败有标记。
- **轮次导航轨**。右侧刻度点击跳转，没加载过的轮次会先拉历史。
- **布局持久化**。网格、格内会话、每格缩放都会恢复。

## 会话是怎么接进来的

会话数据走公开的 `ctx.sessions` 接口（`list`、`retain`、事件源），输入走
`session.prompt`。每个格子的对话记录、Markdown、工具卡和输入框都由本插件自己
渲染，样式沿用 DSH 的主题变量与视觉规则，跟随应用主题。

除一处例外，所有 DSH 相关能力都走公开服务与 Remote 命名空间：`ctx.fileUpload`、
`ctx.uiSession`、`ctx.remote.session`、`ctx.remote.permissionPresets`、
`ctx.remote.fileReferences`、`ctx.remote.sessionReferenceResolver`。

那处例外是「点格子清未读亮点」：DSH 只在会话进入主视图时清 `completionUnread`，
公开面没有写入口，所以这里读的是 `ctx.uiSession` 实例上未公开的确认集合
（`completionUnread` 与 `publishStatus()`）。这是有意的越界，代价与兜底写在
[TECH 13.5](docs/tech/TECH_DSH现有能力盘点.md)；官方公开对应方法后就换过去。

`test/dsh-contract.test.js` 会对照本机安装的 DSH 断言这些方法与类型名（包括上面
那处例外用到的两个内部成员）；官方改名或删除时，门禁会带着缺失的符号失败，而不是
让某个格子静默坏掉——内部成员缺失时，清未读降级为「亮点留着」，不会报错。用
`DSH_CONTRACT_ROOT` 可指定别的安装目录；没装 DSH 时该测试自动跳过。

## 环境要求

- DeepSeek Harness **0.2.1-rc.2** 或更新版本（桌面版或 Web 版均可）。
- 同一份构建在桌面版和 `dsh web` 里都能用。

## 安装

```bash
dsh plugin add @metal-huang/dsh-workspace-split
```

装完重启应用（或在网页里刷新）。开关出现在侧边栏底部、账号旁边。

<details>
<summary>从本地检出安装</summary>

```bash
git clone https://github.com/metal-huang/dsh-workspace-split.git
cd dsh-workspace-split
npm install
cd packages/dsh-workspace-split && npm install && npm run build
dsh plugin add "$PWD/packages/dsh-workspace-split"
```

</details>

## 用法

| 动作 | 位置 |
|---|---|
| 进 / 出分屏 | 左键点侧边栏底部的 ⊞ |
| 选网格大小 | 右键点同一个 ⊞ |
| 给格子指定会话 | 用格子标题里的选择器，或从侧边栏拖一个会话行进格子 |
| 改会话名 | 标题旁的 ✎ |
| 只调整某一格的文字大小 | 在该格上 `Ctrl` + 滚轮 |
| 提高格子上限 | 设置 → 通用 → 分屏网格 |

全屏默认最多 10 格（单窗口硬上限 12 格，两项都可配）。6 格比较舒服，超过 6 格
开新的会先确认一次。

## 开发

```bash
npm install          # 仓库工具链
npm run check        # 门禁：lint + 重复代码 + 格式 + 测试
npm run build        # 重建客户端产物
npm run release      # 发布桌面 profile 用的快照
```

`packages/dsh-workspace-split/src/client.js` 是源码；构建产物是包根目录的
`packages/dsh-workspace-split/client.js`，由 `npm run build` 生成，**不要手改**，
也不入库——在该包里 `npm install` 会走 `prepare` 构建一次，之后改源码用
`npm run build` 重建。

仓库规则见 [AGENTS.md](AGENTS.md)，产品与设计文档见 [docs/](docs)。

## 贡献

欢迎修 bug 和改文档。新功能、行为变更、新依赖请先开 issue——见
[CONTRIBUTING.zh-CN.md](CONTRIBUTING.zh-CN.md)。

## 许可证

[MIT](LICENSE)
