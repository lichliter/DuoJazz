import { normalizeMastery, canonicalMastery, MASTERY_KEY } from "./medals.js";

export const GUEST_OWNER_KEY = "duojazz.guestProgressOwner.v1";

// Called under a browser lock. Keep the source intact and claim it before
// importing, so retries are safe and another account never inherits it.
export function claimGuestProgress(userId, storage = undefined) {
  try {
    storage ??= globalThis.localStorage;
    const owner = storage.getItem(GUEST_OWNER_KEY);
    if (owner && owner !== userId) return [];
    const rows = progressRows(JSON.parse(storage.getItem(MASTERY_KEY) ?? "null"), userId);
    if (rows.length && !owner) storage.setItem(GUEST_OWNER_KEY, userId);
    return rows;
  } catch {
    return []; // Preserve the source when it cannot be safely claimed.
  }
}

export function progressRows(mastery, userId) {
  return Object.entries(normalizeMastery(mastery).lessons).flatMap(([lesson_id, lesson]) =>
    ["passedKeys", "learnedKeys"].flatMap(kind => lesson[kind].map(key_id =>
      ({ user_id: userId, lesson_id, key_id, kind }))));
}

export function mergeProgress(mastery, rows) {
  const next = normalizeMastery(mastery);
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row !== 'object') continue;
    const { lesson_id, key_id, kind } = row;
    const keys = next.lessons[lesson_id]?.[kind];
    if (["passedKeys", "learnedKeys"].includes(kind) && Array.isArray(keys) && !keys.includes(key_id)) keys.push(key_id);
  }
  return canonicalMastery(next);
}
