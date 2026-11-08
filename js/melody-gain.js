/**
 * Melody loudness for Hear it.
 * SAMPLE_RMS is the linear RMS of the first 250 ms of each sample (the part a
 * lick note actually plays). MELODY_GAIN_TABLE brings every note of every
 * melody sample set to MELODY_TARGET_AMPLITUDE, a few dB above the unducked
 * piano+bass. Hear it then ducks the backing buses by BACKING_DUCK_DB.
 */

import { SAMPLE_NOTES, nearestNote } from "./sound-samples.js";

export const MELODY_NOTE_GAIN = 0.34;
export const MELODY_VELOCITY = 0.7;
export const PIANO_NOTE_GAIN = 0.16;
export const BASS_NOTE_GAIN = 0.55;
export const PIANO_BUS_GAIN = 0.8;
export const BASS_BUS_GAIN = 0.85;
export const DRUM_BUS_GAIN = 0.7;
export const MELODY_BUS_GAIN = 1;
export const BACKING_DUCK_DB = 6;
export const BACKING_DUCK_GAIN = 10 ** (-BACKING_DUCK_DB / 20);

/** Audible amplitude (play gain × sample RMS × melody bus) for every normalized note. */
export const MELODY_TARGET_AMPLITUDE = 0.04;

export const MELODY_SAMPLE_SETS = Object.freeze(Object.keys(SAMPLE_NOTES));

export const SAMPLE_RMS = Object.freeze({
  trombone: {
    40: 0.12777, 43: 0.027372, 46: 0.110244, 49: 0.013727, 52: 0.022436, 55: 0.036027, 58: 0.043645, 61: 0.264237, 64: 0.185272, 67: 0.300517,
  },
  trumpet: {
    52: 0.165605, 55: 0.166564, 58: 0.160129, 61: 0.189729, 64: 0.186647, 67: 0.265419, 70: 0.182114, 73: 0.323292, 76: 0.276029, 79: 0.279609,
  },
  "alto-sax": {
    49: 0.251556, 52: 0.152027, 55: 0.134591, 58: 0.25388, 61: 0.166838, 64: 0.310386, 67: 0.184809, 70: 0.323667, 72: 0.215963,
  },
  "tenor-sax": {
    44: 0.248938, 47: 0.253761, 50: 0.214625, 53: 0.229019, 56: 0.163896, 59: 0.146101, 62: 0.211082, 65: 0.253442, 67: 0.184809,
  },
  guitar: {
    40: 0.232762, 43: 0.229602, 46: 0.245211, 49: 0.197138, 52: 0.254693, 55: 0.250922, 58: 0.217751, 61: 0.166987, 64: 0.163293, 67: 0.140554,
  },
  piano: {
    45: 0.11646, 48: 0.145324, 51: 0.141981, 54: 0.074837, 57: 0.057523,
    60: 0.14217, 63: 0.113086, 66: 0.113592, 69: 0.095408, 72: 0.049794,
  },
  bass: {
    28: 0.069, 29: 0.070876, 31: 0.068084, 33: 0.07003, 36: 0.063845,
    40: 0.063167, 43: 0.062283, 45: 0.061599, 48: 0.064046, 52: 0.060194,
  },
});

function buildGainTable() {
  const table = {};
  for (const set of MELODY_SAMPLE_SETS) {
    const gains = {};
    for (const note of SAMPLE_NOTES[set]) {
      const rms = SAMPLE_RMS[set]?.[note.midi];
      if (!rms) throw new Error(`Missing sample RMS for ${set} ${note.midi}`);
      gains[note.midi] = MELODY_TARGET_AMPLITUDE / (MELODY_NOTE_GAIN * MELODY_VELOCITY * rms);
    }
    table[set] = Object.freeze(gains);
  }
  return Object.freeze(table);
}

/** Extra linear gain per sample, applied on top of MELODY_NOTE_GAIN × velocity. */
export const MELODY_GAIN_TABLE = buildGainTable();

const BUS = {
  piano: PIANO_BUS_GAIN,
  bass: BASS_BUS_GAIN,
  drum: DRUM_BUS_GAIN,
  melody: MELODY_BUS_GAIN,
};

export function busGain(kind, duckBacking = false) {
  const base = BUS[kind] ?? 1;
  if (kind === "melody" || !duckBacking) return base;
  return base * BACKING_DUCK_GAIN;
}

export function nearestSampleMidi(kind, midi) {
  const notes = SAMPLE_NOTES[kind];
  if (!notes?.length) return midi;
  return nearestNote(notes, midi).midi;
}

export function sampleRms(kind, midi) {
  const sampleMidi = nearestSampleMidi(kind, midi);
  return SAMPLE_RMS[kind]?.[sampleMidi] ?? 0;
}

export function melodyPlayGain(sampleSet, sampleMidi, velocity = MELODY_VELOCITY) {
  const norm = MELODY_GAIN_TABLE[sampleSet]?.[sampleMidi] ?? 1;
  return MELODY_NOTE_GAIN * velocity * norm;
}

/**
 * Linear gain heard for one buffer: note gain × bus (including Hear it ducking).
 * Multiply by sampleRms for that buffer's contribution.
 */
export function eventBufferGain(event, { sampleSet, duckBacking = false, midi } = {}) {
  const vel = event.velocity ?? MELODY_VELOCITY;
  if (event.type === "melody") {
    const sampleMidi = nearestSampleMidi(sampleSet, midi ?? event.midi);
    return melodyPlayGain(sampleSet, sampleMidi, vel) * busGain("melody", duckBacking);
  }
  if (event.type === "piano") return PIANO_NOTE_GAIN * vel * busGain("piano", duckBacking);
  if (event.type === "bass") return BASS_NOTE_GAIN * vel * busGain("bass", duckBacking);
  return 0;
}

function powersAt(events, beat, sampleSet, duckBacking, melodyNote) {
  let mel = 0;
  let back = 0;
  for (const event of events) {
    const dur = event.durationBeats ?? 0;
    if (beat < event.beat || beat >= event.beat + dur) continue;
    if (event.type === "melody") {
      if (melodyNote && event !== melodyNote) continue;
      const gain = eventBufferGain(event, { sampleSet, duckBacking });
      const rms = sampleRms(sampleSet, event.midi);
      mel += (gain * rms) ** 2;
    } else if (event.type === "piano") {
      for (const note of event.midis) {
        const gain = eventBufferGain(event, { sampleSet, duckBacking, midi: note });
        const rms = sampleRms("piano", note);
        back += (gain * rms) ** 2;
      }
    } else if (event.type === "bass") {
      const gain = eventBufferGain(event, { sampleSet, duckBacking });
      const rms = sampleRms("bass", event.midi);
      back += (gain * rms) ** 2;
    }
  }
  return { mel, back };
}

function windowLevel(events, fromBeat, toBeat, sampleSet, duckBacking, melodyNote, step) {
  let melP = 0;
  let backP = 0;
  let count = 0;
  for (let beat = fromBeat; beat < toBeat - 1e-9; beat += step) {
    const { mel, back } = powersAt(events, beat, sampleSet, duckBacking, melodyNote);
    melP += mel;
    backP += back;
    count += 1;
  }
  if (!count) return { melodyRms: 0, backingRms: 0, marginDb: Number.NEGATIVE_INFINITY };
  const melodyRms = Math.sqrt(melP / count);
  const backingRms = Math.sqrt(backP / count);
  return {
    melodyRms,
    backingRms,
    marginDb: 20 * Math.log10(melodyRms / backingRms),
  };
}

/**
 * Melody vs piano+bass over the lick's sounding beats.
 * Level is the time average of (per-event gain × sample RMS), summed in power.
 */
export function lickBalance(events, sampleSet, { duckBacking = true, step = 0.01 } = {}) {
  const melody = events.filter((event) => event.type === "melody");
  if (!melody.length) {
    return {
      melodyRms: 0,
      backingRms: 0,
      marginDb: Number.NEGATIVE_INFINITY,
      minMarginDb: Number.NEGATIVE_INFINITY,
      notes: [],
    };
  }
  const notes = melody.map((event) => {
    const level = windowLevel(
      events,
      event.beat,
      event.beat + (event.durationBeats ?? 0),
      sampleSet,
      duckBacking,
      event,
      step,
    );
    return { midi: event.midi, beats: event.durationBeats ?? 0, ...level };
  });
  let melP = 0;
  let backP = 0;
  let weight = 0;
  for (const note of notes) {
    const w = note.beats > 0 ? note.beats : step;
    melP += note.melodyRms ** 2 * w;
    backP += note.backingRms ** 2 * w;
    weight += w;
  }
  const melodyRms = Math.sqrt(melP / weight);
  const backingRms = Math.sqrt(backP / weight);
  const minMarginDb = Math.min(...notes.map((note) => note.marginDb));
  return {
    melodyRms,
    backingRms,
    marginDb: 20 * Math.log10(melodyRms / backingRms),
    minMarginDb,
    notes,
  };
}
