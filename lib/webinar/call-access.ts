import "server-only";

import type { WebinarIdentity } from "@/lib/auth/tokens";
import {
  canAccessWebinar,
  canManageWebinars,
  hasWebinarCallScope,
} from "@/lib/webinar/access";
import { streamServerClient } from "@/lib/webinar/stream-server";

const CALL_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{2,127}$/;

export class WebinarAccessDeniedError extends Error {}

export async function authorizedWebinarCall(
  identity: WebinarIdentity,
  callId: string,
  options: { manage?: boolean } = {},
) {
  if (!CALL_ID_PATTERN.test(callId)) throw new WebinarAccessDeniedError("Ungültige Webinar-ID.");
  if (options.manage ? !canManageWebinars(identity) : !canAccessWebinar(identity, callId)) {
    throw new WebinarAccessDeniedError("Diese Rolle darf nicht auf das Webinar zugreifen.");
  }

  const call = streamServerClient().video.call("livestream", callId);
  const response = await call.get();
  if (!hasWebinarCallScope(identity, callId, response.call.team, options)) {
    throw new WebinarAccessDeniedError("Das Webinar gehört zu einem anderen Mandanten.");
  }
  return { call, custom: response.call.custom || {} };
}
