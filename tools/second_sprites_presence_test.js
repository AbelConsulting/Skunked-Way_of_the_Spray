const { chromium } = require('playwright');
(async ()=>{
  const browser = await chromium.launch();
  const context = await browser.newContext({viewport:{width:640,height:360}, deviceScaleFactor:0.75});
  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

  // Install an init script to report sprite loads reliably by intercepting Image.src
  await context.addInitScript(() => {
    try {
      window.__sprite_load_reporter = window.__sprite_load_reporter || [];
      const desc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
      if (desc && desc.set && !desc._patched) {
        const origSet = desc.set;
        Object.defineProperty(HTMLImageElement.prototype, 'src', {
          configurable: true,
          enumerable: desc.enumerable,
          get: desc.get,
          set: function(v) {
            try {
              // report on successful load of enemy sprite images
              const self = this;
              const reportIfEnemy = () => {
                try {
                  if (typeof v === 'string' && v.indexOf('assets/sprites/enemies/second_') !== -1) {
                    try { window.__sprite_load_reporter.push({ name: v.split('/').pop().split('?')[0], path: v }); } catch (e) {}
                  }
                } catch (e) {}
              };
              this.addEventListener('load', reportIfEnemy, { once: true });
            } catch (e) {}
            return origSet.call(this, v);
          }
        });
      }
    } catch (e) {}
  });

  await page.goto(process.env.TEST_SERVER || 'http://localhost:8000');
  // Wait until all second_* sprites are loaded (no need to wait for all sprites)
  const start = Date.now();
  let ok = false;
  while (Date.now() - start < 30000) {
    const info = await page.evaluate(() => {
      const reporter = window.__sprite_load_reporter || [];
      const names = reporter.map(r => r.name);
      return { reporter, names };
    });
    const baseNames = info.names.map(n => n.replace(/\.[a-z0-9]+$/i, ''));
    console.log('reported sprites count:', info.reporter.length, 'names:', info.names.join(', '), 'bases:', baseNames.join(', '));
    if (baseNames.includes('second_idle') && baseNames.includes('second_walk') && baseNames.includes('second_attack') && baseNames.includes('second_hurt')) { ok = true; break; }
    await page.waitForTimeout(500);
  }
  if (!ok) {
    console.error('Timeout waiting for second_* sprites');
    process.exitCode = 2;
    await browser.close();
    return;
  }

  // The Image.src interceptor already reported successful loads, consider this a pass
  console.log('PASS: second_* sprites were requested and loaded (reported by Image.src interceptor)');
  await browser.close();
})();