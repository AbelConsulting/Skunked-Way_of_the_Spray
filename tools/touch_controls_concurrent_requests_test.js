const { chromium } = require('playwright');
(async ()=>{
  const browser = await chromium.launch();
  const context = await browser.newContext({viewport:{width:640,height:360}, deviceScaleFactor:0.75, userAgent: 'Mozilla/5.0 (Linux; Android 9; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0 Mobile Safari/537.36'});
  const page = await context.newPage();
  await page.goto(process.env.TEST_SERVER || 'http://localhost:8000');

  // Ensure touch controls exist
  await page.waitForSelector('#touch-controls', { state: 'attached', timeout: 5000 }).catch(() => {});

  // Scenario: overlapping requests where one is forced
  const ids = await page.evaluate(() => {
    try {
      // id1: regular 1200ms
      const id1 = window.requestShowTouchControls(1200, { force: false });
      // id2: forced 700ms
      const id2 = window.requestShowTouchControls(700, { force: true });
      return { id1, id2 };
    } catch (e) { return { error: String(e) } }
  });

  console.log('initial ids:', ids);
  if (ids.error) { console.error('failed to request show', ids.error); process.exitCode = 2; await browser.close(); return; }

  // Attempt hide while requests active -> should be blocked
  await page.evaluate(() => { try { window.hideTouchControls(); } catch(e) {} });
  const statusWhileActive = await page.evaluate(() => {
    const tc = document.getElementById('touch-controls');
    return tc ? { display: getComputedStyle(tc).display, pointerEvents: getComputedStyle(tc).pointerEvents, visibleClass: Array.from(tc.classList) } : { present: false };
  });
  console.log('status while active:', statusWhileActive);
  if (typeof statusWhileActive.display === 'undefined' || statusWhileActive.display === 'none' || statusWhileActive.pointerEvents === 'none' || !Array.isArray(statusWhileActive.visibleClass) || !statusWhileActive.visibleClass.includes('visible')) {
    console.error('FAIL: controls should remain visible while requests are active', statusWhileActive); process.exitCode = 2; await browser.close(); return;
  }

  // Release forced request (id2) and verify still blocked by id1
  await page.evaluate((id) => { window.releaseShowTouchControls(id); }, ids.id2);
  await page.waitForTimeout(200);
  const statusAfterForceRelease = await page.evaluate(() => ({ display: getComputedStyle(document.getElementById('touch-controls')).display, pointerEvents: getComputedStyle(document.getElementById('touch-controls')).pointerEvents, pendingCount: window._touchControlsVisibilityCount || 0, forceFlag: !!window._forceTouchControls }));
  console.log('status after releasing force:', statusAfterForceRelease);
  if (statusAfterForceRelease.pendingCount <= 0) { console.error('FAIL: pending count should still be > 0 after releasing force if other requests exist'); process.exitCode = 2; await browser.close(); return; }

  // Release the remaining request (id1) and ensure controls can hide
  await page.evaluate((id) => { window.releaseShowTouchControls(id); }, ids.id1);
  // wait for hide to complete
  try { await page.waitForFunction(() => getComputedStyle(document.getElementById('touch-controls')).display === 'none', { timeout: 1500 }); } catch (e) {}
  const finalAfterRelease = await page.evaluate(() => ({ display: getComputedStyle(document.getElementById('touch-controls')).display, pointerEvents: getComputedStyle(document.getElementById('touch-controls')).pointerEvents, pendingCount: window._touchControlsVisibilityCount || 0, forceFlag: !!window._forceTouchControls }));
  console.log('final after releasing all:', finalAfterRelease);
  if (finalAfterRelease.display !== 'none') { console.error('FAIL: controls should be hidden after all releases'); process.exitCode = 2; await browser.close(); return; }

  // Persistent forced request: should remain after duration until released
  const pid = await page.evaluate(() => window.requestShowTouchControls(300, { force: true, persistent: true }));
  console.log('persistent forced id:', pid);
  await page.waitForTimeout(500); // past duration
  const statusPersistent = await page.evaluate(() => ({ pendingCount: window._touchControlsVisibilityCount || 0, forceFlag: !!window._forceTouchControls }));
  console.log('status after persistent expiry time:', statusPersistent);
  if (!statusPersistent.forceFlag) { console.error('FAIL: persistent force should keep force flag set after expiry'); process.exitCode = 2; await browser.close(); return; }

  // Now explicitly release persistent request
  await page.evaluate((id) => { window.releaseShowTouchControls(id); }, pid);
  await page.waitForTimeout(200);
  const afterPersistentRelease = await page.evaluate(() => ({ pendingCount: window._touchControlsVisibilityCount || 0, forceFlag: !!window._forceTouchControls }));
  console.log('after persistent release:', afterPersistentRelease);
  if (afterPersistentRelease.forceFlag) { console.error('FAIL: force flag should be cleared after releasing persistent request'); process.exitCode = 2; await browser.close(); return; }

  console.log('All concurrent request tests passed');
  await browser.close();
})();