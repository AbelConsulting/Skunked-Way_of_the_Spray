const { chromium } = require('playwright');

// Integration test: ensure touch controls stay visible after starting game
// Usage: TEST_SERVER=http://localhost:8001 node tools/integration_touch_persistence.js

const SERVER = process.env.TEST_SERVER || 'http://localhost:8001';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async ()=>{
  const browser = await chromium.launch();
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

  // Start the game using a user gesture if possible
  // Prefer clicking '#mobile-start-btn' if present
  const startBtn = await page.$('#mobile-start-btn');
  if (startBtn) {
    await startBtn.click();
  } else {
    await page.keyboard.press('Enter');
  }

  // Wait for game to enter PLAYING
  try {
    await page.waitForFunction('window.game && window.game.state === "PLAYING"', { timeout: 15000 });
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
