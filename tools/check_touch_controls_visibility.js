const { chromium } = require('playwright');
(async ()=>{
  const browser = await chromium.launch();
  // Use landscape viewport so mobile UI is active
  const context = await browser.newContext({viewport:{width:640,height:360}, deviceScaleFactor:0.75, userAgent: 'Mozilla/5.0 (Linux; Android 9; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0 Mobile Safari/537.36'});
  const page = await context.newPage();
  await page.goto('http://localhost:8000');
  // wait for DOM
  await page.waitForSelector('#game-canvas');
  const before = await page.evaluate(()=>{
    const el = document.getElementById('touch-controls');
    if (!el) return {display: 'missing', opacity: null, classList: []};
    return { display: getComputedStyle(el).display, opacity: getComputedStyle(el).opacity, classList: Array.from(el.classList) };
  });
  const startBefore = await page.evaluate(()=>{
    const el = document.getElementById('mobile-start-overlay');
    if (!el) return {display: 'missing', opacity: null, classList: []};
    return { display: getComputedStyle(el).display, opacity: getComputedStyle(el).opacity, classList: Array.from(el.classList) };
  });
  console.log('touch-controls before start:', before);
  // Wait for game readiness (longer timeout), then press Enter to start
  await page.waitForFunction('window.gameReady === true', { timeout: 15000 }).catch(() => {
    console.log('warning: gameReady did not become true within 15s');
  });
  await page.keyboard.press('Enter');
  // Wait for game to actually enter PLAYING state (extended timeout)
  try {
    await page.waitForFunction('window.game && window.game.state === "PLAYING"', { timeout: 8000 });
  } catch (e) {
    console.log('game did not enter PLAYING within timeout');
    // Debug: report current state so we can see what's happening
    const cur = await page.evaluate(() => ({ ready: window.gameReady || false, state: (window.game && window.game.state) || null }));
    console.log('debug: gameReady / state after Enter:', cur);
    // Try clicking the mobile start button as a fallback (simulates user gesture)
    const hasBtn = await page.$('#mobile-start-btn');
    if (hasBtn) {
      console.log('attempting DOM click on #mobile-start-btn fallback');
      // Use evaluate() to invoke .click() even if Playwright considers it not visible
      await page.evaluate(() => {
        const b = document.getElementById('mobile-start-btn');
        if (b) { try { b.click(); } catch (e) { /* ignore */ } }
      });
      try {
        await page.waitForFunction('window.game && window.game.state === "PLAYING"', { timeout: 5000 });
      } catch (e2) {
        console.log('fallback DOM click did not start game');
        const cur2 = await page.evaluate(() => ({ ready: window.gameReady || false, state: (window.game && window.game.state) || null }));
        console.log('debug after fallback:', cur2);
      }
    }
  }
  // Allow overlay transition and hide fallback to complete
  await page.waitForTimeout(600);
  const after = await page.evaluate(()=>{
    const el = document.getElementById('touch-controls');
    if (!el) return {display: 'missing', opacity: null, classList: []};
    return { display: getComputedStyle(el).display, opacity: getComputedStyle(el).opacity, classList: Array.from(el.classList) };
  });
  const startAfter = await page.evaluate(()=>{
    const el = document.getElementById('mobile-start-overlay');
    if (!el) return {display: 'missing', opacity: null, classList: []};
    return { display: getComputedStyle(el).display, opacity: getComputedStyle(el).opacity, classList: Array.from(el.classList) };
  });
  const debug = await page.evaluate(()=>({ debugLog: (window.touchDebug||[]).slice(-20) }));
  console.log('touch-controls after start:', after);
  console.log('mobile-start-overlay before start:', startBefore);
  console.log('mobile-start-overlay after start:', startAfter);
  console.log('last touchDebug entries:', debug.debugLog);
  await browser.close();
})();