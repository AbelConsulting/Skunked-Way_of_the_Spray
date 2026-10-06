const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 360, height: 640 },
      deviceScaleFactor: 0.75,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 9; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    const server = process.env.TEST_SERVER || 'http://localhost:8000';
    await page.goto(server, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => window.gameReady === true && window.game && window.game.state === 'MENU',
      { timeout: 15000 }
    );

    const portraitState = await page.evaluate(() => ({
      landscape: window.innerWidth > window.innerHeight,
      menuVisible: !document.getElementById('start-menu-overlay').classList.contains('hidden')
    }));
    assert.equal(portraitState.landscape, false, 'test must begin in portrait');
    assert.equal(portraitState.menuVisible, true, 'start menu should be available in portrait');

    await page.setViewportSize({ width: 640, height: 360 });
    await page.evaluate(() => {
      window.dispatchEvent(new Event('orientationchange'));
      window.dispatchEvent(new Event('resize'));
    });
    await page.waitForFunction(() => window.innerWidth > window.innerHeight);
    await page.locator('#menu-play-btn').click();
    await page.waitForFunction(
      () => window.game && window.game.state === 'PLAYING',
      { timeout: 10000 }
    );

    const gameplay = await page.evaluate(() => ({
      state: window.game.state,
      canvasWidth: document.getElementById('game-canvas').width,
      canvasHeight: document.getElementById('game-canvas').height,
      touchControlsVisible: getComputedStyle(document.getElementById('touch-controls')).display !== 'none',
      rotatePromptVisible: getComputedStyle(document.getElementById('rotate-message')).display !== 'none'
    }));
    assert.equal(gameplay.state, 'PLAYING');
    assert.ok(gameplay.canvasWidth > 0 && gameplay.canvasHeight > 0, 'game canvas should be sized');
    assert.equal(gameplay.touchControlsVisible, true, 'landscape touch controls should be available');
    assert.equal(gameplay.rotatePromptVisible, false, 'rotate prompt should be dismissed');
    assert.deepEqual(pageErrors, [], 'game should start without uncaught page errors');

    console.log('PASS portrait-to-landscape start menu flow:', gameplay);
    await context.close();
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
