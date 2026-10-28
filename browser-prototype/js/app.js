import {
  getKey,
  displayKey,
  phraseSpanBars,
  chorusChords,
  learnChords,
  learnBeatsFor,
  formBeatsFor,
} from "./music.js";
import { INSTRUMENTS, instrumentOrDefault } from "./instruments.js";
import { Transport } from "./audio.js";
import { notationCssWidth, notationLayout, resolveNotationScale } from "./lesson.js";
import { chorusStaffMEI, phraseMEI } from "./mei.js";
import {
  applySoundingHighlight,
  compactChordSymbol,
  fillMusicLabel,
  engraveMei,
  highlightActiveChords,
  measureEngraving,
  soundingIdsAt,
  whenVerovioReady,
} from "./engrave.js?v=111";
import {
  PREFS_KEY,
  MODULE,
  MODULES,
  LESSONS,
  KEY_MODES,
  CARD_SETS,
  TWELVE_KEY_IDS,
  lessonById,
  normalizePrefs,
  defaultPrefs,
  recommendedLessonId,
  createSession,
  currentCard,
  currentKeyId,
  keyOrdinal,
  completeCard,
  handlePlaybackEnded,
  repeatKey,
  advanceKey,
  jumpToCard,
  jumpToWrapup,
  markLessonStarted,
  sessionPresentation,
  sessionAudioConfig,
  sessionPrimaryAction,
  wrapupCopy,
  listenStateCopy,
  displayKeyName,
  persistLessonMelodyRegister,
  setMelodyRegister,
  skipCard,
  sessionSlot,
  moduleRoadNodes,
  modulesSheetData,
  moduleById,
  lessonSleeve,
  vinylTier,
  sleeveCaption,
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
  persistLessonTempo,
  wrapupNextModule,
  homeNextModule,
  moduleStudyMode,
  setModuleStudyMode,
  STUDY_MODES,
  settingsSummaryShort,
  setInstrument,
  cardLabel,
  sessionEngraveSpec,
  sessionModeHeading,
  sessionScreenTitle,
  LEGACY_PREFS_KEY,
} from "./session.js?v=111";
import {
  tuneById,
  licksInTune,
  tunesForLick,
  learnLessonIdForLick,
  tunePlayLessonId,
} from "./tunes.js";
import { parseTabState, tabSearch } from "./tabs.js";
import { chartTuneList, chartGrid, chartKeyChoices, licksForTune } from "./charts.js";
import { lickById } from "./registry.js";
import { GRADED_CARDS, expectedNotesFor, finishCard, gradeSession, hasPitchTake } from "./grade.js";
import { createFollower, debugTextForKey, describeAttempt, formatLiveLine, stepFollower, tickFollower } from "./follow.js?v=111";
import {
  CHECK_MS,
  RETRY_MS,
  afterFail,
  afterPass,
  isLastRapidKey,
  rapidFireButton,
  rapidMicStep,
  shouldRecordMastery,
} from "./rapid.js?v=111";
import {
  emptyMastery,
  displayMedal,
  homeMedalMark,
  loadMastery,
  saveMastery,
  recordQuizPass,
  recordLearnPass,
  moduleRingMarks,
  lessonPassedKeys,
  normalizeMastery,
  moduleMastery,
} from "./medals.js";
import { PitchMonitor, micCopy } from "./pitch.js?v=111";
import {
  blobToBase64,
  buildTakeRecord,
  closeTakeRecorder,
  createTakeLog,
  deliverTake,
  openTakeRecorder,
  pushTakeFrame,
} from "./take-dump.js?v=111";
import { sleeveTrailPath } from "./path-trail.js";

const transport = new Transport();
const monitor = new PitchMonitor();
const playback = { playing: false, paused: false, ended: false };
let prefs = loadPrefs();
let mastery = loadMastery();
let setupLessonId = recommendedLessonId(keysByLesson(mastery)) ?? LESSONS[0].id;
let setupDraft = { ...prefs.lessons[setupLessonId] };
let session = null;
let lastNotationLayout = null;
let lastPlayheadSystem = null;
let lastTimemap = [];
let lastChordTimings = [];
let audioError = "";
let audioNotice = "";
let samplesLoading = false;
let startGen = 0;
let notationGen = 0;
let lastEngraveMs = 0;
let wrapupBanner = null;
let liveGrade = null;
let lastSessionSlot = "";
let cue = null;
let rapidPhase = "idle";
let attempt = null;
let attemptTimer = null;
let feedbackTimer = null;
let finishing = false;
let sessionShot = null;
let lastDebug = null;
let takeLog = null;
let lastTake = null;
let sealToken = 0;
let liveAt = 0;
const debugOn = new URLSearchParams(location.search).get("debug") === "1";
let selectedModuleId = MODULES[0]?.id ?? "cmar";
let nav = parseTabState(typeof location === "undefined" ? "" : location.search);
let lastChartTune = nav.tune;
let chartConcertKeyId = null;
const tabScroll = { licks: 0, charts: 0, settings: 0 };

const els = {
  shell: document.getElementById("app-shell"),
  masthead: document.getElementById("masthead"),
  home: document.getElementById("screen-home"),
  charts: document.getElementById("screen-charts"),
  settingsScreen: document.getElementById("screen-settings"),
  session: document.getElementById("screen-session"),
  wrapup: document.getElementById("screen-wrapup"),
  tabBar: document.getElementById("app-tab-bar"),
  homeSummary: document.getElementById("home-summary"),
  homeMode: document.getElementById("home-mode"),
  chartsList: document.getElementById("charts-list"),
  chartDetail: document.getElementById("chart-detail"),
  chartBack: document.getElementById("chart-back"),
  chartHeadingTitle: document.getElementById("chart-heading-title"),
  chartHeadingMeta: document.getElementById("chart-heading-meta"),
  chartKeys: document.getElementById("chart-keys"),
  chartGrid: document.getElementById("chart-grid"),
  chartLicksList: document.getElementById("chart-licks-list"),
  lessonList: document.getElementById("lesson-list"),
  instrumentList: document.getElementById("instrument-list"),
  settings: document.getElementById("screen-settings"),
  setup: document.getElementById("setup"),
  setupTitle: document.getElementById("setup-title"),
  setupSummary: document.getElementById("setup-summary"),
  settingsSummary: document.getElementById("home-summary"),
  settingsSummaryBtn: document.getElementById("home-summary"),
  settingsForm: document.getElementById("settings-form"),
  nextModule: document.getElementById("next-module"),
  quickViewBtn: document.getElementById("quick-view-btn"),
  quickViewTitle: document.getElementById("quick-view-title"),
  sessionTitle: document.getElementById("session-title"),
  primaryCount: document.getElementById("primary-count"),
  keyModes: document.getElementById("key-modes"),
  setupKeys: document.getElementById("setup-keys"),
  cardSets: document.getElementById("card-sets"),
  sessionOctave: document.getElementById("session-octave"),
  headphonesTip: document.getElementById("headphones-tip"),
  headphonesDismiss: document.getElementById("headphones-dismiss"),
  primaryLabel: document.getElementById("primary-label"),
  tempoReadout: document.getElementById("tempo-readout"),
  tempoDown: document.getElementById("tempo-down"),
  tempoUp: document.getElementById("tempo-up"),
  setupLinks: document.getElementById("setup-links"),
  startLesson: document.getElementById("start-lesson"),
  sessionExit: document.getElementById("session-exit"),
  sessionBack: document.getElementById("session-back"),
  sessionNext: document.getElementById("session-next"),
  sessionQuickView: document.getElementById("session-quick-view"),
  quickView: document.getElementById("quick-view"),
  quickViewList: document.getElementById("quick-view-list"),
  leaveConfirm: document.getElementById("leave-confirm"),
  sessionKey: document.getElementById("session-key"),
  sessionKeyCount: document.getElementById("session-key-count"),
  sessionProgressFill: document.getElementById("session-progress-fill"),
  cardBadge: document.getElementById("card-badge"),
  sessionMode: document.getElementById("session-mode"),
  hearIt: document.getElementById("hear-it"),
  notation: document.getElementById("notation"),
  hiddenAnswer: document.getElementById("hidden-answer"),
  listenState: document.getElementById("listen-state"),
  listenKicker: document.getElementById("listen-kicker"),
  listenDetail: document.getElementById("listen-detail"),
  chartTitle: document.getElementById("chart-title"),
  chartMeta: document.getElementById("chart-meta"),
  primary: document.getElementById("primary"),
  continueBtn: document.getElementById("continue-btn"),
  instruction: document.getElementById("instruction"),
  meter: document.getElementById("meter"),
  gradeLine: document.getElementById("grade-line"),
  debugStrip: document.getElementById("debug-strip"),
  debugLive: document.getElementById("debug-live"),
  debugAttempt: document.getElementById("debug-attempt"),
  saveTake: document.getElementById("save-take"),
  autoToggle: document.getElementById("auto-toggle"),
  sessionMic: document.getElementById("session-mic"),
  medalMark: document.getElementById("medal-mark"),
  medalNote: document.getElementById("medal-note"),
  wrapupKicker: document.getElementById("wrapup-kicker"),
  wrapupHeading: document.getElementById("wrapup-heading"),
  wrapupDetail: document.getElementById("wrapup-detail"),
  wrapupMedalMark: document.getElementById("wrapup-medal-mark"),
  wrapupMedal: document.getElementById("wrapup-medal"),
  wrapupSleeve: document.getElementById("wrapup-sleeve"),
  wrapupSleeveNum: document.getElementById("wrapup-sleeve-num"),
  wrapupSleeveTitle: document.getElementById("wrapup-sleeve-title"),
  resultList: document.getElementById("result-list"),
  micStatus: document.getElementById("mic-status"),
  nextKey: document.getElementById("next-key"),
  againKey: document.getElementById("again-key"),
  doneSession: document.getElementById("done-session"),
  swing: document.getElementById("swing"),
  guideTones: document.getElementById("guideTones"),
  metronome: document.getElementById("metronome"),
};

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY) ?? localStorage.getItem(LEGACY_PREFS_KEY) ?? "null";
    return normalizePrefs(JSON.parse(raw));
  } catch {
    return defaultPrefs();
  }
}

function persist() {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

function clearRapidTimers() {
  if (attemptTimer) window.clearInterval(attemptTimer);
  if (feedbackTimer) window.clearTimeout(feedbackTimer);
  attemptTimer = null;
  feedbackTimer = null;
}

function halt() {
  startGen += 1;
  finishing = false;
  samplesLoading = false;
  clearRapidTimers();
  rapidPhase = "idle";
  if (debugOn && takeLog && !takeLog.recordSealed && attempt && takeLog.frames.length) {
    sealTake(takeLog, attempt);
  } else {
    closeTakeRecorder(takeLog);
  }
  attempt = null;
  monitor.holdSignal = false;
  monitor.onFrame = () => {};
  transport.stop();
  monitor.stop();
  playback.playing = false;
  playback.paused = false;
  playback.ended = false;
  audioError = "";
  if (els.primary) els.primary.disabled = false;
}

function releaseMic(reason) {
  if (rapidMicStep(monitor.isLive(), reason) !== "release") return;
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
  cue = null;
  renderCue();
  renderPrimary();
}

function clearGradeLine() {
  liveGrade = null;
  if (cue || sessionShot === "check" || sessionShot === "retry") return;
  if (!els.gradeLine) return;
  els.gradeLine.hidden = true;
  delete els.gradeLine.dataset.kind;
  const main = document.getElementById("grade-main");
  const hint = document.getElementById("grade-hint");
  if (main) main.textContent = "";
  if (hint) {
    hint.hidden = true;
    hint.textContent = "";
  }
}

function shownKeyForSession() {
  if (!session) return null;
  return displayKey(getKey(currentKeyId(session)), session.displayMode, sessionKeyQuality(session));
}

function visualPhase() {
  if (sessionShot === "listening" || sessionShot === "check" || sessionShot === "retry" || sessionShot === "idle") {
    return sessionShot === "idle" ? "idle" : sessionShot;
  }
  return rapidPhase;
}

function currentCue() {
  if (sessionShot === "check") return { kind: "check" };
  if (sessionShot === "retry") return { kind: "retry", hint: "3rd note" };
  return cue;
}

function renderCue() {
  const line = els.gradeLine;
  if (!line) return;
  const current = currentCue();
  const main = document.getElementById("grade-main");
  const hint = document.getElementById("grade-hint");
  if (!current) {
    if (liveGrade?.graded) return;
    line.hidden = true;
    delete line.dataset.kind;
    line.removeAttribute("aria-label");
    return;
  }
  line.hidden = false;
  line.dataset.kind = current.kind;
  if (main) main.textContent = current.kind === "check" ? "✓" : "Try again";
  if (hint) {
    hint.hidden = !current.hint;
    hint.textContent = current.hint ?? "";
  }
  line.setAttribute("aria-label", current.kind === "check" ? "Pass" : `Try again. ${current.hint ?? ""}`.trim());
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
    createFollower(expectedNotesFor(session).map((note) => note.midi)),
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
  els.autoToggle.setAttribute("aria-pressed", String(on));
  els.autoToggle.textContent = "Auto";
}

function recordRapidPass() {
  if (!session) return;
  const keyId = currentKeyId(session);
  if (shouldRecordMastery(session, true)) {
    wrapupBanner = recordQuizPass(mastery, session.lessonId, keyId);
    mastery = wrapupBanner;
  } else {
    mastery = recordLearnPass(mastery, session.lessonId, keyId);
    wrapupBanner = mastery;
  }
  saveMastery(mastery);
}

function finishRapid(generation, result) {
  if (generation !== startGen || finishing || rapidPhase !== "listening") return;
  finishing = true;
  rapidPhase = "settling";
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
    rapidPhase = "check";
    cue = { kind: "check" };
    renderCue();
    renderPrimary();
    feedbackTimer = window.setTimeout(() => {
      if (token !== startGen) return;
      finishing = false;
      cue = null;
      rapidPhase = "idle";
      if (!session) return;
      const next = afterPass(session, { auto });
      applySession(next.session, { autoStart: false });
      if (next.autoStart && next.session?.screen === "session") beginListening();
    }, CHECK_MS);
    return;
  }
  const failed = afterFail(session, { auto, hint: result.hint ?? "1st note" });
  rapidPhase = "retry";
  cue = { kind: "retry", hint: failed.hint };
  renderCue();
  renderPrimary();
  if (failed.autoStart) {
    feedbackTimer = window.setTimeout(() => {
      if (token !== startGen) return;
      finishing = false;
      cue = null;
      rapidPhase = "idle";
      renderCue();
      if (session?.screen === "session") beginListening();
    }, RETRY_MS);
    return;
  }
  finishing = false;
}

async function beginListening() {
  if (!session || session.screen !== "session" || session.demo) return;
  const generation = startGen + 1;
  startGen = generation;
  finishing = false;
  clearRapidTimers();
  sessionShot = null;
  cue = null;
  audioError = "";
  rapidPhase = "listening";
  attempt = createFollower(expectedNotesFor(session).map((note) => note.midi), performance.now());
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
    if (generation !== startGen) return;
    const step = rapidMicStep(monitor.isLive() && monitor.processing === false, "attempt");
    if (step === "reset") monitor.reset();
    else await monitor.start(transport.ctx, { processing: false });
    if (generation !== startGen) return;
    if (debugOn) await armDebugTake();
    if (generation !== startGen) return;
    if (monitor.state === "denied" || monitor.state === "unsupported") {
      rapidPhase = "idle";
      attempt = null;
      monitor.holdSignal = false;
      renderPrimary();
      renderMic();
      return;
    }
    attemptTimer = window.setInterval(() => {
      if (generation !== startGen || rapidPhase !== "listening" || !attempt || attempt.ended) return;
      attempt = tickFollower(attempt, performance.now());
      renderDebug();
      if (attempt?.ended) finishRapid(generation, attempt);
    }, 50);
  } catch {
    if (generation !== startGen) return;
    audioError = "Microphone failed to start.";
    rapidPhase = "idle";
    attempt = null;
    monitor.holdSignal = false;
    renderMeter();
    renderPrimary();
  }
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
  if (els.micStatus) els.micStatus.textContent = copy;
  fillListenState();
}

monitor.onState = () => renderMic();
monitor.beatClock = () => transport.snapshot().beats;

function screenName() {
  if (session?.screen === "session") return "session";
  if (session?.screen === "wrapup") return "wrapup";
  return "home";
}

function openSettings() {
  selectTab("settings");
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

function selectTab(tab, { tune = undefined, replace = false } = {}) {
  saveTabScroll();
  if (tab === "charts") {
    if (tune !== undefined) lastChartTune = tune;
    if (!lastChartTune) chartConcertKeyId = null;
    nav = { tab: "charts", tune: lastChartTune };
  } else {
    nav = { tab, tune: null };
  }
  writeTabUrl(replace);
  render();
  restoreTabScroll();
}

function syncTabButtons() {
  els.tabBar?.querySelectorAll(".app-tab").forEach((btn) => {
    btn.setAttribute("aria-current", btn.dataset.tab === nav.tab ? "page" : "false");
  });
}

function startLesson(lessonId) {
  const lesson = lessonById(lessonId);
  selectedModuleId = moduleForLesson(lesson.id)?.id ?? selectedModuleId;
  setupLessonId = lesson.id;
  const fallback = defaultLessonStartKey(lesson);
  halt();
  prefs = markLessonStarted(prefs, lesson.id, prefs.startKeyId ?? fallback);
  persist();
  applySession(createSession({
    lessonId: lesson.id,
    keyMode: prefs.keyMode,
    startKeyId: prefs.startKeyId || fallback,
    cardSet: prefs.cardSet,
    studyMode: moduleStudyMode(prefs, moduleForLesson(lesson.id).id),
    tempo: prefs.tempo,
    melodyRegister: prefs.lessons[lesson.id]?.melodyRegister ?? 0,
    instrumentId: prefs.instrumentId,
    swing: prefs.swing,
    metronome: prefs.metronome,
    guideTones: prefs.guideTones,
  }));
}

function defaultLessonStartKey(lesson) {
  return lesson?.defaultKeyId ?? prefs.startKeyId;
}

function openSetup(lessonId) {
  startLesson(lessonId);
}

function renderQuickView() {
  if (!els.quickViewList) return;
  if (els.quickViewTitle) els.quickViewTitle.textContent = "Modules";
  const mastered = Object.fromEntries(
    MODULES.map((module) => [module.id, moduleMastery(mastery, module.id).masteredKeys]),
  );
  const modules = modulesSheetData(keysByLesson(), mastered);
  els.quickViewList.replaceChildren(
    ...modules.map((module) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "module-sheet-row";
      btn.dataset.testid = `quick-view-module-${module.id}`;
      btn.setAttribute("aria-current", module.id === currentHomeModuleId() ? "page" : "false");
      const num = document.createElement("span");
      num.className = "module-sheet-num";
      num.textContent = String(module.number);
      const copy = document.createElement("span");
      copy.className = "module-sheet-copy";
      copy.innerHTML = `<span class="module-sheet-name">${module.lickName}</span><span class="module-sheet-meta">${module.keysMastered} of 12 keys mastered</span>`;
      const ring = masteryRing(moduleRingMarks(mastery, module.id));
      btn.append(num, copy, ring);
      btn.addEventListener("click", () => jumpFromQuickView(module.id));
      return btn;
    }),
  );
}

function openQuickView() {
  renderQuickView();
  if (els.quickView && !els.quickView.open) els.quickView.showModal();
}

function closeQuickView() {
  if (els.quickView?.open) els.quickView.close();
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

function selectModule(id) {
  const next = MODULES.some((module) => module.id === id) ? id : MODULES[0]?.id;
  selectedModuleId = next;
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

function closeSetup() {
  if (els.setup?.open) els.setup.close();
}

function startFromSetup() {
  startLesson(setupLessonId);
}

function exitSession() {
  releaseMic("leave");
  resetPitchTake();
  lastSessionSlot = "";
  session = null;
  render();
}

function applySession(next, { autoStart = false } = {}) {
  const slot = sessionSlot(next);
  if (slot !== lastSessionSlot) resetPitchTake();
  lastSessionSlot = slot;
  session = next;
  persist();
  render();
  if (autoStart && session?.screen === "session") start(false);
}

async function start(resume = false) {
  if (!session || session.screen !== "session") return;
  if (!session.demo) return beginListening();
  const generation = startGen + 1;
  startGen = generation;
  els.primary.disabled = true;
  audioError = "";
  if (!resume) resetPitchTake();
  const sampleSet = instrumentOrDefault(session.instrumentId).sampleSet;
  samplesLoading = !resume && !(transport.library?.backingReady && transport.library.hasMelody(sampleSet));
  if (samplesLoading) renderPrimary();
  try {
    await transport.ensure();
    if (generation !== startGen) return;
    const prepared = await transport.prepareBacking({
      sampleSet,
      onProgress: () => {
        if (generation === startGen) renderPrimary();
      },
    });
    if (generation !== startGen) return;
    audioNotice = prepared.status === "fallback" ? (prepared.notice ?? "") : "";
    samplesLoading = false;
    if (shouldListen() && !resume) {
      monitor.beatClock = () => transport.snapshot().beats;
      await monitor.start(transport.ctx);
    }
    if (generation !== startGen) return;
    await transport.start(sessionAudioConfig(session), { resume });
  } catch {
    if (generation !== startGen) return;
    audioError = "Audio failed to load.";
    renderMeter();
  } finally {
    if (generation === startGen) {
      samplesLoading = false;
      els.primary.disabled = false;
      renderPrimary();
      renderMeter();
    }
  }
}

function runPrimary() {
  if (!session || session.screen !== "session") return;
  if (sessionShot) {
    sessionShot = null;
    cue = null;
    rapidPhase = "idle";
    renderCue();
    renderPrimary();
    return;
  }
  if (session.demo && (playback.playing || playback.paused)) {
    const action = sessionPrimaryAction(session, playback);
    if (action.id === "pause") halt();
    else if (action.id === "resume") start(true);
    return;
  }
  if (rapidPhase === "check" || rapidPhase === "settling") return;
  if (rapidPhase === "listening") {
    sessionShot = null;
    releaseMic("pause");
    return;
  }
  beginListening();
}

function recordPassIfNeeded(result) {
  if (!result?.passed || !session) return;
  const keyId = currentKeyId(session);
  wrapupBanner = session.studyMode === "practice"
    ? recordQuizPass(mastery, session.lessonId, keyId)
    : recordLearnPass(mastery, session.lessonId, keyId);
  mastery = wrapupBanner;
  saveMastery(mastery);
}

function gradeCurrentCard() {
  const result = finishCard(session, monitor.observations);
  recordPassIfNeeded(result);
  showGrade(result);
  return result;
}

function goContinue() {
  if (!session || session.screen !== "session") return;
  const result = leaveOutcomeFromTake();
  halt();
  applySession(completeCard(session, result));
}

function leaveOutcomeFromTake() {
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
    || els.leaveConfirm?.open,
  );
}

function keysByLesson(current = mastery) {
  return Object.fromEntries(
    LESSONS.map((lesson) => [lesson.id, lessonPassedKeys(current, lesson.id)]),
  );
}

function moduleBanner(module, stats) {
  const count = stats.masteredKeys.length;
  const medal = count ? stats.medal : "none";
  const section = document.createElement("section");
  section.className = "module-banner";
  section.dataset.testid = `module-banner-${module.id}`;
  const copy = document.createElement("div");
  copy.className = "banner-copy";
  copy.innerHTML = `<p class="banner-kicker">Module ${module.number} · a lick</p><h2>${module.name}</h2><p class="banner-count">${count} of 12 keys mastered</p>`;
  const badge = document.createElement("div");
  badge.className = "medal-badge";
  badge.dataset.medal = medal;
  badge.setAttribute(
    "aria-label",
    count ? `${displayMedal(stats.medal)}, ${count} of 12 keys` : `${count} of 12 keys, no medal yet`,
  );
  const mark = homeMedalMark(count, stats.medal);
  badge.innerHTML = `<span class="medal-count">${count}/12</span><span class="medal-mark"${mark ? "" : " hidden"}>${mark}</span>`;
  section.append(copy, badge);
  return section;
}

function studySwitch(moduleId, mode, onChange, testId = `study-switch-${moduleId}`) {
  const group = document.createElement("div");
  group.className = "study-switch";
  group.dataset.testid = testId;
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", "Learn or Practice");
  for (const item of STUDY_MODES) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "study-switch-btn";
    btn.dataset.mode = item.id;
    btn.textContent = item.label;
    btn.setAttribute("aria-pressed", String(item.id === mode));
    btn.addEventListener("click", () => onChange(item.id));
    group.append(btn);
  }
  return group;
}

function masteryRing(marks) {
  const ring = document.createElement("span");
  ring.className = "mastery-ring segments";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 36 36");
  svg.setAttribute("aria-hidden", "true");
  marks.forEach((mark, index) => {
    const start = -Math.PI / 2 + (index * 2 * Math.PI) / 12 + 0.06;
    const end = start + (2 * Math.PI) / 12 - 0.12;
    const radius = 14;
    const cx = 18;
    const cy = 18;
    const arc = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const x1 = cx + radius * Math.cos(start);
    const y1 = cy + radius * Math.sin(start);
    const x2 = cx + radius * Math.cos(end);
    const y2 = cy + radius * Math.sin(end);
    arc.setAttribute("d", `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`);
    arc.setAttribute("fill", "none");
    arc.setAttribute("stroke-linecap", "butt");
    arc.dataset.mark = mark.mark;
    if (mark.mark === "filled") {
      arc.setAttribute("stroke", "var(--tint)");
      arc.setAttribute("stroke-width", "4");
    } else if (mark.mark === "outline") {
      arc.setAttribute("stroke", "var(--tint)");
      arc.setAttribute("stroke-width", "1.5");
    } else {
      arc.setAttribute("stroke", "var(--fill)");
      arc.setAttribute("stroke-width", "4");
    }
    svg.append(arc);
  });
  const filled = marks.filter((mark) => mark.mark === "filled").length;
  const label = document.createElement("span");
  label.textContent = String(filled);
  ring.append(svg, label);
  ring.setAttribute("aria-label", `${filled} of 12 keys mastered in Practice`);
  return ring;
}

function moduleBlock(module, nodes, stats) {
  const wrap = document.createElement("section");
  wrap.className = "module-block is-current";
  wrap.dataset.module = module.id;
  wrap.append(moduleBanner(module, stats), ...nodes.map((node) => sleeveButton(node)));
  return wrap;
}

function homeNextModuleButton(link) {
  const wrap = document.createElement("div");
  wrap.className = "path-end path-end-next";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "next-module-path";
  btn.dataset.testid = "home-next-module";
  btn.textContent = link.label;
  btn.addEventListener("click", () => {
    if (link.id) selectModule(link.id);
  });
  wrap.append(btn);
  return wrap;
}

function renderHomeMode(module) {
  if (!els.homeMode || !module) return;
  els.homeMode.replaceChildren(studySwitch(module.id, moduleStudyMode(prefs, module.id), (mode) => {
    prefs = setModuleStudyMode(prefs, module.id, mode);
    persist();
    renderHome();
  }));
}

function renderHome() {
  if (!MODULES.some((module) => module.id === selectedModuleId)) {
    selectedModuleId = MODULES[0].id;
  }
  const module = moduleById(selectedModuleId) ?? MODULES[0];
  const keys = keysByLesson(mastery);
  const nodes = moduleRoadNodes(module, prefs, keys);
  renderHomeMode(module);
  els.lessonList.replaceChildren(
    moduleBlock(module, nodes, moduleMastery(mastery, module.id)),
    homeNextModuleButton(homeNextModule(module, keys)),
  );
  requestAnimationFrame(paintPathTrail);
}

function sleeveBoxFromStage(stage, svgRect) {
  const node = stage.closest(".sleeve-node");
  const stageRect = stage.getBoundingClientRect();
  const context = node?.querySelector(".sleeve-context")?.getBoundingClientRect();
  const captionTop = context?.top ?? stageRect.bottom;
  const captionBottom = context?.bottom ?? stageRect.bottom;
  const captionLeft = context?.left ?? stageRect.left;
  const captionRight = context?.right ?? stageRect.right;
  return {
    cx: stageRect.left + stageRect.width / 2 - svgRect.left,
    cy: stageRect.top + stageRect.height / 2 - svgRect.top,
    halfW: stageRect.width / 2,
    halfH: stageRect.height / 2,
    captionTop: captionTop - svgRect.top,
    captionBottom: captionBottom - svgRect.top,
    captionLeft: captionLeft - svgRect.left,
    captionRight: captionRight - svgRect.left,
  };
}

function paintPathTrail() {
  const svg = document.querySelector(".path-trail");
  const path = svg?.querySelector("[data-trail]");
  const cap = svg?.querySelector("[data-trail-cap]");
  if (!svg || !path || !els.lessonList) return;
  const svgRect = svg.getBoundingClientRect();
  if (svgRect.width < 8 || svgRect.height < 8) {
    path.setAttribute("d", "");
    return;
  }
  svg.setAttribute("viewBox", `0 0 ${svgRect.width} ${svgRect.height}`);
  const sleeves = [...els.lessonList.querySelectorAll(".sleeve-node .sleeve-stage")]
    .map((stage) => sleeveBoxFromStage(stage, svgRect));
  const endEl = els.lessonList.querySelector(".path-end-sleeve");
  let end = null;
  if (endEl) {
    const rect = endEl.getBoundingClientRect();
    end = {
      cx: rect.left + rect.width / 2 - svgRect.left,
      cy: rect.top + rect.height / 2 - svgRect.top,
    };
  }
  path.setAttribute("d", sleeveTrailPath(sleeves, end));
  const last = end ?? sleeves.at(-1);
  if (cap && last) {
    cap.setAttribute("cx", String(last.cx));
    cap.setAttribute("cy", String(last.cy));
    cap.setAttribute("r", "8");
  }
}

function sleeveButton(node) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "sleeve-node";
  btn.dataset.testid = `lesson-${node.id}`;
  btn.dataset.sleeve = node.sleeve;
  btn.dataset.align = node.align;
  btn.dataset.recommended = String(node.recommended);
  btn.dataset.complete = String(node.complete);
  btn.dataset.vinylTier = node.vinylTier;
  const bits = [
    `Lesson ${node.number}: ${node.title}`,
    `${node.passedCount} of 12 keys passed`,
    `${node.vinylTier} vinyl`,
  ];
  if (node.recommended) bits.push("recommended start");
  if (node.complete) bits.push("all keys passed");
  btn.setAttribute("aria-label", bits.join(". "));

  if (node.recommended) {
    const tag = document.createElement("span");
    tag.className = "start-tag";
    tag.textContent = "Start";
    btn.append(tag);
  }

  const stage = document.createElement("span");
  stage.className = "sleeve-stage";
  stage.innerHTML = `<span class="vinyl" data-tier="${node.vinylTier}" aria-hidden="true"><span class="vinyl-label"></span></span><span class="sleeve"><span class="sleeve-deco" aria-hidden="true"></span><span class="sleeve-num">${node.number}</span><span class="sleeve-title">${node.coverTitle}</span></span>`;
  btn.append(stage);

  const context = document.createElement("span");
  context.className = "sleeve-context";
  fillMusicLabel(context, node.caption ?? sleeveCaption(node.context, node.passedCount));
  btn.append(context);

  btn.addEventListener("click", () => openSetup(node.id));
  return btn;
}

function chipRow(host, options, current, onPick) {
  host.replaceChildren(
    ...options.map((option) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      fillMusicLabel(btn, option.label);
      btn.setAttribute("aria-pressed", String(option.id === current));
      btn.addEventListener("click", () => onPick(option.id));
      return btn;
    }),
  );
}

function renderSetup() {
  renderSettings();
}

function renderSettings() {
  const summary = settingsSummaryShort(prefs);
  if (els.homeSummary) els.homeSummary.textContent = summary;
  if (els.settingsSummary) els.settingsSummary.textContent = summary;
  chipRow(els.keyModes, KEY_MODES, prefs.keyMode, (id) => {
    prefs.keyMode = id;
    persist();
    renderSettings();
  });
  if (!els.setupKeys) return;
  els.setupKeys.replaceChildren(
    ...TWELVE_KEY_IDS.map((id) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "key-btn";
      fillMusicLabel(btn, displayKey(getKey(id), prefs.displayMode, "minor").shortName);
      btn.setAttribute("aria-pressed", String(id === prefs.startKeyId));
      btn.addEventListener("click", () => {
        prefs.startKeyId = id;
        persist();
        renderSettings();
      });
      return btn;
    }),
  );
  chipRow(els.cardSets, CARD_SETS, prefs.cardSet, (id) => {
    prefs.cardSet = id;
    persist();
    renderSettings();
  });
  if (els.tempoReadout) els.tempoReadout.textContent = String(prefs.tempo);
}

function renderSetupLinks(lesson) {
  const host = els.setupLinks;
  if (!host) return;
  host.replaceChildren();
  if (lesson.kind === "learn") {
    const tunes = tunesForLick(lesson.moduleId === "cmar" ? "cmar" : lesson.moduleId);
    if (!tunes.length) {
      host.hidden = true;
      return;
    }
    host.hidden = false;
    const heading = document.createElement("p");
    heading.className = "setup-links-heading";
    heading.textContent = "In your tunes";
    host.append(heading);
    for (const tune of tunes) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "setup-link";
      btn.dataset.testid = `setup-link-tune-${tune.id}`;
      btn.textContent = tune.title;
      btn.addEventListener("click", () => openSetup(tunePlayLessonId(tune.id)));
      host.append(btn);
    }
    return;
  }
  if (lesson.tuneId) {
    const tune = tuneById(lesson.tuneId);
    const lickIds = licksInTune(tune);
    if (!lickIds.length) {
      host.hidden = true;
      return;
    }
    host.hidden = false;
    const heading = document.createElement("p");
    heading.className = "setup-links-heading";
    heading.textContent = "Licks in this tune";
    host.append(heading);
    for (const lickId of lickIds) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "setup-link";
      btn.dataset.testid = `setup-link-lick-${lickId}`;
      btn.textContent = lickById(lickId).name;
      btn.addEventListener("click", () => openSetup(learnLessonIdForLick(lickId)));
      host.append(btn);
    }
    return;
  }
  host.hidden = true;
}

function renderSessionOctave() {
  if (!els.sessionOctave || !session) return;
  const current = session.melodyRegister;
  const down = document.createElement("button");
  down.type = "button";
  down.className = "chip";
  down.textContent = "−";
  down.setAttribute("aria-label", "Octave down");
  down.disabled = current <= -1;
  down.addEventListener("click", () => applyMelodyOctave(current - 1));
  const up = document.createElement("button");
  up.type = "button";
  up.className = "chip";
  up.textContent = "+";
  up.setAttribute("aria-label", "Octave up");
  up.disabled = current >= 1;
  up.addEventListener("click", () => applyMelodyOctave(current + 1));
  const label = document.createElement("span");
  label.className = "octave-label";
  label.textContent = "Octave";
  els.sessionOctave.replaceChildren(down, label, up);
}

function applyMelodyOctave(register) {
  if (!session || session.screen !== "session") return;
  const melodyRegister = register <= -1 ? -1 : register >= 1 ? 1 : 0;
  if (melodyRegister === session.melodyRegister) return;
  const restart = playback.playing || playback.paused || rapidPhase === "listening";
  halt();
  resetPitchTake();
  session = setMelodyRegister(session, melodyRegister);
  prefs = persistLessonMelodyRegister(prefs, session.lessonId, melodyRegister);
  persist();
  render();
  if (restart) start(false);
}

function renderSessionChrome() {
  const ordinal = keyOrdinal(session);
  els.shell.dataset.sleeve = lessonSleeve(session.lessonId);
  if (els.cardBadge) els.cardBadge.textContent = sessionModeHeading(session);
  if (els.sessionTitle) els.sessionTitle.textContent = sessionScreenTitle(session);
  fillMusicLabel(
    els.sessionKey,
    displayKeyName(currentKeyId(session), session.displayMode, sessionKeyQuality(session)),
  );
  if (els.sessionKeyCount) els.sessionKeyCount.textContent = `Key ${ordinal.index} of ${ordinal.total}`;
}

function chordTimingsFor(target) {
  if (!target) return [];
  const lesson = lessonById(target.lessonId);
  const concertKey = getKey(currentKeyId(target));
  const isolated = lesson.kind === "learn";
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

function staffWidth() {
  return Math.max(320, Math.min(980, els.notation.clientWidth || 760));
}

function notationRoot(svg) {
  return svg.querySelector("[data-staff-fit]") ?? svg;
}

function updatePlayhead(snap = transport.snapshot()) {
  const svg = els.notation.querySelector("svg");
  if (!svg || !session) return;
  const active = (snap.playing || snap.paused) && !snap.inCountIn;
  if (!active) {
    applySoundingHighlight(svg, []);
    lastPlayheadSystem = null;
    return;
  }
  const beats = Math.max(0, snap.beats ?? 0);
  applySoundingHighlight(svg, soundingIdsAt(lastTimemap, beats));
  highlightActiveChords(svg, beats, lastChordTimings);
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

function fitNotationInView() {
  const svg = els.notation?.querySelector("svg");
  const body = els.session?.querySelector(".session-body");
  const stage = body?.querySelector(".session-stage");
  if (!svg || !body || !stage || els.notation.hidden) return;
  svg.style.setProperty("width", "100%", "important");
  svg.style.setProperty("max-width", "100%", "important");
  svg.style.setProperty("height", "auto", "important");
  svg.style.setProperty("margin-inline", "auto", "important");
  const style = getComputedStyle(body);
  const pad = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
  const card = stage.querySelector(".chart-card");
  let reserved = pad + 8;
  for (const el of stage.children) {
    if (el === card || el.hidden) continue;
    const elStyle = getComputedStyle(el);
    reserved += el.offsetHeight
      + (parseFloat(elStyle.marginTop) || 0)
      + (parseFloat(elStyle.marginBottom) || 0);
  }
  const wrap = els.notation.parentElement;
  const wrapStyle = wrap ? getComputedStyle(wrap) : null;
  const wrapPad = wrapStyle
    ? (parseFloat(wrapStyle.paddingTop) || 0) + (parseFloat(wrapStyle.paddingBottom) || 0)
    : 0;
  const available = body.clientHeight - reserved - wrapPad;
  const box = svg.getBoundingClientRect();
  const next = notationCssWidth(box.width, box.height, available);
  if (next > 0 && next < box.width - 1) {
    svg.style.setProperty("width", `${Math.round(next)}px`, "important");
  }
}

function renderNotation() {
  if (!session || session.screen !== "session") return;
  const view = sessionPresentation(session);
  const lesson = lessonById(session.lessonId);
  const hideStaff = Boolean(view.hideStaff);
  els.hiddenAnswer.hidden = !hideStaff;
  els.hiddenAnswer.textContent = currentCard(session) === "quiz" ? "From memory" : "Use your ears";
  fillListenState();
  els.notation.hidden = hideStaff;
  els.session.dataset.card = currentCard(session);
  const spec = sessionEngraveSpec(session);
  els.notation.classList.toggle("slash", Boolean(view.showSlashNotation && !view.showLandingNotation));
  els.notation.classList.toggle("notation-memory", spec.memory);
  lastTimemap = [];
  lastChordTimings = chordTimingsFor(session);
  if (hideStaff) {
    notationGen += 1;
    els.notation.replaceChildren();
    lastPlayheadSystem = null;
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
  lastNotationLayout = {
    ...layout,
    phraseStartBar: view.application?.phraseStartBar ?? 7,
    phraseBars: phraseSpanBars(lesson.applicationId),
  };
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
  const gen = notationGen += 1;
  whenVerovioReady().then(() => {
    if (gen !== notationGen || !session || session.screen !== "session") return;
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
    fitNotationInView();
    updatePlayhead();
  }).catch(() => {
    if (gen !== notationGen) return;
    els.notation.replaceChildren();
  });
}

function renderInstruments() {
  if (!els.instrumentList) return;
  const current = instrumentOrDefault(prefs.instrumentId).id;
  els.instrumentList.replaceChildren(
    ...INSTRUMENTS.map((instrument) => {
      const label = document.createElement("label");
      label.className = "group-row instrument-row";
      const copy = document.createElement("span");
      copy.className = "instrument-copy";
      copy.innerHTML = `<strong>${instrument.label}</strong><small>${instrument.note}</small>`;
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
  const restart = Boolean(session && (playback.playing || playback.paused || rapidPhase === "listening"));
  prefs.instrumentId = instrument.id;
  prefs.displayMode = instrument.id;
  prefs.clef = instrument.clef;
  persist();
  if (session) {
    halt();
    session = setInstrument(session, instrument.id);
  }
  render();
  if (restart) start(false);
}

function renderCopy(snap = transport.snapshot()) {
  const summary = settingsSummaryShort(prefs);
  if (els.homeSummary) els.homeSummary.textContent = summary;
  if (els.settingsSummary) els.settingsSummary.textContent = summary;
  els.swing.checked = prefs.swing;
  els.guideTones.checked = prefs.guideTones;
  els.metronome.checked = prefs.metronome;
  renderInstruments();
}

function renderPrimary(snap = transport.snapshot()) {
  if (!session || session.screen !== "session") return;
  renderAuto();
  const phase = visualPhase();
  if (els.session) els.session.dataset.rapid = phase;
  const demoLive = Boolean(session.demo && (samplesLoading || playback.playing || playback.paused || snap.inCountIn));
  if (!demoLive) {
    const listening = phase === "listening";
    const action = rapidFireButton({ listening });
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
    if (els.primaryLabel) els.primaryLabel.textContent = action.label;
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
    if (els.primaryLabel) els.primaryLabel.textContent = "Loading";
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
    if (els.primaryLabel) els.primaryLabel.textContent = "Count-in";
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
  if (els.primaryLabel) els.primaryLabel.textContent = playing ? "Stop" : (result ? label : action.label);
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

function resultLabel(row) {
  return row.summary ?? (row.outcome === "completed" ? "Completed" : row.outcome);
}

function renderWrapup() {
  const copy = wrapupCopy(session);
  const lesson = lessonById(session.lessonId);
  els.shell.dataset.sleeve = lesson.sleeve;
  if (els.wrapupKicker) els.wrapupKicker.textContent = copy.kicker;
  fillMusicLabel(els.wrapupHeading, copy.heading);
  els.wrapupDetail.textContent = copy.detail;
  if (els.wrapupSleeve) {
    els.wrapupSleeve.hidden = false;
    els.wrapupSleeve.dataset.sleeve = lesson.sleeve;
    els.wrapupSleeve.classList.toggle("is-upgrade", Boolean(wrapupBanner?.upgraded));
    const wrapVinyl = els.wrapupSleeve.querySelector(".vinyl");
    if (wrapVinyl) wrapVinyl.dataset.tier = vinylTier(lessonPassedKeys(mastery, lesson.id).length);
  }
  if (els.wrapupSleeveNum) {
    const module = moduleForLesson(lesson.id);
    els.wrapupSleeveNum.textContent = String(module.lessons.findIndex((item) => item.id === lesson.id) + 1).padStart(2, "0");
  }
  if (els.wrapupSleeveTitle) els.wrapupSleeveTitle.textContent = lesson.coverTitle;
  els.resultList.replaceChildren(
    ...copy.results.map((row) => {
      const item = document.createElement("li");
      item.innerHTML = `<span>${row.label}</span><span class="outcome">${resultLabel(row)}</span>`;
      return item;
    }),
  );
  const moduleStats = moduleMastery(mastery, moduleForLesson(lesson.id).id);
  const count = moduleStats.masteredKeys.length;
  if (els.wrapupMedalMark) {
    els.wrapupMedalMark.textContent = wrapupBanner?.upgraded
      ? `Medal up · ${displayMedal(moduleStats.medal)}`
      : (count ? displayMedal(moduleStats.medal) : "Medal");
  }
  if (els.wrapupMedal) {
    els.wrapupMedal.hidden = false;
    els.wrapupMedal.textContent = wrapupBanner?.upgraded
      ? `${displayMedal(moduleStats.medal)} unlocked`
      : (count ? `${count} of 12 keys mastered` : "No medal yet for this module");
  }
  els.nextKey.hidden = !copy.nextKeyLabel;
  if (copy.nextKeyLabel) fillMusicLabel(els.nextKey, copy.nextKeyLabel);
  const nextModule = wrapupNextModule(session);
  if (els.nextModule) {
    els.nextModule.hidden = !nextModule;
    if (nextModule) els.nextModule.textContent = nextModule.label;
  }
}

function renderChartList() {
  if (!els.chartsList) return;
  els.chartsList.hidden = false;
  if (els.chartDetail) els.chartDetail.hidden = true;
  els.chartsList.replaceChildren(
    ...chartTuneList().map((row) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chart-row";
      btn.dataset.testid = `chart-row-${row.id}`;
      const title = document.createElement("span");
      title.className = "chart-row-title";
      title.textContent = row.title;
      const key = document.createElement("span");
      key.className = "chart-row-key";
      fillMusicLabel(key, row.key);
      const meta = document.createElement("span");
      meta.className = "chart-row-meta";
      meta.textContent = `${row.composer} · ${row.style}`;
      btn.append(title, key, meta);
      btn.addEventListener("click", () => selectTab("charts", { tune: row.id }));
      return btn;
    }),
  );
}

function renderChartDetail() {
  const tune = tuneById(nav.tune);
  if (!tune || !els.chartDetail) {
    renderChartList();
    return;
  }
  if (els.chartsList) els.chartsList.hidden = true;
  els.chartDetail.hidden = false;
  if (!chartConcertKeyId) chartConcertKeyId = tune.key;
  const grid = chartGrid(tune, {
    instrumentId: prefs.instrumentId,
    concertKeyId: chartConcertKeyId,
  });
  if (els.chartHeadingTitle) els.chartHeadingTitle.textContent = grid.title;
  if (els.chartHeadingMeta) {
    fillMusicLabel(els.chartHeadingMeta, `${grid.composer} · ${grid.style} · ${grid.writtenKeyName}`);
  }
  if (els.chartKeys) {
    chipRow(els.chartKeys, chartKeyChoices(
      tune.keyQuality === "major" ? "major" : "minor",
      prefs.instrumentId,
    ), chartConcertKeyId, (id) => {
      chartConcertKeyId = id;
      renderChartDetail();
    });
  }
  if (els.chartGrid) {
    els.chartGrid.replaceChildren(
      ...grid.rows.map((row) => {
        const line = document.createElement("div");
        line.className = "ireal-row";
        for (const bar of row.bars) {
          const cell = document.createElement("div");
          cell.className = "ireal-bar";
          if (bar.sectionLabel) {
            const mark = document.createElement("span");
            mark.className = "ireal-section";
            mark.textContent = bar.sectionLabel;
            cell.append(mark);
          }
          if (bar.repeatStart) {
            const mark = document.createElement("span");
            mark.className = "ireal-repeat start";
            mark.textContent = "|:";
            cell.append(mark);
          }
          if (bar.repeatEnd) {
            const mark = document.createElement("span");
            mark.className = "ireal-repeat end";
            mark.textContent = ":|";
            cell.append(mark);
          }
          const chords = document.createElement("div");
          chords.className = "ireal-chords";
          for (const chord of bar.chords) {
            const symbol = document.createElement("span");
            symbol.className = "chord-symbol";
            fillMusicLabel(symbol, compactChordSymbol(chord.name));
            chords.append(symbol);
          }
          cell.append(chords);
          line.append(cell);
        }
        return line;
      }),
    );
  }
  if (els.chartLicksList) {
    const rows = licksForTune(tune.id);
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "help";
      empty.textContent = "No tune lessons for this chart yet.";
      els.chartLicksList.replaceChildren(empty);
    } else {
      els.chartLicksList.replaceChildren(
        ...rows.map((row) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "chart-lick-row";
          btn.dataset.testid = `chart-lick-${row.lessonId}`;
          btn.innerHTML = `<strong>${row.label}</strong><span>${row.detail}</span>`;
          btn.addEventListener("click", () => startLesson(row.lessonId));
          return btn;
        }),
      );
    }
  }
}

function renderCharts() {
  if (nav.tune && tuneById(nav.tune)) renderChartDetail();
  else renderChartList();
}

function render(snap = transport.snapshot()) {
  const screen = screenName();
  els.shell.dataset.screen = screen;
  els.shell.dataset.tab = nav.tab;
  if (screen === "home") delete els.shell.dataset.sleeve;
  const onLicks = screen === "home" && nav.tab === "licks";
  const onCharts = screen === "home" && nav.tab === "charts";
  const onSettings = screen === "home" && nav.tab === "settings";
  els.home.hidden = !onLicks;
  if (els.charts) els.charts.hidden = !onCharts;
  if (els.settingsScreen) els.settingsScreen.hidden = !onSettings;
  els.home.setAttribute("aria-hidden", String(!onLicks));
  els.session.setAttribute("aria-hidden", String(screen !== "session"));
  els.wrapup.setAttribute("aria-hidden", String(screen !== "wrapup"));
  if (els.charts) els.charts.setAttribute("aria-hidden", String(!onCharts));
  if (els.settingsScreen) els.settingsScreen.setAttribute("aria-hidden", String(!onSettings));
  syncTabButtons();
  const moduleName = session ? moduleForLesson(session.lessonId).name : "DuoJazz";
  document.title = screen === "home" ? "DuoJazz" : `DuoJazz · ${moduleName} session`;
  renderCopy(snap);
  if (onLicks) renderHome();
  if (onCharts) renderCharts();
  if (onSettings || onLicks) renderSettings();
  if (screen === "session") {
    renderSessionChrome();
    renderSessionOctave();
    renderNotation();
    renderPrimary();
    renderMeter(snap);
    renderMic();
    if (!liveGrade && !currentCue()) restoreStoredGrade();
    renderCue();
    renderDebug();
    renderAuto();
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
  const keyMode = params.get("keys") || "fourths";
  const moduleParam = params.get("module");
  if (moduleParam) {
    selectedModuleId = moduleParam;
  }
  if (!screen) {
    writeTabUrl(true);
    return;
  }
  if (params.get("demo") === "grades" || params.get("demo") === "medal") {
    let next = emptyMastery();
    next = recordQuizPass(next, "learn-lick", "G");
    next = recordQuizPass(next, "integrate-minor-home", "G");
    wrapupBanner = next;
    mastery = next;
  }
  if (params.get("demo") === "path") {
    let next = emptyMastery();
    for (const key of ["G", "C", "F", "Bb"]) next = recordQuizPass(next, "learn-lick", key);
    for (const key of ["G", "C"]) next = recordQuizPass(next, "integrate-minor-home", key);
    mastery = next;
    prefs = markLessonStarted(prefs, "learn-lick", "G");
    prefs = markLessonStarted(prefs, "integrate-minor-home", "C");
  }
  const mic = params.get("mic");
  if (mic === "denied" || mic === "no-signal" || mic === "listening" || mic === "unsupported") {
    monitor.setState(mic);
  }
  if (screen === "setup") {
    selectTab("settings", { replace: true });
    return;
  }
  if (screen === "session" || screen === "wrapup") {
    session = createSession({
      lessonId,
      keyMode,
      startKeyId: params.get("key") || prefs.startKeyId,
      cardSet: params.get("cards") || prefs.cardSet,
      tempo: prefs.tempo,
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
      session = {
        ...session,
        cardResults: session.cards.map((cardId) => (
          cardId === "learn"
            ? { cardId, outcome: "completed", graded: false }
            : {
              cardId,
              outcome: "passed",
              graded: true,
              passed: true,
              percent: cardId === "quiz" ? 100 : 83,
              correction: cardId === "play" ? "Bar 1 · 3rd note a little flat" : null,
            }
        )),
      };
    }
    if (screen === "wrapup" && params.get("demo") === "skipped") {
      session = {
        ...session,
        cardResults: session.cards.map((cardId) => (
          cardId === "learn"
            ? { cardId, outcome: "completed" }
            : { cardId, outcome: "skipped", graded: false, passed: false }
        )),
      };
    }
    lastSessionSlot = sessionSlot(session);
    resetPitchTake();
    const shot = params.get("shot");
    sessionShot = shot === "idle" || shot === "listening" || shot === "check" || shot === "retry" ? shot : null;
    if (params.get("auto") === "0") prefs.auto = false;
    if (params.get("auto") === "1") prefs.auto = true;
  }
}

transport.onUpdate = (snap) => {
  playback.playing = snap.playing;
  playback.paused = snap.paused;
  playback.ended = Boolean(snap.ended);
  if (!session || session.screen !== "session") return;
  renderCopy(snap);
  renderPrimary();
  renderMeter(snap);
  updatePlayhead(snap);
};

function showGrade(result) {
  liveGrade = result ?? null;
  fillListenState(result?.graded ? result : null);
  if (cue || sessionShot === "check" || sessionShot === "retry") return;
  if (!els.gradeLine) return;
  const main = document.getElementById("grade-main");
  const hint = document.getElementById("grade-hint");
  if (result?.graded) {
    els.gradeLine.hidden = false;
    els.gradeLine.dataset.kind = "legacy";
    const bits = [`${result.percent}%`, result.passed ? "pass" : "not yet"];
    if (result.correction) bits.push(result.correction);
    if (main) main.textContent = bits.join(" · ");
    if (hint) hint.hidden = true;
    return;
  }
  if (result?.outcome === "skipped") {
    els.gradeLine.hidden = false;
    els.gradeLine.dataset.kind = "legacy";
    if (main) main.textContent = "Skipped";
    if (hint) hint.hidden = true;
    return;
  }
  els.gradeLine.hidden = true;
  delete els.gradeLine.dataset.kind;
  if (main) main.textContent = "";
}

function restoreStoredGrade() {
  if (!session || session.screen !== "session") {
    showGrade(null);
    return;
  }
  if (hasPitchTake(monitor.observations) || playback.playing || playback.paused) return;
  showGrade(resultForCard(session));
}

transport.onEnded = () => {
  playback.playing = false;
  playback.paused = false;
  playback.ended = true;
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
  window.setTimeout(() => applySession(next.session, { autoStart: next.autoStart }), wait);
};

els.homeSummary?.addEventListener("click", () => selectTab("settings"));
els.tabBar?.addEventListener("click", (event) => {
  const btn = event.target.closest?.(".app-tab");
  if (btn?.dataset.tab) selectTab(btn.dataset.tab);
});
els.chartBack?.addEventListener("click", () => selectTab("charts", { tune: null }));
els.settingsForm?.addEventListener("submit", (event) => event.preventDefault());
window.addEventListener("popstate", () => {
  nav = parseTabState(location.search);
  if (nav.tab === "charts") lastChartTune = nav.tune;
  render();
});
els.quickViewBtn?.addEventListener("click", requestQuickView);
els.sessionExit.addEventListener("click", exitSession);
els.leaveConfirm?.addEventListener("close", () => {
  if (els.leaveConfirm.returnValue === "leave") abandonToQuickView();
});
els.primary.addEventListener("click", runPrimary);
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
  prefs.auto = prefs.auto === false;
  persist();
  renderAuto();
});
els.hearIt?.addEventListener("click", () => {
  if (!session || session.screen !== "session") return;
  const held = session.keyIndex;
  releaseMic("hear");
  if (!session) return;
  session = { ...session, keyIndex: held, demo: true };
  render();
  start(false);
});
els.continueBtn.addEventListener("click", goContinue);
els.nextModule?.addEventListener("click", () => {
  if (!session) return;
  const link = wrapupNextModule(session);
  halt();
  if (link?.id) selectedModuleId = link.id;
  exitSession();
});
els.nextKey.addEventListener("click", () => {
  if (!session) return;
  halt();
  applySession(advanceKey(session));
});
els.againKey.addEventListener("click", () => {
  if (!session) return;
  halt();
  applySession(repeatKey(session));
});
els.doneSession.addEventListener("click", exitSession);

els.tempoDown?.addEventListener("click", () => {
  prefs.tempo = Math.max(60, prefs.tempo - 4);
  prefs = persistLessonTempo(prefs, setupLessonId, prefs.tempo);
  persist();
  renderSettings();
});
els.tempoUp?.addEventListener("click", () => {
  prefs.tempo = Math.min(160, prefs.tempo + 4);
  prefs = persistLessonTempo(prefs, setupLessonId, prefs.tempo);
  persist();
  renderSettings();
});

for (const [id, key] of [
  ["swing", "swing"],
  ["guideTones", "guideTones"],
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
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
  if (anyDialogOpen()) {
    if (event.key === "Escape") return;
    return;
  }
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
  if (event.key === "Escape" && session) {
    exitSession();
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

window.addEventListener("resize", () => {
  if (session?.screen === "session") renderNotation();
  else render();
});
window.addEventListener("pagehide", () => releaseMic("hide"));
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") releaseMic("hide");
});

const lessonPath = document.querySelector(".lesson-path");
if (lessonPath && typeof ResizeObserver === "function") {
  new ResizeObserver(() => paintPathTrail()).observe(lessonPath);
}
if (document.fonts?.ready) {
  document.fonts.ready.then(() => paintPathTrail());
}

window.__DUOJAZZ__ = {
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
  createAndShow(options) {
    halt();
    applySession(createSession({
      instrumentId: prefs.instrumentId,
      swing: prefs.swing,
      metronome: prefs.metronome,
      guideTones: prefs.guideTones,
      ...options,
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
    halt();
    applySession(skipCard(session));
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
  gradeNow() {
    if (!session) return null;
    return gradeSession(session, monitor.observations);
  },
  getMastery: () => mastery,
  setMastery(next) {
    mastery = normalizeMastery(next);
    saveMastery(mastery);
    render();
    return mastery;
  },
};

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
