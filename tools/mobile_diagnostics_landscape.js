const { chromium, devices } = require('playwright');
(async () => {
  const device = devices['iPhone 12'];
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...device, viewport: { width: 844, height: 390 } });
  const page = await context.newPage();

  const SERVER = process.env.TEST_SERVER || 'http://localhost:8000';
  await page.goto(SERVER);
  await page.waitForTimeout(1000);

  const info = await page.evaluate(() => {
    const qs = sel => document.querySelector(sel);
    const getVis = el => el ? (el.offsetParent !== null && window.getComputedStyle(el).visibility !== 'hidden') : false;
    const rect = el => el ? el.getBoundingClientRect() : null;

    const canvas = qs('#game-canvas');
    let pixelSample = null;
    try {
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(0,0,1,1).data;
      pixelSample = Array.from(data);
    } catch (e) {
      pixelSample = 'error';
    }

    return {
      userAgent: navigator.userAgent,
      gameReady: window.gameReady || false,
      rotateMessageVisible: getVis(qs('#rotate-message')),
      mobileStartVisible: getVis(qs('#mobile-start-overlay')),
      mobileRestartVisible: getVis(qs('#mobile-restart-overlay')),
      loadingVisible: getVis(qs('#loading-screen')),
      touchControlsVisible: getVis(qs('#touch-controls')),
      touchControlsRect: rect(qs('#touch-controls')),
      btnLeftRect: rect(qs('#btn-left')),
      btnRightRect: rect(qs('#btn-right')),
      btnAttackRect: rect(qs('#btn-attack')),
      btnSpecialRect: rect(qs('#btn-special')),
      canvasSamplePixel: pixelSample
    };
  });

  console.log('Mobile Landscape Diagnostics:', JSON.stringify(info, null, 2));

  await browser.close();
})();