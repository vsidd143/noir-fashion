import { spawn } from 'child_process';
import fs from 'fs';

const ARTIFACT_DIR = '/Users/steve/.gemini/antigravity/brain/85d8b7e6-aae6-4aae-8d35-aa66e49e5e23';

async function main() {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9235',
    '--disable-gpu',
    '--user-data-dir=/tmp/chrome-wheel-vp-final',
    '--no-sandbox'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch('http://127.0.0.1:9235/json/version');
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

  await sendSession('Page.enable');
  await sendSession('Runtime.enable');

  const viewports = [
    { name: '1920', width: 1920, height: 1080, mobile: false },
    { name: '1440', width: 1440, height: 900, mobile: false },
    { name: '1024', width: 1024, height: 768, mobile: false },
    { name: '768', width: 768, height: 1024, mobile: false },
    { name: '390', width: 390, height: 844, mobile: true },
    { name: '360', width: 360, height: 740, mobile: true },
  ];

  for (const vp of viewports) {
    console.log(`\n--- Testing ${vp.name} (${vp.width}x${vp.height}) ---`);
    await sendSession('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 2,
      mobile: vp.mobile
    });
    await sendSession('Page.reload');
    await new Promise(r => setTimeout(r, 3500));

    // Scroll into view
    const check = await sendSession('Runtime.evaluate', {
      expression: `
        (() => {
          const wheel = document.getElementById('orbital-product-wheel');
          if (wheel) {
            wheel.scrollIntoView();
          }
          const scrollWidth = document.scrollingElement.scrollWidth;
          const innerWidth = window.innerWidth;
          return {
            wheelFound: !!wheel,
            scrollWidth,
            innerWidth,
            overflow: scrollWidth > innerWidth
          };
        })()
      `,
      returnByValue: true
    });

    console.log(`Viewport ${vp.name} metrics:`, JSON.stringify(check.result?.result?.value));
    await new Promise(r => setTimeout(r, 600));

    const shot = await sendSession('Page.captureScreenshot', { format: 'png' });
    const filename = `${ARTIFACT_DIR}/wheel-${vp.name}-final.png`;
    fs.writeFileSync(filename, Buffer.from(shot.result.data, 'base64'));
    console.log(`Saved screenshot: ${filename}`);
  }

  chrome.kill();
  console.log("\nAll viewport tests completed successfully!");
}

main().catch(console.error);
