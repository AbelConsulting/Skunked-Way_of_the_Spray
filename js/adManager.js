/**
 * adManager.js — Manages AdMob ads via @capacitor-community/admob.
 *
 * Provides Rewarded Video ("Watch Ad to Revive") and Interstitial ads
 * for the Android build. Gracefully no-ops on web / when plugin is absent.
 *
 * Ad Unit IDs (Mephitideus — pub-8519140628365141):
 *   Banner:       ca-app-pub-8519140628365141/4631220272   (handled natively in layout)
 *   Rewarded:     PLACEHOLDER — replace with real unit once created in AdMob console
 *   Interstitial: PLACEHOLDER — replace with real unit once created in AdMob console
 *
 * Google AdMob test ad unit IDs (used when testing = true):
 *   Rewarded:     ca-app-pub-3940256099942544/5224354917
 *   Interstitial: ca-app-pub-3940256099942544/1033173712
 */

const AdManager = (() => {
    'use strict';

    // ── Configuration ──────────────────────────────────────────────
    const CONFIG = {
        // Replace these with your real ad unit IDs from AdMob console:
        rewardedAdUnitId:     'ca-app-pub-8519140628365141/REWARDED_UNIT_ID',
        interstitialAdUnitId: 'ca-app-pub-8519140628365141/INTERSTITIAL_UNIT_ID',

        // Google's official test ad unit IDs — used when testing is true
        testRewardedId:      'ca-app-pub-3940256099942544/5224354917',
        testInterstitialId:  'ca-app-pub-3940256099942544/1033173712',

        // Set to false for production builds
        testing: true,

        // Show an interstitial every N stages (0 = never)
        interstitialEveryNStages: 3,

        // Max rewarded revives per session (prevent abuse)
        maxRevivesPerSession: 2,
    };

    // ── State ──────────────────────────────────────────────────────
    let _plugin       = null;   // AdMob plugin reference
    let _initialized  = false;
    let _available     = false;  // true only on native Android with plugin
    let _rewardedReady      = false;
    let _interstitialReady  = false;
    let _revivesUsed        = 0;
    let _stagesSinceAd      = 0;

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

    // ── Initialization ─────────────────────────────────────────────
    async function initialize() {
        if (_initialized) return;
        _initialized = true;

        // Only run on Capacitor native (Android)
        if (typeof window === 'undefined' ||
            !window.Capacitor ||
            !window.Capacitor.isNativePlatform ||
            !window.Capacitor.isNativePlatform()) {
            _log('Not running on native platform — ads disabled.');
            return;
        }

        try {
            // Dynamic import of the plugin
            const mod = await import('@capacitor-community/admob');
            _plugin = mod.AdMob;

            if (!_plugin) {
                _warn('AdMob plugin not found.');
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

    // ── Rewarded Video ─────────────────────────────────────────────
    async function _prepareRewarded() {
        if (!_available || !_plugin) return;
        try {
            await _plugin.prepareRewardedAd({
                adId: _getRewardedId(),
                isTesting: CONFIG.testing,
            });
            _rewardedReady = true;
            _log('Rewarded ad ready.');
        } catch (e) {
            _rewardedReady = false;
            _warn('Failed to prepare rewarded ad:', e);
        }
    }

    /**
     * Check if the player can watch a rewarded ad to revive.
     * @returns {boolean}
     */
    function canShowRewarded() {
        return _available && _rewardedReady && _revivesUsed < CONFIG.maxRevivesPerSession;
    }

    /**
     * Show a rewarded video ad. Returns a Promise that resolves to
     * true if the user earned the reward, false otherwise.
     * @returns {Promise<boolean>}
     */
    async function showRewarded() {
        if (!canShowRewarded()) return false;

        try {
            const result = await _plugin.showRewardedAd();
            _rewardedReady = false;
            _revivesUsed++;
            _log('Rewarded ad completed. Revives used:', _revivesUsed);

            // Immediately start loading the next one
            _prepareRewarded();

            // The plugin resolves when the user earns the reward
            return true;
        } catch (e) {
            _warn('Rewarded ad failed or was dismissed:', e);
            _rewardedReady = false;
            _prepareRewarded();
            return false;
        }
    }

    // ── Interstitial ───────────────────────────────────────────────
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
        }
    }

    /**
     * Call this when a stage is completed. Shows an interstitial
     * every N stages (configured in CONFIG.interstitialEveryNStages).
     * Returns a Promise that resolves when the ad is dismissed.
     * @returns {Promise<void>}
     */
    async function onStageComplete() {
        if (!_available || CONFIG.interstitialEveryNStages <= 0) return;

        _stagesSinceAd++;
        if (_stagesSinceAd < CONFIG.interstitialEveryNStages) return;
        if (!_interstitialReady) return;

        try {
            _stagesSinceAd = 0;
            await _plugin.showInterstitial();
            _log('Interstitial shown.');
        } catch (e) {
            _warn('Interstitial failed:', e);
        }

        _interstitialReady = false;
        _prepareInterstitial();
    }

    // ── Session Reset ──────────────────────────────────────────────
    /**
     * Reset per-session counters (call on fresh game start from menu).
     */
    function resetSession() {
        _revivesUsed = 0;
        _stagesSinceAd = 0;
    }

    // ── Public API ─────────────────────────────────────────────────
    return {
        CONFIG,
        initialize,
        canShowRewarded,
        showRewarded,
        onStageComplete,
        resetSession,
        /** True if ads are available on this platform. */
        get available() { return _available; },
    };
})();

// Make globally accessible (same pattern as other game modules)
window.AdManager = AdManager;
