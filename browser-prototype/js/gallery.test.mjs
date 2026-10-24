import test from "node:test";
import assert from "node:assert/strict";
import {
  abcForPanel,
  galleryPanels,
  learnLessons,
  standardLessons,
  LEARN_KEYS,
} from "./gallery.js";
import { capCueText } from "./engrave.js";
import { MODULES } from "./registry.js";

test("gallery is a catalog of Learn keys, one standard per module, one Play card, and three tunes", () => {
  const panels = galleryPanels();
  const learn = panels.filter((panel) => panel.section === "learn");
  const standards = panels.filter((panel) => panel.section === "standards");
  const play = panels.filter((panel) => panel.section === "play");
  const tunes = panels.filter((panel) => panel.section === "tunes");
  assert.equal(learnLessons().length, MODULES.length);
  assert.equal(learn.length, MODULES.length * LEARN_KEYS.length);
  assert.equal(standards.length, MODULES.length);
  assert.deepEqual(standardLessons().map((item) => item.moduleId), MODULES.map((module) => module.id));
  assert.equal(play.length, 1);
  assert.equal(play[0].id, "billies-bounce-play");
  assert.deepEqual(tunes.map((panel) => panel.id), ["st-thomas", "four", "attya"]);
  assert.ok(panels.some((panel) => panel.id === "gts-learn-bb" && panel.keyId === "Bb"));
});

test("gallery Learn and landing ABC stay on bass clef without changing pitches", () => {
  const gts = galleryPanels().find((panel) => panel.id === "gts-learn-bb");
  const abc = abcForPanel(gts);
  assert.match(abc, /K:Bb clef=bass/);
  assert.match(abc, /"Dm7"/);
  const play = galleryPanels().find((panel) => panel.id === "billies-bounce-play");
  const landing = abcForPanel(play);
  assert.match(landing, /K:F clef=bass/);
  assert.match(landing, /"_HERE"/);
  const st = galleryPanels().find((panel) => panel.id === "st-thomas");
  assert.match(abcForPanel(st), /Guide tone sequence/);
});

test("cue labels cap to the bar they belong to", () => {
  assert.equal(capCueText("HERE", 120, 14), "HERE");
  const long = capCueText("Embellished minor resolution", 72, 16);
  assert.ok(long.endsWith("…"));
  assert.ok(long.length < "Embellished minor resolution".length);
});

test("gallery engraves after the cards are in the document", async () => {
  const src = await (await import("node:fs/promises")).readFile(new URL("./gallery.js", import.meta.url), "utf8");
  const insertAt = src.indexOf("root.replaceChildren");
  const renderAt = src.lastIndexOf("renderPanel(panel, paper)");
  assert.ok(insertAt > 0 && renderAt > insertAt);
});
