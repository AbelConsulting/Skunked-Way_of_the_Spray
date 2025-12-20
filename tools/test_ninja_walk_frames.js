const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG>', msg.text()));
  await page.goto(process.env.TEST_SERVER || 'http://localhost:8000');
  // Give some time for sprite loader to finish
  await page.waitForTimeout(1500);

  const info = await page.evaluate(() => {
    try {
      const anim = spriteLoader.createAnimation('ninja_walk', 4);
      return { frameWidth: anim.frameWidth, frameHeight: anim.frameHeight, frameStride: anim.frameStride, frameOffset: anim.frameOffset };
    } catch (e) {
      return { error: String(e) };
    }
  });
  console.log('anim info:', info);
  await browser.close();
})();