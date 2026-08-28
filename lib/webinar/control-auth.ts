import crypto from "node:crypto";

const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

function controlSignature(input: { method: string; path: string; idempotencyKey: string; body: string; timestamp: string }, secret: string) {
  const canonical = `${input.method.toUpperCase()}\n${input.path}\n${input.idempotencyKey}\n${input.timestamp}\n${input.body}`;
  return crypto.createHmac("sha256", secret).update(canonical).digest("hex");
}

export function signMiltonControlRequest(
  body: string,
  timestamp: string,
  secret: string,
  options: { method?: string; path?: string; idempotencyKey?: string } = {},
) {
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("MILTON_WEBINAR_CONTROL_SECRET ist nicht sicher konfiguriert.");
  }
  return controlSignature({ method: options.method || "POST", path: options.path || "/api/webinars/control", idempotencyKey: options.idempotencyKey || "", body, timestamp }, secret);
}

export function verifyMiltonControlRequest(input: {
  body: string;
  timestamp: string;
  signature: string;
  secret: string;
  method?: string;
  path?: string;
  idempotencyKey?: string;
  now?: Date;
}) {
  const timestampSeconds = Number(input.timestamp);
  const nowSeconds = Math.floor((input.now || new Date()).getTime() / 1000);
  if (!Number.isInteger(timestampSeconds) || Math.abs(nowSeconds - timestampSeconds) > MAX_CLOCK_SKEW_SECONDS) {
    return false;
  }

  let expected: string;
  try {
    expected = signMiltonControlRequest(input.body, input.timestamp, input.secret, {
      method: input.method,
      path: input.path,
      idempotencyKey: input.idempotencyKey,
    });
  } catch {
    return false;
  }
  const suppliedBuffer = Buffer.from(input.signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return suppliedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);
}
