import crypto from "node:crypto";

export type RecordingConsent = {
  receiptId: string;
  tenantId: string;
  noticeVersion: string;
  consentedAt: string;
  retentionDays: number;
  registrationId: string;
  status: "granted" | "revoked";
  capturedAt?: string;
  revokedAt?: string;
};

export type RecordingDeletion = {
  tenantId: string;
  sessionId: string;
  filename: string;
  reason: "retention_expired" | "consent_withdrawn" | "admin_request";
};

const RECEIPT_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{5,199}$/;
const TENANT_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;
const NOTICE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/;

export function recordingMaxRetentionDays() {
  const configured = Number(process.env.WEBINAR_RECORDING_MAX_RETENTION_DAYS || 30);
  return Number.isInteger(configured) && configured >= 1 && configured <= 365 ? configured : 30;
}

export function recordingEnabled() {
  return process.env.WEBINAR_RECORDING_ENABLED === "true";
}

export function normalizeRecordingConsent(
  input: Partial<RecordingConsent> & Record<string, unknown>,
  options: { now?: Date; maxRetentionDays?: number; requireRegistrationId?: boolean } = {},
): RecordingConsent {
  const receiptId = String(input.receiptId || "").trim();
  const tenantId = String(input.tenantId || "").trim().toLowerCase();
  const registrationId = String(input.registrationId || (options.requireRegistrationId ? "" : `legacy-${receiptId}`)).trim();
  const status = String(input.status || "granted") as RecordingConsent["status"];
  const noticeVersion = String(input.noticeVersion || "milton-recording-v1").trim();
  const capturedAt = String(input.capturedAt || input.consentedAt || "").trim();
  const revokedAt = String(input.revokedAt || "").trim();
  const consentedAt = new Date(capturedAt);
  const retentionDays = Number(input.retentionDays || options.maxRetentionDays || recordingMaxRetentionDays());
  const maxRetentionDays = options.maxRetentionDays || recordingMaxRetentionDays();
  const now = options.now || new Date();

  if (status === "granted" && !RECEIPT_PATTERN.test(receiptId)) throw new Error("Ungültige Einwilligungsquittung.");
  if (!TENANT_PATTERN.test(tenantId)) throw new Error("Ungültiger Webinar-Mandant.");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{1,199}$/.test(registrationId)) throw new Error("Ungültige Webinar-Registrierung.");
  if (!["granted", "revoked"].includes(status)) throw new Error("Ungültiger Einwilligungsstatus.");
  if (status === "granted" && !NOTICE_PATTERN.test(noticeVersion)) throw new Error("Ungültige Aufnahmehinweis-Version.");
  const eventAt = status === "revoked" ? new Date(revokedAt || capturedAt) : consentedAt;
  if (Number.isNaN(eventAt.getTime()) || eventAt.getTime() > now.getTime() + 5 * 60_000) {
    throw new Error("Ungültiger Einwilligungszeitpunkt.");
  }
  if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > maxRetentionDays) {
    throw new Error(`Aufzeichnungen dürfen höchstens ${maxRetentionDays} Tage aufbewahrt werden.`);
  }

  return {
    receiptId,
    tenantId,
    noticeVersion,
    consentedAt: (Number.isNaN(consentedAt.getTime()) ? eventAt : consentedAt).toISOString(),
    retentionDays,
    registrationId,
    status,
    capturedAt: status === "granted" ? consentedAt.toISOString() : undefined,
    revokedAt: status === "revoked" ? eventAt.toISOString() : undefined,
  };
}

export function recordingConsentFromCustom(custom: Record<string, unknown>) {
  try {
    return normalizeRecordingConsent({
      receiptId: String(custom.recording_consent_receipt_id || ""),
      tenantId: String(custom.tenant_id || ""),
      noticeVersion: String(custom.recording_consent_notice_version || ""),
      consentedAt: String(custom.recording_consented_at || ""),
      retentionDays: Number(custom.recording_retention_days),
    });
  } catch {
    return null;
  }
}

export function recordingConsentCustom(consent: RecordingConsent, idempotencyKey: string, rawBody: string) {
  return {
    recording_consent_receipt_id: consent.receiptId,
    recording_consent_notice_version: consent.noticeVersion,
    recording_consented_at: consent.consentedAt,
    recording_retention_days: consent.retentionDays,
    recording_consent_idempotency_key: idempotencyKey,
    recording_consent_payload_hash: crypto.createHash("sha256").update(rawBody).digest("hex"),
  };
}

export function normalizeRecordingDeletion(input: Partial<RecordingDeletion>): RecordingDeletion {
  const tenantId = String(input.tenantId || "").trim().toLowerCase();
  const sessionId = String(input.sessionId || "").trim();
  const filename = String(input.filename || "").trim();
  const reason = String(input.reason || "") as RecordingDeletion["reason"];
  if (!TENANT_PATTERN.test(tenantId)) throw new Error("Ungültiger Webinar-Mandant.");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{5,199}$/.test(sessionId)) {
    throw new Error("Ungültige Aufzeichnungssitzung.");
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,255}$/.test(filename)) {
    throw new Error("Ungültiger Aufzeichnungsdateiname.");
  }
  if (!["retention_expired", "consent_withdrawn", "admin_request"].includes(reason)) {
    throw new Error("Ungültiger Löschgrund.");
  }
  return { tenantId, sessionId, filename, reason };
}

export function recordingDeletionCustom(
  deletion: RecordingDeletion,
  idempotencyKey: string,
  rawBody: string,
  deletedAt = new Date(),
) {
  return {
    recording_deletion_idempotency_key: idempotencyKey,
    recording_deletion_payload_hash: crypto.createHash("sha256").update(rawBody).digest("hex"),
    recording_deleted_session_id: deletion.sessionId,
    recording_deleted_filename: deletion.filename,
    recording_deletion_reason: deletion.reason,
    recording_deleted_at: deletedAt.toISOString(),
  };
}
