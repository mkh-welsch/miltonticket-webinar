import "server-only";

function miltonOrigin() {
  const value = String(process.env.MILTON_API_BASE_URL || "").trim();
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("MILTON_API_BASE_URL ist ungültig."); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw new Error("MILTON_API_BASE_URL muss eine vertrauenswürdige HTTPS-Origin sein.");
  const allowlist = String(process.env.MILTON_API_ALLOWED_ORIGINS || "").split(",").map(origin => origin.trim()).filter(Boolean);
  if (!allowlist.length || !allowlist.includes(url.origin)) throw new Error("MILTON_API_BASE_URL ist nicht freigegeben.");
  return url.origin;
}

export async function forwardMiltonControl(path: string, rawBody: string, headers: { timestamp: string; signature: string; idempotencyKey: string }) {
  const response = await fetch(`${miltonOrigin()}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-milton-timestamp": headers.timestamp,
      "x-milton-signature": headers.signature,
      "idempotency-key": headers.idempotencyKey,
    },
    body: rawBody,
    cache: "no-store",
    signal: AbortSignal.timeout(4_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) return Response.json({ error: "Milton-Webinar-Aktion wurde abgelehnt." }, { status: response.status >= 500 ? 502 : response.status });
  return Response.json(payload, { status: response.status });
}
