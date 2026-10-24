import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { capCueText, svgHasBowingMarks, verovioOptions } from "./engrave.js";

test("Verovio options use encoded breaks and do not stretch leftover systems", () => {
  const chorus = verovioOptions({
    fillAxis: "fit",
    barsPerLine: 4,
    minStaffPx: 83,
    annotationPx: 22,
    paddingbottom: 48,
  }, 980, { hasSb: true });
  assert.equal(chorus.breaks, "encoded");
  assert.equal(chorus.adjustPageWidth, false);
  assert.ok(chorus.minLastJustification >= 0.8);
  assert.equal(chorus.header, "none");
  assert.equal(chorus.font, "Leipzig");
  const cell = verovioOptions({ fillAxis: "width", barsPerLine: 2 }, 980, { hasSb: false });
  assert.equal(cell.adjustPageWidth, true);
  assert.equal(cell.breaks, "none");
});

test("index and gallery load Verovio instead of abcjs", async () => {
  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const gallery = await readFile(new URL("../gallery.html", import.meta.url), "utf8");
  assert.match(index, /verovio-toolkit-wasm/);
  assert.match(gallery, /verovio-toolkit-wasm/);
  assert.doesNotMatch(index, /abcjs/);
  assert.doesNotMatch(gallery, /abcjs/);
});

test("cue cap helper and bowing detector still work without abcjs", () => {
  assert.equal(capCueText("HERE", 120, 14), "HERE");
  assert.equal(svgHasBowingMarks("artic=\"stacc\""), false);
  assert.equal(svgHasBowingMarks('artic="upbow"'), true);
});

test("Verovio options leave room for a cue lane under the staff", () => {
  const chorus = verovioOptions({
    fillAxis: "fit",
    barsPerLine: 4,
    annotationPx: 22,
    paddingbottom: 48,
  }, 980, { hasSb: true });
  assert.ok(chorus.pageMarginBottom >= 48);
  assert.ok(chorus.lyricSize <= 3);
  assert.ok(chorus.lyricSize >= 2);
});
