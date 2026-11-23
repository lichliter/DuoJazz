import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildKeyQueue,
  createSession,
  currentKeyId,
  defaultPrefs,
  demoAudioConfig,
  recordBackingConfig,
  handlePlaybackEnded,
  lessonById,
  lessonSessionPlan,
  lickKeyQueue,
  sessionCreateArgs,
  isPracticeLesson,
  moduleLessonsComplete,
  moduleRoadNodes,
  normalizePrefs,
  sessionShowsCycle,
  settingsSummaryShort,
  TWELVE_KEY_IDS,
} from "./session.js";
import {
  emptyMastery,
  isKeyMastered,
  lessonPassedKeys,
  normalizeMastery,
  recordQuizPass,
} from "./medals.js";
import { MODULES } from "./registry.js";

test("lesson key counts are 12, 12, and 1", () => {
  const prefs = defaultPrefs();
  const learn = lessonSessionPlan("learn-lick", prefs);
  const master = lessonSessionPlan("master-lick", prefs);
  const tune = lessonSessionPlan("cmar-integrate-blue-bossa", prefs);
  assert.equal(buildKeyQueue(learn.keyMode, learn.startKeyId).length, 12);
  assert.equal(buildKeyQueue(master.keyMode, master.startKeyId).length, 12);
  assert.equal(buildKeyQueue(tune.keyMode, tune.startKeyId).length, 1);
  assert.equal(lessonById("learn-lick").kind, "learn");
  assert.equal(lessonById("master-lick").kind, "master");
  assert.equal(lessonById("cmar-integrate-blue-bossa").kind, "integrate");
  assert.equal(MODULES.find(module => module.id === "cmar").lessons[1].id, "master-lick");
  assert.equal(MODULES.find(module => module.id === "cmar").lessons[1].number ?? MODULES.find(module => module.id === "cmar").lessons[1].title, "Master the lick");
});

test("Learn and Master start at the default key and follow the cycle type", () => {
  for (const lessonId of ["learn-lick", "master-lick"]) {
    const fourths = lessonSessionPlan(lessonId, defaultPrefs());
    const fourthsQueue = buildKeyQueue(fourths.keyMode, fourths.startKeyId);
    assert.equal(fourths.keyMode, "fourths", lessonId);
    assert.equal(fourthsQueue[0], "G", lessonId);
    assert.equal(fourthsQueue[1], "C", lessonId);

    const chromatic = lessonSessionPlan(lessonId, { ...defaultPrefs(), keyMode: "chromatic", startKeyId: "C" });
    const chromaticQueue = lickKeyQueue(chromatic.keyMode, chromatic.majorKeyId, "minor");
    assert.equal(chromatic.keyMode, "chromatic", lessonId);
    assert.equal(chromatic.majorKeyId, "C", lessonId);
    assert.equal(chromatic.startKeyId, "A", lessonId);
    assert.deepEqual(chromaticQueue.slice(0, 4), ["A", "Ab", "G", "Gb"], lessonId);
    assert.equal(sessionShowsCycle(createSession({ lessonId, ...fourths })), true, lessonId);
  }

  for (const lessonId of ["emr-learn", "emr-master"]) {
    const fromF = lessonSessionPlan(lessonId, { ...defaultPrefs(), keyMode: "fourths", startKeyId: "F" });
    assert.equal(fromF.majorKeyId, "F", lessonId);
    assert.equal(fromF.startKeyId, "D", lessonId);
    assert.equal(lickKeyQueue(fromF.keyMode, fromF.majorKeyId, "minor")[0], "D", lessonId);
  }
  assert.equal(sessionShowsCycle(createSession({ lessonId: "integrate-minor-home", keyMode: "one", startKeyId: "G" })), false);
  assert.equal(sessionShowsCycle(createSession({ lessonId: "learn-lick", keyMode: "fourths", majorKeyId: "Bb", keyIds: ["Bb"] })), false);
});

test("tune lessons use their own key, not the settings default", () => {
  const prefs = { ...defaultPrefs(), startKeyId: "G", keyMode: "chromatic" };
  const bossa = lessonSessionPlan("cmar-integrate-blue-bossa", prefs);
  const summer = lessonSessionPlan("cmar-integrate-summertime", prefs);
  const cry = lessonSessionPlan("cmar-integrate-cry-me", prefs);
  const learn = lessonSessionPlan("learn-lick", prefs);
  assert.equal(bossa.keyMode, "one");
  assert.equal(bossa.startKeyId, "C");
  assert.equal(summer.startKeyId, "A");
  assert.equal(cry.startKeyId, "Eb");
  assert.equal(learn.majorKeyId, "G");
  assert.equal(learn.startKeyId, "E");
  assert.equal(learn.keyMode, "chromatic");
});

test("the settings pill names instrument, tempo, default key, and cycle", () => {
  assert.equal(settingsSummaryShort(defaultPrefs()), "Piano · 96 bpm · B♭ major · Cycle: 4ths");
  assert.equal(
    settingsSummaryShort({ instrumentId: "trombone", tempo: 96, startKeyId: "G", keyMode: "fourths" }),
    "Trombone · 96 bpm · B♭ major · Cycle: 4ths",
  );
  assert.equal(
    settingsSummaryShort({ instrumentId: "piano", tempo: 120, startKeyId: "Eb", keyMode: "chromatic" }),
    "Piano · 120 bpm · G♭ major · Cycle: Chromatic",
  );
  assert.equal(normalizePrefs({ keyMode: "one" }).keyMode, "fourths");
  assert.equal(normalizePrefs({ keyMode: "random" }).keyMode, "random");
});

test("profile combines account details and settings and opens from the avatar", async () => {
  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  assert.match(index, /id="account-chip"[^>]*aria-haspopup="dialog"[^>]*aria-controls="settings-modal"/);
  assert.doesNotMatch(index, /id="account-dialog"|id="home-summary"/);
  assert.doesNotMatch(index, /id="settings-btn"/);
  assert.doesNotMatch(index, /id="card-sets"/);
  assert.match(index, /id="settings-modal"/);
  assert.match(index, /id="settings-close"[^>]*>×<\/button>/);
  assert.doesNotMatch(index, /id="app-tab-bar"/);
  assert.doesNotMatch(index, /id="home-mode"/);
  assert.match(app, /onOpenProfile: openSettings/);
  const profile = index.slice(index.indexOf('id="settings-modal"'), index.indexOf("</dialog>", index.indexOf('id="settings-modal"')));
  for (const id of ["account-name", "account-identity", "instrument-list", "tempo-readout", "account-signout"]) {
    assert.ok(profile.includes(`id="${id}"`), `${id} belongs to Profile`);
  }
  assert.doesNotMatch(app, /settingsBtn/);
  assert.doesNotMatch(app, /CARD_SETS/);
  assert.match(app, /els\.settingsClose\?\.addEventListener\("click", \(\) => closeSettings\(\)\)/);
  assert.match(app, /if \(!inside\) closeSettings\(\)/);
  assert.match(app, /settingsModal\.showModal\(\)/);
  assert.match(app, /renderSettings\(\)/);
});

test("Master blurs the staff until Show notes, and a reveal does not count", async () => {
  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  const hig = await readFile(new URL("../css/hig.css", import.meta.url), "utf8");
  assert.match(index, /id="show-notes"[^>]*aria-label="Show notes"/);
  assert.match(hig, /\.paper-wrap\.notes-hidden::before[\s\S]*backdrop-filter:\s*blur\(/);
  assert.match(hig, /\.paper-wrap\.notes-hidden \.paper \{[\s\S]*filter:\s*blur\(14px\)/);
  assert.doesNotMatch(hig, /\.paper\.staff-blurred \.note/);
  assert.match(app, /notes-hidden/);
  assert.match(app, /closest\("\.paper-wrap"\)/);
  assert.match(app, /return lesson\.kind !== "master" \|\| notesRevealed/);
  assert.doesNotMatch(app, /Hide notes/);
  assert.match(app, /notesShown: notesPeeked/);
  const rapidPass = app.slice(app.indexOf("function recordRapidPass"), app.indexOf("function finishRapid"));
  assert.match(rapidPass, /recordPassIfNeeded\(\{ passed: true \}\)/);
  const pass = app.slice(app.indexOf("function recordPassIfNeeded"), app.indexOf("function gradeCurrentCard"));
  assert.match(pass, /recordLearnPass/);
  assert.match(pass, /shouldRecordMastery/);
});

test("saved Practice mastery moves onto Master the lick once", () => {
  const legacy = {
    lessons: {
      "learn-lick": { passedKeys: ["G", "C"], learnedKeys: ["F"] },
      "integrate-minor-home": { passedKeys: ["G"], learnedKeys: [] },
    },
    modules: { cmar: { masteredKeys: ["G"], medal: "bronze" } },
  };
  const mastery = normalizeMastery(legacy);
  assert.deepEqual(lessonPassedKeys(mastery, "master-lick").slice().sort(), ["C", "G"]);
  assert.deepEqual(lessonPassedKeys(mastery, "learn-lick"), ["F"]);
  assert.equal(isKeyMastered(mastery, "G"), true);
  assert.equal(isKeyMastered(mastery, "C"), true);
  assert.equal(isKeyMastered(mastery, "F"), false);

  const saved = normalizeMastery(JSON.parse(JSON.stringify(mastery)));
  saved.lessons["learn-lick"].passedKeys = ["Bb"];
  const again = normalizeMastery(saved);
  assert.deepEqual(lessonPassedKeys(again, "learn-lick"), ["Bb"]);
  assert.equal(lessonPassedKeys(again, "master-lick").includes("Bb"), false);
  assert.equal(isKeyMastered(again, "G"), true);
});

test("one card on Learn and Master auto-advances across all 12 keys, then wraps up", () => {
  for (const lessonId of ["learn-lick", "master-lick"]) {
    let session = createSession({
      lessonId,
      keyMode: "fourths",
      startKeyId: "G",
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
    assert.equal(session.screen, "wrapup", lessonId);
    assert.equal(new Set(seen).size, 12, lessonId);
    assert.deepEqual(seen.slice().sort(), TWELVE_KEY_IDS.slice().sort(), lessonId);
  }
  let mastery = emptyMastery();
  mastery = recordQuizPass(mastery, "learn-lick", "G");
  assert.equal(isKeyMastered(mastery, "G", "cmar"), false);
  mastery = recordQuizPass(mastery, "master-lick", "G");
  assert.equal(isKeyMastered(mastery, "G", "cmar"), true);
});

test("createAndShow and bare Learn/Master sessions run 12 keys from the default key", () => {
  for (const lessonId of ["learn-lick", "master-lick"]) {
    const bare = createSession({ lessonId, instrumentId: "trombone" });
    assert.equal(bare.keyQueue.length, 12, lessonId);
    assert.equal(bare.keyMode, "fourths", lessonId);
    assert.equal(bare.keyQueue[0], "G", lessonId);
    const prefs = { ...defaultPrefs(), keyMode: "chromatic", startKeyId: "F" };
    const planned = sessionCreateArgs(lessonId, prefs, { instrumentId: "trombone" });
    const launched = createSession({ instrumentId: "trombone", ...planned });
    assert.equal(launched.keyQueue.length, 12, lessonId);
    assert.equal(launched.keyMode, "chromatic", lessonId);
    assert.equal(launched.keyQueue[0], "D", lessonId);
    assert.deepEqual(launched.keyQueue.slice(0, 4), ["D", "Db", "C", "B"], lessonId);
  }
});

test("tune lessons are ungraded practice after Learn and Master", () => {
  assert.equal(isPracticeLesson("cmar-integrate-blue-bossa"), true);
  assert.equal(isPracticeLesson("learn-lick"), false);
  assert.equal(isPracticeLesson("master-lick"), false);
  const nodes = moduleRoadNodes(MODULES.find(module => module.id === "cmar"), defaultPrefs(), {});
  assert.equal(nodes[0].number, "01");
  assert.equal(nodes[1].number, "02");
  assert.ok(nodes.slice(2).every((node) => node.number === "Practice" && node.practice));
  assert.equal(moduleLessonsComplete(MODULES.find(module => module.id === "cmar"), {
    "learn-lick": ["G"],
    "master-lick": TWELVE_KEY_IDS,
  }), false);
  assert.equal(moduleLessonsComplete(MODULES.find(module => module.id === "cmar"), {
    "learn-lick": TWELVE_KEY_IDS,
    "master-lick": TWELVE_KEY_IDS,
  }), true);
  assert.equal(lessonById("cmar-integrate-blue-bossa").kind, "integrate");
});

test("home shares one side gutter and an even stack", async () => {
  const styles = await readFile(new URL("../css/styles.css", import.meta.url), "utf8");
  const hig = await readFile(new URL("../css/hig.css", import.meta.url), "utf8");
  const session = await readFile(new URL("./session.js", import.meta.url), "utf8");
  assert.match(hig, /\.app-shell\[data-screen="home"\] \.masthead,\s*\.app-shell\[data-screen="home"\] \.workspace \{[^}]*2 \* var\(--margin-regular\)/);
  assert.match(styles, /#screen-home \{[^}]*gap:\s*var\(--space-5\)/);
  assert.match(styles, /\.lesson-path \{[^}]*padding:\s*0 0 1\.1rem/);
  assert.doesNotMatch(styles, /outline:\s*2px solid var\(--accent\)/);
  assert.doesNotMatch(session, /export const CARD_SETS/);
  assert.doesNotMatch(session, /export const STUDY_MODES/);
});

test("the lick banner opens My Rotation and the hamburger is gone", async () => {
  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  const appHome = await readFile(new URL("./app-home.js", import.meta.url), "utf8");
  assert.doesNotMatch(index, /modules-menu/);
  assert.doesNotMatch(index, /id="quick-view-btn"/);
  assert.doesNotMatch(index, /id="settings-btn"/);
  assert.match(index, /id="account-chip"[^>]*aria-controls="settings-modal"/);
  assert.ok(appHome.includes('My Rotation. ${module.name}'));
  assert.match(app, /requestQuickView\(\)/);
  const practice = app.slice(app.indexOf("async function beginPracticeLoop"), app.indexOf("async function beginTimedChart"));
  assert.match(practice, /recordBackingConfig\(session\)/);
  assert.match(practice, /looping|recordBacking = true/);
  assert.doesNotMatch(practice, /monitor\.start|createFollower|finishRapid/);
  assert.match(app, /isPracticeLesson\(session\.lessonId\)\) return beginPracticeLoop/);
  const rapidPass = app.slice(app.indexOf("function recordRapidPass"), app.indexOf("function finishRapid"));
  assert.match(rapidPass, /recordPassIfNeeded\(\{ passed: true \}\)/);
  const pass = app.slice(app.indexOf("function recordPassIfNeeded"), app.indexOf("function gradeCurrentCard"));
  assert.match(pass, /isPracticeLesson\(session\.lessonId\)\) return/);
});

test("the module banner uses a chevron and Lesson 2 names the key above the staff", async () => {
  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  const appHome = await readFile(new URL("./app-home.js", import.meta.url), "utf8");
  const appWrapup = await readFile(new URL("./app-wrapup.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("../css/styles.css", import.meta.url), "utf8");
  const hig = await readFile(new URL("../css/hig.css", import.meta.url), "utf8");
  const appUi = `${app}\n${appHome}\n${appWrapup}`;
  assert.match(appHome, /banner-chevron/);
  assert.match(appHome, /d="M5\.5 9 12 16l6\.5-7"/);
  assert.doesNotMatch(appUi, /M9 5\.5 16 12l-7 6\.5/);
  assert.doesNotMatch(appWrapup, /wrapup-medal-panel|of 12 keys mastered/);
  assert.match(appWrapup, /sessionVinylTier/);
  assert.doesNotMatch(appUi, /medal-badge/);
  assert.match(styles, /\.banner-chevron/);
  assert.match(index, /id="session-module"/);
  assert.doesNotMatch(index, /id="staff-key"|id="session-key-count"/);
  assert.match(index, /id="start-key-label"[^>]*>Starting key/);
  assert.match(index, /id="start-key"/);
  assert.match(index, /id="all-keys-toggle"/);
  assert.match(index, /Cycle through selected keys/);
  assert.match(index, /id="all-keys-toggle"[^>]*aria-checked="false"/);
  assert.match(app, /aria-checked", String\(prefs\.allKeys === false\)/);
  assert.doesNotMatch(index, /id="guideTones"/);
  assert.match(hig, /\.group-row \{[^}]*padding:\s*var\(--space-3\) var\(--space-4\)/);
  assert.doesNotMatch(hig, /#setup-keys/);
  assert.doesNotMatch(index, /all-keys-row|start-key-row/);
  assert.match(index, /id="setup-keys"[^>]*hidden/);
  assert.match(app, /toggleSelectedKey/);
  assert.match(app, /setAllKeys/);
  assert.match(app, /displayMode, "major"\)/);
  assert.match(app, /els\.sessionKey\.hidden = !practice/);
  assert.match(app, /fillMusicLabel\(els\.sessionTitle/);
  assert.match(index, /js\/app\.js\?v=\d+/);
  assert.doesNotMatch(index, /\?v=145/);
});


test("current demo and record playback never use the retired guide-tone setting", () => {
  for (const lessonId of ["learn-lick", "master-lick", "cmar-integrate-blue-bossa"]) {
    for (const guideTones of [true, false]) {
      const session = createSession({ lessonId, guideTones });
      assert.equal(demoAudioConfig(session).includeGuides, false, lessonId);
      assert.equal(recordBackingConfig(session).includeGuides, false, lessonId);
    }
  }
});

test("previewed licks offer Add to My Rotation above the banner and match road content width", async () => {
  const appHome = await readFile(new URL("./app-home.js", import.meta.url), "utf8");
  const hig = await readFile(new URL("../css/hig.css", import.meta.url), "utf8");
  assert.match(appHome, /rotationAddButton/);
  assert.match(appHome, /add-to-rotation/);
  assert.match(appHome, /Add to My Rotation/);
  assert.match(appHome, /if \(!isInRotation\(module\.id\)\) header\.append\(rotationAddButton\(module\)\);\s*header\.append\(moduleBanner\(module\)\);/);
  assert.match(hig, /\.lesson-path \{[\s\S]*?--road-content-width:/);
  assert.match(hig, /\.related-licks-list \{[\s\S]*?width:\s*var\(--road-content-width\)/);
  assert.match(hig, /\.path-end,\s*\.path-end-next \{[\s\S]*?width:\s*var\(--road-content-width\)/);
});
