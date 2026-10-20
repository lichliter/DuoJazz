import test from "node:test";
import assert from "node:assert/strict";
import {
  PHRASE_BEATS,
  PHRASE_ELEMENTS,
  PHRASE_START_BEAT,
  CHORUS_BEATS,
  getKey,
  phraseDurationBeats,
  phraseNotes,
  writtenKeyFromConcert,
  chordDisplayName,
  midiForInterval,
  phraseABC,
  scheduleChorus,
  swingRatio,
  beatsToSeconds,
  variationElements,
  chorusChords,
} from "./music.js";

test("short ii-V-I duration is six beats padded into a two-bar cell", () => {
  assert.equal(phraseDurationBeats(), 6);
  assert.equal(PHRASE_BEATS, 6);
  const eighths = PHRASE_ELEMENTS.filter((el) => el.beats === 0.5);
  const half = PHRASE_ELEMENTS.filter((el) => el.beats === 2);
  assert.equal(eighths.length, 8);
  assert.equal(half.length, 1);
});

test("concert C phrase pitches match BuiltInLicks.shortIIVI", () => {
  const c = getKey("C");
  const notes = phraseNotes(c, "concert");
  assert.deepEqual(
    notes.map((n) => n.concertMidi),
    [62, 64, 65, 67, 69, 72, 71, 69, 67],
  );
  assert.deepEqual(
    notes.map((n) => n.shownName),
    ["D4", "E4", "F4", "G4", "A4", "C5", "B4", "A4", "G4"],
  );
});

test("B-flat written names are a major second above concert and audio MIDI stays concert", () => {
  const c = getKey("C");
  const written = writtenKeyFromConcert(c);
  assert.equal(written.id, "D");
  const notes = phraseNotes(c, "bb-written");
  assert.equal(notes[0].concertMidi, 62);
  assert.equal(notes[0].shownMidi, 64);
  assert.equal(notes[0].shownName, "E4");
  assert.equal(chordDisplayName(c, 2, "minor7", "concert"), "D-7");
  assert.equal(chordDisplayName(c, 2, "minor7", "bb-written"), "E-7");
  assert.equal(chordDisplayName(c, 5, "dominant7", "bb-written"), "A7");
  assert.equal(chordDisplayName(c, 1, "major7", "bb-written"), "Dmaj7");
});

test("transposing concert key moves MIDI by the tonic interval", () => {
  const f = getKey("F");
  assert.equal(midiForInterval(f.pc, 2), 67);
  const notes = phraseNotes(f, "concert");
  assert.equal(notes[0].shownName, "G4");
});

test("phrase ABC in C includes the native intervals and chord cells", () => {
  const abc = phraseABC(getKey("C"), "concert");
  assert.match(abc, /K:C clef=treble/);
  assert.match(abc, /"Dm7"/);
  assert.match(abc, /"G7"/);
  assert.match(abc, /"Cmaj7"/);
  assert.match(abc, /DEFG/);
  assert.match(abc, /AcBA/);
  assert.match(abc, /G4/);
});

test("eight-bar form places the phrase at beat 8, after a two-bar setup", () => {
  assert.equal(PHRASE_START_BEAT, 8);
  assert.equal(CHORUS_BEATS, 32);
  const chords = chorusChords(getKey("C"), "concert");
  assert.equal(chords.length, 12);
  assert.equal(chords[3].role, "phrase");
  assert.equal(chords[3].startBeat, 8);
  assert.equal(chords[3].name, "D-7");
});

test("scheduleChorus never emits overlapping melody on skip variation", () => {
  const skip = scheduleChorus({
    concertKey: getKey("C"),
    displayMode: "concert",
    includeModel: true,
    includeGuides: false,
    includeClick: false,
    variationId: "skip",
    stage: "place",
  });
  assert.equal(skip.filter((e) => e.type === "melody").length, 0);
  const original = scheduleChorus({
    concertKey: getKey("C"),
    displayMode: "concert",
    includeModel: true,
    includeGuides: false,
    includeClick: false,
    variationId: "original",
    stage: "place",
  });
  const melody = original.filter((e) => e.type === "melody");
  assert.equal(melody.length, 9);
  assert.equal(melody[0].beat, 8);
  assert.equal(melody[0].midi, 62);
});

test("learn stage is a two-bar loop starting the model immediately", () => {
  const events = scheduleChorus({
    concertKey: getKey("C"),
    displayMode: "concert",
    includeModel: true,
    includeGuides: true,
    includeClick: false,
    variationId: "original",
    stage: "learn",
  });
  const melody = events.filter((e) => e.type === "melody");
  assert.equal(melody[0].beat, 0);
  assert.equal(events.find((e) => e.type === "end").beat, 8);
  assert.equal(events.filter((e) => e.type === "guide").length, 0);
});

test("swing mapping keeps quarter-note beats aligned", () => {
  const tempo = 120;
  const ratio = swingRatio(tempo);
  assert.ok(ratio > 0.5 && ratio < 0.75);
  assert.ok(Math.abs(beatsToSeconds(4, tempo, true) - 2) < 1e-9);
  const long = beatsToSeconds(0.5, tempo, true);
  const short = beatsToSeconds(1, tempo, true) - long;
  assert.ok(long > short);
});

test("sequence-down variation transposes the motif by a major second", () => {
  const varied = variationElements("sequence-down");
  assert.equal(varied[0].interval, 0);
  assert.equal(varied[varied.length - 1].interval, 5);
});
