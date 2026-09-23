/**
 * Bundle the method tests with esbuild and run them with node's own test runner.
 *
 * No test framework is added for this: esbuild is already here through Vite, and `node:test` ships
 * with node. The WebAssembly solver is marked external because none of these tests solve anything;
 * they check structural properties, which is exactly why they can run anywhere in a second.
 */

import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const out = mkdtempSync(join(tmpdir(), "enunciado-tests-"));

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
    // `import.meta.url` pointing at the source directory rather than the temp output.
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
