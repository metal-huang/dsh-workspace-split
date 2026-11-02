# dsh-workspace-split

[![npm](https://img.shields.io/npm/v/@metal-huang/dsh-workspace-split)](https://www.npmjs.com/package/@metal-huang/dsh-workspace-split)
[![license](https://img.shields.io/npm/l/@metal-huang/dsh-workspace-split)](LICENSE)
[![DeepSeek Harness](https://img.shields.io/badge/DSH-%E2%89%A50.2.1--rc.5-blue)](https://github.com/deepseek-ai/deepseek-harness)

English · [中文说明](README.zh-CN.md)

Keep several **live** sessions of DeepSeek Harness side by side and type in any
of them. Built for supervising several projects at once: you see every session's
progress on one screen instead of clicking through tabs.

Host persistence uses the native defineDomain/domainTable API and requires Harness 0.2.1-rc.5. One plugin-owned domain handle serves all load/save requests and closes after outstanding requests settle. Browser layout persistence is unchanged.

<!-- A screenshot lives at docs/assets/split-view.png once captured. -->

## What it does

- **A grid of live sessions.** Rows and columns are yours to choose, up to 5 × 6.
  Each tile holds a running session with its full transcript.
- **Every tile is typable, attachments included.** Each cell has its own
  composer; paste, drop, or pick a PNG / JPEG / WebP / GIF, or attach any other
  file through the `+` menu. Uploads are staged through `ctx.fileUpload` and sent
  as file parts with the text. The split layout never changes on its own.
- **Model, reasoning effort, and access mode per tile.** The seat under the
  composer reads the same Session projections and Remote catalogs as Chat, and
  writes through `session.selectModel` / `/permission <preset>`; switching to
  full access asks for the same risk confirmation.
- **Slash commands and `@` references.** A `/command` line runs through
  `session.command` without spending a turn, and `@` lists files and sessions
  through the public reference providers before inserting the same plain-text
  token Chat uses.
- **Approvals and questions answer in the tile.** An approval or
  `ask_user_question` waiting on that Session replaces the composer with a
  compact card; answering calls the same pending object Chat's panel uses.
- **Context occupancy.** The footer shows the same `projected / window` token
  reading as Chat, and hides itself when the projection is absent.
- **Session or project per tile.** Pin one session, or pin a project and switch
  between that project's sessions inside the tile; a free tile's picker puts the
  project badge on every row (the same badge as the header) and filters by title
  or project, with arrow keys and Enter.
- **Archiving frees the tile.** Archive a session in the sidebar and any tile
  holding it lets go as soon as the Host confirms the archive (one update later;
  the grid keeps no optimistic copy): a session tile empties, a project tile only
  drops the session and keeps its scope. Archived sessions leave the tile pickers
  and drop resolution, and come back when you unarchive them.
- **Real-time status.** A dot on each title shows whether the session is working,
  and a colored project badge before the title keeps the Session's project
  visible after the tile has been open for a while.
- **A click counts as read.** The "completed" dot the sidebar lights when a
  session finishes goes out when you click that tile in split view — no trip
  back to Chat.
- **Density that follows the tile.** Narrow tiles shrink their text
  automatically so a small cell still shows a useful amount; `Ctrl` + wheel over
  one tile changes that tile alone. The header follows the tile-width density,
  but not the manual override, so titles stay aligned and do not look oversized
  beside the transcript.
- **Markdown and math.** Tables, code, task lists, and TeX rendered with KaTeX.
- **Open an image full-window.** Click a picture in the transcript and it fills
  the window; click anywhere or press Escape to close. The preview renders
  outside the tile, so per-tile zoom and clipping cannot shrink or cut it.
- **The process, not just the answer.** Reasoning and tool calls fold into one
  per-turn process group with its elapsed time, a tool call marks itself running
  until its result arrives, and a status line names what the session is doing. A
  failed turn shows the provider error instead of ending in silence; with an
  empty draft the send seat becomes Stop.
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

Everything DSH-specific is consumed through public services and Remote
namespaces — `ctx.fileUpload`, `ctx.uiSession`, `ctx.remote.session`,
`ctx.remote.permissionPresets`, `ctx.remote.fileReferences`, and
`ctx.remote.sessionReferenceResolver` — with one deliberate exception: clearing
the completion dot. DSH clears `completionUnread` only for the main view and
exposes no write path, so the tile reads the `uiSession` instance's own
acknowledgement set (`completionUnread` plus `publishStatus()`). The reasoning and
the fallback are in [TECH 13.5](docs/tech/TECH_DSH现有能力盘点.md), and the plugin
moves to the public method as soon as DSH ships one.

`test/dsh-contract.test.js` asserts those methods and type names — the two private
members included — against the installed DSH build, so an upstream rename fails a
gate with the exact missing symbol instead of silently breaking a tile; when the
private members are gone the dot simply stays lit. Set `DSH_CONTRACT_ROOT` to
check another installation; the test skips when no DSH install is present.

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
