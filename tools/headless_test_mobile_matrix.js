const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const SERVER = process.env.TEST_SERVER || 'http://localhost:8000';

  const devices = [
    { name: 'lowend', viewport: { width: 360, height: 640 }, deviceScaleFactor: 0.75, userAgent: 'Mozilla/5.0 (Linux; Android 7.0; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0 Mobile Safari/537.36', cameraStart: 'bottom-left' },
    { name: 'narrow', viewport: { width: 360, height: 800 }, deviceScaleFactor: 2, userAgent: 'Mozilla/5.0 (Linux; Android 9; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0 Mobile Safari/537.36' },
    { name: 'tall', viewport: { width: 412, height: 915 }, deviceScaleFactor: 3, userAgent: 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0 Mobile Safari/537.36' },
    { name: 'pixel6', viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, userAgent: 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0 Mobile Safari/537.36' },
    { name: 'galaxy-s9', viewport: { width: 360, height: 740 }, deviceScaleFactor: 3, userAgent: 'Mozilla/5.0 (Linux; Android 8.0; SM-G960U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0 Mobile Safari/537.36' }
  ];

  const browser = await chromium.launch();
  const results = [];

  for (const d of devices) {
    const context = await browser.newContext({ viewport: d.viewport, deviceScaleFactor: d.deviceScaleFactor, userAgent: d.userAgent });
    const page = await context.newPage();

    const logs = [];
    page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));
    page.on('pageerror', err => logs.push({ type: 'pageerror', text: err.message }));

    try {
      await page.goto(SERVER, { waitUntil: 'load', timeout: 15000 });
    } catch (e) {
      logs.push({ type: 'error', text: `nav failed: ${e.message}` });
      results.push({ device: d.name, success: false, error: e.message });
      await context.close();
      continue;
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

    // Optionally set camera start mode for this run
    if (d.cameraStart) {
      await page.evaluate((cs) => {
        try {
          if (window.Config) window.Config.CAMERA_START = cs;
          if (window.game) {
            window.game.viewWidth = window.game.viewWidth || window.innerWidth;
            window.game.viewHeight = window.game.viewHeight || window.innerHeight;
          }
        } catch (e) { }
      }, d.cameraStart).catch(() => {});
    }
    // Start the game by sending Enter
    await page.keyboard.press('Enter');

    // Run for 7s
    await page.waitForTimeout(7000);

    const frames = await page.evaluate(() => {
      const times = window._frameTimes || [];
      if (times.length < 2) return 0;
      const dt = (times[times.length-1] - times[0]) / (times.length-1);
      return Math.round(1000 / dt);
    });

    const screenshotPath = `tools/game_screenshot_${d.name}.png`;
    const logsPath = `tools/headless_logs_${d.name}.json`;

    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    fs.writeFileSync(logsPath, JSON.stringify({ logs, fps: frames, device: d }, null, 2));

    console.log(`Finished ${d.name}: FPS estimate`, frames);
    results.push({ device: d.name, fps: frames, screenshot: screenshotPath, logs: logsPath });

    await context.close();
  }

  await browser.close();
  console.log('Matrix run complete:', results);
  fs.writeFileSync('tools/headless_matrix_results.json', JSON.stringify(results, null, 2));
})();
