import test from "node:test";
import assert from "node:assert/strict";
import {
  LICKS,
  MODULES,
  LESSONS,
  lickById,
  lickNoteElements,
  lickTotalBeats,
  formBeatsFor,
  learnBeatsFor,
  phraseSpanBars,
  spotsFor,
  fragmentBeats,
  formById,
  applicationById,
} from "./registry.js";
import {
  getKey,
  phraseEvents,
  phraseNotes,
  phraseABC,
  landingABC,
  chorusChords,
  scheduleChorus,
  TROMBONE_LOW_MIDI,
  TROMBONE_HIGH_MIDI,
  REGISTER_FLOOR_MIDI,
  REGISTER_CEIL_MIDI,
  octaveForApplication,
  melodyMidiForInterval,
  BEATS_PER_BAR,
} from "./music.js";
import { WORKBOOK_LICKS } from "./workbook-licks.js";
import {
  TWELVE_KEY_IDS,
  recommendedLessonId,
  lessonPathNodes,
  defaultPrefs,
  createSession,
  jumpToCard,
} from "./session.js";
import { expectedNotesFor, gradeSession, synthTrack } from "./grade.js";
import {
  emptyMastery,
  normalizeMastery,
  recordQuizPass,
  isKeyMastered,
  lessonPassedKeys,
  moduleMastery,
} from "./medals.js";

const KEYS_C_G_BB_FS = ["C", "G", "Bb", "F#"];

function midisFor(lick, keyId) {
  const lesson = MODULES.find((module) => module.lickId === lick.id).lessons[0];
  return phraseNotes(getKey(keyId), "concert", lesson.applicationId).map((note) => note.concertMidi);
}

test("registry has thirty modules: five with standards plus workbook 6–30", () => {
  assert.deepEqual(LICKS.slice(0, 5).map((lick) => lick.id), ["cmar", "emr", "gts", "bo", "hsr"]);
  assert.deepEqual(WORKBOOK_LICKS.map((lick) => lick.id), [
    "1235", "br", "dlr", "acvl", "tm", "tisc", "et", "cbc", "jcdp", "tdp",
    "se", "mp", "ssr", "sat", "ctdc", "tpr", "ntp", "dct", "ae", "fe",
    "bb", "lg", "bcf", "dss", "nnr",
  ]);
  assert.equal(LICKS.length, 30);
  assert.equal(MODULES.length, 30);
  assert.deepEqual(
    MODULES.slice(0, 5).map((module) => module.lessons.filter((lesson) => lesson.group !== "your-tunes").length),
    [7, 5, 4, 4, 5],
  );
  assert.deepEqual(MODULES.slice(0, 5).map((module) => module.lessons.length), [10, 8, 8, 10, 13]);
  assert.ok(MODULES.slice(5).every((module) => module.lessons.length === 1 && module.lessons[0].kind === "learn"));
  assert.equal(LESSONS.filter((lesson) => lesson.group !== "your-tunes" && lesson.group !== "my-tunes").length, 50);
  assert.ok(LESSONS.every((lesson) => lesson.kind === "learn" || lesson.kind === "integrate"));
  for (const lick of LICKS) {
    assert.match(lick.source, /Essential Jazz Vocabulary Workbook, Lick /);
  }
  assert.equal(LESSONS[0].id, "learn-lick");
  assert.equal(LESSONS[1].id, "integrate-minor-home");
  assert.equal(LESSONS[2].id, "integrate-altered-dominant");
});

test("each lick’s sounding beats match the workbook cell", () => {
  assert.equal(lickTotalBeats(lickById("cmar")), 4);
  assert.equal(lickTotalBeats(lickById("emr")), 8);
  assert.equal(lickTotalBeats(lickById("gts")), 12);
  assert.equal(lickTotalBeats(lickById("bo")), 12.5);
  assert.equal(lickTotalBeats(lickById("hsr")), 4);
  assert.equal(learnBeatsFor("minor-home"), 8);
  assert.equal(formBeatsFor("minor-home"), 32);
  assert.equal(formBeatsFor("emr-autumn-leaves-a"), 32);
  assert.equal(formBeatsFor("gts-oleo"), 32);
  assert.equal(formBeatsFor("bo-rhythm"), 32);
  assert.equal(formBeatsFor("hsr-honeysuckle"), 32);
  for (const lick of WORKBOOK_LICKS) {
    const expected = lick.workbookBars * 4 + (lick.pickupBeats || 0);
    assert.equal(lickTotalBeats(lick), expected, `${lick.id} beats`);
    assert.equal(lick.learnBeats, lick.workbookBars * 4, `${lick.id} learnBeats`);
  }
});

test("CMAR is a quarter, triplet, two eighths, and a rest", () => {
  const notes = lickNoteElements(lickById("cmar"));
  assert.deepEqual(notes.map((note) => note.interval), [14, 12, 7, 3, 2, 0]);
  assert.equal(notes[0].beats, 1);
  assert.ok(notes.slice(1, 4).every((note) => note.tuplet === 3 && Math.abs(note.beats - 1 / 3) < 1e-9));
  assert.deepEqual(notes.slice(4).map((note) => note.beats), [0.5, 0.5]);
  const events = phraseEvents("minor-home", true);
  assert.equal(events.length, 6);
  assert.equal(events[0].beats, 1);
  assert.ok(Math.abs(events[1].beat - 1) < 1e-9);
  assert.ok(Math.abs(events[2].beat - (1 + 1 / 3)) < 1e-9);
  assert.ok(Math.abs(events[3].beat - (1 + 2 / 3)) < 1e-9);
  assert.ok(Math.abs(events[4].beat - 2) < 1e-9);
});

test("EMR tie is one 2.5-beat note, not two onsets", () => {
  const notes = lickNoteElements(lickById("emr"));
  assert.equal(notes.length, 7);
  const tied = notes[notes.length - 1];
  assert.equal(tied.interval, 14);
  assert.equal(tied.beats, 2.5);
  assert.equal(tied.tie, true);
  const events = phraseEvents("emr-learn", true);
  assert.equal(events.length, 7);
  assert.ok(Math.abs(events[6].beat - 3.5) < 1e-9);
  assert.equal(events[6].beats, 2.5);
});

test("Bird opening has a pickup, sixteenths, and a 12.5-beat span", () => {
  const notes = lickNoteElements(lickById("bo"));
  assert.equal(notes[0].pickup, true);
  assert.equal(notes[0].beats, 0.5);
  assert.equal(notes[0].interval, -5);
  const sixteenths = notes.filter((note) => note.beats === 0.25);
  assert.equal(sixteenths.length, 2);
  const integrated = phraseEvents("bo-honeysuckle");
  assert.ok(integrated[0].beat < 0);
  assert.ok(Math.abs(integrated[0].beat + 0.5) < 1e-9);
  assert.equal(integrated[1].beat, 0);
  const isolated = phraseEvents("bo-learn", true);
  assert.ok(Math.abs(isolated[0].beat + 0.5) < 1e-9);
  assert.equal(isolated[1].beat, 0);
});

test("Turning Diminished Pattern is four 16th-triplet groups filling one bar", () => {
  const notes = lickNoteElements(lickById("tdp"));
  assert.equal(notes.length, 16);
  assert.equal(notes.filter((note) => note.tuplet === 3 && Math.abs(note.beats - 1 / 6) < 1e-9).length, 12);
  assert.equal(lickTotalBeats(lickById("tdp")), 4);
});

test("HSR is six eighths and a quarter rest", () => {
  const notes = lickNoteElements(lickById("hsr"));
  assert.deepEqual(notes.map((note) => note.interval), [5, 3, -5, -2, 2, 0]);
  assert.ok(notes.every((note) => note.beats === 0.5));
  assert.equal(phraseSpanBars("hsr-honeysuckle")[0], 1);
  assert.deepEqual(phraseSpanBars("hsr-a-train"), [5, 6]);
});

function assertRegister(id, keyId, min, max) {
  assert.ok(min >= REGISTER_FLOOR_MIDI, `${id} ${keyId} low ${min}`);
  const canDrop = min - 12 >= REGISTER_FLOOR_MIDI;
  if (canDrop) {
    assert.ok(max <= REGISTER_CEIL_MIDI, `${id} ${keyId} high ${max} could drop`);
  }
}

test("each lick stays on or above C3, preferring Bb4 as the ceiling", () => {
  assert.equal(REGISTER_FLOOR_MIDI, 48);
  assert.equal(REGISTER_CEIL_MIDI, 70);
  assert.equal(TROMBONE_HIGH_MIDI, 70);
  for (const lick of LICKS) {
    for (const keyId of TWELVE_KEY_IDS) {
      const midis = midisFor(lick, keyId);
      const min = Math.min(...midis);
      const max = Math.max(...midis);
      assertRegister(lick.id, keyId, min, max);
      const up = midis.map((midi) => midi + 12);
      const down = midis.map((midi) => midi - 12);
      assert.equal(up[0] - midis[0], 12);
      assert.equal(down[0] - midis[0], -12);
    }
  }
});

test("CMAR G-minor pitches sit on the C3 floor", () => {
  const notes = phraseNotes(getKey("G"), "concert", "minor-home");
  assert.deepEqual(notes.map((note) => note.concertMidi), [69, 67, 62, 58, 57, 55]);
  assert.deepEqual(notes.map((note) => note.shownName), ["A4", "G4", "D4", "B♭3", "A3", "G3"]);
});

test("each lick renders in C, G, B♭ and F♯ with barlines and chord symbols", () => {
  const samples = [
    { lesson: "learn-lick", applicationId: "minor-home", isolated: true },
    { lesson: "emr-learn", applicationId: "emr-learn", isolated: true },
    { lesson: "gts-learn", applicationId: "gts-learn", isolated: true },
    { lesson: "bo-learn", applicationId: "bo-learn", isolated: true },
    { lesson: "hsr-learn", applicationId: "hsr-learn", isolated: true },
    { lesson: "1235-learn", applicationId: "1235-learn", isolated: true },
    { lesson: "tdp-learn", applicationId: "tdp-learn", isolated: true },
    { lesson: "dss-learn", applicationId: "dss-learn", isolated: true },
  ];
    { lesson: "1235-learn", applicationId: "1235-learn", isolated: true },
    { lesson: "tdp-learn", applicationId: "tdp-learn", isolated: true },
    { lesson: "dss-learn", applicationId: "dss-learn", isolated: true },
  ];
  for (const sample of samples) {
    for (const keyId of KEYS_C_G_BB_FS) {
      const abc = phraseABC(getKey(keyId), "concert", sample.applicationId);
      assert.match(abc, /K:.*clef=bass/, `${sample.lesson} ${keyId}`);
      assert.match(abc, /"/, `${sample.lesson} ${keyId} chord`);
      assert.match(abc, /\|/, `${sample.lesson} ${keyId} barline`);
      const landing = landingABC(getKey(keyId), "concert", sample.applicationId, "bass", 0, { showCues: true });
      assert.match(landing, /K:/);
    }
  }
  const emr = landingABC(getKey("G"), "concert", "emr-autumn-leaves-a", "bass", 0, { showCues: true });
  assert.match(emr, /HERE/);
  assert.match(emr, /Get ready/);
  const gts = landingABC(getKey("Bb"), "concert", "gts-oleo", "bass", 0, { showCues: true });
  assert.match(gts, /HERE/);
  const hsrV = landingABC(getKey("C"), "concert", "hsr-a-train", "bass", 0, { showCues: true });
  assert.match(hsrV, /HERE/);
  assert.match(hsrV, /Get ready/);
});

test("integrate placements put the lick on the briefed bars", () => {
  assert.deepEqual(phraseSpanBars("emr-autumn-leaves-a"), [6, 7]);
  assert.deepEqual(phraseSpanBars("emr-blue-bossa"), [6, 7, 14, 15]);
  assert.deepEqual(phraseSpanBars("gts-oleo"), [3, 4, 5, 7, 8]);
  assert.deepEqual(phraseSpanBars("gts-jones"), [5, 6, 7]);
  assert.deepEqual(phraseSpanBars("bo-rhythm"), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(phraseSpanBars("hsr-honeysuckle"), [1, 3]);
  assert.deepEqual(phraseSpanBars("hsr-a-train"), [5, 6]);
  const leaves = chorusChords(getKey("G"), "concert", "emr-autumn-leaves-a").map((chord) => chord.name);
  assert.deepEqual(leaves, ["Cm7", "F7", "B♭maj7", "E♭maj7", "Aø7", "D7♭13", "Gm6", "Gm6"]);
  const blues = chorusChords(getKey("F"), "concert", "bo-billies").map((chord) => chord.name);
  assert.equal(blues[0], "F7");
  assert.equal(blues[1], "B♭7");
});

test("grading treats a tie as one note and still grades a pickup", () => {
  const emr = jumpToCard(createSession({ lessonId: "emr-learn", startKeyId: "A" }), "quiz");
  const emrExpected = expectedNotesFor(emr);
  assert.equal(emrExpected.length, 7);
  assert.equal(emrExpected[6].beats, 2.5);
  const emrPass = gradeSession(emr, synthTrack(emrExpected));
  assert.equal(emrPass.passed, true);
  const emrMiss = gradeSession(emr, synthTrack(emrExpected.slice(0, 3)));
  assert.equal(emrMiss.passed, false);

  const bo = jumpToCard(createSession({ lessonId: "bo-integrate-honeysuckle", startKeyId: "F" }), "quiz");
  const boExpected = expectedNotesFor(bo);
  assert.ok(boExpected[0].startBeat < 0);
  assert.equal(boExpected[0].bar, 1);
  const boNotes = phraseNotes(getKey("F"), "concert", "bo-honeysuckle");
  assert.deepEqual(boExpected.map((note) => note.midi), boNotes.map((note) => note.concertMidi));
  const boPass = gradeSession(bo, synthTrack(boExpected));
  assert.equal(boPass.passed, true);
  const noPickup = gradeSession(bo, synthTrack(boExpected.slice(1)));
  assert.equal(noPickup.passedCount, boExpected.length - 1);

  const cmar = jumpToCard(createSession({ lessonId: "learn-lick", startKeyId: "G" }), "quiz");
  const cmarExpected = expectedNotesFor(cmar);
  assert.equal(cmarExpected.length, 6);
  assert.ok(Math.abs(cmarExpected[1].startBeat - 1) < 1e-9);
  assert.ok(Math.abs(cmarExpected[1].beats - 1 / 3) < 1e-9);
  assert.equal(gradeSession(cmar, synthTrack(cmarExpected)).passed, true);
});

test("model audio follows the new rhythms, including triplets and 16ths", () => {
  const cmar = scheduleChorus({
    concertKey: getKey("G"),
    displayMode: "concert",
    includeModel: true,
    includeGuides: false,
    includeClick: false,
    variationId: "original",
    stage: "learn",
    applicationId: "minor-home",
  }).filter((event) => event.type === "melody");
  assert.equal(cmar.length, 6);
  assert.equal(cmar[0].durationBeats, 1);
  assert.ok(cmar[1].swing === false);
  assert.ok(Math.abs(cmar[1].durationBeats - 1 / 3) < 1e-9);

  const bo = scheduleChorus({
    concertKey: getKey("G"),
    displayMode: "concert",
    includeModel: true,
    includeGuides: false,
    includeClick: false,
    variationId: "original",
    stage: "learn",
    applicationId: "bo-learn",
  }).filter((event) => event.type === "melody");
  assert.ok(bo.some((event) => event.durationBeats === 0.25));
  assert.ok(Math.abs(bo[0].beat + 0.5) < 1e-9);
  assert.equal(bo[1].beat, 0);
});

test("saved CMAR mastery survives and new lessons start empty", () => {
  const legacy = {
    lessons: {
      "learn-lick": { passedKeys: ["G", "C"] },
      "integrate-minor-home": { passedKeys: ["G"] },
    },
    masteredKeys: ["G"],
    medal: "bronze",
  };
  const next = normalizeMastery(legacy);
  assert.deepEqual(lessonPassedKeys(next, "learn-lick"), ["G", "C"]);
  assert.equal(isKeyMastered(next, "G"), true);
  assert.equal(isKeyMastered(next, "C"), false);
  assert.equal(next.medal, "bronze");
  assert.deepEqual(lessonPassedKeys(next, "emr-learn"), []);
  assert.equal(moduleMastery(next, "emr").medal, "none");
  const afterEmr = recordQuizPass(recordQuizPass(next, "emr-learn", "A"), "emr-integrate-autumn-leaves", "A");
  assert.equal(isKeyMastered(afterEmr, "A", "emr"), true);
  assert.equal(isKeyMastered(afterEmr, "A", "cmar"), false);
  assert.equal(moduleMastery(afterEmr, "cmar").medal, "bronze");
  assert.equal(moduleMastery(afterEmr, "emr").medal, "bronze");
});

test("Start bubble walks the module path in book order", () => {
  assert.equal(recommendedLessonId({}), "learn-lick");
  const cmarDone = Object.fromEntries(MODULES[0].lessons.map((lesson) => [lesson.id, TWELVE_KEY_IDS]));
  assert.equal(recommendedLessonId(cmarDone), "emr-learn");
  const throughGts = {
    ...cmarDone,
    ...Object.fromEntries(MODULES[1].lessons.map((lesson) => [lesson.id, TWELVE_KEY_IDS])),
    ...Object.fromEntries(MODULES[2].lessons.map((lesson) => [lesson.id, TWELVE_KEY_IDS])),
  };
  assert.equal(recommendedLessonId(throughGts), "bo-learn");
  const all = Object.fromEntries(LESSONS.map((lesson) => [lesson.id, TWELVE_KEY_IDS]));
  assert.equal(recommendedLessonId(all), null);
  const nodes = lessonPathNodes(defaultPrefs(), cmarDone);
  assert.equal(nodes.filter((node) => node.recommended).map((node) => node.id).join(), "emr-learn");
  assert.equal(nodes.filter((node) => node.number === "01").length, 30);
});

test("sleeve colors rotate so neighboring modules do not share an edge color", () => {
  const colors = MODULES.flatMap((module) => module.lessons.map((lesson) => lesson.sleeve));
  for (let i = 0; i < colors.length - 1; i += 1) {
    assert.notEqual(colors[i], colors[i + 1], `${i} ${colors[i]} ${colors[i + 1]}`);
  }
});

test("learn defaults follow each lick’s home key", () => {
  const prefs = defaultPrefs();
  assert.equal(prefs.lessons["learn-lick"].startKeyId, "G");
  assert.equal(prefs.lessons["emr-learn"].startKeyId, "A");
  assert.equal(prefs.lessons["gts-learn"].startKeyId, "G");
  assert.equal(prefs.lessons["bo-learn"].startKeyId, "G");
  assert.equal(prefs.lessons["hsr-learn"].startKeyId, "C");
  assert.equal(prefs.lessons["1235-learn"].startKeyId, "G");
  assert.equal(prefs.lessons["tdp-learn"].startKeyId, "B");
  assert.equal(prefs.lessons["nnr-learn"].startKeyId, "C");
});

const EXCERPTS = [
  {
    id: "cmar-blue-bossa",
    bars: 8,
    spots: [1, 3, 7],
    key: "C",
    chords: ["Cm7", "Cm7", "Fm7", "Fm7", "Dø7", "G7♭9", "Cm7", "Cm7"],
    source: "Blue Bossa",
  },
  {
    id: "cmar-fly-me",
    bars: 8,
    spots: [1, 2, 5, 8],
    key: "C",
    chords: ["Am7", "Dm7", "G7", "Cmaj7", "Fmaj7", "Bø7", "E7♭9", "Am7", "A7"],
    source: "Fly Me to the Moon",
  },
  {
    id: "cmar-summertime",
    bars: 8,
    spots: [1, 3, 5],
    key: "A",
    chords: ["Am7", "Bø7", "E7♭13", "Am7", "A7♭9", "Dm7", "F7", "Bø7", "E7♭13"],
    source: "Summertime",
  },
  {
    id: "cmar-cry-me",
    bars: 8,
    spots: [1, 3],
    key: "Eb",
    chords: [
      "Cm", "Cm♭6", "Cm6", "Cm7", "Fm7", "B♭7", "E♭maj7", "G7♭9",
      "Gø7", "C7♭9", "F9", "Fm7", "B♭7sus", "E♭6", "G7♭13",
    ],
    source: "Cry Me a River",
  },
  {
    id: "emr-autumn-leaves-a",
    bars: 8,
    spots: [6],
    key: "G",
    chords: ["Cm7", "F7", "B♭maj7", "E♭maj7", "Aø7", "D7♭13", "Gm6", "Gm6"],
    source: "Autumn Leaves",
  },
  {
    id: "emr-blue-bossa",
    bars: 16,
    spots: [6, 14],
    key: "C",
    chords: [
      "Cm7", "Cm7", "Fm7", "Fm7", "Dø7", "G7♭9", "Cm7", "Cm7",
      "E♭m7", "A♭7", "D♭maj7", "D♭maj7", "Dø7", "G7♭9", "Cm7", "Dø7", "G7♭9",
    ],
    source: "Blue Bossa",
  },
  {
    id: "emr-softly",
    bars: 9,
    spots: [2, 4, 6, 8],
    key: "C",
    chords: [
      "Cm7", "Dø7", "G7♭9", "Cm7", "Dø7", "G7♭9",
      "Cm7", "Dø7", "G7♭9", "Cm7", "Dø7", "G7♭9", "Cm7",
    ],
    source: "Softly, As in a Morning Sunrise",
  },
  {
    id: "emr-fly-me",
    bars: 8,
    spots: [7],
    key: "C",
    chords: ["Am7", "Dm7", "G7", "Cmaj7", "Fmaj7", "Bø7", "E7♭9", "Am7", "A7"],
    source: "Fly Me to the Moon",
  },
  {
    id: "gts-oleo",
    bars: 8,
    spots: [3, 7],
    key: "Bb",
    chords: [
      "B♭maj7", "G7", "Cm7", "F7", "Dm7", "G7", "Cm7", "F7",
      "Fm7", "B♭7", "E♭7", "A♭7", "Cm7", "F7", "B♭6",
    ],
    source: "Oleo",
  },
  {
    id: "gts-jones",
    bars: 8,
    spots: [5],
    key: "F",
    chords: [
      "Fmaj7", "B♭7", "Am7", "D7", "Gm7", "C7",
      "Am7", "D7", "Gm7", "C7", "F6", "Gm7", "C7",
    ],
    source: "Have You Met Miss Jones?",
  },
  {
    id: "gts-misty",
    bars: 9,
    spots: [2, 7],
    key: "Eb",
    chords: [
      "E♭maj7", "B♭m7", "E♭7", "A♭maj7", "A♭m7", "D♭7",
      "E♭maj7", "Cm7", "Fm7", "B♭7", "Gm7", "C7", "Fm7", "B♭7", "E♭6",
    ],
    source: "Misty",
  },
  {
    id: "bo-billies",
    bars: 12,
    spots: [1, 7],
    key: "F",
    chords: [
      "F7", "B♭7", "F7", "Cm7", "F7", "B♭7", "B°7", "F7",
      "Am7", "D7", "Gm7", "C7", "F7", "D7", "Gm7", "C7",
    ],
    source: "Billie's Bounce",
  },
  {
    id: "bo-rhythm",
    bars: 8,
    spots: [1, 5],
    key: "Bb",
    chords: ["D7", "D7", "G7", "G7", "C7", "C7", "F7", "F7"],
    source: "I Got Rhythm",
  },
  {
    id: "bo-honeysuckle",
    bars: 8,
    spots: [1, 5],
    key: "F",
    chords: ["F7", "F7", "B♭6", "B♭6", "G7", "G7", "C7", "C7"],
    source: "Honeysuckle Rose",
  },
  {
    id: "hsr-honeysuckle",
    bars: 8,
    spots: [1, 3],
    key: "F",
    chords: [
      "Gm7", "C7", "Gm7", "C7", "Gm7", "C7", "Gm7", "C7", "F6", "F7/A",
      "B♭6", "C7", "F6", "B♭7", "Am7", "D7",
    ],
    source: "Honeysuckle Rose",
  },
  {
    id: "hsr-a-train",
    bars: 8,
    spots: [5, 6],
    key: "C",
    chords: ["C6", "C6", "D7♯11", "D7♯11", "Dm7", "G7", "C6", "Dm7", "G7"],
    source: "Take the A Train",
  },
  {
    id: "hsr-satin",
    bars: 8,
    spots: [1, 3, 5, 6],
    key: "C",
    chords: [
      "Dm7", "G7", "Dm7", "G7", "Em7", "A7", "Em7", "A7",
      "Am7", "D7", "A♭m7", "D♭7", "Cmaj7", "Cmaj7",
    ],
    source: "Satin Doll",
  },
  {
    id: "hsr-attya",
    bars: 8,
    spots: [1, 2, 3],
    key: "Ab",
    chords: ["Fm7", "B♭m7", "E♭7", "A♭maj7", "D♭maj7", "Dm7", "G7", "Cmaj7", "Cmaj7"],
    source: "All the Things You Are",
  },
];

test("standards excerpts match bar counts, spot bars, and iReal source lines", () => {
  assert.equal(EXCERPTS.length, 18);
  assert.equal(fragmentBeats("gts-half"), 4);
  assert.equal(fragmentBeats("gts-half", { withResolution: true }), 6);
  assert.equal(fragmentBeats("bo-first"), 4.5);
  assert.equal(fragmentBeats("bo-second"), 6);
  assert.equal(fragmentBeats("hsr-altered"), 4);
  for (const excerpt of EXCERPTS) {
    const app = applicationById(excerpt.id);
    const form = formById(app.formId);
    assert.ok(excerpt.bars >= 8, `${excerpt.id} length rule`);
    assert.equal(form.bars.length, excerpt.bars, excerpt.id);
    assert.equal(formBeatsFor(excerpt.id), excerpt.bars * 4, excerpt.id);
    assert.deepEqual(spotsFor(excerpt.id).map((spot) => spot.bar), excerpt.spots, excerpt.id);
    assert.match(form.source, new RegExp(excerpt.source.replace(/[?]/g, "\\?")));
    assert.match(form.source, /iReal Pro Jazz 1460/);
    if (excerpt.chords) {
      assert.deepEqual(
        chorusChords(getKey(excerpt.key), "concert", excerpt.id).map((chord) => chord.name),
        excerpt.chords,
        excerpt.id,
      );
    }
  }
});

test("every Integrate excerpt is at least 8 bars with 4-bar systems", () => {
  const grown = [
    ["cmar-integrate-cry-me", "Cry Me a River · A, bars 1–8"],
    ["emr-integrate-autumn-leaves", "Autumn Leaves · A, bars 1–8"],
    ["emr-integrate-fly-me", "Fly Me to the Moon · A, bars 1–8"],
    ["hsr-integrate-honeysuckle", "Honeysuckle Rose · A, bars 1–8"],
    ["hsr-integrate-attya", "All the Things You Are · A, bars 1–8"],
  ];
  assert.deepEqual(grown.map(([id]) => id), grown.map(([id]) => LESSONS.find((lesson) => lesson.id === id)?.id));
  for (const [id, context] of grown) {
    const lesson = LESSONS.find((item) => item.id === id);
    assert.equal(lesson.context, context, id);
  }
  for (const lesson of LESSONS.filter((item) => item.kind === "integrate")) {
    const form = formById(applicationById(lesson.applicationId).formId);
    assert.ok(form.bars.length >= 8, lesson.id);
  }
  const grownApps = ["cmar-cry-me", "emr-autumn-leaves-a", "emr-fly-me", "hsr-honeysuckle", "hsr-attya"];
  for (const excerpt of EXCERPTS.filter((item) => grownApps.includes(item.id))) {
    const abc = landingABC(getKey(excerpt.key), "concert", excerpt.id, "bass", 0, { barsPerLine: 4 });
    const musicLines = abc.split("\n").filter((line) => /\|/.test(line));
    assert.equal(musicLines.length, 2, excerpt.id);
    assert.match(musicLines[0], /\|.*\|.*\|.*\|/, excerpt.id);
  }
});

test("each excerpt keeps every note on or above C3 across twelve keys", () => {
  for (const excerpt of EXCERPTS) {
    for (const keyId of TWELVE_KEY_IDS) {
      const notes = phraseNotes(getKey(keyId), "concert", excerpt.id);
      assert.ok(notes.length > 0, excerpt.id);
      const min = Math.min(...notes.map((note) => note.concertMidi));
      const max = Math.max(...notes.map((note) => note.concertMidi));
      assertRegister(excerpt.id, keyId, min, max);
    }
  }
});

test("a multi-spot lesson passes only when every spot passes", () => {
  const session = jumpToCard(createSession({
    lessonId: "cmar-integrate-blue-bossa",
    startKeyId: "C",
  }), "quiz");
  const expected = expectedNotesFor(session);
  const spots = [...new Set(expected.map((note) => note.spotIndex))];
  assert.equal(spots.length, 3);
  assert.equal(gradeSession(session, synthTrack(expected)).passed, true);
  const firstSpot = expected.filter((note) => note.spotIndex === 0);
  const onlyFirst = gradeSession(session, synthTrack(firstSpot));
  assert.equal(onlyFirst.passed, false);
  assert.equal(onlyFirst.spots.filter((spot) => spot.passed).length, 1);
});
