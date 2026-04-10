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

    // ── helpers ──────────────────────────────────────────────────
    const push = (event, params) => {
        try {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ event, ...params });
        } catch (e) { /* silently fail — analytics must never break gameplay */ }
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

    let _sessionStart = Date.now();

    // ── public API ──────────────────────────────────────────────

    /**
     * Push user traits once per session (platform, screen size, etc.).
     * Call after the game canvas is initialised.
     */
    function identify() {
        push('user_properties_set', {
            user_properties: {
                platform: platform(),
                screen_w: window.innerWidth,
                screen_h: window.innerHeight,
                pixel_ratio: window.devicePixelRatio || 1,
                touch: 'ontouchstart' in window
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
            perfect: !!data.perfect
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
            is_high_score: !!data.isHighScore,
            achievements_unlocked: data.achievementsUnlocked || 0,
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
            max_combo: data.maxCombo || 0,
            session_duration: Math.round((Date.now() - _sessionStart) / 1000)
        });
    }

    function trackPlayerDeath(data = {}) {
        push('player_death', {
            level: data.level || 1,
            lives_remaining: data.livesRemaining || 0,
            score: data.score || 0,
            enemies_defeated: data.enemiesDefeated || 0
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
            push('session_end', {
                session_duration: Math.round((Date.now() - _sessionStart) / 1000)
            });
        }
    }

    function _onBeforeUnload() {
        push('session_end', {
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
        trackMenuAction,
        trackPause,
        trackResume,
        trackTutorialStep,
        trackError,
        startHeartbeat,
        stopHeartbeat
    };
})();
