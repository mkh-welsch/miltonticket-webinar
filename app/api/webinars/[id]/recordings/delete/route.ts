import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyMiltonControlRequest } from "@/lib/webinar/control-auth";
import {
  normalizeRecordingDeletion,
  recordingDeletionCustom,
} from "@/lib/webinar/recording-policy";
import { streamServerClient } from "@/lib/webinar/stream-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CALL_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,127}$/;
const IDEMPOTENCY_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{7,199}$/;

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

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

  try {
    const call = streamServerClient().video.call("livestream", id);
    const response = await call.get();
    if (response.call.team !== deletion.tenantId) {
      return NextResponse.json({ error: "tenant mismatch" }, { status: 403 });
    }
    const currentCustom = response.call.custom || {};
    const payloadHash = crypto.createHash("sha256").update(rawBody).digest("hex");
    if (currentCustom.recording_deletion_idempotency_key === idempotencyKey) {
      if (!safeEqual(String(currentCustom.recording_deletion_payload_hash || ""), payloadHash)) {
        return NextResponse.json({ error: "idempotency conflict" }, { status: 409 });
      }
      return NextResponse.json({
        accepted: true,
        replay: true,
        idempotencyKey,
        reason: deletion.reason,
      });
    }
    await call.deleteRecording({
      session: deletion.sessionId,
      filename: deletion.filename,
    });
    await call.update({
      custom: {
        ...currentCustom,
        ...recordingDeletionCustom(deletion, idempotencyKey, rawBody),
      },
    });
    return NextResponse.json({
      accepted: true,
      replay: false,
      idempotencyKey,
      reason: deletion.reason,
    });
  } catch {
    return NextResponse.json({ error: "recording deletion failed" }, { status: 502 });
  }
}
