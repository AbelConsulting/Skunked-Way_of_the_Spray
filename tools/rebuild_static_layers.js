const { chromium } = require('playwright');
const fs = require('fs');
(async ()=>{
  const browser = await chromium.launch();
  const context = await browser.newContext({viewport:{width:1280,height:720}});
  const page = await context.newPage();
  const server = process.env.TEST_SERVER || 'http://localhost:8000';
  console.log('Visiting', server);
  await page.goto(server, { waitUntil: 'load' });
  await page.waitForFunction('window.gameReady === true', { timeout: 10000 }).catch(()=>{});

  // Force static layer rebuild if function exists
  const rebuilt = await page.evaluate(() => {
    try {
      if (typeof window.rebuildStaticLayer === 'function') {
        window.rebuildStaticLayer();
        return true;
      }
      if (window.game && window.game.level && typeof window.game.level.renderStaticLayer === 'function') {
        try { window.game.level.renderStaticLayer(window.game.viewWidth, window.game.viewHeight); return true; } catch (e) { return false; }
      }
      return false;
    } catch (e) { return false; }
  });
  console.log('rebuild invoked?', rebuilt);

  // Wait a moment for rendering to complete
  await page.waitForTimeout(500);

  // Screenshot the canvas area to confirm spikes removed
  const canvas = await page.$('#game-canvas');
  if (canvas) {
    const buf = await canvas.screenshot();
    const out = 'tmp-frames/rebuild_static_screenshot.png';
    fs.writeFileSync(out, buf);
    console.log('Saved canvas screenshot to', out);
  } else {
    await page.screenshot({ path: 'tmp-frames/rebuild_fullpage.png', fullPage: true });
    console.log('Saved fullpage screenshot to tmp-frames/rebuild_fullpage.png');
  }

  await browser.close();
})();