/**
 * Publish the built plugin into `.release/`, the copy the desktop profile links
 * to. Development happens in `packages/dsh-workspace-split`; the desktop only
 * picks up a change when this script runs, so a half-finished rebuild cannot
 * break the app the user actually works in.
 *
 * Usage: npm run release
 */

import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

const SOURCE = 'packages/dsh-workspace-split'
const TARGET = '.release/dsh-workspace-split'

/** Only what the package publishes: the host half, the built client, and assets. */
const FILES = ['package.json', 'index.js', 'client.js', 'cordis.patch.yml', 'icon.svg']
const DIRECTORIES = ['locale']

await run(process.execPath, ['gate/build_plugin.mjs'], { stdio: 'inherit' })

const manifest = JSON.parse(await readFile(join(SOURCE, 'package.json'), 'utf8'))
if (manifest.dependencies !== undefined && Object.keys(manifest.dependencies).length > 0) {
  throw new Error('the desktop copy must stay dependency-free: move runtime deps into the bundle')
}

await rm(TARGET, { recursive: true, force: true })
await mkdir(TARGET, { recursive: true })

for (const file of FILES) {
  await cp(join(SOURCE, file), join(TARGET, file))
}
for (const directory of DIRECTORIES) {
  await cp(join(SOURCE, directory), join(TARGET, directory), { recursive: true })
}

// The desktop profile reads the published shape, so drop dev-only fields.
const shipped = { ...manifest }
delete shipped.devDependencies
delete shipped.scripts
await writeFile(join(TARGET, 'package.json'), `${JSON.stringify(shipped, null, 2)}\n`, 'utf8')

const { size } = await stat(join(TARGET, 'client.js'))
console.log(
  `released ${manifest.name}@${manifest.version} -> ${TARGET} (client.js ${(size / 1024).toFixed(1)} KiB)`,
)
console.log(
  'restart the desktop app to load this build; the web profile keeps tracking the working tree',
)
