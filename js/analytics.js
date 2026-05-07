/*!
 * Skunked: Way of the Spray
 * Copyright (c) 2026 Mephitideus Interactive. All Rights Reserved.
 * Proprietary and confidential — unauthorized copying, distribution, or use
 * of this file, via any medium, is strictly prohibited. See LICENSE for terms.
 */
/**
 * Analytics event tracking via Google Tag Manager dataLayer.
 *
 * All game telemetry flows through this module so the rest of the codebase
 * never references GTM/dataLayer directly.  Events are pushed to
 * `window.dataLayer` which GTM picks up and routes to GA4 (or any other
 * tag configured in the container).
 *
 * Usage:  Analytics.trackGameStart({ level: 1 });
 */

const Analytics = (() => {
    'use strict';

    // ── opt-out gate ────────────────────────────────────────────
    // Respect a simple flag so players/devs can disable analytics.
    // Set `localStorage.skunkfu_analytics_optout = '1'` or call
    // `Analytics.optOut()`.
    let _optedOut = false;
    try { _optedOut = localStorage.getItem('skunkfu_analytics_optout') === '1'; } catch (e) { /* */ }

    // ── helpers ──────────────────────────────────────────────────
    const push = (event, params) => {
        if (_optedOut) return;
        try {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ event, ...params });
        } catch (e) { /* silently fail — analytics must never break gameplay */ }
    };

    /** Reliable unload beacon via dataLayer push (sendBeacon to GA MP
     *  was removed — it requires api_secret + measurement_id and was a no-op). */
    const pushBeacon = (event, params) => {
        if (_optedOut) return;
        try {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ event, ...params });
        } catch (e) { /* */ }
    };

    const isMobile = () => {
        try {
            return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        } catch (e) { return false; }
    };

    const platform = () => {
        try {
            if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) return 'android';
        } catch (e) { /* */ }
        return isMobile() ? 'mobile_web' : 'desktop_web';
    };

    /** Detect active input method based on recent events. */
    let _lastInputMethod = 'unknown';
    try {
        window.addEventListener('keydown', () => { _lastInputMethod = 'keyboard'; }, { capture: true, passive: true });
        window.addEventListener('touchstart', () => { _lastInputMethod = 'touch'; }, { capture: true, passive: true });
        window.addEventListener('gamepadconnected', () => { _lastInputMethod = 'gamepad'; });
    } catch (e) { /* */ }

    let _sessionStart = Date.now();

    // ── public API ──────────────────────────────────────────────

    /**
     * Push user traits once per session (platform, screen size, etc.).
     * Call after the game canvas is initialised.
     */
    function identify() {
        // Session count & returning-player flag from cross-run stats
        let totalRuns = 0;
        let perfMode = 'unknown';
        try { totalRuns = parseInt(localStorage.getItem('skunkfu_totalRuns') || '0') || 0; } catch (e) { /* */ }
        try { perfMode = localStorage.getItem('mobilePerfMode') || 'unknown'; } catch (e) { /* */ }

        push('user_properties_set', {
            user_properties: {
                platform: platform(),
                screen_w: window.innerWidth,
                screen_h: window.innerHeight,
                pixel_ratio: window.devicePixelRatio || 1,
                touch: 'ontouchstart' in window,
                total_runs: totalRuns,
                is_returning: totalRuns > 1,
                perf_mode: perfMode,
                input_method: _lastInputMethod
            }
        });
    }

    // ── Game lifecycle ──────────────────────────────────────────

    function trackGameStart(data = {}) {
        _sessionStart = Date.now();
        push('game_start', {
            level: data.level || 1,
            level_name: data.levelName || '',
            platform: platform()
        });
    }

    function trackLevelStart(data = {}) {
        push('level_start', {
            level: data.level || 1,
            level_name: data.levelName || '',
            score: data.score || 0
        });
    }

    function trackLevelComplete(data = {}) {
        push('level_complete', {
            level: data.level || 1,
            level_name: data.levelName || '',
            score: data.score || 0,
            time_seconds: Math.round(data.time || 0),
            enemies_defeated: data.enemiesDefeated || 0,
            perfect: !!data.perfect,
            max_combo: data.maxCombo || 0,
            spray_accuracy: data.sprayAccuracy || 0,
            deaths_this_level: data.deathsThisLevel || 0,
            idols_collected: data.idolsCollected || 0,
            input_method: _lastInputMethod
        });
    }

    function trackGameOver(data = {}) {
        push('game_over', {
            score: data.score || 0,
            level_reached: data.levelReached || 1,
            level_name: data.levelName || '',
            time_survived: Math.round(data.timeSurvived || 0),
            enemies_defeated: data.enemiesDefeated || 0,
            max_combo: data.maxCombo || 0,
            accuracy: data.accuracy || 0,
            spray_accuracy: data.sprayAccuracy || 0,
            bosses_defeated: data.bossesDefeated || 0,
            deaths_total: data.deathsTotal || 0,
            is_high_score: !!data.isHighScore,
            achievements_unlocked: data.achievementsUnlocked || 0,
            total_runs: data.totalRuns || 0,
            input_method: _lastInputMethod,
            session_duration: Math.round((Date.now() - _sessionStart) / 1000)
        });
    }

    function trackVictory(data = {}) {
        push('game_victory', {
            score: data.score || 0,
            completion_time: Math.round(data.completionTime || 0),
            levels_completed: data.levelsCompleted || 0,
            perfect_levels: data.perfectLevels || 0,
            enemies_defeated: data.enemiesDefeated || 0,
            bosses_defeated: data.bossesDefeated || 0,
            max_combo: data.maxCombo || 0,
            spray_accuracy: data.sprayAccuracy || 0,
            deaths_total: data.deathsTotal || 0,
            total_runs: data.totalRuns || 0,
            input_method: _lastInputMethod,
            session_duration: Math.round((Date.now() - _sessionStart) / 1000)
        });
    }

    function trackPlayerDeath(data = {}) {
        push('player_death', {
            level: data.level || 1,
            lives_remaining: data.livesRemaining || 0,
            score: data.score || 0,
            enemies_defeated: data.enemiesDefeated || 0,
            death_cause: data.deathCause || 'unknown',
            deaths_this_run: data.deathsThisRun || 0,
            input_method: _lastInputMethod
        });
    }

    // ── Engagement ──────────────────────────────────────────────

    function trackAchievement(data = {}) {
        push('achievement_unlock', {
            achievement_id: data.id || '',
            achievement_name: data.name || ''
        });
    }

    function trackScoreSubmit(data = {}) {
        push('score_submit', {
            score: data.score || 0,
            player_name: data.name || '',
            level_reached: data.levelReached || 0,
            prestige: data.prestige || 0
        });
    }

    function trackAdRevive(data = {}) {
        push('ad_revive', {
            level: data.level || 1,
            score: data.score || 0,
            revives_used: data.revivesUsed || 1
        });
    }

    function trackAdImpression(data = {}) {
        push('ad_impression', {
            ad_type: data.type || 'unknown',
            placement: data.placement || ''
        });
    }

    // ── Revive CTA funnel (game-over rewarded ad) ──────────────────
    // Fires when the game-over reveal timer ends AND a rewarded ad is loaded.
    function trackAdReviveEligible(data = {}) {
        push('ad_revive_eligible', {
            level: data.level || 0,
            score: data.score || 0,
            revives_used: data.revivesUsed || 0
        });
    }
    // Fires when the CTA button is actually shown to the player.
    function trackAdReviveOffered(data = {}) {
        push('ad_revive_offered', {
            level: data.level || 0,
            score: data.score || 0,
            revives_used: data.revivesUsed || 0
        });
    }
    // Fires when the player taps the CTA.
    function trackAdReviveClicked(data = {}) {
        push('ad_revive_clicked', {
            level: data.level || 0,
            score: data.score || 0,
            revives_used: data.revivesUsed || 0
        });
    }
    // Fires when the rewarded ad resolves WITHOUT granting the reward
    // (player dismissed, ad was skipped, ad failed to play).
    function trackAdReviveDismissed(data = {}) {
        push('ad_revive_dismissed', {
            level: data.level || 0,
            score: data.score || 0,
            reason: data.reason || 'dismissed'
        });
    }
    // Fires when an ad request fails to fill (prepare error, show error).
    function trackAdNoFill(data = {}) {
        push('ad_no_fill', {
            ad_type: data.type || 'unknown',
            placement: data.placement || '',
            phase: data.phase || 'prepare', // 'prepare' or 'show'
            reason: data.reason || 'unknown'
        });
    }

    // ── Purchase / IAP ─────────────────────────────────────────
    // Fires when an entitlement flips ON (purchase, restore, remote-restore).
    function trackPurchase(data = {}) {
        push('purchase', {
            product_id: data.product || data.productId || 'unknown',
            source: data.source || 'unknown', // purchase | restore | init-owned | remote-restore
            price: data.price || '',
            currency: data.currency || ''
        });
    }
    // Fires when the purchase modal is opened.
    function trackPurchaseStart(data = {}) {
        push('purchase_start', {
            product_id: data.product || data.productId || 'unknown',
            placement: data.placement || ''
        });
    }
    // Fires when an IAP modal/CTA surface becomes visible to the user.
    // Top of the IAP funnel — pairs with `purchase_start` (button click) and
    // `purchase` (entitlement granted). Mirrors the revive funnel pattern.
    function trackPurchaseModalOpen(data = {}) {
        push('purchase_modal_open', {
            product_id: data.product || data.productId || 'unknown',
            placement: data.placement || '',
            trigger: data.trigger || ''
        });
    }
    // Fires when the user dismisses an IAP modal without buying.
    function trackPurchaseModalDismissed(data = {}) {
        push('purchase_modal_dismissed', {
            product_id: data.product || data.productId || 'unknown',
            placement: data.placement || '',
            reason: data.reason || 'user_skip'
        });
    }
    // Fires when the order() call fails or is cancelled by the user.
    function trackPurchaseFailed(data = {}) {
        push('purchase_failed', {
            product_id: data.product || data.productId || 'unknown',
            reason: data.reason || 'unknown'
        });
    }

    // ── Boss / combat ───────────────────────────────────────────

    function trackBossEncounter(data = {}) {
        push('boss_encounter', {
            level: data.level || 1,
            level_name: data.levelName || '',
            boss_type: data.bossType || 'unknown',
            boss_name: data.bossName || '',
            player_health: data.playerHealth || 0,
            score: data.score || 0
        });
    }

    function trackBossDefeat(data = {}) {
        push('boss_defeat', {
            level: data.level || 1,
            level_name: data.levelName || '',
            boss_type: data.bossType || 'unknown',
            boss_name: data.bossName || '',
            time_to_kill: Math.round(data.timeToKill || 0),
            player_health_remaining: data.playerHealthRemaining || 0,
            score: data.score || 0
        });
    }

    function trackItemPickup(data = {}) {
        push('item_pickup', {
            item_type: data.itemType || 'unknown',
            level: data.level || 1,
            score: data.score || 0
        });
    }

    function trackShadowStrike(data = {}) {
        push('shadow_strike', {
            level: data.level || 1,
            enemies_hit: data.enemiesHit || 0,
            score: data.score || 0
        });
    }

    function trackRetry(data = {}) {
        push('game_retry', {
            previous_score: data.previousScore || 0,
            previous_level: data.previousLevel || 1,
            total_runs: data.totalRuns || 0,
            session_duration: Math.round((Date.now() - _sessionStart) / 1000)
        });
    }

    function trackSettingsChange(data = {}) {
        push('settings_change', {
            setting: data.setting || '',
            value: data.value != null ? data.value : ''
        });
    }

    // ── UI / navigation ─────────────────────────────────────────

    function trackMenuAction(action) {
        push('menu_action', { action: action || '' });
    }

    function trackPause(data = {}) {
        push('game_pause', {
            level: data.level || 0,
            score: data.score || 0
        });
    }

    function trackResume(data = {}) {
        push('game_resume', {
            level: data.level || 0
        });
    }

    function trackTutorialStep(step) {
        push('tutorial_step', { step: step || '' });
    }

    function trackTutorialComplete(data = {}) {
        push('tutorial_complete', {
            steps_seen: data.stepsSeen || 0,
            runs: data.runs || 0
        });
    }

    // ── Errors ──────────────────────────────────────────────────

    /** Track client-side errors (sampled — max 20 per session). */
    let _errorCount = 0;
    const _MAX_ERRORS = 20;

    function trackError(data = {}) {
        if (_errorCount >= _MAX_ERRORS) return;
        _errorCount++;
        push('client_error', {
            error_tag: data.tag || 'unknown',
            error_message: (data.message || '').substring(0, 200),
            level: data.level || 0
        });
    }

    // ── Engagement heartbeat ────────────────────────────────────

    let _heartbeatInterval = null;
    let _sessionEndSent = false;

    function startHeartbeat(intervalMs) {
        stopHeartbeat();
        const ms = intervalMs || 60000;
        _heartbeatInterval = setInterval(() => {
            push('heartbeat', {
                session_duration: Math.round((Date.now() - _sessionStart) / 1000),
                level: window.game ? (window.game.currentLevelIndex || 0) + 1 : 0
            });
        }, ms);

        // Send a final pulse when the tab is being closed / hidden
        try {
            window.addEventListener('visibilitychange', _onVisibilityChange);
            window.addEventListener('beforeunload', _onBeforeUnload);
        } catch (e) { /* */ }
    }

    function stopHeartbeat() {
        if (_heartbeatInterval) { clearInterval(_heartbeatInterval); _heartbeatInterval = null; }
    }

    function _onVisibilityChange() {
        if (document.visibilityState === 'hidden') {
            if (_sessionEndSent) return;
            _sessionEndSent = true;
            pushBeacon('session_end', {
                session_duration: Math.round((Date.now() - _sessionStart) / 1000)
            });
        } else if (document.visibilityState === 'visible') {
            _sessionEndSent = false; // reset if tab returns
        }
    }

    function _onBeforeUnload() {
        if (_sessionEndSent) return;
        _sessionEndSent = true;
        pushBeacon('session_end', {
            session_duration: Math.round((Date.now() - _sessionStart) / 1000)
        });
    }

    // ── Expose ──────────────────────────────────────────────────

    return {
        identify,
        trackGameStart,
        trackLevelStart,
        trackLevelComplete,
        trackGameOver,
        trackVictory,
        trackPlayerDeath,
        trackAchievement,
        trackScoreSubmit,
        trackAdRevive,
        trackAdImpression,
        trackAdReviveEligible,
        trackAdReviveOffered,
        trackAdReviveClicked,
        trackAdReviveDismissed,
        trackAdNoFill,
        trackPurchase,
        trackPurchaseStart,
        trackPurchaseModalOpen,
        trackPurchaseModalDismissed,
        trackPurchaseFailed,
        trackBossEncounter,
        trackBossDefeat,
        trackItemPickup,
        trackShadowStrike,
        trackRetry,
        trackSettingsChange,
        trackMenuAction,
        trackPause,
        trackResume,
        trackTutorialStep,
        trackTutorialComplete,
        trackError,
        startHeartbeat,
        stopHeartbeat,
        optOut() { _optedOut = true; try { localStorage.setItem('skunkfu_analytics_optout', '1'); } catch (e) { /* */ } },
        optIn()  { _optedOut = false; try { localStorage.removeItem('skunkfu_analytics_optout'); } catch (e) { /* */ } },
        isOptedOut() { return _optedOut; }
    };
})();
