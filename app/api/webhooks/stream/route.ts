import { NextRequest, NextResponse } from "next/server";
import {
  miltonEventEndpoint,
  normalizeStreamEvent,
  signMiltonEvent,
} from "@/lib/webinar/events";
import { streamServerClient } from "@/lib/webinar/stream-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function eventDestination() {
  const baseUrl = String(process.env.MILTON_API_BASE_URL || "");
  const secret = String(process.env.MILTON_WEBINAR_EVENTS_SECRET || "");
  if (secret.length < 32) {
    throw new Error("Milton-Ereignisempfänger ist nicht konfiguriert.");
  }
  return {
    url: miltonEventEndpoint(baseUrl, process.env.NODE_ENV !== "production"),
    secret,
  };
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > 1024 * 1024) {
    return NextResponse.json({ error: "webhook payload too large" }, { status: 413 });
  }
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 1024 * 1024) {
    return NextResponse.json({ error: "webhook payload too large" }, { status: 413 });
  }
  const signature = request.headers.get("x-signature") || "";
  const webhookId = request.headers.get("x-webhook-id") || "";
  const apiKey = request.headers.get("x-api-key") || "";

  try {
    if (apiKey !== process.env.NEXT_PUBLIC_STREAM_API_KEY) {
      return NextResponse.json({ error: "invalid webhook" }, { status: 401 });
    }
    if (!streamServerClient().verifyWebhook(rawBody, signature)) {
      return NextResponse.json({ error: "invalid webhook" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "invalid webhook" }, { status: 401 });
  }

  let providerEvent: unknown;
  try {
    providerEvent = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const event = normalizeStreamEvent(providerEvent, webhookId);
  if (!event) return NextResponse.json({ accepted: true, forwarded: false }, { status: 202 });

  try {
    const destination = eventDestination();
    const body = JSON.stringify(event);
    const response = await fetch(destination.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": event.eventId,
        "x-milton-signature": signMiltonEvent(body, destination.secret),
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) throw new Error(`Milton event endpoint returned ${response.status}`);
    return NextResponse.json({ accepted: true, forwarded: true }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "event delivery failed" }, { status: 503 });
  }
}
