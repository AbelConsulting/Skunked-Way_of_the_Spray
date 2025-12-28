const { chromium } = require('playwright');
(async ()=>{
  const browser = await chromium.launch();
  const context = await browser.newContext({viewport:{width:640,height:360}, deviceScaleFactor:0.75});
  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

  await page.goto(process.env.TEST_SERVER || 'http://localhost:8000');
  await page.waitForFunction('window.spriteLoader && Object.keys(window.spriteLoader.sprites).length > 0', { timeout: 30000 });

  const sprites = await page.evaluate(() => {
    const s = window.spriteLoader && window.spriteLoader.sprites ? Object.keys(window.spriteLoader.sprites) : [];
    const missing = window.spriteLoader && window.spriteLoader._missing ? window.spriteLoader._missing.slice() : [];
    return { sprites: s, missing };
  });

  console.log('Loaded sprites:', sprites.sprites.sort());
  console.log('Missing assets:', sprites.missing);

  await browser.close();
})();