import { spawn } from 'child_process';
import fs from 'fs';

const ARTIFACT_DIR = '/Users/steve/.gemini/antigravity/brain/85d8b7e6-aae6-4aae-8d35-aa66e49e5e23';

async function main() {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9237',
    '--disable-gpu',
    '--user-data-dir=/tmp/chrome-test-verify',
    '--no-sandbox'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch('http://127.0.0.1:9237/json/version');
      const data = await res.json();
      wsUrl = data.webSocketDebuggerUrl;
      if (wsUrl) break;
    } catch (e) {}
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

  const target = await send('Target.createTarget', { url: 'http://localhost:3000' });
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

  await sendSession('Log.enable');
  await sendSession('Runtime.enable');
  await sendSession('Network.enable');

  const failedRequests = [];
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Network.responseReceived') {
      if (msg.params.response.status >= 400) {
        failedRequests.push({ url: msg.params.response.url, status: msg.params.response.status });
      }
    }
  });

  // 1. MOBILE TEST (370x748)
  console.log("Testing mobile 370x748...");
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 370,
    height: 748,
    deviceScaleFactor: 2,
    mobile: true
  });

  await sendSession('Page.reload');
  await new Promise(r => setTimeout(r, 4000));

  // Check hero video playback
  const videoEval = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const v = document.querySelector('video');
        return {
          found: !!v,
          paused: v ? v.paused : null,
          currentTime: v ? v.currentTime : null,
          currentSrc: v ? v.currentSrc : null
        };
      })()
    `,
    returnByValue: true
  });
  console.log("Hero video status:", JSON.stringify(videoEval.result?.result?.value));

  // Capture Hero Section on mobile
  const heroShot = await sendSession('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${ARTIFACT_DIR}/mobile-hero-verified.png`, Buffer.from(heroShot.result.data, 'base64'));

  // Scroll to wheel section
  await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const el = document.getElementById('orbital-product-wheel');
        if (el) el.scrollIntoView();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 1000));

  // Capture Wheel on mobile
  const wheelMobileShot = await sendSession('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${ARTIFACT_DIR}/mobile-wheel-verified.png`, Buffer.from(wheelMobileShot.result.data, 'base64'));

  // 2. DESKTOP TEST (1440x900)
  console.log("Testing desktop 1440x900...");
  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false
  });
  await sendSession('Page.reload');
  await new Promise(r => setTimeout(r, 4000));

  await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const el = document.getElementById('orbital-product-wheel');
        if (el) el.scrollIntoView();
      })()
    `
  });
  await new Promise(r => setTimeout(r, 1000));

  const wheelDesktopShot = await sendSession('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${ARTIFACT_DIR}/desktop-wheel-verified.png`, Buffer.from(wheelDesktopShot.result.data, 'base64'));

  console.log("Failed requests count:", failedRequests.length);
  if (failedRequests.length > 0) {
    console.log("Failed requests:", JSON.stringify(failedRequests, null, 2));
  }

  chrome.kill();
  console.log("Done verification!");
  process.exit(0);
}

main().catch(console.error);

