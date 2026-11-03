import test from "node:test";
import assert from "node:assert/strict";
import {
  WORKBOOK_TRACKS,
  placementHarmony,
  qualityFamily,
  trackLessonsFor,
} from "./workbook-tracks.js";
import { WORKBOOK_SPECS } from "./workbook-licks.js";
import {
  MODULES,
  LESSONS,
  formById,
  applicationById,
  spotsFor,
} from "./registry.js";
import {
  getKey,
  chorusChords,
  modelSolo,
  phraseEvents,
  phraseNotes,
  REGISTER_FLOOR_MIDI,
  REGISTER_CEIL_MIDI,
} from "./music.js";
import { TUNES, tuneById, tuneBarCount } from "./tunes.js";
import {
  TWELVE_KEY_IDS,
  createSession,
  jumpToCard,
  wrapupNextModule,
  homeNextModule,
  visibleModuleLessons,
} from "./session.js";
import { expectedNotesFor, gradeSession, synthTrack } from "./grade.js";

const LOOSE_TAILS = new Set([
  "jcdp-tune-up",
  "dct-four",
  "dct-another-you",
  "dss-nows-time",
]);

function specFor(lickId) {
  if (lickId === "emr") return { formBars: formById("emr-learn").bars };
  return WORKBOOK_SPECS.find((item) => item.id === lickId);
}

test("Recordame is 16 bars, concert A minor, with half-bar walking ii–Vs", () => {
  const tune = tuneById("recordame");
  assert.equal(tuneBarCount(tune), 16);
  assert.equal(tune.key, "A");
  assert.equal(tune.keyQuality, "minor");
  assert.equal(tune.feel, "straight");
  assert.match(tune.chords, /reharmonize\.app/);
  assert.deepEqual(
    chorusChords(getKey("A"), "concert", "tune-recordame").map((chord) => chord.name),
    [
      "Am7", "Am7", "Am7", "Am7", "Cm7", "Cm7", "Cm7", "Cm7", "F7",
      "B♭maj7", "B♭m7", "E♭7", "A♭maj7", "A♭m7", "D♭7", "G♭maj7",
      "Gm7", "C7", "Fmaj7", "E7♯9",
    ],
  );
});

test("every workbook module has 1–3 tune lessons on the road", () => {
  for (const module of MODULES.slice(5)) {
    const extras = module.lessons.filter((lesson) => lesson.kind === "integrate");
    assert.ok(extras.length >= 1 && extras.length <= 3, `${module.id} ${extras.length}`);
    assert.deepEqual(extras.map((lesson) => lesson.id), trackLessonsFor(module.id).map((lesson) => lesson.id));
  }
  assert.equal(LESSONS.some((lesson) => lesson.id === "emr-integrate-recordame"), false);
});

test("each new tune placement’s first-bar harmony matches the lick", () => {
  for (const row of WORKBOOK_TRACKS) {
    const spec = specFor(row.lickId);
    const reports = placementHarmony(row, spec.formBars);
    const app = applicationById(`${row.lickId}-${row.tuneId}`);
    const form = formById(app.formId);
    assert.ok(form.bars.length >= 8, row.lickId);
    assert.match(form.source, /iReal Pro Jazz 1460|reharmonize\.app/);
    assert.equal(row.simplification.length > 10, true, row.lickId);
    for (const { spot, report } of reports) {
      assert.equal(report[0].ok, true, `${row.lickId}-${row.tuneId} bar ${spot.bar}: ${JSON.stringify(report[0])}`);
      const loose = LOOSE_TAILS.has(`${row.lickId}-${row.tuneId}`);
      if (!loose) {
        for (const item of report) {
          assert.equal(item.ok, true, `${row.lickId}-${row.tuneId} ${JSON.stringify(item)}`);
        }
      }
    }
    assert.deepEqual(spotsFor(app.id).map((spot) => spot.bar), row.spots.map((spot) => spot.bar));
  }
});

test("Recordame walking ii–Vs move the lick down whole steps, then a half step, and grade each key", () => {
  const row = WORKBOOK_TRACKS.find((item) => item.lickId === "sat" && item.tuneId === "recordame");
  assert.deepEqual(row.spots.map((spot) => spot.anchor), [1, 11, 9, 8]);
  assert.equal((row.spots[0].anchor - row.spots[1].anchor + 12) % 12, 2);
  assert.equal((row.spots[1].anchor - row.spots[2].anchor + 12) % 12, 2);
  assert.equal((row.spots[2].anchor - row.spots[3].anchor + 12) % 12, 1);
  const session = jumpToCard(createSession({
    lessonId: "sat-integrate-recordame",
    startKeyId: "A",
  }), "quiz");
  const expected = expectedNotesFor(session);
  const spots = [...new Set(expected.map((note) => note.spotIndex))];
  assert.equal(spots.length, 4);
  const first = expected.filter((note) => note.spotIndex === 0);
  const second = expected.filter((note) => note.spotIndex === 1);
  assert.notEqual(first[0].midi, second[0].midi);
  assert.equal(gradeSession(session, synthTrack(expected)).passed, true);
  assert.equal(gradeSession(session, synthTrack(first)).passed, false);
});

test("Diminished Stairsteps keeps its pickup before bar 6 in phrase, model, and grading timelines", () => {
  const applicationId = "dss-nows-time";
  const row = WORKBOOK_TRACKS.find((item) => item.lickId === "dss" && item.tuneId === "nows-time");
  assert.deepEqual(row.spots, [{ bar: 6, anchor: 6, pickup: true }]);
  assert.equal(applicationById(applicationId).spots[0].pickup, true);
  assert.equal(spotsFor(applicationId)[0].pickup, true);
  const isolatedBeats = [-1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];
  const integratedBeats = isolatedBeats.map((beat) => beat + 20);
  assert.deepEqual(phraseEvents("dss-learn", true).map((note) => note.beat), isolatedBeats);
  assert.deepEqual(phraseEvents(applicationId).map((note) => note.beat), integratedBeats);
  assert.deepEqual(modelSolo(applicationId).map((note) => note.beat), integratedBeats);
  assert.deepEqual(phraseNotes(getKey("C"), "piano", applicationId).slice(0, 3).map((note) => note.startBeat), [19, 19.5, 20]);
  const isolated = createSession({ lessonId: "dss-learn", startKeyId: "C" });
  assert.deepEqual(expectedNotesFor(isolated).map((note) => note.startBeat), isolatedBeats);
  const integrated = createSession({ lessonId: "dss-integrate-nows-time", startKeyId: "C" });
  for (const card of ["play", "listen", "quiz"]) {
    const session = jumpToCard(integrated, card);
    const expected = expectedNotesFor(session);
    assert.deepEqual(expected.map((note) => note.startBeat), integratedBeats, card);
    assert.deepEqual(expected.slice(0, 3).map((note) => note.bar), [5, 5, 6], card);
    assert.equal(expected.at(-1).startBeat + expected.at(-1).beats, 28, card);
    assert.equal(gradeSession(session, synthTrack(expected)).passed, true, card);
  }
});

test("workbook spots preserve every lick's placement and only explicit pickup metadata", () => {
  for (const row of WORKBOOK_TRACKS) {
    const applicationId = `${row.lickId}-${row.tuneId}`;
    const spec = specFor(row.lickId);
    const app = applicationById(applicationId);
    const spots = spotsFor(applicationId);
    const notes = phraseEvents(applicationId);
    row.spots.forEach((spot, spotIndex) => {
      assert.equal(app.spots[spotIndex].pickup, spot.pickup, applicationId);
      assert.equal(spots[spotIndex].pickup, spot.pickup ?? false, applicationId);
      let beat = (spot.bar - 1) * 4 - (spot.pickup ? spec.pickupBeats : 0);
      const expectedBeats = [];
      for (const element of spec.elements) {
        if (element.type === "note") expectedBeats.push(beat);
        beat += element.beats;
      }
      assert.deepEqual(
        notes.filter((note) => note.spotIndex === spotIndex).map((note) => note.beat),
        expectedBeats,
        `${applicationId} spot ${spotIndex}`,
      );
    });
  }
});

test("quality families group maj7/6 and 7/7b9 together", () => {
  assert.equal(qualityFamily("major7"), "major");
  assert.equal(qualityFamily("major6"), "major");
  assert.equal(qualityFamily("dominant7b9"), "dominant");
  assert.equal(qualityFamily("halfdim7"), "halfdim");
  assert.equal(qualityFamily("minor6"), "minor");
});

test("new placements stay on or above C3 in twelve keys", () => {
  for (const row of WORKBOOK_TRACKS) {
    const appId = `${row.lickId}-${row.tuneId}`;
    for (const keyId of TWELVE_KEY_IDS) {
      const notes = phraseNotes(getKey(keyId), "concert", appId);
      assert.ok(notes.length > 0, appId);
      const min = Math.min(...notes.map((note) => note.concertMidi));
      const max = Math.max(...notes.map((note) => note.concertMidi));
      assert.ok(min >= REGISTER_FLOOR_MIDI, `${appId} ${keyId} low ${min}`);
      const canDrop = min - 12 >= REGISTER_FLOOR_MIDI;
      if (canDrop) assert.ok(max <= REGISTER_CEIL_MIDI, `${appId} ${keyId} high ${max}`);
    }
  }
});

test("Nutville is C minor, 24 bars, with one-bar B-section dominants and G7♯5", () => {
  const tune = tuneById("nutville");
  assert.equal(tuneBarCount(tune), 24);
  assert.equal(tune.key, "C");
  assert.equal(tune.keyQuality, "minor");
  assert.equal(tune.feel, "medium-up");
  assert.equal(tune.sections[1].todoVerify, undefined);
  assert.match(tune.chords, /iReal Pro Jazz 1460 · Nutville Solo/);
  assert.doesNotMatch(tune.chords, /TODO-verify/);
  assert.deepEqual(
    chorusChords(getKey("C"), "concert", "tune-nutville").map((chord) => chord.name),
    [
      ...Array.from({ length: 8 }, () => "Cm7"),
      "Fm7", "Fm7", "Fm7", "D♭7", "Cm7", "Cm7", "Cm7", "Cm7",
      "A♭7", "G7", "G♭7", "F7", "A♭7", "G7♯5", "Cm7", "Cm7",
    ],
  );
  const walk = WORKBOOK_TRACKS.find((item) => item.lickId === "cbc" && item.tuneId === "nutville");
  assert.deepEqual(walk.spots.map((spot) => spot.bar), [1, 2, 3, 4]);
  assert.deepEqual(walk.spots.map((spot) => spot.anchor), [1, 0, 11, 10]);
  const resolution = WORKBOOK_TRACKS.find((item) => item.lickId === "ae" && item.tuneId === "nutville");
  assert.deepEqual(resolution.spots, [{ bar: 6, anchor: 0 }]);
  assert.equal(WORKBOOK_TRACKS.some((item) => item.lickId === "jcdp" && item.tuneId === "nutville"), false);
  const session = jumpToCard(createSession({
    lessonId: "cbc-integrate-nutville",
    startKeyId: "C",
  }), "quiz");
  const expected = expectedNotesFor(session);
  assert.equal(new Set(expected.map((note) => note.spotIndex)).size, 4);
  assert.equal(gradeSession(session, synthTrack(expected)).passed, true);
});

test("wrap-up of a module’s last lesson offers the next module", () => {
  const first = MODULES[0];
  const last = MODULES.at(-1);
  const lastGraded = visibleModuleLessons(first).find((lesson) => lesson.kind === "master");
  const session = createSession({ lessonId: lastGraded.id, startKeyId: first.lessons[0].defaultKeyId });
  assert.match(wrapupNextModule(session).label, /^Next: Module 2 · /);
  const done = Object.fromEntries(visibleModuleLessons(first).map((lesson) => [lesson.id, TWELVE_KEY_IDS]));
  assert.match(homeNextModule(first, done).label, /^Next: Module 2 · /);
  assert.equal(homeNextModule(first, {}).id, wrapupNextModule(session).id);
  assert.match(homeNextModule(last, {}).label, /^Back to Module 1 · /);
  assert.equal(homeNextModule(last, {}).id, first.id);
  assert.ok(tuneById("recordame"));
  assert.ok(tuneById("nutville"));
  assert.equal(TUNES.at(-1).id, "blue-bossa");
});
