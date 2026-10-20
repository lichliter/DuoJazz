import {
  COUNT_IN_BEATS,
  beatsToSeconds,
  scheduleChorus,
} from "./music.js";

function midiToHz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export class Transport {
  constructor() {
    this.ctx = null;
    this.master = null;
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
  }

  async ensure() {
    if (this.ctx && this.ctx.state !== "closed") {
      if (this.ctx.state === "suspended") await this.ctx.resume();
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
    if (this.ctx.state === "suspended") await this.ctx.resume();
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
    };
  }

  tone(time, freq, duration, { type = "sine", gain = 0.12, attack = 0.01, decay = 0.08 } = {}) {
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    env.gain.setValueAtTime(0.0001, time);
    env.gain.exponentialRampToValueAtTime(gain, time + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(duration, attack + decay));
    osc.connect(env);
    env.connect(this.master);
    osc.start(time);
    osc.stop(time + duration + 0.05);
    this.nodes.push(osc);
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
    let time = origin + beatsToSeconds(event.beat, this.tempo, this.swing);
    const dur = beatsToSeconds(event.durationBeats ?? 0.5, this.tempo, this.swing);
    if (time + dur < this.ctx.currentTime) return;
    if (time < this.ctx.currentTime) time = this.ctx.currentTime;
    if (event.type === "click") {
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
      this.tone(time, midiToHz(event.midi), dur * 0.88, {
        type: "sine",
        gain: 0.16,
        attack: 0.008,
        decay: 0.1,
      });
    }
  }

  scheduleCountIn(origin) {
    for (let i = 0; i < COUNT_IN_BEATS; i += 1) {
      const beat = i - COUNT_IN_BEATS;
      this.scheduleEvent({ type: "click", beat, strong: true }, origin);
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
    const events = scheduleChorus(config).filter((event) => event.beat >= fromBeat && event.type !== "end");
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
