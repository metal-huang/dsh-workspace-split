/**
 * Publish the built plugin into `.release/`, the copy the desktop profile links
 * to. Development happens in `packages/dsh-workspace-split`; the desktop only
 * picks up a change when this script runs, so a half-finished rebuild cannot
 * break the app the user actually works in.
 *
 * The swap is atomic: everything is copied into a staging directory first and
 * only renamed into place once it is complete, so a crash or a locked file
 * leaves the previous snapshot intact.
 *
 * Usage: npm run release
 */

import { cp, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

const PACKAGE = 'packages/dsh-workspace-split'
const RELEASE_ROOT = '.release'
const TARGET = join(RELEASE_ROOT, 'dsh-workspace-split')
const STAGING = join(RELEASE_ROOT, '.staging')
const PREVIOUS = join(RELEASE_ROOT, '.previous')

/** Runtime dependency kinds the desktop copy must not carry. */
const RUNTIME_DEP_FIELDS = ['dependencies', 'peerDependencies', 'optionalDependencies']

/**
 * Expand the manifest's `files` list into concrete source paths.
 *
 * The published shape is whatever the package says it publishes, so adding an
 * asset to `files` is enough to ship it; a hard-coded copy here would silently
 * stop matching.
 * @param files - the manifest's `files` entries, files or `dir/*` patterns.
 * @returns concrete relative paths, verified to exist.
 */
async function resolvePublishedFiles(files) {
  const picked = []
  for (const entry of files) {
    if (!entry.includes('*')) {
      picked.push(entry)
      continue
    }
    const [directory, pattern] = entry.split('/')
    const names = await readdir(join(PACKAGE, directory))
    const suffix = pattern?.replace(/^\*/, '') ?? ''
    for (const name of names) {
      if (suffix === '' || name.endsWith(suffix)) picked.push(`${directory}/${name}`)
    }
  }
  for (const relative of picked) {
    await stat(join(PACKAGE, relative)).catch(() => {
      throw new Error(`files lists a path that does not exist: ${relative}`)
    })
  }
  return picked
}

await run(process.execPath, ['gate/build_plugin.mjs'], { stdio: 'inherit' })

const manifest = JSON.parse(await readFile(join(PACKAGE, 'package.json'), 'utf8'))

for (const field of RUNTIME_DEP_FIELDS) {
  const deps = manifest[field]
  if (deps !== undefined && Object.keys(deps).length > 0) {
    throw new Error(
      `${field} must stay empty in the desktop copy: runtime deps have to be bundled for the browser half`,
    )
  }
}

const published = await resolvePublishedFiles(manifest.files ?? [])

// Stage first: nothing touches TARGET until every file is in place.
await rm(STAGING, { recursive: true, force: true })
await mkdir(STAGING, { recursive: true })
for (const relative of published) {
  const destination = join(STAGING, relative)
  await mkdir(dirname(destination), { recursive: true })
  await cp(join(PACKAGE, relative), destination, { recursive: true })
}

// The desktop profile reads the published shape, so drop dev-only fields.
const shipped = { ...manifest }
delete shipped.devDependencies
delete shipped.scripts
await writeFile(join(STAGING, 'package.json'), `${JSON.stringify(shipped, null, 2)}\n`, 'utf8')

// Swap: keep the previous snapshot until the new one is in place, so a failure
// here can still restore a working copy.
await rm(PREVIOUS, { recursive: true, force: true })
let hadPrevious = false
try {
  await rename(TARGET, PREVIOUS)
  hadPrevious = true
} catch {
  // First release: there is nothing to preserve.
}
try {
  await rename(STAGING, TARGET)
} catch (error) {
  if (hadPrevious) await rename(PREVIOUS, TARGET)
  throw error
}

const { size } = await stat(join(TARGET, 'client.js'))
console.log(
  `released ${manifest.name}@${manifest.version} -> ${TARGET} (client.js ${(size / 1024).toFixed(1)} KiB)`,
)
console.log(`${published.length} file(s); previous snapshot kept at ${PREVIOUS}`)
console.log(
  'restart the desktop app to load this build; the web profile follows the built artifact',
)
