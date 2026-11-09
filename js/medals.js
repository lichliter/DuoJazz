/**
 * Module medals from Master the lick.
 * A key is mastered when it is passed there without revealing the notes.
 * Learn and tune passes complete those lessons and do not fill the 12-key medal.
 * Progress is monotonic.
 */

import { LESSONS, TWELVE_KEY_IDS, normalizeKeyId, moduleForLesson, MODULES } from "./session.js";
import { writeStoredJson } from "./storage.js";

export const MASTERY_KEY = "duojazz-mastery-v1";
let activeMasteryKey = MASTERY_KEY;
export function setMasteryAccount(userId) {
  activeMasteryKey = userId ? `${MASTERY_KEY}:${userId}` : MASTERY_KEY;
}

function emptyModuleMastery() {
  return Object.fromEntries(MODULES.map((module) => [module.id, { masteredKeys: [], medal: "none" }]));
}

export function emptyMastery() {
  return {
    lessons: Object.fromEntries(LESSONS.map((lesson) => [lesson.id, { passedKeys: [], learnedKeys: [] }])),
    masteredKeys: [],
    medal: "none",
    modules: emptyModuleMastery(),
  };
}

export function normalizeMastery(raw) {
  const base = emptyMastery();
  if (!raw || typeof raw !== "object") return base;
  for (const lesson of LESSONS) {
    const passed = validKeys(raw.lessons?.[lesson.id]?.passedKeys);
    const learned = validKeys(raw.lessons?.[lesson.id]?.learnedKeys);
    base.lessons[lesson.id].passedKeys = [...new Set(passed)];
    base.lessons[lesson.id].learnedKeys = [...new Set(learned)];
  }
  // Old Practice passes lived on the learn lesson. Move them onto Master the lick
  // once. A later save includes master-lick, so Learn passes stay on Learn.
  const legacy = !Object.prototype.hasOwnProperty.call(raw.lessons ?? {}, "master-lick");
  if (legacy) {
    for (const module of MODULES) {
      const learn = module.lessons.find((lesson) => lesson.kind === "learn");
      const master = module.lessons.find((lesson) => lesson.kind === "master");
      if (!learn || !master) continue;
      const practice = base.lessons[learn.id]?.passedKeys ?? [];
      const learned = base.lessons[learn.id]?.learnedKeys ?? [];
      const stored = validKeys(raw.modules?.[module.id]?.masteredKeys);
      base.lessons[master.id].passedKeys = [...new Set([
        ...(base.lessons[master.id]?.passedKeys ?? []),
        ...practice,
        ...stored,
      ])];
      base.lessons[learn.id].passedKeys = [...new Set(learned)];
    }
  }
  base.masteredKeys = [...new Set(validKeys(raw.masteredKeys))];
  base.medal = medalForCount(base.masteredKeys.length);
  return reconcileMastery(base);
}

function validKeys(value) {
  return Array.isArray(value) ? value.filter(id => TWELVE_KEY_IDS.includes(id)) : [];
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

export function isKeyMastered(mastery, keyId, moduleId = "cmar") {
  const id = normalizeKeyId(keyId);
  const module = MODULES.find((module) => module.id === moduleId);
  const masters = module?.lessons.filter((lesson) => lesson.kind === "master") ?? [];
  return masters.length > 0 && masters.every(master => mastery.lessons[master.id]?.passedKeys.includes(id));
}

export function reconcileMastery(mastery) {
  const next = {
    lessons: Object.fromEntries(
      LESSONS.map((lesson) => [
        lesson.id,
        {
          passedKeys: [...(mastery.lessons[lesson.id]?.passedKeys ?? [])],
          learnedKeys: [...(mastery.lessons[lesson.id]?.learnedKeys ?? [])],
        },
      ]),
    ),
    masteredKeys: [...(mastery.masteredKeys ?? [])],
    medal: mastery.medal ?? "none",
    modules: emptyModuleMastery(),
  };
  for (const module of MODULES) {
    const saved = mastery.modules?.[module.id] ?? {};
    const moduleState = {
      masteredKeys: [...(saved.masteredKeys ?? [])],
      medal: saved.medal ?? "none",
    };
    for (const keyId of TWELVE_KEY_IDS) {
      if (isKeyMastered(next, keyId, module.id) && !moduleState.masteredKeys.includes(keyId)) {
        moduleState.masteredKeys.push(keyId);
      }
    }
    const earned = medalForCount(moduleState.masteredKeys.length);
    const order = { none: 0, bronze: 1, silver: 2, gold: 3 };
    moduleState.medal = order[earned] > (order[moduleState.medal] ?? 0) ? earned : moduleState.medal;
    next.modules[module.id] = moduleState;
  }
  next.masteredKeys = [...next.modules.cmar.masteredKeys];
  next.medal = next.modules.cmar.medal;
  return next;
}

/** Learn-mode pass. Outlined on the record; does not count toward 12-key mastery. */
export function recordLearnPass(mastery, lessonId, keyId) {
  const next = normalizeMastery(mastery);
  const lesson = next.lessons[lessonId];
  if (!lesson) return next;
  const id = normalizeKeyId(keyId);
  if (!lesson.learnedKeys.includes(id)) lesson.learnedKeys.push(id);
  return reconcileMastery(next);
}

export function lessonLearnedKeys(mastery, lessonId) {
  return [...(normalizeMastery(mastery).lessons[lessonId]?.learnedKeys ?? [])];
}

/** Filled = Practice mastery. Outline = Learn pass only. */
export function moduleRingMarks(mastery, moduleId) {
  return moduleRingMarksFromNormalized(normalizeMastery(mastery), moduleId);
}

/** Reuse a single normalized snapshot when drawing the complete module list. */
export function moduleRingMarksFromNormalized(normalized, moduleId) {
  const module = normalized.modules[moduleId];
  const mastered = new Set(module?.masteredKeys ?? []);
  const outlined = new Set();
  for (const lesson of LESSONS) {
    if (moduleForLesson(lesson.id).id !== moduleId) continue;
    for (const keyId of normalized.lessons[lesson.id]?.learnedKeys ?? []) {
      if (!mastered.has(keyId)) outlined.add(keyId);
    }
  }
  return TWELVE_KEY_IDS.map((id) => ({
    id,
    mark: mastered.has(id) ? "filled" : outlined.has(id) ? "outline" : "none",
  }));
}

export function recordQuizPass(mastery, lessonId, keyId) {
  const next = normalizeMastery(mastery);
  const lesson = next.lessons[lessonId];
  if (!lesson) return next;
  const id = normalizeKeyId(keyId);
  if (!lesson.passedKeys.includes(id)) lesson.passedKeys.push(id);
  const moduleId = moduleForLesson(lessonId).id;
  const previousMedal = next.modules[moduleId]?.medal ?? next.medal;
  const previousCount = next.modules[moduleId]?.masteredKeys.length ?? next.masteredKeys.length;
  const reconciled = reconcileMastery(next);
  const moduleState = reconciled.modules[moduleId];
  if (!moduleState) {
    return {
      ...reconciled,
      upgraded: false,
      previousMedal,
      previousCount,
      newlyMastered: false,
      moduleId,
    };
  }
  return {
    ...reconciled,
    upgraded: orderValue(moduleState.medal) > orderValue(previousMedal),
    previousMedal,
    previousCount,
    newlyMastered: moduleState.masteredKeys.length > previousCount,
    moduleId,
  };
}

export function moduleMastery(mastery, moduleId) {
  const normalized = normalizeMastery(mastery);
  return normalized.modules[moduleId] ?? { masteredKeys: [], medal: "none" };
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

export function canonicalMastery(mastery) {
  const next = normalizeMastery(mastery);
  for (const lesson of Object.values(next.lessons)) {
    lesson.passedKeys.sort();
    lesson.learnedKeys.sort();
  }
  return next;
}

export function mergeMastery(left, right) {
  const next = normalizeMastery(left), incoming = normalizeMastery(right);
  for (const [id, lesson] of Object.entries(incoming.lessons)) {
    for (const kind of ["passedKeys", "learnedKeys"]) {
      next.lessons[id][kind] = [...new Set([...next.lessons[id][kind], ...lesson[kind]])];
    }
  }
  return canonicalMastery(next);
}

export function loadMastery(key = activeMasteryKey) {
  let next = emptyMastery();
  try { next = normalizeMastery(JSON.parse(localStorage.getItem(key) ?? "null")); } catch {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const entry = localStorage.key(i);
      if (!entry?.startsWith(`${key}:earned:`)) continue;
      try {
        const row = JSON.parse(localStorage.getItem(entry));
        if (!Array.isArray(row) || row.length !== 3) continue;
        const [id, kind, pitch] = row;
        if (["passedKeys", "learnedKeys"].includes(kind) && Object.hasOwn(next.lessons, id) && TWELVE_KEY_IDS.includes(pitch)) {
          if (!next.lessons[id][kind].includes(pitch)) next.lessons[id][kind].push(pitch);
        }
      } catch { /* Keep reading other earned keys when one record is damaged. */ }
    }
  } catch { /* Retain the snapshot if the append-only journal cannot be read. */ }
  return canonicalMastery(next);
}

export function saveMastery(mastery) {
  const next = mergeMastery(loadMastery(), mastery);
  let journalSaved = true;
  for (const [id, lesson] of Object.entries(next.lessons)) {
    for (const kind of ["passedKeys", "learnedKeys"]) for (const pitch of lesson[kind]) {
      const row = [id, kind, pitch];
      const key = `${activeMasteryKey}:earned:${encodeURIComponent(JSON.stringify(row))}`;
      try { if (localStorage.getItem(key) === JSON.stringify(row)) continue; } catch {}
      journalSaved = writeStoredJson(key, row) && journalSaved;
    }
  }
  // Separate immutable earned-key records survive two tabs replacing the
  // snapshot simultaneously. The old snapshot schema remains a readable cache.
  const saved = writeStoredJson(activeMasteryKey, next);
  globalThis.dispatchEvent?.(new Event("duojazz-progress-saved"));
  return saved && journalSaved;
}
