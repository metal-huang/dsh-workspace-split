/**
 * Bundle src/client.js into the artifact `dsh.client` loads.
 *
 * The harness hands a browser plugin one frozen module table (react, zod,
 * cordis, …) through the loader's `require`; everything else — mdast,
 * micromark — must be inlined at build time. So the bundle is CJS output
 * wrapped in the `window.__ModuleLoader__.load({ factory })` envelope, with the
 * platform modules left external so the factory's own `require` resolves them
 * against that table.
 */

import { build } from 'esbuild'
import { writeFile } from 'node:fs/promises'

const ID = '@local/dsh-workspace-split'
/** Optional argv[2] lets the gate rebuild to a scratch path and compare. */
const OUT = process.argv[2] ?? 'client.js'

/** Platform modules the loader's `require` resolves; keep them out of the bundle. */
const PLATFORM_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  'zod',
  '@tanstack/react-virtual',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
]

const result = await build({
  entryPoints: ['src/client.js'],
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  external: PLATFORM_EXTERNALS,
  legalComments: 'none',
  // The artifact is generated; src/client.js stays the readable source. Minify
  // keeps the payload sane now that KaTeX is inlined (772 KiB -> ~330 KiB).
  minify: true,
})

const body = result.outputFiles[0].text
const artifact = `// GENERATED FILE — edit src/client.js and run \`npm run build\` instead.
window.__ModuleLoader__.load({
  id: ${JSON.stringify(ID)},
  factory(require) {
    const module = { exports: {} };
    const exports = module.exports;
${body}
    return module.exports;
  },
});
`

await writeFile(OUT, artifact, 'utf8')
const { size } = await import('node:fs/promises').then((fs) => fs.stat(OUT))
console.log(`${OUT} written (${(Number(size) / 1024).toFixed(1)} KiB)`)
