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
  skipCard,
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
} from "./session.js";

const transport = new Transport();
const playback = { playing: false, paused: false, ended: false };
let prefs = loadPrefs();
let setupLessonId = recommendedLessonId(prefs);
let setupDraft = { ...prefs.lessons[setupLessonId] };
let session = null;
let lastTune = null;
let lastNotationLayout = null;

const els = {
  shell: document.getElementById("app-shell"),
  masthead: document.getElementById("masthead"),
  home: document.getElementById("screen-home"),
  session: document.getElementById("screen-session"),
  wrapup: document.getElementById("screen-wrapup"),
  keyStrip: document.getElementById("key-strip"),
  lessonList: document.getElementById("lesson-list"),
  displayChip: document.getElementById("display-chip"),
  settings: document.getElementById("settings"),
  setup: document.getElementById("setup"),
  setupTitle: document.getElementById("setup-title"),
  setupSummary: document.getElementById("setup-summary"),
  keyModes: document.getElementById("key-modes"),
  setupKeys: document.getElementById("setup-keys"),
  cardSets: document.getElementById("card-sets"),
  setupRegister: document.getElementById("setup-register"),
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
  medalMark: document.getElementById("medal-mark"),
  medalNote: document.getElementById("medal-note"),
  wrapupKicker: document.getElementById("wrapup-kicker"),
  wrapupHeading: document.getElementById("wrapup-heading"),
  wrapupDetail: document.getElementById("wrapup-detail"),
  wrapupMedalMark: document.getElementById("wrapup-medal-mark"),
  wrapupMedal: document.getElementById("wrapup-medal"),
  resultList: document.getElementById("result-list"),
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
  playback.playing = false;
  playback.paused = false;
  playback.ended = false;
}

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
  session = createSession({
    lessonId: setupLessonId,
    ...setupDraft,
    displayMode: prefs.displayMode,
    clef: prefs.clef,
    swing: prefs.swing,
    metronome: prefs.metronome,
    guideTones: prefs.guideTones,
  });
  closeSetup();
  render();
}

function exitSession() {
  halt();
  session = null;
  render();
}

function applySession(next, { autoStart = false } = {}) {
  session = next;
  persist();
  render();
  if (autoStart && session?.screen === "session") start(false);
}

function start(resume = false) {
  if (!session || session.screen !== "session") return;
  els.primary.disabled = true;
  transport.start(sessionAudioConfig(session), { resume }).finally(() => {
    els.primary.disabled = false;
  });
}

function runPrimary() {
  if (!session || session.screen !== "session") return;
  const action = sessionPrimaryAction(session, playback);
  if (!action) return;
  if (action.id === "pause") transport.pause();
  else if (action.id === "resume") start(true);
  else start(false);
}

function goContinue() {
  if (!session || session.screen !== "session") return;
  halt();
  applySession(skipCard(session));
}

function lessonKeysPassed(lessonId) {
  return prefs.progress?.[lessonId]?.keysPassed ?? 0;
}

function renderHome() {
  const recommended = recommendedLessonId(prefs);
  if (els.medalMark) els.medalMark.textContent = "Medal";
  if (els.medalNote) {
    els.medalNote.textContent = "Medal progress arrives with audio grading.";
  }
  els.keyStrip.replaceChildren(
    ...TWELVE_KEY_IDS.map((id) => {
      const span = document.createElement("span");
      span.className = "key-dot";
      span.textContent = getKey(id).name;
      span.title = displayKeyName(id, prefs.displayMode);
      return span;
    }),
  );
  els.lessonList.replaceChildren(
    ...LESSONS.map((lesson, index) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lesson-row";
      btn.dataset.testid = `lesson-${lesson.id}`;
      btn.dataset.recommended = String(lesson.id === recommended);
      const passed = lessonKeysPassed(lesson.id);
      const countLabel = `${passed} ${passed === 1 ? "key" : "keys"} passed`;
      btn.innerHTML = `<span class="n">${String(index + 1).padStart(2, "0")}${lesson.id === recommended ? " · next" : ""}</span><span class="title">${lesson.title}</span><span class="sub">${lesson.summary}</span><span class="lesson-meta"><span class="count">${countLabel}</span><span class="medal-slot"></span></span>`;
      btn.addEventListener("click", () => openSetup(lesson.id));
      return btn;
    }),
  );
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
  els.setupRegister.replaceChildren(
    ...MELODY_REGISTERS.map((option) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = option.id === 0 ? "Original" : option.id === 1 ? "+1" : "−1";
      btn.setAttribute("aria-pressed", String(option.id === setupDraft.melodyRegister));
      btn.addEventListener("click", () => {
        setupDraft.melodyRegister = option.id;
        renderSetup();
      });
      return btn;
    }),
  );
  els.tempoReadout.textContent = String(setupDraft.tempo);
}

function renderSessionChrome() {
  const card = currentCard(session);
  const ordinal = keyOrdinal(session);
  const total = session.cards.length;
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

function applyRhythmSlashes() {
  const svg = els.notation.querySelector("svg");
  if (!svg) return;
  const ns = "http://www.w3.org/2000/svg";
  for (const note of els.notation.querySelectorAll(".abcjs-note")) {
    const head = note.querySelector(".abcjs-notehead")
      ?? [...note.querySelectorAll("ellipse, path")].find((node) => !isCueNode(node));
    if (!head || typeof head.getBBox !== "function") continue;
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

function ensurePlayhead(svg) {
  const ns = "http://www.w3.org/2000/svg";
  let line = svg.querySelector("#playhead");
  let glow = svg.querySelector("#bar-glow");
  if (!glow) {
    glow = document.createElementNS(ns, "rect");
    glow.id = "bar-glow";
    glow.setAttribute("fill", "rgba(96, 57, 45, 0.14)");
    svg.insertBefore(glow, svg.firstChild);
  }
  if (!line) {
    line = document.createElementNS(ns, "line");
    line.id = "playhead";
    line.setAttribute("stroke", "#60392d");
    line.setAttribute("stroke-width", "2");
    svg.append(line);
  }
  return { line, glow };
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
  const minWidth = Math.max(400, Math.round(fullWidth * (layout.minEngravingRatio ?? 0.4)));
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
      abcWithStaffsep(abc, layout.fillAxis === "staffsep" ? staffsep : 0),
      abcRenderOptions({ ...layout, staffsep }, staffwidth, scale),
    )[0];
    const svg = els.notation.querySelector("svg");
    const height = svg ? svg.getBoundingClientRect().height : 0;
    if (!layout.fitToPaper || !target) break;
    if (layout.fillAxis === "staffsep") {
      const nextSep = nextStaffsep(staffsep, height, target);
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
  lastNotationLayout = { ...layout, scale, staffwidth, staffsep };
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
  const listenCopy = listenStateCopy(session);
  els.hiddenAnswer.hidden = !hideStaff;
  els.hiddenAnswer.textContent = currentCard(session) === "quiz" ? "From memory" : "Use your ears";
  if (els.listenState) {
    els.listenState.hidden = !listenCopy;
    if (listenCopy) {
      els.listenKicker.textContent = listenCopy.kicker;
      els.listenDetail.textContent = listenCopy.detail;
    }
  }
  els.notation.hidden = hideStaff;
  els.session.dataset.card = currentCard(session);
  els.notation.classList.toggle("slash", Boolean(view.showSlashNotation));
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
  lastNotationLayout = layout;
  const concertKey = getKey(currentKeyId(session));
  const abc = view.showModelNotation
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
    if (view.showSlashNotation) applyRhythmSlashes();
    restyleAnnotations();
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
  return row.outcome === "completed" ? "Completed" : row.outcome;
}

function renderWrapup() {
  const copy = wrapupCopy(session);
  if (els.wrapupKicker) els.wrapupKicker.textContent = copy.kicker;
  els.wrapupHeading.textContent = copy.heading;
  els.wrapupDetail.textContent = copy.detail;
  els.resultList.replaceChildren(
    ...copy.results.map((row) => {
      const item = document.createElement("li");
      item.innerHTML = `<span>${row.label}</span><span class="outcome">${resultLabel(row)}</span>`;
      return item;
    }),
  );
  if (els.wrapupMedalMark) els.wrapupMedalMark.textContent = "Medal";
  if (els.wrapupMedal) {
    els.wrapupMedal.hidden = false;
    els.wrapupMedal.textContent = "Medal progress arrives with audio grading.";
  }
  els.nextKey.hidden = !copy.nextKeyLabel;
  if (copy.nextKeyLabel) els.nextKey.textContent = copy.nextKeyLabel;
}

function render(snap = transport.snapshot()) {
  const screen = screenName();
  els.shell.dataset.screen = screen;
  els.home.setAttribute("aria-hidden", String(screen !== "home"));
  els.session.setAttribute("aria-hidden", String(screen !== "session"));
  els.wrapup.setAttribute("aria-hidden", String(screen !== "wrapup"));
  document.title = screen === "home" ? `DuoJazz · ${MODULE.name}` : `DuoJazz · ${MODULE.name} session`;
  renderCopy(snap);
  if (screen === "home") renderHome();
  if (screen === "session") {
    renderSessionChrome();
    renderNotation();
    renderPrimary();
    renderMeter(snap);
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

transport.onEnded = () => {
  playback.playing = false;
  playback.paused = false;
  playback.ended = true;
  if (!session || session.screen !== "session") return;
  const result = handlePlaybackEnded(session);
  applySession(result.session, { autoStart: result.autoStart });
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
});

window.__DUOJAZZ__ = {
  getPrefs: () => prefs,
  getSession: () => session,
  openSetup,
  startFromSetup,
  createAndShow(options) {
    halt();
    session = createSession({
      displayMode: prefs.displayMode,
      clef: prefs.clef,
      swing: prefs.swing,
      metronome: prefs.metronome,
      guideTones: prefs.guideTones,
      ...options,
    });
    render();
    return session;
  },
  jumpToCard(cardId) {
    if (!session) return null;
    halt();
    session = jumpToCard(session, cardId);
    render();
    return session;
  },
  jumpToWrapup() {
    if (!session) return null;
    halt();
    session = jumpToWrapup(session);
    render();
    return session;
  },
  completeCard() {
    if (!session) return null;
    halt();
    session = completeCard(session);
    render();
    return session;
  },
};

applyDeepLink();
renderSetup();
render();
