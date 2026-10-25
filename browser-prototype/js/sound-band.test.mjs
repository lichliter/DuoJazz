import test from "node:test";
import assert from "node:assert/strict";
import { wrapPc } from "./music.js";
import {
  BLUES_CHORUSES,
  COMP_CELLS,
  TEST_PHRASE,
  backingFor,
  chordsForForm,
  clipArrangement,
  drumPattern,
  fBluesChords,
  formLengthBeats,
  humanize,
  pianoComping,
  rootlessVoicing,
  scheduleCurrent,
  scheduleNew,
  stThomasChords,
  voicingHasGuideTones,
  walkingBassLine,
  withMelody,
} from "./sound-band.js";

test("F blues is 12 bars × 2 choruses of dominant sevenths", () => {
  const chords = fBluesChords();
  assert.equal(chords.length, 12 * BLUES_CHORUSES);
  assert.equal(formLengthBeats(chords), 96);
  assert.deepEqual(
    chords.slice(0, 12).map((chord) => chord.name),
    ["F7", "B♭7", "F7", "F7", "B♭7", "B♭7", "F7", "F7", "C7", "B♭7", "F7", "C7"],
  );
});

test("St. Thomas form is the app tune, 16 bars in C", () => {
  const chords = stThomasChords();
  assert.equal(formLengthBeats(chords), 64);
  assert.equal(chords[0].name, "Cmaj7");
  assert.ok(chordsForForm("st-thomas").length >= 16);
});

test("rootless voicings keep 3rd and 7th and omit the root", () => {
  const f7 = rootlessVoicing(5, "dominant7");
  assert.equal(voicingHasGuideTones(f7, 5, "dominant7"), true);
  assert.equal(f7.map((midi) => wrapPc(midi)).includes(5), false);
  const cmaj = rootlessVoicing(0, "major7");
  assert.equal(voicingHasGuideTones(cmaj, 0, "major7"), true);
  const next = rootlessVoicing(10, "dominant7", f7);
  assert.equal(next.length, 4);
});

test("walking bass puts the root on beat 1 and approaches the next chord", () => {
  const chords = fBluesChords(1);
  const line = walkingBassLine(chords, { seed: 1 });
  assert.equal(line.length, 48);
  assert.equal(wrapPc(line[0].midi), 5);
  const intoBb = line[3];
  const bbRoot = 10;
  const distance = Math.abs(wrapPc(intoBb.midi) - bbRoot);
  assert.ok(distance === 1 || distance === 11 || distance === 2 || distance === 10);
});

test("piano comps on and off the beat, not every beat", () => {
  assert.ok(COMP_CELLS.some((cell) => cell.length === 0));
  const hits = pianoComping(fBluesChords(1), { seed: 2 });
  const beats = new Set(hits.map((event) => Math.floor(event.beat)));
  assert.ok(hits.length < 48);
  assert.ok(beats.size < 48);
  assert.ok(hits.some((event) => event.beat % 1 !== 0));
});

test("drums ride every quarter with hi-hat on 2 and 4", () => {
  const drums = drumPattern(16, { seed: 3 });
  const rides = drums.filter((event) => event.drum === "ride" && event.beat % 1 === 0);
  assert.equal(rides.length, 16);
  const hats = drums.filter((event) => event.drum === "hat");
  assert.ok(hats.every((event) => Math.floor(event.beat) % 4 === 1 || Math.floor(event.beat) % 4 === 3));
  const kicks = drums.filter((event) => event.drum === "kick");
  assert.ok(kicks.every((event) => event.velocity < 0.35));
});

test("humanize keeps event count and nudges timing/velocity", () => {
  const source = pianoComping(fBluesChords(1), { seed: 2 });
  const felt = humanize(source, { seed: 9 });
  assert.equal(felt.length, source.length);
  assert.ok(felt.some((event, i) => event.beat !== source[i].beat || event.velocity !== source[i].velocity));
});

test("Current uses today's synth voicings; New adds drums and piano comps", () => {
  const current = scheduleCurrent(fBluesChords(1));
  assert.ok(current.events.some((event) => event.type === "chord"));
  assert.ok(current.events.some((event) => event.type === "bass"));
  assert.equal(current.events.filter((event) => event.type === "drum").length, 0);
  const next = scheduleNew(fBluesChords(1), { seed: 7 });
  assert.ok(next.events.some((event) => event.type === "piano"));
  assert.ok(next.events.some((event) => event.type === "drum"));
  assert.ok(next.events.some((event) => event.type === "bass"));
});

test("clip and melody helpers keep a grade-check take to two bars", () => {
  const clipped = withMelody(clipArrangement(backingFor("new", "blues"), 8));
  assert.equal(clipped.lengthBeats, 8);
  assert.equal(clipped.events.filter((event) => event.type === "melody").length, TEST_PHRASE.length);
});
