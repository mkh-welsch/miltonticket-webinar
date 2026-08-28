import { NextRequest, NextResponse } from "next/server";
import {
  createWebinarSessionToken,
  consumeMiltonHandoff,
  openMiltonHandoff,
  WEBINAR_SESSION_COOKIE,
} from "@/lib/auth/session";
import { safeReturnPath } from "@/lib/webinar/access";
import { provisionStreamIdentity } from "@/lib/webinar/stream-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token") || "";
    const identity = openMiltonHandoff(token);
    const callId = identity.callIds[0];
    if (!callId) throw new Error("Das Handoff enthält keinen Webinar-Call.");
    const consumed = await consumeMiltonHandoff(token, callId);
    const consumedCallId = String(consumed.callId || "");
    const consumedSubject = String(consumed.subject || "");
    const consumedTenant = String(consumed.tenantId || "");
    const consumedRole = String(consumed.role || "");
    const consumedExp = Number(consumed.expiresAt || 0);
    const consumedIat = Number(consumed.issuedAt || 0);
    if (consumedCallId !== callId || consumedSubject !== identity.sub || consumedTenant !== identity.tenantId || consumedRole !== identity.role || !Number.isInteger(consumedIat) || consumedIat < Number(identity.handoffIat || 0) || !Number.isInteger(consumedExp) || consumedExp > Number(identity.handoffExp || 0) || !consumed.sessionToken) {
      throw new Error("Das Webinar-Handoff enthält widersprüchliche Claims.");
    }
    const sessionIdentity = {
      ...identity,
      streamToken: String(consumed.streamToken),
      streamTokenExpiresAt: Number(consumed.streamTokenExpiresAt || consumed.expiresAt || 0),
      streamApiKey: String(consumed.apiKey || consumed.streamApiKey || ""),
      streamCallType: String(consumed.callType || consumed.streamCallType || "livestream"),
      sessionToken: String(consumed.sessionToken || ""),
      sessionExpiresAt: Number(consumed.sessionExpiresAt || 0),
      handoffIat: Number(consumed.issuedAt || identity.handoffIat),
      handoffExp: Number(consumed.expiresAt || identity.handoffExp),
      handoffToken: token,
    };
    await provisionStreamIdentity(sessionIdentity);
    const returnTo = safeReturnPath(
      request.nextUrl.searchParams.get("returnTo"),
      sessionIdentity.role === "attendee" && sessionIdentity.callIds[0]
        ? `/meeting/${sessionIdentity.callIds[0]}`
        : "/",
    );
    const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
    const remaining = Number(sessionIdentity.sessionExpiresAt || 0) - Math.floor(Date.now() / 1000);
    if (remaining < 30) throw new Error("Das Webinar-Handoff läuft ab.");
    response.cookies.set(WEBINAR_SESSION_COOKIE, createWebinarSessionToken(sessionIdentity, Math.min(8 * 60 * 60, remaining)), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.min(8 * 60 * 60, remaining),
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=invalid_handoff", request.url), 303);
  }
}
