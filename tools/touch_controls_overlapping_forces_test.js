const { chromium } = require('playwright');
(async ()=>{
  const browser = await chromium.launch();
  const context = await browser.newContext({viewport:{width:640,height:360}, deviceScaleFactor:0.75, userAgent: 'Mozilla/5.0 (Linux; Android 9; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0 Mobile Safari/537.36'});
  const page = await context.newPage();
  await page.goto(process.env.TEST_SERVER || 'http://localhost:8000');

  // Ensure touch controls exist
  await page.waitForSelector('#touch-controls', { state: 'attached', timeout: 5000 }).catch(() => {});

  // Scenario 1: Two overlapping forced (non-persistent) requests
  const ids = await page.evaluate(() => {
    try {
      const id1 = window.requestShowTouchControls(600, { force: true, persistent: false });
      // stagger a bit before next forced request starts
      return { id1 };
    } catch (e) { return { error: String(e) } }
  });

  if (ids.error) { console.error('failed to request show', ids.error); process.exitCode = 2; await browser.close(); return; }

  // start second forced request after small delay
  const id2 = await page.evaluate(() => { try { return window.requestShowTouchControls(900, { force: true, persistent: false }); } catch (e) { return { error: String(e) } } });
  if (id2 && id2.error) { console.error('failed to request second forced', id2.error); process.exitCode = 2; await browser.close(); return; }

  console.log('forced ids:', ids.id1, id2);

  // While both active: force flag must be set and controls visible
  await page.waitForTimeout(150);
  const statusWhileForced = await page.evaluate(() => ({ display: getComputedStyle(document.getElementById('touch-controls')).display, pointerEvents: getComputedStyle(document.getElementById('touch-controls')).pointerEvents, forceFlag: !!window._forceTouchControls, pendingCount: window._touchControlsVisibilityCount || 0, classList: Array.from(document.getElementById('touch-controls').classList) }));
  console.log('status while forced:', statusWhileForced);
  if (!statusWhileForced.forceFlag || statusWhileForced.display === 'none' || statusWhileForced.pointerEvents === 'none' || !statusWhileForced.classList.includes('visible')) { console.error('FAIL: controls must be visible and forceFlag true while forced requests active', statusWhileForced); process.exitCode = 2; await browser.close(); return; }

  // Release first forced request, the remaining forced should keep forceFlag
  await page.evaluate((id)=>{ window.releaseShowTouchControls(id); }, ids.id1);
  await page.waitForTimeout(150);
  const statusAfterRelease1 = await page.evaluate(() => ({ forceFlag: !!window._forceTouchControls, pendingCount: window._touchControlsVisibilityCount || 0, display: getComputedStyle(document.getElementById('touch-controls')).display }));
  console.log('status after releasing first forced:', statusAfterRelease1);
  if (!statusAfterRelease1.forceFlag) { console.error('FAIL: forceFlag should remain true while a second forced request is active'); process.exitCode = 2; await browser.close(); return; }

  // Wait for second forced to expire automatically (non-persistent)
  await page.waitForTimeout(1000);
  const statusAfterExpiry = await page.evaluate(() => ({ forceFlag: !!window._forceTouchControls, pendingCount: window._touchControlsVisibilityCount || 0, display: getComputedStyle(document.getElementById('touch-controls')).display }));
  console.log('status after second forced expiry:', statusAfterExpiry);
  if (statusAfterExpiry.forceFlag) { console.error('FAIL: forceFlag should clear after last non-persistent forced request expires'); process.exitCode = 2; await browser.close(); return; }

  // Scenario 2: persistent forced request should keep forceFlag until explicit release
  const pid = await page.evaluate(() => window.requestShowTouchControls(300, { force: true, persistent: true }));
  console.log('persistent forced id:', pid);
  await page.waitForTimeout(600); // past duration
  const statusPersistent = await page.evaluate(() => ({ forceFlag: !!window._forceTouchControls, pendingCount: window._touchControlsVisibilityCount || 0, display: getComputedStyle(document.getElementById('touch-controls')).display }));
  console.log('status persistent (post-expiry):', statusPersistent);
  if (!statusPersistent.forceFlag) { console.error('FAIL: persistent forced request should maintain forceFlag beyond duration', statusPersistent); process.exitCode = 2; await browser.close(); return; }

  // Now create another forced non-persistent request, then ensure clearing persistent clears forceFlag only after release
  const extra = await page.evaluate(() => window.requestShowTouchControls(200, { force: true, persistent: false }));
  console.log('extra forced id:', extra);
  await page.waitForTimeout(400);
  const mid = await page.evaluate(() => ({ forceFlag: !!window._forceTouchControls, pendingCount: window._touchControlsVisibilityCount || 0 }));
  console.log('mid status after extra expired:', mid);
  if (!mid.forceFlag) { console.error('FAIL: persistent forced should still hold forceFlag after extra expired'); process.exitCode = 2; await browser.close(); return; }

  // Explicitly release persistent and confirm flag clears and controls can hide
  await page.evaluate((id)=>{ window.releaseShowTouchControls(id); }, pid);
  await page.waitForTimeout(250);
  const afterPersistentReleased = await page.evaluate(() => ({ forceFlag: !!window._forceTouchControls, pendingCount: window._touchControlsVisibilityCount || 0, display: getComputedStyle(document.getElementById('touch-controls')).display }));
  console.log('after persistent release:', afterPersistentReleased);
  if (afterPersistentReleased.forceFlag) { console.error('FAIL: forceFlag should be cleared after persistent release'); process.exitCode = 2; await browser.close(); return; }

  // Ensure controls hide after all releases
  try { await page.waitForFunction(() => getComputedStyle(document.getElementById('touch-controls')).display === 'none', { timeout: 1500 }); } catch (e) {}
  const final = await page.evaluate(() => ({ display: getComputedStyle(document.getElementById('touch-controls')).display, pointerEvents: getComputedStyle(document.getElementById('touch-controls')).pointerEvents }));
  console.log('final:', final);
  if (final.display !== 'none') { console.error('FAIL: controls should be hidden after releases'); process.exitCode = 2; await browser.close(); return; }

  console.log('Overlapping forced requests test passed');
  await browser.close();
})();