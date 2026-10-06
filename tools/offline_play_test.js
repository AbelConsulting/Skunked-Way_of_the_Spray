'use strict';

// Offline "long car ride" check for the Android bundle. Serves the synced
// Capacitor web assets with all internet requests blocked, then:
//  - verifies no ad SDK/ad UI is present or requested
//  - plays real sessions (story + survival) with simulated input
//  - checks the leaderboard and score submit fail gracefully offline
//  - reports frame rate and JS heap growth over the session
// Usage: node tools/offline_play_test.js  (OFFLINE_PLAY_SECONDS=60 default)

const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', 'android/app/src/main/assets/public');
const PLAY_SECONDS = Number(process.env.OFFLINE_PLAY_SECONDS || 60);
const MIME = { '.css': 'text/css', '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const AD_PATTERN = /admob|googleads|googlesyndication|doubleclick|adservice|adsbygoogle|applovin|unityads|ironsrc|vungle|chartboost/i;

function serve() {
  return http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.resolve(ROOT, `.${p === '/' ? '/index.html' : p}`);
    if (!file.startsWith(ROOT + path.sep)) return res.writeHead(403).end();
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) return res.writeHead(404).end();
      res.setHeader('Content-Type', MIME[path.extname(file)] || 'application/octet-stream');
      fs.createReadStream(file).pipe(res);
    });
  });
}

(async () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'index.html')), 'Run `npm run cap:sync` first');
  const server = serve();
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  let failures = 0;
  const check = async (name, fn) => {
    try { await fn(); console.log(`PASS ${name}`); }
    catch (e) { failures++; console.log(`FAIL ${name}\n     ${e.message.split('\n').join('\n     ')}`); }
  };

  try {
    const context = await browser.newContext({
      viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0 Mobile Safari/537.36',
      serviceWorkers: 'block',
    });
    const blocked = [];
    await context.route('**/*', route => {
      const url = route.request().url();
      if (url.startsWith(origin) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
      blocked.push(url);
      return route.abort('internetdisconnected');
    });
    await context.addInitScript(() => {
      window.__forceOffline = true;
      Object.defineProperty(Navigator.prototype, 'onLine', { get: () => !window.__forceOffline });
      window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: {} };
      try { localStorage.setItem('skunkfu_tutorial_done', '1'); } catch (_) {}
    });
    // On device the Capacitor bridge preloads the purchase plugin. Use the
    // real plugin JS with Google Play Billing unreachable (offline).
    await context.addInitScript({ content:
      fs.readFileSync(path.join(__dirname, '..', 'node_modules/cordova-plugin-purchase/www/store.js'), 'utf8') + '\n' +
      `(() => {
        const plugin = window.CdvPurchase, store = plugin.store;
        store.adapters.initialize = async () => [{ isError: true, code: plugin.ErrorCode.SETUP, message: 'Billing service unavailable (offline)', platform: plugin.Platform.GOOGLE_PLAY }];
        store.adapters.findReady = () => undefined;
        store.restorePurchases = async () => undefined;
      })();`,
    });

    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const cdp = await context.newCDPSession(page);
    const heapMB = async () => {
      await cdp.send('HeapProfiler.collectGarbage');
      const { usedSize } = await cdp.send('Runtime.getHeapUsage');
      return usedSize / 1048576;
    };

    const t0 = Date.now();
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await check('game boots offline to the main menu', async () => {
      await page.waitForFunction(() => window.gameReady === true && window.game && window.game.state === 'MENU', null, { timeout: 20000 });
      console.log(`     boot time offline: ${Date.now() - t0} ms`);
      await page.waitForTimeout(3000);
      assert.equal(await page.locator('#error-overlay').isVisible(), false, 'error overlay shown: ' + await page.locator('#error-overlay').innerText());
      assert.deepEqual(errors, []);
    });

    await check('no ad SDK requested and no visible ad UI', async () => {
      assert.deepEqual(blocked.filter(u => AD_PATTERN.test(u)), []);
      const ads = await page.evaluate(() => [...document.querySelectorAll('[id*="ad-" i],[class*="ad-banner" i],[class*="adsbygoogle" i],ins,iframe')]
        .filter(el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; })
        .filter(el => !/remove-ads|ad-free/i.test(el.id))
        .map(el => `${el.tagName}#${el.id}.${el.className}`));
      assert.deepEqual(ads, []);
      const scripts = await page.evaluate(() => [...document.scripts].map(s => s.src + s.textContent.slice(0, 0)).filter(Boolean));
      assert.deepEqual(scripts.filter(s => AD_PATTERN.test(s)), []);
    });

    await check('game fonts are bundled and load with no internet', async () => {
      const loaded = await page.evaluate(async () => {
        await document.fonts.ready;
        const out = {};
        for (const f of ['Press Start 2P', 'Bangers', 'Space Grotesk']) {
          await document.fonts.load(`16px "${f}"`).catch(() => {});
          out[f] = document.fonts.check(`16px "${f}"`) && [...document.fonts].some(ff => ff.family.replace(/"/g, '') === f && ff.status === 'loaded');
        }
        return out;
      });
      assert.deepEqual(loaded, { 'Press Start 2P': true, Bangers: true, 'Space Grotesk': true });
    });

    await check('scores saved offline are queued, then uploaded once back online', async () => {
      const result = await page.evaluate(async () => {
        const stats = { runId: 'offline-test-run', levelsCompleted: 1 };
        const r = await window.Highscores.addScore(4242, 'CAR', stats);
        return { r, pending: window.Highscores.getPendingSubmitCount(), best: JSON.parse(localStorage.getItem('skunkfu.leaderboardPersonalBests.v1') || '{}') };
      });
      assert.equal(result.r, 'queued');
      assert.equal(result.pending, 1);
      assert.ok(Object.values(result.best).includes(4242), 'personal best recorded locally while offline');

      const posted = [];
      await context.route('**/submitScore', route => {
        posted.push(JSON.parse(route.request().postData()));
        return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{"ok":true}' });
      });
      await page.evaluate(() => { window.__forceOffline = false; window.dispatchEvent(new Event('online')); });
      await page.waitForFunction(() => window.Highscores.getPendingSubmitCount() === 0, null, { timeout: 10000 });
      assert.equal(posted.length, 1);
      assert.equal(posted[0].score, 4242);
      assert.equal(posted[0].runId, 'offline-test-run');
      await context.unroute('**/submitScore');
      await page.evaluate(() => { window.__forceOffline = true; });
    });

    const heapStart = await heapMB();

    const playFor = async (seconds, startBtn) => {
      await page.locator(startBtn).click();
      await page.waitForFunction(() => window.game.state === 'PLAYING', null, { timeout: 10000 });
      await page.evaluate(() => {
        window.__frames = 0; window.__worstGap = 0; let last = performance.now();
        const tick = now => { window.__frames++; window.__worstGap = Math.max(window.__worstGap, now - last); last = now; window.__raf = requestAnimationFrame(tick); };
        window.__raf = requestAnimationFrame(tick);
      });
      const keys = ['ArrowRight', 'ArrowRight', 'ArrowLeft', ' ', 'x', 'x', 'z', 'c'];
      const end = Date.now() + seconds * 1000;
      const start = Date.now();
      const seen = new Set();
      let gameOvers = 0;
      while (Date.now() < end) {
        const state = await page.evaluate(() => window.game.state);
        seen.add(state);
        if (state === 'GAME_OVER') {
          gameOvers++;
          await page.evaluate(() => { window.game._gameOverTime = Date.now() - 60000; });
          await page.keyboard.press('Enter');
          await page.waitForTimeout(400);
          if (await page.evaluate(() => window.game.state) !== 'PLAYING') {
            await page.evaluate(() => window.__skunkfuHandleBack && window.__skunkfuHandleBack());
            if (await page.evaluate(() => window.game.state) === 'MENU') await page.locator(startBtn).click();
          }
          continue;
        }
        if (state !== 'PLAYING') { await page.keyboard.press('Enter'); await page.waitForTimeout(200); continue; }
        const k = keys[Math.floor(Math.random() * keys.length)];
        await page.keyboard.down(k);
        await page.waitForTimeout(80 + Math.random() * 200);
        await page.keyboard.up(k);
      }
      const stats = await page.evaluate(() => { cancelAnimationFrame(window.__raf); return { frames: window.__frames, worst: window.__worstGap }; });
      const fps = stats.frames / ((Date.now() - start) / 1000);
      return { fps, worst: stats.worst, gameOvers, states: [...seen] };
    };

    await check(`story mode plays offline for ${PLAY_SECONDS}s without errors`, async () => {
      const r = await playFor(PLAY_SECONDS, '#menu-play-btn');
      console.log(`     avg ${r.fps.toFixed(1)} fps, worst frame gap ${r.worst.toFixed(0)} ms, game overs ${r.gameOvers}, states ${r.states.join('/')}`);
      assert.deepEqual(errors, []);
      assert.ok(r.fps > 30, `fps too low: ${r.fps.toFixed(1)}`);
    });

    await check('pause -> main menu works offline', async () => {
      await page.evaluate(() => window.__skunkfuHandleBack());
      await page.waitForFunction(() => window.game.state === 'PAUSED');
      await page.locator('#pause-quit-btn').first().click();
      await page.waitForFunction(() => window.game.state === 'MENU');
    });

    await check(`survival mode plays offline for ${Math.round(PLAY_SECONDS / 2)}s without errors`, async () => {
      const r = await playFor(Math.round(PLAY_SECONDS / 2), '#menu-survival-btn');
      console.log(`     avg ${r.fps.toFixed(1)} fps, worst frame gap ${r.worst.toFixed(0)} ms, game overs ${r.gameOvers}`);
      assert.deepEqual(errors, []);
    });

    await check('game over + leaderboard degrade gracefully offline (no hang, no error)', async () => {
      await page.evaluate(() => { const g = window.game; g.score = 12345; g.state = 'GAME_OVER'; g._gameOverTime = Date.now() - 60000; g.dispatchGameStateChange(); });
      await page.waitForTimeout(500);
      await page.evaluate(() => window.__skunkfuHandleBack());
      if (await page.evaluate(() => window.game.state) !== 'MENU') await page.evaluate(() => { window.game.state = 'MENU'; window.game.dispatchGameStateChange(); });
      await page.waitForFunction(() => window.game.state === 'MENU');
      await page.locator('#menu-scores-btn').click();
      // Request timeout is 8s; UI must settle well within ~20s and never throw.
      await page.waitForFunction(() => {
        const el = document.querySelector('#menu-scores-overlay');
        return el && !/loading/i.test(el.innerText);
      }, null, { timeout: 25000 });
      const text = await page.locator('#menu-scores-overlay').innerText();
      console.log(`     offline leaderboard shows: "${text.replace(/\s+/g, ' ').slice(0, 140)}"`);
      await page.locator('#menu-scores-back').click();
      assert.deepEqual(errors, []);
    });

    await check('JS heap stays bounded over the session', async () => {
      const heapEnd = await heapMB();
      console.log(`     heap ${heapStart.toFixed(1)} MB -> ${heapEnd.toFixed(1)} MB`);
      assert.ok(heapEnd - heapStart < 40, `heap grew ${(heapEnd - heapStart).toFixed(1)} MB`);
    });

    const hosts = [...new Set(blocked.map(u => new URL(u).host))];
    console.log(`\nBlocked internet hosts attempted while offline: ${hosts.join(', ') || '(none)'}`);
    await check('only optional online services (leaderboard API) are contacted', async () => {
      assert.deepEqual(hosts.filter(h => !/cloudfunctions\.net$|firestore\.googleapis\.com$/.test(h)), []);
    });
  } finally {
    await browser.close();
    server.close();
  }
  if (failures) { console.log(`\n${failures} offline check(s) failed.`); process.exitCode = 1; }
  else console.log('\nAll offline checks passed.');
})().catch(e => { console.error(e); process.exitCode = 1; });
