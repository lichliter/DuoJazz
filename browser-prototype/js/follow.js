/**
 * Ordered note follower for rapid-fire Play.
 * A note counts when the pitch stays within 50 cents (any octave) for ~80 ms.
 * Wrong pitches do not fail the take. Timing is not judged.
 * The same pitch class again needs a new attack: a short gap or an amplitude dip.
 */

import { centsBetween, midiFromHz, wrapMidi } from "./grade.js";
import { spellMidi, spellPitchInKey } from "./music.js";

export const FOLLOW_CENTS = 50;
export const SUSTAIN_MS = 80;
export const SILENCE_MS = 1000;
export const NO_SOUND_MS = 8000;
export const REATTACK_GAP_MS = 40;
export const HOLD_GAP_MS = 70;

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
    releaseAmp: 0.02,
    sawRelease: false,
  };
}

function finish(state, reason) {
  if (state.ended) return state;
  state.ended = true;
  state.reason = reason;
  state.passed = reason === "matched";
  state.hint = state.passed ? null : hintForIndex(state.index);
  return state;
}

function rememberClosest(state, frame, expectedMidi) {
  const near = nearestPitch(frame.hz, expectedMidi);
  if (!near) return;
  if (!state.closest || state.closest.index !== state.index || Math.abs(near.cents) < Math.abs(state.closest.cents)) {
    state.closest = { index: state.index, cents: near.cents, midi: near.midi, hz: frame.hz };
  }
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
  state.peak = frame.amp;
  if (state.index >= state.expected.length) return finish(state, "matched");
  const next = state.expected[state.index];
  state.sawRelease = false;
  if (wrapMidi(prev) === wrapMidi(next)) {
    state.armed = false;
    state.releaseAmp = Math.max(0.02, state.peak * 0.5);
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
  const voiced = amp > 0.01 && hz > 0;
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
