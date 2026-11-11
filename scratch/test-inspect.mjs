import { spawn } from 'child_process';
import fs from 'fs';

const ARTIFACT_DIR = '/Users/steve/.gemini/antigravity/brain/85d8b7e6-aae6-4aae-8d35-aa66e49e5e23';

async function main() {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9234',
    '--disable-gpu',
    '--user-data-dir=/tmp/chrome-test-eval',
    '--no-sandbox'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch('http://127.0.0.1:9234/json/version');
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

  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false
  });

  await sendSession('Page.reload');
  await new Promise(r => setTimeout(r, 4000));

  const check = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const wheel = document.getElementById('orbital-product-wheel');
        const snap = document.getElementById('new-this-month');
        const heading = document.querySelector('h2');
        const cards = document.querySelectorAll('#orbital-product-wheel div[role="button"]');
        
        // Find wheel position
        let top = 0;
        if (wheel) {
          top = wheel.getBoundingClientRect().top + window.pageYOffset;
          wheel.scrollIntoView();
        } else if (snap) {
          top = snap.getBoundingClientRect().top + window.pageYOffset;
          snap.scrollIntoView();
        }

        return {
          wheelFound: !!wheel,
          snapFound: !!snap,
          cardsCount: cards.length,
          top: top,
          scrollWidth: document.scrollingElement.scrollWidth,
          innerWidth: window.innerWidth
        };
      })()
    `,
    returnByValue: true
  });

  console.log("Check result:", JSON.stringify(check));

  await new Promise(r => setTimeout(r, 1000));

  const shot = await sendSession('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(`${ARTIFACT_DIR}/wheel-desktop-inspect.png`, Buffer.from(shot.result.data, 'base64'));

  chrome.kill();
  console.log("Done!");
}

main().catch(console.error);

