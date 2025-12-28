const { chromium } = require('playwright');
(async ()=>{
  const browser = await chromium.launch();
  const context = await browser.newContext({viewport:{width:640,height:360}});
  const page = await context.newPage();
  page.on('console', m => console.log('PAGE LOG:', m.text()));
  await page.goto(process.env.TEST_SERVER || 'http://localhost:8000');
  await page.waitForFunction('window.spriteLoader && (window.spriteLoader.sprites || window.spriteLoader._missing)', { timeout: 30000 });
  const info = await page.evaluate(() => {
    const s = window.spriteLoader;
    if (!s) return {error:'no spriteLoader'};
    const sprites = s.sprites;
    return {
      spritesType: sprites ? (sprites.constructor && sprites.constructor.name) : null,
      ownProps: sprites ? Object.getOwnPropertyNames(sprites) : null,
      keys: sprites ? Object.keys(sprites) : null,
      hasSecond: sprites ? !!sprites.second_idle : null,
      missing: s._missing ? s._missing.map(m => m.name) : null
    };
  });
  console.log('inspect result:', info);
  await browser.close();
})();