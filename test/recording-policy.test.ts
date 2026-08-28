import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeRecordingConsent,
  normalizeRecordingDeletion,
  recordingConsentCustom,
  recordingConsentFromCustom,
  recordingDeletionCustom,
} from "../lib/webinar/recording-policy.ts";

const now = new Date("2026-08-28T10:00:00Z");

test("normalizes a consent receipt with bounded retention", () => {
  const consent = normalizeRecordingConsent({
    receiptId: "consent-receipt-123",
    tenantId: "milton-production",
    noticeVersion: "recording-v1",
    consentedAt: "2026-08-28T09:55:00Z",
    retentionDays: 30,
  }, { now, maxRetentionDays: 30 });
  assert.equal(consent.consentedAt, "2026-08-28T09:55:00.000Z");

  const custom = {
    tenant_id: consent.tenantId,
    ...recordingConsentCustom(consent, "idempotency-123", "consent-body"),
  };
  assert.equal(recordingConsentFromCustom(custom)?.receiptId, "consent-receipt-123");
});

test("rejects missing consent, future timestamps and excessive retention", () => {
  assert.throws(() => normalizeRecordingConsent({
    receiptId: "consent-receipt-123",
    tenantId: "milton-production",
    noticeVersion: "recording-v1",
    consentedAt: "2026-08-28T10:06:00Z",
    retentionDays: 30,
  }, { now, maxRetentionDays: 30 }), /Einwilligungszeitpunkt/);
  assert.throws(() => normalizeRecordingConsent({
    receiptId: "consent-receipt-123",
    tenantId: "milton-production",
    noticeVersion: "recording-v1",
    consentedAt: "2026-08-28T09:55:00Z",
    retentionDays: 31,
  }, { now, maxRetentionDays: 30 }), /höchstens 30 Tage/);
  assert.equal(recordingConsentFromCustom({ tenant_id: "milton-production" }), null);
});

test("normalizes only explicit recording deletion reasons", () => {
  const deletion = normalizeRecordingDeletion({
    tenantId: "milton-production",
    sessionId: "session-recording-123",
    filename: "recording-123.mp4",
    reason: "retention_expired",
  });
  assert.deepEqual(deletion, {
    tenantId: "milton-production",
    sessionId: "session-recording-123",
    filename: "recording-123.mp4",
    reason: "retention_expired",
  });
  assert.deepEqual(recordingDeletionCustom(
    deletion,
    "delete-recording-123",
    "{\"reason\":\"retention_expired\"}",
    new Date("2026-08-28T10:00:00Z"),
  ), {
    recording_deletion_idempotency_key: "delete-recording-123",
    recording_deletion_payload_hash: "12d7361cf73805d2726beeea636814d7d85801f918f9028a08bb17e5ce3e0a55",
    recording_deleted_session_id: "session-recording-123",
    recording_deleted_filename: "recording-123.mp4",
    recording_deletion_reason: "retention_expired",
    recording_deleted_at: "2026-08-28T10:00:00.000Z",
  });
  assert.throws(() => normalizeRecordingDeletion({
    tenantId: "milton-production",
    sessionId: "session-recording-123",
    filename: "../recording.mp4",
    reason: "retention_expired",
  }), /dateiname/i);
});
