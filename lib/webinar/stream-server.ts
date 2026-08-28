import "server-only";

import { StreamClient } from "@stream-io/node-sdk";
import type { WebinarIdentity } from "@/lib/auth/tokens";

function streamCredentials() {
  const apiKey = String(process.env.NEXT_PUBLIC_STREAM_API_KEY || "").trim();
  const secret = String(process.env.STREAM_SECRET_KEY || "").trim();
  if (!apiKey || secret.length < 16) {
    throw new Error("Stream Video ist noch nicht konfiguriert.");
  }
  return { apiKey, secret };
}

export function streamVideoConfigured() {
  try {
    streamCredentials();
    return true;
  } catch {
    return false;
  }
}

export function streamServerClient() {
  const { apiKey, secret } = streamCredentials();
  return new StreamClient(apiKey, secret);
}

export async function provisionStreamIdentity(identity: WebinarIdentity) {
  const client = streamServerClient();
  await client.upsertUsers([{
    id: identity.sub,
    name: identity.name,
    role: "user",
    custom: {
      milton_role: identity.role,
      tenant_id: identity.tenantId,
    },
  }]);

  if (identity.role === "attendee") {
    await Promise.all(identity.callIds.map(callId =>
      client.video.call("livestream", callId).updateCallMembers({
        update_members: [{ user_id: identity.sub, role: "call-member" }],
      })
    ));
  }
}
