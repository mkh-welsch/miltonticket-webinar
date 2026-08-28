import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
import { normalizeStreamEvent, signMiltonEvent } from "../lib/webinar/events.ts";

test("normalizes an attendee join without forwarding personal profile data", () => {
  const result = normalizeStreamEvent({
    type: "call.session_participant_joined",
    call_cid: "livestream:webinar_123",
    created_at: "2026-08-28T10:15:00Z",
    session_id: "session-1",
    participant: {
      user: {
        id: "registration-42",
        name: "Must not be forwarded",
        email: "must-not-be-forwarded@example.com",
      },
    },
  }, "webhook-1");

  assert.deepEqual(result, {
    version: 1,
    provider: "stream-video",
    eventId: "webhook-1",
    type: "call.session_participant_joined",
    occurredAt: "2026-08-28T10:15:00Z",
    callId: "webinar_123",
    sessionId: "session-1",
    participantId: "registration-42",
    recordingUrl: null,
    recordingFilename: null,
    recordingSessionId: null,
    recordingType: null,
  });
});

test("normalizes recording deletion identifiers without profile data", () => {
  assert.deepEqual(normalizeStreamEvent({
    type: "call.recording_ready",
    call_cid: "livestream:webinar_123",
    created_at: "2026-08-28T10:45:00Z",
    recording_type: "composite",
    call_recording: {
      url: "https://recordings.example/recording.mp4",
      filename: "recording.mp4",
      session_id: "session-1",
      recording_type: "composite",
    },
  }, "webhook-recording-1"), {
    version: 1,
    provider: "stream-video",
    eventId: "webhook-recording-1",
    type: "call.recording_ready",
    occurredAt: "2026-08-28T10:45:00Z",
    callId: "webinar_123",
    sessionId: null,
    participantId: null,
    recordingUrl: "https://recordings.example/recording.mp4",
    recordingFilename: "recording.mp4",
    recordingSessionId: "session-1",
    recordingType: "composite",
  });
});

test("rejects unknown events and calls outside the livestream call type", () => {
  assert.equal(normalizeStreamEvent({
    type: "user.updated",
    call_cid: "livestream:webinar_123",
    created_at: "2026-08-28T10:15:00Z",
  }, "webhook-2"), null);
  assert.equal(normalizeStreamEvent({
    type: "call.created",
    call_cid: "development:webinar_123",
    created_at: "2026-08-28T10:15:00Z",
  }, "webhook-3"), null);
});

test("signs the exact outbound body with the dedicated secret", () => {
  const secret = "events-secret-that-is-at-least-32-characters";
  const body = '{"eventId":"webhook-1"}';
  assert.equal(
    signMiltonEvent(body, secret),
    crypto.createHmac("sha256", secret).update(body).digest("hex"),
  );
});
