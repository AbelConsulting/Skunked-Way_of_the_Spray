const test = require("node:test");
const assert = require("node:assert/strict");
const {
  tokenHash,
  skuFromProductId,
  isValidPlayerId,
  isValidPurchaseToken,
  parseRtdnEnvelope,
  revokeActionsFromRtdn,
} = require("./iap");

test("tokenHash is stable sha256 hex", () => {
  const a = tokenHash("abc.purchase-token-value");
  const b = tokenHash("abc.purchase-token-value");
  assert.equal(a, b);
  assert.equal(a.length, 64);
  assert.notEqual(a, tokenHash("other-token-value-xx"));
});

test("skuFromProductId only allows known SKUs", () => {
  assert.equal(skuFromProductId("remove_ads"), "remove_ads");
  assert.equal(skuFromProductId("founder_pass"), "founder_pass");
  assert.equal(skuFromProductId("hack_sku"), "");
});

test("playerId and purchaseToken guards", () => {
  assert.equal(isValidPlayerId("gamer_abc12345"), true);
  assert.equal(isValidPlayerId("short"), false);
  assert.equal(isValidPurchaseToken("GPA.1234-5678-9012"), false);
  assert.equal(isValidPurchaseToken("short"), false);
  assert.equal(isValidPurchaseToken("a".repeat(24)), true);
});

test("parseRtdnEnvelope decodes Pub/Sub data", () => {
  const inner = {
    version: "1.0",
    packageName: "com.skunksquad.skunkfu",
    oneTimeProductNotification: {
      notificationType: 2,
      purchaseToken: "tok-abcdefghijklmnopqrstuvwxyz",
      sku: "remove_ads",
    },
  };
  const envelope = {
    message: { data: Buffer.from(JSON.stringify(inner), "utf8").toString("base64") },
  };
  assert.deepEqual(parseRtdnEnvelope(envelope), inner);
  assert.deepEqual(parseRtdnEnvelope(inner), inner);
  assert.equal(parseRtdnEnvelope({ foo: 1 }), null);
});

function makeFakeDb() {
  const store = new Map();
  const FieldValue = { serverTimestamp: () => ({ _ts: true }) };
  function makeRef(col, id) {
    const key = col + "/" + id;
    return {
      _key: key,
      async get() {
        const data = store.get(key);
        return {
          exists: data != null,
          data: () => (data ? { ...data } : undefined),
          get: (field) => (data ? data[field] : undefined),
        };
      },
    };
  }
  const db = {
    collection(name) {
      return { doc: (id) => makeRef(name, id) };
    },
    async runTransaction(fn) {
      const tx = {
        get: (ref) => ref.get(),
        set(ref, data, opts) {
          const prev = store.get(ref._key) || {};
          store.set(ref._key, opts && opts.merge ? { ...prev, ...data } : { ...data });
        },
      };
      return fn(tx);
    },
  };
  return { db, FieldValue, store };
}

test("grantVerifiedPurchase binds token and order to one player", async () => {
  const { grantVerifiedPurchase } = require("./iap");
  const { db, FieldValue, store } = makeFakeDb();
  const token = "a".repeat(24);
  await grantVerifiedPurchase(db, FieldValue, {
    playerId: "player_one_aaaa",
    sku: "remove_ads",
    productId: "remove_ads",
    purchaseToken: token,
    orderId: "GPA.1234-5678",
  });
  const hash = tokenHash(token);
  assert.equal(store.get("purchases/" + hash).playerId, "player_one_aaaa");
  assert.equal(store.get("entitlements/player_one_aaaa").adFree, true);
  assert.equal(store.get("purchaseOrders/GPA.1234-5678").playerId, "player_one_aaaa");

  await assert.rejects(
    () => grantVerifiedPurchase(db, FieldValue, {
      playerId: "player_two_bbbb",
      sku: "remove_ads",
      productId: "remove_ads",
      purchaseToken: token,
      orderId: "GPA.9999-0000",
    }),
    (err) => err.code === "token_bound_other_player"
  );
});

test("revokePurchaseByToken clears matching entitlement", async () => {
  const { grantVerifiedPurchase, revokePurchaseByToken } = require("./iap");
  const { db, FieldValue, store } = makeFakeDb();
  const token = "b".repeat(24);
  await grantVerifiedPurchase(db, FieldValue, {
    playerId: "player_one_aaaa",
    sku: "remove_ads",
    productId: "remove_ads",
    purchaseToken: token,
    orderId: "GPA.2222-3333",
  });
  const result = await revokePurchaseByToken(db, FieldValue, token, "remove_ads");
  assert.equal(result.ok, true);
  assert.equal(store.get("entitlements/player_one_aaaa").adFree, false);
  assert.equal(store.get("entitlements/player_one_aaaa").adFreeRevoked, true);
  assert.equal(store.get("purchases/" + tokenHash(token)).revoked, true);
});

test("revokeActionsFromRtdn handles cancel and void", () => {
  const canceled = revokeActionsFromRtdn({
    packageName: "com.skunksquad.skunkfu",
    oneTimeProductNotification: {
      notificationType: 2,
      purchaseToken: "tok-abcdefghijklmnopqrstuvwxyz",
      sku: "remove_ads",
    },
  });
  assert.equal(canceled.length, 1);
  assert.equal(canceled[0].reason, "canceled");
  assert.equal(canceled[0].sku, "remove_ads");

  const purchased = revokeActionsFromRtdn({
    oneTimeProductNotification: {
      notificationType: 1,
      purchaseToken: "tok-abcdefghijklmnopqrstuvwxyz",
      sku: "remove_ads",
    },
  });
  assert.equal(purchased.length, 0);

  const voided = revokeActionsFromRtdn({
    packageName: "com.skunksquad.skunkfu",
    voidedPurchaseNotification: {
      purchaseToken: "tok-abcdefghijklmnopqrstuvwxyz",
      productType: 1,
    },
  });
  assert.equal(voided.length, 1);
  assert.equal(voided[0].reason, "voided");
});
