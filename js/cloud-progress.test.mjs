import test from "node:test";
import assert from "node:assert/strict";
import { progressRows, mergeProgress } from "./cloud-progress.js";
import { emptyMastery, recordQuizPass, recordLearnPass, setMasteryAccount, saveMastery, loadMastery } from "./medals.js";
import { googleOptions } from "./account.js";

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
