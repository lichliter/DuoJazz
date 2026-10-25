import test from "node:test";
import assert from "node:assert/strict";
import { wrapPc } from "./music.js";
import {
  BLUES_CHORUSES,
  COMP_CELLS,
  DEFAULT_TEMPO,
  SECTION_BEATS,
  SHELL_HIGH,
  SHELL_LOW,
  SIMPLE_HUMANIZE_MS,
  TEST_PHRASE,
  backingFor,
  chordsForForm,
  clipArrangement,
  drumPattern,
  fBluesChords,
  formLengthBeats,
  humanize,
  isCharlestonOffsets,
  isSampledEngine,
  isTwoAndFourOffsets,
  pianoComping,
  pianoCompingSimple,
  relativeCompOffsets,
  rootlessShell,
  rootlessVoicing,
  scheduleCurrent,
  scheduleNew,
  scheduleNewSimple,
  stThomasChords,
  timingBeatsForMs,
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

function pianoHitsForChord(hits, chord) {
  return hits.filter((event) => event.chordStartBeat === chord.startBeat);
}

function assertShell(midis, rootPc, quality) {
  assert.ok(midis.length >= 3 && midis.length <= 4);
  assert.equal(voicingHasGuideTones(midis, rootPc, quality), true);
  assert.equal(midis.map((midi) => wrapPc(midi)).includes(wrapPc(rootPc)), false);
  assert.ok(midis.every((midi) => midi >= SHELL_LOW && midi <= SHELL_HIGH));
}

test("simple shells are 3–4 notes, guide tones only, inside C3–C5", () => {
  const f7 = rootlessShell(5, "dominant7");
  assertShell(f7, 5, "dominant7");
  const cmaj = rootlessShell(0, "major7");
  assertShell(cmaj, 0, "major7");
  const next = rootlessShell(10, "dominant7", f7);
  assertShell(next, 10, "dominant7");
  assertShell(rootlessShell(6, "diminished7"), 6, "diminished7");
  const moved = next.reduce((sum, midi, i) => sum + Math.abs(midi - (f7[Math.min(i, f7.length - 1)])), 0);
  const far = rootlessShell(10, "dominant7", null).reduce((sum, midi, i) => sum + Math.abs(midi - (f7[Math.min(i, f7.length - 1)])), 0);
  assert.ok(moved <= far + 12);
});

test("simple piano: 2-beat chords get one held hit; 4-beat chords stay Charleston or 2-and-4", () => {
  const blues = pianoCompingSimple(fBluesChords(1), { seed: 2 });
  for (const chord of fBluesChords(1)) {
    const hits = pianoHitsForChord(blues, chord);
    assert.equal(hits.length, 2, `${chord.name} @ ${chord.startBeat}`);
    const offsets = relativeCompOffsets(hits, chord.startBeat);
    assert.ok(isCharlestonOffsets(offsets) || isTwoAndFourOffsets(offsets), offsets.join(","));
  }
  const stHits = pianoCompingSimple(stThomasChords(), { seed: 2 });
  for (const chord of stThomasChords()) {
    const hits = pianoHitsForChord(stHits, chord);
    if (chord.durationBeats <= 2) {
      assert.equal(hits.length, 1, `${chord.name} ${chord.durationBeats} beats @ ${chord.startBeat}`);
      const rel = hits[0].beat - chord.startBeat;
      assert.ok(rel === 0 || rel === -0.5);
      assert.ok(hits[0].durationBeats >= chord.durationBeats * 0.9);
    } else {
      assert.equal(hits.length, 2, `${chord.name} @ ${chord.startBeat}`);
      const offsets = relativeCompOffsets(hits, chord.startBeat);
      assert.ok(isCharlestonOffsets(offsets) || isTwoAndFourOffsets(offsets));
    }
    assertShell(hits[0].midis, chord.concertRootPc, chord.quality);
  }
});

test("simple piano keeps one pattern per 4-bar section", () => {
  const chords = fBluesChords(2);
  const hits = pianoCompingSimple(chords, { seed: 5 });
  const sections = new Map();
  for (const chord of chords) {
    const section = Math.floor(chord.startBeat / SECTION_BEATS);
    const offsets = relativeCompOffsets(pianoHitsForChord(hits, chord), chord.startBeat);
    const name = isCharlestonOffsets(offsets) ? "charleston" : isTwoAndFourOffsets(offsets) ? "twoAndFour" : "other";
    if (!sections.has(section)) sections.set(section, name);
    assert.equal(sections.get(section), name);
  }
  assert.ok([...sections.values()].every((name) => name !== "other"));
});

test("simple piano humanize stays within ~10ms at 140 and 200", () => {
  const source = pianoCompingSimple(fBluesChords(1), { seed: 2 });
  for (const tempo of [140, 200]) {
    const felt = humanize(source, { seed: 9, timingBeats: timingBeatsForMs(SIMPLE_HUMANIZE_MS, tempo), velocityJitter: 0.04 });
    const secondsPerBeat = 60 / tempo;
    assert.equal(felt.length, source.length);
    for (let i = 0; i < source.length; i += 1) {
      const ms = Math.abs(felt[i].beat - source[i].beat) * secondsPerBeat * 1000;
      assert.ok(ms <= SIMPLE_HUMANIZE_MS + 0.05, `${tempo} bpm moved ${ms}ms`);
      assert.ok(Math.abs(felt[i].velocity - source[i].velocity) <= 0.04 + 1e-9);
    }
  }
});

test("New-simple keeps bass and drums, uses sampled engines, and is quieter in motion not level", () => {
  assert.equal(isSampledEngine("new"), true);
  assert.equal(isSampledEngine("new-simple"), true);
  assert.equal(isSampledEngine("current"), false);
  const busy = scheduleNew(fBluesChords(1), { seed: 7 });
  const simple = scheduleNewSimple(fBluesChords(1), { seed: 7, tempo: DEFAULT_TEMPO });
  const count = (arranged, type) => arranged.events.filter((event) => event.type === type).length;
  assert.equal(count(simple, "bass"), count(busy, "bass"));
  assert.equal(count(simple, "drum"), count(busy, "drum"));
  const busyPiano = busy.events.filter((event) => event.type === "piano");
  const simplePiano = simple.events.filter((event) => event.type === "piano");
  assert.ok(simplePiano.length > 0 && busyPiano.length > 0);
  const mean = (events) => events.reduce((sum, event) => sum + event.velocity, 0) / events.length;
  assert.ok(Math.abs(mean(simplePiano) - mean(busyPiano)) < 0.12);
  assert.equal(backingFor("new-simple", "blues").events.some((event) => event.type === "piano"), true);
  assert.equal(backingFor("new-simple", "st-thomas").chords.length, stThomasChords().length);
});

test("New-simple F blues 140/200 and St. Thomas stay on the simple grid", () => {
  for (const tempo of [140, 200]) {
    const arranged = scheduleNewSimple(fBluesChords(), { seed: 7, tempo });
    const piano = arranged.events.filter((event) => event.type === "piano");
    assert.equal(piano.length, 12 * BLUES_CHORUSES * 2);
    const secondsPerBeat = 60 / tempo;
    const raw = pianoCompingSimple(fBluesChords(), { seed: 7 });
    assert.equal(piano.length, raw.length);
    for (let i = 0; i < raw.length; i += 1) {
      const ms = Math.abs(piano[i].beat - raw[i].beat) * secondsPerBeat * 1000;
      assert.ok(ms <= SIMPLE_HUMANIZE_MS + 0.05);
    }
  }
  const st = scheduleNewSimple(stThomasChords(), { seed: 7, tempo: 140 });
  const piano = st.events.filter((event) => event.type === "piano");
  const shortCount = stThomasChords().filter((chord) => chord.durationBeats <= 2).length;
  const longCount = stThomasChords().filter((chord) => chord.durationBeats >= 4).length;
  assert.equal(piano.length, shortCount + longCount * 2);
});
