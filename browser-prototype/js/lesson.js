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
      ? "Your turn. The synth is only a pad."
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
    return `Count-in · ${Math.max(1, Math.ceil(-snap.beats))}`;
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
}) {
  const narrow = staffWidth < 520;
  const stand = isStandPortrait(viewportWidth, viewportHeight);
  const landscape = isStandLandscape(viewportWidth, viewportHeight);
  const short = viewportHeight <= 860;

  if (showPhraseNotation) {
    // Keep the pre-engraving staff size for every Learn lick. Pack 3–5 bars
    // on one system so a leftover bar is not stretched, but do not shrink
    // the staff to fit — the line fills the paper at the same size as a
    // two-bar cell.
    const requested = Number(phraseBars);
    const barsPerLine = narrow
      ? 2
      : Math.min(5, Math.max(2, Number.isFinite(requested) && requested > 0 ? requested : 2));
    return {
      scale: stand ? 2.7 : landscape ? 1.85 : narrow ? 1.22 : 1.45,
      paddingtop: stand ? 16 : 10,
      paddingbottom: stand ? 24 : 14,
      wrap: null,
      flatbeams: true,
      stretchlast: false,
      expandToWidest: false,
      minPadding: 5,
      timeBasedLayout: { minPadding: 8, align: "left" },
      barsPerLine,
      chordfont: stand ? "Noto Sans 30" : landscape ? "Noto Sans 20" : "Noto Sans 16",
      annotationfont: stand ? "Source Sans 3 22" : "Source Sans 3 14",
      annotationPx: stand ? 26 : landscape ? 18 : 15,
      chordCssPx: stand ? 36 : landscape ? 24 : 16,
      slashStroke: stand ? 3.4 : 2,
      engravingRatio: stand ? 0.28 : landscape ? 0.48 : 1,
      minEngravingRatio: stand ? 0.16 : 0.32,
      fitToPaper: (stand || landscape) && barsPerLine <= 2,
      fillAxis: "width",
      staffsep: stand ? 70 : 55,
      fillRatio: stand ? 0.58 : 0.9,
    };
  }

  // Keep bars intact at every viewport: 4 per line wherever the paper is
  // wide enough (8-bar chart → 2 systems). Phones drop to 2 bars per line.
  // Never hand wrapping to abcjs — its wrap engine will split 4+3+1 at
  // laptop widths (1280×720), dumping bar 8 onto a third system and mixing
  // landing notes with slashes. Line breaks come only from ABC newlines.
  // A leftover last system stays at proportional width (stretchlast off).
  const barsPerLine = narrow ? 2 : 4;

  return {
    scale: stand ? 1.12 : landscape ? 1.08 : short ? 0.9 : narrow ? 0.94 : 1.08,
    paddingtop: stand ? 6 : landscape ? 8 : short ? 8 : 16,
    paddingbottom: showEntranceCues
      ? (stand ? 22 : landscape ? 20 : short ? 16 : 20)
      : (stand ? 10 : 12),
    wrap: null,
    flatbeams: true,
    stretchlast: false,
    expandToWidest: false,
    minPadding: 6,
    timeBasedLayout: { minPadding: 10, align: "left" },
    barsPerLine,
    // Four bars will not engrave narrower than ~450px, so width-only upscale
    // caps the 5-line staff around 67px. After render we scaleX the chorus
    // to hit minStaffPx. staffsep only clears stems plus a tight cue lane;
    // extra space above the next chord row is added after layout.
    engravingRatio: stand ? 0.5 : landscape ? 0.7 : 1,
    minEngravingRatio: stand ? 0.48 : landscape ? 0.55 : 0.4,
    chordfont: stand ? "Noto Sans 16" : landscape ? "Noto Sans 15" : "Noto Sans 15",
    annotationfont: stand ? "Source Sans 3 13" : "Source Sans 3 12",
    annotationPx: stand ? 22 : landscape ? 16 : 15,
    chordCssPx: stand ? 26 : landscape ? 18 : 15,
    slashStroke: stand ? 1.45 : 1.85,
    fitToPaper: false,
    fillAxis: "fit",
    staffsep: showEntranceCues
      ? (stand ? 72 : landscape ? 64 : 58)
      : (stand ? 52 : landscape ? 48 : 46),
    maxStaffsep: showEntranceCues
      ? (stand ? 88 : 80)
      : (stand ? 60 : 56),
    fillRatio: stand ? 0.96 : landscape ? 0.9 : 0.92,
    minStaffPx: stand ? 83 : landscape ? 64 : 0,
  };
}

/** Small gap between a system's lowest stem/beam and its cue labels. */
export const CUE_LANE_GAP = 8;

/**
 * Cue-lane y just under this system's stems, capped so spacer rests cannot
 * drop labels toward the next system's chords.
 */
export function cueLaneY(staffBox, lowestStemY, gap = CUE_LANE_GAP) {
  const height = Math.max(8, staffBox?.height ?? 20);
  const staffBottom = (staffBox?.y ?? 0) + height;
  const cap = staffBottom + height * 1.85;
  const low = Math.min(Math.max(Number(lowestStemY) || staffBottom, staffBottom), cap);
  return low + gap;
}

/** Scale a full-width system so its right barline meets a shared edge. */
export function fullSystemScaleX(staffLeft, staffRight, targetRight) {
  const span = staffRight - staffLeft;
  if (!(span > 8) || !(targetRight - staffLeft > 8)) return 1;
  return (targetRight - staffLeft) / span;
}

export function accidentalMinGap(staffHeight) {
  return Math.max(8, (Number(staffHeight) || 20) * 0.28);
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
 * Approximate 5-line staff height in CSS px after abcjs `responsive: "resize"`.
 * abcjs staffspace is 10 user units; four spaces → 40px at scale 1 before upscale.
 */
export function estimatedStaffHeightCss(layout, containerWidth) {
  const width = Math.max(1, containerWidth);
  const engravingWidth = Math.max(1, width * (layout.engravingRatio ?? 1));
  // `responsive: "resize"` sizes from viewBox width, not the abcjs scale option.
  const natural = 40 * (width / engravingWidth);
  return Math.max(natural, layout.minStaffPx ?? 0);
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
