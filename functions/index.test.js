const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const iap = require("./iap");

function backend({ ackStatus, confirmedAcknowledged = false, purchaseState = 0 } = {}) {
  const docs = new Map();
  const calls = { verify: [], acknowledge: 0 };
  const db = {
    collection: (name) => ({
      doc: (id) => ({
        key: `${name}/${id}`,
        async get() { return snapshot(this); },
      }),
    }),
    async runTransaction(fn) {
      const writes = [];
      await fn({
        get: async (ref) => snapshot(ref),
        set: (ref, data) => writes.push([ref.key, data]),
      });
      for (const [key, data] of writes) docs.set(key, { ...docs.get(key), ...data });
    },
  };
  function snapshot(ref) {
    return {
      exists: docs.has(ref.key),
      data: () => docs.get(ref.key),
      get: (field) => docs.get(ref.key)?.[field],
    };
  }
  const admin = {
    initializeApp() {},
    firestore: Object.assign(() => db, { FieldValue: { serverTimestamp: () => 123 } }),
  };
  const google = {
    auth: { GoogleAuth: class {} },
    androidpublisher: () => ({
      purchases: { products: {
        async get(options) {
          calls.verify.push(options);
          return { data: {
            purchaseState,
            acknowledgementState: confirmedAcknowledged && calls.acknowledge > 0 ? 1 : 0,
            orderId: "GPA.synthetic-review",
          } };
        },
        async acknowledge() {
          calls.acknowledge++;
          if (ackStatus) {
            const error = new Error("Synthetic Play API failure");
            error.response = { status: ackStatus };
            throw error;
          }
        },
      } },
    }),
  };
  const context = {
    exports: {},
    process: { env: {} },
    console: { warn() {}, info() {}, error() {} },
    require(name) {
      if (name === "firebase-functions/v2/https") return { onRequest: (_options, fn) => fn };
      if (name === "firebase-admin") return admin;
      if (name === "./iap") return iap;
      if (name === "googleapis") return { google };
      throw new Error(`Unexpected module: ${name}`);
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "index.js"), "utf8"), context);
  return {
    docs, calls,
    async notify(notification) {
      const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; },
      };
      await context.exports.playRtdn({
        method: "POST",
        body: { packageName: "com.skunksquad.skunkfu", ...notification },
      }, res);
      return res;
    },
    async grant(overrides = {}) {
      const res = {
        statusCode: 200,
        set() {},
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; },
      };
      await context.exports.setEntitlement({
        method: "POST", headers: {}, ip: "127.0.0.1",
        body: {
          playerId: "player_review_1234", sku: "skins", productId: "skins",
          purchaseToken: "synthetic-review-token-12345", ...overrides,
        },
      }, res);
      return res;
    },
  };
}

test("reject a product/SKU mismatch before calling Play or granting ownership", async () => {
  const b = backend();
  const res = await b.grant({ productId: "founder_pass" });
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, "product_sku_mismatch");
  assert.equal(b.calls.verify.length, 0);
  assert.equal(b.docs.size, 0);
});

for (const sku of ["skins", "remove_ads", "founder_pass"]) {
  test(`verified ${sku} grants only its matching entitlement and acknowledges`, async () => {
    const b = backend();
    const res = await b.grant({ sku, productId: sku });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.equal(b.calls.verify[0].productId, sku);
    assert.equal(b.calls.acknowledge, 1);
    const data = b.docs.get("entitlements/player_review_1234");
    assert.equal(data[sku === "founder_pass" ? "founderPass" : "adFree"], true);
    assert.equal(data[sku === "founder_pass" ? "adFree" : "founderPass"], undefined);
  });
}

for (const ackStatus of [400, 503]) {
  test(`acknowledgement HTTP ${ackStatus} keeps the request retryable`, async () => {
    const b = backend({ ackStatus });
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await b.grant();
      assert.equal(res.statusCode, 503);
      assert.equal(res.body.error, "acknowledgement_failed");
    }
    assert.equal(b.calls.acknowledge, 2, "retry acknowledgement even after ownership was granted");
    assert.equal(b.docs.get("entitlements/player_review_1234").adFree, true);
  });
}

test("concurrent native acknowledgement succeeds only after Play confirms its state", async () => {
  const b = backend({ ackStatus: 400, confirmedAcknowledged: true });
  const res = await b.grant();
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(b.calls.verify.length, 2);
});

for (const purchaseState of [1, 2]) {
  test(`cancelled/pending state ${purchaseState} is never granted or acknowledged`, async () => {
    const b = backend({ purchaseState });
    assert.equal((await b.grant()).statusCode, 403);
    assert.equal(b.docs.size, 0);
    assert.equal(b.calls.acknowledge, 0);
  });
}

test("one-time voided RTDN revokes a verified skin purchase; subscription voids are ignored", async () => {
  const b = backend();
  await b.grant();
  const payload = { purchaseToken: "synthetic-review-token-12345", productType: 1 };
  assert.equal((await b.notify({ voidedPurchaseNotification: payload })).statusCode, 200);
  assert.equal(b.docs.get("entitlements/player_review_1234").adFree, true);
  assert.equal((await b.notify({ voidedPurchaseNotification: { ...payload, productType: 2 } })).statusCode, 200);
  assert.equal(b.docs.get("entitlements/player_review_1234").adFree, false);
  assert.equal(b.docs.get("entitlements/player_review_1234").adFreeRevoked, true);
});
