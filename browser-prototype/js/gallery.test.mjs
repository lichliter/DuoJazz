import test from "node:test";
import assert from "node:assert/strict";
import {
  abcForPanel,
  comparePanels,
  galleryPanels,
  learnLessons,
  meiForPanel,
  standardLessons,
  LEARN_KEYS,
} from "./gallery.js";
import { compactChordSymbol } from "./engrave.js";
import { NOTATION_SCALE_VALUES } from "./lesson.js";
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
  assert.match(mei, /<harm[^>]*>[\s\S]*Dm7[\s\S]*<\/harm>/);
  const play = galleryPanels().find((panel) => panel.id === "billies-bounce-play");
  const landing = meiForPanel(play);
  assert.match(landing, /clef\.shape="F"/);
  assert.match(landing, /<dir[^>]*>HERE<\/dir>/);
  const st = meiForPanel(galleryPanels().find((panel) => panel.id === "st-thomas"));
  assert.match(st, /Guide tone(?:<lb\/>)?\s*sequence/);
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
  assert.match(src, /gallery-size/);
  assert.match(src, /comparePanels/);
  assert.doesNotMatch(src, /ABCJS/);
});

test("compare view shows St. Thomas and GTS Learn in B♭ at all four sizes", () => {
  const panels = comparePanels();
  assert.equal(panels.length, 8);
  assert.deepEqual(
    [...new Set(panels.map((panel) => panel.notationScale))],
    NOTATION_SCALE_VALUES,
  );
  assert.ok(panels.some((panel) => panel.id === "compare-st-thomas-1" && panel.applicationId === "tune-st-thomas"));
  assert.ok(panels.some((panel) => panel.id === "compare-gts-learn-bb-1p4" && panel.keyId === "Bb"));
  assert.ok(panels.every((panel) => /1\.0×|1\.2×|1\.4×|1\.6×/.test(panel.title)));
});

test("gallery chord symbols have no internal gaps around accidentals or alterations", () => {
  const samples = [
    galleryPanels().find((panel) => panel.id === "st-thomas"),
    galleryPanels().find((panel) => panel.id === "gts-learn-bb"),
    galleryPanels().find((panel) => panel.id === "billies-bounce-play"),
    galleryPanels().find((panel) => panel.id === "attya"),
  ];
  for (const panel of samples) {
    const mei = meiForPanel(panel);
    for (const match of mei.matchAll(/<rend[^>]*>([^<]*)<\/rend>/g)) {
      const name = match[1];
      assert.equal(compactChordSymbol(name), name, `${panel.id} ${name}`);
      assert.doesNotMatch(name, /[A-G]\s+[♭♯°ø]/);
      assert.doesNotMatch(name, /[7mø°]\s+[♭♯]/);
    }
  }
});
