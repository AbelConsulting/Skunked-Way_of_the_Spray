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
 *   2. Create a managed product in Google Play Console:
 *        Product ID: remove_ads
 *        Type: One-time (managed)
 *        Price: $1.99
 *   3. npx cap sync android
 *   4. Upload a signed bundle to a Play Console internal testing track and add
 *      yourself as a license tester so the purchase flow works in test mode.
 */

const PurchaseManager = (() => {
    'use strict';

    const PRODUCT_ID_REMOVE_ADS = 'remove_ads';
    const STORAGE_KEY_AD_FREE   = 'skunkfu.adFree';

    let _store         = null;     // CdvPurchase.store reference
    let _initialized   = false;
    let _adFree        = _readEntitlementFromStorage();
    let _product       = null;     // CdvPurchase.Product
    const _listeners   = new Set();

    function _log(...args) { try { console.log('[Purchase]', ...args); } catch(e) {} }
    function _warn(...args) { try { console.warn('[Purchase]', ...args); } catch(e) {} }

    function _readEntitlementFromStorage() {
        try { return localStorage.getItem(STORAGE_KEY_AD_FREE) === '1'; } catch (e) { return false; }
    }

    function _writeEntitlement(v) {
        try { localStorage.setItem(STORAGE_KEY_AD_FREE, v ? '1' : '0'); } catch (e) {}
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
            return;
        }

        try {
            const CdvPurchase = window.CdvPurchase;
            const { ProductType, Platform, LogLevel } = CdvPurchase;

            store.verbosity = LogLevel.WARNING;

            store.register([{
                id:       PRODUCT_ID_REMOVE_ADS,
                type:     ProductType.NON_CONSUMABLE,
                platform: Platform.GOOGLE_PLAY,
            }]);

            store.when()
                .productUpdated((p) => {
                    if (p && p.id === PRODUCT_ID_REMOVE_ADS) {
                        _product = p;
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
                    if (tx && tx.products && tx.products.some(p => p.id === PRODUCT_ID_REMOVE_ADS)) {
                        _setAdFree(true, 'purchase');
                    }
                })
                .receiptUpdated((r) => {
                    // Reconcile owned products on each receipt update (handles restore).
                    try {
                        const owned = store.owned(PRODUCT_ID_REMOVE_ADS);
                        if (owned) _setAdFree(true, 'restore');
                    } catch (e) {}
                });

            await store.initialize([CdvPurchase.Platform.GOOGLE_PLAY]);
            _log('Store initialized.');

            // Cross-check ownership on init.
            try {
                if (store.owned(PRODUCT_ID_REMOVE_ADS)) _setAdFree(true, 'init-owned');
            } catch (e) {}

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

    return {
        initialize,
        isAdFree,
        onChange,
        purchaseRemoveAds,
        restorePurchases,
        getPriceString,
        PRODUCT_ID_REMOVE_ADS,
    };
})();

window.PurchaseManager = PurchaseManager;
