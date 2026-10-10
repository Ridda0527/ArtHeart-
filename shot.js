#!/usr/bin/env node
// Visual review for artfromtheheartinitiative.org
// Captures each page as sequential viewport-sized tiles while scrolling.
// Tiled (not captureBeyondViewport) because this site uses backdrop-filter,
// which renders blank under full-page capture — that is a capture bug, not a site bug.
//
// Usage: node shot.js [--mobile] [--w 1280] page [page ...]
//        SHOT_DIR=/tmp/ah_shots  SHOT_BASE=http://localhost:8777
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT  = process.env.SHOT_DIR  || '/tmp/ah_shots';
const BASE = process.env.SHOT_BASE || 'http://localhost:8777';

const args = process.argv.slice(2);
let width = 1280, mobile = false, pages = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--w') width = parseInt(args[++i], 10);
  else if (args[i] === '--mobile') { mobile = true; if (width === 1280) width = 390; }
  else pages.push(args[i]);
}
if (!pages.length) pages = ['index'];
const height = mobile ? 844 : 800;

fs.mkdirSync(OUT, { recursive: true });
const port = 9222 + Math.floor(Math.random() * 500);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ahprof-'));
const chrome = spawn(CHROME, ['--headless','--disable-gpu','--hide-scrollbars','--no-first-run',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let wsUrl;
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/json/list`);
      const t = (await r.json()).find(x => x.type === 'page');
      if (t) { wsUrl = t.webSocketDebuggerUrl; break; } } catch {}
    await sleep(200);
  }
  if (!wsUrl) throw new Error('Chrome devtools did not come up');

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pend = new Map();
  const jsErrors = [];
  ws.onmessage = e => { const m = JSON.parse(e.data);
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      jsErrors.push((d.exception && d.exception.description || d.text).split('\n')[0]);
    }
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
  const send = (m, p = {}) => new Promise(res => { const i = ++id; pend.set(i, res);
    ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  const evalJs = async expr => (await send('Runtime.evaluate',
    { expression: expr, returnByValue: true })).result.value;

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });

  let errors = 0;
  for (const p of pages) {
    jsErrors.length = 0;
    await send('Page.navigate', { url: `${BASE}/${p}.html` });
    await sleep(2200);

    const tag = mobile ? `${p}-mobile` : p;
    for (const f of fs.readdirSync(OUT)) {
      if (f.startsWith(`${tag}-tile`)) fs.unlinkSync(path.join(OUT, f));
    }

    const docH = await evalJs('document.body.scrollHeight');
    const tiles = Math.ceil(docH / height);
    for (let t = 0; t < tiles; t++) {
      await evalJs(`window.scrollTo(0, ${t * height})`);
      await sleep(700);  // let scroll-triggered animations settle
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const file = path.join(OUT, `${tag}-tile${String(t).padStart(2,'0')}.png`);
      fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
    }

    const broken = await evalJs(
      `[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.getAttribute('src')).join(', ')`);
    const overflow = await evalJs(
      `document.documentElement.scrollWidth > window.innerWidth + 2`);

    let line = `  ${tag}: ${tiles} tiles (${docH}px tall)`;
    if (broken)  { line += `  BROKEN IMAGES: ${broken}`; errors++; }
    if (overflow){ line += `  HORIZONTAL OVERFLOW`; errors++; }
    if (jsErrors.length) { line += `  JS ERRORS: ${jsErrors.join(' | ')}`; errors++; }
    console.log(line);
  }

  console.log(errors ? `\n${errors} issue(s) found` : `\nno broken images, no overflow, no JS errors`);
  ws.close(); chrome.kill();
  try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 3 }); } catch {}
  process.exit(errors ? 1 : 0);
})().catch(e => { console.error('ERROR:', e.message); chrome.kill(); process.exit(1); });
