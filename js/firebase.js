
/*!
 * Skunked: Way of the Spray
 * Copyright (c) 2026 Mephitideus Interactive. All Rights Reserved.
 * Proprietary and confidential — unauthorized copying, distribution, or use
 * of this file, via any medium, is strictly prohibited. See LICENSE for terms.
 */
// js/firebase.js
// Global leaderboard integration via skunked.io REST API (Firebase Cloud Functions + Firestore).
// No external SDK required — pure fetch().

// Direct Firebase Cloud Functions URL.
// skunked.io is hosted on GitHub Pages so Firebase Hosting rewrites are
// unavailable — we call the Cloud Functions directly from any host.
const PROJECT_ID = 'studio-3829586481-2a2cf';
const API_BASE = 'https://us-central1-' + PROJECT_ID + '.cloudfunctions.net';
const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/' + PROJECT_ID + '/databases/(default)/documents';

// ── Network reliability tunables ──
const REQUEST_TIMEOUT_MS = 8000;        // Hard cap so the UI never spins forever.
const RETRY_ATTEMPTS     = 2;           // 1 retry on transient failures (so 2 total tries).
const RETRY_BACKOFF_MS   = 600;         // Initial backoff; doubled per attempt.

/**
 * fetch() wrapper with timeout, retry-with-backoff for transient failures,
 * and AbortController plumbing. Caller-supplied AbortSignal is respected.
 */
async function fetchWithRetry(url, opts = {}, attempts = RETRY_ATTEMPTS) {
  const externalSignal = opts.signal;
  let lastErr = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const ctrl = new AbortController();
    const onAbort = () => ctrl.abort(externalSignal && externalSignal.reason);
    if (externalSignal) {
      if (externalSignal.aborted) { ctrl.abort(externalSignal.reason); }
      else { externalSignal.addEventListener('abort', onAbort, { once: true }); }
    }
    const timer = setTimeout(() => ctrl.abort(new DOMException('Timeout', 'AbortError')), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      // Retry only on 5xx (transient server errors). 4xx is a real client error.
      if (!res.ok && res.status >= 500 && attempt < attempts) {
        lastErr = new Error('HTTP ' + res.status);
      } else {
        return res;
      }
    } catch (e) {
      lastErr = e;
      // Caller cancelled — don't retry.
      if (externalSignal && externalSignal.aborted) throw e;
      if (attempt >= attempts) throw e;
    } finally {
      clearTimeout(timer);
      if (externalSignal) externalSignal.removeEventListener('abort', onAbort);
    }

    // Backoff before next attempt (only reached on transient retryable failure).
    await new Promise(r => setTimeout(r, RETRY_BACKOFF_MS * attempt));
  }
  throw lastErr || new Error('fetchWithRetry: exhausted attempts');
}

/**
 * Checks if the leaderboard service is reachable.
 * @returns {Promise<boolean>}
 */
export async function checkHealth() {
  try {
    const res = await fetchWithRetry(`${API_BASE}/health`, { method: 'GET' }, 1);
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
 * @param {object} [meta] Extra metadata (prestige, title, level, runId for dedupe).
 * @returns {Promise<boolean>}
 */
export async function submitScore(name, score, achievements, meta) {
  try {
    const payload = {
      initials: name,
      score: score,
      achievements: Array.isArray(achievements) ? achievements : [],
      prestige: (meta && typeof meta.prestige === 'number') ? meta.prestige : 0,
      title: (meta && typeof meta.title === 'string') ? meta.title : '',
      achievementCount: (meta && typeof meta.achievementCount === 'number') ? meta.achievementCount : 0,
      level: (meta && typeof meta.level === 'number') ? meta.level : 0
    };
    if (meta && typeof meta.runId === 'string' && meta.runId) {
      payload.runId = meta.runId;
    }
    const res = await fetchWithRetry(`${API_BASE}/submitScore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Score submission rejected:', res.status, err);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error submitting score:', e);
    return false;
  }
}

/**
 * Validates a single leaderboard entry shape returned by the API.
 * Drops malformed rows so a single bad record can't crash the renderer.
 */
function _isValidEntry(e) {
  return e && typeof e === 'object'
    && typeof e.score === 'number'
    && Number.isFinite(e.score)
    && e.score >= 0;
}

function _firestoreValue(value) {
  if (!value || typeof value !== 'object') return undefined;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('booleanValue' in value) return value.booleanValue === true;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) {
    const values = value.arrayValue && Array.isArray(value.arrayValue.values) ? value.arrayValue.values : [];
    return values.map(_firestoreValue).filter(item => item !== undefined);
  }
  return undefined;
}

function _mapFirestoreScore(doc) {
  const fields = doc && doc.fields;
  if (!fields || typeof fields !== 'object') return null;
  return {
    name: _firestoreValue(fields.initials) || _firestoreValue(fields.name) || '???',
    score: _firestoreValue(fields.score),
    timestamp: _firestoreValue(fields.date) || _firestoreValue(fields.timestamp) || null,
    achievements: _firestoreValue(fields.achievements) || [],
    prestige: _firestoreValue(fields.prestige) || 0,
    title: _firestoreValue(fields.title) || '',
    achievementCount: _firestoreValue(fields.achievementCount) || 0,
    level: _firestoreValue(fields.level) || 0,
  };
}

function _normalizeScores(scores) {
  return scores
    .filter(_isValidEntry)
    .map(entry => ({
      name: entry.name || entry.initials || '???',
      score: entry.score,
      timestamp: entry.timestamp ? new Date(entry.timestamp) : (entry.date ? new Date(entry.date) : null),
      achievements: Array.isArray(entry.achievements) ? entry.achievements : [],
      prestige: Number(entry.prestige) || 0,
      title: entry.title || '',
      achievementCount: Number(entry.achievementCount) || 0,
      level: Number(entry.level) || 0,
    }));
}

async function getHighScoresFromFirestore(count = 10, period = 'alltime') {
  const safeCount = Math.max(1, Math.min(100, Number(count) || 10));
  const safePeriod = ['week', 'month'].includes(period) ? period : 'alltime';
  if (safePeriod === 'week' || safePeriod === 'month') {
    const cutoff = new Date(Date.now() - (safePeriod === 'week' ? 7 : 30) * 24 * 60 * 60 * 1000).toISOString();
    const res = await fetchWithRetry(FIRESTORE_BASE + ':runQuery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'scores' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'date' },
              op: 'GREATER_THAN_OR_EQUAL',
              value: { timestampValue: cutoff },
            },
          },
          orderBy: [{ field: { fieldPath: 'date' }, direction: 'DESCENDING' }],
          limit: 500,
        },
      }),
    }, 1);
    if (!res.ok) throw new Error('Firestore leaderboard fallback HTTP ' + res.status);
    const data = await res.json().catch(() => null);
    const docs = Array.isArray(data) ? data.map(row => row && row.document).filter(Boolean) : [];
    const scores = _normalizeScores(docs.map(_mapFirestoreScore).filter(Boolean));
    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, safeCount);
  }

  const url = FIRESTORE_BASE + '/scores?pageSize=' + encodeURIComponent(safeCount) + '&orderBy=' + encodeURIComponent('score desc');
  const res = await fetchWithRetry(url, { method: 'GET' }, 1);
  if (!res.ok) throw new Error('Firestore leaderboard fallback HTTP ' + res.status);
  const data = await res.json().catch(() => null);
  const docs = data && Array.isArray(data.documents) ? data.documents : [];
  const scores = _normalizeScores(docs.map(_mapFirestoreScore).filter(Boolean));
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, safeCount);
}

/**
 * Fetches the top scores from the leaderboard, ordered by score descending.
 * @param {number} [count=10] How many top scores to retrieve.
 * @param {string} [period='alltime'] Time window: 'week', 'month', or 'alltime'.
 * @returns {Promise<Array<{name: string, score: number, timestamp?: Date, achievements?: string[]}>>}
 */
export async function getHighScores(count = 10, period = 'alltime') {
  try {
    const safeCount = Math.max(1, Math.min(100, Number(count) || 10));
    const safePeriod = ['week', 'month'].includes(period) ? period : 'alltime';
    const res = await fetchWithRetry(`${API_BASE}/getLeaderboard?count=${encodeURIComponent(safeCount)}&period=${encodeURIComponent(safePeriod)}`);
    if (!res.ok) return getHighScoresFromFirestore(safeCount, safePeriod);
    const scores = await res.json().catch(() => null);
    if (!Array.isArray(scores)) return getHighScoresFromFirestore(safeCount, safePeriod);
    return _normalizeScores(scores);
  } catch (e) {
    console.error('Error fetching scores:', e);
    try {
      return await getHighScoresFromFirestore(count, period);
    } catch (fallbackError) {
      console.error('Error fetching scores from Firestore fallback:', fallbackError);
      return [];
    }
  }
}

// ── Cross-device entitlements (Play Games player ID -> IAP ownership) ──
//
// These call the getEntitlements / setEntitlement Cloud Functions which
// front a /entitlements/{playerId} Firestore collection. The collection
// itself is locked down (rules deny direct client access).
//
// Identity: the caller passes the Google Play Games player ID from
// PlayGamesServices.signIn(). On the web build, these calls are inert
// because no playerId is available.

/**
 * Fetch the entitlement document for a Play Games player.
 * @param {string} playerId
 * @returns {Promise<{adFree:boolean, founderPass:boolean, adFreeSince:string|null, founderPassSince:string|null} | null>}
 *   Resolves null on network error so callers can keep using local state.
 */
export async function getEntitlements(playerId) {
  if (!playerId || typeof playerId !== 'string') return null;
  try {
    const res = await fetchWithRetry(
      `${API_BASE}/getEntitlements?playerId=${encodeURIComponent(playerId)}`,
      { method: 'GET' }
    );
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data || typeof data !== 'object') return null;
    return {
      adFree:           data.adFree === true,
      founderPass:      data.founderPass === true,
      adFreeSince:      typeof data.adFreeSince === 'string'      ? data.adFreeSince      : null,
      founderPassSince: typeof data.founderPassSince === 'string' ? data.founderPassSince : null,
    };
  } catch (e) {
    console.warn('[Entitlements] fetch failed', e);
    return null;
  }
}

/**
 * Push a single entitlement (`remove_ads` or `founder_pass`) to the server
 * for the given player. Idempotent — safe to call repeatedly.
 * @param {string} playerId
 * @param {'remove_ads'|'founder_pass'} sku
 * @param {{purchaseToken?: string, productId?: string}} [opts]
 *   Optional Google Play purchase token + product ID to enable server-side
 *   receipt verification when the Functions backend has a Play Developer
 *   service account configured. Safe to omit on the web build / web fallback.
 * @returns {Promise<boolean>} true on success
 */
export async function setEntitlement(playerId, sku, opts) {
  if (!playerId || typeof playerId !== 'string') return false;
  if (sku !== 'remove_ads' && sku !== 'founder_pass') return false;
  const body = { playerId, sku };
  if (opts && typeof opts === 'object') {
    if (opts.purchaseToken && typeof opts.purchaseToken === 'string') body.purchaseToken = opts.purchaseToken;
    if (opts.productId     && typeof opts.productId     === 'string') body.productId     = opts.productId;
  }
  try {
    const res = await fetchWithRetry(`${API_BASE}/setEntitlement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch (e) {
    console.warn('[Entitlements] push failed', e);
    return false;
  }
}
