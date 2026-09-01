/*!
 * Google Play IAP helpers for entitlement grant / revoke.
 * Pure parsing lives here so Node's built-in test runner can cover it.
 */
const crypto = require("crypto");

const VALID_SKUS = new Set(["remove_ads", "founder_pass"]);
const SKU_TO_FIELD = {
  remove_ads: { ownedField: "adFree", sinceField: "adFreeSince" },
  founder_pass: { ownedField: "founderPass", sinceField: "founderPassSince" },
};

const PURCHASES_COLLECTION = "purchases";
const PURCHASE_ORDERS_COLLECTION = "purchaseOrders";
const ENTITLEMENTS_COLLECTION = "entitlements";

/** oneTimeProductNotification.notificationType */
const ONE_TIME_PURCHASED = 1;
const ONE_TIME_CANCELED = 2;

function tokenHash(purchaseToken) {
  return crypto.createHash("sha256").update(String(purchaseToken), "utf8").digest("hex");
}

function skuFromProductId(productId) {
  const id = String(productId || "");
  return VALID_SKUS.has(id) ? id : "";
}

function isValidPlayerId(s) {
  return typeof s === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(s);
}

function isValidPurchaseToken(s) {
  return typeof s === "string" && s.length >= 16 && s.length <= 512 && !/^GPA\./i.test(s);
}

/**
 * Decode a Play RTDN / Pub/Sub push body into a notification object.
 * Accepts: Pub/Sub envelope, already-decoded RTDN JSON, or a test payload.
 */
function parseRtdnEnvelope(body) {
  if (!body || typeof body !== "object") return null;
  if (body.message && typeof body.message.data === "string") {
    try {
      const decoded = Buffer.from(body.message.data, "base64").toString("utf8");
      return JSON.parse(decoded);
    } catch (e) {
      return null;
    }
  }
  if (body.packageName || body.oneTimeProductNotification || body.voidedPurchaseNotification) {
    return body;
  }
  return null;
}

/**
 * Returns revoke actions from an RTDN payload.
 * Each action: { sku, purchaseToken, reason, packageName }
 */
function revokeActionsFromRtdn(notification) {
  if (!notification || typeof notification !== "object") return [];
  const packageName = notification.packageName || "";
  const actions = [];

  const oneTime = notification.oneTimeProductNotification;
  if (oneTime && oneTime.notificationType === ONE_TIME_CANCELED && oneTime.purchaseToken) {
    actions.push({
      sku: skuFromProductId(oneTime.sku) || "",
      purchaseToken: oneTime.purchaseToken,
      reason: "canceled",
      packageName,
    });
  }

  const voided = notification.voidedPurchaseNotification;
  if (voided && voided.purchaseToken) {
    // productType 1 = one-time (Play RTDN). Ignore subscriptions (2) for now.
    if (voided.productType == null || voided.productType === 1) {
      actions.push({
        sku: "",
        purchaseToken: voided.purchaseToken,
        reason: "voided",
        packageName,
      });
    }
  }

  return actions;
}

function grantError(code, message) {
  const err = new Error(message || code);
  err.code = code;
  return err;
}

/**
 * Bind a verified Play purchase to a player and grant the SKU.
 * Enforces: one token → one player; one orderId → one player.
 */
async function grantVerifiedPurchase(db, FieldValue, opts) {
  const { playerId, sku, productId, purchaseToken, orderId } = opts;
  if (!isValidPlayerId(playerId)) throw grantError("bad_player_id");
  if (!VALID_SKUS.has(sku)) throw grantError("bad_sku");
  if (!isValidPurchaseToken(purchaseToken)) throw grantError("bad_purchase_token");

  const { ownedField, sinceField } = SKU_TO_FIELD[sku];
  const hash = tokenHash(purchaseToken);
  const purchaseRef = db.collection(PURCHASES_COLLECTION).doc(hash);
  const playerRef = db.collection(ENTITLEMENTS_COLLECTION).doc(playerId);
  const orderRef = orderId
    ? db.collection(PURCHASE_ORDERS_COLLECTION).doc(String(orderId))
    : null;

  await db.runTransaction(async (tx) => {
    const purchaseSnap = await tx.get(purchaseRef);
    const orderSnap = orderRef ? await tx.get(orderRef) : null;
    const playerSnap = await tx.get(playerRef);

    if (purchaseSnap.exists) {
      const existing = purchaseSnap.data() || {};
      if (existing.playerId && existing.playerId !== playerId) {
        throw grantError("token_bound_other_player");
      }
      if (existing.revoked === true) {
        throw grantError("purchase_revoked");
      }
    }
    if (orderSnap && orderSnap.exists) {
      const existingOrder = orderSnap.data() || {};
      if (existingOrder.playerId && existingOrder.playerId !== playerId) {
        throw grantError("order_bound_other_player");
      }
    }

    const now = FieldValue.serverTimestamp();
    tx.set(
      purchaseRef,
      {
        playerId,
        sku,
        productId: productId || sku,
        orderId: orderId || "",
        revoked: false,
        updatedAt: now,
        createdAt: purchaseSnap.exists ? purchaseSnap.get("createdAt") || now : now,
      },
      { merge: true }
    );
    if (orderRef) {
      tx.set(
        orderRef,
        {
          playerId,
          sku,
          tokenHash: hash,
          orderId: String(orderId),
          updatedAt: now,
        },
        { merge: true }
      );
    }

    const playerData = playerSnap.exists ? playerSnap.data() || {} : {};
    const update = {
      [ownedField]: true,
      [`${ownedField}Verified`]: true,
      [`${ownedField}Revoked`]: false,
      [`${ownedField}TokenHash`]: hash,
      updatedAt: now,
    };
    if (orderId) update[`${ownedField}OrderId`] = String(orderId);
    if (playerData[ownedField] !== true) {
      update[sinceField] = now;
    }
    tx.set(playerRef, update, { merge: true });
  });

  return { tokenHash: hash, ownedField };
}

/**
 * Revoke entitlement for a purchase token (refund / cancel / void).
 * Idempotent if the purchase doc is missing or already revoked.
 */
async function revokePurchaseByToken(db, FieldValue, purchaseToken, skuHint) {
  if (!isValidPurchaseToken(purchaseToken)) return { ok: false, reason: "bad_token" };
  const hash = tokenHash(purchaseToken);
  const purchaseRef = db.collection(PURCHASES_COLLECTION).doc(hash);
  const snap = await purchaseRef.get();
  if (!snap.exists) {
    return { ok: true, reason: "unknown_token", tokenHash: hash };
  }
  const data = snap.data() || {};
  const sku = VALID_SKUS.has(data.sku) ? data.sku : skuFromProductId(skuHint);
  const playerId = data.playerId;
  if (!playerId || !sku) {
    await purchaseRef.set(
      { revoked: true, revokedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
    return { ok: true, reason: "incomplete_purchase_doc", tokenHash: hash };
  }

  const { ownedField } = SKU_TO_FIELD[sku];
  const playerRef = db.collection(ENTITLEMENTS_COLLECTION).doc(playerId);

  await db.runTransaction(async (tx) => {
    const purchaseSnap = await tx.get(purchaseRef);
    const playerSnap = await tx.get(playerRef);
    const now = FieldValue.serverTimestamp();
    tx.set(purchaseRef, { revoked: true, revokedAt: now, updatedAt: now }, { merge: true });
    if (playerSnap.exists) {
      const playerData = playerSnap.data() || {};
      // Only clear this SKU if it is still bound to this token (avoid clobbering
      // a later legitimate repurchase on the same playerId).
      if (!playerData[`${ownedField}TokenHash`] || playerData[`${ownedField}TokenHash`] === hash) {
        tx.set(
          playerRef,
          {
            [ownedField]: false,
            [`${ownedField}Verified`]: false,
            [`${ownedField}Revoked`]: true,
            updatedAt: now,
          },
          { merge: true }
        );
      }
    }
  });

  return { ok: true, playerId, sku, tokenHash: hash };
}

module.exports = {
  VALID_SKUS,
  SKU_TO_FIELD,
  PURCHASES_COLLECTION,
  PURCHASE_ORDERS_COLLECTION,
  ENTITLEMENTS_COLLECTION,
  ONE_TIME_PURCHASED,
  ONE_TIME_CANCELED,
  tokenHash,
  skuFromProductId,
  isValidPlayerId,
  isValidPurchaseToken,
  parseRtdnEnvelope,
  revokeActionsFromRtdn,
  grantVerifiedPurchase,
  revokePurchaseByToken,
};
