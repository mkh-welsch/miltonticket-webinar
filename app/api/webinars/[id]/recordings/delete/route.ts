import { NextRequest, NextResponse } from "next/server";
import { verifyMiltonControlRequest } from "@/lib/webinar/control-auth";
import {
  normalizeRecordingDeletion,
} from "@/lib/webinar/recording-policy";
import { forwardMiltonControl } from "@/lib/milton-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CALL_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,127}$/;
const IDEMPOTENCY_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,199}$/;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!CALL_ID_PATTERN.test(id)) return NextResponse.json({ error: "invalid call" }, { status: 400 });

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > 16 * 1024) {
    return NextResponse.json({ error: "control payload too large" }, { status: 413 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 16 * 1024) {
    return NextResponse.json({ error: "control payload too large" }, { status: 413 });
  }
  const timestamp = request.headers.get("x-milton-timestamp") || "";
  const signature = request.headers.get("x-milton-signature") || "";
  const idempotencyKey = request.headers.get("idempotency-key") || "";
  if (!IDEMPOTENCY_PATTERN.test(idempotencyKey) || !verifyMiltonControlRequest({
    body: rawBody,
    timestamp,
    signature,
    secret: String(process.env.MILTON_WEBINAR_CONTROL_SECRET || ""),
  })) {
    return NextResponse.json({ error: "invalid control request" }, { status: 401 });
  }

  let deletion;
  try {
    deletion = normalizeRecordingDeletion(JSON.parse(rawBody));
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "invalid deletion",
    }, { status: 400 });
  }

  return forwardMiltonControl(`/api/webinars/${encodeURIComponent(id)}/recordings/delete`, rawBody, {
    timestamp,
    signature,
    idempotencyKey,
  });
}
