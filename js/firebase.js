
/*!
 * Skunked: Way of the Spray
 * Copyright (c) 2026 Mephitideus Interactive. All Rights Reserved.
 * Proprietary and confidential — unauthorized copying, distribution, or use
 * of this file, via any medium, is strictly prohibited. See LICENSE for terms.
 */
// js/firebase.js
// Global leaderboard integration via the skunked.io Netlify Functions.
// All calls go through /api/* which netlify.toml redirects to the
// corresponding serverless function.

const API_BASE = (typeof Config !== 'undefined' && typeof Config.SCORES_API_BASE === 'string')
  ? Config.SCORES_API_BASE
  : '';

/**
 * Checks if the leaderboard service is online.
 * @returns {Promise<boolean>} true if the service responds with { status: 'ok' }.
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

/**
 * Submits a score to the global leaderboard.
 * The Netlify function expects { score: number, initials: string }.
 * @param {string} name  The player name / gamer tag (truncated to 3 chars by server).
 * @param {number} score The score achieved.
 * @param {string[]} [_achievements] Unused — kept for call-site compat.
 * @returns {Promise<void>}
 */
export async function submitScore(name, score, _achievements) {
  try {
    const res = await fetch(`${API_BASE}/api/submit-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        score: score,
        initials: name,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Score submission failed:', res.status, err);
    }
  } catch (e) {
    console.error('Error submitting score:', e);
  }
}

/**
 * Fetches the top scores from the global leaderboard.
 * The Netlify function returns a raw JSON array:
 *   [{ score, initials, date }, ...]
 * We map it to the shape highscores.js expects.
 * @param {number} [count=10] How many top scores to retrieve (applied client-side).
 * @returns {Promise<Array<{name: string, score: number, timestamp?: Date}>>}
 */
export async function getHighScores(count = 10) {
  try {
    const res = await fetch(`${API_BASE}/api/scores?limit=${count}`);
    if (!res.ok) {
      console.error('Failed to fetch scores:', res.status);
      return [];
    }

    const data = await res.json();
    // The Netlify function returns a raw array of
    //   { score, initials, date }
    const arr = Array.isArray(data) ? data : (data.scores || []);
    return arr.slice(0, count).map(s => ({
      name: s.initials || s.playerName || s.name || '???',
      score: s.score,
      timestamp: s.date ? new Date(s.date) : (s.createdAt ? new Date(s.createdAt) : null),
      achievements: s.achievements || [],
    }));
  } catch (e) {
    console.error('Error fetching scores:', e);
    return [];
  }
}
