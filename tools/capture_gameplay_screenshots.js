/**
 * capture_gameplay_screenshots.js — drive the game with Playwright and
 * capture real gameplay frames for store listings.
 *
 * Usage:
 *   1. Serve a build:  python -m http.server 8000  (from dist/ or dist-steam/)
 *   2. node tools/capture_gameplay_screenshots.js
 *
 * Env:
 *   TEST_SERVER  — base URL (default http://localhost:8000)
 *   OUT_DIR      — output folder (default tools/captures)
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const SERVER = process.env.TEST_SERVER || 'http://localhost:8000';
  const OUT = process.env.OUT_DIR || path.join(__dirname, 'captures');
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  page.on('pageerror', e => console.log('[pageerror]', e.message));

  console.log('Loading', SERVER, '…');
  await page.goto(SERVER, { waitUntil: 'load' });
  await page.waitForTimeout(4000); // let assets/audio load

  // Dismiss any file:// or start overlays if present
  for (const sel of ['#mobile-start-overlay', 'button:has-text("Close")']) {
    try {
      const el = await page.$(sel);
      if (el && await el.isVisible()) await el.click({ timeout: 1000 });
    } catch (e) {}
  }

  // Hide non-game chrome (promo overlays, touch controls, toasts, cursors)
  await page.addStyleTag({ content: `
    #web-demo-banner, .web-demo-banner, .demo-banner, .promo-banner,
    #touch-controls, #mobile-start-overlay, #mobile-restart-overlay,
    .achievement-toast, #achievement-toast, .toast, [class*="achievement"],
    #pause-btn, .pause-button, [id*="pause"],
    canvas ~ div[style*="position: fixed"] { display: none !important; visibility: hidden !important; }
    * { cursor: none !important; }
  ` });
  // Also nuke any fixed-position overlay panels that aren't the canvas
  const hideOverlays = () => page.evaluate(() => {
    const canvas = document.querySelector('#game-canvas');
    document.querySelectorAll('body *').forEach(el => {
      if (el === canvas || el.contains(canvas)) return;
      const st = getComputedStyle(el);
      if ((st.position === 'fixed' || st.position === 'absolute') &&
          el.offsetWidth > 150 && !canvas.contains(el)) {
        // hide overlays that sit on top of the canvas area
        const r = el.getBoundingClientRect();
        const c = canvas.getBoundingClientRect();
        const overlaps = !(r.right < c.left || r.left > c.right || r.bottom < c.top || r.top > c.bottom);
        if (overlaps && !el.querySelector('#game-canvas')) el.style.display = 'none';
      }
    });
  });

  const canvasEl = page.locator('#game-canvas');
  const shot = async (name) => {
    const p = path.join(OUT, name);
    await canvasEl.screenshot({ path: p });
    console.log('  captured', name);
  };

  // Title screen
  await shot('cap-01-title.png');

  // Start the game
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);
  await shot('cap-02-start.png');

  // Drive gameplay: run right, jump, attack in bursts; screenshot along the way.
  const seq = [
    { keys: ['ArrowRight'], holdMs: 1200, name: 'cap-03-run.png' },
    { keys: ['ArrowRight', 'Space'], holdMs: 700, name: 'cap-04-jump.png' },
    { keys: ['x'], holdMs: 400, name: 'cap-05-attack.png' },
    { keys: ['ArrowRight'], holdMs: 1500, name: null },
    { keys: ['z'], holdMs: 500, name: 'cap-06-special.png' },
    { keys: ['ArrowRight', 'Space'], holdMs: 800, name: null },
    { keys: ['x'], holdMs: 400, name: 'cap-07-combat.png' },
    { keys: ['ArrowRight'], holdMs: 2000, name: 'cap-08-progress.png' },
    { keys: ['ArrowRight', 'Space'], holdMs: 700, name: null },
    { keys: ['x'], holdMs: 300, name: 'cap-09-action.png' },
  ];

  for (const step of seq) {
    for (const k of step.keys) await page.keyboard.down(k);
    await page.waitForTimeout(step.holdMs);
    if (step.name) await shot(step.name);
    for (const k of step.keys) await page.keyboard.up(k);
    await page.waitForTimeout(150);
  }

  // A couple of extra timed frames mid-action for variety.
  await page.keyboard.down('ArrowRight');
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(1200);
    if (i === 1) { await page.keyboard.press('Space'); }
    await shot(`cap-1${i}-extra.png`);
  }
  await page.keyboard.up('ArrowRight');

  await browser.close();
  console.log('\nDone. Frames in', OUT);
})();
