# dsh-workspace-split

[![npm](https://img.shields.io/npm/v/@metal-huang/dsh-workspace-split)](https://www.npmjs.com/package/@metal-huang/dsh-workspace-split)
[![license](https://img.shields.io/npm/l/@metal-huang/dsh-workspace-split)](LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DSH-%E2%89%A50.2.1--rc.2-blue)](https://github.com/deepseek-ai/deepseek-harness)

English · [中文说明](README.zh-CN.md)

Keep several **live** sessions of DeepSeek Harness side by side and type in any
of them. Built for supervising several projects at once: you see every session's
progress on one screen instead of clicking through tabs.

<!-- A screenshot lives at docs/assets/split-view.png once captured. -->

## What it does

- **A grid of live sessions.** Rows and columns are yours to choose, up to 5 × 6.
  Each tile holds a running session with its full transcript.
- **Every tile is typable, images included.** Each cell has its own composer;
  paste, drop, or pick a PNG / JPEG / WebP / GIF and it goes out with the text.
  The split layout never changes on its own.
- **Session or project per tile.** Pin one session, or pin a project and switch
  between that project's sessions inside the tile.
- **Real-time status.** A dot on each title shows whether the session is working.
- **Density that follows the tile.** Narrow tiles shrink their text
  automatically so a small cell still shows a useful amount; `Ctrl` + wheel over
  one tile changes that tile alone.
- **Markdown and math.** Tables, code, task lists, and TeX rendered with KaTeX.
- **The process, not just the answer.** Reasoning and tool calls fold into one
  per-turn process group, a tool call marks itself running until its result
  arrives, and a status line names what the session is doing. A failed turn
  shows the provider error instead of ending in silence; with an empty draft the
  send seat becomes Stop.
- **Queue, steer, remove.** Prompts queued behind a running turn are listed above
  the composer with Steer and Remove, matching Chat's QueueDock.
- **Tool calls you can open.** Arguments and output inline, failures marked.
- **Turn rail.** Ticks down the right edge jump between turns, including turns
  not loaded yet.
- **Layout survives restarts.** Grid, assignments, and per-cell zoom are restored.

## How sessions are wired

Sessions come from the public `ctx.sessions` API (`list`, `retain`, the event
source), and input goes out through `session.prompt`. Each tile's transcript,
Markdown, tool cards, and composer are rendered by this plugin itself, with
styles built on DSH's theme variables and visual rules so they match the app.

## Requirements

- DeepSeek Harness **0.2.1-rc.2** or newer (desktop or web).
- Desktop app or `dsh web`; the same build works in both.

## Install

```bash
dsh plugin add @metal-huang/dsh-workspace-split
```

Then restart the app (or reload the web page). The toggle appears at the bottom
of the sidebar, next to your account.

<details>
<summary>Installing from a local checkout</summary>

```bash
git clone https://github.com/metal-huang/dsh-workspace-split.git
cd dsh-workspace-split
npm install
cd packages/dsh-workspace-split && npm install && npm run build
dsh plugin add "$PWD/packages/dsh-workspace-split"
```

</details>

## Use

| Action | Where |
|---|---|
| Enter or leave split view | Left-click the ⊞ at the sidebar's bottom |
| Choose the grid | Right-click that same ⊞ |
| Assign a session | Use a tile's header picker, or drag a session row from the sidebar into the tile |
| Rename a session | The ✎ next to the tile's title |
| Resize text in one tile | `Ctrl` + wheel over that tile |
| Raise the cell limit | Settings → General → Split grid |

The cap defaults to 10 cells for the whole screen (12 hard limit per window,
both configurable). Six cells fit comfortably; past six, opening more asks for
confirmation.

## Development

```bash
npm install          # repo tooling
npm run check        # lint + duplication + format + tests
npm run build        # rebuild the client bundle
npm run release      # publish a snapshot for the desktop profile
```

`packages/dsh-workspace-split/src/client.js` is the source. `client.js` next to
it is generated and not tracked by git — `npm install` in that package builds it
through `prepare`, and `npm run build` rebuilds it. Never edit it by hand.

See [AGENTS.md](AGENTS.md) for the repository rules and [docs/](docs) for the
product and design notes.

## License

[MIT](LICENSE)
