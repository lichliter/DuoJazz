import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildKeyQueue,
  createSession,
  currentKeyId,
  defaultPrefs,
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

test("lesson key counts are 1, 12, and 1", () => {
  const prefs = defaultPrefs();
  const learn = lessonSessionPlan("learn-lick", prefs);
  const master = lessonSessionPlan("master-lick", prefs);
  const tune = lessonSessionPlan("cmar-integrate-blue-bossa", prefs);
  assert.equal(buildKeyQueue(learn.keyMode, learn.startKeyId).length, 1);
  assert.equal(buildKeyQueue(master.keyMode, master.startKeyId).length, 12);
  assert.equal(buildKeyQueue(tune.keyMode, tune.startKeyId).length, 1);
  assert.equal(lessonById("learn-lick").kind, "learn");
  assert.equal(lessonById("master-lick").kind, "master");
  assert.equal(lessonById("cmar-integrate-blue-bossa").kind, "integrate");
  assert.equal(MODULES[0].lessons[1].id, "master-lick");
  assert.equal(MODULES[0].lessons[1].number ?? MODULES[0].lessons[1].title, "Master the lick");
});

test("Master starts at the default key and follows the cycle type", () => {
  const fourths = lessonSessionPlan("master-lick", defaultPrefs());
  const fourthsQueue = buildKeyQueue(fourths.keyMode, fourths.startKeyId);
  assert.equal(fourths.keyMode, "fourths");
  assert.equal(fourthsQueue[0], "G");
  assert.equal(fourthsQueue[1], "C");

  const chromatic = lessonSessionPlan("master-lick", { ...defaultPrefs(), keyMode: "chromatic", startKeyId: "C" });
  const chromaticQueue = lickKeyQueue(chromatic.keyMode, chromatic.majorKeyId, "minor");
  assert.equal(chromatic.keyMode, "chromatic");
  assert.equal(chromatic.majorKeyId, "C");
  assert.equal(chromatic.startKeyId, "A");
  assert.deepEqual(chromaticQueue.slice(0, 4), ["A", "Ab", "G", "Gb"]);

  const fromF = lessonSessionPlan("emr-master", { ...defaultPrefs(), keyMode: "fourths", startKeyId: "F" });
  assert.equal(fromF.majorKeyId, "F");
  assert.equal(fromF.startKeyId, "D");
  assert.equal(lickKeyQueue(fromF.keyMode, fromF.majorKeyId, "minor")[0], "D");
  assert.equal(sessionShowsCycle(createSession({ lessonId: "master-lick", ...fourths })), true);
  assert.equal(sessionShowsCycle(createSession({ lessonId: "learn-lick", keyMode: "one", startKeyId: "G" })), false);
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
  assert.equal(learn.keyMode, "one");
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

test("settings modal opens from the summary pill and closes from the X and the backdrop", async () => {
  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  assert.match(index, /id="home-summary"[^>]*aria-haspopup="dialog"/);
  assert.match(index, /class="home-summary-icon"/);
  assert.doesNotMatch(index, /id="settings-btn"/);
  assert.doesNotMatch(index, /id="card-sets"/);
  assert.match(index, /id="settings-modal"/);
  assert.match(index, /id="settings-close"[^>]*aria-label="Close"/);
  assert.doesNotMatch(index, /id="app-tab-bar"/);
  assert.doesNotMatch(index, /id="home-mode"/);
  assert.match(app, /els\.homeSummary\?\.addEventListener\("click", \(\) => openSettings\(\)\)/);
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
  assert.match(app, /kind === "master" && !notesRevealed/);
  assert.doesNotMatch(app, /Hide notes/);
  assert.match(app, /notesShown: notesPeeked/);
  const pass = app.slice(app.indexOf("function recordRapidPass"), app.indexOf("function finishRapid"));
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

test("one card on Master auto-advances across all 12 keys, then wraps up", () => {
  let session = createSession({
    lessonId: "master-lick",
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
  assert.equal(session.screen, "wrapup");
  assert.equal(new Set(seen).size, 12);
  assert.deepEqual(seen.slice().sort(), TWELVE_KEY_IDS.slice().sort());
  let mastery = emptyMastery();
  mastery = recordQuizPass(mastery, "master-lick", "G");
  assert.equal(isKeyMastered(mastery, "G", "cmar"), true);
});

test("createAndShow and a bare Master session both run 12 keys from the default key", () => {
  const bare = createSession({ lessonId: "master-lick", instrumentId: "trombone" });
  assert.equal(bare.keyQueue.length, 12);
  assert.equal(bare.keyMode, "fourths");
  assert.equal(bare.keyQueue[0], "G");
  const prefs = { ...defaultPrefs(), keyMode: "chromatic", startKeyId: "F" };
  const planned = sessionCreateArgs("master-lick", prefs, { instrumentId: "trombone" });
  const launched = createSession({ instrumentId: "trombone", ...planned });
  assert.equal(launched.keyQueue.length, 12);
  assert.equal(launched.keyMode, "chromatic");
  assert.equal(launched.keyQueue[0], "D");
  assert.deepEqual(launched.keyQueue.slice(0, 4), ["D", "Db", "C", "B"]);
});

test("tune lessons are ungraded practice after Learn and Master", () => {
  assert.equal(isPracticeLesson("cmar-integrate-blue-bossa"), true);
  assert.equal(isPracticeLesson("learn-lick"), false);
  assert.equal(isPracticeLesson("master-lick"), false);
  const nodes = moduleRoadNodes(MODULES[0], defaultPrefs(), {});
  assert.equal(nodes[0].number, "01");
  assert.equal(nodes[1].number, "02");
  assert.ok(nodes.slice(2).every((node) => node.number === "Practice" && node.practice));
  assert.equal(moduleLessonsComplete(MODULES[0], {
    "learn-lick": ["G"],
    "master-lick": TWELVE_KEY_IDS,
  }), true);
  assert.equal(lessonById("cmar-integrate-blue-bossa").kind, "integrate");
});

test("home shares one side gutter and an even stack", async () => {
  const styles = await readFile(new URL("../css/styles.css", import.meta.url), "utf8");
  const hig = await readFile(new URL("../css/hig.css", import.meta.url), "utf8");
  const session = await readFile(new URL("./session.js", import.meta.url), "utf8");
  assert.match(hig, /\.app-shell\[data-screen="home"\] \.masthead,\s*\.app-shell\[data-screen="home"\] \.workspace \{[^}]*2 \* var\(--margin-regular\)/);
  assert.match(hig, /\.home-settings \{[^}]*margin:\s*0;/);
  assert.match(styles, /#screen-home \{[^}]*gap:\s*var\(--space-5\)/);
  assert.match(styles, /\.lesson-path \{[^}]*padding:\s*0 0 1\.1rem/);
  assert.doesNotMatch(styles, /outline:\s*2px solid var\(--accent\)/);
  assert.doesNotMatch(session, /export const CARD_SETS/);
  assert.doesNotMatch(session, /export const STUDY_MODES/);
});

test("the lick banner opens the module list and the hamburger is gone", async () => {
  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  assert.doesNotMatch(index, /modules-menu/);
  assert.doesNotMatch(index, /id="quick-view-btn"/);
  assert.doesNotMatch(index, /id="settings-btn"/);
  assert.match(index, /id="home-summary"[^>]*aria-controls="settings-modal"/);
  assert.match(app, /aria-label", `Choose a lick\. \$\{module\.name\}`/);
  assert.match(app, /requestQuickView\(\)/);
  const practice = app.slice(app.indexOf("async function beginPracticeLoop"), app.indexOf("async function beginListening"));
  assert.match(practice, /recordBackingConfig\(session\)/);
  assert.match(practice, /looping|recordBacking = true/);
  assert.doesNotMatch(practice, /monitor\.start|createFollower|finishRapid/);
  assert.match(app, /isPracticeLesson\(session\.lessonId\)\) return beginPracticeLoop/);
  const pass = app.slice(app.indexOf("function recordRapidPass"), app.indexOf("function finishRapid"));
  assert.match(pass, /isPracticeLesson\(session\.lessonId\)\) return/);
});

test("the module banner uses a chevron and Lesson 2 names the key above the staff", async () => {
  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("../css/styles.css", import.meta.url), "utf8");
  const hig = await readFile(new URL("../css/hig.css", import.meta.url), "utf8");
  assert.match(app, /banner-chevron/);
  assert.match(app, /of 12 keys mastered/);
  assert.doesNotMatch(app, /medal-badge/);
  assert.match(styles, /\.banner-chevron/);
  assert.match(index, /id="staff-key"/);
  assert.match(index, /id="start-key-label"[^>]*>Starting key/);
  assert.match(index, /id="start-key"/);
  assert.match(index, /id="all-keys-toggle"/);
  assert.match(index, /Cycle through all keys/);
  assert.match(hig, /\.group-row \{[^}]*padding:\s*var\(--space-3\) var\(--space-4\)/);
  assert.doesNotMatch(hig, /#setup-keys/);
  assert.doesNotMatch(index, /all-keys-row|start-key-row/);
  assert.match(index, /id="setup-keys"[^>]*hidden/);
  assert.match(app, /toggleSelectedKey/);
  assert.match(app, /setAllKeys/);
  assert.match(app, /displayMode, "major"\)/);
  assert.match(app, /els\.staffKey\.hidden = !cycling/);
  assert.match(app, /fillMusicLabel\(\s*els\.staffKeyName/);
  assert.match(index, /\?v=146/);
  assert.doesNotMatch(index, /\?v=145/);
});
