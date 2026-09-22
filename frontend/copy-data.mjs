// Copy the committed artifacts into public/ so the SPA serves what the bake produced.
// It copies; it never regenerates. The bake is the only thing that writes artifacts, and it runs
// locally, so a build can never quietly change a published number.
import { cp, mkdir, stat } from 'node:fs/promises';

const from = '../data/artifacts';
const to = 'public/data';

try {
  await stat(from);
} catch {
  console.error(`no artifacts at ${from}. Run: python data-pipeline/bake.py --release`);
  process.exit(1);
}
await mkdir(to, { recursive: true });
await cp(from, to, { recursive: true });
console.log(`copied the committed artifacts into ${to}`);
