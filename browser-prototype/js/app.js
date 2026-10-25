import {
  getKey,
  minorSpelling,
  phraseMeasureCount,
  phraseSpanBars,
  chorusChords,
  learnChords,
  learnBeatsFor,
  formBeatsFor,
} from "./music.js";
import { Transport } from "./audio.js";
import { notationLayout, resolveNotationScale } from "./lesson.js";
import { chordsOnlyMEI, chorusStaffMEI, phraseMEI } from "./mei.js";
import {
  applySoundingHighlight,
  engraveMei,
  highlightActiveChords,
  measureEngraving,
  soundingIdsAt,
  whenVerovioReady,
} from "./engrave.js";
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
  sessionChartCopy,
  sessionCue,
  wrapupCopy,
  listenStateCopy,
  displayKeyName,
  persistLessonMelodyRegister,
  setMelodyRegister,
  skipCard,
  sessionSlot,
  modulePathNodes,
  tunePathNodes,
  TUNE_SECTION,
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
  quickViewData,
  resolveQuickViewJump,
  persistLessonTempo,
  settingsSummary,
  cardLabel,
  sessionScreenTitle,
  sessionProgress,
  LEGACY_PREFS_KEY,
  HEADPHONES_TIP_KEY,
  headphonesTipIsDismissed,
  dismissHeadphonesTip,
} from "./session.js";
import {
  tuneById,
  licksInTune,
  tunesForLick,
  learnLessonIdForLick,
  tunePlayLessonId,
} from "./tunes.js";
import { lickById } from "./registry.js";
import { GRADED_CARDS, finishCard, gradeSession, hasPitchTake } from "./grade.js";
import {
  emptyMastery,
  displayMedal,
  homeMedalMark,
  loadMastery,
  saveMastery,
  recordQuizPass,
  lessonPassedKeys,
  normalizeMastery,
  moduleMastery,
} from "./medals.js";
import { PitchMonitor, micCopy } from "./pitch.js";
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
let notationGen = 0;
let lastEngraveMs = 0;
let wrapupBanner = null;
let liveGrade = null;
let lastSessionSlot = "";
let selectedModuleId = MODULES[0]?.id ?? "cmar";
let homePane = "list";

const els = {
  shell: document.getElementById("app-shell"),
  masthead: document.getElementById("masthead"),
  home: document.getElementById("screen-home"),
  session: document.getElementById("screen-session"),
  wrapup: document.getElementById("screen-wrapup"),
  lessonList: document.getElementById("lesson-list"),
  displayChip: document.getElementById("display-chip"),
  settings: document.getElementById("settings"),
  setup: document.getElementById("setup"),
  setupTitle: document.getElementById("setup-title"),
  setupSummary: document.getElementById("setup-summary"),
  settingsSummary: document.getElementById("settings-summary"),
  settingsSummaryBtn: document.getElementById("settings-summary-btn"),
  homeSettingsBtn: document.getElementById("home-settings-btn"),
  homeBack: document.getElementById("home-back"),
  moduleSidebar: document.getElementById("module-sidebar"),
  detailHead: document.getElementById("detail-head"),
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
  displayBanner: document.getElementById("display-banner"),
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

function halt() {
  transport.stop();
  monitor.stop();
  playback.playing = false;
  playback.paused = false;
  playback.ended = false;
  audioError = "";
}

function clearGradeLine() {
  liveGrade = null;
  if (!els.gradeLine) return;
  els.gradeLine.hidden = true;
  els.gradeLine.textContent = "";
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
  renderHeadphonesTip();
}

function headphonesStorageFlag() {
  try {
    return localStorage.getItem(HEADPHONES_TIP_KEY);
  } catch {
    return null;
  }
}

function headphonesTipSeen() {
  return headphonesTipIsDismissed(prefs, headphonesStorageFlag());
}

function markHeadphonesTipSeen() {
  prefs = dismissHeadphonesTip(prefs);
  try {
    localStorage.setItem(HEADPHONES_TIP_KEY, "1");
  } catch {
    // private mode
  }
  persist();
}

function renderHeadphonesTip() {
  if (!els.headphonesTip) return;
  const show = session?.screen === "session" && !headphonesTipSeen();
  els.headphonesTip.hidden = !show;
}

monitor.onState = () => renderMic();
monitor.beatClock = () => transport.snapshot().beats;

function screenName() {
  if (session?.screen === "session") return "session";
  if (session?.screen === "wrapup") return "wrapup";
  return "home";
}

function openSettings() {
  renderSettings();
  if (els.settings && !els.settings.open) els.settings.showModal();
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
    tempo: prefs.tempo,
    melodyRegister: prefs.lessons[lesson.id]?.melodyRegister ?? 0,
    displayMode: prefs.displayMode,
    clef: prefs.clef,
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
  const mastered = Object.fromEntries(
    MODULES.map((module) => [module.id, moduleMastery(mastery, module.id).masteredKeys]),
  );
  const modules = quickViewData(keysByLesson(), mastered);
  els.quickViewList.replaceChildren(
    ...modules.map((module) => {
      const section = document.createElement("section");
      section.className = "quick-view-module";
      section.dataset.module = module.id;

      const header = document.createElement("button");
      header.type = "button";
      header.className = "quick-view-module-btn";
      header.dataset.testid = `quick-view-module-${module.id}`;
      const kicker = module.id === "tunes" ? "Play-through" : `Module ${module.number}`;
      const meta = module.id === "tunes"
        ? `${module.records.length} tunes`
        : `${module.keysMastered} of 12 keys mastered`;
      header.innerHTML = `<p class="quick-view-kicker">${kicker}</p><p class="quick-view-name">${module.lickName}</p><p class="quick-view-meta">${meta}</p>`;
      header.addEventListener("click", () => jumpFromQuickView(module.id));
      if (module.id === currentHomeModuleId()) header.classList.add("is-current");
      section.append(header);
      return section;
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

function compactHome() {
  return window.matchMedia("(max-width: 677px)").matches;
}

function currentHomeModuleId() {
  return selectedModuleId ?? MODULES[0]?.id;
}

function selectModule(id, { reveal = true } = {}) {
  selectedModuleId = id || MODULES[0]?.id;
  if (reveal && compactHome()) homePane = "detail";
  renderHome();
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
  halt();
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
  els.primary.disabled = true;
  audioError = "";
  try {
    await transport.ensure();
    if (!resume) resetPitchTake();
    if (shouldListen() && !resume) {
      monitor.beatClock = () => transport.snapshot().beats;
      await monitor.start(transport.ctx);
    }
    await transport.start(sessionAudioConfig(session), { resume });
  } catch {
    audioError = "Audio failed to load.";
    renderMeter();
  } finally {
    els.primary.disabled = false;
  }
}

function runPrimary() {
  if (!session || session.screen !== "session") return;
  const action = sessionPrimaryAction(session, playback);
  if (!action) return;
  if (action.id === "pause") halt();
  else if (action.id === "resume") start(true);
  else start(false);
}

function recordPassIfNeeded(result) {
  if (!result?.passed || !session || currentCard(session) !== "quiz") return;
  wrapupBanner = recordQuizPass(mastery, session.lessonId, currentKeyId(session));
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
    els.settings?.open
    || els.quickView?.open
    || els.leaveConfirm?.open,
  );
}

function keysByLesson(current = mastery) {
  return Object.fromEntries(
    LESSONS.map((lesson) => [lesson.id, lessonPassedKeys(current, lesson.id)]),
  );
}

function sidebarEntries() {
  return [
    ...MODULES.map((module) => {
      const stats = moduleMastery(mastery, module.id);
      return {
        id: module.id,
        number: module.number,
        name: module.name,
        kind: "module",
        mastered: stats.masteredKeys.length,
      };
    }),
    {
      id: TUNE_SECTION.id,
      number: null,
      name: TUNE_SECTION.name,
      kind: "tunes",
      mastered: null,
    },
  ];
}

function sidebarButton(entry) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "sidebar-row";
  btn.dataset.testid = `sidebar-module-${entry.id}`;
  btn.setAttribute("aria-current", entry.id === selectedModuleId ? "page" : "false");
  const num = document.createElement("span");
  num.className = "sidebar-num";
  num.textContent = entry.number != null ? String(entry.number) : "♪";
  const name = document.createElement("span");
  name.className = "sidebar-name";
  name.textContent = entry.name;
  btn.append(num, name);
  if (entry.kind === "module") {
    const ring = document.createElement("span");
    ring.className = "mastery-ring";
    ring.style.setProperty("--progress", String((entry.mastered / 12) * 100));
    ring.innerHTML = `<span>${entry.mastered}</span>`;
    ring.setAttribute("aria-label", `${entry.mastered} of 12 keys mastered`);
    btn.append(ring);
  }
  btn.addEventListener("click", () => selectModule(entry.id));
  return btn;
}

function renderSidebar() {
  if (!els.moduleSidebar) return;
  els.moduleSidebar.replaceChildren(...sidebarEntries().map(sidebarButton));
}

function detailBanner(module, stats) {
  const count = stats?.masteredKeys?.length ?? 0;
  const medal = count ? stats.medal : "none";
  const header = document.createElement("header");
  header.className = "detail-head";
  header.id = "detail-head";
  header.dataset.testid = `module-banner-${module.id}`;
  const kicker = document.createElement("p");
  kicker.className = "detail-kicker";
  kicker.textContent = module.id === TUNE_SECTION.id ? "Play-through" : `Module ${module.number}`;
  const title = document.createElement("h1");
  title.textContent = module.name;
  header.append(kicker, title);
  if (module.id !== TUNE_SECTION.id) {
    const copy = document.createElement("p");
    copy.className = "detail-count";
    copy.textContent = `${count} of 12 keys mastered`;
    const badge = document.createElement("div");
    badge.className = "medal-badge";
    badge.dataset.medal = medal;
    badge.setAttribute(
      "aria-label",
      count ? `${displayMedal(stats.medal)}, ${count} of 12 keys` : `${count} of 12 keys, no medal yet`,
    );
    const mark = homeMedalMark(count, stats.medal);
    badge.innerHTML = `<span class="medal-count">${count}/12</span><span class="medal-mark"${mark ? "" : " hidden"}>${mark}</span>`;
    header.append(copy, badge);
  }
  return header;
}

function groupHeader(title, testId) {
  const p = document.createElement("p");
  p.className = "path-group-label";
  p.dataset.testid = testId;
  p.textContent = title;
  return p;
}

function lessonRow(node) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "lesson-row";
  btn.dataset.testid = `lesson-${node.id}`;
  btn.dataset.sleeve = node.sleeve;
  btn.dataset.recommended = String(node.recommended);
  btn.dataset.complete = String(node.complete);
  btn.dataset.vinylTier = node.vinylTier;
  const bits = [
    `Lesson ${node.number}: ${node.title}`,
    `${node.passedCount} of 12 keys passed`,
  ];
  if (node.recommended) bits.push("recommended start");
  if (node.complete) bits.push("all keys passed");
  btn.setAttribute("aria-label", bits.join(". "));

  const vinyl = document.createElement("span");
  vinyl.className = "row-vinyl";
  vinyl.dataset.sleeve = node.sleeve;
  vinyl.textContent = node.number;

  const copy = document.createElement("span");
  copy.className = "row-copy";
  copy.innerHTML = `<span class="row-kicker">Lesson ${Number(node.number)}</span><span class="row-title">${node.coverTitle ?? node.title}</span><span class="row-sub">${node.caption ?? sleeveCaption(node.context, node.passedCount)}</span>`;

  btn.append(vinyl, copy);
  if (node.recommended) {
    const tag = document.createElement("span");
    tag.className = "start-pill";
    tag.textContent = "Start";
    btn.append(tag);
  }
  btn.addEventListener("click", () => openSetup(node.id));
  return btn;
}

function renderDetail() {
  const keys = keysByLesson(mastery);
  const isTunes = selectedModuleId === TUNE_SECTION.id;
  const module = isTunes ? TUNE_SECTION : (moduleById(selectedModuleId) ?? MODULES[0]);
  const nodes = isTunes ? tunePathNodes(prefs, keys) : modulePathNodes(module, prefs, keys);
  const stats = isTunes ? null : moduleMastery(mastery, module.id);
  if (els.detailHead) {
    els.detailHead.replaceWith(detailBanner(module, stats ?? { masteredKeys: [], medal: "none" }));
    els.detailHead = document.getElementById("detail-head") ?? document.querySelector(".detail-head");
  }
  const rows = [];
  let lastGroup = "standards";
  for (const node of nodes) {
    const group = node.group ?? "standards";
    if (group !== lastGroup && group === "your-tunes") {
      rows.push(groupHeader("Your tunes", `your-tunes-${module.id}`));
    }
    lastGroup = group;
    rows.push(lessonRow(node));
  }
  els.lessonList.replaceChildren(...rows);
}

function renderHome() {
  if (!MODULES.some((module) => module.id === selectedModuleId) && selectedModuleId !== TUNE_SECTION.id) {
    selectedModuleId = MODULES[0].id;
  }
  els.shell.dataset.homePane = compactHome() ? homePane : "split";
  if (els.homeBack) {
    const showBack = compactHome() && homePane === "detail";
    els.homeBack.hidden = !showBack;
  }
  renderSidebar();
  renderDetail();
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
  context.textContent = node.caption ?? sleeveCaption(node.context, node.passedCount);
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
      btn.textContent = option.label;
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
  if (els.settingsSummary) els.settingsSummary.textContent = settingsSummary(prefs);
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
      btn.textContent = minorSpelling(getKey(id)).shortName;
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
  els.sessionOctave.replaceChildren(down, up);
}

function applyMelodyOctave(register) {
  if (!session || session.screen !== "session") return;
  const melodyRegister = register <= -1 ? -1 : register >= 1 ? 1 : 0;
  if (melodyRegister === session.melodyRegister) return;
  const restart = playback.playing || playback.paused;
  halt();
  resetPitchTake();
  session = setMelodyRegister(session, melodyRegister);
  prefs = persistLessonMelodyRegister(prefs, session.lessonId, melodyRegister);
  persist();
  render();
  if (restart) start(false);
}

function renderSessionChrome() {
  const card = currentCard(session);
  const ordinal = keyOrdinal(session);
  els.shell.dataset.sleeve = lessonSleeve(session.lessonId);
  els.cardBadge.textContent = cardLabel(card, session.lessonId);
  if (els.sessionTitle) els.sessionTitle.textContent = sessionScreenTitle(session);
  els.sessionKey.textContent = displayKeyName(currentKeyId(session), session.displayMode, sessionKeyQuality(session));
  els.sessionKeyCount.textContent = `Key ${ordinal.index} of ${ordinal.total}`;
  const progress = sessionProgress(session);
  els.sessionProgressFill.style.width = `${progress.ratio * 100}%`;
  if (els.sessionBack) {
    els.sessionBack.disabled = !canGoBack(session);
  }
  if (els.sessionNext) {
    els.sessionNext.disabled = !canGoNext(session);
  }
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

function renderNotation() {
  if (!session || session.screen !== "session") return;
  const view = sessionPresentation(session);
  const copy = sessionChartCopy(session);
  const lesson = lessonById(session.lessonId);
  els.chartTitle.textContent = copy.title;
  els.chartMeta.textContent = copy.meta;
  const hideStaff = Boolean(view.hideStaff);
  els.hiddenAnswer.hidden = !hideStaff;
  els.hiddenAnswer.textContent = currentCard(session) === "quiz" ? "From memory" : "Use your ears";
  fillListenState();
  els.notation.hidden = hideStaff;
  els.session.dataset.card = currentCard(session);
  els.notation.classList.toggle("slash", Boolean(view.showSlashNotation && !view.showLandingNotation));
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
    showPhraseNotation: view.showPhraseNotation,
    showEntranceCues: view.showEntranceCues,
    phraseBars: view.showPhraseNotation ? phraseMeasureCount(lesson.applicationId) : undefined,
    notationScale: resolveNotationScale(),
  });
  const concertKey = getKey(currentKeyId(session));
  lastNotationLayout = {
    ...layout,
    phraseStartBar: view.application?.phraseStartBar ?? 7,
    phraseBars: phraseSpanBars(lesson.applicationId),
  };
  const mei = view.showChordsOnly
    ? chordsOnlyMEI(
      concertKey,
      session.displayMode,
      lesson.applicationId,
      session.clef,
      { barsPerLine: layout.barsPerLine, isolated: lesson.kind === "learn" },
    )
    : view.showLandingNotation
    ? chorusStaffMEI({
      concertKey,
      displayMode: session.displayMode,
      applicationId: lesson.applicationId,
      clef: session.clef,
      melodyRegister: session.melodyRegister,
      mode: "landing",
      showCues: view.showEntranceCues,
      barsPerLine: layout.barsPerLine,
    })
    : view.showModelNotation
      ? chorusStaffMEI({
        concertKey,
        displayMode: session.displayMode,
        applicationId: lesson.applicationId,
        clef: session.clef,
        melodyRegister: session.melodyRegister,
        mode: "model",
        showCues: view.showEntranceCues,
        barsPerLine: layout.barsPerLine,
      })
      : view.showSlashNotation
        ? chorusStaffMEI({
          concertKey,
          displayMode: session.displayMode,
          applicationId: lesson.applicationId,
          clef: session.clef,
          mode: "slash",
          showCues: view.showEntranceCues,
          barsPerLine: layout.barsPerLine,
        })
        : phraseMEI(
          concertKey,
          session.displayMode,
          lesson.applicationId,
          session.clef,
          session.melodyRegister,
          { barsPerLine: layout.barsPerLine },
        );
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
    updatePlayhead();
  }).catch(() => {
    if (gen !== notationGen) return;
    els.notation.replaceChildren();
  });
}

function renderCopy(snap = transport.snapshot()) {
  const clefLabel = prefs.clef === "bass" ? "Bass clef" : "Treble clef";
  if (els.settingsSummary) els.settingsSummary.textContent = settingsSummary(prefs);
  els.swing.checked = prefs.swing;
  els.guideTones.checked = prefs.guideTones;
  els.metronome.checked = prefs.metronome;
  document.querySelectorAll("[name=displayMode]").forEach((input) => {
    input.checked = input.value === prefs.displayMode;
  });
  document.querySelectorAll("[name=clef]").forEach((input) => {
    input.checked = input.value === prefs.clef;
  });
  els.displayBanner.textContent = prefs.displayMode === "bb-written"
    ? `${clefLabel}, B♭ written names. Audio stays concert; clef does not transpose.`
    : `Concert ${clefLabel.toLowerCase()}. Audio matches this octave; clef does not transpose.`;
  if (!session || session.screen !== "session") return;
  els.instruction.textContent = sessionCue(session, snap);
}

function renderPrimary(snap = transport.snapshot()) {
  if (!session || session.screen !== "session") return;
  const action = sessionPrimaryAction(session, playback);
  const icon = els.primary.querySelector(".play-round-icon");
  els.primary.hidden = !action;
  if (!action) return;
  const playing = action.id === "pause" || action.id === "stop";
  const inCountIn = Boolean(snap.inCountIn);
  const listening = Boolean(shouldListen() && (snap.playing || snap.paused) && !inCountIn);
  const result = liveGrade?.graded ? liveGrade : null;
  let state = "idle";
  if (inCountIn) state = "count-in";
  else if (playing) state = "playing";
  else if (listening) state = "listening";
  else if (result) state = "result";
  els.primary.dataset.action = playing ? "stop" : action.id;
  els.primary.dataset.state = state;
  els.primary.classList.toggle("is-stop", playing && !inCountIn);
  els.primary.classList.toggle("is-count", inCountIn);
  if (result) els.primary.dataset.passed = String(Boolean(result.passed));
  else delete els.primary.dataset.passed;
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
    els.meter.hidden = false;
    els.meter.textContent = `Count-in · ${Math.max(1, Math.ceil(-snap.beats))}`;
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
  els.wrapupHeading.textContent = copy.heading;
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
  if (copy.nextKeyLabel) els.nextKey.textContent = copy.nextKeyLabel;
}

function render(snap = transport.snapshot()) {
  const screen = screenName();
  els.shell.dataset.screen = screen;
  if (screen === "home") delete els.shell.dataset.sleeve;
  els.home.setAttribute("aria-hidden", String(screen !== "home"));
  els.session.setAttribute("aria-hidden", String(screen !== "session"));
  els.wrapup.setAttribute("aria-hidden", String(screen !== "wrapup"));
  const moduleName = session ? moduleForLesson(session.lessonId).name : "DuoJazz";
  document.title = screen === "home" ? "DuoJazz" : `DuoJazz · ${moduleName} session`;
  renderCopy(snap);
  renderHeadphonesTip();
  if (screen === "home") renderHome();
  if (screen === "session") {
    renderSessionChrome();
    renderSessionOctave();
    renderNotation();
    renderPrimary();
    renderMeter(snap);
    renderMic();
    if (!liveGrade) restoreStoredGrade();
  }
  if (screen === "wrapup") renderWrapup();
}

function applyDeepLink() {
  const params = new URLSearchParams(location.search);
  const screen = params.get("screen");
  const lessonId = params.get("lesson") || "learn-lick";
  const card = params.get("card") || "learn";
  const keyMode = params.get("keys") || "fourths";
  const moduleParam = params.get("module");
  if (moduleParam) {
    selectedModuleId = moduleParam;
    homePane = "detail";
  }
  if (!screen) return;
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
    openSettings();
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
      displayMode: prefs.displayMode,
      clef: prefs.clef,
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
  if (!els.gradeLine) return;
  if (result?.graded) {
    els.gradeLine.hidden = false;
    const bits = [`${result.percent}%`, result.passed ? "pass" : "not yet"];
    if (result.correction) bits.push(result.correction);
    els.gradeLine.textContent = bits.join(" · ");
    return;
  }
  if (result?.outcome === "skipped") {
    els.gradeLine.hidden = false;
    els.gradeLine.textContent = "Skipped";
    return;
  }
  els.gradeLine.hidden = true;
  els.gradeLine.textContent = "";
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
  const listenHear = currentCard(session) === "listen" && session.listenStage === "hear";
  const grade = listenHear ? {} : gradeCurrentCard();
  monitor.stop();
  const next = handlePlaybackEnded(session, grade);
  const wait = grade.graded && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 900 : 0;
  window.setTimeout(() => applySession(next.session, { autoStart: next.autoStart }), wait);
};

els.displayChip.addEventListener("click", () => openSettings());
els.settingsSummaryBtn?.addEventListener("click", () => openSettings());
els.homeSettingsBtn?.addEventListener("click", () => openSettings());
els.homeBack?.addEventListener("click", () => {
  homePane = "list";
  renderHome();
});
els.sessionExit.addEventListener("click", exitSession);
els.sessionBack?.addEventListener("click", () => navigateCard(-1));
els.sessionNext?.addEventListener("click", () => navigateCard(1));
els.headphonesDismiss?.addEventListener("click", () => {
  markHeadphonesTipSeen();
  renderHeadphonesTip();
});
els.sessionQuickView?.addEventListener("click", requestQuickView);
els.leaveConfirm?.addEventListener("close", () => {
  if (els.leaveConfirm.returnValue === "leave") abandonToQuickView();
});
els.primary.addEventListener("click", runPrimary);
els.continueBtn.addEventListener("click", goContinue);
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

document.querySelectorAll("[name=displayMode]").forEach((input) => {
  input.addEventListener("change", () => {
    prefs.displayMode = input.value;
    persist();
    if (session) session = { ...session, displayMode: prefs.displayMode };
    halt();
    render();
  });
});

document.querySelectorAll("[name=clef]").forEach((input) => {
  input.addEventListener("change", () => {
    prefs.clef = input.value === "treble" ? "treble" : "bass";
    persist();
    if (session) session = { ...session, clef: prefs.clef };
    render();
  });
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
  else renderHome();
});

const lessonPath = document.querySelector(".lesson-path");
if (lessonPath && typeof ResizeObserver === "function") {
  new ResizeObserver(() => paintPathTrail()).observe(lessonPath);
}
if (document.fonts?.ready) {
  document.fonts.ready.then(() => paintPathTrail());
}

window.__DUOJAZZ__ = {
  getPrefs: () => prefs,
  getSession: () => session,
  lastEngraveMs: () => lastEngraveMs,
  measureNotation: () => measureEngraving(els.notation),
  openSetup,
  startFromSetup,
  createAndShow(options) {
    halt();
    applySession(createSession({
      displayMode: prefs.displayMode,
      clef: prefs.clef,
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
whenVerovioReady().then(() => {
  if (session?.screen === "session") renderNotation();
});
