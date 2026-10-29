/**
 * Non-linear lesson-1 practice map for the DuoJazz browser prototype.
 * Goals are learner outcomes, not a gated sequence. Listen / Play with help /
 * Play freely are support levels inside integration, independent of application.
 */

import {
  APPLICATIONS,
  BEATS_PER_BAR,
  BARS_PER_CHORUS,
  CELL_BEATS,
  CHORUS_BEATS,
  DEFAULT_APPLICATION_ID,
  DEFAULT_KEY_ID,
  DEFAULT_MELODY_REGISTER,
  applicationById,
  applicationContext,
  chorusChords,
  chordAtBeat,
  cueCaption,
  getKey,
  learnChords,
  lickNoun,
  normalizeMelodyRegister,
  phraseStartBeat,
  supportBlurb,
  learnBeatsFor,
  formBeatsFor,
} from "./music.js";

export const STORAGE_KEY = "duojazz-integration-prototype-v6";

export const GOALS = [
  {
    id: "learn",
    label: "Learn",
    kicker: "Lesson 01 / Cry Me a River",
    heading: "The phrase in this key.",
    question: "What does this phrase sound and feel like here?",
  },
  {
    id: "integrate",
    label: "Use in a solo",
    kicker: "Lesson 01 / Cry Me a River",
    heading: "One phrase. Two ways in.",
    question: "Where and how can I use it without sounding pasted in?",
  },
  {
    id: "keys",
    label: "Explore keys",
    kicker: "Lesson 01 / Cry Me a River",
    heading: "Same idea, another door.",
    question: "Can I hear and find this same idea elsewhere?",
  },
  {
    id: "check",
    label: "Check yourself",
    kicker: "Lesson 01 / Cry Me a River",
    heading: "Your check, not the app’s.",
    question: "Can I retrieve or use it without seeing the answer?",
  },
];

export const SUPPORTS = [
  { id: "listen", label: "Listen", playLabel: "Hear the eight bars" },
  { id: "help", label: "Play with help", playLabel: "Count me in" },
  { id: "free", label: "Play freely", playLabel: "Play a chorus" },
];

export const CHECK_KINDS = [
  { id: "recall", label: "Recall the cell" },
  { id: "application", label: "Use it in the form" },
];

const LEGACY_STEPS = {
  hear: { goal: "integrate", support: "listen" },
  try: { goal: "integrate", support: "help" },
  independent: { goal: "integrate", support: "free" },
  reflect: { goal: "check", support: "free" },
};

function emptyAssessment() {
  return { foundEntrance: "", keptPlaying: "", quoteChoice: "", recall: "" };
}

export function goalById(id) {
  return GOALS.find((goal) => goal.id === id) ?? GOALS[1];
}

export function supportById(id) {
  return SUPPORTS.find((item) => item.id === id) ?? SUPPORTS[0];
}

export function defaultState() {
  return {
    goal: "integrate",
    support: "listen",
    lens: "context",
    cellMode: "hear",
    checkKind: "recall",
    revealed: false,
    applicationId: DEFAULT_APPLICATION_ID,
    concertKeyId: DEFAULT_KEY_ID,
    displayMode: "concert",
    clef: "bass",
    melodyRegister: DEFAULT_MELODY_REGISTER,
    tempo: 96,
    swing: true,
    metronome: false,
    guideTones: true,
    triedKeys: [DEFAULT_KEY_ID],
    assessments: {},
  };
}

export function normalizeState(stateOrGoal) {
  if (typeof stateOrGoal === "string") {
    const legacy = LEGACY_STEPS[stateOrGoal];
    if (legacy) return { ...defaultState(), ...legacy };
    return { ...defaultState(), goal: stateOrGoal };
  }
  const merged = { ...defaultState(), ...stateOrGoal };
  if (LEGACY_STEPS[merged.step]) {
    Object.assign(merged, LEGACY_STEPS[merged.step]);
  }
  merged.goal = GOALS.some((goal) => goal.id === merged.goal) ? merged.goal : "integrate";
  merged.support = SUPPORTS.some((item) => item.id === merged.support) ? merged.support : "listen";
  merged.checkKind = merged.checkKind === "application" ? "application" : "recall";
  merged.lens = merged.lens === "cell" ? "cell" : "context";
  merged.cellMode = merged.cellMode === "echo" ? "echo" : "hear";
  merged.melodyRegister = normalizeMelodyRegister(merged.melodyRegister);
  merged.revealed = Boolean(merged.revealed);
  merged.assessments = merged.assessments ?? {};
  return merged;
}

export function assessmentKey(stateOrGoal) {
  const state = normalizeState(stateOrGoal);
  const kind = state.goal === "check" ? state.checkKind : "application";
  return `${state.applicationId}:${state.concertKeyId}:${kind}`;
}

export function currentAssessment(stateOrGoal) {
  const state = normalizeState(stateOrGoal);
  return state.assessments[assessmentKey(state)] ?? emptyAssessment();
}

export function presentation(stateOrGoal) {
  const state = normalizeState(stateOrGoal);
  const goal = goalById(state.goal);
  const support = supportById(state.support);
  const integrate = state.goal === "integrate";
  const check = state.goal === "check";
  const listen = integrate && support.id === "listen";
  const help = integrate && support.id === "help";
  const free = integrate && support.id === "free";
  const checkRecall = check && state.checkKind === "recall";
  const checkApply = check && state.checkKind === "application";
  const showAnswer = check && state.revealed;
  const hideAnswers = check && !showAnswer;
  const isolated = state.goal === "learn" || state.goal === "keys" || checkRecall;
  const hearCell = isolated && state.cellMode !== "echo" && (!check || showAnswer);

  return {
    goalId: goal.id,
    goal,
    supportId: support.id,
    support,
    applicationId: state.applicationId,
    application: applicationById(state.applicationId),
    lens: isolated ? "cell" : "context",
    cellMode: state.cellMode,
    checkKind: state.checkKind,
    revealed: state.revealed,
    showApplications: true,
    showApplicationPlacement: !hideAnswers,
    showAnswerContext: !hideAnswers,
    showSupportModes: integrate,
    showKeyPicker: state.goal === "keys" || check,
    showCheckSetup: check,
    showPhraseNotation: Boolean(
      state.goal === "learn"
      || state.goal === "keys"
      || (checkRecall && showAnswer),
    ),
    showModelNotation: Boolean(listen),
    showSlashNotation: Boolean(help || free || checkApply),
    showEntranceCues: Boolean(listen || help || (checkApply && showAnswer)),
    showTargetStyling: Boolean(help),
    highlightPhraseLive: Boolean(listen || help),
    includeModel: Boolean(listen || hearCell),
    includeCue: Boolean(help),
    includeGuides: Boolean(help),
    audioStage: isolated ? "learn" : "place",
    lengthBeats: isolated ? learnBeatsFor(state.applicationId) : formBeatsFor(state.applicationId),
    modelScope: listen ? "solo" : "phrase",
    looping: typeof state.looping === "boolean" ? state.looping : Boolean(help || free),
    showMusic: true,
    allowCellLens: integrate,
    showOctave: true,
    showAfterRound: !check,
    hideAnswers,
    chartStartBar: 1,
    chartBarCount: BARS_PER_CHORUS,
  };
}

export function audioConfigFor(stateOrGoal) {
  const state = normalizeState(stateOrGoal);
  const view = presentation(state);
  const includeModel = view.includeModel;
  return {
    concertKey: getKey(state.concertKeyId),
    displayMode: state.displayMode,
    includeModel,
    includeGuides: view.includeGuides && state.guideTones,
    includeClick: state.metronome,
    includeCue: view.includeCue,
    variationId: includeModel ? "original" : "skip",
    stage: view.audioStage,
    tempo: state.tempo,
    swing: state.swing,
    looping: view.looping,
    lengthBeats: view.lengthBeats,
    applicationId: view.applicationId,
    modelScope: view.modelScope,
    cueGain: view.includeCue ? 1 : 0,
    melodyRegister: normalizeMelodyRegister(state.melodyRegister),
  };
}

export function formBars(concertKey, displayMode, applicationId = DEFAULT_APPLICATION_ID) {
  const app = applicationById(applicationId);
  const chords = chorusChords(concertKey, displayMode);
  return Array.from({ length: BARS_PER_CHORUS }, (_, index) => {
    const bar = index + 1;
    const start = index * BEATS_PER_BAR;
    const here = chords.filter(
      (chord) => chord.startBeat >= start && chord.startBeat < start + BEATS_PER_BAR,
    );
    const fallback = chordAtBeat(chords, start);
    let role = "continue";
    if (bar === app.phraseStartBar) role = "phrase";
    else if (bar === app.phraseStartBar + 1) role = "after";
    else if (bar === app.phraseStartBar - 1) role = "setup";
    return {
      bar,
      role,
      names: here.length ? here.map((chord) => chord.name) : fallback ? [fallback.name] : [],
    };
  });
}

export function barCaption(bar, showEntranceLabels, applicationId = DEFAULT_APPLICATION_ID) {
  if (!showEntranceLabels) return "";
  return cueCaption(bar, applicationId);
}

export function chartCopy(stateOrGoal) {
  const state = normalizeState(stateOrGoal);
  const view = presentation(state);
  const ctx = applicationContext(getKey(state.concertKeyId), state.displayMode, state.applicationId);
  const clef = state.clef === "bass" ? "bass clef" : "treble clef";
  if (state.goal === "check" && state.checkKind === "recall") {
    return {
      title: state.revealed ? "Answer · the cell" : "Recall the cell",
      meta: state.revealed ? ctx.cellName : "Hidden until you reveal",
    };
  }
  if (state.goal === "check") {
    return {
      title: state.revealed ? "Answer · the form" : "Use it in the form",
      meta: `${ctx.tuneName} · 8 bars`,
    };
  }
  if (state.goal === "keys") {
    return { title: "Same cell · this key", meta: `${ctx.cellName} · ${clef}` };
  }
  if (state.goal === "learn") {
    const noun = lickNoun(state.applicationId);
    return {
      title: state.cellMode === "echo" ? `Your turn on the ${noun}` : ctx.lickName,
      meta: `${ctx.tuneName} · ${clef}`,
    };
  }
  if (view.supportId === "help") {
    return { title: "Your turn over the changes", meta: `Autumn Leaves · ${ctx.tuneName} · 8 bars` };
  }
  if (view.supportId === "free") {
    return { title: "Your chorus", meta: `Autumn Leaves · ${ctx.tuneName} · 8 bars` };
  }
  return { title: "Hear it in the changes", meta: `Autumn Leaves · ${ctx.tuneName} · 8 bars` };
}

export function instructionCopy(stateOrGoal) {
  const state = normalizeState(stateOrGoal);
  const view = presentation(state);
  const ctx = applicationContext(getKey(state.concertKeyId), state.displayMode, state.applicationId);
  if (state.goal === "learn") {
    const noun = lickNoun(state.applicationId);
    return state.cellMode === "echo"
      ? "Your turn. The band is only a pad."
      : `Hear the ${noun} in ${ctx.tuneName}. Repeat, echo, or change octave.`;
  }
  if (state.goal === "keys") return ctx.keysBlurb;
  if (state.goal === "check") {
    if (!state.revealed) {
      return state.checkKind === "recall"
        ? "Play the cell from memory. Reveal when you want the written answer."
        : "Play a chorus from memory. The written door stays hidden until you reveal it.";
    }
    return state.checkKind === "recall" ? ctx.checkRecallBlurb : ctx.checkApplyBlurb;
  }
  if (view.supportId === "free") return "No required order. Stay a while.";
  if (view.supportId === "listen" || view.supportId === "help") {
    return `Follow the cue on the staff. Get ready in bar ${ctx.readyBar}. Bring the phrase in bar ${ctx.enterBar}.`;
  }
  return ctx.listenBlurb;
}

export function livePrompt(stateOrGoal, snap = {}) {
  const state = normalizeState(stateOrGoal);
  const view = presentation(state);
  const ctx = applicationContext(getKey(state.concertKeyId), state.displayMode, state.applicationId);
  const idle = instructionCopy(state);
  if (!snap.playing && !snap.paused) return idle;
  if (snap.inCountIn || (typeof snap.beats === "number" && snap.beats < 0)) {
    return idle;
  }
  if (view.audioStage === "learn") {
    const noun = lickNoun(state.applicationId);
    return state.cellMode === "echo" ? `Play the ${noun}.` : `Listen to the ${noun}.`;
  }
  if (view.supportId === "free" || (state.goal === "check" && !state.revealed)) {
    return "Your chorus. Quote, vary, or skip.";
  }
  const app = applicationById(state.applicationId);
  if (view.supportId === "listen" || view.showModelNotation) {
    if (snap.bar === app.phraseStartBar) return `There it is — ${ctx.phraseFunctionLabel}.`;
    if (snap.bar < app.phraseStartBar) return "Lead-in. The cell is coming.";
    return app.id === "altered-dominant" ? ctx.resolvePrompt : "Continuation. Still your chorus later.";
  }
  if (view.supportId === "help") {
    const bar = snap.bar;
    const beat = snap.beatInBar;
    if (bar < app.phraseStartBar) {
      return bar === app.phraseStartBar - 1 && beat >= 4
        ? "Ready — phrase on the next downbeat."
        : "Improvise. Watch the staff for the door.";
    }
    if (bar === app.phraseStartBar) return "Play the phrase.";
    return app.id === "altered-dominant" ? ctx.resolvePrompt : "Keep going. Your own line.";
  }
  return idle;
}

export function leaksTargetBar(text) {
  return /\bbar\s+\d+/i.test(text ?? "");
}

export function primaryAction(stateOrGoal, playback = {}) {
  const state = normalizeState(stateOrGoal);
  const view = presentation(state);
  if (playback.playing) return { id: "pause", label: "Pause" };
  if (playback.paused) return { id: "resume", label: "Resume" };
  if (state.goal === "check") {
    return { id: "start", label: "Count me in" };
  }
  if (view.audioStage === "learn") {
    const noun = lickNoun(state.applicationId);
    return {
      id: "start",
      label: state.cellMode === "echo" ? "Count me in" : `Hear the ${noun}`,
    };
  }
  return { id: "start", label: view.support.playLabel };
}

export function currentChord(concertKey, displayMode, stateOrGoal, beats) {
  const state = normalizeState(stateOrGoal);
  const view = presentation(state);
  const chords = view.audioStage === "learn"
    ? learnChords(concertKey, displayMode, view.applicationId)
    : chorusChords(concertKey, displayMode);
  const beat = Math.max(0, beats ?? 0);
  return chordAtBeat(chords, beat) ?? chords[0];
}

export function afterRoundActions(stateOrGoal) {
  const state = normalizeState(stateOrGoal);
  const view = presentation(state);
  const actions = [{ id: "repeat", label: "Repeat" }];
  if (state.goal !== "learn") actions.push({ id: "learn", label: "Work on the phrase" });
  actions.push({ id: "keys", label: "Change key" });
  if (view.supportId === "help") actions.push({ id: "free", label: "Remove help" });
  else if (view.supportId === "free") actions.push({ id: "help", label: "Add help" });
  else if (view.supportId === "listen") actions.push({ id: "help", label: "Try it with help" });
  return actions;
}

/** 5-line staff height in CSS px (top line to bottom line) on landscape and laptop, 1.0×. */
export const STAFF_PX = 40;
/** Slightly larger on a phone so two-bar lines stay readable. */
export const STAFF_PX_NARROW = 46;
/**
 * iPad portrait reading size. About 20% under the previous 74px stand size
 * (~59px, about 12mm on a 12.9" iPad) so notes sit smaller while four bars
 * still share a line. Phone and landscape keep their own staff sizes.
 * Shared by every instrument and by Learn and Practice.
 */
export const PORTRAIT_STAFF_PX = 59;
/** Viewports under this width keep two bars per system. iPad portrait is 1024. */
export const PHONE_WIDTH = 600;
/** Chord cap height as a fraction of staff height (~17px at STAFF_PX, ~25px on iPad portrait). */
export const CHORD_CAP_RATIO = 0.42;

/** One chord size for every instrument at a given staff. Never under 16px. */
export function chordTargetCss(staffPx) {
  const px = Number(staffPx);
  if (!(px > 0)) return 16;
  return Math.max(16, Math.round(px * CHORD_CAP_RATIO));
}
/** Cue labels sit just under the lowest stem, in CSS px at 1.0×. */
export const CUE_PX = 12;

/** Sheet-music 1.0× plus the three larger try-on presets. */
export const NOTATION_SCALE_VALUES = Object.freeze([1, 1.2, 1.4, 1.6]);
export const NOTATION_SCALE_KEY = "duojazz.notationScale.v4";
export const NOTATION_SCALE_LABELS = Object.freeze({
  1: "Sheet music (1.0×)",
  1.2: "1.2×",
  1.4: "1.4×",
  1.6: "1.6×",
});

export function parseNotationScale(value) {
  if (value == null || value === "") return null;
  const raw = String(value).trim();
  if (raw === "1.0" || raw === "1") return 1;
  const n = Number(raw);
  return NOTATION_SCALE_VALUES.includes(n) ? n : null;
}

export function notationScaleFromSearch(search) {
  const query = String(search ?? "").replace(/^\?/, "");
  return parseNotationScale(new URLSearchParams(query).get("notation"));
}

export function readStoredNotationScale(storage) {
  try {
    const store = storage ?? globalThis.localStorage;
    return parseNotationScale(store?.getItem?.(NOTATION_SCALE_KEY));
  } catch {
    return null;
  }
}

export function persistNotationScale(scale, storage) {
  const value = parseNotationScale(scale);
  if (value == null) return null;
  try {
    const store = storage ?? globalThis.localStorage;
    store?.setItem?.(NOTATION_SCALE_KEY, String(value));
  } catch {
    // Safari private mode, Node tests without a store.
  }
  return value;
}

/** URL ?notation= wins and is persisted; otherwise localStorage; otherwise 1.0×. */
export function resolveNotationScale({ search, storage } = {}) {
  const fromUrl = notationScaleFromSearch(
    search ?? (typeof location === "undefined" ? "" : location.search),
  );
  if (fromUrl != null) return persistNotationScale(fromUrl, storage) ?? fromUrl;
  return readStoredNotationScale(storage) ?? 1;
}

export function staffPxForScale(scale = 1, { narrow = false } = {}) {
  const base = narrow ? STAFF_PX_NARROW : STAFF_PX;
  return Math.round(base * (parseNotationScale(scale) ?? 1));
}

/**
 * Two bars on a phone. Everywhere else, four. A hugged paper card must not
 * flip this: the count follows the viewport, not the notation column.
 */
export function isTightNotation(staffWidth = 0, viewportWidth = 0) {
  if (viewportWidth > 0) return viewportWidth < PHONE_WIDTH;
  return staffWidth < 520;
}

/** Staff height for a session viewport. Learn and Practice both use this. */
export function baseStaffPx({ staffWidth = 0, viewportWidth = 0, viewportHeight = 0 } = {}) {
  if (isStandPortrait(viewportWidth, viewportHeight)) return PORTRAIT_STAFF_PX;
  const narrow = staffWidth < 520 || (viewportWidth > 0 && viewportWidth < 520);
  if (narrow) return STAFF_PX_NARROW;
  return STAFF_PX;
}

/**
 * Shrink a full-width engraving so the staff, chords, and the transport under
 * it stay in the viewport. Returns the CSS width to apply.
 */
export function notationCssWidth(renderedWidth, renderedHeight, availableHeight) {
  if (!renderedWidth || !renderedHeight || !availableHeight || availableHeight <= 0) {
    return renderedWidth || 0;
  }
  if (renderedHeight <= availableHeight + 1) return renderedWidth;
  return Math.max(1, Math.floor(renderedWidth * availableHeight / renderedHeight));
}

/**
 * iPad portrait only. When a short line is narrower than the card, return the
 * card width that hugs the engraving. Null leaves the stylesheet width alone,
 * so phone and landscape cards do not move.
 */
export function notationCardWidth({
  viewportWidth = 0,
  viewportHeight = 0,
  svgWidth = 0,
  padX = 0,
  maxWidth = 0,
} = {}) {
  if (!isStandPortrait(viewportWidth, viewportHeight)) return null;
  if (!(svgWidth > 0)) return null;
  const width = Math.ceil(svgWidth + Math.max(0, padX));
  if (maxWidth > 0 && width >= maxWidth - 1) return null;
  return width;
}

/** Session staff card stays at least this many systems tall. */
export const MIN_STAFF_SYSTEMS = 3;
/**
 * Verovio adds `spacingSystem` (6) × unit (12) = 72 user units between systems.
 * The 5-line staff is 96 user units, so the gap scales with the staff.
 */
const SYSTEM_GAP_USER = 72;
const STAFF_USER_UNITS = 96;
/** Center button is 42% of the wheel (`42cqmin`). */
export const WHEEL_CENTER_RATIO = 0.42;
/** Center control stays about this size; the wheel grows to keep the ratio. */
export const MIN_WHEEL_CENTER_PX = 120;
/** Phone can shrink further so a tall staff still fits without scrolling the page. */
export const MIN_WHEEL_CENTER_PHONE_PX = 64;

/** CSS px between systems at the current staff size, including the chord lane's share of the gap. */
export function systemGapCss(staffPx) {
  const px = Number(staffPx);
  if (!(px > 0)) return 0;
  return SYSTEM_GAP_USER * px / STAFF_USER_UNITS;
}

export function minWheelCenterPx(viewportWidth = 0) {
  return viewportWidth > 0 && viewportWidth < PHONE_WIDTH
    ? MIN_WHEEL_CENTER_PHONE_PX
    : MIN_WHEEL_CENTER_PX;
}

export function minWheelDiameter(viewportWidth = 0, ratio = WHEEL_CENTER_RATIO) {
  const center = minWheelCenterPx(viewportWidth);
  if (!(ratio > 0)) return center;
  return Math.ceil(center / ratio);
}

/**
 * One system box per entry (`top`, `bottom`, `height` in the same pixel space).
 * `contentHeight` is the whole engraving, page padding included.
 */
export function staffSystemMetricsFromBoxes(boxes = [], contentHeight = 0) {
  const content = Math.max(0, Number(contentHeight) || 0);
  const list = boxes.filter((box) => box && box.height > 1);
  if (!list.length) {
    return { count: content > 0 ? 1 : 0, systemHeight: content, systemGap: 0, contentHeight: content };
  }
  const systemHeight = list.reduce((sum, box) => sum + box.height, 0) / list.length;
  let systemGap = 0;
  let pitch = 0;
  if (list.length >= 2) {
    let gapSum = 0;
    let pitchSum = 0;
    for (let i = 1; i < list.length; i += 1) {
      gapSum += list[i].top - list[i - 1].bottom;
      pitchSum += list[i].top - list[i - 1].top;
    }
    systemGap = gapSum / (list.length - 1);
    pitch = pitchSum / (list.length - 1);
  }
  return { count: list.length, systemHeight, systemGap, pitch, contentHeight: content };
}

/** A one-line engraving has no measured gap, so use the staff-scaled system gap. */
export function withSystemGap(metrics, staffPx) {
  if (!metrics || metrics.count >= 2) return metrics;
  return { ...metrics, systemGap: systemGapCss(staffPx) };
}

/**
 * Cream-card content height. Shorter than three systems grows by whole system
 * slots (chord box + gap). Four or more systems keep their real height.
 */
export function staffCardContentHeight({
  systemCount,
  count: systemCountAlias = 1,
  systemHeight = 0,
  systemGap = 0,
  pitch = 0,
  contentHeight = 0,
} = {}) {
  const count = Math.max(0, Number(systemCount ?? systemCountAlias) || 0);
  const height = Math.max(0, Number(systemHeight) || 0);
  const content = Math.max(0, Number(contentHeight) || 0);
  const slot = Number(pitch) > 0
    ? Number(pitch)
    : Math.max(0, height + (Number(systemGap) || 0));
  const extra = Math.max(0, MIN_STAFF_SYSTEMS - count);
  return content + extra * slot;
}

/**
 * Wheel diameter under the staff card. `space` is the tools-to-footer slot.
 * Three margins of M stay put (above the card's stage, above the wheel, below it).
 * The card always keeps its full height. The wheel shrinks down to `minDiameter`.
 * Past that, `pageScroll` is set and the card still does not scroll internally.
 */
export function sessionWheelLayout({
  space = 0,
  cardHeight = 0,
  chrome = 0,
  margin = 0,
  widthFit = 0,
  minDiameter = 0,
} = {}) {
  const gaps = 3 * Math.max(0, Number(margin) || 0);
  const width = Math.max(0, Number(widthFit) || 0);
  const floor = Math.max(0, Number(minDiameter) || 0);
  const desired = Math.max(0, Number(cardHeight) || 0);
  const room = Math.floor((Number(space) || 0) - (Number(chrome) || 0) - desired - gaps);
  if (room >= floor) {
    return {
      diameter: Math.max(0, Math.min(width, room)),
      cardHeight: desired,
      scroll: false,
      pageScroll: false,
    };
  }
  return {
    diameter: Math.min(width, floor),
    cardHeight: desired,
    scroll: false,
    pageScroll: true,
  };
}

/** iPad Pro 12.9" portrait CSS px is 1024×1366. That is the primary lesson-1 target. */
export function isStandPortrait(viewportWidth, viewportHeight) {
  return viewportWidth >= 900 && viewportWidth <= 1180 && viewportHeight >= 1200;
}

/** iPad Pro 12.9" landscape CSS px is 1366×1024. Secondary; must not shrink portrait. */
export function isStandLandscape(viewportWidth, viewportHeight) {
  return viewportWidth >= 1180 && viewportHeight >= 900 && viewportHeight < 1200;
}

export function notationLayout({
  staffWidth,
  viewportWidth,
  viewportHeight,
  showPhraseNotation,
  showEntranceCues,
  phraseBars,
  notationScale = 1,
}) {
  const size = parseNotationScale(notationScale) ?? 1;
  const tight = isTightNotation(staffWidth, viewportWidth);
  const staffPx = Math.round(baseStaffPx({ staffWidth, viewportWidth, viewportHeight }) * size);
  const chordCssPx = chordTargetCss(staffPx);
  const annotationPx = Math.round(CUE_PX * size);

  if (showPhraseNotation) {
    // Same staff size, page width, and chord lane as Practice. Short cells
    // justify to the card instead of sitting at their natural width.
    const requested = Number(phraseBars);
    const barsPerLine = tight
      ? 2
      : Math.min(5, Math.max(2, Number.isFinite(requested) && requested > 0 ? requested : 2));
    return {
      scale: 1,
      notationScale: size,
      paddingtop: 8,
      paddingbottom: 16,
      wrap: null,
      flatbeams: true,
      stretchlast: false,
      minPadding: 6,
      timeBasedLayout: { minPadding: 9, align: "left" },
      barsPerLine,
      chordfont: "Noto Sans 16",
      annotationfont: "Source Sans 3 13",
      annotationPx,
      chordCssPx,
      slashStroke: 2,
      engravingRatio: 1,
      minEngravingRatio: 1,
      fitToPaper: false,
      fillAxis: "fit",
      naturalWidth: false,
      staffsep: Math.round(96 * size),
      fillRatio: 1,
      minStaffPx: staffPx,
    };
  }

  // Phones (viewport under ~600px) stay at 2 bars. iPad portrait uses 4, same
  // as landscape and desktop, even when a previous short line narrowed the
  // card. The portrait staff is smaller so those four bars fit.
  // Breaks are encoded <sb/>.
  const barsPerLine = tight ? 2 : 4;

  return {
    scale: 1,
    notationScale: size,
    paddingtop: 8,
    paddingbottom: showEntranceCues ? 28 : 14,
    wrap: null,
    flatbeams: true,
    stretchlast: false,
    minPadding: 5,
    timeBasedLayout: { minPadding: 7, align: "left" },
    barsPerLine,
    engravingRatio: 1,
    minEngravingRatio: 1,
    chordfont: "Noto Sans 16",
    annotationfont: "Source Sans 3 13",
    annotationPx,
    chordCssPx,
    slashStroke: 1.45,
    fitToPaper: false,
    fillAxis: "fit",
    naturalWidth: false,
    staffsep: Math.round(96 * size),
    maxStaffsep: Math.round(110 * size),
    fillRatio: 1,
    minStaffPx: staffPx,
  };
}

/**
 * With abcjs `responsive: "resize"`, visual size is containerWidth / engravingWidth.
 * A narrower engraving is upscaled to the paper, so the staff gets larger.
 */
export function nextEngravingWidth(staffwidth, renderedHeight, targetHeight, containerWidth, minWidth = 400) {
  if (!targetHeight || targetHeight < 120 || !renderedHeight || !staffwidth) return staffwidth;
  const ratio = renderedHeight / targetHeight;
  if (ratio >= 0.95 && ratio <= 1.03) return staffwidth;
  const next = Math.round(staffwidth * ratio * 0.98);
  const floor = Math.max(200, minWidth);
  const maxWidth = Math.max(floor, containerWidth - 24);
  return Math.min(maxWidth, Math.max(floor, next));
}

/**
 * Short rhythm slash on the staff midline. Caps size so a rest or spacer bbox
 * cannot draw a bar-crossing diagonal through the chord symbols.
 */
export function slashStrokeBox(glyphBox, staffBox) {
  const staffH = Math.max(8, staffBox?.height ?? 16);
  const staffMid = (staffBox?.y ?? 0) + staffH / 2;
  const span = Math.min(staffH * 0.7, 16);
  const gw = glyphBox?.width ?? span;
  const cx = gw > staffH
    ? (glyphBox?.x ?? 0) + Math.min(gw, staffH) * 0.2
    : (glyphBox?.x ?? 0) + gw / 2;
  const halfW = span * 0.42;
  const halfH = span * 0.48;
  return {
    x1: cx - halfW,
    y1: staffMid + halfH,
    x2: cx + halfW,
    y2: staffMid - halfH,
  };
}

export function slashFitsStaff(stroke, staffBox, pad = 0.75) {
  if (!stroke || !staffBox) return false;
  const top = Math.min(stroke.y1, stroke.y2);
  const bot = Math.max(stroke.y1, stroke.y2);
  return top >= staffBox.y - pad && bot <= staffBox.y + staffBox.height + pad;
}

/** Grow or shrink system separation so two 4-bar systems fill leftover paper height. */
export function nextStaffsep(staffsep, renderedHeight, targetHeight, maxSep = 380) {
  if (!targetHeight || targetHeight < 120 || !renderedHeight || !staffsep) return staffsep;
  const ratio = targetHeight / renderedHeight;
  if (ratio >= 0.95 && ratio <= 1.05) return staffsep;
  return Math.min(maxSep, Math.max(72, Math.round(staffsep * ratio)));
}

/**
 * 5-line staff height in CSS px. Verovio uses one fixed scale (`minStaffPx`);
 * we no longer upscale a narrower engraving to fill the paper.
 */
export function estimatedStaffHeightCss(layout, _containerWidth) {
  return layout.minStaffPx ?? STAFF_PX;
}

/**
 * abcjs will not pack four bars into a viewBox narrow enough for an 80px staff
 * on a 1024px iPad. Scale the engraving in X so the 5-line staff hits minStaffPx
 * without wrapping to extra systems.
 */
export function chorusStaffFit(viewBoxWidth, staffUserHeight, paperWidth, minStaffPx = 80) {
  if (!viewBoxWidth || !staffUserHeight || !paperWidth || !minStaffPx) {
    return { scaleX: 1, viewBoxWidth };
  }
  const neededWidth = staffUserHeight * paperWidth / minStaffPx;
  if (neededWidth >= viewBoxWidth * 0.98) {
    return { scaleX: 1, viewBoxWidth };
  }
  const scaleX = Math.max(0.74, neededWidth / viewBoxWidth);
  return { scaleX, viewBoxWidth: viewBoxWidth * scaleX };
}

export { CELL_BEATS, CHORUS_BEATS, phraseStartBeat, APPLICATIONS, LEGACY_STEPS };
