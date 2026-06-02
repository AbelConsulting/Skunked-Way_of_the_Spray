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
    let _storePollDone = false;    // True after first poll attempt (avoids 8s re-poll on every click)
    let _initialized   = false;
    let _ready         = false;    // True after initialize() resolves (success OR no-store)
    let _readyMode     = 'not-ready'; // How _markReady was reached: 'store-init'|'init-error'|'watchdog'|'no-store'
    let _storeInitError = null;    // Error message if store.initialize() threw/timed-out
    let _adFree        = _readEntitlementFromStorage();
    let _founderPass   = _readFounderPassFromStorage();
    let _product       = null;     // CdvPurchase.Product (remove_ads)
    let _founderProduct = null;    // CdvPurchase.Product (founder_pass)
    // Last seen Google Play purchase token, keyed by SKU. Captured in
    // .approved() / .finished() so we can forward it to the server-side
    // entitlement endpoint for receipt verification.
    const _lastPurchaseToken = Object.create(null);
    // Last order error string (code + message) for both SKUs — shown in the
    // in-app diagnostic panel without needing Chrome DevTools.
    let _lastOrderError = 'none';
    function _captureToken(tx) {
        try {
            const token = (tx && (tx.transactionId
                || (tx.nativePurchase && tx.nativePurchase.purchaseToken)
                || (tx.purchase && tx.purchase.purchaseToken))) || '';
            if (!token || !tx || !Array.isArray(tx.products)) return;
            for (const p of tx.products) {
                if (p && p.id) _lastPurchaseToken[p.id] = token;
            }
        } catch (e) {}
    }
    const _listeners   = new Set();
    const _founderListeners = new Set();
    const _readyListeners = new Set();

    function _markReady(reason) {
        if (_ready) return;
        _ready = true;
        _readyMode = reason;
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
    function _pushEntitlementRemote(sku, opts) {
        const api = _getApi();
        const pid = _getPlayerId();
        if (!api || !pid || !sku) return;
        const purchaseToken = (opts && opts.purchaseToken) || _lastPurchaseToken[sku] || '';
        const productId     = (opts && opts.productId) || sku;
        try {
            api.setEntitlement(pid, sku, { purchaseToken, productId }).then(ok => {
                if (ok) _log('Mirrored entitlement to server:', sku, purchaseToken ? '(verified)' : '(unverified)');
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
            // Tell AdManager to reconcile (skip interstitial, etc.)
            try {
                if (window.AdManager && _adFree) {
                    // No banner to remove; interstitial is gated by _isAdFree() in onStageComplete.
                }
            } catch (e) { _warn('AdManager reconcile failed:', e); }
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
     *
     * The cordova-plugin-purchase global (`window.CdvPurchase`) is exposed by
     * the cordova bridge AFTER `deviceready`. PurchaseManager.initialize()
     * runs from main.js as soon as the game is ready, which is often a few
     * hundred ms BEFORE deviceready fires on Android. Without a wait we'd
     * hit a transient `null` and permanently degrade to the web fallback,
     * leaving the Remove-Ads modal stuck on “Checking purchases…” for users
     * who happen to open it during that race window.
     *
     * So if we don't see the global, poll for it up to ~8s before giving up.
     */
    async function _getStore() {
        if (_store) return _store;
        if (!isNative()) return null;
        // Skip re-poll if we already know the plugin is unavailable.
        if (_storePollDone) return null;

        // CdvPurchase exposes itself as window.CdvPurchase when the cordova plugin
        // is installed. We don't `import` it because we don't want a hard build dep.
        let CdvPurchase = window.CdvPurchase;
        if (!CdvPurchase || !CdvPurchase.store) {
            const deadline = Date.now() + 8000;
            while (Date.now() < deadline) {
                await new Promise(r => setTimeout(r, 200));
                CdvPurchase = window.CdvPurchase;
                if (CdvPurchase && CdvPurchase.store) break;
            }
        }
        _storePollDone = true; // remember result so future calls don't re-poll
        if (!CdvPurchase || !CdvPurchase.store) {
            _warn('CdvPurchase plugin not available after 8s wait. Install with: npm i cordova-plugin-purchase && npx cap sync android');
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

        // Hard watchdog: no matter what happens below (plugin hang, native
        // crash, exception in third-party code, etc.) the UI must NEVER be
        // stuck on "Checking purchases…" indefinitely. If _markReady() has
        // not been called within 22s (8s plugin poll + 12s init race + 2s
        // slack) we force-flip ready so the Buy button enables and the user
        // can at least attempt a purchase (which surfaces a clear error).
        // This is the bug that caused at least one uninstall: a user whose
        // bridge race left them stuck forever on the spinner.
        const _watchdog = setTimeout(() => {
            if (!_ready) {
                _warn('Watchdog firing — store init never completed in 22s. Forcing ready.');
                try {
                    if (window.Analytics && typeof Analytics.trackEvent === 'function') {
                        Analytics.trackEvent('iap_init_watchdog_fired', {
                            isNative: isNative(),
                            hasPlugin: !!(window.CdvPurchase && window.CdvPurchase.store),
                            adFree: _adFree
                        });
                    }
                } catch (_) {}
                _markReady('watchdog');
            }
        }, 22000);

        const store = await _getStore();
        if (!store) {
            _log('Native store unavailable. Web fallback active. Ad-free=' + _adFree);
            clearTimeout(_watchdog);
            _markReady('no-store');
            return;
        }

        try {
            const CdvPurchase = window.CdvPurchase;
            const { ProductType, Platform, LogLevel } = CdvPurchase;

            // TEMP: DEBUG verbosity for IAP diagnostics — set back to
            // LogLevel.WARNING before release. This pipes every BillingClient
            // event (startConnection, queryProductDetails, launchBillingFlow
            // responses, etc.) to logcat via CdvPurchase's internal logger,
            // visible in Chrome Remote DevTools console and `adb logcat`.
            store.verbosity = LogLevel.DEBUG;

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
                        const wasLoaded = !!(_product && _product.pricing);
                        _product = p;
                        _log('Product loaded:', p.id, p.pricing && p.pricing.price);
                        // Re-notify UI subscribers so a disabled "Loading…" button re-enables
                        // now that the product details have arrived from Google Play.
                        if (!wasLoaded && p.pricing) {
                            _listeners.forEach(fn => { try { fn(_adFree); } catch(e) {} });
                        }
                    } else if (p.id === PRODUCT_ID_FOUNDER_PASS) {
                        const wasLoaded = !!(_founderProduct && _founderProduct.pricing);
                        _founderProduct = p;
                        _log('Product loaded:', p.id, p.pricing && p.pricing.price);
                        if (!wasLoaded && p.pricing) {
                            _founderListeners.forEach(fn => { try { fn(_founderPass); } catch(e) {} });
                        }
                    }
                })
                .approved((tx) => {
                    _log('Transaction approved:', tx);
                    _captureToken(tx);
                    // CRITICAL: No `store.validator` is registered, so per
                    // cordova-plugin-purchase v13 docs we MUST call tx.finish()
                    // directly here. Previously we called tx.verify().then(()=>tx.finish())
                    // with a .catch that swallowed errors — if verify() rejected for
                    // any reason, finish() was never called, leaving the purchase
                    // un-acknowledged. Google Play auto-refunds unacknowledged
                    // purchases after 3 days, which is the exact symptom users
                    // reported ("I paid but ads are still showing"). Server-side
                    // receipt verification still happens via _pushEntitlementRemote()
                    // → verifyPurchase Cloud Function (see functions/index.js).
                    //
                    // Belt-and-suspenders: also flip the local entitlement here.
                    // .finished() will run it again (idempotent in _setAdFree)
                    // but if .finished() somehow doesn't fire on this device,
                    // the player has still been charged and deserves the unlock.
                    try {
                        if (tx && Array.isArray(tx.products)) {
                            if (tx.products.some(p => p && p.id === PRODUCT_ID_REMOVE_ADS)) {
                                _setAdFree(true, 'approved');
                            }
                            if (tx.products.some(p => p && p.id === PRODUCT_ID_FOUNDER_PASS)) {
                                _setFounderPassOwned(true, 'approved');
                            }
                        }
                    } catch (e) { _warn('entitlement flip in approved failed', e); }
                    try { tx.finish(); }
                    catch (e) { _warn('tx.finish() failed', e); }
                })
                .verified((receipt) => {
                    // Reached only if a validator is registered in the future.
                    // Kept for forward compatibility; safe no-op today.
                    _log('Receipt verified:', receipt);
                    _captureToken(receipt);
                    try { receipt.finish(); } catch (e) {}
                })
                .finished((tx) => {
                    _log('Transaction finished:', tx);
                    _captureToken(tx);
                    if (tx && tx.products) {
                        if (tx.products.some(p => p.id === PRODUCT_ID_REMOVE_ADS)) {
                            _setAdFree(true, 'purchase');
                        }
                        if (tx.products.some(p => p.id === PRODUCT_ID_FOUNDER_PASS)) {
                            _setFounderPassOwned(true, 'purchase');
                        }
                        // Google Ads conversion — only fires on web (gtag script not loaded in Capacitor native).
                        try {
                            if (typeof gtag === 'function') {
                                gtag('event', 'conversion', {
                                    'send_to': 'AW-18170482905/sLK9CNfb864cENmhrthD',
                                    'transaction_id': (tx.transactionId || tx.nativeTransactionId || tx.id || '')
                                });
                            }
                        } catch (e) {}
                    }
                })
                .receiptUpdated((r) => {
                    // Reconcile owned products on each receipt update (handles restore).
                    try {
                        if (store.owned(PRODUCT_ID_REMOVE_ADS))   _setAdFree(true, 'restore');
                        if (store.owned(PRODUCT_ID_FOUNDER_PASS)) _setFounderPassOwned(true, 'restore');
                    } catch (e) {}
                });

            // Race store.initialize() against a hard timeout. Google Play
            // Billing can occasionally hang on the first connection (license-
            // tester accounts, transient Play services restarts, no network).
            // Without this cap, _markReady() never fires and the Remove-Ads
            // modal stays stuck on “Checking purchases…” forever (the exact
            // symptom early users reported). 12s is well past any healthy
            // init and below the patience threshold of someone tapping Buy.
            const initTimeoutMs = 12000;
            await Promise.race([
                store.initialize([CdvPurchase.Platform.GOOGLE_PLAY]),
                new Promise((_resolve, reject) => setTimeout(
                    () => reject(new Error('store.initialize timeout after ' + initTimeoutMs + 'ms')),
                    initTimeoutMs
                ))
            ]);
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
            clearTimeout(_watchdog);
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
            _storeInitError = String(e && (e.message || e));
            _warn('Store init failed:', e);
            clearTimeout(_watchdog);
            _markReady('init-error');
        }
    }

    /**
     * Wait until the manager is ready (store.initialize finished or errored), or
     * until timeoutMs elapses. This prevents `product-not-loaded` errors when the
     * user taps Buy during the brief startup window.
     */
    function _waitForReady(timeoutMs = 14000) {
        if (_ready) return Promise.resolve();
        return new Promise(resolve => {
            const timer = setTimeout(() => { done(); }, timeoutMs);
            function done() {
                clearTimeout(timer);
                _readyListeners.delete(done);
                resolve();
            }
            _readyListeners.add(done);
        });
    }

    /**
     * Force the store to re-query the Play Billing catalogue and wait briefly
     * for productUpdated() to populate `sku`. Used as a self-heal step when the
     * user taps Buy but the initial catalogue fetch never returned pricing
     * (common on fresh installs, account swaps, or while the Play app is busy).
     * Returns the product (with pricing) or null if it never arrived.
     */
    async function _refreshProduct(sku, timeoutMs = 6000) {
        const store = _store;
        if (!store) return null;
        // Trigger a re-fetch. cordova-plugin-purchase exposes either store.update()
        // or store.refresh(); call whichever exists. Both are safe no-ops if Play
        // Billing is already syncing.
        try {
            if (typeof store.update === 'function') {
                // returns a promise in newer plugin versions; ignore failures
                Promise.resolve(store.update()).catch(() => {});
            } else if (typeof store.refresh === 'function') {
                Promise.resolve(store.refresh()).catch(() => {});
            }
        } catch (_) {}
        const deadline = Date.now() + timeoutMs;
        while (Date.now() < deadline) {
            const p = (store.get && store.get(sku)) ||
                      (sku === PRODUCT_ID_REMOVE_ADS ? _product : _founderProduct);
            if (p && p.pricing && p.pricing.price) return p;
            await new Promise(r => setTimeout(r, 250));
        }
        // Last-ditch: return whatever we have, even without pricing — the order
        // call may still succeed (Play Billing can show its own pricing UI).
        return (store.get && store.get(sku)) ||
               (sku === PRODUCT_ID_REMOVE_ADS ? _product : _founderProduct) ||
               null;
    }

    /**
     * Initiate purchase of the Remove Ads product.
     * @returns {Promise<{ok:boolean, reason?:string}>}
     */
    async function purchaseRemoveAds() {
        if (_adFree) return { ok: true, reason: 'already-owned' };

        const store = await _getStore();
        if (!store) {
            // Return a distinct reason so the UI can give a sensible message
            // whether we're on web or on Android with a missing plugin.
            return { ok: false, reason: isNative() ? 'store-unavailable' : 'web-not-supported' };
        }

        // Wait for store.initialize() to finish so the product catalogue is loaded.
        await _waitForReady();

        // Self-heal: if Play Billing never delivered pricing for this SKU
        // (the root cause of the "indefinitely loading" reports), force a
        // fresh catalogue fetch and wait up to ~6s for productUpdated().
        let product = store.get(PRODUCT_ID_REMOVE_ADS) || _product;
        if (!product || !product.pricing) {
            _log('remove_ads not in catalogue — forcing refresh before order.');
            product = await _refreshProduct(PRODUCT_ID_REMOVE_ADS);
        }
        if (!product) return { ok: false, reason: 'product-not-loaded' };

        try {
            // CdvPurchase v13: order() returns Promise<IError | undefined>.
            // An IError means the order was rejected (e.g. item not available,
            // already owned, billing unavailable) WITHOUT throwing. Previously
            // the return value was ignored, causing a silent "Completing…" with
            // no billing dialog — the root cause of "button does nothing" reports.
            const offer = product.getOffer && product.getOffer();
            let orderErr;
            if (offer && typeof offer.order === 'function') {
                orderErr = await offer.order();
            } else if (typeof product.order === 'function') {
                orderErr = await product.order();
            } else {
                return { ok: false, reason: 'order-api-missing' };
            }
            if (orderErr) {
                _warn('Purchase order rejected:', orderErr);
                const errCode = orderErr.code != null ? String(orderErr.code) : '';
                const errMsg  = orderErr.message || '';
                const reason  = (errCode === '1') ? 'user-cancelled'
                              : (errMsg || ('error-' + (errCode || 'unknown')));
                _lastOrderError = '[' + PRODUCT_ID_REMOVE_ADS + '] code=' + (errCode || '?') + ' msg=' + (errMsg || reason);
                return { ok: false, reason };
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
        if (!store) return { ok: false, reason: isNative() ? 'store-unavailable' : 'web-not-supported' };
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
        // Fallback so the Buy button never reads as blank/null while the Play
        // catalogue is still loading. Matches the product's USD list price.
        return '$1.99';
    }

    /** True once the store init phase is done (or timed out), signalling that
     *  the buy button should be enabled. Previously this required Google Play to
     *  have returned pricing data, but that fetch can stall indefinitely (new SKU
     *  propagation delay, Play Services hiccup) leaving the UI stuck on
     *  "Loading product…" forever. Instead we unblock the button as soon as
     *  _ready is true and let purchaseRemoveAds() surface any real error
     *  ("product-not-loaded", "store-unavailable", etc.) on the actual tap.
     *  getPriceString() already returns the $1.99 fallback so the label is never
     *  blank. */
    function isRemoveAdsProductLoaded() {
        return _ready;
    }

    /** Same rationale as isRemoveAdsProductLoaded — unblock the Founder Pass
     *  button as soon as the store init phase completes. */
    function isFounderPassProductLoaded() {
        return _ready;
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
        if (!store) return { ok: false, reason: isNative() ? 'store-unavailable' : 'web-not-supported' };

        // Wait for store.initialize() so the product catalogue is loaded.
        await _waitForReady();

        // Self-heal: same retry path as Remove Ads — force a fresh catalogue
        // fetch if the SKU never propagated to this device.
        let product = store.get(PRODUCT_ID_FOUNDER_PASS) || _founderProduct;
        if (!product || !product.pricing) {
            _log('founder_pass not in catalogue — forcing refresh before order.');
            product = await _refreshProduct(PRODUCT_ID_FOUNDER_PASS);
        }
        if (!product) return { ok: false, reason: 'product-not-loaded' };

        try {
            // CdvPurchase v13: order() returns Promise<IError | undefined>.
            // Surface any returned IError so the UI can show a real message.
            const offer = product.getOffer && product.getOffer();
            let orderErr;
            if (offer && typeof offer.order === 'function') {
                orderErr = await offer.order();
            } else if (typeof product.order === 'function') {
                orderErr = await product.order();
            } else {
                return { ok: false, reason: 'order-api-missing' };
            }
            if (orderErr) {
                _warn('Founder Pass order rejected:', orderErr);
                const errCode = orderErr.code != null ? String(orderErr.code) : '';
                const errMsg  = orderErr.message || '';
                const reason  = (errCode === '1') ? 'user-cancelled'
                              : (errMsg || ('error-' + (errCode || 'unknown')));
                _lastOrderError = '[' + PRODUCT_ID_FOUNDER_PASS + '] code=' + (errCode || '?') + ' msg=' + (errMsg || reason);
                return { ok: false, reason };
            }
            return { ok: true, reason: 'pending' };
        } catch (e) {
            _warn('Founder Pass purchase failed:', e);
            return { ok: false, reason: (e && e.message) || 'purchase-error' };
        }
    }

    /**
     * Diagnostic dump — call from Chrome Remote DevTools console:
     *   PurchaseManager.diagnose()
     *
     * Reports:
     *  - Whether CdvPurchase plugin loaded
     *  - Whether store.initialize() completed
     *  - Raw product objects from the store (includes pricing, state, offers)
     *  - Local entitlement flags
     *  - Last known purchase tokens
     *  - BillingClient connection state (if exposed by plugin)
     */
    function diagnose() {
        const CdvPurchase = window.CdvPurchase;
        const store = _store;
        const out = {
            isNative: isNative(),
            pluginLoaded: !!(CdvPurchase && CdvPurchase.store),
            storeRef: !!store,
            initialized: _initialized,
            ready: _ready,
            readyMode: _readyMode,
            storeInitError: _storeInitError || 'none',
            storePollDone: _storePollDone,
            adFree_localStorage: _readEntitlementFromStorage(),
            adFree_runtime: _adFree,
            founderPass_localStorage: _readFounderPassFromStorage(),
            founderPass_runtime: _founderPass,
            lastPurchaseTokens: Object.assign({}, _lastPurchaseToken),
            lastOrderError: _lastOrderError,
        };
        // Dump raw product objects so we can see if pricing arrived
        if (store) {
            try {
                out.products = {
                    remove_ads:   store.get ? store.get(PRODUCT_ID_REMOVE_ADS)  : _product,
                    founder_pass: store.get ? store.get(PRODUCT_ID_FOUNDER_PASS) : _founderProduct,
                };
            } catch (e) { out.products_error = String(e); }
            // receipts — shows what Google Play has reported as owned
            try { out.receipts = store.receipts; } catch (e) {}
            // transactions
            try { out.transactions = store.transactions; } catch (e) {}
        }
        if (CdvPurchase) {
            try { out.CdvPurchase_version = CdvPurchase.version || 'unknown'; } catch (e) {}
        }
        console.log('[Purchase:diagnose]', JSON.stringify(out, null, 2));
        return out;
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
        isRemoveAdsProductLoaded,
        isFounderPassProductLoaded,
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
        /** Diagnostic dump. Call from Chrome Remote DevTools: PurchaseManager.diagnose() */
        diagnose,
    };
})();

window.PurchaseManager = PurchaseManager;

// -------------------------------------------------------------------------
// Self-initialize. Previously initialize() was only invoked from deep inside
// the game-init chain in js/main.js; if anything upstream threw on a user's
// device, initialize() was never called and isReady() stayed false forever,
// permanently freezing the Remove Ads card on "Checking purchases…". Kick
// off init from the module itself so the IAP store path is independent of
// game readiness. initialize() is idempotent (guarded by _initialized) so
// the existing call from main.js remains a harmless no-op.
// -------------------------------------------------------------------------
(function _autoInitPurchaseManager() {
    function go() {
        try { PurchaseManager.initialize(); } catch (e) {
            try { console.warn('[Purchase] auto-init failed:', e); } catch (_) {}
        }
    }
    try {
        // On Cordova/Capacitor the bridge fires `deviceready` once native is
        // available. Hook both that and the DOM ready event so we always
        // initialize regardless of which fires first / whether the bridge is
        // present (web build just runs immediately).
        if (typeof document !== 'undefined') {
            document.addEventListener('deviceready', go, { once: true });
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                setTimeout(go, 0);
            } else {
                document.addEventListener('DOMContentLoaded', go, { once: true });
            }
        } else {
            setTimeout(go, 0);
        }
    } catch (_) {}
})();
