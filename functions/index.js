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
    const snapshot = await db
      .collection(SCORES_COLLECTION)
      .orderBy("score", "desc")
      .limit(count)
      .get();
    const scores = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        name: d.initials || "???",
        score: d.score,
        timestamp: d.date ? d.date.toDate().toISOString() : null,
      };
    });
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

  if (score === null || score < 0) {
    res.status(400).json({ error: "bad_score" });
    return;
  }

  try {
    await db.collection(SCORES_COLLECTION).add({
      initials,
      score,
      date: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (e) {
    console.error("submitScore error:", e);
    res.status(500).json({ error: "server_error" });
  }
});
