/**
 * adManager.js — Manages AdMob ads via @capacitor-community/admob.
 *
 * Provides Rewarded Video ("Watch Ad to Revive") and Interstitial ads
 * for the Android build. Gracefully no-ops on web / when plugin is absent.
 *
 * Ad Unit IDs (Mephitideus — pub-8519140628365141, app ~9959082819):
 *   Banner 1:     ca-app-pub-8519140628365141/3938711780
 *   Banner 2:     ca-app-pub-8519140628365141/1608061915  (reserved/spare)
 *   Interstitial: ca-app-pub-8519140628365141/9068672976
 *   Rewarded:     ca-app-pub-8519140628365141/9192796056  (Rewarded Interstitial)
 *
 * Google AdMob test ad unit IDs (used when testing = true):
 *   Banner:       ca-app-pub-3940256099942544/6300978111
 *   Rewarded:     ca-app-pub-3940256099942544/5224354917
 *   Interstitial: ca-app-pub-3940256099942544/1033173712
 */

const AdManager = (() => {
    'use strict';

    // ── Configuration ──────────────────────────────────────────────
    const CONFIG = {
        // Real ad unit IDs from AdMob console:
        bannerAdUnitId:       'ca-app-pub-8519140628365141/3938711780',
        rewardedAdUnitId:     'ca-app-pub-8519140628365141/1336900492',
        interstitialAdUnitId: 'ca-app-pub-8519140628365141/9068672976',

        // Google's official test ad unit IDs — used when testing is true
        testBannerId:        'ca-app-pub-3940256099942544/6300978111',
        testRewardedId:      'ca-app-pub-3940256099942544/5224354917',
        testInterstitialId:  'ca-app-pub-3940256099942544/1033173712',

        // Set to false for production builds
        testing: false,

        // Banner visibility kill-switch. Set to true once AdMob app is
        // approved ("Ready"). Leave false during "Requires review" so we
        // don't show Google's ugly placeholder bars on the menu screens.
        // Rewarded + interstitial are gated by gameplay events so it's
        // fine to leave them enabled — they simply no-op on no-fill.
        enableBanner: false,

        // Show an interstitial every N stages (0 = never)
        interstitialEveryNStages: 3,
        // Minimum seconds between interstitials (frequency cap)
        interstitialMinIntervalSec: 90,

        // Max rewarded revives per session (prevent abuse)
        maxRevivesPerSession: 2,
    };

    // ── State ──────────────────────────────────────────────────────
    let _plugin       = null;   // AdMob plugin reference
    let _initialized  = false;
    let _available     = false;  // true only on native Android with plugin
    let _rewardedReady      = false;
    let _interstitialReady  = false;
    let _bannerVisible      = false;
    let _bannerLoaded       = false;
    let _revivesUsed        = 0;
    let _stagesSinceAd      = 0;
    let _lastInterstitialAt = 0;
    let _adShowing          = false; // true while a rewarded/interstitial is on screen
    let _pausedStateBeforeAd = null; // game.state value captured at pause time

    // ── Helpers ────────────────────────────────────────────────────
    function _getBannerId() {
        return CONFIG.testing ? CONFIG.testBannerId : CONFIG.bannerAdUnitId;
    }

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

            // Defensive: clear any stale banner from a prior process.
            try { await _plugin.removeBanner(); } catch (e) {}

            // Pre-load ads in the background
            _prepareRewarded();
            _prepareInterstitial();

            // Banner ads are disabled for now (CONFIG.enableBanner === false).
            // Skip both the initial show and the state-change listener so the
            // plugin never attempts to load a banner. Re-enable by flipping
            // CONFIG.enableBanner back to true.
            if (CONFIG.enableBanner) {
                showBanner();
                window.addEventListener('gameStateChange', _onGameStateChange);
            }

        } catch (e) {
            _warn('AdMob init failed:', e);
        }
    }

    // ── Banner ──────────────────────────────────────────────────────
    /**
     * Show a small banner ad at the bottom of the screen.
     * Safe to call multiple times — no-ops if already visible.
     */
    async function showBanner() {
        if (_isAdFree()) return;
        if (!CONFIG.enableBanner) return; // Kill-switch — see CONFIG block.
        if (!_available || !_plugin || _bannerVisible) return;
        try {
            await _plugin.showBanner({
                adId: _getBannerId(),
                adSize: 'ADAPTIVE_BANNER',
                position: 'BOTTOM_CENTER',
                isTesting: CONFIG.testing,
            });
            _bannerVisible = true;
            _bannerLoaded = true;
            _log('Banner shown.');
        } catch (e) {
            _warn('Banner show failed:', e);
        }
    }

    /**
     * Hide the banner ad. Call when entering active gameplay.
     */
    async function hideBanner() {
        if (!_available || !_plugin || !_bannerVisible) return;
        try {
            await _plugin.hideBanner();
            _bannerVisible = false;
            _log('Banner hidden.');
        } catch (e) {
            _warn('Banner hide failed:', e);
        }
    }

    /**
     * Completely remove the banner (frees resources).
     */
    async function removeBanner() {
        if (!_available || !_plugin || !_bannerLoaded) return;
        try {
            await _plugin.removeBanner();
            _bannerVisible = false;
            _bannerLoaded = false;
            _log('Banner removed.');
        } catch (e) {
            _warn('Banner remove failed:', e);
        }
    }

    /**
     * Auto-manage banner visibility based on game state.
     * Banner shows on: MENU, GAME_OVER, PAUSED, LEVEL_COMPLETE, VICTORY
     * Banner hides on: PLAYING
     */
    function _onGameStateChange(ev) {
        try {
            const state = ev && ev.detail && ev.detail.state;
            if (state === 'PLAYING') {
                hideBanner();
            } else {
                showBanner();
            }
        } catch (e) {
            _warn('Banner state handler error:', e);
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
        // Rewarded ads remain available for everyone, including Remove-Ads owners.
        // The Remove-Ads SKU only suppresses banner + interstitial. Rewarded is
        // an opt-in trade ("watch a 30s ad to revive") that ad-free players can
        // still choose to use for the extra life.
        return _available && _rewardedReady && _revivesUsed < CONFIG.maxRevivesPerSession;
    }

    /**
     * Show a rewarded video ad. Returns a Promise that resolves to
     * true if the user earned the reward, false otherwise.
     * @returns {Promise<boolean>}
     */
    async function showRewarded() {
        if (!canShowRewarded()) return false;

        const wasPaused = _pauseGameForAd();
        _setAdShowing(true);
        try {
            const result = await _plugin.showRewardedAd();
            _rewardedReady = false;
            _revivesUsed++;
            _log('Rewarded ad completed. Revives used:', _revivesUsed);
            try { Analytics.trackAdImpression({ type: 'rewarded', placement: 'revive' }); } catch(e) {}

            // Immediately start loading the next one
            _prepareRewarded();

            // The plugin resolves when the user earns the reward
            return true;
        } catch (e) {
            _warn('Rewarded ad failed or was dismissed:', e);
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
        } finally {
            _setAdShowing(false);
            if (wasPaused) _resumeGameAfterAd();
        }

        _interstitialReady = false;
        _prepareInterstitial();
    }
    _lastInterstitialAt = 0;
    
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
            const pauseable = (g.state === 'PLAYING' || g.state === 'LEVEL_COMPLETE');
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
     * other systems (gameLoop, AdSense banners, analytics) can react.
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
    }

    // ── Public API ─────────────────────────────────────────────────
    return {
        CONFIG,
        initialize,
        showBanner,
        hideBanner,
        removeBanner,
        canShowRewarded,
        showRewarded,
        onStageComplete,
        resetSession,
        /** True while a full-screen ad (rewarded/interstitial) is on screen. */
        isAdShowing() { return _adShowing; },
        /** True if ads are available on this platform. */
        get available() { return _available; },
        /** True if the banner is currently visible. */
        get bannerVisible() { return _bannerVisible; },
    };
})();

// Make globally accessible (same pattern as other game modules)
window.AdManager = AdManager;
