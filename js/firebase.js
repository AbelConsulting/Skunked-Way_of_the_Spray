
/*!
 * Skunked: Way of the Spray
 * Copyright (c) 2026 Mephitideus Interactive. All Rights Reserved.
 * Proprietary and confidential — unauthorized copying, distribution, or use
 * of this file, via any medium, is strictly prohibited. See LICENSE for terms.
 */
// js/firebase.js
// Global leaderboard integration via skunked.io REST API (Netlify Functions + S3).
// No external SDK required — pure fetch().

const API_BASE = '/api';

/**
 * Checks if the leaderboard service is reachable.
 * @returns {Promise<boolean>}
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Submits a score to the skunked.io leaderboard.
 * @param {string} name  The player name / gamer tag.
 * @param {number} score The score achieved.
 * @param {string[]} [achievements] Achievement names earned this run.
 * @returns {Promise<void>}
 */
export async function submitScore(name, score, achievements, meta) {
  try {
    const res = await fetch(`${API_BASE}/submit-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initials: name,
        score: score,
        achievements: Array.isArray(achievements) ? achievements : [],
        prestige: (meta && typeof meta.prestige === 'number') ? meta.prestige : 0,
        title: (meta && typeof meta.title === 'string') ? meta.title : '',
        achievementCount: (meta && typeof meta.achievementCount === 'number') ? meta.achievementCount : 0,
        level: (meta && typeof meta.level === 'number') ? meta.level : 0
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Score submission rejected:', res.status, err);
    }
  } catch (e) {
    console.error('Error submitting score:', e);
  }
}

/**
 * Fetches the top scores from the leaderboard, ordered by score descending.
 * @param {number} [count=10] How many top scores to retrieve.
 * @returns {Promise<Array<{name: string, score: number, timestamp?: Date, achievements?: string[]}>>}
 */
export async function getHighScores(count = 10) {
  try {
    const res = await fetch(`${API_BASE}/scores?count=${encodeURIComponent(count)}`);
    if (!res.ok) return [];
    const scores = await res.json();
    if (!Array.isArray(scores)) return [];
    return scores.map(entry => ({
      name: entry.initials || '???',
      score: entry.score,
      timestamp: entry.date ? new Date(entry.date) : null,
      achievements: entry.achievements || [],
      prestige: entry.prestige || 0,
      title: entry.title || '',
      achievementCount: entry.achievementCount || 0,
      level: entry.level || 0,
    }));
  } catch (e) {
    console.error('Error fetching scores:', e);
    return [];
  }
}
