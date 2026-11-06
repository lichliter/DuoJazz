import test from "node:test";
import assert from "node:assert/strict";
import { progressRows, mergeProgress, claimGuestProgress, GUEST_OWNER_KEY } from "./cloud-progress.js";
import { emptyMastery, recordQuizPass, recordLearnPass, setMasteryAccount, saveMastery, loadMastery } from "./medals.js";
import { googleOptions, authReturnUrl, accountInitials } from "./account.js";

test("guest migration is repeatable for its owner and never shared with another account", () => {
  const guest = recordQuizPass(emptyMastery(), "master-lick", "C");
  const values = new Map([["duojazz-mastery-v1", JSON.stringify(guest)]]);
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const first = claimGuestProgress("user-a", storage);
  assert.equal(first.length, 1);
  assert.equal(values.get(GUEST_OWNER_KEY), "user-a");
  assert.deepEqual(claimGuestProgress("user-a", storage), first);
  assert.deepEqual(claimGuestProgress("user-b", storage), []);
  assert.equal(values.get("duojazz-mastery-v1"), JSON.stringify(guest));
});

test("failed migration ownership write preserves guest progress without importing it", () => {
  const guest = JSON.stringify(recordQuizPass(emptyMastery(), "master-lick", "C"));
  const storage = { getItem: key => key === "duojazz-mastery-v1" ? guest : null, setItem() { throw new Error("full"); } };
  assert.deepEqual(claimGuestProgress("user-a", storage), []);
});

test("confirmation redirects keep the app path and strip auth state and tokens", () => {
  assert.equal(authReturnUrl("https://example.com/DuoJazz/?auth=signup&code=secret#token"), "https://example.com/DuoJazz/");
});

test("initials use email name segments without exposing the email in the header", () => {
  assert.equal(accountInitials("brian.lichliter"), "BL");
  assert.equal(accountInitials("Alex Rivera"), "AR");
});

test("device progress merges without losing passes or inflating medals", () => {
  const first = recordQuizPass(emptyMastery(), "master-lick", "C");
  const second = recordQuizPass(emptyMastery(), "master-lick", "G");
  const rows = progressRows(second, "user-a");
  const merged = mergeProgress(first, rows);
  assert.equal(merged.modules.cmar.masteredKeys.length, 2);
  assert.deepEqual(mergeProgress(merged, rows), merged);
  assert.equal(merged.modules.cmar.medal, "bronze");
});

test("Learn credit does not become Master credit", () => {
  const source = recordLearnPass(emptyMastery(), "learn-lick", "C");
  const merged = mergeProgress(emptyMastery(), progressRows(source, "user-a"));
  assert.equal(merged.modules.cmar.masteredKeys.length, 0);
  assert.equal(merged.lessons["learn-lick"].learnedKeys.length, 1);
});

test("guest and account caches remain separate", () => {
  const original = globalThis.localStorage;
  const values = new Map();
  globalThis.localStorage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  try {
    setMasteryAccount(null);
    saveMastery(recordQuizPass(emptyMastery(), "master-lick", "C"));
    setMasteryAccount("user-a");
    assert.equal(loadMastery().masteredKeys.length, 0);
    saveMastery(recordQuizPass(emptyMastery(), "master-lick", "G"));
    setMasteryAccount("user-b");
    assert.equal(loadMastery().masteredKeys.length, 0);
    setMasteryAccount(null);
    assert.equal(loadMastery().masteredKeys.length, 1);
  } finally { globalThis.localStorage = original; setMasteryAccount(null); }
});

test("Google requests identity scopes only, without offline access", () => {
  assert.deepEqual(googleOptions("https://example.com/DuoJazz/"), {
    provider: "google", options: { scopes: "openid email profile", redirectTo: "https://example.com/DuoJazz/" },
  });
});
