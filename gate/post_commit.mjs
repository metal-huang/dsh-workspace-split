/**
 * post-commit reminder: the fast gate already ran in pre-commit, so this only
 * records that the full gate is still owed for the commit just created.
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { git, ROOT } from './lib.mjs'

const head = git(['rev-parse', '--short', 'HEAD'])
const markerDir = join(ROOT, '.gate')
mkdirSync(markerDir, { recursive: true })
writeFileSync(
  join(markerDir, 'l2-required.json'),
  JSON.stringify({ commit: head, at: new Date().toISOString() }, null, 2),
)

console.log(`\n[gate] committed ${head} — run \`npm run check\` before pushing`)
