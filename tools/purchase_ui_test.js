'use strict';

// Test the actual Android-bundled HTML button -> PurchaseManager -> Offer.order
// path with real plugin JS and fake native adapter I/O. No real billing calls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const WEB = path.join(ROOT, 'android/app/src/main/assets/public');
const ORIGIN = 'http://purchase.test';
const TYPES = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };

(async () => {
    const browser = await chromium.launch();
    try {
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
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
                    for (const id of ['remove_ads', 'founder_pass']) {
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
        const buy = page.locator('#remove-ads-buy-btn');
        await buy.waitFor({ state: 'visible' });
        await page.waitForFunction(() => !document.getElementById('remove-ads-buy-btn').disabled);
        await buy.click();
        await page.waitForFunction(() => window.__purchaseCalls.orders.length === 1);
        const calls = await page.evaluate(() => window.__purchaseCalls);
        assert.equal(calls.queries, 1);
        assert.deepEqual(calls.orders, [{ sku: 'remove_ads', token: 'synthetic-offer' }]);
        await page.waitForFunction(() => document.getElementById('remove-ads-status').textContent === 'Purchase cancelled.');
        const diag = await page.evaluate(() => window.PurchaseManager.diagnose());
        assert.equal(diag.ready, true);
        assert.equal(diag.storeInitSettled, true);
        assert.doesNotMatch(JSON.stringify(diag), /synthetic-offer/);
        console.log('PASS Android-bundled Buy button: empty catalogue -> real refresh -> correct offer order -> readable cancellation; diagnostics redact tokens.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });