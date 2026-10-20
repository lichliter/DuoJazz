import { KEYS, PRIMARY_KEY_IDS, phraseABC, getKey, displayKey } from "./music.js";
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
} from "./lesson.js";

const transport = new Transport();
const state = loadState();
const playback = { playing: false, paused: false, ended: false };

const els = {
  heading: document.getElementById("heading"),
  instruction: document.getElementById("instruction"),
  steps: document.getElementById("steps"),
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
  coachWrap: document.getElementById("coach-wrap"),
  independentCoach: document.getElementById("independentCoach"),
  assess: document.getElementById("assess"),
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
    const merged = saved ? { ...base, ...saved } : base;
    if (STEPS.some((step) => step.id === fromHash)) merged.step = fromHash;
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
      btn.textContent = key.name;
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
  const view = presentation(state.step);
  els.notation.hidden = !view.showPhraseNotation;
  if (!view.showPhraseNotation) {
    els.notation.replaceChildren();
    return;
  }
  const abc = phraseABC(concertKey(), state.displayMode);
  els.notation.replaceChildren();
  if (window.ABCJS) {
    window.ABCJS.renderAbc(els.notation, abc, {
      responsive: "resize",
      add_classes: true,
      paddingtop: 0,
      paddingbottom: 0,
      staffwidth: 760,
      scale: 1.15,
    });
  } else {
    const pre = document.createElement("pre");
    pre.textContent = abc;
    els.notation.append(pre);
  }
}

function renderChart(snap = transport.snapshot()) {
  const view = presentation(state.step);
  els.chart.hidden = !view.showFormChart;
  if (!view.showFormChart) {
    els.chart.replaceChildren();
    return;
  }
  const bars = formBars(concertKey(), state.displayMode);
  els.chart.replaceChildren(
    ...bars.map((bar) => {
      const cell = document.createElement("article");
      const caption = barCaption(bar.bar, view.showEntranceLabels);
      cell.className = "cell";
      if (view.showTargetStyling && bar.role === "phrase") cell.classList.add("entrance");
      if ((snap.playing || snap.paused) && !snap.inCountIn && snap.bar === bar.bar) {
        cell.classList.add("now");
      }
      cell.innerHTML = `<span class="n">Bar ${bar.bar}</span><strong>${bar.names.join(" ")}</strong>${
        caption ? `<span class="mark">${caption}</span>` : ""
      }`;
      return cell;
    }),
  );
}

function choiceRow(containerId, name, options) {
  const host = document.getElementById(containerId);
  host.replaceChildren(
    ...options.map(([value, label]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = label;
      btn.setAttribute("aria-pressed", String(state[name] === value));
      btn.addEventListener("click", () => {
        state[name] = value;
        persist();
        renderAssess();
      });
      return btn;
    }),
  );
}

function renderAssess() {
  const view = presentation(state.step);
  els.assess.hidden = !view.showAssessment;
  if (!view.showAssessment) return;
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
  els.triedKeys.textContent = `Key coverage (optional, not a gate): ${state.triedKeys.join(", ")}`;
}

function renderNow(snap = transport.snapshot()) {
  const view = presentation(state.step);
  els.music.hidden = !view.showMusic;
  const beats = snap.beats ?? 0;
  const chord = currentChord(concertKey(), state.displayMode, state.step, beats);
  els.chord.textContent = chord?.name ?? "—";
  els.functionLabel.textContent = chord ? chord.functionLabel : "";
  if (snap.inCountIn) {
    els.beat.textContent = "Count-in";
  } else if (snap.playing || snap.paused) {
    els.beat.textContent = `Bar ${snap.bar} · Beat ${snap.beatInBar}`;
  } else {
    els.beat.textContent = view.showFormChart ? "Bar 1 · Beat 1" : "Two-bar phrase";
  }
}

function renderPrimary() {
  const action = primaryAction(state.step, playback);
  els.primary.hidden = !action;
  if (action) {
    els.primary.dataset.action = action.id;
    els.primary.textContent = action.label;
  }
  const step = getStep(state.step);
  els.back.hidden = state.step === "hear";
  els.next.hidden = state.step === "reflect";
  els.next.textContent = step.nextLabel || "Continue";
  els.replay.hidden = state.step === "reflect";
}

function renderCopy(snap = transport.snapshot()) {
  const step = getStep(state.step);
  const view = presentation(state.step);
  document.body.dataset.step = state.step;
  els.heading.textContent = step.heading;
  els.instruction.textContent = livePrompt(state.step, snap);
  els.independentCoach.checked = state.independentCoach;
  els.coachWrap.hidden = !view.allowIndependentCoach;
  els.swing.checked = state.swing;
  els.guideTones.checked = state.guideTones;
  els.metronome.checked = state.metronome;
  els.tempo.value = String(state.tempo);
  els.tempoReadout.textContent = String(state.tempo);
  const written = displayKey(concertKey(), state.displayMode);
  els.displayBanner.textContent =
    state.displayMode === "bb-written"
      ? `Showing B♭ written names in ${written.name}. Audio is concert ${concertKey().name}.`
      : `Showing concert pitch in ${concertKey().name}.`;
  document.querySelectorAll("[name=displayMode]").forEach((input) => {
    input.checked = input.value === state.displayMode;
  });
}

function renderMeter(snap = transport.snapshot()) {
  if (snap.inCountIn) {
    els.meter.textContent = `Count-in · ${Math.max(1, Math.ceil(-snap.beats))}`;
    return;
  }
  if (snap.playing) {
    els.meter.textContent = `Playing · bar ${snap.bar} beat ${snap.beatInBar} · concert ${concertKey().name}`;
    return;
  }
  if (snap.paused) {
    els.meter.textContent = `Paused · bar ${snap.bar} beat ${snap.beatInBar}`;
    return;
  }
  els.meter.textContent = playback.ended ? "Ready to continue" : "Stopped · 1-bar count-in on Start";
}

function render(snap = transport.snapshot()) {
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
  const action = primaryAction(state.step, playback);
  if (!action) return;
  if (action.id === "pause") transport.pause();
  else if (action.id === "resume") start(true);
  else if (action.id === "next") go(adjacentStep(state.step, 1));
  else start(false);
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
els.back.addEventListener("click", () => go(adjacentStep(state.step, -1)));
els.next.addEventListener("click", () => go(adjacentStep(state.step, 1)));
els.replay.addEventListener("click", () => {
  halt();
  start(false);
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
