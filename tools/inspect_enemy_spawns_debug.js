const { chromium } = require('playwright');
(async ()=>{
  const browser = await chromium.launch();
  const context = await browser.newContext({viewport:{width:640,height:360}, deviceScaleFactor:0.75, userAgent: 'Mozilla/5.0 (Linux; Android 9; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0 Mobile Safari/537.36'});
  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  await page.goto(process.env.TEST_SERVER || 'http://localhost:8000');

  await page.waitForFunction('window.game && window.gameReady', { timeout: 60000 });
  console.log('Detected window.game and window.gameReady');

  // Start the game if not started
  await page.evaluate(() => { try { if (window.game && typeof window.game.startGame === 'function') { window.game.startGame(); } else { window.dispatchEvent(new CustomEvent('gameStateChange', { detail: { state: 'PLAYING' } })); } } catch (e) { console.error('start failed', e); } });
  await page.waitForFunction('window.game && window.game.state === "PLAYING"', { timeout: 60000 });
  console.log('Game in PLAYING state');

  // Poll enemy counts for 12 seconds
  const samples = [];
  for (let i = 0; i < 24; i++) {
    const snap = await page.evaluate(() => {
      try {
        const em = window.game && window.game.enemyManager ? window.game.enemyManager : null;
        return {
          t: Date.now(),
          enemies: em ? (em.enemies && em.enemies.length ? em.enemies.length : 0) : null,
          spawnTimer: em ? em.spawnTimer : null,
          spawnInterval: em ? em.spawnInterval : null,
          lastEnemyTypes: em && em.enemies ? em.enemies.slice(-3).map(e => e.enemyType) : []
        };
      } catch (e) { return { error: String(e) }; }
    });
    samples.push(snap);
    await page.waitForTimeout(500);
  }

  console.log('enemy samples:', samples);
  await browser.close();
})();