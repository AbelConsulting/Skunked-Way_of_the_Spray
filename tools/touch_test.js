const { chromium, devices } = require('playwright');
(async () => {
  const device = devices['iPhone 12'];
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...device, viewport: { width: 844, height: 390 } });
  const page = await context.newPage();

  const SERVER = process.env.TEST_SERVER || 'http://localhost:8000';
  await page.goto(SERVER);
  await page.waitForTimeout(800);

  await page.evaluate(() => {
    window._lastKeys = [];
    window.addEventListener('keydown', e => window._lastKeys.push(e.key));
    // ensure start overlay hidden for test
    const start = document.getElementById('mobile-start-overlay');
    if (start) start.style.display = 'none';
    // Initialize touch controls handlers in case they haven't been attached yet
    if (typeof initTouchControls === 'function') initTouchControls();
  });

  await page.dispatchEvent('#btn-attack', 'pointerdown', { pointerType: 'touch' });
  await page.dispatchEvent('#btn-attack', 'pointerup', { pointerType: 'touch' });
  await page.dispatchEvent('#btn-special', 'pointerdown', { pointerType: 'touch' });
  await page.dispatchEvent('#btn-special', 'pointerup', { pointerType: 'touch' });
  await page.dispatchEvent('#btn-jump', 'pointerdown', { pointerType: 'touch' });
  await page.dispatchEvent('#btn-jump', 'pointerup', { pointerType: 'touch' });

  const keys = await page.evaluate(() => window._lastKeys);
  console.log('Captured keys:', keys);

  await browser.close();
})();