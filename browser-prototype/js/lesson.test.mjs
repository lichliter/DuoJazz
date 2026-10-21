import test from "node:test";
import assert from "node:assert/strict";
import { getKey, scheduleChorus } from "./music.js";
import {
  presentation,
  audioConfigFor,
  defaultState,
  barCaption,
  livePrompt,
  primaryAction,
  formBars,
  adjacentStep,
  currentAssessment,
} from "./lesson.js";
import { DEFAULT_MELODY_REGISTER } from "./music.js";

test("independent practice removes entrance labels, target styling, notation, cues, and default model", () => {
  const view = presentation("independent");
  assert.equal(view.showPhraseNotation, false);
  assert.equal(view.showModelNotation, false);
  assert.equal(view.showEntranceLabels, false);
  assert.equal(view.showTargetStyling, false);
  assert.equal(view.includeModel, false);
  assert.equal(view.includeCue, false);
  assert.equal(view.includeGuides, false);
  assert.equal(view.showFormChart, true);
  assert.equal(barCaption(7, view.showEntranceLabels, "minor-home"), "");
  const state = { ...defaultState(), step: "independent" };
  const config = audioConfigFor(state);
  assert.equal(config.includeModel, false);
  assert.equal(config.includeCue, false);
  assert.equal(config.cueGain, 0);
  assert.equal(config.variationId, "skip");
  const events = scheduleChorus(config);
  assert.equal(events.filter((event) => event.type === "melody").length, 0);
  assert.equal(events.filter((event) => event.type === "cue").length, 0);
  assert.equal(events.find((event) => event.type === "end").beat, 32);
});

test("hear-in-context plays an eight-bar model solo and highlights the real entrance", () => {
  const view = presentation("hear");
  assert.equal(view.showModelNotation, true);
  assert.equal(view.showPhraseNotation, false);
  assert.equal(view.showFormChart, true);
  assert.equal(view.includeModel, true);
  assert.equal(view.modelScope, "solo");
  assert.equal(view.includeCue, false);
  assert.equal(view.lengthBeats, 32);
  const events = scheduleChorus(audioConfigFor({ ...defaultState(), step: "hear" }));
  const melody = events.filter((event) => event.type === "melody");
  assert.ok(melody.some((event) => event.beat < 24));
  assert.equal(melody.filter((event) => event.role === "phrase")[0].beat, 24);
  assert.equal(events.filter((event) => event.type === "cue").length, 0);
});

test("try-with-help keeps the cell notation, entrance labels, cues, and no default model", () => {
  const view = presentation("try");
  assert.equal(view.showPhraseNotation, true);
  assert.equal(view.showModelNotation, false);
  assert.equal(view.showEntranceLabels, true);
  assert.equal(view.showTargetStyling, true);
  assert.equal(view.includeModel, false);
  assert.equal(view.includeCue, true);
  assert.equal(barCaption(7, true, "minor-home"), "Enter");
  assert.equal(barCaption(6, true, "altered-dominant"), "Enter");
  const events = scheduleChorus(audioConfigFor({ ...defaultState(), step: "try" }));
  assert.equal(events.filter((event) => event.type === "melody").length, 0);
  const cues = events.filter((event) => event.type === "cue");
  assert.equal(cues.length, 2);
  assert.equal(cues[0].beat, 23);
  assert.equal(cues[1].beat, 24);
});

test("altered-dominant try cues bar 6, not the G-minor downbeat", () => {
  const config = audioConfigFor({ ...defaultState(), step: "try", applicationId: "altered-dominant" });
  const events = scheduleChorus(config);
  const cues = events.filter((event) => event.type === "cue");
  assert.equal(cues[0].beat, 19);
  assert.equal(cues[1].beat, 20);
  assert.equal(config.lengthBeats, 32);
});

test("isolated cell lens is optional and does not replace the chorus demonstration", () => {
  const view = presentation({ ...defaultState(), step: "hear", lens: "cell", cellMode: "hear" });
  assert.equal(view.allowCellLens, true);
  assert.equal(view.showFormChart, false);
  assert.equal(view.showPhraseNotation, true);
  assert.equal(view.audioStage, "learn");
  assert.equal(view.lengthBeats, 8);
  const echo = audioConfigFor({ ...defaultState(), step: "hear", lens: "cell", cellMode: "echo" });
  assert.equal(echo.includeModel, false);
  assert.equal(echo.stage, "learn");
});

test("independent coach opt-in is the only way the model returns on the yours chorus", () => {
  const off = audioConfigFor({ ...defaultState(), step: "independent", independentCoach: false });
  const on = audioConfigFor({ ...defaultState(), step: "independent", independentCoach: true });
  assert.equal(off.includeModel, false);
  assert.equal(on.includeModel, true);
  assert.equal(on.modelScope, "phrase");
  assert.equal(scheduleChorus(on).filter((event) => event.type === "melody").length, 6);
});

test("form bars stay ordinary chord names even when labels are stripped", () => {
  const bars = formBars(getKey("G"), "concert", "minor-home");
  assert.equal(bars.length, 8);
  assert.deepEqual(bars[6].names, ["Gm6"]);
  assert.equal(bars[6].role, "phrase");
  assert.equal(barCaption(7, false, "minor-home"), "");
  assert.equal(barCaption(7, true, "altered-dominant"), "Resolve");
});

test("primary action is one control: start, pause, resume, or continue", () => {
  assert.deepEqual(primaryAction("hear", { playing: false, paused: false, ended: false }), {
    id: "start",
    label: "Hear the chorus",
  });
  assert.equal(primaryAction("hear", { playing: true, paused: false, ended: false }).id, "pause");
  assert.equal(primaryAction("hear", { playing: false, paused: true, ended: false }).id, "resume");
  assert.equal(primaryAction("try", { playing: false, paused: false, ended: true }).label, "Make it yours");
  assert.equal(primaryAction("reflect", { playing: false, paused: false, ended: false }), null);
});

test("try live prompt changes at the door for each application", () => {
  assert.match(livePrompt({ ...defaultState(), step: "try" }, { playing: true, bar: 4, beatInBar: 1 }), /Improvise/);
  assert.match(livePrompt({ ...defaultState(), step: "try" }, { playing: true, bar: 6, beatInBar: 4 }), /Ready/);
  assert.match(livePrompt({ ...defaultState(), step: "try" }, { playing: true, bar: 7, beatInBar: 1 }), /Play the phrase/);
  assert.match(livePrompt({ ...defaultState(), step: "try" }, { playing: true, bar: 8, beatInBar: 1 }), /Keep going/);
  const altered = { ...defaultState(), step: "try", applicationId: "altered-dominant" };
  assert.match(livePrompt(altered, { playing: true, bar: 6, beatInBar: 1 }), /Play the phrase/);
  assert.match(livePrompt(altered, { playing: true, bar: 7, beatInBar: 1 }), /Resolve/);
  assert.match(livePrompt("independent", { playing: true, bar: 7, beatInBar: 1 }), /Quote, vary, or skip/);
});

test("default notation view is concert bass clef, separate from B-flat transposition", () => {
  const state = defaultState();
  assert.equal(state.clef, "bass");
  assert.equal(state.displayMode, "concert");
  const config = audioConfigFor(state);
  assert.equal(config.displayMode, "concert");
  assert.equal(config.concertKey.id, "G");
});

test("lesson order is hear → try → independent → reflect", () => {
  assert.equal(adjacentStep("hear", 1), "try");
  assert.equal(adjacentStep("try", 1), "independent");
  assert.equal(adjacentStep("independent", 1), "reflect");
  assert.equal(adjacentStep("hear", -1), "hear");
});

test("self-check marks are stored per application", () => {
  const state = defaultState();
  state.assessments["minor-home"].foundEntrance = "yes";
  state.applicationId = "altered-dominant";
  assert.equal(currentAssessment(state).foundEntrance, "");
  state.applicationId = "minor-home";
  assert.equal(currentAssessment(state).foundEntrance, "yes");
});

test("melody register defaults to Original and rides on audio config", () => {
  const state = defaultState();
  assert.equal(state.melodyRegister, DEFAULT_MELODY_REGISTER);
  assert.equal(audioConfigFor(state).melodyRegister, 0);
  const up = audioConfigFor({ ...state, melodyRegister: 1 });
  assert.equal(up.melodyRegister, 1);
  const events = scheduleChorus(up);
  const melody = events.filter((event) => event.type === "melody");
  const phrase = melody.filter((event) => event.role === "phrase");
  assert.equal(melody[0].midi, 48 + 12);
  assert.equal(phrase[0].midi, 57 + 12);
  assert.equal(phrase[0].beat, 24);
});

test("independent mode stays without model at every melody register", () => {
  for (const melodyRegister of [-1, 0, 1]) {
    const view = presentation({ ...defaultState(), step: "independent", melodyRegister });
    assert.equal(view.showPhraseNotation, false);
    assert.equal(view.showModelNotation, false);
    assert.equal(view.includeModel, false);
    const config = audioConfigFor({ ...defaultState(), step: "independent", melodyRegister });
    assert.equal(config.includeModel, false);
    assert.equal(config.variationId, "skip");
    assert.equal(config.melodyRegister, melodyRegister);
    const events = scheduleChorus(config);
    assert.equal(events.filter((event) => event.type === "melody").length, 0);
  }
});

test("echo cell keeps the pad only; guided try notation still uses the register", () => {
  const echo = audioConfigFor({ ...defaultState(), step: "hear", lens: "cell", cellMode: "echo", melodyRegister: -1 });
  assert.equal(echo.includeModel, false);
  assert.equal(echo.melodyRegister, -1);
  assert.equal(scheduleChorus(echo).filter((event) => event.type === "melody").length, 0);
  const tryConfig = audioConfigFor({ ...defaultState(), step: "try", melodyRegister: 1 });
  assert.equal(tryConfig.includeModel, false);
  assert.equal(tryConfig.melodyRegister, 1);
  assert.equal(presentation({ ...defaultState(), step: "try" }).showPhraseNotation, true);
});
