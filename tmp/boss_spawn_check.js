const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(process.env.TEST_SERVER || 'http://localhost:8000');
  await page.waitForFunction('window.game && window.gameReady', { timeout: 60000 });

  await page.evaluate(() => {
    try {
      if (window.game && typeof window.game.startGame === 'function') {
        window.game.startGame(0);
      }
    } catch (e) {}
  });

  await page.waitForFunction('window.game && window.game.state === "PLAYING"', { timeout: 60000 });

  const result = await page.evaluate(async () => {
    const g = window.game;
    if (!g || !g.level || !g.level.completionConfig) return { error: 'game not ready' };
    const trigger = g.level.completionConfig.bossTriggerX;
    g.player.x = trigger + 20;
    g.player.y = 300;
    await new Promise((r) => setTimeout(r, 350));
    const boss = (g.enemyManager && g.enemyManager.bossInstance) ? g.enemyManager.bossInstance.enemyType : null;
    const encountered = !!g.bossEncountered;
    const spawningEnabled = g.enemyManager ? g.enemyManager.spawningEnabled : null;
    const enemiesCount = g.enemyManager ? g.enemyManager.enemies.length : null;
    return { trigger, encountered, boss, spawningEnabled, enemiesCount };
  });

  console.log('Boss trigger eval:', result);
  await browser.close();
})();
