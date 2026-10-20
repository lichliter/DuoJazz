/**
 * Pure timing helpers for the DuoJazz browser prototype.
 * No Web Audio here — these functions are unit-tested in Node.
 */

export const BEATS_PER_BAR = 4;
export const FORM_BARS = 8;
export const COUNT_IN_BARS = 1;
export const PHRASE_START_BAR = 3; // 1-indexed
export const PHRASE_END_BAR = 4;

export function beatsToSeconds(beats, bpm) {
  if (!(bpm > 0)) throw new Error("bpm must be positive");
  return (beats * 60) / bpm;
}

export function secondsToBeats(seconds, bpm) {
  if (!(bpm > 0)) throw new Error("bpm must be positive");
  return (seconds * bpm) / 60;
}

export function formBeats() {
  return FORM_BARS * BEATS_PER_BAR;
}

export function countInBeats() {
  return COUNT_IN_BARS * BEATS_PER_BAR;
}

/** Absolute beat in the looping 8-bar form (0 .. 31). */
export function wrapFormBeat(beat) {
  const total = formBeats();
  return ((beat % total) + total) % total;
}

export function barAndBeat(formBeat) {
  const wrapped = wrapFormBeat(formBeat);
  return {
    bar: Math.floor(wrapped / BEATS_PER_BAR) + 1,
    beatInBar: (wrapped % BEATS_PER_BAR) + 1,
    formBeat: wrapped,
  };
}

export function isPhraseWindow(formBeat) {
  const { bar } = barAndBeat(formBeat);
  return bar >= PHRASE_START_BAR && bar <= PHRASE_END_BAR;
}

export function beatsUntilPhrase(formBeat) {
  const start = (PHRASE_START_BAR - 1) * BEATS_PER_BAR;
  const wrapped = wrapFormBeat(formBeat);
  if (wrapped <= start) return start - wrapped;
  return start + formBeats() - wrapped;
}

/**
 * Map a lick (durations in beats, starting at phrase window) onto form beats.
 * Phrase begins at beat 8 of the 32-beat form (bar 3, beat 1).
 */
export function phraseStartFormBeat() {
  return (PHRASE_START_BAR - 1) * BEATS_PER_BAR;
}

export function lickEvents(notes) {
  const start = phraseStartFormBeat();
  let cursor = start;
  return notes.map((note) => {
    const event = {
      formBeat: cursor,
      durationBeats: note.beats,
      interval: note.interval,
      rest: Boolean(note.rest),
    };
    cursor += note.beats;
    return event;
  });
}

/**
 * A generation token cancels in-flight schedules without overlapping runs.
 */
export function createGenerationGate() {
  let generation = 0;
  return {
    current() {
      return generation;
    },
    bump() {
      generation += 1;
      return generation;
    },
    isCurrent(token) {
      return token === generation;
    },
  };
}
