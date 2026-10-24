# dsh-workspace-split

[![npm](https://img.shields.io/npm/v/@metal-huang/dsh-workspace-split)](https://www.npmjs.com/package/@metal-huang/dsh-workspace-split)
[![license](https://img.shields.io/npm/l/@metal-huang/dsh-workspace-split)](LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DSH-%E2%89%A50.2.1--rc.2-blue)](https://github.com/deepseek-ai/deepseek-harness)

[English](README.md) · 中文说明

把多个**正在运行**的 DeepSeek Harness 会话并排放在同一个窗口里，每个格子都能
直接输入。为「同时盯多个项目」而做：一屏看完所有会话的进展，不用来回切标签。

<!-- 截图放在 docs/assets/split-view.png，拍好后取消注释。 -->

## 它能做什么

- **活的会话网格**。行列自己选，最多 5 行 × 6 列，每个格子是一个运行中的会话，
  带完整对话记录。
- **每个格子都能打字**。每格有独立输入框；分屏布局不会自己变。
- **一格放会话，或放项目**。可以钉住某个会话，也可以钉住一个项目，在格子里
  切换这个项目的不同会话。
- **实时状态**。标题上的圆点表示该会话是否正在跑。
- **密度跟着格子走**。格子变窄时文字自动缩小，小格子里也能看到有用的信息量；
  在某格上 `Ctrl` + 滚轮只调这一格。
- **Markdown 与公式**。表格、代码块、任务清单，TeX 用 KaTeX 渲染。
- **工具调用可展开**。参数和输出就地展开，失败有标记。
- **轮次导航轨**。右侧刻度点击跳转，没加载过的轮次会先拉历史。
- **布局持久化**。网格、格内会话、每格缩放都会恢复。

## 它不重新实现会话界面

会话渲染、多会话并发存活、进度信号都是 DSH 自带的能力。本插件只加两层：布局编排
和当前格标记。会话数据走公开的 `ctx.sessions` 接口。

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

`packages/dsh-workspace-split/src/client.js` 是源码；同目录的 `client.js` 是
构建产物，**不要手改**，也不入库——在该包里 `npm install` 会走 `prepare`
构建一次，之后改源码用 `npm run build` 重建。

仓库规则见 [AGENTS.md](AGENTS.md)，产品与设计文档见 [docs/](docs)。

## 许可证

[MIT](LICENSE)
