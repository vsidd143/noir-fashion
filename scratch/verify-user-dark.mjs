import { spawn } from 'child_process';
import fs from 'fs';

const ARTIFACT_DIR = '/Users/steve/.gemini/antigravity/brain/85d8b7e6-aae6-4aae-8d35-aa66e49e5e23';

async function main() {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9226',
    '--disable-gpu',
    '--user-data-dir=/tmp/chrome-user-dark',
    '--no-sandbox'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch('http://127.0.0.1:9226/json/version');
      const data = await res.json();
      wsUrl = data.webSocketDebuggerUrl;
      if (wsUrl) break;
    } catch (e) {}
  }

  if (!wsUrl) {
    console.error("Could not obtain Chrome WebSocket URL");
    chrome.kill();
    process.exit(1);
  }

  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const callbacks = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      callbacks.get(msg.id)(msg);
      callbacks.delete(msg.id);
    }
  };

  function send(method, params = {}) {
    return new Promise(r => {
      const reqId = id++;
      callbacks.set(reqId, r);
      ws.send(JSON.stringify({ id: reqId, method, params }));
    });
  }

  const target = await send('Target.createTarget', { url: 'http://localhost:3000/user' });
  const targetId = target.result.targetId;
  const session = await send('Target.attachToTarget', { targetId, flatten: true });
  const sessionId = session.result.sessionId;

  function sendSession(method, params = {}) {
    return new Promise(r => {
      const reqId = id++;
      callbacks.set(reqId, r);
      ws.send(JSON.stringify({ id: reqId, sessionId, method, params }));
    });
  }

  await sendSession('Page.enable');
  await sendSession('Runtime.enable');
  await sendSession('Network.setCacheDisabled', { cacheDisabled: true });
  await sendSession('Page.reload', { ignoreCache: true });
  await new Promise(r => setTimeout(r, 2500));

  // Desktop (1440x900)
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false
  });
  await new Promise(r => setTimeout(r, 1200));

  let shot = await sendSession('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${ARTIFACT_DIR}/user-page-dark-1440.png`, Buffer.from(shot.result.data, 'base64'));
  console.log("Saved user-page-dark-1440.png");

  // Mobile (390x844)
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true
  });
  await new Promise(r => setTimeout(r, 1200));

  shot = await sendSession('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${ARTIFACT_DIR}/user-page-dark-390.png`, Buffer.from(shot.result.data, 'base64'));
  console.log("Saved user-page-dark-390.png");

  await send('Target.closeTarget', { targetId });
  chrome.kill();
  ws.close();
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

