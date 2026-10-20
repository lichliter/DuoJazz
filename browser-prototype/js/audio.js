import {
  BEATS_PER_BAR,
  COUNT_IN_BARS,
  beatsToSeconds,
  createGenerationGate,
  formBeats,
  lickEvents,
  wrapFormBeat,
} from "./scheduler.js";
import { chordsAtFormBeat, chordTonesMidi, melodyMidi } from "./music.js";

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12;

export class DuoJazzEngine {
  constructor() {
    this.ctx = null;
    this.gate = createGenerationGate();
    this.timer = null;
    this.playing = false;
    this.bpm = 96;
    this.nextTime = 0;
    this.absoluteBeat = 0;
    this.countInRemaining = 0;
    this.loopStartTime = 0;
    this.voiceGain = null;
    this.compGain = null;
    this.clickGain = null;
    this.liveNodes = new Set();
    this.modelPhrase = true;
    this.onBeat = null;
    this.key = null;
    this.phrase = null;
  }

  async ensureContext() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);

      this.clickGain = this.ctx.createGain();
      this.clickGain.gain.value = 0.35;
      this.clickGain.connect(this.master);

      this.compGain = this.ctx.createGain();
      this.compGain.gain.value = 0.22;
      this.compGain.connect(this.master);

      this.voiceGain = this.ctx.createGain();
      this.voiceGain.gain.value = 0.28;
      this.voiceGain.connect(this.master);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    return this.ctx;
  }

  status() {
    const inCountIn = this.playing && this.countInRemaining > 0;
    const formBeat = wrapFormBeat(Math.max(0, this.absoluteBeat - (inCountIn ? 0 : 0)));
    return {
      playing: this.playing,
      bpm: this.bpm,
      generation: this.gate.current(),
      inCountIn,
      countInRemaining: this.countInRemaining,
      formBeat: this.playing && !inCountIn ? wrapFormBeat(this.absoluteBeat) : 0,
      currentTime: this.ctx?.currentTime ?? 0,
    };
  }

  setBpm(bpm) {
    this.bpm = Math.min(180, Math.max(60, Number(bpm) || 96));
  }

  setModelPhrase(on) {
    this.modelPhrase = Boolean(on);
  }

  async start({ key, phrase, bpm, modelPhrase }) {
    await this.ensureContext();
    this.stop();
    this.key = key;
    this.phrase = phrase;
    this.setBpm(bpm);
    this.setModelPhrase(modelPhrase);
    const token = this.gate.bump();
    this.playing = true;
    this.countInRemaining = COUNT_IN_BARS * BEATS_PER_BAR;
    this.absoluteBeat = 0;
    this.nextTime = this.ctx.currentTime + 0.06;
    this.loopStartTime = this.nextTime;
    this.timer = setInterval(() => this.tick(token), LOOKAHEAD_MS);
    this.tick(token);
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    this.gate.bump();
    this.clearTimer();
    this.killLive();
  }

  stop() {
    this.playing = false;
    this.gate.bump();
    this.clearTimer();
    this.killLive();
    this.countInRemaining = 0;
    this.absoluteBeat = 0;
    this.onBeat?.({
      playing: false,
      inCountIn: false,
      countInRemaining: 0,
      formBeat: 0,
      bar: 1,
      beatInBar: 1,
    });
  }

  clearTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  killLive() {
    for (const node of this.liveNodes) {
      try {
        node.stop();
      } catch {
        /* already stopped */
      }
    }
    this.liveNodes.clear();
  }

  tick(token) {
    if (!this.gate.isCurrent(token) || !this.playing || !this.ctx) return;
    while (this.nextTime < this.ctx.currentTime + SCHEDULE_AHEAD) {
      if (!this.gate.isCurrent(token)) return;
      this.scheduleBeat(this.nextTime, token);
      this.nextTime += beatsToSeconds(1, this.bpm);
      if (this.countInRemaining > 0) this.countInRemaining -= 1;
      else this.absoluteBeat += 1;
    }
  }

  scheduleBeat(time, token) {
    if (!this.gate.isCurrent(token)) return;
    const inCountIn = this.countInRemaining > 0;
    if (inCountIn) {
      const beatInBar = ((COUNT_IN_BARS * BEATS_PER_BAR) - this.countInRemaining) % BEATS_PER_BAR;
      this.click(time, beatInBar === 0);
      this.onBeat?.({
        playing: true,
        inCountIn: true,
        countInRemaining: this.countInRemaining,
        formBeat: 0,
        bar: 0,
        beatInBar: beatInBar + 1,
      });
      return;
    }

    const formBeat = wrapFormBeat(this.absoluteBeat);
    const bar = Math.floor(formBeat / BEATS_PER_BAR) + 1;
    const beatInBar = (formBeat % BEATS_PER_BAR) + 1;
    this.click(time, beatInBar === 1, 0.18);
    this.comp(time, formBeat);
    if (this.modelPhrase) this.maybeMelody(time, formBeat);

    this.onBeat?.({
      playing: true,
      inCountIn: false,
      countInRemaining: 0,
      formBeat,
      bar,
      beatInBar,
    });
  }

  click(time, downbeat, gain = 0.45) {
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.frequency.value = downbeat ? 1320 : 880;
    env.gain.setValueAtTime(0.0001, time);
    env.gain.exponentialRampToValueAtTime(gain, time + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
    osc.connect(env);
    env.connect(this.clickGain);
    osc.start(time);
    osc.stop(time + 0.07);
    this.track(osc);
  }

  comp(time, formBeat) {
    const chord = chordsAtFormBeat(formBeat);
    const beatInBar = formBeat % BEATS_PER_BAR;
    const bassMidi = chordTonesMidi(this.key, chord.degree, chord.quality, 36)[0];
    this.tone(time, midiToHz(bassMidi + (beatInBar === 1 || beatInBar === 3 ? 7 : 0)), 0.22, this.compGain, "sine");
    if (beatInBar === 0 || beatInBar === 2) {
      const tones = chordTonesMidi(this.key, chord.degree, chord.quality, 52);
      for (const midi of tones.slice(0, 3)) {
        this.tone(time, midiToHz(midi), 0.28, this.compGain, "triangle");
      }
    }
  }

  maybeMelody(time, formBeat) {
    const beatDur = beatsToSeconds(1, this.bpm);
    const events = lickEvents(this.phrase.notes);
    for (const event of events) {
      if (event.rest) continue;
      if (Math.floor(event.formBeat + 1e-6) === formBeat) {
        const offset = (event.formBeat - formBeat) * beatDur;
        const midi = melodyMidi(this.key, event.interval, 72);
        this.tone(
          time + offset,
          midiToHz(midi),
          beatsToSeconds(event.durationBeats, this.bpm) * 0.92,
          this.voiceGain,
          "sawtooth",
          0.7
        );
      }
    }
  }

  tone(time, freq, dur, dest, type, peak = 0.9) {
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    env.gain.setValueAtTime(0.0001, time);
    env.gain.exponentialRampToValueAtTime(peak, time + 0.02);
    env.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(0.05, dur));
    osc.connect(env);
    env.connect(dest);
    osc.start(time);
    osc.stop(time + dur + 0.05);
    this.track(osc);
  }

  track(osc) {
    this.liveNodes.add(osc);
    osc.onended = () => this.liveNodes.delete(osc);
  }
}

export function midiToHz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}
