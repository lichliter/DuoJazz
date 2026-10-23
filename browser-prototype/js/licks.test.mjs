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
  octaveForApplication,
  melodyMidiForInterval,
  BEATS_PER_BAR,
} from "./music.js";
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

test("registry has five modules and fifteen always-open lessons", () => {
  assert.deepEqual(LICKS.map((lick) => lick.id), ["cmar", "emr", "gts", "bo", "hsr"]);
  assert.equal(MODULES.length, 5);
  assert.equal(LESSONS.length, 15);
  assert.ok(LESSONS.every((lesson) => lesson.kind === "learn" || lesson.kind === "integrate"));
  for (const lick of LICKS) {
    assert.match(lick.source, /Essential Jazz Vocabulary Workbook, Lick /);
  }
});

test("each lick’s sounding beats match the workbook cell", () => {
  assert.equal(lickTotalBeats(lickById("cmar")), 4);
  assert.equal(lickTotalBeats(lickById("emr")), 8);
  assert.equal(lickTotalBeats(lickById("gts")), 12);
  assert.equal(lickTotalBeats(lickById("bo")), 12.5);
  assert.equal(lickTotalBeats(lickById("hsr")), 4);
  assert.equal(learnBeatsFor("minor-home"), 8);
  assert.equal(formBeatsFor("minor-home"), 32);
  assert.equal(formBeatsFor("emr-minor-251"), 16);
  assert.equal(formBeatsFor("gts-rhythm"), 20);
  assert.equal(formBeatsFor("bo-into-i"), 16);
  assert.equal(formBeatsFor("hsr-251"), 16);
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
  const integrated = phraseEvents("bo-into-i");
  assert.ok(integrated[0].beat < 0);
  assert.ok(Math.abs(integrated[0].beat + 0.5) < 1e-9);
  assert.equal(integrated[1].beat, 0);
  const isolated = phraseEvents("bo-learn", true);
  assert.equal(isolated[0].beat, 0);
});

test("HSR is six eighths and a quarter rest", () => {
  const notes = lickNoteElements(lickById("hsr"));
  assert.deepEqual(notes.map((note) => note.interval), [5, 3, -5, -2, 2, 0]);
  assert.ok(notes.every((note) => note.beats === 0.5));
  assert.equal(phraseSpanBars("hsr-251")[0], 1);
  assert.deepEqual(phraseSpanBars("hsr-over-v7"), [2]);
});

test("each lick stays in trombone range across twelve keys at original register", () => {
  for (const lick of LICKS) {
    for (const keyId of TWELVE_KEY_IDS) {
      const midis = midisFor(lick, keyId);
      const min = Math.min(...midis);
      const max = Math.max(...midis);
      assert.ok(min >= TROMBONE_LOW_MIDI - 4, `${lick.id} ${keyId} low ${min}`);
      assert.ok(max <= TROMBONE_HIGH_MIDI + 8, `${lick.id} ${keyId} high ${max}`);
      const up = midis.map((midi) => midi + 12);
      const down = midis.map((midi) => midi - 12);
      assert.equal(up[0] - midis[0], 12);
      assert.equal(down[0] - midis[0], -12);
    }
  }
});

test("CMAR G-minor pitches are unchanged besides rhythm", () => {
  const notes = phraseNotes(getKey("G"), "concert", "minor-home");
  assert.deepEqual(notes.map((note) => note.concertMidi), [57, 55, 50, 46, 45, 43]);
  assert.deepEqual(notes.map((note) => note.shownName), ["A3", "G3", "D3", "B♭2", "A2", "G2"]);
});

test("each lick renders in C, G, B♭ and F♯ with barlines and chord symbols", () => {
  const samples = [
    { lesson: "learn-lick", applicationId: "minor-home", isolated: true },
    { lesson: "emr-learn", applicationId: "emr-learn", isolated: true },
    { lesson: "gts-learn", applicationId: "gts-learn", isolated: true },
    { lesson: "bo-learn", applicationId: "bo-learn", isolated: true },
    { lesson: "hsr-learn", applicationId: "hsr-learn", isolated: true },
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
  const emr = landingABC(getKey("A"), "concert", "emr-minor-251", "bass", 0, { showCues: true });
  assert.match(emr, /HERE/);
  assert.match(emr, /Get ready/);
  const gts = landingABC(getKey("G"), "concert", "gts-turnaround", "bass", 0, { showCues: true });
  assert.match(gts, /HERE/);
  const hsrV = landingABC(getKey("C"), "concert", "hsr-over-v7", "bass", 0, { showCues: true });
  assert.match(hsrV, /HERE/);
  assert.match(hsrV, /Get ready/);
});

test("integrate placements put the lick on the briefed bars", () => {
  assert.deepEqual(phraseSpanBars("emr-minor-251"), [2, 3]);
  assert.deepEqual(phraseSpanBars("emr-autumn-leaves"), [6, 7]);
  assert.deepEqual(phraseSpanBars("gts-turnaround"), [1, 2, 3]);
  assert.deepEqual(phraseSpanBars("gts-rhythm"), [3, 4, 5]);
  assert.deepEqual(phraseSpanBars("bo-into-i"), [1, 2, 3]);
  assert.deepEqual(phraseSpanBars("bo-blues"), [1, 2, 3]);
  assert.deepEqual(phraseSpanBars("hsr-251"), [1]);
  assert.deepEqual(phraseSpanBars("hsr-over-v7"), [2]);
  const a = chorusChords(getKey("A"), "concert", "emr-minor-251").map((chord) => chord.name);
  assert.deepEqual(a.slice(0, 4), ["Bø7", "E7♭9", "Am7", "Am7"]);
  const gBlues = chorusChords(getKey("G"), "concert", "bo-blues").map((chord) => chord.name);
  assert.equal(gBlues[0], "G7");
  assert.equal(gBlues[1], "C7");
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

  const bo = jumpToCard(createSession({ lessonId: "bo-integrate-into-i", startKeyId: "G" }), "quiz");
  const boExpected = expectedNotesFor(bo);
  assert.ok(boExpected[0].startBeat < 0);
  assert.equal(boExpected[0].bar, 1);
  const boNotes = phraseNotes(getKey("G"), "concert", "bo-into-i");
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
  assert.equal(bo[0].beat, 0);
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
  const afterEmr = recordQuizPass(recordQuizPass(next, "emr-learn", "A"), "emr-integrate-minor-251", "A");
  assert.equal(isKeyMastered(afterEmr, "A", "emr"), true);
  assert.equal(isKeyMastered(afterEmr, "A", "cmar"), false);
  assert.equal(moduleMastery(afterEmr, "cmar").medal, "bronze");
  assert.equal(moduleMastery(afterEmr, "emr").medal, "bronze");
});

test("Start bubble walks the five-module path in order", () => {
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
  assert.equal(nodes.filter((node) => node.number === "01").length, 5);
});

test("sleeve colors rotate so neighboring modules do not share an edge color", () => {
  const colors = MODULES.flatMap((module) => module.lessons.map((lesson) => lesson.sleeve));
  for (let i = 2; i < colors.length - 1; i += 3) {
    assert.notEqual(colors[i], colors[i + 1]);
  }
});

test("learn defaults follow each lick’s home key", () => {
  const prefs = defaultPrefs();
  assert.equal(prefs.lessons["learn-lick"].startKeyId, "G");
  assert.equal(prefs.lessons["emr-learn"].startKeyId, "A");
  assert.equal(prefs.lessons["gts-learn"].startKeyId, "G");
  assert.equal(prefs.lessons["bo-learn"].startKeyId, "G");
  assert.equal(prefs.lessons["hsr-learn"].startKeyId, "C");
});
