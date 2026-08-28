import crypto from "node:crypto";

const FORWARDED_EVENT_TYPES = new Set([
  "call.created",
  "call.updated",
  "call.ended",
  "call.live_started",
  "call.session_started",
  "call.session_ended",
  "call.session_participant_joined",
  "call.session_participant_left",
  "call.recording_started",
  "call.recording_stopped",
  "call.recording_ready",
  "call.recording_failed",
  "call.transcription_ready",
  "call.transcription_failed",
]);

type UnknownRecord = Record<string, unknown>;

export type MiltonWebinarEvent = {
  version: 1;
  provider: "stream-video";
  eventId: string;
  type: string;
  occurredAt: string;
  callId: string;
  sessionId: string | null;
  participantId: string | null;
  recordingUrl: string | null;
};

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {};
}

function text(value: unknown, maxLength = 300) {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength
    ? value
    : null;
}

function callIdFromCid(value: unknown) {
  const cid = text(value, 256);
  if (!cid) return null;
  const [callType, ...idParts] = cid.split(":");
  const callId = idParts.join(":");
  if (callType !== "livestream" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{2,127}$/.test(callId)) {
    return null;
  }
  return callId;
}

export function normalizeStreamEvent(
  input: unknown,
  webhookId: string,
): MiltonWebinarEvent | null {
  const event = record(input);
  const type = text(event.type, 100);
  const eventId = text(webhookId, 200);
  const callId = callIdFromCid(event.call_cid || record(event.call).cid);
  const occurredAt = text(event.created_at, 100);
  if (!type || !FORWARDED_EVENT_TYPES.has(type) || !eventId || !callId || !occurredAt) {
    return null;
  }

  const participant = record(event.participant);
  const participantUser = record(participant.user);
  const recording = record(event.call_recording);

  return {
    version: 1,
    provider: "stream-video",
    eventId,
    type,
    occurredAt,
    callId,
    sessionId: text(event.session_id, 200),
    participantId: text(participant.user_id || participantUser.id, 200),
    recordingUrl: text(recording.url, 2048),
  };
}

export function signMiltonEvent(body: string, secret: string) {
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("MILTON_WEBINAR_EVENTS_SECRET ist nicht sicher konfiguriert.");
  }
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}
