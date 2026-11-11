import { spawn } from 'child_process';

async function main() {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9236',
    '--disable-gpu',
    '--user-data-dir=/tmp/chrome-test-errors',
    '--no-sandbox'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const res = await fetch('http://127.0.0.1:9236/json/version');
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

  const logs = [];
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      callbacks.get(msg.id)(msg);
      callbacks.delete(msg.id);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      logs.push({ type: msg.params.type, args: msg.params.args.map(a => a.value || a.description) });
    }
    if (msg.method === 'Log.entryAdded') {
      logs.push({ level: msg.params.entry.level, text: msg.params.entry.text });
    }
  };

  await sendSession('Log.enable');
  await sendSession('Runtime.enable');
  await sendSession('Network.enable');

  const failedRequests = [];
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Network.loadingFailed') {
      failedRequests.push(msg.params);
    }
    if (msg.method === 'Network.responseReceived') {
      if (msg.params.response.status >= 400) {
        failedRequests.push({ url: msg.params.response.url, status: msg.params.response.status });
      }
    }
  });

  await sendSession('Emulation.setDeviceMetricsOverride', {
    width: 370,
    height: 748,
    deviceScaleFactor: 2,
    mobile: true
  });

  await sendSession('Page.reload');
  await new Promise(r => setTimeout(r, 4000));

  console.log("Failed requests:", JSON.stringify(failedRequests, null, 2));
  console.log("Console errors:", JSON.stringify(logs.filter(l => l.type === 'error' || l.level === 'error'), null, 2));

  // Check video status
  const videoStatus = await sendSession('Runtime.evaluate', {
    expression: `
      (() => {
        const v = document.querySelector('video');
        if (!v) return { found: false };
        return {
          found: true,
          paused: v.paused,
          currentTime: v.currentTime,
          currentSrc: v.currentSrc,
          videoWidth: v.videoWidth,
          videoHeight: v.videoHeight,
          readyState: v.readyState
        };
      })()
    `,
    returnByValue: true
  });
  console.log("Video status on mobile (370x748):", JSON.stringify(videoStatus.result?.result?.value, null, 2));

  chrome.kill();
  process.exit(0);
}

main().catch(console.error);

