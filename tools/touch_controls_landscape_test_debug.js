const { chromium } = require('playwright');
(async ()=>{
  const browser = await chromium.launch();
  const context = await browser.newContext({viewport:{width:640,height:360}, deviceScaleFactor:0.75, userAgent: 'Mozilla/5.0 (Linux; Android 9; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0 Mobile Safari/537.36'});
  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG>', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR>', err));
  page.on('requestfailed', req => console.log('REQUEST FAILED>', req.url(), req.failure()));

  await page.goto(process.env.TEST_SERVER || 'http://localhost:8000');

  // Wait for game ready
  await page.waitForFunction('window.gameReady === true', { timeout: 10000 }).catch(() => {});

  // Inspect initial state
  const initial = await page.evaluate(() => ({ ready: window.gameReady || false, state: (window.game && window.game.state) || null, gamePresent: !!window.game, pendingStart: !!window._pendingStartGesture, touchDebug: window.touchDebug || [] }));
  console.log('initial:', initial);

  // Start the game (use test helper if present, otherwise press Enter)
  const forced = await page.evaluate(() => {
    if (typeof window.__test_forceDispatchPendingStart === 'function') {
      window._pendingStartGesture = true; // ensure pending is set
      return window.__test_forceDispatchPendingStart();
    }
    if (typeof window.game !== 'undefined' && window.game && typeof window.game.startGame === 'function') {
      try { window.game.startGame(); return { ok: true, method: 'game.startGame' }; } catch (e) { return { ok: false, reason: String(e) } }
    }
    return { ok: false, reason: 'no-method' };
  });
  console.log('start attempt:', forced);

  // Poll for playing state with debug snapshots
  const waitForPlaying = async (timeout=15000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const snap = await page.evaluate(() => ({ ready: window.gameReady || false, state: (window.game && window.game.state) || null, errors: window.__lastError || null }));
      console.log('snap:', snap);
      if (snap.state === 'PLAYING') return true;
      await new Promise(r => setTimeout(r, 500));
    }
    return false;
  };

  const ok = await waitForPlaying(20000);
  console.log('reached playing?', ok);

  // Inspect touch controls visibility
  const vis = await page.evaluate(() => {
    const tc = document.getElementById('touch-controls');
    if (!tc) return { present: false };
    const cs = getComputedStyle(tc);
    return { present: true, display: cs.display, pointerEvents: tc.style.pointerEvents || cs.pointerEvents, classList: Array.from(tc.classList) };
  });
  console.log('touch-controls visibility:', vis);

  await browser.close();
})();