'use strict';

// Test the actual Android-bundled HTML button -> PurchaseManager -> Offer.order
// path with real plugin JS and fake native adapter I/O. No real billing calls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const WEB = process.env.TEST_WEB_ROOT
    ? path.resolve(ROOT, process.env.TEST_WEB_ROOT)
    : path.join(ROOT, 'android/app/src/main/assets/public');
const ORIGIN = 'http://purchase.test';
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };

async function assertSkinGrid(page, selector, columns) {
    const layout = await page.evaluate(sel => {
        const grid = document.querySelector(sel);
        const bounds = grid.getBoundingClientRect();
        const tiles = Array.from(grid.children, tile => {
            const rect = tile.getBoundingClientRect();
            return { id: tile.dataset.variant, top: tile.offsetTop, width: rect.width, left: rect.left, right: rect.right };
        });
        return { tiles, left: bounds.left, right: bounds.right };
    }, selector);
    assert.deepEqual(layout.tiles.map(tile => tile.id).sort(), ['amethyst', 'gold', 'ninja2', 'ninja3', 'ninja4', 'sapphire']);
    const rows = new Map();
    for (const tile of layout.tiles) {
        rows.set(tile.top, (rows.get(tile.top) || 0) + 1);
        assert.ok(Math.abs(tile.width - layout.tiles[0].width) < 1, 'skin tiles have equal widths');
        assert.ok(tile.left >= layout.left - 1 && tile.right <= layout.right + 1, 'skin tiles fit the grid');
    }
    assert.deepEqual([...rows.values()], Array(6 / columns).fill(columns), 'six skins fill complete rows');
}

(async () => {
    const browser = await chromium.launch();
    try {
        const mobile = process.env.TEST_MOBILE === '1';
        const context = await browser.newContext({
            viewport: mobile ? { width: 844, height: 390 } : { width: 1280, height: 800 },
            isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block'
        });
        await context.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.origin !== ORIGIN) return route.abort();
            const file = path.resolve(WEB, '.' + (url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname)));
            if (!file.startsWith(WEB + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({ status: 404, body: '' });
            return route.fulfill({ path: file, contentType: TYPES[path.extname(file)] || 'application/octet-stream' });
        });
        await context.addInitScript({ content:
            'window.Capacitor = {isNativePlatform: () => true, getPlatform: () => "android"};\n' +
            // The Capacitor copy wraps this source in cordova.define(). Use the
            // unwrapped library here because this test mocks native bridge I/O.
            fs.readFileSync(path.join(ROOT, 'node_modules/cordova-plugin-purchase/www/store.js'), 'utf8') + '\n' +
            `(() => {
                const plugin = window.CdvPurchase;
                const store = plugin.store;
                window.__purchaseCalls = { queries: 0, orders: [] };
                const products = new Map();
                const catalogue = new plugin.GooglePlay.Products({
                    canPurchase: () => true, owned: () => false,
                    async order(offer) {
                        window.__purchaseCalls.orders.push({ sku: offer.productId, token: offer.token });
                        return { code: plugin.ErrorCode.PAYMENT_CANCELLED, message: 'Test cancellation' };
                    }
                });
                // Reproduce a startup catalogue miss. Only an actual update()
                // call loads products, as opposed to the plugin's throttled no-op.
                store.adapters.initialize = async () => [];
                store.adapters.findReady = () => ({ async loadProducts() {
                    window.__purchaseCalls.queries++;
                    for (const id of ['skins', 'founder_pass']) {
                        products.set(id, catalogue.addProduct({ id, type: plugin.ProductType.NON_CONSUMABLE, platform: plugin.Platform.GOOGLE_PLAY }, {
                            productId: id, product_type: 'inapp', product_format: 'v12.0',
                            offers: [{offer_token: 'synthetic-offer', formatted_price: '$1.99', price_amount_micros: 1990000, price_currency_code: 'USD'}]
                        }));
                    }
                    return [...products.values()];
                } });
                store.get = id => products.get(id);
                store.owned = () => false;
                store.restorePurchases = async () => undefined;
            })();`
        });
        const page = await context.newPage();
        await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
        await page.locator('#menu-settings-btn').click();
        await page.locator('#iap-diag-open-btn').click();
        await page.waitForFunction(() => document.getElementById('iap-diag-output').textContent.includes('app build'));
        const report = await page.locator('#iap-diag-output').textContent();
        assert.ok(report.includes(require('../package.json').version + ' / '), 'report identifies the bundled build');
        assert.ok(report.includes('lastStoreError'), 'report includes asynchronous store errors');
        await page.locator('#iap-diag-close-btn').click();
        await page.locator('#iap-diag-card').waitFor({ state: 'hidden' });
        const buy = page.locator('#remove-ads-buy-btn');
        await buy.waitFor({ state: 'visible' });
        await page.waitForFunction(() => !document.getElementById('remove-ads-buy-btn').disabled);
        await buy.click();
        await page.waitForFunction(() => window.__purchaseCalls.orders.length === 1);
        const calls = await page.evaluate(() => window.__purchaseCalls);
        assert.equal(calls.queries, 1);
        assert.deepEqual(calls.orders, [{ sku: 'skins', token: 'synthetic-offer' }]);
        await page.waitForFunction(() => document.getElementById('remove-ads-status').textContent === 'Purchase cancelled.');
        const diag = await page.evaluate(() => window.PurchaseManager.diagnose());
        assert.equal(diag.ready, true);
        assert.equal(diag.storeInitSettled, true);
        assert.doesNotMatch(JSON.stringify(diag), /synthetic-offer/);
        await assertSkinGrid(page, '#founder-skin-variants', 3);
        assert.equal(await page.locator('.founder-swatch[data-variant="steel"]').count(), 0);
        const viewport = page.viewportSize();
        await page.setViewportSize({ width: 390, height: 844 });
        await assertSkinGrid(page, '#founder-skin-variants', 2);
        await page.setViewportSize(viewport);
        const ninja2 = page.locator('.founder-swatch[data-variant="ninja2"]');
        await page.waitForFunction(() => {
            const tile = document.querySelector('.founder-swatch[data-variant="ninja2"]');
            return tile.classList.contains('is-locked') && tile.querySelector('canvas').classList.contains('is-ready');
        }).catch(async error => {
            console.error(await page.evaluate(() => ({
                tile: document.querySelector('.founder-swatch[data-variant="ninja2"]').outerHTML,
                settings: document.getElementById('menu-settings-overlay').getAttribute('style'),
                hidden: document.getElementById('menu-settings-overlay').hidden,
                loader: typeof spriteLoader,
                sheet: typeof spriteLoader !== 'undefined' && !!spriteLoader.getSprite('ninja2_walk'),
            })));
            throw error;
        });
        assert.equal(await ninja2.getAttribute('aria-disabled'), 'true');
        assert.ok((await ninja2.textContent()).includes('Laysie Skunk'));
        assert.ok((await ninja2.getAttribute('title')).startsWith('Laysie Skunk'));
        assert.equal(await page.evaluate(() => FounderManager.setSkinVariant('ninja2')), false);
        assert.notEqual(await page.evaluate(() => FounderManager.getSkinVariant()), 'ninja2');
        const characterSkins = [['ninja3', 'Vampyr'], ['ninja4', 'Malodor']];
        for (const [variant, label] of characterSkins) {
            const tile = page.locator('.founder-swatch[data-variant="' + variant + '"]');
            await page.waitForFunction(id => {
                const btn = document.querySelector('.founder-swatch[data-variant="' + id + '"]');
                return btn.classList.contains('is-locked') && btn.querySelector('canvas').classList.contains('is-ready');
            }, variant);
            assert.equal(await tile.getAttribute('aria-disabled'), 'true');
            assert.ok((await tile.textContent()).includes(label));
            assert.ok((await tile.getAttribute('title')).startsWith(label));
            assert.equal(await page.evaluate(id => FounderManager.setSkinVariant(id), variant), false);
        }
        await page.evaluate(() => {
            localStorage.setItem('skunkfu.adFree', '1');
            FounderManager.grant('test-six-skin-layout');
            FounderManager.setSkinVariant('sapphire');
            FounderManager.setGoldSkinEnabled(true);
        });
        await ninja2.click();
        assert.equal(await ninja2.getAttribute('aria-checked'), 'true');
        assert.equal(await ninja2.getAttribute('title'), 'Laysie Skunk');
        const rendered = await page.evaluate(() => {
            const player = Object.create(Player.prototype);
            Object.assign(player, { x: 0, y: 0, width: 64, height: 64, facingRight: true });
            player.loadSprites();
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 64;
            const ctx = canvas.getContext('2d');
            player.currentAnimation = player.animations.walk;
            player._drawCurrentAnimation(ctx);
            const premium = canvas.toDataURL();
            const visible = ctx.getImageData(0, 0, 64, 64).data.some((value, i) => i % 4 === 3 && value > 0);
            ctx.clearRect(0, 0, 64, 64);
            FounderManager.setGoldSkinEnabled(false);
            player._drawCurrentAnimation(ctx);
            return { visible, differsFromOriginal: premium !== canvas.toDataURL() };
        });
        assert.equal(rendered.visible, true, 'actual premium PNG renders nontransparent pixels');
        assert.equal(rendered.differsFromOriginal, true, 'toggle restores visually different original artwork');
        for (const [variant, label] of characterSkins) {
            const tile = page.locator('.founder-swatch[data-variant="' + variant + '"]');
            await tile.click();
            assert.equal(await tile.getAttribute('aria-checked'), 'true');
            assert.equal(await tile.getAttribute('title'), label);
            assert.equal(await page.evaluate(() => localStorage.getItem('skunkfu.skinVariant')), variant);
            const renderedStates = await page.evaluate(id => {
                FounderManager.setGoldSkinEnabled(true);
                const player = Object.create(Player.prototype);
                Object.assign(player, { x: 0, y: 0, width: 64, height: 64, facingRight: true });
                player.loadSprites();
                const canvas = document.createElement('canvas');
                canvas.width = canvas.height = 64;
                const ctx = canvas.getContext('2d');
                return Object.keys(player.animations).map(state => {
                    player.currentAnimation = player.animations[state];
                    ctx.clearRect(0, 0, 64, 64);
                    player._drawCurrentAnimation(ctx);
                    const pixels = canvas.toDataURL();
                    const visible = ctx.getImageData(0, 0, 64, 64).data.some((value, i) => i % 4 === 3 && value > 0);
                    ctx.clearRect(0, 0, 64, 64);
                    FounderManager.setSkinVariant('ninja2');
                    player._drawCurrentAnimation(ctx);
                    const differsFromLaysie = pixels !== canvas.toDataURL();
                    ctx.clearRect(0, 0, 64, 64);
                    FounderManager.setSkinVariant(id);
                    FounderManager.setGoldSkinEnabled(false);
                    player._drawCurrentAnimation(ctx);
                    FounderManager.setGoldSkinEnabled(true);
                    return { state, visible, differsFromLaysie, differsFromOriginal: pixels !== canvas.toDataURL() };
                });
            }, variant);
            for (const result of renderedStates) {
                assert.equal(result.visible, true, result.state + ' ' + label + ' artwork is visible');
                assert.equal(result.differsFromLaysie, true, result.state + ' switches from Laysie artwork');
                assert.equal(result.differsFromOriginal, true, result.state + ' toggle restores original artwork');
            }
        }
        await page.locator('#menu-settings-back').click();
        await page.evaluate(() => {
            const pause = document.getElementById('pause-overlay');
            pause.removeAttribute('hidden');
            pause.style.display = 'flex';
        });
        const pauseNinja2 = page.locator('.pause-skin-chip[data-variant="ninja2"]');
        await pauseNinja2.waitFor({ state: 'visible' });
        await assertSkinGrid(page, '.pause-skin-shortcut__row', 3);
        assert.ok((await pauseNinja2.textContent()).includes('Laysie Skunk'));
        for (const [variant, label] of characterSkins) {
            const chip = page.locator('.pause-skin-chip[data-variant="' + variant + '"]');
            await chip.waitFor({ state: 'visible' });
            assert.ok((await chip.textContent()).includes(label));
            await pauseNinja2.click();
            assert.equal(await page.evaluate(() => FounderManager.getSkinVariant()), 'ninja2');
            await chip.click();
            assert.equal(await chip.getAttribute('aria-checked'), 'true');
            assert.equal(await page.evaluate(() => FounderManager.getSkinVariant()), variant);
        }
        await page.evaluate(() => {
            document.getElementById('pause-overlay').style.display = 'none';
            CdvPurchase.store.triggerError({ code: 6777001, message: 'Init failed - Class not found', productId: null });
        });
        await page.waitForFunction(() => PurchaseManager.diagnose().lastStoreError?.code === 6777001);
        await page.locator('#menu-settings-btn').click();
        await page.locator('#iap-diag-open-btn').click();
        await page.waitForFunction(() => document.getElementById('iap-diag-output').textContent.includes('app packaging failure'));
        const packagingReport = await page.locator('#iap-diag-output').textContent();
        assert.ok(!packagingReport.includes('Products not set to'), 'missing native registration must not be blamed on product configuration');
        console.log('PASS Android-bundled Buy button: empty catalogue -> real refresh -> correct offer order -> readable cancellation; diagnostics redact tokens.');
        console.log('PASS Laysie Skunk: display names, locked animated preview, owner selection, real artwork rendering and original-art toggle.');
        console.log('PASS Vampyr: locked animated preview, owner selection, saved preference, all eight artwork states, toggle and pause switching.');
        console.log('PASS Malodor: locked animated preview, owner selection, saved preference, all eight artwork states, toggle and pause switching.');
        console.log('PASS six-skin layout: no Steel; complete equal-width rows in desktop, mobile landscape, portrait and pause menus.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });