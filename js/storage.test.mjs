import test from "node:test";
import assert from "node:assert/strict";
import { storageWarning, writeStoredJson } from "./storage.js";
import { emptyMastery, loadMastery, MASTERY_KEY, saveMastery } from "./medals.js";

test("storage failures stay visible until each failed key is saved", () => {
  const blocked = { setItem() { throw new Error("QuotaExceededError"); } };
  const saved = new Map();
  const working = { setItem(key, value) { saved.set(key, value); } };
  assert.equal(writeStoredJson("mastery-test", { passed: true }, blocked), false);
  assert.match(storageWarning(), /aren't being saved/);
  assert.equal(writeStoredJson("prefs-test", { tempo: 96 }, working), true);
  assert.notEqual(storageWarning(), "");
  assert.equal(writeStoredJson("mastery-test", { passed: true }, working), true);
  assert.equal(storageWarning(), "");
  assert.deepEqual(JSON.parse(saved.get("mastery-test")), { passed: true });
});

test("blocked storage access does not throw on mastery load or save", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  try {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() { throw new Error("SecurityError"); },
    });
    assert.deepEqual(loadMastery(), emptyMastery());
    assert.equal(saveMastery(emptyMastery()), false);
    assert.notEqual(storageWarning(), "");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: { setItem() {} },
    });
    assert.equal(saveMastery(emptyMastery()), true);
    assert.equal(storageWarning(), "");
  } finally {
    writeStoredJson(MASTERY_KEY, emptyMastery(), { setItem() {} });
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  }
});
