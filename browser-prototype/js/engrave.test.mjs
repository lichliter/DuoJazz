import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  capCueText,
  CHORD_FONT_VU,
  compactChordSymbol,
  CUE_FONT_VU,
  chordFontVU,
  cueFontVU,
  resetVerovioForTests,
  smuflChordChar,
  soundingIdsAt,
  staffCssFromPage,
  STAFF_USER_UNITS,
  svgHasBowingMarks,
  verovioModuleIsReady,
  verovioOptions,
  whenVerovioReady,
} from "./engrave.js";
import { notationLayout, STAFF_PX } from "./lesson.js";

test("Verovio options use encoded breaks and justify every system, including the last", () => {
  const chorus = verovioOptions({
    fillAxis: "fit",
    barsPerLine: 4,
    minStaffPx: STAFF_PX,
    annotationPx: 14,
    paddingbottom: 28,
  }, 980, { hasSb: true });
  assert.equal(chorus.breaks, "encoded");
  assert.equal(chorus.adjustPageWidth, false);
  assert.equal(chorus.minLastJustification, 0);
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
  assert.match(gallery, /id="gallery-size"/);
  assert.match(gallery, /href="#compare"/);
  assert.doesNotMatch(index, /abcjs/);
  assert.doesNotMatch(gallery, /abcjs/);
});

test("home uses the record road and a Modules sheet; session keeps the round play cluster", async () => {
  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(index, /class="lesson-path"/);
  assert.match(index, /id="quick-view-btn"/);
  assert.match(index, />Modules</);
  assert.match(index, /id="quick-view-title">Modules</);
  assert.match(index, /family=Oswald/);
  assert.match(index, /class="play-round"/);
  assert.match(index, /class="session-bottom"/);
  assert.match(index, /id="settings-summary"/);
  assert.match(index, /class="settings-gear"/);
  assert.match(index, /id="next-module"/);
  assert.match(index, /aria-label="Settings"/);
  assert.match(index, /id="instrument-list"/);
  assert.match(index, /id="session-title"/);
  assert.match(index, /class="sheet-done"/);
  assert.match(index, /class="session-stage"/);
  assert.match(index, /class="headphones-banner"/);
  assert.match(index, /id="headphones-dismiss"/);
  assert.doesNotMatch(index, /sound\.html/);
  assert.doesNotMatch(index, /id="module-sidebar"/);
  assert.doesNotMatch(index, />Quick view</);
  assert.doesNotMatch(index, /id="setup"/);
  assert.doesNotMatch(index, /id="session-card-count"/);
  assert.doesNotMatch(index, /class="headphones-tip"/);
  assert.doesNotMatch(index, /class="session-spacer"/);
  assert.doesNotMatch(index, /Your tunes/);
  assert.doesNotMatch(index, /id="home-settings-btn"/);
  assert.doesNotMatch(index, /id="display-chip"/);
  assert.doesNotMatch(index, /name="clef"/);
  assert.doesNotMatch(index, /More licks soon/);
  assert.doesNotMatch(index, /name="displayMode"/);
});

test("home road-end CTA is a 44pt next-module button with no More licks soon", async () => {
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("../css/styles.css", import.meta.url), "utf8");
  const hig = await readFile(new URL("../css/hig.css", import.meta.url), "utf8");
  assert.doesNotMatch(app, /More licks soon/);
  assert.doesNotMatch(styles, /More licks soon/);
  assert.doesNotMatch(hig, /More licks soon/);
  assert.match(app, /homeNextModuleButton\(homeNextModule\(/);
  assert.match(styles, /\.next-module-path \{[\s\S]*?min-height:\s*var\(--tap\)/);
  assert.match(styles, /\.next-module-path \{[\s\S]*?background:\s*var\(--tint-solid\)/);
  assert.match(styles, /\.next-module-path \{[\s\S]*?white-space:\s*normal/);
});

test("tokens restore the warm palette and keep the iOS type scale", async () => {
  const tokens = await readFile(new URL("../css/tokens.css", import.meta.url), "utf8");
  const hig = await readFile(new URL("../css/hig.css", import.meta.url), "utf8");
  assert.match(tokens, /--bg:\s*#201712/);
  assert.match(tokens, /--paper:\s*#f3e6ce/);
  assert.match(tokens, /--vinyl-amber:\s*#e39a3a/);
  assert.match(tokens, /--vinyl-teal:\s*#1a6e67/);
  assert.match(tokens, /--vinyl-oxblood:\s*#7a2430/);
  assert.match(tokens, /--display:\s*Oswald/);
  assert.match(tokens, /--text-body:\s*400 17px/);
  assert.match(tokens, /--tap:\s*44px/);
  assert.match(tokens, /color-scheme:\s*dark/);
  assert.doesNotMatch(tokens, /prefers-color-scheme/);
  assert.doesNotMatch(tokens, /#007aff|#0a84ff/);
  assert.doesNotMatch(tokens, /--sidebar-width/);
  assert.match(hig, /line-clamp:\s*2/);
  assert.match(hig, /@media \(max-width: 390px\)/);
  assert.match(hig, /\.home-settings \.settings-summary \{[\s\S]*?min-height:\s*var\(--tap\)/);
  assert.match(hig, /\.next-module-path \{[\s\S]*?min-height:\s*var\(--tap\)/);
  assert.match(hig, /margin-top:\s*var\(--space-6\)/);
  assert.match(hig, /\.module-sheet-row/);
  assert.match(hig, /\.session-stage \{[\s\S]*?margin-block:\s*0/);
  assert.doesNotMatch(hig, /\.session-stage \{[\s\S]*?margin-block:\s*auto/);
  assert.doesNotMatch(hig, /#home-settings-btn/);
  assert.doesNotMatch(hig, /#quick-view-btn,\s*\.quick-view-fab \{\s*display:\s*none/);
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
  assert.equal(compactChordSymbol("A7 ♭9"), "A7♭9");
  assert.equal(compactChordSymbol("F ♯ °7"), "F♯°7");
  assert.equal(compactChordSymbol("F\u00A0♯\u202F°7"), "F♯°7");
  assert.equal(compactChordSymbol("Bbmaj7"), "B♭maj7");
  assert.equal(compactChordSymbol("Ebmaj7"), "E♭maj7");
  assert.equal(compactChordSymbol("Am7b5"), "Am7♭5");
  assert.equal(compactChordSymbol("A7b9"), "A7♭9");
  assert.equal(compactChordSymbol("F#o7"), "F♯°7");
  assert.equal(smuflChordChar("#E260"), "♭");
  assert.equal(smuflChordChar("E870"), "°");
});

test("cue labels are ~13–14px italic drawing units, not the round-2 9px size", () => {
  assert.equal(CUE_FONT_VU, 330);
  assert.equal(cueFontVU(), 330);
  assert.equal(CHORD_FONT_VU, 400);
  assert.equal(chordFontVU(), 400);
  assert.ok(CUE_FONT_VU > 280, "cues must outgrow the 230 VU (~9px) round-2 size");
});

test("engraving restyles chords then separates overlapping symbols", async () => {
  const src = await readFile(new URL("./engrave.js", import.meta.url), "utf8");
  assert.match(src, /separateChordSymbols\(svg\)/);
  assert.match(src, /centerSlashNoteheads\(svg\)/);
  assert.match(src, /middleStaffLineY\(/);
  assert.match(src, /mergeSplitChordSymbols\(/);
  assert.match(src, /applyFixedStaffSize\(/);
  assert.match(src, /restyleHarms\(/);
  assert.match(src, /harmRawText\(/);
  assert.match(src, /fiveLineStaffHeightCss\(/);
  assert.doesNotMatch(src, /chorusStaffFit\(/);
  assert.doesNotMatch(src, /fitChorus/);
});

test("session paper re-renders once Verovio is ready", async () => {
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  assert.match(app, /whenVerovioReady\(\)\.then\(\(\) => \{/);
  assert.match(app, /screen === "session"\) renderNotation\(\)/);
  assert.match(app, /resolveNotationScale\(\)/);
  assert.match(app, /notationScale: resolveNotationScale\(\)/);
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
  assert.equal(chorus.leftMarginAccid, 2);
  assert.ok(chorus.rightMarginAccid >= 1.0);
});

test("timemap highlight picks the event covering the current quarter", () => {
  const timemap = [
    { qstamp: 0, duration: 1, on: ["n1"], off: [] },
    { qstamp: 1, duration: 1, on: ["n2"], off: ["n1"] },
    { qstamp: 2, duration: 2, on: ["n3"], off: ["n2"] },
  ];
  assert.deepEqual(soundingIdsAt(timemap, 0.25), ["n1"]);
  assert.deepEqual(soundingIdsAt(timemap, 1.1), ["n2"]);
  assert.deepEqual(soundingIdsAt(timemap, 3.5), ["n3"]);
  assert.deepEqual(soundingIdsAt(timemap, -1), []);
});

test("notation size presets keep four bars per line and scale the staff together", () => {
  for (const size of [1, 1.2, 1.4, 1.6]) {
    const layout = notationLayout({
      staffWidth: 980,
      viewportWidth: 1024,
      viewportHeight: 1366,
      showPhraseNotation: false,
      showEntranceCues: true,
      notationScale: size,
    });
    assert.equal(layout.barsPerLine, 4, `${size} bars`);
    assert.equal(layout.notationScale, size);
    assert.equal(layout.minStaffPx, Math.round(STAFF_PX * size));
    const staff = staffCssFromPage(verovioOptions(layout, 980, { hasSb: true }).pageWidth, 980);
    assert.ok(Math.abs(staff - STAFF_PX * size) < 1.5, `${size} staff ${staff}`);
  }
});
