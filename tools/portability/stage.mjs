// Copy the BROWSER builds out of node_modules into ./site, so the probe serves what a browser
// would actually download. Run before `npm run probe`.
import { cp, mkdir, copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, 'site');
const nm = join(here, 'node_modules');

await mkdir(site, { recursive: true });
await copyFile(join(here, 'probe.html'), join(site, 'probe.html'));

for (const f of ['minizinc.mjs', 'minizinc.js', 'minizinc-worker.js', 'minizinc.wasm', 'minizinc.data'])
  await copyFile(join(nm, 'minizinc', 'dist', f), join(site, f));

await cp(join(nm, 'highs'), join(site, 'highs'), { recursive: true });
await cp(join(nm, 'glpk.js'), join(site, 'glpkjs'), { recursive: true });

console.log('staged the browser builds into ./site');
