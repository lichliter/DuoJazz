import {
  getKey,
  displayKey,
  phraseEvents,
  phraseSpanBars,
  chorusChords,
  learnChords,
  learnBeatsFor,
  formBeatsFor,
} from "./music.js";
import { INSTRUMENTS, instrumentOrDefault } from "./instruments.js";
import { APP_VERSION } from "./version.js";
import { Transport } from "./audio.js";
import {
  notationLayout,
  resolveNotationScale,
  staffCardContentHeight,
  staffSystemMetricsFromBoxes,
  withSystemGap,
  sessionWheelLayout,
  minWheelDiameter,
} from "./lesson.js";
import { chorusStaffMEI, meiNoteIdGroups, phraseMEI } from "./mei.js";
import {
  applyFailedNoteHighlight,
  applySoundingHighlight,
  compactChordSymbol,
  fillMusicLabel,
  engraveMei,
  highlightActiveChords,
  fiveLineStaffHeightCss,
  markFirstMelodyNote,
  padViewBoxToInk,
  measureEngraving,
  playbackTimemap,
  soundingIdsAt,
  whenVerovioReady,
} from "./engrave.js";
import {
  PREFS_KEY,
  MODULE,
  MODULES,
  LESSONS,
  CYCLE_MODES,
  TWELVE_KEY_IDS,
  lessonById,
  normalizePrefs,
  normalizeAccountPrefs,
  compactPrefs,
  defaultPrefs,
  recommendedLessonId,
  createSession,
  currentCard,
  currentKeyId,
  keyOrdinal,
  completeCard,
  handlePlaybackEnded,
  jumpToCard,
  jumpToWrapup,
  markLessonStarted,
  sessionPresentation,
  demoAudioConfig,
  recordBackingConfig,
  sessionAudioConfig,
  sessionPrimaryAction,
  wrapupCopy,
  listenStateCopy,
  displayKeyName,
  persistLessonMelodyRegister,
  setMelodyRegister,
  sessionSlot,
  moduleRoadNodes,
  moduleById,
  lessonSleeve,
  moduleForLesson,
  sessionKeyQuality,
  canGoBack,
  canGoNext,
  goBack,
  goNext,
  resultForCard,
  leaveCardOutcome,
  skipRemainingCards,
  resolveQuickViewJump,
  clampTempo,
  hasLessonTempoOverride,
  lessonTempo,
  setModuleTempo,
  resetModuleTempo,
  stepTapTempo,
  persistLessonTempo,
  wrapupNextLesson,
  lessonSessionPlan,
  sessionCreateArgs,
  isCyclingLesson,
  isPracticeLesson,
  sessionShowsCycle,
  lessonVinylTier,
  cycleModeId,
  setInstrument,
  cardLabel,
  sessionEngraveSpec,
  sessionModeHeading,
  sessionScreenTitle,
  LEGACY_PREFS_KEY,
  keyOrderPreview,
  keyCycleStates,
  practiceMajorKeyIds,
  setAllKeys,
  setStartKey,
  toggleSelectedKey,
} from "./session.js";
import { parseTabState, tabSearch } from "./tabs.js";
import { chartGrid, chartKeyChoices } from "./charts.js";
import { applicationById, PRACTICE_CATALOG, CHART_LIBRARY, CHART_MODULES } from "./registry.js";
import { MY_CHARTS_KEY, MY_LICKS_KEY, loadMyCharts, loadMyLicks } from "./practice-catalog.js";
import { gradedMasteryPercent } from "./library-progress.js";
import { setupLibraryPicker } from "./library-ui.js";
import { setupLibraryPreview } from "./library-preview.js";
import { transposeToneKey } from "./chord-tones.js";
import { setupPracticeUI } from "./practice-ui.js";
import { GRADED_CARDS, chartPassFeedback, expectedNotesFor, finishCard, gradeSession, hasPitchTake } from "./grade.js";
import { createFollower, debugTextForKey, describeAttempt, formatFailureFeedback, formatLiveLine, octaveModeForLesson, stepFollower, tickFollower } from "./follow.js";
import {
  CELEBRATE_MS,
  READ_MS,
  RETRY_MS,
  afterFail,
  afterPass,
  isLastRapidKey,
  passSchedule,
  hearDemoGesture,
  hearItButton,
  rapidFireButton,
  rapidMicStep,
  shouldRecordMastery,
  skipAhead,
} from "./rapid.js";
import {
  emptyMastery,
  loadMastery,
  saveMastery,
  recordQuizPass,
  recordLearnPass,
  lessonPassedKeys,
  normalizeMastery,
} from "./medals.js";
import { PitchMonitor, micCopy } from "./pitch.js";
import {
  blobToBase64,
  buildTakeRecord,
  closeTakeRecorder,
  createTakeLog,
  deliverTake,
  openTakeRecorder,
  pushTakeFrame,
} from "./take-dump.js";
import { storageWarning, writeStoredJson } from "./storage.js";
import { initAccount } from "./account.js";
import { createCloudSettings, PREFERENCE_NAMES } from "./cloud-settings.js";
import { closeSheet, initDialogInteractions } from "./dialogs.js";
import { collectElements } from "./app-dom.js";
import { createHomeView } from "./app-home.js";
import { createChartsView, renderChartGrid } from "./app-charts.js";
import { createWrapupView, sessionVinylTier } from "./app-wrapup.js";

initDialogInteractions();

const transport = new Transport();
const monitor = new PitchMonitor();
const playback = { playing: false, paused: false, ended: false };
let recordBacking = false;
let prefs = loadPrefs();
let savedPrefs = compactPrefs(prefs);
const cloudSettings = createCloudSettings({ onChange: () => window.dispatchEvent(new Event("duojazz-settings-changed")) });
let mastery = loadMastery();
let masteryPreview = null;
let setupLessonId = recommendedLessonId(keysByLesson(mastery)) ?? LESSONS[0].id;
let session = null;
let lastNotationLayout = null;
let lastPlayheadSystem = null;
let lastTimemap = [];
let lastPlaybackTimemap = [];
let lastChordTimings = [];
let lastNoteIdGroups = [];
let audioError = "";
let audioNotice = "";
let samplesLoading = false;
let startGen = 0;
let notationGen = 0;
let notationRenderKey = null;
let lastEngraveMs = 0;
let wrapupBanner = null;
let liveGrade = null;
let lastSessionSlot = "";
let cue = null;
let cueSeq = 0;
let lastRenderedCueSeq = 0;
let rapidPhase = "idle";
let hearDemo = false;
let attempt = null;
let attemptTimer = null;
let feedbackTimer = null;
let finishing = false;
let sessionShot = null;
let lastDebug = null;
let takeLog = null;
let lastTake = null;
let notesRevealed = false;
let notesPeeked = false;
let sealToken = 0;
let liveAt = 0;
const debugOn = new URLSearchParams(location.search).get("debug") === "1";
const SELECTED_MODULE_KEY = "duojazz.selectedModule.v1";
const LAST_ROTATION_KEY = "duojazz.lastRotation.v1";
let selectedModuleId = loadSelectedModule();
const deepLinkOverrides = { module: null, auto: null };
let nav = parseTabState(location.search);
const launchParams = new URLSearchParams(location.search);
let hasLaunchLink = ["tab", "screen", "module", "sheet"].some(name => launchParams.has(name));
let lastChartTune = nav.tune;
const unsavedChartKeys = new Map();
let lickRotation = loadMyLicks(MODULES);
const ROTATION_IMPORTED_KEY = "duojazz.rotationImported.v1";
let guestRotationImported = false;
let tempoTaps = [];

function rotationLickIds() {
  const enrolled = new Set(lickRotation);
  return MODULES.filter(module => module.id === "chord-tones" || enrolled.has(module.id)).map(module => module.id);
}

function nextRotationItem(id) {
  const rotation = rotationLickIds();
  const index = rotation.indexOf(id);
  const next = index < 0 ? null : MODULES.find(module => module.id === rotation[index + 1]);
  return next ? { id: next.id, label: `Next: ${next.name}` } : { label: "Explore licks" };
}

function nextLessonAfterSession(target) {
  return wrapupNextLesson(target, {
    rotationLickIds: rotationLickIds(),
    rotationChartIds: practiceUI.getSelected(),
  });
}

let timedRunActive = false;
let chartLearnAdvance = null;
function isTimedChart() {
  return Boolean(session && lessonById(session.lessonId).chartTimed);
}

function isChartLearn() {
  if (!session) return false;
  const lesson = lessonById(session.lessonId);
  return Boolean(lesson.chartId && lesson.kind === "learn");
}
const tabScroll = { licks: 0, charts: 0, settings: 0 };

const els = collectElements(document);

function loadSelectedModule() {
  try {
    const id = JSON.parse(localStorage.getItem(SELECTED_MODULE_KEY));
    if (MODULES.some((module) => module.id === id)) return id;
  } catch {
    // Missing or unavailable storage should not prevent opening the library.
  }
  return MODULES[0]?.id ?? "cmar";
}

function rememberModule(id) {
  selectedModuleId = MODULES.some((module) => module.id === id) ? id : MODULES[0]?.id;
  if (typeof deepLinkOverrides !== "undefined") deepLinkOverrides.module = null;
  if (cloudSettings.userId) cloudSettings.set({ selectedModuleId });
  else writeStoredJson(SELECTED_MODULE_KEY, selectedModuleId);
  renderStorageNotice();
}

function addLickToRotation(id) {
  if (id === "chord-tones" || !MODULES.some((module) => module.id === id)) return;
  lickRotation = [...new Set([...lickRotation, id])];
  if (cloudSettings.userId) cloudSettings.setLick(id, true);
  else writeStoredJson(MY_LICKS_KEY, lickRotation);
  rememberModule(id);
  render();
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY) ?? localStorage.getItem(LEGACY_PREFS_KEY) ?? "null";
    return normalizePrefs(JSON.parse(raw));
  } catch {
    return defaultPrefs();
  }
}

function persist() {
  const nextCompact = compactPrefs(prefs);
  if (cloudSettings.userId) {
    const prevCompact = compactPrefs(savedPrefs);
    const changed = Object.fromEntries(
      PREFERENCE_NAMES
        .filter(name => JSON.stringify(nextCompact[name]) !== JSON.stringify(prevCompact[name]))
        .map(name => [name, nextCompact[name]]),
    );
    if (Object.keys(changed).length) cloudSettings.set(changed);
  } else writeStoredJson(PREFS_KEY, nextCompact);
  savedPrefs = structuredClone(nextCompact);
  renderStorageNotice();
}

function renderStorageNotice() {
  if (!els.storageNotice) return;
  const warning = storageWarning();
  els.storageNotice.textContent = warning;
  els.storageNotice.hidden = !warning;
}

function shownMastery() {
  return masteryPreview ?? mastery;
}

function clearMasteryPreview() {
  if (!masteryPreview) return;
  masteryPreview = null;
  wrapupBanner = null;
}

function clearRapidTimers() {
  if (attemptTimer) window.clearInterval(attemptTimer);
  if (feedbackTimer) window.clearTimeout(feedbackTimer);
  attemptTimer = null;
  feedbackTimer = null;
}

function halt({ keepMic = false } = {}) {
  startGen += 1;
  hearDemo = false;
  recordBacking = false;
  timedRunActive = false;
  chartLearnAdvance = null;
  finishing = false;
  samplesLoading = false;
  clearRapidTimers();
  rapidPhase = "idle";
  if (els.celebrate) els.celebrate.hidden = true;
  if (debugOn && takeLog && !takeLog.recordSealed && attempt && takeLog.frames.length) {
    sealTake(takeLog, attempt);
  } else {
    closeTakeRecorder(takeLog);
  }
  attempt = null;
  monitor.onFrame = () => {};
  transport.stop();
  if (!keepMic) {
    monitor.holdSignal = false;
    monitor.stop();
  }
  playback.playing = false;
  playback.paused = false;
  playback.ended = false;
  audioError = "";
  if (els.primary) els.primary.disabled = false;
  renderHearIt();
}

function releaseMic(reason) {
  if (rapidMicStep(monitor.isLive(), reason) !== "release" && !timedRunActive) return;
  const held = session?.keyIndex ?? 0;
  const onSession = session?.screen === "session";
  halt();
  if (!onSession || !session || reason === "leave") return;
  session = {
    ...session,
    keyIndex: held,
    demo: reason === "hide" ? false : session.demo,
  };
  rapidPhase = "idle";
  if (reason !== "pause" && reason !== "hear") {
    cue = null;
    lastRenderedCueSeq = 0;
  }
  renderCue();
  renderPrimary();
}

function clearGradeLine() {
  liveGrade = null;
  if (cue || sessionShot === "retry") return;
  if (!els.gradeLine) return;
  els.gradeLine.hidden = true;
  delete els.gradeLine.dataset.kind;
  delete els.gradeLine.dataset.tone;
  els.gradeLine.classList.remove("grade-flash");
  const main = document.getElementById("grade-main");
  const hint = document.getElementById("grade-hint");
  if (main) main.textContent = "";
  if (hint) {
    hint.hidden = true;
    hint.textContent = "";
  }
  renderFailedNote();
}

function shownKeyForSession() {
  if (!session) return null;
  return displayKey(getKey(currentKeyId(session)), session.displayMode, sessionKeyQuality(session));
}

function visualPhase() {
  if (sessionShot === "check") return "celebrate";
  if (sessionShot === "listening" || sessionShot === "retry" || sessionShot === "idle") {
    return sessionShot;
  }
  return rapidPhase;
}

function notesVisibleInSession() {
  if (!session || session.screen !== "session") return false;
  const lesson = lessonById(session.lessonId);
  if (lesson.chartTimed) return false;
  return lesson.kind !== "master" || notesRevealed;
}

function demoRetryCue() {
  const notes = session ? expectedNotesFor(session) : [];
  const index = notes.length ? Math.min(2, notes.length - 1) : 0;
  const target = notes[index] ?? null;
  return {
    kind: "retry",
    failure: {
      index,
      reason: "wrong",
      kind: "slightly-flat",
      cents: -58,
      expectedMidi: target?.midi ?? null,
      heardMidi: target?.midi != null ? target.midi - 1 : null,
    },
    expectedLabels: notes.map((note) => note.shownName),
  };
}

function currentCue() {
  if (sessionShot === "retry") return demoRetryCue();
  if (visualPhase() === "celebrate") return null;
  if (cue && cue.keyToken && session && cue.keyToken !== sessionKeyToken(session)) return null;
  return cue;
}

function renderFailedNote() {
  const current = currentCue();
  const show = Boolean(
    current?.kind === "retry"
    && current.failure
    && current.failure.kind !== "timeout"
    && notesVisibleInSession(),
  );
  const ids = show ? (lastNoteIdGroups[current.failure.index] ?? []) : [];
  applyFailedNoteHighlight(els.notation, ids);
}

function renderCue() {
  const line = els.gradeLine;
  if (!line) {
    renderFailedNote();
    return;
  }
  const current = currentCue();
  const main = document.getElementById("grade-main");
  const hint = document.getElementById("grade-hint");
  if (!current) {
    if (liveGrade?.graded) {
      renderFailedNote();
      return;
    }
    line.hidden = true;
    delete line.dataset.kind;
    delete line.dataset.tone;
    line.classList.remove("grade-flash");
    line.removeAttribute("aria-label");
    renderFailedNote();
    return;
  }
  if (current.kind === "retry") {
    const formatted = current.failure
      ? formatFailureFeedback(current.failure, {
        displayMode: session?.displayMode ?? "concert",
        shownKey: shownKeyForSession(),
        notesVisible: notesVisibleInSession(),
        expectedLabel: current.expectedLabels?.[current.failure.index] ?? null,
      })
      : {
        tone: "warn",
        noteText: current.hint ?? "",
        verdictText: "Try again",
        ariaLabel: `Try again. ${current.hint ?? ""}`.trim(),
      };
    line.hidden = false;
    line.dataset.kind = "retry";
    line.dataset.tone = formatted.tone;
    if (main) fillMusicLabel(main, formatted.verdictText);
    if (hint) {
      hint.hidden = !formatted.noteText;
      fillMusicLabel(hint, formatted.noteText);
    }
    line.setAttribute("aria-label", formatted.ariaLabel);
    if (current.seq && current.seq !== lastRenderedCueSeq) {
      lastRenderedCueSeq = current.seq;
      line.classList.remove("grade-flash");
      void line.offsetWidth;
      line.classList.add("grade-flash");
    }
    renderFailedNote();
    return;
  }
  line.hidden = false;
  line.dataset.kind = current.kind;
  delete line.dataset.tone;
  if (main) main.textContent = current.kind === "check" ? "✓" : "Try again";
  if (hint) {
    hint.hidden = !current.hint;
    hint.textContent = current.hint ?? "";
  }
  line.setAttribute("aria-label", current.kind === "check" ? "Pass" : `Try again. ${current.hint ?? ""}`.trim());
  renderFailedNote();
}

function renderLive(frame) {
  if (!debugOn || !els.debugLive) return;
  const now = frame?.t ?? performance.now();
  if (liveAt && now - liveAt < 100) return;
  liveAt = now;
  els.debugLive.textContent = formatLiveLine(frame, shownKeyForSession());
}

function takeMeta(result, frames) {
  const instrument = instrumentOrDefault(session?.instrumentId);
  const track = monitor.stream?.getAudioTracks?.()?.[0];
  let trackSettings = null;
  try {
    trackSettings = track?.getSettings ? { ...track.getSettings() } : null;
  } catch {
    trackSettings = null;
  }
  return {
    userAgent: navigator.userAgent,
    sampleRate: monitor.ctx?.sampleRate ?? transport.ctx?.sampleRate ?? null,
    trackSettings,
    instrument: instrument ? { id: instrument.id, label: instrument.label } : null,
    lesson: session ? { id: session.lessonId, title: sessionScreenTitle(session) } : null,
    key: session ? currentKeyId(session) : null,
    expectedMidis: Array.isArray(result?.expected) ? result.expected.slice() : [],
    frames,
    result: {
      passed: Boolean(result?.passed),
      reason: result?.reason ?? null,
      hint: result?.hint ?? null,
      heard: Array.isArray(result?.heard) ? result.heard.map((row) => ({ ...row })) : [],
    },
  };
}

function sealTake(log, result) {
  if (!debugOn || !log || log.recordSealed) return;
  log.recordSealed = true;
  const frames = log.frames.map((frame) => ({ ...frame }));
  const meta = takeMeta(result, frames);
  const token = sealToken + 1;
  sealToken = token;
  lastTake = null;
  renderDebug();
  closeTakeRecorder(log).then(async (blob) => {
    if (token !== sealToken) return;
    let audioBase64 = null;
    let audioMimeType = null;
    if (blob?.size) {
      try {
        audioBase64 = await blobToBase64(blob);
        audioMimeType = blob.type || null;
      } catch {
        audioBase64 = null;
      }
    }
    if (token !== sealToken) return;
    lastTake = buildTakeRecord({ ...meta, audioBase64, audioMimeType });
    renderDebug();
  });
}

async function armDebugTake() {
  if (!debugOn) return;
  const previous = takeLog;
  takeLog = createTakeLog();
  liveAt = 0;
  if (els.debugLive) els.debugLive.textContent = "Level —";
  if (previous) await closeTakeRecorder(previous);
  if (!monitor.stream) return;
  openTakeRecorder(takeLog, monitor.stream);
}

function renderDebug() {
  if (!els.debugStrip) return;
  if (!debugOn || !session || session.screen !== "session") {
    els.debugStrip.hidden = true;
    return;
  }
  const shown = shownKeyForSession();
  const fresh = describeAttempt(
    followerForSession(session),
    shown,
  ).text;
  els.debugStrip.hidden = false;
  const line = attempt
    ? describeAttempt(attempt, shown).text
    : debugTextForKey(lastDebug, currentKeyId(session), fresh);
  if (els.debugAttempt) els.debugAttempt.textContent = line;
  if (els.debugLive && !els.debugLive.textContent) els.debugLive.textContent = "Level —";
  if (els.saveTake) {
    els.saveTake.hidden = !lastTake;
    if (lastTake && els.saveTake.textContent !== "Could not save") els.saveTake.textContent = "Save take";
  }
}

function renderAuto() {
  if (!els.autoToggle) return;
  const on = prefs.auto !== false;
  els.autoToggle.setAttribute("role", "switch");
  els.autoToggle.setAttribute("aria-checked", String(on));
  els.autoToggle.setAttribute("aria-label", "Auto");
}

function recordRapidPass() {
  recordPassIfNeeded({ passed: true });
}

function finishRapid(generation, result) {
  if (generation !== startGen || finishing || rapidPhase !== "listening") return;
  finishing = true;
  rapidPhase = "settling";
  recordBacking = false;
  transport.stop();
  if (attemptTimer) window.clearInterval(attemptTimer);
  attemptTimer = null;
  const shown = shownKeyForSession();
  lastDebug = session
    ? { ...describeAttempt(result, shown), keyId: currentKeyId(session) }
    : null;
  if (debugOn && takeLog && !takeLog.recordSealed) sealTake(takeLog, result);
  else closeTakeRecorder(takeLog);
  attempt = null;
  const passed = Boolean(result.passed);
  const step = rapidMicStep(
    monitor.isLive(),
    passed && isLastRapidKey(session) ? "wrapup" : "attempt",
  );
  monitor.onFrame = () => {};
  if (step === "release") {
    monitor.holdSignal = false;
    monitor.stop();
  }
  renderDebug();
  if (passed) recordRapidPass();
  const auto = prefs.auto !== false;
  const token = startGen;
  if (passed) {
    if (isChartLearn()) {
      const next = afterPass(session, { auto });
      halt({ keepMic: next.autoStart });
      applySession(next.session, { autoStart: next.autoStart });
      transport.playSuccessDing();
      return;
    }
    rapidPhase = "celebrate";
    cue = null;
    const plan = passSchedule(session, { auto, notesShown: notesPeeked });
    renderCelebrate();
    renderCue();
    renderPrimary();
    const wait = plan.steps[0]?.ms ?? CELEBRATE_MS;
    feedbackTimer = window.setTimeout(() => {
      finishCelebration(token, { arm: true });
    }, wait);
    return;
  }
  const failed = afterFail(session, { hint: result.hint ?? "1st note" });
  rapidPhase = "retry";
  const keyToken = sessionKeyToken(session);
  const keepExistingPitchCue = result.reason === "timeout"
    && cue?.kind === "retry"
    && cue.keyToken === keyToken
    && cue.failure
    && cue.failure.kind !== "timeout";
  if (!keepExistingPitchCue) {
    cueSeq += 1;
    cue = {
      kind: "retry",
      keyToken,
      seq: cueSeq,
      hint: failed.hint,
      failure: result.failure ?? null,
      expectedLabels: session ? expectedNotesFor(session).map((note) => note.shownName) : [],
    };
  }
  renderCue();
  renderPrimary();
  if (failed.autoStart) {
    feedbackTimer = window.setTimeout(() => {
      if (token !== startGen) return;
      finishing = false;
      rapidPhase = "idle";
      if (session?.screen === "session") beginListening();
    }, RETRY_MS);
    return;
  }
  finishing = false;
}

function followerForSession(target, origin = null) {
  const lesson = lessonById(target.lessonId);
  return createFollower(
    expectedNotesFor(target).map((note) => note.midi),
    origin,
    { octave: octaveModeForLesson(lesson.kind, notesRevealed) },
  );
}

async function beginPracticeLoop() {
  if (!session || session.screen !== "session" || session.demo) return;
  const generation = startGen + 1;
  startGen = generation;
  finishing = false;
  clearRapidTimers();
  sessionShot = null;
  cue = null;
  audioError = "";
  attempt = null;
  monitor.onFrame = () => {};
  monitor.holdSignal = false;
  rapidPhase = "listening";
  renderCue();
  renderPrimary();
  try {
    await transport.ensure();
    if (generation !== startGen || !session) return;
    const prepared = await transport.prepareBacking({ sampleSet: "piano" });
    if (generation !== startGen || !session || rapidPhase !== "listening") return;
    audioNotice = prepared.status === "fallback" ? (prepared.notice ?? "") : "";
    const config = recordBackingConfig(session);
    recordBacking = true;
    await transport.start(config, { resume: false });
    if (generation !== startGen || rapidPhase !== "listening") {
      if (generation === startGen) {
        recordBacking = false;
        transport.stop();
      }
    }
  } catch {
    if (generation !== startGen) return;
    recordBacking = false;
    transport.stop();
    audioError = "Audio failed to load.";
    rapidPhase = "idle";
    renderMeter();
    renderPrimary();
  }
}

async function beginTimedChart() {
  halt();
  cue = null;
  lastRenderedCueSeq = 0;
  resetPitchTake();
  const generation = startGen;
  const learn = isChartLearn();
  timedRunActive = true;
  rapidPhase = "listening";
  sessionShot = null;
  render();
  try {
    await transport.ensure();
    if (generation !== startGen || !timedRunActive) return;
    await transport.prepareBacking({ sampleSet: "piano" });
    if (generation !== startGen || !timedRunActive) return;
    await monitor.start(transport.ctx, { processing: false });
    if (generation !== startGen || !timedRunActive) return;
    if (!monitor.isLive()) throw new Error('Microphone unavailable');
    // Keep the same microphone and audio clock across the whole run.
    let passed = false;
    function watchSegment() {
      passed = false;
      monitor.reset();
      const check = chartPassFeedback(expectedNotesFor(session), session.tempo, { writtenOctave: learn });
      monitor.onFrame = (frame) => {
        if (!transport.playing || !check(frame.beat, monitor.observations)) return;
        passed = true;
        transport.playSuccessDing();
      };
    }
    watchSegment();
    const config = { ...recordBackingConfig(session), looping: false };
    await transport.start(config, {
      nextSegment: learn ? () => {
        const next = passed ? afterPass(session, { auto: prefs.auto !== false }) : null;
        if (next && !next.autoStart) {
          chartLearnAdvance = next.session;
          return null;
        }
        const target = next?.session ?? session;
        return {
          config: { ...recordBackingConfig(target), looping: false },
          onStart() {
            if (next) {
              recordRapidPass();
              applySession(target);
              if (prefs.auto === false) {
                halt();
                renderPrimary();
                return;
              }
            }
            watchSegment();
          },
        };
      } : null,
    });
  } catch {
    if (generation !== startGen) return;
    halt();
    audioError = 'Microphone or backing failed to start. Try again.';
    render();
  }
}

function renderTimedPosition(snap = transport.snapshot()) {
  if (!isTimedChart()) return;
  const length = formBeatsFor(lessonById(session.lessonId).applicationId);
  const position = document.getElementById('timed-chart-position');
  position.textContent = !timedRunActive ? `${length / 4} bars · one complete run`
    : !snap.playing ? 'Getting ready…'
    : snap.inCountIn ? `Count in · ${Math.max(1, Math.ceil(-snap.beats))}`
    : `Bar ${snap.bar} of ${length / 4} · Beat ${snap.beatInBar}`;
  document.getElementById('timed-chart-progress').value = Math.max(0, snap.beats ?? 0) / length;
}

async function beginListening() {
  if (!session || session.screen !== "session" || session.demo) return;
  clearMasteryPreview();
  if (isTimedChart() || (isChartLearn() && prefs.auto !== false)) return beginTimedChart();
  if (isPracticeLesson(session.lessonId)) return beginPracticeLoop();
  const generation = startGen + 1;
  startGen = generation;
  finishing = false;
  clearRapidTimers();
  sessionShot = null;
  audioError = "";
  rapidPhase = "listening";
  renderCelebrate();
  attempt = null;
  monitor.holdSignal = true;
  monitor.now = () => performance.now();
  monitor.onFrame = (frame) => {
    if (generation !== startGen || rapidPhase !== "listening" || !attempt || attempt.ended) return;
    if (debugOn) {
      pushTakeFrame(takeLog, frame);
      renderLive(frame);
    }
    attempt = stepFollower(attempt, frame);
    if (attempt?.ended) finishRapid(generation, attempt);
  };
  renderCue();
  renderPrimary();
  renderDebug();
  try {
    await transport.ensure();
    if (generation !== startGen || !session) return;
    const prepared = await transport.prepareBacking({ sampleSet: "piano" });
    if (generation !== startGen || !session || rapidPhase !== "listening") return;
    audioNotice = prepared.status === "fallback" ? (prepared.notice ?? "") : "";
    // Arm the microphone before starting the backing so permission prompts do not play over silence.
    const step = rapidMicStep(monitor.isLive() && monitor.processing === false, "attempt");
    if (step === "reset") monitor.reset();
    else await monitor.start(transport.ctx, { processing: false });
    if (generation !== startGen) return;
    if (monitor.state === "denied" || monitor.state === "unsupported" || monitor.state === "no-mic" || monitor.state === "mic-busy") {
      rapidPhase = "idle";
      attempt = null;
      monitor.holdSignal = false;
      monitor.stop();
      recordBacking = false;
      transport.stop();
      renderPrimary();
      renderMic();
      return;
    }
    const config = recordBackingConfig(session);
    recordBacking = true;
    await transport.start(config, { resume: false });
    if (generation !== startGen || rapidPhase !== "listening") {
      if (generation === startGen) {
        recordBacking = false;
        transport.stop();
      }
      return;
    }
    if (debugOn) await armDebugTake();
    if (generation !== startGen) return;
    attempt = followerForSession(session, performance.now());
    renderDebug();
    attemptTimer = window.setInterval(() => {
      if (generation !== startGen || rapidPhase !== "listening" || !attempt || attempt.ended) return;
      attempt = tickFollower(attempt, performance.now());
      renderDebug();
      if (attempt?.ended) finishRapid(generation, attempt);
    }, 50);
  } catch {
    if (generation !== startGen) return;
    recordBacking = false;
    transport.stop();
    audioError = "Microphone failed to start.";
    rapidPhase = "idle";
    attempt = null;
    monitor.holdSignal = false;
    monitor.stop();
    renderMeter();
    renderPrimary();
  }
}

function finishCelebration(generation, { arm = false, pause = false } = {}) {
  if (rapidPhase !== "celebrate" || generation !== startGen) return;
  const plan = passSchedule(session, {
    auto: arm && prefs.auto !== false,
    skip: !pause,
    pause,
    notesShown: notesPeeked,
  });
  rapidPhase = "settling";
  if (feedbackTimer) window.clearTimeout(feedbackTimer);
  feedbackTimer = null;
  const reveal = plan.steps.find((step) => step.phase === "reveal");
  const listen = plan.autoStart && plan.session?.screen === "session";
  if (pause || !listen) releaseMic("pause");
  finishing = false;
  cue = null;
  rapidPhase = listen ? "reveal" : "idle";
  if (plan.session) applySession(plan.session, { autoStart: false });
  else renderCelebrate();
  if (!listen) return;
  const delay = reveal?.ms ?? READ_MS;
  const token = startGen;
  if (delay <= 0) {
    beginListening();
    return;
  }
  feedbackTimer = window.setTimeout(() => {
    if (token !== startGen || rapidPhase !== "reveal") return;
    beginListening();
  }, delay);
}

function renderShowNotes() {
  if (!els.showNotes) return;
  const lesson = session?.screen === "session" ? lessonById(session.lessonId) : null;
  const show = lesson?.kind === "master" && !lesson.chartTimed
    && !session.demo && !notesRevealed;
  els.showNotes.hidden = !show;
  els.showNotes.textContent = "Show notes";
  els.showNotes.setAttribute("aria-label", "Show notes");
  els.showNotes.setAttribute("aria-pressed", "false");
}

function renderCelebrate() {
  if (!els.celebrate) return;
  const on = Boolean(session && session.screen === "session" && visualPhase() === "celebrate");
  els.celebrate.hidden = !on;
  if (!on) return;
  const keyName = displayKeyName(currentKeyId(session), session.displayMode, sessionKeyQuality(session));
  if (els.celebrateKey) fillMusicLabel(els.celebrateKey, keyName);
  els.celebrate.setAttribute("aria-label", keyName || "Passed");
}

function resetPitchTake() {
  monitor.reset();
  clearGradeLine();
}

function shouldListen(target = session) {
  if (!target || target.screen !== "session") return false;
  const card = currentCard(target);
  if (!GRADED_CARDS.has(card)) return false;
  if (card === "listen" && target.listenStage === "hear") return false;
  return true;
}

function fillListenState(gradeResult = liveGrade) {
  const copy = session ? listenStateCopy(session) : null;
  if (!els.listenState) return;
  if (!copy) {
    els.listenState.hidden = true;
    return;
  }
  els.listenState.hidden = false;
  els.listenKicker.textContent = copy.kicker;
  if (gradeResult?.graded) {
    const bits = [`${gradeResult.percent}%`, gradeResult.passed ? "pass" : "not yet"];
    if (gradeResult.correction) bits.push(gradeResult.correction);
    els.listenDetail.textContent = bits.join(" · ");
    return;
  }
  els.listenDetail.textContent = copy.detail;
}

function renderMic() {
  const copy = micCopy(monitor.state);
  if (els.sessionMic) {
    els.sessionMic.hidden = !copy;
    els.sessionMic.textContent = copy;
  }
  fillListenState();
}

monitor.onState = state => {
  if (state === "interrupted") { halt(); renderPrimary(); }
  renderMic();
};
monitor.beatClock = (audioTime) => transport.currentBeats(timedRunActive ? audioTime : undefined);

function screenName() {
  if (session?.screen === "session") return "session";
  if (session?.screen === "wrapup") return "wrapup";
  return "home";
}

function openSettings() {
  renderSettings();
  if (els.settingsModal && !els.settingsModal.open) els.settingsModal.showModal();
}

function closeSettings() {
  closeSheet(els.settingsModal);
}

function saveTabScroll() {
  tabScroll[nav.tab] = window.scrollY;
}

function restoreTabScroll() {
  window.scrollTo({ top: tabScroll[nav.tab] ?? 0, behavior: "auto" });
}

function writeTabUrl(replace) {
  if (typeof history === "undefined") return;
  const url = `${location.pathname}${tabSearch(nav, location.search)}${location.hash}`;
  const method = replace ? "replaceState" : "pushState";
  history[method]({ nav }, "", url);
}

function lastRotationKey() {
  return cloudSettings.userId ? `${LAST_ROTATION_KEY}:${cloudSettings.userId}` : LAST_ROTATION_KEY;
}

function restoreLastRotation() {
  if (hasLaunchLink) return;
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(lastRotationKey()));
  } catch {
    // Open the default rotation when browser storage is unavailable.
  }
  nav = saved?.tab === "charts"
    ? { tab: "charts", tune: CHART_LIBRARY.some(chart => chart.id === saved.tune) ? saved.tune : null }
    : { tab: "licks", tune: null };
  lastChartTune = nav.tune;
  writeTabUrl(true);
}

function rememberRotation() {
  if (nav.tab !== "charts" && nav.tab !== "licks") return;
  hasLaunchLink = false;
  writeStoredJson(lastRotationKey(), nav);
}

function selectTab(tab, { tune = undefined, replace = false } = {}) {
  if (tab === "settings") {
    openSettings();
    return;
  }
  saveTabScroll();
  if (tab === "charts") {
    if (tune !== undefined) lastChartTune = tune;
    const rotation = practiceUI.getSelected();
    if (!rotation.includes(lastChartTune)) lastChartTune = rotation[0] ?? null;
    nav = { tab: "charts", tune: lastChartTune };
    // Saving can synchronously render via account progress sync. Publish the new chart first.
    if (cloudSettings.userId && lastChartTune) cloudSettings.set({ selectedChartId: lastChartTune });
  } else {
    nav = { tab, tune: null };
  }
  rememberRotation();
  writeTabUrl(replace);
  render();
  restoreTabScroll();
}

function startLesson(lessonId, options = {}) {
  if (screenName() === "home") saveTabScroll();
  clearMasteryPreview();
  const lesson = lessonById(lessonId);
  if (!lesson.chartId) {
    const moduleId = moduleForLesson(lesson.id)?.id ?? selectedModuleId;
    if (moduleId !== deepLinkOverrides.module) rememberModule(moduleId);
  }
  setupLessonId = lesson.id;
  const plan = { ...lessonSessionPlan(lesson.id, prefs), ...(options.keyId ? { startKeyId: options.keyId, majorKeyId: null } : {}) };
  halt();
  const next = createSession({
    lessonId: lesson.id,
    keyMode: plan.keyMode,
    startKeyId: plan.startKeyId,
    majorKeyId: plan.majorKeyId,
    keyIds: plan.keyIds,
    passedKeys: lessonPassedKeys(mastery, lesson.id),
    tempo: lessonTempo(prefs, lesson.id),
    melodyRegister: prefs.lessons[lesson.id]?.melodyRegister ?? 0,
    instrumentId: prefs.instrumentId,
    swing: prefs.swing,
    metronome: prefs.metronome,
    guideTones: prefs.guideTones,
  });
  prefs = markLessonStarted(prefs, lesson.id, next.startKeyId);
  if (options.sequence) { next.sequence = options.sequence; next.sequenceIndex = 0; }
  next.startVinylTier = sessionVinylTier(next, mastery);
  applySession(next);
}

function openSetup(lessonId) {
  startLesson(lessonId);
}

function openQuickView() {
  libraryPicker.open(nav.tab === 'charts' ? 'charts' : 'licks');
}

function closeQuickView() {
  closeSheet(els.quickView);
}

function requestQuickView() {
  if (session?.screen === "session" || session?.screen === "wrapup") {
    if (els.leaveConfirm && !els.leaveConfirm.open) els.leaveConfirm.showModal();
    return;
  }
  openQuickView();
}

function abandonToQuickView() {
  if (session?.screen === "session") {
    session = skipRemainingCards(session);
  }
  exitSession();
  openQuickView();
}

function currentHomeModuleId() {
  return selectedModuleId ?? MODULES[0]?.id;
}

function selectModule(id, { preview = false } = {}) {
  if (preview && !rotationLickIds().includes(id)) {
    selectedModuleId = id;
    deepLinkOverrides.module = id;
  } else {
    rememberModule(id);
  }
  renderHome();
  requestAnimationFrame(() => {
    document.getElementById("screen-home")?.scrollIntoView({ block: "start" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function jumpFromQuickView(id) {
  const target = resolveQuickViewJump(id);
  closeQuickView();
  if (!target) return;
  const moduleId = target.type === "module" ? target.id : target.moduleId;
  selectModule(moduleId);
}

function startFromSetup() {
  startLesson(setupLessonId);
}

function exitSession() {
  cue = null;
  lastRenderedCueSeq = 0;
  releaseMic("leave");
  resetPitchTake();
  lastSessionSlot = "";
  session = null;
  render();
  restoreTabScroll();
}

function sessionKeyToken(value) {
  if (!value || value.screen !== "session") return "";
  return `${value.lessonId}:${currentKeyId(value)}`;
}

function applySession(next, { autoStart = false } = {}) {
  const previousScreen = session?.screen;
  clearMasteryPreview();
  const prevKey = sessionKeyToken(session);
  const nextKey = sessionKeyToken(next);
  if (nextKey !== prevKey || next?.screen !== "session") {
    cue = null;
    lastRenderedCueSeq = 0;
  }
  const slot = sessionSlot(next);
  if (slot !== lastSessionSlot) resetPitchTake();
  lastSessionSlot = slot;
  session = next;
  if (nextKey !== prevKey) {
    notesRevealed = false;
    notesPeeked = false;
  }
  persist();
  render();
  if (session?.screen !== previousScreen) {
    window.scrollTo({ top: 0, behavior: "instant" });
    if (session?.screen === "wrapup") els.wrapup.scrollTop = 0;
  }
  if (autoStart && session?.screen === "session") start(false);
}

async function start(resume = false) {
  if (!session || session.screen !== "session") return;
  if (hearDemo) stopHearDemo();
  if (session.demo) session = { ...session, demo: false };
  if (resume) resetPitchTake();
  return beginListening();
}

function renderHearIt() {
  const button = els.hearIt;
  if (button) button.hidden = isTimedChart();
  if (!button) return;
  const spec = hearItButton({ active: hearDemo });
  button.setAttribute("aria-label", spec.label);
  button.title = spec.title;
  button.dataset.state = spec.icon;
  const play = button.querySelector(".hear-it-play");
  const stop = button.querySelector(".hear-it-stop");
  const stopping = spec.icon === "stop";
  if (play) {
    if (stopping) play.setAttribute("hidden", "");
    else play.removeAttribute("hidden");
  }
  if (stop) {
    if (stopping) stop.removeAttribute("hidden");
    else stop.setAttribute("hidden", "");
  }
}

function stopHearDemo() {
  if (!hearDemo) {
    renderHearIt();
    return;
  }
  hearDemo = false;
  halt();
  renderHearIt();
  renderPrimary();
}

async function playHearDemo() {
  if (!session || session.screen !== "session" || isTimedChart()) return;
  const generation = startGen + 1;
  startGen = generation;
  hearDemo = true;
  const held = session.keyIndex;
  audioError = "";
  renderHearIt();
  renderPrimary();
  try {
    await transport.ensure();
    if (generation !== startGen || !hearDemo) return;
    const prepared = await transport.prepareBacking({ sampleSet: "piano" });
    if (generation !== startGen || !hearDemo || !session) return;
    audioNotice = prepared.status === "fallback" ? (prepared.notice ?? "") : "";
    const config = demoAudioConfig({ ...session, keyIndex: held });
    await transport.start(config, { resume: false });
    if (generation !== startGen || !hearDemo) return;
    renderHearIt();
    renderPrimary();
  } catch {
    if (generation !== startGen) return;
    hearDemo = false;
    audioError = "Audio failed to load.";
    renderHearIt();
    renderMeter();
    renderPrimary();
  }
}

function runPrimary() {
  if (!session || session.screen !== "session") return;
  if (sessionShot) {
    sessionShot = null;
    cue = null;
    rapidPhase = "idle";
    renderCue();
    renderCelebrate();
    renderPrimary();
    return;
  }
  const hearGesture = hearDemoGesture({ active: hearDemo, record: true });
  if (hearGesture.stop) {
    const held = session.keyIndex;
    stopHearDemo();
    if (!session || session.screen !== "session") return;
    session = { ...session, keyIndex: held, demo: false };
    if (hearGesture.listen) beginListening();
    return;
  }
  if (session.demo && (playback.playing || playback.paused)) {
    const action = sessionPrimaryAction(session, playback);
    if (action.id === "pause") halt();
    else if (action.id === "resume") start(true);
    return;
  }
  if (rapidPhase === "celebrate") {
    finishCelebration(startGen, { arm: false, pause: true });
    return;
  }
  if (rapidPhase === "settling") return;
  if (rapidPhase === "listening" || rapidPhase === "retry" || rapidPhase === "reveal") {
    sessionShot = null;
    if (isTimedChart()) { halt(); resetPitchTake(); render(); return; }
    releaseMic("pause");
    return;
  }
  beginListening();
}

function recordPassIfNeeded(result) {
  if (!result?.passed || !session || isPracticeLesson(session.lessonId)) return;
  clearMasteryPreview();
  const keyId = currentKeyId(session);
  if (shouldRecordMastery(session, true, { notesShown: notesPeeked })) {
    wrapupBanner = recordQuizPass(mastery, session.lessonId, keyId);
  } else if (lessonById(session.lessonId).kind === "master") {
    wrapupBanner = recordLearnPass(mastery, session.lessonId, keyId);
  } else {
    wrapupBanner = recordQuizPass(mastery, session.lessonId, keyId);
  }
  const previous = mastery;
  mastery = wrapupBanner;
  saveMastery(mastery);
  enrollFromProgress(mastery, previous);
  renderStorageNotice();
}

function gradeCurrentCard() {
  const result = finishCard(session, monitor.observations);
  recordPassIfNeeded(result);
  showGrade(result);
  return result;
}

function goContinue() {
  if (!session || session.screen !== "session") return;
  const failed = cue?.kind === "retry" && cue.keyToken === sessionKeyToken(session);
  const plan = skipAhead(session, { auto: prefs.auto !== false, failed });
  cue = null;
  lastRenderedCueSeq = 0;
  liveGrade = null;
  sessionShot = null;
  halt({ keepMic: Boolean(plan.autoStart) });
  applySession(plan.session, { autoStart: Boolean(plan.autoStart) });
}

function leaveOutcomeFromTake() {
  if (isTimedChart()) return leaveCardOutcome(session, { hasTake: false });
  const observations = monitor.observations;
  const hasTake = hasPitchTake(observations);
  const takeResult = hasTake ? finishCard(session, observations) : null;
  if (takeResult?.graded) recordPassIfNeeded(takeResult);
  return leaveCardOutcome(session, { hasTake, takeResult });
}

function navigateCard(delta) {
  if (!session || session.screen !== "session" || anyDialogOpen()) return;
  if (delta < 0 && !canGoBack(session)) return;
  if (delta > 0 && !canGoNext(session)) return;
  const observations = monitor.observations;
  const hasTake = hasPitchTake(observations);
  const takeResult = hasTake ? finishCard(session, observations) : null;
  if (takeResult?.graded) recordPassIfNeeded(takeResult);
  const moved = delta < 0
    ? goBack(session, { hasTake, takeResult })
    : goNext(session, { hasTake, takeResult });
  if (!moved.moved) return;
  halt();
  applySession(moved.session);
}

function anyDialogOpen() {
  return Boolean(
    els.quickView?.open
    || els.leaveConfirm?.open
    || els.settingsModal?.open
    || els.tempoModal?.open
    || els.chartKeyModal.open
    || els.chartSheet?.open
    || document.getElementById("chart-applications")?.open
    || document.getElementById("application-charts")?.open,
  );
}

function keysByLesson(current = shownMastery()) {
  const normalized = normalizeMastery(current);
  return Object.fromEntries(
    LESSONS.map((lesson) => [lesson.id, [...(normalized.lessons[lesson.id]?.passedKeys ?? [])]]),
  );
}

const {
  moduleBanner,
  sleeveButton,
  paintPathTrail,
  renderHome,
  chipRow,
} = createHomeView({
  els,
  getPrefs: () => prefs,
  getSelectedModuleId: () => deepLinkOverrides.module || rotationLickIds().includes(selectedModuleId)
    ? selectedModuleId : "chord-tones",
  setSelectedModuleId: (id) => { selectedModuleId = id; },
  keysByLesson,
  requestQuickView,
  nextRotationItem,
  isInRotation: (id) => rotationLickIds().includes(id),
  addToRotation: addLickToRotation,
  openExplore: () => libraryPicker.open("licks", { browse: true }),
  selectModule,
  openSetup,
  openApplication: (id) => practiceUI.openApplication(id),
});

function renderSetup() {
  renderSettings();
}


function renderStartKeySelect() {
  if (!els.startKey) return;
  const current = prefs.startKeyId;
  els.startKey.replaceChildren(
    ...TWELVE_KEY_IDS.map((id) => {
      const option = document.createElement("option");
      option.value = id;
      const shown = displayKey(getKey(id), prefs.displayMode, "major");
      option.textContent = shown.name;
      option.selected = id === current;
      return option;
    }),
  );
}

function renderKeyBubbles() {
  if (!els.setupKeys) return;
  const custom = prefs.allKeys === false;
  els.setupKeys.hidden = !custom;
  if (!custom) {
    els.setupKeys.replaceChildren();
    return;
  }
  const selected = new Set(practiceMajorKeyIds(prefs));
  els.setupKeys.replaceChildren(
    ...TWELVE_KEY_IDS.map((id) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "key-btn";
      btn.dataset.testid = `key-bubble-${id}`;
      const shown = displayKey(getKey(id), prefs.displayMode, "major");
      fillMusicLabel(btn, shown.shortName);
      const starting = id === prefs.startKeyId;
      btn.setAttribute("aria-label", starting ? `${shown.name}, starting key` : shown.name);
      btn.setAttribute("aria-pressed", String(selected.has(id)));
      btn.addEventListener("click", () => {
        prefs = toggleSelectedKey(prefs, id);
        persist();
        renderSettings();
      });
      return btn;
    }),
  );
}

function renderSettings() {
  chipRow(els.keyModes, CYCLE_MODES, cycleModeId(prefs.keyMode), (id) => {
    prefs.keyMode = cycleModeId(id);
    persist();
    renderSettings();
  });
  if (els.keyOrderPreview) {
    fillMusicLabel(
      els.keyOrderPreview,
      keyOrderPreview(
        prefs.keyMode,
        prefs.startKeyId,
        prefs.displayMode,
        prefs.allKeys === false ? practiceMajorKeyIds(prefs) : null,
      ),
    );
  }
  renderStartKeySelect();
  if (els.allKeysToggle) {
    els.allKeysToggle.setAttribute("aria-checked", String(prefs.allKeys === false));
  }
  renderKeyBubbles();
  if (els.tempoReadout) els.tempoReadout.textContent = String(prefs.tempo);
}

function renderSessionOctave() {
  if (!els.sessionOctave || !session) return;
  const current = session.melodyRegister;
  const down = document.createElement("button");
  down.type = "button";
  down.className = "octave-btn";
  down.textContent = "8vb";
  down.setAttribute("aria-label", "Octave down (8vb)");
  down.disabled = current <= -1;
  down.dataset.testid = "octave-down";
  down.addEventListener("click", () => applyMelodyOctave(current - 1));
  const up = document.createElement("button");
  up.type = "button";
  up.className = "octave-btn";
  up.textContent = "8va";
  up.setAttribute("aria-label", "Octave up (8va)");
  up.dataset.testid = "octave-up";
  up.disabled = current >= 1;
  up.addEventListener("click", () => applyMelodyOctave(current + 1));
  els.sessionOctave.replaceChildren(down, up);
}

function renderKeyCycle() {
  if (!els.keyCycle || !session || session.screen !== "session") return;
  if (!sessionShowsCycle(session)) {
    els.keyCycle.hidden = true;
    els.keyCycle.replaceChildren();
    return;
  }
  els.keyCycle.hidden = false;
  const ordinal = keyOrdinal(session);
  const states = keyCycleStates(session);
  els.keyCycle.setAttribute("aria-label", `Key ${ordinal.index} of ${ordinal.total}`);
  els.keyCycle.replaceChildren(...states.map((state) => {
    const seg = document.createElement("span");
    seg.className = "key-seg";
    seg.dataset.state = state;
    return seg;
  }));
}

function applyMelodyOctave(register) {
  if (!session || session.screen !== "session") return;
  const melodyRegister = register <= -1 ? -1 : register >= 1 ? 1 : 0;
  if (melodyRegister === session.melodyRegister) return;
  const again = hearDemo;
  const restart = !again && (playback.playing || playback.paused || (rapidPhase === "listening" || rapidPhase === "retry" || rapidPhase === "reveal"));
  halt();
  cue = null;
  lastRenderedCueSeq = 0;
  resetPitchTake();
  session = setMelodyRegister(session, melodyRegister);
  prefs = persistLessonMelodyRegister(prefs, session.lessonId, melodyRegister);
  persist();
  render();
  if (again) playHearDemo();
  else if (restart) start(false);
}

function renderSessionTempo() {
  if (!els.sessionTempo || !session) return;
  const current = clampTempo(session.tempo, prefs.tempo);
  const defaultTempo = clampTempo(prefs.tempo, 96);
  const overridden = hasLessonTempoOverride(prefs, session.lessonId) || current !== defaultTempo;

  const readout = document.createElement("button");
  readout.type = "button";
  readout.id = "session-tempo-btn";
  readout.className = "tempo-readout-btn";
  readout.dataset.testid = "session-tempo-readout";
  readout.dataset.overridden = String(overridden);
  readout.setAttribute("aria-haspopup", "dialog");
  readout.setAttribute("aria-controls", "tempo-modal");
  readout.setAttribute("aria-label", `Tempo ${current} bpm`);
  readout.title = `Tempo ${current} bpm`;
  readout.addEventListener("click", () => openTempoModal());

  const value = document.createElement("span");
  value.className = "tempo-bpm-value";
  value.textContent = String(current);
  const unit = document.createElement("span");
  unit.className = "tempo-bpm-unit";
  unit.textContent = "bpm";
  readout.append(value, unit);

  els.sessionTempo.replaceChildren(readout);
  if (els.tempoModal?.open) renderTempoModal();
}

function renderTempoModal({ keepInput = false } = {}) {
  if (!session) return;
  const current = clampTempo(session.tempo, prefs.tempo);
  const defaultTempo = clampTempo(prefs.tempo, 96);
  const overridden = hasLessonTempoOverride(prefs, session.lessonId) || current !== defaultTempo;
  if (els.sessionTempoInput && !keepInput) {
    els.sessionTempoInput.value = String(current);
  }
  if (els.sessionTempoDown) els.sessionTempoDown.disabled = current <= 60;
  if (els.sessionTempoUp) els.sessionTempoUp.disabled = current >= 160;
  if (els.sessionTempoTap) {
    els.sessionTempoTap.textContent = "Tap";
  }
  if (els.sessionTempoReset) {
    els.sessionTempoReset.hidden = false;
    els.sessionTempoReset.disabled = !overridden;
    els.sessionTempoReset.textContent = "Reset";
  }
}

function openTempoModal() {
  if (!session || session.screen !== "session") return;
  tempoTaps = [];
  halt();
  resetPitchTake();
  renderTempoModal();
  if (els.tempoModal && !els.tempoModal.open) els.tempoModal.showModal();
}

function closeTempoModal() {
  commitSessionTempoInput();
  closeSheet(els.tempoModal);
}

function applySessionTempo(nextTempo, { keepInput = false } = {}) {
  if (!session || session.screen !== "session") return;
  const tempo = clampTempo(nextTempo, session.tempo);
  const wasOverridden = hasLessonTempoOverride(prefs, session.lessonId);
  if (tempo === session.tempo && (tempo !== prefs.tempo || !wasOverridden)) {
    renderTempoModal({ keepInput });
    return;
  }
  const modalOpen = Boolean(els.tempoModal?.open);
  const again = !modalOpen && hearDemo;
  const restart = !modalOpen && !again && !isTimedChart() && (playback.playing || playback.paused || (rapidPhase === "listening" || rapidPhase === "retry" || rapidPhase === "reveal"));
  halt();
  resetPitchTake();
  prefs = setModuleTempo(prefs, session.lessonId, tempo);
  session = { ...session, tempo: lessonTempo(prefs, session.lessonId) };
  persist();
  render();
  renderTempoModal({ keepInput });
  if (again) playHearDemo();
  else if (restart) start(false);
}

function commitSessionTempoInput() {
  if (!els.sessionTempoInput || !session) return;
  const raw = els.sessionTempoInput.value.trim();
  if (!raw) {
    els.sessionTempoInput.value = String(session.tempo);
    return;
  }
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) {
    els.sessionTempoInput.value = String(session.tempo);
    return;
  }
  tempoTaps = [];
  applySessionTempo(clampTempo(num, session.tempo));
  els.sessionTempoInput.value = String(session.tempo);
}

function tapSessionTempo(now = performance.now()) {
  if (!session || session.screen !== "session") return;
  const next = stepTapTempo(tempoTaps, now);
  tempoTaps = next.taps;
  if (next.tempo !== null) {
    applySessionTempo(next.tempo);
  } else {
    renderTempoModal();
  }
}

function resetSessionTempo() {
  if (!session || session.screen !== "session") return;
  tempoTaps = [];
  if (!hasLessonTempoOverride(prefs, session.lessonId) && session.tempo === prefs.tempo) {
    renderTempoModal();
    return;
  }
  const modalOpen = Boolean(els.tempoModal?.open);
  const again = !modalOpen && hearDemo;
  const restart = !modalOpen && !again && !isTimedChart() && (playback.playing || playback.paused || (rapidPhase === "listening" || rapidPhase === "retry" || rapidPhase === "reveal"));
  halt();
  resetPitchTake();
  prefs = resetModuleTempo(prefs, session.lessonId);
  session = { ...session, tempo: lessonTempo(prefs, session.lessonId) };
  persist();
  render();
  renderTempoModal();
  if (again) playHearDemo();
  else if (restart) start(false);
}

function renderSessionChrome() {
  els.shell.dataset.sleeve = lessonSleeve(session.lessonId);
  if (els.cardBadge) els.cardBadge.textContent = sessionModeHeading(session);
  const practice = isPracticeLesson(session.lessonId);
  if (els.sessionModule) els.sessionModule.textContent = moduleForLesson(session.lessonId).name;
  if (els.sessionTitle) fillMusicLabel(els.sessionTitle, sessionScreenTitle(session));
  els.sessionKey.hidden = !practice && !session.sequence && !isTimedChart();
  fillMusicLabel(els.sessionKey, session.sequence
    ? `${lessonById(session.lessonId).context} · ${session.sequenceIndex + 1}/${session.sequence.length}`
    : isTimedChart() ? `Master · ${session.tempo} bpm · from memory`
    : applicationById(lessonById(session.lessonId).applicationId).label);
  const cycling = sessionShowsCycle(session);
  const autoHost = els.autoToggle?.closest(".auto-switch");
  if (autoHost) autoHost.hidden = isPracticeLesson(session.lessonId) || isTimedChart();
  if (els.sessionOctave) els.sessionOctave.hidden = isTimedChart();
  if (els.continueBtn) els.continueBtn.hidden = !isCyclingLesson(lessonById(session.lessonId)) && !session.sequence;
  renderKeyCycle();
  const footer = els.session?.querySelector('.session-footer');
  if (footer) footer.hidden = !cycling && Boolean(autoHost?.hidden) && Boolean(els.continueBtn?.hidden);
}

function renderSessionChart() {
  const host = els.sessionChartGrid;
  const lesson = lessonById(session.lessonId);
  host.hidden = !lesson.chartId || (lesson.kind !== "learn" && !lesson.chartPractice);
  if (host.hidden) return;

  const chart = CHART_LIBRARY.find(({ id }) => id === lesson.chartId);
  const concertKeyId = sessionChartConcertKey(chart, lesson);
  const gridKey = [chart.id, concertKeyId, session.instrumentId].join(":");
  if (host.dataset.chartKey !== gridKey) {
    renderChartGrid(host, chartGrid(chart, { concertKeyId, instrumentId: session.instrumentId }));
    host.dataset.chartKey = gridKey;
  }
  host.querySelector('[aria-current="step"]')?.removeAttribute("aria-current");
  host.querySelector(`[data-chord-index="${lesson.chordIndex}"]`)?.setAttribute("aria-current", "step");
}

function chordTimingsFor(target) {
  if (!target) return [];
  const lesson = lessonById(target.lessonId);
  const concertKey = getKey(currentKeyId(target));
  const isolated = lesson.kind === "learn" || lesson.kind === "master";
  const chords = isolated
    ? learnChords(concertKey, target.displayMode, lesson.applicationId)
    : chorusChords(concertKey, target.displayMode, lesson.applicationId);
  const length = isolated
    ? learnBeatsFor(lesson.applicationId)
    : formBeatsFor(lesson.applicationId);
  return chords.map((chord, index) => ({
    startBeat: chord.startBeat,
    durationBeats: chord.durationBeats,
    endBeat: chords[index + 1]?.startBeat ?? length,
    name: chord.name,
  }));
}

function releaseNotationCardWidth() {
  const card = els.session?.querySelector(".chart-card");
  const block = els.session?.querySelector(".notation-block");
  for (const el of [card, block]) {
    if (!el) continue;
    el.style.width = "";
    el.style.minWidth = "";
    el.style.marginInline = "";
  }
}

function staffWidth() {
  // Measure the cream screen, not a hugged card, so the next chorus engraves
  // across the page. Ignore padding: the staff is drawn inside the bezel.
  releaseNotationCardWidth();
  const card = els.session?.querySelector(".chart-card");
  const wrap = els.notation?.parentElement;
  let available = els.notation?.clientWidth || 760;
  if (card) {
    const cardStyle = getComputedStyle(card);
    const wrapStyle = wrap ? getComputedStyle(wrap) : null;
    const chrome = (parseFloat(cardStyle.paddingLeft) || 0)
      + (parseFloat(cardStyle.paddingRight) || 0)
      + (parseFloat(wrapStyle?.paddingLeft) || 0)
      + (parseFloat(wrapStyle?.paddingRight) || 0);
    const inner = card.clientWidth - chrome;
    if (inner > 0) available = Math.min(available, inner);
  }
  return Math.max(320, Math.min(980, available));
}

function notationRoot(svg) {
  return svg.querySelector("[data-staff-fit]") ?? svg;
}

function updatePlayhead(snap = transport.snapshot()) {
  const svg = els.notation.querySelector("svg");
  if (!svg || !session) return;
  const active = snap.playing || snap.paused;
  if (!active) {
    applySoundingHighlight(svg, []);
    lastPlayheadSystem = null;
    return;
  }
  const beats = snap.beats ?? 0;
  applySoundingHighlight(svg, soundingIdsAt(lastPlaybackTimemap, beats));
  if (snap.inCountIn) return;
  highlightActiveChords(svg, beats, lastChordTimings);
  if (lessonById(session.lessonId).chartPractice) return;
  const view = sessionPresentation(session);
  const barsOnStaff = lastNotationLayout?.barsPerLine
    ?? (view.audioStage === "learn" ? 2 : 4);
  const barIndex = Math.max(0, (snap.bar ?? 1) - 1);
  const system = Math.min(
    Math.max(0, els.notation.querySelectorAll(".staff").length - 1),
    Math.floor(barIndex / barsOnStaff),
  );
  const staff = els.notation.querySelectorAll(".staff")[system];
  if (staff && lastPlayheadSystem !== system) {
    lastPlayheadSystem = system;
    staff.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }
}

function screenMarginPx(screen) {
  const raw = getComputedStyle(screen).getPropertyValue("--screen-margin");
  const value = parseFloat(raw);
  return Number.isFinite(value) ? value : 20;
}

function clearStaffCardBox(wrap) {
  if (!wrap) return;
  wrap.style.minHeight = "";
  wrap.style.maxHeight = "";
  const card = wrap.closest(".chart-card");
  if (card) {
    card.style.minHeight = "";
    card.style.maxHeight = "";
  }
}

function layoutClickWheel() {
  const screen = els.session;
  const wheel = screen?.querySelector(".click-wheel");
  const stage = screen?.querySelector(".session-stage");
  const footer = screen?.querySelector(".session-footer");
  const card = screen?.querySelector(".chart-card");
  const wrap = card?.querySelector(".paper-wrap");
  if (!screen || !wheel || !stage || !footer || !card || !wrap) return;
  const svg = els.notation?.querySelector("svg");
  // Measure the card-to-footer slot with the wheel collapsed and the card
  // unpinned, so a previous engraving cannot shrink the slot.
  delete screen.dataset.columnScroll;
  delete screen.dataset.pageScroll;
  const scroller = screen.querySelector(".session-body");
  const keptScroll = scroller ? scroller.scrollTop : 0;
  if (scroller) scroller.scrollTop = 0;
  clearStaffCardBox(wrap);
  wheel.style.width = "0px";
  wheel.style.height = "0px";
  const margin = screenMarginPx(screen);
  const stageStyle = getComputedStyle(stage);
  const padX = (parseFloat(stageStyle.paddingLeft) || 0) + (parseFloat(stageStyle.paddingRight) || 0);
  const widthFit = Math.max(0, Math.floor(stage.clientWidth - padX));
  const footerTop = () => footer.hidden
    ? screen.getBoundingClientRect().bottom
    : footer.getBoundingClientRect().top;
  const space = footerTop() - card.getBoundingClientRect().top;
  const cardStyle = getComputedStyle(card);
  const wrapStyle = getComputedStyle(wrap);
  const wrapPadY = (parseFloat(wrapStyle.paddingTop) || 0) + (parseFloat(wrapStyle.paddingBottom) || 0);
  let chrome = (parseFloat(cardStyle.paddingTop) || 0) + (parseFloat(cardStyle.paddingBottom) || 0)
    + (parseFloat(cardStyle.borderTopWidth) || 0) + (parseFloat(cardStyle.borderBottomWidth) || 0)
    + wrapPadY;
  for (const child of card.children) {
    if (child.hidden || child === wrap) continue;
    const childStyle = getComputedStyle(child);
    chrome += child.getBoundingClientRect().height
      + (parseFloat(childStyle.marginTop) || 0)
      + (parseFloat(childStyle.marginBottom) || 0);
  }
  const notationShown = Boolean(svg) && !els.notation?.hidden;
  let metrics;
  if (notationShown) {
    const boxes = [...svg.querySelectorAll(".system")].map((el) => el.getBoundingClientRect());
    const staffPx = fiveLineStaffHeightCss(svg.querySelector(".staff"))
      || lastNotationLayout?.minStaffPx
      || 0;
    metrics = withSystemGap(
      staffSystemMetricsFromBoxes(boxes, svg.getBoundingClientRect().height),
      staffPx,
    );
  } else {
    const answer = card.querySelector(".hidden-answer");
    const contentHeight = answer && !answer.hidden ? answer.offsetHeight : 160;
    const staffPx = lastNotationLayout?.minStaffPx || 0;
    metrics = withSystemGap(
      staffSystemMetricsFromBoxes([], Math.max(contentHeight, staffPx)),
      staffPx,
    );
  }
  const cardHeight = staffCardContentHeight(metrics);
  const floor = minWheelDiameter(window.innerWidth);
  const fit = sessionWheelLayout({
    space,
    cardHeight,
    chrome,
    margin,
    widthFit,
    minDiameter: floor,
  });
  let diameter = fit.diameter;
  let pageScroll = fit.pageScroll;
  wheel.style.width = `${diameter}px`;
  wheel.style.height = `${diameter}px`;
  const borderMin = Math.ceil(fit.cardHeight + wrapPadY);
  wrap.style.minHeight = `${borderMin}px`;
  wrap.style.maxHeight = "";
  card.style.minHeight = `${Math.ceil(fit.cardHeight + chrome)}px`;
  card.style.maxHeight = "";
  wrap.dataset.systems = String(metrics.count);
  wrap.dataset.cardMin = String(Math.round(fit.cardHeight));
  const bar = footer.querySelector(".key-cycle");
  const barVisible = Boolean(!footer.hidden && bar && !bar.hidden);
  const barTop = barVisible ? bar.getBoundingClientRect().top : footerTop();
  let overflow = Math.ceil(wheel.getBoundingClientRect().bottom + margin - barTop);
  if (overflow > 1 && diameter > floor) {
    diameter = Math.max(floor, Math.floor(diameter - overflow));
    wheel.style.width = `${diameter}px`;
    wheel.style.height = `${diameter}px`;
    overflow = Math.ceil(wheel.getBoundingClientRect().bottom + margin - barTop);
  }
  if (overflow > 1) pageScroll = true;
  if (pageScroll) screen.dataset.columnScroll = "true";
  else delete screen.dataset.columnScroll;
  if (pageScroll && scroller) scroller.scrollTop = keptScroll;
  wheel.dataset.fit = diameter + 1 >= widthFit ? "width" : "height";
}

function fitNotationInView() {
  const svg = els.notation?.querySelector("svg");
  const body = els.session?.querySelector(".session-body");
  const stage = body?.querySelector(".session-stage");
  if (!svg || !body || !stage || els.notation.hidden) {
    layoutClickWheel();
    return;
  }
  svg.style.setProperty("width", "100%", "important");
  svg.style.setProperty("max-width", "100%", "important");
  svg.style.setProperty("height", "auto", "important");
  svg.style.setProperty("margin-inline", "auto", "important");
  const staffPx = lastNotationLayout?.minStaffPx;
  if (staffPx) {
    const measured = fiveLineStaffHeightCss(svg.querySelector(".staff"));
    const drawn = svg.getBoundingClientRect();
    if (measured > staffPx + 1.5 && drawn.width > 0) {
      svg.style.setProperty("width", `${Math.round(drawn.width * staffPx / measured)}px`, "important");
    }
  }
  padViewBoxToInk(svg);
  releaseNotationCardWidth();
  layoutClickWheel();
}

function renderNotation() {
  if (!session || session.screen !== "session") return;
  const view = sessionPresentation(session);
  const lesson = lessonById(session.lessonId);
  const hideStaff = Boolean(view.hideStaff);
  const concealNotes = !hideStaff && !notesVisibleInSession();
  const paperWrap = els.notation.closest(".paper-wrap");
  document.getElementById('timed-chart-panel').hidden = !lesson.chartTimed;
  els.hiddenAnswer.hidden = !hideStaff || lesson.chartTimed;
  els.hiddenAnswer.textContent = currentCard(session) === "quiz" ? "From memory" : "Use your ears";
  fillListenState();
  els.notation.hidden = hideStaff;
  els.session.dataset.card = currentCard(session);
  const spec = sessionEngraveSpec(session);
  els.notation.classList.toggle("slash", Boolean(view.showSlashNotation && !view.showLandingNotation));
  els.notation.classList.toggle("notation-memory", Boolean(spec.memory && !notesRevealed));
  paperWrap.classList.toggle("notes-hidden", concealNotes && !lesson.chartPractice);
  els.notation.classList.toggle("notes-concealed", concealNotes && Boolean(lesson.chartPractice));
  if (hideStaff) {
    notationGen += 1;
    notationRenderKey = null;
    lastTimemap = [];
    lastPlaybackTimemap = [];
    lastChordTimings = [];
    lastNoteIdGroups = [];
    els.notation.replaceChildren();
    lastPlayheadSystem = null;
    layoutClickWheel();
    renderTimedPosition();
    return;
  }
  const width = staffWidth();
  const layout = notationLayout({
    staffWidth: width,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    showPhraseNotation: spec.showPhraseNotation,
    showEntranceCues: spec.showEntranceCues,
    phraseBars: spec.phraseBars,
    notationScale: resolveNotationScale(),
  });
  const concertKey = getKey(currentKeyId(session));
  const mei = spec.mei === "phrase"
    ? phraseMEI(
      concertKey,
      session.displayMode,
      lesson.applicationId,
      session.clef,
      session.melodyRegister,
      { barsPerLine: layout.barsPerLine },
    )
    : chorusStaffMEI({
      concertKey,
      displayMode: session.displayMode,
      applicationId: lesson.applicationId,
      clef: session.clef,
      melodyRegister: session.melodyRegister,
      mode: spec.mei,
      showCues: spec.showEntranceCues,
      barsPerLine: layout.barsPerLine,
    });
  lastNoteIdGroups = meiNoteIdGroups(mei);
  const renderKey = JSON.stringify([session.lessonId, mei, layout, width, spec.memory && !notesRevealed]);
  if (notationRenderKey === renderKey) {
    updatePlaybackTimemap();
    fitNotationInView();
    updatePlayhead();
    renderFailedNote();
    return;
  }
  notationRenderKey = renderKey;
  lastTimemap = [];
  lastPlaybackTimemap = [];
  lastChordTimings = chordTimingsFor(session);
  lastNotationLayout = {
    ...layout,
    phraseStartBar: view.application?.phraseStartBar ?? 7,
    phraseBars: phraseSpanBars(lesson.applicationId),
  };
  const gen = notationGen += 1;
  whenVerovioReady().then(() => {
    if (gen !== notationGen) return;
    if (!session || session.screen !== "session") {
      notationRenderKey = null;
      return;
    }
    return engraveMei(els.notation, mei, {
      layout,
      width,
    });
  }).then((engraved) => {
    if (!engraved || gen !== notationGen) return;
    lastNotationLayout = {
      ...engraved.layout,
      phraseStartBar: lastNotationLayout.phraseStartBar,
      phraseBars: lastNotationLayout.phraseBars,
    };
    lastEngraveMs = engraved.elapsedMs;
    lastTimemap = engraved.timemap ?? [];
    updatePlaybackTimemap();
    if (els.notation.classList.contains("notation-memory")) markFirstMelodyNote(els.notation);
    fitNotationInView();
    updatePlayhead();
    renderFailedNote();
  }).catch(() => {
    if (gen !== notationGen) return;
    notationRenderKey = null;
    els.notation.replaceChildren();
  });
}

function updatePlaybackTimemap() {
  const lesson = lessonById(session.lessonId);
  const isolated = sessionEngraveSpec(session).mei === "phrase";
  const phrase = phraseEvents(lesson.applicationId, isolated);
  lastPlaybackTimemap = playbackTimemap(lastTimemap, phrase, session.tempo, session.swing);
}

function renderInstruments() {
  if (!els.instrumentList) return;
  const current = instrumentOrDefault(prefs.instrumentId).id;
  const inputs = els.instrumentList.querySelectorAll('input[name="instrument"]');
  if (inputs.length === INSTRUMENTS.length) {
    for (const input of inputs) input.checked = input.value === current;
    return;
  }
  els.instrumentList.replaceChildren(
    ...INSTRUMENTS.map((instrument) => {
      const label = document.createElement("label");
      label.className = "group-row instrument-row";
      const copy = document.createElement("span");
      copy.className = "instrument-copy";
      const strong = document.createElement("strong");
      strong.textContent = instrument.label;
      const note = document.createElement("small");
      note.textContent = instrument.note;
      copy.append(strong, note);
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "instrument";
      input.value = instrument.id;
      input.checked = instrument.id === current;
      input.addEventListener("change", () => applyInstrument(instrument.id));
      label.append(copy, input);
      return label;
    }),
  );
}

function applyInstrument(instrumentId) {
  const instrument = instrumentOrDefault(instrumentId);
  const again = Boolean(session && hearDemo);
  const restart = Boolean(session && !again && (playback.playing || playback.paused || (rapidPhase === "listening" || rapidPhase === "retry" || rapidPhase === "reveal")));
  prefs.instrumentId = instrument.id;
  prefs.displayMode = instrument.id;
  prefs.clef = instrument.clef;
  persist();
  if (session) {
    halt();
    cue = null;
    lastRenderedCueSeq = 0;
    resetPitchTake();
    session = setInstrument(session, instrument.id);
  }
  render();
  if (again) playHearDemo();
  else if (restart) start(false);
}

function renderCopy(snap = transport.snapshot()) {
  els.swing.checked = prefs.swing;
  els.metronome.checked = prefs.metronome;
  renderInstruments();
}

function renderPrimary(snap = transport.snapshot()) {
  if (!session || session.screen !== "session") return;
  renderAuto();
  const phase = visualPhase();
  if (els.session) els.session.dataset.rapid = phase;
  const demoLive = Boolean(
    !hearDemo
    && session.demo
    && (samplesLoading || playback.playing || playback.paused || snap.inCountIn),
  );
  if (!demoLive) {
    const listening = phase === "listening"
      || (!sessionShot && (rapidPhase === "retry" || rapidPhase === "reveal"));
    const action = isTimedChart()
      ? { id: listening ? "stop" : "start", label: listening ? "Stop run" : "Start Master run" }
      : rapidFireButton({ listening });
    const icon = els.primary.querySelector(".play-round-icon");
    els.primary.hidden = false;
    els.primary.disabled = false;
    els.primary.dataset.action = action.id;
    els.primary.dataset.state = listening ? "listening" : "idle";
    els.primary.classList.remove("is-stop");
    els.primary.classList.remove("is-count");
    delete els.primary.dataset.passed;
    if (els.primaryCount) {
      els.primaryCount.hidden = true;
      els.primaryCount.textContent = "";
    }
    if (icon) icon.hidden = false;
    els.primary.setAttribute("aria-label", action.label);
    return;
  }
  const action = sessionPrimaryAction(session, playback);
  const icon = els.primary.querySelector(".play-round-icon");
  els.primary.hidden = !action;
  if (!action) return;
  const playing = action.id === "pause" || action.id === "stop";
  const inCountIn = Boolean(snap.inCountIn);
  const listening = Boolean(shouldListen() && (snap.playing || snap.paused) && !inCountIn);
  const result = liveGrade?.graded ? liveGrade : null;
  let state = "idle";
  if (samplesLoading) state = "loading";
  else if (inCountIn) state = "count-in";
  else if (playing) state = "playing";
  else if (listening) state = "listening";
  else if (result) state = "result";
  els.primary.dataset.action = playing ? "stop" : action.id;
  els.primary.dataset.state = state;
  els.primary.classList.toggle("is-stop", playing && !inCountIn && !samplesLoading);
  els.primary.classList.toggle("is-count", inCountIn);
  if (result) els.primary.dataset.passed = String(Boolean(result.passed));
  else delete els.primary.dataset.passed;
  if (samplesLoading) {
    if (els.primaryCount) els.primaryCount.hidden = true;
    if (icon) icon.hidden = true;
    els.primary.setAttribute("aria-label", "Loading backing");
    return;
  }
  if (inCountIn) {
    const n = Math.max(1, Math.ceil(-snap.beats));
    if (els.primaryCount) {
      els.primaryCount.hidden = false;
      els.primaryCount.textContent = String(n);
    }
    if (icon) icon.hidden = true;
    els.primary.setAttribute("aria-label", `Count-in ${n}`);
    return;
  }
  if (els.primaryCount) {
    els.primaryCount.hidden = true;
    els.primaryCount.textContent = "";
  }
  if (icon) icon.hidden = false;
  const label = result
    ? (result.passed ? "Pass" : "Not yet")
    : (playing ? "Stop" : action.label);
  els.primary.setAttribute("aria-label", label);
}

function renderMeter(snap = transport.snapshot()) {
  if (!session || session.screen !== "session") return;
  if (audioError) {
    els.meter.hidden = false;
    els.meter.textContent = audioError;
    return;
  }
  if (snap.inCountIn) {
    els.meter.hidden = true;
    els.meter.textContent = "";
    return;
  }
  if (audioNotice && !snap.playing && !snap.paused) {
    els.meter.hidden = false;
    els.meter.textContent = audioNotice;
    return;
  }
  els.meter.hidden = true;
  els.meter.textContent = "";
}

const { renderWrapup } = createWrapupView({
  els,
  getSession: () => session,
  getWrapupBanner: () => wrapupBanner,
  shownMastery,
  getNextLesson: nextLessonAfterSession,
});

function rotationChart() {
  const rotation = practiceUI.getSelected();
  const id = [nav.tune, lastChartTune, rotation[0]].find(id => rotation.includes(id));
  return CHART_LIBRARY.find(chart => chart.id === id);
}

function currentChart() {
  return rotationChart() ?? CHART_LIBRARY[0];
}

function chartKeyStorageKey(chart) {
  return `duojazz.chartKey.v1:${cloudSettings.userId ?? "guest"}:${chart.id}`;
}

function chartConcertKey(chart = currentChart()) {
  const storageKey = chartKeyStorageKey(chart);
  let saved = unsavedChartKeys.get(storageKey);
  if (saved === undefined) {
    try {
      saved = JSON.parse(localStorage.getItem(storageKey));
    } catch {
      // The source key is still available when storage is blocked or invalid.
    }
  }
  return TWELVE_KEY_IDS.includes(saved) ? saved : chart.key;
}

function saveChartConcertKey(chart, keyId) {
  if (!TWELVE_KEY_IDS.includes(keyId)) return;
  const storageKey = chartKeyStorageKey(chart);
  const override = getKey(keyId).pc === getKey(chart.key).pc ? null : keyId;
  if (writeStoredJson(storageKey, override)) unsavedChartKeys.delete(storageKey);
  else unsavedChartKeys.set(storageKey, override);
}

function sessionChartConcertKey(chart, lesson) {
  const delta = getKey(currentKeyId(session)).pc - getKey(lesson.defaultKeyId).pc;
  return transposeToneKey(chart.key, delta);
}

function renderSessionChartKey() {
  const lesson = lessonById(session.lessonId);
  const chart = CHART_LIBRARY.find(({ id }) => id === lesson.chartId);
  const button = els.sessionChartKey;
  button.hidden = !chart;
  if (!chart) return;
  const keyId = sessionChartConcertKey(chart, lesson);
  const label = displayKey(getKey(keyId), session.instrumentId, chart.keyQuality).shortName;
  fillMusicLabel(button.firstElementChild, label);
  button.setAttribute("aria-label", `Change chart key, ${label}`);
}

function openChartKeyModal() {
  if (session?.screen !== "session") return;
  const lesson = lessonById(session.lessonId);
  const chart = CHART_LIBRARY.find(({ id }) => id === lesson.chartId);
  if (!chart) return;
  halt();
  resetPitchTake();
  render();
  const current = sessionChartConcertKey(chart, lesson);
  els.chartKeyOptions.replaceChildren(...chartKeyChoices(chart.keyQuality, session.instrumentId).map(({ id, label }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    fillMusicLabel(button, label);
    button.setAttribute("aria-pressed", String(id === current));
    button.addEventListener("click", () => applySessionChartKey(chart, id));
    return button;
  }));
  els.chartKeyReset.disabled = getKey(current).pc === getKey(chart.key).pc
    && getKey(chartConcertKey(chart)).pc === getKey(chart.key).pc;
  els.chartKeyReset.onclick = () => applySessionChartKey(chart, transposeToneKey(chart.key, 0));
  els.chartKeyModal.showModal();
  els.chartKeyOptions.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
}

function applySessionChartKey(chart, keyId) {
  if (els.chartKeyModal.dataset.closing || session?.screen !== "session") return;
  const lesson = lessonById(session.lessonId);
  if (lesson.chartId !== chart.id) return;
  saveChartConcertKey(chart, keyId);
  if (getKey(keyId).pc !== getKey(sessionChartConcertKey(chart, lesson)).pc) {
    const mode = lesson.chartTimed ? "master" : lesson.chartPractice ? "practice" : "learn";
    startChartTones(mode, chart);
  } else {
    renderStorageNotice();
  }
  closeSheet(els.chartKeyModal);
}

function startChartTones(kind, chart = currentChart()) {
  const delta = getKey(chartConcertKey(chart)).pc - getKey(chart.key).pc;
  const parent = CHART_MODULES.find(module => module.id === `chart-${chart.id}`);
  if (kind === 'master') {
    const lesson = parent.lessons.find(lesson => lesson.chartTimed);
    startLesson(lesson.id, { keyId: transposeToneKey(lesson.defaultKeyId, delta) });
    return;
  }
  const sequence = parent.lessons
    .filter(lesson => !lesson.chartTimed && (kind === 'practice' ? lesson.chartPractice : lesson.kind === 'learn'))
    .map(lesson => ({ lessonId: lesson.id, keyId: transposeToneKey(lesson.defaultKeyId, delta) }));
  startLesson(sequence[0].lessonId, { sequence, keyId: sequence[0].keyId });
}

const { openChartApplications, renderChartDetail, renderCharts } = createChartsView({
  els,
  getPrefs: () => prefs,
  getRotationLicks: () => lickRotation,
  currentChart,
  chartConcertKey,
  keysByLesson,
  startChartTones,
  startLesson,
  moduleBanner,
  sleeveButton,
  openLickPicker: () => libraryPicker.open("licks"),
  paintPathTrail,
});

function render(snap = transport.snapshot()) {
  renderStorageNotice();
  const screen = screenName();
  els.shell.dataset.screen = screen;
  els.shell.dataset.tab = nav.tab;
  if (screen === "home") delete els.shell.dataset.sleeve;
  const onCharts = screen === "home" && nav.tab === "charts";
  const onHome = screen === "home" && !onCharts;
  els.home.hidden = !onHome;
  if (els.charts) els.charts.hidden = !onCharts;
  els.home.setAttribute("aria-hidden", String(!onHome));
  els.session.setAttribute("aria-hidden", String(screen !== "session"));
  els.wrapup.setAttribute("aria-hidden", String(screen !== "wrapup"));
  if (els.charts) els.charts.setAttribute("aria-hidden", String(!onCharts));
  const moduleName = session ? moduleForLesson(session.lessonId).name : "DuoJazz";
  document.title = screen === "home" ? "DuoJazz" : `DuoJazz · ${moduleName} session`;
  renderCopy(snap);
  if (onHome) renderHome();
  if (onCharts) {
    const hasChart = Boolean(rotationChart());
    document.getElementById("chart-rotation-empty").hidden = hasChart;
    els.charts.querySelector(".lesson-path").hidden = !hasChart;
    if (hasChart) renderCharts();
  }
  if (onHome || els.settingsModal?.open) renderSettings();
  if (screen === "session") {
    renderSessionChrome();
    renderSessionTempo();
    renderSessionChartKey();
    renderSessionOctave();
    renderSessionChart();
    renderShowNotes();
    renderNotation();
    renderPrimary();
    renderMeter(snap);
    renderMic();
    if (!liveGrade && !currentCue()) restoreStoredGrade();
    renderCue();
    renderCelebrate();
    renderDebug();
    renderAuto();
    renderHearIt();
  } else if (els.celebrate) {
    els.celebrate.hidden = true;
    renderShowNotes();
  }
  if (screen === "wrapup") renderWrapup();
}

function applyDeepLink() {
  const params = new URLSearchParams(location.search);
  nav = parseTabState(location.search);
  lastChartTune = nav.tune;
  const screen = params.get("screen");
  const lessonId = params.get("lesson") || "learn-lick";
  const card = params.get("card") || "learn";
  const moduleParam = params.get("module");
  if (moduleParam) {
    selectedModuleId = moduleParam;
    if (typeof deepLinkOverrides !== "undefined") deepLinkOverrides.module = moduleParam;
  }
  if (!screen) {
    writeTabUrl(true);
    if (nav.tab === "settings") openSettings();
    return;
  }
  if (params.get("demo") === "grades" || params.get("demo") === "medal") {
    let next = emptyMastery();
    next = recordQuizPass(next, "learn-lick", "G");
    next = recordQuizPass(next, "master-lick", "G");
    next = recordQuizPass(next, "integrate-minor-home", "G");
    wrapupBanner = next;
    masteryPreview = next;
  }
  if (params.get("demo") === "path") {
    let next = emptyMastery();
    for (const key of ["G", "C", "F", "Bb"]) next = recordQuizPass(next, "master-lick", key);
    for (const key of ["G", "C"]) next = recordQuizPass(next, "integrate-minor-home", key);
    masteryPreview = next;
  }
  const mic = params.get("mic");
  if (mic === "denied" || mic === "no-signal" || mic === "listening" || mic === "unsupported") {
    monitor.setState(mic);
  }
  if (screen === "setup") {
    openSettings();
    return;
  }
  if (screen === "session" || screen === "wrapup") {
    const lesson = lessonById(lessonId);
    const plan = lessonSessionPlan(lesson.id, prefs);
    if (isCyclingLesson(lesson) && params.get("keys")) plan.keyMode = cycleModeId(params.get("keys"));
    if (lesson.kind !== "integrate" && params.get("key")) {
      plan.startKeyId = params.get("key");
      plan.majorKeyId = null;
      plan.keyIds = null;
    }
    session = createSession({
      lessonId,
      keyMode: plan.keyMode,
      startKeyId: plan.startKeyId,
      majorKeyId: plan.majorKeyId,
      keyIds: plan.keyIds,
      tempo: lessonTempo(prefs, lesson.id),
      melodyRegister: prefs.lessons[lessonById(lessonId).id].melodyRegister,
      instrumentId: prefs.instrumentId,
      swing: prefs.swing,
      metronome: prefs.metronome,
      guideTones: prefs.guideTones,
    });
    session = screen === "wrapup" ? jumpToWrapup(session) : jumpToCard(session, card);
    const octave = Number(params.get("octave"));
    if (octave === -1 || octave === 1 || octave === 0) {
      session = setMelodyRegister(session, octave);
    }
    if (params.get("stage") === "echo") {
      session = { ...session, listenStage: "echo" };
    }
    if (screen === "wrapup" && params.get("demo") === "grades") {
      const count = session.keyQueue?.length ?? 1;
      const keyMarks = Array.from({ length: count }, (_, index) => {
        if (index === 3) return "failed";
        if (index === 7) return "skipped";
        return "passed";
      });
      session = {
        ...session,
        keyMarks,
        cardResults: [
          {
            cardId: "play",
            outcome: "passed",
            graded: true,
            passed: true,
            percent: 100,
            correction: null,
          },
        ],
      };
    }
    if (screen === "wrapup" && params.get("demo") === "skipped") {
      const count = session.keyQueue?.length ?? 1;
      session = {
        ...session,
        keyMarks: Array.from({ length: count }, () => "skipped"),
        cardResults: [
          { cardId: "play", outcome: "skipped", graded: false, passed: false },
        ],
      };
    }
    lastSessionSlot = sessionSlot(session);
    resetPitchTake();
    const shot = params.get("shot");
    sessionShot = shot === "idle" || shot === "listening" || shot === "check" || shot === "retry" ? shot : null;
    if (params.get("auto") === "0") {
      prefs.auto = false;
      if (typeof deepLinkOverrides !== "undefined") deepLinkOverrides.auto = false;
    }
    if (params.get("auto") === "1") {
      prefs.auto = true;
      if (typeof deepLinkOverrides !== "undefined") deepLinkOverrides.auto = true;
    }
  }
}

transport.onUpdate = (snap) => {
  playback.playing = snap.playing;
  playback.paused = snap.paused;
  playback.ended = Boolean(snap.ended);
  if (!session || session.screen !== "session") return;
  renderCopy(snap);
  renderPrimary();
  renderHearIt();
  renderMeter(snap);
  if (isTimedChart()) renderTimedPosition(snap);
  updatePlayhead(snap);
};

function showGrade(result) {
  liveGrade = result ?? null;
  fillListenState(result?.graded ? result : null);
  if (cue || sessionShot === "retry" || visualPhase() === "celebrate") return;
  if (!els.gradeLine) return;
  const main = document.getElementById("grade-main");
  const hint = document.getElementById("grade-hint");
  if (result?.graded) {
    els.gradeLine.hidden = false;
    els.gradeLine.dataset.kind = "legacy";
    delete els.gradeLine.dataset.tone;
    els.gradeLine.classList.remove("grade-flash");
    const bits = [`${result.percent}%`, result.passed ? "pass" : "not yet"];
    if (result.correction) bits.push(result.correction);
    if (main) main.textContent = bits.join(" · ");
    if (hint) {
      hint.hidden = true;
      hint.textContent = "";
    }
    return;
  }
  if (result?.outcome === "skipped") {
    els.gradeLine.hidden = false;
    els.gradeLine.dataset.kind = "legacy";
    delete els.gradeLine.dataset.tone;
    els.gradeLine.classList.remove("grade-flash");
    if (main) main.textContent = "Skipped";
    if (hint) {
      hint.hidden = true;
      hint.textContent = "";
    }
    return;
  }
  els.gradeLine.hidden = true;
  delete els.gradeLine.dataset.kind;
  delete els.gradeLine.dataset.tone;
  els.gradeLine.classList.remove("grade-flash");
  if (main) main.textContent = "";
  if (hint) {
    hint.hidden = true;
    hint.textContent = "";
  }
}

function restoreStoredGrade() {
  if (!session || session.screen !== "session") {
    showGrade(null);
    return;
  }
  if (hasPitchTake(monitor.observations) || playback.playing || playback.paused) return;
  showGrade(resultForCard(session));
}

function handleTransportEnded() {
  playback.playing = false;
  playback.paused = false;
  playback.ended = true;
  if (timedRunActive && isTimedChart()) {
    monitor.stop();
    const result = gradeSession(session, monitor.observations.filter(frame => frame.beat >= 0));
    recordPassIfNeeded(result);
    const done = completeCard(session, result);
    halt();
    applySession(done);
    return;
  }
  if (timedRunActive && chartLearnAdvance) {
    const next = chartLearnAdvance;
    recordRapidPass();
    halt();
    applySession(next);
    return;
  }
  if (recordBacking) {
    recordBacking = false;
    return;
  }
  if (hearDemo) {
    hearDemo = false;
    samplesLoading = false;
    renderHearIt();
    renderPrimary();
    return;
  }
  if (!session || session.screen !== "session") return;
  if (session.demo) {
    monitor.stop();
    const next = handlePlaybackEnded(session, {});
    applySession(next.session, { autoStart: false });
    return;
  }
  const listenHear = currentCard(session) === "listen" && session.listenStage === "hear";
  const grade = listenHear ? {} : gradeCurrentCard();
  monitor.stop();
  const next = handlePlaybackEnded(session, grade);
  const wait = grade.graded && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 900 : 0;
  const version = startGen, endedSession = session;
  if (feedbackTimer) window.clearTimeout(feedbackTimer);
  feedbackTimer = window.setTimeout(() => {
    if (version !== startGen || session !== endedSession) return;
    feedbackTimer = null;
    applySession(next.session, { autoStart: next.autoStart });
  }, wait);
}
transport.onEnded = handleTransportEnded;

const libraryPicker = setupLibraryPicker({
  modules: MODULES, charts: CHART_LIBRARY,
  ...setupLibraryPreview(() => prefs),
  chartKeyLabel: chart => {
    const key = displayKey(getKey(chartConcertKey(chart)), prefs.instrumentId, chart.keyQuality);
    return `${key.shortName} ${chart.keyQuality === "major" ? "major" : "minor"}`;
  },
  getProgress: type => {
    const progress = normalizeMastery(shownMastery());
    const items = type === 'licks' ? MODULES : CHART_MODULES;
    return Object.fromEntries(items.map(item => {
      const lessons = item.lessons.filter(lesson => lesson.kind === 'learn' || lesson.kind === 'master');
      const chart = type === 'charts' ? CHART_LIBRARY.find(chart => item.id === `chart-${chart.id}`) : null;
      const delta = chart ? getKey(chartConcertKey(chart)).pc - getKey(chart.key).pc : 0;
      return [chart?.id ?? item.id, gradedMasteryPercent(lessons, progress, lesson => chart
        ? [transposeToneKey(lesson.defaultKeyId, delta)] : TWELVE_KEY_IDS)];
    }));
  },
  getRotation: type => type === 'licks' ? rotationLickIds() : practiceUI.getSelected(),
  currentId: type => type === 'licks'
    ? (rotationLickIds().includes(selectedModuleId) ? selectedModuleId : "chord-tones")
    : rotationChart()?.id,
  onEnrollment(type, id, selected) {
    if (type === 'licks') {
      lickRotation = selected ? [...new Set([...lickRotation, id])] : lickRotation.filter(value => value !== id);
      if (!selected && selectedModuleId === id) rememberModule("chord-tones");
      if (cloudSettings.userId) cloudSettings.setLick(id, selected);
      else writeStoredJson(MY_LICKS_KEY, lickRotation);
      if (selected && selectedModuleId === id && deepLinkOverrides.module === id) rememberModule(id);
    } else {
      const charts = practiceUI.getSelected();
      const nextCharts = selected ? [...charts, id] : charts.filter(value => value !== id);
      practiceUI.setSelected(nextCharts);
      if (cloudSettings.userId) cloudSettings.setChart(id, selected);
      else writeStoredJson(MY_CHARTS_KEY, practiceUI.getSelected());
    }
    render();
  },
  onPick(type, id) {
    if (type === 'charts') {
      selectTab('charts', { tune: id });
      els.charts.querySelector('.module-banner')?.focus({ preventScroll: true });
    } else {
      selectTab('licks');
      selectModule(id, { preview: true });
      els.lessonList.querySelector('.module-banner')?.focus({ preventScroll: true });
    }
  },
});
const practiceUI = setupPracticeUI({
  onPractice: startLesson, onChanged: renderStorageNotice,
  onSaveChart: (id, selected) => {
    if (cloudSettings.userId) cloudSettings.setChart(id, selected);
    else writeStoredJson(MY_CHARTS_KEY, practiceUI.getSelected());
  },
  onManageCharts: () => libraryPicker.open("charts"),
});
function guestLegacySettings() {
  return {
    ...loadPrefs(),
    selectedModuleId: loadSelectedModule(),
    myCharts: loadMyCharts(PRACTICE_CATALOG.charts),
    myLicks: loadMyLicks(MODULES),
  };
}
document.getElementById("browse-charts").onclick = () => libraryPicker.open("charts", { browse: true });

function enrollFromProgress(progress, previous = progress) {
  const account = Boolean(cloudSettings.userId);
  if (!account && !guestRotationImported) {
    try { guestRotationImported = Boolean(localStorage.getItem(ROTATION_IMPORTED_KEY)); }
    catch { /* Merge into the in-memory rotation when storage is unavailable. */ }
  }
  const importGuest = !account && !guestRotationImported;
  const hasMedalProgress = (module, snapshot) => module.lessons.some(
    lesson => snapshot.lessons?.[lesson.id]?.passedKeys?.length,
  );
  const licks = MODULES.filter(module => module.id !== "chord-tones"
    && hasMedalProgress(module, progress)
    && (account || importGuest || !hasMedalProgress(module, previous))).map(module => module.id);

  const charts = account || importGuest ? [...new Set(LESSONS.filter(lesson => {
    const saved = progress.lessons?.[lesson.id];
    return lesson.chartId && (saved?.passedKeys?.length || saved?.learnedKeys?.length);
  }).map(lesson => lesson.chartId))] : [];
  if (account) {
    if (cloudSettings.seedRotation(licks, charts)) applyAccountSettings();
    return;
  }
  if (!importGuest && !licks.length) return;

  const currentCharts = practiceUI.getSelected();
  const nextLicks = [...new Set([...lickRotation, ...licks])];
  const nextCharts = [...new Set([...currentCharts, ...charts])];
  const savedLicks = nextLicks.length === lickRotation.length || writeStoredJson(MY_LICKS_KEY, nextLicks);
  const savedCharts = nextCharts.length === currentCharts.length || writeStoredJson(MY_CHARTS_KEY, nextCharts);
  lickRotation = nextLicks;
  practiceUI.setSelected(nextCharts);
  if (importGuest) {
    guestRotationImported = true;
    if (savedLicks && savedCharts) writeStoredJson(ROTATION_IMPORTED_KEY, true);
  }
  if (els.quickView?.open) libraryPicker.render();
}

function applyDeepLinkOverrides() {
  if (deepLinkOverrides.module && MODULES.some(module => module.id === deepLinkOverrides.module)) {
    selectedModuleId = deepLinkOverrides.module;
  }
  if (typeof deepLinkOverrides.auto === "boolean") {
    prefs.auto = deepLinkOverrides.auto;
  }
}
function applyGuestSettings() {
  prefs = loadPrefs();
  applyDeepLinkOverrides();
  savedPrefs = compactPrefs(prefs);
  selectedModuleId = loadSelectedModule();
  if (deepLinkOverrides.module && MODULES.some(module => module.id === deepLinkOverrides.module)) {
    selectedModuleId = deepLinkOverrides.module;
  }
  if (session && !playback.playing && !playback.paused && rapidPhase === "idle") {
    session = { ...session, tempo: lessonTempo(prefs, session.lessonId) };
  }
  practiceUI.setSelected(loadMyCharts(PRACTICE_CATALOG.charts));
  lickRotation = loadMyLicks(MODULES);
  if (!nav.tune) lastChartTune = CHART_LIBRARY[0].id;
  if (els.quickView?.open) libraryPicker.render();
  render();
}
function applyAccountSettings() {
  const values = cloudSettings.values();
  const previousPickerState = JSON.stringify([[...lickRotation].sort(), practiceUI.getSelected().sort(), prefs.instrumentId]);
  prefs = normalizeAccountPrefs(values);
  applyDeepLinkOverrides();
  savedPrefs = compactPrefs(prefs);
  selectedModuleId = MODULES.some(module => module.id === values.selectedModuleId) ? values.selectedModuleId : MODULES[0].id;
  if (deepLinkOverrides.module && MODULES.some(module => module.id === deepLinkOverrides.module)) {
    selectedModuleId = deepLinkOverrides.module;
  }
  if (session && !playback.playing && !playback.paused && rapidPhase === "idle") {
    session = { ...session, tempo: lessonTempo(prefs, session.lessonId) };
  }
  practiceUI.setSelected(values.myCharts ?? []);
  lickRotation = (values.myLicks ?? []).filter(id => MODULES.some(module => module.id === id));
  if (!nav.tune) lastChartTune = values.selectedChartId ?? CHART_LIBRARY[0].id;
  const pickerState = JSON.stringify([[...lickRotation].sort(), practiceUI.getSelected().sort(), prefs.instrumentId]);
  if (els.quickView?.open && pickerState !== previousPickerState) libraryPicker.render();
  render();
}

els.settingsClose?.addEventListener("click", () => closeSettings());
els.settingsModal?.addEventListener("close", () => {
  if (!els.shell.hidden) document.getElementById("account-chip")?.focus({ preventScroll: true });
});
els.settingsModal?.addEventListener("click", (event) => {
  const dialog = els.settingsModal;
  if (!dialog || event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  const inside = event.clientX >= rect.left && event.clientX <= rect.right
    && event.clientY >= rect.top && event.clientY <= rect.bottom;
  if (!inside) closeSettings();
});
document.querySelector('#chart-applications [data-close]').addEventListener('click', () => closeSheet(document.getElementById('chart-applications')));
document.getElementById('view-chart').addEventListener('click', () => {
  els.chartSheet.showModal();
  els.chartSheet.querySelector('.chart-sheet-body').scrollTop = 0;
});
els.chartKeys.addEventListener('change', () => {
  saveChartConcertKey(currentChart(), els.chartKeys.value);
  renderChartDetail();
  renderStorageNotice();
});
els.chartSheet.querySelector('[data-close]').addEventListener('click', () => closeSheet(els.chartSheet));
els.chartSheet.addEventListener('click', event => {
  if (event.target !== els.chartSheet) return;
  const rect = els.chartSheet.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeSheet(els.chartSheet);
});

els.settingsForm?.addEventListener("submit", (event) => event.preventDefault());
window.addEventListener("popstate", () => {
  nav = parseTabState(location.search);
  if (nav.tab === "charts") lastChartTune = nav.tune;
  rememberRotation();
  render();
});
els.sessionExit.addEventListener("click", exitSession);
els.leaveConfirm?.addEventListener("close", () => {
  if (els.leaveConfirm.returnValue === "leave") abandonToQuickView();
});
els.primary.addEventListener("click", runPrimary);
els.celebrate?.addEventListener("click", () => {
  if (rapidPhase === "celebrate") {
    finishCelebration(startGen, { arm: prefs.auto !== false });
    return;
  }
  if (sessionShot === "check") {
    sessionShot = null;
    cue = null;
    renderCelebrate();
    renderPrimary();
  }
});
els.saveTake?.addEventListener("click", () => {
  if (!lastTake || !els.saveTake) return;
  const button = els.saveTake;
  button.textContent = "Save take";
  deliverTake(lastTake).then(() => {
    button.textContent = "Save take";
  }).catch(() => {
    button.textContent = "Could not save";
  });
});
els.autoToggle?.addEventListener("click", () => {
  deepLinkOverrides.auto = null;
  prefs.auto = prefs.auto === false;
  persist();
  renderAuto();
});
els.showNotes?.addEventListener("click", () => {
  if (!session || session.screen !== "session" || lessonById(session.lessonId).kind !== "master" || session.demo) return;
  if (els.showNotes.hidden || notesRevealed) return;
  notesRevealed = true;
  notesPeeked = true;
  if (attempt) {
    attempt.octave = "written";
    attempt.octaveShift = null;
    attempt.pendingShift = null;
  }
  renderShowNotes();
  renderNotation();
  renderCue();
});
els.hearIt?.addEventListener("click", () => {
  if (!session || session.screen !== "session") return;
  const gesture = hearDemoGesture({ active: hearDemo });
  if (gesture.stop) {
    stopHearDemo();
    return;
  }
  const held = session.keyIndex;
  releaseMic("hear");
  if (!session || session.screen !== "session") return;
  session = { ...session, keyIndex: held, demo: false };
  playHearDemo();
});
els.continueBtn.addEventListener("click", goContinue);
els.wrapupNext?.addEventListener("click", () => {
  if (!session) return;
  const next = nextLessonAfterSession(session);
  if (!next) return;
  halt();
  if (next.kind === "lesson") {
    if (next.moduleId) rememberModule(next.moduleId);
    startLesson(next.lessonId);
    return;
  }
  if (next.kind === "application") {
    if (next.moduleId) rememberModule(next.moduleId);
    exitSession();
    requestAnimationFrame(() => {
      document.getElementById(`section-${next.moduleId}-integrate`)?.scrollIntoView({ behavior: "instant", block: "start" });
    });
    practiceUI.openApplication(next.applicationId);
    return;
  }
  if (next.kind === "chart-tones") {
    if (next.chartId && next.chartId !== currentChart().id) {
      nav = { tab: "charts", tune: next.chartId };
      lastChartTune = next.chartId;
      rememberRotation();
      writeTabUrl(false);
      if (cloudSettings.userId) cloudSettings.set({ selectedChartId: lastChartTune });
    }
    startChartTones(next.mode);
    return;
  }
  if (next.kind === "chart-integration") {
    if (next.chartId) {
      nav = { tab: "charts", tune: next.chartId };
      lastChartTune = next.chartId;
      rememberRotation();
      writeTabUrl(false);
    }
    exitSession();
    requestAnimationFrame(() => {
      document.getElementById(`section-chart-${next.chartId}-integrate`)?.scrollIntoView({ behavior: "instant", block: "start" });
    });
    openChartApplications(next.moduleId);
    return;
  }
  if (next.kind === "explore-charts") {
    exitSession();
    libraryPicker.open("charts", { browse: true });
    return;
  }
  exitSession();
  libraryPicker.open("licks", { browse: true });
});
els.wrapupClose?.addEventListener("click", exitSession);

function applyTempoDelta(delta) {
  prefs.tempo = clampTempo(prefs.tempo + delta, prefs.tempo);
  prefs = normalizePrefs(prefs);
  persist();
  if (session) {
    const nextTempo = lessonTempo(prefs, session.lessonId);
    if (session.tempo !== nextTempo) {
      session = { ...session, tempo: nextTempo };
      halt();
    }
    render();
    return;
  }
  renderSettings();
}
els.tempoDown?.addEventListener("click", () => applyTempoDelta(-4));
els.tempoUp?.addEventListener("click", () => applyTempoDelta(4));
els.sessionChartKey.addEventListener("click", openChartKeyModal);
els.chartKeyModal.addEventListener("close", () => {
  if (!els.shell.hidden && session?.screen === "session") els.sessionChartKey.focus({ preventScroll: true });
});
els.sessionTempoDown?.addEventListener("click", () => {
  if (!session) return;
  tempoTaps = [];
  applySessionTempo(session.tempo - 4);
});
els.sessionTempoUp?.addEventListener("click", () => {
  if (!session) return;
  tempoTaps = [];
  applySessionTempo(session.tempo + 4);
});
els.sessionTempoInput?.addEventListener("input", () => {
  if (!session || !els.sessionTempoInput) return;
  tempoTaps = [];
  const num = Number(els.sessionTempoInput.value);
  if (Number.isFinite(num) && num >= 60 && num <= 160) {
    applySessionTempo(Math.round(num), { keepInput: true });
  }
});
els.sessionTempoInput?.addEventListener("change", () => commitSessionTempoInput());
els.sessionTempoInput?.addEventListener("blur", () => commitSessionTempoInput());
els.sessionTempoInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    closeTempoModal();
  }
});
els.sessionTempoTap?.addEventListener("click", () => tapSessionTempo());
els.sessionTempoReset?.addEventListener("click", () => resetSessionTempo());
els.tempoModal?.addEventListener("close", () => {
  tempoTaps = [];
  if (!els.shell.hidden && session?.screen === "session") {
    document.getElementById("session-tempo-btn")?.focus({ preventScroll: true });
  }
});
els.startKey?.addEventListener("change", () => {
  prefs = setStartKey(prefs, els.startKey.value);
  persist();
  renderSettings();
});
els.allKeysToggle?.addEventListener("click", () => {
  prefs = setAllKeys(prefs, prefs.allKeys === false);
  persist();
  renderSettings();
});
els.allKeysLabel?.addEventListener("click", () => {
  els.allKeysToggle?.click();
});

for (const [id, key] of [
  ["swing", "swing"],
  ["metronome", "metronome"],
]) {
  els[id].addEventListener("change", () => {
    prefs[key] = els[id].checked;
    persist();
    if (session) session = { ...session, [key]: prefs[key] };
    halt();
    render();
  });
}

document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
  if (anyDialogOpen()) return;
  if (event.key === "Escape" && (session?.screen === "session" || session?.screen === "wrapup")) {
    exitSession();
    return;
  }
  if (session?.screen !== "session") return;
  const target = event.target;
  if (target?.isContentEditable || target?.closest?.('button, a, input, textarea, select, summary, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="link"], [role="slider"], [role="switch"], [role="checkbox"], [role="radio"], [role="textbox"], [role="combobox"], [role="listbox"], [role="menuitem"], [role="tab"]')) return;
  if (event.code === "Space") {
    event.preventDefault();
    runPrimary();
  }
  if ((event.key === "r" || event.key === "R") && session?.screen === "session") {
    event.preventDefault();
    halt();
    start(false);
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    navigateCard(-1);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    navigateCard(1);
  }
});

let swipeOrigin = null;
els.session?.addEventListener("touchstart", (event) => {
  const touch = event.changedTouches[0];
  if (!touch) return;
  swipeOrigin = { x: touch.clientX, y: touch.clientY };
}, { passive: true });
els.session?.addEventListener("touchend", (event) => {
  if (!swipeOrigin || anyDialogOpen()) {
    swipeOrigin = null;
    return;
  }
  const touch = event.changedTouches[0];
  const dx = (touch?.clientX ?? 0) - swipeOrigin.x;
  const dy = (touch?.clientY ?? 0) - swipeOrigin.y;
  swipeOrigin = null;
  if (Math.abs(dx) < 56 || Math.abs(dx) <= Math.abs(dy) * 1.2) return;
  navigateCard(dx < 0 ? 1 : -1);
}, { passive: true });

let resizeTimer = null;
window.addEventListener("resize", () => {
  if (resizeTimer) window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => {
    resizeTimer = null;
    if (session?.screen === "session") renderNotation();
    else render();
  }, 120);
});
window.addEventListener("pagehide", () => releaseMic("hide"));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") releaseMic("hide");
});

if (typeof ResizeObserver === "function") {
  const observer = new ResizeObserver(() => paintPathTrail());
  document.querySelectorAll(".lesson-path").forEach(path => observer.observe(path));
}
if (document.fonts?.ready) {
  document.fonts.ready.then(() => paintPathTrail());
}

window.__DUOJAZZ__ = {
  version: APP_VERSION,
  selectTab,
  getNav: () => nav,
  getPrefs: () => prefs,
  getSession: () => session,
  lastEngraveMs: () => lastEngraveMs,
  transport,
  sampleStatus: () => transport.sampleStatus,
  measureNotation: () => measureEngraving(els.notation),
  openSetup,
  startFromSetup,
  createAndShow(options = {}) {
    halt();
    const lessonId = options.lessonId ?? "learn-lick";
    const planned = sessionCreateArgs(lessonId, prefs, options);
    applySession(createSession({
      instrumentId: prefs.instrumentId,
      swing: prefs.swing,
      metronome: prefs.metronome,
      guideTones: prefs.guideTones,
      tempo: lessonTempo(prefs, lessonId),
      passedKeys: lessonPassedKeys(mastery, planned.lessonId),
      ...options,
      ...planned,
    }));
    return session;
  },
  jumpToCard(cardId) {
    if (!session) return null;
    halt();
    applySession(jumpToCard(session, cardId));
    return session;
  },
  jumpToWrapup() {
    if (!session) return null;
    halt();
    applySession(jumpToWrapup(session));
    return session;
  },
  completeCard(result) {
    if (!session) return null;
    halt();
    applySession(completeCard(session, result));
    return session;
  },
  skipCard() {
    if (!session) return null;
    goContinue();
    return session;
  },
  goBack() {
    navigateCard(-1);
    return session;
  },
  goNext() {
    navigateCard(1);
    return session;
  },
  openQuickView,
  requestQuickView,
  setMelodyOctave(register) {
    applyMelodyOctave(register);
    return session;
  },
  continue() {
    goContinue();
    return session;
  },
  resetPitchTake,
  feedPitchTrack(frames) {
    monitor.feed(frames);
    return monitor.observations;
  },
  feedPitchFrames(frames = []) {
    for (const frame of frames) monitor.onFrame(frame);
    return { ended: Boolean(attempt?.ended), phase: rapidPhase, cue };
  },
  getAttemptState: () => ({ phase: rapidPhase, cue, attemptEnded: Boolean(attempt?.ended) }),
  gradeNow() {
    if (!session) return null;
    return gradeSession(session, monitor.observations);
  },
  getMastery: () => mastery,
  setMastery(next) {
    const previous = mastery;
    mastery = normalizeMastery(next);
    saveMastery(mastery);
    enrollFromProgress(mastery, previous);
    render();
    return mastery;
  },
};

if (els.appVersion) els.appVersion.textContent = APP_VERSION;
resolveNotationScale();
applyDeepLink();
renderSetup();
render();
if (new URLSearchParams(location.search).get("sheet") === "modules") {
  openQuickView();
}
whenVerovioReady().then(() => {
  if (session?.screen === "session") renderNotation();
});
void initAccount({
  settings: cloudSettings,
  onSettings: applyAccountSettings,
  onSettingsAccount(id) {
    cloudSettings.activate(id, id ? guestLegacySettings() : {});
    restoreLastRotation();
    if (id) applyAccountSettings();
    else applyGuestSettings();
  },
  onOpenProfile: openSettings,
  getProgress: () => mastery,
  onProgress(next, accountChanged) {
    if (accountChanged) {
      halt();
      session = null;
      masteryPreview = null;
      wrapupBanner = null;
    }
    const previous = accountChanged ? next : mastery;
    mastery = next;
    enrollFromProgress(next, previous);
    render();
  },
});
