import crypto from "node:crypto";

const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

function controlSignature(body: string, timestamp: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
}

export function signMiltonControlRequest(
  body: string,
  timestamp: string,
  secret: string,
) {
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("MILTON_WEBINAR_CONTROL_SECRET ist nicht sicher konfiguriert.");
  }
  return controlSignature(body, timestamp, secret);
}

export function verifyMiltonControlRequest(input: {
  body: string;
  timestamp: string;
  signature: string;
  secret: string;
  now?: Date;
}) {
  const timestampSeconds = Number(input.timestamp);
  const nowSeconds = Math.floor((input.now || new Date()).getTime() / 1000);
  if (!Number.isInteger(timestampSeconds) || Math.abs(nowSeconds - timestampSeconds) > MAX_CLOCK_SKEW_SECONDS) {
    return false;
  }

  let expected: string;
  try {
    expected = signMiltonControlRequest(input.body, input.timestamp, input.secret);
  } catch {
    return false;
  }
  const suppliedBuffer = Buffer.from(input.signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  return suppliedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);
}
