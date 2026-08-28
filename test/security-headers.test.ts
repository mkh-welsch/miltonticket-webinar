import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../next.config.mjs";

test("all routes receive restrictive browser security headers", async () => {
  assert.equal(nextConfig.poweredByHeader, false);
  const rules = await nextConfig.headers?.();
  const globalHeaders = Object.fromEntries(
    (rules?.find(rule => rule.source === "/(.*)")?.headers || []).map(header => [header.key, header.value]),
  );
  assert.equal(globalHeaders["X-Content-Type-Options"], "nosniff");
  assert.equal(globalHeaders["X-Frame-Options"], "DENY");
  assert.equal(globalHeaders["Referrer-Policy"], "no-referrer");
  assert.match(globalHeaders["Permissions-Policy"], /camera=\(self\)/);
  assert.match(globalHeaders["Content-Security-Policy"], /frame-ancestors 'none'/);
  assert.match(globalHeaders["Content-Security-Policy"], /wss:\/\/\*\.stream-io-api\.com/);
  assert.doesNotMatch(globalHeaders["Content-Security-Policy"], /(?:^|\s)'unsafe-eval'(?:\s|;)/);
});

test("API responses are explicitly non-cacheable", async () => {
  const rules = await nextConfig.headers?.();
  const apiHeaders = Object.fromEntries(
    (rules?.find(rule => rule.source === "/api/:path*")?.headers || []).map(header => [header.key, header.value]),
  );
  assert.equal(apiHeaders["Cache-Control"], "private, no-store, max-age=0");
});
