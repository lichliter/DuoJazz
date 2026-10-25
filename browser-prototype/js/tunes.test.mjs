import test from "node:test";
import assert from "node:assert/strict";
import {
  TUNES,
  YOUR_TUNES_BY_LICK,
  tuneById,
  tuneBarCount,
  tuneFormBars,
  tuneSectionMeta,
  spotsForTune,
  tuneApplicationId,
  tunePlayLessonId,
  tuneLickLessonId,
  learnLessonIdForLick,
} from "./tunes.js";
import {
  LESSONS,
  MODULES,
  TUNE_LESSONS,
  applicationById,
  formById,
  spotsFor,
  spotNoteRange,
  lickById,
} from "./registry.js";
import {
  getKey,
  chorusChords,
  landingABC,
  phraseNotes,
  phraseSpanBars,
  TROMBONE_LOW_MIDI,
  TROMBONE_HIGH_MIDI,
} from "./music.js";
import {
  TWELVE_KEY_IDS,
  defaultPrefs,
  persistLessonTempo,
  normalizePrefs,
  createSession,
  jumpToCard,
  sessionCue,
  sessionPrimaryAction,
} from "./session.js";
import { expectedNotesFor, gradeSession, synthTrack } from "./grade.js";

const EXPECTED_CHORDS = {
  "nows-time": {
    key: "F",
    bars: 12,
    sections: [],
    chords: [
      "F7", "B♭7", "F7", "Cm7", "F7", "B♭7", "B°7", "F7",
      "Am7", "D7", "Gm7", "C7", "F7", "D7", "Gm7", "C7",
    ],
    spots: [
      { bar: 1, lickId: "bo", fragment: "bo-first", pickup: true },
      { bar: 4, lickId: "hsr", fragment: "full", pickup: false },
      { bar: 7, lickId: "bo", fragment: "bo-first", pickup: true },
      { bar: 9, lickId: "bo", fragment: "full", pickup: true },
    ],
  },
  four: {
    key: "Eb",
    bars: 32,
    sections: [
      { label: "A", startBar: 1 },
      { label: "B", startBar: 9 },
      { label: "A", startBar: 17 },
      { label: "C", startBar: 25 },
    ],
    chords: [
      "E♭maj7", "E♭maj7", "E♭m7", "A♭7", "Fm7", "Fm7", "A♭m7", "D♭7",
      "E♭maj7/G", "F♯m7", "B7", "Fm7", "B♭7", "E♭maj7/G", "F♯m7", "B7", "Fm7", "B♭7",
      "E♭maj7", "E♭maj7", "E♭m7", "A♭7", "Fm7", "Fm7", "A♭m7", "D♭7",
      "E♭maj7/G", "F♯m7", "B7", "Fm7", "B♭7", "Gm7", "G♭m7", "Fm7", "B♭7", "E♭maj7", "E♭maj7",
    ],
    spots: [
      { bar: 3, lickId: "hsr" },
      { bar: 5, lickId: "cmar" },
      { bar: 7, lickId: "hsr" },
      { bar: 10, lickId: "hsr" },
      { bar: 11, lickId: "bo", pickup: true },
      { bar: 15, lickId: "bo", pickup: true },
      { bar: 19, lickId: "hsr" },
      { bar: 21, lickId: "hsr" },
      { bar: 23, lickId: "hsr" },
      { bar: 27, lickId: "bo", pickup: true },
      { bar: 30, lickId: "gts", fragment: "gts-half" },
    ],
  },
  "tune-up": {
    key: "D",
    bars: 16,
    sections: [],
    chords: [
      "Em7", "A7", "Dmaj7", "Dmaj7", "Dm7", "G7", "Cmaj7", "Cmaj7",
      "Cm7", "F7", "B♭maj7", "Gm7", "Em7", "F7", "B♭maj7", "A7",
    ],
    spots: [
      { bar: 1, lickId: "bo", pickup: true },
      { bar: 5, lickId: "hsr" },
      { bar: 6, lickId: "hsr", fragment: "hsr-altered" },
      { bar: 9, lickId: "bo", pickup: true },
    ],
  },
  "st-thomas": {
    key: "C",
    bars: 16,
    sections: [],
    chords: [
      "Cmaj7", "F7", "Em7", "A7", "Dm7", "G7", "C6",
      "Cmaj7", "F7", "Em7", "A7", "Dm7", "G7", "C6",
      "Eø7", "A7♭9", "Dm7", "G7", "Cmaj7", "C7/E", "Fmaj7", "F♯°7", "G7", "C6",
    ],
    spots: [
      { bar: 2, lickId: "gts" },
      { bar: 7, lickId: "gts", fragment: "gts-half" },
      { bar: 10, lickId: "emr" },
      { bar: 12, lickId: "hsr", fragment: "hsr-altered" },
    ],
  },
  attya: {
    key: "Ab",
    bars: 36,
    sections: [
      { label: "A", startBar: 1 },
      { label: "A", startBar: 9 },
      { label: "B", startBar: 17 },
      { label: "C", startBar: 25 },
    ],
    chords: [
      "Fm7", "B♭m7", "E♭7", "A♭maj7", "D♭maj7", "Dm7", "G7", "Cmaj7", "Cmaj7",
      "Cm7", "Fm7", "B♭7", "E♭maj7", "A♭maj7", "Am7", "D7", "Gmaj7", "Gmaj7",
      "Am7", "D7", "Gmaj7", "Gmaj7", "F♯ø7", "B7♭9", "Emaj7", "C7♭13",
      "Fm7", "B♭m7", "E♭7", "A♭maj7", "D♭maj7", "D♭mΔ7", "Cm7", "B°7",
      "B♭m7", "E♭7", "A♭maj7", "Gø7", "C7♭9",
    ],
    spots: [
      { bar: 1, lickId: "hsr" },
      { bar: 2, lickId: "bo", pickup: true },
      { bar: 6, lickId: "gts", fragment: "gts-half" },
      { bar: 9, lickId: "hsr" },
      { bar: 10, lickId: "bo", pickup: true },
      { bar: 14, lickId: "gts", fragment: "gts-half" },
      { bar: 17, lickId: "bo", pickup: true },
      { bar: 25, lickId: "hsr" },
      { bar: 26, lickId: "bo", pickup: true },
      { bar: 33, lickId: "bo", pickup: true },
    ],
  },
  "autumn-leaves": {
    key: "G",
    bars: 24,
    sections: [
      { label: "A", startBar: 1 },
      { label: "A", startBar: 9 },
      { label: "B", startBar: 17 },
    ],
    chords: [
      "Cm7", "F7", "B♭maj7", "E♭maj7", "Aø7", "D7♭13", "Gm6", "Gm6",
      "Aø7", "D7♭13", "Gm6", "Gm6", "Cm7", "F7", "B♭maj7", "E♭maj7",
      "Aø7", "D7♭13", "Gm7", "G♭7", "Fm7", "E7", "Aø7", "D7♭13", "Gm6", "Gm6",
    ],
    spots: [
      { bar: 1, lickId: "hsr" },
      { bar: 6, lickId: "emr" },
      { bar: 10, lickId: "emr" },
      { bar: 13, lickId: "bo", pickup: true },
      { bar: 18, lickId: "emr" },
      { bar: 23, lickId: "cmar" },
    ],
  },
  "so-what": {
    key: "D",
    bars: 32,
    sections: [
      { label: "A", startBar: 1 },
      { label: "A", startBar: 9 },
      { label: "B", startBar: 17 },
      { label: "A", startBar: 25 },
    ],
    chords: [
      ...Array.from({ length: 16 }, () => "Dm11"),
      ...Array.from({ length: 8 }, () => "E♭m11"),
      ...Array.from({ length: 8 }, () => "Dm11"),
    ],
    spots: [
      { bar: 1, lickId: "cmar" },
      { bar: 5, lickId: "hsr" },
      { bar: 9, lickId: "cmar" },
      { bar: 13, lickId: "hsr" },
      { bar: 17, lickId: "cmar" },
      { bar: 21, lickId: "hsr" },
      { bar: 25, lickId: "cmar" },
      { bar: 29, lickId: "hsr" },
    ],
  },
  recordame: {
    key: "A",
    bars: 16,
    sections: [],
    chords: [
      "Am7", "Am7", "Am7", "Am7", "Cm7", "Cm7", "Cm7", "Cm7", "F7",
      "B♭maj7", "B♭m7", "E♭7", "A♭maj7", "A♭m7", "D♭7", "G♭maj7",
      "Gm7", "C7", "Fmaj7", "E7♯9",
    ],
    spots: [
      { bar: 1, lickId: "mp" },
      { bar: 5, lickId: "mp" },
      { bar: 8, lickId: "se" },
      { bar: 10, lickId: "se" },
      { bar: 12, lickId: "se" },
      { bar: 14, lickId: "se" },
    ],
  },
  "another-you": {
    key: "Eb",
    bars: 32,
    sections: [
      { label: "A", startBar: 1 },
      { label: "B", startBar: 9 },
      { label: "A", startBar: 17 },
      { label: "C", startBar: 25 },
    ],
    chords: [
      "E♭maj7", "E♭maj7", "Dø7", "G7♭9", "Cm7", "Cm7", "B♭m7", "E♭7",
      "A♭maj7", "D♭7♯11", "E♭maj7", "Cm7", "F7", "F7", "Fm7", "B♭7",
      "E♭maj7", "E♭maj7", "Dø7", "G7♭9", "Cm7", "Cm7", "B♭m7", "E♭7",
      "A♭maj7", "D♭7♯11", "E♭maj7", "Aø7", "D7", "E♭maj7", "A♭7", "Gm7", "C7", "Fm7", "B♭7", "E♭6", "B♭7",
    ],
    spots: [
      { bar: 4, lickId: "emr" },
      { bar: 7, lickId: "bo", pickup: true },
      { bar: 12, lickId: "hsr" },
      { bar: 13, lickId: "bo", pickup: true },
      { bar: 20, lickId: "emr" },
      { bar: 23, lickId: "bo", pickup: true },
      { bar: 30, lickId: "gts" },
    ],
  },
  nutville: {
    key: "C",
    bars: 30,
    sections: [
      { label: "A", startBar: 1 },
      { label: "B", startBar: 17 },
    ],
    chords: [
      ...Array.from({ length: 8 }, () => "Cm7"),
      "Fm7", "Fm7", "Fm7", "D♭7", "Cm7", "Cm7", "Cm7", "Cm7",
      "A♭7", "A♭7", "G7", "G7", "G♭7", "G♭7", "F7", "F7",
      "A♭7", "A♭7", "G7♭13", "G7♭13", "Cm7", "Cm7",
    ],
    spots: [
      { bar: 1, lickId: "mp" },
      { bar: 17, lickId: "cbc" },
      { bar: 19, lickId: "cbc" },
      { bar: 21, lickId: "cbc" },
      { bar: 23, lickId: "cbc" },
    ],
  },
};

test("there are ten tunes with the briefed bar counts, sections, and chords", () => {
  assert.deepEqual(TUNES.map((tune) => tune.id), [
    "nows-time", "four", "tune-up", "st-thomas", "attya", "autumn-leaves", "so-what", "another-you", "recordame", "nutville",
  ]);
  for (const tune of TUNES) {
    const expected = EXPECTED_CHORDS[tune.id];
    assert.equal(tuneBarCount(tune), expected.bars, tune.id);
    assert.equal(tuneFormBars(tune).length, expected.bars, tune.id);
    assert.deepEqual(tuneSectionMeta(tune), expected.sections, `${tune.id} sections`);
    assert.match(tune.chords, /iReal Pro Jazz 1460|reharmonize\.app/);
    const appId = tuneApplicationId(tune.id);
    const form = formById(applicationById(appId).formId);
    assert.equal(form.bars.length, expected.bars, `${tune.id} form`);
    assert.deepEqual(
      chorusChords(getKey(expected.key), "concert", appId).map((chord) => chord.name),
      expected.chords,
      `${tune.id} chords`,
    );
  }
});

test("spots land on the listed bars and pickups, with no overlaps", () => {
  for (const tune of TUNES) {
    const expected = EXPECTED_CHORDS[tune.id];
    const spots = spotsForTune(tune);
    assert.deepEqual(
      spots.map((spot) => ({
        bar: spot.bar,
        lickId: spot.lickId,
        fragment: spot.fragment,
        pickup: spot.pickup,
      })),
      expected.spots.map((spot) => ({
        bar: spot.bar,
        lickId: spot.lickId,
        fragment: spot.fragment ?? "full",
        pickup: Boolean(spot.pickup),
      })),
      `${tune.id} spots`,
    );
    for (const spot of spots) {
      if (spot.pickup) {
        assert.equal(lickById(spot.lickId).pickupBeats, 0.5, `${tune.id} pickup ${spot.bar}`);
      }
    }
    const app = applicationById(tuneApplicationId(tune.id));
    const ranges = spots.map((spot, index) => spotNoteRange(app, spot, spots[index + 1]));
    for (let i = 1; i < ranges.length; i += 1) {
      assert.ok(
        ranges[i].start >= ranges[i - 1].end - 1e-9,
        `${tune.id} overlap ${spots[i - 1].bar} vs ${spots[i].bar} (${ranges[i - 1].end} / ${ranges[i].start})`,
      );
    }
  }
});

test("derived Your tunes lessons match the brief and each play-through has every spot", () => {
  for (const [lickId, tuneIds] of Object.entries(YOUR_TUNES_BY_LICK)) {
    const module = MODULES.find((item) => item.lickId === lickId);
    const yours = module.lessons.filter((lesson) => lesson.group === "your-tunes");
    assert.deepEqual(yours.map((lesson) => lesson.tuneId), tuneIds, lickId);
    for (const lesson of yours) {
      const tune = tuneById(lesson.tuneId);
      const n = spotsForTune(tune, lickId).length;
      assert.equal(lesson.id, tuneLickLessonId(tune.id, lickId));
      assert.equal(lesson.coverTitle, tune.title);
      assert.equal(lesson.context, `${n} spot${n === 1 ? "" : "s"} · full form`);
      assert.deepEqual(
        spotsFor(lesson.applicationId).map((spot) => spot.bar),
        spotsForTune(tune, lickId).map((spot) => spot.bar),
      );
    }
  }
  assert.equal(TUNE_LESSONS.length, 10);
  for (const lesson of TUNE_LESSONS) {
    const tune = tuneById(lesson.tuneId);
    assert.equal(lesson.id, tunePlayLessonId(tune.id));
    assert.equal(spotsFor(lesson.applicationId).length, spotsForTune(tune).length);
    assert.equal(lesson.coverTitle, tune.title);
  }
  assert.equal(learnLessonIdForLick("cmar"), "learn-lick");
  assert.equal(learnLessonIdForLick("bo"), "bo-learn");
  assert.ok(LESSONS.some((lesson) => lesson.id === "learn-lick"));
  assert.ok(LESSONS.some((lesson) => lesson.id === "integrate-minor-home"));
});

test("tune spots stay in trombone range in all 12 keys", () => {
  for (const tune of TUNES) {
    const appId = tuneApplicationId(tune.id);
    for (const keyId of TWELVE_KEY_IDS) {
      const notes = phraseNotes(getKey(keyId), "concert", appId);
      assert.ok(notes.length > 0, `${tune.id} ${keyId}`);
      const min = Math.min(...notes.map((note) => note.concertMidi));
      const max = Math.max(...notes.map((note) => note.concertMidi));
      assert.ok(min >= 48, `${tune.id} ${keyId} low ${min}`);
      assert.ok(max <= TROMBONE_HIGH_MIDI || min - 12 < 48, `${tune.id} ${keyId} high ${max}`);
    }
  }
});

test("a tune page passes only when every spot passes", () => {
  const session = jumpToCard(createSession({
    lessonId: "tune-st-thomas",
    startKeyId: "C",
  }), "quiz");
  const expected = expectedNotesFor(session);
  const spots = [...new Set(expected.map((note) => note.spotIndex))];
  assert.equal(spots.length, 4);
  assert.equal(gradeSession(session, synthTrack(expected)).passed, true);
  const firstSpot = expected.filter((note) => note.spotIndex === 0);
  const onlyFirst = gradeSession(session, synthTrack(firstSpot));
  assert.equal(onlyFirst.passed, false);
  assert.equal(onlyFirst.spots.filter((spot) => spot.passed).length, 1);
});

test("St. Thomas landing ABC has section-free 4-bar systems and lick labels on the play-through", () => {
  const abc = landingABC(getKey("C"), "concert", "tune-st-thomas", "bass", 0, { showCues: true, barsPerLine: 4 });
  const musicLines = abc.split("\n").filter((line) => /\|/.test(line));
  assert.equal(musicLines.length, 4);
  assert.match(abc, /Guide tone sequence/);
  assert.match(abc, /Honeysuckle Rose/);
  const four = landingABC(getKey("Eb"), "concert", "tune-four", "bass", 0, { showCues: true, barsPerLine: 4 });
  assert.match(four, /\^A/);
  assert.match(four, /\^B/);
  assert.match(four, /\^C/);
});

test("Play-card landing for Billie's Bounce does not put a half rest in the first spot bar", () => {
  const abc = landingABC(getKey("F"), "concert", "bo-billies", "bass", 0, { showCues: true });
  const measures = abc.split("|");
  const firstSpot = measures.find((measure) => measure.includes("HERE")) ?? "";
  assert.match(firstSpot, /F7/);
  assert.equal(/z4/.test(firstSpot), false, firstSpot);
  assert.equal(/z2/.test(firstSpot), false, firstSpot);
  assert.match(firstSpot, /F,2/);
  const ready = measures.find((measure) => measure.includes("Get ready")) ?? "";
  assert.match(ready, /z4z2zC,/);
  const empty = measures.find((measure) => measure.includes("B♭7") && !measure.includes("HERE") && !measure.includes("Get ready")) ?? "";
  assert.match(empty, /z8/);
  assert.doesNotMatch(empty, /z2z2z2z2/);
});

test("tune-page and Your-tunes copy names the first spot instead of eight bars", () => {
  const idle = { playing: false, paused: false };
  const st = createSession({ lessonId: "tune-st-thomas", startKeyId: "C" });
  assert.equal(sessionPrimaryAction(st, idle).label, "Hear the tune");
  assert.equal(sessionCue(st), "First spot: bar 2, Guide tone sequence on Em7.");
  const yours = createSession({ lessonId: "tune-st-thomas-gts", startKeyId: "C" });
  assert.equal(sessionPrimaryAction(yours, idle).label, "Hear it in St. Thomas");
  assert.equal(sessionCue(yours), "First spot: bar 2, Guide tone sequence on Em7.");
  const eight = createSession({ lessonId: "integrate-minor-home", startKeyId: "G" });
  assert.equal(sessionPrimaryAction(eight, idle).label, "Hear the eight bars");
  assert.match(sessionCue(eight), /Hear the phrase land in bar 7 on Gm6/);
  const billies = createSession({ lessonId: "bo-integrate-billies", startKeyId: "F" });
  assert.equal(sessionPrimaryAction(billies, idle).label, "Hear the twelve bars");
});

test("tempo is remembered per tune across lick and play-through lessons", () => {
  let prefs = persistLessonTempo(defaultPrefs(), "tune-four-cmar", 120);
  prefs = normalizePrefs(prefs);
  assert.equal(prefs.lessons["tune-four-cmar"].tempo, 120);
  assert.equal(prefs.lessons["tune-four"].tempo, 120);
  assert.equal(prefs.lessons["tune-four-bo"].tempo, 120);
  assert.equal(prefs.lessons["tune-st-thomas"].tempo, 96);
});

test("existing mastery lesson ids are unchanged", () => {
  const ids = LESSONS.map((lesson) => lesson.id);
  for (const id of [
    "learn-lick",
    "integrate-minor-home",
    "integrate-altered-dominant",
    "emr-learn",
    "gts-learn",
    "bo-learn",
    "hsr-learn",
    "bo-integrate-billies",
  ]) {
    assert.ok(ids.includes(id), id);
  }
  assert.ok(phraseSpanBars("bo-billies").includes(1));
});
