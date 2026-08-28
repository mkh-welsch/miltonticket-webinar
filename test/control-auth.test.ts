import assert from "node:assert/strict";
import test from "node:test";
import {
  signMiltonControlRequest,
  verifyMiltonControlRequest,
} from "../lib/webinar/control-auth.ts";

const secret = "dedicated-control-secret-with-at-least-32-characters";
const now = new Date("2026-08-28T10:00:00Z");
const timestamp = String(Math.floor(now.getTime() / 1000));
const body = '{"receiptId":"consent-receipt-123"}';
const path = "/api/webinars/stream-123/recording-consent";
const idempotencyKey = "consent-12345678";

test("accepts an exact, fresh Milton control signature", () => {
  assert.equal(verifyMiltonControlRequest({
    body,
    timestamp,
    signature: signMiltonControlRequest(body, timestamp, secret),
    secret,
    now,
  }), true);
});

test("rejects tampered and stale Milton control requests", () => {
  const signature = signMiltonControlRequest(body, timestamp, secret);
  assert.equal(verifyMiltonControlRequest({
    body: `${body} `,
    timestamp,
    signature,
    secret,
    now,
  }), false);
  assert.equal(verifyMiltonControlRequest({
    body,
    timestamp,
    signature,
    secret,
    now: new Date(now.getTime() + 6 * 60_000),
  }), false);
});

test("binds control signatures to method, route and idempotency key", () => {
  const signature = signMiltonControlRequest(body, timestamp, secret, {
    method: "POST", path, idempotencyKey,
  });
  assert.equal(verifyMiltonControlRequest({ body, timestamp, signature, secret, now, method: "POST", path, idempotencyKey }), true);
  assert.equal(verifyMiltonControlRequest({ body, timestamp, signature, secret, now, method: "POST", path: "/api/webinars/other/recording-consent", idempotencyKey }), false);
  assert.equal(verifyMiltonControlRequest({ body, timestamp, signature, secret, now, method: "POST", path, idempotencyKey: "consent-other-1234" }), false);
});
