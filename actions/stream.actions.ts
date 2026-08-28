"use server";

import crypto from "node:crypto";
import { requireWebinarSession } from "@/lib/auth/session";
import { canManageWebinars } from "@/lib/webinar/access";
import { authorizedWebinarCall } from "@/lib/webinar/call-access";
import {
  recordingConsentFromCustom,
  recordingEnabled,
} from "@/lib/webinar/recording-policy";
import { provisionStreamIdentity, streamServerClient } from "@/lib/webinar/stream-server";

async function manageableCall(callId: string) {
  const user = await requireWebinarSession();
  return authorizedWebinarCall(user, callId, { manage: true });
}

export default async function tokenProvider() {
  const user = await requireWebinarSession();
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

  const id = crypto.randomUUID();
  const client = streamServerClient();
  await provisionStreamIdentity(user);
  const call = client.video.call("livestream", id);
  await call.getOrCreate({
    data: {
      created_by_id: user.sub,
      starts_at: startsAt,
      team: user.tenantId,
      members: [{ user_id: user.sub, role: "host" }],
      custom: {
        title,
        description,
        format: "webinar",
        tenant_id: user.tenantId,
        recording_requested: input.recording === true,
      },
    },
  });

  return {
    id,
    type: "livestream" as const,
    title,
    description,
    startsAt: startsAt.toISOString(),
  };
}

export async function startWebinarBroadcast(input: { callId: string; recording: boolean }) {
  const { call, custom } = await manageableCall(String(input.callId || ""));
  let consent = null;
  if (input.recording) {
    if (!recordingEnabled()) throw new Error("Aufzeichnungen sind in dieser Umgebung deaktiviert.");
    consent = recordingConsentFromCustom(custom);
    if (!consent) throw new Error("Für dieses Webinar liegt keine gültige Aufzeichnungseinwilligung vor.");
  }

  await call.goLive({
    start_recording: input.recording,
    start_transcription: false,
    start_closed_caption: false,
    start_hls: false,
  });
  return {
    live: true,
    recording: input.recording,
    consentReceiptId: consent?.receiptId || null,
  };
}

export async function stopWebinarBroadcast(callId: string) {
  const { call } = await manageableCall(String(callId || ""));
  await call.stopLive({
    continue_recording: false,
    continue_transcription: false,
    continue_closed_caption: false,
    continue_hls: false,
  });
  return { live: false };
}
