import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  boxesIntersect,
  capCueText,
  CHORD_FONT_VU,
  compactChordSymbol,
  MUSIC_FONT_FAMILY,
  cueJustBelowStaff,
  expandedViewBox,
  placeCueBoxes,
  CUE_FONT_VU,
  chordFontVU,
  chordLiftForGap,
  cueFontVU,
  resetVerovioForTests,
  slashRecenterDelta,
  smuflChordChar,
  soundingIdsAt,
  staffCssFromPage,
  STAFF_USER_UNITS,
  svgHasBowingMarks,
  verovioModuleIsReady,
  verovioOptions,
  whenVerovioReady,
} from "./engrave.js";
import { notationLayout, PORTRAIT_STAFF_PX, STAFF_PX } from "./lesson.js";
import { cueCaption } from "./music.js";
import { MODULES, formForApplication } from "./registry.js";
import { visibleModuleLessons } from "./session.js";

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
  assert.match(index, /id="quick-view-btn"[^>]*aria-label="Modules"/);
  assert.match(index, /class="icon-btn modules-menu"/);
  assert.doesNotMatch(index, /id="quick-view-btn"[^>]*>\s*Modules\s*</);
  assert.match(index, />Modules</);
  assert.match(index, /id="quick-view-title">Modules</);
  assert.match(index, /family=Oswald/);
  assert.match(index, /class="play-round"/);
  assert.doesNotMatch(index, /class="session-bottom"/);
  assert.match(index, /id="home-summary"/);
  assert.match(index, /id="home-mode"/);
  assert.match(index, /id="card-badge">Play</);
  assert.match(index, /class="session-transport play-well"/);
  assert.match(index, /class="lick-tools"/);
  assert.match(index, /class="session-footer"/);
  assert.match(index, /id="key-cycle"[^>]*aria-label="Key 1 of 12"/);
  assert.match(index, /play-well/);
  assert.match(index, /id="continue-btn"[^>]*aria-label="Skip"/);
  assert.match(index, /id="continue-btn"[^>]*title="Skip"/);
  assert.match(index, /id="hear-it"[^>]*aria-label="Hear it"/);
  assert.match(index, /id="hear-it"[^>]*title="Hear it"/);
  assert.match(index, /role="switch"/);
  assert.match(index, /id="auto-toggle"[^>]*aria-checked="true"/);
  assert.match(index, /class="switch-track"/);
  assert.match(index, /class="switch-thumb"/);
  assert.match(index, /id="auto-label"[^>]*>Auto</);
  assert.doesNotMatch(index, /class="session-links"/);
  assert.doesNotMatch(index, />Hear it</);
  assert.doesNotMatch(index, /id="continue-btn"[^>]*>\s*Skip\s*</);
  assert.match(index, /id="app-tab-bar"/);
  assert.match(index, /data-testid="tab-licks"/);
  assert.match(index, /data-testid="tab-charts"/);
  assert.match(index, /data-testid="tab-settings"/);
  assert.match(index, /id="next-module"/);
  assert.match(index, /id="instrument-list"/);
  assert.doesNotMatch(index, /class="settings-gear"/);
  assert.doesNotMatch(index, /id="settings-summary-btn"/);
  assert.match(index, /id="settings-form"/);
  const settingsForm = index.slice(index.indexOf('id="settings-form"'), index.indexOf("id=\"screen-session\""));
  assert.doesNotMatch(settingsForm, /sheet-done/);
  assert.doesNotMatch(settingsForm, />Done</);
  assert.match(index, /id="session-title"/);
  assert.match(index, /class="sheet-done"/);
  assert.match(index, /class="session-stage"/);
  assert.doesNotMatch(index, /class="headphones-banner"/);
  assert.doesNotMatch(index, /id="headphones-dismiss"/);
  assert.doesNotMatch(index, /id="session-mode"/);
  assert.doesNotMatch(index, /id="session-quick-view"/);
  assert.doesNotMatch(index, />Jump</);
  assert.doesNotMatch(index, />Continue</);
  assert.doesNotMatch(index, /id="primary-label"/);
  assert.doesNotMatch(index, /id="chart-title"/);
  assert.doesNotMatch(index, /id="chart-meta"/);
  assert.doesNotMatch(index, /id="instruction"/);
  assert.doesNotMatch(index, /Count me in/);
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
  assert.match(hig, /\.home-settings \.home-summary \{[\s\S]*?min-height:\s*var\(--tap\)/);
  assert.match(hig, /\.home-settings \{[\s\S]*?background:\s*var\(--bg-grouped-secondary\)/);
  assert.match(hig, /\.modules-menu \{[\s\S]*?min-width:\s*var\(--tap\)/);
  assert.match(hig, /\.modules-menu \{[\s\S]*?min-height:\s*var\(--tap\)/);
  assert.match(hig, /\.app-tab-bar \{[\s\S]*?height:\s*calc\(49px \+ var\(--safe-bottom\)\)/);
  assert.match(hig, /@media \(min-width: 768px\)/);
  assert.match(hig, /\.next-module-path \{[\s\S]*?min-height:\s*var\(--tap\)/);
  assert.match(hig, /\.session-transport\s*\{[^}]*margin-top:\s*0/);
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

test("accidentals stay in the same font run as the letters", async () => {
  assert.match(MUSIC_FONT_FAMILY, /DuoJazz Music/);
  assert.doesNotMatch(MUSIC_FONT_FAMILY, /Noto Music/);
  const hig = await readFile(new URL("../css/hig.css", import.meta.url), "utf8");
  const tokens = await readFile(new URL("../css/tokens.css", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  const src = await readFile(new URL("./engrave.js", import.meta.url), "utf8");
  assert.match(hig, /\.music-label[\s\S]*var\(--music-font\)/);
  assert.match(tokens, /font-family:\s*"DuoJazz Music"/);
  assert.doesNotMatch(hig, /Noto Music/);
  assert.doesNotMatch(hig, /margin-left:\s*-/);
  assert.doesNotMatch(hig, /letter-spacing:\s*-/);
  assert.doesNotMatch(src, /Noto Music/);
  assert.doesNotMatch(src, /accidentalKern/);
  assert.doesNotMatch(src, /margin-left/);
  assert.match(src, /tspan\.textContent = compact/);
  assert.match(hig, /\.session-transport\s*\{[^}]*display:\s*flex/);
  assert.match(hig, /\.session-transport\s*\{[^}]*justify-content:\s*center/);
  assert.match(hig, /\.lick-tools\s*\{[^}]*justify-content:\s*space-between/);
  assert.match(hig, /\.session-footer\s*\{[^}]*padding:[^;]*var\(--safe-bottom\)/);
  assert.match(hig, /\.key-seg\[data-state="passed"\]\s*\{[^}]*background:\s*var\(--tint-solid\)/);
  assert.match(hig, /\.key-seg\[data-state="skipped"\]\s*\{[^}]*border:/);
  assert.match(hig, /\.key-seg\[data-state="current"\]\s*\{[^}]*background:\s*var\(--tint\)/);
  assert.doesNotMatch(hig, /grid-area:\s*links/);
  assert.match(hig, /\.transport-icon\s*\{[^}]*min-width:\s*44px/);
  assert.match(hig, /\.transport-icon\s*\{[^}]*min-height:\s*44px/);
  assert.match(hig, /\.auto-toggle\[aria-checked="true"\] \.switch-track\s*\{[^}]*background:\s*var\(--tint-solid\)/);
  assert.match(app, /fillMusicLabel\(symbol,/);
  assert.match(app, /fillMusicLabel\(\s*els\.sessionKey/);
  assert.doesNotMatch(app, /fillMusicLabel\(els\.chartMeta/);
  assert.match(app, /fillMusicLabel\(btn, option\.label\)/);
  assert.doesNotMatch(app, /textContent = "Octave"/);
  assert.match(app, /setAttribute\("aria-label", "Octave down \(8vb\)"\)/);
  assert.match(app, /setAttribute\("aria-label", "Octave up \(8va\)"\)/);
  assert.match(app, /textContent = "8vb"/);
  assert.match(app, /textContent = "8va"/);
  assert.match(app, /renderKeyCycle\(/);
  assert.match(app, /sessionModeHeading\(session\)/);
  assert.doesNotMatch(app, /cardBadge\.textContent = "Play"/);
  assert.match(app, /renderHomeMode\(/);
  assert.doesNotMatch(app, /section\.append\(copy, badge, studySwitch/);
});

function cueTextWidth(text, font = 330) {
  const measured = { HERE: 790 / 330, "Get ready": 1356 / 330 };
  const em = measured[text] ?? Math.max(2.2, text.length * 0.55);
  return em * font;
}

test("cue label boxes in an engraved tune lesson do not intersect", () => {
  const engraved = placeCueBoxes([
    { text: "HERE", x: 2473, y: 2655, width: 790, height: 471, barX: 2100, barRight: 3913, obstacleBottom: 2580 },
    { text: "Get ready", x: 3913, y: 2655, width: 1356, height: 471, barX: 3913, barRight: 5058, obstacleBottom: 2580 },
    { text: "HERE", x: 5058, y: 2655, width: 790, height: 471, barX: 5058, barRight: 6400, obstacleBottom: 3000 },
    { text: "Get ready", x: 3182, y: 5986, width: 1356, height: 471, barX: 3000, barRight: 4489, obstacleBottom: 5900 },
    { text: "HERE", x: 4489, y: 5986, width: 790, height: 471, barX: 4489, barRight: 5900, obstacleBottom: 6400 },
  ], { gap: 46 });
  for (let i = 0; i < engraved.length; i += 1) {
    for (let j = i + 1; j < engraved.length; j += 1) {
      assert.equal(boxesIntersect(engraved[i], engraved[j]), false, `${engraved[i].text} ∩ ${engraved[j].text}`);
    }
    assert.ok(engraved[i].x + engraved[i].width <= engraved[i].barRight, engraved[i].text);
  }
  assert.ok(engraved[2].y >= 3000, "HERE clears the beamed notes under the staff");

  const viewports = [
    { barsPerLine: 4, barWidth: 1145 },
    { barsPerLine: 4, barWidth: 1500 },
    { barsPerLine: 2, barWidth: 2200 },
    { barsPerLine: 4, barWidth: 900 },
  ];
  for (const module of MODULES) {
    for (const lesson of visibleModuleLessons(module)) {
      const appId = lesson.applicationId;
      const barCount = formForApplication(appId).bars.length;
      for (const viewport of viewports) {
        const boxes = [];
        for (let bar = 1; bar <= barCount; bar += 1) {
          const text = cueCaption(bar, appId);
          if (!text) continue;
          const col = (bar - 1) % viewport.barsPerLine;
          const row = Math.floor((bar - 1) / viewport.barsPerLine);
          const barX = col * viewport.barWidth;
          boxes.push({
            text,
            x: barX + 36,
            y: row * 3600 + 700,
            width: cueTextWidth(text),
            height: 471,
            barX,
            barRight: barX + viewport.barWidth,
            obstacleBottom: row * 3600 + 980,
          });
        }
        const placed = placeCueBoxes(boxes, { gap: 46 });
        for (let i = 0; i < placed.length; i += 1) {
          const note = {
            x: placed[i].barX,
            y: placed[i].obstacleBottom - 200,
            width: placed[i].barRight - placed[i].barX,
            height: 200,
          };
          assert.equal(
            boxesIntersect(placed[i], note),
            false,
            `${lesson.id} ${viewport.barWidth} ${placed[i].text} overlaps notes`,
          );
          for (let j = i + 1; j < placed.length; j += 1) {
            assert.equal(
              boxesIntersect(placed[i], placed[j]),
              false,
              `${lesson.id} ${viewport.barWidth} ${placed[i].text} ∩ ${placed[j].text}`,
            );
          }
        }
      }
    }
  }
});

test("slash recentering uses the middle staff line and chords keep a half-em gap", () => {
  const lines = [181, 201.8, 222.6, 243.4, 264.2];
  assert.equal(slashRecenterDelta(lines, 160.2, 41.6), 222.6 - (160.2 + 20.8));
  assert.equal(slashRecenterDelta(lines, 201.8, 41.6), 0);
  assert.equal(slashRecenterDelta(lines.slice(0, 4), 160, 40), 0);
  assert.equal(chordLiftForGap(730, 721, 18), 721 - 730 - 9);
  assert.equal(chordLiftForGap(150, 181, 20), 0);
  assert.equal(chordLiftForGap(100, 109, 20), 109 - 100 - 10);
});

test("HERE sits below the lick ink and the page grows instead of clipping chords", () => {
  const cue = { left: 100, top: 400, width: 48, height: 16 };
  const parked = cueJustBelowStaff(cue, 210, 160, {
    gap: 6,
    noteBottom: 198,
    minLeft: 20,
    maxRight: 400,
  });
  assert.equal(parked.top, 216);
  assert.equal(parked.left, 136);
  assert.equal(parked.dy, 216 - 400);
  const lowNote = cueJustBelowStaff(cue, 210, 160, { gap: 6, noteBottom: 240 });
  assert.equal(lowNote.top, 246);
  const underBeam = cueJustBelowStaff(cue, 210, 160, { gap: 6, noteBottom: 198, inkBottom: 280 });
  assert.equal(underBeam.top, 286);
  assert.ok(underBeam.top > 280, "HERE stays clear of the beam and tuplet numeral");
  const page = expandedViewBox({ x: 0, y: 0, width: 1148, height: 600 }, { top: 28, bottom: 0 });
  assert.equal(page.width, 1148);
  assert.equal(page.y, -28);
  assert.equal(page.height, 628);
  const untouched = expandedViewBox({ x: 0, y: 0, width: 1148, height: 699 }, { top: 0, bottom: 0 });
  assert.equal(untouched.y, 0);
  assert.equal(untouched.height, 699);
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
  assert.match(src, /layoutCueLabels\(svg\)/);
  assert.match(src, /MUSIC_FONT_FAMILY/);
  assert.match(src, /centerSlashNoteheads\(svg\)/);
  assert.match(src, /clearChordInkGap\(svg\)/);
  assert.match(src, /cueJustBelowStaff\(/);
  assert.match(src, /inkFloor\(/);
  assert.match(src, /padViewBoxToInk\(svg\)/);
  assert.match(src, /expandedViewBox\(/);
  assert.match(src, /separateChordSymbols\(svg, layout\)/);
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

test("home controls and session paper match the simplify revision", async () => {
  const hig = await readFile(new URL("../css/hig.css", import.meta.url), "utf8");
  const styles = await readFile(new URL("../css/styles.css", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  assert.match(hig, /\.study-switch-btn\s*\{[^}]*min-height:\s*44px/);
  assert.match(hig, /\.study-switch-btn\s*\{[^}]*font:\s*600 16px\/20px/);
  assert.match(hig, /\.app-tab\s*\{[^}]*min-height:\s*44px/);
  assert.match(hig, /\.app-tab\s*\{[^}]*font:\s*600 16px\/20px/);
  assert.match(hig, /--content-max:\s*900px/);
  assert.match(hig, /\.paper\.notation-memory \.note/);
  assert.match(hig, /\.notation-memory \.note\.memory-first[\s\S]*visibility:\s*visible/);
  assert.match(app, /markFirstMelodyNote\(els\.notation\)/);
  assert.match(styles, /\.sleeve-context\s*\{[^}]*white-space:\s*nowrap/);
  assert.match(styles, /\.sleeve-context\s*\{[^}]*text-overflow:\s*ellipsis/);
  assert.match(app, /sessionEngraveSpec\(session\)/);
  assert.match(app, /fitNotationInView\(\)/);
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
    assert.equal(layout.minStaffPx, Math.round(PORTRAIT_STAFF_PX * size));
    const staff = staffCssFromPage(verovioOptions(layout, 980, { hasSb: true }).pageWidth, 980);
    assert.ok(Math.abs(staff - PORTRAIT_STAFF_PX * size) < 1.5, `${size} staff ${staff}`);
  }
});
