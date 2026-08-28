import assert from "node:assert/strict";
import test from "node:test";
import { canAccessWebinar, canManageWebinars, safeReturnPath } from "../lib/webinar/access.ts";

const attendee = {
  sub: "attendee-1",
  email: "attendee@example.com",
  name: "Attendee One",
  role: "attendee" as const,
  tenantId: "milton-demo",
  callIds: ["allowed_call"],
};

test("hosts manage all webinars while attendees only access explicit calls", () => {
  assert.equal(canManageWebinars(attendee), false);
  assert.equal(canAccessWebinar(attendee, "allowed_call"), true);
  assert.equal(canAccessWebinar(attendee, "other_call"), false);
  assert.equal(canManageWebinars({ ...attendee, role: "host" }), true);
  assert.equal(canAccessWebinar({ ...attendee, role: "host" }, "other_call"), true);
});

test("handoff redirects stay local", () => {
  assert.equal(safeReturnPath("/meeting/abc"), "/meeting/abc");
  assert.equal(safeReturnPath("https://evil.example"), "/");
  assert.equal(safeReturnPath("//evil.example"), "/");
  assert.equal(safeReturnPath("/\\evil"), "/");
});
