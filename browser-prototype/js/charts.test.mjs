import test from "node:test";
import assert from "node:assert/strict";
import { TUNES, tuneById, tuneBarCount } from "./tunes.js";
import {
  chartTuneList,
  chartTuneRow,
  chartGrid,
  chartKeyChoices,
  licksForTune,
} from "./charts.js";
import { TWELVE_KEY_IDS } from "./session.js";
import { MODULES } from "./registry.js";

test("chart list rows cover every tune with title, composer, style, and key", () => {
  const rows = chartTuneList();
  assert.deepEqual(rows.map((row) => row.id), TUNES.map((tune) => tune.id));
  assert.equal(rows.length, 11);
  const blueBossa = rows.find((row) => row.id === "blue-bossa");
  assert.equal(blueBossa.title, "Blue Bossa");
  assert.equal(blueBossa.composer, "Kenny Dorham");
  assert.equal(blueBossa.style, "bossa");
  assert.equal(blueBossa.key, "Cm");
  const recordame = rows.find((row) => row.id === "recordame");
  assert.equal(recordame.title, "Recordame");
  assert.equal(recordame.composer, "Joe Henderson");
  assert.equal(recordame.style, "bossa");
  assert.equal(recordame.key, "Am");
  const nutville = chartTuneRow(tuneById("nutville"));
  assert.equal(nutville.composer, "Horace Silver");
  assert.equal(nutville.style, "latin");
  assert.equal(nutville.key, "Cm");
  const four = chartTuneRow(tuneById("four"));
  assert.equal(four.composer, "Miles Davis");
  assert.equal(four.style, "swing");
  assert.equal(four.key, "E♭");
});

test("chart grid is four bars per row with section letters and concert chords", () => {
  const nutville = chartGrid("nutville");
  assert.equal(nutville.barCount, 24);
  assert.equal(nutville.barsPerRow, 4);
  assert.equal(nutville.rows.length, 6);
  assert.ok(nutville.rows.every((row) => row.bars.length <= 4));
  assert.deepEqual(
    nutville.sections,
    [
      { label: "A", startBar: 1 },
      { label: "B", startBar: 17 },
    ],
  );
  assert.equal(nutville.rows[0].bars[0].sectionLabel, "A");
  assert.equal(nutville.rows[4].bars[0].sectionLabel, "B");
  assert.equal(nutville.rows[0].bars[0].chords[0].name, "Cm7");
  assert.equal(nutville.rows[4].bars[0].chords[0].name, "A♭7");
  assert.equal(nutville.writtenKey, "Cm");

  const recordame = chartGrid("recordame");
  assert.equal(recordame.barCount, 16);
  assert.equal(recordame.rows.length, 4);
  assert.equal(recordame.rows[1].bars[3].chords.map((chord) => chord.name).join(" "), "Cm7 F7");
  assert.equal(recordame.rows[2].bars[0].chords[0].name, "B♭maj7");
  assert.equal(recordame.writtenKey, "Am");

  const blueBossa = chartGrid("blue-bossa");
  assert.equal(blueBossa.barCount, 16);
  assert.equal(blueBossa.rows.length, 4);
  assert.equal(blueBossa.writtenKey, "Cm");
  assert.deepEqual(
    blueBossa.rows.flatMap((row) => row.bars.flatMap((bar) => bar.chords.map((chord) => chord.name))),
    [
      "Cm7", "Cm7", "Fm7", "Fm7", "Dm7♭5", "G7♭9", "Cm7", "Cm7",
      "E♭m7", "A♭7", "D♭maj7", "D♭maj7", "Dm7♭5", "G7♭9", "Cm7", "Dm7♭5", "G7♭9",
    ],
  );
  assert.equal(blueBossa.rows[3].bars[3].chords.map((chord) => chord.beats).join(" "), "2 2");
});

test("chart grid transposes into the selected instrument's written key", () => {
  const concert = chartGrid("recordame", { instrumentId: "piano" });
  const trumpet = chartGrid("recordame", { instrumentId: "trumpet" });
  assert.equal(concert.writtenKey, "Am");
  assert.equal(trumpet.writtenKey, "Bm");
  assert.equal(concert.rows[0].bars[0].chords[0].name, "Am7");
  assert.equal(trumpet.rows[0].bars[0].chords[0].name, "Bm7");
  assert.equal(concert.rows[2].bars[0].chords[0].name, "B♭maj7");
  assert.equal(trumpet.rows[2].bars[0].chords[0].name, "Cmaj7");

  const shifted = chartGrid("recordame", { instrumentId: "trumpet", concertKeyId: "G" });
  assert.equal(shifted.concertKeyId, "G");
  assert.equal(shifted.writtenKey, "Am");
  assert.equal(shifted.rows[0].bars[0].chords[0].name, "Am7");
});

test("licks-for-tune index lists road tune lessons with module name and bars", () => {
  const four = licksForTune("four");
  assert.ok(four.length >= 1);
  assert.ok(four.every((row) => row.moduleName && row.bars && row.lessonId));
  const cell = four.find((row) => row.lessonId === "1235-integrate-four");
  assert.equal(cell.moduleNumber, 6);
  assert.equal(cell.moduleName, "1235 Cell");
  assert.match(cell.bars, /Four/);
  assert.match(cell.label, /Module 6/);

  const recordame = licksForTune("recordame");
  assert.ok(recordame.some((row) => row.lessonId === "se-integrate-recordame"));
  assert.ok(recordame.some((row) => row.lessonId === "mp-integrate-recordame"));
  assert.equal(recordame.some((row) => String(row.lessonId).startsWith("tune-recordame")), false);

  const unknown = licksForTune("missing-tune");
  assert.deepEqual(unknown, []);
  assert.equal(MODULES.length, 30);
  assert.equal(tuneBarCount(tuneById("nutville")), 24);
});

test("chart key picker uses the spelling table, including C♯m and F♯m", () => {
  const minor = chartKeyChoices("minor");
  assert.deepEqual(minor.map((row) => row.label), [
    "Cm", "C♯m", "Dm", "E♭m", "Em", "Fm", "F♯m", "Gm", "A♭m", "Am", "B♭m", "Bm",
  ]);
  assert.equal(minor.some((row) => row.label === "D♭m" || row.label === "G♭m"), false);
  const major = chartKeyChoices("major", "trumpet");
  assert.equal(major.length, 12);
  assert.ok(major.every((row) => TWELVE_KEY_IDS.includes(row.id)));
  assert.equal(major.find((row) => row.id === "C").label, "D");
});

test("chart chord symbols keep root, quality, and alteration together", () => {
  const names = new Set();
  for (const tune of TUNES) {
    for (const keyId of TWELVE_KEY_IDS) {
      const tuneId = tune.id;
      const grid = chartGrid(tuneId, { concertKeyId: keyId });
      for (const row of grid.rows) {
        for (const bar of row.bars) {
          for (const chord of bar.chords) {
            names.add(chord.name);
            assert.doesNotMatch(chord.name, /\s/, `${tuneId} ${keyId} ${chord.name}`);
          }
        }
      }
    }
  }
  for (const expected of ["E7♯9", "A7♭9", "F♯°7"]) {
    assert.equal(names.has(expected), true, expected);
  }
});
