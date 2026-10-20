import {
  PRIMARY_KEY_IDS,
  KEYS,
  STORAGE_KEY,
  defaultState,
  getKey,
  displayKey,
  phraseNotes,
  phraseABC,
  chartABC,
  chorusChords,
  barRoles,
} from "./music.js";
import { Transport } from "./audio.js";

const transport = new Transport();
const state = loadState();

const els = {
  stageBtns: [...document.querySelectorAll(".stage-btn")],
  stageTitle: document.getElementById("stage-title"),
  stageCopy: document.getElementById("stage-copy"),
  notation: document.getElementById("notation"),
  bars: document.getElementById("bars"),
  noteWrap: document.getElementById("note-wrap"),
  assessWrap: document.getElementById("assess-wrap"),
  keys: document.getElementById("keys"),
  tempo: document.getElementById("tempo"),
  tempoReadout: document.getElementById("tempo-readout"),
  modelPhrase: document.getElementById("modelPhrase"),
  guideTones: document.getElementById("guideTones"),
  swing: document.getElementById("swing"),
  looping: document.getElementById("looping"),
  metronome: document.getElementById("metronome"),
  yoursControls: document.getElementById("yours-controls"),
  notationOpacity: document.getElementById("notationOpacity"),
  cueOpacity: document.getElementById("cueOpacity"),
  displayBanner: document.getElementById("display-banner"),
  nowPlaying: document.getElementById("now-playing"),
  meter: document.getElementById("meter"),
  play: document.getElementById("play"),
  pause: document.getElementById("pause"),
  restart: document.getElementById("restart"),
};

function loadState() {
  const base = defaultState();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    return saved ? { ...base, ...saved } : base;
  } catch {
    return base;
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function concertKey() {
  return getKey(state.concertKeyId);
}

function audioConfig() {
  return {
    concertKey: concertKey(),
    displayMode: state.displayMode,
    includeModel: state.stage === "learn" ? true : state.modelPhrase,
    includeGuides: state.guideTones,
    includeClick: state.metronome,
    variationId: state.stage === "yours" ? state.variationId : "original",
    stage: state.stage === "yours" ? "place" : state.stage,
    tempo: state.tempo,
    swing: state.swing,
    looping: state.looping,
    cueGain: state.stage === "yours" ? state.cueOpacity : 1,
  };
}

function stopForSettings() {
  if (transport.playing || transport.paused) {
    transport.stop();
    els.meter.textContent = "Settings applied · press Start";
  }
}

function renderKeys() {
  const more = KEYS.filter((key) => !PRIMARY_KEY_IDS.includes(key.id));
  const shown = [...KEYS.filter((key) => PRIMARY_KEY_IDS.includes(key.id)), ...more];
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
        stopForSettings();
        render();
      });
      return btn;
    }),
  );
}

function renderStages() {
  els.stageBtns.forEach((btn) => {
    const active = btn.dataset.stage === state.stage;
    btn.setAttribute("aria-current", active ? "step" : "false");
  });
}

function renderCopy() {
  const written = displayKey(concertKey(), state.displayMode);
  if (state.stage === "learn") {
    els.stageTitle.textContent = "Learn the phrase";
    els.stageCopy.textContent = `Short ii–V–I in concert ${concertKey().name}. Eight eighths through ii and V, then a half note on the 5th of I. Tempo and key are yours; twelve keys are optional, not a gate.`;
  } else if (state.stage === "place") {
    els.stageTitle.textContent = "Place it in eight bars";
    els.stageCopy.textContent = "Bars 1–2: improvise. A cue marks the door into bars 3–4, where the phrase sits on the short ii–V–I. Bars 5–8: resolve and keep playing. Chord changes stay visible.";
  } else {
    els.stageTitle.textContent = "Make it yours";
    els.stageCopy.textContent = "Fade the notation and the entrance scaffolding if you want. The changes stay. Quoting the lick is a choice, not a requirement.";
  }
  els.displayBanner.textContent =
    state.displayMode === "bb-written"
      ? `Showing B♭ written names in ${written.name}. Audio is concert ${concertKey().name} — a B♭ instrument reads a major second higher than concert.`
      : `Showing concert pitch in ${concertKey().name}. Switch to B♭ written to see trumpet or tenor sax names.`;
  els.yoursControls.hidden = state.stage !== "yours";
  els.modelPhrase.checked = state.modelPhrase;
  els.guideTones.checked = state.guideTones;
  els.swing.checked = state.swing;
  els.looping.checked = state.looping;
  els.metronome.checked = state.metronome;
  els.tempo.value = String(state.tempo);
  els.tempoReadout.textContent = String(state.tempo);
  els.notationOpacity.value = String(Math.round(state.notationOpacity * 100));
  els.cueOpacity.value = String(Math.round(state.cueOpacity * 100));
  document.querySelectorAll("[name=displayMode]").forEach((input) => {
    input.checked = input.value === state.displayMode;
  });
  document.querySelectorAll("[data-variation]").forEach((btn) => {
    btn.setAttribute("aria-pressed", String(btn.dataset.variation === state.variationId));
  });
}

function renderNotation() {
  const abc = state.stage === "learn" ? phraseABC(concertKey(), state.displayMode) : chartABC(concertKey(), state.displayMode);
  els.notation.style.opacity = state.stage === "yours" ? String(state.notationOpacity) : "1";
  els.notation.replaceChildren();
  if (window.ABCJS) {
    window.ABCJS.renderAbc(els.notation, abc, {
      responsive: "resize",
      add_classes: true,
      paddingtop: 0,
      paddingbottom: 0,
      staffwidth: 720,
    });
  } else {
    const pre = document.createElement("pre");
    pre.textContent = abc;
    els.notation.append(pre);
  }
}

function renderBars() {
  const show = state.stage !== "learn";
  els.bars.hidden = !show;
  if (!show) {
    els.bars.replaceChildren();
    return;
  }
  const chords = chorusChords(concertKey(), state.displayMode);
  const snap = transport.snapshot();
  els.bars.replaceChildren(
    ...barRoles().map((bar) => {
      const box = document.createElement("article");
      box.className = `bar ${bar.role}`;
      if (snap.playing && snap.bar === bar.bar) box.classList.add("now");
      const cellChords = chords.filter((chord) => {
        const chordBar = Math.floor(chord.startBeat / 4) + 1;
        return chordBar === bar.bar;
      });
      box.innerHTML = `<span class="n">Bar ${bar.bar}</span><strong>${bar.label}</strong><div class="chords">${cellChords.map((c) => c.name).join(" · ")}</div>`;
      if (state.stage === "yours") box.style.opacity = bar.role === "phrase" ? String(0.55 + state.cueOpacity * 0.45) : "1";
      return box;
    }),
  );
}

function renderNotes() {
  if (state.stage !== "learn") {
    els.noteWrap.replaceChildren();
    return;
  }
  const notes = phraseNotes(concertKey(), state.displayMode);
  const table = document.createElement("table");
  table.className = "note-table";
  table.innerHTML = `
    <caption>Exact pitches and rhythm (from DuoJazz lick short-ii-v-i)</caption>
    <thead>
      <tr>
        <th>Beat</th><th>Rhythm</th><th>Degree in I</th>
        <th>${state.displayMode === "bb-written" ? "Written" : "Concert"}</th>
        ${state.displayMode === "bb-written" ? "<th>Concert (sounds)</th>" : ""}
      </tr>
    </thead>
    <tbody>
      ${notes
        .map(
          (note) => `<tr data-note="${note.index}">
            <td>${note.startBeat + 1}</td>
            <td>${note.rhythm}</td>
            <td>${note.degree}</td>
            <td>${note.shownName}</td>
            ${state.displayMode === "bb-written" ? `<td>${note.concertName}</td>` : ""}
          </tr>`,
        )
        .join("")}
    </tbody>`;
  els.noteWrap.replaceChildren(table);
}

function renderAssess() {
  if (state.stage !== "yours") {
    els.assessWrap.replaceChildren();
    return;
  }
  const wrap = document.createElement("form");
  wrap.className = "assess";
  wrap.innerHTML = `
    <fieldset>
      <legend>Honest self-assessment</legend>
      <p class="help">You mark this. The app does not listen and does not score musicality.</p>
      <p><strong>Recall</strong> (not the same as using it)</p>
      ${radioRow("recall", "I can hear this phrase without staring at the page", state.recall)}
      <p><strong>Application</strong> (this session)</p>
      ${radioRow("applicationEnter", "I entered around bar 3", state.applicationEnter)}
      ${radioRow("applicationResolve", "I resolved toward I and kept playing", state.applicationResolve)}
      ${radioRow("applicationChoice", "I chose to quote, vary, or skip — on purpose", state.applicationChoice)}
      <p><strong>Key coverage</strong> (optional, not a gate): tried ${state.triedKeys.join(", ")}</p>
    </fieldset>`;
  wrap.addEventListener("change", (event) => {
    const input = event.target;
    if (input instanceof HTMLInputElement && input.name) {
      state[input.name] = input.value;
      persist();
    }
  });
  els.assessWrap.replaceChildren(wrap);
}

function radioRow(name, label, value) {
  return `<p>${label}<br>
    <label><input type="radio" name="${name}" value="yes" ${value === "yes" ? "checked" : ""}> Yes</label>
    <label><input type="radio" name="${name}" value="somewhat" ${value === "somewhat" ? "checked" : ""}> Somewhat</label>
    <label><input type="radio" name="${name}" value="not-yet" ${value === "not-yet" ? "checked" : ""}> Not yet</label>
  </p>`;
}

function highlightNotes(beats) {
  const local = state.stage === "learn" ? beats : beats - 8;
  const notes = phraseNotes(concertKey(), state.displayMode);
  document.querySelectorAll("[data-note]").forEach((row) => {
    const note = notes[Number(row.getAttribute("data-note"))];
    const on = local >= note.startBeat && local < note.startBeat + note.beats;
    row.classList.toggle("active", on);
  });
}

function render() {
  renderKeys();
  renderStages();
  renderCopy();
  renderNotation();
  renderBars();
  renderNotes();
  renderAssess();
}

async function start(resume = false) {
  els.play.disabled = true;
  try {
    await transport.start(audioConfig(), { resume });
  } finally {
    els.play.disabled = false;
  }
}

transport.onUpdate = (snap) => {
  if (!snap.playing && !snap.paused) {
    els.meter.textContent = "Stopped · 1-bar count-in on Start";
    els.nowPlaying.textContent = "";
    renderBars();
    return;
  }
  if (snap.inCountIn || snap.beats < 0) {
    const remaining = Math.max(1, Math.ceil(-snap.beats));
    els.meter.textContent = `Count-in · ${remaining}`;
    els.nowPlaying.textContent = "Count-in";
    return;
  }
  const bar = Math.max(1, snap.bar);
  const beat = Math.max(1, snap.beatInBar);
  els.meter.textContent = `${snap.paused ? "Paused" : "Playing"} · bar ${bar} beat ${beat} · concert ${concertKey().name}`;
  const chords = chorusChords(concertKey(), state.displayMode);
  const beatIndex = Math.max(0, snap.beats);
  const chord = [...chords].reverse().find((item) => beatIndex >= item.startBeat);
  els.nowPlaying.textContent = chord ? `${chord.functionLabel} · ${chord.name}` : "";
  highlightNotes(beatIndex);
  renderBars();
};

els.stageBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    state.stage = btn.dataset.stage;
    if (state.stage === "learn") state.modelPhrase = true;
    if (state.stage === "yours" && !state.variationId) state.variationId = "skip";
    persist();
    stopForSettings();
    render();
  });
});

els.tempo.addEventListener("input", () => {
  state.tempo = Number(els.tempo.value);
  els.tempoReadout.textContent = String(state.tempo);
});
els.tempo.addEventListener("change", () => {
  persist();
  stopForSettings();
});

document.querySelectorAll("[name=displayMode]").forEach((input) => {
  input.addEventListener("change", () => {
    state.displayMode = input.value;
    persist();
    stopForSettings();
    render();
  });
});

for (const [id, key] of [
  ["modelPhrase", "modelPhrase"],
  ["guideTones", "guideTones"],
  ["swing", "swing"],
  ["looping", "looping"],
  ["metronome", "metronome"],
]) {
  els[id].addEventListener("change", () => {
    state[key] = els[id].checked;
    persist();
    stopForSettings();
  });
}

els.notationOpacity.addEventListener("input", () => {
  state.notationOpacity = Number(els.notationOpacity.value) / 100;
  els.notation.style.opacity = String(state.notationOpacity);
});
els.notationOpacity.addEventListener("change", persist);
els.cueOpacity.addEventListener("input", () => {
  state.cueOpacity = Number(els.cueOpacity.value) / 100;
  renderBars();
});
els.cueOpacity.addEventListener("change", persist);

document.querySelectorAll("[data-variation]").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.variationId = btn.dataset.variation;
    persist();
    stopForSettings();
    render();
  });
});

els.play.addEventListener("click", () => start(transport.paused));
els.pause.addEventListener("click", () => transport.pause());
els.restart.addEventListener("click", () => {
  transport.stop();
  start(false);
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
  if (event.code === "Space") {
    event.preventDefault();
    if (transport.playing) transport.pause();
    else start(transport.paused);
  }
  if (event.key === "r" || event.key === "R") {
    event.preventDefault();
    transport.stop();
    start(false);
  }
});

window.addEventListener("load", render);
render();
