import { spawn } from 'child_process';
import fs from 'fs';

const ARTIFACT_DIR = '/Users/steve/.gemini/antigravity/brain/85d8b7e6-aae6-4aae-8d35-aa66e49e5e23';

async function main() {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9238',
    '--disable-gpu',
    '--user-data-dir=/tmp/chrome-test-scroll-bug',
    '--no-sandbox'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch('http://127.0.0.1:9238/json/version');
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

  const errors = [];
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      if (msg.params.type === 'error' || msg.params.type === 'warning') {
        errors.push({ type: msg.params.type, args: msg.params.args.map(a => a.value || a.description) });
      }
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      errors.push({ type: 'log-error', text: msg.params.entry.text });
    }
  });

  await sendSession('Log.enable');
  await sendSession('Runtime.enable');

  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false
  });

  await sendSession('Page.reload');
  await new Promise(r => setTimeout(r, 4000));

  console.log("Console errors on mount:", JSON.stringify(errors, null, 2));

  // Find wheel top
  const wheelInfo = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const el = document.getElementById('orbital-product-wheel');
        const st = window.ScrollTrigger ? window.ScrollTrigger.getAll().map(s => ({
          trigger: s.trigger?.id,
          start: s.start,
          end: s.end,
          progress: s.progress,
          pin: !!s.pin
        })) : [];
        return {
          offsetTop: el ? el.offsetTop : null,
          scrollTriggers: st
        };
      })()
    `,
    returnByValue: true
  });
  console.log("Wheel info:", JSON.stringify(wheelInfo.result?.result?.value, null, 2));

  // Simulate scrolling through the wheel in steps
  const steps = [0, 500, 1000, 1500, 2000, 2500, 3000, 3500];
  for (const scrollY of steps) {
    await sendSession('Runtime.evaluate', {
      expression: `window.scrollTo(0, ${scrollY})`
    });
    await new Promise(r => setTimeout(r, 400));

    const state = await sendSession('Runtime.evaluate', {
      expression: `
        (() => {
          const wheel = document.getElementById('orbital-product-wheel');
          const activeCard = document.querySelector('#orbital-product-wheel div[style*="outline: 2px"]');
          const pill = document.querySelector('#orbital-product-wheel button');
          const pillText = pill ? pill.innerText.replace(/\\n/g, ' ') : '';
          return {
            scrollY: window.scrollY,
            activePill: pillText,
            activeCardLeft: activeCard ? activeCard.style.left : null,
            activeCardTransform: activeCard ? activeCard.style.transform : null
          };
        })()
      `,
      returnByValue: true
    });
    console.log(`Scroll ${scrollY}:`, JSON.stringify(state.result?.result?.value));
  }

  console.log("Final console errors:", JSON.stringify(errors, null, 2));
  chrome.kill();
  process.exit(0);
}

main().catch(console.error);

