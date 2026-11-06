import { normalizeMastery } from "./medals.js";

export function progressRows(mastery, userId) {
  return Object.entries(normalizeMastery(mastery).lessons).flatMap(([lesson_id, lesson]) =>
    ["passedKeys", "learnedKeys"].flatMap(kind => lesson[kind].map(key_id =>
      ({ user_id: userId, lesson_id, key_id, kind }))));
}

export function mergeProgress(mastery, rows) {
  const next = normalizeMastery(mastery);
  for (const { lesson_id, key_id, kind } of rows) {
    const keys = next.lessons[lesson_id]?.[kind];
    if (["passedKeys", "learnedKeys"].includes(kind) && Array.isArray(keys) && !keys.includes(key_id)) keys.push(key_id);
  }
  return normalizeMastery(next);
}
