/**
 * Tune lessons for workbook modules 6–30, plus Recordame walking ii–Vs.
 * Excerpts are sliced from tunes.js. Each spot's lick tonic (anchor) is the
 * interval from the tune tonic so the cell's written harmony matches those bars.
 *
 * Recordame walk (concert A minor, bars 8–15): half-bar ii–V then I, down
 * whole steps Bb → Ab → Gb, then a half step to F.
 */

import { TUNES, tuneById, tuneFormBars } from "./tunes.js";

const RECORDAME_WALK = [
  { bar: 1, anchor: 1 },
  { bar: 3, anchor: 11 },
  { bar: 5, anchor: 9 },
  { bar: 7, anchor: 8 },
];
const RECORDAME_WALK_NOTE = "Same cell on each descending Recordame step: Cm7 F7 | B♭maj7, B♭m7 E♭7 | A♭maj7, A♭m7 D♭7 | G♭maj7, then a half step Gm7 C7 | Fmaj7. ii and V are 2 beats each. Chart from reharmonize.app / allsolos.com (Page One).";
const NUTVILLE_DOMS = [
  { bar: 1, anchor: 1 },
  { bar: 2, anchor: 0 },
  { bar: 3, anchor: 11 },
  { bar: 4, anchor: 10 },
];
const NUTVILLE_DOM_NOTE = "Same V cell on Nutville's descending dominants: A♭7, G7, G♭7, F7, one bar each. Source iReal Pro (Brian's chart).";

function ireal(tune) {
  return `iReal Pro Jazz 1460 · ${tune}`;
}

function rangeLabel(start, bars) {
  return bars === 1 ? `bar ${start}` : `bars ${start}–${start + bars - 1}`;
}

/**
 * Compact placement rows. `start`/`bars` are 1-indexed in the tune.
 * Spot `bar` is 1-indexed inside the excerpt. `anchor` is lick tonic vs tune tonic.
 */
export const WORKBOOK_TRACKS = [
  { lickId: "1235", tuneId: "four", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }], simplification: "1235 cell on Imaj7. Four opens with two bars of E♭maj7." },
  { lickId: "1235", tuneId: "tune-up", start: 1, bars: 8, spots: [{ bar: 3, anchor: 0 }], simplification: "Imaj7 cell on Dmaj7 after the first ii–V–I." },
  { lickId: "1235", tuneId: "another-you", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }], simplification: "Imaj7 cell on the opening E♭maj7 bars." },

  { lickId: "br", tuneId: "four", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }], simplification: "Two-bar I resolution on E♭maj7 | E♭maj7." },
  { lickId: "br", tuneId: "another-you", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }], simplification: "Two-bar I resolution on E♭maj7 | E♭maj7." },

  { lickId: "dlr", tuneId: "tune-up", start: 1, bars: 8, spots: [{ bar: 2, anchor: 0 }], simplification: "V7♭9–I cell over A7 | Dmaj7. iReal is plain A7, not 7♭9." },
  { lickId: "dlr", tuneId: "attya", start: 1, bars: 8, spots: [{ bar: 3, anchor: 0 }], simplification: "V–I into A♭: E♭7 | A♭maj7. Plain 7 for the workbook 7♭9." },
  { lickId: "dlr", tuneId: "st-thomas", start: 9, bars: 8, spots: [{ bar: 4, anchor: 0 }], simplification: "V–I at bars 12–13 (G7 | Cmaj7/E). Turnaround excerpt, bars 9–16." },

  { lickId: "acvl", tuneId: "tune-up", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }, { bar: 5, anchor: 10 }], simplification: "Same 3-bar ii–V–I cell in D, then down a whole step in C (Tune Up bars 1–3 and 5–7)." },
  { lickId: "acvl", tuneId: "attya", start: 1, bars: 8, spots: [{ bar: 2, anchor: 0 }], simplification: "ii–V–I into A♭: B♭m7 | E♭7 | A♭maj7." },

  { lickId: "tm", tuneId: "tune-up", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }, { bar: 5, anchor: 10 }], simplification: "Two-bar ii | V in D, then in C." },
  { lickId: "tm", tuneId: "four", start: 9, bars: 8, spots: [{ bar: 3, anchor: 0 }], simplification: "ii | V of E♭ on Fm7 | B♭7 (Four bar 11–12)." },

  { lickId: "tisc", tuneId: "four", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }], simplification: "Imaj7 arpeggio on E♭maj7." },
  { lickId: "tisc", tuneId: "tune-up", start: 1, bars: 8, spots: [{ bar: 3, anchor: 0 }], simplification: "Imaj7 arpeggio on Dmaj7." },

  { lickId: "et", tuneId: "four", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }], simplification: "Two-bar embellished I triad on E♭maj7 | E♭maj7." },
  { lickId: "et", tuneId: "another-you", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }], simplification: "Two-bar embellished I triad on E♭maj7 | E♭maj7." },

  { lickId: "cbc", tuneId: "tune-up", start: 1, bars: 8, spots: [{ bar: 2, anchor: 0 }], simplification: "Bebop cell on V: A7 in D." },
  { lickId: "cbc", tuneId: "autumn-leaves", start: 1, bars: 8, spots: [{ bar: 6, anchor: 0 }], simplification: "V cell on D7♭13 in G minor. Workbook quality is plain 7." },
  { lickId: "cbc", tuneId: "nutville", start: 17, bars: 8, spots: NUTVILLE_DOMS, simplification: NUTVILLE_DOM_NOTE },

  { lickId: "jcdp", tuneId: "tune-up", start: 1, bars: 8, spots: [{ bar: 2, anchor: 0 }], simplification: "3-bar V♯9 | V♯9 | I cell over A7 | Dmaj7 | Dmaj7. Tune Up has one V bar, then two of I." },

  { lickId: "tdp", tuneId: "tune-up", start: 1, bars: 8, spots: [{ bar: 2, anchor: 0 }], simplification: "Diminished pattern on V: A7. Workbook quality is 7♯9." },
  { lickId: "tdp", tuneId: "autumn-leaves", start: 1, bars: 8, spots: [{ bar: 6, anchor: 0 }], simplification: "V cell on D7♭13. Workbook quality is 7♯9." },
  { lickId: "tdp", tuneId: "nutville", start: 17, bars: 8, spots: NUTVILLE_DOMS, simplification: `${NUTVILLE_DOM_NOTE} Workbook quality is 7♯9.` },

  { lickId: "se", tuneId: "st-thomas", start: 1, bars: 8, spots: [{ bar: 2, anchor: 2 }, { bar: 3, anchor: 0 }, { bar: 6, anchor: 2 }, { bar: 7, anchor: 0 }], simplification: "One-bar ii–V cell on St. Thomas's two-chord bars: Em7 A7 (of D) and Dm7 G7 (of C)." },
  { lickId: "se", tuneId: "nows-time", start: 1, bars: 12, spots: [{ bar: 8, anchor: 2 }, { bar: 12, anchor: 0 }], simplification: "One-bar ii–V on Am7 D7 (of G) and Gm7 C7 (of F)." },
  { lickId: "se", tuneId: "recordame", start: 8, bars: 8, spots: RECORDAME_WALK, simplification: `One-bar ii–V cell (2 beats each) on every walking step; I is the next bar. ${RECORDAME_WALK_NOTE}` },

  { lickId: "mp", tuneId: "autumn-leaves", start: 1, bars: 8, spots: [{ bar: 7, anchor: 0 }], simplification: "Minor passage on the i arrival. Chart is Gm6, not Gm7." },
  { lickId: "mp", tuneId: "so-what", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }], simplification: "Minor passage on Dm11. So What is modal; treated as i minor." },
  { lickId: "mp", tuneId: "recordame", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }], simplification: "Minor passage on the Am7 vamp (bars 1–4). Chart from reharmonize.app / allsolos.com (Page One)." },

  { lickId: "ssr", tuneId: "four", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }], simplification: "I resolution on E♭maj7." },
  { lickId: "ssr", tuneId: "another-you", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }], simplification: "I resolution on E♭maj7." },

  { lickId: "sat", tuneId: "st-thomas", start: 1, bars: 8, spots: [{ bar: 3, anchor: 0 }], simplification: "ii–V | I on Dm7 G7 | C6. iReal I is C6, not Cmaj7." },
  { lickId: "sat", tuneId: "four", start: 25, bars: 8, spots: [{ bar: 6, anchor: 0 }], simplification: "ii–V | I on Fm7 B♭7 | E♭maj7 (Four bars 30–31)." },
  { lickId: "sat", tuneId: "recordame", start: 8, bars: 8, spots: RECORDAME_WALK, simplification: `2-bar ii–V | I cell on every walking step. ${RECORDAME_WALK_NOTE}` },

  { lickId: "ctdc", tuneId: "four", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }], simplification: "Common-tone diminished cell over Imaj7 as in the workbook." },
  { lickId: "ctdc", tuneId: "another-you", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }], simplification: "Common-tone diminished cell over Imaj7." },

  { lickId: "tpr", tuneId: "st-thomas", start: 1, bars: 8, spots: [{ bar: 3, anchor: 0 }], simplification: "ii–V | I on Dm7 G7 | C6." },
  { lickId: "tpr", tuneId: "recordame", start: 8, bars: 8, spots: RECORDAME_WALK, simplification: `2-bar ii–V | I cell on every walking step. ${RECORDAME_WALK_NOTE}` },
  { lickId: "tpr", tuneId: "four", start: 25, bars: 8, spots: [{ bar: 6, anchor: 0 }], simplification: "ii–V | I on Fm7 B♭7 | E♭maj7." },

  { lickId: "ntp", tuneId: "so-what", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }], simplification: "Two-bar minor passage on Dm11 | Dm11." },
  { lickId: "ntp", tuneId: "autumn-leaves", start: 1, bars: 8, spots: [{ bar: 7, anchor: 0 }], simplification: "Two-bar i on Gm6 | Gm6." },
  { lickId: "ntp", tuneId: "recordame", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }], simplification: "Two-bar i on Am7 | Am7 (opening vamp). Chart from reharmonize.app / allsolos.com (Page One)." },

  { lickId: "dct", tuneId: "four", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }], simplification: "3-bar I cell. Four has two bars of E♭maj7 then E♭m7; the third bar of the cell sits on iv." },
  { lickId: "dct", tuneId: "another-you", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }], simplification: "3-bar I cell. Opening is E♭maj7 | E♭maj7 | Dø7; the third bar of the cell sits on viiø." },

  { lickId: "ae", tuneId: "tune-up", start: 1, bars: 8, spots: [{ bar: 2, anchor: 0 }], simplification: "1-bar Valt–I cell played on A7; I is the next bar (Dmaj7). Workbook writes Valt and I in one bar." },
  { lickId: "ae", tuneId: "autumn-leaves", start: 1, bars: 8, spots: [{ bar: 6, anchor: 0 }], simplification: "Valt–I cell on D7♭13; i (Gm6) is the next bar." },
  { lickId: "ae", tuneId: "nutville", start: 17, bars: 8, spots: [{ bar: 6, anchor: 0 }], simplification: "Valt–I cell on G7♯5; i (Cm7) is the next bar (B bars 6–7). Source iReal Pro (Brian's chart)." },

  { lickId: "fe", tuneId: "four", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }], simplification: "I enclosure on E♭maj7." },
  { lickId: "fe", tuneId: "tune-up", start: 1, bars: 8, spots: [{ bar: 3, anchor: 0 }], simplification: "I enclosure on Dmaj7." },
  { lickId: "fe", tuneId: "another-you", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }], simplification: "I enclosure on E♭maj7." },

  { lickId: "bb", tuneId: "four", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }], simplification: "I cell on E♭maj7." },
  { lickId: "bb", tuneId: "st-thomas", start: 1, bars: 8, spots: [{ bar: 4, anchor: 0 }], simplification: "I cell on C6 (bar 4). iReal I is C6, not Cmaj7." },
  { lickId: "bb", tuneId: "another-you", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }], simplification: "I cell on E♭maj7." },

  { lickId: "lg", tuneId: "four", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }], simplification: "Lydian I (maj7♭5) over plain E♭maj7; no ♯11 in the iReal chord." },
  { lickId: "lg", tuneId: "tune-up", start: 1, bars: 8, spots: [{ bar: 3, anchor: 0 }], simplification: "Lydian I over plain Dmaj7." },
  { lickId: "lg", tuneId: "another-you", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }], simplification: "Lydian I over plain E♭maj7." },

  { lickId: "bcf", tuneId: "tune-up", start: 1, bars: 8, spots: [{ bar: 1, anchor: 0 }, { bar: 5, anchor: 10 }], simplification: "3-bar ii–V–I in D, then down a whole step in C." },
  { lickId: "bcf", tuneId: "attya", start: 1, bars: 8, spots: [{ bar: 2, anchor: 0 }], simplification: "ii–V–I into A♭: B♭m7 | E♭7 | A♭maj7." },

  { lickId: "dss", tuneId: "nows-time", start: 1, bars: 12, spots: [{ bar: 6, anchor: 6 }], simplification: "Two-bar diminished cell on B°7. The blues has one dim bar then I7; the second bar of the cell sits on F7." },

  { lickId: "nnr", tuneId: "st-thomas", start: 1, bars: 8, spots: [{ bar: 3, anchor: 0 }], simplification: "ii–V | I on Dm7 G7 | C6." },
  { lickId: "nnr", tuneId: "recordame", start: 8, bars: 8, spots: RECORDAME_WALK, simplification: `2-bar ii–V | I cell on every walking step. ${RECORDAME_WALK_NOTE}` },
  { lickId: "nnr", tuneId: "four", start: 25, bars: 8, spots: [{ bar: 6, anchor: 0 }], simplification: "ii–V | I on Fm7 B♭7 | E♭maj7." },
];

function placementId(row) {
  return `${row.lickId}-${row.tuneId}`;
}

function formIdFor(row) {
  return `${placementId(row)}-form`;
}

function lessonIdFor(row) {
  return `${row.lickId}-integrate-${row.tuneId}`;
}

function sliceBars(tune, start, count) {
  const all = tuneFormBars(tune);
  const bars = all.slice(start - 1, start - 1 + count);
  if (bars.length !== count) {
    throw new Error(`excerpt ${tune.id} ${start}+${count} got ${bars.length}`);
  }
  return bars;
}

function sourceFor(tune, simplification) {
  const base = tune.chords ?? ireal(tune.title);
  return simplification ? `${base}. ${simplification}` : base;
}

function buildForm(row) {
  const tune = tuneById(row.tuneId);
  return {
    id: formIdFor(row),
    title: `${tune.title} · ${rangeLabel(row.start, row.bars)}`,
    shortTitle: tune.title,
    source: sourceFor(tune, row.simplification),
    simplification: row.simplification,
    keyQuality: tune.keyQuality,
    bars: sliceBars(tune, row.start, row.bars),
    tuneId: tune.id,
    excerptStartBar: row.start,
  };
}

function buildApplication(row) {
  const first = row.spots[0];
  return {
    id: placementId(row),
    lickId: row.lickId,
    formId: formIdFor(row),
    label: tuneById(row.tuneId).title,
    cellTonicInterval: first.anchor,
    phraseStartBar: first.bar,
    copyKind: "place",
    tuneId: row.tuneId,
    spots: row.spots.map((spot) => ({
      bar: spot.bar,
      fragment: "full",
      anchorInterval: spot.anchor,
    })),
  };
}

function buildLesson(row) {
  const tune = tuneById(row.tuneId);
  const n = row.spots.length;
  const firstTuneBar = row.start + row.spots[0].bar - 1;
  return {
    id: lessonIdFor(row),
    kind: "integrate",
    applicationId: placementId(row),
    title: `Integrate: ${tune.title}`,
    coverTitle: tune.title,
    summary: row.simplification,
    context: `${tune.title} · ${n === 1 ? `bar ${firstTuneBar}` : rangeLabel(row.start, row.bars)}`,
    defaultKeyId: tune.key,
    tuneId: tune.id,
  };
}

export const WORKBOOK_TRACK_FORMS = Object.fromEntries(WORKBOOK_TRACKS.map((row) => [formIdFor(row), buildForm(row)]));
export const WORKBOOK_TRACK_APPLICATIONS = WORKBOOK_TRACKS.map(buildApplication);

export function trackLessonsFor(lickId) {
  return WORKBOOK_TRACKS.filter((row) => row.lickId === lickId).map(buildLesson);
}

export function qualityFamily(quality) {
  if (quality.startsWith("major")) return "major";
  if (quality.startsWith("dominant")) return "dominant";
  if (quality === "halfdim7" || quality === "minor7b5") return "halfdim";
  if (quality.includes("diminished") || quality === "diminished7") return "dim";
  if (quality.startsWith("minor")) return "minor";
  return quality;
}

function wrapPc(n) {
  return ((n % 12) + 12) % 12;
}

function firstChord(bar) {
  return (bar.chords ?? bar)[0];
}

/**
 * First-chord harmony of each lick learn-bar vs the excerpt bar it occupies.
 * Multi-chord lick bars may sit on a one-chord tune bar (noted as simplification).
 */
export function placementHarmony(row, lickFormBars) {
  const form = WORKBOOK_TRACK_FORMS[formIdFor(row)];
  return row.spots.map((spot) => {
    const report = [];
    for (let i = 0; i < lickFormBars.length; i += 1) {
      const excerptBar = form.bars[spot.bar - 1 + i];
      const lickChord = firstChord(lickFormBars[i]);
      if (!excerptBar || !lickChord) {
        report.push({ ok: false, reason: "short-excerpt", index: i });
        continue;
      }
      const tuneChord = firstChord(excerptBar);
      const relative = wrapPc(tuneChord.intervalFromTonic - spot.anchor);
      const intervalOk = relative === wrapPc(lickChord.intervalFromTonic);
      const familyOk = qualityFamily(tuneChord.quality) === qualityFamily(lickChord.quality);
      report.push({
        ok: intervalOk && familyOk,
        intervalOk,
        familyOk,
        lick: `${lickChord.intervalFromTonic}:${lickChord.quality}`,
        tune: `${tuneChord.intervalFromTonic}:${tuneChord.quality}`,
        relative,
        bar: spot.bar + i,
      });
    }
    return { spot, report };
  });
}

export { TUNES };
