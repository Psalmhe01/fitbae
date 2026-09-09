import test from "node:test";
import assert from "node:assert/strict";
import { authRedirectUrl, generationEndpoint, parseNativeAuthCallback } from "../src/lib/mobileConfig.js";
import handler from "../api/generate-plan.js";

test("mobile generation uses HTTPS while web keeps its same-origin API", () => {
  assert.equal(generationEndpoint(false), "/api/generate-plan");
  assert.equal(generationEndpoint(true, "https://fitbae.vercel.app"), "https://fitbae.vercel.app/api/generate-plan");
  for (const value of ["", "http://fitbae.vercel.app", "https://user:secret@example.com", "https://example.com/path", "https://example.com?key=x"]) {
    assert.throws(() => generationEndpoint(true, value));
  }
});

test("auth redirects separate web, native and password recovery", () => {
  assert.equal(authRedirectUrl(false, "https://fitbae.vercel.app"), "https://fitbae.vercel.app/dashboard");
  assert.equal(authRedirectUrl(false, "https://fitbae.vercel.app", true), "https://fitbae.vercel.app/auth?mode=reset");
  assert.equal(authRedirectUrl(true, "https://localhost", true), "com.fitbae.app://auth/callback?mode=reset");
});

test("only exact native auth callbacks are accepted; tokens are not taken from arbitrary URLs", () => {
  assert.deepEqual(parseNativeAuthCallback("com.fitbae.app://auth/callback?code=abc&mode=reset"), { code: "abc", recovery: true, error: false });
  assert.equal(parseNativeAuthCallback("com.fitbae.app://auth/callback?error=access_denied").error, true);
  for (const value of ["bad", "https://auth/callback?code=x", "com.fitbae.app://other/callback?code=x", "com.fitbae.app://auth/elsewhere", "com.fitbae.app://user@auth/callback"]) {
    assert.equal(parseNativeAuthCallback(value), null);
  }
});

test("generation preflight only allows the native origin, without cookies", async () => {
  for (const origin of ["https://localhost", "http://localhost", "https://attacker.example", undefined]) {
    const headers = {};
    const res = { setHeader: (key, value) => { headers[key] = value; }, end() {} };
    await handler({ method: "OPTIONS", headers: { origin } }, res);
    assert.equal(res.statusCode, 204);
    assert.equal(headers["Access-Control-Allow-Origin"], origin === "https://localhost" ? origin : undefined);
    assert.equal(headers["Access-Control-Allow-Credentials"], undefined);
    assert.equal(headers.Vary, "Origin");
    if (origin === "https://localhost") assert.equal(headers["Access-Control-Allow-Headers"], "Authorization, Content-Type");
  }
});
