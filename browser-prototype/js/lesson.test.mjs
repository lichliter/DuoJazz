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
} from "./lesson.js";

test("independent practice removes entrance labels, target styling, notation, cues, and default model", () => {
  const view = presentation("independent");
  assert.equal(view.showPhraseNotation, false);
  assert.equal(view.showEntranceLabels, false);
  assert.equal(view.showTargetStyling, false);
  assert.equal(view.includeModel, false);
  assert.equal(view.includeCue, false);
  assert.equal(view.includeGuides, false);
  assert.equal(view.showFormChart, true);
  assert.equal(barCaption(3, view.showEntranceLabels), "");
  const state = { ...defaultState(), step: "independent" };
  const config = audioConfigFor(state);
  assert.equal(config.includeModel, false);
  assert.equal(config.includeCue, false);
  assert.equal(config.cueGain, 0);
  assert.equal(config.variationId, "skip");
  const events = scheduleChorus(config);
  assert.equal(events.filter((event) => event.type === "melody").length, 0);
  assert.equal(events.filter((event) => event.type === "cue").length, 0);
});

test("guided entrance keeps phrase notation, entrance labels, model, and cues", () => {
  const view = presentation("guided");
  assert.equal(view.showPhraseNotation, true);
  assert.equal(view.showEntranceLabels, true);
  assert.equal(view.showTargetStyling, true);
  assert.equal(view.includeModel, true);
  assert.equal(view.includeCue, true);
  assert.equal(barCaption(3, true), "Enter");
  const events = scheduleChorus(audioConfigFor({ ...defaultState(), step: "guided" }));
  const melody = events.filter((event) => event.type === "melody");
  const cues = events.filter((event) => event.type === "cue");
  assert.equal(melody.length, 9);
  assert.equal(melody[0].beat, 8);
  assert.equal(cues.length, 2);
  assert.equal(cues[0].beat, 7);
});

test("hear plays the model immediately; echo does not coach with melody", () => {
  const hear = scheduleChorus(audioConfigFor({ ...defaultState(), step: "hear" }));
  assert.equal(hear.find((event) => event.type === "melody").beat, 0);
  assert.equal(hear.find((event) => event.type === "end").beat, 8);
  const echo = scheduleChorus(audioConfigFor({ ...defaultState(), step: "echo" }));
  assert.equal(echo.filter((event) => event.type === "melody").length, 0);
  assert.equal(echo.filter((event) => event.type === "cue").length, 0);
});

test("setup is two bars of the form without phrase, cues, or model", () => {
  const config = audioConfigFor({ ...defaultState(), step: "setup" });
  assert.equal(config.lengthBeats, 8);
  assert.equal(config.stage, "place");
  const events = scheduleChorus(config);
  assert.equal(events.find((event) => event.type === "end").beat, 8);
  assert.equal(events.filter((event) => event.type === "melody").length, 0);
  assert.equal(events.filter((event) => event.type === "cue").length, 0);
});

test("independent coach opt-in is the only way the model returns", () => {
  const off = audioConfigFor({ ...defaultState(), step: "independent", independentCoach: false });
  const on = audioConfigFor({ ...defaultState(), step: "independent", independentCoach: true });
  assert.equal(off.includeModel, false);
  assert.equal(on.includeModel, true);
  assert.equal(scheduleChorus(on).filter((event) => event.type === "melody").length, 9);
});

test("form bars stay ordinary chord names even when labels are stripped", () => {
  const bars = formBars(getKey("C"), "concert");
  assert.equal(bars.length, 8);
  assert.deepEqual(bars[2].names, ["D-7", "G7"]);
  assert.equal(barCaption(3, false), "");
  assert.equal(barCaption(4, true), "Resolve");
});

test("primary action is one control: start, pause, resume, or continue", () => {
  assert.deepEqual(primaryAction("hear", { playing: false, paused: false, ended: false }), {
    id: "start",
    label: "Hear the phrase",
  });
  assert.equal(primaryAction("hear", { playing: true, paused: false, ended: false }).id, "pause");
  assert.equal(primaryAction("hear", { playing: false, paused: true, ended: false }).id, "resume");
  assert.equal(primaryAction("guided", { playing: false, paused: false, ended: true }).label, "Repeat without help");
  assert.equal(primaryAction("reflect", { playing: false, paused: false, ended: false }), null);
});

test("guided live prompt changes at the door and after the phrase", () => {
  assert.match(livePrompt("guided", { playing: true, bar: 1, beatInBar: 1 }), /Improvise/);
  assert.match(livePrompt("guided", { playing: true, bar: 2, beatInBar: 4 }), /Ready/);
  assert.match(livePrompt("guided", { playing: true, bar: 3, beatInBar: 1 }), /Play the phrase/);
  assert.match(livePrompt("guided", { playing: true, bar: 6, beatInBar: 1 }), /Keep going/);
  assert.match(livePrompt("independent", { playing: true, bar: 3, beatInBar: 1 }), /Quote, vary, or skip/);
});

test("lesson order is hear → echo → setup → guided → independent → reflect", () => {
  assert.equal(adjacentStep("hear", 1), "echo");
  assert.equal(adjacentStep("echo", 1), "setup");
  assert.equal(adjacentStep("setup", 1), "guided");
  assert.equal(adjacentStep("guided", 1), "independent");
  assert.equal(adjacentStep("independent", 1), "reflect");
  assert.equal(adjacentStep("hear", -1), "hear");
});
