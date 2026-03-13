/*!
 * Skunked: Way of the Spray
 * Copyright (c) 2026 Mephitideus Interactive. All Rights Reserved.
 * Proprietary and confidential — unauthorized copying, distribution, or use
 * of this file, via any medium, is strictly prohibited. See LICENSE for terms.
 */
// js/highscores.js
// Global high-score manager using the skunked.io leaderboard API.

// Import the REST API functions for the global leaderboard
import { submitScore as submitAPIScore, getHighScores as getAPIHighScores, checkHealth as checkAPIHealth } from './firebase.js';

(function(window){
  const ACHIEVEMENTS_KEY = 'skunkfu_achievements_v1';
  const MAX_SCORES = 10; // The number of scores to show on the leaderboard.
  const ACHIEVEMENT_DEFINITIONS = Object.freeze([
    { id: 'first_kill', name: 'First Blood', desc: 'Defeat your first enemy', icon: '🩸', check: (stats) => statNumber(stats.enemiesDefeated) >= 1 },
    { id: 'enemy_slayer', name: 'Enemy Slayer', desc: 'Defeat 50 enemies in a run', icon: '⚔️', check: (stats) => statNumber(stats.enemiesDefeated) >= 50 },
    { id: 'exterminator', name: 'Exterminator', desc: 'Defeat 150 enemies in a run', icon: '☠️', check: (stats) => statNumber(stats.enemiesDefeated) >= 150 },
    { id: 'combo_master', name: 'Combo Starter', desc: 'Reach a 5-hit combo', icon: '🔥', check: (stats) => statNumber(stats.maxCombo) >= 5 },
    { id: 'combo_legend', name: 'Combo Legend', desc: 'Reach a 20-hit combo', icon: '🌪️', check: (stats) => statNumber(stats.maxCombo) >= 20 },
    { id: 'high_scorer', name: 'High Scorer', desc: 'Score over 50,000 points', icon: '💎', check: (stats) => statNumber(stats.score) >= 50000 },
    { id: 'score_attack', name: 'Score Attack', desc: 'Score over 150,000 points', icon: '👑', check: (stats) => statNumber(stats.score) >= 150000 },
    { id: 'perfect_level', name: 'Untouchable', desc: 'Complete a level without taking damage', icon: '🛡️', check: (stats) => statNumber(stats.perfectLevels) >= 1 },
    { id: 'iron_fur', name: 'Iron Fur', desc: 'Finish 3 perfect levels in one run', icon: '🦾', check: (stats) => statNumber(stats.perfectLevels) >= 3 },
    { id: 'relic_hunter', name: 'Relic Hunter', desc: 'Collect 10 Golden Idols across all runs', icon: '🗿', check: (stats) => statNumber(stats.totalIdolsCollected) >= 10 },
    { id: 'master_collector', name: 'Master Collector', desc: 'Complete 3 idol sets in one run', icon: '🏅', check: (stats) => statNumber(stats.idolSetsCompleted) >= 3 },
    { id: 'precision_striker', name: 'Precision Striker', desc: 'Finish with 75% accuracy after 20 attacks', icon: '🎯', check: (stats) => statNumber(stats.attacksAttempted) >= 20 && statNumber(stats.accuracy) >= 0.75 },
    { id: 'speed_demon', name: 'Speed Demon', desc: 'Beat the game in 15 minutes or less', icon: '⚡', check: (stats) => !!stats.gameCompleted && statNumber(stats.completionTime) > 0 && statNumber(stats.completionTime) <= 900 },
    { id: 'world_saver', name: 'World Saver', desc: 'Complete the campaign', icon: '🌟', check: (stats) => !!stats.gameCompleted },
  ]);

  function statNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function getAchievementDefinitions() {
    return ACHIEVEMENT_DEFINITIONS.map(({ check, ...achievement }) => ({ ...achievement }));
  }

  // Score validation to prevent obviously tampered scores
  function validateScore(score) {
    if (typeof score !== 'number' || score < 0 || !isFinite(score)) return false;
    if (score > 1000000) return false; // A reasonable maximum score to prevent nonsense submissions.
    return true;
  }

  // --- Achievement logic (uses local storage, unchanged) ---
  function loadAchievements(){
    try {
      const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch(e){ return {}; }
  }

  function saveAchievements(achievements){
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
   * Fetches scores from Firebase.
   * @returns {Promise<Array>} A promise that resolves to an array of score objects.
   */
  async function loadScores(){
    try {
      const scores = await getAPIHighScores(MAX_SCORES);
      return scores || [];
    } catch(e){ 
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
   * Submits a score to Firebase.
   * @param {number} score The player's score.
   * @param {string} name The player's name/initials.
   */
  async function addScore(score, name, gameStats) {
    if (!validateScore(score)) {
      console.warn('Invalid score rejected', score);
      return;
    }
    try {
      // Collect unlocked achievement names to send alongside the score
      const achievements = [];
      if (gameStats) {
        const checked = checkAchievements(gameStats);
        for (const a of checked) achievements.push(a.name);
      }
      await submitAPIScore(name, score, achievements);
    } catch (e) {
      console.error("Failed to submit score to skunked.io", e);
    }
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
    container.innerHTML = '<p style="text-align:center; color: #ccc;">Loading global scores...</p>';
    
    // Add basic styling if it's a new element
    if (!target) {
        container.className = 'scoreboard-container';
    }

    const scores = await loadScores();

    container.innerHTML = ''; // Clear loading message

    const title = document.createElement('h3');
    title.textContent = '🏆 GLOBAL LEADERBOARD';
    title.className = 'scoreboard-title';
    container.appendChild(title);

    const list = document.createElement('div');
    list.className = 'scoreboard-list';

    if (scores.length === 0) {
        const noScores = document.createElement('div');
        noScores.className = 'scoreboard-entry';
        noScores.textContent = 'No scores yet. Be the first!';
        noScores.style.textAlign = 'center';
        noScores.style.opacity = '0.7';
        list.appendChild(noScores);
    } else {
        scores.forEach((scoreData, i) => {
            const entry = document.createElement('div');
            entry.className = 'scoreboard-entry';
            if (i === 0) entry.classList.add('gold');
            if (i === 1) entry.classList.add('silver');
            if (i === 2) entry.classList.add('bronze');

            const rank = document.createElement('div');
            rank.className = 'scoreboard-rank';
            rank.textContent = `${i + 1}.`;

            const info = document.createElement('div');
            info.className = 'scoreboard-info';
            
            const nameScore = document.createElement('div');
            nameScore.className = 'scoreboard-name';
            nameScore.textContent = `${scoreData.name} — ${scoreData.score.toLocaleString()}`;
            info.appendChild(nameScore);

            const date = document.createElement('div');
            date.className = 'scoreboard-date';
            if (scoreData.timestamp) {
              // API returns plain Date objects or ISO strings
              const d = (scoreData.timestamp instanceof Date)
                ? scoreData.timestamp
                : new Date(scoreData.timestamp);
              date.textContent = d.toLocaleDateString();
            }
            
            entry.appendChild(rank);
            entry.appendChild(info);
            entry.appendChild(date);
            list.appendChild(entry);
        });
    }
    container.appendChild(list);
    return container;
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
    // New async functions for global scores
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
    validateScore
  };

})(window);
