import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as sessions from "./session.js";
import * as medals from "./medals.js";
import * as followers from "./follow.js";
import { chartPassFeedback, expectedNotesFor } from "./grade.js";
import { getKey } from "./music.js";
import { instrumentOrDefault } from "./instruments.js";
import {
  CELEBRATE_MS,
  READ_MS,
  RETRY_MS,
  afterFail,
  hearDemoGesture,
  isLastRapidKey,
  passSchedule,
  rapidFireButton,
  rapidMicStep,
  shouldRecordMastery,
} from "./rapid.js";
import { parseTabState } from "./tabs.js";
import { storageWarning, writeStoredJson } from "./storage.js";
import { CHART_LIBRARY } from "./registry.js";
import { sessionVinylTier } from "./app-wrapup.js";

const source = await readFile(new URL("./app.js", import.meta.url), "utf8");
const noop = () => {};

function appContext(names, overrides = {}) {
  const context = vm.createContext({
    ...sessions,
    ...medals,
    ...followers,
    chartPassFeedback,
    expectedNotesFor,
    instrumentOrDefault,
    rapidMicStep,
    shouldRecordMastery,
    sessionVinylTier,
    parseTabState,
    storageWarning,
    writeStoredJson,
    cloudSettings: { userId: null },
    enrollFromProgress: noop,
    structuredClone,
    savedPrefs: sessions.defaultPrefs(),
    SELECTED_MODULE_KEY: "duojazz.selectedModule.v1",
    deepLinkOverrides: { module: null, auto: null },
    URLSearchParams,
    prefs: sessions.defaultPrefs(),
    mastery: medals.emptyMastery(),
    masteryPreview: null,
    wrapupBanner: null,
    session: null,
    timedRunActive: false,
    notesRevealed: false,
    notesPeeked: false,
    els: { storageNotice: { textContent: "", hidden: true } },
    render: noop,
    halt: noop,
    writeTabUrl: noop,
    openSettings: noop,
    ...overrides,
  });
  for (const name of ["isTimedChart", "isChartLearn", ...names]) {
    const match = new RegExp(`^(?:async )?function ${name}\\(`, "m").exec(source);
    assert.ok(match, `Actual app function ${name} exists`);
    const end = source.indexOf("\n}", match.index) + 2;
    vm.runInContext(source.slice(match.index, end), context);
  }
  return context;
}

const progressFunctions = ["shownMastery", "clearMasteryPreview", "applyDeepLink", "recordRapidPass", "recordPassIfNeeded", "renderStorageNotice"];

test('saving a chart switch cannot render the previous chart or carry its key into Four', () => {
  const rendered = [], saved = [];
  const context = appContext(['selectTab', 'rotationChart', 'currentChart', 'chartConcertKey'], {
    CHART_LIBRARY,
    practiceUI: { getSelected: () => CHART_LIBRARY.map(chart => chart.id) },
    nav: { tab: 'charts', tune: 'blue-bossa' }, lastChartTune: 'blue-bossa',
    chartKeySelection: { chartId: 'blue-bossa', keyId: 'C' },
    saveTabScroll: noop, restoreTabScroll: noop,
    cloudSettings: { userId: 'account-a', set(value) { saved.push(value.selectedChartId); context.render(); } },
    render() { rendered.push([context.currentChart().id, context.chartConcertKey()]); },
  });
  context.selectTab('charts', { tune: 'four' });
  assert.deepEqual(rendered, [['four', 'Eb'], ['four', 'Eb']]);
  assert.deepEqual(saved, ['four']);

  for (const chart of CHART_LIBRARY.filter(chart => chart.id !== 'four')) {
    rendered.length = 0;
    context.chartKeySelection = { chartId: context.currentChart().id, keyId: 'C' };
    context.selectTab('charts', { tune: chart.id });
    assert.deepEqual(rendered, [[chart.id, chart.key], [chart.id, chart.key]]);
  }
});

test('a chosen key survives rerendering its chart but never applies to another chart', () => {
  const context = appContext(['selectTab', 'rotationChart', 'currentChart', 'chartConcertKey'], {
    CHART_LIBRARY,
    practiceUI: { getSelected: () => CHART_LIBRARY.map(chart => chart.id) },
    nav: { tab: 'charts', tune: 'four' }, lastChartTune: 'four',
    chartKeySelection: { chartId: 'four', keyId: 'D' },
    saveTabScroll: noop, restoreTabScroll: noop,
    cloudSettings: { userId: 'account-a', set() { context.render(); } },
  });
  context.selectTab('charts', { tune: 'four' });
  assert.equal(context.chartConcertKey(), 'D');
  assert.equal(context.chartConcertKey(CHART_LIBRARY.find(chart => chart.id === 'blue-bossa')), 'C');
  // A saved chart selection can also change while the Licks page is open.
  context.nav = { tab: 'licks', tune: null };
  context.lastChartTune = 'autumn-leaves';
  context.selectTab('charts');
  assert.equal(context.chartConcertKey(), 'G');
});

for (const demo of ["path", "grades", "medal"]) {
  test(`${demo} demo previews cannot overwrite real progress or preferences`, () => {
    let original = medals.emptyMastery();
    for (const key of sessions.TWELVE_KEY_IDS) original = medals.recordQuizPass(original, "master-lick", key);
    const saved = [];
    const context = appContext(progressFunctions, {
      mastery: original,
      location: { search: `?screen=home&demo=${demo}` },
      saveMastery(value) { saved.push(value); },
    });
    const originalPrefs = JSON.stringify(context.prefs);
    context.applyDeepLink();
    assert.equal(medals.moduleMastery(context.shownMastery(), "cmar").masteredKeys.length, demo === "path" ? 4 : 1);
    assert.equal(context.mastery, original);
    assert.equal(JSON.stringify(context.prefs), originalPrefs);
    assert.equal(saved.length, 0);
    context.session = sessions.createSession({ lessonId: "learn-lick", startKeyId: "G" });
    context.recordRapidPass();
    assert.equal(context.masteryPreview, null);
    assert.equal(saved.length, 1);
    assert.equal(medals.moduleMastery(saved[0], "cmar").masteredKeys.length, 12);
    assert.ok(medals.lessonPassedKeys(saved[0], "learn-lick").includes("G"));
  });
}

test("the first graded lick pass enrolls a guest after migration, and removal survives later passes", () => {
  const savedRotations = [];
  const context = appContext(["clearMasteryPreview", "recordPassIfNeeded", "enrollFromProgress"], {
    MODULES: sessions.MODULES,
    LESSONS: sessions.LESSONS,
    lickRotation: [],
    guestRotationImported: true,
    MY_LICKS_KEY: "licks",
    practiceUI: { getSelected: () => [], setSelected: noop },
    saveMastery: noop,
    renderStorageNotice: noop,
    writeStoredJson(key, value) { savedRotations.push([key, [...value]]); return true; },
  });

  context.session = sessions.createSession({ lessonId: "master-lick", startKeyId: "C" });
  context.notesPeeked = true;
  context.recordPassIfNeeded({ passed: true });
  assert.deepEqual([...context.lickRotation], []);

  context.notesPeeked = false;
  context.recordPassIfNeeded({ passed: true });
  assert.deepEqual([...context.lickRotation], ["cmar"]);
  assert.deepEqual(savedRotations, [["licks", ["cmar"]]]);

  context.lickRotation = [];
  context.session = sessions.createSession({ lessonId: "master-lick", startKeyId: "G" });
  context.recordPassIfNeeded({ passed: true });
  assert.deepEqual([...context.lickRotation], []);
  assert.equal(savedRotations.length, 1);
});

test("failed preference writes do not prevent starting lessons", () => {
  const context = appContext(["persist", "rememberModule", "renderStorageNotice", "clearMasteryPreview", "startLesson"], {
    selectedModuleId: "cmar",
    screenName: () => "home",
    saveTabScroll: noop,
    writeStoredJson() { return false; },
    storageWarning() { return "Changes aren't being saved."; },
    applySession(next) { context.session = next; },
  });
  assert.doesNotThrow(() => context.startLesson("learn-lick"));
  assert.equal(context.session.screen, "session");
  assert.equal(context.els.storageNotice.hidden, false);
});

test("the last selected lick survives reopening the app", () => {
  const stored = new Map();
  const context = appContext(["loadSelectedModule", "rememberModule", "selectModule", "renderStorageNotice"], {
    localStorage: { getItem: key => stored.get(key) ?? null },
    writeStoredJson(key, value) { stored.set(key, JSON.stringify(value)); return true; },
    renderHome: noop,
    requestAnimationFrame: noop,
  });
  assert.equal(context.loadSelectedModule(), sessions.MODULES[0].id);
  const id = sessions.MODULES[4].id;
  context.selectModule(id);
  assert.equal(context.loadSelectedModule(), id);
  context.selectedModuleId = null;
  assert.equal(context.loadSelectedModule(), id);
});

test("invalid or inaccessible saved licks fall back to the first lick", () => {
  for (const raw of ['"removed-lick"', '{broken', 'null']) {
    const context = appContext(["loadSelectedModule"], { localStorage: { getItem: () => raw } });
    assert.equal(context.loadSelectedModule(), sessions.MODULES[0].id);
  }
  const context = appContext(["loadSelectedModule"], {
    localStorage: { getItem() { throw new Error("Storage blocked"); } },
  });
  assert.equal(context.loadSelectedModule(), sessions.MODULES[0].id);
});

function listeningContext(overrides = {}) {
  let now = 0;
  let timer = null;
  let ended = null;
  let stops = 0;
  const context = appContext(["clearMasteryPreview", "followerForSession", "beginListening"], {
    session: sessions.createSession({ lessonId: "learn-lick", startKeyId: "G" }),
    startGen: 0,
    debugOn: false,
    attempt: null,
    performance: { now: () => now },
    window: { setInterval(callback) { timer = callback; return 1; } },
    clearRapidTimers: noop,
    renderCelebrate: noop,
    renderCue: noop,
    renderPrimary: noop,
    renderDebug: noop,
    renderMic: noop,
    renderMeter: noop,
    finishRapid(generation, result) { ended = result; },
    transport: {
      ensure: async () => {},
      prepareBacking: async () => { now += 9000; return { status: "ready" }; },
      start: async () => {},
      stop: noop,
    },
    monitor: {
      state: "listening",
      isLive: () => false,
      start: async () => {
        now += 9000;
        context.monitor.onFrame({ at: now, hz: null, rms: 0, confidence: 0 });
      },
      stop() { stops += 1; },
    },
    ...overrides,
  });
  return {
    context,
    tick(after) { now += after; timer?.(); },
    ended: () => ended,
    stops: () => stops,
    hasTimer: () => timer !== null,
  };
}

test("sample loading and mic permission delays do not consume the first timeout", async () => {
  const harness = listeningContext();
  await harness.context.beginListening();
  assert.ok(harness.context.attempt);
  harness.tick(50);
  assert.equal(harness.ended(), null);
  harness.tick(followers.NO_SOUND_MS - 51);
  assert.equal(harness.ended(), null);
  harness.tick(2);
  assert.equal(harness.ended()?.reason, "timeout");
});

test("timed Master waits for microphone readiness and cancellation prevents a delayed start", async () => {
  let releaseMic, startingMic;
  const requested = new Promise(resolve => { startingMic = resolve; });
  const permission = new Promise(resolve => { releaseMic = resolve; });
  const starts = [];
  const context = appContext(['beginTimedChart'], {
    session: sessions.createSession({ lessonId: 'tones-chart-cry-me-a-river-timed-master' }),
    startGen: 0,
    render: noop, resetPitchTake: noop,
    halt() { context.startGen++; context.timedRunActive = false; },
    transport: { ensure: async () => {}, prepareBacking: async () => {}, start: async config => starts.push(config) },
    monitor: { start: async () => { startingMic(); await permission; }, isLive: () => true, reset: noop },
  });
  const pending = context.beginTimedChart();
  await requested;
  assert.equal(starts.length, 0);
  context.halt();
  releaseMic();
  await pending;
  assert.equal(starts.length, 0);
  await context.beginTimedChart();
  assert.equal(starts.length, 1);
  assert.equal(starts[0].looping, false);
  assert.equal(starts[0].includeModel, false);
});

test("cancelled mic startup does not create an attempt or timer", async () => {
  const harness = listeningContext();
  harness.context.monitor.start = async () => { harness.context.startGen += 1; };
  await harness.context.beginListening();
  assert.equal(harness.context.attempt, null);
  assert.equal(harness.hasTimer(), false);
});

test("consecutive attempts reuse live capture instead of stopping the mic", async () => {
  const harness = listeningContext();
  let resets = 0;
  await harness.context.beginListening();
  harness.context.monitor.processing = false;
  harness.context.monitor.isLive = () => true;
  harness.context.monitor.reset = () => { resets += 1; };
  harness.context.monitor.start = () => { assert.fail("The existing mic should be reused"); };
  await harness.context.beginListening();
  assert.equal(resets, 1);
  assert.equal(harness.stops(), 0);
  harness.tick(50);
  assert.equal(harness.ended(), null);
});

test("unsupported mic startup releases capture and backing without starting playback first", async () => {
  const order = [];
  const harness = listeningContext({
    transport: {
      ensure: async () => {},
      prepareBacking: async () => ({ status: "ready" }),
      start: async () => { order.push("transport"); },
      stop: noop,
    },
  });
  harness.context.monitor.start = async () => {
    order.push("mic");
    harness.context.monitor.state = "unsupported";
  };
  await harness.context.beginListening();
  assert.deepEqual(order, ["mic"]);
  assert.equal(harness.context.attempt, null);
  assert.equal(harness.context.rapidPhase, "idle");
  assert.equal(harness.context.recordBacking, false);
  assert.equal(harness.stops(), 1);
});

test("persist writes compact guest prefs without 3,500+ default lesson records", () => {
  const written = new Map();
  const context = appContext(["persist", "renderStorageNotice"], {
    writeStoredJson(key, value) { written.set(key, JSON.stringify(value)); return true; },
  });
  context.prefs.tempo = 112;
  context.persist();
  const payload = written.get(sessions.PREFS_KEY);
  assert.ok(payload.length < 2048, `compact prefs should be tiny, got ${payload.length} bytes`);
  assert.equal(sessions.normalizePrefs(JSON.parse(payload)).tempo, 112);
});

function keyboardContext(screen = "session") {
  const actions = [];
  const context = vm.createContext({
    session: screen ? { screen } : null,
    anyDialogOpen: () => false,
    runPrimary: () => actions.push("primary"),
    halt: noop,
    start: () => actions.push("restart"),
    navigateCard: (direction) => actions.push(direction),
    exitSession: () => actions.push("exit"),
    document: { addEventListener(name, handler) { context.handler = handler; } },
  });
  const start = source.indexOf('document.addEventListener("keydown",');
  vm.runInContext(source.slice(start, source.indexOf("\n});", start) + 4), context);
  return { context, actions };
}

function keyEvent(overrides = {}) {
  return { code: "Space", key: " ", prevented: false, preventDefault() { this.prevented = true; }, ...overrides };
}

test("session shortcuts do not steal native focused controls", () => {
  const { context, actions } = keyboardContext();
  for (const selector of ["button", "a", "select", "input", "textarea", '[role="switch"]']) {
    const event = keyEvent({ target: { closest: (selectors) => selectors.split(", ").includes(selector) ? {} : null } });
    context.handler(event);
    assert.equal(event.prevented, false, selector);
  }
  const editable = keyEvent({ target: { isContentEditable: true } });
  context.handler(editable);
  assert.equal(editable.prevented, false);
  assert.deepEqual(actions, []);
  const event = keyEvent();
  context.handler(event);
  assert.equal(event.prevented, true);
  assert.deepEqual(actions, ["primary"]);
});

test("shortcuts are inactive outside sessions and ignore modified or repeated keys", () => {
  for (const screen of [null, "home", "wrapup"]) {
    const { context, actions } = keyboardContext(screen);
    for (const event of [keyEvent(), keyEvent({ key: "ArrowRight" })]) {
      context.handler(event);
      assert.equal(event.prevented, false);
    }
    assert.deepEqual(actions, []);
  }
  const { context, actions } = keyboardContext();
  for (const property of ["ctrlKey", "metaKey", "altKey", "repeat", "defaultPrevented"]) {
    context.handler(keyEvent({ [property]: true }));
  }
  assert.deepEqual(actions, []);

  const wrapup = keyboardContext("wrapup");
  wrapup.context.handler(keyEvent({ code: "Escape", key: "Escape" }));
  assert.deepEqual(wrapup.actions, ["exit"]);
});

test("closing a lesson restores the module page scroll position", () => {
  const window = { scrollY: 620, scrollTo({ top }) { this.scrollY = top; } };
  const context = appContext([
    "saveTabScroll", "restoreTabScroll", "startLesson", "exitSession",
  ], {
    window,
    nav: { tab: "home" },
    tabScroll: {},
    selectedModuleId: "cmar",
    screenName: () => context.session?.screen ?? "home",
    clearMasteryPreview: noop,
    rememberModule: noop,
    persist: noop,
    releaseMic: noop,
    resetPitchTake: noop,
    applySession(next) { context.session = next; window.scrollY = 0; },
    render() { window.scrollY = 0; },
  });
  context.startLesson("master-lick");
  assert.equal(window.scrollY, 0);
  context.exitSession();
  assert.equal(window.scrollY, 620);
  window.scrollY = 350;
  context.startLesson("learn-lick");
  context.exitSession();
  assert.equal(window.scrollY, 350);
});

test('delayed playback completion cannot reopen a session after leaving or switching accounts', () => {
  for (const stale of [false, true]) {
    let callback, applied = 0;
    const context = appContext(['handleTransportEnded'], {
      startGen: 1, feedbackTimer: null,
      playback: {}, recordBacking: false, hearDemo: false,
      session: { screen: 'session', demo: false },
      currentCard: () => 'play', gradeCurrentCard: () => ({ graded: true }),
      monitor: { stop: noop }, handlePlaybackEnded: () => ({ session: {}, autoStart: true }),
      window: { matchMedia: () => ({ matches: false }), setTimeout(fn) { callback = fn; return 1; }, clearTimeout: noop },
      applySession() { applied++; },
    });
    context.handleTransportEnded();
    if (stale) { context.startGen++; context.session = null; }
    callback();
    assert.equal(applied, stale ? 0 : 1);
  }
});

test("Learn lessons honor cycle preferences, selected keys, and deep-link cycle overrides", () => {
  const custom = { ...sessions.defaultPrefs(), keyMode: "chromatic", startKeyId: "C", allKeys: false, selectedKeyIds: ["C", "F", "Bb"] };
  const context = appContext(["persist", "rememberModule", "renderStorageNotice", "clearMasteryPreview", "startLesson", "applyDeepLink"], {
    prefs: custom,
    selectedModuleId: "cmar",
    screenName: () => "home",
    saveTabScroll: noop,
    resetPitchTake: noop,
    writeStoredJson: () => true,
    applySession(next) { context.session = next; },
    location: { search: "?screen=session&lesson=learn-lick&keys=fourths" },
  });
  context.startLesson("learn-lick");
  assert.equal(context.session.keyMode, "chromatic");
  assert.deepEqual(context.session.keyQueue, ["A", "G", "D"]);
  assert.equal(sessions.sessionShowsCycle(context.session), true);

  context.startLesson("tones-major7-learn");
  assert.equal(context.session.keyMode, "chromatic");
  assert.deepEqual(context.session.keyQueue, ["C", "Bb", "F"]);
  assert.equal(sessions.sessionShowsCycle(context.session), true);

  context.applyDeepLink();
  assert.equal(context.session.lessonId, "learn-lick");
  assert.equal(context.session.keyMode, "fourths");
  assert.deepEqual(context.session.keyQueue, ["A", "D", "G"]);
});

test("practice screen tempo controls save per-lick overrides without altering the global default and reset on tap", () => {
  const context = appContext([
    "persist",
    "rememberModule",
    "renderStorageNotice",
    "clearMasteryPreview",
    "startLesson",
    "renderTempoModal",
    "applySessionTempo",
    "commitSessionTempoInput",
    "tapSessionTempo",
    "resetSessionTempo",
    "applyTempoDelta",
  ], {
    selectedModuleId: "cmar",
    hearDemo: false,
    tempoTaps: [],
    playback: { playing: false, paused: false },
    rapidPhase: "idle",
    screenName: () => context.session?.screen ?? "home",
    saveTabScroll: noop,
    resetPitchTake: noop,
    renderSettings: noop,
    writeStoredJson: () => true,
    applySession(next) { context.session = next; },
  });
  context.els.sessionTempoInput = { value: "" };
  context.els.sessionTempoTap = { textContent: "" };
  context.els.sessionTempoReset = { hidden: false, disabled: true, textContent: "" };

  context.startLesson("learn-lick");
  assert.equal(context.session.tempo, 96);
  assert.equal(sessions.hasLessonTempoOverride(context.prefs, "learn-lick"), false);

  context.applySessionTempo(80);
  assert.equal(context.session.tempo, 80);
  assert.equal(context.prefs.tempo, 96);
  assert.equal(sessions.hasLessonTempoOverride(context.prefs, "learn-lick"), true);
  assert.equal(context.els.sessionTempoTap.textContent, "Tap");
  assert.equal(context.els.sessionTempoReset.hidden, false);
  assert.equal(context.els.sessionTempoReset.disabled, false);
  assert.equal(context.els.sessionTempoReset.textContent, "Reset");

  // Typing a tempo directly in the modal input updates the lick's override.
  context.els.sessionTempoInput.value = "74";
  context.commitSessionTempoInput();
  assert.equal(context.session.tempo, 74);

  // Tapping a tempo computes BPM from tap intervals.
  context.tapSessionTempo(1000);
  assert.equal(context.session.tempo, 74);
  context.tapSessionTempo(1500);
  assert.equal(context.session.tempo, 120);

  // Starting another lesson in the same lick shares the 120 bpm override.
  context.startLesson("master-lick");
  assert.equal(context.session.tempo, 120);

  // Starting a different lick still uses the 96 bpm global default.
  context.startLesson("emr-learn");
  assert.equal(context.session.tempo, 96);

  // Changing global tempo in Profile updates un-overridden licks but preserves cmar's override.
  context.applyTempoDelta(8);
  assert.equal(context.prefs.tempo, 104);
  assert.equal(context.session.tempo, 104);

  context.startLesson("integrate-minor-home");
  assert.equal(context.session.tempo, 120);

  // Resetting in the tempo modal returns the lick to the global default and disables Reset without hiding it.
  context.resetSessionTempo();
  assert.equal(context.session.tempo, 104);
  assert.equal(sessions.hasLessonTempoOverride(context.prefs, "integrate-minor-home"), false);
  assert.equal(context.els.sessionTempoReset.hidden, false);
  assert.equal(context.els.sessionTempoReset.disabled, true);
});

test("addLickToRotation enrolls previewed licks for guests and signed-in accounts while ignoring chord-tones and unknown ids", () => {
  const guestWrites = [];
  let guestRenders = 0;
  const guest = appContext(["rememberModule", "addLickToRotation", "renderStorageNotice"], {
    MY_LICKS_KEY: "duojazz.myLicks.v1",
    lickRotation: [],
    selectedModuleId: "south-of-the-river",
    deepLinkOverrides: { module: "south-of-the-river", auto: null },
    writeStoredJson(key, value) { guestWrites.push([key, structuredClone(value)]); return true; },
    render() { guestRenders += 1; },
  });

  guest.addLickToRotation("chord-tones");
  guest.addLickToRotation("not-a-lick");
  assert.deepEqual([...guest.lickRotation], []);
  assert.equal(guestWrites.length, 0);
  assert.equal(guestRenders, 0);

  guest.addLickToRotation("south-of-the-river");
  assert.deepEqual([...guest.lickRotation], ["south-of-the-river"]);
  assert.equal(guest.deepLinkOverrides.module, null);
  assert.equal(guest.selectedModuleId, "south-of-the-river");
  assert.deepEqual(guestWrites, [
    ["duojazz.myLicks.v1", ["south-of-the-river"]],
    ["duojazz.selectedModule.v1", "south-of-the-river"],
  ]);
  assert.equal(guestRenders, 1);

  guest.addLickToRotation("south-of-the-river");
  assert.deepEqual([...guest.lickRotation], ["south-of-the-river"]);

  const cloudCalls = [];
  let accountRenders = 0;
  const targetId = sessions.MODULES.find(module => module.id !== "chord-tones").id;
  const account = appContext(["rememberModule", "addLickToRotation", "renderStorageNotice"], {
    MY_LICKS_KEY: "duojazz.myLicks.v1",
    lickRotation: [],
    selectedModuleId: targetId,
    deepLinkOverrides: { module: targetId, auto: null },
    cloudSettings: {
      userId: "account-a",
      setLick(id, selected) { cloudCalls.push(["setLick", id, selected]); },
      set(changes) { cloudCalls.push(["set", changes]); },
    },
    render() { accountRenders += 1; },
  });

  account.addLickToRotation(targetId);
  assert.deepEqual([...account.lickRotation], [targetId]);
  assert.equal(account.deepLinkOverrides.module, null);
  assert.equal(account.selectedModuleId, targetId);
  assert.deepEqual(structuredClone(cloudCalls), [
    ["setLick", targetId, true],
    ["set", { selectedModuleId: targetId }],
  ]);
  assert.equal(accountRenders, 1);
});

test("failed note feedback persists through retry into the next run-through and clears on pass, key change, or leave", () => {
  let scheduled = null;
  let listened = 0;
  let renderedCue = 0;
  const activeSession = sessions.createSession({ lessonId: "learn-lick", startKeyId: "G" });
  const context = appContext([
    "sessionKeyToken",
    "finishRapid",
    "releaseMic",
    "applySession",
    "notesVisibleInSession",
    "currentCue",
  ], {
    session: activeSession,
    startGen: 1,
    finishing: false,
    rapidPhase: "listening",
    recordBacking: true,
    attemptTimer: null,
    feedbackTimer: null,
    cue: null,
    cueSeq: 0,
    lastRenderedCueSeq: 0,
    lastSessionSlot: "learn-lick:G",
    sessionShot: null,
    lastDebug: null,
    takeLog: null,
    debugOn: false,
    attempt: null,
    prefs: { ...sessions.defaultPrefs(), auto: true },
    transport: { stop: noop },
    monitor: { isLive: () => true, stop: noop, reset: noop, holdSignal: true, onFrame: noop },
    window: {
      clearInterval: noop,
      clearTimeout: noop,
      setTimeout(fn) { scheduled = fn; return 1; },
      scrollTo: noop,
    },
    closeTakeRecorder: noop,
    clearMasteryPreview: noop,
    shownKeyForSession: () => getKey("G"),
    renderDebug: noop,
    recordRapidPass: noop,
    passSchedule: (s, opts) => ({ steps: [{ ms: 2000 }], session: s }),
    isLastRapidKey: () => false,
    afterFail: (s, opts) => ({ session: s, autoStart: true, hint: opts.hint }),
    renderCelebrate: noop,
    renderCue() { renderedCue += 1; },
    renderPrimary: noop,
    finishCelebration: noop,
    beginListening() { listened += 1; },
    resetPitchTake: noop,
    persist: noop,
    visualPhase: () => context.rapidPhase,
    RETRY_MS: 900,
    CELEBRATE_MS: 2000,
    els: { storageNotice: { textContent: "", hidden: true }, wrapup: { scrollTop: 0 } },
  });

  const failed = followers.runFollower([57, 55, 50], [
    ...Array.from({ length: 6 }, (_, i) => ({ t: i * 20, hz: 220, amp: 0.25 })),
    ...Array.from({ length: 6 }, (_, i) => ({ t: 200 + i * 20, hz: 196, amp: 0.25 })),
    ...Array.from({ length: 8 }, (_, i) => ({ t: 400 + i * 20, hz: 146.832 * 2 ** (-58 / 1200), amp: 0.25 })),
  ]);

  context.finishRapid(1, failed);
  assert.equal(context.rapidPhase, "retry");
  assert.equal(context.cue?.kind, "retry");
  assert.equal(context.cue?.failure?.kind, "slightly-flat");
  assert.equal(context.cue?.failure?.index, 2);
  assert.equal(context.currentCue()?.seq, 1);

  // After RETRY_MS fires and begins the next run-through, cue stays active!
  assert.ok(scheduled);
  scheduled();
  assert.equal(listened, 1);
  assert.equal(context.cue?.kind, "retry");
  assert.equal(context.cue?.failure?.kind, "slightly-flat");
  assert.equal(context.currentCue()?.seq, 1);

  // A subsequent silent timeout on the same key preserves the existing pitch feedback.
  const timedOut = followers.tickFollower(followers.createFollower([57, 55, 50], 0), followers.NO_SOUND_MS);
  context.rapidPhase = "listening";
  context.finishing = false;
  context.finishRapid(1, timedOut);
  assert.equal(context.cue?.seq, 1);
  assert.equal(context.cue?.failure?.kind, "slightly-flat");

  // Pausing or tapping Hear it on the same key keeps the feedback visible.
  context.releaseMic("pause");
  assert.equal(context.cue?.kind, "retry");
  context.releaseMic("hear");
  assert.equal(context.cue?.kind, "retry");

  // Leaving clears cue.
  context.releaseMic("hide");
  assert.equal(context.cue, null);

  // Moving to the next key in applySession clears cue.
  context.cue = { kind: "retry", keyToken: "learn-lick:G", seq: 2, failure: failed.failure };
  const nextKeySession = sessions.advanceKey(activeSession);
  context.applySession(nextKeySession);
  assert.equal(context.cue, null);
  assert.equal(context.lastRenderedCueSeq, 0);

  // Passing clears cue.
  context.session = activeSession;
  context.rapidPhase = "listening";
  context.finishing = false;
  context.cue = { kind: "retry", keyToken: "learn-lick:G", seq: 3, failure: failed.failure };
  context.finishRapid(1, { passed: true, expected: [], heard: [] });
  assert.equal(context.cue, null);

  // A silent timeout with no prior pitch cue still shows timeout feedback.
  context.rapidPhase = "listening";
  context.finishing = false;
  context.finishRapid(1, timedOut);
  assert.equal(context.cue?.failure?.kind, "timeout");
});

function rapidUiContext(overrides = {}) {
  let nextTimerId = 1;
  const timers = new Map();
  let micLive = true;
  let micStops = 0;
  let listened = 0;
  const primaryAttrs = new Map();
  const primaryClasses = new Set();
  const autoAttrs = new Map();
  const icon = { hidden: false };
  const primary = {
    hidden: false,
    disabled: false,
    dataset: {},
    querySelector: (sel) => (sel === ".play-round-icon" ? icon : null),
    setAttribute(name, value) { primaryAttrs.set(name, String(value)); },
    getAttribute(name) { return primaryAttrs.get(name) ?? null; },
    classList: {
      add(name) { primaryClasses.add(name); },
      remove(name) { primaryClasses.delete(name); },
      toggle(name, on) { if (on) primaryClasses.add(name); else primaryClasses.delete(name); },
      contains(name) { return primaryClasses.has(name); },
    },
  };
  const autoToggle = {
    setAttribute(name, value) { autoAttrs.set(name, String(value)); },
    getAttribute(name) { return autoAttrs.get(name) ?? null; },
  };
  const context = appContext([
    "clearRapidTimers",
    "halt",
    "releaseMic",
    "sessionKeyToken",
    "visualPhase",
    "renderAuto",
    "renderPrimary",
    "finishRapid",
    "finishCelebration",
    "runPrimary",
    "applySession",
  ], {
    CELEBRATE_MS,
    READ_MS,
    RETRY_MS,
    afterFail,
    passSchedule,
    isLastRapidKey,
    rapidFireButton,
    hearDemoGesture,
    session: sessions.createSession({ lessonId: "learn-lick", keyMode: "fourths", startKeyId: "G" }),
    startGen: 1,
    finishing: false,
    rapidPhase: "listening",
    hearDemo: false,
    samplesLoading: false,
    playback: { playing: false, paused: false, ended: false },
    recordBacking: true,
    attemptTimer: null,
    feedbackTimer: null,
    cue: null,
    cueSeq: 0,
    lastRenderedCueSeq: 0,
    lastSessionSlot: "learn-lick:G",
    sessionShot: null,
    lastDebug: null,
    takeLog: null,
    debugOn: false,
    attempt: null,
    audioError: "",
    prefs: { ...sessions.defaultPrefs(), auto: true },
    transport: { stop: noop, snapshot: () => ({ playing: false, paused: false, inCountIn: false }) },
    monitor: {
      isLive: () => micLive,
      stop() { micLive = false; micStops += 1; },
      reset: noop,
      holdSignal: true,
      onFrame: noop,
    },
    window: {
      clearInterval: noop,
      clearTimeout(id) { timers.delete(id); },
      setTimeout(fn, ms) {
        const id = nextTimerId++;
        timers.set(id, { fn, ms });
        return id;
      },
      scrollTo: noop,
    },
    closeTakeRecorder: noop,
    clearMasteryPreview: noop,
    shownKeyForSession: () => getKey(sessions.currentKeyId(context.session)),
    renderDebug: noop,
    recordRapidPass: noop,
    renderCelebrate: noop,
    renderCue: noop,
    renderHearIt: noop,
    resetPitchTake: noop,
    persist: noop,
    render() { context.renderPrimary(); },
    start: noop,
    beginListening() {
      micLive = true;
      context.rapidPhase = "listening";
      listened += 1;
    },
    els: {
      storageNotice: { textContent: "", hidden: true },
      wrapup: { scrollTop: 0 },
      primary,
      primaryCount: { hidden: true, textContent: "" },
      autoToggle,
      session: { dataset: {} },
      celebrate: { hidden: true },
    },
    ...overrides,
  });

  return {
    context,
    primary,
    autoAttrs,
    timers,
    micLive: () => micLive,
    micStops: () => micStops,
    listened: () => listened,
    flushNextTimer() {
      const first = timers.entries().next().value;
      if (!first) return null;
      const [id, entry] = first;
      timers.delete(id);
      entry.fn();
      return entry;
    },
  };
}

test("Auto OFF still loops on misses and silent timeouts until user stops recording", () => {
  const ui = rapidUiContext({
    prefs: { ...sessions.defaultPrefs(), auto: false },
  });
  const { context } = ui;

  // Wrong note miss while Auto is OFF keeps looping on the same key and keeps button in Pause state.
  const wrong = followers.runFollower([57, 55, 50], [
    ...Array.from({ length: 8 }, (_, i) => ({ t: i * 20, hz: 246.94, amp: 0.25 })),
  ]);
  context.finishRapid(context.startGen, wrong);
  assert.equal(context.rapidPhase, "retry");
  assert.equal(sessions.currentKeyId(context.session), "G");
  assert.equal(ui.micStops(), 0);
  assert.equal(ui.primary.dataset.action, "pause");
  assert.equal(ui.primary.dataset.state, "listening");
  assert.equal(ui.primary.getAttribute("aria-label"), "Pause");

  const retryStep = ui.flushNextTimer();
  assert.equal(retryStep?.ms, RETRY_MS);
  assert.equal(ui.listened(), 1);
  assert.equal(context.rapidPhase, "listening");
  assert.equal(sessions.currentKeyId(context.session), "G");

  // Silent timeout while Auto is OFF also keeps looping on the same key.
  const timedOut = followers.tickFollower(followers.createFollower([57, 55, 50], 0), followers.NO_SOUND_MS);
  context.finishRapid(context.startGen, timedOut);
  assert.equal(context.rapidPhase, "retry");
  assert.equal(ui.primary.dataset.action, "pause");
  assert.equal(ui.primary.dataset.state, "listening");
  const timeoutStep = ui.flushNextTimer();
  assert.equal(timeoutStep?.ms, RETRY_MS);
  assert.equal(ui.listened(), 2);
  assert.equal(context.rapidPhase, "listening");
  assert.equal(sessions.currentKeyId(context.session), "G");
});

test("stopping during retry or reveal cancels the pending timer and releases the mic", () => {
  // Stopping during retry (with Auto OFF) cancels the loop and returns to Record/idle.
  const retryUi = rapidUiContext({
    prefs: { ...sessions.defaultPrefs(), auto: false },
  });
  const wrong = followers.runFollower([57], [
    ...Array.from({ length: 8 }, (_, i) => ({ t: i * 20, hz: 246.94, amp: 0.25 })),
  ]);
  retryUi.context.finishRapid(retryUi.context.startGen, wrong);
  assert.equal(retryUi.context.rapidPhase, "retry");
  assert.equal(retryUi.timers.size, 1);
  const staleRetry = [...retryUi.timers.values()][0].fn;

  retryUi.context.runPrimary();
  assert.equal(retryUi.timers.size, 0);
  assert.equal(retryUi.micStops(), 1);
  assert.equal(retryUi.micLive(), false);
  assert.equal(retryUi.context.rapidPhase, "idle");
  assert.equal(retryUi.primary.dataset.action, "record");
  assert.equal(retryUi.primary.dataset.state, "idle");
  assert.equal(retryUi.primary.getAttribute("aria-label"), "Record");
  staleRetry();
  assert.equal(retryUi.listened(), 0);

  // Stopping during reveal (with Auto ON) cancels the reveal timer and releases the mic.
  const revealUi = rapidUiContext({
    prefs: { ...sessions.defaultPrefs(), auto: true },
  });
  revealUi.context.finishRapid(revealUi.context.startGen, { passed: true, expected: [], heard: [] });
  assert.equal(revealUi.context.rapidPhase, "celebrate");
  const celebrateStep = revealUi.flushNextTimer();
  assert.equal(celebrateStep?.ms, CELEBRATE_MS);
  assert.equal(revealUi.context.rapidPhase, "reveal");
  assert.equal(sessions.currentKeyId(revealUi.context.session), "C");
  assert.equal(revealUi.primary.dataset.action, "pause");
  assert.equal(revealUi.primary.dataset.state, "listening");
  assert.equal(revealUi.timers.size, 1);
  const staleReveal = [...revealUi.timers.values()][0].fn;

  revealUi.context.runPrimary();
  assert.equal(revealUi.timers.size, 0);
  assert.equal(revealUi.micStops(), 1);
  assert.equal(revealUi.micLive(), false);
  assert.equal(revealUi.context.rapidPhase, "idle");
  assert.equal(revealUi.primary.dataset.action, "record");
  assert.equal(revealUi.primary.getAttribute("aria-label"), "Record");
  staleReveal();
  assert.equal(revealUi.listened(), 0);
});

test("passing a key honors Auto OFF vs Auto ON, including toggling Auto during celebration", () => {
  // Auto OFF: pass advances to next key, stops mic, goes idle with Record button.
  const offUi = rapidUiContext({
    prefs: { ...sessions.defaultPrefs(), auto: false },
  });
  offUi.context.finishRapid(offUi.context.startGen, { passed: true, expected: [], heard: [] });
  assert.equal(offUi.context.rapidPhase, "celebrate");
  offUi.flushNextTimer();
  assert.equal(sessions.currentKeyId(offUi.context.session), "C");
  assert.equal(offUi.context.rapidPhase, "idle");
  assert.equal(offUi.micStops(), 1);
  assert.equal(offUi.micLive(), false);
  assert.equal(offUi.listened(), 0);
  assert.equal(offUi.timers.size, 0);
  assert.equal(offUi.primary.dataset.action, "record");
  assert.equal(offUi.primary.getAttribute("aria-label"), "Record");

  // Auto ON: pass advances to next key, keeps mic live, enters reveal, and starts listening after READ_MS.
  const onUi = rapidUiContext({
    prefs: { ...sessions.defaultPrefs(), auto: true },
  });
  onUi.context.finishRapid(onUi.context.startGen, { passed: true, expected: [], heard: [] });
  onUi.flushNextTimer();
  assert.equal(sessions.currentKeyId(onUi.context.session), "C");
  assert.equal(onUi.context.rapidPhase, "reveal");
  assert.equal(onUi.micStops(), 0);
  assert.equal(onUi.micLive(), true);
  assert.equal(onUi.primary.dataset.action, "pause");
  const revealStep = onUi.flushNextTimer();
  assert.equal(revealStep?.ms, READ_MS);
  assert.equal(onUi.listened(), 1);
  assert.equal(onUi.context.rapidPhase, "listening");

  // Toggling Auto OFF -> ON during the 2s celebration starts listening on the next key.
  const offToOn = rapidUiContext({
    prefs: { ...sessions.defaultPrefs(), auto: false },
  });
  offToOn.context.finishRapid(offToOn.context.startGen, { passed: true, expected: [], heard: [] });
  offToOn.context.prefs.auto = true;
  offToOn.flushNextTimer();
  assert.equal(sessions.currentKeyId(offToOn.context.session), "C");
  assert.equal(offToOn.context.rapidPhase, "reveal");
  assert.equal(offToOn.micStops(), 0);
  assert.equal(offToOn.flushNextTimer()?.ms, READ_MS);
  assert.equal(offToOn.listened(), 1);

  // Toggling Auto ON -> OFF during the 2s celebration stops the mic and stays idle on the next key.
  const onToOff = rapidUiContext({
    prefs: { ...sessions.defaultPrefs(), auto: true },
  });
  onToOff.context.finishRapid(onToOff.context.startGen, { passed: true, expected: [], heard: [] });
  onToOff.context.prefs.auto = false;
  onToOff.flushNextTimer();
  assert.equal(sessions.currentKeyId(onToOff.context.session), "C");
  assert.equal(onToOff.context.rapidPhase, "idle");
  assert.equal(onToOff.micStops(), 1);
  assert.equal(onToOff.listened(), 0);
  assert.equal(onToOff.primary.dataset.action, "record");
});
