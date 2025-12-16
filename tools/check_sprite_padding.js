const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log('PAGE:', msg.type(), msg.text());
  });

  const file = 'file://' + path.resolve(__dirname, 'test_sprite_padding.html');
  console.log('Opening', file);
  await page.goto(file, { waitUntil: 'load' });

  // Wait for the loader to run
  await page.waitForSelector('body');
  await page.waitForTimeout(1000);

  const res = await page.evaluate(() => window.__SPRITE_PADDING_RESULT || null);
  console.log('RESULT:', JSON.stringify(res, null, 2));

  let pass = true;
  if (!res) pass = false;
  else {
    for (const [name, obj] of Object.entries(res)) {
      // We expect detectedPad to be a small positive integer (usually 1)
      if (obj && obj.detectedPad && obj.detectedPad > 0) {
        // good
      } else {
        // Not all sprites need detection; consider this a failure only if
        // a known ninja sprite lacks detection
        if (['ninja_idle','ninja_walk','ninja_jump','ninja_attack','ninja_shadow_strike','ninja_hurt'].includes(name)) {
          pass = false;
        }
      }
    }
  }

  await browser.close();
  console.log(pass ? 'SMOKE_TEST: PASS' : 'SMOKE_TEST: FAIL');
  process.exit(pass ? 0 : 2);
})();