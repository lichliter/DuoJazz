import test from "node:test";
import assert from "node:assert/strict";
import { LICKS, MODULES, PRACTICE_CATALOG, applicationById, lessonById, formById } from "./registry.js";
import { matchApplication, variantSoundEnd } from "./practice-catalog.js";
import { phraseEvents, phraseNotes, getKey } from "./music.js";
import { createSession, demoAudioConfig } from "./session.js";
import { livePlaybackEvents } from "./sound-band.js";
import { chorusStaffMEI } from "./mei.js";

const group = (id) => PRACTICE_CATALOG.groups.find((item) => item.id === id);
const pitches = (variant) => variant.elements.filter((el) => el.type === "note").map((el) => el.interval);

test("all thirty teaching pages have an explicit, sourced application inventory", () => {
  const counts = [6, 2, 2, 7, 7, 3, 3, 2, 4, 1, 6, 4, 8, 3, 2, 5, 6, 1, 2, 3, 1, 6, 7, 4, 4, 3, 6, 3, 4, 2];
  for (const [index, module] of MODULES.slice(1, 31).entries()) {
    const definitions = PRACTICE_CATALOG.definitions.filter((item) => item.lickId === module.id);
    assert.equal(definitions.length, counts[index], module.id);
    assert.ok(definitions.every((item) => [index * 2 + 1, index * 2 + 2].includes(item.page)), module.id);
  }
  assert.equal(PRACTICE_CATALOG.groups.filter(g => g.page != null).length, 117);
  assert.equal(PRACTICE_CATALOG.groups.filter(g => g.page != null).reduce((n, g) => n + g.variants.length, 0), 204);
  assert.equal(new Set(PRACTICE_CATALOG.lessons.map((item) => item.id)).size, PRACTICE_CATALOG.lessons.length);
});

test("Bread and Butter's three uses have the workbook's actual pitch relationships", () => {
  const major = group("bb:major-home").variants[0];
  const minor = group("bb:minor-home").variants[0];
  const dominant = group("bb:dominant").variants[0];
  const majorApp = applicationById(major.exampleLessonId);
  const minorApp = applicationById(minor.exampleLessonId);
  const domApp = applicationById(dominant.exampleLessonId);
  assert.deepEqual(phraseEvents(majorApp.id).map((note) => note.interval), [7, 9, 11, 14, 11, 12, 16, 19]);
  assert.deepEqual(phraseEvents(minorApp.id).map((note) => note.interval), [7, 9, 11, 14, 11, 12, 16, 19]);
  assert.equal(formById(minorApp.formId).bars[0].chords[0].intervalFromTonic, 2); // C shape over Dm.
  assert.deepEqual(phraseEvents(domApp.id).map((note) => note.interval), [10, 12, 14, 17, 14, 16, 19, 22]);
  // In G7: F–G–A–C followed by A–B–D–F (third-inversion Bø7).
  assert.deepEqual(phraseEvents(domApp.id).map((note) => (note.interval + 7) % 12), [5, 7, 9, 0, 9, 11, 2, 5]);
});

test("quality changes preserve chromatic approaches instead of blindly transposing", () => {
  const variant = (id, index = 0) => group(id).variants[index];
  const appPitches = (id, index = 0) => pitches(applicationById(variant(id, index).exampleLessonId).spots[0]);
  assert.deepEqual(appPitches("1235:minor-home"), [0, 2, 3, 7]);
  assert.deepEqual(appPitches("1235:minor-home", 1), [7, 3, 2, 0]);
  assert.deepEqual(appPitches("tisc:halfdim"), [10, 12, 15, 18, 22]);
  assert.deepEqual(appPitches("tisc:halfdim", 1), [11, 12, 15, 18, 22]);
  assert.deepEqual(appPitches("ntp:major-home"), [12, 11, 12, 14, 16, 15, 16, 17, 19]);
  assert.deepEqual(appPitches("ntp:halfdim"), [12, 11, 12, 13, 15, 14, 15, 17, 18]);
  assert.deepEqual(appPitches("mp:major-home"), [0, 2, 4, 5, 7, 4, 2, 0]);
});

test("continuation-page uses retain their distinct notes and source pages", () => {
  const examplePitches = (id, version = 0) => pitches(applicationById(group(id).variants[version].exampleLessonId).spots[0]);
  assert.equal(group("emr:major-resolution").page, 4);
  assert.equal(examplePitches("emr:major-resolution").at(-1), 14);
  assert.equal(group("dlr:minor-resolution").page, 16);
  assert.equal(examplePitches("dlr:minor-resolution").at(-1), 15);
  assert.deepEqual(examplePitches("cbc:halfdim"), [7, 6, 5, 8, 3, 2]);
  assert.deepEqual(examplePitches("ae:minor-cell"), [7, 5, 0, 2, 3]);
  assert.deepEqual(examplePitches("ae:halfdim-cell"), [6, 5, 0, 1, 3]);
  const acvl = examplePitches("acvl:dominant-ii-v-i");
  assert.deepEqual(acvl.slice(0, 8), [14, 18, 21, 13, 18, 21, 12, 18]);
  assert.equal(acvl[9], 17); // The V chord's flat seventh is not raised.
  const body = group("dct:major-home").variants.find((v) => v.id === "two-bar-body");
  assert.equal(body.page, 46);
  assert.equal(pitches(applicationById(body.exampleLessonId).spots[0]).length, 16);
  const cell = group("jcdp:altered-dominant").variants.find((v) => v.id === "one-bar-0");
  assert.equal(cell.page, 28);
  assert.equal(pitches(applicationById(cell.exampleLessonId).spots[0]).length, 8);
});

test("matcher requires the whole harmonic window, rejects short holds and wrong destinations", () => {
  const chord = (root, quality, durationBeats = 4) => ({ intervalFromTonic: root, quality, durationBeats });
  const form = (...bars) => ({ bars: bars.map((chords) => ({ chords })) });
  const majorBb = PRACTICE_CATALOG.definitions.find((d) => d.lickId === "bb" && d.id === "major-home").variants[0];
  const halfMajor = form([chord(0, "major7", 2), chord(7, "dominant7", 2)]);
  assert.equal(matchApplication(halfMajor, majorBb).length, 0);
  const secondHalf = form([chord(7, "dominant7", 2), chord(0, "major7", 2)], [chord(0, "major7")]);
  const spots = matchApplication(secondHalf, majorBb);
  assert.equal(spots.length, 1);
  assert.equal(spots[0].beatOffset, 2);
  const ae = PRACTICE_CATALOG.definitions.find((d) => d.lickId === "ae" && d.id === "altered-dominant").variants[0];
  assert.equal(matchApplication(form([chord(7, "dominant7", 2), chord(0, "minor7", 2)]), ae).length, 0);
  assert.equal(matchApplication(form([chord(7, "dominant7", 2), chord(0, "major7", 2)]), ae).length, 1);
  const dct = PRACTICE_CATALOG.definitions.find((d) => d.lickId === "dct" && d.id === "major-home").variants[0];
  assert.equal(matchApplication(form([chord(0, "major7")], [chord(0, "major7")], [chord(5, "minor7")]), dct).length, 0);
  const acvl = PRACTICE_CATALOG.definitions.find((d) => d.lickId === "acvl" && d.id === "ii-v-i").variants[0];
  const longIi = form([chord(2, "minor7")], [chord(2, "minor7")], [chord(7, "dominant7")], [chord(0, "major7")]);
  assert.deepEqual(matchApplication(longIi, acvl).map((spot) => spot.bar), [2]);
});

test("all 204 versions are playable examples with matching notation and selected-instrument audio", () => {
  for (const definition of PRACTICE_CATALOG.definitions) {
    for (const variant of definition.variants) {
      assert.ok(variant.elements.every((el) => el.beats > 0 && (el.type !== "note" || Number.isFinite(el.interval))));
      assert.ok(variantSoundEnd(variant) <= variant.pattern.reduce((sum, chord) => sum + chord.beats, 0) + 1e-6, `${definition.lickId}:${definition.id}:${variant.id}`);
      const publicGroup = group(`${definition.lickId}:${definition.id}`);
      const example = publicGroup.variants.find((item) => item.id === variant.id);
      const app = applicationById(example.exampleLessonId);
      for (const keyId of ["C", "G", "F#"]) {
        const session = createSession({ lessonId: example.exampleLessonId, startKeyId: keyId });
        const config = demoAudioConfig(session);
        const melody = livePlaybackEvents(config).filter((event) => event.type === "melody");
        const written = phraseNotes(config.concertKey, config.displayMode, app.id, config.melodyRegister);
        assert.deepEqual(melody.map((event) => event.midi), written.map((note) => note.concertMidi), app.id);
        assert.deepEqual(melody.map((event) => event.beat), written.map((note) => note.startBeat), app.id);
        assert.ok(melody.every((event) => event.role === "phrase"));
      }
      const mei = chorusStaffMEI({ concertKey: getKey("C"), displayMode: "concert", applicationId: app.id, mode: "landing" });
      const attacks = (mei.match(/<note\b[^>]*>/g) ?? []).filter((tag) => !tag.includes('type="slash"') && !/tie="[tm]"/.test(tag));
      assert.equal(attacks.length, variant.elements.filter((el) => el.type === "note").length, app.id);
    }
  }
});

test("half-bar entrances and pickup versions retain their actual note onsets", () => {
  const choice = group("1235:minor-home").choices.find((choice) => applicationById(choice.lessonId).spots.some((spot) => spot.beatOffset === 2));
  assert.ok(choice);
  const app = applicationById(choice.lessonId);
  const spot = app.spots.find((spot) => spot.beatOffset === 2);
  const events = phraseEvents(app.id);
  assert.ok(events.some((note) => note.beat === (spot.bar - 1) * 4 + 2));
  const dss = group("dss:minor-ii-v").variants[0];
  assert.equal(phraseEvents(dss.exampleLessonId)[0].beat, -1);
  const bo = group("bo:dominant-first-half").variants[0];
  assert.equal(phraseEvents(bo.exampleLessonId)[0].beat, -0.5);
});

test("source discrepancies remain explicit and empty chart matches have real examples", () => {
  assert.match(group("lg:dominant").note, /flat seventh/);
  assert.match(group("lg:halfdim").note, /Dø7/);
  for (const item of PRACTICE_CATALOG.groups.filter((g) => !g.choices.length)) {
    assert.equal(lessonById(item.exampleLessonId).id, item.exampleLessonId);
    assert.equal(lessonById(item.exampleLessonId).tuneId, null);
  }
  assert.ok(LICKS.every((lick) => PRACTICE_CATALOG.groups.some((g) => g.moduleId === lick.id)));
});
