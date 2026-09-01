/*!
 * Skunked: Way of the Spray — Firebase Cloud Functions
 * Copyright (c) 2026 Mephitideus Interactive. All Rights Reserved.
 */
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const iap = require("./iap");

admin.initializeApp();
const db = admin.firestore();
const SCORES_COLLECTION = "scores";

// ── Google Play receipt verification ────────────────────────────────────────
// Active when ALL of the following are true:
//   1. The `googleapis` package is installed in functions/.
//   2. A Play package name is known (PLAY_PACKAGE_NAME or the Android app id).
//   3. A service account key is available — ADC or `GOOGLE_PLAY_SA_JSON`.
// STRICT_PURCHASE_VERIFY defaults ON. Set STRICT_PURCHASE_VERIFY=0 only as an
// emergency rollback to the old honor-system grant path.
const PLAY_PACKAGE_NAME = process.env.PLAY_PACKAGE_NAME || "com.skunksquad.skunkfu";
const STRICT_PURCHASE_VERIFY = process.env.STRICT_PURCHASE_VERIFY !== "0";
let _playApi = null;
let _playApiLoaded = false;
async function _getPlayApi() {
  if (_playApiLoaded) return _playApi;
  _playApiLoaded = true;
  if (!PLAY_PACKAGE_NAME) return null;
  let google;
  try {
    ({ google } = require("googleapis"));
  } catch (e) {
    console.warn("[verify] googleapis not installed; skipping receipt verification.");
    return null;
  }
  try {
    let auth;
    if (process.env.GOOGLE_PLAY_SA_JSON) {
      const credentials = JSON.parse(process.env.GOOGLE_PLAY_SA_JSON);
      auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ["https://www.googleapis.com/auth/androidpublisher"],
      });
    } else {
      auth = new google.auth.GoogleAuth({
        scopes: ["https://www.googleapis.com/auth/androidpublisher"],
      });
    }
    _playApi = google.androidpublisher({ version: "v3", auth });
    console.info("[verify] Google Play Developer API ready.");
    return _playApi;
  } catch (e) {
    console.warn("[verify] failed to init Play Developer API:", e && e.message);
    return null;
  }
}

/**
 * Verify a Google Play purchase token against the Play Developer API.
 * Returns { ok: boolean, reason?: string, purchaseState?: number, ackState?: number }.
 *   purchaseState: 0=purchased, 1=cancelled, 2=pending
 *   ackState:      0=yet to ack, 1=acknowledged
 */
async function verifyPlayPurchase(productId, purchaseToken) {
  const api = await _getPlayApi();
  if (!api) return { ok: false, reason: "verifier_unavailable" };
  if (!PLAY_PACKAGE_NAME || !productId || !purchaseToken) {
    return { ok: false, reason: "missing_args" };
  }
  try {
    const resp = await api.purchases.products.get({
      packageName: PLAY_PACKAGE_NAME,
      productId,
      token: purchaseToken,
    });
    const data = resp && resp.data ? resp.data : {};
    if (data.purchaseState !== 0) {
      return { ok: false, reason: "not_purchased", purchaseState: data.purchaseState };
    }
    return {
      ok: true,
      purchaseState: data.purchaseState,
      ackState: data.acknowledgementState,
      orderId: data.orderId,
    };
  } catch (e) {
    const status = e && e.response && e.response.status;
    return { ok: false, reason: "play_api_error", status, message: e && e.message };
  }
}

/**
 * Acknowledge a one-time product so Play does not auto-refund after 3 days.
 * Already-acknowledged tokens are treated as success.
 */
async function acknowledgePlayPurchase(productId, purchaseToken) {
  const api = await _getPlayApi();
  if (!api) return { ok: false, reason: "verifier_unavailable" };
  if (!PLAY_PACKAGE_NAME || !productId || !purchaseToken) {
    return { ok: false, reason: "missing_args" };
  }
  try {
    await api.purchases.products.acknowledge({
      packageName: PLAY_PACKAGE_NAME,
      productId,
      token: purchaseToken,
      requestBody: {},
    });
    return { ok: true };
  } catch (e) {
    const status = e && e.response && e.response.status;
    const message = (e && e.message) || "";
    if (status === 400 || /already acknowledged/i.test(message)) {
      return { ok: true, already: true };
    }
    return { ok: false, reason: "ack_failed", status, message };
  }
}

// ── Rate limiter (in-memory, per-instance) ──────────────────────────────────
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || "10", 10);
const ipCounter = new Map();

// ── IP extraction ────────────────────────────────────────────────────────────
// Cloud Functions v2 sets req.ip from the platform — it cannot be spoofed
// by the client. Fall back to the LAST hop of X-Forwarded-For (rightmost =
// last trusted proxy) only when req.ip is absent, never the leftmost hop
// which is client-supplied and trivially spoofable.
function getClientIp(req) {
  return req.ip ||
    (req.headers["x-forwarded-for"] || "").split(",").pop()?.trim() ||
    "unknown";
}

// ── App Check verification ────────────────────────────────────────────────
// ENFORCE_APP_CHECK=1 → reject requests without a valid App Check token.
// When unset (default), tokens are verified and logged but never rejected
// so the app keeps working before App Check is rolled out to all clients.
const APP_CHECK_ENFORCE = process.env.ENFORCE_APP_CHECK === "1";

async function checkAppCheck(req, res) {
  const token = req.headers["x-firebase-appcheck"];
  if (!token) {
    if (APP_CHECK_ENFORCE) {
      res.status(401).json({ error: "app_check_required" });
      return false;
    }
    return true;
  }
  try {
    await admin.appCheck().verifyToken(token);
    return true;
  } catch (e) {
    console.warn("[appCheck] invalid token:", e && e.message);
    if (APP_CHECK_ENFORCE) {
      res.status(401).json({ error: "app_check_invalid" });
      return false;
    }
    return true;
  }
}

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
  "null",                         // Electron desktop app (file:// pages send Origin: null)
];

function setCors(req, res) {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, X-Firebase-AppCheck");
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
    // week/month use a date range filter + in-memory score sort.
    // alltime uses the (score DESC) index for O(1) top-N.
    const period = ["week", "month"].includes(req.query.period) ? req.query.period : "alltime";
    // Scan ceiling for period queries: proportional to the requested count so
    // the fetch stays bounded even at higher count values.
    const PERIOD_SCAN_LIMIT = Math.min(count * 20, 500);

    let rawDocs;
    if (period === "week" || period === "month") {
      const cutoffMs = Date.now() - (period === "week" ? 7 : 30) * 24 * 60 * 60 * 1000;
      const cutoff = admin.firestore.Timestamp.fromMillis(cutoffMs);
      // Range filter + orderBy on the same field uses the auto single-field index on `date`.
      const snapshot = await db
        .collection(SCORES_COLLECTION)
        .where("date", ">=", cutoff)
        .orderBy("date", "desc")
        .limit(PERIOD_SCAN_LIMIT)
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

  // App Check — rejects non-app callers when ENFORCE_APP_CHECK=1
  if (!(await checkAppCheck(req, res))) return;

  // Rate limit by IP
  const ip = getClientIp(req);

  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: "rate_limited" });
    return;
  }

  const MAX_SCORE = 9_999_999;
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
  const runId =
    typeof body.runId === "string" && /^[A-Za-z0-9_-]{8,80}$/.test(body.runId)
      ? body.runId
      : "";

  if (score === null || score < 0 || score > MAX_SCORE) {
    res.status(400).json({ error: "bad_score" });
    return;
  }

  try {
    const payload = {
      initials,
      score,
      achievements,
      prestige,
      title,
      achievementCount,
      level,
      date: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (runId) payload.runId = runId;

    if (runId) {
      const existing = await db
        .collection(SCORES_COLLECTION)
        .where("runId", "==", runId)
        .limit(1)
        .get();
      if (!existing.empty) {
        res.json({ success: true, duplicate: true });
        return;
      }
    }

    await db.collection(SCORES_COLLECTION).add(payload);
    res.json({ success: true });
  } catch (e) {
    console.error("submitScore error:", e);
    res.status(500).json({ error: "server_error" });
  }
});

// ── Entitlements (cross-device sync) ────────────────────────────────────────
// Stored at /entitlements/{playerId}. Grants require a Google Play
// purchaseToken that verifies + binds uniquely (token hash and orderId).
// Refunds/cancels arrive via playRtdn (Play RTDN / Pub/Sub).
const ENTITLEMENTS_COLLECTION = iap.ENTITLEMENTS_COLLECTION;
const VALID_SKUS = iap.VALID_SKUS;
const SKU_TO_FIELD = iap.SKU_TO_FIELD;

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
  return iap.isValidPlayerId(s);
}

// GET /getEntitlements?playerId=...
exports.getEntitlements = onRequest({ region: "us-central1" }, async (req, res) => {
  if (setCors(req, res)) return;
  // App Check — rejects non-app callers when ENFORCE_APP_CHECK=1
  if (!(await checkAppCheck(req, res))) return;
  // Rate limit by IP
  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: "rate_limited" });
    return;
  }
  try {
    const playerId = (req.query.playerId || "").toString();
    if (!isValidPlayerId(playerId)) {
      res.status(400).json({ error: "bad_player_id" });
      return;
    }
    const doc = await db.collection(ENTITLEMENTS_COLLECTION).doc(playerId).get();
    if (!doc.exists) {
      res.json({ adFree: false, founderPass: false, adFreeRevoked: false, founderPassRevoked: false });
      return;
    }
    const d = doc.data() || {};
    res.json({
      adFree:           d.adFree === true,
      founderPass:      d.founderPass === true,
      adFreeRevoked:    d.adFreeRevoked === true,
      founderPassRevoked: d.founderPassRevoked === true,
      adFreeSince:      d.adFreeSince      ? d.adFreeSince.toDate().toISOString()      : null,
      founderPassSince: d.founderPassSince ? d.founderPassSince.toDate().toISOString() : null,
    });
  } catch (e) {
    console.error("getEntitlements error:", e);
    res.status(500).json({ error: "server_error" });
  }
});

// POST /setEntitlement  body:{ playerId, sku, purchaseToken, productId? }
// Grants require a Play purchaseToken. Tokens and orderIds bind to one
// playerId. Refunds are handled by playRtdn, not this endpoint.
exports.setEntitlement = onRequest({ region: "us-central1", secrets: ["GOOGLE_PLAY_SA_JSON"] }, async (req, res) => {
  if (setCors(req, res)) return;
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }
  if (!(await checkAppCheck(req, res))) return;
  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: "rate_limited" });
    return;
  }

  const body = req.body || {};
  const playerId = (body.playerId || "").toString();
  const sku = (body.sku || "").toString();
  const purchaseToken = (body.purchaseToken || "").toString();
  const productId     = (body.productId || sku || "").toString();
  if (!isValidPlayerId(playerId)) {
    res.status(400).json({ error: "bad_player_id" });
    return;
  }
  if (!VALID_SKUS.has(sku)) {
    res.status(400).json({ error: "bad_sku" });
    return;
  }
  if (!iap.isValidPurchaseToken(purchaseToken)) {
    res.status(400).json({ error: "purchase_token_required" });
    return;
  }
  if (!checkEntitlementRate(playerId)) {
    res.status(429).json({ error: "rate_limited_player" });
    return;
  }

  const verification = await verifyPlayPurchase(productId, purchaseToken);
  if (!verification.ok) {
    console.warn("[setEntitlement] verification failed:", sku, verification);
    if (STRICT_PURCHASE_VERIFY || verification.reason !== "verifier_unavailable") {
      const status = verification.reason === "verifier_unavailable" ? 503 : 403;
      res.status(status).json({ error: "verification_failed", reason: verification.reason });
      return;
    }
  }

  try {
    if (verification.ok) {
      await iap.grantVerifiedPurchase(db, admin.firestore.FieldValue, {
        playerId,
        sku,
        productId,
        purchaseToken,
        orderId: verification.orderId || "",
      });
      if (verification.ackState !== 1) {
        const ack = await acknowledgePlayPurchase(productId, purchaseToken);
        if (!ack.ok) {
          console.warn("[setEntitlement] acknowledge failed:", sku, ack);
        }
      }
    } else {
      // STRICT_PURCHASE_VERIFY=0 emergency path only.
      const { ownedField, sinceField } = SKU_TO_FIELD[sku];
      const ref = db.collection(ENTITLEMENTS_COLLECTION).doc(playerId);
      const snap = await ref.get();
      const update = {
        [ownedField]: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (!snap.exists || snap.data()[ownedField] !== true) {
        update[sinceField] = admin.firestore.FieldValue.serverTimestamp();
      }
      await ref.set(update, { merge: true });
    }
    res.json({
      success: true,
      sku,
      playerId,
      verified: !!verification.ok,
    });
  } catch (e) {
    if (e && e.code === "token_bound_other_player") {
      res.status(409).json({ error: "token_bound_other_player" });
      return;
    }
    if (e && e.code === "order_bound_other_player") {
      res.status(409).json({ error: "order_bound_other_player" });
      return;
    }
    if (e && e.code === "purchase_revoked") {
      res.status(403).json({ error: "purchase_revoked" });
      return;
    }
    console.error("setEntitlement error:", e);
    res.status(500).json({ error: "server_error" });
  }
});

// POST /playRtdn — Google Play Real-Time Developer Notifications (Pub/Sub push).
// Configure Play Console → Monetization setup → Real-time developer notifications
// to a Pub/Sub topic that pushes to this HTTPS function.
exports.playRtdn = onRequest({ region: "us-central1", secrets: ["GOOGLE_PLAY_SA_JSON"] }, async (req, res) => {
  if (req.method === "GET") {
    res.json({ status: "ok", endpoint: "playRtdn" });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const notification = iap.parseRtdnEnvelope(req.body);
  if (!notification) {
    res.status(400).json({ error: "bad_rtdn" });
    return;
  }
  if (notification.packageName && notification.packageName !== PLAY_PACKAGE_NAME) {
    res.status(400).json({ error: "bad_package" });
    return;
  }

  const actions = iap.revokeActionsFromRtdn(notification);
  try {
    const results = [];
    for (const action of actions) {
      const hash = iap.tokenHash(action.purchaseToken);
      const purchaseSnap = await db.collection(iap.PURCHASES_COLLECTION).doc(hash).get();
      const sku = action.sku || (purchaseSnap.exists && purchaseSnap.get("sku")) || "";
      if (sku && iap.VALID_SKUS.has(sku)) {
        const live = await verifyPlayPurchase(sku, action.purchaseToken);
        if (live.ok && live.purchaseState === 0 && action.reason !== "voided") {
          results.push({ reason: action.reason, skipped: "still_purchased" });
          continue;
        }
      }
      const result = await iap.revokePurchaseByToken(
        db,
        admin.firestore.FieldValue,
        action.purchaseToken,
        sku
      );
      results.push({ reason: action.reason, ...result });
    }
    res.json({ success: true, revoked: results.length, results });
  } catch (e) {
    console.error("playRtdn error:", e);
    res.status(500).json({ error: "server_error" });
  }
});
