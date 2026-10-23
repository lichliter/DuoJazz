/**
 * Per-note pitch + timing grading for Play / Listen / Quiz cards.
 * Learn is not graded. Octave errors are flagged but do not fail a note.
 */

import {
  BEATS_PER_BAR,
  getKey,
  melodyMidiForInterval,
  octaveForApplication,
  phraseEvents,
  wrapPc,
} from "./music.js";
import {
  currentCard,
  currentKeyId,
  isGradedCard,
  lessonById,
  shouldGradeNow,
  skipResult,
} from "./session.js";

export const PASS_THRESHOLD = 0.8;
export const PITCH_CENTS = 50;
export const GRADED_CARDS = new Set(["play", "listen", "quiz"]);

export function hzFromMidi(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function midiFromHz(hz) {
  if (!(hz > 0)) return null;
  return 69 + 12 * Math.log2(hz / 440);
}

export function centsBetween(freqHz, expectedMidi) {
  if (!(freqHz > 0)) return null;
  return 1200 * Math.log2(freqHz / hzFromMidi(expectedMidi));
}

export function wrapMidi(midi) {
  return ((Math.round(midi) % 12) + 12) % 12;
}

function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  if (n % 10 === 1) return `${n}st`;
  if (n % 10 === 2) return `${n}nd`;
  if (n % 10 === 3) return `${n}rd`;
  return `${n}th`;
}

export function timingWindowBeats(tempo) {
  const bpm = Math.min(160, Math.max(60, tempo || 96));
  return 0.22 + (96 / bpm) * 0.18;
}

export function expectedNotesFor(session) {
  const lesson = lessonById(session.lessonId);
  const key = getKey(currentKeyId(session));
  const isolated = lesson.kind === "learn";
  const events = phraseEvents(lesson.applicationId, isolated);
  const octaveBase = octaveForApplication(lesson.applicationId, key.pc);
  return events.map((event, index) => {
    const startBeat = event.beat;
    const cellPc = event.cellInterval == null
      ? key.pc
      : wrapPc(key.pc + (event.cellTonicInterval ?? 0));
    const interval = event.cellInterval ?? event.interval;
    return {
      index,
      number: index + 1,
      startBeat,
      beats: event.beats,
      bar: startBeat < 0 ? 1 : Math.floor(startBeat / BEATS_PER_BAR) + 1,
      midi: melodyMidiForInterval(cellPc, interval, session.melodyRegister, octaveBase),
      spotIndex: event.spotIndex ?? 0,
    };
  });
}

function pickOnset(pool, note, windowBeats) {
  const start = note.startBeat - windowBeats;
  const lateEnd = note.startBeat + Math.max(note.beats, 1) + windowBeats;
  const tightEnd = note.startBeat + windowBeats;
  let best = -1;
  let bestScore = Infinity;
  for (let i = 0; i < pool.length; i += 1) {
    const row = pool[i];
    if (row.used || !(row.amp > 0.01) || !(row.hz > 0)) continue;
    if (row.beat < start || row.beat > lateEnd) continue;
    const heard = midiFromHz(row.hz);
    const pitchClass = heard != null && wrapMidi(heard) === wrapMidi(note.midi);
    // Wrong-pitch hits stay in the tight window so a missed pickup or
    // 16th cannot steal the next note's onset and cascade the grade.
    if (!pitchClass && row.beat > tightEnd) continue;
    const score = (pitchClass ? 0 : 2) + Math.abs(row.beat - note.startBeat);
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  if (best < 0) return null;
  const onset = pool[best];
  onset.used = true;
  for (const row of pool) {
    if (row.used) continue;
    if (Math.abs(row.beat - onset.beat) < 0.3 && Math.abs(row.hz - onset.hz) < 1) row.used = true;
  }
  return onset;
}

function classifyPitch(cents) {
  if (cents == null) return { ok: false, kind: "miss" };
  const abs = Math.abs(cents);
  if (abs <= PITCH_CENTS) return { ok: true, kind: "ok" };
  return { ok: false, kind: cents < 0 ? "flat" : "sharp" };
}

function gradeNoteWithPool(note, pool, tempo) {
  const windowBeats = timingWindowBeats(tempo);
  const onset = pickOnset(pool, note, windowBeats);
  if (!onset) {
    return {
      ...note,
      heard: false,
      passed: false,
      octaveError: false,
      cents: null,
      timingBeats: null,
      kind: "silence",
    };
  }

  const timingBeats = onset.beat - note.startBeat;
  const late = timingBeats > windowBeats;
  const early = timingBeats < -windowBeats;

  const centsRaw = centsBetween(onset.hz, note.midi);
  const midiHeard = midiFromHz(onset.hz);
  const octaveError = midiHeard != null && wrapMidi(midiHeard) === wrapMidi(note.midi)
    && Math.abs((midiHeard ?? 0) - note.midi) >= 10;
  const cents = octaveError && midiHeard != null
    ? centsBetween(onset.hz, note.midi + 12 * Math.round((midiHeard - note.midi) / 12))
    : centsRaw;
  const pitch = classifyPitch(cents);
  const passed = pitch.ok && !late && !early;

  let kind = "ok";
  if (!pitch.ok) kind = pitch.kind;
  else if (late) kind = "late";
  else if (early) kind = "early";
  else if (octaveError) kind = "octave";

  return {
    ...note,
    heard: true,
    passed,
    octaveError,
    cents,
    timingBeats,
    kind,
  };
}

export function gradeNote(note, observations, tempo) {
  return gradeNoteWithPool(note, observations.map((row) => ({ ...row })), tempo);
}

export function mostUsefulCorrection(noteResults) {
  const rank = { silence: 0, miss: 1, flat: 2, sharp: 2, late: 3, early: 3, octave: 4, ok: 9 };
  const bad = noteResults.filter((note) => note.kind !== "ok");
  if (!bad.length) return null;
  bad.sort((a, b) => {
    const rankDelta = (rank[a.kind] ?? 8) - (rank[b.kind] ?? 8);
    if (rankDelta) return rankDelta;
    const centsDelta = Math.abs(b.cents ?? 0) - Math.abs(a.cents ?? 0);
    if (centsDelta) return centsDelta;
    return a.startBeat - b.startBeat;
  });
  const note = bad[0];
  const where = `Bar ${note.bar} · ${ordinal(note.number)} note`;
  if (note.kind === "silence" || note.kind === "miss") return `${where} didn't speak`;
  if (note.kind === "flat") return `${where} a little flat`;
  if (note.kind === "sharp") return `${where} a little sharp`;
  if (note.kind === "late") return `${where} late`;
  if (note.kind === "early") return `${where} early`;
  if (note.kind === "octave") return `${where} right pitch, wrong octave`;
  return `${where} off`;
}

export function gradePerformance({ expected, observations, tempo, passThreshold = PASS_THRESHOLD }) {
  const pool = observations.map((row) => ({ ...row }));
  const notes = expected.map((note) => gradeNoteWithPool(note, pool, tempo));
  const passedCount = notes.filter((note) => note.passed).length;
  const score = notes.length ? passedCount / notes.length : 0;
  const spotIds = [...new Set(notes.map((note) => note.spotIndex ?? 0))];
  const spotResults = spotIds.map((id) => {
    const group = notes.filter((note) => (note.spotIndex ?? 0) === id);
    const groupPassed = group.filter((note) => note.passed).length;
    const groupScore = group.length ? groupPassed / group.length : 0;
    return {
      spotIndex: id,
      passed: groupScore >= passThreshold,
      score: groupScore,
      total: group.length,
    };
  });
  const passed = spotResults.length > 1
    ? spotResults.every((spot) => spot.passed)
    : score >= passThreshold;
  return {
    graded: true,
    passed,
    score,
    percent: Math.round(score * 100),
    passedCount,
    total: notes.length,
    notes,
    spots: spotResults,
    correction: mostUsefulCorrection(notes),
  };
}

export function gradeSession(session, observations) {
  const card = currentCard(session);
  if (!GRADED_CARDS.has(card)) {
    return { graded: false, outcome: "completed", passed: false, score: null, correction: null };
  }
  const result = gradePerformance({
    expected: expectedNotesFor(session),
    observations,
    tempo: session.tempo,
  });
  return {
    ...result,
    outcome: result.passed ? "passed" : "missed",
    cardId: card,
  };
}

export function hasPitchTake(observations = []) {
  return observations.some((row) => row.amp > 0.01 && row.hz > 0);
}

/** Grade a take, or Skipped when a graded card has no take. Never a pass without a take. */
export function finishCard(session, observations = []) {
  if (shouldGradeNow(session, { hasTake: hasPitchTake(observations) })) {
    return gradeSession(session, observations);
  }
  if (isGradedCard(currentCard(session))) return skipResult(session);
  return { outcome: "completed", graded: false, passed: false };
}

export function synthTrack(expected, { cents = 0, delayBeats = 0, octave = 0, silence = false, amp = 0.2 } = {}) {
  if (silence) return [];
  return expected.flatMap((note) => {
    const midi = note.midi + octave * 12;
    const hz = hzFromMidi(midi) * 2 ** (cents / 1200);
    return [0, 0.08, 0.16].map((offset) => ({
      beat: note.startBeat + delayBeats + offset,
      hz,
      amp,
    }));
  });
}
