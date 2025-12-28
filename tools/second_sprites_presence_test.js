const { chromium } = require('playwright');
(async ()=>{
  const browser = await chromium.launch();
  const context = await browser.newContext({viewport:{width:640,height:360}, deviceScaleFactor:0.75});
  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

  await page.goto(process.env.TEST_SERVER || 'http://localhost:8000');
  // Wait for spriteLoader and sprite load to complete
  await page.waitForFunction('window.spriteLoader && window.spriteLoader.sprites && Object.keys(window.spriteLoader.sprites).length >= 18', { timeout: 30000 });

  // Assert second_* sprites are present and not in missing list
  const result = await page.evaluate(() => {
    const names = ['second_idle','second_walk','second_attack','second_hurt'];
    const sprites = window.spriteLoader && window.spriteLoader.sprites ? window.spriteLoader.sprites : {};
    const missing = window.spriteLoader && window.spriteLoader._missing ? window.spriteLoader._missing.map(m=>m.name) : [];
    const checks = names.map(n => ({ name: n, present: !!sprites[n], missing: missing.includes(n), size: sprites[n] ? (sprites[n].width || sprites[n].naturalWidth || 0) : 0 }));
    return checks;
  });

  console.log('second sprite checks:', result);

  const pass = result.every(r => r.present && !r.missing && r.size > 0);
  if (!pass) {
    console.error('FAIL: second_* sprites not all loaded', result);
    process.exitCode = 2;
    await browser.close();
    return;
  }

  console.log('PASS: all second_* sprites loaded correctly');
  await browser.close();
})();