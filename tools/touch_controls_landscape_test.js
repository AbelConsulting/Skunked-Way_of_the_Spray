const { chromium } = require('playwright');
(async ()=>{
  const browser = await chromium.launch();
  // Mobile landscape viewport
  const context = await browser.newContext({viewport:{width:640,height:360}, deviceScaleFactor:0.75, userAgent: 'Mozilla/5.0 (Linux; Android 9; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0 Mobile Safari/537.36'});
  const page = await context.newPage();
  await page.goto(process.env.TEST_SERVER || 'http://localhost:8000');

  // Wait for game ready
  await page.waitForFunction('window.gameReady === true', { timeout: 15000 });
  console.log('Game is ready');

  // Check if game object exists and is in MENU state
  const gameState = await page.evaluate(() => {
    return {
      gameExists: typeof window.game !== 'undefined',
      gameState: window.game ? window.game.state : null,
      gameReady: window.gameReady
    };
  });
  console.log('Game state check:', gameState);

  // For landscape test, we just need to check if touch controls are present and visible
  // We don't need to start the game - just verify the UI is set up correctly for landscape mobile
  const vis = await page.evaluate(() => {
    const tc = document.getElementById('touch-controls');
    if (!tc) return { present: false };
    const cs = getComputedStyle(tc);
    // Sample a child control to ensure pointer-targets are interactive even if container is inert
    const child = tc.querySelector('.control-group, .touch-btn, #d-pad, #actions, #btn-left');
    const childCs = child ? getComputedStyle(child) : null;
    return { present: true, display: cs.display, containerPointerEvents: tc.style.pointerEvents || cs.pointerEvents, classList: Array.from(tc.classList), childPointerEvents: child ? (child.style.pointerEvents || childCs.pointerEvents) : null };
  });
  console.log('touch-controls visibility:', vis);

  // Assert: we accept the container being inert as long as at least one child accepts pointer events
  if (!vis.present || vis.display === 'none' || vis.classList.includes('hidden') || (vis.containerPointerEvents === 'none' && (!vis.childPointerEvents || vis.childPointerEvents === 'none'))) {
    console.error('Touch controls are not visible or interactive when they should be', vis);
    process.exitCode = 2;
  } else {
    console.log('Touch controls test passed');
  }

  await browser.close();
})();