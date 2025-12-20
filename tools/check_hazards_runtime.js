const { chromium } = require('playwright');
(async ()=>{
  const browser = await chromium.launch();
  const context = await browser.newContext({viewport:{width:640,height:360}, deviceScaleFactor:0.75, userAgent: 'Mozilla/5.0 (Linux; Android 9; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0 Mobile Safari/537.36'});
  const page = await context.newPage();
  await page.goto(process.env.TEST_SERVER || 'http://localhost:8000/?spikes=0');
  // Wait for game initialization
  await page.waitForFunction('window.gameReady === true', { timeout: 10000 }).catch(()=>{});
  const hazards = await page.evaluate(() => ({len: (window.game && window.game.level && window.game.level.hazards) ? window.game.level.hazards.length : -1, spikesDisabled: typeof Config !== 'undefined' ? Config.DISABLE_SPIKES : null}));
  console.log('hazards length', hazards.len, 'Config.DISABLE_SPIKES=', hazards.spikesDisabled);
  await browser.close();
})();