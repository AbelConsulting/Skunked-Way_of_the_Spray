const { webkit } = require('playwright');
const fs = require('fs');
(async () => {
  const SERVER = process.env.TEST_SERVER || 'http://localhost:8000';

  // Emulate Safari (WebKit) on a mobile device in landscape
  const browser = await webkit.launch();
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    deviceScaleFactor: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15A372 Safari/604.1'
  });
  const page = await context.newPage();

  const logs = [];
  page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => logs.push({ type: 'pageerror', text: err.message }));

  try {
    await page.goto(SERVER, { waitUntil: 'load', timeout: 15000 });
  } catch (e) {
    console.error('nav failed', e.message);
    await browser.close();
    process.exit(1);
  }

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

  // Start the game by sending Enter
  await page.keyboard.press('Enter');

  // Let it run for 7s
  await page.waitForTimeout(7000);

  const frames = await page.evaluate(() => {
    const times = window._frameTimes || [];
    if (times.length < 2) return 0;
    const dt = (times[times.length-1] - times[0]) / (times.length-1);
    return Math.round(1000 / dt);
  });

  const screenshotPath = 'tools/game_screenshot_safari.png';
  const logsPath = 'tools/headless_logs_safari.json';

  await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
  fs.writeFileSync(logsPath, JSON.stringify({ logs, fps: frames, device: 'safari-mobile-emulation' }, null, 2));

  console.log('Safari (WebKit) mobile-emulation test finished. FPS estimate:', frames);
  console.log('Saved screenshot to', screenshotPath, 'and logs to', logsPath);

  await browser.close();
})();