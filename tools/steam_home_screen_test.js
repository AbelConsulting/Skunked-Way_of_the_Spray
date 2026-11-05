'use strict';

// Run after npm run steam:build and npm run steam:demo:build.
// Use --main-only or --demo-only to validate releases independently.
// Add --packaged to check main Windows/Linux and demo Windows renderer assets.
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
        const expectedTagline = full ? 'FULL CAMPAIGN' : (demo ? 'STEAM DEMO BUILD' : 'WEB DEMO BUILD');
        assert.equal((await page.locator('.start-menu-tagline').innerText()).toUpperCase(), expectedTagline, `${name}: tagline`);
        assert.equal(await page.locator('#menu-steam-store-btn').isVisible(), !full, `${name}: Steam store button`);
        if (demo) {
            assert.equal(await page.locator('#menu-google-store-btn').count(), 0, `${name}: Google Play store button removed`);
            assert.equal(await page.locator('a[href*="play.google.com/store"]').count(), 0, `${name}: Google Play CTA links removed`);
        } else {
            assert.equal(await page.locator('#menu-google-store-btn').isVisible(), !full, `${name}: Google Play store button`);
        }
        if (full) {
            assert.equal(await page.locator('.site-landing').isVisible(), false, `${name}: no browser landing banner`);
        }

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
        if (steam && full && !bridge) {
            assert.equal(await page.title(), 'Skunked: Way of the Spray');
            assert.equal(await page.evaluate(() => window.STEAM_DEMO), false);
        }
        if (demo) {
            assert.equal(await page.title(), 'Skunked: Way of the Spray — Demo', `${name}: window title`);
            assert.equal(await page.evaluate(() => window.STEAM_DEMO), true);
            assert.equal(await page.evaluate(() => window.STEAM_APP_ID), 5226570, `${name}: demo App ID`);
            assert.match(await page.locator('#menu-steam-store-btn').getAttribute('href'), /\/app\/4815180\/?$/, `${name}: full-game store destination`);
        }

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
        if (demo) {
            await page.locator('#menu-play-btn').click();
            await page.waitForFunction(() => window.game.state === 'PLAYING' && !window.game.transitionState);
            await page.evaluate(() => window.game.completeLevel());
            await page.waitForFunction(() => window.game.currentLevelIndex === 1 && window.game.state === 'PLAYING' && !window.game.transitionState);
            await page.evaluate(() => window.game.completeLevel());
            await page.waitForFunction(() => window.game.state === 'VICTORY');
            const completed = await page.evaluate(() => ({
                index: window.game.currentLevelIndex,
                capped: window.game.gameStats.isWebDemoComplete,
                cap: window.game.gameStats.demoStageCap,
                epilogue: window.game.gameStats.victoryEpilogueText
            }));
            assert.equal(completed.index, 1, `${name}: no progression into stage 3`);
            assert.equal(completed.capped, true, `${name}: demo completion`);
            assert.equal(completed.cap, 2, `${name}: completed stage cap`);
            assert.match(completed.epilogue, /Steam/i, `${name}: Steam continuation message`);
            assert.doesNotMatch(completed.epilogue, /Google Play/i, `${name}: no mobile continuation`);
        }
        console.log(`PASS ${name}: correct home screen; ${runtime.cap}/${runtime.total} stages available`);
    } finally {
        await context.close();
    }
}

(async () => {
    const mainOnly = process.argv.includes('--main-only');
    const demoOnly = process.argv.includes('--demo-only');
    assert.ok(!(mainOnly && demoOnly), 'Use either --main-only or --demo-only, not both');
    const directories = mainOnly ? ['dist-steam'] : demoOnly ? ['dist-steam-demo'] : ['dist-steam', 'dist-steam-demo'];
    for (const dir of directories) {
        assert.ok(fs.existsSync(path.join(ROOT, dir, 'index.html')), `Build ${dir} before running this test`);
    }
    const browser = await chromium.launch();
    try {
        const variants = [
            { name: 'Full Steam build', directory: 'dist-steam', full: true, steam: true, demo: false },
            { name: 'Steam bridge fallback', directory: '', bridge: true, full: true, steam: true, demo: false },
            { name: 'Browser demo', directory: '', full: false, steam: false, demo: false },
            { name: 'Capacitor full game', directory: '', native: true, full: true, steam: false, demo: false },
            { name: 'Separate Steam demo', directory: 'dist-steam-demo', full: false, steam: true, demo: true }
        ];
        if (process.argv.includes('--packaged')) {
            for (const platform of demoOnly ? [] : ['win', 'linux']) {
                variants.push({
                    name: `Packaged ${platform} main game`,
                    directory: path.join('release', `${platform}-unpacked`, 'resources', 'app', 'dist-steam'),
                    full: true, steam: true, demo: false
                });
            }
            if (!mainOnly) {
                variants.push({
                    name: 'Packaged Windows Steam demo',
                    directory: path.join('release-demo', 'win-unpacked', 'resources', 'app', 'dist-steam-demo'),
                    bridge: true, full: false, steam: true, demo: true
                });
            }
        }
        for (const variant of variants) {
            if (mainOnly && variant.demo) continue;
            if (demoOnly && !variant.demo) continue;
            await checkVariant(browser, variant);
        }
    } finally {
        await browser.close();
    }
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});