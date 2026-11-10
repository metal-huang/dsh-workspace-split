# Changelog

## 0.1.14 — 2026-11-10

### Added

- **Resizable split grids.** Drag column and row gutters, double-click to restore equal sizes, and keep the ratios across reloads. Gutters also support keyboard resizing with arrow keys and Home. (#10, #28)
- **Slash skills in split composers.** User-invocable skills such as `/todo 123` now use the same native skill-loading path as the main composer, including attachments. (#1, #19)
- **Visible model retries.** Retry scheduling and restart notices show the attempt, retry budget, backoff, and failure code. Running state now prefers the ready Host catalog. (#6, #24)

### Changed

- **Escape stops the active tile only.** Use two independent Escape presses, matching the native gesture; menus, approvals, editors, terminals, and other tiles keep their own behavior. (#5, #22)
- **Harness language selection.** Prefer a supported Host language, then a supported browser language, then English. An unsupported Host no longer hides a usable browser translation. (#7, #25, #26)
- **Automatic text density stays available during resizing.** Header and transcript scale freeze during a drag and recompute once on release, without per-frame jitter. (#28)

### Fixed

- Prevent slow sends and session switches from clearing a newly rebound tile's draft or sending to the old Session. (#19, #21)
- Settle live stream and tool-running indicators when a turn closes, and keep tools from an earlier turn out of the current status line. (#6, #24)
- Detach drag listeners and restore the previous text-selection behavior on cancellation, blur, capture loss, and unmount. (#28)
