const { chromium } = require('playwright');
(async ()=>{
  const browser = await chromium.launch();
  const context = await browser.newContext({viewport:{width:640,height:360}, deviceScaleFactor:0.75, userAgent: 'Mozilla/5.0 (Linux; Android 9; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0 Mobile Safari/537.36'});
  const page = await context.newPage();
  await page.goto(process.env.TEST_SERVER || 'http://localhost:8001');

  // Ensure overlay exists and we are in landscape
  await page.waitForSelector('#game-canvas', { state: 'attached', timeout: 10000 });

  // Call immediate show with force=true for a short duration
  const id = await page.evaluate(() => window.showTouchControlsImmediate({ force: true, durationMs: 500 }));
  console.log('immediate show id:', id);

  const afterShow = await page.evaluate(() => {
    const tc = document.getElementById('touch-controls');
    return { present: !!tc, display: tc ? getComputedStyle(tc).display : 'missing', pointerEvents: tc ? (tc.style.pointerEvents || getComputedStyle(tc).pointerEvents) : null, classList: tc ? Array.from(tc.classList) : [] };
  });
  console.log('after immediate show:', afterShow);

  if (!afterShow.present || afterShow.display === 'none' || afterShow.pointerEvents === 'none' || !afterShow.classList.includes('visible')) {
    console.error('FAIL: controls not visible immediately after force show'); process.exitCode = 2; await browser.close(); return;
  }

  // Attempt to hide (should be blocked by force)
  await page.evaluate(() => { try { window.hideTouchControls(); } catch(e) {} });
  const afterHideAttempt = await page.evaluate(() => ({ display: getComputedStyle(document.getElementById('touch-controls')).display, pointerEvents: getComputedStyle(document.getElementById('touch-controls')).pointerEvents }));
  console.log('after hide attempt (should still be visible):', afterHideAttempt);

  // Wait for duration to elapse + buffer and confirm it auto-releases and can be hidden
  await page.waitForTimeout(700);
  const afterDuration = await page.evaluate(() => ({ display: getComputedStyle(document.getElementById('touch-controls')).display, pointerEvents: getComputedStyle(document.getElementById('touch-controls')).pointerEvents, pendingCount: window._touchControlsVisibilityCount || 0, force: !!window._forceTouchControls }));
  console.log('after duration:', afterDuration);
  if (afterDuration.force) {
    console.error('FAIL: force flag still set after duration'); process.exitCode = 2; await browser.close(); return;
  }

  // Now hide should work
  await page.evaluate(() => { try { window.hideTouchControls(); } catch(e) {} });
  // Wait up to 1200ms for the display to be cleared (transitionend or timeout)
  let final = null;
  try {
    await page.waitForFunction(() => getComputedStyle(document.getElementById('touch-controls')).display === 'none', { timeout: 1200 });
    final = await page.evaluate(() => ({ display: getComputedStyle(document.getElementById('touch-controls')).display, pointerEvents: getComputedStyle(document.getElementById('touch-controls')).pointerEvents }));
  } catch (e) {
    final = await page.evaluate(() => ({ display: getComputedStyle(document.getElementById('touch-controls')).display, pointerEvents: getComputedStyle(document.getElementById('touch-controls')).pointerEvents }));
  }
  console.log('final after hide:', final);
  if (final.display !== 'none') { console.error('FAIL: controls still visible after hide'); process.exitCode = 2; }

  await browser.close();
})();