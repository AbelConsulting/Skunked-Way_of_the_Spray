/**
 * adManager.js — Manages AdMob ads via @capacitor-community/admob.
 *
 * Provides Rewarded Video ("Watch Ad to Revive") and Interstitial ads
 * for the Android build. Gracefully no-ops on web / when plugin is absent.
 *
 * AdMob app (Google Play — com.skunksquad.skunkfu):
 *   App ID:        ca-app-pub-8519140628365141~5979271944
 *
 * Ad units under that app:
 *   Interstitial (betweenlevels): ca-app-pub-8519140628365141/5195233926
 *   Rewarded (extra life):     ca-app-pub-8519140628365141/3920084812
 *
 * Google AdMob test ad unit IDs (used when testing = true):
 *   Rewarded:     ca-app-pub-3940256099942544/5224354917
 *   Interstitial: ca-app-pub-3940256099942544/1033173712
 */

const AdManager = (() => {
    'use strict';

    // ── Configuration ──────────────────────────────────────────────
    // Defaults; runtime overrides come from localStorage `skunkfu_adConfig`
    // (a JSON object). This lets us tune cadence remotely (e.g. via a Cloud
    // Function-served config) without redeploying. Only the listed keys can
    // be overridden — ad unit IDs and rewarded format are intentionally
    // baked-in to avoid client-side ad spoofing.
    const TUNABLE_KEYS = [
        'interstitialEveryNStages',
        'interstitialMinIntervalSec',
        'interstitialFirstInstallSkipCount',
        'maxRevivesPerSession'
    ];
    const DEFAULT_CONFIG = {
        // Real ad unit IDs from AdMob console (app ~5979271944, Google Play link):
        rewardedAdUnitId:     'ca-app-pub-8519140628365141/3920084812',
        interstitialAdUnitId: 'ca-app-pub-8519140628365141/5195233926',

        // Google's official test ad unit IDs — used when testing is true
        testRewardedId:      'ca-app-pub-3940256099942544/5224354917',
        testInterstitialId:  'ca-app-pub-3940256099942544/1033173712',

        // Set to false for production builds
        testing: false,

        // Set to true to enable the AdSense H5 Games Ads API on web.
        // Requires the AdSense account to be approved and active.
        // false = web rewarded ads disabled.
        webRewardedEnabled: true,

        // Which rewarded ad format the configured rewardedAdUnitId belongs to.
        //   'rewardInterstitial' → prepareRewardInterstitialAd / showRewardInterstitialAd
        //   'rewardVideo'       → prepareRewardVideoAd       / showRewardVideoAd
        // The ad unit's type in the AdMob console must match this value or
        // requests will silently no-fill. The "extra life" unit
        // (3920084812) is type Rewarded, so we use 'rewardVideo'.
        rewardedFormat: 'rewardVideo',

        // Show an interstitial every N stages (0 = never)
        interstitialEveryNStages: 3,
        // Minimum seconds between interstitials (frequency cap)
        interstitialMinIntervalSec: 90,
        // First-install grace: how many interstitials to skip on a brand-new
        // install. Helps D1 retention by not showing an ad mid-tutorial. The
        // counter persists in localStorage as `skunkfu_iapInterSkipped`.
        interstitialFirstInstallSkipCount: 1,

        // Max rewarded revives per session (prevent abuse)
        maxRevivesPerSession: 2,
    };
    const CONFIG = Object.assign({}, DEFAULT_CONFIG);
    function _applyStoredOverrides() {
        try {
            const raw = localStorage.getItem('skunkfu_adConfig');
            if (!raw) return;
            const overrides = JSON.parse(raw);
            if (!overrides || typeof overrides !== 'object') return;
            for (const k of TUNABLE_KEYS) {
                if (Object.prototype.hasOwnProperty.call(overrides, k)) {
                    CONFIG[k] = overrides[k];
                }
            }
            try { console.log('[AdManager] Applied stored config overrides:', overrides); } catch (e) {}
        } catch (e) { /* malformed JSON — ignore */ }
    }
    _applyStoredOverrides();

    // ── State ──────────────────────────────────────────────────────
    let _plugin       = null;   // AdMob plugin reference
    let _initialized  = false;
    let _available     = false;  // true only on native Android with plugin
    let _rewardedReady      = false;
    let _interstitialReady  = false;
    let _revivesUsed        = 0;
    let _stagesSinceAd      = 0;
    let _lastInterstitialAt = 0;
    let _adShowing          = false; // true while a rewarded/interstitial is on screen
    let _pausedStateBeforeAd = null; // game.state value captured at pause time

    // ── Web (AdSense adBreak) rewarded state ─────────────────────────────
    let _webInitDone = false;
    let _webAdReady  = false; // true once adConfig onReady fires

    // ── Helpers ────────────────────────────────────────────────────
    function _getRewardedId() {
        return CONFIG.testing ? CONFIG.testRewardedId : CONFIG.rewardedAdUnitId;
    }

    function _getInterstitialId() {
        return CONFIG.testing ? CONFIG.testInterstitialId : CONFIG.interstitialAdUnitId;
    }

    function _log(...args) {
        console.log('[AdManager]', ...args);
    }

    function _warn(...args) {
        console.warn('[AdManager]', ...args);
    }

    function _isAdFree() {
        try { return !!(window.PurchaseManager && window.PurchaseManager.isAdFree && window.PurchaseManager.isAdFree()); } catch (e) { return false; }
    }

    // ── Web (AdSense H5 Games Ads — adBreak API) rewarded helpers ─────────
    // AdSense uses the Ad Placement API (adConfig / adBreak) for web games,
    // NOT GPT. The adsbygoogle.js script exposes window.adConfig and
    // window.adBreak automatically once loaded.
    const WEB_PUB_ID = 'ca-pub-8519140628365141';

    function _loadAdsenseScript() {
        return new Promise((resolve) => {
            // Already loaded by adsbygoogle tag or a prior call
            if (window.adsbygoogle && typeof window.adBreak === 'function') {
                resolve();
                return;
            }
            if (document.querySelector('script[src*="adsbygoogle.js"]')) {
                // Script tag exists but may still be loading — poll briefly
                let tries = 0;
                const poll = setInterval(() => {
                    tries++;
                    if (typeof window.adBreak === 'function' || tries > 40) {
                        clearInterval(poll);
                        resolve();
                    }
                }, 250);
                return;
            }
            const s = document.createElement('script');
            s.async = true;
            s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + WEB_PUB_ID;
            s.crossOrigin = 'anonymous';
            s.onload = resolve;
            s.onerror = resolve; // resolve even on failure — caller checks adBreak
            document.head.appendChild(s);
        });
    }

    async function _initWeb() {
        if (_webInitDone) return;
        _webInitDone = true;

        if (!DEFAULT_CONFIG.webRewardedEnabled) {
            _log('Web rewarded ads disabled (webRewardedEnabled=false).');
            return;
        }

        try {
            await _loadAdsenseScript();

            if (typeof window.adConfig !== 'function') {
                _warn('adConfig not available — AdSense script may not have loaded.');
                return;
            }

            window.adConfig({
                preloadAdBreaks: 'on',
                sound: 'enabled',
                onReady: () => {
                    _webAdReady = true;
                    _log('AdSense H5 Games Ads ready.');
                }
            });
        } catch (e) {
            _warn('_initWeb error:', e);
        }
    }

    function _showWebRewarded() {
        if (!_webAdReady) return Promise.resolve(false);
        if (typeof window.adBreak !== 'function') return Promise.resolve(false);

        return new Promise((resolve) => {
            let adActuallyShown = false;
            let rewardEarned   = false;
            let wasPaused      = false;

            window.adBreak({
                type: 'reward',
                name: 'revive',
                beforeAd: () => {
                    // Called only when an ad is actually available and about to show
                    adActuallyShown = true;
                    wasPaused = _pauseGameForAd();
                    _setAdShowing(true);
                },
                adDismissed: () => {
                    // Player closed without watching to completion
                    rewardEarned = false;
                },
                adViewed: () => {
                    // Player earned the reward
                    rewardEarned = true;
                    _revivesUsed++;
                    try { Analytics.trackAdImpression({ type: 'rewarded', placement: 'revive', platform: 'web' }); } catch (_) {}
                },
                afterAd: () => {
                    if (adActuallyShown) {
                        _setAdShowing(false);
                        if (wasPaused) _resumeGameAfterAd();
                    } else {
                        // No fill — hide button until next game over
                        _webAdReady = false;
                        _warn('Web rewarded: no fill.');
                        try { Analytics.trackAdNoFill({ type: 'rewarded', placement: 'revive', phase: 'show', platform: 'web', reason: 'no_fill' }); } catch (_) {}
                    }
                    resolve(rewardEarned);
                }
            });
        });
    }

    // ── Initialization ─────────────────────────────────────────────
    async function initialize() {
        if (_initialized) return;
        _initialized = true;

        const isNative = typeof window !== 'undefined' &&
            window.Capacitor &&
            window.Capacitor.isNativePlatform &&
            window.Capacitor.isNativePlatform();

        if (!isNative) {
            // Web: initialize GPT rewarded ads if a slot is configured
            _initWeb();
            return;
        }

        try {
            // Access the plugin via the Capacitor bridge (works in non-bundled WebView).
            // Dynamic import('@capacitor-community/admob') fails when bundle:false because
            // esbuild does not resolve node_modules and the WebView treats it as a URL.
            _plugin = window.Capacitor &&
                      window.Capacitor.Plugins &&
                      window.Capacitor.Plugins.AdMob;

            if (!_plugin) {
                _warn('AdMob plugin not found in Capacitor.Plugins.');
                return;
            }

            await _plugin.initialize({
                initializeForTesting: CONFIG.testing,
            });

            _available = true;
            _log('AdMob initialized successfully (testing=' + CONFIG.testing + ').');

            // Pre-load ads in the background
            _prepareRewarded();
            _prepareInterstitial();

        } catch (e) {
            _warn('AdMob init failed:', e);
        }
    }

    // ── Rewarded Video / Rewarded Interstitial ─────────────────────────────
    // The @capacitor-community/admob v8 plugin exposes two rewarded
    // formats with distinct method names. CONFIG.rewardedFormat decides
    // which pair we call. Picking the wrong one causes a silent no-fill,
    // which is what was happening when prepareRewardedAd/showRewardedAd
    // (non-existent methods) were used previously.
    function _rewardedPrepareFn() {
        if (!_plugin) return null;
        return CONFIG.rewardedFormat === 'rewardVideo'
            ? _plugin.prepareRewardVideoAd
            : _plugin.prepareRewardInterstitialAd;
    }
    function _rewardedShowFn() {
        if (!_plugin) return null;
        return CONFIG.rewardedFormat === 'rewardVideo'
            ? _plugin.showRewardVideoAd
            : _plugin.showRewardInterstitialAd;
    }

    async function _prepareRewarded() {
        if (!_available || !_plugin) return;
        const prepare = _rewardedPrepareFn();
        if (typeof prepare !== 'function') {
            _warn('Rewarded prepare method not found on plugin (format=' + CONFIG.rewardedFormat + ').');
            _rewardedReady = false;
            return;
        }
        try {
            await prepare.call(_plugin, {
                adId: _getRewardedId(),
                isTesting: CONFIG.testing,
            });
            _rewardedReady = true;
            _log('Rewarded ad ready (' + CONFIG.rewardedFormat + ').');
        } catch (e) {
            _rewardedReady = false;
            _warn('Failed to prepare rewarded ad:', e);
            try { Analytics.trackAdNoFill({ type: 'rewarded', placement: 'revive', phase: 'prepare', reason: (e && e.message) || String(e) }); } catch (_) {}
        }
    }

    /**
     * Check if the player can watch a rewarded ad to revive.
     * @returns {boolean}
     */
    function canShowRewarded() {
        // Rewarded ads remain available for everyone, including Remove-Ads owners.
        // The Remove-Ads SKU only suppresses interstitial. Rewarded is
        // an opt-in trade ("watch a 30s ad to revive") that ad-free players can
        // still choose to use for the extra life.
        if (_revivesUsed >= CONFIG.maxRevivesPerSession) return false;
        if (_available) return _rewardedReady;                          // native (AdMob)
        return !!DEFAULT_CONFIG.webRewardedEnabled && _webAdReady;      // web (AdSense)
    }

    /**
     * Show a rewarded video ad. Returns a Promise that resolves to
     * true if the user earned the reward, false otherwise.
     * @returns {Promise<boolean>}
     */
    async function showRewarded() {
        if (!canShowRewarded()) return false;

        // Web path — uses GPT rewarded slot
        if (!_available) return _showWebRewarded();

        const wasPaused = _pauseGameForAd();
        _setAdShowing(true);
        try {
            const show = _rewardedShowFn();
            if (typeof show !== 'function') {
                _warn('Rewarded show method not found on plugin (format=' + CONFIG.rewardedFormat + ').');
                return false;
            }
            const result = await show.call(_plugin);
            _rewardedReady = false;
            _revivesUsed++;
            _log('Rewarded ad completed. Revives used:', _revivesUsed, result);
            try { Analytics.trackAdImpression({ type: 'rewarded', placement: 'revive' }); } catch(e) {}

            // Immediately start loading the next one
            _prepareRewarded();

            // The plugin resolves when the user earns the reward
            return true;
        } catch (e) {
            _warn('Rewarded ad failed or was dismissed:', e);
            try {
                const reason = (e && e.message) || String(e || 'dismissed');
                Analytics.trackAdReviveDismissed({ reason });
                Analytics.trackAdNoFill({ type: 'rewarded', placement: 'revive', phase: 'show', reason });
            } catch (_) {}
            _rewardedReady = false;
            _prepareRewarded();
            return false;
        } finally {
            _setAdShowing(false);
            // Always restore game state regardless of ad outcome
            if (wasPaused) _resumeGameAfterAd();
        }
    }

    // ── Interstitial ─────────────────────────────────────────────────────
    async function _prepareInterstitial() {
        if (!_available || !_plugin) return;
        try {
            await _plugin.prepareInterstitial({
                adId: _getInterstitialId(),
                isTesting: CONFIG.testing,
            });
            _interstitialReady = true;
            _log('Interstitial ad ready.');
        } catch (e) {
            _interstitialReady = false;
            _warn('Failed to prepare interstitial:', e);
            try { Analytics.trackAdNoFill({ type: 'interstitial', placement: 'stage_complete', phase: 'prepare', reason: (e && e.message) || String(e) }); } catch (_) {}
        }
    }

    /**
     * Call this when a stage is completed. Shows an interstitial
     * every N stages (configured in CONFIG.interstitialEveryNStages).
     * Returns a Promise that resolves when the ad is dismissed.
     * @returns {Promise<void>}
     */
    async function onStageComplete() {
        if (_isAdFree()) return;
        if (!_available || CONFIG.interstitialEveryNStages <= 0) return;

        _stagesSinceAd++;
        if (_stagesSinceAd < CONFIG.interstitialEveryNStages) return;
        if (!_interstitialReady) return;

        // Frequency cap: don't show two interstitials within N seconds
        const now = Date.now();
        const minMs = (CONFIG.interstitialMinIntervalSec || 0) * 1000;
        if (minMs > 0 && _lastInterstitialAt && (now - _lastInterstitialAt) < minMs) {
            return;
        }

        // First-install grace: skip the first N qualifying interstitials so
        // brand-new players don't get hit with an ad mid-tutorial. Counter
        // persists across sessions; resets only on uninstall/clear-data.
        const skipTarget = CONFIG.interstitialFirstInstallSkipCount | 0;
        if (skipTarget > 0) {
            let skipped = 0;
            try { skipped = parseInt(localStorage.getItem('skunkfu_iapInterSkipped') || '0', 10) || 0; } catch (e) {}
            if (skipped < skipTarget) {
                try { localStorage.setItem('skunkfu_iapInterSkipped', String(skipped + 1)); } catch (e) {}
                _stagesSinceAd = 0; // reset counter so the next one comes in N stages
                _log('Interstitial skipped (first-install grace ' + (skipped + 1) + '/' + skipTarget + ').');
                return;
            }
        }

        const wasPaused = _pauseGameForAd();
        _setAdShowing(true);
        try {
            _stagesSinceAd = 0;
            _lastInterstitialAt = now;
            await _plugin.showInterstitial();
            _log('Interstitial shown.');
            try { Analytics.trackAdImpression({ type: 'interstitial', placement: 'stage_complete' }); } catch(e) {}
        } catch (e) {
            _warn('Interstitial failed:', e);
            try { Analytics.trackAdNoFill({ type: 'interstitial', placement: 'stage_complete', phase: 'show', reason: (e && e.message) || String(e) }); } catch (_) {}
        } finally {
            _setAdShowing(false);
            if (wasPaused) _resumeGameAfterAd();
        }

        _interstitialReady = false;
        _prepareInterstitial();
    }

    // ── Game pause helpers ─────────────────────────────────────────
    /**
     * Pause the game loop while an ad is visible so players don't take
     * damage, lose lives, or have setTimeout/transition timers fire while
     * the ad is on top of the WebView.
     *
     * Records the prior game.state so it can be restored exactly when the
     * ad closes (covers PLAYING and LEVEL_COMPLETE — interstitials fire
     * from completeLevel() so the state is LEVEL_COMPLETE at that point).
     * Returns true if the game was paused by this call.
     */
    function _pauseGameForAd() {
        try {
            const g = window.game;
            if (!g) return false;
            // States we want to freeze while the ad is on screen.
            // GAME_OVER is included so rewarded-ad revives also freeze the loop.
            const pauseable = (g.state === 'PLAYING' || g.state === 'LEVEL_COMPLETE' || g.state === 'GAME_OVER');
            if (!pauseable) return false;
            _pausedStateBeforeAd = g.state;
            if (g.state !== 'PAUSED') {
                g.state = 'PAUSED';
                g.dispatchGameStateChange && g.dispatchGameStateChange();
            }
            try { g.audioManager && g.audioManager.pauseMusic && g.audioManager.pauseMusic(); } catch (e) {}
            try { g.audioManager && g.audioManager.pauseAmbient && g.audioManager.pauseAmbient(); } catch (e) {}
            return true;
        } catch (e) {
            _warn('_pauseGameForAd error:', e);
        }
        return false;
    }

    /**
     * Resume the game loop after an ad closes. Restores the exact state
     * captured at pause time (PLAYING or LEVEL_COMPLETE) so the level
     * transition resumes from where it left off rather than skipping ahead.
     * Guards against the player having navigated to a menu while the ad was
     * open.
     */
    function _resumeGameAfterAd() {
        try {
            const g = window.game;
            const target = _pausedStateBeforeAd;
            _pausedStateBeforeAd = null;
            if (!g || !target) return;
            if (g.state !== 'PAUSED') return; // user moved on (menu, game over, etc.)
            g.state = target;
            try { g.audioManager && g.audioManager.resumeMusic && g.audioManager.resumeMusic(); } catch (e) {}
            try { g.audioManager && g.audioManager.resumeAmbient && g.audioManager.resumeAmbient(); } catch (e) {}
            g.dispatchGameStateChange && g.dispatchGameStateChange();
        } catch (e) {
            _warn('_resumeGameAfterAd error:', e);
        }
    }

    /**
     * Toggle the global ad-showing flag and broadcast a CustomEvent so
     * other systems (gameLoop, analytics) can react.
     */
    function _setAdShowing(showing) {
        _adShowing = !!showing;
        try {
            window.dispatchEvent(new CustomEvent(showing ? 'gameAdShow' : 'gameAdHide'));
        } catch (e) {}
    }

    // ── Session Reset ──────────────────────────────────────────────
    /**
     * Reset per-session counters (call on fresh game start from menu).
     */
    function resetSession() {
        _revivesUsed = 0;
        _stagesSinceAd = 0;
        // Re-enable web rewarded button for the new session (adBreak handles its own fill)
        if (!_available && _webInitDone) _webAdReady = true;
    }

    // ── Public API ─────────────────────────────────────────────────
    // ── Public API ────────────────────────────────────────────────

    /**
     * Update tunable cadence settings at runtime and persist them in
     * localStorage so they survive reloads. Only keys in TUNABLE_KEYS are
     * accepted; ad unit IDs and rewarded format are intentionally locked.
     * Pass `null` to clear all overrides and revert to defaults.
     */
    function setConfig(overrides) {
        if (overrides === null) {
            try { localStorage.removeItem('skunkfu_adConfig'); } catch (e) {}
            for (const k of TUNABLE_KEYS) CONFIG[k] = DEFAULT_CONFIG[k];
            _log('Cleared config overrides; reverted to defaults.');
            return Object.assign({}, CONFIG);
        }
        if (!overrides || typeof overrides !== 'object') return Object.assign({}, CONFIG);
        let changed = false;
        let stored = {};
        try { stored = JSON.parse(localStorage.getItem('skunkfu_adConfig') || '{}') || {}; } catch (e) {}
        for (const k of TUNABLE_KEYS) {
            if (Object.prototype.hasOwnProperty.call(overrides, k)) {
                CONFIG[k] = overrides[k];
                stored[k] = overrides[k];
                changed = true;
            }
        }
        if (changed) {
            try { localStorage.setItem('skunkfu_adConfig', JSON.stringify(stored)); } catch (e) {}
            _log('Applied runtime config overrides:', overrides);
        }
        return Object.assign({}, CONFIG);
    }

    return {
        CONFIG,
        initialize,
        setConfig,
        canShowRewarded,
        showRewarded,
        onStageComplete,
        resetSession,
        /** True while a full-screen ad (rewarded/interstitial) is on screen. */
        isAdShowing() { return _adShowing; },
        /** True if ads are available on this platform. */
        get available() { return _available; },
    };
})();

// Make globally accessible (same pattern as other game modules)
window.AdManager = AdManager;
