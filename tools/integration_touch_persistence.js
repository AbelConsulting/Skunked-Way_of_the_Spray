const { chromium } = require('playwright');

// Integration test: ensure touch controls stay visible after starting game
// Usage: TEST_SERVER=http://localhost:8000 node tools/integration_touch_persistence.js

const SERVER = process.env.TEST_SERVER || 'http://localhost:8000';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async ()=>{
  const headful = process.env.HEADFUL === '1' || process.env.HEADLESS === '0';
  const browser = await chromium.launch({ headless: !headful });
  const context = await browser.newContext({viewport:{width:640,height:360}, deviceScaleFactor:0.75, userAgent: 'Mozilla/5.0 (Linux; Android 9; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0 Mobile Safari/537.36'});
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE:', msg.text()));
  page.on('pageerror', err => console.log('PAGEERROR:', err.message));

  console.log('visiting', SERVER);
  await page.goto(SERVER, { waitUntil: 'load' });
  await page.waitForSelector('#game-canvas', { timeout: 20000 });

  // Wait for gameReady
  try {
    await page.waitForFunction('window.gameReady === true', { timeout: 20000 });
  } catch (e) {
    console.warn('warning: gameReady did not become true within timeout');
  }

  // Ensure touch-controls exist (re-inserted by page code if missing)
  await page.evaluate(() => { if (!document.getElementById('touch-controls')) {
    // ensure static insertion
    document.body.insertAdjacentHTML('beforeend', '<div id="touch-controls" style="display:none"></div>');
  }});

  // Start the game using a user gesture if possible. Try multiple fallbacks
  // because the start button may be present but not visible to Playwright.
  const startBtn = await page.$('#mobile-start-btn');
  let started = false;
  if (startBtn) {
    // Try clicking via DOM to avoid visibility checks
    try {
      started = await page.evaluate(() => {
        const b = document.getElementById('mobile-start-btn');
        if (!b) return false;
        try { b.click(); return true; } catch (e) { return false; }
      });
    } catch (e) { started = false; }
  }
  if (!started) {
    try {
      await page.keyboard.press('Enter');
      started = true;
    } catch (e) { started = false; }
  }
  // As a last resort, dispatch pointerup on overlay
  if (!started) {
    await page.evaluate(() => {
      const b = document.getElementById('mobile-start-btn');
      const overlay = document.getElementById('mobile-start-overlay');
      try {
        if (b) b.dispatchEvent(new PointerEvent('pointerup'));
        else if (overlay) overlay.dispatchEvent(new PointerEvent('pointerup'));
      } catch (e) {}
    });
  }

  // Try programmatic start first (bypass user-gesture restrictions)
  try {
    const startedProg = await page.evaluate(() => {
      try {
        if (window.game && typeof window.game.startGame === 'function') {
          window.game.startGame();
          return true;
        }
      } catch (e) {}
      return false;
    });
    if (!startedProg) {
      // fallback: send Enter/key gesture to start if necessary
      try { await page.evaluate(() => { try { triggerKeyEvent('Enter','keydown'); setTimeout(()=> triggerKeyEvent('Enter','keyup'), 100); } catch (e) {} }); } catch (e) {}
    }
  } catch (e) {}

  // Wait for game to enter PLAYING
  try {
    await page.waitForFunction('window.game && window.game.state === "PLAYING"', { timeout: 25000 });
  } catch (e) {
    console.error('game did not enter PLAYING within timeout');
    // Dump debug info and fail
    const debug = await page.evaluate(() => ({ ready: window.gameReady || false, state: (window.game && window.game.state) || null, debug: window.touchDebug || [] }));
    console.error('debug:', debug);
    await browser.close();
    process.exit(1);
  }

  // After entering PLAYING, sample visibility over 2s to detect transient hides
  const samples = [];
  for (let t=0;t<6;t++) {
    const s = await page.evaluate(() => {
      const el = document.getElementById('touch-controls');
      if (!el) return { exists: false };
      const cs = getComputedStyle(el);
      return { exists: true, display: cs.display, opacity: parseFloat(cs.opacity || '0'), pointerEvents: cs.pointerEvents };
    });
    const ts = Date.now();
    samples.push({ ts, sample: s });
    await sleep(350);
  }

  console.log('samples:', samples);

  const hidden = samples.find(s => !s.sample.exists || s.sample.display === 'none' || s.sample.opacity < 0.2 || s.sample.pointerEvents === 'none');
  if (hidden) {
    console.error('FAIL: touch-controls hidden in samples', hidden);
    const debug = await page.evaluate(() => window.touchDebug || []);
    console.error('touchDebug last entries:', debug.slice(-30));
    await browser.close();
    process.exit(1);
  }

  console.log('PASS: touch-controls visible and interactive across start');
  await browser.close();
  process.exit(0);
})();
