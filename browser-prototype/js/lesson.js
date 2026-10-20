/**
 * Guided lesson flow for the DuoJazz integration prototype.
 * Default path: hear the cell in an eight-bar model solo, try it with a cue,
 * then play without answers. Isolated cell practice is optional.
 */

import {
  APPLICATIONS,
  BEATS_PER_BAR,
  BARS_PER_CHORUS,
  CELL_BEATS,
  CHORUS_BEATS,
  DEFAULT_APPLICATION_ID,
  DEFAULT_KEY_ID,
  applicationById,
  chorusChords,
  chordAtBeat,
  getKey,
  learnChords,
  phraseStartBeat,
} from "./music.js";

export const STORAGE_KEY = "duojazz-integration-prototype-v4";

export const STEPS = [
  {
    id: "hear",
    label: "Hear",
    heading: "Hear it in context",
    startLabel: "Hear the chorus",
    nextLabel: "Try it with help",
    instruction: "Listen to a simple original solo over the real eight bars. The Cry Me a River cell is highlighted when it arrives. Don’t play yet.",
  },
  {
    id: "try",
    label: "Try",
    heading: "Try it with help",
    startLabel: "Count off the chorus",
    nextLabel: "Make it yours",
    instruction: "Same backing, no model solo. Improvise, take the door when it comes, then keep going. The app is not listening.",
  },
  {
    id: "independent",
    label: "Yours",
    heading: "Make it yours",
    startLabel: "Play a chorus",
    nextLabel: "Short check-in",
    instruction: "Same eight bars. No written phrase, no entrance labels, no model line unless you ask.",
  },
  {
    id: "reflect",
    label: "Check-in",
    heading: "After playing",
    startLabel: "",
    nextLabel: "",
    instruction: "Optional. You mark this. Listening or finishing a chorus is not demonstrated mastery. Marks for one way to use the lick do not prove the other.",
  },
];

function emptyAssessment() {
  return { foundEntrance: "", keptPlaying: "", quoteChoice: "", recall: "" };
}

export function normalizeState(stateOrStep) {
  if (typeof stateOrStep === "string") {
    return { ...defaultState(), step: stateOrStep };
  }
  return { ...defaultState(), ...stateOrStep };
}

export function stepIndex(id) {
  return STEPS.findIndex((step) => step.id === id);
}

export function getStep(id) {
  return STEPS.find((step) => step.id === id) ?? STEPS[0];
}

export function adjacentStep(id, delta) {
  const index = stepIndex(id);
  const next = STEPS[index + delta];
  return next ? next.id : id;
}

export function presentation(stateOrStep) {
  const state = normalizeState(stateOrStep);
  const stepId = state.step;
  const app = applicationById(state.applicationId);
  const cellLens = stepId === "hear" && state.lens === "cell";
  const hear = stepId === "hear";
  const trying = stepId === "try";
  const independent = stepId === "independent";
  const reflect = stepId === "reflect";
  return {
    stepId,
    applicationId: app.id,
    application: app,
    lens: cellLens ? "cell" : "context",
    showPhraseNotation: cellLens || trying,
    showModelNotation: hear && !cellLens,
    showFormChart: !cellLens && !reflect,
    chartStartBar: 1,
    chartBarCount: BARS_PER_CHORUS,
    showEntranceLabels: trying,
    showTargetStyling: trying,
    highlightPhraseLive: hear || trying,
    showAssessment: reflect,
    includeModel: (hear && !cellLens) || (cellLens && state.cellMode !== "echo"),
    includeCue: trying,
    includeGuides: trying,
    audioStage: cellLens ? "learn" : "place",
    lengthBeats: cellLens ? CELL_BEATS : CHORUS_BEATS,
    modelScope: hear && !cellLens ? "solo" : "phrase",
    looping: trying || independent,
    showMusic: !reflect,
    allowIndependentCoach: independent,
    allowCellLens: hear,
  };
}

export function defaultState() {
  return {
    step: "hear",
    lens: "context",
    cellMode: "hear",
    applicationId: DEFAULT_APPLICATION_ID,
    concertKeyId: DEFAULT_KEY_ID,
    displayMode: "concert",
    tempo: 96,
    swing: true,
    metronome: false,
    guideTones: true,
    independentCoach: false,
    triedKeys: [DEFAULT_KEY_ID],
    assessments: Object.fromEntries(APPLICATIONS.map((app) => [app.id, emptyAssessment()])),
  };
}

export function audioConfigFor(stateOrStep) {
  const state = normalizeState(stateOrStep);
  const view = presentation(state);
  const coach = view.allowIndependentCoach && state.independentCoach;
  return {
    concertKey: getKey(state.concertKeyId),
    displayMode: state.displayMode,
    includeModel: view.includeModel || coach,
    includeGuides: view.includeGuides && state.guideTones,
    includeClick: state.metronome,
    includeCue: view.includeCue,
    variationId: view.includeModel || coach ? "original" : "skip",
    stage: view.audioStage,
    tempo: state.tempo,
    swing: state.swing,
    looping: view.looping,
    lengthBeats: view.lengthBeats,
    applicationId: view.applicationId,
    modelScope: coach ? "phrase" : view.modelScope,
    cueGain: view.includeCue ? 1 : 0,
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
  if (bar === app.phraseStartBar) return "Enter";
  if (bar === app.phraseStartBar - 1) return "Ready";
  if (bar === app.phraseStartBar + 1) return app.id === "altered-dominant" ? "Resolve" : "Keep going";
  if (bar === app.phraseStartBar + 2) return "Keep going";
  return "";
}

export function livePrompt(stateOrStep, snap) {
  const state = normalizeState(stateOrStep);
  const step = getStep(state.step);
  const app = applicationById(state.applicationId);
  const view = presentation(state);
  if (!snap.playing && !snap.paused) {
    if (view.lens === "cell") {
      return state.cellMode === "echo"
        ? "Your turn on the cell. The synth is only a pad."
        : "Just the cell, out of the form. Hearing it alone is optional.";
    }
    return step.instruction;
  }
  if (snap.inCountIn || (typeof snap.beats === "number" && snap.beats < 0)) {
    const remaining = Math.max(1, Math.ceil(-snap.beats));
    return `Count-in · ${remaining}`;
  }
  if (view.lens === "cell") {
    return state.cellMode === "echo" ? "Play the cell." : "Listen to the cell.";
  }
  if (state.step === "hear") {
    if (snap.bar === app.phraseStartBar) return `There it is — ${app.phraseFunctionLabel}.`;
    if (snap.bar < app.phraseStartBar) return "Lead-in. The cell is coming.";
    return app.id === "altered-dominant" ? "Resolution into the minor tonic." : "Continuation. Still your chorus later.";
  }
  if (state.step === "try") {
    const bar = snap.bar;
    const beat = snap.beatInBar;
    if (bar < app.phraseStartBar) {
      return bar === app.phraseStartBar - 1 && beat >= 4
        ? "Ready — phrase on the next downbeat."
        : `Improvise. Entrance is bar ${app.phraseStartBar}.`;
    }
    if (bar === app.phraseStartBar) return "Play the phrase.";
    return app.id === "altered-dominant" ? "Resolve into G minor. Keep going." : "Keep going. Your own line.";
  }
  if (state.step === "independent") return "Your chorus. Quote, vary, or skip.";
  return step.instruction;
}

export function primaryAction(stateOrStep, playback) {
  const state = normalizeState(stateOrStep);
  const step = getStep(state.step);
  const view = presentation(state);
  if (state.step === "reflect") return null;
  if (playback.playing) return { id: "pause", label: "Pause" };
  if (playback.paused) return { id: "resume", label: "Resume" };
  if (playback.ended) return { id: "next", label: step.nextLabel };
  if (view.lens === "cell") {
    return {
      id: "start",
      label: state.cellMode === "echo" ? "Give me two bars" : "Hear the cell",
    };
  }
  return { id: "start", label: step.startLabel };
}

export function currentChord(concertKey, displayMode, stateOrStep, beats) {
  const state = normalizeState(stateOrStep);
  const view = presentation(state);
  const chords = view.audioStage === "learn"
    ? learnChords(concertKey, displayMode, view.applicationId)
    : chorusChords(concertKey, displayMode);
  const beat = Math.max(0, beats ?? 0);
  return chordAtBeat(chords, beat) ?? chords[0];
}

export function currentAssessment(state) {
  const normalized = normalizeState(state);
  return normalized.assessments[normalized.applicationId] ?? emptyAssessment();
}

export { CELL_BEATS, CHORUS_BEATS, phraseStartBeat, APPLICATIONS };
