import {
  APPLICATIONS,
  KEYS,
  MELODY_REGISTERS,
  PRIMARY_KEY_IDS,
  chorusStaffABC,
  displayKey,
  getKey,
  minorSpelling,
  normalizeMelodyRegister,
  phraseABC,
  applicationContext,
  supportBlurb,
} from "./music.js";
import { Transport } from "./audio.js";
import {
  STORAGE_KEY,
  GOALS,
  SUPPORTS,
  CHECK_KINDS,
  LEGACY_STEPS,
  goalById,
  presentation,
  defaultState,
  normalizeState,
  audioConfigFor,
  livePrompt,
  primaryAction,
  currentAssessment,
  assessmentKey,
  chartCopy,
  afterRoundActions,
} from "./lesson.js";

const transport = new Transport();
const state = loadState();
const playback = { playing: false, paused: false, ended: false };
let lastTune = null;

const els = {
  heading: document.getElementById("heading"),
  kicker: document.getElementById("kicker"),
  instruction: document.getElementById("instruction"),
  goals: document.getElementById("goals"),
  applicationPanel: document.getElementById("application-panel"),
  applications: document.getElementById("applications"),
  applicationBlurb: document.getElementById("application-blurb"),
  music: document.getElementById("music-surface"),
  notation: document.getElementById("notation"),
  hiddenAnswer: document.getElementById("hidden-answer"),
  chartTitle: document.getElementById("chart-title"),
  chartMeta: document.getElementById("chart-meta"),
  supports: document.getElementById("supports"),
  cellLink: document.getElementById("cell-link"),
  register: document.getElementById("register"),
  primary: document.getElementById("primary"),
  afterRound: document.getElementById("after-round"),
  afterActions: document.getElementById("after-actions"),
  miniAssess: document.getElementById("mini-assess"),
  entranceQ: document.getElementById("entrance-q"),
  afterQ: document.getElementById("after-q"),
  keyPanel: document.getElementById("key-panel"),
  keys: document.getElementById("keys"),
  settingsKeys: document.getElementById("settings-keys"),
  checkPanel: document.getElementById("check-panel"),
  checkKind: document.getElementById("check-kind"),
  restart: document.getElementById("restart"),
  loopBtn: document.getElementById("loop-btn"),
  tempoReadout: document.getElementById("tempo-readout"),
  tempoDown: document.getElementById("tempo-down"),
  tempoUp: document.getElementById("tempo-up"),
  meter: document.getElementById("meter"),
  settingsBtn: document.getElementById("settings-btn"),
  displayChip: document.getElementById("display-chip"),
  settings: document.getElementById("settings"),
  swing: document.getElementById("swing"),
  guideTones: document.getElementById("guideTones"),
  metronome: document.getElementById("metronome"),
  displayBanner: document.getElementById("display-banner"),
  tuneDetail: document.getElementById("tune-detail"),
};

function loadState() {
  const base = defaultState();
  const fromHash = location.hash.replace("#", "");
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    const merged = saved ? normalizeState({ ...base, ...saved, assessments: { ...base.assessments, ...(saved.assessments ?? {}) } }) : base;
    applyHash(merged, fromHash);
    return merged;
  } catch {
    applyHash(base, fromHash);
    return base;
  }
}

function applyHash(target, fromHash) {
  if (GOALS.some((goal) => goal.id === fromHash)) target.goal = fromHash;
  else if (LEGACY_STEPS[fromHash]) Object.assign(target, LEGACY_STEPS[fromHash]);
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function concertKey() {
  return getKey(state.concertKeyId);
}

function ctx() {
  return applicationContext(concertKey(), state.displayMode, state.applicationId);
}

function halt() {
  transport.stop();
  playback.playing = false;
  playback.paused = false;
  playback.ended = false;
}

function applyMelodyRegister(value) {
  const next = normalizeMelodyRegister(value);
  if (next === state.melodyRegister) return;
  const wasPlaying = playback.playing;
  state.melodyRegister = next;
  persist();
  halt();
  render();
  if (wasPlaying) start(false);
}

function goGoal(goalId, extra = {}) {
  if (!GOALS.some((goal) => goal.id === goalId)) return;
  Object.assign(state, extra);
  state.goal = goalId;
  if (goalId !== "check") state.revealed = false;
  if (goalId === "learn" || goalId === "keys") state.cellMode = extra.cellMode ?? "hear";
  persist();
  if (location.hash.replace("#", "") !== goalId) {
    history.replaceState(null, "", `#${goalId}`);
  }
  halt();
  render();
}

function setKey(id) {
  state.concertKeyId = id;
  if (!state.triedKeys.includes(id)) state.triedKeys.push(id);
  persist();
  halt();
  render();
}

function start(resume = false) {
  els.primary.disabled = true;
  if (!resume) {
    playback.ended = false;
    els.afterRound.hidden = true;
  }
  transport.start(audioConfigFor(state), { resume }).finally(() => {
    els.primary.disabled = false;
  });
}

function renderGoals() {
  els.goals.replaceChildren(
    ...GOALS.map((goal) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "goal";
      btn.textContent = goal.label;
      btn.setAttribute("aria-current", goal.id === state.goal ? "page" : "false");
      btn.addEventListener("click", () => goGoal(goal.id));
      return btn;
    }),
  );
}

function renderApplications() {
  const view = presentation(state);
  const current = ctx();
  els.applicationPanel.hidden = !view.showApplications;
  if (!view.showApplications) {
    els.applications.replaceChildren();
    els.applicationBlurb.textContent = "";
    return;
  }
  els.applications.replaceChildren(
    ...APPLICATIONS.map((app, index) => {
      const info = applicationContext(concertKey(), state.displayMode, app.id);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "app-tab";
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", String(app.id === state.applicationId));
      const placement = view.showApplicationPlacement
        ? `<span class="sub">${info.placement}</span>`
        : "";
      btn.innerHTML = `<span class="n">${String(index + 1).padStart(2, "0")}</span>${app.label}${placement}`;
      btn.addEventListener("click", () => {
        state.applicationId = app.id;
        persist();
        halt();
        render();
      });
      return btn;
    }),
  );
  if (!view.showAnswerContext) {
    els.applicationBlurb.hidden = true;
    els.applicationBlurb.textContent = "";
    return;
  }
  els.applicationBlurb.hidden = false;
  els.applicationBlurb.textContent = state.goal === "integrate"
    ? supportBlurb(concertKey(), state.displayMode, state.applicationId, view.supportId)
    : current.shapeOver;
}

function renderSupports() {
  const view = presentation(state);
  els.cellLink.hidden = state.goal === "check";
  els.cellLink.textContent = state.goal === "integrate" ? "Just the cell" : "Use in a solo";
  if (state.goal === "learn" || state.goal === "keys") {
    els.supports.hidden = false;
    els.supports.replaceChildren(
      ...[
        ["hear", "Hear"],
        ["echo", "Echo"],
      ].map(([id, label]) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "support";
        btn.textContent = label;
        btn.setAttribute("aria-selected", String(state.cellMode === id));
        btn.addEventListener("click", () => {
          state.cellMode = id;
          persist();
          halt();
          render();
        });
        return btn;
      }),
    );
    return;
  }
  els.supports.hidden = !view.showSupportModes;
  if (!view.showSupportModes) {
    els.supports.replaceChildren();
    return;
  }
  els.supports.replaceChildren(
    ...SUPPORTS.map((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "support";
      btn.textContent = item.label;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", String(item.id === state.support));
      btn.addEventListener("click", () => {
        state.support = item.id;
        delete state.looping;
        persist();
        halt();
        render();
      });
      return btn;
    }),
  );
}

function renderRegister() {
  els.register.replaceChildren(
    ...MELODY_REGISTERS.map((option) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = option.id === 0 ? "Original" : option.id === 1 ? "+1" : "−1";
      btn.setAttribute("aria-pressed", String(option.id === state.melodyRegister));
      btn.addEventListener("click", () => applyMelodyRegister(option.id));
      return btn;
    }),
  );
}

function keyButtons(host) {
  const shown = [
    ...KEYS.filter((key) => PRIMARY_KEY_IDS.includes(key.id)),
    ...KEYS.filter((key) => !PRIMARY_KEY_IDS.includes(key.id)),
  ];
  host.replaceChildren(
    ...shown.map((key) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "key-btn";
      btn.textContent = minorSpelling(key).shortName;
      btn.setAttribute("aria-pressed", String(key.id === state.concertKeyId));
      btn.addEventListener("click", () => setKey(key.id));
      return btn;
    }),
  );
}

function renderKeys() {
  const view = presentation(state);
  els.keyPanel.hidden = !view.showKeyPicker;
  keyButtons(els.keys);
  keyButtons(els.settingsKeys);
}

function renderCheck() {
  const view = presentation(state);
  els.checkPanel.hidden = !view.showCheckSetup;
  if (!view.showCheckSetup) {
    els.checkKind.replaceChildren();
    return;
  }
  els.checkKind.replaceChildren(
    ...CHECK_KINDS.map((kind) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = kind.label;
      btn.setAttribute("aria-pressed", String(kind.id === state.checkKind));
      btn.addEventListener("click", () => {
        state.checkKind = kind.id;
        state.revealed = false;
        persist();
        halt();
        render();
      });
      return btn;
    }),
    revealButton(),
  );
}

function revealButton() {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "chip";
  btn.textContent = state.revealed ? "Hide answer" : "Reveal answer";
  btn.setAttribute("aria-pressed", String(state.revealed));
  btn.addEventListener("click", () => {
    state.revealed = !state.revealed;
    persist();
    render();
  });
  return btn;
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

function restyleAnnotations() {
  for (const el of els.notation.querySelectorAll(".abcjs-annotation")) {
    el.style.fontSize = "15px";
    el.style.fontWeight = "700";
    el.style.opacity = "1";
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
    slash.setAttribute("stroke-width", "1.85");
    slash.setAttribute("stroke-linecap", "round");
    slash.setAttribute("opacity", "1");
    note.append(slash);
  }
  for (const el of els.notation.querySelectorAll(".abcjs-chord, .abcjs-annotation")) {
    el.style.opacity = "1";
    el.removeAttribute("opacity");
  }
  for (const el of els.notation.querySelectorAll(".abcjs-annotation")) {
    el.style.fontSize = "15px";
    el.style.fontWeight = "700";
  }
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
  if (!svg) return;
  const { line, glow } = ensurePlayhead(svg);
  const staffs = [...els.notation.querySelectorAll(".abcjs-staff")];
  const active = (snap.playing || snap.paused) && !snap.inCountIn && staffs.length;
  if (!active) {
    line.setAttribute("opacity", "0");
    glow.setAttribute("opacity", "0");
    return;
  }
  const view = presentation(state);
  const barsOnStaff = view.audioStage === "learn" ? 2 : 4;
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

function renderNotation() {
  const view = presentation(state);
  const copy = chartCopy(state);
  els.chartTitle.textContent = copy.title;
  els.chartMeta.textContent = copy.meta;
  const hideStaff = Boolean(view.hideAnswers && !view.showSlashNotation && !view.showPhraseNotation && !view.showModelNotation);
  els.hiddenAnswer.hidden = !hideStaff;
  els.notation.hidden = hideStaff;
  els.notation.classList.toggle("slash", Boolean(view.showSlashNotation));
  if (hideStaff) {
    els.notation.replaceChildren();
    lastTune = null;
    return;
  }
  const abc = view.showModelNotation
    ? chorusStaffABC({
      concertKey: concertKey(),
      displayMode: state.displayMode,
      applicationId: state.applicationId,
      clef: state.clef,
      melodyRegister: state.melodyRegister,
      mode: "model",
      showCues: view.showEntranceCues,
    })
    : view.showSlashNotation
      ? chorusStaffABC({
        concertKey: concertKey(),
        displayMode: state.displayMode,
        applicationId: state.applicationId,
        clef: state.clef,
        mode: "slash",
        showCues: view.showEntranceCues,
      })
      : phraseABC(concertKey(), state.displayMode, state.applicationId, state.clef, state.melodyRegister);
  els.notation.replaceChildren();
  if (window.ABCJS) {
    const width = staffWidth();
    const narrow = width < 520;
    lastTune = window.ABCJS.renderAbc(els.notation, abc, {
      add_classes: true,
      paddingtop: view.showPhraseNotation ? 8 : 28,
      paddingbottom: view.showEntranceCues ? 32 : 12,
      staffwidth: width - 24,
      scale: view.showPhraseNotation ? (narrow ? 1.18 : 1.35) : (narrow ? 0.94 : 1.08),
      jazzchords: true,
      format: {
        chordfont: "Source Sans 3 15",
        annotationfont: "Source Sans 3 13",
      },
      wrap: view.showPhraseNotation
        ? undefined
        : { minSpacing: 1.45, maxSpacing: 2.6, preferredMeasuresPerLine: 4, staffwidth: width - 24 },
    })[0];
    if (view.showSlashNotation) applyRhythmSlashes();
    restyleAnnotations();
    updatePlayhead();
  } else {
    const pre = document.createElement("pre");
    pre.textContent = abc;
    els.notation.append(pre);
  }
}

function choiceRow(containerId, name, options) {
  const host = document.getElementById(containerId);
  const marks = currentAssessment(state);
  host.replaceChildren(
    ...options.map(([value, label]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = label;
      btn.setAttribute("aria-pressed", String(marks[name] === value));
      btn.addEventListener("click", () => {
        const key = assessmentKey(state);
        state.assessments[key] = { ...currentAssessment(state), [name]: value };
        persist();
        renderAfter();
      });
      return btn;
    }),
  );
}

function renderAfter(force = false) {
  const view = presentation(state);
  const show = force || playback.ended;
  els.afterRound.hidden = !view.showAfterRound || !show;
  if (els.afterRound.hidden) return;
  const current = ctx();
  els.entranceQ.textContent = current.entranceQuestion;
  els.afterQ.textContent = current.afterQuestion;
  els.miniAssess.hidden = false;
  els.afterActions.replaceChildren(
    ...afterRoundActions(state).map((action) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = action.label;
      btn.addEventListener("click", () => runAfter(action.id));
      return btn;
    }),
  );
  choiceRow("foundEntrance", "foundEntrance", [["yes", "Yes"], ["somewhat", "Somewhat"], ["not-yet", "Not yet"]]);
  choiceRow("keptPlaying", "keptPlaying", [["yes", "Yes"], ["somewhat", "Somewhat"], ["not-yet", "Not yet"]]);
  choiceRow("quoteChoice", "quoteChoice", [["quote", "Quoted it"], ["vary", "Varied it"], ["skip", "Skipped it"]]);
  choiceRow("recall", "recall", [["yes", "Yes"], ["somewhat", "Somewhat"], ["not-yet", "Not yet"]]);
}

function runAfter(id) {
  if (id === "repeat") {
    halt();
    start(false);
    return;
  }
  if (id === "learn") {
    goGoal("learn");
    return;
  }
  if (id === "keys") {
    goGoal("keys");
    return;
  }
  if (id === "help" || id === "free" || id === "listen") {
    state.support = id;
    persist();
    halt();
    render();
    start(false);
  }
}

function renderCopy(snap = transport.snapshot()) {
  const view = presentation(state);
  const goal = goalById(state.goal);
  const current = ctx();
  const written = displayKey(concertKey(), state.displayMode);
  const concert = minorSpelling(concertKey());
  const clefLabel = state.clef === "bass" ? "Bass clef" : "Treble clef";
  document.body.dataset.goal = state.goal;
  document.body.dataset.support = view.supportId;
  els.kicker.textContent = goal.kicker;
  els.heading.textContent = goal.heading;
  els.tuneDetail.textContent = `Opening eight bars · ${concert.name}`;
  els.instruction.textContent = livePrompt(state, snap);
  els.swing.checked = state.swing;
  els.guideTones.checked = state.guideTones;
  els.metronome.checked = state.metronome;
  els.tempoReadout.textContent = String(state.tempo);
  els.displayChip.textContent = `${state.displayMode === "bb-written" ? "B♭ written" : "Concert"} · ${clefLabel}`;
  els.displayBanner.textContent =
    state.displayMode === "bb-written"
      ? `${clefLabel}, B♭ written names in ${written.name}. Audio is concert ${concert.name}; clef does not transpose.`
      : `Concert ${clefLabel.toLowerCase()} in ${concert.name}. Audio matches this octave; clef does not transpose.`;
  document.querySelectorAll("[name=displayMode]").forEach((input) => {
    input.checked = input.value === state.displayMode;
  });
  document.querySelectorAll("[name=clef]").forEach((input) => {
    input.checked = input.value === state.clef;
  });
  void current;
}

function renderPrimary() {
  const action = primaryAction(state, playback);
  els.primary.hidden = !action;
  if (action) {
    els.primary.dataset.action = action.id;
    els.primary.textContent = action.label;
  }
}

function meterExtras() {
  const bits = ["1-bar count-in", state.swing ? "Swing on" : "Swing off"];
  if (presentation(state).looping) bits.push("Loop on");
  return bits.join(" · ");
}

function renderMeter(snap = transport.snapshot()) {
  const concert = minorSpelling(concertKey());
  els.loopBtn.setAttribute("aria-pressed", String(presentation(state).looping));
  els.loopBtn.textContent = presentation(state).looping ? "Loop on" : "Loop off";
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
  els.meter.textContent = playback.ended ? "Ready when you are" : meterExtras();
}

function render(snap = transport.snapshot()) {
  renderGoals();
  renderApplications();
  renderSupports();
  renderRegister();
  renderKeys();
  renderCheck();
  renderCopy(snap);
  renderNotation();
  renderPrimary();
  renderMeter(snap);
  renderAfter(playback.ended);
}

function runPrimary() {
  const action = primaryAction(state, playback);
  if (!action) return;
  if (action.id === "pause") transport.pause();
  else if (action.id === "resume") start(true);
  else start(false);
}

function nudgeTempo(delta) {
  state.tempo = Math.min(160, Math.max(60, state.tempo + delta));
  persist();
  halt();
  render();
}

transport.onUpdate = (snap) => {
  playback.playing = snap.playing;
  playback.paused = snap.paused;
  playback.ended = Boolean(snap.ended);
  renderCopy(snap);
  renderPrimary();
  renderMeter(snap);
  updatePlayhead(snap);
};

transport.onEnded = () => {
  playback.playing = false;
  playback.paused = false;
  playback.ended = true;
  renderPrimary();
  renderMeter(transport.snapshot());
  updatePlayhead(transport.snapshot());
  renderAfter(true);
};

els.primary.addEventListener("click", runPrimary);
els.cellLink.addEventListener("click", () => {
  if (state.goal === "learn") goGoal("integrate");
  else goGoal("learn");
});
els.restart.addEventListener("click", () => {
  halt();
  start(false);
});
els.loopBtn.addEventListener("click", () => {
  state.looping = !presentation(state).looping;
  persist();
  if (transport.playing) transport.looping = state.looping;
  renderMeter();
});
els.tempoDown.addEventListener("click", () => nudgeTempo(-4));
els.tempoUp.addEventListener("click", () => nudgeTempo(4));
els.settingsBtn.addEventListener("click", () => els.settings.showModal());
els.displayChip.addEventListener("click", () => els.settings.showModal());

document.querySelectorAll("[name=displayMode]").forEach((input) => {
  input.addEventListener("change", () => {
    state.displayMode = input.value;
    persist();
    halt();
    render();
  });
});

document.querySelectorAll("[name=clef]").forEach((input) => {
  input.addEventListener("change", () => {
    state.clef = input.value === "treble" ? "treble" : "bass";
    persist();
    render();
  });
});

for (const [id, key] of [
  ["swing", "swing"],
  ["guideTones", "guideTones"],
  ["metronome", "metronome"],
]) {
  els[id].addEventListener("change", () => {
    state[key] = els[id].checked;
    persist();
    halt();
    renderMeter();
  });
}

document.addEventListener("keydown", (event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
  if (event.code === "Space") {
    event.preventDefault();
    runPrimary();
  }
  if (event.key === "r" || event.key === "R") {
    event.preventDefault();
    halt();
    start(false);
  }
});

window.addEventListener("hashchange", () => {
  const id = location.hash.replace("#", "");
  if (GOALS.some((goal) => goal.id === id) && id !== state.goal) goGoal(id);
  else if (LEGACY_STEPS[id]) {
    Object.assign(state, LEGACY_STEPS[id]);
    persist();
    halt();
    render();
  }
});

window.addEventListener("resize", () => renderNotation());
window.addEventListener("load", render);
render();
