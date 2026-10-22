import test from "node:test";
import assert from "node:assert/strict";
import { getKey, scheduleChorus } from "./music.js";
import { leaksTargetBar } from "./lesson.js";
import {
  LESSONS,
  TWELVE_KEY_IDS,
  buildKeyQueue,
  nextLapQueue,
  cardsFor,
  createSession,
  completeCard,
  handlePlaybackEnded,
  skipCard,
  repeatKey,
  advanceKey,
  hasNextKey,
  currentCard,
  currentKeyId,
  keyOrdinal,
  jumpToCard,
  jumpToWrapup,
  recommendedLessonId,
  normalizePrefs,
  defaultPrefs,
  markLessonStarted,
  persistLessonMelodyRegister,
  setMelodyRegister,
  shouldGradeNow,
  skipResult,
  cardResultLabel,
  practiceStateFor,
  sessionPresentation,
  sessionAudioConfig,
  sessionCue,
  wrapupCopy,
  listenStateCopy,
  chromaticOrder,
  fourthsOrder,
} from "./session.js";

function rngFrom(values) {
  let i = 0;
  return () => {
    const value = values[i] ?? 0.42;
    i += 1;
    return value;
  };
}

test("chromatic cycle from G visits twelve unique keys then wraps", () => {
  const queue = buildKeyQueue("chromatic", "G");
  assert.equal(queue[0], "G");
  assert.equal(queue.length, 12);
  assert.equal(new Set(queue).size, 12);
  assert.deepEqual(queue, ["G", "Ab", "A", "Bb", "B", "C", "Db", "D", "Eb", "E", "F", "Gb"]);
  assert.deepEqual(nextLapQueue("chromatic", queue), queue);
  assert.deepEqual(buildKeyQueue("chromatic", "C"), chromaticOrder());
});

test("fourths cycle from G is the circle of fourths", () => {
  const queue = buildKeyQueue("fourths", "G");
  assert.equal(queue[0], "G");
  assert.equal(new Set(queue).size, 12);
  assert.deepEqual(queue, ["G", "C", "F", "Bb", "Eb", "Ab", "Db", "Gb", "B", "E", "A", "D"]);
  assert.equal(fourthsOrder()[0], "C");
  assert.equal(getKey(queue[1]).pc, (getKey("G").pc + 5) % 12);
});

test("random cycle has no repeats in a lap and reshuffles the next lap", () => {
  const rng = rngFrom([0.9, 0.05, 0.7, 0.2, 0.55, 0.11, 0.8, 0.33, 0.01, 0.6, 0.4, 0.95, 0.15]);
  const lap1 = buildKeyQueue("random", "G", rng);
  assert.equal(lap1[0], "G");
  assert.equal(lap1.length, 12);
  assert.equal(new Set(lap1).size, 12);
  const lap2 = nextLapQueue("random", lap1, rng);
  assert.equal(lap2.length, 12);
  assert.equal(new Set(lap2).size, 12);
  assert.notEqual(lap2[0], lap1[lap1.length - 1]);
  assert.notDeepEqual(lap2, lap1);
});

test("one key cycle is a single starting key", () => {
  const queue = buildKeyQueue("one", "F");
  assert.deepEqual(queue, ["F"]);
  assert.deepEqual(nextLapQueue("one", queue), ["F"]);
});

test("card sets are all four cards or Listen + Quiz only", () => {
  assert.deepEqual(cardsFor("all"), ["learn", "play", "listen", "quiz"]);
  assert.deepEqual(cardsFor("listen-quiz"), ["listen", "quiz"]);
});

test("completing cards advances, then wrap-up after the last card of a key", () => {
  let session = createSession({ lessonId: "learn-lick", keyMode: "fourths", startKeyId: "G" });
  assert.equal(session.screen, "session");
  assert.equal(currentCard(session), "learn");
  assert.equal(currentKeyId(session), "G");
  assert.deepEqual(keyOrdinal(session), { index: 1, total: 12 });

  session = completeCard(session);
  assert.equal(currentCard(session), "play");
  session = completeCard(session);
  assert.equal(currentCard(session), "listen");
  session = completeCard(session);
  assert.equal(currentCard(session), "quiz");
  session = completeCard(session);
  assert.equal(session.screen, "wrapup");
  assert.equal(session.cardResults.length, 4);
  assert.ok(session.cardResults.every((row) => row.outcome === "completed"));
});

test("Listen + Quiz sessions skip Learn and Play", () => {
  let session = createSession({
    lessonId: "integrate-minor-home",
    cardSet: "listen-quiz",
    keyMode: "one",
  });
  assert.deepEqual(session.cards, ["listen", "quiz"]);
  session = completeCard(session);
  assert.equal(currentCard(session), "quiz");
  session = completeCard(session);
  assert.equal(session.screen, "wrapup");
  assert.deepEqual(session.cardResults.map((row) => row.cardId), ["listen", "quiz"]);
});

test("listen playback ending starts the echo stage, then completes the card", () => {
  let session = jumpToCard(createSession({ lessonId: "learn-lick" }), "listen");
  const afterHear = handlePlaybackEnded(session);
  assert.equal(afterHear.session.listenStage, "echo");
  assert.equal(afterHear.autoStart, true);
  assert.equal(currentCard(afterHear.session), "listen");
  const afterEcho = handlePlaybackEnded(afterHear.session);
  assert.equal(afterEcho.autoStart, false);
  assert.equal(currentCard(afterEcho.session), "quiz");
  assert.equal(afterEcho.session.listenStage, "hear");
});

test("skipping a card still auto-advances without requiring playback", () => {
  let session = createSession({ lessonId: "learn-lick" });
  session = skipCard(session);
  assert.equal(currentCard(session), "play");
  assert.equal(session.cardResults[0].outcome, "completed");
  session = skipCard(session);
  assert.equal(currentCard(session), "listen");
  assert.equal(session.cardResults.find((row) => row.cardId === "play")?.outcome, "skipped");
  assert.equal(session.cardResults.find((row) => row.cardId === "play")?.passed, false);
});

test("wrap-up Next key walks the cycle; Again repeats the same key; one-key has no next", () => {
  let session = jumpToWrapup(createSession({
    lessonId: "integrate-minor-home",
    keyMode: "chromatic",
    startKeyId: "G",
  }));
  assert.equal(hasNextKey(session), true);
  const next = advanceKey(session);
  assert.equal(next.screen, "session");
  assert.equal(currentKeyId(next), "Ab");
  assert.equal(currentCard(next), "learn");
  assert.deepEqual(keyOrdinal(next), { index: 2, total: 12 });

  const again = repeatKey(session);
  assert.equal(currentKeyId(again), "G");
  assert.equal(currentCard(again), "learn");
  assert.equal(again.cardResults.length, 0);

  const one = createSession({ keyMode: "one", startKeyId: "D" });
  assert.equal(hasNextKey(one), false);
  assert.equal(currentKeyId(advanceKey(one)), "D");
});

test("finishing a twelve-key lap starts a new lap", () => {
  let session = createSession({ keyMode: "fourths", startKeyId: "G" });
  session = { ...session, keyIndex: 11, screen: "wrapup" };
  assert.equal(currentKeyId(session), "D");
  const next = advanceKey(session);
  assert.equal(next.lap, 2);
  assert.equal(next.keyIndex, 0);
  assert.equal(currentKeyId(next), "G");
});

test("per-lesson preferences stay independent and recommended lesson is the first unstarted", () => {
  let prefs = defaultPrefs();
  assert.equal(recommendedLessonId(prefs), "learn-lick");
  prefs.lessons["integrate-minor-home"].keyMode = "fourths";
  prefs.lessons["integrate-minor-home"].startKeyId = "F";
  prefs.lessons["integrate-minor-home"].cardSet = "listen-quiz";
  prefs.lessons["learn-lick"].tempo = 80;
  const normalized = normalizePrefs(prefs);
  assert.equal(normalized.lessons["learn-lick"].tempo, 80);
  assert.equal(normalized.lessons["integrate-minor-home"].keyMode, "fourths");
  assert.equal(normalized.lessons["integrate-minor-home"].startKeyId, "F");
  assert.equal(normalized.lessons["integrate-altered-dominant"].keyMode, "one");
  prefs = markLessonStarted(normalized, "learn-lick", "G");
  assert.equal(recommendedLessonId(prefs), "integrate-minor-home");
  prefs = markLessonStarted(prefs, "integrate-minor-home", "F");
  prefs = markLessonStarted(prefs, "integrate-altered-dominant", "G");
  assert.equal(recommendedLessonId(prefs), "learn-lick");
});

test("learn-the-lick cards use isolated cell audio; integration cards use the eight-bar form", () => {
  const learn = createSession({ lessonId: "learn-lick" });
  const learnState = practiceStateFor(learn);
  assert.equal(learnState.goal, "learn");
  assert.equal(sessionAudioConfig(learn).lengthBeats, 8);
  assert.equal(sessionAudioConfig(learn).includeModel, true);

  const play = jumpToCard(learn, "play");
  assert.equal(practiceStateFor(play).cellMode, "echo");
  assert.equal(sessionAudioConfig(play).includeModel, false);

  const integrate = createSession({ lessonId: "integrate-minor-home" });
  assert.equal(practiceStateFor(integrate).goal, "integrate");
  assert.equal(sessionAudioConfig(integrate).lengthBeats, 32);
  const integratePlay = jumpToCard(integrate, "play");
  assert.equal(practiceStateFor(integratePlay).support, "help");
  const playView = sessionPresentation(integratePlay);
  assert.equal(playView.showLandingNotation, true);
  assert.equal(playView.showSlashNotation, true);
  assert.equal(playView.showEntranceCues, true);
  assert.equal(playView.showModelNotation, false);
  const events = scheduleChorus(sessionAudioConfig(integratePlay));
  assert.equal(events.filter((event) => event.type === "melody").length, 0);
  assert.ok(events.some((event) => event.type === "cue"));
});

test("listen and quiz hide lick notation; quiz does not leak the door in idle copy", () => {
  const learnListen = jumpToCard(createSession({ lessonId: "learn-lick" }), "listen");
  const learnView = sessionPresentation(learnListen);
  assert.equal(learnView.hideStaff, true);
  assert.equal(learnView.showPhraseNotation, false);
  assert.equal(learnView.showModelNotation, false);

  const integrateListen = jumpToCard(createSession({ lessonId: "integrate-altered-dominant" }), "listen");
  const integrateView = sessionPresentation(integrateListen);
  assert.equal(integrateView.hideStaff, false);
  assert.equal(integrateView.showSlashNotation, true);
  assert.equal(integrateView.showModelNotation, false);
  assert.equal(integrateView.showEntranceCues, false);
  assert.equal(sessionAudioConfig(integrateListen).includeModel, true);

  const quiz = jumpToCard(createSession({ lessonId: "integrate-minor-home" }), "quiz");
  const quizView = sessionPresentation(quiz);
  assert.equal(quizView.showEntranceCues, false);
  assert.equal(quizView.showModelNotation, false);
  assert.equal(quizView.showLandingNotation, false);
  assert.equal(sessionAudioConfig(quiz).includeModel, false);
  const cue = sessionCue(quiz);
  assert.equal(leaksTargetBar(cue), false);
  assert.doesNotMatch(cue, /Gm6|bar 7/i);
});

test("wrap-up lists per-card completion and names the next key", () => {
  const session = jumpToWrapup(createSession({
    lessonId: "learn-lick",
    keyMode: "fourths",
    startKeyId: "G",
  }));
  const copy = wrapupCopy(session);
  assert.equal(copy.results.length, 4);
  assert.equal(copy.heading, "G minor");
  assert.equal(copy.kicker, "Key complete");
  assert.equal(copy.detail, "Learn the lick");
  assert.equal(copy.nextKeyName, "C minor");
  assert.equal(copy.nextKeyLabel, "Next key · C minor");
  const one = wrapupCopy(jumpToWrapup(createSession({ keyMode: "one" })));
  assert.equal(one.nextKeyName, null);
  assert.equal(one.nextKeyLabel, null);
});

test("Listen and Quiz expose a listening-state copy for the feedback area", () => {
  const listen = jumpToCard(createSession({ lessonId: "learn-lick" }), "listen");
  const hear = listenStateCopy(listen);
  assert.equal(hear.kicker, "Listening");
  const echo = listenStateCopy({ ...listen, listenStage: "echo" });
  assert.equal(echo.kicker, "Your turn");
  const quiz = listenStateCopy(jumpToCard(createSession({ lessonId: "learn-lick" }), "quiz"));
  assert.equal(quiz.kicker, "Quiz");
  assert.equal(listenStateCopy(createSession({ lessonId: "learn-lick" })), null);
});

test("lessons stay unlocked and the module has three paths", () => {
  assert.deepEqual(LESSONS.map((lesson) => lesson.id), [
    "learn-lick",
    "integrate-minor-home",
    "integrate-altered-dominant",
  ]);
  assert.equal(TWELVE_KEY_IDS.length, 12);
});

test("melody octave is remembered per lesson and applied on the session", () => {
  let prefs = defaultPrefs();
  assert.equal(prefs.lessons["learn-lick"].melodyRegister, 0);
  prefs = persistLessonMelodyRegister(prefs, "learn-lick", -1);
  prefs = persistLessonMelodyRegister(prefs, "integrate-minor-home", 1);
  const stored = normalizePrefs(prefs);
  assert.equal(stored.lessons["learn-lick"].melodyRegister, -1);
  assert.equal(stored.lessons["integrate-minor-home"].melodyRegister, 1);
  assert.equal(stored.lessons["integrate-altered-dominant"].melodyRegister, 0);
  const session = setMelodyRegister(createSession({
    lessonId: "learn-lick",
    melodyRegister: stored.lessons["learn-lick"].melodyRegister,
  }), 1);
  assert.equal(session.melodyRegister, 1);
  assert.equal(persistLessonMelodyRegister(stored, "learn-lick", 2).lessons["learn-lick"].melodyRegister, 0);
});

test("Listen is graded on the Your-turn take, not while hearing the model", () => {
  const hear = jumpToCard(createSession({ lessonId: "learn-lick" }), "listen");
  assert.equal(shouldGradeNow(hear), false);
  assert.equal(shouldGradeNow(hear, { hasTake: true }), true);
  const echo = { ...hear, listenStage: "echo" };
  assert.equal(shouldGradeNow(echo), true);
  assert.equal(shouldGradeNow(createSession({ lessonId: "learn-lick" })), false);
  assert.equal(shouldGradeNow(jumpToCard(createSession({ lessonId: "learn-lick" }), "play")), true);
});

test("a graded card with no take is Skipped and is not a pass", () => {
  const play = jumpToCard(createSession({ lessonId: "learn-lick" }), "play");
  assert.deepEqual(skipResult(play), { outcome: "skipped", graded: false, passed: false });
  assert.equal(cardResultLabel(skipResult(play)), "Skipped");
  const wrapped = wrapupCopy({
    ...jumpToWrapup(play),
    cardResults: [
      { cardId: "learn", outcome: "completed" },
      { cardId: "play", outcome: "skipped", graded: false, passed: false },
      { cardId: "listen", outcome: "skipped", graded: false, passed: false },
      { cardId: "quiz", outcome: "skipped", graded: false, passed: false },
    ],
  });
  assert.equal(wrapped.results.find((row) => row.cardId === "play")?.summary, "Skipped");
  assert.equal(wrapped.results.find((row) => row.cardId === "learn")?.summary, "Completed");
  assert.equal(cardResultLabel({ graded: true, passed: false, percent: 0, correction: "1st note didn't speak", outcome: "missed" }), "0% · miss · 1st note didn't speak");
});
