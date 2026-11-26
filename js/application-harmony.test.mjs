import test from "node:test";
import assert from "node:assert/strict";
import {
  describeApplicationHarmony,
  describeChartApplicationChoice,
  findDefinitionVariant,
  formatSessionApplicationLabel,
  groupChartApplications,
} from "./application-harmony.js";
import { transposeToneKey } from "./chord-tones.js";
import { getKey } from "./music.js";
import { LICKS, PRACTICE_CATALOG, applicationById, lessonById, lickById } from "./registry.js";

function chartChoiceInfo(moduleId, chartId, { concertKeyOverride = null, displayMode = "piano" } = {}) {
  const groups = PRACTICE_CATALOG.groups.filter((g) => g.moduleId === moduleId);
  const matches = groups.flatMap((group) =>
    group.choices.filter((choice) => choice.chartId === chartId).map((choice) => ({ group, choice })));
  return matches.map(({ group, choice }) => {
    const lesson = lessonById(choice.lessonId);
    const application = applicationById(lesson.applicationId);
    const lick = lickById(application.lickId);
    const { definition, variant } = findDefinitionVariant(
      application.workbookApplicationId,
      application.workbookVariantId,
    );
    const baseChart = PRACTICE_CATALOG.charts.find((c) => c.id === chartId);
    const concertKeyId = concertKeyOverride ?? lesson.defaultKeyId;
    const concertKey = getKey(concertKeyOverride ? concertKeyId : lesson.defaultKeyId);
    void baseChart;
    const info = describeChartApplicationChoice({
      definition,
      variant,
      lick,
      application,
      concertKey,
      displayMode,
    });
    return { group, choice, info };
  });
}

test("Cry Me a River on Recordame computes exact relative fractions, degrees, and concert pairings", () => {
  const items = chartChoiceInfo("cmar", "recordame");
  const byId = new Map(items.map((item) => [item.group.id, item.info]));

  assert.equal(byId.get("cmar:minor-home").top, "1m");
  assert.equal(byId.get("cmar:minor-home").bottom, "m7");
  assert.equal(byId.get("cmar:minor-home").degreesLabel, "9 · 1 · 5 · ♭3");
  assert.equal(byId.get("cmar:minor-home").line, "Am over Am7, Cm over Cm7 · bars 1, 5");

  assert.equal(byId.get("cmar:minor-fifth").top, "5m");
  assert.equal(byId.get("cmar:minor-fifth").bottom, "m7");
  assert.equal(byId.get("cmar:minor-fifth").degreesLabel, "13 · 5 · 9 · ♭7");
  assert.equal(byId.get("cmar:minor-fifth").line, "Em over Am7, Gm over Cm7 · bars 1, 5");

  assert.equal(byId.get("cmar:major-color").top, "6m");
  assert.equal(byId.get("cmar:major-color").bottom, "maj7");
  assert.equal(byId.get("cmar:major-color").degreesLabel, "7 · 6 · 3 · 1");
  assert.deepEqual(byId.get("cmar:major-color").concretePairs, [
    "Gm over B♭maj7",
    "Fm over A♭maj7",
    "E♭m over G♭maj7",
    "Dm over Fmaj7",
  ]);
  assert.equal(byId.get("cmar:major-color").line, "Gm over B♭maj7 (+3 more) · bars 9, 11, 13, 15");

  assert.equal(byId.get("cmar:lydian-major").top, "3m");
  assert.equal(byId.get("cmar:lydian-major").bottom, "maj7");
  assert.equal(byId.get("cmar:lydian-major").degreesLabel, "♯11 · 3 · 7 · 5");
  assert.deepEqual(byId.get("cmar:lydian-major").concretePairs, [
    "Dm over B♭maj7",
    "Cm over A♭maj7",
    "B♭m over G♭maj7",
    "Am over Fmaj7",
  ]);
  assert.equal(byId.get("cmar:lydian-major").line, "Dm over B♭maj7 (+3 more) · bars 9, 11, 13, 15");

  assert.equal(byId.get("cmar:altered-dominant").top, "♭2m");
  assert.equal(byId.get("cmar:altered-dominant").bottom, "7alt");
  assert.equal(byId.get("cmar:altered-dominant").degreesLabel, "♯9 · ♭9 · ♭13 · 3");
  assert.equal(byId.get("cmar:altered-dominant").line, "Fm over E7♯9 · bar 16");
});

test("Recordame transposition to E minor and tenor sax transposes concrete pairings accurately", () => {
  const delta = getKey("E").pc - getKey("A").pc;
  const transposed = PRACTICE_CATALOG.groups
    .filter((g) => g.moduleId === "cmar")
    .flatMap((group) => group.choices.filter((c) => c.chartId === "recordame").map((choice) => {
      const lesson = lessonById(choice.lessonId);
      const application = applicationById(lesson.applicationId);
      const lick = lickById(application.lickId);
      const { definition, variant } = findDefinitionVariant(
        application.workbookApplicationId,
        application.workbookVariantId,
      );
      const concertKey = getKey(transposeToneKey(lesson.defaultKeyId, delta));
      return [
        group.id,
        describeChartApplicationChoice({
          definition,
          variant,
          lick,
          application,
          concertKey,
          displayMode: "piano",
        }),
      ];
    }));
  const em = new Map(transposed);
  assert.equal(em.get("cmar:minor-fifth").line, "Bm over Em7, Dm over Gm7 · bars 1, 5");
  assert.equal(em.get("cmar:altered-dominant").line, "Cm over B7♯9 · bar 16");

  const tenor = new Map(chartChoiceInfo("cmar", "recordame", { displayMode: "tenor-sax" }).map((item) => [item.group.id, item.info]));
  assert.equal(tenor.get("cmar:minor-home").line, "Bm over Bm7, Dm over Dm7 · bars 1, 5");
  assert.equal(tenor.get("cmar:minor-fifth").line, "F♯m over Bm7, Am over Dm7 · bars 1, 5");
  assert.equal(tenor.get("cmar:altered-dominant").line, "Gm over F♯7♯9 · bar 16");
});

test("Special licks compute accurate relative shapes, degrees, and session labels", () => {
  const check = (wbApp, wbVar) => {
    const { definition, variant } = findDefinitionVariant(wbApp, wbVar);
    assert.ok(definition && variant, `${wbApp} / ${wbVar} exists`);
    return describeApplicationHarmony({ definition, variant, lick: lickById(definition.lickId) });
  };

  assert.equal(check("hsr:minor-fifth").compact, "5m / m7");
  assert.equal(check("hsr:halfdim").compact, "♭3m / ø7");
  assert.equal(check("hsr:altered-dominant", "original").compact, "5 alt / 7♭9");
  assert.equal(check("hsr:altered-dominant", "from-flat-seven").compact, "♭7 alt / 7alt");

  assert.equal(check("cbc:dominant").compact, "1 dom / 7");
  assert.equal(check("cbc:minor-ii").compact, "4 dom / m7");
  assert.equal(check("cbc:major-home").compact, "5 dom / maj7");
  assert.equal(check("cbc:lydian-major").compact, "6 dom / maj7");
  assert.equal(check("cbc:altered-dominant").compact, "♯4 dom / 7alt");

  assert.equal(check("1235:dominant", "root").compact, "1 maj / 7");
  assert.equal(check("1235:dominant", "ninth").compact, "2m / 7");
  assert.equal(check("1235:dominant", "fifth").compact, "5m / 7");
  assert.equal(check("1235:dominant", "flat-seven").compact, "♭7 maj / 7");
  assert.equal(check("1235:altered-dominant", "flat-six").compact, "♭6 maj / 7alt");
  assert.equal(check("1235:altered-dominant", "sharp-four").compact, "♯4 maj / 7alt");

  assert.equal(check("tisc:major-home", "minor-third").compact, "3m7 / maj7");
  assert.equal(check("tisc:minor-home", "flat-third").compact, "♭3△7 / m7");
  assert.equal(check("tisc:halfdim", "lydian-flat-five").compact, "♭5△♭5 / ø7");

  assert.equal(check("lg:lydian").compact, "1 Lyd / maj7");
  assert.equal(check("lg:dominant").compact, "♭7 Lyd / 7");
  assert.equal(check("lg:altered-dominant").compact, "3 Lyd / 7alt");
  assert.equal(check("lg:halfdim").compact, "♭5 Lyd / ø7");
  assert.equal(check("lg:dominant-flat-nine").compact, "♭2 Lyd / 7♭9");

  assert.equal(check("south-of-the-river-opening:lydian-major").compact, "5△7 / maj7");
  assert.equal(check("south-of-the-river-opening:minor-home").compact, "♭7△7 / m7");
  assert.equal(check("south-of-the-river-opening:dominant-sus").compact, "4△7 / 7sus");
  assert.equal(check("south-of-the-river-climb-and-landing:minor-home").compact, "♭6△7 / m7");
  assert.equal(check("south-of-the-river-climb-and-landing:major-home").compact, "4△7 / maj7");

  assert.equal(check("lotus-inspired:minor-cadence").compact, "1m / V7→i");
  assert.equal(check("se:dominant-targets", "third").compact, "→ 3 / 7");

  assert.equal(
    formatSessionApplicationLabel(applicationById("practice-cmar-minor-fifth-recordame")),
    "5m / m7 · Minor from the fifth",
  );
  assert.equal(
    formatSessionApplicationLabel(applicationById("minor-home")),
    "Minor home",
  );
});

test("groupChartApplications groups Cry Me a River matches by chord family", () => {
  const recordameGroups = groupChartApplications(chartChoiceInfo("cmar", "recordame"));
  assert.deepEqual(
    recordameGroups.map((s) => s.heading),
    ["Over minor", "Over major", "Over dominant"],
  );

  const autumnGroups = groupChartApplications(chartChoiceInfo("cmar", "autumn-leaves"));
  assert.deepEqual(
    autumnGroups.map((s) => s.heading),
    ["Over minor", "Over major", "Over dominant", "Over half-diminished"],
  );
});

test("Every application variant in PRACTICE_CATALOG produces clean, bounded fraction labels", () => {
  const licks = new Map(LICKS.map((l) => [l.id, l]));
  for (const definition of PRACTICE_CATALOG.definitions) {
    const lick = licks.get(definition.lickId);
    assert.ok(lick, `Missing lick ${definition.lickId}`);
    for (const variant of definition.variants) {
      const h = describeApplicationHarmony({ definition, variant, lick });
      assert.ok(h.top.length > 0 && h.top.length <= 10, `${definition.lickId}:${definition.id}/${variant.id} top="${h.top}"`);
      assert.ok(h.bottom.length > 0 && h.bottom.length <= 10, `${definition.lickId}:${definition.id}/${variant.id} bottom="${h.bottom}"`);
      assert.ok(h.compact.length > 0);
      assert.ok(h.spoken.length > 0);
      assert.ok(h.groupFamily.length > 0);
      assert.ok(h.groupHeading.length > 0);
      assert.equal(/undefined|NaN|null/.test(h.compact), false, `${definition.lickId}:${definition.id}/${variant.id}: ${h.compact}`);
    }
  }
});
