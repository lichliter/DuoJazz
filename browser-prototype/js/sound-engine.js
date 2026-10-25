/**
 * Playback for sound.html. Subclasses Transport so Current is today's synth.
 * New and New-simple route sampled piano / bass / drums onto mixer buses.
 */

import { Transport } from "./audio.js";
import { beatsToSeconds } from "./music.js";

function midiToHz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export class BandTransport extends Transport {
  constructor() {
    super();
    this.engine = "current";
    this.library = null;
    this.pianoBus = null;
    this.bassBus = null;
    this.drumBus = null;
    this.melodyBus = null;
    this.tap = null;
  }

  async ensure() {
    await super.ensure();
    if (this.pianoBus) return;
    this.pianoBus = this.ctx.createGain();
    this.bassBus = this.ctx.createGain();
    this.drumBus = this.ctx.createGain();
    this.melodyBus = this.ctx.createGain();
    this.tap = this.ctx.createMediaStreamDestination();
    this.pianoBus.connect(this.master);
    this.bassBus.connect(this.master);
    this.drumBus.connect(this.master);
    this.melodyBus.connect(this.master);
    this.master.connect(this.tap);
  }

  setMixer({ piano = 1, bass = 1, drums = 1, melody = 1 } = {}) {
    if (!this.pianoBus) return;
    this.pianoBus.gain.value = piano;
    this.bassBus.gain.value = bass;
    this.drumBus.gain.value = drums;
    this.melodyBus.gain.value = melody;
  }

  toneTo(bus, time, freq, duration, { type = "sine", gain = 0.12, attack = 0.01, decay = 0.08 } = {}) {
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    env.gain.setValueAtTime(0.0001, time);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), time + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(duration, attack + decay));
    osc.connect(env);
    env.connect(bus);
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
    env.connect(bus);
    src.start(time);
    src.stop(time + duration + 0.05);
    this.nodes.push(src);
  }

  armChorus(config, { countIn, fromBeat }) {
    const events = (config.events ?? []).filter((event) => event.beat >= fromBeat && event.type !== "end");
    const origin = this.startedAt;
    if (countIn) this.scheduleCountIn(origin);
    for (const event of events) this.scheduleEvent(event, origin);
    this.chorusLengthBeats = config.lengthBeats ?? 0;
  }

  eventTime(event, origin) {
    const swing = event.swing === false || event.beat < 0 ? false : this.swing;
    let time = origin + beatsToSeconds(event.beat, this.tempo, swing);
    const dur = beatsToSeconds(event.durationBeats ?? 0.5, this.tempo, event.swing === false ? false : this.swing);
    if (time + dur < this.ctx.currentTime) return null;
    if (time < this.ctx.currentTime) time = this.ctx.currentTime;
    return { time, dur };
  }

  scheduleEvent(event, origin) {
    const placed = this.eventTime(event, origin);
    if (!placed) return;
    const { time, dur } = placed;
    const vel = event.velocity ?? 0.7;
    const sampled = (this.engine === "new" || this.engine === "new-simple") && this.library?.ready;

    if (event.type === "click") {
      this.noiseClick(time, { strong: event.strong, gain: event.strong ? 0.22 : 0.1 });
      return;
    }
    if (event.type === "melody") {
      this.toneTo(this.melodyBus, time, midiToHz(event.midi), dur * 0.92, {
        type: "triangle",
        gain: 0.2 * vel,
        attack: 0.012,
        decay: 0.09,
      });
      return;
    }
    if (event.type === "piano" && sampled) {
      for (const midi of event.midis) {
        const pick = this.library.nearest("piano", midi);
        this.playBuffer(pick.buffer, time, {
          bus: this.pianoBus,
          gain: 0.16 * vel,
          duration: dur,
          playbackRate: pick.playbackRate,
        });
      }
      return;
    }
    if (event.type === "chord") {
      const bus = this.pianoBus ?? this.master;
      for (const midi of event.midis) {
        this.toneTo(bus, time, midiToHz(midi), dur * 0.95, {
          type: "sine",
          gain: 0.045 * vel,
          attack: 0.03,
          decay: 0.2,
        });
      }
      return;
    }
    if (event.type === "bass") {
      if (sampled) {
        const pick = this.library.nearest("bass", event.midi);
        this.playBuffer(pick.buffer, time, {
          bus: this.bassBus,
          gain: 0.55 * vel,
          duration: dur,
          playbackRate: pick.playbackRate,
        });
        return;
      }
      this.toneTo(this.bassBus ?? this.master, time, midiToHz(event.midi), dur * 0.88, {
        type: "sine",
        gain: 0.16 * vel,
        attack: 0.008,
        decay: 0.1,
      });
      return;
    }
    if (event.type === "drum" && sampled) {
      const buffer = this.library.drum(event.drum);
      const gain = event.drum === "kick" ? 0.45 * vel : event.drum.includes("ride") || event.drum.includes("Ride") ? 0.28 * vel : 0.32 * vel;
      this.playBuffer(buffer, time, {
        bus: this.drumBus,
        gain,
        duration: Math.max(dur, event.drum.includes("ride") || event.drum.includes("Ride") ? 1.4 : 0.35),
        playbackRate: 1,
      });
    }
  }
}
