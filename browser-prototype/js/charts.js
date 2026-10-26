/**
 * iReal-style chart grids and the licks-for-tune index.
 */

import { getKey, displayKey, chordSymbolName } from "./music.js";
import { instrumentOrDefault } from "./instruments.js";
import { TUNES, tuneById, tuneFormId } from "./tunes.js";
import { MODULES, applicationById } from "./registry.js";
import { TWELVE_KEY_IDS, visibleModuleLessons } from "./session.js";

/** Key picker labels from the shared spelling table (minor: C♯m and F♯m, not D♭m and G♭m). */
export function chartKeyChoices(quality = "minor", instrumentId = "piano") {
  const mode = quality === "major" ? "major" : "minor";
  return TWELVE_KEY_IDS.map((id) => ({
    id,
    label: displayKey(getKey(id), instrumentId, mode).shortName,
  }));
}

const BARS_PER_ROW = 4;

const TUNE_CHART_META = {
  "nows-time": { composer: "Charlie Parker", style: "blues" },
  four: { composer: "Miles Davis", style: "swing" },
  "tune-up": { composer: "Miles Davis", style: "swing" },
  "st-thomas": { composer: "Sonny Rollins", style: "calypso" },
  attya: { composer: "Jerome Kern", style: "swing" },
  "autumn-leaves": { composer: "Joseph Kosma", style: "swing" },
  "so-what": { composer: "Miles Davis", style: "modal" },
  "another-you": { composer: "Harry Warren", style: "swing" },
  recordame: { composer: "Joe Henderson", style: "bossa" },
  nutville: { composer: "Horace Silver", style: "latin" },
};

export function chartTuneList(tunes = TUNES) {
  return tunes.map((tune) => chartTuneRow(tune));
}

export function chartTuneRow(tune) {
  const meta = TUNE_CHART_META[tune.id] ?? {};
  const concert = getKey(tune.key);
  const quality = tune.keyQuality === "major" ? "major" : "minor";
  const named = displayKey(concert, "concert", quality);
  return {
    id: tune.id,
    title: tune.title,
    composer: tune.composer ?? meta.composer ?? "",
    style: tune.style ?? tune.feel ?? meta.style ?? "",
    key: named.shortName,
    keyId: tune.key,
    keyQuality: quality,
  };
}

export function chartBarChords(bar, concertTonic, displayMode, keyQuality) {
  return (bar ?? []).map((chord) => ({
    beats: chord.durationBeats ?? 4,
    name: chordSymbolName(
      concertTonic,
      chord.intervalFromTonic,
      chord.quality,
      displayMode,
      keyQuality,
      chord.slashIntervalFromTonic,
      chord.usesFlats,
      chord.spellFrom,
    ),
  }));
}

export function chartGrid(tune, {
  instrumentId = "piano",
  concertKeyId = null,
  barsPerRow = BARS_PER_ROW,
} = {}) {
  const source = typeof tune === "string" ? tuneById(tune) : tune;
  const instrument = instrumentOrDefault(instrumentId);
  const quality = source.keyQuality === "major" ? "major" : "minor";
  const concertTonic = getKey(concertKeyId ?? source.key);
  const written = displayKey(concertTonic, instrument.id, quality);
  const rows = [];
  let barNumber = 1;
  for (const section of source.sections ?? []) {
    const count = section.bars.length;
    section.bars.forEach((bar, index) => {
      const col = (barNumber - 1) % barsPerRow;
      if (col === 0) rows.push({ bars: [] });
      const row = rows.at(-1);
      row.bars.push({
        number: barNumber,
        sectionLabel: index === 0 ? (section.label ?? null) : null,
        repeatStart: Boolean(section.repeatStart) && index === 0,
        repeatEnd: Boolean(section.repeatEnd) && index === count - 1,
        chords: chartBarChords(bar, concertTonic, instrument.id, quality),
      });
      barNumber += 1;
    });
  }
  return {
    tuneId: source.id,
    title: source.title,
    composer: chartTuneRow(source).composer,
    style: chartTuneRow(source).style,
    instrumentId: instrument.id,
    concertKeyId: concertTonic.id,
    writtenKey: written.shortName,
    writtenKeyName: written.name,
    barsPerRow,
    barCount: barNumber - 1,
    sections: rows.flatMap((row) => row.bars)
      .filter((bar) => bar.sectionLabel)
      .map((bar) => ({ label: bar.sectionLabel, startBar: bar.number })),
    rows,
  };
}

export function licksForTune(tuneId, modules = MODULES) {
  const rows = [];
  for (const module of modules) {
    for (const lesson of visibleModuleLessons(module)) {
      if (!lessonUsesTune(lesson, tuneId)) continue;
      rows.push({
        lessonId: lesson.id,
        moduleId: module.id,
        moduleNumber: module.number,
        moduleName: module.name,
        bars: lesson.context,
        label: `Module ${module.number} · ${module.name}`,
        detail: lesson.context,
      });
    }
  }
  return rows;
}

function lessonUsesTune(lesson, tuneId) {
  if (lesson.tuneId === tuneId) return true;
  const app = applicationById(lesson.applicationId);
  if (app?.tuneId === tuneId) return true;
  return app?.formId === tuneFormId(tuneId);
}
