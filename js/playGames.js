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
  // Replace with the actual leaderboard ID from Google Play Console.
  const LEADERBOARD_ID = 'REPLACE_WITH_YOUR_LEADERBOARD_ID';

  // ── Achievement ID Mapping ──
  // Maps the game's internal achievement IDs → Google Play Games achievement IDs.
  // After creating achievements in Play Console, replace each 'GPGS_...' placeholder
  // with the real ID (e.g. 'CgkI...' strings).
  const ACHIEVEMENT_MAP = Object.freeze({
    // ── Combat Basics ──
    first_kill:       'GPGS_FIRST_KILL',
    enemy_slayer:     'GPGS_ENEMY_SLAYER',
    exterminator:     'GPGS_EXTERMINATOR',
    genocide:         'GPGS_GENOCIDE',

    // ── Combo Mastery ──
    combo_master:     'GPGS_COMBO_MASTER',
    combo_adept:      'GPGS_COMBO_ADEPT',
    combo_legend:     'GPGS_COMBO_LEGEND',
    combo_god:        'GPGS_COMBO_GOD',
    multi_hit_master: 'GPGS_MULTI_HIT_MASTER',

    // ── Score ──
    high_scorer:      'GPGS_HIGH_SCORER',
    score_attack:     'GPGS_SCORE_ATTACK',
    score_legend:     'GPGS_SCORE_LEGEND',

    // ── Shadow Strike ──
    shadow_initiate:  'GPGS_SHADOW_INITIATE',
    shadow_master:    'GPGS_SHADOW_MASTER',
    phantom_blade:    'GPGS_PHANTOM_BLADE',

    // ── Skunk Spray ──
    spray_novice:     'GPGS_SPRAY_NOVICE',
    stink_bomber:     'GPGS_STINK_BOMBER',
    toxic_cloud:      'GPGS_TOXIC_CLOUD',

    // ── Aerial Combat ──
    air_juggler:      'GPGS_AIR_JUGGLER',
    sky_warrior:      'GPGS_SKY_WARRIOR',

    // ── Accuracy & Precision ──
    precision_striker: 'GPGS_PRECISION_STRIKER',
    sharpshooter:     'GPGS_SHARPSHOOTER',
    never_miss:       'GPGS_NEVER_MISS',

    // ── Boss Hunting ──
    boss_slayer:      'GPGS_BOSS_SLAYER',
    boss_crusher:     'GPGS_BOSS_CRUSHER',
    boss_hunter:      'GPGS_BOSS_HUNTER',
    veteran_hunter:   'GPGS_VETERAN_HUNTER',

    // ── Survival & Grit ──
    perfect_level:    'GPGS_PERFECT_LEVEL',
    iron_fur:         'GPGS_IRON_FUR',
    flawless_run:     'GPGS_FLAWLESS_RUN',
    close_call:       'GPGS_CLOSE_CALL',
    cheating_death:   'GPGS_CHEATING_DEATH',
    survivor:         'GPGS_SURVIVOR',
    endurance:        'GPGS_ENDURANCE',
    no_lives_lost:    'GPGS_NO_LIVES_LOST',

    // ── Collection & Exploration ──
    relic_hunter:     'GPGS_RELIC_HUNTER',
    idol_hoarder:     'GPGS_IDOL_HOARDER',
    master_collector: 'GPGS_MASTER_COLLECTOR',
    completionist:    'GPGS_COMPLETIONIST',
    power_hungry:     'GPGS_POWER_HUNGRY',

    // ── Chain Reactions ──
    chain_reaction:   'GPGS_CHAIN_REACTION',
    demolition_expert:'GPGS_DEMOLITION_EXPERT',

    // ── Speedrunning ──
    speed_demon:      'GPGS_SPEED_DEMON',
    speed_god:        'GPGS_SPEED_GOD',

    // ── Campaign & Progression ──
    world_saver:      'GPGS_WORLD_SAVER',
    halfway_there:    'GPGS_HALFWAY_THERE',

    // ── Cross-Run Dedication ──
    dedicated:        'GPGS_DEDICATED',
    addicted:         'GPGS_ADDICTED',
    veteran:          'GPGS_VETERAN',
    mass_extinction:  'GPGS_MASS_EXTINCTION',
    armageddon:       'GPGS_ARMAGEDDON',
    time_invested:    'GPGS_TIME_INVESTED',
    no_lifer:         'GPGS_NO_LIFER',

    // ── Damage & Efficiency ──
    glass_cannon:     'GPGS_GLASS_CANNON',
    berserker:        'GPGS_BERSERKER',

    // ── Secret / Fun ──
    multiplier_max:   'GPGS_MULTIPLIER_MAX',
    pacifist_start:   'GPGS_PACIFIST_START',
  });

  // ────────────────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────────────────

  /** Sign the player in (auto-sign-in on Android, no-op on web). */
  async function signIn() {
    const plugin = getPlugin();
    if (!plugin) return { isAuthenticated: false };
    try {
      return await plugin.signIn();
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
      return await plugin.isAuthenticated();
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
    if (!plugin) return;
    try {
      await plugin.submitScore({ leaderboardId: LEADERBOARD_ID, score: Math.round(score) });
    } catch (e) {
      console.warn('[PlayGames] submitScore failed', e);
    }
  }

  /** Show the native Play Games leaderboard UI. */
  async function showLeaderboard() {
    const plugin = getPlugin();
    if (!plugin) return;
    try {
      await plugin.showLeaderboard({ leaderboardId: LEADERBOARD_ID });
    } catch (e) {
      console.warn('[PlayGames] showLeaderboard failed', e);
    }
  }

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
    unlockAchievement,
    syncAchievements,
    showAchievements,
    ACHIEVEMENT_MAP,
    LEADERBOARD_ID,
  };
})(window);
