/**
 * Dev-only A/B backing page. Not imported by the app.
 */

import { chordAtBeat } from "./music.js";
import { gradePerformance } from "./grade.js";
import { PitchMonitor } from "./pitch.js";
import { SampleLibrary, loadManifest } from "./sound-samples.js";
import { BandTransport } from "./sound-engine.js";
import {
  DEFAULT_TEMPO,
  TEST_PHRASE,
  backingFor,
  clipArrangement,
  isSampledEngine,
  withMelody,
} from "./sound-band.js";

const state = {
  engine: "current",
  formId: "blues",
  tempo: DEFAULT_TEMPO,
  brushes: false,
  mixer: { piano: 0.8, bass: 0.85, drums: 0.7 },
  playing: false,
  readyMs: null,
  packBytes: 0,
};

const transport = new BandTransport();
const library = new SampleLibrary();
const mic = new PitchMonitor();
mic.beatClock = () => transport.currentBeats();

const $ = (id) => document.getElementById(id);

function pressed(rowId, attr, value) {
  document.querySelectorAll(`#${rowId} button`).forEach((button) => {
    button.setAttribute("aria-pressed", String(button.getAttribute(attr) === String(value)));
  });
}

function mixerFromSliders() {
  state.mixer = {
    piano: Number($("mix-piano").value) / 100,
    bass: Number($("mix-bass").value) / 100,
    drums: Number($("mix-drums").value) / 100,
  };
  $("mix-piano-val").textContent = $("mix-piano").value;
  $("mix-bass-val").textContent = $("mix-bass").value;
  $("mix-drums-val").textContent = $("mix-drums").value;
  transport.setMixer(state.mixer);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function engineStatusName() {
  if (state.engine === "new") return "New (busy)";
  if (state.engine === "new-simple") return "New-simple";
  return "Current synth (no sample download)";
}

function statusLine(extra = "") {
  const pack = state.packBytes ? formatBytes(state.packBytes) : "pack";
  const ready = state.readyMs != null ? `${(state.readyMs / 1000).toFixed(2)}s to ready` : "not loaded yet";
  const cache = library.fromCache ? "cache hit" : "cold download";
  const engine = isSampledEngine(state.engine)
    ? `${engineStatusName()} · ${pack} · ${ready} · ${cache}`
    : engineStatusName();
  $("status").textContent = extra ? `${engine}. ${extra}` : engine;
}

function chordName() {
  const snap = transport.snapshot();
  const arranged = backingFor(state.engine, state.formId, { brushes: state.brushes, tempo: state.tempo });
  const chord = chordAtBeat(arranged.chords, Math.max(0, snap.beats));
  $("chord").textContent = snap.playing || snap.paused ? (chord?.name ?? "—") : "—";
  $("meter").textContent = snap.inCountIn
    ? "Count-in"
    : snap.playing || snap.paused
      ? `Bar ${snap.bar} · Beat ${snap.beatInBar}`
      : "Bar — · Beat —";
}

transport.onUpdate = chordName;
transport.onEnded = () => {
  state.playing = false;
  $("play-btn").textContent = "Play";
  chordName();
};

async function ensureNew() {
  if (!isSampledEngine(state.engine)) return;
  await transport.ensure();
  if (library.ready) return;
  $("status").textContent = "Loading samples…";
  await library.load(transport.ctx, {
    onProgress: ({ loaded, total }) => {
      $("status").textContent = `Loading samples ${loaded}/${total}…`;
    },
  });
  state.readyMs = library.coldMs;
  transport.library = library;
  statusLine();
}

function arrangement({ grade = false } = {}) {
  let arranged = backingFor(state.engine, state.formId, { brushes: state.brushes, tempo: state.tempo });
  if (grade) {
    arranged = clipArrangement(arranged, 8);
    arranged = withMelody(arranged);
  }
  return arranged;
}

async function play({ grade = false } = {}) {
  mixerFromSliders();
  await transport.ensure();
  await ensureNew();
  transport.engine = state.engine;
  transport.library = library;
  transport.setMixer(state.mixer);
  const arranged = arrangement({ grade });
  state.playing = true;
  $("play-btn").textContent = "Playing";
  await transport.start({
    tempo: state.tempo,
    swing: true,
    looping: !grade,
    events: arranged.events,
    lengthBeats: arranged.lengthBeats,
    cueGain: 0,
  });
}

async function stop() {
  transport.stop();
  mic.stop();
  state.playing = false;
  $("play-btn").textContent = "Play";
  chordName();
}

async function gradeCheck() {
  $("grade-line").textContent = "Playing the test phrase…";
  const previousEnded = transport.onEnded;
  const finished = new Promise((resolve) => {
    transport.onEnded = () => {
      state.playing = false;
      $("play-btn").textContent = "Play";
      resolve();
    };
  });
  await play({ grade: true });
  await transport.ensure();
  const loopback = [];
  let worklet = null;
  try {
    await transport.ctx.audioWorklet.addModule(new URL("./pitch-worklet.js?v=118", import.meta.url));
    const source = transport.ctx.createMediaStreamSource(transport.tap.stream);
    worklet = new AudioWorkletNode(transport.ctx, "duojazz-pitch");
    const mute = transport.ctx.createGain();
    mute.gain.value = 0;
    source.connect(worklet);
    worklet.connect(mute);
    mute.connect(transport.ctx.destination);
    worklet.port.onmessage = (event) => {
      const hz = event.data?.hz ?? 0;
      const amp = event.data?.amp ?? 0;
      if (hz > 40 && hz < 2000 && amp > 0.008) {
        loopback.push({ beat: transport.currentBeats(), hz, amp });
      }
    };
  } catch {
    worklet = null;
  }
  await mic.start(transport.ctx);
  await finished;
  transport.onEnded = previousEnded;
  mic.stop();
  try {
    worklet?.port.postMessage("stop");
  } catch {
    /* ignore */
  }
  const loopResult = gradePerformance({ expected: TEST_PHRASE, observations: loopback, tempo: state.tempo });
  const micResult = gradePerformance({ expected: TEST_PHRASE, observations: mic.observations, tempo: state.tempo });
  const loopText = `loopback ${loopResult.percent}% (${loopResult.passed ? "pass" : "miss"})`;
  const micText = mic.state === "denied" || mic.state === "unsupported"
    ? `mic ${mic.state}`
    : `mic ${micResult.percent}% (${micResult.passed ? "pass" : "miss"})`;
  $("grade-line").textContent = `${state.engine} @ ${state.tempo} · ${loopText} · ${micText}. Headphones still recommended.`;
  statusLine("Grade check finished.");
}

function bindToggles() {
  $("engine-row").addEventListener("click", (event) => {
    const engine = event.target.closest("button")?.dataset.engine;
    if (!engine) return;
    state.engine = engine;
    pressed("engine-row", "data-engine", engine);
    statusLine();
  });
  $("form-row").addEventListener("click", (event) => {
    const form = event.target.closest("button")?.dataset.form;
    if (!form) return;
    state.formId = form;
    pressed("form-row", "data-form", form);
  });
  $("kit-row").addEventListener("click", (event) => {
    const kit = event.target.closest("button")?.dataset.kit;
    if (!kit) return;
    state.brushes = kit === "brushes";
    pressed("kit-row", "data-kit", kit);
  });
  $("tempo-row").addEventListener("click", (event) => {
    const tempo = Number(event.target.closest("button")?.dataset.tempo);
    if (!tempo) return;
    state.tempo = tempo;
    pressed("tempo-row", "data-tempo", tempo);
  });
  for (const id of ["mix-piano", "mix-bass", "mix-drums"]) {
    $(id).addEventListener("input", mixerFromSliders);
  }
  $("play-btn").addEventListener("click", () => (state.playing ? stop() : play()));
  $("stop-btn").addEventListener("click", stop);
  $("grade-btn").addEventListener("click", () => gradeCheck());
}

function applyQuery() {
  const query = new URLSearchParams(location.search);
  const engine = query.get("engine");
  if (engine === "new" || engine === "current" || engine === "new-simple") state.engine = engine;
  if (query.get("form") === "st-thomas") state.formId = "st-thomas";
  const tempo = Number(query.get("tempo"));
  if (tempo === 100 || tempo === 140 || tempo === 200) state.tempo = tempo;
  if (query.get("kit") === "brushes") state.brushes = true;
  pressed("engine-row", "data-engine", state.engine);
  pressed("form-row", "data-form", state.formId);
  pressed("kit-row", "data-kit", state.brushes ? "brushes" : "sticks");
  pressed("tempo-row", "data-tempo", state.tempo);
}

window.__DUOJAZZ_SOUND__ = { state, transport, library, play, stop, gradeCheck };

bindToggles();
applyQuery();
mixerFromSliders();
loadManifest().then((manifest) => {
  state.packBytes = manifest.totalBytes ?? 0;
  statusLine();
}).catch(() => statusLine());
