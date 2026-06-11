/*!
 * Skunked: Way of the Spray
 * Copyright (c) 2026 Mephitideus Interactive. All Rights Reserved.
 * Proprietary and confidential — unauthorized copying, distribution, or use
 * of this file, via any medium, is strictly prohibited. See LICENSE for terms.
 */
// js/playGames.js
// Google Play Games Services bridge — wraps the native PlayGamesPlugin for JS.
// On non-Android (web/desktop), all calls are no-ops so the game works everywhere.

try { if (typeof Config !== 'undefined' && Config.DEBUG) console.log('playGames.js loaded'); } catch (e) { /* */ }

(function (window) {
  'use strict';

  // ── Capacitor bridge ──
  // Capacitor.Plugins.PlayGamesServices is registered by our native plugin.
  function getPlugin() {
    try {
      if (typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.PlayGamesServices) {
        return Capacitor.Plugins.PlayGamesServices;
      }
    } catch (e) { /* not on Capacitor */ }
    return null;
  }

  function isAvailable() {
    return getPlugin() !== null;
  }

  // ── Leaderboard ID ──
  const LEADERBOARD_ID = 'CgkI5NbknI4GEAIQAQ';

  // ── Cached identity (populated by signIn / isAuthenticated) ──
  let _playerId = '';
  let _playerDisplayName = '';

  function cachePlayerIdentity(result) {
    try {
      if (result && result.isAuthenticated && typeof result.playerId === 'string' && result.playerId) {
        _playerId = result.playerId;
        _playerDisplayName = (typeof result.displayName === 'string') ? result.displayName : '';
        try {
          window.dispatchEvent(new CustomEvent('skunkfu-pgs-signed-in', {
            detail: { playerId: _playerId, displayName: _playerDisplayName }
          }));
        } catch (_) {}
      }
    } catch (_) {}
  }

  // ── Achievement ID Mapping ──
  // Maps the game's internal achievement IDs → Google Play Games achievement IDs.
  // After creating achievements in Play Console, replace each 'GPGS_...' placeholder
  // with the real ID (e.g. 'CgkI...' strings).
  const ACHIEVEMENT_MAP = Object.freeze({
    // ── Combat Basics ──
    first_kill:       'CgkI5NbknI4GEAIQAg',
    enemy_slayer:     'CgkI5NbknI4GEAIQAw',
    exterminator:     'CgkI5NbknI4GEAIQBA',
    genocide:         'CgkI5NbknI4GEAIQBQ',

    // ── Combo Mastery ──
    combo_master:     'CgkI5NbknI4GEAIQBg',
    combo_adept:      'CgkI5NbknI4GEAIQBw',
    combo_legend:     'CgkI5NbknI4GEAIQCA',
    combo_god:        'CgkI5NbknI4GEAIQCQ',
    multi_hit_master: 'CgkI5NbknI4GEAIQCg',

    // ── Score ──
    high_scorer:      'CgkI5NbknI4GEAIQCw',
    score_attack:     'CgkI5NbknI4GEAIQDA',
    score_legend:     'CgkI5NbknI4GEAIQDQ',

    // ── Shadow Strike ──
    shadow_initiate:  'CgkI5NbknI4GEAIQDg',
    shadow_master:    'CgkI5NbknI4GEAIQDw',
    phantom_blade:    'CgkI5NbknI4GEAIQEA',

    // ── Skunk Spray ──
    spray_novice:     'CgkI5NbknI4GEAIQEQ',
    stink_bomber:     'CgkI5NbknI4GEAIQEg',
    toxic_cloud:      'CgkI5NbknI4GEAIQEw',

    // ── Aerial Combat ──
    air_juggler:      'CgkI5NbknI4GEAIQFA',
    sky_warrior:      'CgkI5NbknI4GEAIQFQ',

    // ── Accuracy & Precision ──
    precision_striker: 'CgkI5NbknI4GEAIQFg',
    sharpshooter:     'CgkI5NbknI4GEAIQFw',
    never_miss:       'CgkI5NbknI4GEAIQGA',

    // ── Boss Hunting ──
    boss_slayer:      'CgkI5NbknI4GEAIQGQ',
    boss_crusher:     'CgkI5NbknI4GEAIQGg',
    boss_hunter:      'CgkI5NbknI4GEAIQGw',
    veteran_hunter:   'CgkI5NbknI4GEAIQHA',

    // ── Survival & Grit ──
    perfect_level:    'CgkI5NbknI4GEAIQHQ',
    iron_fur:         'CgkI5NbknI4GEAIQHg',
    flawless_run:     'CgkI5NbknI4GEAIQHw',
    close_call:       'CgkI5NbknI4GEAIQIA',
    cheating_death:   'CgkI5NbknI4GEAIQIQ',
    survivor:         'CgkI5NbknI4GEAIQIg',
    endurance:        'CgkI5NbknI4GEAIQIw',
    no_lives_lost:    'CgkI5NbknI4GEAIQJA',

    // ── Collection & Exploration ──
    relic_hunter:     'CgkI5NbknI4GEAIQJQ',
    idol_hoarder:     'CgkI5NbknI4GEAIQJg',
    master_collector: 'CgkI5NbknI4GEAIQJw',
    completionist:    'CgkI5NbknI4GEAIQKA',
    power_hungry:     'CgkI5NbknI4GEAIQKQ',

    // ── Chain Reactions ──
    chain_reaction:   'CgkI5NbknI4GEAIQKg',
    demolition_expert:'CgkI5NbknI4GEAIQKw',

    // ── Speedrunning ──
    speed_demon:      'CgkI5NbknI4GEAIQLA',
    speed_god:        'CgkI5NbknI4GEAIQLQ',

    // ── Campaign & Progression ──
    world_saver:      'CgkI5NbknI4GEAIQLg',
    halfway_there:    'CgkI5NbknI4GEAIQLw',

    // ── Cross-Run Dedication ──
    dedicated:        'CgkI5NbknI4GEAIQMA',
    addicted:         'CgkI5NbknI4GEAIQMQ',
    veteran:          'CgkI5NbknI4GEAIQMg',
    mass_extinction:  'CgkI5NbknI4GEAIQMw',
    armageddon:       'CgkI5NbknI4GEAIQNA',
    time_invested:    'CgkI5NbknI4GEAIQNQ',
    no_lifer:         'CgkI5NbknI4GEAIQNg',

    // ── Damage & Efficiency ──
    glass_cannon:     'CgkI5NbknI4GEAIQNw',
    berserker:        'CgkI5NbknI4GEAIQOA',

    // ── Secret / Fun ──
    multiplier_max:   'CgkI5NbknI4GEAIQOQ',
    pacifist_start:   'CgkI5NbknI4GEAIQOg',
  });

  // ────────────────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────────────────

  /** Sign the player in (auto-sign-in on Android, no-op on web). */
  async function signIn() {
    const plugin = getPlugin();
    if (!plugin) return { isAuthenticated: false };
    try {
      const result = await plugin.signIn();
      // Cache the player ID for cross-device entitlement sync. The native
      // plugin's resolvePlayerInfo() includes playerId in the resolve payload.
      cachePlayerIdentity(result);
      return result;
    } catch (e) {
      console.warn('[PlayGames] signIn failed', e);
      return { isAuthenticated: false };
    }
  }

  /** Check if the player is currently authenticated. */
  async function isAuthenticated() {
    const plugin = getPlugin();
    if (!plugin) return { isAuthenticated: false };
    try {
      const result = await plugin.isAuthenticated();
      cachePlayerIdentity(result);
      return result;
    } catch (e) {
      return { isAuthenticated: false };
    }
  }

  /**
   * Submit a score to the Play Games leaderboard.
   * @param {number} score Integer score value
   */
  async function submitScore(score) {
    const plugin = getPlugin();
    if (!plugin) return false;
    try {
      await plugin.submitScore({ leaderboardId: LEADERBOARD_ID, score: Math.round(score) });
      return true;
    } catch (e) {
      console.warn('[PlayGames] submitScore failed', e);
      return false;
    }
  }

  /** Show the native Play Games leaderboard UI.
   * @param {string} [timeSpan]  Optional 'DAILY' | 'WEEKLY' | 'ALL_TIME'.
   *                              If omitted, opens the player's last-used view.
   */
  async function showLeaderboard(timeSpan) {
    const plugin = getPlugin();
    if (!plugin) return;
    try {
      const params = { leaderboardId: LEADERBOARD_ID };
      if (typeof timeSpan === 'string') params.timeSpan = timeSpan.toUpperCase();
      await plugin.showLeaderboard(params);
    } catch (e) {
      console.warn('[PlayGames] showLeaderboard failed', e);
    }
  }

  /** Convenience: show the daily-window leaderboard. */
  function showDailyLeaderboard() { return showLeaderboard('DAILY'); }
  /** Convenience: show the weekly-window leaderboard. */
  function showWeeklyLeaderboard() { return showLeaderboard('WEEKLY'); }
  /** Convenience: show the all-time leaderboard. */
  function showAllTimeLeaderboard() { return showLeaderboard('ALL_TIME'); }

  /**
   * Unlock a Play Games achievement by its internal game ID.
   * Maps the game ID to the GPGS ID automatically.
   * @param {string} gameAchievementId  Internal ID (e.g. 'first_kill')
   */
  async function unlockAchievement(gameAchievementId) {
    const plugin = getPlugin();
    if (!plugin) return;
    const gpgsId = ACHIEVEMENT_MAP[gameAchievementId];
    if (!gpgsId || gpgsId.startsWith('GPGS_')) {
      // Placeholder — not yet configured in Play Console
      return;
    }
    try {
      await plugin.unlockAchievement({ achievementId: gpgsId });
    } catch (e) {
      console.warn('[PlayGames] unlockAchievement failed', gameAchievementId, e);
    }
  }

  /**
   * Sync all locally-unlocked achievements to Play Games.
   * Call once after sign-in to catch up anything earned offline.
   */
  async function syncAchievements() {
    const plugin = getPlugin();
    if (!plugin) return;

    try {
      const localAchievements = (typeof Highscores !== 'undefined')
        ? Highscores.loadAchievements()
        : {};

      for (const [gameId, data] of Object.entries(localAchievements)) {
        if (data && data.unlocked) {
          await unlockAchievement(gameId);
        }
      }
    } catch (e) {
      console.warn('[PlayGames] syncAchievements failed', e);
    }
  }

  /** Show the native Play Games achievements UI. */
  async function showAchievements() {
    const plugin = getPlugin();
    if (!plugin) return;
    try {
      await plugin.showAchievements();
    } catch (e) {
      console.warn('[PlayGames] showAchievements failed', e);
    }
  }

  // ────────────────────────────────────────────────────────────
  // Expose
  // ────────────────────────────────────────────────────────────

  window.PlayGamesServices = {
    isAvailable,
    signIn,
    isAuthenticated,
    submitScore,
    showLeaderboard,
    showDailyLeaderboard,
    showWeeklyLeaderboard,
    showAllTimeLeaderboard,
    unlockAchievement,
    syncAchievements,
    showAchievements,
    /** Cached Play Games player ID (empty until signIn() resolves). */
    getPlayerId: () => _playerId,
    /** Cached Play Games display name (empty until signIn() resolves). */
    getDisplayName: () => _playerDisplayName,
    ACHIEVEMENT_MAP,
    LEADERBOARD_ID,
  };
})(window);
