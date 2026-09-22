import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Served from this folder: the browser builds are copied out of node_modules by stage.mjs.
const SITE = join(dirname(fileURLToPath(import.meta.url)), 'site');

const TYPES = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript',
  '.wasm':'application/wasm', '.data':'application/octet-stream', '.json':'application/json' };

const server = createServer(async (req, res) => {
  const path = join(SITE, decodeURIComponent(req.url.split('?')[0]) === '/' ? 'probe.html' : req.url.split('?')[0]);
  try {
    const body = await readFile(path);
    // Cross-origin isolation, which WASM threads need and which a static host sets via a service worker.
    res.writeHead(200, { 'Content-Type': TYPES[extname(path)] || 'application/octet-stream',
      'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise(r => server.listen(8791, r));

const browser = await chromium.launch();
const page = await browser.newPage();
const transferred = [];
page.on('response', async (r) => {
  const u = r.url();
  if (/\.(wasm|data|js|mjs)$/.test(u)) {
    try { transferred.push({ url: u.split('/').pop(), bytes: (await r.body()).length }); } catch {}
  }
});
page.on('console', (m) => { if (m.type() === 'error') console.log('  console error:', m.text().slice(0,160)); });
await page.goto('http://localhost:8791/', { waitUntil: 'load' });
await page.waitForFunction(() => document.getElementById('out').textContent.includes('DONE'), { timeout: 180000 })
  .catch(() => console.log('  probe did not finish in time'));
console.log(await page.textContent('#out'));
const results = await page.evaluate(() => window.__RESULTS__ || []);
const mzn = await page.evaluate(() => window.__MZN_SOLUTION__ || null);
console.log('MINIZINC SOLUTION SHAPE:', JSON.stringify(mzn).slice(0, 900));

console.log('\nTRANSFERRED:');
for (const t of transferred.sort((a,b)=>b.bytes-a.bytes).slice(0,8))
  console.log(`  ${(t.bytes/1048576).toFixed(2).padStart(7)} MB  ${t.url}`);
console.log('\nJSON:', JSON.stringify(results));
await browser.close(); server.close();