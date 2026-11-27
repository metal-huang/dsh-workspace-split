export default {
  plugin: './packages/dsh-workspace-split',
  spec: './e2e/split-live.spec.mjs',
  out: '.tmp/e2e',
  channel: 'msedge',
  // Explicit: never open a visible browser for E2E (visible Edge burns CPU and
  // can steal focus while several instances run).
  headless: true,
}
