/**
 * purchaseManager.js — In-App Purchase manager for "Remove Ads + Skins" ($1.99).
 *
 * Strategy:
 *   • Android (Capacitor native): uses cordova-plugin-purchase (CdvPurchase) v13+
 *     with Google Play Billing v6+. Plugin is OPTIONAL — module degrades gracefully
 *     if the plugin isn't installed or running on web.
 *   • Web: uses a localStorage flag for now. Hook up Stripe/Paddle later if we
 *     want to monetize the web build directly. For now web is "Coming soon".
 *
 * What the purchase grants:
 *   • Removes banner + between-stage interstitial ads (rewarded ads stay opt-in).
 *   • Unlocks the Sapphire, Amethyst, and Steel ninja skins (FounderManager.isSkinUnlocked).
 *   • If purchased before EARLY_ACCESS_END_ISO (2026-12-31), also auto-grants
 *     Founder status + the exclusive Gold ninja skin.
 *
 * Entitlement is mirrored to localStorage so AdManager and FounderManager can
 * synchronously gate calls without awaiting the plugin on every check.
 *
 * SETUP (Android, one-time):
 *   1. npm install cordova-plugin-purchase
 *   2. Create TWO managed products in Google Play Console:
 *        Product ID: remove_ads      | Type: One-time (managed) | Price: $1.99
 *        Product ID: founder_pass    | Type: One-time (managed) | Price: $0.99
 *      `founder_pass` is the standalone Early-Access reward (Gold Skunk skin
 *      + Founder badge) for players who don't want to remove ads. Buying
 *      `remove_ads` during the early-access window still auto-grants the
 *      same cosmetics; this is the additional purchase path.
 *   3. npx cap sync android
 *   4. Upload a signed bundle to a Play Console internal testing track and add
 *      yourself as a license tester so the purchase flow works in test mode.
 */

const PurchaseManager = (() => {
    'use strict';

    const PRODUCT_ID_REMOVE_ADS    = 'remove_ads';
    const PRODUCT_ID_FOUNDER_PASS  = 'founder_pass';
    const STORAGE_KEY_AD_FREE      = 'skunkfu.adFree';
    const STORAGE_KEY_FOUNDER_PASS = 'skunkfu.founderPassOwned';

    let _store         = null;     // CdvPurchase.store reference
    let _initialized   = false;
    let _ready         = false;    // True after initialize() resolves (success OR no-store)
    let _adFree        = _readEntitlementFromStorage();
    let _founderPass   = _readFounderPassFromStorage();
    let _product       = null;     // CdvPurchase.Product (remove_ads)
    let _founderProduct = null;    // CdvPurchase.Product (founder_pass)
    const _listeners   = new Set();
    const _founderListeners = new Set();
    const _readyListeners = new Set();

    function _markReady(reason) {
        if (_ready) return;
        _ready = true;
        _log('Ready (' + reason + '). Ad-free=' + _adFree);
        _readyListeners.forEach(fn => { try { fn(_adFree); } catch(e) {} });
        _readyListeners.clear();
    }

    function _log(...args) { try { console.log('[Purchase]', ...args); } catch(e) {} }
    function _warn(...args) { try { console.warn('[Purchase]', ...args); } catch(e) {} }

    // ---- Cross-device entitlement sync (Firestore-backed via Cloud Fns) -----
    // Identity: Google Play Games player ID, populated by
    // PlayGamesServices.signIn(). Until then, syncs are no-ops.
    // - Push: after a successful local purchase, mirror entitlement to server.
    // - Pull: on first sign-in (and again if the player swaps accounts),
    //         fetch the server doc; if it shows ownership we don't have
    //         locally, mirror it down.
    function _getApi() {
        try { return window.SkunkEntitlementsAPI || null; } catch (_) { return null; }
    }
    function _getPlayerId() {
        try {
            return (window.PlayGamesServices && PlayGamesServices.getPlayerId)
                ? (PlayGamesServices.getPlayerId() || '')
                : '';
        } catch (_) { return ''; }
    }
    function _pushEntitlementRemote(sku) {
        const api = _getApi();
        const pid = _getPlayerId();
        if (!api || !pid || !sku) return;
        try {
            api.setEntitlement(pid, sku).then(ok => {
                if (ok) _log('Mirrored entitlement to server:', sku);
                else    _warn('Server entitlement push reported failure:', sku);
            }).catch(e => _warn('Server entitlement push threw:', e));
        } catch (e) { _warn('Server entitlement push setup failed:', e); }
    }
    let _remotePullDone = false;
    async function _pullEntitlementsRemote(force) {
        if (_remotePullDone && !force) return;
        const api = _getApi();
        const pid = _getPlayerId();
        if (!api || !pid) return;
        _remotePullDone = true;
        try {
            const remote = await api.getEntitlements(pid);
            if (!remote) return;
            // Only ever mirror remote -> local TRUE values; we never revoke
            // a local entitlement based on a missing server record (avoids
            // first-launch-after-offline-purchase regressions).
            if (remote.adFree && !_adFree) {
                _log('Restored ad-free from server (player ' + pid.slice(0, 6) + '…)');
                _setAdFree(true, 'remote-restore');
            }
            if (remote.founderPass && !_founderPass) {
                _log('Restored founder pass from server (player ' + pid.slice(0, 6) + '…)');
                _setFounderPassOwned(true, 'remote-restore');
            }
            // If we own something locally that the server doesn't, push it up
            // so a fresh device gets it next time.
            if (_adFree && !remote.adFree) _pushEntitlementRemote(PRODUCT_ID_REMOVE_ADS);
            if (_founderPass && !remote.founderPass) _pushEntitlementRemote(PRODUCT_ID_FOUNDER_PASS);
        } catch (e) {
            _warn('Remote entitlement pull failed:', e);
        }
    }

    // Listen for the GPGS sign-in event so we can pull entitlements as soon
    // as the player ID is known. The listener runs at most once per session
    // because _pullEntitlementsRemote() is gated by _remotePullDone.
    try {
        window.addEventListener('skunkfu-pgs-signed-in', () => {
            _pullEntitlementsRemote(false);
        });
    } catch (_) {}

    function _readEntitlementFromStorage() {
        try { return localStorage.getItem(STORAGE_KEY_AD_FREE) === '1'; } catch (e) { return false; }
    }

    function _writeEntitlement(v) {
        try { localStorage.setItem(STORAGE_KEY_AD_FREE, v ? '1' : '0'); } catch (e) {}
    }

    function _readFounderPassFromStorage() {
        try { return localStorage.getItem(STORAGE_KEY_FOUNDER_PASS) === '1'; } catch (e) { return false; }
    }

    function _writeFounderPass(v) {
        try { localStorage.setItem(STORAGE_KEY_FOUNDER_PASS, v ? '1' : '0'); } catch (e) {}
    }

    function _setFounderPassOwned(v, source) {
        const prev = _founderPass;
        _founderPass = !!v;
        _writeFounderPass(_founderPass);
        if (prev !== _founderPass) {
            _log('Founder Pass entitlement changed →', _founderPass, '(source:', source + ')');
            // Grant Founder status (cosmetic gold skin + badge) immediately.
            // FounderManager handles its own no-op if already granted.
            try {
                if (_founderPass && window.FounderManager && typeof FounderManager.grant === 'function') {
                    FounderManager.grant('founder-pass-' + source);
                }
            } catch (e) { _warn('FounderManager.grant failed:', e); }
            // Mirror to server (skip if this flip CAME from the server).
            if (_founderPass && source !== 'remote-restore' && source !== 'storage') {
                _pushEntitlementRemote(PRODUCT_ID_FOUNDER_PASS);
            }
            _founderListeners.forEach(fn => { try { fn(_founderPass); } catch (e) {} });
            try {
                if (window.Analytics && Analytics.trackPurchase) {
                    Analytics.trackPurchase({ product: PRODUCT_ID_FOUNDER_PASS, source });
                }
            } catch (e) {}
        }
    }

    function _setAdFree(v, source) {
        const prev = _adFree;
        _adFree = !!v;
        _writeEntitlement(_adFree);
        if (prev !== _adFree) {
            _log('Ad-free entitlement changed →', _adFree, '(source:', source + ')');
            // Tell AdManager to reconcile (hide banner, skip interstitial, etc.)
            try {
                if (window.AdManager && _adFree) {
                    if (typeof window.AdManager.removeBanner === 'function') {
                        window.AdManager.removeBanner();
                    }
                }
            } catch (e) { _warn('AdManager reconcile failed:', e); }
            // Hide web AdSense container if present
            try {
                const adRail = document.getElementById('ad-container-right');
                if (adRail && _adFree) {
                    adRail.style.display = 'none';
                    document.documentElement.style.setProperty('--ad-width', '0px');
                }
            } catch (e) {}
            // Mirror to server (skip if this flip CAME from the server).
            if (_adFree && source !== 'remote-restore' && source !== 'storage') {
                _pushEntitlementRemote(PRODUCT_ID_REMOVE_ADS);
            }
            // Notify subscribers
            _listeners.forEach(fn => { try { fn(_adFree); } catch(e) {} });
            // Analytics
            try { if (window.Analytics && Analytics.trackPurchase) {
                Analytics.trackPurchase({ product: PRODUCT_ID_REMOVE_ADS, source });
            } } catch (e) {}
        }
    }

    function isAdFree() { return _adFree; }

    function onChange(fn) {
        if (typeof fn === 'function') _listeners.add(fn);
        return () => _listeners.delete(fn);
    }

    function isNative() {
        return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function'
                  && window.Capacitor.isNativePlatform());
    }

    /**
     * Lazy-load CdvPurchase. Returns the store or null.
     */
    async function _getStore() {
        if (_store) return _store;
        if (!isNative()) return null;

        // CdvPurchase exposes itself as window.CdvPurchase when the cordova plugin
        // is installed. We don't `import` it because we don't want a hard build dep.
        const CdvPurchase = window.CdvPurchase;
        if (!CdvPurchase || !CdvPurchase.store) {
            _warn('CdvPurchase plugin not available. Install with: npm i cordova-plugin-purchase && npx cap sync android');
            return null;
        }
        _store = CdvPurchase.store;
        return _store;
    }

    async function initialize() {
        if (_initialized) return;
        _initialized = true;

        // Sync localStorage entitlement → DOM (web ad rail) immediately on boot.
        if (_adFree) _setAdFree(true, 'storage');

        const store = await _getStore();
        if (!store) {
            _log('Native store unavailable. Web fallback active. Ad-free=' + _adFree);
            _markReady('no-store');
            return;
        }

        try {
            const CdvPurchase = window.CdvPurchase;
            const { ProductType, Platform, LogLevel } = CdvPurchase;

            store.verbosity = LogLevel.WARNING;

            store.register([
                {
                    id:       PRODUCT_ID_REMOVE_ADS,
                    type:     ProductType.NON_CONSUMABLE,
                    platform: Platform.GOOGLE_PLAY,
                },
                {
                    id:       PRODUCT_ID_FOUNDER_PASS,
                    type:     ProductType.NON_CONSUMABLE,
                    platform: Platform.GOOGLE_PLAY,
                }
            ]);

            store.when()
                .productUpdated((p) => {
                    if (!p) return;
                    if (p.id === PRODUCT_ID_REMOVE_ADS) {
                        _product = p;
                        _log('Product loaded:', p.id, p.pricing && p.pricing.price);
                    } else if (p.id === PRODUCT_ID_FOUNDER_PASS) {
                        _founderProduct = p;
                        _log('Product loaded:', p.id, p.pricing && p.pricing.price);
                    }
                })
                .approved((tx) => {
                    _log('Transaction approved:', tx);
                    // Plugin requires explicit verification & finishing.
                    // For a non-consumable with no server, finish locally.
                    tx.verify().then(() => tx.finish()).catch(e => _warn('verify failed', e));
                })
                .verified((receipt) => {
                    _log('Receipt verified:', receipt);
                    receipt.finish();
                })
                .finished((tx) => {
                    _log('Transaction finished:', tx);
                    if (tx && tx.products) {
                        if (tx.products.some(p => p.id === PRODUCT_ID_REMOVE_ADS)) {
                            _setAdFree(true, 'purchase');
                        }
                        if (tx.products.some(p => p.id === PRODUCT_ID_FOUNDER_PASS)) {
                            _setFounderPassOwned(true, 'purchase');
                        }
                    }
                })
                .receiptUpdated((r) => {
                    // Reconcile owned products on each receipt update (handles restore).
                    try {
                        if (store.owned(PRODUCT_ID_REMOVE_ADS))   _setAdFree(true, 'restore');
                        if (store.owned(PRODUCT_ID_FOUNDER_PASS)) _setFounderPassOwned(true, 'restore');
                    } catch (e) {}
                });

            await store.initialize([CdvPurchase.Platform.GOOGLE_PLAY]);
            _log('Store initialized.');

            // Cross-check ownership on init.
            try {
                if (store.owned(PRODUCT_ID_REMOVE_ADS))   _setAdFree(true, 'init-owned');
                if (store.owned(PRODUCT_ID_FOUNDER_PASS)) _setFounderPassOwned(true, 'init-owned');
            } catch (e) {}

            // Mark the manager as ready BEFORE the auto-restore probe so
            // UI renderers can stop showing skeletons immediately. The
            // restore probe below is fire-and-forget and will trigger
            // additional onChange() calls if it flips the entitlement.
            _markReady('store-init');

            // First-launch auto-restore: covers reinstalls / device switches
            // where the user already paid but the local entitlement flag was
            // wiped. Runs at most once per install (gated by a localStorage
            // flag) and only if we don't already see the entitlement, so
            // returning users never get an extra Play Billing round-trip.
            try {
                const RESTORED_KEY = 'skunkfu.iapAutoRestoreTriedAt';
                const alreadyTried = !!localStorage.getItem(RESTORED_KEY);
                if (!_adFree && !alreadyTried && typeof store.restorePurchases === 'function') {
                    _log('First-launch auto-restore probe (no local entitlement).');
                    try { localStorage.setItem(RESTORED_KEY, String(Date.now())); } catch (_) {}
                    // Fire-and-forget; receiptUpdated() above will flip the
                    // entitlement if Google Play reports the product as owned.
                    store.restorePurchases().catch(e => _warn('auto-restore failed', e));
                }
            } catch (e) {}

        } catch (e) {
            _warn('Store init failed:', e);
            _markReady('init-error');
        }
    }

    /**
     * Initiate purchase of the Remove Ads product.
     * @returns {Promise<{ok:boolean, reason?:string}>}
     */
    async function purchaseRemoveAds() {
        if (_adFree) return { ok: true, reason: 'already-owned' };

        const store = await _getStore();
        if (!store) {
            // Web fallback — explain the situation, don't silently grant.
            return { ok: false, reason: 'web-not-supported' };
        }
        const product = store.get(PRODUCT_ID_REMOVE_ADS) || _product;
        if (!product) return { ok: false, reason: 'product-not-loaded' };

        try {
            const offer = product.getOffer && product.getOffer();
            if (offer && typeof offer.order === 'function') {
                await offer.order();
            } else if (typeof product.order === 'function') {
                await product.order();
            } else {
                return { ok: false, reason: 'order-api-missing' };
            }
            // The actual entitlement flip happens in the .finished()/receiptUpdated()
            // handler asynchronously. Caller can poll `isAdFree()` or subscribe via onChange().
            return { ok: true, reason: 'pending' };
        } catch (e) {
            _warn('Purchase failed:', e);
            return { ok: false, reason: (e && e.message) || 'purchase-error' };
        }
    }

    /**
     * Restore previously purchased entitlements (e.g., after reinstall).
     */
    async function restorePurchases() {
        const store = await _getStore();
        if (!store) return { ok: false, reason: 'web-not-supported' };
        try {
            await store.restorePurchases();
            return { ok: true };
        } catch (e) {
            _warn('Restore failed:', e);
            return { ok: false, reason: (e && e.message) || 'restore-error' };
        }
    }

    /**
     * Localized price string for display, or null if unknown.
     */
    function getPriceString() {
        try {
            const p = (_store && _store.get && _store.get(PRODUCT_ID_REMOVE_ADS)) || _product;
            if (p && p.pricing && p.pricing.price) return p.pricing.price;
        } catch (e) {}
        return null;
    }

    /**
     * Localized price string for the Founder Pass, or null if not yet loaded.
     */
    function getFounderPassPriceString() {
        try {
            const p = (_store && _store.get && _store.get(PRODUCT_ID_FOUNDER_PASS)) || _founderProduct;
            if (p && p.pricing && p.pricing.price) return p.pricing.price;
        } catch (e) {}
        return '$0.99'; // fallback until Play product loads
    }

    function isFounderPassOwned() { return _founderPass; }

    function onFounderPassChange(fn) {
        if (typeof fn === 'function') _founderListeners.add(fn);
        return () => _founderListeners.delete(fn);
    }

    /**
     * Initiate purchase of the standalone Founder Pass (Gold skin + badge).
     * Does NOT remove ads.
     * @returns {Promise<{ok:boolean, reason?:string}>}
     */
    async function purchaseFounderPass() {
        if (_founderPass) return { ok: true, reason: 'already-owned' };

        const store = await _getStore();
        if (!store) return { ok: false, reason: 'web-not-supported' };
        const product = store.get(PRODUCT_ID_FOUNDER_PASS) || _founderProduct;
        if (!product) return { ok: false, reason: 'product-not-loaded' };

        try {
            const offer = product.getOffer && product.getOffer();
            if (offer && typeof offer.order === 'function') {
                await offer.order();
            } else if (typeof product.order === 'function') {
                await product.order();
            } else {
                return { ok: false, reason: 'order-api-missing' };
            }
            return { ok: true, reason: 'pending' };
        } catch (e) {
            _warn('Founder Pass purchase failed:', e);
            return { ok: false, reason: (e && e.message) || 'purchase-error' };
        }
    }

    return {
        initialize,
        isAdFree,
        isReady: () => _ready,
        onReady: (fn) => {
            if (typeof fn !== 'function') return () => {};
            if (_ready) { try { fn(_adFree); } catch (e) {} return () => {}; }
            _readyListeners.add(fn);
            return () => _readyListeners.delete(fn);
        },
        onChange,
        purchaseRemoveAds,
        restorePurchases,
        getPriceString,
        // Founder Pass (standalone Gold skin + Founder badge, no ad removal).
        isFounderPassOwned,
        onFounderPassChange,
        purchaseFounderPass,
        getFounderPassPriceString,
        // Cross-device sync: pulls server-side entitlements for the current
        // signed-in Play Games player and mirrors any owned SKUs locally.
        // Safe to call repeatedly; no-op until the player ID is known.
        syncRemoteEntitlements: (force = false) => _pullEntitlementsRemote(!!force),
        PRODUCT_ID_REMOVE_ADS,
        PRODUCT_ID_FOUNDER_PASS,
    };
})();

window.PurchaseManager = PurchaseManager;
