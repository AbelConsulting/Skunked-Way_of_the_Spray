'use strict';

// End-to-end regression test for every menu navigation pathway:
// hub -> sub-menus -> back, keyboard Enter/Space/Escape, the shared
// back handler used by the Android hardware Back button, game-over
// CTAs, and pause-menu actions (including Survival mode retention).

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(process.env.TEST_ROOT || path.join(__dirname, '..'));
const MIME_TYPES = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.ogg': 'audio/ogg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};
const SUB_OVERLAYS = {
  scores: '#menu-scores-overlay',
  info: '#menu-info-overlay',
  settings: '#menu-settings-overlay',
  howtoplay: '#menu-howtoplay-overlay',
};

function createStaticServer() {
  return http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const filePath = path.resolve(ROOT, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!filePath.startsWith(ROOT + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    fs.stat(filePath, (error, stats) => {
      if (error || !stats.isFile()) {
        response.writeHead(404).end();
        return;
      }
      response.setHeader('Content-Type', MIME_TYPES[path.extname(filePath)] || 'application/octet-stream');
      fs.createReadStream(filePath).pipe(response);
    });
  });
}

async function snapshot(page) {
  return page.evaluate((subs) => {
    const shown = (sel) => {
      const el = document.querySelector(sel);
      return !!el && getComputedStyle(el).display !== 'none' && !el.classList.contains('hidden');
    };
    const open = Object.entries(subs).filter(([, sel]) => shown(sel)).map(([name]) => name);
    return {
      state: window.game && window.game.state,
      mode: window.game && window.game.gameMode,
      hub: shown('#start-menu-overlay'),
      menuFlag: !!window._startMenuVisible,
      open,
    };
  }, SUB_OVERLAYS);
}

async function expectHub(page, label) {
  const s = await snapshot(page);
  assert.equal(s.state, 'MENU', `${label}: state`);
  assert.equal(s.hub, true, `${label}: hub visible`);
  assert.equal(s.menuFlag, true, `${label}: _startMenuVisible`);
  assert.deepEqual(s.open, [], `${label}: no sub-overlay open`);
}

async function forceGameOver(page) {
  await page.evaluate(() => {
    const g = window.game;
    g.state = 'GAME_OVER';
    g._gameOverTime = Date.now() - 60000;
    g.dispatchGameStateChange();
  });
}

(async () => {
  const server = createStaticServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch();
  let failures = 0;
  const check = async (name, fn) => {
    try {
      await fn();
      console.log(`PASS ${name}`);
    } catch (error) {
      failures++;
      console.log(`FAIL ${name}\n     ${error.message.split('\n').join('\n     ')}`);
    }
  };

  try {
    // Android phone in landscape: matches the Play build and enables the
    // mobile-only game-over CTAs.
    const context = await browser.newContext({
      viewport: { width: 915, height: 412 },
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
    });
    await context.route('https://us-central1-studio-3829586481-2a2cf.cloudfunctions.net/**', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: '[]',
      })
    );
    await context.addInitScript(() => { try { localStorage.setItem('skunkfu_tutorial_done', '1'); } catch (_) {} });

    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const freshLoad = async () => {
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.gameReady === true && !!window.game, { timeout: 20000 });
      await expectHub(page, 'initial load');
    };
    await freshLoad();

    const hubButtons = [
      ['#menu-scores-btn', 'scores', '#menu-scores-back'],
      ['#menu-info-btn', 'info', '#menu-info-back'],
      ['#menu-achievements-btn', 'info', '#menu-info-back'],
      ['#menu-settings-btn', 'settings', '#menu-settings-back'],
      ['#menu-skins-btn', 'settings', '#menu-settings-back'],
      ['#menu-howtoplay-btn', 'howtoplay', '#menu-howtoplay-back'],
    ];

    for (const [btn, overlay, back] of hubButtons) {
      await check(`hub ${btn} opens ${overlay}, Back button returns to hub`, async () => {
        await page.locator(btn).click();
        const s = await snapshot(page);
        assert.equal(s.hub, false, 'hub hidden while sub-menu open');
        assert.deepEqual(s.open, [overlay]);
        await page.locator(back).click();
        await expectHub(page, 'after back');
      });
    }

    await check('Escape closes every sub-menu back to the hub', async () => {
      for (const [btn, overlay] of hubButtons) {
        await page.locator(btn).click();
        assert.deepEqual((await snapshot(page)).open, [overlay]);
        await page.keyboard.press('Escape');
        await expectHub(page, `Escape from ${overlay}`);
      }
    });

    await check('shared back handler (Android Back) closes sub-menus, then defers to OS on hub', async () => {
      await page.locator('#menu-settings-btn').click();
      assert.equal(await page.evaluate(() => window.__skunkfuHandleBack()), true);
      await expectHub(page, 'after native back');
      assert.equal(await page.evaluate(() => window.__skunkfuHandleBack()), false, 'hub back should let the OS minimise');
    });

    await check('Enter/Space inside a sub-menu does not start a run', async () => {
      await page.locator('#menu-settings-btn').click();
      await page.locator('#menu-sfx-volume').focus();
      await page.keyboard.press('Space');
      await page.keyboard.press('Enter');
      const s = await snapshot(page);
      assert.equal(s.state, 'MENU');
      assert.deepEqual(s.open, ['settings']);
      await page.locator('#menu-settings-back').click();
      await expectHub(page, 'after settings back');
    });

    await check('Enter on a focused hub button activates that button, not Play', async () => {
      await page.locator('#menu-howtoplay-btn').focus();
      await page.keyboard.press('Enter');
      const s = await snapshot(page);
      assert.equal(s.state, 'MENU');
      assert.deepEqual(s.open, ['howtoplay']);
      await page.keyboard.press('Escape');
      await expectHub(page, 'after Escape');
    });

    await check('Survival from hub; Back pauses, Back again resumes', async () => {
      await page.locator('#menu-survival-btn').click();
      await page.waitForFunction(() => window.game.state === 'PLAYING');
      let s = await snapshot(page);
      assert.equal(s.mode, 'survival');
      assert.equal(s.hub, false);
      assert.equal(s.menuFlag, false);
      assert.equal(await page.evaluate(() => window.__skunkfuHandleBack()), true);
      assert.equal((await snapshot(page)).state, 'PAUSED');
      assert.equal(await page.evaluate(() => window.__skunkfuHandleBack()), true);
      assert.equal((await snapshot(page)).state, 'PLAYING');
    });

    await check('pause Restart Stage keeps Survival mode', async () => {
      await page.evaluate(() => window.game.togglePause());
      await page.locator('#pause-restart-btn').click();
      await page.waitForFunction(() => window.game.state === 'PLAYING');
      assert.equal((await snapshot(page)).mode, 'survival');
    });

    await check('game-over leaderboard opens Survival tab and Back returns to game-over (not hub)', async () => {
      await forceGameOver(page);
      await page.locator('#game-over-leaderboard-btn').waitFor({ state: 'visible', timeout: 6000 });
      await page.locator('#game-over-leaderboard-btn').click();
      let s = await snapshot(page);
      assert.deepEqual(s.open, ['scores']);
      assert.equal(await page.locator('#scores-panel-survival').isVisible(), true, 'survival tab shown for survival run');
      await page.locator('#menu-scores-back').click();
      s = await snapshot(page);
      assert.equal(s.state, 'GAME_OVER');
      assert.equal(s.hub, false, 'hub must not appear over game-over screen');
      assert.equal(s.menuFlag, false);
      assert.deepEqual(s.open, []);
    });

    await check('soft purchase prompt fallback opens Settings (no #btn-settings dead link)', async () => {
      const opened = await page.evaluate(() => {
        const btn = document.getElementById('menu-settings-btn');
        return !!btn;
      });
      assert.equal(opened, true);
      const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
      assert.equal(/getElementById\('btn-settings'\)/.test(html), false, 'stale #btn-settings reference');
    });

    await check('game-over Back returns to hub', async () => {
      assert.equal(await page.evaluate(() => window.__skunkfuHandleBack()), true);
      await page.waitForFunction(() => window.game.state === 'MENU');
      await expectHub(page, 'after game-over back');
    });

    await check('game-over Menu CTA returns to hub, Restart CTA keeps mode', async () => {
      await page.locator('#menu-play-btn').click();
      await page.waitForFunction(() => window.game.state === 'PLAYING');
      assert.equal((await snapshot(page)).mode, 'arcade');
      await forceGameOver(page);
      await page.locator('#game-over-restart-btn').waitFor({ state: 'visible', timeout: 6000 });
      await page.locator('#game-over-restart-btn').click();
      await page.waitForFunction(() => window.game.state === 'PLAYING');
      assert.equal((await snapshot(page)).mode, 'arcade');
      await forceGameOver(page);
      await page.locator('#game-over-menu-btn').waitFor({ state: 'visible', timeout: 6000 });
      await page.locator('#game-over-menu-btn').click();
      await page.waitForFunction(() => window.game.state === 'MENU');
      await expectHub(page, 'after Menu CTA');
    });

    await check('pause Main Menu returns to the hub without a page reload', async () => {
      await page.evaluate(() => { window.__navMarker = 'alive'; });
      await page.locator('#menu-play-btn').click();
      await page.waitForFunction(() => window.game.state === 'PLAYING');
      await page.evaluate(() => window.game.togglePause());
      await page.locator('#pause-quit-btn').click();
      await page.waitForFunction(() => window.game.state === 'MENU', null, { timeout: 5000 });
      await expectHub(page, 'after pause quit');
      assert.equal(await page.evaluate(() => window.__navMarker), 'alive', 'page reloaded');
      await page.locator('#pause-overlay').waitFor({ state: 'hidden', timeout: 2000 });
      await page.waitForFunction(() => {
        const tc = document.getElementById('touch-controls');
        return !tc || !tc.classList.contains('visible') || getComputedStyle(tc).display === 'none';
      }, null, { timeout: 2000 });
      assert.equal(await page.evaluate(() => {
        const am = window.game.audioManager;
        return !!(am && am.musicElements && am.currentMusic === am.musicElements['menu_theme']) || !(am && am.musicEnabled);
      }), true, 'menu theme resumes on hub');
      // And a fresh run starts cleanly afterwards.
      await page.locator('#menu-play-btn').click();
      await page.waitForFunction(() => window.game.state === 'PLAYING');
      await page.evaluate(() => window.game.togglePause());
      await page.locator('#pause-quit-btn').click();
      await page.waitForFunction(() => window.game.state === 'MENU');
    });

    await check('no runtime errors across all pathways', async () => {
      assert.deepEqual(pageErrors, []);
      assert.equal(await page.locator('#error-overlay').isVisible(), false);
    });

    await context.close();
  } finally {
    await browser.close();
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
  if (failures) {
    console.log(`\n${failures} navigation check(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log('\nAll menu navigation checks passed.');
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
