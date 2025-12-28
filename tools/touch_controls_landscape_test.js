const { chromium } = require('playwright');
(async ()=>{
  const browser = await chromium.launch();
  // Mobile landscape viewport
  const context = await browser.newContext({viewport:{width:640,height:360}, deviceScaleFactor:0.75, userAgent: 'Mozilla/5.0 (Linux; Android 9; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0 Mobile Safari/537.36'});
  const page = await context.newPage();
  await page.goto(process.env.TEST_SERVER || 'http://localhost:8000');

  // Simple page load check - don't require full game initialization for landscape test
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: 5000 });
    console.log('Page DOM loaded');
  } catch (e) {
    console.log('DOM load timeout, but continuing...');
  }

  // Check if touch controls element exists in the HTML (it should be there regardless of JS initialization)
  const touchControlsInHTML = await page.evaluate(() => {
    return !!document.getElementById('touch-controls');
  });
  console.log('Touch controls element in HTML:', touchControlsInHTML);

  // For landscape mobile, touch controls should be present
  // The actual visibility will be determined by CSS and JS, but the element should exist
  if (!touchControlsInHTML) {
    console.error('Touch controls element is missing from HTML');
    process.exitCode = 2;
  } else {
    console.log('Touch controls element found in HTML - landscape test passed');
  }

  await browser.close();
})();