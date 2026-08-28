import type { WebinarIdentity } from "@/lib/auth/tokens";

export function canManageWebinars(identity: WebinarIdentity) {
  return identity.role === "administrator" || identity.role === "host";
}

export function canAccessWebinar(identity: WebinarIdentity, callId: string) {
  return canManageWebinars(identity) || identity.callIds.includes(callId);
}

export function hasWebinarCallScope(
  identity: WebinarIdentity,
  callId: string,
  callTenantId: string | undefined,
  options: { manage?: boolean } = {},
) {
  if (identity.tenantId !== callTenantId) return false;
  return options.manage ? canManageWebinars(identity) : canAccessWebinar(identity, callId);
}

export function safeReturnPath(value: string | null | undefined, fallback = "/") {
  const path = String(value || "");
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return fallback;
  return path.slice(0, 500);
}
