import test from "node:test";
import assert from "node:assert/strict";
import {
  createSession,
  currentKeyId,
  defaultPrefs,
  handlePlaybackEnded,
  moduleStudyMode,
  normalizePrefs,
  sessionPresentation,
  setModuleStudyMode,
  setSessionStudyMode,
  TWELVE_KEY_IDS,
} from "./session.js";
import {
  emptyMastery,
  isKeyMastered,
  lessonLearnedKeys,
  lessonPassedKeys,
  moduleRingMarks,
  recordLearnPass,
  recordQuizPass,
} from "./medals.js";
import { MODULES } from "./registry.js";

test("Learn and Practice are remembered separately for each module", () => {
  let prefs = defaultPrefs();
  assert.equal(moduleStudyMode(prefs, MODULES[0].id), "learn");
  prefs = setModuleStudyMode(prefs, MODULES[0].id, "practice");
  prefs = setModuleStudyMode(prefs, MODULES[1].id, "learn");
  const stored = normalizePrefs(JSON.parse(JSON.stringify(prefs)));
  assert.equal(moduleStudyMode(stored, MODULES[0].id), "practice");
  assert.equal(moduleStudyMode(stored, MODULES[1].id), "learn");
  assert.equal(moduleStudyMode(stored, MODULES[2].id), "learn");
});

test("one card auto-advances across all 12 keys, then wraps up", () => {
  let session = createSession({
    lessonId: "learn-lick",
    keyMode: "fourths",
    startKeyId: "G",
    studyMode: "practice",
  });
  assert.deepEqual(session.cards, ["play"]);
  const seen = [];
  for (let step = 0; step < 12; step += 1) {
    assert.equal(session.screen, "session");
    seen.push(currentKeyId(session));
    const next = handlePlaybackEnded(session, { graded: true, passed: true, outcome: "passed" });
    session = next.session;
    if (step < 11) {
      assert.equal(next.autoStart, true);
      assert.equal(session.screen, "session");
      assert.equal(session.keyIndex, step + 1);
    }
  }
  assert.equal(session.screen, "wrapup");
  assert.equal(new Set(seen).size, 12);
  assert.deepEqual(seen.slice().sort(), TWELVE_KEY_IDS.slice().sort());
});

test("switching mode mid-session keeps the key", () => {
  const session = createSession({
    lessonId: "integrate-minor-home",
    keyMode: "chromatic",
    startKeyId: "G",
    studyMode: "learn",
  });
  const moved = { ...session, keyIndex: 3 };
  const next = setSessionStudyMode(moved, "practice");
  assert.equal(next.studyMode, "practice");
  assert.equal(currentKeyId(next), currentKeyId(moved));
  assert.equal(next.keyIndex, 3);
});

test("Practice hides notation and keeps chord symbols", () => {
  const learn = createSession({ lessonId: "learn-lick", studyMode: "learn" });
  const practice = createSession({ lessonId: "learn-lick", studyMode: "practice" });
  const tune = createSession({ lessonId: "integrate-minor-home", studyMode: "practice" });
  const learnView = sessionPresentation(learn);
  const practiceView = sessionPresentation(practice);
  const tuneView = sessionPresentation(tune);
  assert.equal(learnView.showPhraseNotation, true);
  assert.equal(learnView.showChordsOnly, false);
  assert.equal(learnView.hideMelody, undefined);
  assert.equal(practiceView.showChordsOnly, true);
  assert.equal(practiceView.hideMelody, true);
  assert.equal(practiceView.showPhraseNotation, false);
  assert.equal(practiceView.hideStaff, false);
  assert.equal(tuneView.showChordsOnly, true);
  assert.equal(tuneView.showLandingNotation, false);
});

test("only Practice passes count toward 12-key mastery", () => {
  let mastery = emptyMastery();
  mastery = recordLearnPass(mastery, "learn-lick", "G");
  mastery = recordLearnPass(mastery, "integrate-minor-home", "G");
  assert.equal(isKeyMastered(mastery, "G", "cmar"), false);
  assert.deepEqual(lessonLearnedKeys(mastery, "learn-lick"), ["G"]);
  assert.deepEqual(lessonPassedKeys(mastery, "learn-lick"), []);
  const marks = moduleRingMarks(mastery, "cmar");
  assert.equal(marks.find((mark) => mark.id === "G").mark, "outline");
  mastery = recordQuizPass(mastery, "learn-lick", "G");
  mastery = recordQuizPass(mastery, "integrate-minor-home", "G");
  assert.equal(isKeyMastered(mastery, "G", "cmar"), true);
  assert.equal(moduleRingMarks(mastery, "cmar").find((mark) => mark.id === "G").mark, "filled");
});
