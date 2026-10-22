import test from "node:test";
import assert from "node:assert/strict";
import {
  PASS_THRESHOLD,
  expectedNotesFor,
  gradePerformance,
  gradeSession,
  synthTrack,
  centsBetween,
} from "./grade.js";
import { createSession, jumpToCard, currentKeyId, skipResult, wrapupCopy } from "./session.js";
import {
  emptyMastery,
  medalForCount,
  displayMedal,
  recordQuizPass,
  isKeyMastered,
  lessonPassedCount,
  normalizeMastery,
} from "./medals.js";
import { micCopy } from "./pitch.js";

function learnQuiz() {
  return jumpToCard(createSession({ lessonId: "learn-lick", startKeyId: "G" }), "quiz");
}

test("correct synthetic track passes around the 80% threshold", () => {
  const session = learnQuiz();
  const expected = expectedNotesFor(session);
  assert.equal(expected.length, 6);
  assert.equal(expected[0].startBeat, 0);
  const result = gradePerformance({
    expected,
    observations: synthTrack(expected),
    tempo: 96,
  });
  assert.equal(result.passed, true);
  assert.equal(result.percent, 100);
  assert.equal(result.correction, null);
});

test("a little flat within 50 cents still passes; 80 cents fails as flat", () => {
  const expected = expectedNotesFor(learnQuiz());
  const close = gradePerformance({
    expected,
    observations: synthTrack(expected, { cents: -40 }),
    tempo: 96,
  });
  assert.equal(close.passed, true);
  const wide = gradePerformance({
    expected,
    observations: synthTrack(expected, { cents: -80 }),
    tempo: 96,
  });
  assert.equal(wide.passed, false);
  assert.match(wide.correction, /flat/i);
  assert.ok(Math.abs(centsBetween(220 * 2 ** (-80 / 1200), 57)) > 50);
});

test("late onsets fail timing while the pitch can still be correct", () => {
  const expected = expectedNotesFor(learnQuiz());
  const late = gradePerformance({
    expected,
    observations: synthTrack(expected, { delayBeats: 0.9 }),
    tempo: 96,
  });
  assert.equal(late.passed, false);
  assert.match(late.correction, /late/i);
});

test("wrong octave is flagged but does not fail the note", () => {
  const expected = expectedNotesFor(learnQuiz());
  const result = gradePerformance({
    expected,
    observations: synthTrack(expected, { octave: 1 }),
    tempo: 96,
  });
  assert.equal(result.passed, true);
  assert.ok(result.notes.every((note) => note.octaveError && note.passed));
  assert.match(result.correction, /wrong octave/i);
});

test("silence fails every note", () => {
  const expected = expectedNotesFor(learnQuiz());
  const result = gradePerformance({
    expected,
    observations: synthTrack(expected, { silence: true }),
    tempo: 96,
  });
  assert.equal(result.passed, false);
  assert.equal(result.percent, 0);
  assert.match(result.correction, /didn't speak/i);
});

test("five of six notes is a pass; four of six is not", () => {
  const expected = expectedNotesFor(learnQuiz());
  const almost = synthTrack(expected.slice(0, 5));
  const pass = gradePerformance({ expected, observations: almost, tempo: 96 });
  assert.equal(pass.passedCount, 5);
  assert.equal(pass.passed, 5 / 6 >= PASS_THRESHOLD);
  const short = gradePerformance({
    expected,
    observations: synthTrack(expected.slice(0, 4)),
    tempo: 96,
  });
  assert.equal(short.passed, false);
});

test("integration quiz grades the cell at the door, not beat 0", () => {
  const session = jumpToCard(createSession({
    lessonId: "integrate-minor-home",
    startKeyId: "G",
  }), "quiz");
  const expected = expectedNotesFor(session);
  assert.equal(expected[0].bar, 7);
  assert.ok(expected[0].startBeat >= 24);
  const result = gradeSession(session, synthTrack(expected));
  assert.equal(result.passed, true);
  assert.equal(result.cardId, "quiz");
});

test("Learn cards are not graded", () => {
  const session = createSession({ lessonId: "learn-lick" });
  const result = gradeSession(session, []);
  assert.equal(result.graded, false);
  assert.equal(result.outcome, "completed");
});

test("Listen Your-turn take is graded like Play against the current octave", () => {
  const echo = { ...jumpToCard(createSession({ lessonId: "learn-lick", melodyRegister: 1 }), "listen"), listenStage: "echo" };
  const expected = expectedNotesFor(echo);
  assert.equal(expected[0].midi, expectedNotesFor(jumpToCard(createSession({ lessonId: "learn-lick" }), "play"))[0].midi + 12);
  const result = gradeSession(echo, synthTrack(expected));
  assert.equal(result.graded, true);
  assert.equal(result.passed, true);
  assert.equal(result.percent, 100);
  assert.equal(result.cardId, "listen");
});

test("skipping a graded card is Skipped and never a pass", () => {
  const play = jumpToCard(createSession({ lessonId: "learn-lick" }), "play");
  const skipped = skipResult(play);
  assert.equal(skipped.outcome, "skipped");
  assert.equal(skipped.passed, false);
  assert.equal(skipped.graded, false);
  const copy = wrapupCopy({
    ...play,
    screen: "wrapup",
    cardResults: [
      { cardId: "learn", outcome: "completed" },
      { cardId: "play", ...skipped },
      { cardId: "listen", ...skipResult({ ...play, cards: ["listen"], cardIndex: 0 }) },
      { cardId: "quiz", outcome: "missed", graded: true, passed: false, percent: 0, correction: "1st note didn't speak" },
    ],
  });
  assert.equal(copy.results[1].summary, "Skipped");
  assert.equal(copy.results[1].passed, false);
  assert.equal(copy.results[3].summary, "0% · miss · 1st note didn't speak");
});

test("medal thresholds are bronze 1, silver 6, gold 12", () => {
  assert.equal(medalForCount(0), "none");
  assert.equal(medalForCount(1), "bronze");
  assert.equal(medalForCount(5), "bronze");
  assert.equal(medalForCount(6), "silver");
  assert.equal(medalForCount(11), "silver");
  assert.equal(medalForCount(12), "gold");
  assert.equal(displayMedal("bronze"), "Bronze");
  assert.equal(displayMedal("none"), "No medal");
});

test("a key is mastered only after Learn-the-lick quiz and one integration quiz", () => {
  let mastery = emptyMastery();
  mastery = recordQuizPass(mastery, "learn-lick", "G");
  assert.equal(isKeyMastered(mastery, "G"), false);
  assert.equal(mastery.medal, "none");
  mastery = recordQuizPass(mastery, "integrate-minor-home", "G");
  assert.equal(isKeyMastered(mastery, "G"), true);
  assert.equal(mastery.medal, "bronze");
  assert.equal(mastery.upgraded, true);
  const again = recordQuizPass(mastery, "integrate-altered-dominant", "G");
  assert.equal(again.masteredKeys.length, 1);
  assert.equal(again.medal, "bronze");
});

test("mastery is monotonic across keys and ignores later misses", () => {
  let mastery = emptyMastery();
  const keys = ["G", "C", "F", "Bb", "Eb", "Ab"];
  for (const key of keys) {
    mastery = recordQuizPass(mastery, "learn-lick", key);
    mastery = recordQuizPass(mastery, "integrate-altered-dominant", key);
  }
  assert.equal(mastery.medal, "silver");
  assert.equal(mastery.masteredKeys.length, 6);
  const frozen = normalizeMastery(mastery);
  assert.equal(frozen.medal, "silver");
  assert.equal(lessonPassedCount(frozen, "learn-lick"), 6);
  assert.equal(currentKeyId(learnQuiz()), "G");
});

test("twelve mastered keys are gold and later passes do not demote", () => {
  let mastery = emptyMastery();
  for (const key of ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]) {
    mastery = recordQuizPass(mastery, "learn-lick", key);
    mastery = recordQuizPass(mastery, "integrate-minor-home", key);
  }
  assert.equal(mastery.medal, "gold");
  assert.equal(mastery.masteredKeys.length, 12);
  const again = recordQuizPass(mastery, "integrate-altered-dominant", "C");
  assert.equal(again.medal, "gold");
  assert.equal(again.upgraded, false);
});

test("wrap-up copy surfaces score, pass, and the one correction", () => {
  const session = {
    ...learnQuiz(),
    screen: "wrapup",
    cardResults: [
      { cardId: "learn", outcome: "completed" },
      { cardId: "play", outcome: "missed", graded: true, passed: false, percent: 50, correction: "Bar 1 · 3rd note a little flat" },
      { cardId: "listen", outcome: "passed", graded: true, passed: true, percent: 83 },
      { cardId: "quiz", outcome: "passed", graded: true, passed: true, percent: 100 },
    ],
  };
  const copy = wrapupCopy(session);
  assert.equal(copy.results[1].percent, 50);
  assert.equal(copy.results[1].correction, "Bar 1 · 3rd note a little flat");
  assert.equal(copy.results[1].summary, "50% · miss · Bar 1 · 3rd note a little flat");
  assert.equal(copy.results[2].summary, "83% · pass");
  assert.equal(copy.results[3].passed, true);
});

test("mic copy covers denied, no-signal, and listening", () => {
  assert.match(micCopy("denied"), /blocked/i);
  assert.match(micCopy("no-signal"), /no signal/i);
  assert.match(micCopy("listening"), /listening/i);
  assert.match(micCopy("unsupported"), /ipad safari/i);
});
