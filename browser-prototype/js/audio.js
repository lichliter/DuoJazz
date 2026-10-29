import {
  COUNT_IN_BEATS,
  beatsToSeconds,
} from "./music.js";
import { SampleLibrary } from "./sound-samples.js";
import {
  SAMPLE_FALLBACK_NOTICE,
  countInEvents,
  eventIsAudibleFrom,
  livePlaybackEvents,
} from "./sound-band.js";
import {
  BASS_BUS_GAIN,
  BASS_NOTE_GAIN,
  DRUM_BUS_GAIN,
  MELODY_BUS_GAIN,
  PIANO_BUS_GAIN,
  PIANO_NOTE_GAIN,
  busGain,
  melodyPlayGain,
  nearestSampleMidi,
} from "./melody-gain.js";

function midiToHz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export { SAMPLE_FALLBACK_NOTICE };

export class Transport {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.pianoBus = null;
    this.bassBus = null;
    this.drumBus = null;
    this.melodyBus = null;
    this.playing = false;
    this.paused = false;
    this.epoch = 0;
    this.nodes = [];
    this.raf = 0;
    this.startedAt = 0;
    this.pausedBeats = 0;
    this.performanceBeats = 0;
    this.chorusLengthBeats = 0;
    this.looping = true;
    this.tempo = 96;
    this.swing = true;
    this.onUpdate = () => {};
    this.onEnded = () => {};
    this.lastConfig = null;
    this.cueGain = 1;
    this.ended = false;
    this.library = null;
    this.sampleStatus = "idle";
    this.sampleNotice = "";
    this.loadPromise = null;
    this.melodyKind = "piano";
  }

  async ensure() {
    if (this.ctx && this.ctx.state !== "closed") {
      if (this.ctx.state === "suspended") await this.ctx.resume();
      this.ensureBuses();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.85;
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 3;
    this.master.connect(compressor);
    compressor.connect(this.ctx.destination);
    this.ensureBuses();
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  ensureBuses() {
    if (!this.ctx || this.pianoBus) return;
    this.pianoBus = this.ctx.createGain();
    this.bassBus = this.ctx.createGain();
    this.drumBus = this.ctx.createGain();
    this.melodyBus = this.ctx.createGain();
    this.pianoBus.gain.value = PIANO_BUS_GAIN;
    this.bassBus.gain.value = BASS_BUS_GAIN;
    this.drumBus.gain.value = DRUM_BUS_GAIN;
    this.melodyBus.gain.value = MELODY_BUS_GAIN;
    this.pianoBus.connect(this.master);
    this.bassBus.connect(this.master);
    this.drumBus.connect(this.master);
    this.melodyBus.connect(this.master);
  }

  applyMix(duckBacking) {
    this.ensureBuses();
    const duck = Boolean(duckBacking);
    this.pianoBus.gain.value = busGain("piano", duck);
    this.bassBus.gain.value = busGain("bass", duck);
    this.drumBus.gain.value = busGain("drum", duck);
    this.melodyBus.gain.value = busGain("melody", duck);
  }

  samplesReady() {
    return Boolean(this.library?.backingReady);
  }

  async prepareBacking({ onProgress, sampleSet = "piano" } = {}) {
    this.melodyKind = sampleSet;
    if (this.library?.backingReady && this.library.hasMelody(sampleSet)) {
      this.sampleStatus = "ready";
      this.sampleNotice = "";
      return { status: "ready", coldMs: this.library.coldMs, fromCache: this.library.fromCache };
    }
    if (!this.loadPromise) {
      this.sampleStatus = "loading";
      this.loadPromise = this.loadBacking(onProgress, sampleSet).finally(() => {
        this.loadPromise = null;
      });
    }
    return this.loadPromise;
  }

  async loadBacking(onProgress, sampleSet = "piano") {
    try {
      await this.ensure();
      if (!this.library) this.library = new SampleLibrary();
      await this.library.load(this.ctx, { onProgress, sampleSet });
      this.melodyKind = sampleSet;
      if (this.library.backingReady) {
        this.sampleStatus = "ready";
        this.sampleNotice = "";
        return { status: "ready", coldMs: this.library.coldMs, fromCache: this.library.fromCache };
      }
      this.sampleStatus = "fallback";
      this.sampleNotice = SAMPLE_FALLBACK_NOTICE;
      return { status: "fallback", notice: this.sampleNotice };
    } catch {
      this.sampleStatus = "fallback";
      this.sampleNotice = SAMPLE_FALLBACK_NOTICE;
      this.library = this.library ?? new SampleLibrary();
      return { status: "fallback", notice: this.sampleNotice };
    }
  }

  stopAllNodes() {
    for (const node of this.nodes) {
      try {
        node.stop();
      } catch {
        /* already stopped */
      }
      try {
        node.disconnect();
      } catch {
        /* already disconnected */
      }
    }
    this.nodes = [];
    if (this.raf) window.cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  stop({ fromEnd = false } = {}) {
    this.epoch += 1;
    this.stopAllNodes();
    this.playing = false;
    this.paused = false;
    this.pausedBeats = 0;
    this.performanceBeats = 0;
    if (!fromEnd) this.ended = false;
    this.onUpdate(this.snapshot());
  }

  pause() {
    if (!this.playing) return;
    this.pausedBeats = this.currentBeats();
    this.epoch += 1;
    this.stopAllNodes();
    this.playing = false;
    this.paused = true;
    this.onUpdate(this.snapshot());
  }

  currentBeats() {
    if (!this.playing || !this.ctx) return this.paused ? this.pausedBeats : 0;
    const elapsed = this.ctx.currentTime - this.startedAt;
    return elapsed / (60 / this.tempo);
  }

  snapshot() {
    const beats = this.playing ? this.currentBeats() : this.pausedBeats;
    const inCountIn = (this.playing || this.paused) && beats < 0;
    const formBeats = Math.max(0, beats);
    const bars = Math.max(1, this.chorusLengthBeats / 4);
    return {
      playing: this.playing,
      paused: this.paused,
      ended: this.ended,
      beats,
      inCountIn,
      bar: inCountIn ? 0 : Math.floor(formBeats / 4) % bars + 1,
      beatInBar: inCountIn ? 0 : Math.floor(formBeats % 4) + 1,
      sampleStatus: this.sampleStatus,
      sampleNotice: this.sampleNotice,
    };
  }

  tone(time, freq, duration, { type = "sine", gain = 0.12, attack = 0.01, decay = 0.08, bus } = {}) {
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    env.gain.setValueAtTime(0.0001, time);
    env.gain.exponentialRampToValueAtTime(gain, time + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(duration, attack + decay));
    osc.connect(env);
    env.connect(bus ?? this.master);
    osc.start(time);
    osc.stop(time + duration + 0.05);
    this.nodes.push(osc);
  }

  playBuffer(buffer, time, { bus, gain = 0.2, duration = 0.5, playbackRate = 1 } = {}) {
    if (!buffer) return;
    const src = this.ctx.createBufferSource();
    const env = this.ctx.createGain();
    src.buffer = buffer;
    src.playbackRate.value = playbackRate;
    const attack = 0.008;
    const release = Math.min(0.12, Math.max(0.04, duration * 0.25));
    env.gain.setValueAtTime(0.0001, time);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), time + attack);
    const hold = Math.max(time + attack, time + duration - release);
    env.gain.setValueAtTime(Math.max(0.0002, gain), hold);
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    src.connect(env);
    env.connect(bus ?? this.master);
    src.start(time);
    src.stop(time + duration + 0.05);
    this.nodes.push(src);
  }

  noiseClick(time, { strong = false, gain = 0.18 } = {}) {
    const duration = strong ? 0.05 : 0.03;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const env = this.ctx.createGain();
    src.buffer = buffer;
    filter.type = "highpass";
    filter.frequency.value = strong ? 1800 : 1200;
    env.gain.setValueAtTime(gain, time);
    env.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    src.connect(filter);
    filter.connect(env);
    env.connect(this.master);
    src.start(time);
    src.stop(time + duration);
    this.nodes.push(src);
  }

  scheduleEvent(event, origin) {
    const swing = event.swing === false || event.beat < 0 ? false : this.swing;
    let time = origin + beatsToSeconds(event.beat, this.tempo, swing);
    const dur = beatsToSeconds(event.durationBeats ?? 0.5, this.tempo, event.swing === false ? false : this.swing);
    if (time + dur < this.ctx.currentTime) return;
    if (time < this.ctx.currentTime) time = this.ctx.currentTime;
    const vel = event.velocity ?? 0.7;
    const sampled = this.samplesReady();

    if (event.type === "click") {
      if (sampled) {
        const drum = event.strong ? "ride" : "hatClosed";
        const buffer = this.library.drum(drum);
        this.playBuffer(buffer, time, {
          bus: this.drumBus ?? this.master,
          gain: event.strong ? 0.34 : 0.22,
          duration: event.strong ? 0.9 : 0.22,
        });
        return;
      }
      this.noiseClick(time, { strong: event.strong, gain: event.strong ? 0.22 : 0.1 });
      return;
    }
    if (event.type === "cue") {
      const g = 0.16 * this.cueGain;
      if (g < 0.01) return;
      const freq = event.kind === "downbeat" ? 880 : 660;
      this.tone(time, freq, 0.18, { type: "triangle", gain: g, attack: 0.005, decay: 0.12 });
      this.tone(time, freq * 1.5, 0.12, { type: "sine", gain: g * 0.4, attack: 0.005, decay: 0.1 });
      return;
    }
    if (event.type === "melody") {
      const pick = this.library?.nearest(this.melodyKind, event.midi);
      if (pick?.buffer) {
        const sampleMidi = nearestSampleMidi(this.melodyKind, pick.midi);
        this.playBuffer(pick.buffer, time, {
          bus: this.melodyBus ?? this.master,
          gain: melodyPlayGain(this.melodyKind, sampleMidi, vel),
          duration: dur,
          playbackRate: pick.playbackRate,
        });
        return;
      }
      this.tone(time, midiToHz(event.midi), dur * 0.92, {
        type: "triangle",
        gain: 0.18,
        attack: 0.012,
        decay: 0.09,
      });
      this.tone(time, midiToHz(event.midi) * 2, dur * 0.6, {
        type: "sine",
        gain: 0.04,
        attack: 0.02,
        decay: 0.08,
      });
      return;
    }
    if (event.type === "piano" && sampled) {
      for (const midi of event.midis) {
        const pick = this.library.nearest("piano", midi);
        this.playBuffer(pick.buffer, time, {
          bus: this.pianoBus ?? this.master,
          gain: PIANO_NOTE_GAIN * vel,
          duration: dur,
          playbackRate: pick.playbackRate,
        });
      }
      return;
    }
    if (event.type === "chord") {
      for (const midi of event.midis) {
        this.tone(time, midiToHz(midi), dur * 0.95, {
          type: "sine",
          gain: 0.045,
          attack: 0.03,
          decay: 0.2,
        });
      }
      return;
    }
    if (event.type === "guide") {
      for (const midi of event.midis) {
        this.tone(time, midiToHz(midi), dur * 0.8, {
          type: "triangle",
          gain: 0.03,
          attack: 0.02,
          decay: 0.15,
        });
      }
      return;
    }
    if (event.type === "bass") {
      if (sampled) {
        const pick = this.library.nearest("bass", event.midi);
        this.playBuffer(pick.buffer, time, {
          bus: this.bassBus ?? this.master,
          gain: BASS_NOTE_GAIN * vel,
          duration: dur,
          playbackRate: pick.playbackRate,
        });
        return;
      }
      this.tone(time, midiToHz(event.midi), dur * 0.88, {
        type: "sine",
        gain: 0.16,
        attack: 0.008,
        decay: 0.1,
      });
      return;
    }
    if (event.type === "drum" && sampled) {
      const buffer = this.library.drum(event.drum);
      const ride = event.drum.includes("ride") || event.drum.includes("Ride");
      const gain = event.drum === "kick" ? 0.45 * vel : ride ? 0.28 * vel : 0.32 * vel;
      this.playBuffer(buffer, time, {
        bus: this.drumBus ?? this.master,
        gain,
        duration: Math.max(dur, ride ? 1.4 : 0.35),
        playbackRate: 1,
      });
    }
  }

  scheduleCountIn(origin) {
    for (const event of countInEvents({ sampled: this.samplesReady() })) {
      this.scheduleEvent(event, origin);
    }
  }

  tick(epoch) {
    if (epoch !== this.epoch || !this.playing) return;
    const beats = this.currentBeats();
    this.performanceBeats = beats;
    this.onUpdate(this.snapshot());
    if (beats >= this.chorusLengthBeats - 0.05) {
      if (this.looping && this.lastConfig) {
        this.startedAt = this.ctx.currentTime;
        this.armChorus(this.lastConfig, { countIn: false, fromBeat: 0 });
      } else {
        this.ended = true;
        this.stop({ fromEnd: true });
        this.onEnded();
        return;
      }
    }
    this.raf = window.requestAnimationFrame(() => this.tick(epoch));
  }

  armChorus(config, { countIn, fromBeat }) {
    const sampled = this.samplesReady();
    const source = config.events ?? livePlaybackEvents(config, { sampled });
    const events = source.filter((event) => eventIsAudibleFrom(event, fromBeat));
    const origin = this.startedAt;
    if (countIn) this.scheduleCountIn(origin);
    for (const event of events) this.scheduleEvent(event, origin);
    this.chorusLengthBeats = config.lengthBeats ?? (config.stage === "learn" ? 8 : 32);
  }

  async start(config, { resume = false } = {}) {
    const generation = this.epoch;
    await this.ensure();
    if (this.epoch !== generation) return;
    this.stopAllNodes();
    this.epoch += 1;
    const epoch = this.epoch;
    this.lastConfig = config;
    this.tempo = config.tempo;
    this.swing = config.swing;
    this.looping = config.looping;
    this.cueGain = config.cueGain ?? 1;
    if (typeof config.duckBacking === "boolean") this.applyMix(config.duckBacking);
    this.playing = true;
    this.paused = false;
    this.ended = false;
    const fromBeat = resume ? this.pausedBeats : 0;
    const countIn = !resume;
    const countInSeconds = countIn ? beatsToSeconds(COUNT_IN_BEATS, this.tempo, false) : 0;
    this.startedAt = this.ctx.currentTime + countInSeconds - beatsToSeconds(fromBeat, this.tempo, false);
    this.pausedBeats = 0;
    this.armChorus(config, { countIn, fromBeat });
    this.onUpdate(this.snapshot());
    this.tick(epoch);
  }
}
