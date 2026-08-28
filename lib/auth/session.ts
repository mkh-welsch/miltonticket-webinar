import "server-only";
import crypto from "node:crypto";

import { cookies } from "next/headers";
import {
  createSignedWebinarToken,
  verifySignedWebinarToken,
  type WebinarIdentity,
} from "./tokens";

export const WEBINAR_SESSION_COOKIE = "milton_webinar_session";
const SESSION_AUDIENCE = "miltonticket-webinar-session";
const SESSION_ISSUER = "miltonticket-webinar";
const HANDOFF_AUDIENCE = "miltonticket-webinar-handoff";
const HANDOFF_ISSUER = "miltonticket-app";

function requiredSecret(name: "WEBINAR_SESSION_SECRET" | "MILTON_WEBINAR_HANDOFF_SECRET") {
  const value = String(process.env[name] || "");
  if (value.length < 32) throw new Error(`${name} ist nicht sicher konfiguriert.`);
  return value;
}

export function openMiltonHandoff(token: string) {
  const identity = verifySignedWebinarToken(token, {
    secret: requiredSecret("MILTON_WEBINAR_HANDOFF_SECRET"),
    audience: HANDOFF_AUDIENCE,
    issuer: HANDOFF_ISSUER,
    maxLifetimeSeconds: 10 * 60,
  });
  if (!identity.handoffJti || !identity.handoffIat || !identity.handoffExp) {
    throw new Error("Das Webinar-Handoff enthält keine Replay-Claims.");
  }
  return identity;
}

export async function consumeMiltonHandoff(token: string, callId: string) {
  const configured = String(process.env.MILTON_API_BASE_URL || "").trim();
  let baseUrl: URL;
  try { baseUrl = new URL(configured); } catch { throw new Error("MILTON_API_BASE_URL ist ungültig."); }
  if (baseUrl.protocol !== "https:" || baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) {
    throw new Error("MILTON_API_BASE_URL muss eine vertrauenswürdige HTTPS-Origin sein.");
  }
  const allowlist = String(process.env.MILTON_API_ALLOWED_ORIGINS || "").split(",").map(value => value.trim()).filter(Boolean);
  if (allowlist.length && !allowlist.includes(baseUrl.origin)) throw new Error("MILTON_API_BASE_URL ist nicht freigegeben.");
  const stableKey = `handoff-consume-${crypto.createHash("sha256").update(token).digest("hex").slice(0, 48)}`;
  const response = await fetch(`${baseUrl.origin}/api/webinars/${encodeURIComponent(callId)}/handoff/consume`, {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": stableKey },
    body: JSON.stringify({ token }),
    cache: "no-store",
    signal: AbortSignal.timeout(4_000),
  });
  if (!response.ok) throw new Error("Das Webinar-Handoff konnte nicht verbraucht werden.");
  const payload = await response.json() as Record<string, unknown>;
  if (!payload.streamToken || payload.callId !== callId) throw new Error("Das Webinar-Handoff ist unvollständig.");
  return payload;
}

export async function refreshMiltonStreamToken(sessionToken: string, callId: string) {
  const configured = String(process.env.MILTON_API_BASE_URL || "").trim();
  let baseUrl: URL;
  try { baseUrl = new URL(configured); } catch { throw new Error("MILTON_API_BASE_URL ist ungültig."); }
  if (baseUrl.protocol !== "https:" || baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) throw new Error("MILTON_API_BASE_URL muss eine vertrauenswürdige HTTPS-Origin sein.");
  const allowlist = String(process.env.MILTON_API_ALLOWED_ORIGINS || "").split(",").map(value => value.trim()).filter(Boolean);
  if (allowlist.length && !allowlist.includes(baseUrl.origin)) throw new Error("MILTON_API_BASE_URL ist nicht freigegeben.");
  const response = await fetch(`${baseUrl.origin}/api/webinars/${encodeURIComponent(callId)}/token`, {
    method: "POST",
    headers: { authorization: `Bearer ${sessionToken}`, "content-type": "application/json" },
    body: "{}",
    cache: "no-store",
    signal: AbortSignal.timeout(4_000),
  });
  if (!response.ok) throw new Error("Das Webinar-Token konnte nicht erneuert werden.");
  const payload = await response.json() as Record<string, unknown>;
  if (!payload.streamToken || payload.callId !== callId) throw new Error("Das Webinar-Token ist unvollständig.");
  return payload;
}

export function createWebinarSessionToken(identity: WebinarIdentity, ttlSeconds = 8 * 60 * 60) {
  return createSignedWebinarToken(identity, {
    secret: requiredSecret("WEBINAR_SESSION_SECRET"),
    audience: SESSION_AUDIENCE,
    issuer: SESSION_ISSUER,
    ttlSeconds,
  });
}

export function readWebinarSessionToken(token: string) {
  return verifySignedWebinarToken(token, {
    secret: requiredSecret("WEBINAR_SESSION_SECRET"),
    audience: SESSION_AUDIENCE,
    issuer: SESSION_ISSUER,
  });
}

export async function getWebinarSession(): Promise<WebinarIdentity | null> {
  const token = (await cookies()).get(WEBINAR_SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return readWebinarSessionToken(token);
  } catch {
    return null;
  }
}

export async function requireWebinarSession() {
  const session = await getWebinarSession();
  if (!session) throw new Error("Für diese Aktion ist eine Milton-Webinar-Sitzung erforderlich.");
  return session;
}
