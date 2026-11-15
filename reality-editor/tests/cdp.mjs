// Minimal CDP driver: load a page in real-time headless Chromium, wait, then
// evaluate an expression (and optionally grab a screenshot).
//
//   node cdp.mjs <url> <waitMs> <expression> [screenshotPath]

import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [url, waitMs = '6000', expr = 'document.title', shotPath, outFile] = process.argv.slice(2);
const port = 9300 + Math.floor(Math.random() * 400);
const profile = mkdtempSync(join(tmpdir(), 'cdp-'));

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
    } catch { /* browser still starting */ }
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

  await sleep(Number(waitMs));

  const res = await cdp.send('Runtime.evaluate', {
    expression: expr,
    returnByValue: true,
    awaitPromise: true
  });
  if (res.result && res.result.exceptionDetails) {
    const d = res.result.exceptionDetails;
    console.error(`PAGE ERROR: ${d.text} ${(d.exception && d.exception.description) || ''}`);
  }
  const value = res.result && res.result.result ? res.result.result.value : res;

  if (outFile && typeof value === 'string' && value.startsWith('data:')) {
    const buf = Buffer.from(value.slice(value.indexOf(',') + 1), 'base64');
    writeFileSync(outFile, buf);
    console.log(`saved ${outFile} (${(buf.length / 1024).toFixed(0)} KiB)`);
  } else {
    console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
  }

  if (shotPath) {
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    if (shot.result && shot.result.data) {
      writeFileSync(shotPath, Buffer.from(shot.result.data, 'base64'));
      console.log(`saved ${shotPath}`);
    }
  }

  cdp.close();
  chrome.kill('SIGTERM');
  await sleep(200);
  process.exit(0);
}

main().catch((err) => {
  console.error('CDP FAILURE:', err.message);
  chrome.kill('SIGTERM');
  process.exit(1);
});
