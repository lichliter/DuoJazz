import test from "node:test";
import assert from "node:assert/strict";
import { TUNES, tuneById, tuneBarCount } from "./tunes.js";
import {
  chartTuneList,
  chartTuneRow,
  chartGrid,
  licksForTune,
} from "./charts.js";
import { MODULES } from "./registry.js";

test("chart list rows cover every tune with title, composer, style, and key", () => {
  const rows = chartTuneList();
  assert.deepEqual(rows.map((row) => row.id), TUNES.map((tune) => tune.id));
  assert.equal(rows.length, 10);
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
