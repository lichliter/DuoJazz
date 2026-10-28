import test from "node:test";
import assert from "node:assert/strict";
import { getKey, scheduleChorus, applicationContext } from "./music.js";
import {
  presentation,
  audioConfigFor,
  defaultState,
  barCaption,
  livePrompt,
  primaryAction,
  instructionCopy,
  leaksTargetBar,
  currentAssessment,
  assessmentKey,
  afterRoundActions,
  chartCopy,
  GOALS,
  isStandPortrait,
  isStandLandscape,
  notationLayout,
  notationCssWidth,
  baseStaffPx,
  nextEngravingWidth,
  nextStaffsep,
  estimatedStaffHeightCss,
  chorusStaffFit,
  slashStrokeBox,
  slashFitsStaff,
  STAFF_PX,
  STAFF_PX_NARROW,
  PORTRAIT_STAFF_PX,
  parseNotationScale,
  persistNotationScale,
  resolveNotationScale,
  staffPxForScale,
  NOTATION_SCALE_KEY,
  NOTATION_SCALE_VALUES,
} from "./lesson.js";
import { createSession, sessionEngraveSpec, sessionModeHeading } from "./session.js";
import { staffCssFromPage, verovioOptions } from "./engrave.js";

const helpState = { ...defaultState(), support: "help" };
const freeState = { ...defaultState(), support: "free" };
const learnState = { ...defaultState(), goal: "learn" };

test("play freely removes model, prescribed cues, and target-bar copy", () => {
  const view = presentation(freeState);
  assert.equal(view.showModelNotation, false);
  assert.equal(view.showSlashNotation, true);
  assert.equal(view.showEntranceCues, false);
  assert.equal(view.includeModel, false);
  assert.equal(view.includeCue, false);
  assert.equal(view.includeGuides, false);
  assert.equal(barCaption(7, view.showEntranceCues, "minor-home"), "");
  const config = audioConfigFor(freeState);
  assert.equal(config.includeModel, false);
  assert.equal(config.includeCue, false);
  assert.equal(config.variationId, "skip");
  const events = scheduleChorus(config);
  assert.equal(events.filter((event) => event.type === "melody").length, 0);
  assert.equal(events.filter((event) => event.type === "cue").length, 0);
  assert.equal(events.find((event) => event.type === "end").beat, 32);
  const copy = instructionCopy(freeState);
  assert.equal(leaksTargetBar(copy), false);
  assert.equal(leaksTargetBar(livePrompt(freeState, { playing: true, bar: 7, beatInBar: 1 })), false);
  const fMinor = applicationContext(getKey("F"), "concert", "minor-home").freeBlurb;
  assert.match(fMinor, /F minor/);
  assert.equal(leaksTargetBar(fMinor), false);
});

test("listen plays an eight-bar model solo with visual cues and no audio door bells", () => {
  const view = presentation("hear");
  assert.equal(view.goalId, "integrate");
  assert.equal(view.supportId, "listen");
  assert.equal(view.showModelNotation, true);
  assert.equal(view.showSlashNotation, false);
  assert.equal(view.showEntranceCues, true);
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

test("play with help uses slash staff, entrance cues, and no default model", () => {
  const view = presentation(helpState);
  assert.equal(view.showSlashNotation, true);
  assert.equal(view.showModelNotation, false);
  assert.equal(view.showEntranceCues, true);
  assert.equal(view.includeModel, false);
  assert.equal(view.includeCue, true);
  assert.equal(barCaption(7, true, "minor-home"), "HERE");
  assert.equal(barCaption(6, true, "altered-dominant"), "HERE");
  assert.equal(barCaption(5, true, "altered-dominant"), "");
  const events = scheduleChorus(audioConfigFor(helpState));
  assert.equal(events.filter((event) => event.type === "melody").length, 0);
  const cues = events.filter((event) => event.type === "cue");
  assert.equal(cues.length, 2);
  assert.equal(cues[0].beat, 23);
  assert.equal(cues[1].beat, 24);
});

test("altered-dominant help cues bar 6, not the G-minor downbeat", () => {
  const config = audioConfigFor({ ...helpState, applicationId: "altered-dominant" });
  const events = scheduleChorus(config);
  const cues = events.filter((event) => event.type === "cue");
  assert.equal(cues[0].beat, 19);
  assert.equal(cues[1].beat, 20);
  assert.equal(config.lengthBeats, 32);
});

test("learn goal is isolated cell practice, not a gate before the chorus", () => {
  const view = presentation(learnState);
  assert.equal(view.goalId, "learn");
  assert.equal(view.audioStage, "learn");
  assert.equal(view.showPhraseNotation, true);
  assert.equal(view.showSlashNotation, false);
  assert.equal(view.lengthBeats, 8);
  const echo = audioConfigFor({ ...learnState, cellMode: "echo" });
  assert.equal(echo.includeModel, false);
  assert.equal(echo.stage, "learn");
});

test("explore keys keeps the cell in the chosen key without demanding twelve", () => {
  const view = presentation({ ...defaultState(), goal: "keys", concertKeyId: "F" });
  assert.equal(view.showKeyPicker, true);
  assert.equal(view.audioStage, "learn");
  assert.equal(view.showPhraseNotation, true);
  const copy = instructionCopy({ ...defaultState(), goal: "keys", concertKeyId: "F" });
  assert.match(copy, /F minor/);
  assert.doesNotMatch(copy, /all twelve|must|unlock/i);
});

test("check yourself hides the answer until reveal and keeps recall separate from application", () => {
  const hidden = presentation({ ...defaultState(), goal: "check", checkKind: "recall", revealed: false });
  const shown = presentation({ ...defaultState(), goal: "check", checkKind: "recall", revealed: true });
  assert.equal(hidden.hideAnswers, true);
  assert.equal(hidden.showAnswerContext, false);
  assert.equal(hidden.showApplicationPlacement, false);
  assert.equal(hidden.showPhraseNotation, false);
  assert.equal(shown.showPhraseNotation, true);
  assert.equal(shown.showAnswerContext, true);
  assert.equal(shown.showApplicationPlacement, true);
  const applyHidden = presentation({ ...defaultState(), goal: "check", checkKind: "application", revealed: false });
  assert.equal(applyHidden.showSlashNotation, true);
  assert.equal(applyHidden.showEntranceCues, false);
  assert.equal(applyHidden.showAnswerContext, false);
  const applyShown = presentation({ ...defaultState(), goal: "check", checkKind: "application", revealed: true });
  assert.equal(applyShown.showEntranceCues, true);
  const recallKey = assessmentKey({ ...defaultState(), goal: "check", checkKind: "recall", concertKeyId: "G" });
  const applyKey = assessmentKey({ ...defaultState(), goal: "check", checkKind: "application", concertKeyId: "G" });
  const fKey = assessmentKey({ ...defaultState(), goal: "check", checkKind: "recall", concertKeyId: "F" });
  assert.notEqual(recallKey, applyKey);
  assert.notEqual(recallKey, fKey);
});

function hiddenCheckSurfaces(partial) {
  const state = { ...defaultState(), goal: "check", revealed: false, ...partial };
  const ctx = applicationContext(getKey(state.concertKeyId), state.displayMode, state.applicationId);
  const chart = chartCopy(state);
  return {
    state,
    ctx,
    instruction: instructionCopy(state),
    live: livePrompt(state),
    title: chart.title,
    meta: chart.meta,
    view: presentation(state),
  };
}

function assertNoAnswerLeak(surfaces) {
  const { ctx, instruction, live, title, meta, view } = surfaces;
  const blob = `${instruction}\n${live}\n${title}\n${meta}`;
  assert.equal(view.showAnswerContext, false);
  assert.equal(view.showApplicationPlacement, false);
  assert.equal(blob.includes(ctx.targetChord), false, blob);
  assert.doesNotMatch(blob, /shape over/i);
  assert.equal(leaksTargetBar(blob), false);
  if (ctx.cellName !== ctx.tuneName) {
    assert.equal(blob.includes(ctx.cellName), false, blob);
  }
}

test("hidden self-check copy stays neutral in G, F, and a sharp-side key", () => {
  for (const concertKeyId of ["G", "F", "D"]) {
    for (const applicationId of ["minor-home", "altered-dominant"]) {
      for (const checkKind of ["recall", "application"]) {
        const surfaces = hiddenCheckSurfaces({ concertKeyId, applicationId, checkKind });
        assertNoAnswerLeak(surfaces);
        assert.match(surfaces.instruction, /Reveal|hidden/i);
        const shown = instructionCopy({ ...surfaces.state, revealed: true });
        if (checkKind === "recall") assert.match(shown, new RegExp(surfaces.ctx.cellName.replace(/[♭#]/g, "\\$&")));
        else assert.match(shown, new RegExp(surfaces.ctx.tuneName.replace(/[♭#]/g, "\\$&")));
      }
    }
  }
  const alteredG = hiddenCheckSurfaces({
    concertKeyId: "G",
    applicationId: "altered-dominant",
    checkKind: "recall",
  });
  assert.doesNotMatch(`${alteredG.instruction} ${alteredG.live}`, /E♭ minor|Eb minor|D7/);
  const fApply = hiddenCheckSurfaces({
    concertKeyId: "F",
    applicationId: "minor-home",
    checkKind: "application",
  });
  assert.doesNotMatch(`${fApply.instruction} ${fApply.live}`, /Fm6|bar 7/i);
});

test("primary action is the chart play control, not a linear continue", () => {
  assert.deepEqual(primaryAction("hear", { playing: false, paused: false, ended: false }), {
    id: "start",
    label: "Hear the eight bars",
  });
  assert.equal(primaryAction("hear", { playing: true, paused: false, ended: false }).id, "pause");
  assert.equal(primaryAction("hear", { playing: false, paused: true, ended: false }).id, "resume");
  assert.equal(primaryAction(helpState, { playing: false, paused: false, ended: false }).label, "Count me in");
  assert.equal(primaryAction(learnState, { playing: false, paused: false, ended: false }).label, "Hear the cell");
  assert.equal(primaryAction({ ...learnState, applicationId: "gts-learn" }, { playing: false, paused: false, ended: false }).label, "Hear the lick");
  assert.equal(primaryAction({ ...learnState, applicationId: "bo-learn" }, { playing: false, paused: false, ended: false }).label, "Hear the lick");
  assert.equal(primaryAction({ ...defaultState(), goal: "check", checkKind: "recall", revealed: false }).label, "Count me in");
});

test("help live prompt changes at the door for each application and current key", () => {
  assert.match(livePrompt(helpState, { playing: true, bar: 4, beatInBar: 1 }), /Improvise/);
  assert.match(livePrompt(helpState, { playing: true, bar: 6, beatInBar: 4 }), /Ready/);
  assert.match(livePrompt(helpState, { playing: true, bar: 7, beatInBar: 1 }), /Play the phrase/);
  assert.match(livePrompt(helpState, { playing: true, bar: 8, beatInBar: 1 }), /Keep going/);
  const altered = { ...helpState, applicationId: "altered-dominant" };
  assert.match(livePrompt(altered, { playing: true, bar: 6, beatInBar: 1 }), /Play the phrase/);
  assert.match(livePrompt(altered, { playing: true, bar: 7, beatInBar: 1 }), /G minor/);
  const fAltered = { ...helpState, applicationId: "altered-dominant", concertKeyId: "F" };
  assert.match(livePrompt(fAltered, { playing: true, bar: 7, beatInBar: 1 }), /F minor/);
  assert.doesNotMatch(livePrompt(fAltered, { playing: true, bar: 7, beatInBar: 1 }), /G minor/);
});

test("application copy follows concert key for Gm, Fm, and a sharp-side key", () => {
  const g = applicationContext(getKey("G"), "concert", "minor-home");
  const gAlt = applicationContext(getKey("G"), "concert", "altered-dominant");
  const f = applicationContext(getKey("F"), "concert", "minor-home");
  const fAlt = applicationContext(getKey("F"), "concert", "altered-dominant");
  const d = applicationContext(getKey("D"), "concert", "minor-home");
  const dAlt = applicationContext(getKey("D"), "concert", "altered-dominant");
  assert.equal(g.cellName, "G minor");
  assert.equal(g.targetChord, "Gm6");
  assert.equal(g.enterBar, 7);
  assert.equal(gAlt.cellName, "E♭ minor");
  assert.equal(gAlt.targetChord, "D7");
  assert.equal(gAlt.enterBar, 6);
  assert.equal(f.cellName, "F minor");
  assert.equal(f.targetChord, "Fm6");
  assert.match(f.listenBlurb, /F minor/);
  assert.doesNotMatch(f.listenBlurb, /G minor|Gm\b/);
  assert.equal(fAlt.cellName, "D♭ minor");
  assert.equal(fAlt.targetChord, "C7");
  assert.equal(d.cellName, "D minor");
  assert.equal(d.targetChord, "Dm6");
  assert.equal(dAlt.cellName, "B♭ minor");
  assert.equal(dAlt.targetChord, "A7");
  assert.match(applicationContext(getKey("F"), "concert", "minor-home").listenBlurb, /F minor/);
  assert.doesNotMatch(applicationContext(getKey("F"), "concert", "minor-home").listenBlurb, /G-minor|Gm arrival/);
  assert.match(instructionCopy({ ...defaultState(), concertKeyId: "F" }), /bar 7/);
});

test("default notation view is concert bass clef, separate from B-flat transposition", () => {
  const state = defaultState();
  assert.equal(state.clef, "bass");
  assert.equal(state.displayMode, "concert");
  const config = audioConfigFor(state);
  assert.equal(config.displayMode, "concert");
  assert.equal(config.concertKey.id, "G");
});

test("four goals are available without a required order", () => {
  assert.deepEqual(GOALS.map((goal) => goal.id), ["learn", "integrate", "keys", "check"]);
  const fromLearn = afterRoundActions(learnState).map((item) => item.id);
  assert.ok(fromLearn.includes("keys"));
  assert.ok(fromLearn.includes("repeat"));
});

test("self-check marks are stored per application, key, and check kind", () => {
  const state = defaultState();
  const homeG = assessmentKey({ ...state, applicationId: "minor-home", concertKeyId: "G" });
  state.assessments[homeG] = { ...currentAssessment(state), foundEntrance: "yes" };
  assert.equal(currentAssessment({ ...state, applicationId: "altered-dominant" }).foundEntrance, "");
  assert.equal(currentAssessment({ ...state, concertKeyId: "F" }).foundEntrance, "");
  assert.equal(currentAssessment({ ...state, applicationId: "minor-home", concertKeyId: "G" }).foundEntrance, "yes");
});

test("melody register defaults to Original and rides on audio config", () => {
  const state = defaultState();
  assert.equal(state.melodyRegister, 0);
  assert.equal(audioConfigFor(state).melodyRegister, 0);
  const up = audioConfigFor({ ...state, melodyRegister: 1 });
  assert.equal(up.melodyRegister, 1);
  const events = scheduleChorus(up);
  const melody = events.filter((event) => event.type === "melody");
  const phrase = melody.filter((event) => event.role === "phrase");
  assert.equal(melody[0].midi, 60 + 12);
  assert.equal(phrase[0].midi, 69 + 12);
  assert.equal(phrase[0].beat, 24);
});

test("play freely stays without model at every melody register", () => {
  for (const melodyRegister of [-1, 0, 1]) {
    const view = presentation({ ...freeState, melodyRegister });
    assert.equal(view.showModelNotation, false);
    assert.equal(view.includeModel, false);
    const config = audioConfigFor({ ...freeState, melodyRegister });
    assert.equal(config.includeModel, false);
    assert.equal(config.variationId, "skip");
    assert.equal(config.melodyRegister, melodyRegister);
    const events = scheduleChorus(config);
    assert.equal(events.filter((event) => event.type === "melody").length, 0);
  }
});

test("iPad Pro 12.9 portrait is the stand-portrait layout target", () => {
  assert.equal(isStandPortrait(1024, 1366), true);
  assert.equal(isStandPortrait(1366, 1024), false);
  assert.equal(isStandPortrait(1280, 720), false);
  assert.equal(isStandPortrait(375, 812), false);
  assert.equal(isStandLandscape(1366, 1024), true);
  assert.equal(isStandLandscape(1024, 1366), false);
  assert.equal(isStandLandscape(1280, 720), false);
});

test("stand portrait uses two-bar systems so the lick has room", () => {
  const stand = notationLayout({
    staffWidth: 980,
    viewportWidth: 1024,
    viewportHeight: 1366,
    showPhraseNotation: false,
    showEntranceCues: true,
  });
  assert.equal(stand.barsPerLine, 2);
  assert.equal(stand.wrap, null);
  assert.equal(stand.fitToPaper, false);
  assert.equal(stand.fillAxis, "fit");
  assert.equal(stand.naturalWidth, false);
  assert.equal(stand.staffsep, 96);
  assert.equal(stand.minStaffPx, PORTRAIT_STAFF_PX);
  assert.ok(stand.minStaffPx >= 96, "portrait staff must read from a meter away");
  assert.ok(stand.fillRatio >= 0.7);
  const staffCss = estimatedStaffHeightCss(stand, 900);
  assert.equal(staffCss, PORTRAIT_STAFF_PX);
  const landscape = notationLayout({
    staffWidth: 980,
    viewportWidth: 1366,
    viewportHeight: 1024,
    showPhraseNotation: false,
    showEntranceCues: true,
  });
  assert.equal(landscape.barsPerLine, 4);
  assert.equal(landscape.wrap, null);
  assert.equal(landscape.fitToPaper, false);
  assert.equal(landscape.minStaffPx, STAFF_PX);
  assert.equal(landscape.scale, 1);
  const desktop = notationLayout({
    staffWidth: 760,
    viewportWidth: 1280,
    viewportHeight: 720,
    showPhraseNotation: false,
    showEntranceCues: true,
  });
  assert.equal(desktop.barsPerLine, 4);
  assert.equal(desktop.wrap, null);
  const narrow = notationLayout({
    staffWidth: 340,
    viewportWidth: 375,
    viewportHeight: 812,
    showPhraseNotation: false,
    showEntranceCues: true,
  });
  assert.equal(narrow.barsPerLine, 2);
  assert.equal(narrow.wrap, null);
  assert.equal(narrow.minStaffPx, STAFF_PX_NARROW);
  assert.equal(narrow.fitToPaper, false);
});

test("chorus layout keeps bars intact: 4 per line wherever width allows, never abcjs wrap", () => {
  const chorusBars = 8;
  const cases = [
    { name: "iPad portrait 1024×1366", staffWidth: 980, viewportWidth: 1024, viewportHeight: 1366, barsPerLine: 2 },
    { name: "iPad landscape 1366×1024", staffWidth: 980, viewportWidth: 1366, viewportHeight: 1024, barsPerLine: 4 },
    { name: "laptop 1280×720", staffWidth: 760, viewportWidth: 1280, viewportHeight: 720, barsPerLine: 4 },
    { name: "phone 375×812", staffWidth: 340, viewportWidth: 375, viewportHeight: 812, barsPerLine: 2 },
  ];
  for (const viewport of cases) {
    const layout = notationLayout({
      staffWidth: viewport.staffWidth,
      viewportWidth: viewport.viewportWidth,
      viewportHeight: viewport.viewportHeight,
      showPhraseNotation: false,
      showEntranceCues: true,
    });
    assert.equal(layout.barsPerLine, viewport.barsPerLine, viewport.name);
    assert.equal(layout.wrap, null, viewport.name);
    assert.equal(layout.stretchlast, false, viewport.name);
    assert.ok(layout.timeBasedLayout, viewport.name);
    assert.equal(
      Math.ceil(chorusBars / layout.barsPerLine),
      viewport.barsPerLine === 4 ? 2 : 4,
      viewport.name,
    );
  }
});

test("focused cells fill the card at the same staff size as the chorus", () => {
  const chorus = notationLayout({
    staffWidth: 900,
    viewportWidth: 1024,
    viewportHeight: 1366,
    showPhraseNotation: false,
    showEntranceCues: false,
  });
  const phrase = notationLayout({
    staffWidth: 900,
    viewportWidth: 1024,
    viewportHeight: 1366,
    showPhraseNotation: true,
    showEntranceCues: false,
    phraseBars: 2,
  });
  assert.equal(phrase.barsPerLine, 2);
  assert.equal(phrase.stretchlast, false);
  assert.equal(phrase.fitToPaper, false);
  assert.equal(phrase.fillAxis, "fit");
  assert.equal(phrase.naturalWidth, false);
  assert.equal(phrase.minStaffPx, chorus.minStaffPx);
  assert.equal(phrase.minStaffPx, PORTRAIT_STAFF_PX);
  assert.equal(phrase.chordCssPx, chorus.chordCssPx);
  const gts = notationLayout({
    staffWidth: 900,
    viewportWidth: 1024,
    viewportHeight: 1366,
    showPhraseNotation: true,
    showEntranceCues: false,
    phraseBars: 3,
  });
  assert.equal(gts.barsPerLine, 3);
  assert.equal(gts.naturalWidth, false);
  assert.equal(gts.minStaffPx, chorus.minStaffPx);
  assert.equal(gts.stretchlast, false);
  const five = notationLayout({
    staffWidth: 900,
    viewportWidth: 1024,
    viewportHeight: 1366,
    showPhraseNotation: true,
    showEntranceCues: false,
    phraseBars: 5,
  });
  assert.equal(five.barsPerLine, 5);
  assert.equal(five.naturalWidth, false);
  assert.equal(five.minStaffPx, chorus.minStaffPx);
});

test("Learn and Practice render the staff at the same size", () => {
  const viewports = [
    { name: "iPad portrait", staffWidth: 900, viewportWidth: 1024, viewportHeight: 1366 },
    { name: "iPad landscape", staffWidth: 640, viewportWidth: 1366, viewportHeight: 1024 },
    { name: "laptop", staffWidth: 640, viewportWidth: 1280, viewportHeight: 720 },
    { name: "phone", staffWidth: 340, viewportWidth: 375, viewportHeight: 812 },
  ];
  for (const lessonId of ["learn-lick", "integrate-minor-home"]) {
    const learn = sessionEngraveSpec(createSession({ lessonId, studyMode: "learn" }));
    const practice = sessionEngraveSpec(createSession({ lessonId, studyMode: "practice" }));
    assert.equal(learn.mei, practice.mei, lessonId);
    assert.equal(learn.showPhraseNotation, practice.showPhraseNotation, lessonId);
    assert.equal(learn.memory, false, lessonId);
    assert.equal(practice.memory, true, lessonId);
    assert.equal(sessionModeHeading(createSession({ lessonId, studyMode: "learn" })), "Play");
    assert.equal(sessionModeHeading(createSession({ lessonId, studyMode: "practice" })), "Play");
    for (const viewport of viewports) {
      const learnLayout = notationLayout({
        staffWidth: viewport.staffWidth,
        viewportWidth: viewport.viewportWidth,
        viewportHeight: viewport.viewportHeight,
        showPhraseNotation: learn.showPhraseNotation,
        showEntranceCues: learn.showEntranceCues,
        phraseBars: learn.phraseBars,
      });
      const practiceLayout = notationLayout({
        staffWidth: viewport.staffWidth,
        viewportWidth: viewport.viewportWidth,
        viewportHeight: viewport.viewportHeight,
        showPhraseNotation: practice.showPhraseNotation,
        showEntranceCues: practice.showEntranceCues,
        phraseBars: practice.phraseBars,
      });
      assert.equal(learnLayout.minStaffPx, practiceLayout.minStaffPx, `${lessonId} ${viewport.name}`);
      assert.equal(learnLayout.naturalWidth, false, viewport.name);
      assert.equal(practiceLayout.naturalWidth, false, viewport.name);
      assert.equal(learnLayout.chordCssPx, practiceLayout.chordCssPx, viewport.name);
      assert.equal(learnLayout.barsPerLine, practiceLayout.barsPerLine, `${lessonId} ${viewport.name}`);
      const hasSb = learnLayout.barsPerLine < 8;
      const learnPage = verovioOptions(learnLayout, viewport.staffWidth, { hasSb }).pageWidth;
      const practicePage = verovioOptions(practiceLayout, viewport.staffWidth, { hasSb }).pageWidth;
      assert.equal(learnPage, practicePage, `${lessonId} ${viewport.name}`);
      const learnStaff = staffCssFromPage(learnPage, viewport.staffWidth);
      const practiceStaff = staffCssFromPage(practicePage, viewport.staffWidth);
      assert.ok(Math.abs(learnStaff - practiceStaff) < 0.5, `${lessonId} ${viewport.name}`);
      assert.ok(Math.abs(learnStaff - learnLayout.minStaffPx) < 1.5, `${viewport.name} ${learnStaff}`);
    }
  }
  assert.equal(baseStaffPx({ staffWidth: 900, viewportWidth: 1024, viewportHeight: 1366 }), PORTRAIT_STAFF_PX);
  assert.equal(notationCssWidth(900, 420, 300), Math.floor(900 * 300 / 420));
  assert.equal(notationCssWidth(900, 280, 400), 900);
});

test("chorus staff fit squeezes four-bar engraving to an 80px staff without extra systems", () => {
  const fit = chorusStaffFit(466, 31.7, 984, 80);
  assert.equal(fit.scaleX < 1, true);
  assert.ok(fit.scaleX >= 0.74);
  const staffCss = 31.7 * (984 / fit.viewBoxWidth);
  assert.ok(staffCss >= 80);
  const alreadyTall = chorusStaffFit(300, 40, 980, 80);
  assert.equal(alreadyTall.scaleX, 1);
});

test("narrower engraving width upscales the staff to fill unused paper", () => {
  const overflow = nextEngravingWidth(700, 900, 700, 986);
  assert.equal(overflow > 700, true);
  const tooShort = nextEngravingWidth(960, 450, 850, 986);
  assert.equal(tooShort < 960, true);
  assert.equal(tooShort >= 400, true);
  assert.equal(nextEngravingWidth(560, 820, 850, 986), 560);
  const underfilled = nextEngravingWidth(560, 760, 864, 986);
  assert.equal(underfilled < 560, true);
  assert.equal(nextEngravingWidth(500, 400, 800, 986, 720), 720);
  assert.equal(nextStaffsep(168, 700, 900) > 168, true);
  assert.equal(nextStaffsep(168, 880, 900), 168);
});

test("slash glyph bounds stay inside the staff even from a huge rest box", () => {
  const staff = { x: 0, y: 40, width: 400, height: 20 };
  const hugeRest = { x: 8, y: 0, width: 180, height: 92 };
  const stroke = slashStrokeBox(hugeRest, staff);
  assert.equal(slashFitsStaff(stroke, staff), true);
  assert.ok(Math.abs(stroke.x2 - stroke.x1) < staff.height);
  assert.ok(Math.abs(stroke.y2 - stroke.y1) <= staff.height + 0.75);
  const notehead = { x: 24, y: 46, width: 7, height: 6 };
  const short = slashStrokeBox(notehead, staff);
  assert.equal(slashFitsStaff(short, staff), true);
  assert.ok(Math.abs(short.x2 - short.x1) < staff.height);
});

test("echo cell keeps the pad only; helped slash staff still uses the register", () => {
  const echo = audioConfigFor({ ...learnState, cellMode: "echo", melodyRegister: -1 });
  assert.equal(echo.includeModel, false);
  assert.equal(echo.melodyRegister, -1);
  assert.equal(scheduleChorus(echo).filter((event) => event.type === "melody").length, 0);
  const tryConfig = audioConfigFor({ ...helpState, melodyRegister: 1 });
  assert.equal(tryConfig.includeModel, false);
  assert.equal(tryConfig.melodyRegister, 1);
  assert.equal(presentation(helpState).showSlashNotation, true);
});

test("notation URL param accepts the four presets and persists them", () => {
  assert.deepEqual(NOTATION_SCALE_VALUES, [1, 1.2, 1.4, 1.6]);
  assert.equal(parseNotationScale("1"), 1);
  assert.equal(parseNotationScale("1.0"), 1);
  assert.equal(parseNotationScale("1.4"), 1.4);
  assert.equal(parseNotationScale("2"), null);
  assert.equal(staffPxForScale(1), STAFF_PX);
  assert.equal(staffPxForScale(1.4), 56);
  assert.equal(staffPxForScale(1.6), 64);
  const memory = new Map();
  const storage = {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, String(value)),
  };
  assert.equal(resolveNotationScale({ search: "", storage: { getItem: () => null } }), 1);
  assert.equal(resolveNotationScale({ search: "?notation=1.2", storage }), 1.2);
  assert.equal(memory.get(NOTATION_SCALE_KEY), "1.2");
  assert.equal(resolveNotationScale({ search: "", storage }), 1.2);
  assert.equal(persistNotationScale(1.6, storage), 1.6);
  assert.equal(resolveNotationScale({ search: "screen=session", storage }), 1.6);
});
