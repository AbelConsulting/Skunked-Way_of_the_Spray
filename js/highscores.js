/*!
 * Skunked: Way of the Spray
 * Copyright (c) 2026 Mephitideus Interactive. All Rights Reserved.
 * Proprietary and confidential — unauthorized copying, distribution, or use
 * of this file, via any medium, is strictly prohibited. See LICENSE for terms.
 */
// js/highscores.js
// Global high-score manager using the skunked.io leaderboard API.

// Import the REST API functions for the global leaderboard
import { submitScore as submitAPIScore, getHighScores as getAPIHighScores, checkHealth as checkAPIHealth, getEntitlements as fetchAPIEntitlements, setEntitlement as pushAPIEntitlement } from './firebase.js'; // REST client (no Firebase SDK)

// Bridge the entitlement helpers to the global scope so classic-script
// modules (PurchaseManager) can use them without bundling. PurchaseManager
// loads after this module.
try {
    window.SkunkEntitlementsAPI = {
        getEntitlements: fetchAPIEntitlements,
        setEntitlement: pushAPIEntitlement,
    };
} catch (_) {}

(function(window){
  const ACHIEVEMENTS_KEY = 'skunkfu_achievements_v1';
  const MAX_SCORES = 10; // The number of scores to show on the leaderboard.
  const PLAYER_NAME_KEY = 'skunkfu.playerName'; // Last submitted name (for own-row highlight).

  function _savePlayerName(name) {
    if (typeof name !== 'string' || !name.trim()) return;
    const trimmed = name.trim().slice(0, 16);
    if (window.safeStorage) window.safeStorage.set(PLAYER_NAME_KEY, trimmed);
    else { try { localStorage.setItem(PLAYER_NAME_KEY, trimmed); } catch (e) { /* private mode */ } }
  }
  function _loadPlayerName() {
    if (window.safeStorage) return window.safeStorage.get(PLAYER_NAME_KEY, '') || '';
    try { return localStorage.getItem(PLAYER_NAME_KEY) || ''; }
    catch (e) { return ''; }
  }
  function _formatAgo(ms) {
    if (!ms || ms < 0) return '';
    const s = Math.floor(ms / 1000);
    if (s < 5)   return 'just now';
    if (s < 60)  return s + 's ago';
    const m = Math.floor(s / 60);
    if (m < 60)  return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24)  return h + 'h ago';
    const d = Math.floor(h / 24);
    return d + 'd ago';
  }
  const ACHIEVEMENT_DEFINITIONS = Object.freeze([
    // ── Combat Basics ──
    { id: 'first_kill', name: 'First Blood', desc: 'Defeat your first enemy', icon: '🩸', check: (stats) => statNumber(stats.enemiesDefeated) >= 1 },
    { id: 'enemy_slayer', name: 'Enemy Slayer', desc: 'Defeat 50 enemies in a run', icon: '⚔️', check: (stats) => statNumber(stats.enemiesDefeated) >= 50 },
    { id: 'exterminator', name: 'Exterminator', desc: 'Defeat 150 enemies in a run', icon: '☠️', check: (stats) => statNumber(stats.enemiesDefeated) >= 150 },
    { id: 'genocide', name: 'Unstoppable', desc: 'Defeat 300 enemies in a run', icon: '💀', check: (stats) => statNumber(stats.enemiesDefeated) >= 300 },

    // ── Combo Mastery ──
    { id: 'combo_master', name: 'Combo Starter', desc: 'Reach a 5-hit combo', icon: '🔥', check: (stats) => statNumber(stats.maxCombo) >= 5 },
    { id: 'combo_adept', name: 'Combo Adept', desc: 'Reach a 10-hit combo', icon: '🔥', check: (stats) => statNumber(stats.maxCombo) >= 10 },
    { id: 'combo_legend', name: 'Combo Legend', desc: 'Reach a 20-hit combo', icon: '🌪️', check: (stats) => statNumber(stats.maxCombo) >= 20 },
    { id: 'combo_god', name: 'Combo God', desc: 'Reach a 50-hit combo', icon: '💫', check: (stats) => statNumber(stats.maxCombo) >= 50 },
    { id: 'multi_hit_master', name: 'Cleave Master', desc: 'Land 10 multi-hit attacks in a run', icon: '🗡️', check: (stats) => statNumber(stats.multiKills) >= 10 },

    // ── Score ──
    { id: 'high_scorer', name: 'High Scorer', desc: 'Score over 50,000 points', icon: '💎', check: (stats) => statNumber(stats.score) >= 50000 },
    { id: 'score_attack', name: 'Score Attack', desc: 'Score over 150,000 points', icon: '👑', check: (stats) => statNumber(stats.score) >= 150000 },
    { id: 'score_legend', name: 'Score Legend', desc: 'Score over 500,000 points', icon: '🏆', check: (stats) => statNumber(stats.score) >= 500000 },

    // ── Shadow Strike ──
    { id: 'shadow_initiate', name: 'Shadow Initiate', desc: 'Use Shadow Strike 10 times in a run', icon: '🌑', check: (stats) => statNumber(stats.shadowStrikesUsed) >= 10 },
    { id: 'shadow_master', name: 'Shadow Master', desc: 'Kill 25 enemies with Shadow Strike', icon: '🌘', check: (stats) => statNumber(stats.shadowStrikeKills) >= 25 },
    { id: 'phantom_blade', name: 'Phantom Blade', desc: 'Kill 75 enemies with Shadow Strike', icon: '👻', check: (stats) => statNumber(stats.shadowStrikeKills) >= 75 },

    // ── Skunk Spray ──
    { id: 'spray_novice', name: 'Spray Novice', desc: 'Fire 5 Skunk Shots in a run', icon: '💨', check: (stats) => statNumber(stats.skunkShotsFired) >= 5 },
    { id: 'stink_bomber', name: 'Stink Bomber', desc: 'Skunk 20 enemies in a run', icon: '🦨', check: (stats) => statNumber(stats.enemiesSkunked) >= 20 },
    { id: 'toxic_cloud', name: 'Toxic Cloud', desc: 'Skunk 50 enemies in a run', icon: '☁️', check: (stats) => statNumber(stats.enemiesSkunked) >= 50 },

    // ── Aerial Combat ──
    { id: 'air_juggler', name: 'Air Juggler', desc: 'Defeat 5 enemies while airborne', icon: '🦅', check: (stats) => statNumber(stats.airKills) >= 5 },
    { id: 'sky_warrior', name: 'Sky Warrior', desc: 'Defeat 25 enemies while airborne', icon: '✈️', check: (stats) => statNumber(stats.airKills) >= 25 },

    // ── Accuracy & Precision ──
    { id: 'precision_striker', name: 'Precision Striker', desc: '75% accuracy after 20+ attacks', icon: '🎯', check: (stats) => statNumber(stats.attacksAttempted) >= 20 && statNumber(stats.accuracy) >= 0.75 },
    { id: 'sharpshooter', name: 'Sharpshooter', desc: '90% accuracy after 50+ attacks', icon: '🎯', check: (stats) => statNumber(stats.attacksAttempted) >= 50 && statNumber(stats.accuracy) >= 0.90 },
    { id: 'never_miss', name: 'Never Miss', desc: '100% accuracy after 30+ attacks', icon: '💯', check: (stats) => statNumber(stats.attacksAttempted) >= 30 && statNumber(stats.accuracy) >= 1.0 },

    // ── Boss Hunting ──
    { id: 'boss_slayer', name: 'Boss Slayer', desc: 'Defeat your first boss', icon: '🐲', check: (stats) => statNumber(stats.bossesDefeated) >= 1 },
    { id: 'boss_crusher', name: 'Boss Crusher', desc: 'Defeat 3 bosses in a run', icon: '⚒️', check: (stats) => statNumber(stats.bossesDefeated) >= 3 },
    { id: 'boss_hunter', name: 'Boss Hunter', desc: 'Defeat all 6 bosses in a run', icon: '🏹', check: (stats) => statNumber(stats.bossesDefeated) >= 6 },
    { id: 'veteran_hunter', name: 'Veteran Hunter', desc: 'Defeat 20 bosses across all runs', icon: '🗡️', check: (stats) => statNumber(stats.totalBossesDefeated) >= 20 },

    // ── Survival & Grit ──
    { id: 'perfect_level', name: 'Untouchable', desc: 'Complete a level without taking damage', icon: '🛡️', check: (stats) => statNumber(stats.perfectLevels) >= 1 },
    { id: 'iron_fur', name: 'Iron Fur', desc: 'Finish 3 perfect levels in one run', icon: '🦾', check: (stats) => statNumber(stats.perfectLevels) >= 3 },
    { id: 'flawless_run', name: 'Flawless Run', desc: 'Complete the game with 0 damage taken', icon: '✨', check: (stats) => !!stats.gameCompleted && statNumber(stats.damageTaken) === 0 },
    { id: 'close_call', name: 'Close Call', desc: 'Survive a hit at under 15% health', icon: '💔', check: (stats) => statNumber(stats.closeCalls) >= 1 },
    { id: 'cheating_death', name: 'Cheating Death', desc: 'Survive 5 close calls in a run', icon: '😰', check: (stats) => statNumber(stats.closeCalls) >= 5 },
    { id: 'survivor', name: 'Survivor', desc: 'Survive for 10 minutes in one run', icon: '⏰', check: (stats) => statNumber(stats.timeSurvived) >= 600 },
    { id: 'endurance', name: 'Endurance', desc: 'Survive for 20 minutes in one run', icon: '⌛', check: (stats) => statNumber(stats.timeSurvived) >= 1200 },
    { id: 'no_lives_lost', name: 'No Lives Lost', desc: 'Complete a level without losing a life', icon: '💚', check: (stats) => statNumber(stats.levelsCompleted) >= 1 && statNumber(stats.deathsThisRun) === 0 },

    // ── Collection & Exploration ──
    { id: 'relic_hunter', name: 'Relic Hunter', desc: 'Collect 10 Golden Idols across all runs', icon: '🗿', check: (stats) => statNumber(stats.totalIdolsCollected) >= 10 },
    { id: 'idol_hoarder', name: 'Idol Hoarder', desc: 'Collect 50 Golden Idols across all runs', icon: '🏺', check: (stats) => statNumber(stats.totalIdolsCollected) >= 50 },
    { id: 'master_collector', name: 'Master Collector', desc: 'Complete 3 idol sets in one run', icon: '🏅', check: (stats) => statNumber(stats.idolSetsCompleted) >= 3 },
    { id: 'completionist', name: 'Completionist', desc: 'Collect all 18 idols in a single run', icon: '🌈', check: (stats) => statNumber(stats.idolsCollected) >= 18 },
    { id: 'power_hungry', name: 'Power Hungry', desc: 'Collect 15 power-ups in a run', icon: '⚡', check: (stats) => statNumber(stats.powerUpsCollected) >= 15 },

    // ── Chain Reactions ──
    { id: 'chain_reaction', name: 'Chain Reaction', desc: 'Trigger an exploder chain kill', icon: '💥', check: (stats) => statNumber(stats.exploderChainKills) >= 1 },
    { id: 'demolition_expert', name: 'Demolition Expert', desc: 'Trigger 5 exploder chain kills in a run', icon: '🧨', check: (stats) => statNumber(stats.exploderChainKills) >= 5 },

    // ── Speedrunning ──
    { id: 'speed_demon', name: 'Speed Demon', desc: 'Beat the game in under 15 minutes', icon: '⚡', check: (stats) => !!stats.gameCompleted && statNumber(stats.completionTime) > 0 && statNumber(stats.completionTime) <= 900 },
    { id: 'speed_god', name: 'Speed God', desc: 'Beat the game in under 10 minutes', icon: '🚀', check: (stats) => !!stats.gameCompleted && statNumber(stats.completionTime) > 0 && statNumber(stats.completionTime) <= 600 },

    // ── Campaign & Progression ──
    { id: 'world_saver', name: 'World Saver', desc: 'Complete the campaign', icon: '🌟', check: (stats) => !!stats.gameCompleted },
    { id: 'halfway_there', name: 'Halfway There', desc: 'Complete 3 levels in a run', icon: '🏔️', check: (stats) => statNumber(stats.levelsCompleted) >= 3 },

    // ── Cross-Run Dedication ──
    { id: 'dedicated', name: 'Dedicated', desc: 'Play 10 runs', icon: '🎮', check: (stats) => statNumber(stats.totalRuns) >= 10 },
    { id: 'addicted', name: 'Addicted', desc: 'Play 50 runs', icon: '🕹️', check: (stats) => statNumber(stats.totalRuns) >= 50 },
    { id: 'veteran', name: 'Veteran', desc: 'Play 100 runs', icon: '🎖️', check: (stats) => statNumber(stats.totalRuns) >= 100 },
    { id: 'mass_extinction', name: 'Mass Extinction', desc: 'Defeat 1,000 enemies across all runs', icon: '🪦', check: (stats) => statNumber(stats.totalEnemiesDefeated) >= 1000 },
    { id: 'armageddon', name: 'Armageddon', desc: 'Defeat 5,000 enemies across all runs', icon: '🔱', check: (stats) => statNumber(stats.totalEnemiesDefeated) >= 5000 },
    { id: 'time_invested', name: 'Time Invested', desc: 'Play for 1 hour total', icon: '⏳', check: (stats) => statNumber(stats.totalPlayTime) >= 3600 },

    // ── Founder / Early Access ──
    // Granted automatically the first time a Founder finishes a run —
    // gating it on `world_saver_or_run_count >= 1` so it doesn't pop in the
    // tutorial. The actual entitlement check lives in FounderManager.
    { id: 'day_one_skunk', name: 'Day-One Skunk', desc: 'Supported the game during early access', icon: '🌟', check: (stats) => {
        try { return !!(window.FounderManager && FounderManager.isFounder()); }
        catch (e) { return false; }
    } },
    { id: 'no_lifer', name: 'No-Lifer', desc: 'Play for 5 hours total', icon: '🌙', check: (stats) => statNumber(stats.totalPlayTime) >= 18000 },

    // ── Damage & Efficiency ──
    { id: 'glass_cannon', name: 'Glass Cannon', desc: 'Deal 5,000+ damage while taking under 50', icon: '🔮', check: (stats) => statNumber(stats.totalDamage) >= 5000 && statNumber(stats.damageTaken) < 50 },
    { id: 'berserker', name: 'Berserker', desc: 'Deal 10,000 damage in a single run', icon: '🪓', check: (stats) => statNumber(stats.totalDamage) >= 10000 },

    // ── Secret / Fun ──
    { id: 'multiplier_max', name: 'Multiplier Maniac', desc: 'Reach a 3.0x combo multiplier', icon: '✖️', check: (stats) => statNumber(stats.bestMultiplier) >= 3.0 },
    { id: 'pacifist_start', name: 'Pacifist Start', desc: 'Survive 60 seconds without attacking', icon: '🕊️', check: (stats) => statNumber(stats.timeSurvived) >= 60 && statNumber(stats.attacksAttempted) === 0 },
  ]);

  function statNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function getAchievementDefinitions() {
    return ACHIEVEMENT_DEFINITIONS.map(({ check, ...achievement }) => ({ ...achievement }));
  }

  // ── Achievement-Based Titles ──
  // Earned by total achievement count; displayed on leaderboard next to player name.
  const TITLE_TIERS = Object.freeze([
    { min:  0, title: 'Newcomer',     color: '#aaaaaa' },
    { min:  5, title: 'Recruit',      color: '#66bb6a' },
    { min: 10, title: 'Fighter',      color: '#42a5f5' },
    { min: 15, title: 'Warrior',      color: '#ab47bc' },
    { min: 25, title: 'Champion',     color: '#ffa726' },
    { min: 35, title: 'Legend',       color: '#ffd700' },
    { min: 45, title: 'Grandmaster',  color: '#ff5252' },
    { min: 55, title: 'Mythic',       color: '#e040fb' },
  ]);

  function getTitleForCount(count) {
    let tier = TITLE_TIERS[0];
    for (const t of TITLE_TIERS) {
      if (count >= t.min) tier = t;
    }
    return tier;
  }

  function getPlayerTitle() {
    const achievements = loadAchievements();
    const count = Object.values(achievements).filter(a => a && a.unlocked).length;
    return { ...getTitleForCount(count), count, total: ACHIEVEMENT_DEFINITIONS.length };
  }

  // ── Prestige Score ──
  // Weighted achievement points — harder achievements are worth more.
  const PRESTIGE_WEIGHTS = Object.freeze({
    // Easy (1 pt)
    first_kill: 1, spray_novice: 1, combo_master: 1, chain_reaction: 1, boss_slayer: 1,
    close_call: 1, relic_hunter: 1, halfway_there: 1, dedicated: 1,
    // Medium (3 pt)
    enemy_slayer: 3, combo_adept: 3, high_scorer: 3, shadow_initiate: 3, stink_bomber: 3,
    air_juggler: 3, precision_striker: 3, boss_crusher: 3, perfect_level: 3, survivor: 3,
    no_lives_lost: 3, power_hungry: 3, demolition_expert: 3, multi_hit_master: 3,
    mass_extinction: 3, time_invested: 3, multiplier_max: 3, idol_hoarder: 3,
    // Hard (5 pt)
    exterminator: 5, combo_legend: 5, score_attack: 5, shadow_master: 5, toxic_cloud: 5,
    sky_warrior: 5, sharpshooter: 5, boss_hunter: 5, iron_fur: 5, cheating_death: 5,
    endurance: 5, master_collector: 5, speed_demon: 5, world_saver: 5,
    veteran_hunter: 5, addicted: 5, armageddon: 5, berserker: 5,
    // Epic (10 pt)
    genocide: 10, combo_god: 10, score_legend: 10, phantom_blade: 10,
    never_miss: 10, flawless_run: 10, completionist: 10, speed_god: 10,
    veteran: 10, no_lifer: 10, glass_cannon: 10, pacifist_start: 10,
  });

  function getPrestigeScore(achievements) {
    const achs = achievements || loadAchievements();
    let total = 0;
    for (const [id, data] of Object.entries(achs)) {
      if (data && data.unlocked) total += (PRESTIGE_WEIGHTS[id] || 1);
    }
    return total;
  }

  function getMaxPrestige() {
    let total = 0;
    for (const a of ACHIEVEMENT_DEFINITIONS) total += (PRESTIGE_WEIGHTS[a.id] || 1);
    return total;
  }

  // Score validation to prevent obviously tampered scores
  function validateScore(score) {
    if (typeof score !== 'number' || score < 0 || !isFinite(score)) return false;
    if (score > 1000000) return false; // A reasonable maximum score to prevent nonsense submissions.
    return true;
  }

  // --- Achievement logic (uses local storage, unchanged) ---
  function loadAchievements(){
    if (window.safeStorage) {
      const data = window.safeStorage.getJSON(ACHIEVEMENTS_KEY, {});
      return (data && typeof data === 'object') ? data : {};
    }
    // Legacy fallback if safeStorage isn't loaded yet
    try {
      const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch(e){ return {}; }
  }

  function saveAchievements(achievements){
    if (window.safeStorage) { window.safeStorage.setJSON(ACHIEVEMENTS_KEY, achievements); return; }
    try { localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements)); }
    catch(e){ console.warn('Failed to save achievements', e); }
  }

  function checkAchievements(gameStats) {
    const achievements = loadAchievements();
    const newAchievements = [];
    const stats = gameStats || {};
    for (const achievement of ACHIEVEMENT_DEFINITIONS) {
      if (!achievements[achievement.id] && achievement.check(stats)) {
        achievements[achievement.id] = { unlocked: true, date: Date.now() };
        const { check, ...meta } = achievement;
        newAchievements.push(meta);
      }
    }
    if (newAchievements.length > 0) {
      saveAchievements(achievements);

      // ── Mirror unlocks to Google Play Games (best-effort, fire-and-forget) ──
      try {
        if (typeof window !== 'undefined' && window.PlayGamesServices && PlayGamesServices.isAvailable && PlayGamesServices.isAvailable()) {
          for (const ach of newAchievements) {
            try { PlayGamesServices.unlockAchievement(ach.id); } catch(e){}
          }
        }
      } catch(e) { /* GPGS mirroring must never break gameplay */ }

      // ── Dispatch a CustomEvent so toast/rail UI can react ──
      try {
        if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
          for (const ach of newAchievements) {
            window.dispatchEvent(new CustomEvent('skunkfu-achievement-unlocked', {
              detail: { id: ach.id, name: ach.name, desc: ach.desc, icon: ach.icon, date: Date.now() }
            }));
          }
        }
      } catch(e) { /* event dispatch must never break gameplay */ }
    }
    return newAchievements;
  }

  function renderAchievements(target, options = {}){
    const achievements = loadAchievements();
    const container = target || document.createElement('div');
    const settings = {
      includeTitle: true,
      variant: 'list',
      ...options
    };
    const achievementList = getAchievementDefinitions();

    container.innerHTML = '';
    if (settings.variant === 'cards') {
      container.className = 'info-achieve-grid';
      for (const ach of achievementList) {
        const isUnlocked = !!achievements[ach.id];
        const entry = document.createElement('div');
        entry.className = `info-achieve-card ${isUnlocked ? 'unlocked' : 'locked'}`;
        entry.setAttribute('data-ach-id', ach.id);

        const icon = document.createElement('span');
        icon.className = 'achieve-icon';
        icon.textContent = ach.icon;

        const info = document.createElement('div');
        info.className = 'achieve-info';

        const name = document.createElement('h4');
        name.textContent = ach.name;

        const desc = document.createElement('p');
        desc.textContent = ach.desc;

        const status = document.createElement('span');
        status.className = 'achieve-lock';
        status.textContent = isUnlocked ? '✓' : '🔒';

        info.appendChild(name);
        info.appendChild(desc);
        entry.appendChild(icon);
        entry.appendChild(info);
        entry.appendChild(status);
        container.appendChild(entry);
      }
      return container;
    }

    container.className = 'achievements-container';
    if (settings.includeTitle) {
      const title = document.createElement('h3');
      title.textContent = '🏆 ACHIEVEMENTS';
      container.appendChild(title);
    }

    for (const ach of achievementList) {
      const entry = document.createElement('div');
      entry.className = 'achievement-entry' + (achievements[ach.id] ? ' unlocked' : '');
      const icon = document.createElement('div');
      icon.className = 'achievement-icon';
      icon.textContent = ach.icon;
      const info = document.createElement('div');
      info.className = 'achievement-info';
      const name = document.createElement('div');
      name.className = 'achievement-name';
      name.textContent = ach.name;
      const desc = document.createElement('div');
      desc.className = 'achievement-desc';
      desc.textContent = ach.desc;
      info.appendChild(name);
      info.appendChild(desc);
      const status = document.createElement('div');
      status.className = 'achievement-status';
      status.textContent = achievements[ach.id] ? '✓' : '🔒';
      entry.appendChild(icon);
      entry.appendChild(info);
      entry.appendChild(status);
      container.appendChild(entry);
    }
    return container;
  }
  // --- End of achievement logic ---

  /**
   * Fetches scores from the skunked.io leaderboard.
   * @returns {Promise<Array>} A promise that resolves to an array of score objects.
   */
  async function loadScores(period) {
    try {
      const scores = await getAPIHighScores(MAX_SCORES, period || 'alltime');
      return scores || [];
    } catch(e) { 
      console.warn('Failed to load highscores from skunked.io', e);
      return []; 
    }
  }

  /**
   * Checks if a score is high enough to make the leaderboard.
   * @param {number} score The player's score.
   * @returns {Promise<boolean>} A promise that resolves to true if it is a high score.
   */
  async function isHighScore(score){
    if (typeof score !== 'number') return false;
    const scores = await loadScores();
    if (scores.length < MAX_SCORES) return true;
    return score > scores[scores.length - 1].score;
  }

  /**
   * Submits a score to the skunked.io leaderboard.
   * @param {number} score The player's score.
   * @param {string} name The player's name/initials.
   * @param {object} [gameStats] Game session stats for achievement checks.
   */
  // ── Dedupe state for score submissions ──
  // Prevents the rapid game-over → "Save" → onclick path from firing twice,
  // and prevents network retries from creating duplicate leaderboard rows.
  const _submitInflight = new Map();   // runId → in-flight promise
  const _submitCompleted = new Set();  // runIds that have already succeeded

  function _generateRunId() {
    try {
      if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    } catch (e) { /* fall through */ }
    return 'run-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  /**
   * Returns a stable run ID for the current session, generating + caching one
   * onto gameStats if missing. Callers (e.g. game.js) can also pre-set
   * gameStats.runId at run start.
   */
  function _runIdFor(gameStats) {
    if (gameStats && typeof gameStats.runId === 'string' && gameStats.runId) {
      return gameStats.runId;
    }
    const id = _generateRunId();
    if (gameStats && typeof gameStats === 'object') {
      try { gameStats.runId = id; } catch (e) { /* frozen object */ }
    }
    return id;
  }

  async function addScore(score, name, gameStats) {
    if (!validateScore(score)) {
      console.warn('Invalid score rejected', score);
      return false;
    }

    const runId = _runIdFor(gameStats);

    // Already submitted successfully — short-circuit (idempotent).
    if (_submitCompleted.has(runId)) {
      return true;
    }
    // Submission in flight for this run — return the existing promise so
    // overlapping callers all observe the same outcome instead of double-posting.
    if (_submitInflight.has(runId)) {
      return _submitInflight.get(runId);
    }

    const work = (async () => {
      try {
      // Remember this name so we can highlight the player's own row on the board.
      _savePlayerName(name);
      // Run achievement checks for this run (may unlock new ones)
      if (gameStats) checkAchievements(gameStats);
      // Build rich payload: all unlocked achievement IDs, prestige, title
      const allUnlocked = loadAchievements();
      const achievementIds = Object.keys(allUnlocked).filter(id => allUnlocked[id] && allUnlocked[id].unlocked);
      const prestige = getPrestigeScore(allUnlocked);
      const titleInfo = getPlayerTitle();
      const apiSubmitPromise = submitAPIScore(name, score, achievementIds, {
        prestige,
        title: titleInfo.title,
        achievementCount: titleInfo.count,
        level: gameStats ? (gameStats.levelsCompleted || 0) : 0,
        runId
      });
      const canSubmitPlayGames = !!(
        window.PlayGamesServices &&
        typeof PlayGamesServices.isAvailable === 'function' &&
        PlayGamesServices.isAvailable() &&
        typeof PlayGamesServices.submitScore === 'function'
      );

      const playGamesSubmitPromise = canSubmitPlayGames
        ? PlayGamesServices.submitScore(score)
        : Promise.resolve(false);

      const [apiOk, playGamesOk] = await Promise.all([
        apiSubmitPromise,
        playGamesSubmitPromise,
      ]);

      if (!apiOk && !playGamesOk) {
        console.error('Score submission failed for both Cloud Functions and Play Games');
      } else {
        // Mark this runId so a follow-up retry can't double-post.
        _submitCompleted.add(runId);
      }
      // Analytics: score submit
      try {
        if (typeof Analytics !== 'undefined') {
          Analytics.trackScoreSubmit({
            score,
            name,
            levelReached: gameStats ? (gameStats.levelsCompleted || 0) : 0,
            prestige
          });
        }
      } catch (e) { /* */ }
      return apiOk || playGamesOk;
      } catch (e) {
        console.error("Failed to submit score to skunked.io", e);
        return false;
      } finally {
        _submitInflight.delete(runId);
      }
    })();

    _submitInflight.set(runId, work);
    return work;
  }

  /**
   * Shows a modal for the user to enter their initials for a new high score.
   * @param {number} score The player's score.
   * @param {object} gameStats Additional stats from the game session.
   * @param {function} onDone A callback function to execute after submission.
   */
  function promptForInitials(score, gameStats, onDone){
    try {
      const overlay = document.createElement('div');
      overlay.className = 'highscore-prompt-overlay';

      const box = document.createElement('div');
      box.className = 'highscore-prompt-box';

      const title = document.createElement('div');
      title.className = 'highscore-prompt-title';
      title.textContent = '🏆 NEW HIGH SCORE!';

      const scoreLine = document.createElement('div');
      scoreLine.className = 'highscore-prompt-score';
      scoreLine.textContent = `Score: ${score.toLocaleString()}`;

      // Show player title and prestige
      const titleInfo = getPlayerTitle();
      const prestige = getPrestigeScore();
      const titleLine = document.createElement('div');
      titleLine.className = 'highscore-prompt-title-line';
      titleLine.innerHTML = `<span style="color:${titleInfo.color};font-weight:bold">${titleInfo.title}</span> \u2022 \u2b50 ${prestige} Prestige \u2022 ${titleInfo.count}/${titleInfo.total} Achievements`;

      const input = document.createElement('input');
      input.maxLength = 10; // Allow longer names
      input.placeholder = 'Enter Your Name';
      input.className = 'highscore-prompt-input';

      input.addEventListener('input', () => {
        input.style.borderColor = input.value.length > 0 ? '#4CAF50' : '#666';
      });

      const btnRow = document.createElement('div');
      btnRow.className = 'highscore-prompt-buttons';

      const ok = document.createElement('button');
      ok.textContent = '💾 SAVE';
      ok.className = 'highscore-prompt-save';
      
      ok.onclick = async () => {
        const name = (input.value.trim() || 'Ninja').slice(0,10);
        
        ok.disabled = true;
        skip.disabled = true;
        ok.textContent = 'SAVING...';

        await addScore(score, name, gameStats);
        
        box.innerHTML = '';
        const confirmTitle = document.createElement('div');
        confirmTitle.className = 'highscore-prompt-title';
        confirmTitle.textContent = '✓ Score Submitted!';
        confirmTitle.style.color = '#4CAF50';
        box.appendChild(confirmTitle);
        
        setTimeout(() => {
          try { document.body.removeChild(overlay); } catch(e){}
        }, 2500);
        
        if (onDone) {
            const newScores = await loadScores();
            onDone(newScores);
        }
      };

      const skip = document.createElement('button');
      skip.textContent = '❌ SKIP';
      skip.className = 'highscore-prompt-skip';
      skip.onclick = () => {
        try { document.body.removeChild(overlay); } catch(e) {}
        if (onDone) onDone();
      };

      input.addEventListener('keydown', (e)=> {
        if (e.key === 'Enter') ok.click();
        if (e.key === 'Escape') skip.click();
      });

      btnRow.appendChild(ok);
      btnRow.appendChild(skip);
      box.appendChild(title);
      box.appendChild(scoreLine);
      box.appendChild(titleLine);
      box.appendChild(input);
      box.appendChild(btnRow);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      input.focus();
    } catch (e) {
      console.warn('promptForInitials failed', e);
      if (onDone) onDone();
    }
  }

  /**
   * Fetches scores and renders them into a target HTML element.
   * @param {HTMLElement} target The element to render the scoreboard into.
   * @param {boolean} showDetails Whether to show extra details (not used with Firebase scores).
   */
  async function renderScoreboard(target, showDetails = false){
    const container = target || document.createElement('div');
    if (!target) container.className = 'scoreboard-container';

    // ── Build chrome (header + tabs + list shell) once, then refill on each load ──
    if (!container.querySelector('.scoreboard-header')) {
      container.innerHTML = '';

      const header = document.createElement('div');
      header.className = 'scoreboard-header';

      const title = document.createElement('h3');
      title.textContent = '🏆 GLOBAL LEADERBOARD';
      title.className = 'scoreboard-title';
      header.appendChild(title);

      const meta = document.createElement('div');
      meta.className = 'scoreboard-meta';

      const updated = document.createElement('span');
      updated.className = 'scoreboard-updated';
      updated.textContent = '';
      meta.appendChild(updated);

      const refreshBtn = document.createElement('button');
      refreshBtn.type = 'button';
      refreshBtn.className = 'scoreboard-refresh';
      refreshBtn.setAttribute('aria-label', 'Refresh leaderboard');
      refreshBtn.innerHTML = '<span class="scoreboard-refresh-icon" aria-hidden="true">↻</span><span class="scoreboard-refresh-label">Refresh</span>';
      meta.appendChild(refreshBtn);

      header.appendChild(meta);
      container.appendChild(header);

      // ── Period tabs ──
      const tabs = document.createElement('div');
      tabs.className = 'scoreboard-tabs';
      tabs.setAttribute('role', 'tablist');
      const tabDefs = [
        { period: 'week',    label: 'This Week' },
        { period: 'month',   label: 'This Month' },
        { period: 'alltime', label: 'All Time' },
      ];
      for (const def of tabDefs) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'scoreboard-tab';
        btn.dataset.period = def.period;
        btn.textContent = def.label;
        btn.setAttribute('role', 'tab');
        if (def.period === 'alltime') {
          btn.classList.add('is-active');
          btn.setAttribute('aria-selected', 'true');
        } else {
          btn.setAttribute('aria-selected', 'false');
        }
        tabs.appendChild(btn);
      }
      container.appendChild(tabs);

      const list = document.createElement('div');
      list.className = 'scoreboard-list';
      container.appendChild(list);

      // Tab click: switch active period and reload
      tabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.scoreboard-tab');
        if (!btn || btn.classList.contains('is-active')) return;
        tabs.querySelectorAll('.scoreboard-tab').forEach(b => {
          b.classList.remove('is-active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');
        container._scoreboardPeriod = btn.dataset.period;
        _fillScoreboard(container);
      });

      refreshBtn.addEventListener('click', () => { _fillScoreboard(container); });
    }

    // Set default period if not already set, then load
    if (!container._scoreboardPeriod) container._scoreboardPeriod = 'alltime';
    await _fillScoreboard(container);
    return container;
  }

  /**
   * Internal: loads scores for the container's active period and renders rows.
   * Separated so tabs and the refresh button both share identical behaviour.
   * @param {HTMLElement} container
   */
  async function _fillScoreboard(container) {
    const period   = container._scoreboardPeriod || 'alltime';
    const list     = container.querySelector('.scoreboard-list');
    const updatedEl = container.querySelector('.scoreboard-updated');
    const refreshBtn = container.querySelector('.scoreboard-refresh');

    // Loading state (preserves header + tabs so controls stay visible)
    if (refreshBtn) refreshBtn.disabled = true;
    list.innerHTML = '<div class="scoreboard-state scoreboard-state--loading">Loading global scores…</div>';
    if (updatedEl) updatedEl.textContent = '';

    let scores = null;
    let loadFailed = false;
    try {
      scores = await loadScores(period);
    } catch (e) {
      loadFailed = true;
      console.warn('renderScoreboard: loadScores threw', e);
    }
    if (refreshBtn) refreshBtn.disabled = false;

    list.innerHTML = '';

    if (loadFailed || !Array.isArray(scores)) {
      const err = document.createElement('div');
      err.className = 'scoreboard-state scoreboard-state--error';
      err.textContent = "Couldn't reach the leaderboard. Tap Refresh to try again.";
      list.appendChild(err);
      return;
    }

    // Stamp + auto-tick the "updated Xs ago" label.
    const fetchedAt = Date.now();
    function _tickUpdated() {
      if (!updatedEl || !updatedEl.isConnected) return;
      updatedEl.textContent = 'Updated ' + _formatAgo(Date.now() - fetchedAt);
    }
    _tickUpdated();
    if (container._scoreboardTimer) {
      clearInterval(container._scoreboardTimer);
    }
    container._scoreboardTimer = setInterval(() => {
      if (!updatedEl || !updatedEl.isConnected) {
        clearInterval(container._scoreboardTimer);
        container._scoreboardTimer = null;
        return;
      }
      _tickUpdated();
    }, 10000);

    if (scores.length === 0) {
      const labels = { week: 'this week', month: 'this month', alltime: '' };
      const empty = document.createElement('div');
      empty.className = 'scoreboard-state scoreboard-state--empty';
      empty.textContent = labels[period]
        ? `No scores ${labels[period]} yet — be the first!`
        : 'No scores yet — set the bar.';
      list.appendChild(empty);
    } else {
      const myName = _loadPlayerName().toLowerCase();
      scores.forEach((scoreData, i) => {
        const entry = document.createElement('div');
        entry.className = 'scoreboard-entry';
        if (i === 0) entry.classList.add('gold');
        if (i === 1) entry.classList.add('silver');
        if (i === 2) entry.classList.add('bronze');
        if (myName && scoreData.name && scoreData.name.toLowerCase() === myName) {
          entry.classList.add('scoreboard-entry--me');
        }

        const rank = document.createElement('div');
        rank.className = 'scoreboard-rank';
        rank.textContent = `${i + 1}.`;

        const info = document.createElement('div');
        info.className = 'scoreboard-info';

        // Player name
        const nameRow = document.createElement('div');
        nameRow.className = 'scoreboard-name';
        nameRow.textContent = scoreData.name || '???';

        // FOUNDER badge — only shown on the player's own row when they hold
        // the early-access entitlement. The leaderboard API doesn't yet
        // carry a founder flag for other players, so this is local-only.
        const isOwnRow = myName && scoreData.name && scoreData.name.toLowerCase() === myName;
        const isFounder = (() => {
          try { return !!(window.FounderManager && FounderManager.isFounder()); }
          catch (e) { return false; }
        })();
        if (isOwnRow && isFounder) {
          const founderBadge = document.createElement('span');
          founderBadge.className = 'scoreboard-founder-badge';
          const lbl = document.createElement('span');
          lbl.className = 'scoreboard-founder-badge__label';
          lbl.textContent = 'FOUNDER';
          founderBadge.appendChild(lbl);
          nameRow.appendChild(document.createTextNode(' '));
          nameRow.appendChild(founderBadge);
        }

        // Title badge (derived from achievement count)
        const achCount = (Array.isArray(scoreData.achievements) ? scoreData.achievements.length : 0);
        const titleData = scoreData.title
          ? TITLE_TIERS.find(t => t.title === scoreData.title) || getTitleForCount(achCount)
          : getTitleForCount(achCount);
        if (achCount > 0) {
          const titleBadge = document.createElement('span');
          titleBadge.className = 'scoreboard-title-badge';
          titleBadge.textContent = titleData.title;
          titleBadge.style.color = titleData.color;
          nameRow.appendChild(document.createTextNode(' '));
          nameRow.appendChild(titleBadge);
        }
        info.appendChild(nameRow);

        // Score line
        const scoreLine = document.createElement('div');
        scoreLine.className = 'scoreboard-score';
        scoreLine.textContent = scoreData.score.toLocaleString();
        info.appendChild(scoreLine);

        // Achievement badges row (show top 5 icons)
        if (achCount > 0) {
          const badgeRow = document.createElement('div');
          badgeRow.className = 'scoreboard-badges';
          const achIds = scoreData.achievements.slice(0, 5);
          for (const achId of achIds) {
            const def = ACHIEVEMENT_DEFINITIONS.find(a => a.id === achId);
            if (def) {
              const badge = document.createElement('span');
              badge.className = 'scoreboard-badge';
              badge.textContent = def.icon;
              badge.title = def.name;
              badgeRow.appendChild(badge);
            }
          }
          if (achCount > 5) {
            const more = document.createElement('span');
            more.className = 'scoreboard-badge-more';
            more.textContent = `+${achCount - 5}`;
            badgeRow.appendChild(more);
          }
          info.appendChild(badgeRow);
        }

        // Right column: prestige + date
        const rightCol = document.createElement('div');
        rightCol.className = 'scoreboard-right';

        const prestige = scoreData.prestige || 0;
        if (prestige > 0) {
          const prestigeEl = document.createElement('div');
          prestigeEl.className = 'scoreboard-prestige';
          prestigeEl.textContent = `⭐ ${prestige}`;
          prestigeEl.title = 'Prestige Score';
          rightCol.appendChild(prestigeEl);
        }

        const date = document.createElement('div');
        date.className = 'scoreboard-date';
        if (scoreData.timestamp) {
          const d = (scoreData.timestamp instanceof Date)
            ? scoreData.timestamp
            : new Date(scoreData.timestamp);
          date.textContent = d.toLocaleDateString();
        }
        rightCol.appendChild(date);

        entry.appendChild(rank);
        entry.appendChild(info);
        entry.appendChild(rightCol);
        list.appendChild(entry);
      });
    }
  }

  /**
   * Pings the leaderboard service to confirm it is online.
   * @returns {Promise<boolean>}
   */
  async function checkServiceHealth() {
    return checkAPIHealth();
  }

  // Expose the public API
  window.Highscores = {
    // Global scores
    loadScores,
    isHighScore,
    addScore,
    renderScoreboard,
    checkServiceHealth,
    // ---
    promptForInitials,
    // Local achievements
    getAchievementDefinitions,
    loadAchievements,
    saveAchievements,
    checkAchievements,
    renderAchievements,
    validateScore,
    // Title & Prestige system
    getPlayerTitle,
    getPrestigeScore,
    getMaxPrestige,
    getTitleForCount,
  };

})(window);
