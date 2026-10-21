import test from "node:test";
import assert from "node:assert/strict";
import {
  APPLICATIONS,
  FORM_SOURCE,
  PHRASE_BEATS,
  PHRASE_ELEMENTS,
  PHRASE_SOURCE,
  CHORUS_BEATS,
  DEFAULT_APPLICATION_ID,
  getKey,
  phraseDurationBeats,
  phraseNotes,
  phraseStartBeat,
  phraseEvents,
  writtenKeyFromConcert,
  chordDisplayName,
  midiForInterval,
  melodyMidiForInterval,
  melodyOctaveOffset,
  melodySemitoneShift,
  normalizeMelodyRegister,
  phraseABC,
  modelABC,
  DEFAULT_CLEF,
  DEFAULT_MELODY_REGISTER,
  PHRASE_OCTAVE,
  modelSolo,
  scheduleChorus,
  swingRatio,
  beatsToSeconds,
  variationElements,
  chorusChords,
  applicationById,
  slashABC,
  cueCaption,
  applicationContext,
} from "./music.js";

test("Cry Me a River cell is one bar of 9–1–5–♭3–2–1, not the repo enclosure", () => {
  assert.equal(phraseDurationBeats(), 4);
  assert.equal(PHRASE_BEATS, 4);
  assert.deepEqual(
    PHRASE_ELEMENTS.map((el) => el.interval),
    [14, 12, 7, 3, 2, 0],
  );
  assert.deepEqual(
    PHRASE_ELEMENTS.map((el) => el.beats),
    [0.5, 0.5, 1, 0.5, 0.5, 1],
  );
  assert.notDeepEqual(
    PHRASE_ELEMENTS.map((el) => el.interval),
    [5, 3, 9, 6, 7],
  );
  assert.match(PHRASE_SOURCE.notUsed, /iivi-cry-me-enclosure/);
});

test("concert G minor cell pitches are trombone-register A3 G3 D3 Bb2 A2 G2", () => {
  assert.equal(PHRASE_OCTAVE, -2);
  const g = getKey("G");
  const notes = phraseNotes(g, "concert", "minor-home");
  assert.deepEqual(
    notes.map((n) => n.concertMidi),
    [57, 55, 50, 46, 45, 43],
  );
  assert.deepEqual(
    notes.map((n) => n.shownName),
    ["A3", "G3", "D3", "B♭2", "A2", "G2"],
  );
  assert.deepEqual(
    notes.map((n) => n.degree),
    ["9", "1 (8ve)", "5", "♭3", "2", "1"],
  );
});

test("altered-dominant cell is the E♭-minor shape a major third down, spelled with flats", () => {
  const g = getKey("G");
  const notes = phraseNotes(g, "concert", "altered-dominant");
  assert.deepEqual(
    notes.map((n) => n.concertMidi),
    [53, 51, 46, 42, 41, 39],
  );
  assert.deepEqual(
    notes.map((n) => n.shownName),
    ["F3", "E♭3", "B♭2", "G♭2", "F2", "E♭2"],
  );
  assert.deepEqual(
    notes.map((n) => n.degree),
    ["9", "1 (8ve)", "5", "♭3", "2", "1"],
  );
  assert.notDeepEqual(
    notes.map((n) => n.concertMidi),
    phraseNotes(g, "concert", "minor-home").map((n) => n.concertMidi),
  );
});

test("Autumn Leaves excerpt is eight distinct bars from the documented UG variant", () => {
  assert.equal(CHORUS_BEATS, 32);
  assert.match(FORM_SOURCE.excerpt, /Gm6 \| Gm6/);
  assert.match(FORM_SOURCE.chart, /4419731/);
  const chords = chorusChords(getKey("G"), "concert");
  assert.equal(chords.length, 8);
  assert.deepEqual(
    chords.map((chord) => chord.name),
    ["Cm7", "F7", "B♭maj7", "E♭maj7", "Am7♭5", "D7", "Gm6", "Gm6"],
  );
  assert.deepEqual(
    chords.map((chord) => chord.startBeat),
    [0, 4, 8, 12, 16, 20, 24, 28],
  );
});

test("B-flat written names are a major second above concert and audio MIDI stays concert", () => {
  const g = getKey("G");
  const written = writtenKeyFromConcert(g);
  assert.equal(written.id, "A");
  const notes = phraseNotes(g, "bb-written", "minor-home");
  assert.equal(notes[0].concertMidi, 57);
  assert.equal(notes[0].shownMidi, 59);
  assert.equal(notes[0].shownName, "B3");
  assert.equal(chordDisplayName(g, 5, "minor7", "concert"), "Cm7");
  assert.equal(chordDisplayName(g, 5, "minor7", "bb-written"), "Dm7");
  assert.equal(chordDisplayName(g, 7, "dominant7", "bb-written"), "E7");
  assert.equal(chordDisplayName(g, 0, "minor6", "bb-written"), "Am6");
});

test("transposing the excerpt tonic moves the cell with the form", () => {
  const c = getKey("C");
  const notes = phraseNotes(c, "concert", "minor-home");
  assert.deepEqual(
    notes.map((n) => n.shownName),
    ["D3", "C3", "G2", "E♭2", "D2", "C2"],
  );
  assert.equal(midiForInterval(c.pc, 14), 50);
  const chords = chorusChords(c, "concert");
  assert.equal(chords[0].name, "Fm7");
  assert.equal(chords[6].name, "Cm6");
});

test("phrase ABC defaults to bass clef with beat-grouped eighth beams", () => {
  assert.equal(DEFAULT_CLEF, "bass");
  const abc = phraseABC(getKey("G"), "concert", "minor-home");
  assert.match(abc, /K:Gmin clef=bass/);
  assert.match(abc, /"Gm6"/);
  assert.match(abc, /A,G, D,2 _B,,A,, G,,2/);
  const treble = phraseABC(getKey("G"), "concert", "minor-home", "treble");
  assert.match(treble, /clef=treble/);
  assert.match(treble, /A,G, D,2 _B,,A,, G,,2/);
});

test("clef selection does not change concert MIDI or B-flat written transposition", () => {
  const g = getKey("G");
  const concert = phraseNotes(g, "concert", "minor-home").map((n) => n.concertMidi);
  const written = phraseNotes(g, "bb-written", "minor-home");
  assert.deepEqual(written.map((n) => n.concertMidi), concert);
  assert.equal(written[0].shownMidi, concert[0] + 2);
  const bassEvents = scheduleChorus({
    concertKey: g,
    displayMode: "concert",
    includeModel: true,
    includeGuides: false,
    includeClick: false,
    variationId: "original",
    stage: "learn",
    applicationId: "minor-home",
  });
  assert.deepEqual(
    bassEvents.filter((e) => e.type === "melody").map((e) => e.midi),
    concert,
  );
});

test("minor-home phrase starts at beat 24; altered-dominant at beat 20", () => {
  assert.equal(DEFAULT_APPLICATION_ID, "minor-home");
  assert.equal(phraseStartBeat("minor-home"), 24);
  assert.equal(phraseStartBeat("altered-dominant"), 20);
  assert.equal(applicationById("minor-home").phraseStartBar, 7);
  assert.equal(applicationById("altered-dominant").phraseStartBar, 6);
});

test("each contextual model is a full eight-bar original solo with the cell at its real location", () => {
  for (const app of APPLICATIONS) {
    const solo = modelSolo(app.id);
    assert.equal(solo[0].beat, 0);
    const phrase = solo.filter((note) => note.role === "phrase");
    assert.equal(phrase.length, 6);
    assert.equal(phrase[0].beat, phraseStartBeat(app.id));
    assert.ok(solo.some((note) => note.role === "lead" && note.beat < phrase[0].beat));
    assert.ok(solo.some((note) => note.role === "resolve" && note.beat >= phraseStartBeat(app.id) + 4));
    const last = solo[solo.length - 1];
    assert.ok(last.beat + last.beats <= 32 + 1e-9);
    assert.ok(last.beat + last.beats > 28);
    const abc = modelABC(getKey("G"), "concert", app.id);
    assert.match(abc, /Cm7/);
    assert.match(abc, /Gm6/);
  }
});

test("altered-dominant resolution is not the G-minor cell pasted onto bar 7", () => {
  const resolve = modelSolo("altered-dominant").filter((note) => note.role === "resolve");
  assert.deepEqual(
    resolve.slice(0, 6).map((note) => note.interval),
    [7, 0, 3, 2, 0, 3],
  );
  assert.notDeepEqual(
    resolve.map((note) => note.interval).slice(0, 6),
    phraseEvents("minor-home").map((note) => note.interval),
  );
});

test("scheduleChorus contextual demo plays the model; skip variation emits no melody", () => {
  const skip = scheduleChorus({
    concertKey: getKey("G"),
    displayMode: "concert",
    includeModel: true,
    includeGuides: false,
    includeClick: false,
    variationId: "skip",
    stage: "place",
    applicationId: "minor-home",
    modelScope: "solo",
  });
  assert.equal(skip.filter((e) => e.type === "melody").length, 0);

  const demo = scheduleChorus({
    concertKey: getKey("G"),
    displayMode: "concert",
    includeModel: true,
    includeGuides: false,
    includeClick: false,
    variationId: "original",
    stage: "place",
    applicationId: "minor-home",
    modelScope: "solo",
    lengthBeats: 32,
  });
  const melody = demo.filter((e) => e.type === "melody");
  assert.ok(melody.length > 6);
  const phrase = melody.filter((e) => e.role === "phrase");
  assert.equal(phrase.length, 6);
  assert.equal(phrase[0].beat, 24);
  assert.equal(phrase[0].midi, 57);
  assert.equal(demo.find((e) => e.type === "end").beat, 32);
});

test("learn / isolated cell starts the model immediately on the cell tonic", () => {
  const events = scheduleChorus({
    concertKey: getKey("G"),
    displayMode: "concert",
    includeModel: true,
    includeGuides: true,
    includeClick: false,
    variationId: "original",
    stage: "learn",
    applicationId: "altered-dominant",
  });
  const melody = events.filter((e) => e.type === "melody");
  assert.equal(melody[0].beat, 0);
  assert.equal(melody[0].midi, 53);
  assert.equal(events.find((e) => e.type === "end").beat, 8);
  assert.equal(events.filter((e) => e.type === "guide").length, 0);
  assert.equal(events.find((e) => e.type === "chord").name, "E♭m6");
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

test("sequence-down variation transposes the local cell by a major second", () => {
  const varied = variationElements("sequence-down", "minor-home");
  assert.equal(varied[0].interval, 12);
  assert.equal(varied[varied.length - 1].interval, -2);
});

function chorusEvents(applicationId, melodyRegister, extras = {}) {
  return scheduleChorus({
    concertKey: getKey("G"),
    displayMode: "concert",
    includeModel: true,
    includeGuides: true,
    includeClick: true,
    includeCue: true,
    variationId: "original",
    stage: "place",
    applicationId,
    modelScope: "solo",
    lengthBeats: 32,
    melodyRegister,
    ...extras,
  });
}

function backingFingerprint(events) {
  return events
    .filter((event) => event.type !== "melody")
    .map((event) => ({
      type: event.type,
      beat: event.beat,
      midi: event.midi ?? null,
      midis: event.midis ?? null,
      name: event.name ?? null,
      strong: event.strong ?? null,
      kind: event.kind ?? null,
    }));
}

test("melody register is −1 / 0 / +1 octaves on the trombone default", () => {
  assert.equal(DEFAULT_MELODY_REGISTER, 0);
  assert.equal(normalizeMelodyRegister(undefined), 0);
  assert.equal(normalizeMelodyRegister(2), 0);
  assert.equal(normalizeMelodyRegister("-1"), -1);
  assert.equal(melodyOctaveOffset(0), PHRASE_OCTAVE);
  assert.equal(melodyOctaveOffset(1), PHRASE_OCTAVE + 1);
  assert.equal(melodySemitoneShift(-1), -12);
  assert.equal(melodyMidiForInterval(7, 14, 0), 57);
  assert.equal(melodyMidiForInterval(7, 14, 1), 69);
  assert.equal(melodyMidiForInterval(7, 14, -1), 45);
});

test("melody register shifts complete model MIDI by exact octaves without moving backing", () => {
  for (const app of APPLICATIONS) {
    const original = chorusEvents(app.id, 0);
    const up = chorusEvents(app.id, 1);
    const down = chorusEvents(app.id, -1);
    const originalMelody = original.filter((event) => event.type === "melody");
    const upMelody = up.filter((event) => event.type === "melody");
    const downMelody = down.filter((event) => event.type === "melody");
    assert.ok(originalMelody.length > 6);
    assert.deepEqual(
      upMelody.map((event) => event.beat),
      originalMelody.map((event) => event.beat),
    );
    assert.deepEqual(
      downMelody.map((event) => event.midi),
      originalMelody.map((event) => event.midi - 12),
    );
    assert.deepEqual(
      upMelody.map((event) => event.midi),
      originalMelody.map((event) => event.midi + 12),
    );
    assert.deepEqual(backingFingerprint(up), backingFingerprint(original));
    assert.deepEqual(backingFingerprint(down), backingFingerprint(original));
    assert.equal(original.find((event) => event.type === "end").beat, 32);
    assert.equal(up.find((event) => event.type === "chord").name, original.find((event) => event.type === "chord").name);
  }
});

test("G minor cell names follow melody register; intervals and rhythm stay put", () => {
  const g = getKey("G");
  const original = phraseNotes(g, "concert", "minor-home", 0);
  const up = phraseNotes(g, "concert", "minor-home", 1);
  const down = phraseNotes(g, "concert", "minor-home", -1);
  assert.deepEqual(original.map((n) => n.shownName), ["A3", "G3", "D3", "B♭2", "A2", "G2"]);
  assert.deepEqual(up.map((n) => n.shownName), ["A4", "G4", "D4", "B♭3", "A3", "G3"]);
  assert.deepEqual(down.map((n) => n.shownName), ["A2", "G2", "D2", "B♭1", "A1", "G1"]);
  assert.deepEqual(up.map((n) => n.interval), original.map((n) => n.interval));
  assert.deepEqual(up.map((n) => n.beats), original.map((n) => n.beats));
  assert.deepEqual(up.map((n) => n.degree), original.map((n) => n.degree));
});

test("phrase ABC follows melody register while clef and B♭ names stay independent", () => {
  const g = getKey("G");
  const original = phraseABC(g, "concert", "minor-home", "bass", 0);
  const up = phraseABC(g, "concert", "minor-home", "bass", 1);
  const down = phraseABC(g, "concert", "minor-home", "bass", -1);
  const trebleUp = phraseABC(g, "concert", "minor-home", "treble", 1);
  const writtenUp = phraseABC(g, "bb-written", "minor-home", "bass", 1);
  assert.match(original, /K:Gmin clef=bass/);
  assert.match(original, /A,G, D,2 _B,,A,, G,,2/);
  assert.match(up, /AG D2 _B,A, G,2/);
  assert.match(down, /A,,G,, D,,2 _B,,,A,,, G,,,2/);
  assert.match(trebleUp, /clef=treble/);
  assert.match(trebleUp, /AG D2 _B,A, G,2/);
  assert.match(writtenUp, /K:Amin clef=bass/);
  assert.match(writtenUp, /BA E2 CB, A,2/);
  const notes = phraseNotes(g, "bb-written", "minor-home", 1);
  assert.equal(notes[0].concertMidi, 69);
  assert.equal(notes[0].shownMidi, 71);
  const bassModel = modelABC(g, "concert", "minor-home", "bass", -1);
  const trebleModel = modelABC(g, "concert", "minor-home", "treble", -1);
  assert.match(bassModel, /clef=bass/);
  assert.match(trebleModel, /clef=treble/);
  assert.match(bassModel, /"Cm7"/);
  assert.match(trebleModel, /"Cm7"/);
});

test("isolated-cell hearing uses the same melody register as the chorus model", () => {
  const g = getKey("G");
  for (const app of APPLICATIONS) {
    const chorus = chorusEvents(app.id, 1).filter((event) => event.type === "melody" && event.role === "phrase");
    const cell = scheduleChorus({
      concertKey: g,
      displayMode: "concert",
      includeModel: true,
      includeGuides: false,
      includeClick: false,
      variationId: "original",
      stage: "learn",
      applicationId: app.id,
      melodyRegister: 1,
    }).filter((event) => event.type === "melody");
    assert.deepEqual(
      cell.map((event) => event.midi),
      chorus.map((event) => event.midi),
    );
    assert.equal(cell[0].beat, 0);
  }
});

test("slash staff is rhythmic slashes with chord symbols, not model pitches or rests", () => {
  const g = getKey("G");
  const slashes = slashABC(g, "concert", "minor-home", "bass");
  assert.match(slashes, /K:Gmin clef=bass/);
  assert.match(slashes, /"Cm7"/);
  assert.match(slashes, /"Gm6"/);
  assert.match(slashes, /D, D, D, D,/);
  assert.doesNotMatch(slashes, /A,G,/);
  assert.doesNotMatch(slashes, /Get ready|HERE/);
  const cued = slashABC(g, "concert", "minor-home", "bass", { showCues: true });
  assert.match(cued, /Get ready/);
  assert.match(cued, /HERE/);
  const altered = slashABC(g, "concert", "altered-dominant", "bass", { showCues: true });
  assert.equal(cueCaption(5, "altered-dominant"), "Get ready");
  assert.equal(cueCaption(6, "altered-dominant"), "HERE");
  assert.equal(cueCaption(7, "altered-dominant"), "");
  assert.match(altered, /"D7""_HERE"/);
  assert.match(altered, /"Am7b5""_Get ready"/);
  const f = slashABC(getKey("F"), "concert", "minor-home", "bass", { showCues: true });
  assert.match(f, /"Fm6""_HERE"/);
  assert.doesNotMatch(f, /Gm6/);
});

test("model staff can carry the same Get ready / HERE anchors", () => {
  const cued = modelABC(getKey("G"), "concert", "minor-home", "bass", 0, { showCues: true });
  assert.match(cued, /"D7""_Get ready"/);
  assert.match(cued, /"Gm6""_HERE"/);
  const fAlt = applicationContext(getKey("F"), "concert", "altered-dominant");
  assert.equal(fAlt.readyBar, 5);
  assert.equal(fAlt.enterBar, 6);
  assert.equal(fAlt.targetChord, "C7");
});
