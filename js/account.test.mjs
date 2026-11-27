import test from "node:test";
import assert from "node:assert/strict";
import { hasAuthCallbackInUrl, isRetryableAuthError, readStoredSession } from "./account.js";

test("hasAuthCallbackInUrl identifies OAuth/PKCE/recovery URLs without matching normal app URLs", () => {
  assert.equal(hasAuthCallbackInUrl("https://duojazz.test/"), false);
  assert.equal(hasAuthCallbackInUrl("https://duojazz.test/?tab=charts&tune=autumn-leaves"), false);
  assert.equal(hasAuthCallbackInUrl("https://duojazz.test/?auth=signup"), false);
  assert.equal(hasAuthCallbackInUrl("https://duojazz.test/?code=pkce-code"), true);
  assert.equal(hasAuthCallbackInUrl("https://duojazz.test/?token_hash=abc&type=recovery"), true);
  assert.equal(hasAuthCallbackInUrl("https://duojazz.test/?error=access_denied"), true);
  assert.equal(hasAuthCallbackInUrl("https://duojazz.test/#access_token=jwt&type=recovery"), true);
  assert.equal(hasAuthCallbackInUrl("https://duojazz.test/#error_code=otp_expired"), true);
  assert.equal(hasAuthCallbackInUrl("not a url"), false);
});

test("readStoredSession returns valid cached sessions and ignores missing, incomplete, or corrupt storage", () => {
  const mkStorage = (map, { throws = false } = {}) => ({
    getItem(key) {
      if (throws) throw new Error("SecurityError");
      return map.get(key) ?? null;
    },
  });
  const key = "sb-example-auth-token";
  const valid = {
    access_token: "access",
    refresh_token: "refresh",
    user: { id: "user-1", email: "user@example.com" },
  };
  assert.deepEqual(readStoredSession(key, mkStorage(new Map([[key, JSON.stringify(valid)]]))), valid);
  assert.equal(readStoredSession(key, mkStorage(new Map())), null);
  assert.equal(readStoredSession(key, mkStorage(new Map([[key, "{corrupt"]]))), null);
  assert.equal(readStoredSession(key, mkStorage(new Map([[key, JSON.stringify({ access_token: "a" })]]))), null);
  assert.equal(readStoredSession(key, mkStorage(new Map([[key, JSON.stringify({ user: {}, access_token: "a", refresh_token: "r" })]]))), null);
  assert.equal(readStoredSession(key, mkStorage(new Map(), { throws: true })), null);
});

test("isRetryableAuthError distinguishes transient network/server errors from invalid tokens", () => {
  assert.equal(isRetryableAuthError({ name: "AuthRetryableFetchError", status: 0, message: "Load failed" }), true);
  assert.equal(isRetryableAuthError({ isRetryable: true, status: 429, message: "Too many requests" }), true);
  assert.equal(isRetryableAuthError({ status: 503, message: "Service Unavailable" }), true);
  assert.equal(isRetryableAuthError(new Error("Connection timed out. Please try again.")), true);
  assert.equal(isRetryableAuthError(new Error("Load failed")), true);
  assert.equal(isRetryableAuthError(new Error("Failed to fetch")), true);

  assert.equal(isRetryableAuthError({ name: "AuthApiError", status: 400, code: "refresh_token_not_found", message: "Invalid Refresh Token" }), false);
  assert.equal(isRetryableAuthError({ status: 401, message: "invalid_grant" }), false);
  assert.equal(isRetryableAuthError(null), false);
});
