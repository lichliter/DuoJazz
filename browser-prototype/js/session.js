/**
 * Focused module → setup → session → wrap-up flow for the browser prototype.
 * Cards map onto the existing lesson.js practice engine (audio + notation).
 * Cards complete with optional grade fields; medal progress lives in medals.js.
 */

import {
  DEFAULT_KEY_ID,
  getKey,
  applicationContext,
  minorSpelling,
} from "./music.js";
import {
  defaultState,
  presentation,
  audioConfigFor,
  primaryAction,
  livePrompt,
  chartCopy,
} from "./lesson.js";

export const PREFS_KEY = "duojazz-focused-session-v1";

export const MODULE = {
  id: "cry-me-a-river",
  name: "Cry Me a River",
  lickName: "Cry Me a River cell",
  tune: "Autumn Leaves · opening eight bars",
};

/** Twelve unique concert minor tonics, flat-side enharmonics. */
export const TWELVE_KEY_IDS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

export const KEY_MODES = [
  { id: "one", label: "One key" },
  { id: "fourths", label: "Cycle 4ths" },
  { id: "chromatic", label: "Chromatic" },
  { id: "random", label: "Random" },
];

export const CARD_SETS = [
  { id: "all", label: "All cards" },
  { id: "listen-quiz", label: "Listen + Quiz" },
];

export const CARD_ORDER = ["learn", "play", "listen", "quiz"];
export const GRADED_CARD_IDS = new Set(["play", "listen", "quiz"]);

export const CARDS = {
  learn: { id: "learn", label: "Learn", kicker: "LEARN" },
  play: { id: "play", label: "Play", kicker: "PLAY" },
  listen: { id: "listen", label: "Listen", kicker: "LISTEN" },
  quiz: { id: "quiz", label: "Quiz", kicker: "QUIZ" },
};

export const LESSONS = [
  {
    id: "learn-lick",
    kind: "learn",
    applicationId: "minor-home",
    title: "Learn the lick",
    summary: "Hear, play, and recall the Cry Me a River cell in one key.",
  },
  {
    id: "integrate-minor-home",
    kind: "integrate",
    applicationId: "minor-home",
    title: "Integrate: minor home",
    summary: "Land the cell on the i6 arrival (bar 7 of Autumn Leaves).",
  },
  {
    id: "integrate-altered-dominant",
    kind: "integrate",
    applicationId: "altered-dominant",
    title: "Integrate: altered dominant",
    summary: "Bring the same cell in over V7 (bar 6), then resolve.",
  },
];

export function lessonById(id) {
  return LESSONS.find((lesson) => lesson.id === id) ?? LESSONS[0];
}

export function keyModeById(id) {
  return KEY_MODES.find((mode) => mode.id === id) ?? KEY_MODES[0];
}

export function cardsFor(cardSet) {
  return cardSet === "listen-quiz" ? ["listen", "quiz"] : [...CARD_ORDER];
}

export function normalizeKeyId(id) {
  return TWELVE_KEY_IDS.includes(id) ? id : DEFAULT_KEY_ID;
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

/** Chromatic by pitch class, spelled with flats. */
export function chromaticOrder() {
  return [...TWELVE_KEY_IDS];
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

/** After a full lap: random reshuffles; other cycles repeat the same order. */
export function nextLapQueue(mode, previousQueue, rng = Math.random) {
  if (mode === "one") return [...previousQueue];
  if (mode !== "random") return [...previousQueue];
  const last = previousQueue[previousQueue.length - 1];
  const next = shuffleInPlace([...TWELVE_KEY_IDS], rng);
  if (next[0] === last && next.length > 1) {
    const swapWith = next.findIndex((id, index) => index > 0 && id !== last);
    if (swapWith > 0) [next[0], next[swapWith]] = [next[swapWith], next[0]];
  }
  return next;
}

export function defaultLessonPref() {
  return {
    keyMode: "one",
    startKeyId: DEFAULT_KEY_ID,
    cardSet: "all",
    tempo: 96,
    melodyRegister: 0,
  };
}

export function defaultPrefs() {
  return {
    displayMode: "concert",
    clef: "bass",
    swing: true,
    metronome: false,
    guideTones: true,
    lessons: Object.fromEntries(LESSONS.map((lesson) => [lesson.id, defaultLessonPref()])),
    progress: {},
  };
}

export function normalizePrefs(raw) {
  const base = defaultPrefs();
  const merged = { ...base, ...(raw ?? {}) };
  merged.displayMode = merged.displayMode === "bb-written" ? "bb-written" : "concert";
  merged.clef = merged.clef === "treble" ? "treble" : "bass";
  merged.swing = Boolean(merged.swing);
  merged.metronome = Boolean(merged.metronome);
  merged.guideTones = merged.guideTones !== false;
  merged.lessons = { ...base.lessons };
  for (const lesson of LESSONS) {
    const incoming = raw?.lessons?.[lesson.id] ?? {};
    merged.lessons[lesson.id] = {
      ...defaultLessonPref(),
      ...incoming,
      keyMode: KEY_MODES.some((mode) => mode.id === incoming.keyMode) ? incoming.keyMode : "one",
      startKeyId: normalizeKeyId(incoming.startKeyId),
      cardSet: incoming.cardSet === "listen-quiz" ? "listen-quiz" : "all",
      tempo: Math.min(160, Math.max(60, Number(incoming.tempo) || 96)),
      melodyRegister: incoming.melodyRegister === -1 || incoming.melodyRegister === 1
        ? incoming.melodyRegister
        : 0,
    };
  }
  merged.progress = raw?.progress && typeof raw.progress === "object" ? raw.progress : {};
  return merged;
}

export function recommendedLessonId(prefs) {
  const progress = normalizePrefs(prefs).progress;
  const unfinished = LESSONS.find((lesson) => !progress[lesson.id]?.started);
  return unfinished?.id ?? LESSONS[0].id;
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

export function createSession({
  lessonId = "learn-lick",
  keyMode = "one",
  startKeyId = DEFAULT_KEY_ID,
  cardSet = "all",
  tempo = 96,
  melodyRegister = 0,
  displayMode = "concert",
  clef = "bass",
  swing = true,
  metronome = false,
  guideTones = true,
  rng = Math.random,
} = {}) {
  const lesson = lessonById(lessonId);
  const cards = cardsFor(cardSet);
  const keyQueue = buildKeyQueue(keyMode, startKeyId, rng);
  return {
    screen: "session",
    lessonId: lesson.id,
    keyMode: keyModeById(keyMode).id,
    startKeyId: normalizeKeyId(startKeyId),
    cardSet: cardSet === "listen-quiz" ? "listen-quiz" : "all",
    cards,
    cardIndex: 0,
    keyQueue,
    keyIndex: 0,
    lap: 1,
    listenStage: "hear",
    cardResults: [],
    tempo,
    melodyRegister,
    displayMode,
    clef,
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
  if (card === "listen" && session.listenStage === "hear" && !hasTake) return false;
  return true;
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

export function persistLessonMelodyRegister(prefs, lessonId, register) {
  const next = normalizePrefs(prefs);
  const id = lessonById(lessonId).id;
  next.lessons[id] = {
    ...next.lessons[id],
    melodyRegister: register === -1 || register === 1 ? register : 0,
  };
  return next;
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

export function handlePlaybackEnded(session, result = {}) {
  if (session.screen !== "session") {
    return { session, autoStart: false };
  }
  if (currentCard(session) === "listen" && session.listenStage === "hear") {
    return { session: { ...session, listenStage: "echo" }, autoStart: true };
  }
  return { session: completeCard(session, result), autoStart: false };
}

export function skipCard(session) {
  return completeCard(session, skipResult(session));
}

export function repeatKey(session) {
  return {
    ...session,
    screen: "session",
    cardIndex: 0,
    listenStage: "hear",
    cardResults: [],
  };
}

export function hasNextKey(session) {
  return session.keyMode !== "one";
}

export function advanceKey(session, rng = Math.random) {
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
  const card = currentCard(session);
  const isolated = lesson.kind === "learn";
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

  if (isolated) {
    if (card === "play" || (card === "listen" && session.listenStage === "echo")) {
      return { ...base, goal: "learn", cellMode: "echo" };
    }
    if (card === "quiz") {
      return { ...base, goal: "check", checkKind: "recall", revealed: false };
    }
    return { ...base, goal: "learn", cellMode: "hear" };
  }

  if (card === "play") return { ...base, goal: "integrate", support: "help" };
  if (card === "listen") {
    return session.listenStage === "echo"
      ? { ...base, goal: "integrate", support: "free" }
      : { ...base, goal: "integrate", support: "listen" };
  }
  if (card === "quiz") {
    return { ...base, goal: "check", checkKind: "application", revealed: false };
  }
  return { ...base, goal: "integrate", support: "listen" };
}

export function sessionPresentation(session) {
  const lesson = lessonById(session.lessonId);
  const card = currentCard(session);
  const view = presentation(practiceStateFor(session));
  const isolated = lesson.kind === "learn";
  const hideMelody = card === "listen" || card === "quiz";

  if (!hideMelody) {
    if (!isolated && card === "play") {
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
    return { ...view, looping: false, hideStaff: false, showLandingNotation: false };
  }

  return {
    ...view,
    looping: false,
    showPhraseNotation: false,
    showModelNotation: false,
    showSlashNotation: !isolated,
    showLandingNotation: false,
    showEntranceCues: false,
    hideStaff: isolated,
    hideAnswers: card === "quiz",
  };
}

export function sessionAudioConfig(session) {
  return audioConfigFor(practiceStateFor(session));
}

export function sessionPrimaryAction(session, playback) {
  return primaryAction(practiceStateFor(session), playback);
}

export function sessionChartCopy(session) {
  const lesson = lessonById(session.lessonId);
  const card = currentCard(session);
  const ctx = applicationContext(
    getKey(currentKeyId(session)),
    session.displayMode,
    lesson.applicationId,
  );
  if (lesson.kind === "learn") {
    if (card === "learn") return { title: "Cry Me a River cell", meta: `${ctx.cellName} · hear it` };
    if (card === "play") return { title: "Your turn on the cell", meta: `${ctx.cellName} · with notation` };
    if (card === "listen") {
      return {
        title: session.listenStage === "echo" ? "Play it back by ear" : "Listen, then play it back",
        meta: ctx.cellName,
      };
    }
    return { title: "From memory", meta: ctx.cellName };
  }
  if (card === "learn") return { title: "Hear it in the changes", meta: `Autumn Leaves · ${ctx.tuneName} · 8 bars` };
  if (card === "play") return { title: "Play it in the form", meta: ctx.placement };
  if (card === "listen") {
    return {
      title: session.listenStage === "echo" ? "Play it back by ear" : "Hear it, then play it back",
      meta: ctx.shapeOver,
    };
  }
  return { title: "Bring it in cold", meta: `Autumn Leaves · ${ctx.tuneName}` };
}

export function sessionCue(session, snap = {}) {
  const lesson = lessonById(session.lessonId);
  const card = currentCard(session);
  const ctx = applicationContext(
    getKey(currentKeyId(session)),
    session.displayMode,
    lesson.applicationId,
  );
  const playing = Boolean(snap.playing || snap.paused);
  if (playing) return livePrompt(practiceStateFor(session), snap);

  if (lesson.kind === "learn") {
    if (card === "learn") return `Hear the cell in ${ctx.cellName}.`;
    if (card === "play") return "Play the cell. The staff is there if you need it.";
    if (card === "listen") {
      return session.listenStage === "echo"
        ? "Your turn. Play the cell by ear."
        : "Listen first. The staff stays hidden.";
    }
    return "Cold recall. No staff, no model.";
  }
  if (card === "learn") return `Hear the phrase land in bar ${ctx.enterBar} on ${ctx.targetChord}.`;
  if (card === "play") return `Get ready in bar ${ctx.readyBar}. Bring the phrase in bar ${ctx.enterBar}.`;
  if (card === "listen") {
    return session.listenStage === "echo"
      ? "Your turn. Play it back by ear over the changes."
      : "Listen to the model. No lick notation — chords only.";
  }
  return `Chords and a prompt only. Bring the lick in at the right bar.`;
}

export function sessionMeterExtras(session) {
  return ["1-bar count-in", session.swing ? "Swing on" : "Swing off"].join(" · ");
}

export function keyStripIds() {
  return [...TWELVE_KEY_IDS];
}

export function displayKeyName(keyId, displayMode = "concert") {
  return minorSpelling(getKey(keyId)).name;
}

export function peekNextKeyId(session) {
  if (!hasNextKey(session)) return null;
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
  const keyName = displayKeyName(currentKeyId(session), session.displayMode);
  const nextId = peekNextKeyId(session);
  return {
    kicker: "Key complete",
    heading: keyName,
    detail: lessonById(session.lessonId).title,
    nextKeyName: nextId ? displayKeyName(nextId, session.displayMode) : (hasNextKey(session) ? "Next lap" : null),
    nextKeyLabel: nextId
      ? `Next key · ${displayKeyName(nextId, session.displayMode)}`
      : (hasNextKey(session) ? "Next lap" : null),
    results: session.cards.map((cardId) => {
      const row = session.cardResults.find((item) => item.cardId === cardId) ?? { outcome: "completed" };
      const result = {
        cardId,
        label: CARDS[cardId].label,
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
