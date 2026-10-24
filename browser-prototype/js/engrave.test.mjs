import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  capCueText,
  compactChordSymbol,
  resetVerovioForTests,
  staffCssFromPage,
  STAFF_USER_UNITS,
  svgHasBowingMarks,
  verovioModuleIsReady,
  verovioOptions,
  whenVerovioReady,
} from "./engrave.js";
import { STAFF_PX } from "./lesson.js";

test("Verovio options use encoded breaks and do not stretch leftover systems", () => {
  const chorus = verovioOptions({
    fillAxis: "fit",
    barsPerLine: 4,
    minStaffPx: STAFF_PX,
    annotationPx: 14,
    paddingbottom: 28,
  }, 980, { hasSb: true });
  assert.equal(chorus.breaks, "encoded");
  assert.equal(chorus.adjustPageWidth, false);
  assert.ok(chorus.minLastJustification >= 0.8);
  assert.equal(chorus.header, "none");
  assert.equal(chorus.font, "Leipzig");
  const cell = verovioOptions({
    fillAxis: "width",
    barsPerLine: 2,
    minStaffPx: STAFF_PX,
    naturalWidth: true,
  }, 980, { hasSb: false });
  assert.equal(cell.adjustPageWidth, true);
  assert.equal(cell.breaks, "none");
});

test("one fixed Verovio scale keeps a 38–42px staff and does not blow up short cells", () => {
  const chorus = verovioOptions({
    fillAxis: "fit",
    barsPerLine: 4,
    minStaffPx: STAFF_PX,
  }, 980, { hasSb: true });
  const cell = verovioOptions({
    fillAxis: "width",
    barsPerLine: 2,
    minStaffPx: STAFF_PX,
    naturalWidth: true,
  }, 980, { hasSb: false });
  const chorusStaff = staffCssFromPage(chorus.pageWidth, 980);
  const cellStaff = staffCssFromPage(cell.pageWidth, 980);
  assert.ok(chorusStaff >= 38 && chorusStaff <= 42, `chorus staff ${chorusStaff}`);
  assert.ok(cellStaff >= 38 && cellStaff <= 42, `cell staff ${cellStaff}`);
  assert.equal(chorus.scale, 100);
  assert.equal(cell.scale, 100);
  assert.equal(chorus.unit, 12);
  assert.equal(STAFF_USER_UNITS, 96);
  assert.ok(Math.abs(chorus.pageWidth - cell.pageWidth) < 2);
});

test("index and gallery load Verovio instead of abcjs", async () => {
  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const gallery = await readFile(new URL("../gallery.html", import.meta.url), "utf8");
  assert.match(index, /verovio-toolkit-wasm/);
  assert.match(gallery, /verovio-toolkit-wasm/);
  assert.doesNotMatch(index, /abcjs/);
  assert.doesNotMatch(gallery, /abcjs/);
});

test("index and gallery bind Verovio WASM before the page module", async () => {
  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const gallery = await readFile(new URL("../gallery.html", import.meta.url), "utf8");
  const bind = await readFile(new URL("./verovio-bind.js", import.meta.url), "utf8");
  assert.match(bind, /onRuntimeInitialized/);
  const wasmAt = index.indexOf("verovio-toolkit-wasm");
  const bindAt = index.indexOf("verovio-bind.js");
  const appAt = index.indexOf("js/app.js");
  assert.ok(wasmAt >= 0 && bindAt > wasmAt && appAt > bindAt);
  const gWasm = gallery.indexOf("verovio-toolkit-wasm");
  const gBind = gallery.indexOf("verovio-bind.js");
  const gApp = gallery.indexOf("js/gallery.js");
  assert.ok(gWasm >= 0 && gBind > gWasm && gApp > gBind);
});

test("whenVerovioReady waits for a late WASM runtime instead of rejecting", async () => {
  resetVerovioForTests();
  const previous = globalThis.verovio;
  delete globalThis.verovio;
  try {
    const pending = whenVerovioReady();
    let allow = false;
    class FakeToolkit {
      constructor() {
        if (!allow) throw new Error("not ready");
        this.ok = true;
      }
    }
    const module = {};
    globalThis.verovio = { module, toolkit: FakeToolkit };
    assert.equal(verovioModuleIsReady(globalThis.verovio), false);
    await new Promise((resolve) => setTimeout(resolve, 80));
    allow = true;
    module._vrvToolkit_constructor = () => 1;
    globalThis.verovio.__duojazzReady = true;
    const tk = await pending;
    assert.equal(tk.ok, true);
  } finally {
    resetVerovioForTests();
    if (previous === undefined) delete globalThis.verovio;
    else globalThis.verovio = previous;
  }
});

test("chord symbols compact figbass and internal gaps", () => {
  assert.equal(compactChordSymbol("B♭  maj7"), "B♭maj7");
  assert.equal(compactChordSymbol("B\uEA64 maj7"), "B♭maj7");
  assert.equal(compactChordSymbol("C7/E"), "C7/E");
});

test("engraving restyles chords then separates overlapping symbols", async () => {
  const src = await readFile(new URL("./engrave.js", import.meta.url), "utf8");
  assert.match(src, /separateChordSymbols\(svg\)/);
  assert.match(src, /centerSlashNoteheads\(svg\)/);
  assert.match(src, /applyFixedStaffSize\(/);
  assert.doesNotMatch(src, /chorusStaffFit\(/);
  assert.doesNotMatch(src, /fitChorus/);
});

test("session paper re-renders once Verovio is ready", async () => {
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  assert.match(app, /whenVerovioReady\(\)\.then\(\(\) => \{/);
  assert.match(app, /screen === "session"\) renderNotation\(\)/);
});

test("cue cap helper and bowing detector still work without abcjs", () => {
  assert.equal(capCueText("HERE", 120, 14), "HERE");
  assert.equal(svgHasBowingMarks("artic=\"stacc\""), false);
  assert.equal(svgHasBowingMarks('artic="upbow"'), true);
});

test("Verovio options leave a tight cue lane under the staff", () => {
  const chorus = verovioOptions({
    fillAxis: "fit",
    barsPerLine: 4,
    minStaffPx: STAFF_PX,
    annotationPx: 14,
    paddingbottom: 28,
  }, 980, { hasSb: true });
  assert.ok(chorus.pageMarginBottom >= 28);
  assert.ok(chorus.pageMarginBottom <= 48);
  assert.ok(chorus.spacingSystem >= 6);
  assert.ok(chorus.spacingSystem <= 12);
  assert.ok(chorus.lyricSize >= 2.0);
  assert.ok(chorus.lyricSize <= 3.5);
});
