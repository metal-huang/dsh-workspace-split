# TECH DSH 现有能力盘点

> 文档版本：v4（2026-10-26 复核更新）· 实质更新时递增版本号并改此日期

## 本页性质

本页记录 DSH 桌面端在「多会话并置」这件事上**已经提供了哪些能力**，
用于判断哪些部分可以直接复用、哪些需要自己实现。

盘点方法：读取 DSH 运行时的槽位树与服务契约，并对照 DSH 仓库源码与发布包。
这些是运行时契约，会随 DSH 版本变化，因此本页是活文档，需要持续维护。

v4 依据 2026-10-26 的复核改写第四、五、六、8.1、九、十节，新增第十二节；
复核对象是 DSH 公开仓库 `master` 分支（提交 `22ddee3`）与 npm 上的
`0.2.1-rc.2`、`0.2.1-rc.3`。

本页只记结论与判断，需求与决策在 [PRD 多会话并置](../prd/20261022_PRD_多会话并置.md)。

## 一、DSH 原生是三栏结构

```text
┌──────────┬──────────────────────┬──────────┐
│ sidebar  │        main          │ rightbar │
│ 会话列表 │   当前会话（按 key） │ 文件文档 │
└──────────┴──────────────────────┴──────────┘
```

- `sidebar`：左栏，会话与工作区浏览区
- `main`：中栏，按键选择的槽位，已被 `conversation` 占用
- `rightbar`：右栏，布局服务提供打开方法，且支持全屏模式

## 二、二栏分屏不用自己实现

主栏加右栏就是现成的二屏，右栏还能全屏。

结论：用户要两栏时复用 DSH 原生布局，本项目不画这两个格子。
只有格子数达到三个及以上时，本项目的编排器才介入。

## 三、多会话同时存活已有机制

会话服务提供三个相关方法：

| 方法 | 作用 |
|---|---|
| `retain` | 持有一个会话引用，保证它在持有期间保持活跃、不被卸载 |
| `using` | 在持有期间执行一个操作，结束后释放 |
| `retainInfo` | 返回会话状态的可订阅快照 |

四个格子等于四次持有调用，这是「同时看四个」能成立的前提。
状态灯的数据源是 `retainInfo` 返回的可订阅快照，订阅它就能实时知道
这个会话处于运行中、等待审批、已完成还是出错。

结论：多会话并发存活与进度可观测这两条路 DSH 已经修好。

## 四、格子里的会话视图只能自渲染（v4 修正）

`conversation.content` 是 Component Factory（可复用组件工厂），作用域是「可能有
会话」，其下挂着会话体、输入框等子槽位。v3 据此判断它「可被多次实例化、
每次绑定不同会话」，这个判断已被推翻：

- 工厂实例的会话由渲染位置决定。DSH 原文：「Factory occurrences inherit their
  render-position Session — `conversation.content` does not accept an
  independently addressed Session; that requires a separate Session-provider
  capability.」（`packages/client/ui-conversation/README.md`）
- 渲染工厂用的 `renderFactorySlot()` 不接受会话标识。DSH 原文：「An occurrence
  inherits its render-position scope; `renderFactorySlot()` does not accept a
  Session identity.」（`packages/client/ui-slots/README.md`）
- 工厂的输入属性只有 `variant` / `phase` / `hero`，没有会话标识；会话引用来源表
  里只声明了主视图（`mainView`）一项（本机 0.2.1-rc.2 的类型声明）。
- 平台模块表只有十一项，`ui-conversation`、`ui-session`、`ui-renderer` 都不在表里，
  插件运行时 `require` 不到官方会话渲染器（`packages/client/web/src/seed.ts`）。

所以第三方插件拿不到「把第 N 个会话渲染进第 N 个格子」的入口。
结论：**格子的会话视图由本插件自己渲染**——读会话事件流折叠成行，Markdown、
工具卡、输入框都是自绘，样式沿用 DSH 主题变量。完整证据见第十二节。

## 五、每个格子的输入框也要自绘（v4 修正）

`conversation.composer.bar` 的作用域是「会话」，但它挂在 `conversation.content`
工厂之下，受第四节同一条限制：输入框实例跟着渲染位置的那个会话走，
第三方插件没有「给第 N 个会话单独开一个输入框」的入口。

v3 写「不需要自绘输入框」，与实现不符。实际情况是：格子的输入框由本插件自绘，
发送走公开的 `session.prompt`（见 `packages/dsh-workspace-split/src/client.js`）。
PRD 原则一「点哪打哪」靠这条路径落实。

## 六、入口按钮位（v4 修正）

`shell.leading` 是窗口框架左上角、浮在所有主面板之上的座位，但它属于 single 类型
且已被侧边栏插件占用，第三方插件注册同名字段会让界面在启动期失败（见第八节）。
项目实际把入口放在 `sidebar.footer.action` 槽位，另外在 `conversation.hero.options`
放了一个备用入口。

## 七、持久化与设置

### 7.1 存储的层次与归属

| 服务 | 归属 | 职责 | 插件能否直接用 |
|---|---|---|---|
| `storage` | Host 半侧 | 存储中枢，负责挂载各类后端 | 否，一般不用 |
| `storageDomain` | Host 半侧 | 建域、读全部、写记录、删记录、写全局、关闭 | **可以，但只在插件的 Host 半侧** |
| 设置服务（settings） | Host 半侧，对客户端暴露远程接口 | 配置命名空间的读写与表单投影 | **可以，客户端经远程接口读写** |

客户端半侧**没有任何存储服务**。存储域只对插件的 Host 半侧开放
（bundle 原文："It is available only to host code"）。

因此布局数据的往返路径是：客户端半侧经 `host.call` 到本插件的 Host 半侧，
再由 Host 半侧操作存储域。用户偏好走设置服务的命名空间
（`update` / `replace` / `mutate`，带 `expectedRevision` 并发保护），
客户端经远程接口可直接读写。

注意：以 JSON 文件落盘的实现只是 `storage` 的一个后端，不是插件接口。

### 7.2 会话清单的权威来源

`ctx.sessions.list` 是一个 `ObservableSnapshot`，包含全部会话的标识、
按标识索引的摘要、加载阶段、按会话的投影。bundle 原文称其为
「元数据权威」（"the list snapshot remains the metadata authority"），
**零远程调用**——快照已在客户端。

拖拽装填的数据源应该用它，不用检索方法。`sessions.search` 是全文检索，
结果仅请求内有效，适合搜索框，不适合当清单。

### 7.3 `sidebar.workspaces` 槽位是替换点，不是数据源

该槽位是整块浏览界面的替换点（`replaceRisk: shadows-shipped-ui`），
其子槽位只有菜单项、行操作、行首装饰这类装饰位，注册字段仅
`id` / `order` / `label`，**没有任何返回会话列表的属性**。

所以「从左侧会话列表拖进格子」的实现方式是：
用 `sessions.list` 拿清单，在格子目标区接受拖入；
列表本身的拖拽行为复用 DSH 原生行，插件不碰它的内部数据。

## 八、已确认不具备的能力

盘点时同样重要的是记录「哪些能力没有」，避免方案建立在错误前提上。

| 能力 | 核查结论 |
|---|---|
| 创建或控制原生桌面窗口 | 不具备。客户端全部服务里没有窗口相关方法；服务端清单中 `window` 一词只出现在会话事件读取的返回类型里，含义是读取区间，与界面窗口无关；客户端事件里也没有窗口事件 |
| 多显示器各自独立窗口 | 受上一条限制，无法直接实现 |
| **第三方插件把官方会话体渲染进自己的格子** | **不具备。** 槽位服务没有对外暴露「按会话标识渲染」的方法；工厂渲染走注入给组件的 `renderFactorySlot()`，它不接受会话标识，实例继承渲染位置的会话；官方渲染器所在包也不在平台模块表里（见第十二节） |
| **争用 single 类型槽位** | **不可行。** `shell.leading` 只有单个座位，侧边栏插件已占用；第三方插件注册同名字段会让侧边栏插件在启动期失败，整个界面停在 `Failed to load plugins`。选槽位前先确认 `kind` 是 `list` |

### 8.1 关于「每个格子实例化会话工厂」的核查结论（v4 修正）

原先假设「每个格子实例化一次 `conversation.content` 工厂并绑定各自会话」。
这个假设**不成立**，但 v2 给出的理由需要更正：

- `renderFactorySlot()` 其实是公开的注入属性（ui-slots README 列出的框架属性之一），
  任何注册组件都能用它渲染工厂实例，v2 说它「不是公开接口」并不准确。
- 走不通的真正原因是它**不接受会话标识**：实例继承渲染位置的会话，
  而渲染位置上的会话由主视图决定，插件造不出第二个会话位。
- v2 写「`conversation.content` 由会话包自己渲染一次，绑定的是全局当前会话」同样
  不准确：主视图与嵌入式两种呈现都由会话包渲染，绑定的都是渲染位置上的会话。

因此「每个格子各自渲染一份完整会话」这条路在当前公开接口下走不通，
格子的内容来源是本插件自渲染，见 DESIGN 文件。

界面本体通过 HTTP 提供，服务端有取界面地址（`webApp` 服务）与注册路由
（`webServer` 服务）的能力。

**但这不影响多显示器的核心诉求。** 界面是网页，一个窗口可被拉伸到覆盖
多个屏幕，分屏格子铺满窗口后把分割线对齐到屏幕交界即可做到
「左屏四格、右屏六格」。窗口跨屏拉伸是操作系统的能力，
界面只需铺满窗口，不依赖 DSH 额外开放接口。方案见 DESIGN 文件第七节。

## 九、插件客户端依赖边界（v3 新增，v4 更正代价）

写客户端插件时，「能不能复用 DSH 自己的界面代码」有两个不同的答案，
过去把这两件事混为一谈会得出错误结论，此处分开记录。

### 9.1 运行时能取到哪些模块

壳层启动时把一份**冻结的模块表**交给模块加载器，插件里的 `require` 只能解析这张表
（真源 `packages/client/web/src/seed.ts`）：

```text
react, react/jsx-runtime, react-dom, react-dom/client,
@deepseek-ai/cordis, zod, @tanstack/react-virtual,
@deepseek-ai/dsh-client-store, @deepseek-ai/dsh-client-ui-slots,
@deepseek-ai/dsh-client-ui-primitives, @deepseek-ai/dsh-client-ui-dockkit
```

表外的一切模块名（例如 `mdast-util-from-markdown`、`micromark`）在运行时
`require` 会直接抛错。

### 9.2 界面基础组件包技术上可取，但规范禁止依赖

`@deepseek-ai/dsh-client-ui-primitives` 在 9.1 的表里，所以
`require('@deepseek-ai/dsh-client-ui-primitives')` 在运行时是能成功的，
`MarkdownText`、`CodeBlock` 等组件就在其中。

官方插件开发规范仍然禁止这样做（`cordis-plugin-development` skill 的
`references/practices.md`），理由三条：

1. 这些是内部实现，不是公开 API，版本之间会改而不通知；
2. 插件是纯 JS，没有类型检查，改名或改签名只会在运行时炸；
3. 组件一旦抛错，整个槽位渲染会变空白，控制台只留一句
   `slot entry crashed in '<slot>'`。

规范给出的替代做法：把 markup、CSS、行为抄进插件，类名改成自己前缀，
只保留 `--dsw-alias-*` 主题变量引用——变量改名最多影响外观，不会导致渲染失败。

### 9.3 第三方解析库靠构建时打包，不靠运行时加载

`mdast` / `micromark` 这类库不在 9.1 的模块表里，运行时取不到，
但可以在**构建时**把它们打进 `client.js`：插件产物就是一份普通 JS 文件，
外部依赖只要在打包阶段内联进来，运行时便不需要 `require`。

本项目采用这条路径。客户端源码在 `packages/dsh-workspace-split/src/client.js`，
用 esbuild 打包成 `packages/dsh-workspace-split/client.js`（产物顶部有
`GENERATED FILE` 标记，不要直接改），构建命令 `npm run build`。
产物不入库：npm 上那份由包的 `prepare` 在打包前重建，所以仓库里只有源码。
平台模块（`react` 等 11 个）保持 external，其余全部内联，所以产物里只有
一句 `require("react")`。

选型结论：**要完整语法就引入构建步骤打包 mdast；要零构建就自写精简版。**
本项目选前者，解析器选型与 DSH 自己的对话渲染实现相同（渲染代码仍是本项目自己的）：
`mdast-util-from-markdown` + `micromark-extension-gfm` + `mdast-util-gfm`
+ `micromark-extension-math` + `mdast-util-math`。

代价与边界：

- 产物体积随内联依赖增加，构建后直接看 `packages/dsh-workspace-split/client.js`
  的大小，本页不抄数字
- 公式走 KaTeX 渲染：`katex` 在构建时内联，页面已随 vendor 样式带上 KaTeX 样式表，
  所以不需要额外分发字体文件。v3 正文里的「暂不引入 KaTeX」已被实现推翻
- 原始 HTML 与原生策略一致，按字面文本显示，不进 DOM

## 十、盘点结论

| 能力 | 提供方 | 是否自研 |
|---|---|---|
| 二栏布局 | DSH 原生主栏加右栏 | 否，直接复用 |
| 会话体渲染，含消息、工具卡、审批、图片 | 无公开入口（第四节） | 是，自渲染 |
| 每格输入框 | 无公开入口（第五节） | 是，自渲染，发送走 `session.prompt` |
| 多会话并发存活 | 会话服务的持有方法 | 否，直接复用 |
| 会话进度可观测 | 会话服务的状态快照方法 | 否，订阅即可 |
| 会话清单，拖拽源 | `sessions.list` 快照，零远程调用 | 否，订阅即可 |
| 分屏入口按钮位 | `sidebar.footer.action` 槽位（`shell.leading` 是 single 槽位，被侧边栏插件占用，不可争用） | 否，注册即可 |
| 布局持久化 | 浏览器 localStorage（`layout.selectPanel` 是纯内存态，刷新不保留） | 是 |
| N 宫格布局编排 | 无 | 是 |
| 当前格标记 | 无 | 是 |
| 对话流折叠（把流式增量折成一行） | 无 | 是，`packages/dsh-workspace-split/src/transcript.js` |
| Markdown 渲染 | 构建时打包 mdast 与 KaTeX，自渲染 | 是 |

本项目造的是布局编排器；格子的会话视图与输入框由插件自己渲染，
DSH 提供会话数据、并发存活与进度信号。

## 十一、待实测项

以下结论停留在契约层面，需要在真机上实测后才能填入具体数值：

- 多个输入框常驻时的内存与渲染开销，它决定 Q1c 软限制的推导公式
- 单窗口跨屏铺满时（两个屏幕各自若干格），分屏视图的渲染与状态同步开销

## 十二、2026-10-26 复核：DSH 是否开放了逐格原生渲染

v4 的结论全部建立在下面这份可复核的证据上，取数日期 2026-10-26。

### 12.1 核对了什么

| 项目 | 值 |
|---|---|
| 仓库 | [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)（公开，MIT） |
| 分支与提交 | 默认分支 `master`，提交 `22ddee3792402c3e70ec5f86a63c3e3e895a2f60`；仓库 `pushed_at` 为 2026-10-23 |
| npm 版本 | `dist-tags`：`latest=0.2.1-rc.2`、`next=0.2.1-rc.3`；本机运行 0.2.1-rc.2 |
| 交叉验证 | `master` 的源码与 README、`0.2.1-rc.3` 发布包、本机 `0.2.1-rc.2` 安装包，三处结论一致 |

### 12.2 原文引文

1. [`packages/client/ui-conversation/README.md`](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/ui-conversation/README.md)（`master`）Known Limitations 两条：
   - 「Only registered targets can render — the shell deliberately has no implicit
     fallback target beyond the registered `chat` preference.」
   - 「Factory occurrences inherit their render-position Session —
     `conversation.content` does not accept an independently addressed Session;
     that requires a separate Session-provider capability.」
2. [`packages/client/ui-slots/README.md`](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/ui-slots/README.md)（`master`）：
   - 「An occurrence inherits its render-position scope; `renderFactorySlot()` does
     not accept a Session identity.」
   - 「Declaring a slot is claiming it: the registering entry becomes the only entry
     allowed to render that key」
3. [`packages/client/ui-renderer/README.md`](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/ui-renderer/README.md)（`master` 与 `0.2.1-rc.3` 措辞一致）：
   - 「The web shell and the boot kernel are its only direct consumers」
   - 「A business plugin registers an ordinary Slot entry or a reusable Component
     Factory; the renderer binds the runtime's session and workspace observable
     sources into selector hooks at the render position.」
4. [`packages/client/web/src/seed.ts`](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/web/src/seed.ts)（`master`）平台模块表，共十一项，不含
   `ui-conversation`、`ui-session`、`ui-renderer`。

### 12.3 类型层的旁证（本机 0.2.1-rc.2 安装包）

- `dsh-client-ui-conversation` 里 `conversation.content` 的输入属性只有
  `variant` / `phase` / `hero`，没有会话标识。
- `dsh-client-ui-session` 的 `SessionReferenceSourceMap` 只声明了 `mainView` 一项，
  即当前只有主视图提供会话引用。

### 12.4 结论

**DSH 尚未开放第三方插件逐格渲染原生会话体与输入框的能力。** 缺的是一条
「按会话标识给某个渲染位置供会话」的能力（DSH 原文称 Session-provider capability），
以及配套的每格输入路由。因此本插件自渲染对话记录（含 Markdown、工具卡、
轮次导航）与输入框，会话数据与进度信号仍走公开接口。

### 12.5 复核方法（下次照做）

1. 取 `master` 的 `ui-conversation`、`ui-slots`、`ui-renderer` 三份 README 的
   Known Limitations，以及 `packages/client/web/src/seed.ts` 的模块表；
2. 用 `npm view @deepseek-ai/dsh dist-tags` 取到最新版本，对照发布包里的同名 README；
3. 三处结论一致才递增本页版本号。

## 十三、2026-10-27 补能力：公开服务与契约测试（v5）

分屏格子的输入区已补齐主会话的常用能力，全部通过公开服务/Remote 命名空间，
没有复制官方 UI 源码。逐项接线见下表。

| 能力 | 读取 | 写入 | 证据 |
|---|---|---|---|
| 图片/文件附件 | `ctx.fileUpload.upload` | prompt `file` part `{type:'file',receiptId}` | `dsh-client-file-upload/lib/types/client/contract.d.ts` |
| 模型/推理等级 | `faceOf('modelSelection')`、`remote.session.modelCatalog()` | `remote.session.selectModel({sessionId,provider,model,reasoningEffort?})` | `dsh-api-session-controller/lib/types/types.d.ts` |
| 访问模式 | `faceOf('permissions')`、`remote.permissionPresets.catalog()` | `session.command('/permission <preset>')` | `dsh-permission-presets/lib/types/types.d.ts` |
| 斜杠命令 | — | `session.command('/name args')` | `session.d.ts` |
| `@` 文件/会话 | `remote.fileReferences.list`、`remote.sessionReferenceResolver.candidates` | 纯文本插入 | `dsh-file-reference/lib/types/grammar.js` |
| 上下文占用 | `faceOf('contextPressure')` | — | `dsh-token-meter/lib/types/projection.d.ts` |
| 审批/提问 | `ctx.uiSession.sessionStatus` | `pending.answer(...)` | `ui-approval` / `ui-user-questions` 的 contract |

### 13.1 两条硬限制

1. **每个会话只暴露一个 pending interaction**（approval / question / plan-review
   按 sessionId 归并），所以格子里只有一张交互卡，不是列表。
2. **审批没有 Remote 方法**；唯一入口是 pending 对象自己的 `answer()`。自行
   `remote.$on('approval/request')` 抢 waterfall 不可行（官方先注册且不 `next()`）。

### 13.2 契约测试

`test/dsh-contract.test.js` 读取本机 DSH 安装包的 `.d.ts` / `grammar.js`，断言本插件
实际用到的成员名与类型名仍存在；`DSH_CONTRACT_ROOT` 可改安装路径，未安装 DSH 时
整组跳过。这样官方改名或删除会变成一条带缺失符号的失败，而不是运行时静默坏掉。
升级 DSH 后先跑这条测试，再跑 `npm run check` 与浏览器验收。

### 13.3 仍未真机验证

- 后台会话的审批能否到达分屏（契约层成立；组件已用 DSH 页面的 `?dsws-test`
  fixture 做过浏览器回归，但模型网关不可用时无法构造真实审批请求）。
- 格子回答后官方 composer 面板的收起时序。
- 真实会话的 `contextPressure` 读数（组件与格式已由浏览器 fixture 覆盖）。

### 13.4 浏览器回归的测试缝

`dsh-composer.test.js` 启动临时 DSH web + 临时 Chrome，在页面读取
`localStorage['dsws-test'] === '1'`（或 URL 带 `dsws-test`）时暴露
`window.__dswsTest.render(name, node, props)`，用假 pending/catalog 渲染
ApprovalCard、QuestionCard、ProcessGroup、ComposerMeta、MentionPopup、
ModelControl、PermissionControl、DraftFileStrip。真实页面不带这个开关，
因此不会出现测试用假卡片。
