import assert from "node:assert/strict";
import test from "node:test";
import {
  barAndBeat,
  beatsToSeconds,
  beatsUntilPhrase,
  createGenerationGate,
  formBeats,
  isPhraseWindow,
  lickEvents,
  phraseStartFormBeat,
  wrapFormBeat,
} from "../js/scheduler.js";
import { ORIGINAL_PHRASE, chordName, keyById, melodyMidi, phraseToAbc } from "../js/music.js";

test("beatsToSeconds at 120 bpm", () => {
  assert.equal(beatsToSeconds(1, 120), 0.5);
  assert.equal(beatsToSeconds(4, 120), 2);
});

test("form is 32 beats and wraps", () => {
  assert.equal(formBeats(), 32);
  assert.equal(wrapFormBeat(32), 0);
  assert.equal(wrapFormBeat(-1), 31);
});

test("phrase window is bars 3-4", () => {
  assert.equal(isPhraseWindow(8), true);
  assert.equal(isPhraseWindow(7), false);
  assert.equal(isPhraseWindow(16), false);
  assert.equal(beatsUntilPhrase(0), 8);
  assert.equal(beatsUntilPhrase(8), 0);
});

test("bar and beat are 1-indexed", () => {
  assert.deepEqual(barAndBeat(0), { bar: 1, beatInBar: 1, formBeat: 0 });
  assert.deepEqual(barAndBeat(8), { bar: 3, beatInBar: 1, formBeat: 8 });
});

test("short ii-V-I maps onto the phrase window with expected pitches in C", () => {
  const events = lickEvents(ORIGINAL_PHRASE.notes);
  assert.equal(events[0].formBeat, phraseStartFormBeat());
  const c = keyById("C");
  assert.equal(melodyMidi(c, 2), 62); // D4
  assert.equal(melodyMidi(c, 7), 67); // G4, the written resolution
  assert.equal(chordName(c, 2, "m7"), "Dm7");
  assert.equal(chordName(c, 7, "7"), "G7");
  assert.equal(chordName(c, 0, "maj7"), "Cmaj7");
});

test("transposing to F moves ii-V-I to Gm7 C7 Fmaj7", () => {
  const f = keyById("F");
  assert.equal(chordName(f, 2, "m7"), "Gm7");
  assert.equal(chordName(f, 7, "7"), "C7");
  assert.equal(chordName(f, 0, "maj7"), "Fmaj7");
  assert.equal(melodyMidi(f, 7), 72); // C5, fifth of F
});

test("ABC contains the selected-key chord symbols", () => {
  const abc = phraseToAbc(keyById("Bb"), ORIGINAL_PHRASE);
  assert.match(abc, /Cm7/);
  assert.match(abc, /F7/);
  assert.match(abc, /Bbmaj7/);
});

test("generation gate cancels overlapping runs", () => {
  const gate = createGenerationGate();
  const first = gate.bump();
  const second = gate.bump();
  assert.equal(gate.isCurrent(first), false);
  assert.equal(gate.isCurrent(second), true);
});
