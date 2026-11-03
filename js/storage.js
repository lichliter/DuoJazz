const failedKeys = new Set();

export function writeStoredJson(key, value, storage = undefined) {
  try {
    const target = storage ?? globalThis.localStorage;
    target.setItem(key, JSON.stringify(value));
    failedKeys.delete(key);
    return true;
  } catch {
    failedKeys.add(key);
    return false;
  }
}

export function storageWarning() {
  return failedKeys.size
    ? "Changes aren't being saved in this browser. You can keep practicing, but progress or settings may be lost when you leave."
    : "";
}
