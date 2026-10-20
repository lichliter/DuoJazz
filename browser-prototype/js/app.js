import { DuoJazzEngine } from "./audio.js";
import {
  KEYS,
  VARIATIONS,
  formChordSymbols,
  keyById,
  phraseToAbc,
} from "./music.js";
import { barAndBeat, beatsUntilPhrase, PHRASE_START_BAR } from "./scheduler.js";

const STORAGE_KEY = "duojazz-browser-prototype-v1";
const engine = new DuoJazzEngine();

const state = {
  stage: "learn",
  keyId: "C",
  bpm: 96,
  variationId: VARIATIONS[0].id,
  modelPhrase: true,
  fadeNotation: false,
  showCue: true,
  recall: {},
  application: {},
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    Object.assign(state, {
      keyId: saved.keyId ?? state.keyId,
      bpm: saved.bpm ?? state.bpm,
      variationId: saved.variationId ?? state.variationId,
      recall: saved.recall ?? {},
      application: saved.application ?? {},
    });
  } catch {
    /* ignore broken storage */
  }
}

function persist() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      keyId: state.keyId,
      bpm: state.bpm,
      variationId: state.variationId,
      recall: state.recall,
      application: state.application,
    })
  );
}

function phrase() {
  return VARIATIONS.find((item) => item.id === state.variationId) ?? VARIATIONS[0];
}

function key() {
  return keyById(state.keyId);
}

function renderNotation() {
  const el = document.getElementById("notation");
  el.classList.toggle("faded", state.stage === "yours" && state.fadeNotation);
  const abc = phraseToAbc(key(), phrase());
  const abcjs = window.ABCJS;
  if (typeof abcjs === "undefined") {
    el.textContent = abc;
    return;
  }
  abcjs.renderAbc(el, abc, {
    staffwidth: Math.max(280, el.clientWidth - 16),
    scale: 1.15,
    jazzchords: true,
    paddingtop: 4,
    paddingbottom: 4,
    paddingleft: 8,
    paddingright: 8,
  });
}

function renderForm(activeBar = 0) {
  const host = document.getElementById("form");
  const bars = formChordSymbols(key());
  host.innerHTML = bars
    .map((bar) => {
      const active = bar.bar === activeBar ? "active" : "";
      const phraseClass = bar.role === "phrase" ? "phrase" : "";
      const cueClass =
        state.showCue && state.stage !== "yours" && bar.bar === PHRASE_START_BAR ? "cue" : "";
      return `<div class="bar ${active} ${phraseClass} ${cueClass}" data-bar="${bar.bar}">
        <div class="chords">${bar.symbols.join(" · ")}</div>
        <div class="role">${bar.label}</div>
      </div>`;
    })
    .join("");
}

function renderKeys() {
  const host = document.getElementById("keys");
  host.innerHTML = KEYS.map((item) => {
    const practiced = state.recall[item.id] ? "practiced" : "";
    const applied = state.application[item.id] === "yes" ? "applied" : "";
    const pressed = item.id === state.keyId;
    return `<button type="button" data-key="${item.id}" class="${practiced} ${applied}" aria-pressed="${pressed}">${item.name}</button>`;
  }).join("");
}

function renderRates(id, options, current) {
  const host = document.getElementById(id);
  host.innerHTML = options
    .map(
      ([value, label]) =>
        `<button type="button" data-value="${value}" aria-pressed="${current === value}">${label}</button>`
    )
    .join("");
}

function coverageCopy() {
  const practiced = KEYS.filter((item) => state.recall[item.id]).length;
  const applied = KEYS.filter((item) => state.application[item.id] === "yes").length;
  return `Recall coverage: ${practiced}/12 keys. Application coverage: ${applied}/12 keys. These counts are self-reported, not ear-training scores.`;
}

const STAGE_COPY = {
  learn:
    "Loop the phrase with the model until the rhythm is honest. Change key when the line is no longer a finger pattern in C.",
  place:
    "Eight bars: improvise on I for two bars, enter the line on the ii, resolve, then keep playing. The amber cue is the doorway, not the solo.",
  yours:
    "Fade the notation if you want. Variations are invitations, not a requirement to quote the lick every chorus.",
};

function renderStatic() {
  document.getElementById("stage-copy").textContent = STAGE_COPY[state.stage];
  document.getElementById("tempo").value = String(state.bpm);
  document.getElementById("tempo-readout").textContent = `${state.bpm} bpm`;
  document.getElementById("model").checked = state.modelPhrase;
  document.getElementById("fade").checked = state.fadeNotation;
  document.getElementById("show-cue").checked = state.showCue;
  document.getElementById("fade-row").style.display = state.stage === "yours" ? "flex" : "none";
  document.getElementById("cue-row").style.display = state.stage === "yours" ? "flex" : "none";
  document.getElementById("variation").innerHTML = VARIATIONS.map(
    (item) =>
      `<option value="${item.id}" ${item.id === state.variationId ? "selected" : ""}>${item.name}</option>`
  ).join("");
  for (const btn of document.querySelectorAll(".stage-btn")) {
    btn.setAttribute("aria-current", btn.dataset.stage === state.stage ? "true" : "false");
  }
  renderNotation();
  renderForm();
  renderKeys();
  renderRates(
    "recall",
    [
      ["1", "Not yet"],
      ["2", "Sketchy"],
      ["3", "Mostly"],
      ["4", "Secure"],
    ],
    state.recall[state.keyId]
  );
  renderRates(
    "application",
    [
      ["no", "Isolated only"],
      ["partial", "Entered late / early"],
      ["yes", "Placed in the form"],
    ],
    state.application[state.keyId]
  );
  document.getElementById("coverage").textContent = coverageCopy();
}

function stopTransport() {
  engine.stop();
  document.getElementById("play").textContent = "Play";
  document.getElementById("clock").textContent = "Stopped";
  document.getElementById("cue").textContent = "";
  renderForm(0);
}

async function playTransport() {
  await engine.start({
    key: key(),
    phrase: phrase(),
    bpm: state.bpm,
    modelPhrase: state.modelPhrase,
  });
  document.getElementById("play").textContent = "Playing";
}

engine.onBeat = (info) => {
  const clock = document.getElementById("clock");
  const cue = document.getElementById("cue");
  if (!info.playing) {
    clock.textContent = "Stopped";
    cue.textContent = "";
    renderForm(0);
    return;
  }
  if (info.inCountIn) {
    clock.textContent = `Count-in ${info.beatInBar}`;
    cue.textContent = state.showCue ? "Count-in" : "";
    renderForm(0);
    return;
  }
  const pos = barAndBeat(info.formBeat);
  clock.textContent = `Bar ${pos.bar} · beat ${pos.beatInBar}`;
  renderForm(pos.bar);
  if (!state.showCue || state.stage === "yours") {
    cue.textContent = "";
    return;
  }
  const until = beatsUntilPhrase(info.formBeat);
  if (until === 0 || (pos.bar >= 3 && pos.bar <= 4)) cue.textContent = "Phrase now";
  else if (until <= 4) cue.textContent = `Phrase in ${until} beat${until === 1 ? "" : "s"}`;
  else if (pos.bar <= 2) cue.textContent = "Improvise — door is bar 3";
  else cue.textContent = "Keep going after the line";
};

function bind() {
  document.querySelectorAll(".stage-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      stopTransport();
      state.stage = btn.dataset.stage;
      if (state.stage !== "yours") state.fadeNotation = false;
      renderStatic();
    });
  });
  document.getElementById("keys").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-key]");
    if (!btn) return;
    stopTransport();
    state.keyId = btn.dataset.key;
    persist();
    renderStatic();
  });
  document.getElementById("tempo").addEventListener("input", (event) => {
    state.bpm = Number(event.target.value);
    document.getElementById("tempo-readout").textContent = `${state.bpm} bpm`;
  });
  document.getElementById("tempo").addEventListener("change", () => {
    stopTransport();
    persist();
  });
  document.getElementById("variation").addEventListener("change", (event) => {
    stopTransport();
    state.variationId = event.target.value;
    persist();
    renderStatic();
  });
  document.getElementById("model").addEventListener("change", (event) => {
    state.modelPhrase = event.target.checked;
    engine.setModelPhrase(state.modelPhrase);
  });
  document.getElementById("fade").addEventListener("change", (event) => {
    state.fadeNotation = event.target.checked;
    renderNotation();
  });
  document.getElementById("show-cue").addEventListener("change", (event) => {
    state.showCue = event.target.checked;
    if (!state.showCue) document.getElementById("cue").textContent = "";
    renderForm();
  });
  document.getElementById("play").addEventListener("click", () => {
    if (engine.playing) return;
    playTransport();
  });
  document.getElementById("pause").addEventListener("click", () => {
    engine.pause();
    document.getElementById("play").textContent = "Play";
    document.getElementById("clock").textContent = "Paused — press Play to restart with count-in";
  });
  document.getElementById("stop").addEventListener("click", stopTransport);
  document.getElementById("recall").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-value]");
    if (!btn) return;
    state.recall[state.keyId] = btn.dataset.value;
    persist();
    renderStatic();
  });
  document.getElementById("application").addEventListener("click", (event) => {
    const btn = event.target.closest("[data-value]");
    if (!btn) return;
    state.application[state.keyId] = btn.dataset.value;
    persist();
    renderStatic();
  });
  window.addEventListener("keydown", (event) => {
    if (event.target.matches("input, select, textarea")) return;
    if (event.code === "Space") {
      event.preventDefault();
      if (engine.playing) {
        engine.pause();
        document.getElementById("play").textContent = "Play";
      } else playTransport();
    }
    if (event.key === "s" || event.key === "S") stopTransport();
  });
  window.addEventListener("resize", () => renderNotation());
}

load();
bind();
renderStatic();
