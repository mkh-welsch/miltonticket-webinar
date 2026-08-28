"use server";

import crypto from "node:crypto";
import { requireWebinarSession } from "@/lib/auth/session";
import { canManageWebinars } from "@/lib/webinar/access";
import {
  recordingEnabled,
} from "@/lib/webinar/recording-policy";
import { provisionStreamIdentity, streamServerClient } from "@/lib/webinar/stream-server";
import type { WebinarIdentity } from "@/lib/auth/tokens";

function miltonApiBaseUrl() {
  const value = String(process.env.MILTON_API_BASE_URL || "").trim();
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("MILTON_API_BASE_URL ist ungültig."); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("MILTON_API_BASE_URL muss eine vertrauenswürdige HTTPS-Origin sein.");
  const allowlist = String(process.env.MILTON_API_ALLOWED_ORIGINS || "").split(",").map(origin => origin.trim()).filter(Boolean);
  if (allowlist.length && !allowlist.includes(url.origin)) throw new Error("MILTON_API_BASE_URL ist nicht freigegeben.");
  return url.origin;
}

async function miltonWebinarRequest(path: string, user: WebinarIdentity, body: Record<string, unknown>, idempotencyKey: string) {
  const rawBody = JSON.stringify(body);
  const response = await fetch(`${miltonApiBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": idempotencyKey,
      ...(user.handoffToken ? { authorization: `Bearer ${user.handoffToken}` } : {}),
    },
    body: rawBody,
    cache: "no-store",
    signal: AbortSignal.timeout(4_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(payload.error || "Milton-Webinar-Anfrage fehlgeschlagen."));
  return payload as Record<string, unknown>;
}

function stableIdempotencyKey(operation: string, user: WebinarIdentity, body: Record<string, unknown>) {
  const digest = crypto.createHash("sha256").update(JSON.stringify({ operation, tenantId: user.tenantId, sub: user.sub, body })).digest("hex").slice(0, 48);
  return `webinar-${operation}-${digest}`;
}

export default async function tokenProvider() {
  const user = await requireWebinarSession();
  if (user.streamToken) return user.streamToken;
  const client = streamServerClient();
  await provisionStreamIdentity(user);
  const exp = Math.round(new Date().getTime() / 1000) + 60 * 60;
  const issued = Math.floor(Date.now() / 1000) - 60;
  return user.role === "attendee"
    ? client.createCallToken(user.sub, user.callIds.map(callId => `livestream:${callId}`), exp, issued)
    : client.createToken(user.sub, exp, issued);
}

export async function createWebinar(input: {
  title: string;
  description?: string;
  startsAt: string;
  recording?: boolean;
}) {
  const user = await requireWebinarSession();
  if (!canManageWebinars(user)) throw new Error("Diese Rolle darf keine Webinare anlegen.");

  const title = String(input.title || "").trim().slice(0, 160);
  const description = String(input.description || "").trim().slice(0, 1000);
  const startsAt = new Date(input.startsAt);
  if (title.length < 3) throw new Error("Bitte einen Webinar-Titel angeben.");
  if (Number.isNaN(startsAt.getTime())) throw new Error("Bitte einen gültigen Startzeitpunkt angeben.");
  if (startsAt.getTime() < Date.now() - 60_000) throw new Error("Der Startzeitpunkt liegt in der Vergangenheit.");
  if (startsAt.getTime() > Date.now() + 366 * 24 * 60 * 60_000) {
    throw new Error("Webinare können höchstens ein Jahr im Voraus geplant werden.");
  }

  const payload = await miltonWebinarRequest("/api/webinars", user, {
    title,
    description,
    startsAt: startsAt.toISOString(),
    tenantId: user.tenantId,
    recordingConsent: input.recording === true ? { status: "requested" } : undefined,
  }, stableIdempotencyKey("create", user, { title, description, startsAt: startsAt.toISOString(), recording: input.recording === true }));
  return payload.webinar as { id: string; type: "livestream"; title: string; description: string; startsAt: string };
}

export async function startWebinarBroadcast(input: { callId: string; recording: boolean }) {
  const callId = String(input.callId || "");
  const user = await requireWebinarSession();
  if (!canManageWebinars(user)) throw new Error("Diese Rolle darf kein Webinar starten.");
  let consent = null;
  if (input.recording) {
    if (!recordingEnabled()) throw new Error("Aufzeichnungen sind in dieser Umgebung deaktiviert.");
    consent = null;
  }

  const payload = await miltonWebinarRequest(`/api/webinars/${encodeURIComponent(callId)}/go-live`, user, { startRecording: input.recording }, stableIdempotencyKey("go-live", user, { callId, startRecording: input.recording }));
  return { live: true, recording: input.recording, consentReceiptId: (payload.webinar as Record<string, unknown> | undefined)?.recordingConsentReceiptId || null };
}

export async function stopWebinarBroadcast(callId: string) {
  const user = await requireWebinarSession();
  if (!canManageWebinars(user)) throw new Error("Diese Rolle darf kein Webinar beenden.");
  await miltonWebinarRequest(`/api/webinars/${encodeURIComponent(String(callId || ""))}/finalize`, user, { endedAt: new Date().toISOString() }, stableIdempotencyKey("finalize", user, { callId }));
  return { live: false };
}
