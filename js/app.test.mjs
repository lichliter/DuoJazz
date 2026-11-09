import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as sessions from "./session.js";
import * as medals from "./medals.js";
import * as followers from "./follow.js";
import { expectedNotesFor } from "./grade.js";
import { instrumentOrDefault } from "./instruments.js";
import { rapidMicStep, shouldRecordMastery } from "./rapid.js";
import { parseTabState } from "./tabs.js";
import { storageWarning, writeStoredJson } from "./storage.js";

const source = await readFile(new URL("./app.js", import.meta.url), "utf8");
const noop = () => {};

function appContext(names, overrides = {}) {
  const context = vm.createContext({
    ...sessions,
    ...medals,
    ...followers,
    expectedNotesFor,
    instrumentOrDefault,
    rapidMicStep,
    shouldRecordMastery,
    parseTabState,
    storageWarning,
    writeStoredJson,
    cloudSettings: { userId: null },
    structuredClone,
    savedPrefs: sessions.defaultPrefs(),
    SELECTED_MODULE_KEY: "duojazz.selectedModule.v1",
    URLSearchParams,
    prefs: sessions.defaultPrefs(),
    mastery: medals.emptyMastery(),
    masteryPreview: null,
    wrapupBanner: null,
    session: null,
    notesRevealed: false,
    notesPeeked: false,
    els: { storageNotice: { textContent: "", hidden: true } },
    render: noop,
    halt: noop,
    writeTabUrl: noop,
    openSettings: noop,
    ...overrides,
  });
  for (const name of names) {
    const match = new RegExp(`^(?:async )?function ${name}\\(`, "m").exec(source);
    assert.ok(match, `Actual app function ${name} exists`);
    const end = source.indexOf("\n}", match.index) + 2;
    vm.runInContext(source.slice(match.index, end), context);
  }
  return context;
}

const progressFunctions = ["shownMastery", "clearMasteryPreview", "applyDeepLink", "recordRapidPass", "renderStorageNotice"];

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

test("unsupported mic startup releases capture and backing", async () => {
  const harness = listeningContext();
  harness.context.monitor.start = async () => { harness.context.monitor.state = "unsupported"; };
  await harness.context.beginListening();
  assert.equal(harness.context.attempt, null);
  assert.equal(harness.context.rapidPhase, "idle");
  assert.equal(harness.context.recordBacking, false);
  assert.equal(harness.stops(), 1);
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
