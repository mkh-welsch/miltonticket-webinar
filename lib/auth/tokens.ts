import crypto from "node:crypto";

export const WEBINAR_ROLES = ["administrator", "host", "attendee"] as const;
export type WebinarRole = (typeof WEBINAR_ROLES)[number];

export type WebinarIdentity = {
  sub: string;
  email: string;
  name: string;
  role: WebinarRole;
  tenantId: string;
  callIds: string[];
  streamToken?: string;
  streamApiKey?: string;
  streamCallType?: string;
  streamTokenExpiresAt?: number;
  sessionToken?: string;
  sessionExpiresAt?: number;
  handoffJti?: string;
  handoffIat?: number;
  handoffExp?: number;
  handoffToken?: string;
};

type SignedClaims = WebinarIdentity & {
  v: 1;
  aud: string;
  iss: string;
  iat: number;
  exp: number;
  jti?: string;
};

const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:@-]{1,199}$/;
const TENANT_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;
const CALL_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,127}$/;

function assertSecret(secret: string) {
  if (Buffer.byteLength(String(secret || ""), "utf8") < 32) {
    throw new Error("Das Webinar-Signatur-Secret muss mindestens 32 Zeichen lang sein.");
  }
}

function encodedJson(value: unknown) {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function signature(body: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(body).digest("base64url");
}

function normalizeIdentity(input: Partial<WebinarIdentity>): WebinarIdentity {
  const sub = String(input.sub || "").trim();
  const email = String(input.email || "").trim().toLowerCase();
  const name = String(input.name || "").trim().slice(0, 160);
  const role = String(input.role || "") as WebinarRole;
  const tenantId = String(input.tenantId || "").trim().toLowerCase();
  const callIds = [...new Set((input.callIds || []).map(value => String(value).trim()))];

  if (!ID_PATTERN.test(sub)) throw new Error("Ungültige Webinar-Identität.");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Ungültige Webinar-E-Mail-Adresse.");
  if (name.length < 2) throw new Error("Ungültiger Webinar-Anzeigename.");
  if (!WEBINAR_ROLES.includes(role)) throw new Error("Ungültige Webinar-Rolle.");
  if (!TENANT_PATTERN.test(tenantId)) throw new Error("Ungültiger Webinar-Mandant.");
  if (callIds.some(callId => !CALL_ID_PATTERN.test(callId))) {
    throw new Error("Ungültige Webinar-ID im Zugriffsticket.");
  }
  if (callIds.length > 50) throw new Error("Das Zugriffsticket enthält zu viele Webinare.");

  return {
    sub,
    email,
    name,
    role,
    tenantId,
    callIds,
    ...(input.streamToken ? { streamToken: String(input.streamToken) } : {}),
    ...(input.streamApiKey ? { streamApiKey: String(input.streamApiKey) } : {}),
    ...(input.streamCallType ? { streamCallType: String(input.streamCallType) } : {}),
    ...(Number.isInteger(input.streamTokenExpiresAt) ? { streamTokenExpiresAt: Number(input.streamTokenExpiresAt) } : {}),
    ...(input.sessionToken ? { sessionToken: String(input.sessionToken) } : {}),
    ...(Number.isInteger(input.sessionExpiresAt) ? { sessionExpiresAt: Number(input.sessionExpiresAt) } : {}),
    ...(input.handoffJti ? { handoffJti: String(input.handoffJti) } : {}),
    ...(Number.isInteger(input.handoffIat) ? { handoffIat: Number(input.handoffIat) } : {}),
    ...(Number.isInteger(input.handoffExp) ? { handoffExp: Number(input.handoffExp) } : {}),
    ...(input.handoffToken ? { handoffToken: String(input.handoffToken) } : {}),
  };
}

export function createSignedWebinarToken(
  identity: WebinarIdentity,
  options: {
    secret: string;
    audience: string;
    issuer: string;
    ttlSeconds?: number;
    now?: Date;
  },
) {
  assertSecret(options.secret);
  const normalized = normalizeIdentity(identity);
  const issuedAt = Math.floor((options.now || new Date()).getTime() / 1000);
  const ttlSeconds = Math.max(30, Math.min(24 * 60 * 60, Number(options.ttlSeconds || 600)));
  const claims: SignedClaims = {
    v: 1,
    ...normalized,
    aud: options.audience,
    iss: options.issuer,
    iat: issuedAt,
    exp: issuedAt + ttlSeconds,
  };
  const body = encodedJson(claims);
  return `${body}.${signature(body, options.secret)}`;
}

export function verifySignedWebinarToken(
  token: string,
  options: {
    secret: string;
    audience: string;
    issuer: string;
    maxLifetimeSeconds?: number;
    now?: Date;
  },
): WebinarIdentity {
  assertSecret(options.secret);
  const [body, suppliedSignature, extra] = String(token || "").split(".");
  if (!body || !suppliedSignature || extra) throw new Error("Das Webinar-Zugriffsticket ist ungültig.");

  const expectedSignature = signature(body, options.secret);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) {
    throw new Error("Das Webinar-Zugriffsticket ist ungültig.");
  }

  let claims: Partial<SignedClaims>;
  try {
    claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    throw new Error("Das Webinar-Zugriffsticket ist ungültig.");
  }

  const now = Math.floor((options.now || new Date()).getTime() / 1000);
  const lifetime = Number(claims.exp) - Number(claims.iat);
  if (
    claims.v !== 1 ||
    claims.aud !== options.audience ||
    claims.iss !== options.issuer ||
    !Number.isFinite(claims.iat) ||
    !Number.isFinite(claims.exp) ||
    lifetime <= 0 ||
    (options.maxLifetimeSeconds !== undefined && lifetime > options.maxLifetimeSeconds) ||
    Number(claims.iat) > now + 60 ||
    Number(claims.exp) <= now
  ) {
    throw new Error("Das Webinar-Zugriffsticket ist abgelaufen oder nicht für diese Anwendung bestimmt.");
  }

  return normalizeIdentity({
    ...claims,
    ...(options.audience === "miltonticket-webinar-handoff" && claims.jti ? { handoffJti: claims.jti } : {}),
    ...(options.audience === "miltonticket-webinar-handoff" && Number.isInteger(claims.iat) ? { handoffIat: Number(claims.iat) } : {}),
    ...(options.audience === "miltonticket-webinar-handoff" && Number.isInteger(claims.exp) ? { handoffExp: Number(claims.exp) } : {}),
  });
}
