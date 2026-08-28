import { NextRequest, NextResponse } from "next/server";
import {
  createWebinarSessionToken,
  WEBINAR_SESSION_COOKIE,
} from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  const demoAllowed = process.env.NODE_ENV !== "production" && process.env.WEBINAR_DEMO_MODE === "true";
  if (!demoAllowed) return NextResponse.json({ error: "Demo-Anmeldung ist deaktiviert." }, { status: 404 });

  const identity = {
    sub: "demo-host@miltonticket.local",
    email: "demo-host@miltonticket.local",
    name: "Milton Demo Host",
    role: "host" as const,
    tenantId: "milton-demo",
    callIds: [],
  };
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(WEBINAR_SESSION_COOKIE, createWebinarSessionToken(identity), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  return response;
}
