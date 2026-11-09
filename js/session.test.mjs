import test from "node:test";
import assert from "node:assert/strict";
import { getKey, scheduleChorus } from "./music.js";
import { livePlaybackEvents } from "./sound-band.js";
import { leaksTargetBar } from "./lesson.js";
import { PATH_SLOT_PCTS } from "./path-trail.js";
import {
  LESSONS,
  MODULES,
  PATH_ALIGNS,
  modulePathNodes,
  moduleRoadNodes,
  modulesSheetData,
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
  keyCycleStates,
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
  sessionEngraveSpec,
  demoAudioConfig,
  recordBackingConfig,
  sessionAudioConfig,
  sessionCue,
  wrapupCopy,
  listenStateCopy,
  chromaticOrder,
  fourthsOrder,
  keyOrderPreview,
  lessonSessionPlan,
  lickKeyQueue,
  relativeMajorId,
  resolveLickKeyId,
  displayKeyName,
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
  settingsSummaryShort,
  sessionProgress,
  cardLabel,
  cardKicker,
  sessionScreenTitle,
  sessionPrimaryAction,
  headphonesTipIsDismissed,
  dismissHeadphonesTip,
  wrapupNextModule,
  homeNextModule,
  isLastVisibleLesson,
  moduleLessonsComplete,
  nextModuleTarget,
  visibleModuleLessons,
  sessionCreateArgs,
  isPracticeLesson,
  practiceMajorKeyIds,
  selectedMajorQueue,
  setAllKeys,
  setStartKey,
  toggleSelectedKey,
  sessionShowsCycle,
} from "./session.js";

function rngFrom(values) {
  let i = 0;
  return () => {
    const value = values[i] ?? 0.42;
    i += 1;
    return value;
  };
}

test("chromatic cycle descends a half step from several starts", () => {
  assert.deepEqual(chromaticOrder(), ["C", "B", "Bb", "A", "Ab", "G", "Gb", "F", "E", "Eb", "D", "Db"]);
  const fromG = ["G", "Gb", "F", "E", "Eb", "D", "Db", "C", "B", "Bb", "A", "Ab"];
  assert.deepEqual(buildKeyQueue("chromatic", "G"), fromG);
  assert.deepEqual(nextLapQueue("chromatic", fromG), fromG);
  assert.deepEqual(buildKeyQueue("chromatic", "C"), chromaticOrder());
  for (const start of ["C", "G", "Eb", "B", "Db"]) {
    const queue = buildKeyQueue("chromatic", start);
    assert.equal(queue[0], start);
    assert.equal(queue.length, 12);
    assert.equal(new Set(queue).size, 12);
    for (let i = 1; i < queue.length; i += 1) {
      assert.equal(getKey(queue[i]).pc, (getKey(queue[i - 1]).pc + 11) % 12);
    }
  }
  assert.equal(keyOrderPreview("chromatic", "C"), "C · B · B♭ · A · A♭ · G · G♭ · F · E · E♭ · D · D♭");
  assert.equal(keyOrderPreview("chromatic", "G"), "G · G♭ · F · E · E♭ · D · D♭ · C · B · B♭ · A · A♭");
});

test("fourths cycle from G is the circle of fourths", () => {
  const queue = buildKeyQueue("fourths", "G");
  assert.equal(queue[0], "G");
  assert.equal(new Set(queue).size, 12);
  assert.deepEqual(queue, ["G", "C", "F", "Bb", "Eb", "Ab", "Db", "Gb", "B", "E", "A", "D"]);
  assert.equal(fourthsOrder()[0], "C");
  assert.equal(getKey(queue[1]).pc, (getKey("G").pc + 5) % 12);
  assert.equal(
    keyOrderPreview("fourths", "C"),
    "C · F · B♭ · E♭ · A♭ · D♭ · G♭ · B · E · A · D · G",
  );
  assert.equal(keyOrderPreview("random", "G"), "Shuffled");
  assert.equal(keyOrderPreview("one", "F"), "F");
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

test("a chosen major key maps to each lick and a stored minor tonic migrates once", () => {
  assert.equal(relativeMajorId("G"), "Bb");
  assert.equal(resolveLickKeyId("C", "major"), "C");
  assert.equal(resolveLickKeyId("C", "minor"), "A");
  assert.equal(displayKeyName("A", "concert", "minor"), "A minor");
  assert.equal(displayKeyName("C", "concert", "major"), "C major");

  const minor = lessonSessionPlan("learn-lick", { ...defaultPrefs(), startKeyId: "C" });
  const major = lessonSessionPlan("gts-learn", { ...defaultPrefs(), startKeyId: "C" });
  assert.equal(minor.majorKeyId, "C");
  assert.equal(minor.startKeyId, "A");
  assert.equal(major.startKeyId, "C");
  assert.equal(displayKeyName(minor.startKeyId, "concert", "minor"), "A minor");

  const values = [0.2, 0.8, 0.1, 0.5, 0.9, 0.3, 0.7, 0.15, 0.6, 0.4, 0.25];
  assert.deepEqual(
    lickKeyQueue("random", "F", "minor", rngFrom(values)),
    buildKeyQueue("random", "F", rngFrom(values)).map((id) => resolveLickKeyId(id, "minor")),
  );
  assert.deepEqual(
    lickKeyQueue("chromatic", "C", "minor"),
    buildKeyQueue("chromatic", "C").map((id) => resolveLickKeyId(id, "minor")),
  );
  assert.deepEqual(lickKeyQueue("chromatic", "C", "minor").slice(0, 4), ["A", "Ab", "G", "Gb"]);
  assert.deepEqual(
    lickKeyQueue("fourths", "Bb", "minor"),
    ["G", "C", "F", "Bb", "Eb", "Ab", "Db", "Gb", "B", "E", "A", "D"],
  );
  assert.deepEqual(lickKeyQueue("fourths", "C", "major").slice(0, 3), ["C", "F", "Bb"]);

  const migrated = normalizePrefs({ startKeyId: "G", keyMode: "fourths" });
  assert.equal(migrated.keyBasis, "major");
  assert.equal(migrated.startKeyId, "Bb");
  assert.equal(normalizePrefs(migrated).startKeyId, "Bb");
  assert.equal(lessonSessionPlan("learn-lick", migrated).startKeyId, "G");
  assert.equal(lessonSessionPlan("gts-learn", migrated).startKeyId, "Bb");
  const master = createSession({
    lessonId: "master-lick",
    keyMode: "fourths",
    majorKeyId: migrated.startKeyId,
  });
  assert.equal(master.keyQueue[0], "G");
  assert.equal(displayKeyName(master.keyQueue[0], "concert", "minor"), "G minor");

  const chosen = normalizePrefs({ ...migrated, startKeyId: "Eb" });
  assert.equal(chosen.startKeyId, "Eb");
  assert.equal(lessonSessionPlan("master-lick", chosen).startKeyId, "C");
  assert.equal(lessonSessionPlan("gts-learn", chosen).startKeyId, "Eb");
});

test("one key cycle is a single starting key", () => {
  const queue = buildKeyQueue("one", "F");
  assert.deepEqual(queue, ["F"]);
  assert.deepEqual(nextLapQueue("one", queue), ["F"]);
});

test("every lesson is one play-along card", () => {
  assert.deepEqual(cardsFor("all", "integrate-minor-home"), ["play"]);
  assert.deepEqual(cardsFor("listen-quiz", "integrate-minor-home"), ["play"]);
  assert.deepEqual(cardsFor("all", "learn-lick"), ["play"]);
  assert.deepEqual(cardsFor("listen-quiz", "learn-lick"), ["play"]);
});

test("finishing the card of a one-key session opens wrap-up", () => {
  let session = createSession({ lessonId: "learn-lick", keyMode: "one", startKeyId: "G" });
  assert.equal(session.screen, "session");
  assert.equal(currentCard(session), "play");
  assert.equal(currentKeyId(session), "G");
  session = completeCard(session);
  assert.equal(session.screen, "wrapup");
  assert.deepEqual(session.cardResults.map((row) => row.cardId), ["play"]);
});

test("playback of a one-key card wraps up; a demo stays on the key", () => {
  const session = createSession({ lessonId: "integrate-minor-home", keyMode: "one" });
  const done = handlePlaybackEnded(session, { graded: true, passed: true, outcome: "passed" });
  assert.equal(done.autoStart, false);
  assert.equal(done.session.screen, "wrapup");
  const demo = handlePlaybackEnded({ ...session, demo: true });
  assert.equal(demo.autoStart, false);
  assert.equal(demo.session.screen, "session");
  assert.equal(demo.session.demo, false);
  assert.equal(currentKeyId(demo.session), currentKeyId(session));
});

test("skipping the only card wraps up and records a skip", () => {
  let session = createSession({ lessonId: "learn-lick", keyMode: "one" });
  session = skipCard(session);
  assert.equal(session.screen, "wrapup");
  assert.equal(session.cardResults.find((row) => row.cardId === "play")?.outcome, "skipped");
  assert.equal(session.cardResults.find((row) => row.cardId === "play")?.passed, false);
});

test("skipping a cycle key opens the next key with no wrap-up", () => {
  let session = createSession({ lessonId: "learn-lick", keyMode: "fourths", startKeyId: "G" });
  assert.equal(currentKeyId(session), "G");
  session = skipCard(session);
  assert.equal(session.screen, "session");
  assert.equal(currentKeyId(session), "C");
  assert.equal(session.keyIndex, 1);
  assert.equal(session.cardResults.length, 0);
  assert.equal(session.keyMarks[0], "skipped");
  assert.equal(keyCycleStates(session)[0], "skipped");
  assert.equal(keyCycleStates(session)[1], "current");
});

test("skipping the last cycle key wraps up and records a skip", () => {
  let session = createSession({ lessonId: "learn-lick", keyMode: "fourths", startKeyId: "G" });
  session = { ...session, keyIndex: 11 };
  assert.equal(currentKeyId(session), "D");
  session = skipCard(session);
  assert.equal(session.screen, "wrapup");
  const row = session.cardResults.find((item) => item.cardId === "play");
  assert.equal(row?.outcome, "skipped");
  assert.equal(row?.passed, false);
  assert.equal(row?.graded, false);
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
  assert.equal(currentKeyId(next), "Gb");
  assert.equal(currentCard(next), "play");
  assert.deepEqual(keyOrdinal(next), { index: 2, total: 12 });

  const again = repeatKey(session);
  assert.equal(currentKeyId(again), "G");
  assert.equal(currentCard(again), "play");
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

test("stored card sets are ignored and every session uses all cards", () => {
  const stored = normalizePrefs({
    cardSet: "listen-quiz",
    lessons: {
      "learn-lick": { cardSet: "listen-quiz", tempo: 80 },
    },
  });
  assert.equal(stored.cardSet, "all");
  assert.equal(stored.lessons["learn-lick"].cardSet, "all");
  assert.equal(stored.lessons["learn-lick"].tempo, 80);
  assert.equal(stored.lessons["integrate-minor-home"].cardSet, "all");
  const session = createSession({ lessonId: "learn-lick", cardSet: "listen-quiz" });
  assert.equal(session.cardSet, "all");
  assert.deepEqual(session.cards, ["play"]);
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

test("recommended start is the first unfinished lesson", () => {
  assert.equal(recommendedLessonId({}), 'tones-major7-learn');
  const foundation = Object.fromEntries(MODULES[0].lessons.map(lesson => [lesson.id, TWELVE_KEY_IDS]));
  const recommend = keys => recommendedLessonId({ ...foundation, ...keys });
  const none = {};
  assert.equal(recommend(none), "learn-lick");
  assert.equal(recommend({
    "learn-lick": [],
    "integrate-minor-home": [],
    "integrate-altered-dominant": [],
  }), "learn-lick");
  assert.equal(recommend({ "learn-lick": ["G"] }), "master-lick");

  const firstComplete = {
    "learn-lick": ["G"],
    "master-lick": TWELVE_KEY_IDS.slice(0, 7),
    "integrate-minor-home": ["G"],
  };
  assert.equal(recommend(firstComplete), "master-lick");

  const autumnComplete = {
    "learn-lick": ["G"],
    "master-lick": TWELVE_KEY_IDS,
    "integrate-minor-home": ["G"],
    "integrate-altered-dominant": ["G"],
  };
  assert.equal(recommend(autumnComplete), "emr-learn");

  const cmarComplete = Object.fromEntries(MODULES.find(module => module.id === "cmar").lessons.map((lesson) => [lesson.id, TWELVE_KEY_IDS]));
  assert.equal(recommend(cmarComplete), "emr-learn");

  const allComplete = Object.fromEntries(LESSONS.map((lesson) => [lesson.id, TWELVE_KEY_IDS]));
  assert.equal(recommend(allComplete), null);
});

test("learn-the-lick uses the cell; integration uses the form, with Hear it as a demo", () => {
  const learn = createSession({ lessonId: "learn-lick", studyMode: "learn" });
  assert.equal(practiceStateFor(learn).cellMode, "echo");
  assert.equal(sessionAudioConfig(learn).lengthBeats, 8);
  assert.equal(sessionAudioConfig(learn).includeModel, false);
  const demo = { ...learn, demo: true };
  assert.equal(sessionAudioConfig(demo).includeModel, true);

  const integrate = createSession({ lessonId: "integrate-minor-home", studyMode: "learn" });
  assert.equal(practiceStateFor(integrate).goal, "integrate");
  assert.equal(sessionAudioConfig(integrate).lengthBeats, 32);
  assert.equal(practiceStateFor(integrate).support, "help");
  const playView = sessionPresentation(integrate);
  assert.equal(playView.showLandingNotation, true);
  assert.equal(playView.showSlashNotation, true);
  assert.equal(playView.showEntranceCues, true);
  assert.equal(playView.showModelNotation, false);
  const events = scheduleChorus(sessionAudioConfig(integrate));
  assert.equal(events.filter((event) => event.type === "melody").length, 0);
  assert.ok(events.some((event) => event.type === "cue"));
});

test("every lesson demo plays only the phrase shown on its staff", () => {
  for (const lesson of LESSONS) {
    const session = createSession({ lessonId: lesson.id });
    const config = demoAudioConfig(session);
    for (const sampled of [false, true]) {
      const melody = livePlaybackEvents(config, { sampled })
        .filter((event) => event.type === "melody");
      assert.ok(melody.length > 0, lesson.id);
      assert.ok(melody.every((event) => event.role === "phrase"), lesson.id);
    }
    const spec = sessionEngraveSpec({ ...session, demo: true });
    assert.ok(["phrase", "landing"].includes(spec.mei), lesson.id);
  }
});

test("Hear it demo schedules the melody in Learn and Practice", () => {
  for (const lessonId of ["learn-lick", "cmar-integrate-blue-bossa"]) {
    for (const studyMode of ["learn", "practice"]) {
      const session = createSession({
        lessonId,
        studyMode,
        instrumentId: "trombone",
        startKeyId: "G",
      });
      const label = `${lessonId} ${studyMode}`;
      const demo = demoAudioConfig(session);
      const chorus = scheduleChorus(demo);
      const live = livePlaybackEvents(demo, { sampled: true });
      assert.equal(demo.includeModel, true, label);
      assert.equal(demo.variationId, "original", label);
      assert.ok(chorus.some((event) => event.type === "melody"), `${label} chorus`);
      assert.ok(live.some((event) => event.type === "melody"), `${label} live`);
      assert.ok(live.some((event) => event.type === "bass" || event.type === "piano"), `${label} band`);

      const backing = recordBackingConfig(session);
      const backingLive = livePlaybackEvents(backing, { sampled: true });
      assert.equal(backing.includeModel, false, label);
      assert.equal(backing.variationId, "skip", label);
      assert.equal(backing.looping, true, label);
      assert.equal(backing.tempo, demo.tempo, label);
      assert.equal(backing.lengthBeats, demo.lengthBeats, label);
      assert.equal(backing.concertKey.id, demo.concertKey.id, label);
      assert.equal(backingLive.some((event) => event.type === "melody"), false, label);
      assert.ok(backingLive.some((event) => event.type === "bass" || event.type === "piano"), `${label} record band`);
    }
  }
});

test("Master engraves the lick; blur is CSS, not hidden ink", () => {
  const master = createSession({ lessonId: "master-lick", keyMode: "fourths", startKeyId: "G" });
  const view = sessionPresentation(master);
  assert.equal(view.hideStaff, false);
  assert.equal(view.showChordsOnly, false);
  assert.equal(view.showPhraseNotation, true);
  const spec = sessionEngraveSpec(master);
  assert.equal(spec.memory, false);
  assert.equal(spec.mei, "phrase");
  assert.equal(master.keyQueue[0], "G");
  assert.equal(master.keyQueue.length, 12);
});

test("wrap-up lists per-card completion and names the next key", () => {
  const session = jumpToWrapup(createSession({
    lessonId: "learn-lick",
    keyMode: "fourths",
    startKeyId: "G",
  }));
  const copy = wrapupCopy(session);
  assert.equal(copy.results.length, 1);
  assert.equal(copy.results[0].label, "Play it");
  assert.equal(copy.heading, "G minor");
  assert.equal(copy.kicker, "Key complete");
  assert.equal(copy.detail, "Learn the lick");
  assert.equal(copy.nextKeyName, "C minor");
  assert.equal(copy.nextKeyLabel, "Next key · C minor");
  const one = wrapupCopy(jumpToWrapup(createSession({ keyMode: "one" })));
  assert.equal(one.nextKeyName, null);
  assert.equal(one.nextKeyLabel, null);
});

test("the single card does not use the old Listen or Quiz feedback stages", () => {
  assert.equal(listenStateCopy(createSession({ lessonId: "integrate-minor-home" })), null);
  assert.equal(listenStateCopy(createSession({ lessonId: "learn-lick" })), null);
});

test("lessons stay unlocked and the module has 25 records", () => {
  assert.equal(MODULES.length, 31);
  assert.deepEqual(MODULES.find(module => module.id === "cmar").lessons.map((lesson) => lesson.id), [
    "learn-lick",
    "master-lick",
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
  assert.deepEqual(
    MODULES.slice(1, 6).map((module) => module.lessons.length),
    [11, 9, 9, 11, 14],
  );
  assert.ok(MODULES.slice(6).every((module) => module.lessons.length >= 3 && module.lessons.length <= 5));
  const road = LESSONS.filter((lesson) => lesson.group !== "your-tunes" && lesson.group !== "my-tunes");
  assert.ok(road.length > 50);
  assert.equal(LESSONS.length, road.length + LESSONS.filter((lesson) => lesson.group === "your-tunes" || lesson.group === "my-tunes").length);
  assert.equal(TWELVE_KEY_IDS.length, 12);
});

test("module home path zig-zags record sleeves and never locks a lesson", () => {
  assert.deepEqual(PATH_ALIGNS, ["left", "center", "right"]);
  assert.deepEqual(PATH_SLOT_PCTS, [28, 50, 72]);
  assert.deepEqual(MODULES.find(module => module.id === "cmar").lessons.map((lesson) => lesson.sleeve), [
    "amber", "teal", "oxblood", "amber", "teal", "oxblood", "amber",
    "teal", "oxblood", "amber", "teal",
  ]);
  assert.deepEqual(LESSONS.map((lesson) => lesson.sleeve).slice(0, 3), ["amber", "teal", "oxblood"]);
  assert.equal(lessonSleeve("learn-lick"), "amber");
  assert.equal(lessonSleeve("master-lick"), "teal");
  assert.equal(lessonSleeve("integrate-minor-home"), "oxblood");
  assert.equal(LESSONS.find(lesson => lesson.id === "master-lick").context, "All 12 keys");
  assert.equal(LESSONS.find(lesson => lesson.id === "integrate-minor-home").context, "Autumn Leaves · bar 7");
  assert.equal(LESSONS.find(lesson => lesson.id === "integrate-altered-dominant").context, "Over D7 · bar 6");

  const nodes = modulePathNodes(MODULES.find(module => module.id === "cmar"), defaultPrefs(), {
    "learn-lick": ["G", "C", "F"],
    "integrate-minor-home": TWELVE_KEY_IDS,
  });
  assert.equal(nodes.length, 11);
  assert.deepEqual(nodes.map((node) => node.align), [
    "left", "center", "right", "left", "center", "right", "left",
    "center", "right", "left", "center",
  ]);
  assert.equal(
    lessonPathNodes(defaultPrefs(), {}).length,
    MODULES.reduce((sum, module) => sum + module.lessons.length, 0),
  );
  assert.equal(nodes[0].recommended, false);
  assert.equal(nodes[0].complete, true);
  assert.equal(nodes[0].passedCount, 3);
  assert.equal(nodes[0].vinylTier, "gold");
  assert.equal(nodes[1].id, "master-lick");
  assert.equal(nodes[1].complete, false);
  assert.equal(nodes[1].passedCount, 0);
  assert.equal(nodes[1].recommended, false); // Foundation is still unfinished.
  assert.equal(nodes[2].id, "integrate-minor-home");
  assert.equal(nodes[2].complete, false);
  assert.equal(nodes[2].passedCount, 0);
  assert.equal(nodes[2].vinylTier, "black");
  assert.equal(nodes[2].practice, true);
  assert.equal(nodes[2].number, "Practice");
  assert.equal(nodes.every((node) => LESSONS.some((lesson) => lesson.id === node.id)), true);

  const firstDone = modulePathNodes(MODULES.find(module => module.id === "cmar"), defaultPrefs(), {
    "learn-lick": ["G"],
    "master-lick": TWELVE_KEY_IDS.slice(0, 7),
    "integrate-minor-home": ["G"],
    "integrate-altered-dominant": TWELVE_KEY_IDS.slice(0, 3),
  });
  assert.equal(firstDone[0].recommended, false);
  assert.equal(firstDone[0].complete, true);
  assert.equal(firstDone[1].recommended, false); // Foundation is still unfinished.
  assert.equal(firstDone[1].passedCount, 7);
  assert.equal(firstDone[1].complete, false);
  assert.equal(firstDone[2].recommended, false);
  assert.equal(firstDone[2].complete, false);
  assert.equal(firstDone[2].passedCount, 0);
  assert.equal(firstDone[2].practice, true);

  const cmarKeys = Object.fromEntries(MODULES.find(module => module.id === "cmar").lessons.map((lesson) => [lesson.id, TWELVE_KEY_IDS]));
  const allCmar = modulePathNodes(MODULES.find(module => module.id === "cmar"), defaultPrefs(), cmarKeys);
  assert.equal(allCmar.filter((node) => !node.practice).every((node) => node.complete === true), true);
  assert.equal(allCmar.filter((node) => node.practice).every((node) => node.complete === false), true);
  assert.equal(allCmar.every((node) => node.recommended === false), true);
  const across = lessonPathNodes(defaultPrefs(), cmarKeys);
  assert.equal(across.find((node) => node.recommended)?.id, "tones-major7-learn");
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
  const node = lessonPathNode(LESSONS.find(lesson => lesson.id === "learn-lick"), 0, {
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
  assert.equal(node.keyTarget, 1);
  assert.equal(node.complete, true);
  assert.equal(node.vinylTier, "gold");
  assert.equal(node.caption, "The cell in this key · passed");
  const empty = lessonPathNode(LESSONS.find(lesson => lesson.id === "master-lick"), 1, { passedKeys: [] });
  assert.equal(empty.coverTitle, "Master the lick");
  assert.equal(empty.vinylTier, "black");
  assert.equal(empty.caption, "All 12 keys");
  const bronze = lessonPathNode(LESSONS.find(lesson => lesson.id === "master-lick"), 1, { passedKeys: ["G", "C"] });
  assert.equal(bronze.vinylTier, "bronze");
  assert.equal(bronze.caption, "All 12 keys · 2/12 keys");
  const gold = lessonPathNode(LESSONS.find(lesson => lesson.id === "master-lick"), 1, { passedKeys: TWELVE_KEY_IDS });
  assert.equal(gold.vinylTier, "gold");
  assert.equal(gold.caption, "All 12 keys · 12/12 keys");
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
      { cardId: "play", outcome: "skipped", graded: false, passed: false },
    ],
  });
  assert.equal(wrapped.results.find((row) => row.cardId === "play")?.summary, "Skipped");
  assert.equal(cardResultLabel({ graded: true, passed: false, percent: 0, correction: "1st note didn't speak", outcome: "missed" }), "0% · miss · 1st note didn't speak");
});

test("Back and Next stay put on the single card", () => {
  const first = createSession({ lessonId: "learn-lick" });
  assert.equal(canGoBack(first), false);
  assert.equal(canGoNext(first), false);
  assert.deepEqual(cardCounter(first), { index: 1, total: 1 });
  const backNoop = goBack(first);
  assert.equal(backNoop.moved, false);
  assert.equal(backNoop.stopAudio, false);
  const nextNoop = goNext(first);
  assert.equal(nextNoop.moved, false);
  assert.equal(nextNoop.session.screen, "session");
});

test("the play-along card with no take is Skipped", () => {
  const play = createSession({ lessonId: "learn-lick" });
  const skipped = leaveCardOutcome(play, { hasTake: false });
  assert.equal(skipped.outcome, "skipped");
  assert.equal(skipped.passed, false);
});

test("a stored play-along grade can be replaced", () => {
  let session = createSession({ lessonId: "learn-lick" });
  session = {
    ...session,
    cardResults: [{ cardId: "play", outcome: "passed", graded: true, passed: true, percent: 90 }],
  };
  assert.equal(resultForCard(session, "play").percent, 90);
  const replaced = leaveCardOutcome(session, {
    hasTake: true,
    takeResult: { outcome: "missed", graded: true, passed: false, percent: 40 },
  });
  assert.equal(replaced.percent, 40);
  assert.equal(replaced.passed, false);
});

test("card navigation with nowhere to go does not halt audio", () => {
  const next = goNext(createSession({ lessonId: "learn-lick" }));
  assert.equal(next.moved, false);
  assert.equal(next.stopAudio, false);
});

test("module road hides Your tunes and re-numbers the remaining sleeves", () => {
  const nodes = moduleRoadNodes(MODULES.find(module => module.id === "cmar"), defaultPrefs(), {});
  assert.equal(nodes.length, 8);
  assert.equal(nodes.every((node) => node.group !== "your-tunes"), true);
  assert.deepEqual(nodes.map((node) => node.number), ["01", "02", "Practice", "Practice", "Practice", "Practice", "Practice", "Practice"]);
  assert.equal(nodes[2].practice, true);
  assert.equal(nodes[2].caption, nodes[2].context);
  assert.equal(nodes[0].id, "learn-lick");
  assert.equal(nodes[1].id, "master-lick");
  assert.equal(nodes[1].title, "Master the lick");
  assert.equal(nodes[0].recommended, true);
  assert.equal(modulePathNodes(MODULES.find(module => module.id === "cmar"), defaultPrefs(), {}).length, 11);
});

test("modules sheet lists 1–31 and omits Your tunes", () => {
  const data = modulesSheetData({}, { cmar: ["G"] });
  assert.equal(data.length, 31);
  assert.equal(data.some((module) => module.id === "tunes"), false);
  assert.equal(data[1].number, 2);
  assert.equal(data[1].lickName, "Cry Me a River");
  assert.equal(data[1].keysMastered, 1);
  assert.equal(data[30].number, 31);
});

test("quick view lists every module and record", () => {
  const data = quickViewData({
    "learn-lick": ["G", "C"],
    "integrate-minor-home": TWELVE_KEY_IDS,
  }, { cmar: ["G"], emr: [] });
  assert.equal(data.length, 32);
  assert.deepEqual(data.map((module) => module.id), [...MODULES.map((module) => module.id), "tunes"]);
  assert.equal(data.flatMap((module) => module.records).length,
    LESSONS.filter((lesson) => lesson.group !== "application-practice" && lesson.group !== "chart-tones").length);
  assert.equal(data[1].lickName, "Cry Me a River");
  assert.equal(data[1].keysMastered, 1);
  assert.equal(data[1].records[0].id, "learn-lick");
  assert.equal(data[1].records[0].number, "01");
  assert.equal(data[1].records[0].title, "Learn the lick");
  assert.equal(data[1].records[0].context, "The cell in this key");
  assert.equal(data[1].records[0].keysPassed, 2);
  assert.equal(data[1].records[1].id, "master-lick");
  assert.equal(data[1].records[1].number, "02");
  assert.equal(data[1].records[1].keysPassed, 0);
  assert.equal(data[1].records[2].keysPassed, 0);
  assert.equal(data[1].records[2].number, "Practice");
  assert.equal(data[2].lickName, "Embellished Minor Resolution");
  assert.equal(data[2].keysMastered, 0);
  assert.equal(data[3].records.some((record) => record.id === "gts-learn"), true);
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

test("abandoning a session marks the unfinished card Skipped", () => {
  const session = skipRemainingCards(createSession({ lessonId: "learn-lick" }));
  assert.equal(resultForCard(session, "play").outcome, "skipped");
});

test("count-in keeps the play-along prompt instead of a second Count-in line", () => {
  const session = createSession({ lessonId: "learn-lick" });
  const during = sessionCue(session, { playing: true, inCountIn: true, beats: -2 });
  assert.match(during, /Your turn/);
  assert.doesNotMatch(during, /Count-in/);
});

test("global settings summary and lesson-1 labels", () => {
  assert.equal(settingsSummary({ keyMode: "fourths", tempo: 140, swing: true }), "Piano · 140 bpm · 1-bar");
  assert.equal(settingsSummary(defaultPrefs()), "Piano · 96 bpm · 1-bar");
  assert.equal(settingsSummary({ instrumentId: "trumpet", tempo: 96 }), "Trumpet · 96 bpm · 1-bar");
  assert.equal(settingsSummaryShort(defaultPrefs()), "Piano · 96 bpm · B♭ major · Cycle: 4ths");
  assert.equal(settingsSummaryShort({ instrumentId: "trumpet", tempo: 140 }), "Trumpet · 140 bpm · C major · Cycle: 4ths");
  assert.equal(settingsSummaryShort({ instrumentId: "trombone", tempo: 96, startKeyId: "G", keyMode: "fourths" }), "Trombone · 96 bpm · B♭ major · Cycle: 4ths");
  assert.equal(cardLabel("learn", "learn-lick"), "Hear it");
  assert.equal(cardKicker("quiz", "learn-lick"), "MEMORY");
  assert.equal(cardLabel("learn", "integrate-minor-home"), "Learn");
  assert.equal(sessionScreenTitle(createSession({ lessonId: "learn-lick" })), "G minor");
  assert.equal(sessionScreenTitle(createSession({ lessonId: "master-lick", keyMode: "fourths" })), "G minor");
  assert.equal(sessionScreenTitle(createSession({ lessonId: "integrate-minor-home" })), "Autumn Leaves");
  const twelve = createSession({ lessonId: "learn-lick", keyMode: "fourths" });
  assert.deepEqual(sessionProgress(twelve), { index: 1, total: 12, ratio: 0 });
  const hear = createSession({ lessonId: "learn-lick" });
  assert.equal(sessionPrimaryAction(hear, {}).label, "Count me in");
  assert.equal(sessionPrimaryAction(hear, { playing: true }).id, "pause");
  assert.equal(sessionPrimaryAction({ ...hear, demo: true }, {}).label, "Hear it");
  const shifted = setMelodyRegister(createSession({
    lessonId: "learn-lick",
    keyMode: "fourths",
    startKeyId: "G",
  }), 1);
  const nextKey = advanceKey(jumpToWrapup(shifted));
  assert.equal(nextKey.melodyRegister, 1);
  assert.equal(currentKeyId(nextKey), "C");
});

test("headphones tip stays hidden until dismissed, then persists", () => {
  const fresh = defaultPrefs();
  assert.equal(fresh.headphonesTipSeen, false);
  assert.equal(headphonesTipIsDismissed(fresh, null), false);
  assert.equal(headphonesTipIsDismissed(fresh, "1"), true);
  const dismissed = dismissHeadphonesTip(fresh);
  assert.equal(dismissed.headphonesTipSeen, true);
  assert.equal(headphonesTipIsDismissed(dismissed, null), true);
  const stored = normalizePrefs({ headphonesTipSeen: true });
  assert.equal(stored.headphonesTipSeen, true);
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

test("next-module link follows last lesson wrap-up and completed module home", () => {
  const cmar = MODULES.find(module => module.id === "cmar");
  const emr = MODULES.find(module => module.id === "emr");
  const first = MODULES[0];
  const last = MODULES.at(-1);
  const cmarLast = visibleModuleLessons(cmar).at(-1);
  const firstLabel = `Next: Module ${emr.number} · ${emr.name}`;
  const backLabel = `Back to Module ${first.number} · ${first.name}`;
  assert.equal(isLastVisibleLesson("learn-lick"), false);
  assert.equal(isLastVisibleLesson("master-lick"), true);
  assert.equal(isLastVisibleLesson(cmarLast.id), false);
  assert.equal(nextModuleTarget(cmar).type, "module");
  assert.equal(nextModuleTarget(cmar).id, emr.id);
  assert.equal(nextModuleTarget(cmar).label, firstLabel);
  assert.equal(nextModuleTarget(last).type, "module");
  assert.equal(nextModuleTarget(last).id, first.id);
  assert.equal(nextModuleTarget(last).label, backLabel);

  const wrapLast = wrapupNextModule(createSession({ lessonId: "master-lick", startKeyId: "G" }));
  assert.equal(wrapLast.id, emr.id);
  assert.equal(wrapLast.label, firstLabel);
  assert.equal(wrapupNextModule(createSession({ lessonId: "learn-lick", startKeyId: "G" })), null);
  const lastMaster = visibleModuleLessons(last).find((lesson) => lesson.kind === "master");
  const wrapBookEnd = wrapupNextModule(createSession({ lessonId: lastMaster.id }));
  assert.equal(wrapBookEnd.id, first.id);
  assert.equal(wrapBookEnd.label, backLabel);

  const empty = {};
  const unfinished = homeNextModule(cmar, empty);
  assert.equal(unfinished.id, emr.id);
  assert.equal(unfinished.label, firstLabel);
  const done = Object.fromEntries(visibleModuleLessons(cmar).map((lesson) => [lesson.id, TWELVE_KEY_IDS]));
  const homeLink = homeNextModule(cmar, done);
  assert.equal(homeLink.id, unfinished.id);
  assert.equal(homeLink.label, firstLabel);
  assert.equal(moduleLessonsComplete(cmar, done), true);
  const lastEmpty = homeNextModule(last, {});
  const lastDone = Object.fromEntries(visibleModuleLessons(last).map((lesson) => [lesson.id, TWELVE_KEY_IDS]));
  assert.equal(homeNextModule(last, lastDone).id, lastEmpty.id);
  assert.equal(lastEmpty.id, first.id);
  assert.equal(lastEmpty.label, backLabel);
  assert.equal(wrapLast.id, homeLink.id);
  assert.equal(wrapBookEnd.id, lastEmpty.id);
});

test("all-keys stays the full cycle and a custom set follows the starting key", () => {
  const prefs = defaultPrefs();
  assert.equal(prefs.allKeys, true);
  assert.equal(normalizePrefs({ startKeyId: "Eb", keyBasis: "major" }).allKeys, true);
  assert.equal(lessonSessionPlan("master-lick", prefs).keyIds, null);
  assert.equal(lessonSessionPlan("learn-lick", {
    ...prefs,
    allKeys: false,
    selectedKeyIds: ["Bb", "F"],
  }).keyMode, "one");

  const custom = {
    ...prefs,
    allKeys: false,
    keyMode: "fourths",
    startKeyId: "Bb",
    selectedKeyIds: ["F", "Eb"],
  };
  assert.deepEqual(practiceMajorKeyIds(normalizePrefs(custom)), ["Bb", "F", "Eb"]);
  const plan = lessonSessionPlan("master-lick", custom);
  const session = createSession(sessionCreateArgs("master-lick", custom));
  assert.equal(plan.keyMode, "fourths");
  assert.deepEqual(session.keyQueue, ["G", "C", "D"]);
  assert.equal(sessionShowsCycle(session), true);
  assert.equal(
    keyOrderPreview("fourths", "Bb", "concert", practiceMajorKeyIds(normalizePrefs(custom))),
    "B♭ · E♭ · F",
  );
  assert.equal(
    settingsSummaryShort(custom),
    "Piano · 96 bpm · B♭ · E♭ · F · Cycle: 4ths",
  );

  const major = createSession({
    lessonId: "gts-master",
    keyMode: "fourths",
    majorKeyId: "Bb",
    keyIds: ["Bb", "Eb", "F"],
  });
  assert.deepEqual(major.keyQueue, ["Bb", "Eb", "F"]);

  const only = createSession({
    lessonId: "master-lick",
    keyMode: "fourths",
    majorKeyId: "Bb",
    keyIds: ["Bb"],
  });
  assert.deepEqual(only.keyQueue, ["G"]);
  assert.equal(sessionShowsCycle(only), false);

  let walking = session;
  const seen = [];
  for (let step = 0; step < 3; step += 1) {
    seen.push(currentKeyId(walking));
    const next = handlePlaybackEnded(walking, { graded: true, passed: true, outcome: "passed" });
    walking = next.session;
    if (step < 2) assert.equal(walking.screen, "session");
  }
  assert.deepEqual(seen, ["G", "C", "D"]);
  assert.equal(walking.screen, "wrapup");
  assert.deepEqual(nextLapQueue("fourths", ["G", "C", "D"]), ["G", "C", "D"]);
  const reshuffled = nextLapQueue("random", ["G", "C", "D"], () => 0);
  assert.equal(reshuffled.length, 3);
  assert.deepEqual(reshuffled.slice().sort(), ["C", "D", "G"]);

  const added = toggleSelectedKey(custom, "C");
  assert.equal(added.allKeys, false);
  assert.ok(added.selectedKeyIds.includes("C"));
  const dropped = toggleSelectedKey(added, "Bb");
  assert.equal(dropped.selectedKeyIds.includes("Bb"), false);
  assert.equal(dropped.startKeyId, selectedMajorQueue("fourths", "Bb", ["Bb", "F", "Eb", "C"]).filter((id) => id !== "Bb")[0]);
  const stuck = toggleSelectedKey({ ...dropped, selectedKeyIds: [dropped.startKeyId], startKeyId: dropped.startKeyId }, dropped.startKeyId);
  assert.deepEqual(stuck.selectedKeyIds, [dropped.startKeyId]);

  const moved = setStartKey(setAllKeys(custom, false), "Ab");
  assert.equal(moved.startKeyId, "Ab");
  assert.ok(moved.selectedKeyIds.includes("Ab"));
  assert.equal(setAllKeys(moved, true).allKeys, true);
  assert.equal(settingsSummaryShort(setAllKeys(moved, true)), "Piano · 96 bpm · A♭ major · Cycle: 4ths");
});

test("session headings emphasize the current key or tune without lesson numbers", () => {
  const master = createSession({ lessonId: "master-lick", startKeyId: "G", keyMode: "fourths" });
  assert.equal(sessionScreenTitle(master), "G minor");
  assert.equal(sessionScreenTitle(advanceKey(master)), "C minor");
  assert.equal(sessionScreenTitle(createSession({ lessonId: "tune-st-thomas-emr" })), "St. Thomas");
});
