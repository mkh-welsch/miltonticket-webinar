import { NextRequest, NextResponse } from "next/server";
import {
  createWebinarSessionToken,
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
    await provisionStreamIdentity(identity);
    const returnTo = safeReturnPath(
      request.nextUrl.searchParams.get("returnTo"),
      identity.role === "attendee" && identity.callIds[0]
        ? `/meeting/${identity.callIds[0]}`
        : "/",
    );
    const response = NextResponse.redirect(new URL(returnTo, request.url), 303);
    response.cookies.set(WEBINAR_SESSION_COOKIE, createWebinarSessionToken(identity), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 8 * 60 * 60,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=invalid_handoff", request.url), 303);
  }
}
