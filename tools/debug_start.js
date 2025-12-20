const { chromium } = require('playwright');
(async ()=>{
  const browser = await chromium.launch();
  const context = await browser.newContext({viewport:{width:640,height:360}, deviceScaleFactor:0.75, userAgent: 'Mozilla/5.0 (Linux; Android 9; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0 Mobile Safari/537.36'});
  const page = await context.newPage();

  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGEERROR:', err.message));

  await page.goto('http://localhost:8000');
  await page.waitForTimeout(2000);
  const scripts = await page.evaluate(()=>Array.from(document.scripts).map(s => ({src: s.src, nonce: s.nonce, async: s.async, defer: s.defer})).slice(0,20));
  console.log('scripts snapshot:', scripts);
  const ready = await page.evaluate(() => ({ gameReady: !!window.gameReady, state: (window.game && window.game.state) || null }));
  console.log('page ready state:', ready);

  const touch = await page.evaluate(()=>{
    const tc = document.getElementById('touch-controls');
    const ms = document.getElementById('mobile-start-overlay');
    return {
      touchExists: !!tc,
      touchDisplay: tc ? getComputedStyle(tc).display : null,
      touchOpacity: tc ? getComputedStyle(tc).opacity : null,
      mobileStartDisplay: ms ? getComputedStyle(ms).display : null,
      mobileStartClass: ms ? Array.from(ms.classList) : [],
      debugLog: window.touchDebug || []
    };
  });
  console.log('touch info:', { touchExists: touch.touchExists, touchDisplay: touch.touchDisplay, touchOpacity: touch.touchOpacity, mobileStartDisplay: touch.mobileStartDisplay, mobileStartClass: touch.mobileStartClass, debugLogLen: (touch.debugLog||[]).length });
  // Print last few debug entries for easier diagnosis
  const debugLog = (touch.debugLog || []).slice(-10);
  if (debugLog.length) console.log('last touchDebug entries:', debugLog);
  await browser.close();
})();
