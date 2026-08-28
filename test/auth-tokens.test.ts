import assert from "node:assert/strict";
import test from "node:test";
import {
  createSignedWebinarToken,
  verifySignedWebinarToken,
  type WebinarIdentity,
} from "../lib/auth/tokens.ts";

const secret = "webinar-test-secret-with-more-than-32-characters";
const now = new Date("2026-08-28T12:00:00.000Z");
const identity: WebinarIdentity = {
  sub: "crm-user-42",
  email: "host@example.com",
  name: "Milton Host",
  role: "host",
  tenantId: "milton-demo",
  callIds: [],
};

test("signed webinar tokens round-trip without exposing a reusable password", () => {
  const token = createSignedWebinarToken(identity, {
    secret,
    audience: "webinar",
    issuer: "milton",
    ttlSeconds: 600,
    now,
  });
  assert.deepEqual(verifySignedWebinarToken(token, {
    secret,
    audience: "webinar",
    issuer: "milton",
    now: new Date("2026-08-28T12:05:00.000Z"),
  }), identity);
  assert.equal(token.includes(secret), false);
});

test("tampered, expired and cross-audience webinar tokens fail closed", () => {
  const token = createSignedWebinarToken({ ...identity, role: "attendee", callIds: ["webinar_123"] }, {
    secret,
    audience: "webinar",
    issuer: "milton",
    ttlSeconds: 60,
    now,
  });
  const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
  assert.throws(() => verifySignedWebinarToken(tampered, {
    secret,
    audience: "webinar",
    issuer: "milton",
    now,
  }));
  assert.throws(() => verifySignedWebinarToken(token, {
    secret,
    audience: "other-app",
    issuer: "milton",
    now,
  }));
  assert.throws(() => verifySignedWebinarToken(token, {
    secret,
    audience: "webinar",
    issuer: "milton",
    now: new Date("2026-08-28T12:02:00.000Z"),
  }));
});

test("attendee access is bounded to validated call ids", () => {
  assert.throws(() => createSignedWebinarToken({ ...identity, callIds: ["https://evil.example"] }, {
    secret,
    audience: "webinar",
    issuer: "milton",
    now,
  }));
  assert.throws(() => createSignedWebinarToken({ ...identity, tenantId: "INVALID TENANT" }, {
    secret,
    audience: "webinar",
    issuer: "milton",
    now,
  }));
});
