import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_INSTRUMENT_ID,
  INSTRUMENTS,
  instrumentById,
  instrumentOrDefault,
  migrateInstrumentId,
  writtenSemitones,
} from "./instruments.js";
import { displayKey, getKey, phraseNotes } from "./music.js";
import { createSession, jumpToCard, normalizePrefs } from "./session.js";
import { expectedNotesFor, gradeSession, synthTrack } from "./grade.js";

test("instrument table has one row per v1 horn with clef, transpose, range, and samples", () => {
  assert.equal(DEFAULT_INSTRUMENT_ID, "piano");
  assert.deepEqual(
    INSTRUMENTS.map((instrument) => instrument.id),
    ["piano", "bass", "guitar", "trumpet", "tenor-sax", "alto-sax", "trombone"],
  );
  for (const instrument of INSTRUMENTS) {
    assert.ok(instrument.label);
    assert.ok(instrument.clef === "treble" || instrument.clef === "bass");
    assert.equal(typeof instrument.transposeSemitones, "number");
    assert.ok(instrument.rangeHigh > instrument.rangeLow);
    assert.ok(instrument.sampleSet);
    assert.ok(instrument.writtenRange);
    assert.ok(instrument.note);
  }
  assert.equal(instrumentById("piano").clef, "treble");
  assert.equal(instrumentById("piano").transposeSemitones, 0);
  assert.equal(instrumentById("bass").clef, "bass");
  assert.equal(instrumentById("bass").transposeSemitones, 12);
  assert.equal(instrumentById("guitar").transposeSemitones, 12);
  assert.equal(instrumentById("trumpet").transposeSemitones, 2);
  assert.equal(instrumentById("tenor-sax").transposeSemitones, 14);
  assert.equal(instrumentById("alto-sax").transposeSemitones, 9);
  assert.equal(instrumentById("trombone").clef, "bass");
  assert.equal(instrumentById("trumpet").note, "B♭, treble clef");
  assert.equal(instrumentById("tenor-sax").note, "B♭, treble clef");
  assert.equal(instrumentById("alto-sax").note, "E♭, treble clef");
  for (const instrument of INSTRUMENTS) {
    assert.doesNotMatch(instrument.note, /♭ ,/, instrument.id);
  }
  assert.equal(instrumentById("missing"), null);
  assert.equal(instrumentOrDefault("missing").id, "piano");
});

test("written key mapping for concert C on each instrument", () => {
  const c = getKey("C");
  const written = (id) => displayKey(c, id, "major").name;
  assert.equal(written("piano"), "C major");
  assert.equal(written("bass"), "C major");
  assert.equal(written("guitar"), "C major");
  assert.equal(written("trumpet"), "D major");
  assert.equal(written("tenor-sax"), "D major");
  assert.equal(written("alto-sax"), "A major");
  assert.equal(written("trombone"), "C major");
  assert.equal(displayKey(c, "trumpet", "minor").shortName, "Dm");
  assert.equal(writtenSemitones("bb-written"), 2);
  assert.equal(writtenSemitones("concert"), 0);
});

test("old prefs migrate bass/treble/B♭ into Bass, Piano, and Trumpet", () => {
  assert.equal(migrateInstrumentId({}), "piano");
  assert.equal(migrateInstrumentId({ clef: "bass", displayMode: "concert" }), "bass");
  assert.equal(migrateInstrumentId({ clef: "treble", displayMode: "concert" }), "piano");
  assert.equal(migrateInstrumentId({ clef: "bass", displayMode: "bb-written" }), "trumpet");
  assert.equal(migrateInstrumentId({ instrumentId: "alto-sax" }), "alto-sax");
  assert.equal(normalizePrefs({ clef: "bass", displayMode: "concert" }).instrumentId, "bass");
  assert.equal(normalizePrefs({ displayMode: "bb-written" }).instrumentId, "trumpet");
  assert.equal(normalizePrefs({}).instrumentId, "piano");
  assert.equal(normalizePrefs({}).clef, "treble");
});

test("trumpet grading stays on concert pitch while notation is a major second up", () => {
  const session = jumpToCard(createSession({
    lessonId: "learn-lick",
    startKeyId: "C",
    instrumentId: "trumpet",
  }), "quiz");
  assert.equal(session.displayMode, "trumpet");
  assert.equal(session.clef, "treble");
  const notes = phraseNotes(getKey("C"), "trumpet", "minor-home");
  const expected = expectedNotesFor(session);
  assert.equal(notes[0].shownMidi, notes[0].concertMidi + 2);
  assert.equal(expected[0].midi, notes[0].concertMidi);
  assert.notEqual(expected[0].midi, notes[0].shownMidi);
  assert.equal(gradeSession(session, synthTrack(expected)).passed, true);
  const writtenAsPlayed = synthTrack(expected.map((note) => ({ ...note, midi: note.midi + 2 })));
  assert.equal(gradeSession(session, writtenAsPlayed).passed, false);
});
