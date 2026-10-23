/**
 * Lick registry for the browser prototype.
 * Interval-only note data from Essential Jazz Vocabulary Workbook (personal use).
 * Do not store the PDF, page images, or long passages of its text.
 */

export const TROMBONE_LOW_MIDI = 40; // E2
export const TROMBONE_HIGH_MIDI = 67; // G4

const T8 = 1 / 3;

function N(interval, beats, extra = {}) {
  return { type: "note", interval, beats, ...extra };
}

function R(beats) {
  return { type: "rest", beats };
}

function bar(chords) {
  return { chords };
}

function chord(intervalFromTonic, quality, durationBeats = 4) {
  return { intervalFromTonic, quality, durationBeats };
}

export const FORMS = {
  "autumn-leaves-8": {
    id: "autumn-leaves-8",
    title: "Autumn Leaves · opening 8 bars",
    shortTitle: "Autumn Leaves",
    source: {
      tune: "Autumn Leaves (Kosma / Mercer)",
      variant: "Concert G minor, Verse 1, one chord per bar",
      chart: "https://tabs.ultimate-guitar.com/tab/misc-traditional/autumn-leaves-chords-4419731",
      author: "jbpicon, last update Aug 21 2025, key Gm, capo none",
      excerpt: "| Cm7 | F7 | B♭maj7 | E♭maj7 | Am7♭5 | D7 | Gm6 | Gm6 |",
      simplification: "No head melody, no pickup, no later-verse turnaround. Bars 7–8 use Gm6 as on that chart (not Gm7 / Gmin(maj7)). This is an excerpt for placing a lick, not a substitute for singing the tune.",
    },
    keyQuality: "minor",
    bars: [
      bar([chord(5, "minor7")]),
      bar([chord(10, "dominant7")]),
      bar([chord(3, "major7")]),
      bar([chord(8, "major7")]),
      bar([chord(2, "minor7b5")]),
      bar([chord(7, "dominant7")]),
      bar([chord(0, "minor6")]),
      bar([chord(0, "minor6")]),
    ],
  },
  "minor-251": {
    id: "minor-251",
    title: "Minor ii–V–i",
    shortTitle: "Minor ii–V–i",
    keyQuality: "minor",
    bars: [
      bar([chord(2, "halfdim7")]),
      bar([chord(7, "dominant7b9")]),
      bar([chord(0, "minor7")]),
      bar([chord(0, "minor7")]),
    ],
  },
  "gts-turnaround": {
    id: "gts-turnaround",
    title: "iii–VI–ii–V–I",
    shortTitle: "iii–VI–ii–V",
    keyQuality: "major",
    bars: [
      bar([chord(4, "minor7", 2), chord(9, "dominant7", 2)]),
      bar([chord(2, "minor7", 2), chord(7, "dominant7", 2)]),
      bar([chord(0, "major7")]),
      bar([chord(0, "major7")]),
    ],
  },
  "rhythm-changes-a": {
    id: "rhythm-changes-a",
    title: "Rhythm changes A, bars 1–5",
    shortTitle: "Rhythm changes",
    keyQuality: "major",
    bars: [
      bar([chord(0, "major7", 2), chord(9, "dominant7", 2)]),
      bar([chord(2, "minor7", 2), chord(7, "dominant7", 2)]),
      bar([chord(4, "minor7", 2), chord(9, "dominant7", 2)]),
      bar([chord(2, "minor7", 2), chord(7, "dominant7", 2)]),
      bar([chord(0, "dominant7")]),
    ],
  },
  "dominant-to-i": {
    id: "dominant-to-i",
    title: "Dominant to I",
    shortTitle: "Into the I",
    keyQuality: "major",
    bars: [
      bar([chord(7, "dominant7")]),
      bar([chord(7, "dominant7")]),
      bar([chord(0, "major7")]),
      bar([chord(0, "major7")]),
    ],
  },
  "blues-14": {
    id: "blues-14",
    title: "Blues, bars 1–4",
    shortTitle: "Blues",
    keyQuality: "major",
    bars: [
      bar([chord(0, "dominant7")]),
      bar([chord(5, "dominant7")]),
      bar([chord(0, "dominant7")]),
      bar([chord(2, "minor7", 2), chord(0, "dominant7", 2)]),
    ],
  },
  "major-251": {
    id: "major-251",
    title: "ii–V–I",
    shortTitle: "ii–V–I",
    keyQuality: "major",
    bars: [
      bar([chord(2, "minor7")]),
      bar([chord(7, "dominant7")]),
      bar([chord(0, "major7")]),
      bar([chord(0, "major7")]),
    ],
  },
  "cmar-learn": {
    id: "cmar-learn",
    title: "Cry Me a River cell",
    shortTitle: "The cell",
    keyQuality: "minor",
    bars: [
      bar([chord(0, "minor6", 8)]),
    ],
  },
  "emr-learn": {
    id: "emr-learn",
    title: "Embellished minor resolution",
    shortTitle: "The lick",
    keyQuality: "minor",
    bars: [
      bar([chord(7, "dominant7b9")]),
      bar([chord(0, "minor7")]),
    ],
  },
  "gts-learn": {
    id: "gts-learn",
    title: "Guide tone sequence",
    shortTitle: "The lick",
    keyQuality: "major",
    bars: [
      bar([chord(4, "minor7", 2), chord(9, "dominant7", 2)]),
      bar([chord(2, "minor7", 2), chord(7, "dominant7", 2)]),
      bar([chord(0, "major7")]),
    ],
  },
  "bo-learn": {
    id: "bo-learn",
    title: "Bird opening",
    shortTitle: "The lick",
    keyQuality: "major",
    bars: [
      bar([chord(7, "dominant7")]),
      bar([chord(7, "dominant7")]),
      bar([chord(0, "major7")]),
      bar([chord(0, "major7")]),
    ],
  },
  "hsr-learn": {
    id: "hsr-learn",
    title: "Honeysuckle Rose",
    shortTitle: "The lick",
    keyQuality: "major",
    bars: [
      bar([chord(2, "minor7")]),
      bar([chord(2, "minor7")]),
    ],
  },
};

const CMAR_LEAD_HOME = [
  { beat: 0, interval: 5, beats: 1 },
  { beat: 1, interval: 8, beats: 1 },
  { beat: 2, interval: 12, beats: 1 },
  { beat: 3, interval: 8, beats: 1 },
  { beat: 4, interval: -2, beats: 1 },
  { beat: 5, interval: 2, beats: 1 },
  { beat: 6, interval: 5, beats: 1 },
  { beat: 7, interval: 2, beats: 1 },
  { beat: 8, interval: 3, beats: 1 },
  { beat: 9, interval: 7, beats: 1 },
  { beat: 10, interval: 10, beats: 1 },
  { beat: 11, interval: 7, beats: 1 },
  { beat: 12, interval: 8, beats: 1 },
  { beat: 13, interval: 7, beats: 0.5 },
  { beat: 13.5, interval: 5, beats: 0.5 },
  { beat: 14, interval: 3, beats: 1 },
  { beat: 15, interval: 0, beats: 1 },
  { beat: 16, interval: 2, beats: 1 },
  { beat: 17, interval: 5, beats: 1 },
  { beat: 18, interval: 8, beats: 1 },
  { beat: 19, interval: 7, beats: 1 },
  { beat: 20, interval: 7, beats: 1 },
  { beat: 21, interval: 10, beats: 1 },
  { beat: 22, interval: 12, beats: 2 },
];

const CMAR_RESOLVE_HOME = [
  { beat: 28, interval: 3, beats: 1 },
  { beat: 29, interval: 2, beats: 0.5 },
  { beat: 29.5, interval: 0, beats: 0.5 },
  { beat: 30, interval: 7, beats: 1 },
  { beat: 31, interval: 0, beats: 1 },
];

const CMAR_LEAD_ALT = [
  { beat: 0, interval: 0, beats: 1 },
  { beat: 1, interval: 3, beats: 1 },
  { beat: 2, interval: 5, beats: 1 },
  { beat: 3, interval: 8, beats: 1 },
  { beat: 4, interval: 10, beats: 1 },
  { beat: 5, interval: 8, beats: 1 },
  { beat: 6, interval: 7, beats: 1 },
  { beat: 7, interval: 5, beats: 1 },
  { beat: 8, interval: 3, beats: 1 },
  { beat: 9, interval: 7, beats: 1 },
  { beat: 10, interval: 10, beats: 1 },
  { beat: 11, interval: 7, beats: 1 },
  { beat: 12, interval: 8, beats: 1 },
  { beat: 13, interval: 12, beats: 1 },
  { beat: 14, interval: 10, beats: 1 },
  { beat: 15, interval: 8, beats: 1 },
  { beat: 16, interval: 0, beats: 1 },
  { beat: 17, interval: 2, beats: 1 },
  { beat: 18, interval: 3, beats: 1 },
  { beat: 19, interval: 5, beats: 1 },
];

const CMAR_RESOLVE_ALT = [
  { beat: 24, interval: 7, beats: 1 },
  { beat: 25, interval: 0, beats: 1 },
  { beat: 26, interval: 3, beats: 1 },
  { beat: 27, interval: 2, beats: 0.5 },
  { beat: 27.5, interval: 0, beats: 0.5 },
  { beat: 28, interval: 3, beats: 1 },
  { beat: 29, interval: 0, beats: 1 },
  { beat: 30, interval: 7, beats: 1 },
  { beat: 31, interval: 0, beats: 1 },
];

export const LICKS = [
  {
    id: "cmar",
    name: "Cry Me a River",
    shortName: "Cry Me a River cell",
    source: "Essential Jazz Vocabulary Workbook, Lick 1",
    octave: -2,
    pickupBeats: 0,
    learnBeats: 8,
    keyQuality: "minor",
    defaultKeyId: "G",
    elements: [
      N(14, 1, { articulation: "tenuto" }),
      N(12, T8, { tuplet: 3 }),
      N(7, T8, { tuplet: 3 }),
      N(3, T8, { tuplet: 3 }),
      N(2, 0.5),
      N(0, 0.5),
      R(1),
    ],
  },
  {
    id: "emr",
    name: "Embellished Minor Resolution",
    shortName: "Embellished minor resolution",
    source: "Essential Jazz Vocabulary Workbook, Lick 2",
    octave: -2,
    pickupBeats: 0,
    learnBeats: 8,
    keyQuality: "minor",
    defaultKeyId: "A",
    elements: [
      N(8, 0.5),
      N(7, 0.5),
      N(6, 0.5),
      N(7, 0.5),
      N(15, 1, { articulation: "tenuto" }),
      N(11, 0.5),
      N(14, 2.5, { tie: true }),
      R(2),
    ],
  },
  {
    id: "gts",
    name: "Guide Tone Sequence",
    shortName: "Guide tone sequence",
    source: "Essential Jazz Vocabulary Workbook, Lick 3",
    octave: -2,
    pickupBeats: 0,
    learnBeats: 12,
    keyQuality: "major",
    defaultKeyId: "G",
    elements: [
      N(7, 0.5), N(6, 0.5), N(4, 0.5), N(2, 0.5),
      N(-1, 0.5), N(10, 0.5), N(9, 0.5), N(7, 0.5),
      N(5, 0.5), N(4, 0.5), N(2, 0.5), N(0, 0.5),
      N(-1, 0.5), N(8, 0.5), N(7, 0.5), N(5, 0.5),
      N(4, 2),
      R(2),
    ],
  },
  {
    id: "bo",
    name: "Bird Opening",
    shortName: "Bird opening",
    source: "Essential Jazz Vocabulary Workbook, Lick 4",
    octave: -1,
    pickupBeats: 0.5,
    learnBeats: 16,
    keyQuality: "major",
    defaultKeyId: "G",
    elements: [
      N(-5, 0.5, { pickup: true }),
      N(0, 1, { articulation: "staccato" }),
      N(2, 0.5),
      N(3, 0.5),
      N(4, 1, { articulation: "staccato" }),
      N(5, 0.5),
      N(6, 0.5),
      N(7, 0.5),
      N(4, 0.5),
      N(5, 0.5),
      N(7, 0.25),
      N(5, 0.25),
      N(4, 0.5),
      N(0, 0.5),
      N(-3, 0.5),
      N(-5, 0.5),
      N(0, 2),
      R(2),
    ],
  },
  {
    id: "hsr",
    name: "Honeysuckle Rose",
    shortName: "Honeysuckle Rose",
    source: "Essential Jazz Vocabulary Workbook, Lick 5",
    octave: -1,
    pickupBeats: 0,
    learnBeats: 8,
    keyQuality: "major",
    defaultKeyId: "C",
    elements: [
      N(5, 0.5),
      N(3, 0.5),
      N(-5, 0.5),
      N(-2, 0.5),
      N(2, 0.5),
      N(0, 0.5),
      R(1),
    ],
  },
];

export const ALL_APPLICATIONS = [
  {
    id: "minor-home",
    lickId: "cmar",
    formId: "autumn-leaves-8",
    label: "Minor home",
    cellName: "G minor",
    cellTonicInterval: 0,
    phraseStartBar: 7,
    phraseFunctionLabel: "i6 · Cry Me a River cell",
    entranceQuestion: "Did you find the G-minor door on bar 7?",
    afterQuestion: "Did you keep playing on the second Gm6 bar?",
    leadIn: CMAR_LEAD_HOME,
    resolve: CMAR_RESOLVE_HOME,
    copyKind: "cmar-home",
  },
  {
    id: "altered-dominant",
    lickId: "cmar",
    formId: "autumn-leaves-8",
    label: "Altered dominant",
    cellName: "E♭ minor",
    cellTonicInterval: -4,
    phraseStartBar: 6,
    phraseFunctionLabel: "V7 · E♭-minor cell (half-step above D)",
    entranceQuestion: "Did you enter on D7 (bar 6) with the E♭-minor shape?",
    afterQuestion: "Did you resolve into Gm and keep playing?",
    leadIn: CMAR_LEAD_ALT,
    resolve: CMAR_RESOLVE_ALT,
    copyKind: "cmar-altered",
  },
  {
    id: "cmar-learn",
    lickId: "cmar",
    formId: "cmar-learn",
    label: "Learn the lick",
    cellTonicInterval: 0,
    phraseStartBar: 1,
    includePickup: false,
    leadIn: [],
    resolve: [],
    copyKind: "learn",
  },
  {
    id: "emr-learn",
    lickId: "emr",
    formId: "emr-learn",
    label: "Learn the lick",
    cellTonicInterval: 0,
    phraseStartBar: 1,
    leadIn: [],
    resolve: [],
    copyKind: "learn",
  },
  {
    id: "emr-minor-251",
    lickId: "emr",
    formId: "minor-251",
    label: "Minor ii–V–i",
    cellTonicInterval: 0,
    phraseStartBar: 2,
    leadIn: [],
    resolve: [],
    copyKind: "place",
  },
  {
    id: "emr-autumn-leaves",
    lickId: "emr",
    formId: "autumn-leaves-8",
    label: "Autumn Leaves",
    cellTonicInterval: 0,
    phraseStartBar: 6,
    leadIn: [],
    resolve: [],
    copyKind: "place",
  },
  {
    id: "gts-learn",
    lickId: "gts",
    formId: "gts-learn",
    label: "Learn the lick",
    cellTonicInterval: 0,
    phraseStartBar: 1,
    leadIn: [],
    resolve: [],
    copyKind: "learn",
  },
  {
    id: "gts-turnaround",
    lickId: "gts",
    formId: "gts-turnaround",
    label: "iii–VI–ii–V",
    cellTonicInterval: 0,
    phraseStartBar: 1,
    leadIn: [],
    resolve: [],
    copyKind: "place",
  },
  {
    id: "gts-rhythm",
    lickId: "gts",
    formId: "rhythm-changes-a",
    label: "Rhythm changes",
    cellTonicInterval: 0,
    phraseStartBar: 3,
    leadIn: [],
    resolve: [],
    copyKind: "place",
  },
  {
    id: "bo-learn",
    lickId: "bo",
    formId: "bo-learn",
    label: "Learn the lick",
    cellTonicInterval: 7,
    phraseStartBar: 1,
    includePickup: false,
    leadIn: [],
    resolve: [],
    copyKind: "learn",
  },
  {
    id: "bo-into-i",
    lickId: "bo",
    formId: "dominant-to-i",
    label: "Into the I",
    cellTonicInterval: 7,
    phraseStartBar: 1,
    includePickup: true,
    leadIn: [],
    resolve: [],
    copyKind: "place",
  },
  {
    id: "bo-blues",
    lickId: "bo",
    formId: "blues-14",
    label: "Blues",
    cellTonicInterval: 0,
    phraseStartBar: 1,
    includePickup: true,
    leadIn: [],
    resolve: [],
    copyKind: "place",
  },
  {
    id: "hsr-learn",
    lickId: "hsr",
    formId: "hsr-learn",
    label: "Learn the lick",
    cellTonicInterval: 2,
    phraseStartBar: 1,
    leadIn: [],
    resolve: [],
    copyKind: "learn",
  },
  {
    id: "hsr-251",
    lickId: "hsr",
    formId: "major-251",
    label: "ii–V–I",
    cellTonicInterval: 2,
    phraseStartBar: 1,
    leadIn: [],
    resolve: [],
    copyKind: "place",
  },
  {
    id: "hsr-over-v7",
    lickId: "hsr",
    formId: "major-251",
    label: "Over V7",
    cellTonicInterval: 7,
    phraseStartBar: 2,
    leadIn: [],
    resolve: [],
    copyKind: "place",
  },
];

const SLEEVE_SETS = [
  ["amber", "teal", "oxblood"],
  ["teal", "oxblood", "amber"],
  ["oxblood", "amber", "teal"],
  ["amber", "oxblood", "teal"],
  ["teal", "amber", "oxblood"],
];

export const MODULES = [
  {
    id: "cmar",
    number: 1,
    lickId: "cmar",
    name: "Cry Me a River",
    sleeves: SLEEVE_SETS[0],
    lessons: [
      {
        id: "learn-lick",
        kind: "learn",
        applicationId: "minor-home",
        title: "Learn the lick",
        coverTitle: "Learn the lick",
        summary: "Hear, play, and recall the Cry Me a River cell in one key.",
        context: "The cell in this key",
        sleeve: SLEEVE_SETS[0][0],
        defaultKeyId: "G",
      },
      {
        id: "integrate-minor-home",
        kind: "integrate",
        applicationId: "minor-home",
        title: "Integrate: minor home",
        coverTitle: "Minor home",
        summary: "Land the cell on the i6 arrival (bar 7 of Autumn Leaves).",
        context: "Autumn Leaves · bar 7",
        sleeve: SLEEVE_SETS[0][1],
        defaultKeyId: "G",
      },
      {
        id: "integrate-altered-dominant",
        kind: "integrate",
        applicationId: "altered-dominant",
        title: "Integrate: altered dominant",
        coverTitle: "Altered dominant",
        summary: "Bring the same cell in over V7 (bar 6), then resolve.",
        context: "Over D7 · bar 6",
        sleeve: SLEEVE_SETS[0][2],
        defaultKeyId: "G",
      },
    ],
  },
  {
    id: "emr",
    number: 2,
    lickId: "emr",
    name: "Embellished Minor Resolution",
    sleeves: SLEEVE_SETS[1],
    lessons: [
      {
        id: "emr-learn",
        kind: "learn",
        applicationId: "emr-learn",
        title: "Learn the lick",
        coverTitle: "Learn the lick",
        summary: "Hear, play, and recall the embellished minor resolution.",
        context: "The lick in this key",
        sleeve: SLEEVE_SETS[1][0],
        defaultKeyId: "A",
      },
      {
        id: "emr-integrate-minor-251",
        kind: "integrate",
        applicationId: "emr-minor-251",
        title: "Integrate: minor ii–V–i",
        coverTitle: "Minor ii–V–i",
        summary: "Start on the V7♭9 (bar 2) and resolve into i.",
        context: "Minor ii–V–i · bar 2",
        sleeve: SLEEVE_SETS[1][1],
        defaultKeyId: "A",
      },
      {
        id: "emr-integrate-autumn-leaves",
        kind: "integrate",
        applicationId: "emr-autumn-leaves",
        title: "Integrate: Autumn Leaves",
        coverTitle: "Autumn Leaves",
        summary: "Place it over D7 in bar 6 and land on Gm6 in bar 7.",
        context: "Autumn Leaves · bar 6",
        sleeve: SLEEVE_SETS[1][2],
        defaultKeyId: "G",
      },
    ],
  },
  {
    id: "gts",
    number: 3,
    lickId: "gts",
    name: "Guide Tone Sequence",
    sleeves: SLEEVE_SETS[2],
    lessons: [
      {
        id: "gts-learn",
        kind: "learn",
        applicationId: "gts-learn",
        title: "Learn the lick",
        coverTitle: "Learn the lick",
        summary: "Hear, play, and recall the guide-tone sequence.",
        context: "The lick in this key",
        sleeve: SLEEVE_SETS[2][0],
        defaultKeyId: "G",
      },
      {
        id: "gts-integrate-turnaround",
        kind: "integrate",
        applicationId: "gts-turnaround",
        title: "Integrate: iii–VI–ii–V",
        coverTitle: "iii–VI–ii–V",
        summary: "Play the sequence from bar 1 through the I chord.",
        context: "iii–VI–ii–V · bar 1",
        sleeve: SLEEVE_SETS[2][1],
        defaultKeyId: "G",
      },
      {
        id: "gts-integrate-rhythm",
        kind: "integrate",
        applicationId: "gts-rhythm",
        title: "Integrate: rhythm changes",
        coverTitle: "Rhythm changes",
        summary: "Place it on bars 3–4 and resolve on bar 5.",
        context: "Rhythm changes · bar 3",
        sleeve: SLEEVE_SETS[2][2],
        defaultKeyId: "G",
      },
    ],
  },
  {
    id: "bo",
    number: 4,
    lickId: "bo",
    name: "Bird Opening",
    sleeves: SLEEVE_SETS[3],
    lessons: [
      {
        id: "bo-learn",
        kind: "learn",
        applicationId: "bo-learn",
        title: "Learn the lick",
        coverTitle: "Learn the lick",
        summary: "Hear, play, and recall the Bird opening, pickup included.",
        context: "The lick in this key",
        sleeve: SLEEVE_SETS[3][0],
        defaultKeyId: "G",
      },
      {
        id: "bo-integrate-into-i",
        kind: "integrate",
        applicationId: "bo-into-i",
        title: "Integrate: into the I",
        coverTitle: "Into the I",
        summary: "Pickup into bar 1 over V7, land on I in bar 3.",
        context: "Into the I · bar 1",
        sleeve: SLEEVE_SETS[3][1],
        defaultKeyId: "G",
      },
      {
        id: "bo-integrate-blues",
        kind: "integrate",
        applicationId: "bo-blues",
        title: "Integrate: blues",
        coverTitle: "Blues",
        summary: "Pickup into bar 1 of a G blues, landing in bar 3.",
        context: "Blues · bar 1",
        sleeve: SLEEVE_SETS[3][2],
        defaultKeyId: "G",
      },
    ],
  },
  {
    id: "hsr",
    number: 5,
    lickId: "hsr",
    name: "Honeysuckle Rose",
    sleeves: ["oxblood", "amber", "teal"],
    lessons: [
      {
        id: "hsr-learn",
        kind: "learn",
        applicationId: "hsr-learn",
        title: "Learn the lick",
        coverTitle: "Learn the lick",
        summary: "Hear, play, and recall the Honeysuckle Rose figure.",
        context: "The lick in this key",
        sleeve: "oxblood",
        defaultKeyId: "C",
      },
      {
        id: "hsr-integrate-251",
        kind: "integrate",
        applicationId: "hsr-251",
        title: "Integrate: ii–V–I",
        coverTitle: "ii–V–I",
        summary: "Place it over ii in bar 1 of a major ii–V–I.",
        context: "ii–V–I · bar 1",
        sleeve: "amber",
        defaultKeyId: "C",
      },
      {
        id: "hsr-integrate-over-v7",
        kind: "integrate",
        applicationId: "hsr-over-v7",
        title: "Integrate: over V7",
        coverTitle: "Over V7",
        summary: "Same form, lick on V7 in bar 2 resolving into I.",
        context: "Over V7 · bar 2",
        sleeve: "teal",
        defaultKeyId: "C",
      },
    ],
  },
];

export const APPLICATIONS = ALL_APPLICATIONS.filter((app) => (
  app.id === "minor-home" || app.id === "altered-dominant"
));

export const LESSONS = MODULES.flatMap((module) => module.lessons.map((lesson) => ({
  ...lesson,
  moduleId: module.id,
  moduleNumber: module.number,
  moduleName: module.name,
})));

export function lickById(id) {
  return LICKS.find((lick) => lick.id === id) ?? LICKS[0];
}

export function formById(id) {
  return FORMS[id] ?? FORMS["autumn-leaves-8"];
}

export function applicationById(id) {
  return ALL_APPLICATIONS.find((item) => item.id === id) ?? ALL_APPLICATIONS[0];
}

export function moduleById(id) {
  return MODULES.find((module) => module.id === id) ?? MODULES[0];
}

export function lessonById(id) {
  return LESSONS.find((lesson) => lesson.id === id) ?? LESSONS[0];
}

export function moduleForLesson(lessonId) {
  const lesson = lessonById(lessonId);
  return moduleById(lesson.moduleId);
}

export function lickForApplication(applicationId) {
  return lickById(applicationById(applicationId).lickId);
}

export function formForApplication(applicationId) {
  return formById(applicationById(applicationId).formId);
}

export function lickNoteElements(lick) {
  return lick.elements.filter((el) => el.type === "note");
}

export function lickTotalBeats(lick) {
  return lick.elements.reduce((sum, el) => sum + el.beats, 0);
}

export function formBarCount(form) {
  return form.bars.length;
}

export function formBeats(form) {
  return formBarCount(form) * 4;
}

export function learnBeatsFor(applicationId) {
  return lickForApplication(applicationId).learnBeats;
}

export function formBeatsFor(applicationId) {
  return formBeats(formForApplication(applicationId));
}

export function applicationKeyQuality(applicationId) {
  const app = applicationById(applicationId);
  return formById(app.formId).keyQuality ?? lickById(app.lickId).keyQuality ?? "minor";
}

export function phraseSpanBars(applicationId) {
  const app = applicationById(applicationId);
  const lick = lickById(app.lickId);
  const sounding = lickTotalBeats(lick);
  const pickup = app.includePickup ? lick.pickupBeats : 0;
  const start = (app.phraseStartBar - 1) * 4 - pickup;
  const end = start + sounding;
  const firstBar = Math.max(1, Math.floor((start + 1e-6) / 4) + 1);
  const lastBar = Math.max(firstBar, Math.ceil((end - 1e-6) / 4));
  const bars = [];
  for (let bar = firstBar; bar <= lastBar; bar += 1) bars.push(bar);
  return bars;
}
