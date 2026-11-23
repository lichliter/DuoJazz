/**
 * Per-note pitch + timing grading for Play / Listen / Quiz cards.
 * Learn is not graded. Octave errors are flagged but do not fail a note.
 */

import {
  BEATS_PER_BAR,
  applicationKeyQuality,
  chordAtEventBeat,
  chorusChords,
  concertMidiToWritten,
  displayKey,
  getKey,
  learnChords,
  melodyMidiForInterval,
  octaveForApplication,
  spotOctavesFor,
  phraseEvents,
  spellMelodyMidi,
  usesFlatsForChord,
  wrapPc,
  beatsToSeconds,
  eventUsesSwing,
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
export const GRADE_AMP_FLOOR = 0.0015;
export const GRADE_CONFIDENCE_MIN = 0.8;
export const GRADED_CARDS = new Set(["play", "listen", "quiz"]);

function isUsableObservation(row) {
  if (!row || !(row.amp > GRADE_AMP_FLOOR) || !(row.hz > 0)) return false;
  if (typeof row.confidence === "number" && Number.isFinite(row.confidence) && row.confidence < GRADE_CONFIDENCE_MIN) {
    return false;
  }
  return true;
}

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
  const isolated = !lesson.chartTimed && (lesson.kind === "learn" || lesson.kind === "master");
  const events = phraseEvents(lesson.applicationId, isolated);
  const octaveBase = octaveForApplication(lesson.applicationId, key.pc, session.displayMode);
  const octaves = spotOctavesFor(lesson.applicationId, key.pc, session.displayMode);
  const quality = applicationKeyQuality(lesson.applicationId);
  const shownKey = displayKey(key, session.displayMode, quality);
  const chords = isolated
    ? learnChords(key, session.displayMode, lesson.applicationId)
    : chorusChords(key, session.displayMode, lesson.applicationId);
  return events.map((event, index) => {
    const swing = eventUsesSwing(event, session.swing);
    const startBeat = swing ? beatsToSeconds(event.beat, session.tempo, swing) * session.tempo / 60 : event.beat;
    const cellPc = event.cellInterval == null
      ? key.pc
      : wrapPc(key.pc + (event.cellTonicInterval ?? 0));
    const interval = event.cellInterval ?? event.interval;
    const oct = octaves[event.spotIndex ?? 0] ?? octaveBase;
    const midi = melodyMidiForInterval(cellPc, interval, session.melodyRegister, oct);
    const writtenMidi = concertMidiToWritten(midi, session.displayMode);
    const chord = chordAtEventBeat(chords, event.beat);
    const spelled = spellMelodyMidi(writtenMidi, shownKey, event, usesFlatsForChord(shownKey, chord));
    return {
      index,
      number: index + 1,
      startBeat,
      beats: event.beats,
      bar: event.beat < 0 ? 1 : Math.floor((event.beat + 1e-9) / BEATS_PER_BAR) + 1,
      midi,
      shownName: `${spelled.name}${spelled.octave}`,
      spotIndex: event.spotIndex ?? 0,
    };
  });
}

// The microphone supplies voiced frames. A sustained tone is one attack, even
// when it crosses a beat or bar. A gap or amplitude dip can separate repeats.
function timedOnsets(observations, tempo) {
  const onsets = [];
  const releaseGap = 0.075 * tempo / 60;
  let pitch = null;
  let lastBeat = -Infinity;
  let peak = 0;
  let trough = Infinity;
  for (const frame of observations) {
    if (!isUsableObservation(frame)) continue;
    const midi = Math.round(midiFromHz(frame.hz));
    if (midi !== pitch || frame.beat - lastBeat >= releaseGap || frame.amp >= 2 * trough) {
      pitch = midi;
      if (frame.beat >= 0) onsets.push({ ...frame });
      peak = frame.amp;
      trough = Infinity;
    } else if (frame.amp < peak * 0.5) {
      trough = Math.min(trough, frame.amp);
    }
    peak = Math.max(peak, frame.amp);
    lastBeat = frame.beat;
  }
  return onsets;
}

function pickOnset(pool, note, windowBeats, strictTiming, nextStartBeat) {
  const start = note.startBeat - windowBeats;
  const lateEnd = note.startBeat + (strictTiming ? 0 : Math.max(note.beats, 1)) + windowBeats;
  const tightEnd = Math.min(note.startBeat + windowBeats, (note.startBeat + nextStartBeat) / 2);
  let best = -1;
  let bestScore = Infinity;
  for (let i = 0; i < pool.length; i += 1) {
    const row = pool[i];
    if (row.used || !isUsableObservation(row)) continue;
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
  if (strictTiming) return onset;
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

function gradeNoteWithPool(note, pool, tempo, strictTiming = false, nextStartBeat = Infinity) {
  const windowBeats = strictTiming ? Math.min(timingWindowBeats(tempo), note.beats * 0.45) : timingWindowBeats(tempo);
  const onset = pickOnset(pool, note, windowBeats, strictTiming, nextStartBeat);
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

export function gradePerformance({ expected, observations, tempo, passThreshold = PASS_THRESHOLD, strictTiming = false }) {
  const pool = strictTiming ? timedOnsets(observations, tempo) : observations.map((row) => ({ ...row }));
  const notes = expected.map((note, index) =>
    gradeNoteWithPool(note, pool, tempo, strictTiming, expected[index + 1]?.startBeat));
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
  const passed = !strictTiming && spotResults.length > 1
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

/** Report each fully correct bar once, as soon as its final note is heard in time. */
export function chartPassFeedback(expected, tempo, { writtenOctave = false } = {}) {
  const byBar = new Map();
  for (const note of expected) {
    if (!byBar.has(note.bar)) byBar.set(note.bar, []);
    byBar.get(note.bar).push(note);
  }
  const bars = [...byBar.values()];
  let index = 0;
  return (beat, observations) => {
    while (index < bars.length) {
      const notes = bars[index];
      const last = notes.at(-1);
      const window = Math.min(timingWindowBeats(tempo), last.beats * 0.45);
      if (beat < last.startBeat - window) return false;
      if (beat > last.startBeat + window) {
        index += 1;
        continue;
      }
      const result = gradePerformance({
        expected: notes,
        observations,
        tempo,
        strictTiming: true,
      });
      if (!result.notes.every((note) => note.passed && (!writtenOctave || !note.octaveError))) return false;
      index += 1;
      return true;
    }
    return false;
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
    strictTiming: Boolean(lessonById(session.lessonId).chartTimed),
  });
  return {
    ...result,
    outcome: result.passed ? "passed" : "missed",
    cardId: card,
  };
}

export function hasPitchTake(observations = []) {
  return observations.some(isUsableObservation);
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
