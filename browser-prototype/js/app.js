import {
  MELODY_REGISTERS,
  chorusStaffABC,
  getKey,
  minorSpelling,
  phraseABC,
  jazzChordRootParts,
} from "./music.js";
import { Transport } from "./audio.js";
import {
  notationLayout,
  nextEngravingWidth,
  nextStaffsep,
  chorusStaffFit,
} from "./lesson.js";
import {
  PREFS_KEY,
  MODULE,
  LESSONS,
  KEY_MODES,
  CARD_SETS,
  CARDS,
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
  sessionMeterExtras,
  wrapupCopy,
  listenStateCopy,
  displayKeyName,
  persistLessonMelodyRegister,
  setMelodyRegister,
  skipCard,
  sessionSlot,
  lessonPathNodes,
  lessonSleeve,
  vinylTier,
  sleeveCaption,
} from "./session.js";
import { GRADED_CARDS, finishCard, gradeSession } from "./grade.js";
import {
  emptyMastery,
  displayMedal,
  homeMedalMark,
  loadMastery,
  saveMastery,
  recordQuizPass,
  lessonPassedKeys,
  normalizeMastery,
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
let lastTune = null;
let lastNotationLayout = null;
let wrapupBanner = null;
let liveGrade = null;
let lastSessionSlot = "";

const els = {
  shell: document.getElementById("app-shell"),
  masthead: document.getElementById("masthead"),
  home: document.getElementById("screen-home"),
  session: document.getElementById("screen-session"),
  wrapup: document.getElementById("screen-wrapup"),
  lessonList: document.getElementById("lesson-list"),
  moduleBanner: document.getElementById("module-banner"),
  medalBadge: document.getElementById("medal-badge"),
  medalCount: document.getElementById("medal-count"),
  displayChip: document.getElementById("display-chip"),
  settings: document.getElementById("settings"),
  setup: document.getElementById("setup"),
  setupTitle: document.getElementById("setup-title"),
  setupSummary: document.getElementById("setup-summary"),
  keyModes: document.getElementById("key-modes"),
  setupKeys: document.getElementById("setup-keys"),
  cardSets: document.getElementById("card-sets"),
  sessionOctave: document.getElementById("session-octave"),
  tempoReadout: document.getElementById("tempo-readout"),
  tempoDown: document.getElementById("tempo-down"),
  tempoUp: document.getElementById("tempo-up"),
  startLesson: document.getElementById("start-lesson"),
  sessionExit: document.getElementById("session-exit"),
  sessionKey: document.getElementById("session-key"),
  sessionKeyCount: document.getElementById("session-key-count"),
  sessionCardCount: document.getElementById("session-card-count"),
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
    return normalizePrefs(JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null"));
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
  if (els.sessionMic) els.sessionMic.textContent = copy;
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

function openSetup(lessonId) {
  setupLessonId = lessonById(lessonId).id;
  setupDraft = { ...prefs.lessons[setupLessonId] };
  renderSetup();
  if (!els.setup.open) els.setup.showModal();
}

function closeSetup() {
  if (els.setup.open) els.setup.close();
}

function startFromSetup() {
  prefs.lessons[setupLessonId] = { ...setupDraft };
  prefs = markLessonStarted(prefs, setupLessonId, setupDraft.startKeyId);
  persist();
  halt();
  applySession(createSession({
    lessonId: setupLessonId,
    ...setupDraft,
    displayMode: prefs.displayMode,
    clef: prefs.clef,
    swing: prefs.swing,
    metronome: prefs.metronome,
    guideTones: prefs.guideTones,
  }));
  closeSetup();
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
  try {
    await transport.ensure();
    if (!resume) resetPitchTake();
    if (shouldListen() && !resume) {
      monitor.beatClock = () => transport.snapshot().beats;
      await monitor.start(transport.ctx);
    }
    await transport.start(sessionAudioConfig(session), { resume });
  } finally {
    els.primary.disabled = false;
  }
}

function runPrimary() {
  if (!session || session.screen !== "session") return;
  const action = sessionPrimaryAction(session, playback);
  if (!action) return;
  if (action.id === "pause") transport.pause();
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
  const result = gradeCurrentCard();
  halt();
  applySession(completeCard(session, result));
}

function keysByLesson(current = mastery) {
  return Object.fromEntries(
    LESSONS.map((lesson) => [lesson.id, lessonPassedKeys(current, lesson.id)]),
  );
}

function renderHome() {
  const count = mastery.masteredKeys.length;
  const medal = count ? mastery.medal : "none";
  if (els.medalBadge) {
    els.medalBadge.dataset.medal = medal;
    els.medalBadge.setAttribute(
      "aria-label",
      count ? `${displayMedal(mastery.medal)}, ${count} of 12 keys` : `${count} of 12 keys, no medal yet`,
    );
  }
  if (els.medalCount) els.medalCount.textContent = `${count}/12`;
  if (els.medalMark) {
    els.medalMark.textContent = homeMedalMark(count, mastery.medal);
    els.medalMark.hidden = !count;
  }
  if (els.medalNote) {
    els.medalNote.textContent = `${count} of 12 keys mastered`;
  }
  const nodes = lessonPathNodes(prefs, keysByLesson(mastery));
  els.lessonList.replaceChildren(...nodes.map((node) => sleeveButton(node)), moreLicksSoon());
  requestAnimationFrame(paintPathTrail);
}

function moreLicksSoon() {
  const wrap = document.createElement("div");
  wrap.className = "path-end";
  wrap.setAttribute("aria-hidden", "true");
  wrap.innerHTML = `<span class="path-end-sleeve"></span><span class="path-end-label">More licks soon</span>`;
  return wrap;
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
  const lesson = lessonById(setupLessonId);
  els.setup.dataset.sleeve = lesson.sleeve;
  els.setupTitle.textContent = lesson.title;
  els.setupSummary.textContent = lesson.summary;
  chipRow(els.keyModes, KEY_MODES, setupDraft.keyMode, (id) => {
    setupDraft.keyMode = id;
    renderSetup();
  });
  els.setupKeys.replaceChildren(
    ...TWELVE_KEY_IDS.map((id) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "key-btn";
      btn.textContent = minorSpelling(getKey(id)).shortName;
      btn.setAttribute("aria-pressed", String(id === setupDraft.startKeyId));
      btn.addEventListener("click", () => {
        setupDraft.startKeyId = id;
        renderSetup();
      });
      return btn;
    }),
  );
  chipRow(els.cardSets, CARD_SETS, setupDraft.cardSet, (id) => {
    setupDraft.cardSet = id;
    renderSetup();
  });
  els.tempoReadout.textContent = String(setupDraft.tempo);
}

function renderSessionOctave() {
  if (!els.sessionOctave || !session) return;
  els.sessionOctave.replaceChildren(
    ...MELODY_REGISTERS.map((option) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = option.id === 0 ? "Original" : option.id === 1 ? "+1" : "−1";
      btn.setAttribute("aria-pressed", String(option.id === session.melodyRegister));
      btn.addEventListener("click", () => applyMelodyOctave(option.id));
      return btn;
    }),
  );
}

function applyMelodyOctave(register) {
  if (!session || session.screen !== "session") return;
  const melodyRegister = register === -1 || register === 1 ? register : 0;
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
  const total = session.cards.length;
  els.shell.dataset.sleeve = lessonSleeve(session.lessonId);
  els.cardBadge.textContent = CARDS[card].kicker;
  els.sessionKey.textContent = displayKeyName(currentKeyId(session), session.displayMode);
  els.sessionKeyCount.textContent = `Key ${ordinal.index} of ${ordinal.total}`;
  els.sessionCardCount.textContent = `${session.cardIndex + 1}/${total}`;
  els.sessionProgressFill.style.width = `${((session.cardIndex) / total) * 100}%`;
}

function staffWidth() {
  return Math.max(320, Math.min(980, els.notation.clientWidth || 760));
}

function isCueNode(el) {
  return Boolean(
    el.classList?.contains("abcjs-chord")
    || el.classList?.contains("abcjs-annotation")
    || el.closest?.(".abcjs-chord, .abcjs-annotation"),
  );
}

function hideNoteGlyphs(el, keepContainer) {
  if (isCueNode(el)) return;
  const kids = [...el.children];
  if (keepContainer || kids.some((child) => isCueNode(child) || child.querySelector?.(".abcjs-chord, .abcjs-annotation"))) {
    kids.forEach((child) => hideNoteGlyphs(child, false));
    return;
  }
  el.setAttribute("opacity", "0");
}

function svgCssToUser(svg, cssPx) {
  const ctm = svg?.getScreenCTM?.();
  const k = ctm && Math.abs(ctm.d) > 0.05 ? Math.abs(ctm.d) : 1;
  return cssPx / k;
}

function restyleAnnotations() {
  const svg = els.notation.querySelector("svg");
  const annUser = svgCssToUser(svg, lastNotationLayout?.annotationPx ?? 15);
  const chordUser = svgCssToUser(svg, lastNotationLayout?.chordCssPx ?? 18);
  for (const el of els.notation.querySelectorAll(".abcjs-annotation")) {
    el.style.fontSize = `${annUser}px`;
    el.style.fontWeight = "700";
    el.style.opacity = "1";
    el.style.fontFamily = '"Source Sans 3", sans-serif';
  }
  for (const el of els.notation.querySelectorAll(".abcjs-chord")) {
    el.style.fontSize = `${chordUser}px`;
    el.style.fontWeight = "700";
    el.style.fontFamily = '"Noto Sans", "Source Sans 3", sans-serif';
  }
  tightenChordSymbols();
  clearCueCollisions();
}

function nodeBox(node) {
  if (!node) return null;
  if (node.nodeType === Node.ELEMENT_NODE) return node.getBoundingClientRect();
  const range = document.createRange();
  range.selectNodeContents(node);
  return range.getBoundingClientRect();
}

function shiftDx(el, deltaEm) {
  const current = Number.parseFloat(el.getAttribute("dx") || "0");
  el.setAttribute("dx", `${current + deltaEm}em`);
}

function closeGap(rightEl, leftNode, fontPx, maxGap = 0.5) {
  if (!rightEl || !leftNode || !fontPx) return;
  for (let i = 0; i < 10; i += 1) {
    const leftBox = nodeBox(leftNode);
    const rightBox = rightEl.getBoundingClientRect();
    if (!leftBox || !rightBox.width) break;
    const gap = rightBox.left - leftBox.right;
    if (gap <= maxGap) break;
    shiftDx(rightEl, -gap / fontPx);
  }
}

function tightenChordSymbols() {
  const svgNS = "http://www.w3.org/2000/svg";
  for (const chord of els.notation.querySelectorAll(".abcjs-chord")) {
    const lines = [...chord.children].filter((el) => el.tagName?.toLowerCase() === "tspan");
    for (const line of lines) {
      const qualities = [...line.children].filter((el) => (
        el.tagName?.toLowerCase() === "tspan"
        && !el.classList.contains("abcjs-chord-root")
        && !el.classList.contains("abcjs-chord-accidental")
      ));
      let root = line.querySelector(".abcjs-chord-root");
      const textNode = [...line.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      if (!root && textNode) {
        let raw = textNode.textContent.trim();
        for (const quality of qualities) {
          const stolen = (quality.textContent ?? "").match(/^([♭♯b#])(.*)$/u);
          if (stolen) {
            raw += stolen[1] === "b" ? "♭" : stolen[1] === "#" ? "♯" : stolen[1];
            quality.textContent = stolen[2];
          }
        }
        const parts = jazzChordRootParts(raw);
        root = document.createElementNS(svgNS, "tspan");
        root.classList.add("abcjs-chord-root");
        root.textContent = parts ? `${parts.letter}${parts.accidental}` : raw;
        root.style.letterSpacing = parts ? "-0.12em" : "0";
        textNode.replaceWith(root);
      }
      for (const quality of qualities) {
        quality.setAttribute("dx", "0.02em");
      }
      const quality = qualities.find((el) => el.isConnected);
      const fontPx = Number.parseFloat(window.getComputedStyle(chord).fontSize) || 16;
      if (quality) closeGap(quality, root ?? textNode, fontPx, 0.2);
    }
  }
}

function boxesOverlap(a, b, pad = 0) {
  return a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad;
}

function clearCueCollisions() {
  const notes = [...els.notation.querySelectorAll(".abcjs-notehead, .abcjs-stem, .abcjs-beam, .abcjs-flag")];
  const blockers = [...els.notation.querySelectorAll(".abcjs-chord, .abcjs-staff")];
  for (const cue of els.notation.querySelectorAll(".abcjs-annotation")) {
    cue.style.transform = "";
    let shift = 0;
    for (let i = 0; i < 16; i += 1) {
      const cueBox = cue.getBoundingClientRect();
      const hitsNote = notes.some((node) => boxesOverlap(cueBox, node.getBoundingClientRect(), 5));
      if (!hitsNote) break;
      const next = shift + 6;
      cue.style.transform = `translateY(${next}px)`;
      const moved = cue.getBoundingClientRect();
      const hitsNextSystem = blockers.some((node) => boxesOverlap(moved, node.getBoundingClientRect(), 3));
      if (hitsNextSystem) {
        cue.style.transform = shift ? `translateY(${shift}px)` : "";
        break;
      }
      shift = next;
    }
  }
}

function barIndexForNote(note, staffs, barsOnStaff) {
  if (!staffs.length) return 0;
  const head = note.querySelector(".abcjs-notehead") ?? note;
  if (typeof head.getBBox !== "function") return 0;
  const box = head.getBBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  let staffIndex = 0;
  let best = Infinity;
  staffs.forEach((staff, index) => {
    const staffBox = staff.getBBox();
    const mid = staffBox.y + staffBox.height / 2;
    const dist = Math.abs(cy - mid);
    if (dist < best) {
      best = dist;
      staffIndex = index;
    }
  });
  const staffBox = staffs[staffIndex].getBBox();
  const barWidth = staffBox.width / Math.max(1, barsOnStaff);
  const barInSystem = Math.min(
    barsOnStaff - 1,
    Math.max(0, Math.floor((cx - staffBox.x) / barWidth)),
  );
  return staffIndex * barsOnStaff + barInSystem;
}

function applyRhythmSlashes(keepLandingNotes = false) {
  const svg = els.notation.querySelector("svg");
  if (!svg) return;
  const ns = "http://www.w3.org/2000/svg";
  const staffs = [...els.notation.querySelectorAll(".abcjs-staff")];
  const barsOnStaff = lastNotationLayout?.barsPerLine ?? 4;
  const landingBar = (lastNotationLayout?.phraseStartBar ?? 7) - 1;
  for (const note of els.notation.querySelectorAll(".abcjs-note")) {
    const head = note.querySelector(".abcjs-notehead")
      ?? [...note.querySelectorAll("ellipse, path")].find((node) => !isCueNode(node));
    if (!head || typeof head.getBBox !== "function") continue;
    if (keepLandingNotes && barIndexForNote(note, staffs, barsOnStaff) === landingBar) continue;
    const box = head.getBBox();
    hideNoteGlyphs(note, true);
    const slash = document.createElementNS(ns, "line");
    slash.setAttribute("x1", String(box.x - 1));
    slash.setAttribute("y1", String(box.y + box.height + 1));
    slash.setAttribute("x2", String(box.x + box.width + 5));
    slash.setAttribute("y2", String(box.y - 3));
    slash.setAttribute("stroke", "#2b211a");
    slash.setAttribute("stroke-width", String(lastNotationLayout?.slashStroke ?? 1.85));
    slash.setAttribute("stroke-linecap", "round");
    slash.setAttribute("opacity", "1");
    note.append(slash);
  }
  for (const el of els.notation.querySelectorAll(".abcjs-chord, .abcjs-annotation")) {
    el.style.opacity = "1";
    el.removeAttribute("opacity");
  }
  restyleAnnotations();
}

function notationRoot(svg) {
  return svg.querySelector("[data-staff-fit]") ?? svg;
}

function ensurePlayhead(svg) {
  const ns = "http://www.w3.org/2000/svg";
  const root = notationRoot(svg);
  let line = svg.querySelector("#playhead");
  let glow = svg.querySelector("#bar-glow");
  if (!glow) {
    glow = document.createElementNS(ns, "rect");
    glow.id = "bar-glow";
    glow.setAttribute("fill", "rgba(96, 57, 45, 0.14)");
    root.insertBefore(glow, root.firstChild);
  }
  if (!line) {
    line = document.createElementNS(ns, "line");
    line.id = "playhead";
    line.setAttribute("stroke", "#60392d");
    line.setAttribute("stroke-width", "2");
    root.append(line);
  }
  return { line, glow };
}

function fitChorusStaffSvg(svg, layout) {
  const minStaffPx = layout?.minStaffPx ?? 0;
  const wrap = els.notation.parentElement;
  const staff = svg?.querySelector(".abcjs-staff");
  if (!svg || !wrap || !staff || minStaffPx < 40 || typeof staff.getBBox !== "function") return;
  if (svg.querySelector("[data-staff-fit]")) return;
  const vb = svg.viewBox?.baseVal;
  if (!vb?.width) return;
  let staffUserH = 0;
  try {
    staffUserH = staff.getBBox().height;
  } catch {
    return;
  }
  const fit = chorusStaffFit(vb.width, staffUserH, wrap.clientWidth, minStaffPx);
  if (fit.scaleX >= 0.98) return;
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("data-staff-fit", "1");
  g.setAttribute("transform", `scale(${fit.scaleX} 1)`);
  while (svg.firstChild) g.appendChild(svg.firstChild);
  svg.append(g);
  svg.setAttribute("viewBox", `0 0 ${fit.viewBoxWidth} ${vb.height}`);
  svg.removeAttribute("height");
  svg.removeAttribute("width");
  const displayHeight = `${Math.round(wrap.clientWidth * vb.height / fit.viewBoxWidth)}px`;
  svg.style.setProperty("width", "100%", "important");
  svg.style.setProperty("height", displayHeight, "important");
  const container = svg.parentElement;
  if (container) {
    container.style.setProperty("height", displayHeight, "important");
    container.style.setProperty("overflow", "visible");
  }
}

function updatePlayhead(snap = transport.snapshot()) {
  const svg = els.notation.querySelector("svg");
  if (!svg || !session) return;
  const { line, glow } = ensurePlayhead(svg);
  const staffs = [...els.notation.querySelectorAll(".abcjs-staff")];
  const active = (snap.playing || snap.paused) && !snap.inCountIn && staffs.length;
  if (!active) {
    line.setAttribute("opacity", "0");
    glow.setAttribute("opacity", "0");
    return;
  }
  const view = sessionPresentation(session);
  const barsOnStaff = view.audioStage === "learn" ? 2 : (lastNotationLayout?.barsPerLine ?? 4);
  const barIndex = Math.max(0, (snap.bar ?? 1) - 1);
  const system = Math.min(staffs.length - 1, Math.floor(barIndex / barsOnStaff));
  const barInSystem = barIndex % barsOnStaff;
  const staff = staffs[system];
  const box = staff.getBBox();
  const barWidth = box.width / barsOnStaff;
  const beatFrac = ((snap.beatInBar ?? 1) - 1) / 4;
  const x = box.x + barInSystem * barWidth + beatFrac * barWidth;
  glow.setAttribute("x", String(box.x + barInSystem * barWidth));
  glow.setAttribute("y", String(box.y - 8));
  glow.setAttribute("width", String(barWidth));
  glow.setAttribute("height", String(box.height + 28));
  glow.setAttribute("opacity", "1");
  line.setAttribute("x1", String(x));
  line.setAttribute("x2", String(x));
  line.setAttribute("y1", String(box.y - 6));
  line.setAttribute("y2", String(box.y + box.height + 18));
  line.setAttribute("opacity", "1");
}

function abcRenderOptions(layout, staffwidth, scale) {
  const width = Math.max(280, staffwidth);
  const format = {
    chordfont: layout.chordfont,
    annotationfont: layout.annotationfont,
  };
  if (layout.staffsep) format.staffsep = layout.staffsep;
  return {
    add_classes: true,
    paddingtop: layout.paddingtop,
    paddingbottom: layout.paddingbottom,
    staffwidth: width,
    scale,
    responsive: "resize",
    stretchlast: false,
    jazzchords: true,
    format,
    wrap: layout.wrap ? { ...layout.wrap, staffwidth: width } : undefined,
  };
}

function paperTargetHeight() {
  const wrap = els.notation.parentElement;
  if (!wrap) return 0;
  return Math.floor(wrap.clientHeight);
}

function abcWithStaffsep(abc, staffsep) {
  if (!staffsep || abc.includes("%%staffsep")) return abc;
  return abc.replace(/^X:1\n/, `X:1\n%%staffsep ${staffsep}\n`);
}

function renderFittedAbc(abc, layout, width) {
  const scale = layout.scale;
  const fullWidth = Math.max(280, width - 24);
  const minWidth = Math.max(200, Math.round(fullWidth * (layout.minEngravingRatio ?? 0.4)));
  let staffwidth = Math.round(fullWidth * (layout.engravingRatio ?? 1));
  staffwidth = Math.min(fullWidth, Math.max(minWidth, staffwidth));
  let staffsep = layout.staffsep;
  let rendered = null;
  const fill = layout.fillRatio ?? 0.92;
  const target = layout.fitToPaper ? Math.floor(paperTargetHeight() * fill) : 0;
  for (let i = 0; i < 8; i += 1) {
    els.notation.replaceChildren();
    rendered = window.ABCJS.renderAbc(
      els.notation,
      abcWithStaffsep(abc, layout.fillAxis === "width" ? 0 : staffsep),
      abcRenderOptions({ ...layout, staffsep }, staffwidth, scale),
    )[0];
    const svg = els.notation.querySelector("svg");
    const height = svg ? svg.getBoundingClientRect().height : 0;
    if (!layout.fitToPaper || !target) break;
    if (layout.fillAxis === "staffsep" || layout.fillAxis === "both") {
      if (layout.fillAxis === "both") {
        const nextWidth = nextEngravingWidth(staffwidth, height, target, width, minWidth);
        if (nextWidth !== staffwidth) {
          staffwidth = nextWidth;
          continue;
        }
      }
      const nextSep = nextStaffsep(staffsep, height, target, layout.maxStaffsep ?? 380);
      if (nextSep === staffsep) break;
      staffsep = nextSep;
    } else if (layout.fillAxis === "width") {
      const nextWidth = nextEngravingWidth(staffwidth, height, target, width, minWidth);
      if (nextWidth === staffwidth) break;
      staffwidth = nextWidth;
    } else {
      break;
    }
  }
  lastNotationLayout = {
    ...layout,
    scale,
    staffwidth,
    staffsep,
    phraseStartBar: lastNotationLayout?.phraseStartBar ?? layout.phraseStartBar,
  };
  return rendered;
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
  if (hideStaff) {
    els.notation.replaceChildren();
    lastTune = null;
    return;
  }
  const width = staffWidth();
  const layout = notationLayout({
    staffWidth: width,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    showPhraseNotation: view.showPhraseNotation,
    showEntranceCues: view.showEntranceCues,
  });
  const concertKey = getKey(currentKeyId(session));
  lastNotationLayout = { ...layout, phraseStartBar: view.application?.phraseStartBar ?? 7 };
  const abc = view.showLandingNotation
    ? chorusStaffABC({
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
      ? chorusStaffABC({
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
        ? chorusStaffABC({
          concertKey,
          displayMode: session.displayMode,
          applicationId: lesson.applicationId,
          clef: session.clef,
          mode: "slash",
          showCues: view.showEntranceCues,
          barsPerLine: layout.barsPerLine,
        })
        : phraseABC(concertKey, session.displayMode, lesson.applicationId, session.clef, session.melodyRegister);
  els.notation.replaceChildren();
  if (window.ABCJS) {
    lastTune = renderFittedAbc(abc, layout, width);
    if (view.showSlashNotation) applyRhythmSlashes(view.showLandingNotation);
    restyleAnnotations();
    const svg = els.notation.querySelector("svg");
    if (svg && layout.fillAxis === "fit") fitChorusStaffSvg(svg, layout);
    updatePlayhead();
  } else {
    const pre = document.createElement("pre");
    pre.textContent = abc;
    els.notation.append(pre);
  }
}

function renderCopy(snap = transport.snapshot()) {
  const clefLabel = prefs.clef === "bass" ? "Bass clef" : "Treble clef";
  els.displayChip.textContent = `${prefs.displayMode === "bb-written" ? "B♭ written" : "Concert"} · ${clefLabel}`;
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

function renderPrimary() {
  if (!session || session.screen !== "session") return;
  const action = sessionPrimaryAction(session, playback);
  els.primary.hidden = !action;
  if (action) {
    els.primary.dataset.action = action.id;
    els.primary.textContent = action.label;
  }
}

function renderMeter(snap = transport.snapshot()) {
  if (!session || session.screen !== "session") return;
  const concert = minorSpelling(getKey(currentKeyId(session)));
  if (snap.inCountIn) {
    els.meter.textContent = `Count-in · ${Math.max(1, Math.ceil(-snap.beats))}`;
    return;
  }
  if (snap.playing) {
    els.meter.textContent = `Bar ${snap.bar} · Beat ${snap.beatInBar} · ${concert.name}`;
    return;
  }
  if (snap.paused) {
    els.meter.textContent = `Paused · bar ${snap.bar} beat ${snap.beatInBar}`;
    return;
  }
  els.meter.textContent = playback.ended ? "Ready when you are" : sessionMeterExtras(session);
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
    els.wrapupSleeveNum.textContent = String(LESSONS.findIndex((item) => item.id === lesson.id) + 1).padStart(2, "0");
  }
  if (els.wrapupSleeveTitle) els.wrapupSleeveTitle.textContent = lesson.coverTitle;
  els.resultList.replaceChildren(
    ...copy.results.map((row) => {
      const item = document.createElement("li");
      item.innerHTML = `<span>${row.label}</span><span class="outcome">${resultLabel(row)}</span>`;
      return item;
    }),
  );
  const count = mastery.masteredKeys.length;
  if (els.wrapupMedalMark) {
    els.wrapupMedalMark.textContent = wrapupBanner?.upgraded
      ? `Medal up · ${displayMedal(wrapupBanner.medal)}`
      : (count ? displayMedal(mastery.medal) : "Medal");
  }
  if (els.wrapupMedal) {
    els.wrapupMedal.hidden = false;
    els.wrapupMedal.textContent = wrapupBanner?.upgraded
      ? `${displayMedal(wrapupBanner.medal)} unlocked`
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
  document.title = screen === "home" ? `DuoJazz · ${MODULE.name}` : `DuoJazz · ${MODULE.name} session`;
  renderCopy(snap);
  if (screen === "home") renderHome();
  if (screen === "session") {
    renderSessionChrome();
    renderSessionOctave();
    renderNotation();
    renderPrimary();
    renderMeter(snap);
    renderMic();
    if (!liveGrade) showGrade(null);
  }
  if (screen === "wrapup") renderWrapup();
}

function applyDeepLink() {
  const params = new URLSearchParams(location.search);
  const screen = params.get("screen");
  const lessonId = params.get("lesson") || "learn-lick";
  const card = params.get("card") || "learn";
  const keyMode = params.get("keys") || "fourths";
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
    openSetup(lessonId);
    return;
  }
  if (screen === "session" || screen === "wrapup") {
    session = createSession({
      lessonId,
      keyMode,
      startKeyId: params.get("key") || prefs.lessons[lessonById(lessonId).id].startKeyId,
      cardSet: params.get("cards") || "all",
      tempo: prefs.lessons[lessonById(lessonId).id].tempo,
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
  liveGrade = result?.graded ? result : null;
  fillListenState(liveGrade);
  if (!els.gradeLine) return;
  if (!liveGrade) {
    els.gradeLine.hidden = true;
    els.gradeLine.textContent = "";
    return;
  }
  els.gradeLine.hidden = false;
  const bits = [`${liveGrade.percent}%`, liveGrade.passed ? "pass" : "not yet"];
  if (liveGrade.correction) bits.push(liveGrade.correction);
  els.gradeLine.textContent = bits.join(" · ");
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

els.displayChip.addEventListener("click", () => els.settings.showModal());
els.startLesson.addEventListener("click", (event) => {
  event.preventDefault();
  startFromSetup();
});
els.sessionExit.addEventListener("click", exitSession);
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

els.tempoDown.addEventListener("click", () => {
  setupDraft.tempo = Math.max(60, setupDraft.tempo - 4);
  renderSetup();
});
els.tempoUp.addEventListener("click", () => {
  setupDraft.tempo = Math.min(160, setupDraft.tempo + 4);
  renderSetup();
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
  if (event.code === "Space") {
    event.preventDefault();
    runPrimary();
  }
  if ((event.key === "r" || event.key === "R") && session?.screen === "session") {
    event.preventDefault();
    halt();
    start(false);
  }
  if (event.key === "Escape" && session) {
    exitSession();
  }
});

window.addEventListener("resize", () => {
  if (session?.screen === "session") renderNotation();
  else paintPathTrail();
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

applyDeepLink();
renderSetup();
render();
