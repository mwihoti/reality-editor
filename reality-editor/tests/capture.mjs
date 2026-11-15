// Captures the scripted playthrough as PNG frames, then ffmpeg turns them into
// a WebM clip.
//
//   node capture.mjs <url> <seconds> <outDir>

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [url, seconds = '14', outDir = 'frames', finalExpr] = process.argv.slice(2);
const port = 9700 + Math.floor(Math.random() * 200);
const profile = mkdtempSync(join(tmpdir(), 'cap-'));

mkdirSync(outDir, { recursive: true });

const chrome = spawn('chromium', [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--hide-scrollbars',
  '--window-size=1280,720',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  url
], { stdio: 'ignore' });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function findTarget() {
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await res.json();
      const page = list.find(t => t.type === 'page' && t.url.startsWith('http'));
      if (page && page.webSocketDebuggerUrl) return page;
    } catch { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('no debuggable page target');
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  const pending = new Map();
  let nextId = 0;
  const ready = new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });
  const send = (method, params = {}) => new Promise((resolve) => {
    const id = ++nextId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
  return { ready, send, close: () => ws.close() };
}

async function main() {
  const target = await findTarget();
  const cdp = connect(target.webSocketDebuggerUrl);
  await cdp.ready;

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1280, height: 720, deviceScaleFactor: 1, mobile: false
  });

  const total = Number(seconds) * 10;          // ~10 fps
  let saved = 0;

  for (let i = 0; i < total; i++) {
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    if (shot.result && shot.result.data) {
      writeFileSync(join(outDir, `frame-${String(saved).padStart(3, '0')}.png`),
        Buffer.from(shot.result.data, 'base64'));
      saved++;
    }
    await sleep(60);
  }

  console.log(`captured ${saved} frames into ${outDir}`);

  if (finalExpr) {
    const res = await cdp.send('Runtime.evaluate', {
      expression: finalExpr, returnByValue: true, awaitPromise: true
    });
    const value = res.result && res.result.result ? res.result.result.value : res;
    console.log(typeof value === 'string' ? value : JSON.stringify(value));
  }

  cdp.close();
  chrome.kill('SIGTERM');
  await sleep(300);
  process.exit(0);
}

main().catch((err) => {
  console.error('CAPTURE FAILURE:', err.message);
  chrome.kill('SIGTERM');
  process.exit(1);
});
