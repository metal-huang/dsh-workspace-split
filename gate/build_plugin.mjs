/**
 * Build the browser half from src/client.js.
 *
 * Kept as a gate script so the repo has one entry point for "produce the
 * artifact": `npm run build`. The plugin package keeps its own build.mjs for
 * local use, and this wrapper just points at it from the repo root.
 */

import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { heading, ROOT } from './lib.mjs'

const PLUGIN_DIR = join(ROOT, 'packages', 'dsh-workspace-split')

heading('build')
const output = execFileSync(process.execPath, ['build.mjs'], { cwd: PLUGIN_DIR, encoding: 'utf8' })
console.log(`  ${output.trim()}`)
