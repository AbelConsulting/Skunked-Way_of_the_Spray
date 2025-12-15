const { chromium } = require('playwright');
(async ()=>{
  const browser = await chromium.launch();
  const context = await browser.newContext({viewport:{width:640,height:360}, deviceScaleFactor:0.75, userAgent: 'Mozilla/5.0 (Linux; Android 9; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0 Mobile Safari/537.36'});
  const page = await context.newPage();
  await page.goto(process.env.TEST_SERVER || 'http://localhost:8001');

  // Wait for game and readiness
  await page.waitForFunction('window.game && window.gameReady', { timeout: 8000 });
  // Ensure we are in MENU
  await page.waitForFunction('window.game && window.game.state === "MENU"', { timeout: 8000 });

  // Remove touch-controls if present to simulate not-loaded-at-start
  await page.evaluate(() => { const el = document.getElementById('touch-controls'); if (el) el.remove(); });
  const presentAfterRemove = await page.evaluate(() => !!document.getElementById('touch-controls'));
  console.log('touch-controls present after remove (expected false):', presentAfterRemove);

  // For debugging: ensureTouchControlsExists() works when invoked directly
  const reinsertionAttempt = await page.evaluate(() => { try { return !!(ensureTouchControlsExists()); } catch (e) { return { error: String(e) }; } });
  console.log('reinsertionAttempt result (should be true):', reinsertionAttempt);

  // Start the game programmatically
  await page.evaluate(() => { try { if (window.game && typeof window.game.startGame === 'function') { window.game.startGame(); } else { window.dispatchEvent(new CustomEvent('gameStateChange', { detail: { state: 'PLAYING' } })); } } catch (e) { console.error('start failed', e); } });

  // Wait for PLAYING and then sample touch-controls state over a short window to capture any racing hides
  await page.waitForFunction('window.game && window.game.state === "PLAYING"', { timeout: 8000 });

  const samples = [];
  for (let i = 0; i < 8; i++) {
    const snap = await page.evaluate(() => ({ t: Date.now(), present: !!document.getElementById('touch-controls'), display: (function(){ const el=document.getElementById('touch-controls'); return el ? getComputedStyle(el).display : 'missing' })(), classList: (function(){ const el=document.getElementById('touch-controls'); return el ? Array.from(el.classList) : [] })(), internal: { pendingCount: window._touchControlsVisibilityCount || 0, force: !!window._forceTouchControls, lockUntil: window._touchControlsLockUntil || null } }));
    samples.push(snap);
    await page.waitForTimeout(150);
  }
  console.log('samples during post-start window:', samples);

  const final = samples[samples.length-1];
  if (!final.present || final.display === 'none' || !final.classList.includes('visible')) { console.error('FAIL: touch-controls should be present and visible on PLAYING', final); process.exitCode = 2; await browser.close(); return; }
  console.log('PASS: touch-controls were inserted and shown on game start');
  await browser.close();
})();