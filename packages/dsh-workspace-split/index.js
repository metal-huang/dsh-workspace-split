/**
 * Host half of the workspace-split plugin.
 *
 * Layout persistence lives in the browser: the Client half owns the grid and
 * stores it in localStorage. No Host-side state exists, and the old
 * `workspace-split/rpc` event never had a caller. Kept as a no-op Cordis plugin
 * so the package still exposes a Host entry to the loader.
 */

export function apply() {}
