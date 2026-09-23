/**
 * Bundle the method tests with esbuild and run them with node's own test runner.
 *
 * No test framework is added for this: esbuild is already here through Vite, and `node:test` ships
 * with node. HiGHS stays external, so the tests that solve load the very npm build the site ships,
 * under node, instead of a bundled copy.
 *
 * The bundle is written under `node_modules/.cache/`, not the system temp directory: from there
 * node resolves `highs` out of this package's own node_modules, it is already ignored, and nothing
 * lands on the system drive.
 */

import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "..", "node_modules", ".cache", "method-tests");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const entries = readdirSync(here)
  .filter((name) => name.endsWith(".test.ts"))
  .map((name) => join(here, name));

try {
  await build({
    entryPoints: entries,
    outdir: out,
    bundle: true,
    platform: "node",
    format: "esm",
    outExtension: { ".js": ".mjs" },
    external: ["highs"],
    logLevel: "warning",
    // The tests read the committed artifacts relative to their own location, so the bundle keeps
    // `import.meta.url` pointing at the source directory rather than the output.
    define: { "import.meta.url": JSON.stringify(new URL(`file:///${here.replace(/\\/g, "/")}/x.ts`).href) },
  });

  const files = readdirSync(out)
    .filter((name) => name.endsWith(".mjs"))
    .map((name) => join(out, name));

  const result = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(out, { recursive: true, force: true });
}
