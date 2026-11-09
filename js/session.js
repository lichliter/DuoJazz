/**
 * Focused module → setup → session → wrap-up flow for the web app.
 * Cards map onto the existing lesson.js practice engine (audio + notation).
 * Cards complete with optional grade fields; medal progress lives in medals.js.
 */

import {
  DEFAULT_KEY_ID,
  getKey,
  applicationContext,
  formForApplication,
  displayKey,
  applicationKeyQuality,
  phraseMeasureCount,
  wrapPc,
  chordSymbolName,
} from "./music.js";
import {
  DEFAULT_INSTRUMENT_ID,
  instrumentOrDefault,
  migrateInstrumentId,
} from "./instruments.js";
import {
  LESSONS,
  MODULES,
  TUNE_SECTION,
  TUNE_LESSONS,
  lessonById as registryLesson,
  moduleForLesson,
  moduleById,
} from "./registry.js";

export { LESSONS, MODULES, TUNE_SECTION, TUNE_LESSONS, moduleForLesson, moduleById };
import {
  defaultState,
  presentation,
  audioConfigFor,
  primaryAction,
  livePrompt,
  chartCopy,
} from "./lesson.js";

export const PREFS_KEY = "duojazz-focused-session-v2";
export const LEGACY_PREFS_KEY = "duojazz-focused-session-v1";
export const HEADPHONES_TIP_KEY = "duojazz.headphonesTipSeen";

export const MODULE = {
  id: MODULES[0].id,
  name: MODULES[0].name,
  lickName: MODULES[0].name,
  tune: "Autumn Leaves · opening eight bars",
};

/** Twelve concert pitch classes, flat-side enharmonics. Settings store these as major keys. */
export const TWELVE_KEY_IDS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

export const KEY_MODES = [
  { id: "one", label: "One key" },
  { id: "fourths", label: "Cycle 4ths" },
  { id: "chromatic", label: "Chromatic" },
  { id: "random", label: "Random" },
];

/** Cycle types for Master the lick. One-key lessons do not use this. */
export const CYCLE_MODES = [
  { id: "fourths", label: "4ths" },
  { id: "chromatic", label: "Descending chromatic" },
  { id: "random", label: "Random" },
];

export function cycleModeId(mode) {
  return CYCLE_MODES.some((item) => item.id === mode) ? mode : "fourths";
}

export function cycleModeLabel(mode) {
  const id = cycleModeId(mode);
  if (id === "chromatic") return "Chromatic";
  if (id === "random") return "Random";
  return "4ths";
}

export function isIsolatedLesson(lesson) {
  return lesson?.kind === "learn" || lesson?.kind === "master";
}

/** Tune and integration lessons are ungraded play-along. */
export function isPracticeLesson(lessonOrId) {
  const lesson = typeof lessonOrId === "string" ? lessonById(lessonOrId) : lessonOrId;
  return lesson?.kind === "integrate";
}

export function lessonKeyTarget(lesson) {
  return lesson?.kind === "master" && !lesson.chartId ? 12 : 1;
}

export function sessionShowsCycle(session) {
  if (!session) return false;
  if (lessonById(session.lessonId).kind !== "master") return false;
  return (session.keyQueue?.length ?? 0) > 1;
}

export function lessonKeyQuality(lesson) {
  return applicationKeyQuality(lesson.applicationId);
}

/**
 * Learn uses the resolved lick key, once.
 * Master walks the chosen keys from the starting key, in cycle order.
 * All keys uses the full cycle. A custom set keeps that order and drops the rest.
 * The stored preference is a major key; each lick takes its relative tonic.
 * Tune and integration lessons use the lesson's own key, once.
 */
export function lessonSessionPlan(lessonId, prefs) {
  const lesson = lessonById(lessonId);
  const stored = normalizePrefs(prefs);
  if (lesson.chordTones) return {
    keyMode: lesson.kind === 'master' && !lesson.chartId ? cycleModeId(stored.keyMode) : 'one',
    startKeyId: lesson.chartId ? lesson.defaultKeyId : stored.startKeyId,
    majorKeyId: null,
    keyIds: lesson.kind === 'master' && !lesson.chartId && !stored.allKeys ? practiceMajorKeyIds(stored) : null,
  };
  if (lesson.kind === "master" || lesson.kind === "learn") {
    return {
      keyMode: lesson.kind === "master" ? cycleModeId(stored.keyMode) : "one",
      majorKeyId: stored.startKeyId,
      startKeyId: resolveLickKeyId(stored.startKeyId, lessonKeyQuality(lesson)),
      keyIds: lesson.kind === "master" && stored.allKeys === false
        ? practiceMajorKeyIds(stored)
        : null,
    };
  }
  return {
    keyMode: "one",
    startKeyId: lesson.defaultKeyId ?? stored.startKeyId,
    majorKeyId: null,
    keyIds: null,
  };
}

/**
 * Home and createAndShow share this. Master always uses the selected cycle
 * and the default key, even when the caller omits a key mode.
 * An explicit startKeyId is a lick tonic and skips major-key mapping.
 */
export function sessionCreateArgs(lessonId, prefs, options = {}) {
  const lesson = lessonById(lessonId);
  const plan = lessonSessionPlan(lesson.id, prefs);
  if (lesson.kind === "master" || lesson.kind === "learn") {
    const lickOverride = options.startKeyId != null && options.startKeyId !== plan.startKeyId;
    return {
      lessonId: lesson.id,
      keyMode: options.keyMode ?? plan.keyMode,
      startKeyId: options.startKeyId ?? plan.startKeyId,
      majorKeyId: lickOverride ? null : (options.majorKeyId ?? plan.majorKeyId),
      keyIds: lickOverride ? null : (options.keyIds ?? plan.keyIds ?? null),
    };
  }
  return {
    lessonId: lesson.id,
    keyMode: options.keyMode ?? plan.keyMode,
    startKeyId: options.startKeyId ?? plan.startKeyId,
    keyIds: null,
  };
}

export function normalizeStudyMode(mode) {
  return mode === "practice" ? "practice" : "learn";
}

export function moduleStudyMode(prefs, moduleId) {
  return normalizeStudyMode(prefs?.modules?.[moduleId]?.studyMode);
}

export function setModuleStudyMode(prefs, moduleId, mode) {
  const next = normalizePrefs(prefs);
  const module = MODULES.find((item) => item.id === moduleId) ?? moduleForLesson(moduleId);
  const id = module?.id ?? moduleId;
  next.modules[id] = {
    ...(next.modules[id] ?? {}),
    studyMode: normalizeStudyMode(mode),
  };
  return next;
}

export function setSessionStudyMode(session, mode) {
  if (!session) return session;
  return { ...session, studyMode: normalizeStudyMode(mode), demo: false };
}

export const CARD_ORDER = ["learn", "play", "listen", "quiz"];
export const GRADED_CARD_IDS = new Set(["play", "listen", "quiz"]);

export const CARDS = {
  learn: { id: "learn", label: "Learn", kicker: "LEARN" },
  play: { id: "play", label: "Play", kicker: "PLAY" },
  listen: { id: "listen", label: "Listen", kicker: "LISTEN" },
  quiz: { id: "quiz", label: "Quiz", kicker: "QUIZ" },
};

export const LEARN_CARDS = ["learn", "play", "quiz"];

export function isLearnLesson(lessonId) {
  return lessonById(lessonId).kind === "learn";
}

export function cardLabel(cardId, lessonId) {
  if (lessonId && isLearnLesson(lessonId)) {
    if (cardId === "learn") return "Hear it";
    if (cardId === "play") return "Play it";
    if (cardId === "quiz") return "Play it from memory";
  }
  return CARDS[cardId]?.label ?? cardId;
}

export function cardKicker(cardId, lessonId) {
  if (lessonId && isLearnLesson(lessonId)) {
    if (cardId === "learn") return "HEAR";
    if (cardId === "play") return "PLAY";
    if (cardId === "quiz") return "MEMORY";
  }
  return CARDS[cardId]?.kicker ?? cardId;
}

export function sessionScreenTitle(session) {
  const lesson = lessonById(session.lessonId);
  if (lesson.chordTones) return chordSymbolName(getKey(currentKeyId(session)), 0, lesson.chordQuality, session.displayMode, sessionKeyQuality(session));
  if (isPracticeLesson(lesson)) {
    const form = formForApplication(lesson.applicationId);
    return form.shortTitle ?? form.title;
  }
  return displayKeyName(currentKeyId(session), session.displayMode, sessionKeyQuality(session));
}

/** Session heading. Both modes say Play. The mode stays off this screen. */
export function sessionModeHeading(_session) {
  return "Play";
}

/**
 * Learn and Master engrave the same lick. Master covers the whole staff card
 * with a blur until Show notes. Tune lessons keep the written notes up.
 */
export function sessionEngraveSpec(session) {
  const lesson = lessonById(session.lessonId);
  const view = sessionPresentation(session);
  const memory = false;
  const phrase = isIsolatedLesson(lesson);
  let mei = "landing";
  if (phrase) mei = "phrase";
  else if (!memory && view.showModelNotation) mei = "model";
  else if (!memory && view.showSlashNotation && !view.showLandingNotation) mei = "slash";
  const showEntranceCues = phrase
    ? false
    : memory
      ? true
      : Boolean(view.showEntranceCues);
  return {
    memory,
    showPhraseNotation: phrase,
    showEntranceCues,
    phraseBars: phrase ? phraseMeasureCount(lesson.applicationId) : undefined,
    mei,
  };
}

export const PATH_ALIGNS = ["left", "center", "right"];

/**
 * Per-lesson vinyl color from keys passed in that lesson.
 * Black 0, bronze 1–5, silver 6–11, gold 12.
 */
export function vinylTier(count) {
  if (count >= 12) return "gold";
  if (count >= 6) return "silver";
  if (count >= 1) return "bronze";
  return "black";
}

export function sleeveCaption(context, passedCount, total = 12) {
  if (!passedCount) return context;
  if (total <= 1) return `${context} · passed`;
  return `${context} · ${passedCount}/${total} keys`;
}

export function lessonVinylTier(lesson, count) {
  if (lessonKeyTarget(lesson) <= 1) return count >= 1 ? "gold" : "black";
  return vinylTier(count);
}

export function lessonById(id) {
  return registryLesson(id);
}

export function lessonSleeve(lessonId) {
  return lessonById(lessonId).sleeve;
}

/**
 * Duolingo-style path node for the module home. Visual only — lessons stay unlocked.
 */
function numberedPath(lessons) {
  let graded = 0;
  return lessons.map((lesson, index) => {
    const practice = isPracticeLesson(lesson);
    const number = practice ? "Practice" : String(graded + 1).padStart(2, "0");
    if (!practice) graded += 1;
    return { lesson, index, number };
  });
}

export function lessonPathNode(lesson, index, { recommendedId, passedKeys = [], number } = {}) {
  const practice = isPracticeLesson(lesson);
  const passed = practice ? [] : [...new Set(passedKeys)];
  const passedCount = passed.length;
  const keyTarget = lessonKeyTarget(lesson);
  const tier = practice ? "black" : lessonVinylTier(lesson, passedCount);
  return {
    id: lesson.id,
    index,
    number: number ?? (practice ? "Practice" : String(index + 1).padStart(2, "0")),
    title: lesson.title,
    coverTitle: lesson.coverTitle,
    summary: lesson.summary,
    context: lesson.context,
    caption: practice ? (lesson.context ?? "") : sleeveCaption(lesson.context, passedCount, keyTarget),
    sleeve: lesson.sleeve,
    align: PATH_ALIGNS[index % PATH_ALIGNS.length],
    recommended: lesson.id === recommendedId,
    complete: !practice && passedCount >= keyTarget,
    practice,
    keyTarget,
    passedCount,
    passedKeys: passed,
    vinylTier: tier,
    group: lesson.group ?? "standards",
    tuneId: lesson.tuneId ?? null,
  };
}

function pathNodesFor(lessons, moduleFields, recommendedId, lessonKeys) {
  return numberedPath(lessons).map(({ lesson, index, number }) => lessonPathNode({
    ...lesson,
    ...moduleFields,
  }, index, {
    recommendedId,
    passedKeys: lessonKeys[lesson.id] ?? [],
    number,
  }));
}

export function tunePathNodes(prefs, lessonKeys = {}) {
  const recommendedId = recommendedLessonId(lessonKeys);
  return pathNodesFor(TUNE_SECTION.lessons, {
    moduleId: TUNE_SECTION.id,
    moduleName: TUNE_SECTION.name,
  }, recommendedId, lessonKeys);
}

export function modulePathNodes(module, prefs, lessonKeys = {}) {
  const recommendedId = recommendedLessonId(lessonKeys);
  return pathNodesFor(module.lessons, {
    moduleId: module.id,
    moduleName: module.name,
  }, recommendedId, lessonKeys);
}

/** Road nodes for a module home: hides Your tunes lessons. Learn and Master keep 01, 02. */
export function moduleRoadNodes(module, prefs, lessonKeys = {}) {
  const visible = module.lessons.filter((lesson) => lesson.group !== "your-tunes");
  const unfinished = visible.find((lesson) => !lessonIsComplete(lessonKeys, lesson.id));
  const recommendedId = unfinished?.id ?? null;
  return pathNodesFor(visible, {
    moduleId: module.id,
    moduleName: module.name,
  }, recommendedId, lessonKeys);
}

export function lessonPathNodes(prefs, lessonKeys = {}) {
  return MODULES.flatMap((module) => modulePathNodes(module, prefs, lessonKeys));
}

export function keyModeById(id) {
  return KEY_MODES.find((mode) => mode.id === id) ?? KEY_MODES[0];
}

/** One play-along card. Learn vs Practice is a mode, not a stack of cards. */
export function cardsFor() {
  return ["play"];
}

export function normalizeKeyId(id) {
  return TWELVE_KEY_IDS.includes(id) ? id : DEFAULT_KEY_ID;
}

export function keyIdForPc(pc) {
  const wrapped = wrapPc(pc);
  return TWELVE_KEY_IDS.find((id) => getKey(id).pc === wrapped) ?? DEFAULT_KEY_ID;
}

/** Relative minor is a minor third below the major tonic. */
export function relativeMinorId(majorId) {
  return keyIdForPc(getKey(normalizeKeyId(majorId)).pc - 3);
}

/** Relative major is a minor third above the minor tonic. Stored G becomes B♭. */
export function relativeMajorId(minorId) {
  return keyIdForPc(getKey(normalizeKeyId(minorId)).pc + 3);
}

/**
 * Settings store a major key. A major lick stays on that tonic.
 * A minor lick moves to the relative minor.
 */
export function resolveLickKeyId(majorId, quality = "minor") {
  const major = normalizeKeyId(majorId);
  return quality === "major" ? major : relativeMinorId(major);
}

/**
 * Prefs saved before major-key settings stored the minor-lick tonic
 * (G meant G minor). Keep that lick by saving its relative major.
 * keyBasis "major" means the value is already the chosen major key.
 */
export function migrateMajorKeyId(raw) {
  const fresh = relativeMajorId(DEFAULT_KEY_ID);
  if (!raw || typeof raw !== "object") return fresh;
  if (raw.keyBasis === "major") return normalizeKeyId(raw.startKeyId ?? fresh);
  const stored = raw.startKeyId ?? raw.lessons?.["learn-lick"]?.startKeyId ?? DEFAULT_KEY_ID;
  return relativeMajorId(stored);
}

export function shuffleInPlace(items, rng = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function rotateTo(ids, startKeyId) {
  const start = normalizeKeyId(startKeyId);
  const index = ids.indexOf(start);
  if (index <= 0) return [...ids];
  return [...ids.slice(index), ...ids.slice(0, index)];
}

/** Chromatic down a half step, spelled with flats. C, B, B♭, A, A♭, … */
export function chromaticOrder() {
  const byPc = new Map(TWELVE_KEY_IDS.map((id) => [getKey(id).pc, id]));
  const order = [];
  let pc = 0;
  for (let i = 0; i < 12; i += 1) {
    order.push(byPc.get(pc) ?? TWELVE_KEY_IDS[0]);
    pc = (pc + 11) % 12;
  }
  return order;
}

/** Circle of fourths (up 5 semitones), spelled with flats. */
export function fourthsOrder() {
  const byPc = new Map(TWELVE_KEY_IDS.map((id) => [getKey(id).pc, id]));
  const order = [];
  let pc = 0;
  for (let i = 0; i < 12; i += 1) {
    order.push(byPc.get(pc) ?? TWELVE_KEY_IDS[0]);
    pc = (pc + 5) % 12;
  }
  return order;
}

/**
 * Build one lap of keys.
 * Random: start key first, then the other 11 shuffled with no repeats.
 */
export function buildKeyQueue(mode, startKeyId, rng = Math.random) {
  const start = normalizeKeyId(startKeyId);
  if (mode === "one") return [start];
  if (mode === "chromatic") return rotateTo(chromaticOrder(), start);
  if (mode === "fourths") return rotateTo(fourthsOrder(), start);
  const rest = TWELVE_KEY_IDS.filter((id) => id !== start);
  return [start, ...shuffleInPlace(rest, rng)];
}

/** Keep valid major-key ids. An empty list falls back to the starting key. */
export function normalizeSelectedKeyIds(ids, fallbackId) {
  const picked = [];
  if (Array.isArray(ids)) {
    for (const id of ids) {
      if (!TWELVE_KEY_IDS.includes(id) || picked.includes(id)) continue;
      picked.push(id);
    }
  }
  if (picked.length) return picked;
  return [normalizeKeyId(fallbackId)];
}

/** Major keys Master will visit. All twelve while the all-keys toggle is on. */
export function practiceMajorKeyIds(prefs) {
  const start = normalizeKeyId(prefs?.startKeyId);
  if (prefs?.allKeys !== false) return [...TWELVE_KEY_IDS];
  const picked = normalizeSelectedKeyIds(prefs?.selectedKeyIds, start);
  return picked.includes(start) ? picked : [start, ...picked];
}

/**
 * Cycle order limited to the chosen major keys.
 * The starting key is always included and comes first.
 */
export function selectedMajorQueue(mode, startKeyId, keyIds, rng = Math.random) {
  const start = normalizeKeyId(startKeyId);
  const picked = normalizeSelectedKeyIds(keyIds, start);
  const allowed = picked.includes(start) ? picked : [start, ...picked];
  if (allowed.length >= TWELVE_KEY_IDS.length) return buildKeyQueue(mode, start, rng);
  if (mode === "random") {
    const rest = allowed.filter((id) => id !== start);
    return [start, ...shuffleInPlace(rest, rng)];
  }
  const cycleMode = mode === "one" ? "fourths" : mode;
  const queue = buildKeyQueue(cycleMode, start).filter((id) => allowed.includes(id));
  return queue.length ? queue : [start];
}

/**
 * Cycle the major-key list, then map each step to the lick's relative key.
 * A major lick keeps the major tonics. A minor lick takes the relative minors.
 * keyIds limits the lap to that major-key set.
 */
export function lickKeyQueue(mode, majorKeyId, quality = "minor", rng = Math.random, keyIds = null) {
  const majors = Array.isArray(keyIds)
    ? selectedMajorQueue(mode, majorKeyId, keyIds, rng)
    : buildKeyQueue(mode, majorKeyId, rng);
  return majors.map((id) => resolveLickKeyId(id, quality));
}

/**
 * Setup-sheet preview of one lap. Random stays shuffled.
 * Names follow the instrument's written spelling.
 * keyIds limits the preview to that set.
 */
export function keyOrderPreview(mode, startKeyId, displayMode = "concert", keyIds = null) {
  if (mode === "random") return "Shuffled";
  const queue = Array.isArray(keyIds)
    ? selectedMajorQueue(mode, startKeyId, keyIds)
    : buildKeyQueue(mode, startKeyId);
  const names = queue.map((id) => displayKey(getKey(id), displayMode, "major").name.replace(/ major$/, ""));
  if (mode === "one" || queue.length === 1) return names[0] ?? "";
  return names.join(" · ");
}

/** After a full lap: random reshuffles; other cycles repeat the same order. */
export function nextLapQueue(mode, previousQueue, rng = Math.random) {
  if (mode === "one") return [...previousQueue];
  if (mode !== "random") return [...previousQueue];
  const last = previousQueue[previousQueue.length - 1];
  const pool = previousQueue.length === TWELVE_KEY_IDS.length
    ? [...TWELVE_KEY_IDS]
    : [...previousQueue];
  const next = shuffleInPlace(pool, rng);
  if (next[0] === last && next.length > 1) {
    const swapWith = next.findIndex((id, index) => index > 0 && id !== last);
    if (swapWith > 0) [next[0], next[swapWith]] = [next[swapWith], next[0]];
  }
  return next;
}

export function defaultLessonPref(lessonId) {
  const lesson = lessonId ? lessonById(lessonId) : null;
  return {
    keyMode: "one",
    startKeyId: lesson?.defaultKeyId ?? DEFAULT_KEY_ID,
    cardSet: "all",
    tempo: 96,
    melodyRegister: 0,
  };
}

export function defaultPrefs() {
  const instrument = instrumentOrDefault(DEFAULT_INSTRUMENT_ID);
  return {
    instrumentId: instrument.id,
    displayMode: instrument.id,
    clef: instrument.clef,
    swing: true,
    metronome: false,
    guideTones: true,
    keyMode: "fourths",
    keyBasis: "major",
    startKeyId: relativeMajorId(DEFAULT_KEY_ID),
    allKeys: true,
    selectedKeyIds: [relativeMajorId(DEFAULT_KEY_ID)],
    cardSet: "all",
    tempo: 96,
    auto: true,
    headphonesTipSeen: false,
    lessons: Object.fromEntries(LESSONS.map((lesson) => [lesson.id, defaultLessonPref(lesson.id)])),
    progress: {},
  };
}

// Account settings always store concert major keys; legacy conversion belongs
// only to the old browser-preferences import path.
export function normalizeAccountPrefs(values) {
  return normalizePrefs({ ...values, keyBasis: "major" });
}

export function normalizePrefs(raw) {
  const base = defaultPrefs();
  const merged = { ...base, ...(raw ?? {}) };
  const instrument = instrumentOrDefault(migrateInstrumentId(raw ?? {}));
  merged.instrumentId = instrument.id;
  merged.displayMode = instrument.id;
  merged.clef = instrument.clef;
  merged.swing = Boolean(merged.swing);
  merged.metronome = Boolean(merged.metronome);
  merged.guideTones = merged.guideTones !== false;
  const seed = raw?.lessons?.["learn-lick"] ?? {};
  merged.keyMode = cycleModeId(raw?.keyMode ?? seed.keyMode);
  merged.keyBasis = "major";
  merged.startKeyId = migrateMajorKeyId(raw);
  merged.allKeys = raw?.allKeys !== false;
  merged.selectedKeyIds = normalizeSelectedKeyIds(raw?.selectedKeyIds, merged.startKeyId);
  merged.cardSet = "all";
  merged.tempo = Math.min(160, Math.max(60, Number(raw?.tempo ?? seed.tempo) || 96));
  merged.auto = raw?.auto !== false;
  merged.headphonesTipSeen = Boolean(raw?.headphonesTipSeen)
    || raw?.headphonesTipSeen === "1"
    || raw?.headphonesTipSeen === "true";
  merged.lessons = { ...base.lessons };
  for (const lesson of LESSONS) {
    const incoming = raw?.lessons?.[lesson.id] ?? {};
    merged.lessons[lesson.id] = {
      ...defaultLessonPref(lesson.id),
      ...incoming,
      keyMode: KEY_MODES.some((mode) => mode.id === incoming.keyMode) ? incoming.keyMode : "one",
      startKeyId: normalizeKeyId(incoming.startKeyId ?? defaultLessonPref(lesson.id).startKeyId),
      cardSet: "all",
      tempo: Math.min(160, Math.max(60, Number(incoming.tempo) || 96)),
      melodyRegister: incoming.melodyRegister === -1 || incoming.melodyRegister === 1
        ? incoming.melodyRegister
        : 0,
    };
  }
  merged.progress = raw?.progress && typeof raw.progress === "object" ? raw.progress : {};
  merged.modules = {};
  for (const module of MODULES) {
    const incoming = raw?.modules?.[module.id] ?? {};
    merged.modules[module.id] = {
      studyMode: normalizeStudyMode(incoming.studyMode),
    };
  }
  return merged;
}

export function setAllKeys(prefs, allKeys) {
  const next = normalizePrefs(prefs);
  next.allKeys = Boolean(allKeys);
  if (!next.allKeys && !next.selectedKeyIds.includes(next.startKeyId)) {
    next.selectedKeyIds = [next.startKeyId, ...next.selectedKeyIds];
  }
  return next;
}

export function setStartKey(prefs, keyId) {
  if (!TWELVE_KEY_IDS.includes(keyId)) return normalizePrefs(prefs);
  const next = normalizePrefs(prefs);
  next.startKeyId = keyId;
  if (!next.allKeys && !next.selectedKeyIds.includes(keyId)) {
    next.selectedKeyIds = [keyId, ...next.selectedKeyIds];
  }
  return next;
}

/** Add or remove one major key. The last remaining key stays selected. */
export function toggleSelectedKey(prefs, keyId) {
  if (!TWELVE_KEY_IDS.includes(keyId)) return normalizePrefs(prefs);
  const next = normalizePrefs(prefs);
  next.allKeys = false;
  const picked = practiceMajorKeyIds(next);
  if (picked.includes(keyId)) {
    const ordered = selectedMajorQueue(next.keyMode, next.startKeyId, picked);
    const rest = ordered.filter((id) => id !== keyId);
    if (!rest.length) return next;
    next.selectedKeyIds = rest;
    if (next.startKeyId === keyId) next.startKeyId = rest[0];
    return next;
  }
  next.selectedKeyIds = [...picked, keyId];
  return next;
}

export function headphonesTipIsDismissed(prefs, storageValue) {
  return Boolean(prefs?.headphonesTipSeen) || storageValue === "1" || storageValue === "true";
}

export function dismissHeadphonesTip(prefs) {
  const next = normalizePrefs(prefs);
  next.headphonesTipSeen = true;
  return next;
}

/**
 * First lesson that is not finished. Master needs 12 keys; every other lesson needs one.
 * Null when every lesson is complete.
 */
export function recommendedLessonId(lessonKeys = {}) {
  const unfinished = MODULES.flatMap(module => module.lessons).find((lesson) => !isPracticeLesson(lesson) && !lessonIsComplete(lessonKeys, lesson.id));
  return unfinished?.id ?? null;
}

export function currentCard(session) {
  return session.cards[session.cardIndex] ?? session.cards[0];
}

export function currentKeyId(session) {
  return session.keyQueue[session.keyIndex] ?? session.startKeyId;
}

export function keyOrdinal(session) {
  return {
    index: session.keyIndex + 1,
    total: session.keyQueue.length,
  };
}

/** Remember a pass or skip on the current key of this cycle. */
export function markKeyOutcome(session, outcome) {
  if (!session) return session;
  const total = session.keyQueue?.length ?? 0;
  const marks = Array.isArray(session.keyMarks) ? session.keyMarks.slice(0, total) : [];
  while (marks.length < total) marks.push(null);
  const status = outcome === "skipped" ? "skipped" : "passed";
  if (session.keyIndex >= 0 && session.keyIndex < total) marks[session.keyIndex] = status;
  if (session.sequence) {
    const sequenceMarks = [...(session.sequenceMarks ?? [])];
    sequenceMarks[session.sequenceIndex] = status;
    return { ...session, keyMarks: marks, sequenceMarks };
  }
  return { ...session, keyMarks: marks };
}

/**
 * One state per key in the current cycle.
 * The key on screen is current. Earlier keys are passed or skipped.
 * The rest are upcoming. A new lap starts empty.
 */
export function keyCycleStates(session) {
  if (!session) return [];
  const total = session.keyQueue?.length ?? 0;
  const marks = Array.isArray(session.keyMarks) ? session.keyMarks : [];
  const onSession = session.screen === "session";
  return Array.from({ length: total }, (_, index) => {
    if (onSession && index === session.keyIndex) return "current";
    const mark = marks[index];
    if (mark === "passed" || mark === "skipped") return mark;
    return "upcoming";
  });
}

export function createSession({
  lessonId = "learn-lick",
  keyMode = "one",
  startKeyId = DEFAULT_KEY_ID,
  majorKeyId = null,
  tempo = 96,
  melodyRegister = 0,
  instrumentId = DEFAULT_INSTRUMENT_ID,
  displayMode,
  clef,
  swing = true,
  metronome = false,
  guideTones = true,
  studyMode = "learn",
  keyIds = null,
  rng = Math.random,
} = {}) {
  const lesson = lessonById(lessonId);
  const cards = cardsFor();
  const resolvedMode = lesson.kind === "master" && !lesson.chartId ? cycleModeId(keyMode) : keyModeById(keyMode).id;
  const useMajor = Boolean(majorKeyId) && (lesson.kind === "learn" || lesson.kind === "master");
  const subset = lesson.kind === "master" && Array.isArray(keyIds) ? keyIds : null;
  const keyQueue = useMajor
    ? lickKeyQueue(resolvedMode, majorKeyId, applicationKeyQuality(lesson.applicationId), rng, subset)
    : subset ? selectedMajorQueue(resolvedMode, startKeyId, subset, rng) : buildKeyQueue(resolvedMode, startKeyId, rng);
  const resolvedStart = normalizeKeyId(keyQueue[0] ?? startKeyId);
  const instrument = instrumentOrDefault(instrumentId);
  return {
    screen: "session",
    lessonId: lesson.id,
    keyMode: resolvedMode,
    startKeyId: resolvedStart,
    cardSet: "all",
    studyMode: normalizeStudyMode(studyMode),
    demo: false,
    cards,
    cardIndex: 0,
    keyQueue,
    keyIndex: 0,
    lap: 1,
    listenStage: "hear",
    cardResults: [],
    keyMarks: [],
    tempo,
    melodyRegister,
    instrumentId: instrument.id,
    displayMode: displayMode ?? instrument.id,
    clef: clef ?? instrument.clef,
    swing,
    metronome,
    guideTones,
  };
}

export function isGradedCard(cardId) {
  return GRADED_CARD_IDS.has(cardId);
}

export function shouldGradeNow(session, { hasTake = false } = {}) {
  const card = currentCard(session);
  if (!isGradedCard(card)) return false;
  if (!hasTake) return false;
  return true;
}

export function sessionSlot(session) {
  if (!session) return "";
  return [
    session.lessonId,
    session.keyIndex,
    session.cardIndex,
    currentCard(session),
    session.listenStage,
    session.screen,
  ].join(":");
}

export function skipResult(session) {
  const cardId = currentCard(session);
  if (!isGradedCard(cardId)) return { outcome: "completed" };
  return { outcome: "skipped", graded: false, passed: false };
}

export function cardResultLabel(row) {
  if (row.outcome === "skipped") return "Skipped";
  if (row.graded) {
    const bits = [`${row.percent ?? 0}%`, row.passed ? "pass" : "miss"];
    if (row.correction && !row.passed) bits.push(row.correction);
    return bits.join(" · ");
  }
  return "Completed";
}

export function setMelodyRegister(session, register) {
  const melodyRegister = register === -1 || register === 1 ? register : 0;
  return { ...session, melodyRegister };
}

export function setInstrument(session, instrumentId) {
  const instrument = instrumentOrDefault(instrumentId);
  return {
    ...session,
    instrumentId: instrument.id,
    displayMode: instrument.id,
    clef: instrument.clef,
  };
}

export function persistLessonMelodyRegister(prefs, lessonId, register) {
  const next = normalizePrefs(prefs);
  const id = lessonById(lessonId).id;
  next.lessons[id] = {
    ...next.lessons[id],
    melodyRegister: register === -1 || register === 1 ? register : 0,
  };
  return next;
}

export function lessonsSharingTempo(lessonId) {
  const lesson = lessonById(lessonId);
  if (!lesson.tuneId) return [lesson.id];
  return LESSONS.filter((item) => item.tuneId === lesson.tuneId).map((item) => item.id);
}

export function persistLessonTempo(prefs, lessonId, tempo) {
  const next = normalizePrefs(prefs);
  const bpm = Math.min(160, Math.max(60, Number(tempo) || 96));
  next.tempo = bpm;
  for (const id of lessonsSharingTempo(lessonId)) {
    next.lessons[id] = { ...next.lessons[id], tempo: bpm };
  }
  return next;
}

export function settingsSummary(prefs) {
  const p = normalizePrefs(prefs);
  const instrument = instrumentOrDefault(p.instrumentId);
  return `${instrument.label} · ${p.tempo} bpm · 1-bar`;
}

export function settingsSummaryShort(prefs) {
  const p = normalizePrefs(prefs);
  const instrument = instrumentOrDefault(p.instrumentId);
  const cycle = `Cycle: ${cycleModeLabel(p.keyMode)}`;
  const keyName = displayKey(getKey(p.startKeyId), p.displayMode, "major").name;
  const chosen = practiceMajorKeyIds(p);
  if (p.allKeys || chosen.length >= TWELVE_KEY_IDS.length) {
    return `${instrument.label} · ${p.tempo} bpm · ${keyName} · ${cycle}`;
  }
  if (p.keyMode === "random" || chosen.length > 4) {
    return `${instrument.label} · ${p.tempo} bpm · ${chosen.length} keys · ${cycle}`;
  }
  const names = selectedMajorQueue(p.keyMode, p.startKeyId, chosen)
    .map((id) => displayKey(getKey(id), p.displayMode, "major").shortName);
  return `${instrument.label} · ${p.tempo} bpm · ${names.join(" · ")} · ${cycle}`;
}

export function visibleModuleLessons(module) {
  return (module.lessons ?? []).filter((lesson) => lesson.group !== "your-tunes");
}

export function lessonIsComplete(lessonKeys, lessonId) {
  const lesson = lessonById(lessonId);
  if (isPracticeLesson(lesson)) return true;
  return [...new Set(lessonKeys?.[lessonId] ?? [])].length >= lessonKeyTarget(lesson);
}

export function moduleLessonsComplete(module, lessonKeys = {}) {
  const visible = visibleModuleLessons(module);
  return visible.length > 0 && visible.every((lesson) => lessonIsComplete(lessonKeys, lesson.id));
}

export function isLastVisibleLesson(lessonId) {
  const module = moduleForLesson(lessonId);
  const graded = visibleModuleLessons(module).filter((lesson) => !isPracticeLesson(lesson));
  return graded.at(-1)?.id === lessonId;
}

export function nextModuleTarget(module) {
  const index = MODULES.findIndex((item) => item.id === module?.id);
  const wrap = index < 0 || index >= MODULES.length - 1;
  const next = wrap ? MODULES[0] : MODULES[index + 1];
  const prefix = wrap ? "Back to" : "Next:";
  return {
    type: "module",
    id: next.id,
    number: next.number,
    name: next.name,
    label: `${prefix} Module ${next.number} · ${next.name}`,
  };
}

/** Wrap-up CTA after the last road lesson of a module. Same destination as the home road-end button. */
export function wrapupNextModule(session) {
  if (!session || session.sequence || !isLastVisibleLesson(session.lessonId)) return null;
  return nextModuleTarget(moduleForLesson(session.lessonId));
}

/** Module-home road-end CTA. Always shown, finished or not. */
export function homeNextModule(module, _lessonKeys = {}) {
  return nextModuleTarget(module);
}

export function completeCard(session, result = {}) {
  const cardId = currentCard(session);
  const cardResults = [
    ...session.cardResults.filter((row) => row.cardId !== cardId),
    { cardId, outcome: result.outcome ?? "completed", ...result },
  ];
  if (session.cardIndex + 1 < session.cards.length) {
    return {
      ...session,
      screen: "session",
      cardIndex: session.cardIndex + 1,
      listenStage: "hear",
      cardResults,
    };
  }
  return {
    ...session,
    screen: "wrapup",
    listenStage: "hear",
    cardResults,
  };
}

/**
 * Count-in → play → grade → next key, with no extra tap.
 * A Hear it demo ends back on the same key. The last key opens wrap-up.
 */
export function handlePlaybackEnded(session, result = {}, rng = Math.random) {
  if (!session || session.screen !== "session") {
    return { session, autoStart: false };
  }
  if (session.demo) {
    return { session: { ...session, demo: false }, autoStart: false };
  }
  const recorded = {
    ...session,
    demo: false,
    cardResults: [
      {
        cardId: currentCard(session),
        outcome: result.outcome ?? "completed",
        ...result,
      },
    ],
  };
  const moreKeys = session.keyMode !== "one" && session.keyIndex + 1 < session.keyQueue.length;
  if (moreKeys) {
    return { session: advanceKey(recorded, rng), autoStart: true };
  }
  return { session: { ...recorded, screen: "wrapup" }, autoStart: false };
}

/**
 * Skip this key. The result is Skipped, never a pass.
 * Another key in the cycle opens immediately. The last key, and a one-key
 * session, open wrap-up with that skip recorded.
 */
export function skipCard(session) {
  if (!session) return session;
  const marked = markKeyOutcome(session, "skipped");
  const cardId = currentCard(marked);
  const recorded = {
    ...marked,
    demo: false,
    cardResults: [
      ...marked.cardResults.filter((row) => row.cardId !== cardId),
      { cardId, ...skipResult(marked) },
    ],
  };
  const moreKeys = session.sequence
    ? session.sequenceIndex + 1 < session.sequence.length
    : session.keyMode !== "one" && session.keyIndex + 1 < session.keyQueue.length;
  if (!moreKeys) {
    return { ...recorded, screen: "wrapup", listenStage: "hear" };
  }
  return advanceKey(recorded);
}

export function resultForCard(session, cardId = currentCard(session)) {
  return session.cardResults.find((row) => row.cardId === cardId) ?? null;
}

export function canGoBack(session) {
  return Boolean(session && session.screen === "session" && session.cardIndex > 0);
}

export function canGoNext(session) {
  return Boolean(
    session
    && session.screen === "session"
    && session.cardIndex + 1 < session.cards.length,
  );
}

export function sessionProgress(session) {
  if (session.sequence) return { index: session.sequenceIndex + 1, total: session.sequence.length, ratio: session.sequenceIndex / session.sequence.length };
  const perKey = Math.max(1, session.cards.length);
  const keys = Math.max(1, session.keyQueue.length);
  const total = perKey * keys;
  const done = session.keyIndex * perKey + session.cardIndex;
  return { index: done + 1, total, ratio: total ? done / total : 0 };
}

export function cardCounter(session) {
  const progress = sessionProgress(session);
  return { index: progress.index, total: progress.total };
}

/**
 * Result to store when leaving the current card.
 * A new take replaces any previous grade. No take keeps the last result,
 * or Skipped (graded cards) / Completed (Learn) when there is none.
 */
export function leaveCardOutcome(session, { hasTake = false, takeResult = null } = {}) {
  if (hasTake && takeResult) {
    return { ...takeResult, cardId: currentCard(session) };
  }
  const existing = resultForCard(session);
  if (existing) return existing;
  const skipped = skipResult(session);
  return { cardId: currentCard(session), ...skipped };
}

function withCardResult(session, result) {
  const cardId = result.cardId ?? currentCard(session);
  return {
    ...session,
    cardResults: [
      ...session.cardResults.filter((row) => row.cardId !== cardId),
      { ...result, cardId },
    ],
  };
}

function navigationHalt() {
  return { stopAudio: true, stopCountIn: true, stopMic: true };
}

/**
 * Move one card without wrapping up. Always asks the UI to halt audio,
 * the count-in, and the mic. No-ops at the first/last card.
 */
export function moveCard(session, delta, leave = {}) {
  const halt = navigationHalt();
  if (!session || session.screen !== "session" || !delta) {
    return { session, moved: false, ...halt, stopAudio: false, stopCountIn: false, stopMic: false };
  }
  const nextIndex = session.cardIndex + delta;
  if (nextIndex < 0 || nextIndex >= session.cards.length) {
    return { session, moved: false, stopAudio: false, stopCountIn: false, stopMic: false };
  }
  const left = withCardResult(session, leaveCardOutcome(session, leave));
  return {
    session: {
      ...left,
      screen: "session",
      cardIndex: nextIndex,
      listenStage: "hear",
    },
    moved: true,
    ...halt,
  };
}

export function goBack(session, leave = {}) {
  return moveCard(session, -1, leave);
}

export function goNext(session, leave = {}) {
  return moveCard(session, 1, leave);
}

/** Mark unfinished cards Skipped/Completed when abandoning a session. */
export function skipRemainingCards(session) {
  if (!session) return session;
  let cardResults = [...session.cardResults];
  for (const [index, cardId] of session.cards.entries()) {
    if (cardResults.some((row) => row.cardId === cardId)) continue;
    if (index < session.cardIndex) continue;
    const ghost = { ...session, cardIndex: index };
    cardResults.push({ cardId, ...skipResult(ghost) });
  }
  return { ...session, cardResults };
}

export function quickViewData(lessonKeys = {}, masteredByModule = {}) {
  const modules = MODULES.map((module) => {
    const mastered = masteredByModule[module.id];
    const keysMastered = Array.isArray(mastered)
      ? mastered.length
      : Number(mastered ?? 0);
    return {
      id: module.id,
      number: module.number,
      name: module.name,
      lickName: module.name,
      keysMastered,
      records: modulePathNodes(module, {}, lessonKeys).map((node) => ({
        id: node.id,
        number: node.number,
        title: node.title,
        coverTitle: node.coverTitle,
        context: node.context,
        keysPassed: node.passedCount,
      })),
    };
  });
  return [
    ...modules,
    {
      id: TUNE_SECTION.id,
      number: null,
      name: TUNE_SECTION.name,
      lickName: TUNE_SECTION.name,
      keysMastered: 0,
      records: tunePathNodes({}, lessonKeys).map((node) => ({
        id: node.id,
        number: node.number,
        title: node.title,
        coverTitle: node.coverTitle,
        context: node.context,
        keysPassed: node.passedCount,
      })),
    },
  ];
}

/** Modules sheet rows: modules 1–30 only. Your tunes stay in quickViewData. */
export function modulesSheetData(lessonKeys = {}, masteredByModule = {}) {
  return quickViewData(lessonKeys, masteredByModule).filter((module) => module.id !== TUNE_SECTION.id);
}

export function resolveQuickViewJump(id) {
  if (id === TUNE_SECTION.id) {
    return { type: "module", id: TUNE_SECTION.id, targetId: TUNE_SECTION.id };
  }
  const module = MODULES.find((item) => item.id === id);
  if (module) {
    return { type: "module", id: module.id, targetId: module.id };
  }
  const lesson = LESSONS.find((item) => item.id === id);
  if (!lesson) return null;
  return { type: "lesson", id: lesson.id, moduleId: moduleForLesson(lesson.id).id };
}

export function repeatKey(session) {
  if (session.sequence && session.screen === 'wrapup') {
    const first = session.sequence[0];
    return { ...createSession({ ...session, lessonId: first.lessonId, startKeyId: first.keyId, keyMode: 'one', majorKeyId: null }), sequence: session.sequence, sequenceIndex: 0, sequenceMarks: [] };
  }
  return {
    ...session,
    screen: "session",
    cardIndex: 0,
    listenStage: "hear",
    cardResults: [],
  };
}

export function hasNextKey(session) {
  if (session.sequence) return session.sequenceIndex + 1 < session.sequence.length;
  return session.keyMode !== "one";
}

export function advanceKey(session, rng = Math.random) {
  if (session.sequence && session.sequenceIndex + 1 < session.sequence.length) {
    const sequenceIndex = session.sequenceIndex + 1;
    const item = session.sequence[sequenceIndex];
    return { ...createSession({ ...session, lessonId: item.lessonId, startKeyId: item.keyId, keyMode: 'one', majorKeyId: null }), sequence: session.sequence, sequenceMarks: session.sequenceMarks, sequenceIndex };
  }
  if (session.keyMode === "one") return repeatKey(session);
  if (session.keyIndex + 1 < session.keyQueue.length) {
    return {
      ...session,
      screen: "session",
      keyIndex: session.keyIndex + 1,
      cardIndex: 0,
      listenStage: "hear",
      cardResults: [],
    };
  }
  return {
    ...session,
    screen: "session",
    keyQueue: nextLapQueue(session.keyMode, session.keyQueue, rng),
    keyIndex: 0,
    lap: session.lap + 1,
    cardIndex: 0,
    listenStage: "hear",
    cardResults: [],
    keyMarks: [],
  };
}

export function jumpToCard(session, cardId) {
  const cardIndex = session.cards.indexOf(cardId);
  if (cardIndex < 0) return session;
  return {
    ...session,
    screen: "session",
    cardIndex,
    listenStage: "hear",
  };
}

export function jumpToWrapup(session) {
  return {
    ...session,
    screen: "wrapup",
    cardIndex: Math.max(0, session.cards.length - 1),
    cardResults: session.cards.map((cardId) => ({ cardId, outcome: "completed" })),
  };
}

export function markLessonStarted(prefs, lessonId, keyId) {
  const next = normalizePrefs(prefs);
  next.progress = {
    ...next.progress,
    [lessonId]: {
      started: true,
      lastKeyId: normalizeKeyId(keyId),
    },
  };
  return next;
}

/** Lesson.js-compatible state so audio scheduling and existing tests stay intact. */
export function practiceStateFor(session) {
  const lesson = lessonById(session.lessonId);
  const isolated = isIsolatedLesson(lesson);
  const base = {
    ...defaultState(),
    concertKeyId: currentKeyId(session),
    applicationId: lesson.applicationId,
    tempo: session.tempo,
    melodyRegister: session.melodyRegister,
    displayMode: session.displayMode,
    clef: session.clef,
    swing: session.swing,
    metronome: session.metronome,
    guideTones: session.guideTones,
    looping: false,
  };

  if (session.demo) {
    return isolated
      ? { ...base, goal: "learn", cellMode: "hear" }
      : { ...base, goal: "integrate", support: "listen" };
  }
  return isolated
    ? { ...base, goal: "learn", cellMode: "echo" }
    : { ...base, goal: "integrate", support: "help" };
}

export function sessionPresentation(session) {
  const lesson = lessonById(session.lessonId);
  const view = presentation(practiceStateFor(session));
  const isolated = isIsolatedLesson(lesson);

  if (isolated) {
    return {
      ...view,
      looping: false,
      hideStaff: false,
      showPhraseNotation: true,
      showChordsOnly: false,
      showModelNotation: false,
      showLandingNotation: false,
    };
  }

  if (session.demo) {
    return {
      ...view,
      looping: false,
      hideStaff: false,
      showModelNotation: false,
      showLandingNotation: true,
      showChordsOnly: false,
    };
  }

  return {
    ...view,
    looping: false,
    hideStaff: false,
    showLandingNotation: true,
    showSlashNotation: true,
    showEntranceCues: true,
    showPhraseNotation: false,
    showModelNotation: false,
  };
}

export function sessionAudioConfig(session) {
  return {
    ...audioConfigFor(practiceStateFor(session)),
    // The selected instrument follows the lesson staff, including during demos.
    // Contextual lead-ins and resolutions are not part of that phrase.
    modelScope: "phrase",
  };
}

/**
 * Hear it always plays the lick melody plus the backing.
 * Learn and Practice, and both lesson kinds, use the same demo config.
 */
export function demoAudioConfig(session) {
  const config = sessionAudioConfig({ ...session, demo: true });
  return {
    ...config,
    includeModel: true,
    variationId: "original",
    looping: false,
    duckBacking: true,
  };
}

/**
 * Record plays that same backing and count-in, with the lick muted, and loops
 * until the attempt stops. Grading stays on the note follower.
 */
export function recordBackingConfig(session) {
  const config = demoAudioConfig(session);
  return {
    ...config,
    includeModel: false,
    variationId: "skip",
    includeCue: false,
    includeGuides: false,
    cueGain: 0,
    looping: true,
    duckBacking: false,
  };
}

const BAR_COUNT_WORDS = {
  8: "eight",
  9: "nine",
  12: "twelve",
  16: "sixteen",
  24: "twenty-four",
  32: "thirty-two",
  36: "thirty-six",
};

export function hearBarsLabel(barCount) {
  return `Hear the ${BAR_COUNT_WORDS[barCount] ?? String(barCount)} bars`;
}

export function sessionPrimaryAction(session, playback) {
  const live = primaryAction(practiceStateFor(session), playback);
  if (live.id === "pause" || live.id === "resume" || live.id === "stop") return live;
  if (session.demo) return { id: "start", label: "Hear it" };
  return { id: "start", label: "Count me in" };
}

export function sessionChartCopy(session) {
  const lesson = lessonById(session.lessonId);
  const ctx = applicationContext(
    getKey(currentKeyId(session)),
    session.displayMode,
    lesson.applicationId,
  );
  const formName = ctx.formTitle ?? "the form";
  if (isIsolatedLesson(lesson)) {
    return { title: ctx.lickName ?? "The lick", meta: ctx.tuneName };
  }
  return { title: "Play it in the form", meta: `${formName} · ${ctx.tuneName}` };
}

export function sessionCue(session, snap = {}) {
  const lesson = lessonById(session.lessonId);
  const ctx = applicationContext(
    getKey(currentKeyId(session)),
    session.displayMode,
    lesson.applicationId,
  );
  const playing = Boolean(snap.playing || snap.paused);
  if (playing) return livePrompt(practiceStateFor(session), snap);

  if (lesson.group === "my-tunes" || lesson.group === "your-tunes") {
    return `First spot: bar ${ctx.enterBar}, ${ctx.spotLickName} on ${ctx.targetChord}.`;
  }
  if (isIsolatedLesson(lesson)) {
    const noun = ctx.noun ?? "lick";
    return `Play the ${noun}. The staff is there if you need it.`;
  }
  return `Get ready in bar ${ctx.readyBar}. Bring the phrase in bar ${ctx.enterBar}.`;
}

export function sessionMeterExtras(session) {
  return ["1-bar count-in", session.swing ? "Swing on" : "Swing off"].join(" · ");
}

export function keyStripIds() {
  return [...TWELVE_KEY_IDS];
}

export function displayKeyName(keyId, displayMode = "concert", quality = "minor") {
  return displayKey(getKey(keyId), displayMode, quality).name;
}

export function sessionKeyQuality(session) {
  const lesson = lessonById(session.lessonId);
  return applicationKeyQuality(lesson.applicationId);
}

export function peekNextKeyId(session) {
  if (!hasNextKey(session)) return null;
  if (session.sequence) return session.sequence[session.sequenceIndex + 1].keyId;
  if (session.keyIndex + 1 < session.keyQueue.length) return session.keyQueue[session.keyIndex + 1];
  if (session.keyMode === "random") return null;
  return session.keyQueue[0];
}

export function listenStateCopy(session) {
  const card = currentCard(session);
  if (card !== "listen" && card !== "quiz") return null;
  if (card === "quiz") {
    return {
      kicker: "Quiz",
      detail: "Chords and a prompt. Grading feedback will appear here.",
    };
  }
  if (session.listenStage === "echo") {
    return {
      kicker: "Your turn",
      detail: "Play it back. Grading feedback will appear here.",
    };
  }
  return {
    kicker: "Listening",
    detail: "Hear the model first. Grading feedback will appear here.",
  };
}

export function wrapupCopy(session) {
  if (session.sequence) {
    const passed = session.sequenceMarks?.filter(mark => mark === 'passed').length ?? 0;
    return {
      kicker: 'Chart practice', heading: moduleForLesson(session.lessonId).name,
      detail: `${passed} of ${session.sequence.length} chords passed`,
      nextKeyName: null, nextKeyLabel: null,
      results: session.sequence.map((item, index) => ({
        cardId: item.lessonId,
        label: `${lessonById(item.lessonId).context} · ${sessionScreenTitle({ ...session, lessonId: item.lessonId, keyQueue: [item.keyId], keyIndex: 0 })}`,
        summary: session.sequenceMarks?.[index] === 'passed' ? 'Passed' : 'Skipped',
      })),
    };
  }
  const keyName = displayKeyName(currentKeyId(session), session.displayMode, sessionKeyQuality(session));
  const nextId = peekNextKeyId(session);
  return {
    kicker: "Key complete",
    heading: keyName,
    detail: lessonById(session.lessonId).title,
    nextKeyName: nextId ? displayKeyName(nextId, session.displayMode, sessionKeyQuality(session)) : (hasNextKey(session) ? "Next lap" : null),
    nextKeyLabel: nextId
      ? `Next key · ${displayKeyName(nextId, session.displayMode, sessionKeyQuality(session))}`
      : (hasNextKey(session) ? "Next lap" : null),
    results: session.cards.map((cardId) => {
      const row = session.cardResults.find((item) => item.cardId === cardId) ?? { outcome: "completed" };
      const result = {
        cardId,
        label: cardLabel(cardId, session.lessonId),
        outcome: row.outcome ?? "completed",
        percent: typeof row.percent === "number" ? row.percent : null,
        passed: Boolean(row.passed),
        graded: Boolean(row.graded),
        correction: row.correction ?? null,
      };
      return { ...result, summary: cardResultLabel(result) };
    }),
  };
}

export { chartCopy };
