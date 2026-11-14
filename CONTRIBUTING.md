# Contributing to dsh-workspace-split

Thanks for taking the time to contribute. This is a small, maintainer-led
project: bug fixes and documentation are welcome, while product decisions stay
with the maintainers.

[中文说明](CONTRIBUTING.zh-CN.md)

## Read this first

- **Bug fix** — a pull request is fine. Include a reproduction and, when the
  change is behavioural, a test. Link an issue if one exists.
- **Feature, behaviour change, new default, new dependency, or a new minimum
  DSH version** — open an issue first and wait for a maintainer to approve the
  direction. Do not start coding before that.
- **Docs, tests, chores** — a pull request is fine.
- **One pull request = one thing.** Unrelated edits slow review down and get
  reverted.

Pull requests that change product behaviour without an approved issue may be
closed without review. That is not a judgement on the work; it keeps the
product coherent.

## Before you start

1. Search existing issues and pull requests.
2. For anything that is not a small bug fix, open an issue using the templates.
3. Wait for a maintainer to confirm the direction.
4. Keep the change focused; describe the problem and why your change fixes it.

## Development setup

Requires Node.js (current LTS) and npm.

```bash
npm install
npm run build        # rebuild packages/dsh-workspace-split/client.js
npm run check        # lint + duplication + format + tests
npm run test:e2e     # browser E2E; needs a local Chrome/Chromium
```

Useful details:

- `packages/dsh-workspace-split/src/client.js` is the source. The build writes
  `packages/dsh-workspace-split/client.js` (the package root); that file is
  generated, not tracked, and must never be edited by hand.
- `npm run check` is the gate reviewers run. Fix errors; do not raise the
  baselines in `gate/` to make a warning disappear.
- Pure logic lives in small modules (`composer-images.js`, `transcript.js`,
  `zoom.js`, `session-state.js`, …) and has unit tests. Add tests there when
  you change behaviour. UI wiring that only runs against a live DSH page is
  guarded by `test/split-wiring.test.js`.
- The DSH contract test reads the local DSH installation:
  `node test/dsh-contract.test.js` (set `DSH_CONTRACT_ROOT` to point at another
  install). It skips when DSH is absent.
- Web development uses the web profile and links the package directory; the
  desktop profile links `.release/` and only changes after `npm run release`.
- Repository internals, gate baselines, and release steps are described in
  [AGENTS.md](AGENTS.md).

## Verification requirements

A pull request is a claim that the change works. Back the claim with evidence:

- **Build and run it.** `npm install`, `npm run build`, `npm run check`, and
  `npm run test:e2e` must pass locally. Then load the plugin in a real DSH web
  profile and exercise the behaviour you changed. Syntax checks or pre-commit
  hooks alone are not verification; "no local build was performed" is not an
  acceptable validation note.
- **Verify platform APIs before coding against them.** This plugin runs inside
  DSH and may only use what the target DSH version actually ships. Confirm that
  every method and option you call exists there: read the platform source or
  type definitions (the DSH installation's `node_modules/@deepseek-ai/*`, or the
  public deepseek-harness repository at the matching tag), or run the DSH
  contract test. Do not write code against an API you assume exists, remember
  from another version, or expect to land upstream later. If the feature needs
  a platform capability that is missing, open an issue first — a PR that
  depends on a hypothetical upstream change will be closed.
- **Show the behaviour, not just the diff.** For UI changes attach a
  before/after screenshot or recording; for bug fixes reproduce the bug first
  and show that your change blocks it. Paste the relevant command output in the
  PR description.
- **AI-assisted contributions are welcome, but you own the verification.** If a
  tool wrote the code, you must still build it, run it, and check every platform
  API it calls. Unverified generated code wastes reviewer time and will be
  closed.

## Pull requests

- Base on `main`.
- Use a Conventional Commit title: `type(scope): summary`
  (`feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`, `build`,
  `style`, `revert`); keep the subject under 72 characters.
- Fill in the pull request template. Link the issue with `Fixes #123` when one
  exists.
- Meet the [verification requirements](#verification-requirements) and paste
  the output of `npm run check`. For UI changes, include a before/after
  screenshot or recording and say how you tested it.
- Do not commit generated files (`packages/*/client.js`, `.release/`) or
  unrelated formatting changes.
- Write the description in your own words and keep it short. Long
  AI-generated descriptions are hard to review and may be ignored.

## Commit style

One commit expresses one thing. The body explains **why**, not what. Stage only
your own files (`git add <path>`); never `git add -A` or `git add .`.

## Reviews

- Maintainer time is limited; there is no review SLA.
- A review may ask for tests, documentation, or a narrower scope.
- Product decisions (defaults, layouts, interaction models) are made by the
  maintainers, not by the size of a pull request.

## Security

Do not paste tokens, private paths, or customer data into issues or pull
requests. Redact logs before attaching them.
