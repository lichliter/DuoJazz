/**
 * Ordered note follower for rapid-fire Play.
 * A note counts when the pitch stays within 50 cents of the exact MIDI for ~80 ms.
 * A confidently voiced wrong pitch, including the right pitch class in the
 * wrong octave, fails the take once it has been held for 120 ms. Shorter
 * transients (glides, grace notes, YIN octave flickers) are ignored, and the
 * previous expected note may keep ringing. A wrong pitch must stay within
 * 50 cents of where it started, so scoops and slides into a note never fail. Timing is not judged.
 * A frame is voiced when YIN confidence is high and the level clears an
 * adaptive floor, so a quiet horn is not rejected by a fixed gate.
 * The same MIDI again needs a new attack: a short gap, or a dip
 * below half of that note's peak.
 */

import { centsBetween, midiFromHz } from "./grade.js";
import { spellShownMidi } from "./music.js";

export const FOLLOW_CENTS = 50;
export const SUSTAIN_MS = 80;
export const WRONG_MS = 120;
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

/** Cents error against the exact expected MIDI. An octave shift is not a match. */
export function nearestPitch(hz, expectedMidi) {
  if (midiFromHz(hz) == null || expectedMidi == null) return null;
  const cents = centsBetween(hz, expectedMidi);
  if (cents == null) return null;
  return { cents, midi: expectedMidi, shift: 0 };
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
    wrongMs: 0,
    wrongAnchor: null,
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
  state.wrongMs = 0;
  state.wrongAnchor = null;
  if (Math.round(prev) === Math.round(next)) {
    state.armed = false;
    state.releaseAmp = finishedPeak * 0.5;
  } else {
    state.armed = true;
  }
  return state;
}

function pitchClassOf(midi) {
  return ((Math.round(midi) % 12) + 12) % 12;
}

function failWrong(state, hz) {
  if (state.ended) return state;
  const heard = heardPitch(hz);
  const expected = state.expected[state.index];
  const wrongOctave = heard != null
    && expected != null
    && pitchClassOf(heard.midi) === pitchClassOf(expected);
  state.ended = true;
  state.reason = "wrong";
  state.passed = false;
  state.hint = wrongOctave
    ? `${hintForIndex(state.index)}, wrong octave`
    : hintForIndex(state.index);
  return state;
}

function isPreviousRing(state, hz) {
  if (state.index <= 0) return false;
  const prev = state.expected[state.index - 1];
  const expected = state.expected[state.index];
  if (prev == null || expected == null) return false;
  if (Math.round(prev) === Math.round(expected)) return false;
  return matchPitch(hz, prev) != null;
}

function trackWrong(state, frame, prevVoiced) {
  const t = Number(frame.t);
  const amp = frame.amp ?? 0;
  const heard = midiFromHz(frame.hz);
  const drifted = heard == null
    || state.wrongAnchor == null
    || Math.abs(heard - state.wrongAnchor) * 100 > FOLLOW_CENTS;
  if (drifted) {
    // A scoop or slide keeps moving, so only a steady wrong pitch counts.
    state.wrongAnchor = heard;
    state.wrongMs = 0;
  } else if (prevVoiced != null) {
    const gap = t - prevVoiced;
    if (gap > HOLD_GAP_MS) state.wrongMs = 0;
    else if (gap > 0) state.wrongMs += gap;
  }
  const expectedMidi = state.expected[state.index];
  if (expectedMidi != null) rememberClosest(state, frame, expectedMidi);
  state.sustainMs = 0;
  state.started = true;
  state.lastVoicedT = t;
  if (amp > state.peak) state.peak = amp;
  if (state.wrongMs >= WRONG_MS) return failWrong(state, frame.hz);
  return state;
}

function hearPrevious(state, frame) {
  const amp = frame.amp ?? 0;
  state.wrongMs = 0;
  state.wrongAnchor = null;
  state.sustainMs = 0;
  state.started = true;
  state.lastVoicedT = frame.t;
  if (amp > state.peak) state.peak = amp;
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

  if (expectedMidi != null && !match && isPreviousRing(state, hz)) {
    return hearPrevious(state, frame);
  }

  if (!state.armed) {
    const gap = prevVoiced == null ? Infinity : t - prevVoiced;
    if (gap >= REATTACK_GAP_MS || amp <= state.releaseAmp) state.sawRelease = true;
    if (!(state.sawRelease && amp > state.releaseAmp && match)) {
      if (!match && expectedMidi != null) return trackWrong(state, frame, prevVoiced);
      state.wrongMs = 0;
      state.wrongAnchor = null;
      state.started = true;
      state.lastVoicedT = t;
      if (amp > state.peak) state.peak = amp;
      return state;
    }
    state.armed = true;
    state.sustainMs = 0;
    state.wrongMs = 0;
    state.wrongAnchor = null;
    state.peak = amp;
    state.started = true;
    state.lastVoicedT = t;
    return state;
  }

  if (!match) {
    if (expectedMidi == null) {
      state.started = true;
      state.lastVoicedT = t;
      return state;
    }
    return trackWrong(state, frame, prevVoiced);
  }

  state.wrongMs = 0;
  state.wrongAnchor = null;
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
  const spelled = spellShownMidi(rounded, shownKey || true);
  return `${spelled.name}${spelled.octave}`;
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
