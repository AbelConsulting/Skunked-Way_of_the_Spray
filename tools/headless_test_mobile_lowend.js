const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  // Low-end device emulation: smaller viewport and lower devicePixelRatio
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 360, height: 640 },
    deviceScaleFactor: 0.75,
    userAgent: 'Mozilla/5.0 (Linux; Android 7.0; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0 Mobile Safari/537.36'
  });
  const page = await context.newPage();

  const logs = [];
  page.on('console', msg => logs.push({type: msg.type(), text: msg.text()}));
  page.on('pageerror', err => logs.push({type: 'pageerror', text: err.message}));

  const SERVER = process.env.TEST_SERVER || 'http://localhost:8000';
  await page.goto(SERVER);

  // Wait for game readiness
  await page.waitForFunction('window.gameReady === true', { timeout: 15000 }).catch(() => {});

  // Inject frame counter
  await page.evaluate(() => {
    window._frameTimes = [];
    (function() {
      const raf = window.requestAnimationFrame;
      window.requestAnimationFrame = function(cb) {
        return raf(function(t) {
          window._frameTimes.push(t);
          if (window._frameTimes.length > 240) window._frameTimes.shift();
          cb(t);
        });
      };
    })();
  });

  // Start the game by sending Enter (simulate user)
  await page.keyboard.press('Enter');

  // Run for 7 seconds
  await page.waitForTimeout(7000);

  // Compute approximate FPS from frame times
  const frames = await page.evaluate(() => {
    const times = window._frameTimes || [];
    if (times.length < 2) return 0;
    const dt = (times[times.length-1] - times[0]) / (times.length-1);
    return Math.round(1000 / dt);
  });

  // Screenshot and save logs
  await page.screenshot({ path: 'tools/game_screenshot_mobile_lowend.png', fullPage: true });
  fs.writeFileSync('tools/headless_logs_mobile_lowend.json', JSON.stringify({logs, fps: frames, device: 'low-end-emulation'}, null, 2));

  console.log('Low-end mobile headless test finished. FPS estimate:', frames);
  console.log('Saved screenshot to tools/game_screenshot_mobile_lowend.png and logs to tools/headless_logs_mobile_lowend.json');

  await browser.close();
})();