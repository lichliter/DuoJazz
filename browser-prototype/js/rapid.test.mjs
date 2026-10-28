import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  CELEBRATE_MS,
  READ_MS,
  RETRY_MS,
  afterFail,
  afterPass,
  passSchedule,
  pausePosition,
  rapidFireButton,
  rapidMicStep,
  shouldRecordMastery,
} from "./rapid.js";
import { createSession, currentKeyId, normalizePrefs } from "./session.js";
import { emptyMastery, isKeyMastered, lessonPassedKeys, recordLearnPass, recordQuizPass } from "./medals.js";

function cycle() {
  return createSession({
    lessonId: "learn-lick",
    keyMode: "fourths",
    startKeyId: "G",
    studyMode: "practice",
  });
}

test("auto on advances after a pass and listens again", () => {
  const session = cycle();
  const next = afterPass(session, { auto: true });
  assert.equal(next.autoStart, true);
  assert.equal(next.phase, "listening");
  assert.equal(next.session.screen, "session");
  assert.equal(currentKeyId(next.session), "C");
  assert.equal(next.session.keyIndex, 1);
});

test("auto off advances after a pass and waits for Play", () => {
  const next = afterPass(cycle(), { auto: false });
  assert.equal(next.autoStart, false);
  assert.equal(next.phase, "idle");
  assert.equal(currentKeyId(next.session), "C");
});

test("a fail re-arms the same key", () => {
  const session = { ...cycle(), keyIndex: 3 };
  const on = afterFail(session, { auto: true, hint: "3rd note" });
  assert.equal(on.autoStart, true);
  assert.equal(on.keyIndex, 3);
  assert.equal(currentKeyId(on.session), currentKeyId(session));
  assert.equal(on.hint, "3rd note");
  assert.equal(on.session.screen, "session");

  const off = afterFail(session, { auto: false, hint: "3rd note" });
  assert.equal(off.autoStart, false);
  assert.equal(off.phase, "idle");
  assert.equal(off.keyIndex, 3);
});

test("pause keeps the key", () => {
  const session = { ...cycle(), keyIndex: 4 };
  const paused = pausePosition(session);
  assert.equal(paused.autoStart, false);
  assert.equal(paused.phase, "idle");
  assert.equal(paused.keyIndex, 4);
  assert.equal(paused.keyId, currentKeyId(session));
  assert.equal(paused.session.screen, "session");
});

test("the last key wraps up once, and a one-key pass does too", () => {
  const last = { ...cycle(), keyIndex: 11 };
  const done = afterPass(last, { auto: true });
  assert.equal(done.session.screen, "wrapup");
  assert.equal(done.autoStart, false);
  assert.equal(currentKeyId(done.session), "D");
  assert.equal(done.session.lap, 1);

  const one = createSession({ lessonId: "learn-lick", keyMode: "one", startKeyId: "F" });
  const wrapped = afterPass(one, { auto: true });
  assert.equal(wrapped.session.screen, "wrapup");
  assert.equal(wrapped.autoStart, false);
  assert.equal(currentKeyId(wrapped.session), "F");
});

test("Play toggles to Pause only while listening", () => {
  assert.equal(rapidFireButton({}).label, "Play");
  assert.equal(rapidFireButton({}).id, "play");
  assert.equal(rapidFireButton({ listening: true }).label, "Pause");
  assert.equal(rapidFireButton({ listening: true }).id, "pause");
  assert.equal(CELEBRATE_MS, 2000);
  assert.equal(READ_MS, 500);
  assert.ok(RETRY_MS >= 500);
});

test("a pass celebrates, shows the next lick, then listens when Auto is on", () => {
  const plan = passSchedule(cycle(), { auto: true });
  assert.deepEqual(plan.steps.map((step) => step.phase), ["celebrate", "reveal", "listening"]);
  assert.equal(plan.steps[0].ms, 2000);
  assert.equal(plan.steps[0].keyId, "G");
  assert.equal(plan.steps[1].ms, 500);
  assert.equal(plan.steps[1].keyId, "C");
  assert.equal(plan.steps[1].screen, "session");
  assert.equal(plan.steps[2].autoStart, true);
  assert.equal(plan.autoStart, true);
  assert.equal(plan.session.screen, "session");
  assert.equal(currentKeyId(plan.session), "C");
});

test("Auto off shows the next lick and waits", () => {
  const plan = passSchedule(cycle(), { auto: false });
  assert.equal(plan.steps[0].ms, 2000);
  assert.equal(plan.steps[1].phase, "reveal");
  assert.equal(plan.steps[1].ms, 0);
  assert.equal(plan.steps[1].keyId, "C");
  assert.equal(plan.steps[2].phase, "idle");
  assert.equal(plan.steps[2].autoStart, false);
  assert.equal(plan.autoStart, false);
});

test("tapping the celebration skips it and still leaves a beat before listening", () => {
  const plan = passSchedule(cycle(), { auto: true, skip: true });
  assert.equal(plan.steps[0].phase, "celebrate");
  assert.equal(plan.steps[0].ms, 0);
  assert.equal(plan.steps[1].phase, "reveal");
  assert.equal(plan.steps[1].ms, 500);
  assert.equal(plan.steps[2].phase, "listening");
});

test("pause during the celebration advances and does not arm listening", () => {
  const plan = passSchedule(cycle(), { auto: true, pause: true });
  assert.equal(plan.steps[0].ms, 0);
  assert.equal(plan.steps[1].keyId, "C");
  assert.equal(plan.steps[2].phase, "idle");
  assert.equal(plan.autoStart, false);
  assert.equal(plan.session.keyIndex, 1);
});

test("the last key reaches wrap-up after the celebration", () => {
  const last = { ...cycle(), keyIndex: 11 };
  const plan = passSchedule(last, { auto: true });
  assert.equal(plan.steps[0].phase, "celebrate");
  assert.equal(plan.steps[0].ms, CELEBRATE_MS);
  assert.equal(plan.steps[0].keyId, "D");
  assert.equal(plan.steps.at(-1).phase, "wrapup");
  assert.equal(plan.steps.at(-1).ms, 0);
  assert.equal(plan.session.screen, "wrapup");
  assert.equal(plan.autoStart, false);
  assert.equal(currentKeyId(plan.session), "D");
});

test("try again stays on the key with no celebration", () => {
  const failed = afterFail(cycle(), { auto: true, hint: "2nd note" });
  assert.equal(failed.phase, "listening");
  assert.equal(failed.keyId, "G");
  assert.equal(failed.autoStart, true);
});

test("the mic opens once and later attempts only reset the follower", () => {
  assert.equal(rapidMicStep(false, "attempt"), "open");
  assert.equal(rapidMicStep(true, "attempt"), "reset");
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal(rapidMicStep(attempt > 0, "attempt"), attempt === 0 ? "open" : "reset");
  }
  for (const reason of ["pause", "hear", "leave", "wrapup", "hide"]) {
    assert.equal(rapidMicStep(true, reason), "release");
    assert.equal(rapidMicStep(false, reason), "release");
  }
});

test("rapid fire keeps one mic open and releases it on pause, hear, leave, wrap-up, and hide", async () => {
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("../css/styles.css", import.meta.url), "utf8");
  const begin = app.slice(app.indexOf("async function beginListening"), app.indexOf("function resetPitchTake"));
  const finish = app.slice(app.indexOf("function finishRapid"), app.indexOf("async function beginListening"));
  assert.equal(begin.includes("monitor.stop("), false);
  assert.match(begin, /step === "reset"\) monitor\.reset\(\)/);
  assert.match(begin, /processing:\s*false/);
  assert.equal(finish.split("monitor.stop(").length - 1, 1);
  assert.match(finish, /"wrapup"/);
  assert.match(finish, /step === "release"/);
  assert.match(app, /releaseMic\("pause"\)/);
  assert.match(app, /releaseMic\("hear"\)/);
  assert.match(app, /releaseMic\("leave"\)/);
  assert.match(app, /releaseMic\("hide"\)/);
  assert.match(app, /pagehide/);
  assert.match(app, /visibilitychange/);
  assert.match(app, /await monitor\.start\(transport\.ctx\);/);
  assert.equal(app.match(/processing:\s*false/g)?.length, 1);
  assert.match(app, /debugTextForKey\(lastDebug, currentKeyId\(session\), fresh\)/);
  assert.match(app, /classList\.remove\("is-stop"\)/);
  assert.match(styles, /\.play-round\[data-action="pause"\] \.play-round-icon \{[^}]*linear-gradient\(currentColor, currentColor\) left center/);
  assert.doesNotMatch(styles, /data-action="pause"\] \.play-round-icon,\s*\n\.play-round\[data-action="stop"\]/);
  const pass = finish.slice(finish.indexOf("if (passed)"), finish.indexOf("const failed"));
  assert.match(pass, /phase: "celebrate"|rapidPhase = "celebrate"/);
  assert.match(pass, /CELEBRATE_MS/);
  assert.doesNotMatch(pass, /beginListening\(/);
  assert.match(app, /READ_MS/);
  assert.match(app, /passSchedule\(/);
  const fail = finish.slice(finish.indexOf("const failed"), finish.indexOf("finishing = false;\n}"));
  assert.match(fail, /RETRY_MS/);
  assert.doesNotMatch(fail, /celebrate/);
});

test("octave up is the first control, the label is between, and octave down is last", async () => {
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("../css/styles.css", import.meta.url), "utf8");
  const hig = await readFile(new URL("../css/hig.css", import.meta.url), "utf8");
  const fn = app.slice(app.indexOf("function renderSessionOctave"), app.indexOf("function applyMelodyOctave"));
  assert.match(fn, /replaceChildren\(up, label, down\)/);
  assert.match(fn, /dataset\.testid = "octave-up"/);
  assert.match(fn, /dataset\.testid = "octave-down"/);
  assert.match(fn, /textContent = "Octave"/);
  const octaveRule = hig.slice(hig.indexOf(".session-octave {"), hig.indexOf(".octave-label"));
  assert.match(octaveRule, /flex-direction:\s*column/);
  assert.match(styles, /\.session-octave \.chip \{[^}]*min-width:\s*var\(--tap\)/);
  assert.match(styles, /\.session-octave \.chip \{[^}]*min-height:\s*var\(--tap\)/);
  assert.match(await readFile(new URL("../css/tokens.css", import.meta.url), "utf8"), /--tap:\s*44px/);
  assert.match(hig, /@media \(prefers-reduced-motion: reduce\) \{\s*\.celebrate-check \{\s*animation: celebrate-fade[^;]*!important;/);
});

test("mastery is recorded only for a Practice pass", () => {
  const practice = createSession({ lessonId: "learn-lick", studyMode: "practice", startKeyId: "G" });
  const learn = createSession({ lessonId: "learn-lick", studyMode: "learn", startKeyId: "G" });
  assert.equal(shouldRecordMastery(practice, true), true);
  assert.equal(shouldRecordMastery(practice, false), false);
  assert.equal(shouldRecordMastery(learn, true), false);

  let mastery = emptyMastery();
  assert.equal(shouldRecordMastery(learn, true), false);
  mastery = recordLearnPass(mastery, learn.lessonId, "G");
  mastery = recordLearnPass(mastery, "integrate-minor-home", "G");
  assert.equal(isKeyMastered(mastery, "G"), false);
  assert.deepEqual(lessonPassedKeys(mastery, "learn-lick"), []);

  assert.equal(shouldRecordMastery(practice, true), true);
  assert.equal(shouldRecordMastery(practice, true, { notesShown: true }), false);
  assert.equal(shouldRecordMastery(practice, true, { notesShown: false }), true);
  mastery = recordQuizPass(mastery, practice.lessonId, "G");
  mastery = recordQuizPass(mastery, "integrate-minor-home", "G");
  assert.equal(isKeyMastered(mastery, "G"), true);
  assert.deepEqual(lessonPassedKeys(mastery, "learn-lick"), ["G"]);
});

test("Auto is remembered globally and defaults on", () => {
  assert.equal(normalizePrefs({}).auto, true);
  assert.equal(normalizePrefs({ auto: false }).auto, false);
  assert.equal(normalizePrefs({ auto: true }).auto, true);
});

test("practice can reveal notes, and the celebration check is a large SVG", async () => {
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const hig = await readFile(new URL("../css/hig.css", import.meta.url), "utf8");
  assert.match(index, /id="show-notes"[^>]*>Show notes</);
  assert.match(index, /<svg class="celebrate-check"/);
  assert.match(hig, /\.celebrate-check \{[^}]*height:\s*35vmin/);
  assert.match(hig, /\.celebrate-key \{[^}]*font-size:\s*28px/);
  assert.match(app, /notesShown: notesPeeked/);
  assert.match(app, /notesRevealed = false/);
  assert.match(app, /studyMode !== "practice"/);
  const pass = app.slice(app.indexOf("function recordRapidPass"), app.indexOf("function finishRapid"));
  assert.match(pass, /recordLearnPass/);
  assert.match(pass, /recordQuizPass/);
});
