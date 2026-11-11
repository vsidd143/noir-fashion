import { spawn } from 'child_process';
import fs from 'fs';

const ARTIFACT_DIR = '/Users/steve/.gemini/antigravity/brain/85d8b7e6-aae6-4aae-8d35-aa66e49e5e23';

async function main() {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9240',
    '--disable-gpu',
    '--user-data-dir=/tmp/chrome-test-steps-2',
    '--no-sandbox'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch('http://127.0.0.1:9240/json/version');
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

  const pos = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const el = document.getElementById('orbital-product-wheel');
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          top: rect.top + window.scrollY,
          height: rect.height,
          pinSpacer: !!el.closest('.pin-spacer')
        };
      })()
    `,
    returnByValue: true
  });
  console.log("Wheel pos:", JSON.stringify(pos.result?.result?.value));
  const top = pos.result?.result?.value?.top || 1780;

  // Let us scroll through from top to top + 1500
  const offsets = [0, 300, 700, 1100, 1500];
  for (const off of offsets) {
    const targetScroll = Math.round(top + off);
    await sendSession('Runtime.evaluate', {
      expression: `window.scrollTo(0, ${targetScroll})`
    });
    await new Promise(r => setTimeout(r, 600));

    const state = await sendSession('Runtime.evaluate', {
      expression: `
        (() => {
          const pill = document.querySelector('#orbital-product-wheel button');
          const pillText = pill ? pill.innerText.replace(/\\n/g, ' ') : '';
          const activeCard = document.querySelector('#orbital-product-wheel div[style*="z-index: 50"]');
          return {
            scrollY: window.scrollY,
            pillText,
            activeCardLeft: activeCard ? activeCard.style.left : null,
            activeCardTop: activeCard ? activeCard.style.top : null,
            activeCardTransform: activeCard ? activeCard.style.transform : null
          };
        })()
      `,
      returnByValue: true
    });
    console.log(`Offset +${off}:`, JSON.stringify(state.result?.result?.value));

    const shot = await sendSession('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(`${ARTIFACT_DIR}/step-${off}.png`, Buffer.from(shot.result.data, 'base64'));
  }

  chrome.kill();
  console.log("Done capture steps!");
  process.exit(0);
}

main().catch(console.error);
