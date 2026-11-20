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

const VALID_KEY_SET = new Set(TWELVE_KEY_IDS);
const MODULE_MASTER_IDS = new Map(
  MODULES.map((module) => [
    module.id,
    module.lessons.filter((lesson) => lesson.kind === "master").map((lesson) => lesson.id),
  ]),
);

function emptyModuleMastery() {
  const modules = {};
  for (const module of MODULES) modules[module.id] = { masteredKeys: [], medal: "none" };
  return modules;
}

export function emptyMastery() {
  const lessons = {};
  for (const lesson of LESSONS) lessons[lesson.id] = { passedKeys: [], learnedKeys: [] };
  return {
    lessons,
    masteredKeys: [],
    medal: "none",
    modules: emptyModuleMastery(),
  };
}

function reconcileModulesInPlace(target, rawModules = null) {
  const order = { none: 0, bronze: 1, silver: 2, gold: 3 };
  const modules = {};
  for (const module of MODULES) {
    const saved = rawModules?.[module.id];
    const masteredKeys = Array.isArray(saved?.masteredKeys) ? [...saved.masteredKeys] : [];
    const masteredSet = new Set(masteredKeys);
    const masters = MODULE_MASTER_IDS.get(module.id) ?? [];
    if (masters.length) {
      for (const keyId of TWELVE_KEY_IDS) {
        if (masteredSet.has(keyId)) continue;
        let allPassed = true;
        for (const masterId of masters) {
          if (!target.lessons[masterId]?.passedKeys.includes(keyId)) {
            allPassed = false;
            break;
          }
        }
        if (allPassed) {
          masteredKeys.push(keyId);
          masteredSet.add(keyId);
        }
      }
    }
    const earned = medalForCount(masteredKeys.length);
    const savedMedal = saved?.medal ?? "none";
    const medal = order[earned] > (order[savedMedal] ?? 0) ? earned : savedMedal;
    modules[module.id] = { masteredKeys, medal };
  }
  target.modules = modules;
  target.masteredKeys = [...modules.cmar.masteredKeys];
  target.medal = modules.cmar.medal;
  return target;
}

export function normalizeMastery(raw) {
  const base = emptyMastery();
  if (!raw || typeof raw !== "object") return base;
  const rawLessons = raw.lessons;
  if (rawLessons && typeof rawLessons === "object") {
    for (const lesson of LESSONS) {
      const entry = rawLessons[lesson.id];
      if (!entry) continue;
      if (Array.isArray(entry.passedKeys) && entry.passedKeys.length) {
        base.lessons[lesson.id].passedKeys = [...new Set(validKeys(entry.passedKeys))];
      }
      if (Array.isArray(entry.learnedKeys) && entry.learnedKeys.length) {
        base.lessons[lesson.id].learnedKeys = [...new Set(validKeys(entry.learnedKeys))];
      }
    }
  }
  // Old Practice passes lived on the learn lesson. Move them onto Master the lick
  // once. Later saves include master-lick or schema: 2, so Learn passes stay on Learn.
  const legacy = raw.schema !== 2 && !Object.prototype.hasOwnProperty.call(rawLessons ?? {}, "master-lick");
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
  return reconcileModulesInPlace(base);
}

function validKeys(value) {
  return Array.isArray(value) ? value.filter(id => VALID_KEY_SET.has(id)) : [];
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
  const masters = MODULE_MASTER_IDS.get(moduleId) ?? [];
  return masters.length > 0 && masters.every(masterId => mastery.lessons[masterId]?.passedKeys.includes(id));
}

export function reconcileMastery(mastery) {
  const lessons = {};
  for (const lesson of LESSONS) {
    const entry = mastery.lessons?.[lesson.id];
    lessons[lesson.id] = {
      passedKeys: entry?.passedKeys?.length ? [...entry.passedKeys] : [],
      learnedKeys: entry?.learnedKeys?.length ? [...entry.learnedKeys] : [],
    };
  }
  const next = {
    lessons,
    masteredKeys: [...(mastery.masteredKeys ?? [])],
    medal: mastery.medal ?? "none",
    modules: {},
  };
  return reconcileModulesInPlace(next, mastery.modules);
}

/** Sparse serializable snapshot for localStorage; keeps schema marker so legacy migration never reruns. */
export function compactMastery(mastery) {
  const lessons = {};
  for (const [id, lesson] of Object.entries(mastery?.lessons ?? {})) {
    const passed = Array.isArray(lesson?.passedKeys) ? lesson.passedKeys : [];
    const learned = Array.isArray(lesson?.learnedKeys) ? lesson.learnedKeys : [];
    if (passed.length || learned.length) {
      lessons[id] = { passedKeys: passed, learnedKeys: learned };
    }
  }
  const modules = {};
  for (const [id, mod] of Object.entries(mastery?.modules ?? {})) {
    if (mod?.masteredKeys?.length || (mod?.medal && mod.medal !== "none")) {
      modules[id] = { masteredKeys: mod.masteredKeys ?? [], medal: mod.medal ?? "none" };
    }
  }
  return {
    schema: 2,
    lessons,
    masteredKeys: mastery?.masteredKeys ?? [],
    medal: mastery?.medal ?? "none",
    modules,
  };
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
    if (lesson.passedKeys.length > 1) lesson.passedKeys.sort();
    if (lesson.learnedKeys.length > 1) lesson.learnedKeys.sort();
  }
  return next;
}

export function mergeMastery(left, right) {
  const next = normalizeMastery(left), incoming = normalizeMastery(right);
  for (const [id, lesson] of Object.entries(incoming.lessons)) {
    if (lesson.passedKeys.length) {
      next.lessons[id].passedKeys = [...new Set([...next.lessons[id].passedKeys, ...lesson.passedKeys])];
    }
    if (lesson.learnedKeys.length) {
      next.lessons[id].learnedKeys = [...new Set([...next.lessons[id].learnedKeys, ...lesson.learnedKeys])];
    }
  }
  reconcileModulesInPlace(next, next.modules);
  for (const lesson of Object.values(next.lessons)) {
    if (lesson.passedKeys.length > 1) lesson.passedKeys.sort();
    if (lesson.learnedKeys.length > 1) lesson.learnedKeys.sort();
  }
  return next;
}

export function readMasteryFromStorage(key = activeMasteryKey, storage = undefined) {
  let next = emptyMastery();
  let target;
  try { target = storage ?? globalThis.localStorage; } catch { return next; }
  if (!target) return next;
  try { next = normalizeMastery(JSON.parse(target.getItem(key) ?? "null")); } catch {}
  try {
    const prefix = `${key}:earned:`;
    const count = typeof target.length === "number" ? target.length : 0;
    for (let i = 0; i < count; i++) {
      const entry = target.key?.(i);
      if (!entry?.startsWith(prefix)) continue;
      try {
        const row = JSON.parse(target.getItem(entry));
        if (!Array.isArray(row) || row.length !== 3) continue;
        const [id, kind, pitch] = row;
        if ((kind === "passedKeys" || kind === "learnedKeys") && Object.hasOwn(next.lessons, id) && VALID_KEY_SET.has(pitch)) {
          if (!next.lessons[id][kind].includes(pitch)) next.lessons[id][kind].push(pitch);
        }
      } catch { /* Keep reading other earned keys when one record is damaged. */ }
    }
  } catch { /* Retain the snapshot if the append-only journal cannot be read. */ }
  reconcileModulesInPlace(next, next.modules);
  for (const lesson of Object.values(next.lessons)) {
    if (lesson.passedKeys.length > 1) lesson.passedKeys.sort();
    if (lesson.learnedKeys.length > 1) lesson.learnedKeys.sort();
  }
  return next;
}

export function loadMastery(key = activeMasteryKey) {
  return readMasteryFromStorage(key);
}

/** Remove earned-key journal records already confirmed on the server and folded into the snapshot. */
export function pruneMasteryJournal(rows, key = activeMasteryKey, storage = undefined) {
  try {
    const target = storage ?? globalThis.localStorage;
    if (!target || typeof target.removeItem !== "function") return;
    const prefix = `${key}:earned:`;
    for (const row of rows ?? []) {
      const tuple = [row.lesson_id, row.kind, row.key_id];
      const journalKey = prefix + encodeURIComponent(JSON.stringify(tuple));
      target.removeItem(journalKey);
    }
  } catch { /* Safe to leave redundant journal entries if storage is unavailable. */ }
}

export function saveMastery(mastery) {
  const next = mergeMastery(loadMastery(), mastery);
  let journalSaved = true;
  for (const [id, lesson] of Object.entries(next.lessons)) {
    if (!lesson.passedKeys.length && !lesson.learnedKeys.length) continue;
    for (const kind of ["passedKeys", "learnedKeys"]) {
      for (const pitch of lesson[kind]) {
        const row = [id, kind, pitch];
        const serialized = JSON.stringify(row);
        const key = `${activeMasteryKey}:earned:${encodeURIComponent(serialized)}`;
        try { if (localStorage.getItem(key) === serialized) continue; } catch {}
        journalSaved = writeStoredJson(key, row) && journalSaved;
      }
    }
  }
  // Separate immutable earned-key records survive two tabs replacing the
  // snapshot simultaneously. The compact snapshot omits empty lessons.
  const saved = writeStoredJson(activeMasteryKey, compactMastery(next));
  globalThis.dispatchEvent?.(new Event("duojazz-progress-saved"));
  return saved && journalSaved;
}
