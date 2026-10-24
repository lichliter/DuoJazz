import test from "node:test";
import assert from "node:assert/strict";
import {
  abcForPanel,
  galleryPanels,
  learnLessons,
  meiForPanel,
  standardLessons,
  LEARN_KEYS,
} from "./gallery.js";
import { capCueText, svgHasBowingMarks } from "./engrave.js";
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

test("gallery Learn and landing MEI stay on bass clef with harm and cue dirs", () => {
  const gts = galleryPanels().find((panel) => panel.id === "gts-learn-bb");
  const mei = meiForPanel(gts);
  assert.match(mei, /clef\.shape="F"/);
  assert.match(mei, /<harm[^>]*>Dm7<\/harm>/);
  const play = galleryPanels().find((panel) => panel.id === "billies-bounce-play");
  const landing = meiForPanel(play);
  assert.match(landing, /clef\.shape="F"/);
  assert.match(landing, /<dir[^>]*>HERE<\/dir>/);
  const st = meiForPanel(galleryPanels().find((panel) => panel.id === "st-thomas"));
  assert.match(st, /Guide tone sequence/);
  assert.match(st, /head\.shape="slash"/);
});

test("cue labels cap only when they cannot use following unlabeled bars", () => {
  assert.equal(capCueText("HERE", 120, 14), "HERE");
  const oneBar = capCueText("Guide tone sequence", 72, 16);
  assert.ok(oneBar.endsWith("…"));
  assert.ok(oneBar.length < "Guide tone sequence".length);
  assert.equal(capCueText("Guide tone sequence", 220, 16), "Guide tone sequence");
});

test("bowing-mark detector flags up-bow and down-bow classes only", () => {
  const svg = { querySelectorAll() { return []; } };
  assert.equal(svgHasBowingMarks(svg), false);
  const bow = {
    querySelectorAll() {
      return [{ getAttribute: () => "abcjs-decoration abcjs-upbow" }];
    },
  };
  assert.equal(svgHasBowingMarks(bow), true);
});

test("gallery engraves after the cards are in the document", async () => {
  const src = await (await import("node:fs/promises")).readFile(new URL("./gallery.js", import.meta.url), "utf8");
  const insertAt = src.indexOf("root.replaceChildren");
  const renderAt = src.lastIndexOf("renderPanel(panel, paper)");
  assert.ok(insertAt > 0 && renderAt > insertAt);
  assert.match(src, /whenVerovioReady/);
  assert.doesNotMatch(src, /ABCJS/);
});
