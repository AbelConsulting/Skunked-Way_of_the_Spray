#!/usr/bin/env node
const { chromium } = require('playwright');

(async () => {
  // Default to the Pages URL if no argument is provided
  const url = process.argv[2] || 'https://skunkfu-game.pages.dev';
  console.log('Playwright smoke test for:', url);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleMsgs = [];
  page.on('console', msg => {
    consoleMsgs.push({ type: msg.type(), text: msg.text() });
  });

  const failedRequests = [];
  page.on('requestfailed', req => {
    const f = req.failure ? req.failure().errorText : 'unknown';
    failedRequests.push({ url: req.url(), error: f });
  });

  page.on('response', resp => {
    // just record some responses for debugging
    // console.log('RESPONSE', resp.status(), resp.url());
  });

  try {
    const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Main page status:', response && response.status());
  } catch (e) {
    console.error('Navigation failed:', e && e.message);
    await browser.close();
    process.exit(2);
  }

  // allow any lazy loads to finish
  await page.waitForTimeout(2000);

  const errors = consoleMsgs.filter(m => m.type === 'error' || m.type === 'warning');
  if (consoleMsgs.length) console.log('Console messages (first 20):', consoleMsgs.slice(0, 20));
  if (errors.length) console.log('Console errors/warnings:', errors);
  if (failedRequests.length) console.log('Failed network requests:', failedRequests);

  const checkAssets = await page.evaluate(async () => {
    const urls = ['/bundle.js','/styles.css','/assets/sprites/characters/ninja_idle.png','/assets/audio/music/gameplay.wav'];
    const results = {};
    for (const u of urls) {
      try {
        const r = await fetch(u, { method: 'GET' });
        results[u] = { ok: r.ok, status: r.status, contentType: r.headers.get('content-type') };
      } catch (e) {
        results[u] = { error: String(e) };
      }
    }
    return results;
  });

  console.log('Asset checks:', JSON.stringify(checkAssets, null, 2));

  await browser.close();

  const failed = (errors.length > 0) || failedRequests.length > 0 || Object.values(checkAssets).some(v => (v && v.ok === false) || v.error);
  if (failed) {
    console.error('Smoke test failed');
    process.exit(3);
  }
  console.log('Smoke test passed');
  process.exit(0);
})();