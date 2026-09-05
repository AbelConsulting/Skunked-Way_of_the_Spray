'use strict';

// Run after npm run steam:build and npm run steam:demo:build.
// Serve local files through Playwright routing: no server or Steam login needed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'http://skunkfu.test';
const TYPES = {
    '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp',
    '.jpg': 'image/jpeg', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav'
};

async function checkVariant(browser, { name, directory, native = false, bridge = false, full, steam, demo }) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
    try {
        await context.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (url.origin !== ORIGIN) return route.abort();
            const root = path.join(ROOT, directory);
            const file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
            if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
                return route.fulfill({ status: 404, body: '' });
            }
            return route.fulfill({ path: file, contentType: TYPES[path.extname(file)] || 'application/octet-stream' });
        });
        await context.addInitScript(({ native, bridge }) => {
            if (native) window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'android' };
            if (bridge) window.electronAPI = { platform: 'steam' };
        }, { native, bridge });
        const page = await context.newPage();
        await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
        await page.locator('#menu-play-btn').waitFor({ state: 'visible' });

        assert.equal(await page.locator('html').evaluate(el => el.classList.contains('is-full-game')), full, `${name}: installed-game gate`);
        assert.equal((await page.locator('.start-menu-tagline').innerText()).toUpperCase(), full ? 'FULL CAMPAIGN' : 'WEB DEMO BUILD', `${name}: tagline`);
        assert.equal(await page.locator('#menu-steam-store-btn').isVisible(), !full, `${name}: Steam store button`);
        assert.equal(await page.locator('#menu-google-store-btn').isVisible(), !full, `${name}: Google Play store button`);
        assert.equal(await page.locator('.site-landing').evaluate(el => getComputedStyle(el).display === 'none'), full, `${name}: browser landing banner`);

        if (full) {
            const menu = await page.locator('#start-menu-overlay').innerText();
            assert.doesNotMatch(menu, /Web Demo Build|curated browser demo|Full game on stores/i);
            assert.match(await page.locator('#menu-play-btn').innerText(), /Start Game/i);
            assert.equal((await page.locator('.start-menu-hub-title').innerText()).toUpperCase(), 'MAIN MENU');
            if (steam) {
                assert.equal((await page.locator('.start-menu-eyebrow .steam-only').innerText()).toUpperCase(), 'STEAM');
                assert.doesNotMatch(menu, /Google Play|Touch-ready|Play Games/i);
            } else {
                assert.match(menu, /Google Play/i);
                assert.match(await page.locator('#menu-play-btn').innerText(), /Touch-ready/i);
            }
        }
        if (directory === 'dist-steam') {
            assert.equal(await page.title(), 'Skunked: Way of the Spray');
            assert.equal(await page.evaluate(() => window.STEAM_DEMO), false);
        }
        if (demo) assert.equal(await page.evaluate(() => window.STEAM_DEMO), true);

        await page.waitForFunction(() => window.game && window.game._campaignStageCap > 0, null, { timeout: 60000 });
        const runtime = await page.evaluate(() => ({
            capped: window.game._isCappedDemoRuntime,
            steamDemo: window.game._isSteamDemoRuntime,
            cap: window.game._campaignStageCap,
            total: window.game._totalCampaignStages
        }));
        assert.equal(runtime.capped, !full, `${name}: campaign cap enabled`);
        assert.equal(runtime.steamDemo, demo, `${name}: Steam demo runtime`);
        assert.equal(runtime.cap, full ? runtime.total : 2, `${name}: playable stage count`);
        if (full) assert.ok(runtime.cap > 2, `${name}: full campaign extends beyond demo`);
        console.log(`PASS ${name}: correct home screen; ${runtime.cap}/${runtime.total} stages available`);
    } finally {
        await context.close();
    }
}

(async () => {
    for (const dir of ['dist-steam', 'dist-steam-demo']) {
        assert.ok(fs.existsSync(path.join(ROOT, dir, 'index.html')), `Build ${dir} before running this test`);
    }
    const browser = await chromium.launch();
    try {
        for (const variant of [
            { name: 'Full Steam build', directory: 'dist-steam', full: true, steam: true, demo: false },
            { name: 'Steam bridge fallback', directory: '', bridge: true, full: true, steam: true, demo: false },
            { name: 'Browser demo', directory: '', full: false, steam: false, demo: false },
            { name: 'Capacitor full game', directory: '', native: true, full: true, steam: false, demo: false },
            { name: 'Separate Steam demo', directory: 'dist-steam-demo', full: false, steam: true, demo: true }
        ]) await checkVariant(browser, variant);
    } finally {
        await browser.close();
    }
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});