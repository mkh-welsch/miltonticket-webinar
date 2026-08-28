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
  recordingFilename: string | null;
  recordingSessionId: string | null;
  recordingType: string | null;
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

function isoTimestamp(value: unknown) {
  const candidate = text(value, 100);
  if (!candidate) return null;
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function httpsUrl(value: unknown) {
  const candidate = text(value, 2048);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function safeFilename(value: unknown) {
  const candidate = text(value, 256);
  return candidate && !/[\\/\r\n]/.test(candidate) ? candidate : null;
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
  const occurredAt = isoTimestamp(event.created_at);
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
    recordingUrl: httpsUrl(recording.url),
    recordingFilename: safeFilename(recording.filename),
    recordingSessionId: text(recording.session_id, 200),
    recordingType: text(event.recording_type || recording.recording_type, 40),
  };
}

export function signMiltonEvent(body: string, secret: string) {
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("MILTON_WEBINAR_EVENTS_SECRET ist nicht sicher konfiguriert.");
  }
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

export function miltonEventEndpoint(baseUrl: string, allowHttp = false) {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error("MILTON_API_BASE_URL ist ungültig.");
  }
  if ((url.protocol !== "https:" && !(allowHttp && url.protocol === "http:")) || url.username || url.password) {
    throw new Error("MILTON_API_BASE_URL muss eine vertrauenswürdige HTTPS-Origin sein.");
  }
  if (url.search || url.hash) throw new Error("MILTON_API_BASE_URL darf keine Query oder Fragment enthalten.");
  return new URL("/api/webinars/events", url.origin).toString();
}
