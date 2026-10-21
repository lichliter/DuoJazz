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
  getKey,
  learnChords,
  normalizeMelodyRegister,
  phraseStartBeat,
  supportBlurb,
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
    lengthBeats: isolated ? CELL_BEATS : CHORUS_BEATS,
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
  const app = applicationById(applicationId);
  if (bar === app.phraseStartBar) return "HERE";
  if (bar === app.phraseStartBar - 1) return "Get ready";
  return "";
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
    return {
      title: state.cellMode === "echo" ? "Your turn on the cell" : "Cry Me a River cell",
      meta: `${ctx.cellName} · ${clef}`,
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
    return state.cellMode === "echo"
      ? "Your turn. The synth is only a pad."
      : `Hear the cell in ${ctx.cellName}. Repeat, echo, or change octave.`;
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
    return state.cellMode === "echo" ? "Play the cell." : "Listen to the cell.";
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
    return {
      id: "start",
      label: state.cellMode === "echo" ? "Count me in" : "Hear the cell",
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
}) {
  const narrow = staffWidth < 520;
  const stand = isStandPortrait(viewportWidth, viewportHeight);
  const landscape = isStandLandscape(viewportWidth, viewportHeight);
  const short = viewportHeight <= 860;

  if (showPhraseNotation) {
    return {
      scale: stand ? 1.95 : landscape ? 1.5 : narrow ? 1.18 : 1.35,
      paddingtop: stand ? 8 : 8,
      paddingbottom: stand ? 16 : 12,
      wrap: null,
      barsPerLine: 2,
      chordfont: stand ? "Source Sans 3 22" : "Source Sans 3 15",
      annotationfont: stand ? "Source Sans 3 16" : "Source Sans 3 13",
      annotationPx: stand ? 18 : 15,
      slashStroke: stand ? 2.6 : 1.85,
      engravingRatio: stand ? 0.44 : landscape ? 0.72 : 1,
      fitToPaper: false,
      staffsep: stand ? 70 : 55,
      fillRatio: 0.92,
    };
  }

  return {
    scale: stand ? 1.72 : landscape ? 1.28 : short ? 0.9 : narrow ? 0.94 : 1.08,
    paddingtop: stand ? 8 : landscape ? 10 : 28,
    paddingbottom: showEntranceCues ? (stand ? 24 : landscape ? 22 : 32) : (stand ? 12 : 12),
    wrap: stand || landscape
      ? null
      : {
        minSpacing: 1.45,
        maxSpacing: 2.6,
        preferredMeasuresPerLine: 4,
      },
    barsPerLine: stand ? 2 : 4,
    engravingRatio: stand ? 0.48 : landscape ? 0.64 : 1,
    chordfont: stand ? "Source Sans 3 22" : landscape ? "Source Sans 3 18" : "Source Sans 3 15",
    annotationfont: stand ? "Source Sans 3 17" : "Source Sans 3 13",
    annotationPx: stand ? 18 : 15,
    slashStroke: stand ? 2.9 : 1.85,
    fitToPaper: stand || landscape,
    staffsep: stand ? 90 : landscape ? 72 : 55,
    fillRatio: stand ? 0.98 : landscape ? 0.94 : 0.92,
  };
}

/**
 * With abcjs `responsive: "resize"`, visual size is containerWidth / engravingWidth.
 * A narrower engraving is upscaled to the paper, so the staff gets larger.
 */
export function nextEngravingWidth(staffwidth, renderedHeight, targetHeight, containerWidth) {
  if (!targetHeight || targetHeight < 160 || !renderedHeight || !staffwidth) return staffwidth;
  const ratio = renderedHeight / targetHeight;
  if (ratio >= 0.95 && ratio <= 1.03) return staffwidth;
  const next = Math.round(staffwidth * ratio * 0.98);
  const minWidth = 400;
  const maxWidth = Math.max(minWidth, containerWidth - 24);
  return Math.min(maxWidth, Math.max(minWidth, next));
}

export { CELL_BEATS, CHORUS_BEATS, phraseStartBeat, APPLICATIONS, LEGACY_STEPS };
