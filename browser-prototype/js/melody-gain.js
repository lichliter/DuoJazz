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
    40: 0.030247, 43: 0.030512, 46: 0.047553, 49: 0.051528, 52: 0.065941,
    55: 0.055107, 58: 0.057522, 61: 0.04861, 64: 0.055449, 67: 0.064985,
  },
  trumpet: {
    52: 0.032078, 55: 0.031493, 58: 0.031015, 61: 0.03126, 64: 0.03049,
    67: 0.038501, 70: 0.038261, 73: 0.038477, 76: 0.04254, 79: 0.041707,
  },
  "alto-sax": {
    49: 0.062708, 52: 0.060687, 55: 0.051952, 58: 0.060819, 61: 0.058956,
    64: 0.047888, 67: 0.069065, 70: 0.053215, 72: 0.051445,
  },
  "tenor-sax": {
    44: 0.049089, 47: 0.049088, 50: 0.033349, 53: 0.051159, 56: 0.042319,
    59: 0.057303, 62: 0.05764, 65: 0.038064, 67: 0.038239,
  },
  guitar: {
    40: 0.059521, 43: 0.059819, 46: 0.072774, 49: 0.0639, 52: 0.063008,
    55: 0.061555, 58: 0.063818, 61: 0.045181, 64: 0.04326, 67: 0.041577,
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
