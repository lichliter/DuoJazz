import {
  APPLICATIONS,
  KEYS,
  PRIMARY_KEY_IDS,
  applicationById,
  displayKey,
  getKey,
  minorSpelling,
  modelABC,
  phraseABC,
} from "./music.js";
import { Transport } from "./audio.js";
import {
  STORAGE_KEY,
  STEPS,
  getStep,
  adjacentStep,
  presentation,
  defaultState,
  audioConfigFor,
  formBars,
  barCaption,
  livePrompt,
  primaryAction,
  currentChord,
  currentAssessment,
} from "./lesson.js";

const transport = new Transport();
const state = loadState();
const playback = { playing: false, paused: false, ended: false };

const els = {
  heading: document.getElementById("heading"),
  instruction: document.getElementById("instruction"),
  steps: document.getElementById("steps"),
  applications: document.getElementById("applications"),
  applicationBlurb: document.getElementById("application-blurb"),
  music: document.getElementById("music-surface"),
  chord: document.getElementById("chord"),
  beat: document.getElementById("beat"),
  functionLabel: document.getElementById("function-label"),
  notation: document.getElementById("notation"),
  chart: document.getElementById("chart"),
  primary: document.getElementById("primary"),
  back: document.getElementById("back"),
  replay: document.getElementById("replay"),
  next: document.getElementById("next"),
  cellPractice: document.getElementById("cell-practice"),
  cellHear: document.getElementById("cell-hear"),
  cellEcho: document.getElementById("cell-echo"),
  cellBack: document.getElementById("cell-back"),
  coachWrap: document.getElementById("coach-wrap"),
  independentCoach: document.getElementById("independentCoach"),
  assess: document.getElementById("assess"),
  entranceQ: document.getElementById("entrance-q"),
  afterQ: document.getElementById("after-q"),
  pause: document.getElementById("pause"),
  restart: document.getElementById("restart"),
  tempo: document.getElementById("tempo"),
  tempoReadout: document.getElementById("tempo-readout"),
  meter: document.getElementById("meter"),
  settingsBtn: document.getElementById("settings-btn"),
  settings: document.getElementById("settings"),
  keys: document.getElementById("keys"),
  swing: document.getElementById("swing"),
  guideTones: document.getElementById("guideTones"),
  metronome: document.getElementById("metronome"),
  displayBanner: document.getElementById("display-banner"),
  triedKeys: document.getElementById("tried-keys"),
};

function loadState() {
  const base = defaultState();
  const fromHash = location.hash.replace("#", "");
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    const merged = saved ? { ...base, ...saved, assessments: { ...base.assessments, ...(saved.assessments ?? {}) } } : base;
    if (STEPS.some((step) => step.id === fromHash)) merged.step = fromHash;
    if (!APPLICATIONS.some((app) => app.id === merged.applicationId)) merged.applicationId = base.applicationId;
    return merged;
  } catch {
    if (STEPS.some((step) => step.id === fromHash)) base.step = fromHash;
    return base;
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function concertKey() {
  return getKey(state.concertKeyId);
}

function halt() {
  transport.stop();
  playback.playing = false;
  playback.paused = false;
  playback.ended = false;
}

function go(stepId) {
  if (!STEPS.some((step) => step.id === stepId)) return;
  state.step = stepId;
  if (stepId !== "hear") {
    state.lens = "context";
    state.cellMode = "hear";
  }
  persist();
  if (location.hash.replace("#", "") !== stepId) {
    history.replaceState(null, "", `#${stepId}`);
  }
  halt();
  render();
}

function start(resume = false) {
  els.primary.disabled = true;
  transport.start(audioConfigFor(state), { resume }).finally(() => {
    els.primary.disabled = false;
  });
}

function renderApplications() {
  els.applications.replaceChildren(
    ...APPLICATIONS.map((app) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = app.label;
      btn.setAttribute("aria-pressed", String(app.id === state.applicationId));
      btn.addEventListener("click", () => {
        state.applicationId = app.id;
        persist();
        halt();
        render();
      });
      return btn;
    }),
  );
  els.applicationBlurb.textContent = applicationById(state.applicationId).blurb;
}

function renderKeys() {
  const shown = [
    ...KEYS.filter((key) => PRIMARY_KEY_IDS.includes(key.id)),
    ...KEYS.filter((key) => !PRIMARY_KEY_IDS.includes(key.id)),
  ];
  els.keys.replaceChildren(
    ...shown.map((key) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "key-btn";
      btn.textContent = minorSpelling(key).shortName;
      btn.setAttribute("aria-pressed", String(key.id === state.concertKeyId));
      btn.addEventListener("click", () => {
        state.concertKeyId = key.id;
        if (!state.triedKeys.includes(key.id)) state.triedKeys.push(key.id);
        persist();
        halt();
        render();
      });
      return btn;
    }),
  );
}

function renderSteps() {
  els.steps.replaceChildren(
    ...STEPS.filter((step) => step.id !== "reflect").map((step) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "step-dot";
      btn.textContent = step.label;
      btn.setAttribute("aria-current", step.id === state.step ? "step" : "false");
      btn.addEventListener("click", () => go(step.id));
      return btn;
    }),
  );
}

function renderNotation() {
  const view = presentation(state);
  const show = view.showPhraseNotation || view.showModelNotation;
  els.notation.hidden = !show;
  if (!show) {
    els.notation.replaceChildren();
    return;
  }
  const abc = view.showModelNotation
    ? modelABC(concertKey(), state.displayMode, state.applicationId)
    : phraseABC(concertKey(), state.displayMode, state.applicationId);
  els.notation.replaceChildren();
  if (window.ABCJS) {
    window.ABCJS.renderAbc(els.notation, abc, {
      responsive: "resize",
      add_classes: true,
      paddingtop: 0,
      paddingbottom: 0,
      staffwidth: view.showModelNotation ? 820 : 760,
      scale: view.showModelNotation ? 0.95 : 1.15,
    });
  } else {
    const pre = document.createElement("pre");
    pre.textContent = abc;
    els.notation.append(pre);
  }
}

function renderChart(snap = transport.snapshot()) {
  const view = presentation(state);
  const app = applicationById(state.applicationId);
  els.chart.hidden = !view.showFormChart;
  if (!view.showFormChart) {
    els.chart.replaceChildren();
    return;
  }
  const bars = formBars(concertKey(), state.displayMode, state.applicationId);
  els.chart.classList.toggle("short", bars.length <= 2);
  const nowBar = (snap.playing || snap.paused) && !snap.inCountIn ? snap.bar : 0;
  const phraseNow = view.highlightPhraseLive && nowBar === app.phraseStartBar;
  els.chart.replaceChildren(
    ...bars.map((bar) => {
      const cell = document.createElement("article");
      const caption = barCaption(bar.bar, view.showEntranceLabels, state.applicationId);
      cell.className = "cell";
      if (view.showTargetStyling && bar.role === "phrase") cell.classList.add("entrance");
      if (phraseNow && bar.bar === app.phraseStartBar) cell.classList.add("entrance");
      if (nowBar === bar.bar) cell.classList.add("now");
      cell.innerHTML = `<span class="n">Bar ${bar.bar}</span><strong>${bar.names.join(" ")}</strong>${
        caption ? `<span class="mark">${caption}</span>` : ""
      }`;
      return cell;
    }),
  );
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
        if (!state.assessments[state.applicationId]) {
          state.assessments[state.applicationId] = currentAssessment(state);
        }
        state.assessments[state.applicationId][name] = value;
        persist();
        renderAssess();
      });
      return btn;
    }),
  );
}

function renderAssess() {
  const view = presentation(state);
  els.assess.hidden = !view.showAssessment;
  if (!view.showAssessment) return;
  const app = applicationById(state.applicationId);
  els.entranceQ.textContent = app.entranceQuestion;
  els.afterQ.textContent = app.afterQuestion;
  choiceRow("foundEntrance", "foundEntrance", [
    ["yes", "Yes"],
    ["somewhat", "Somewhat"],
    ["not-yet", "Not yet"],
  ]);
  choiceRow("keptPlaying", "keptPlaying", [
    ["yes", "Yes"],
    ["somewhat", "Somewhat"],
    ["not-yet", "Not yet"],
  ]);
  choiceRow("quoteChoice", "quoteChoice", [
    ["quote", "Quoted it"],
    ["vary", "Varied it"],
    ["skip", "Skipped it"],
  ]);
  choiceRow("recall", "recall", [
    ["yes", "Yes"],
    ["somewhat", "Somewhat"],
    ["not-yet", "Not yet"],
  ]);
  els.triedKeys.textContent = `Key coverage (optional, not a gate): ${state.triedKeys
    .map((id) => minorSpelling(getKey(id)).shortName)
    .join(", ")} · this check-in is for ${app.label} only`;
}

function renderNow(snap = transport.snapshot()) {
  const view = presentation(state);
  const app = applicationById(state.applicationId);
  els.music.hidden = !view.showMusic;
  const beats = snap.beats ?? 0;
  const chord = currentChord(concertKey(), state.displayMode, state, beats);
  els.chord.textContent = chord?.name ?? "—";
  const phraseNow = (snap.playing || snap.paused) && !snap.inCountIn && snap.bar === app.phraseStartBar && view.lens === "context";
  els.functionLabel.textContent = phraseNow ? app.phraseFunctionLabel : (chord ? chord.functionLabel : "");
  if (snap.inCountIn) {
    els.beat.textContent = "Count-in";
  } else if (snap.playing || snap.paused) {
    els.beat.textContent = view.lens === "cell"
      ? `Cell · Beat ${snap.beatInBar}`
      : `Bar ${snap.bar} · Beat ${snap.beatInBar}`;
  } else if (view.lens === "cell") {
    els.beat.textContent = "Cry Me a River cell";
  } else {
    els.beat.textContent = "Bar 1 · Beat 1";
  }
}

function renderPrimary() {
  const action = primaryAction(state, playback);
  els.primary.hidden = !action;
  if (action) {
    els.primary.dataset.action = action.id;
    els.primary.textContent = action.label;
  }
  const step = getStep(state.step);
  const view = presentation(state);
  els.back.hidden = state.step === "hear" && view.lens === "context";
  els.next.hidden = state.step === "reflect";
  els.next.textContent = step.nextLabel || "Continue";
  els.replay.hidden = state.step === "reflect";
  els.cellPractice.hidden = !view.allowCellLens;
  els.cellHear.hidden = !view.allowCellLens;
  els.cellEcho.hidden = !view.allowCellLens;
  els.cellBack.hidden = !view.allowCellLens || view.lens !== "cell";
}

function renderCopy(snap = transport.snapshot()) {
  const step = getStep(state.step);
  const view = presentation(state);
  document.body.dataset.step = state.step;
  document.body.dataset.lens = view.lens;
  els.heading.textContent = view.lens === "cell"
    ? (state.cellMode === "echo" ? "Echo the cell" : "Hear the cell")
    : step.heading;
  els.instruction.textContent = livePrompt(state, snap);
  els.independentCoach.checked = state.independentCoach;
  els.coachWrap.hidden = !view.allowIndependentCoach;
  els.swing.checked = state.swing;
  els.guideTones.checked = state.guideTones;
  els.metronome.checked = state.metronome;
  els.tempo.value = String(state.tempo);
  els.tempoReadout.textContent = String(state.tempo);
  const written = displayKey(concertKey(), state.displayMode);
  const concert = minorSpelling(concertKey());
  els.displayBanner.textContent =
    state.displayMode === "bb-written"
      ? `Showing B♭ written names in ${written.name}. Audio is concert ${concert.name}.`
      : `Showing concert pitch in ${concert.name}.`;
  document.querySelectorAll("[name=displayMode]").forEach((input) => {
    input.checked = input.value === state.displayMode;
  });
}

function renderMeter(snap = transport.snapshot()) {
  const concert = minorSpelling(concertKey());
  if (snap.inCountIn) {
    els.meter.textContent = `Count-in · ${Math.max(1, Math.ceil(-snap.beats))}`;
    return;
  }
  if (snap.playing) {
    els.meter.textContent = `Playing · bar ${snap.bar} beat ${snap.beatInBar} · concert ${concert.name}`;
    return;
  }
  if (snap.paused) {
    els.meter.textContent = `Paused · bar ${snap.bar} beat ${snap.beatInBar}`;
    return;
  }
  els.meter.textContent = playback.ended ? "Ready to continue" : "Stopped · 1-bar count-in on Start";
}

function render(snap = transport.snapshot()) {
  renderApplications();
  renderKeys();
  renderSteps();
  renderCopy(snap);
  renderNow(snap);
  renderNotation();
  renderChart(snap);
  renderAssess();
  renderPrimary();
  renderMeter(snap);
}

function runPrimary() {
  const action = primaryAction(state, playback);
  if (!action) return;
  if (action.id === "pause") transport.pause();
  else if (action.id === "resume") start(true);
  else if (action.id === "next") go(adjacentStep(state.step, 1));
  else start(false);
}

function openCell(mode) {
  state.lens = "cell";
  state.cellMode = mode;
  persist();
  halt();
  render();
  start(false);
}

transport.onUpdate = (snap) => {
  playback.playing = snap.playing;
  playback.paused = snap.paused;
  playback.ended = Boolean(snap.ended);
  renderNow(snap);
  renderChart(snap);
  renderCopy(snap);
  renderPrimary();
  renderMeter(snap);
};

transport.onEnded = () => {
  playback.playing = false;
  playback.paused = false;
  playback.ended = true;
  renderPrimary();
  renderMeter(transport.snapshot());
};

els.primary.addEventListener("click", runPrimary);
els.back.addEventListener("click", () => {
  if (presentation(state).lens === "cell") {
    state.lens = "context";
    state.cellMode = "hear";
    persist();
    halt();
    render();
    return;
  }
  go(adjacentStep(state.step, -1));
});
els.next.addEventListener("click", () => go(adjacentStep(state.step, 1)));
els.replay.addEventListener("click", () => {
  halt();
  start(false);
});
els.cellHear.addEventListener("click", () => openCell("hear"));
els.cellEcho.addEventListener("click", () => openCell("echo"));
els.cellBack.addEventListener("click", () => {
  state.lens = "context";
  state.cellMode = "hear";
  persist();
  halt();
  render();
});
els.pause.addEventListener("click", () => {
  if (transport.playing) transport.pause();
});
els.restart.addEventListener("click", () => {
  halt();
  if (state.step !== "reflect") start(false);
});
els.tempo.addEventListener("input", () => {
  state.tempo = Number(els.tempo.value);
  els.tempoReadout.textContent = String(state.tempo);
});
els.tempo.addEventListener("change", () => {
  persist();
  halt();
  render();
});
els.settingsBtn.addEventListener("click", () => els.settings.showModal());
els.independentCoach.addEventListener("change", () => {
  state.independentCoach = els.independentCoach.checked;
  persist();
  halt();
  render();
});

document.querySelectorAll("[name=displayMode]").forEach((input) => {
  input.addEventListener("change", () => {
    state.displayMode = input.value;
    persist();
    halt();
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
  });
}

document.addEventListener("keydown", (event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
  if (event.code === "Space") {
    event.preventDefault();
    runPrimary();
  }
  if (event.key === "ArrowRight") go(adjacentStep(state.step, 1));
  if (event.key === "ArrowLeft") go(adjacentStep(state.step, -1));
  if (event.key === "r" || event.key === "R") {
    event.preventDefault();
    halt();
    if (state.step !== "reflect") start(false);
  }
});

window.addEventListener("hashchange", () => {
  const id = location.hash.replace("#", "");
  if (STEPS.some((step) => step.id === id) && id !== state.step) go(id);
});

window.addEventListener("load", render);
render();
