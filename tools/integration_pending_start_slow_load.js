const { chromium } = require('playwright');
(async ()=>{
  const SERVER = process.env.TEST_SERVER || 'http://localhost:8001';
  const browser = await chromium.launch();
  // Start in portrait to force "rotate to play" flow
  const context = await browser.newContext({viewport:{width:360,height:640}, userAgent: 'Mozilla/5.0 (Linux; Android 9; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0 Mobile Safari/537.36'});
  const page = await context.newPage();

  // Inject a small hook before the page scripts run to delay spriteLoader.loadAllSprites
  await page.addInitScript(() => {
    // expose test settings
    window.__delayedSpriteLoader = { delayMs: 3000 };

    // Poll for spriteLoader and patch its loadAllSprites when available
    const tryPatch = () => {
      try {
        if (window.spriteLoader && typeof window.spriteLoader.loadAllSprites === 'function' && !window.spriteLoader._testPatched) {
          const orig = window.spriteLoader.loadAllSprites.bind(window.spriteLoader);
          window.spriteLoader._testPatched = true;
          window.spriteLoader.loadAllSprites = async function(...args) {
            // Delay to emulate slow loading path
            await new Promise(r => setTimeout(r, window.__delayedSpriteLoader.delayMs));
            // Call original to keep normal behavior if it needs to run
            try { await orig(...args); } catch(e) {}
          };
          // indicate patch applied for diagnostics
          window.__delayedSpriteLoader._patched = true;
        }
      } catch (e) {}
    };
    const interval = setInterval(() => {
      tryPatch();
      if (window.spriteLoader && window.spriteLoader._testPatched) clearInterval(interval);
    }, 50);
    // also try once synchronously in case spriteLoader is already present
    tryPatch();
  });

  await page.goto(SERVER);
  // Wait for the canvas element to be present in DOM (may be hidden during load)
  await page.waitForSelector('#game-canvas', { state: 'attached', timeout: 30000 });

  // Ensure the mobile start overlay/button exists
  const hasBtn = await page.$('#mobile-start-btn');
  console.log('mobile-start-btn present?', !!hasBtn);

  // Ensure the start overlay is visible (some builds hide it in portrait). Simulate user opening it.
  await page.evaluate(() => {
    const overlay = document.getElementById('mobile-start-overlay');
    if (overlay && typeof showMobileStartOverlay === 'function') showMobileStartOverlay();
    return { overlayPresent: !!overlay };
  }).then(r => console.log('overlay ensure result:', r));

  // Attempt to start while in portrait: dispatch pointerup (simulates user gesture)
  await page.evaluate(() => {
    const b = document.getElementById('mobile-start-btn');
    const overlay = document.getElementById('mobile-start-overlay');
    try {
      window.__test_clicked = false;
      if (b) {
        // prefer dispatching a pointer event, but also call click as fallback
        try {
          b.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch' }));
        } catch (e) {
          try { b.click(); } catch (e2) {}
        }
        window.__test_clicked = true;
      }
      return { overlayDisplay: overlay ? getComputedStyle(overlay).display : null, btnDisabled: b ? b.disabled : null, clicked: window.__test_clicked };
    } catch (e) {
      return { error: String(e) };
    }
  }).then(r => console.log('click attempt result:', r));

  // Allow a short delay for handlers to run and set pending flag
  await page.waitForTimeout(300);

  // Confirm pendingStartGesture was set
  const pendingAfterTap = await page.evaluate(() => ({ pending: !!window._pendingStartGesture, mobileStartState: (function(){const el=document.getElementById('mobile-start-overlay'); return el ? getComputedStyle(el).display : 'missing' })(), btnDisabled: (document.getElementById('mobile-start-btn') ? document.getElementById('mobile-start-btn').disabled : null) }));
  console.log('pendingStartGesture after tap (expected true):', pendingAfterTap);
  // Now rotate to landscape (trigger orientationchange/resize)
  console.log('rotating viewport to landscape...');
  await page.setViewportSize({ width: 640, height: 360 });
  await page.evaluate(() => { window.dispatchEvent(new Event('orientationchange')); window.dispatchEvent(new Event('resize')); });

  // Wait for game to enter PLAYING state (should occur after delayed sprite load + dispatch)
  let started = false;
  try {
    await page.waitForFunction('window.game && window.game.state === "PLAYING"', { timeout: 10000 });
    started = true;
  } catch (e) {
    started = false;
  }

  const finalState = await page.evaluate(() => ({
    gameReady: !!window.gameReady,
    state: window.game && window.game.state,
    pending: !!window._pendingStartGesture,
    delayedPatched: !!(window.__delayedSpriteLoader && window.__delayedSpriteLoader._patched),
    mobileStartVisible: (function(){ const el = document.getElementById('mobile-start-overlay'); return el ? getComputedStyle(el).display : 'missing'; })(),
    touchControlsVisible: (function(){ const el = document.getElementById('touch-controls'); return el ? getComputedStyle(el).display : 'missing'; })()
  }));

  console.log('started:', started);
  console.log('final state:', JSON.stringify(finalState, null, 2));

  if (!started) process.exitCode = 2;

  await browser.close();
})();