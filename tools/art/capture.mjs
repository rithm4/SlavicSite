// Deschide tools/art/index.html în Chrome (fără fereastră), așteaptă randarea și salvează:
//   src/assets/art/*.webp               ilustrațiile avantajelor
//   src/assets/products/*.webp          fotografiile produselor (după id-ul din catalog)
//   src/assets/wood/*.webp              textura de lemn pentru lădița din primul ecran
//   src/components/site/art/points.ts   punctele pentru cotele desenate peste scândură
// Rulare (cu serverul Vite pornit):
//   node tools/art/capture.mjs [--samples=36] [--wood=white_maple_veneer] [--tint=#f9dfbd]
//                              [--only=scândura,ștampila,paletul,produsele] [--out=cale]  (--out: doar previzualizare)
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const flags = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const base = flags.url || 'http://localhost:5173';
const query = new URLSearchParams({ samples: flags.samples || '36' });
for (const key of ['wood', 'tint', 'only']) if (flags[key]) query.set(key, flags[key]);
const preview = flags.out;
const ART = ['board', 'ispm', 'ispm-stamped', 'pallet', 'pallet-strapped'];

const chrome = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9300 + Math.floor(Math.random() * 600);
const profile = mkdtempSync(join(tmpdir(), 'art-'));
const proc = spawn(chrome, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-first-run', 'about:blank',
], { stdio: 'ignore' });

function save(file, dataUrl) {
  mkdirSync(dirname(file), { recursive: true });
  const data = Buffer.from(dataUrl.split(',')[1], 'base64');
  writeFileSync(file, data);
  console.log(`${file.slice(root.length + 1)}  ${Math.round(data.length / 1024)} KB`);
}

async function main() {
  let targets;
  for (let i = 0; i < 60 && !targets; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch { await sleep(200); }
  }
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let seq = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) rej(new Error(m.error.message));
      else res(m.result);
    } else if (m.method === 'Runtime.exceptionThrown') console.error(m.params.exceptionDetails.exception?.description);
  };
  const send = (method, params = {}) => new Promise((res, rej) => {
    const id = ++seq;
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) =>
    (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value;

  await send('Runtime.enable');
  await send('Page.navigate', { url: `${base}/tools/art/index.html?${query}` });
  const started = Date.now();
  let art;
  while (!art) {
    await sleep(2000);
    const error = await evaluate('window.__artError');
    if (error) throw new Error(error);
    art = await evaluate('window.__art');
    process.stdout.write(`\r${await evaluate("document.getElementById('status')?.textContent")} (${Math.round((Date.now() - started) / 1000)} s)   `);
  }
  console.log();

  for (const [name, url] of Object.entries(art.images)) {
    const folder = preview || join(root, 'src', 'assets', ART.includes(name) ? 'art' : 'products');
    save(join(folder, `${name}.webp`), url);
  }
  if (preview) return;
  save(join(root, 'src', 'assets', 'wood', 'wood-color.webp'), art.wood.color);
  save(join(root, 'src', 'assets', 'wood', 'wood-normal.webp'), art.wood.normal);
  if (art.points) {
    writeFileSync(join(root, 'src', 'components', 'site', 'art', 'points.ts'), [
      '// Generat de tools/art/capture.mjs, nu edita manual.',
      '// Colțurile scândurii din board.webp, în coordonatele viewBox-ului 240 × 140.',
      'export const boardPoints = {',
      ...Object.entries(art.points.board).map(([k, [x, y]]) => `  ${k}: [${x}, ${y}],`),
      '} as const',
      '',
    ].join('\n'));
    console.log('src/components/site/art/points.ts');
  }
  ws.close();
}

main()
  .catch((e) => { console.error(e.message); process.exitCode = 1; })
  .finally(() => {
    proc.kill();
    setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} }, 500);
  });
