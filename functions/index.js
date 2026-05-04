/*!
 * Skunked: Way of the Spray — Firebase Cloud Functions
 * Copyright (c) 2026 Mephitideus Interactive. All Rights Reserved.
 */
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();
const SCORES_COLLECTION = "scores";

// ── Rate limiter (in-memory, per-instance) ──────────────────────────────────
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || "10", 10);
const ipCounter = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = ipCounter.get(ip) || { count: 0, firstTs: now };
  if (now - entry.firstTs > RATE_LIMIT_WINDOW) {
    entry.count = 0;
    entry.firstTs = now;
  }
  entry.count += 1;
  ipCounter.set(ip, entry);
  return entry.count <= RATE_LIMIT_MAX;
}

// ── CORS helper ─────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  "https://skunked.io",
  "https://www.skunked.io",
  "http://localhost:5000",       // Firebase emulator
  "http://localhost:8000",       // Python dev server
  "https://localhost",            // Capacitor Android WebView
  "capacitor://localhost",        // Capacitor iOS WebView
];

function setCors(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
}

// ── /api/health ─────────────────────────────────────────────────────────────
exports.health = onRequest({ region: "us-central1" }, (req, res) => {
  if (setCors(req, res)) return;
  res.json({ status: "ok", hosting: "firebase" });
});

// ── /api/scores ─────────────────────────────────────────────────────────────
exports.getLeaderboard = onRequest({ region: "us-central1" }, async (req, res) => {
  if (setCors(req, res)) return;
  try {
    const count = Math.min(parseInt(req.query.count || "10", 10), 100);
    // period: "week" | "month" | "alltime" (default).
    // week/month use a date range filter + in-memory score sort (no composite index needed).
    // alltime uses the existing (score DESC) index for O(1) top-N.
    const period = ["week", "month"].includes(req.query.period) ? req.query.period : "alltime";

    let rawDocs;
    if (period === "week" || period === "month") {
      const cutoffMs = Date.now() - (period === "week" ? 7 : 30) * 24 * 60 * 60 * 1000;
      const cutoff = admin.firestore.Timestamp.fromMillis(cutoffMs);
      // Range filter + orderBy on the same field uses the auto single-field index on `date`.
      const snapshot = await db
        .collection(SCORES_COLLECTION)
        .where("date", ">=", cutoff)
        .orderBy("date", "desc")
        .limit(500)
        .get();
      rawDocs = snapshot.docs;
    } else {
      const snapshot = await db
        .collection(SCORES_COLLECTION)
        .orderBy("score", "desc")
        .limit(count)
        .get();
      rawDocs = snapshot.docs;
    }

    let scores = rawDocs.map((doc) => {
      const d = doc.data();
      return {
        name: d.initials || "???",
        score: d.score,
        timestamp: d.date ? d.date.toDate().toISOString() : null,
        achievements: Array.isArray(d.achievements) ? d.achievements : [],
        prestige: typeof d.prestige === "number" ? d.prestige : 0,
        title: typeof d.title === "string" ? d.title : "",
        achievementCount: typeof d.achievementCount === "number" ? d.achievementCount : 0,
        level: typeof d.level === "number" ? d.level : 0,
      };
    });

    if (period === "week" || period === "month") {
      scores.sort((a, b) => b.score - a.score);
      scores = scores.slice(0, count);
    }

    res.json(scores);
  } catch (e) {
    console.error("getLeaderboard error:", e);
    res.status(500).json({ error: "server_error" });
  }
});

// ── /api/submit-score ───────────────────────────────────────────────────────
exports.submitScore = onRequest({ region: "us-central1" }, async (req, res) => {
  if (setCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  // Rate limit by IP
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.ip ||
    "unknown";

  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: "rate_limited" });
    return;
  }

  const body = req.body || {};
  const score =
    typeof body.score === "number" ? Math.floor(body.score) : null;
  const initials =
    typeof body.initials === "string"
      ? body.initials.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3)
      : "---";
  const achievements = Array.isArray(body.achievements)
    ? body.achievements
        .filter((a) => typeof a === "string")
        .map((a) => a.slice(0, 64))
        .slice(0, 100)
    : [];
  const prestige =
    typeof body.prestige === "number" && body.prestige >= 0
      ? Math.min(Math.floor(body.prestige), 9999)
      : 0;
  const title =
    typeof body.title === "string" ? body.title.slice(0, 64) : "";
  const achievementCount =
    typeof body.achievementCount === "number" && body.achievementCount >= 0
      ? Math.min(Math.floor(body.achievementCount), 9999)
      : 0;
  const level =
    typeof body.level === "number" && body.level >= 0
      ? Math.min(Math.floor(body.level), 9999)
      : 0;

  if (score === null || score < 0) {
    res.status(400).json({ error: "bad_score" });
    return;
  }

  try {
    await db.collection(SCORES_COLLECTION).add({
      initials,
      score,
      achievements,
      prestige,
      title,
      achievementCount,
      level,
      date: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (e) {
    console.error("submitScore error:", e);
    res.status(500).json({ error: "server_error" });
  }
});

// ── Entitlements (cross-device sync) ────────────────────────────────────────
// Stored at /entitlements/{playerId} where playerId is the Google Play Games
// player ID returned by PlayGamesServices.signIn().
//
// Document shape:
//   {
//     adFree:       bool,
//     founderPass:  bool,
//     adFreeSince:       Timestamp (server),
//     founderPassSince:  Timestamp (server),
//     updatedAt:    Timestamp (server)
//   }
//
// Verification model (pragmatic): the writer is trusted; rate-limited per IP
// and per playerId. SKUs are whitelisted. The playerId itself is an opaque
// 21-char Google Play Games identifier — guessing another player's ID is
// non-trivial. Upgrade path: replace the trust model with server-side Google
// Play Developer API receipt verification.
const ENTITLEMENTS_COLLECTION = "entitlements";
const VALID_SKUS = new Set(["remove_ads", "founder_pass"]);
const SKU_TO_FIELD = {
  remove_ads:   { ownedField: "adFree",      sinceField: "adFreeSince" },
  founder_pass: { ownedField: "founderPass", sinceField: "founderPassSince" },
};

// Per-playerId rate limit (shorter window than the score endpoint — entitlements
// are written rarely, so anything more than a handful per hour is suspicious).
const ENTITLEMENT_RATE_WINDOW = 60 * 60 * 1000; // 1 hour
const ENTITLEMENT_RATE_MAX    = 12;
const playerCounter = new Map();

function checkEntitlementRate(playerId) {
  const now = Date.now();
  const entry = playerCounter.get(playerId) || { count: 0, firstTs: now };
  if (now - entry.firstTs > ENTITLEMENT_RATE_WINDOW) {
    entry.count = 0;
    entry.firstTs = now;
  }
  entry.count += 1;
  playerCounter.set(playerId, entry);
  return entry.count <= ENTITLEMENT_RATE_MAX;
}

function isValidPlayerId(s) {
  // Google Play Games IDs are alphanumeric (sometimes with underscores), 16-32
  // chars in practice. Be liberal but bounded.
  return typeof s === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(s);
}

// GET /getEntitlements?playerId=...
exports.getEntitlements = onRequest({ region: "us-central1" }, async (req, res) => {
  if (setCors(req, res)) return;
  try {
    const playerId = (req.query.playerId || "").toString();
    if (!isValidPlayerId(playerId)) {
      res.status(400).json({ error: "bad_player_id" });
      return;
    }
    const doc = await db.collection(ENTITLEMENTS_COLLECTION).doc(playerId).get();
    if (!doc.exists) {
      res.json({ adFree: false, founderPass: false });
      return;
    }
    const d = doc.data() || {};
    res.json({
      adFree:           d.adFree === true,
      founderPass:      d.founderPass === true,
      adFreeSince:      d.adFreeSince      ? d.adFreeSince.toDate().toISOString()      : null,
      founderPassSince: d.founderPassSince ? d.founderPassSince.toDate().toISOString() : null,
    });
  } catch (e) {
    console.error("getEntitlements error:", e);
    res.status(500).json({ error: "server_error" });
  }
});

// POST /setEntitlement  body:{ playerId, sku }
// Always sets the entitlement to TRUE. Revocation is intentionally not
// supported via this endpoint (refunds should be handled out-of-band).
exports.setEntitlement = onRequest({ region: "us-central1" }, async (req, res) => {
  if (setCors(req, res)) return;
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  // IP rate-limit (re-uses score limiter)
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || "unknown";
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: "rate_limited" });
    return;
  }

  const body = req.body || {};
  const playerId = (body.playerId || "").toString();
  const sku = (body.sku || "").toString();
  if (!isValidPlayerId(playerId)) {
    res.status(400).json({ error: "bad_player_id" });
    return;
  }
  if (!VALID_SKUS.has(sku)) {
    res.status(400).json({ error: "bad_sku" });
    return;
  }
  if (!checkEntitlementRate(playerId)) {
    res.status(429).json({ error: "rate_limited_player" });
    return;
  }

  const { ownedField, sinceField } = SKU_TO_FIELD[sku];
  try {
    const ref = db.collection(ENTITLEMENTS_COLLECTION).doc(playerId);
    const snap = await ref.get();
    const update = {
      [ownedField]: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    // Only stamp sinceField on first grant so we preserve the original date
    // even if the client re-pushes.
    if (!snap.exists || snap.data()[ownedField] !== true) {
      update[sinceField] = admin.firestore.FieldValue.serverTimestamp();
    }
    await ref.set(update, { merge: true });
    res.json({ success: true, sku, playerId });
  } catch (e) {
    console.error("setEntitlement error:", e);
    res.status(500).json({ error: "server_error" });
  }
});
