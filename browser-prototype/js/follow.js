/**
 * Ordered note follower for rapid-fire Play.
 * A note counts when the pitch stays within 50 cents (any octave) for ~80 ms.
 * Wrong pitches do not fail the take. Timing is not judged.
 * A frame is voiced when YIN confidence is high and the level clears an
 * adaptive floor, so a quiet horn is not rejected by a fixed gate.
 * The same pitch class again needs a new attack: a short gap, or a dip
 * below half of that note's peak.
 */

import { centsBetween, midiFromHz, wrapMidi } from "./grade.js";
import { spellMidi, spellPitchInKey } from "./music.js";

export const FOLLOW_CENTS = 50;
export const SUSTAIN_MS = 80;
export const SILENCE_MS = 1000;
export const NO_SOUND_MS = 8000;
export const REATTACK_GAP_MS = 40;
export const HOLD_GAP_MS = 70;
export const VOICED_MIN_HZ = 40;
export const VOICED_MAX_HZ = 2000;
/** Absolute level floor. A quiet horn can sit near 0.004 rms. */
export const AMP_FLOOR = 0.0015;
/** YIN confidence (1 - d[tau]) required before a frame counts as a note. */
export const CONFIDENCE_MIN = 0.8;
/** Voiced level must clear this multiple of the recent noise floor. */
export const NOISE_RATIO = 3;
const NOISE_WINDOW = 24;

function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  if (n % 10 === 1) return `${n}st`;
  if (n % 10 === 2) return `${n}nd`;
  if (n % 10 === 3) return `${n}rd`;
  return `${n}th`;
}

export function hintForIndex(index) {
  return `${ordinal(index + 1)} note`;
}

/** Nearest octave of the expected MIDI note, and the cents error against it. */
export function nearestPitch(hz, expectedMidi) {
  const heard = midiFromHz(hz);
  if (heard == null || expectedMidi == null) return null;
  const shift = Math.round((heard - expectedMidi) / 12);
  const target = expectedMidi + shift * 12;
  const cents = centsBetween(hz, target);
  if (cents == null) return null;
  return { cents, midi: target, shift };
}

export function matchPitch(hz, expectedMidi, limit = FOLLOW_CENTS) {
  const near = nearestPitch(hz, expectedMidi);
  if (!near || Math.abs(near.cents) > limit) return null;
  return near;
}

export function createFollower(expected, origin = null) {
  const notes = Array.isArray(expected) ? expected.slice() : [];
  return {
    expected: notes,
    index: 0,
    sustainMs: 0,
    armed: true,
    heard: [],
    closest: null,
    started: false,
    ended: false,
    passed: false,
    reason: null,
    hint: null,
    origin,
    lastVoicedT: null,
    peak: 0,
    releaseAmp: 0,
    sawRelease: false,
    noise: [],
  };
}

function confidenceOf(frame) {
  const value = frame?.confidence;
  return typeof value === "number" && Number.isFinite(value) ? value : 1;
}

function rememberNoise(state, amp) {
  if (!state.noise) state.noise = [];
  state.noise.push(Math.max(0, amp));
  if (state.noise.length > NOISE_WINDOW) state.noise.shift();
}

/** Low percentile of recent non-tonal frames, so a steady quiet note does not raise its own gate. */
function noiseFloor(state) {
  const samples = state.noise;
  if (!samples?.length) return 0;
  const sorted = samples.slice().sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * 0.2));
  return sorted[index];
}

function frameIsVoiced(state, frame) {
  const amp = frame?.amp ?? 0;
  const hz = frame?.hz ?? 0;
  const sure = confidenceOf(frame) >= CONFIDENCE_MIN;
  const inBand = hz > VOICED_MIN_HZ && hz < VOICED_MAX_HZ;
  if (!sure || !(amp > AMP_FLOOR)) rememberNoise(state, amp);
  const gate = Math.max(AMP_FLOOR, noiseFloor(state) * NOISE_RATIO);
  return sure && inBand && amp > gate;
}

function finish(state, reason) {
  if (state.ended) return state;
  state.ended = true;
  state.reason = reason;
  state.passed = reason === "matched";
  state.hint = state.passed ? null : hintForIndex(state.index);
  return state;
}

/** The note that was actually in the air, and how many cents it sits from that note. */
export function heardPitch(hz) {
  const midiFloat = midiFromHz(hz);
  if (midiFloat == null) return null;
  const midi = Math.round(midiFloat);
  const cents = centsBetween(hz, midi);
  if (cents == null) return null;
  return { midi, cents, hz };
}

function rememberClosest(state, frame, expectedMidi) {
  const near = nearestPitch(frame.hz, expectedMidi);
  const heard = heardPitch(frame.hz);
  if (!near || !heard) return;
  const previous = state.closest;
  const closer = !previous
    || previous.index !== state.index
    || Math.abs(near.cents) < Math.abs(previous.error);
  if (!closer) return;
  state.closest = {
    index: state.index,
    cents: heard.cents,
    midi: heard.midi,
    hz: frame.hz,
    error: near.cents,
  };
}

function confirm(state, match, frame) {
  state.heard.push({
    index: state.index,
    cents: match.cents,
    midi: match.midi,
    hz: frame.hz,
  });
  const prev = state.expected[state.index];
  state.index += 1;
  state.sustainMs = 0;
  state.closest = null;
  const finishedPeak = Math.max(state.peak, frame.amp ?? 0);
  state.peak = frame.amp ?? 0;
  if (state.index >= state.expected.length) return finish(state, "matched");
  const next = state.expected[state.index];
  state.sawRelease = false;
  if (wrapMidi(prev) === wrapMidi(next)) {
    state.armed = false;
    state.releaseAmp = finishedPeak * 0.5;
  } else {
    state.armed = true;
  }
  return state;
}

export function tickFollower(state, now) {
  if (!state || state.ended) return state;
  if (state.origin == null) state.origin = now;
  const elapsed = now - state.origin;
  if (state.started && state.lastVoicedT != null && now - state.lastVoicedT >= SILENCE_MS) {
    return finish(state, "silence");
  }
  if (!state.started && elapsed >= NO_SOUND_MS) return finish(state, "timeout");
  return state;
}

export function stepFollower(state, frame) {
  if (!state || state.ended) return state;
  const t = Number(frame?.t);
  if (!Number.isFinite(t)) return state;
  if (state.origin == null) state.origin = t;
  const amp = frame.amp ?? 0;
  const hz = frame.hz ?? 0;
  const voiced = frameIsVoiced(state, frame);
  if (!voiced) {
    if (!state.armed && state.lastVoicedT != null && t - state.lastVoicedT >= REATTACK_GAP_MS) {
      state.sawRelease = true;
    }
    return tickFollower(state, t);
  }

  const expectedMidi = state.expected[state.index];
  const match = expectedMidi == null ? null : matchPitch(hz, expectedMidi);
  const prevVoiced = state.lastVoicedT;

  if (!state.armed) {
    const gap = prevVoiced == null ? Infinity : t - prevVoiced;
    if (gap >= REATTACK_GAP_MS || amp <= state.releaseAmp) state.sawRelease = true;
    if (expectedMidi != null) rememberClosest(state, frame, expectedMidi);
    if (!(state.sawRelease && amp > state.releaseAmp && match)) {
      state.started = true;
      state.lastVoicedT = t;
      if (amp > state.peak) state.peak = amp;
      return state;
    }
    state.armed = true;
    state.sustainMs = 0;
    state.peak = amp;
    state.started = true;
    state.lastVoicedT = t;
    return state;
  }

  if (!match) {
    state.sustainMs = 0;
    if (expectedMidi != null) rememberClosest(state, frame, expectedMidi);
    state.started = true;
    state.lastVoicedT = t;
    if (amp > state.peak) state.peak = amp;
    return state;
  }

  if (prevVoiced != null) {
    const gap = t - prevVoiced;
    if (gap > HOLD_GAP_MS) state.sustainMs = 0;
    else if (gap > 0) state.sustainMs += gap;
  }
  if (amp > state.peak) state.peak = amp;
  state.started = true;
  state.lastVoicedT = t;
  if (state.sustainMs >= SUSTAIN_MS) return confirm(state, match, frame);
  return state;
}

export function runFollower(expected, frames, origin = 0) {
  let state = createFollower(expected, origin);
  for (const frame of frames) state = stepFollower(state, frame);
  return state;
}

export function noteName(midi, shownKey) {
  const rounded = Math.round(midi);
  const pc = ((rounded % 12) + 12) % 12;
  const octave = Math.floor(rounded / 12) - 1;
  const name = shownKey ? spellPitchInKey(pc, shownKey).name : spellMidi(rounded, true).name;
  return `${name}${octave}`;
}

function formatHeard(midi, cents, shownKey) {
  const rounded = Math.round(cents);
  const body = rounded === 0 ? "0¢" : `${rounded > 0 ? "+" : "−"}${Math.abs(rounded)}¢`;
  return `${noteName(midi, shownKey)} ${body}`;
}

export function formatLevelDb(amp) {
  if (!(amp > 0)) return "— dB";
  const db = 20 * Math.log10(amp);
  if (!Number.isFinite(db)) return "— dB";
  return `${db.toFixed(1)} dB`;
}

/** Live debug line: rms, dB, nearest note and cents, YIN confidence. */
export function formatLiveLine(frame, shownKey = null) {
  const amp = frame?.rms ?? frame?.amp ?? 0;
  const confidence = typeof frame?.confidence === "number" && Number.isFinite(frame.confidence)
    ? frame.confidence.toFixed(2)
    : "—";
  const heard = frame?.hz > VOICED_MIN_HZ && frame.hz < VOICED_MAX_HZ ? heardPitch(frame.hz) : null;
  const note = heard ? formatHeard(heard.midi, heard.cents, shownKey) : "—";
  const level = Number.isFinite(amp) ? Number(amp).toFixed(4) : "0.0000";
  return `${level} rms · ${formatLevelDb(amp)} · ${note} · conf ${confidence}`;
}

/** Expected names, and what was heard for each note (name and cents). */
export function describeAttempt(state, shownKey = null) {
  const expected = state.expected.map((midi) => noteName(midi, shownKey));
  const heard = state.expected.map((_, index) => {
    const hit = state.heard.find((row) => row.index === index);
    if (hit) return formatHeard(hit.midi, hit.cents, shownKey);
    if (state.closest && state.closest.index === index) {
      return formatHeard(state.closest.midi, state.closest.cents, shownKey);
    }
    return "—";
  });
  return {
    expected,
    heard,
    text: `Expected ${expected.join(" ")} · Heard ${heard.join(" · ")}`,
  };
}

/** Keep the strip only while it still belongs to this key. A new key gets a fresh line. */
export function debugTextForKey(lastDebug, keyId, freshText) {
  if (lastDebug && lastDebug.keyId === keyId && lastDebug.text) return lastDebug.text;
  return freshText;
}
