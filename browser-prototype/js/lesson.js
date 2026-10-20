/**
 * Guided lesson flow for the DuoJazz integration prototype.
 * Stages are sequential musical moments, not a settings dashboard.
 */

import {
  BEATS_PER_BAR,
  BARS_PER_CHORUS,
  CELL_BEATS,
  CHORUS_BEATS,
  PHRASE_START_BEAT,
  chorusChords,
  chordAtBeat,
  getKey,
} from "./music.js";

export const STORAGE_KEY = "duojazz-integration-prototype-v2";

export const STEPS = [
  {
    id: "hear",
    label: "Hear",
    heading: "Hear the phrase",
    startLabel: "Hear the phrase",
    nextLabel: "Continue to echo",
    instruction: "Listen to the short ii–V–I. Don’t play yet — hearing it is not the same as having it.",
  },
  {
    id: "echo",
    label: "Echo",
    heading: "Echo it",
    startLabel: "Give me two bars",
    nextLabel: "Hear the two-bar setup",
    instruction: "Play the phrase on your instrument. The app is not listening and will not grade you.",
  },
  {
    id: "setup",
    label: "Setup",
    heading: "Two-bar setup",
    startLabel: "Hear the setup",
    nextLabel: "Play the entrance",
    instruction: "Hear the two bars before the door. You can blow over them — the phrase comes after this.",
  },
  {
    id: "guided",
    label: "Enter",
    heading: "Play it at the entrance",
    startLabel: "Count off the chorus",
    nextLabel: "Repeat without help",
    instruction: "Bars 1–2: your line. Bar 3: take the door. Then keep going.",
  },
  {
    id: "independent",
    label: "Solo",
    heading: "On your own",
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
    instruction: "Optional. You mark this. Listening or finishing a chorus is not demonstrated mastery.",
  },
];

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

export function presentation(stepId) {
  const hearLike = stepId === "hear" || stepId === "echo";
  const guided = stepId === "guided";
  const independent = stepId === "independent";
  const setup = stepId === "setup";
  const reflect = stepId === "reflect";
  return {
    stepId,
    showPhraseNotation: stepId === "hear" || stepId === "echo" || guided,
    showFormChart: setup || guided || independent,
    showEntranceLabels: guided,
    showTargetStyling: guided,
    showAssessment: reflect,
    includeModel: stepId === "hear" || guided,
    includeCue: guided,
    includeGuides: setup || guided,
    audioStage: hearLike ? "learn" : "place",
    lengthBeats: hearLike || setup ? CELL_BEATS : CHORUS_BEATS,
    looping: guided || independent,
    showMusic: !reflect,
    allowIndependentCoach: independent,
  };
}

export function defaultState() {
  return {
    step: "hear",
    concertKeyId: "C",
    displayMode: "concert",
    tempo: 96,
    swing: true,
    metronome: false,
    guideTones: true,
    independentCoach: false,
    triedKeys: ["C"],
    recall: "",
    foundEntrance: "",
    keptPlaying: "",
    quoteChoice: "",
  };
}

export function audioConfigFor(state) {
  const view = presentation(state.step);
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
    cueGain: view.includeCue ? 1 : 0,
  };
}

export function formBars(concertKey, displayMode) {
  const chords = chorusChords(concertKey, displayMode);
  return Array.from({ length: BARS_PER_CHORUS }, (_, index) => {
    const bar = index + 1;
    const start = index * BEATS_PER_BAR;
    const here = chords.filter(
      (chord) => chord.startBeat >= start && chord.startBeat < start + BEATS_PER_BAR,
    );
    const fallback = chordAtBeat(chords, start);
    return {
      bar,
      role: bar <= 2 ? "setup" : bar <= 4 ? "phrase" : "continue",
      names: here.length ? here.map((chord) => chord.name) : fallback ? [fallback.name] : [],
    };
  });
}

export function barCaption(bar, showEntranceLabels) {
  if (!showEntranceLabels) return "";
  if (bar === 3) return "Enter";
  if (bar === 4) return "Resolve";
  if (bar === 1) return "Improvise";
  if (bar === 2) return "Ready";
  return "";
}

export function livePrompt(stepId, snap) {
  const step = getStep(stepId);
  if (!snap.playing && !snap.paused) return step.instruction;
  if (snap.inCountIn || (typeof snap.beats === "number" && snap.beats < 0)) {
    const remaining = Math.max(1, Math.ceil(-snap.beats));
    return `Count-in · ${remaining}`;
  }
  if (stepId === "hear") return "Listen. Don’t play yet.";
  if (stepId === "echo") return "Your turn. The synth is only the band.";
  if (stepId === "setup") return "Two-bar setup. Door is after this.";
  if (stepId === "guided") {
    const bar = snap.bar;
    const beat = snap.beatInBar;
    if (bar <= 2) {
      return bar === 2 && beat >= 4
        ? "Ready — phrase on the next downbeat."
        : "Improvise. Entrance is bar 3.";
    }
    if (bar <= 4) return "Play the phrase. Resolve on I.";
    return "Keep going. Your own line.";
  }
  if (stepId === "independent") return "Your chorus. Quote, vary, or skip.";
  return step.instruction;
}

export function primaryAction(stepId, playback) {
  const step = getStep(stepId);
  if (stepId === "reflect") return null;
  if (playback.playing) return { id: "pause", label: "Pause" };
  if (playback.paused) return { id: "resume", label: "Resume" };
  if (playback.ended) return { id: "next", label: step.nextLabel };
  return { id: "start", label: step.startLabel };
}

export function currentChord(concertKey, displayMode, stepId, beats) {
  const view = presentation(stepId);
  const chords = chorusChords(concertKey, displayMode);
  const usable = view.audioStage === "learn" ? chords.slice(0, 3) : chords;
  const beat = Math.max(0, beats ?? 0);
  return chordAtBeat(usable, beat) ?? usable[0];
}

export { CELL_BEATS, CHORUS_BEATS, PHRASE_START_BEAT };
