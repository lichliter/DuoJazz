import test from "node:test";
import assert from "node:assert/strict";
import { MODULES, PRACTICE_CATALOG, lessonById, applicationById, spotsFor, formById } from "./registry.js";
import { chartChoices, loadMyCharts, normalizeMyCharts } from "./practice-catalog.js";
import { createSession, recordBackingConfig, demoAudioConfig, lessonSessionPlan, defaultPrefs } from "./session.js";
import { livePlaybackEvents } from "./sound-band.js";
import { phraseEvents } from "./music.js";

test("all thirty licks have application groups with real playable placements", () => {
  const prefs = defaultPrefs();
  for (const module of MODULES) {
    const groups = PRACTICE_CATALOG.groups.filter((group) => group.moduleId === module.id);
    assert.ok(groups.length, module.id);
    for (const group of groups) {
      assert.ok(group.variants.every((variant) => lessonById(variant.exampleLessonId).id === variant.exampleLessonId), group.id);
      assert.equal(new Set(group.choices.map((choice) => `${choice.chartId}:${choice.variantId}`)).size, group.choices.length);
      for (const choice of group.choices) {
        const lesson = lessonById(choice.lessonId);
        assert.equal(lesson.id, choice.lessonId);
        assert.equal(lesson.practiceApplicationId, group.id);
        const app = applicationById(lesson.applicationId);
        assert.equal(app.id, lesson.applicationId);
        const length = formById(app.formId).bars.length;
        assert.ok(spotsFor(app.id).every((spot) => spot.bar > 0 && spot.bar <= length));
        const plan = lessonSessionPlan(lesson.id, prefs);
        const session = createSession({ lessonId: lesson.id, ...plan });
        const demo = livePlaybackEvents(demoAudioConfig(session));
        assert.ok(demo.some((event) => event.type === "melody"), choice.lessonId);
        assert.ok(livePlaybackEvents(recordBackingConfig(session)).every((event) => event.type !== "melody"));
      }
    }
  }
});

test("Autumn Leaves supports distinct CMAR minor-home and altered-dominant passages", () => {
  for (const [use, bar, anchor] of [["minor-home", 7, 0], ["altered-dominant", 6, -4]]) {
    const group = PRACTICE_CATALOG.groups.find((item) => item.id === `cmar:${use}`);
    const choice = group.choices.find((item) => item.chartId === "autumn-leaves");
    const app = applicationById(lessonById(choice.lessonId).applicationId);
    assert.ok(spotsFor(app.id).some((spot) => spot.bar === bar && spot.anchorInterval === anchor));
  }
});

test("mixed-use passages contain only the selected application on staff and in audio", () => {
  for (const use of ["minor-ii", "altered-dominant"]) {
    const group = PRACTICE_CATALOG.groups.find((item) => item.id === `hsr:${use}`);
    const choice = group.choices.find((item) => item.chartId === "take-the-a-train");
    const app = applicationById(lessonById(choice.lessonId).applicationId);
    const spots = spotsFor(app.id);
    assert.ok(spots.some((spot) => spot.bar === (use === "minor-ii" ? 5 : 6)));
    assert.ok(spots.every((spot) => spot.elements[2].interval === (use === "minor-ii" ? -5 : -6)));
    const session = createSession({ lessonId: choice.lessonId });
    const melody = livePlaybackEvents(demoAudioConfig(session)).filter((event) => event.type === "melody");
    assert.deepEqual(melody.map((event) => event.beat), phraseEvents(app.id).map((note) => note.beat));
  }
});

test("favorite charts are filtered by application and other matches remain suggested", () => {
  const group = PRACTICE_CATALOG.groups.find((item) => item.id === "cmar:altered-dominant");
  assert.deepEqual(chartChoices(group, ["autumn-leaves"]).yours.map((choice) => choice.chartId), ["autumn-leaves"]);
  assert.deepEqual(chartChoices(group, ["autumn-leaves"]).suggested, group.choices.filter(choice => choice.chartId !== "autumn-leaves"));
  assert.deepEqual(chartChoices(group, ["so-what"]).yours, []);
  assert.deepEqual(chartChoices(group, ["so-what"]).suggested, group.choices);
  assert.deepEqual(chartChoices(group, []).suggested, group.choices);
});

test("suggestions stay below favorites without duplicating selected charts", () => {
  const group = { choices: [{ chartId: "first" }, { chartId: "second" }, { chartId: "third" }] };
  assert.deepEqual(chartChoices(group, ["second"]), {
    yours: [group.choices[1]], suggested: [group.choices[0], group.choices[2]],
  });
});

test("chart selection survives reload and safely handles malformed or blocked storage", () => {
  const charts = PRACTICE_CATALOG.charts;
  assert.deepEqual(normalizeMyCharts(["autumn-leaves", "missing", "autumn-leaves"], charts), ["autumn-leaves"]);
  assert.deepEqual(loadMyCharts(charts, { getItem: () => '["autumn-leaves"]' }), ["autumn-leaves"]);
  assert.deepEqual(loadMyCharts(charts, { getItem: () => '{' }), []);
  assert.deepEqual(loadMyCharts(charts, { getItem: () => { throw Error("blocked"); } }), []);
});
