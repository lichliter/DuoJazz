/**
 * Module medals from graded Quiz passes.
 * A key is mastered when Quiz is passed in Learn the lick and in at least one
 * integration lesson in that key. Progress is monotonic.
 */

import { LESSONS, TWELVE_KEY_IDS, normalizeKeyId } from "./session.js";

export const MASTERY_KEY = "duojazz-mastery-v1";

export function emptyMastery() {
  return {
    lessons: Object.fromEntries(LESSONS.map((lesson) => [lesson.id, { passedKeys: [] }])),
    masteredKeys: [],
    medal: "none",
  };
}

export function normalizeMastery(raw) {
  const base = emptyMastery();
  if (!raw || typeof raw !== "object") return base;
  for (const lesson of LESSONS) {
    const passed = (raw.lessons?.[lesson.id]?.passedKeys ?? []).map(normalizeKeyId);
    base.lessons[lesson.id].passedKeys = [...new Set(passed)];
  }
  base.masteredKeys = [...new Set((raw.masteredKeys ?? []).map(normalizeKeyId))];
  base.medal = medalForCount(base.masteredKeys.length);
  return reconcileMastery(base);
}

export function medalForCount(count) {
  if (count >= 12) return "gold";
  if (count >= 6) return "silver";
  if (count >= 1) return "bronze";
  return "none";
}

export function displayMedal(medal) {
  if (medal === "gold") return "Gold";
  if (medal === "silver") return "Silver";
  if (medal === "bronze") return "Bronze";
  return "No medal";
}

/** Home badge sub-label. Empty when none so the round badge shows only 0/12. */
export function homeMedalMark(count, medal) {
  return count ? displayMedal(medal) : "";
}

export function isKeyMastered(mastery, keyId) {
  const id = normalizeKeyId(keyId);
  const learn = mastery.lessons["learn-lick"]?.passedKeys.includes(id);
  const integrate = LESSONS
    .filter((lesson) => lesson.kind === "integrate")
    .some((lesson) => mastery.lessons[lesson.id]?.passedKeys.includes(id));
  return Boolean(learn && integrate);
}

export function reconcileMastery(mastery) {
  const next = {
    lessons: Object.fromEntries(
      LESSONS.map((lesson) => [
        lesson.id,
        { passedKeys: [...(mastery.lessons[lesson.id]?.passedKeys ?? [])] },
      ]),
    ),
    masteredKeys: [...(mastery.masteredKeys ?? [])],
    medal: mastery.medal ?? "none",
  };
  for (const keyId of TWELVE_KEY_IDS) {
    if (isKeyMastered(next, keyId) && !next.masteredKeys.includes(keyId)) {
      next.masteredKeys.push(keyId);
    }
  }
  const earned = medalForCount(next.masteredKeys.length);
  const order = { none: 0, bronze: 1, silver: 2, gold: 3 };
  next.medal = order[earned] > (order[next.medal] ?? 0) ? earned : next.medal;
  return next;
}

export function recordQuizPass(mastery, lessonId, keyId) {
  const next = normalizeMastery(mastery);
  const lesson = next.lessons[lessonId];
  if (!lesson) return next;
  const id = normalizeKeyId(keyId);
  if (!lesson.passedKeys.includes(id)) lesson.passedKeys.push(id);
  const previousMedal = next.medal;
  const previousCount = next.masteredKeys.length;
  const reconciled = reconcileMastery(next);
  return {
    ...reconciled,
    upgraded: orderValue(reconciled.medal) > orderValue(previousMedal),
    previousMedal,
    previousCount,
    newlyMastered: reconciled.masteredKeys.length > previousCount,
  };
}

function orderValue(medal) {
  return { none: 0, bronze: 1, silver: 2, gold: 3 }[medal] ?? 0;
}

export function lessonPassedKeys(mastery, lessonId) {
  return [...(normalizeMastery(mastery).lessons[lessonId]?.passedKeys ?? [])];
}

export function lessonPassedCount(mastery, lessonId) {
  return lessonPassedKeys(mastery, lessonId).length;
}

export function loadMastery() {
  try {
    return normalizeMastery(JSON.parse(localStorage.getItem(MASTERY_KEY) ?? "null"));
  } catch {
    return emptyMastery();
  }
}

export function saveMastery(mastery) {
  localStorage.setItem(MASTERY_KEY, JSON.stringify(normalizeMastery(mastery)));
}
