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

function runtime({ initErrors = [], emptyCatalogue = false, cancelled = false, pendingInitialization = false, ownedIds = [] } = {}) {
    let now = Date.now();
    const timers = new Set();
    const events = new Map();
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
    ctx.addEventListener = (name, fn) => {
        const listeners = events.get(name) || [];
        listeners.push(fn);
        events.set(name, listeners);
    };
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
        for (const id of ['skins', 'founder_pass']) {
            products.set(id, catalogue.addProduct({ id, type: plugin.ProductType.NON_CONSUMABLE, platform: plugin.Platform.GOOGLE_PLAY }, {
                productId: id, product_type: 'inapp', product_format: 'v12.0',
                offers: [{ offer_token: 'test-offer-token', formatted_price: '$1.99', price_amount_micros: 1990000, price_currency_code: 'USD' }],
            }));
        }
    }
    if (!emptyCatalogue) populate();
    store.get = id => products.get(id);
    store.owned = id => ownedIds.includes(typeof id === 'string' ? id : id && id.id);
    // Keep real Store.initialize() and Store.update(), including the 10-minute
    // throttle. Only replace native adapter I/O with a predictable catalogue.
    store.adapters.initialize = async () => pendingInitialization ? new Promise(() => {}) : initErrors;
    store.adapters.findReady = () => ({
        async loadProducts() { calls.catalogue++; populate(); return [...products.values()]; },
    });
    vm.runInContext(read('js/purchaseManager.js'), ctx);
    return { ctx, plugin, store, calls, storage, manager: ctx.PurchaseManager,
        async emit(name) { for (const fn of events.get(name) || []) await fn(); },
        close() { for (const timer of timers) clearTimeout(timer); } };
}

test('Restore surfaces returned native billing errors instead of reporting success', async () => {
    const r = runtime();
    try {
        await r.manager.initialize();
        r.store.adapters.list = [{
            ready: true,
            restorePurchases: async () => ({ code: 6777002, message: 'Billing disconnected' }),
        }];
        r.store._storefronts.refreshWith = async () => {};
        const result = await r.manager.restorePurchases();
        assert.equal(result.ok, false);
        assert.match(result.reason, /Billing disconnected/);
    } finally { r.close(); }
});

test('Restore waits for real initialization rather than succeeding with no ready adapter', async () => {
    const r = runtime({ pendingInitialization: true });
    try {
        await r.manager.initialize();
        const result = await r.manager.restorePurchases();
        assert.equal(result.ok, false);
        assert.equal(result.reason, 'store-connecting');
    } finally { r.close(); }
});

test('a failed cloud pull can be retried and each signed-in account gets its own sync', async () => {
    const r = runtime();
    try {
        let playerId = 'player_first_1234';
        const pulls = [];
        r.ctx.PlayGamesServices = { getPlayerId: () => playerId };
        r.ctx.SkunkEntitlementsAPI = {
            getEntitlements: async id => {
                pulls.push(id);
                return pulls.length === 1 ? null : { adFree: false, founderPass: false };
            },
        };
        await r.manager.syncRemoteEntitlements();
        await r.manager.syncRemoteEntitlements();
        await r.manager.syncRemoteEntitlements();
        playerId = 'player_second_1234';
        await r.emit('skunkfu-pgs-signed-in');
        assert.deepEqual(pulls, ['player_first_1234', 'player_first_1234', 'player_second_1234']);
    } finally { r.close(); }
});

test('concurrent pulls share one request and ignore a response for a previous account', async () => {
    const r = runtime();
    try {
        let playerId = 'player_first_1234';
        let resolvePull;
        let pulls = 0;
        r.ctx.PlayGamesServices = { getPlayerId: () => playerId };
        r.ctx.SkunkEntitlementsAPI = {
            getEntitlements: () => { pulls++; return new Promise(resolve => { resolvePull = resolve; }); },
        };
        const first = r.manager.syncRemoteEntitlements();
        const second = r.manager.syncRemoteEntitlements();
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(pulls, 1);
        playerId = 'player_second_1234';
        resolvePull({ adFree: true, founderPass: true });
        await Promise.all([first, second]);
        assert.equal(r.manager.isAdFree(), false);
        assert.equal(r.manager.isFounderPassOwned(), false);
    } finally { r.close(); }
});

test('failed acknowledgement stays queued and retries online even if ownership is already stored remotely', async () => {
    const r = runtime({ ownedIds: ['skins'] });
    try {
        await r.manager.initialize();
        const key = 'skunkfu.pendingIapPurchases';
        const token = 'synthetic-review-token-12345';
        r.storage.set(key, JSON.stringify({ skins: { purchaseToken: token, productId: 'skins' } }));
        r.ctx.PlayGamesServices = { getPlayerId: () => 'player_review_1234' };
        let pushes = 0;
        r.ctx.SkunkEntitlementsAPI = {
            getEntitlements: async () => ({ adFree: true, founderPass: false }),
            setEntitlement: async (_id, sku, opts) => {
                assert.equal(sku, 'skins');
                assert.equal(opts.purchaseToken, token);
                return ++pushes > 1;
            },
        };
        await r.manager.syncRemoteEntitlements();
        assert.equal(pushes, 1);
        assert.ok(JSON.parse(r.storage.get(key)).skins);
        await r.emit('online');
        assert.equal(pushes, 2);
        assert.equal(JSON.parse(r.storage.get(key)).skins, undefined);
        assert.equal(r.manager.isAdFree(), true);
    } finally { r.close(); }
});

test('successful native restore also retries cloud restore', async () => {
    const r = runtime();
    try {
        await r.manager.initialize();
        r.store.restorePurchases = async () => undefined;
        r.ctx.PlayGamesServices = { getPlayerId: () => 'player_review_1234' };
        r.ctx.SkunkEntitlementsAPI = { getEntitlements: async () => ({ adFree: true, founderPass: false }) };
        const result = await r.manager.restorePurchases();
        assert.equal(result.ok, true);
        assert.equal(r.manager.isAdFree(), true);
    } finally { r.close(); }
});

test('a failed forced refresh remains retryable after a previously successful sync', async () => {
    const r = runtime();
    try {
        let pulls = 0;
        r.ctx.PlayGamesServices = { getPlayerId: () => 'player_review_1234' };
        r.ctx.SkunkEntitlementsAPI = {
            getEntitlements: async () => ++pulls === 2 ? null : { adFree: false, founderPass: false },
        };
        await r.manager.syncRemoteEntitlements();
        await r.manager.syncRemoteEntitlements(true);
        await r.manager.syncRemoteEntitlements();
        assert.equal(pulls, 3);
    } finally { r.close(); }
});

test('an acknowledgement response cannot discard a newer pending purchase token', async () => {
    const r = runtime();
    try {
        const key = 'skunkfu.pendingIapPurchases';
        r.storage.set(key, JSON.stringify({ skins: { purchaseToken: 'older-synthetic-token', productId: 'skins' } }));
        r.ctx.PlayGamesServices = { getPlayerId: () => 'player_review_1234' };
        r.ctx.SkunkEntitlementsAPI = {
            getEntitlements: async () => ({ adFree: true, founderPass: false }),
            setEntitlement: async () => {
                r.storage.set(key, JSON.stringify({ skins: { purchaseToken: 'newer-synthetic-token', productId: 'skins' } }));
                return true;
            },
        };
        await r.manager.syncRemoteEntitlements();
        assert.equal(JSON.parse(r.storage.get(key)).skins.purchaseToken, 'newer-synthetic-token');
    } finally { r.close(); }
});

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

test('diagnostics retain asynchronous store errors without extra error payloads', async () => {
    const r = runtime();
    try {
        await r.manager.initialize();
        r.store.triggerError({
            code: 6777002, message: 'Product details unavailable', productId: 'skins',
            purchaseToken: 'private-test-token',
        });
        await new Promise(resolve => setTimeout(resolve, 10));
        const d = r.manager.diagnose();
        assert.equal(d.lastStoreError.code, 6777002);
        assert.equal(d.lastStoreError.productId, 'skins');
        assert.equal(d.lastStoreError.message, 'Product details unavailable');
        assert.doesNotMatch(JSON.stringify(d), /private-test-token/);
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
        assert.deepEqual(r.calls.orders, ['skins']);
        assert.equal(r.store.minTimeBetweenUpdates, 600000, 'restore normal background refresh throttle');
    } finally { r.close(); }
});

test('both purchase buttons use their own SKU and map plugin cancellation', async () => {
    const r = runtime({ cancelled: true });
    try {
        await r.manager.initialize();
        assert.equal((await r.manager.purchaseRemoveAds()).reason, 'user-cancelled');
        assert.equal((await r.manager.purchaseFounderPass()).reason, 'user-cancelled');
        assert.deepEqual(r.calls.orders, ['skins', 'founder_pass']);
    } finally { r.close(); }
});

test('Buy orders the skins product, never the retired remove_ads ID', async () => {
    const r = runtime();
    try {
        await r.manager.initialize();
        assert.equal((await r.manager.purchaseRemoveAds()).ok, true);
        assert.deepEqual(r.calls.orders, ['skins']);
    } finally { r.close(); }
});

for (const ownedId of ['skins', 'remove_ads']) {
    test(`owning ${ownedId} unlocks the skin pack on init`, async () => {
        const r = runtime({ ownedIds: [ownedId] });
        try {
            assert.equal(r.manager.isAdFree(), false);
            await r.manager.initialize();
            assert.equal(r.manager.isAdFree(), true);
        } finally { r.close(); }
    });
}

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

test('actual Google Play adapter reconnects after setup failure and resolves original initialization', async () => {
    const r = runtime();
    try {
        const retries = [];
        const errors = [];
        let attempts = 0;
        const log = { info() {}, debug() {}, child() { return this; } };
        const adapter = {
            log, context: { verbosity: 0, error: error => errors.push(error) },
            retry: { retry: callback => retries.push(callback) },
            autoRefreshIntervalMillis: 0,
            onSetPurchases() {}, onPurchasesUpdated() {}, onPurchaseConsumed() {},
            bridge: {
                init(success, failure) {
                    attempts++;
                    if (attempts === 1) failure('SERVICE_UNAVAILABLE');
                    else success();
                },
            },
        };
        adapter.initialize = () => r.plugin.GooglePlay.Adapter.prototype.initialize.call(adapter);
        const pending = adapter.initialize();
        assert.equal(errors.length, 1, 'initial setup failure remains visible');
        assert.equal(retries.length, 1);
        retries.shift()();
        assert.equal(attempts, 2, 'retry must call the native bridge again, not return the cached promise');
        assert.equal(await pending, undefined, 'successful retry settles the original initialization');
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
        const offer = r.store.get('skins').getOffer();
        let orderedId;
        const adapter = { log: { info() {}, warn() {} }, bridge: {
            buy(success, failure, id) { orderedId = id; success(); },
        } };
        await r.plugin.GooglePlay.Adapter.prototype.order.call(adapter, offer, {});
        assert.equal(orderedId, 'skins@test-offer-token');
    } finally { r.close(); }
});