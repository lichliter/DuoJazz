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
  landingABC,
  chorusStaffABC,
  cueCaption,
  applicationContext,
  jazzChordRootParts,
  displayKey,
  lickNoun,
  restBeatsForSpan,
  beamGroupsCrossBeat3,
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
    [1, 1 / 3, 1 / 3, 1 / 3, 0.5, 0.5],
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
  assert.match(abc, /[uv]?A,2 \(3[uv]?G,[uv]?D,[uv]?B,, [uv]?A,,[uv]?G,, z2/);
  const treble = phraseABC(getKey("G"), "concert", "minor-home", "treble");
  assert.match(treble, /clef=treble/);
  assert.match(treble, /[uv]?A,2 \(3[uv]?G,[uv]?D,[uv]?B,, [uv]?A,,[uv]?G,, z2/);
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
  const notes = varied.filter((el) => el.type === "note");
  assert.equal(notes[0].interval, 12);
  assert.equal(notes[notes.length - 1].interval, -2);
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
  assert.match(original, /[uv]?A,2 \(3[uv]?G,[uv]?D,[uv]?B,, [uv]?A,,[uv]?G,, z2/);
  assert.match(up, /[uv]?A2 \(3[uv]?G[uv]?D[uv]?B, [uv]?A,[uv]?G, z2/);
  assert.match(down, /[uv]?A,,2 \(3[uv]?G,,[uv]?D,,[uv]?B,,, [uv]?A,,,[uv]?G,,, z2/);
  assert.match(trebleUp, /clef=treble/);
  assert.match(trebleUp, /[uv]?A2 \(3[uv]?G[uv]?D[uv]?B, [uv]?A,[uv]?G, z2/);
  assert.match(writtenUp, /K:Amin clef=bass/);
  assert.match(writtenUp, /[uv]?B2 \(3[uv]?A[uv]?E[uv]?C [uv]?B,[uv]?A, z2/);
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

test("integration Play landing staff shows the lick on the door bar and slashes elsewhere", () => {
  const g = getKey("G");
  const abc = landingABC(g, "concert", "minor-home", "bass", 0, { showCues: true });
  assert.match(abc, /K:Gmin clef=bass/);
  assert.match(abc, /"Cm7"/);
  assert.match(abc, /z8/);
  assert.doesNotMatch(abc, /z2z2z2z2/);
  assert.match(abc, /"Gm6""_HERE"/);
  assert.match(abc, /[uv]?A,2 \(3[uv]?G,[uv]?D,[uv]?B,, [uv]?A,,[uv]?G,, z2/);
  assert.match(abc, /"D7""_Get ready"/);
  const up = landingABC(g, "concert", "minor-home", "bass", 1, { showCues: true });
  assert.match(up, /[uv]?A2 \(3[uv]?G[uv]?D[uv]?B, [uv]?A,[uv]?G, z2/);
  const quizCold = slashABC(g, "concert", "minor-home", "bass");
  assert.doesNotMatch(quizCold, /A,G,/);
  const viaChorus = chorusStaffABC({
    concertKey: g,
    displayMode: "concert",
    applicationId: "altered-dominant",
    mode: "landing",
    showCues: true,
    melodyRegister: 0,
  });
  assert.match(viaChorus, /"D7""_HERE"/);
  assert.doesNotMatch(viaChorus, /"D7""_HERE"D,2 D,2 D,2 D,2/);
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
  assert.match(altered, /"Am7♭5""_Get ready"/);
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

test("stand-portrait ABC breaks every two bars without changing pitches", () => {
  const four = modelABC(getKey("G"), "concert", "minor-home", "bass", 0, { showCues: true });
  const two = modelABC(getKey("G"), "concert", "minor-home", "bass", 0, { showCues: true, barsPerLine: 2 });
  assert.equal(four.split("\n").filter((line) => line.includes("|")).length, 2);
  assert.equal(two.split("\n").filter((line) => line.includes("|")).length, 4);
  assert.match(two, /"Cm7"/);
  assert.match(two, /"F7"/);
  assert.match(two, /"D7""_Get ready"/);
  assert.match(two, /"Gm6""_HERE"/);
  const slashTwo = slashABC(getKey("G"), "concert", "minor-home", "bass", { showCues: true, barsPerLine: 2 });
  assert.equal(slashTwo.split("\n").filter((line) => line.includes("|")).length, 4);
});

test("four-bar landing systems keep bars 7–8 together with the lick on the door bar", () => {
  const abc = landingABC(getKey("G"), "concert", "minor-home", "bass", 0, { showCues: true, barsPerLine: 4 });
  const systems = abc.split("\n").filter((line) => line.includes("|"));
  assert.equal(systems.length, 2);
  assert.match(systems[0], /"Cm7"/);
  assert.doesNotMatch(systems[0], /HERE|A,G,/);
  assert.match(systems[1], /"D7""_Get ready"/);
  assert.match(systems[1], /"Gm6""_HERE"/);
  assert.match(systems[1], /[uv]?A,2 \(3[uv]?G,[uv]?D,[uv]?B,, [uv]?A,,[uv]?G,, z2/);
  assert.match(systems[1], /"Gm6""_HERE".+"Gm6"/);
  assert.doesNotMatch(systems[1], /\n/);
});

test("ABC chord names keep the accidental on the root for jazzchords", () => {
  const g = modelABC(getKey("G"), "concert", "minor-home", "bass");
  assert.match(g, /"B♭maj7"/);
  assert.match(g, /"E♭maj7"/);
  assert.match(g, /"Am7♭5"/);
  assert.doesNotMatch(g, /Bbmaj7|Ebmaj7|Am7b5/);
  const e = modelABC(getKey("E"), "concert", "minor-home", "bass");
  assert.match(e, /"F♯m7♭5"/);
  const bb = modelABC(getKey("Bb"), "concert", "minor-home", "bass");
  assert.match(bb, /"D♭maj7"/);
  assert.match(bb, /"G♭maj7"/);
  const written = modelABC(getKey("G"), "bb-written", "minor-home", "bass");
  assert.match(written, /"Cmaj7"/);
  assert.deepEqual(jazzChordRootParts("B♭maj7"), { letter: "B", accidental: "♭", rest: "maj7" });
  assert.deepEqual(jazzChordRootParts("F♯"), { letter: "F", accidental: "♯", rest: "" });
  assert.equal(jazzChordRootParts("Am7♭5"), null);
  assert.equal(jazzChordRootParts("Cm7"), null);
});

test("Learn ABC spells against the key signature in C, G, B♭, F♯, and E♭", () => {
  const samples = [
    { app: "cmar-learn", quality: "minor" },
    { app: "emr-learn", quality: "minor" },
    { app: "gts-learn", quality: "major" },
    { app: "bo-learn", quality: "major" },
    { app: "hsr-learn", quality: "major" },
  ];
  for (const sample of samples) {
    for (const keyId of ["C", "G", "Bb", "F#", "Eb"]) {
      const key = getKey(keyId);
      const abc = phraseABC(key, "concert", sample.app);
      const shown = displayKey(key, "concert", sample.quality);
      const escaped = shown.abc.replaceAll("#", "\\#");
      assert.match(abc, new RegExp(`K:${escaped} clef=bass`), `${sample.app} ${keyId} ${shown.abc}`);
      const landing = landingABC(key, "concert", sample.app);
      assert.match(landing, new RegExp(`K:${escaped} clef=bass`), `landing ${sample.app} ${keyId}`);
    }
  }
  const boG = phraseABC(getKey("G"), "concert", "bo-learn");
  assert.match(boG, /K:G clef=bass/);
  assert.match(boG, /=F/);
  assert.doesNotMatch(boG, /K:D/);
  const gtsG = phraseABC(getKey("G"), "concert", "gts-learn");
  assert.match(gtsG, /K:G clef=bass/);
  assert.doesNotMatch(gtsG, /K:D/);
  assert.match(gtsG, /=F/);
  assert.doesNotMatch(gtsG, /\^F/);
  const cmarG = phraseABC(getKey("G"), "concert", "cmar-learn");
  assert.doesNotMatch(cmarG.split("K:")[1], /_B/);
  const cmarC = phraseABC(getKey("C"), "concert", "cmar-learn");
  assert.match(cmarC, /K:Cmin clef=bass/);
  assert.doesNotMatch(cmarC.split("K:")[1], /_E/);
});

test("BO and GTS Learn labels follow the I chord, not the cell tonic", () => {
  const bo = applicationContext(getKey("G"), "concert", "bo-learn");
  assert.equal(bo.tuneName, "G major");
  assert.match(bo.learnBlurb, /G major/);
  assert.doesNotMatch(bo.learnBlurb, /D major/);
  assert.equal(lickNoun("bo-learn"), "lick");
  assert.equal(lickNoun("gts-learn"), "lick");
  assert.equal(lickNoun("minor-home"), "cell");
  const gts = applicationContext(getKey("G"), "concert", "gts-learn");
  assert.equal(gts.tuneName, "G major");
  const gtsBb = applicationContext(getKey("Bb"), "concert", "gts-learn");
  assert.equal(gtsBb.tuneName, "B♭ major");
  const boBb = applicationContext(getKey("Bb"), "concert", "bo-learn");
  assert.equal(boBb.tuneName, "B♭ major");
  assert.doesNotMatch(boBb.learnBlurb, /F major/);
});

test("GTS eighths beam in beat pairs across the half-bar chord change", () => {
  const abc = phraseABC(getKey("G"), "concert", "gts-learn");
  assert.match(abc, /A,, "E7"/);
  assert.equal(beamGroupsCrossBeat3(abc), false);
  const st = landingABC(getKey("C"), "concert", "tune-st-thomas", "bass", 0, { showCues: true });
  assert.equal(beamGroupsCrossBeat3(st), false);
  const tokens = abc.split("\n").filter((line) => line.includes("|")).join(" ").split(/\s+/);
  for (const token of tokens) {
    const stems = [...token.matchAll(/([uv])[.=_^]*[A-Ga-g]/g)].map((match) => match[1]);
    if (stems.length > 1) assert.equal(new Set(stems).size, 1, token);
  }
});

test("empty bars draw a whole rest instead of a blank spacer", () => {
  const integrate = modelABC(getKey("C"), "concert", "cmar-blue-bossa");
  assert.match(integrate, /"Cm7"yyz8/);
  assert.match(integrate, /"Dø7"yyz8/);
  assert.doesNotMatch(integrate, /\bx8\b/);
  const learn = phraseABC(getKey("D"), "concert", "bo-learn");
  assert.match(learn, /z8/);
  assert.doesNotMatch(learn, /\bx8\b/);
  const emr = landingABC(getKey("G"), "concert", "emr-autumn-leaves-a");
  assert.match(emr, /z8/);
  assert.doesNotMatch(emr, /z2z2z2z2/);
  assert.doesNotMatch(emr, /\bx8\b/);
});

test("empty-bar ABC is a single whole rest; partial bars never hide beat 3", () => {
  assert.deepEqual(restBeatsForSpan(0, 4), [4]);
  assert.deepEqual(restBeatsForSpan(4, 4), [4]);
  assert.deepEqual(restBeatsForSpan(0, 2), [2]);
  assert.deepEqual(restBeatsForSpan(2, 2), [2]);
  assert.deepEqual(restBeatsForSpan(0, 3), [2, 1]);
  assert.deepEqual(restBeatsForSpan(1, 3), [1, 2]);
  assert.deepEqual(restBeatsForSpan(3, 1), [1]);
  assert.deepEqual(restBeatsForSpan(2.5, 1.5), [0.5, 1]);
  const landing = landingABC(getKey("C"), "concert", "cmar-blue-bossa");
  const emptyBars = [...landing.matchAll(/"Cm7"yy([^"|]+)/g)].map((match) => match[1].trim());
  assert.ok(emptyBars.some((body) => body === "z8"));
  assert.ok(emptyBars.every((body) => !/z2z2/.test(body)));
  const gts = phraseABC(getKey("G"), "concert", "gts-learn");
  assert.match(gts, /"Gmaj7"yy[uv]?B,,4 z4/);
  assert.doesNotMatch(gts, /z2z2/);
});
