/**
 * Workbook licks 6–30. Interval-only note data from Essential Jazz Vocabulary
 * Workbook (personal use). Do not store the PDF, page images, or long passages.
 */

const T16 = 0.5 / 3;
const SLEEVE_CYCLE = ["amber", "teal", "oxblood"];

function N(interval, beats = 0.5, extra = {}) {
  return { type: "note", interval, beats, ...extra };
}

function R(beats) {
  return { type: "rest", beats };
}

function bar(chords) {
  return { chords };
}

function chord(intervalFromTonic, quality, durationBeats = 4, extra = {}) {
  return { intervalFromTonic, quality, durationBeats, ...extra };
}

function withSleeves(lessons, start = 0) {
  return lessons.map((lesson, index) => ({
    ...lesson,
    sleeve: SLEEVE_CYCLE[(start + index) % SLEEVE_CYCLE.length],
  }));
}

function trip16(...intervals) {
  return intervals.map((interval) => N(interval, T16, { tuplet: 3 }));
}

/**
 * Book written pitches → intervals from the key tonic (transcribe-skill root:
 * largest tonic MIDI ≤ the lowest note). octave is that written register;
 * music.js raises per key so the floor is C3 when possible.
 */
const SPECS = [
  {
    n: 6,
    id: "1235",
    name: "1235 Cell",
    shortName: "1235 cell",
    defaultKeyId: "G",
    keyQuality: "major",
    octave: -2,
    bars: 1,
    formBars: [bar([chord(0, "major7")])],
    elements: [N(0), N(2), N(4), N(7), R(2)],
  },
  {
    n: 7,
    id: "br",
    name: "Bird Resolution",
    shortName: "Bird resolution",
    defaultKeyId: "G",
    keyQuality: "major",
    octave: -3,
    bars: 2,
    formBars: [bar([chord(0, "major7")]), bar([chord(0, "major7")])],
    elements: [
      R(0.5), N(7), N(9), N(11), N(14), N(12), N(11), N(12),
      N(16), N(19), R(1), R(2),
    ],
  },
  {
    n: 8,
    id: "dlr",
    name: "Donna Lee Resolution",
    shortName: "Donna Lee resolution",
    defaultKeyId: "C",
    keyQuality: "major",
    octave: -2,
    bars: 2,
    formBars: [bar([chord(7, "dominant7b9")]), bar([chord(0, "major7")])],
    elements: [
      N(11), N(14), N(17), N(19), N(20), N(22, 0.25), N(20, 0.25), N(19), N(17),
      N(16, 4),
    ],
  },
  {
    n: 9,
    id: "acvl",
    name: "Arpeggiated Chromatic Voice-Leading",
    shortName: "Arpeggiated chromatic voice-leading",
    defaultKeyId: "D",
    keyQuality: "major",
    octave: -2,
    bars: 3,
    formBars: [
      bar([chord(2, "minor7")]),
      bar([chord(7, "dominant7")]),
      bar([chord(0, "major7")]),
    ],
    elements: [
      N(14), N(17), N(21), N(13), N(17), N(21), N(12), N(17),
      N(21), N(17), N(14), N(12), N(11), N(14), N(17), N(21),
      N(19, 1, { articulation: "staccato" }), R(1), R(2),
    ],
  },
  {
    n: 10,
    id: "tm",
    name: "Tenor Madness",
    shortName: "Tenor Madness",
    defaultKeyId: "G",
    keyQuality: "major",
    octave: -2,
    bars: 2,
    formBars: [bar([chord(2, "minor7")]), bar([chord(7, "dominant7")])],
    elements: [
      N(14), N(9), N(5), N(2), N(13), N(9), N(5), N(2),
      N(12), N(9), N(10), N(11), R(2),
    ],
  },
  {
    n: 11,
    id: "tisc",
    name: "Third Inversion Seventh Chord",
    shortName: "Third inversion seventh chord",
    defaultKeyId: "D",
    keyQuality: "major",
    octave: -2,
    bars: 1,
    formBars: [bar([chord(0, "major7")])],
    elements: [N(11), N(12), N(16), N(19), N(23, 1), R(1)],
  },
  {
    n: 12,
    id: "et",
    name: "Embellished Triad",
    shortName: "Embellished triad",
    defaultKeyId: "D",
    keyQuality: "major",
    octave: -2,
    bars: 2,
    formBars: [bar([chord(0, "major7")]), bar([chord(0, "major7")])],
    elements: [
      N(26), N(24), N(15), N(16), N(21), N(19), N(11), N(12),
      N(17), N(16), N(6), N(7), N(14), N(12), R(1),
    ],
  },
  {
    n: 13,
    id: "cbc",
    name: "Classic Bebop Cell",
    shortName: "Classic bebop cell",
    defaultKeyId: "C",
    keyQuality: "major",
    octave: -1,
    bars: 1,
    formBars: [bar([chord(7, "dominant7")])],
    elements: [N(7), N(6), N(5), N(9), N(4), N(2), R(1)],
  },
  {
    n: 14,
    id: "jcdp",
    name: "John Coltrane Diminished Pattern",
    shortName: "John Coltrane diminished pattern",
    defaultKeyId: "F",
    keyQuality: "major",
    octave: -2,
    bars: 3,
    formBars: [
      bar([chord(7, "dominant7s9")]),
      bar([chord(7, "dominant7s9")]),
      bar([chord(0, "major7")]),
    ],
    elements: [
      N(19), N(17), N(13), N(11), N(16), N(14), N(10), N(8),
      N(13), N(11), N(7), N(5), N(10), N(8), N(4), N(2),
      N(7, 2), R(2),
    ],
  },
  {
    n: 15,
    id: "tdp",
    name: "Turning Diminished Pattern",
    shortName: "Turning diminished pattern",
    defaultKeyId: "B",
    keyQuality: "major",
    octave: -3,
    bars: 1,
    formBars: [bar([chord(7, "dominant7s9")])],
    elements: [
      ...trip16(7, 8, 7), N(5),
      ...trip16(10, 11, 10), N(8),
      ...trip16(13, 14, 13), N(11),
      N(16), ...trip16(17, 16, 14),
    ],
  },
  {
    n: 16,
    id: "se",
    name: "Sandwich Enclosure",
    shortName: "Sandwich enclosure",
    defaultKeyId: "Bb",
    keyQuality: "major",
    octave: -3,
    bars: 1,
    formBars: [bar([chord(2, "minor7", 2), chord(7, "dominant7", 2)])],
    elements: [N(14), N(9), N(12), N(9), N(11, 2)],
  },
  {
    n: 17,
    id: "mp",
    name: "Minor Passage",
    shortName: "Minor passage",
    defaultKeyId: "A",
    keyQuality: "minor",
    octave: -2,
    bars: 1,
    formBars: [bar([chord(0, "minor7")])],
    elements: [N(0), N(2), N(3), N(5), N(7), N(3), N(2), N(0)],
  },
  {
    n: 18,
    id: "ssr",
    name: "Sonny Stitt Resolution",
    shortName: "Sonny Stitt resolution",
    defaultKeyId: "C",
    keyQuality: "major",
    octave: -1,
    bars: 1,
    formBars: [bar([chord(0, "major7")])],
    elements: [
      N(0, 1, { articulation: "staccato" }),
      N(4),
      N(7),
      N(5, 1, { articulation: "staccato" }),
      N(9),
      N(12),
    ],
  },
  {
    n: 19,
    id: "sat",
    name: "Surprise Augmented Triad",
    shortName: "Surprise augmented triad",
    defaultKeyId: "D",
    keyQuality: "major",
    octave: -2,
    bars: 2,
    formBars: [
      bar([chord(2, "minor7", 2), chord(7, "dominant7", 2)]),
      bar([chord(0, "major7")]),
    ],
    elements: [
      N(5), N(7), N(9), N(12), N(16), N(15), N(11), N(7),
      N(14), N(12), R(1), R(2),
    ],
  },
  {
    n: 20,
    id: "ctdc",
    name: "Common-Tone Diminished Cell",
    shortName: "Common-tone diminished cell",
    defaultKeyId: "G",
    keyQuality: "major",
    octave: -2,
    bars: 1,
    formBars: [bar([chord(0, "major7")])],
    elements: [N(3), N(6), N(11), N(9), N(7), N(4, 1.5, { tie: true })],
  },
  {
    n: 21,
    id: "tpr",
    name: "Triad to Pentatonic Resolution",
    shortName: "Triad to pentatonic resolution",
    defaultKeyId: "D",
    keyQuality: "major",
    octave: -2,
    bars: 2,
    formBars: [
      bar([chord(2, "minor7", 2), chord(7, "dominant7", 2)]),
      bar([chord(0, "major7")]),
    ],
    elements: [
      N(12), N(9), N(5, 1, { articulation: "staccato" }), N(16), N(14), N(11), N(9),
      N(7, 2), R(2),
    ],
  },
  {
    n: 22,
    id: "ntp",
    name: "Neighbor-Tone Passage",
    shortName: "Neighbor-tone passage",
    defaultKeyId: "A",
    keyQuality: "minor",
    octave: -3,
    bars: 2,
    formBars: [bar([chord(0, "minor7")]), bar([chord(0, "minor7")])],
    elements: [
      N(12), N(11), N(12), N(14), N(15), N(14), N(15), N(17),
      N(19, 2), R(2),
    ],
  },
  {
    n: 23,
    id: "dct",
    name: "Decorated Chord Tones",
    shortName: "Decorated chord tones",
    defaultKeyId: "G",
    keyQuality: "major",
    octave: -2,
    bars: 3,
    formBars: [
      bar([chord(0, "major7")]),
      bar([chord(0, "major7")]),
      bar([chord(0, "major7")]),
    ],
    elements: [
      N(14), N(11), N(12), N(14), N(11), N(7), N(9), N(11),
      N(7), N(4), N(5), N(7), N(4), N(0), N(2), N(4),
      N(0, 2), R(2),
    ],
  },
  {
    n: 24,
    id: "ae",
    name: "Altered Enclosure",
    shortName: "Altered enclosure",
    defaultKeyId: "C",
    keyQuality: "major",
    octave: -1,
    bars: 1,
    formBars: [bar([chord(7, "dominant7alt", 2), chord(0, "major7", 2)])],
    elements: [N(10), N(8), N(3), N(5), N(7, 2)],
  },
  {
    n: 25,
    id: "fe",
    name: "Fun Enclosure",
    shortName: "Fun enclosure",
    defaultKeyId: "Bb",
    keyQuality: "major",
    octave: -2,
    bars: 1,
    formBars: [bar([chord(0, "major7")])],
    elements: [N(11), N(12, 0.25), N(13, 0.25), N(14), N(11), N(12, 2)],
  },
  {
    n: 26,
    id: "bb",
    name: "Bread and Butter",
    shortName: "Bread and butter",
    defaultKeyId: "C",
    keyQuality: "major",
    octave: -2,
    bars: 1,
    formBars: [bar([chord(0, "major7")])],
    elements: [N(7), N(9), N(11), N(14), N(11), N(12), N(16), N(19)],
  },
  {
    n: 27,
    id: "lg",
    name: "Lydian Grip",
    shortName: "Lydian grip",
    defaultKeyId: "F",
    keyQuality: "major",
    octave: -2,
    bars: 1,
    formBars: [bar([chord(0, "major7b5")])],
    elements: [N(0), N(4), N(6), N(11), R(2)],
  },
  {
    n: 28,
    id: "bcf",
    name: "Bird's Chromatic Frenzy",
    shortName: "Bird's chromatic frenzy",
    defaultKeyId: "D",
    keyQuality: "major",
    octave: -2,
    bars: 3,
    formBars: [
      bar([chord(2, "minor7")]),
      bar([chord(7, "dominant7")]),
      bar([chord(0, "major7")]),
    ],
    elements: [
      N(24), N(21), N(22), N(23), N(19), N(20), N(21), N(19),
      N(17), N(16), N(14), N(12), N(11), N(14), N(17), N(21),
      N(19, 1, { articulation: "tenuto" }), R(1), R(2),
    ],
  },
  {
    n: 29,
    id: "dss",
    name: "Diminished Stairsteps",
    shortName: "Diminished stairsteps",
    defaultKeyId: "C",
    keyQuality: "major",
    octave: -1,
    pickupBeats: 1,
    bars: 2,
    formBars: [bar([chord(0, "diminished7")]), bar([chord(0, "diminished7")])],
    elements: [
      N(0, 0.5, { pickup: true }),
      N(2, 0.5, { pickup: true }),
      N(3), N(5), N(2), N(3), N(0), N(2), N(3), N(5),
      N(6), N(8), N(5), N(6), N(3, 2),
    ],
  },
  {
    n: 30,
    id: "nnr",
    name: "Nine to Nine Resolution",
    shortName: "Nine to nine resolution",
    defaultKeyId: "C",
    keyQuality: "major",
    octave: -2,
    bars: 2,
    formBars: [
      bar([chord(2, "minor7", 2), chord(7, "dominant7", 2)]),
      bar([chord(0, "major7")]),
    ],
    elements: [
      N(16), N(17, 0.25), N(18, 0.25), N(19), N(15, 2, { tie: true }), N(11),
      N(14), N(12, 1.5, { tie: true }), R(2),
    ],
  },
];

function expandSpec(spec) {
  const pickupBeats = spec.pickupBeats ?? 0;
  const learnBeats = spec.bars * 4;
  const formId = `${spec.id}-learn`;
  const lick = {
    id: spec.id,
    name: spec.name,
    shortName: spec.shortName,
    source: `Essential Jazz Vocabulary Workbook, Lick ${spec.n}`,
    octave: spec.octave,
    pickupBeats,
    learnBeats,
    keyQuality: spec.keyQuality,
    defaultKeyId: spec.defaultKeyId,
    workbookN: spec.n,
    workbookBars: spec.bars,
    elements: spec.elements,
  };
  const form = {
    id: formId,
    title: spec.name,
    shortTitle: "The lick",
    keyQuality: spec.keyQuality,
    bars: spec.formBars,
  };
  const application = {
    id: formId,
    lickId: spec.id,
    formId,
    label: "Learn the lick",
    cellTonicInterval: 0,
    phraseStartBar: 1,
    includePickup: pickupBeats > 0,
    leadIn: [],
    resolve: [],
    copyKind: "learn",
  };
  return { lick, form, application, spec };
}

const EXPANDED = SPECS.map(expandSpec);

export const WORKBOOK_SPECS = SPECS;
export const WORKBOOK_LICKS = EXPANDED.map((item) => item.lick);
export const WORKBOOK_FORMS = Object.fromEntries(EXPANDED.map((item) => [item.form.id, item.form]));
export const WORKBOOK_APPLICATIONS = EXPANDED.map((item) => item.application);

export const WORKBOOK_MODULES = EXPANDED.map((item, index) => ({
  id: item.spec.id,
  number: item.spec.n,
  lickId: item.spec.id,
  name: item.spec.name,
  lessons: withSleeves([
    {
      id: item.application.id,
      kind: "learn",
      applicationId: item.application.id,
      title: "Learn the lick",
      coverTitle: "Learn the lick",
      summary: `Hear, play, and recall ${item.spec.shortName}.`,
      context: "The lick in this key",
      defaultKeyId: item.spec.defaultKeyId,
    },
  ], 1 + index),
}));
