/**
 * Emit a real document for every route, so a deep link answers 200.
 *
 * `404.html` is the usual static-host trick, and it is not enough: the host serves the SPA body
 * with an HTTP **404 status**. The page mounts, a human sees the right thing, and every machine
 * that asks, a crawler, a link checker, a monitor, is told the page does not exist. A check that
 * only looks at the rendered body calls that working.
 *
 * The routes are known and few, so the honest fix is to write `<route>/index.html` for each one.
 * The host then serves a genuine 200 and the SPA takes over from there. `404.html` stays as the
 * fallback for anything genuinely unknown, which is what it is actually for.
 */

import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, "dist");

// Kept in step with the router in src/main.tsx. A route added there and not here deep-links to a
// 404, so the browser gate asserts the status of every one of these.
const ROUTES = ["introduction", "methodology", "implementation", "experiments", "benchmark"];

const index = await readFile(join(DIST, "index.html"), "utf-8");

for (const route of ROUTES) {
  await mkdir(join(DIST, route), { recursive: true });
  await writeFile(join(DIST, route, "index.html"), index, "utf-8");
}

// The fallback, for paths that genuinely do not exist.
await copyFile(join(DIST, "index.html"), join(DIST, "404.html"));

console.log(`prerendered ${ROUTES.length} route document(s) plus the 404 fallback`);
