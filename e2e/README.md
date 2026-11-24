# E2E (dsh-plugin-e2e)

Live browser E2E for the split panel, reusing the local `dsh-plugin-e2e`
harness (isolated `dsh web` + mock model + Playwright + screenshots/trace).

## Why a separate suite

`npm run test:e2e` (test/e2e) renders plugin components against a `?dsws-test`
fixture and never mounts a real `CellView`. The DSH 0.2.3 regression only fired
when a tile held a real Session (CellView read the inject-gated
`uiSession.sessionStatus`), so `e2e/split-live.spec.mjs` drives the real app:
open the split, click "new chat" on an empty tile, then require the grid to keep
rendering with no page error.

## Prerequisites (one-time, this machine)

- `dsh-plugin-e2e` linked into `./node_modules/dsh-plugin-e2e` (its own deps resolve
  from the dsh-devtools checkout's `node_modules`).
- System Edge (the config uses `channel: 'msedge'`; no browser download).

## Run

```sh
# Against the `dsh` on PATH (0.2.2):
node node_modules/dsh-plugin-e2e/bin/dsh-plugin-e2e.mjs run

# Against the desktop runtime (0.2.3):
$env:DSH_CLI='D:\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd'
node node_modules/dsh-plugin-e2e/bin/dsh-plugin-e2e.mjs run
```

Artifacts (screenshot, trace, events) land in `.tmp/e2e/`.

## Proven to catch the regression

Point `plugin` at the old `./.release/dsh-workspace-split` (0.1.16) and run
against 0.2.3: the spec fails on "split stays rendered after creating a real
Session". With the fixed build it passes on both 0.2.2 and 0.2.3.
