'use strict';

// No device, Play account, network, or real purchases. Exercise the application
// against the installed plugin's actual Store/Products/Adapter implementations.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');

function runtime({ initErrors = [], emptyCatalogue = false, cancelled = false, pendingInitialization = false } = {}) {
    let now = Date.now();
    const timers = new Set();
    const storage = new Map([['skunkfu.iapAutoRestoreTriedAt', '1']]);
    const ctx = vm.createContext({
        console: { log() {}, warn() {}, error() {} },
        URL, navigator: { userAgent: 'Android; wv' },
        document: { readyState: 'loading', addEventListener() {} },
        localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
        setTimeout(fn, ms = 0, ...args) {
            // Accelerate only the application's short product-poll loop.
            const timer = setTimeout(() => {
                timers.delete(timer);
                if (ms === 250) now += ms;
                fn(...args);
            }, ms === 250 || (pendingInitialization && ms === 12000) ? 0 : ms);
            timer.unref();
            timers.add(timer);
            return timer;
        },
        clearTimeout(timer) { timers.delete(timer); clearTimeout(timer); },
        setInterval() { return 0; }, clearInterval() {},
        Date: class extends Date { static now() { return now; } },
    });
    ctx.window = ctx;
    ctx.addEventListener = () => {};
    ctx.Capacitor = { isNativePlatform: () => true };
    vm.runInContext(read('node_modules/cordova-plugin-purchase/www/store.js'), ctx);
    const plugin = ctx.CdvPurchase;
    const store = plugin.store;
    const calls = { catalogue: 0, orders: [] };
    const products = new Map();
    const order = async offer => {
        calls.orders.push(offer.productId);
        return cancelled ? { code: plugin.ErrorCode.PAYMENT_CANCELLED, message: 'Cancelled by user' } : undefined;
    };
    const catalogue = new plugin.GooglePlay.Products({ order, canPurchase: () => true, owned: () => false });
    function populate() {
        for (const id of ['remove_ads', 'founder_pass']) {
            products.set(id, catalogue.addProduct({ id, type: plugin.ProductType.NON_CONSUMABLE, platform: plugin.Platform.GOOGLE_PLAY }, {
                productId: id, product_type: 'inapp', product_format: 'v12.0',
                offers: [{ offer_token: 'test-offer-token', formatted_price: '$1.99', price_amount_micros: 1990000, price_currency_code: 'USD' }],
            }));
        }
    }
    if (!emptyCatalogue) populate();
    store.get = id => products.get(id);
    store.owned = () => false;
    // Keep real Store.initialize() and Store.update(), including the 10-minute
    // throttle. Only replace native adapter I/O with a predictable catalogue.
    store.adapters.initialize = async () => pendingInitialization ? new Promise(() => {}) : initErrors;
    store.adapters.findReady = () => ({
        async loadProducts() { calls.catalogue++; populate(); return [...products.values()]; },
    });
    vm.runInContext(read('js/purchaseManager.js'), ctx);
    return { ctx, plugin, store, calls, manager: ctx.PurchaseManager,
        close() { for (const timer of timers) clearTimeout(timer); } };
}

test('diagnostics work before and after initialization', async () => {
    const r = runtime();
    try {
        assert.equal(r.manager.diagnose().nativeSignals.capacitor, true);
        await r.manager.initialize();
        assert.equal(r.manager.diagnose().storeInitSettled, true);
    } finally { r.close(); }
});

test('plugin initialization error arrays are not reported as success', async () => {
    const r = runtime({ initErrors: [{ code: 6777001, message: 'Billing connection failed' }] });
    try {
        await r.manager.initialize();
        const d = r.manager.diagnose();
        assert.equal(d.readyMode, 'store-init-error');
        assert.match(d.storeInitError, /6777001.*Billing connection failed/);
    } finally { r.close(); }
});

test('Buy retries an empty catalogue immediately despite plugin default throttle', async () => {
    const r = runtime({ emptyCatalogue: true });
    try {
        assert.equal(r.store.minTimeBetweenUpdates, 600000);
        await r.manager.initialize();
        const result = await r.manager.purchaseRemoveAds();
        assert.equal(result.ok, true, result.reason);
        assert.equal(r.calls.catalogue, 1, 'must actually query products, not silently skip update()');
        assert.deepEqual(r.calls.orders, ['remove_ads']);
        assert.equal(r.store.minTimeBetweenUpdates, 600000, 'restore normal background refresh throttle');
    } finally { r.close(); }
});

test('both purchase buttons use their own SKU and map plugin cancellation', async () => {
    const r = runtime({ cancelled: true });
    try {
        await r.manager.initialize();
        assert.equal((await r.manager.purchaseRemoveAds()).reason, 'user-cancelled');
        assert.equal((await r.manager.purchaseFounderPass()).reason, 'user-cancelled');
        assert.deepEqual(r.calls.orders, ['remove_ads', 'founder_pass']);
    } finally { r.close(); }
});

test('timed-out initialization stays pending; never fake billing readiness to retry', async () => {
    const r = runtime({ emptyCatalogue: true, pendingInitialization: true });
    try {
        await r.manager.initialize();
        assert.equal((await r.manager.purchaseRemoveAds()).reason, 'store-connecting');
        assert.equal(r.manager.diagnose().storeInitSettled, false);
        assert.equal(r.calls.catalogue, 0);
        assert.equal(r.calls.orders.length, 0);
    } finally { r.close(); }
});

test('diagnostic refresh loads products without ordering and keeps tokens private', async () => {
    const r = runtime({ emptyCatalogue: true });
    try {
        await r.manager.initialize();
        assert.equal((await r.manager.refreshProducts()).ok, true);
        assert.equal(r.calls.catalogue, 1);
        assert.equal(r.calls.orders.length, 0);
        assert.doesNotMatch(JSON.stringify(r.manager.diagnose()), /test-offer-token/);
    } finally { r.close(); }
});

test('native serializer keeps the offer-token format even for one offer', () => {
    const java = read('node_modules/cordova-plugin-purchase/src/android/cc/fovea/PurchasePlugin.java');
    const condition = java.match(/if \((offerList != null && [^\n]+)\) \{/);
    assert.ok(condition, 'native one-time-offer branch exists');
    for (const count of [1, 2]) {
        assert.equal(vm.runInNewContext(condition[1], { offerList: { size: () => count, isEmpty: () => count === 0 } }), true,
            `${count} eligible offer(s) must serialize offers[] with offer_token, not legacy tokenless pricing`);
    }
});

test('actual Google Play adapter forwards a single offer token to the buy bridge', async () => {
    const r = runtime();
    try {
        const offer = r.store.get('remove_ads').getOffer();
        let orderedId;
        const adapter = { log: { info() {}, warn() {} }, bridge: {
            buy(success, failure, id) { orderedId = id; success(); },
        } };
        await r.plugin.GooglePlay.Adapter.prototype.order.call(adapter, offer, {});
        assert.equal(orderedId, 'remove_ads@test-offer-token');
    } finally { r.close(); }
});