const { chromium, devices } = require('playwright');
const fs = require('fs');
(async () => {
  const device = devices['iPhone 12'];
  const browser = await chromium.launch();
  const context = await browser.newContext({ ...device });
  const page = await context.newPage();

  const logs = [];
  page.on('console', msg => logs.push({type: msg.type(), text: msg.text()}));
  page.on('pageerror', err => logs.push({type: 'pageerror', text: err.message}));

  const SERVER = process.env.TEST_SERVER || 'http://localhost:8000';
  await page.goto(SERVER);

  // Wait for readiness
  await page.waitForFunction('window.gameReady === true', { timeout: 15000 }).catch(() => {});

  // Inject frame counter
  await page.evaluate(() => {
    window._frameTimes = [];
    (function() {
      const raf = window.requestAnimationFrame;
      window.requestAnimationFrame = function(cb) {
        return raf(function(t) {
          window._frameTimes.push(t);
          if (window._frameTimes.length > 120) window._frameTimes.shift();
          cb(t);
        });
      };
    })();
  });

  // Start game
  await page.keyboard.press('Enter');

  // Let run for 7s to get stable sample
  await page.waitForTimeout(7000);

  const frames = await page.evaluate(() => {
    const times = window._frameTimes || [];
    if (times.length < 2) return 0;
    const dt = (times[times.length-1] - times[0]) / (times.length-1);
    return Math.round(1000 / dt);
  });

  await page.screenshot({ path: 'tools/game_screenshot_mobile.png', fullPage: true });
  fs.writeFileSync('tools/headless_logs_mobile.json', JSON.stringify({logs, fps: frames, device: 'iPhone 12'}, null, 2));

  console.log('Mobile headless test finished. FPS estimate:', frames);
  console.log('Saved screenshot to tools/game_screenshot_mobile.png and logs to tools/headless_logs_mobile.json');

  await browser.close();
})();