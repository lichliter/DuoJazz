import test from "node:test";
import assert from "node:assert/strict";
import { getKey, scheduleChorus } from "./music.js";
import { leaksTargetBar } from "./lesson.js";
import { PATH_SLOT_PCTS } from "./path-trail.js";
import {
  LESSONS,
  MODULES,
  PATH_ALIGNS,
  modulePathNodes,
  TWELVE_KEY_IDS,
  lessonPathNode,
  lessonPathNodes,
  lessonSleeve,
  vinylTier,
  sleeveCaption,
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
  canGoBack,
  canGoNext,
  goBack,
  goNext,
  resultForCard,
  leaveCardOutcome,
  skipRemainingCards,
  quickViewData,
  resolveQuickViewJump,
  cardCounter,
  settingsSummary,
  sessionProgress,
  cardLabel,
  cardKicker,
  sessionPrimaryAction,
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
  assert.deepEqual(cardsFor("all", "integrate-minor-home"), ["learn", "play", "listen", "quiz"]);
  assert.deepEqual(cardsFor("listen-quiz", "integrate-minor-home"), ["listen", "quiz"]);
  assert.deepEqual(cardsFor("all", "learn-lick"), ["learn", "play", "quiz"]);
  assert.deepEqual(cardsFor("listen-quiz", "learn-lick"), ["learn", "play", "quiz"]);
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
  assert.equal(currentCard(session), "quiz");
  session = completeCard(session);
  assert.equal(session.screen, "wrapup");
  assert.equal(session.cardResults.length, 3);
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
  let session = jumpToCard(createSession({ lessonId: "integrate-minor-home" }), "listen");
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
  assert.equal(currentCard(session), "quiz");
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

test("per-lesson preferences stay independent", () => {
  const prefs = defaultPrefs();
  prefs.lessons["integrate-minor-home"].keyMode = "fourths";
  prefs.lessons["integrate-minor-home"].startKeyId = "F";
  prefs.lessons["integrate-minor-home"].cardSet = "listen-quiz";
  prefs.lessons["learn-lick"].tempo = 80;
  const normalized = normalizePrefs(prefs);
  assert.equal(normalized.lessons["learn-lick"].tempo, 80);
  assert.equal(normalized.lessons["integrate-minor-home"].keyMode, "fourths");
  assert.equal(normalized.lessons["integrate-minor-home"].startKeyId, "F");
  assert.equal(normalized.lessons["integrate-altered-dominant"].keyMode, "one");
  const started = markLessonStarted(normalized, "learn-lick", "G");
  assert.equal(started.progress["learn-lick"].started, true);
});

test("recommended start is the first lesson not yet 12/12", () => {
  const none = {};
  assert.equal(recommendedLessonId(none), "learn-lick");
  assert.equal(recommendedLessonId({
    "learn-lick": [],
    "integrate-minor-home": [],
    "integrate-altered-dominant": [],
  }), "learn-lick");

  const firstComplete = {
    "learn-lick": TWELVE_KEY_IDS,
    "integrate-minor-home": TWELVE_KEY_IDS.slice(0, 7),
    "integrate-altered-dominant": TWELVE_KEY_IDS.slice(0, 3),
  };
  assert.equal(recommendedLessonId(firstComplete), "integrate-minor-home");

  const autumnComplete = {
    "learn-lick": TWELVE_KEY_IDS,
    "integrate-minor-home": TWELVE_KEY_IDS,
    "integrate-altered-dominant": TWELVE_KEY_IDS,
  };
  assert.equal(recommendedLessonId(autumnComplete), "cmar-integrate-blue-bossa");

  const cmarComplete = Object.fromEntries(MODULES[0].lessons.map((lesson) => [lesson.id, TWELVE_KEY_IDS]));
  assert.equal(recommendedLessonId(cmarComplete), "emr-learn");

  const allComplete = Object.fromEntries(LESSONS.map((lesson) => [lesson.id, TWELVE_KEY_IDS]));
  assert.equal(recommendedLessonId(allComplete), null);
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
  const learnMemory = jumpToCard(createSession({ lessonId: "learn-lick" }), "quiz");
  const learnView = sessionPresentation(learnMemory);
  assert.equal(learnView.hideStaff, false);
  assert.equal(learnView.showChordsOnly, true);
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
  assert.equal(copy.results.length, 3);
  assert.equal(copy.results[0].label, "Hear it");
  assert.equal(copy.results[2].label, "Play it from memory");
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
  const listen = jumpToCard(createSession({ lessonId: "integrate-minor-home" }), "listen");
  const hear = listenStateCopy(listen);
  assert.equal(hear.kicker, "Listening");
  const echo = listenStateCopy({ ...listen, listenStage: "echo" });
  assert.equal(echo.kicker, "Your turn");
  const quiz = listenStateCopy(jumpToCard(createSession({ lessonId: "integrate-minor-home" }), "quiz"));
  assert.equal(quiz.kicker, "Quiz");
  assert.equal(listenStateCopy(createSession({ lessonId: "learn-lick" })), null);
});

test("lessons stay unlocked and the module has 25 records", () => {
  assert.equal(MODULES.length, 30);
  assert.deepEqual(MODULES[0].lessons.map((lesson) => lesson.id), [
    "learn-lick",
    "integrate-minor-home",
    "integrate-altered-dominant",
    "cmar-integrate-blue-bossa",
    "cmar-integrate-fly-me",
    "cmar-integrate-summertime",
    "cmar-integrate-cry-me",
    "tune-four-cmar",
    "tune-autumn-leaves-cmar",
    "tune-so-what-cmar",
  ]);
  assert.deepEqual(MODULES.map((module) => module.lessons.length), [10, 8, 8, 10, 13]);
  assert.equal(LESSONS.filter((lesson) => lesson.group !== "your-tunes" && lesson.group !== "my-tunes").length, 25);
  assert.equal(LESSONS.length, 57);
  assert.equal(TWELVE_KEY_IDS.length, 12);
});

test("module home path zig-zags record sleeves and never locks a lesson", () => {
  assert.deepEqual(PATH_ALIGNS, ["left", "center", "right"]);
  assert.deepEqual(PATH_SLOT_PCTS, [28, 50, 72]);
  assert.deepEqual(MODULES[0].lessons.map((lesson) => lesson.sleeve), [
    "amber", "teal", "oxblood", "amber", "teal", "oxblood", "amber",
    "teal", "oxblood", "amber",
  ]);
  assert.deepEqual(LESSONS.map((lesson) => lesson.sleeve).slice(0, 3), ["amber", "teal", "oxblood"]);
  assert.equal(lessonSleeve("learn-lick"), "amber");
  assert.equal(lessonSleeve("integrate-minor-home"), "teal");
  assert.equal(lessonSleeve("integrate-altered-dominant"), "oxblood");
  assert.equal(LESSONS[1].context, "Autumn Leaves · bar 7");
  assert.equal(LESSONS[2].context, "Over D7 · bar 6");

  const nodes = modulePathNodes(MODULES[0], defaultPrefs(), {
    "learn-lick": ["G", "C", "F"],
    "integrate-minor-home": TWELVE_KEY_IDS,
  });
  assert.equal(nodes.length, 10);
  assert.deepEqual(nodes.map((node) => node.align), [
    "left", "center", "right", "left", "center", "right", "left",
    "center", "right", "left",
  ]);
  assert.equal(lessonPathNodes(defaultPrefs(), {}).length, 49);
  assert.equal(nodes[0].recommended, true);
  assert.equal(nodes[0].complete, false);
  assert.equal(nodes[0].passedCount, 3);
  assert.equal(nodes[0].vinylTier, "bronze");
  assert.equal(nodes[1].complete, true);
  assert.equal(nodes[1].passedCount, 12);
  assert.equal(nodes[1].vinylTier, "gold");
  assert.equal(nodes[1].recommended, false);
  assert.equal(nodes[2].vinylTier, "black");
  assert.equal(nodes[2].recommended, false);
  assert.equal(nodes.every((node) => LESSONS.some((lesson) => lesson.id === node.id)), true);

  const firstDone = modulePathNodes(MODULES[0], defaultPrefs(), {
    "learn-lick": TWELVE_KEY_IDS,
    "integrate-minor-home": TWELVE_KEY_IDS.slice(0, 7),
    "integrate-altered-dominant": TWELVE_KEY_IDS.slice(0, 3),
  });
  assert.equal(firstDone[0].recommended, false);
  assert.equal(firstDone[0].complete, true);
  assert.equal(firstDone[1].recommended, true);
  assert.equal(firstDone[1].passedCount, 7);
  assert.equal(firstDone[2].recommended, false);
  assert.equal(firstDone[2].passedCount, 3);

  const cmarKeys = Object.fromEntries(MODULES[0].lessons.map((lesson) => [lesson.id, TWELVE_KEY_IDS]));
  const allCmar = modulePathNodes(MODULES[0], defaultPrefs(), cmarKeys);
  assert.equal(allCmar.every((node) => node.complete === true), true);
  assert.equal(allCmar.every((node) => node.recommended === false), true);
  const across = lessonPathNodes(defaultPrefs(), cmarKeys);
  assert.equal(across.find((node) => node.recommended)?.id, "emr-learn");
});

test("vinyl tier follows keys-passed thresholds", () => {
  assert.equal(vinylTier(0), "black");
  assert.equal(vinylTier(1), "bronze");
  assert.equal(vinylTier(5), "bronze");
  assert.equal(vinylTier(6), "silver");
  assert.equal(vinylTier(11), "silver");
  assert.equal(vinylTier(12), "gold");
});

test("sleeve captions omit the key count at zero", () => {
  assert.equal(sleeveCaption("Autumn Leaves · bar 7", 0), "Autumn Leaves · bar 7");
  assert.equal(sleeveCaption("Autumn Leaves · bar 7", 4), "Autumn Leaves · bar 7 · 4/12 keys");
});

test("a single path node keeps cover copy and a 12-key passed list", () => {
  const node = lessonPathNode(LESSONS[0], 0, {
    recommendedId: "learn-lick",
    passedKeys: ["G", "G", "C"],
  });
  assert.equal(node.number, "01");
  assert.equal(node.coverTitle, "Learn the lick");
  assert.equal(node.sleeve, "amber");
  assert.equal(node.align, "left");
  assert.equal(node.recommended, true);
  assert.deepEqual(node.passedKeys, ["G", "C"]);
  assert.equal(node.passedCount, 2);
  assert.equal(node.vinylTier, "bronze");
  assert.equal(node.caption, "The cell in this key · 2/12 keys");
  const empty = lessonPathNode(LESSONS[1], 1, { passedKeys: [] });
  assert.equal(empty.vinylTier, "black");
  assert.equal(empty.caption, "Autumn Leaves · bar 7");
  const gold = lessonPathNode(LESSONS[1], 1, { passedKeys: TWELVE_KEY_IDS });
  assert.equal(gold.vinylTier, "gold");
  assert.equal(gold.caption, "Autumn Leaves · bar 7 · 12/12 keys");
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
  const hear = jumpToCard(createSession({ lessonId: "integrate-minor-home" }), "listen");
  assert.equal(shouldGradeNow(hear), false);
  assert.equal(shouldGradeNow(hear, { hasTake: true }), true);
  const echo = { ...hear, listenStage: "echo" };
  assert.equal(shouldGradeNow(echo), false);
  assert.equal(shouldGradeNow(echo, { hasTake: true }), true);
  assert.equal(shouldGradeNow(createSession({ lessonId: "learn-lick" })), false);
  const play = jumpToCard(createSession({ lessonId: "learn-lick" }), "play");
  assert.equal(shouldGradeNow(play), false);
  assert.equal(shouldGradeNow(play, { hasTake: true }), true);
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
      { cardId: "quiz", outcome: "skipped", graded: false, passed: false },
    ],
  });
  assert.equal(wrapped.results.find((row) => row.cardId === "play")?.summary, "Skipped");
  assert.equal(wrapped.results.find((row) => row.cardId === "learn")?.summary, "Completed");
  assert.equal(cardResultLabel({ graded: true, passed: false, percent: 0, correction: "1st note didn't speak", outcome: "missed" }), "0% · miss · 1st note didn't speak");
});

test("Back is disabled on card 1 and Next on the last card", () => {
  const first = createSession({ lessonId: "learn-lick" });
  assert.equal(canGoBack(first), false);
  assert.equal(canGoNext(first), true);
  assert.deepEqual(cardCounter(first), { index: 1, total: 3 });
  const backNoop = goBack(first);
  assert.equal(backNoop.moved, false);
  assert.equal(backNoop.session.cardIndex, 0);
  assert.equal(backNoop.stopAudio, false);

  const last = { ...first, cardIndex: 2 };
  assert.equal(currentCard(last), "quiz");
  assert.equal(canGoBack(last), true);
  assert.equal(canGoNext(last), false);
  const nextNoop = goNext(last);
  assert.equal(nextNoop.moved, false);
  assert.equal(nextNoop.session.cardIndex, 2);
  assert.equal(nextNoop.session.screen, "session");
});

test("leaving a graded card with no take marks it Skipped", () => {
  const play = jumpToCard(createSession({ lessonId: "learn-lick" }), "play");
  const moved = goNext(play, { hasTake: false });
  assert.equal(moved.moved, true);
  assert.equal(currentCard(moved.session), "quiz");
  assert.deepEqual(keyOrdinal(moved.session), { index: 1, total: 1 });
  assert.deepEqual(cardCounter(moved.session), { index: 3, total: 3 });
  const skipped = resultForCard(moved.session, "play");
  assert.equal(skipped.outcome, "skipped");
  assert.equal(skipped.passed, false);
  const learnLeave = leaveCardOutcome(createSession({ lessonId: "learn-lick" }), { hasTake: false });
  assert.equal(learnLeave.outcome, "completed");
});

test("going back shows the last result and a retake replaces the grade", () => {
  let session = jumpToCard(createSession({ lessonId: "learn-lick" }), "play");
  session = goNext(session, {
    hasTake: true,
    takeResult: { outcome: "passed", graded: true, passed: true, percent: 90 },
  }).session;
  assert.equal(resultForCard(session, "play").percent, 90);
  const back = goBack(session);
  assert.equal(back.moved, true);
  assert.equal(currentCard(back.session), "play");
  assert.equal(resultForCard(back.session, "play").percent, 90);
  session = goNext(back.session, {
    hasTake: true,
    takeResult: { outcome: "missed", graded: true, passed: false, percent: 40 },
  }).session;
  assert.equal(resultForCard(session, "play").percent, 40);
  assert.equal(resultForCard(session, "play").passed, false);
  const keep = goBack(session, { hasTake: false }).session;
  assert.equal(resultForCard(keep, "play").percent, 40);
});

test("moving cards stops audio, the count-in, and the mic", () => {
  const next = goNext(createSession({ lessonId: "learn-lick" }));
  assert.equal(next.moved, true);
  assert.equal(next.stopAudio, true);
  assert.equal(next.stopCountIn, true);
  assert.equal(next.stopMic, true);
  const back = goBack(next.session);
  assert.equal(back.stopAudio, true);
  assert.equal(back.stopCountIn, true);
  assert.equal(back.stopMic, true);
});

test("quick view lists every module and record", () => {
  const data = quickViewData({
    "learn-lick": ["G", "C"],
    "integrate-minor-home": TWELVE_KEY_IDS,
  }, { cmar: ["G"], emr: [] });
  assert.equal(data.length, 6);
  assert.deepEqual(data.map((module) => module.id), [...MODULES.map((module) => module.id), "tunes"]);
  assert.equal(data.flatMap((module) => module.records).length, LESSONS.length);
  assert.equal(data[0].lickName, "Cry Me a River");
  assert.equal(data[0].keysMastered, 1);
  assert.equal(data[0].records[0].id, "learn-lick");
  assert.equal(data[0].records[0].number, "01");
  assert.equal(data[0].records[0].title, "Learn the lick");
  assert.equal(data[0].records[0].context, "The cell in this key");
  assert.equal(data[0].records[0].keysPassed, 2);
  assert.equal(data[0].records[1].keysPassed, 12);
  assert.equal(data[1].lickName, "Embellished Minor Resolution");
  assert.equal(data[1].keysMastered, 0);
  assert.equal(data[2].records.some((record) => record.id === "gts-learn"), true);
});

test("quick view jump targets resolve to the right module or lesson id", () => {
  assert.deepEqual(resolveQuickViewJump("emr"), { type: "module", id: "emr", targetId: "emr" });
  assert.deepEqual(resolveQuickViewJump("cmar"), { type: "module", id: "cmar", targetId: "cmar" });
  assert.deepEqual(resolveQuickViewJump("gts-learn"), { type: "lesson", id: "gts-learn", moduleId: "gts" });
  assert.deepEqual(resolveQuickViewJump("learn-lick"), { type: "lesson", id: "learn-lick", moduleId: "cmar" });
  assert.deepEqual(resolveQuickViewJump("hsr-integrate-satin"), {
    type: "lesson",
    id: "hsr-integrate-satin",
    moduleId: "hsr",
  });
  assert.deepEqual(resolveQuickViewJump("tunes"), { type: "module", id: "tunes", targetId: "tunes" });
  assert.equal(resolveQuickViewJump("missing-id"), null);
});

test("abandoning a session marks unfinished graded cards Skipped", () => {
  let session = goNext(createSession({ lessonId: "learn-lick" }), { hasTake: false }).session;
  session = skipRemainingCards(session);
  assert.equal(resultForCard(session, "learn").outcome, "completed");
  assert.equal(resultForCard(session, "play").outcome, "skipped");
  assert.equal(resultForCard(session, "quiz").outcome, "skipped");
});

test("global settings summary and lesson-1 labels", () => {
  assert.equal(settingsSummary({ keyMode: "fourths", tempo: 140, swing: true }), "All 12 keys · 140 bpm · 1-bar count-in · Swing on");
  assert.equal(settingsSummary(defaultPrefs()), "Original key · 96 bpm · 1-bar count-in · Swing on");
  assert.equal(cardLabel("learn", "learn-lick"), "Hear it");
  assert.equal(cardKicker("quiz", "learn-lick"), "MEMORY");
  assert.equal(cardLabel("learn", "integrate-minor-home"), "Learn");
  const twelve = createSession({ lessonId: "learn-lick", keyMode: "fourths" });
  assert.deepEqual(sessionProgress(twelve), { index: 1, total: 36, ratio: 0 });
  const hear = createSession({ lessonId: "learn-lick" });
  assert.equal(sessionPrimaryAction(hear, {}).label, "Hear it");
  assert.equal(sessionPrimaryAction(hear, { playing: true }).id, "pause");
  assert.equal(sessionPrimaryAction(hear, { playing: true }).label, "Hear it");
  assert.equal(sessionPrimaryAction(jumpToCard(hear, "play"), {}).label, "Count me in");
  const shifted = setMelodyRegister(createSession({
    lessonId: "learn-lick",
    keyMode: "fourths",
    startKeyId: "G",
  }), 1);
  const nextKey = advanceKey(jumpToWrapup(shifted));
  assert.equal(nextKey.melodyRegister, 1);
  assert.equal(currentKeyId(nextKey), "C");
});

test("timemap sounding ids cover on/off by qstamp", async () => {
  const { soundingIdsAt } = await import("./engrave.js");
  const map = [
    { qstamp: 0, on: ["n1"], off: [] },
    { qstamp: 1, on: ["n2"], off: ["n1"] },
    { qstamp: 4, on: [], off: ["n2"] },
  ];
  assert.deepEqual(soundingIdsAt(map, 0), ["n1"]);
  assert.deepEqual(soundingIdsAt(map, 1.5), ["n2"]);
  assert.deepEqual(soundingIdsAt(map, 4), []);
  assert.deepEqual(soundingIdsAt(map, -1), []);
});
