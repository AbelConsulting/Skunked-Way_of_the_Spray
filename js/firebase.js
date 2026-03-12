
/*!
 * Skunked: Way of the Spray
 * Copyright (c) 2026 Mephitideus Interactive. All Rights Reserved.
 * Proprietary and confidential — unauthorized copying, distribution, or use
 * of this file, via any medium, is strictly prohibited. See LICENSE for terms.
 */
// js/firebase.js
// Global leaderboard integration via the skunked.io REST API.
// Replaces direct Firebase access with API calls to the centralised
// skunkedscores service so every game instance shares one leaderboard.

const API_BASE = (typeof Config !== 'undefined' && typeof Config.SCORES_API_BASE === 'string')
  ? Config.SCORES_API_BASE
  : '';

const API_KEY = (typeof Config !== 'undefined' && Config.SCORES_API_KEY)
  ? Config.SCORES_API_KEY
  : '';

function authHeaders() {
  const headers = {};
  if (API_KEY) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
  }
  return headers;
}

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
 * Submits a score to the skunked.io global leaderboard.
 * @param {string} name  The player name / gamer tag.
 * @param {number} score The score achieved.
 * @param {string[]} [achievements] Optional unlocked achievement names.
 * @returns {Promise<void>}
 */
export async function submitScore(name, score, achievements) {
  try {
    const body = {
      playerName: name,
      score: score,
    };
    if (achievements && achievements.length > 0) {
      body.achievements = achievements;
    }

    const res = await fetch(`${API_BASE}/api/submit-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
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
 * Fetches the top scores from the skunked.io global leaderboard.
 * @param {number} [count=10] How many top scores to retrieve.
 * @returns {Promise<Array<{name: string, score: number, timestamp?: object}>>}
 *   Returns objects whose shape matches what highscores.js expects
 *   (name, score, optional timestamp).
 */
export async function getHighScores(count = 10) {
  try {
    const res = await fetch(`${API_BASE}/api/scores?limit=${count}`, {
      headers: authHeaders(),
    });
    if (!res.ok) {
      console.error('Failed to fetch scores:', res.status);
      return [];
    }

    const data = await res.json();
    // The API returns { scores: [...] } with objects shaped as:
    //   { id, playerName, score, achievements?, createdAt? }
    // Map to the shape highscores.js expects.
    return (data.scores || data || []).map(s => ({
      name: s.playerName || s.name,
      score: s.score,
      timestamp: s.createdAt ? new Date(s.createdAt) : null,
      achievements: s.achievements || [],
    }));
  } catch (e) {
    console.error('Error fetching scores:', e);
    return [];
  }
}
