/**
 * Lick registry for the browser prototype.
 * Interval-only note data from Essential Jazz Vocabulary Workbook (personal use).
 * Do not store the PDF, page images, or long passages of its text.
 */

import {
  TUNES,
  deriveTuneForms,
  deriveTuneApplications,
  deriveYourTunesLessons,
  deriveMyTunesLessons,
  tuneById,
  tuneExcerptForm,
  spotsForTune,
} from "./tunes.js";
import {
  WORKBOOK_LICKS,
  WORKBOOK_FORMS,
  WORKBOOK_APPLICATIONS,
  buildWorkbookModules,
} from "./workbook-licks.js";
import {
  WORKBOOK_TRACK_FORMS,
  WORKBOOK_TRACK_APPLICATIONS,
} from "./workbook-tracks.js";

export { TUNES };

export const TROMBONE_LOW_MIDI = 40; // E2
/** Preferred ceiling (Bb4). Notes may go higher when a lick cannot fit under it. */
export const TROMBONE_HIGH_MIDI = 70; // Bb4
/** Brian’s floor: rarely wants to play below C3. */
export const REGISTER_FLOOR_MIDI = 48; // C3
export const REGISTER_CEIL_MIDI = 70; // Bb4

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

function chord(intervalFromTonic, quality, durationBeats = 4, extra = {}) {
  return { intervalFromTonic, quality, durationBeats, ...extra };
}

function ireal(tune) {
  return `iReal Pro Jazz 1460 · ${tune}`;
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
  "blue-bossa-8": tuneExcerptForm({
    id: "blue-bossa-8",
    title: "Blue Bossa · bars 1–8",
    tuneId: "blue-bossa",
    start: 1,
    count: 8,
    source: ireal("Blue Bossa"),
  }),
  "fly-me-a-8": {
    id: "fly-me-a-8",
    title: "Fly Me to the Moon · A, bars 1–8",
    shortTitle: "Fly Me to the Moon",
    source: ireal("Fly Me to the Moon"),
    keyQuality: "major",
    bars: [
      bar([chord(9, "minor7")]),
      bar([chord(2, "minor7")]),
      bar([chord(7, "dominant7")]),
      bar([chord(0, "major7")]),
      bar([chord(5, "major7")]),
      bar([chord(11, "halfdim7")]),
      bar([chord(4, "dominant7b9")]),
      bar([chord(9, "minor7", 2), chord(9, "dominant7", 2)]),
    ],
  },
  "summertime-8": {
    id: "summertime-8",
    title: "Summertime · bars 1–8",
    shortTitle: "Summertime",
    source: ireal("Summertime"),
    keyQuality: "minor",
    bars: [
      bar([chord(0, "minor7")]),
      bar([chord(2, "halfdim7", 2), chord(7, "dominant7b13", 2)]),
      bar([chord(0, "minor7")]),
      bar([chord(0, "dominant7b9")]),
      bar([chord(5, "minor7")]),
      bar([chord(8, "dominant7")]),
      bar([chord(2, "halfdim7")]),
      bar([chord(7, "dominant7b13")]),
    ],
  },
  "cry-me-a-8": {
    id: "cry-me-a-8",
    title: "Cry Me a River · A, bars 1–8",
    shortTitle: "Cry Me a River",
    source: ireal("Cry Me a River"),
    keyQuality: "major",
    bars: [
      bar([chord(9, "minor", 2), chord(9, "minorb6", 2)]),
      bar([chord(9, "minor6", 2), chord(9, "minor7", 2)]),
      bar([chord(2, "minor7", 2), chord(7, "dominant7", 2)]),
      bar([chord(0, "major7", 2), chord(4, "dominant7b9", 2)]),
      bar([chord(4, "halfdim7", 2), chord(9, "dominant7b9", 2)]),
      bar([chord(2, "dominant9")]),
      bar([chord(2, "minor7", 2), chord(7, "dominant7sus", 2)]),
      bar([chord(0, "major6", 2), chord(4, "dominant7b13", 2)]),
    ],
  },
  "autumn-leaves-a-8": {
    id: "autumn-leaves-a-8",
    title: "Autumn Leaves · A, bars 1–8",
    shortTitle: "Autumn Leaves",
    source: ireal("Autumn Leaves"),
    keyQuality: "minor",
    bars: [
      bar([chord(5, "minor7")]),
      bar([chord(10, "dominant7")]),
      bar([chord(3, "major7")]),
      bar([chord(8, "major7")]),
      bar([chord(2, "halfdim7")]),
      bar([chord(7, "dominant7b13")]),
      bar([chord(0, "minor6")]),
      bar([chord(0, "minor6")]),
    ],
  },
  "blue-bossa-16": tuneExcerptForm({
    id: "blue-bossa-16",
    title: "Blue Bossa · bars 1–16",
    tuneId: "blue-bossa",
    start: 1,
    count: 16,
    source: ireal("Blue Bossa"),
  }),
  "softly-a-9": {
    id: "softly-a-9",
    title: "Softly, As in a Morning Sunrise · A, bars 1–9",
    shortTitle: "Softly, As in a Morning Sunrise",
    source: ireal("Softly, As in a Morning Sunrise"),
    keyQuality: "minor",
    bars: [
      bar([chord(0, "minor7")]),
      bar([chord(2, "halfdim7", 2), chord(7, "dominant7b9", 2)]),
      bar([chord(0, "minor7")]),
      bar([chord(2, "halfdim7", 2), chord(7, "dominant7b9", 2)]),
      bar([chord(0, "minor7")]),
      bar([chord(2, "halfdim7", 2), chord(7, "dominant7b9", 2)]),
      bar([chord(0, "minor7")]),
      bar([chord(2, "halfdim7", 2), chord(7, "dominant7b9", 2)]),
      bar([chord(0, "minor7")]),
    ],
  },
  "oleo-last-a-8": {
    id: "oleo-last-a-8",
    title: "Oleo · last A, bars 1–8",
    shortTitle: "Oleo",
    source: ireal("Oleo"),
    keyQuality: "major",
    bars: [
      bar([chord(0, "major7", 2), chord(9, "dominant7", 2)]),
      bar([chord(2, "minor7", 2), chord(7, "dominant7", 2)]),
      bar([chord(4, "minor7", 2), chord(9, "dominant7", 2)]),
      bar([chord(2, "minor7", 2), chord(7, "dominant7", 2)]),
      bar([chord(7, "minor7", 2), chord(0, "dominant7", 2)]),
      bar([chord(5, "dominant7", 2), chord(10, "dominant7", 2)]),
      bar([chord(2, "minor7", 2), chord(7, "dominant7", 2)]),
      bar([chord(0, "major6")]),
    ],
  },
  "jones-last-a-8": {
    id: "jones-last-a-8",
    title: "Have You Met Miss Jones? · last A, bars 1–8",
    shortTitle: "Have You Met Miss Jones?",
    source: ireal("Have You Met Miss Jones?"),
    keyQuality: "major",
    bars: [
      bar([chord(0, "major7", 2), chord(5, "dominant7", 2)]),
      bar([chord(4, "minor7", 2), chord(9, "dominant7", 2)]),
      bar([chord(2, "minor7")]),
      bar([chord(7, "dominant7")]),
      bar([chord(4, "minor7", 2), chord(9, "dominant7", 2)]),
      bar([chord(2, "minor7", 2), chord(7, "dominant7", 2)]),
      bar([chord(0, "major6")]),
      bar([chord(2, "minor7", 2), chord(7, "dominant7", 2)]),
    ],
  },
  "misty-a-9": {
    id: "misty-a-9",
    title: "Misty · A, bars 1–9",
    shortTitle: "Misty",
    source: ireal("Misty"),
    keyQuality: "major",
    bars: [
      bar([chord(0, "major7")]),
      bar([chord(7, "minor7", 2), chord(0, "dominant7", 2)]),
      bar([chord(5, "major7")]),
      bar([chord(5, "minor7", 2), chord(10, "dominant7", 2)]),
      bar([chord(0, "major7", 2), chord(9, "minor7", 2)]),
      bar([chord(2, "minor7", 2), chord(7, "dominant7", 2)]),
      bar([chord(4, "minor7", 2), chord(9, "dominant7", 2)]),
      bar([chord(2, "minor7", 2), chord(7, "dominant7", 2)]),
      bar([chord(0, "major6")]),
    ],
  },
  "billies-bounce-12": {
    id: "billies-bounce-12",
    title: "Billie's Bounce · 12-bar blues",
    shortTitle: "Billie's Bounce",
    source: ireal("Billie's Bounce"),
    keyQuality: "major",
    bars: [
      bar([chord(0, "dominant7")]),
      bar([chord(5, "dominant7")]),
      bar([chord(0, "dominant7")]),
      bar([chord(7, "minor7", 2), chord(0, "dominant7", 2)]),
      bar([chord(5, "dominant7")]),
      bar([chord(6, "diminished7")]),
      bar([chord(0, "dominant7")]),
      bar([chord(4, "minor7", 2), chord(9, "dominant7", 2)]),
      bar([chord(2, "minor7")]),
      bar([chord(7, "dominant7")]),
      bar([chord(0, "dominant7", 2), chord(9, "dominant7", 2)]),
      bar([chord(2, "minor7", 2), chord(7, "dominant7", 2)]),
    ],
  },
  "rhythm-bridge-8": {
    id: "rhythm-bridge-8",
    title: "I Got Rhythm · bridge",
    shortTitle: "I Got Rhythm",
    source: ireal("I Got Rhythm"),
    keyQuality: "major",
    bars: [
      bar([chord(4, "dominant7")]),
      bar([chord(4, "dominant7")]),
      bar([chord(9, "dominant7")]),
      bar([chord(9, "dominant7")]),
      bar([chord(2, "dominant7")]),
      bar([chord(2, "dominant7")]),
      bar([chord(7, "dominant7")]),
      bar([chord(7, "dominant7")]),
    ],
  },
  "hsr-bridge-8": {
    id: "hsr-bridge-8",
    title: "Honeysuckle Rose · bridge",
    shortTitle: "Honeysuckle Rose",
    source: ireal("Honeysuckle Rose"),
    keyQuality: "major",
    bars: [
      bar([chord(0, "dominant7")]),
      bar([chord(0, "dominant7")]),
      bar([chord(5, "major6")]),
      bar([chord(5, "major6")]),
      bar([chord(2, "dominant7")]),
      bar([chord(2, "dominant7")]),
      bar([chord(7, "dominant7")]),
      bar([chord(7, "dominant7")]),
    ],
  },
  "hsr-a-8": {
    id: "hsr-a-8",
    title: "Honeysuckle Rose · A, bars 1–8",
    shortTitle: "Honeysuckle Rose",
    source: ireal("Honeysuckle Rose"),
    keyQuality: "major",
    bars: [
      bar([chord(2, "minor7", 2), chord(7, "dominant7", 2)]),
      bar([chord(2, "minor7", 2), chord(7, "dominant7", 2)]),
      bar([chord(2, "minor7", 2), chord(7, "dominant7", 2)]),
      bar([chord(2, "minor7", 2), chord(7, "dominant7", 2)]),
      bar([chord(0, "major6", 2), chord(0, "dominant7", 2, { slashIntervalFromTonic: 4 })]),
      bar([chord(5, "major6", 2), chord(7, "dominant7", 2)]),
      bar([chord(0, "major6", 2), chord(5, "dominant7", 2)]),
      bar([chord(4, "minor7", 2), chord(9, "dominant7", 2)]),
    ],
  },
  "a-train-a-8": {
    id: "a-train-a-8",
    title: "Take the A Train · A, bars 1–8",
    shortTitle: "Take the A Train",
    source: ireal("Take the A Train"),
    keyQuality: "major",
    bars: [
      bar([chord(0, "major6")]),
      bar([chord(0, "major6")]),
      bar([chord(2, "dominant7s11")]),
      bar([chord(2, "dominant7s11")]),
      bar([chord(2, "minor7")]),
      bar([chord(7, "dominant7")]),
      bar([chord(0, "major6")]),
      bar([chord(2, "minor7", 2), chord(7, "dominant7", 2)]),
    ],
  },
  "satin-doll-a-8": {
    id: "satin-doll-a-8",
    title: "Satin Doll · A, bars 1–8",
    shortTitle: "Satin Doll",
    source: ireal("Satin Doll"),
    keyQuality: "major",
    bars: [
      bar([chord(2, "minor7", 2), chord(7, "dominant7", 2)]),
      bar([chord(2, "minor7", 2), chord(7, "dominant7", 2)]),
      bar([chord(4, "minor7", 2), chord(9, "dominant7", 2)]),
      bar([chord(4, "minor7", 2), chord(9, "dominant7", 2)]),
      bar([chord(9, "minor7", 2), chord(2, "dominant7", 2)]),
      bar([chord(8, "minor7", 2, { usesFlats: true }), chord(1, "dominant7", 2, { usesFlats: true })]),
      bar([chord(0, "major7")]),
      bar([chord(0, "major7")]),
    ],
  },
  "attya-a-8": {
    id: "attya-a-8",
    title: "All the Things You Are · A, bars 1–8",
    shortTitle: "All the Things You Are",
    source: ireal("All the Things You Are"),
    keyQuality: "major",
    bars: [
      bar([chord(9, "minor7")]),
      bar([chord(2, "minor7")]),
      bar([chord(7, "dominant7")]),
      bar([chord(0, "major7")]),
      bar([chord(5, "major7")]),
      bar([chord(6, "minor7", 2), chord(11, "dominant7", 2)]),
      bar([chord(4, "major7")]),
      bar([chord(4, "major7")]),
    ],
  },
  ...deriveTuneForms(TUNES),
  ...WORKBOOK_FORMS,
  ...WORKBOOK_TRACK_FORMS,
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
  ...WORKBOOK_LICKS,
];

export const FRAGMENTS = {
  "gts-half": {
    elements: [
      N(5, 0.5), N(4, 0.5), N(2, 0.5), N(0, 0.5),
      N(-1, 0.5), N(8, 0.5), N(7, 0.5), N(5, 0.5),
    ],
    pickupBeats: 0,
    resolution: N(4, 2),
  },
  "bo-first": {
    elements: [
      N(-5, 0.5, { pickup: true }),
      N(0, 1, { articulation: "staccato" }),
      N(2, 0.5),
      N(3, 0.5),
      N(4, 1, { articulation: "staccato" }),
      N(5, 0.5),
      N(6, 0.5),
    ],
    pickupBeats: 0.5,
  },
  "bo-second": {
    elements: [
      N(7, 0.5), N(4, 0.5), N(5, 0.5), N(7, 0.25), N(5, 0.25),
      N(4, 0.5), N(0, 0.5), N(-3, 0.5), N(-5, 0.5),
      N(0, 2),
    ],
    pickupBeats: 0,
  },
  "hsr-altered": {
    elements: [
      N(5, 0.5), N(3, 0.5), N(-6, 0.5), N(-2, 0.5), N(2, 0.5), N(0, 0.5), R(1),
    ],
    pickupBeats: 0,
  },
};

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
    id: "cmar-blue-bossa",
    lickId: "cmar",
    formId: "blue-bossa-8",
    label: "Blue Bossa",
    cellTonicInterval: 0,
    phraseStartBar: 1,
    copyKind: "place",
    tuneId: "blue-bossa",
  },
  {
    id: "cmar-fly-me",
    lickId: "cmar",
    formId: "fly-me-a-8",
    label: "Fly Me to the Moon",
    cellTonicInterval: 9,
    phraseStartBar: 1,
    copyKind: "place",
    spots: [
      { bar: 1, fragment: "full", anchorInterval: 9 },
      { bar: 2, fragment: "full", anchorInterval: 2 },
      { bar: 5, fragment: "full", anchorInterval: 2 },
      { bar: 8, fragment: "full", anchorInterval: 9 },
    ],
  },
  {
    id: "cmar-summertime",
    lickId: "cmar",
    formId: "summertime-8",
    label: "Summertime",
    cellTonicInterval: 0,
    phraseStartBar: 1,
    copyKind: "place",
    spots: [
      { bar: 1, fragment: "full", anchorInterval: 0 },
      { bar: 3, fragment: "full", anchorInterval: 0 },
      { bar: 5, fragment: "full", anchorInterval: 5 },
    ],
  },
  {
    id: "cmar-cry-me",
    lickId: "cmar",
    formId: "cry-me-a-8",
    label: "Cry Me a River",
    cellTonicInterval: 9,
    phraseStartBar: 1,
    copyKind: "place",
    spots: [
      { bar: 1, fragment: "full", anchorInterval: 9 },
      { bar: 3, fragment: "full", anchorInterval: 2 },
    ],
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
    id: "emr-autumn-leaves-a",
    lickId: "emr",
    formId: "autumn-leaves-a-8",
    label: "Autumn Leaves",
    cellTonicInterval: 0,
    phraseStartBar: 6,
    copyKind: "place",
    spots: [{ bar: 6, fragment: "full", anchorInterval: 0 }],
  },
  {
    id: "emr-blue-bossa",
    lickId: "emr",
    formId: "blue-bossa-16",
    label: "Blue Bossa",
    cellTonicInterval: 0,
    phraseStartBar: 6,
    copyKind: "place",
    tuneId: "blue-bossa",
    spots: [
      { bar: 6, fragment: "full", anchorInterval: 0 },
      { bar: 14, fragment: "full", anchorInterval: 0 },
    ],
  },
  {
    id: "emr-softly",
    lickId: "emr",
    formId: "softly-a-9",
    label: "Softly, As in a Morning Sunrise",
    cellTonicInterval: 0,
    phraseStartBar: 2,
    copyKind: "place",
    spots: [
      { bar: 2, fragment: "full", anchorInterval: 0 },
      { bar: 4, fragment: "full", anchorInterval: 0 },
      { bar: 6, fragment: "full", anchorInterval: 0 },
      { bar: 8, fragment: "full", anchorInterval: 0 },
    ],
  },
  {
    id: "emr-fly-me",
    lickId: "emr",
    formId: "fly-me-a-8",
    label: "Fly Me to the Moon",
    cellTonicInterval: 9,
    phraseStartBar: 7,
    copyKind: "place",
    spots: [{ bar: 7, fragment: "full", anchorInterval: 9 }],
  },
  {
    id: "gts-oleo",
    lickId: "gts",
    formId: "oleo-last-a-8",
    label: "Oleo",
    cellTonicInterval: 0,
    phraseStartBar: 3,
    copyKind: "place",
    spots: [
      { bar: 3, fragment: "full", anchorInterval: 0 },
      { bar: 7, fragment: "gts-half", anchorInterval: 0 },
    ],
  },
  {
    id: "gts-jones",
    lickId: "gts",
    formId: "jones-last-a-8",
    label: "Have You Met Miss Jones?",
    cellTonicInterval: 0,
    phraseStartBar: 5,
    copyKind: "place",
    spots: [{ bar: 5, fragment: "full", anchorInterval: 0 }],
  },
  {
    id: "gts-misty",
    lickId: "gts",
    formId: "misty-a-9",
    label: "Misty",
    cellTonicInterval: 0,
    phraseStartBar: 2,
    copyKind: "place",
    spots: [
      { bar: 2, fragment: "gts-half", anchorInterval: 5 },
      { bar: 7, fragment: "full", anchorInterval: 0 },
    ],
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
    id: "bo-billies",
    lickId: "bo",
    formId: "billies-bounce-12",
    label: "Billie's Bounce",
    cellTonicInterval: 0,
    phraseStartBar: 1,
    copyKind: "place",
    spots: [
      { bar: 1, fragment: "bo-first", anchorInterval: 0, pickup: true },
      { bar: 7, fragment: "bo-first", anchorInterval: 0, pickup: true },
    ],
  },
  {
    id: "bo-rhythm",
    lickId: "bo",
    formId: "rhythm-bridge-8",
    label: "I Got Rhythm",
    cellTonicInterval: 4,
    phraseStartBar: 1,
    copyKind: "place",
    spots: [
      { bar: 1, fragment: "full", anchorInterval: 4, pickup: true },
      { bar: 5, fragment: "full", anchorInterval: 2, pickup: true },
    ],
  },
  {
    id: "bo-honeysuckle",
    lickId: "bo",
    formId: "hsr-bridge-8",
    label: "Honeysuckle Rose",
    cellTonicInterval: 0,
    phraseStartBar: 1,
    copyKind: "place",
    spots: [
      { bar: 1, fragment: "full", anchorInterval: 0, pickup: true },
      { bar: 5, fragment: "full", anchorInterval: 2, pickup: true },
    ],
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
    id: "hsr-honeysuckle",
    lickId: "hsr",
    formId: "hsr-a-8",
    label: "Honeysuckle Rose",
    cellTonicInterval: 2,
    phraseStartBar: 1,
    copyKind: "place",
    spots: [
      { bar: 1, fragment: "full", anchorInterval: 2 },
      { bar: 3, fragment: "hsr-altered", anchorInterval: 2 },
    ],
  },
  {
    id: "hsr-a-train",
    lickId: "hsr",
    formId: "a-train-a-8",
    label: "Take the A Train",
    cellTonicInterval: 2,
    phraseStartBar: 5,
    copyKind: "place",
    spots: [
      { bar: 5, fragment: "full", anchorInterval: 2 },
      { bar: 6, fragment: "hsr-altered", anchorInterval: 2 },
    ],
  },
  {
    id: "hsr-satin",
    lickId: "hsr",
    formId: "satin-doll-a-8",
    label: "Satin Doll",
    cellTonicInterval: 2,
    phraseStartBar: 1,
    copyKind: "place",
    spots: [
      { bar: 1, fragment: "full", anchorInterval: 2 },
      { bar: 3, fragment: "full", anchorInterval: 4 },
      { bar: 5, fragment: "full", anchorInterval: 9 },
      { bar: 6, fragment: "full", anchorInterval: 8 },
    ],
  },
  {
    id: "hsr-attya",
    lickId: "hsr",
    formId: "attya-a-8",
    label: "All the Things You Are",
    cellTonicInterval: 9,
    phraseStartBar: 1,
    copyKind: "place",
    spots: [
      { bar: 1, fragment: "full", anchorInterval: 9 },
      { bar: 2, fragment: "full", anchorInterval: 2 },
      { bar: 3, fragment: "hsr-altered", anchorInterval: 2 },
    ],
  },
  ...deriveTuneApplications(TUNES),
  ...WORKBOOK_APPLICATIONS,
  ...WORKBOOK_TRACK_APPLICATIONS,
];

const SLEEVE_CYCLE = ["amber", "teal", "oxblood"];

function withSleeves(lessons, start = 0) {
  return lessons.map((lesson, index) => ({
    ...lesson,
    sleeve: SLEEVE_CYCLE[(start + index) % SLEEVE_CYCLE.length],
  }));
}

export const MODULES = [
  {
    id: "cmar",
    number: 1,
    lickId: "cmar",
    name: "Cry Me a River",
    lessons: withSleeves([
      {
        id: "learn-lick",
        kind: "learn",
        applicationId: "minor-home",
        title: "Learn the lick",
        coverTitle: "Learn the lick",
        summary: "Hear, play, and recall the Cry Me a River cell in one key.",
        context: "The cell in this key",
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
        defaultKeyId: "G",
      },
      {
        id: "cmar-integrate-blue-bossa",
        kind: "integrate",
        applicationId: "cmar-blue-bossa",
        title: "Integrate: Blue Bossa",
        coverTitle: "Blue Bossa",
        summary: "Place the cell on bars 1, 3, and 7 of Blue Bossa.",
        context: "Blue Bossa · bars 1–8",
        defaultKeyId: "C",
      },
      {
        id: "cmar-integrate-fly-me",
        kind: "integrate",
        applicationId: "cmar-fly-me",
        title: "Integrate: Fly Me to the Moon",
        coverTitle: "Fly Me to the Moon",
        summary: "Four doors in the A section, including the cell from the 6th of Fmaj7.",
        context: "Fly Me to the Moon · A, bars 1–8",
        defaultKeyId: "C",
      },
      {
        id: "cmar-integrate-summertime",
        kind: "integrate",
        applicationId: "cmar-summertime",
        title: "Integrate: Summertime",
        coverTitle: "Summertime",
        summary: "Land the cell on bars 1, 3, and 5 of Summertime.",
        context: "Summertime · bars 1–8",
        defaultKeyId: "A",
      },
      {
        id: "cmar-integrate-cry-me",
        kind: "integrate",
        applicationId: "cmar-cry-me",
        title: "Integrate: Cry Me a River",
        coverTitle: "Cry Me a River",
        summary: "The namesake A section, cell on bars 1 and 3.",
        context: "Cry Me a River · A, bars 1–8",
        defaultKeyId: "Eb",
      },
      ...deriveYourTunesLessons("cmar"),
    ], 0),
  },
  {
    id: "emr",
    number: 2,
    lickId: "emr",
    name: "Embellished Minor Resolution",
    lessons: withSleeves([
      {
        id: "emr-learn",
        kind: "learn",
        applicationId: "emr-learn",
        title: "Learn the lick",
        coverTitle: "Learn the lick",
        summary: "Hear, play, and recall the embellished minor resolution.",
        context: "The lick in this key",
        defaultKeyId: "A",
      },
      {
        id: "emr-integrate-autumn-leaves",
        kind: "integrate",
        applicationId: "emr-autumn-leaves-a",
        title: "Integrate: Autumn Leaves",
        coverTitle: "Autumn Leaves",
        summary: "Over D7 in bar 6 of the A section, landing on Gm6.",
        context: "Autumn Leaves · A, bars 1–8",
        defaultKeyId: "G",
      },
      {
        id: "emr-integrate-blue-bossa",
        kind: "integrate",
        applicationId: "emr-blue-bossa",
        title: "Integrate: Blue Bossa",
        coverTitle: "Blue Bossa",
        summary: "Resolve into C minor from the V in bars 6 and 14.",
        context: "Blue Bossa · bars 1–16",
        defaultKeyId: "C",
      },
      {
        id: "emr-integrate-softly",
        kind: "integrate",
        applicationId: "emr-softly",
        title: "Integrate: Softly, As in a Morning Sunrise",
        coverTitle: "Softly, As in a Morning Sunrise",
        summary: "Four V–i landings in the A section.",
        context: "Softly, As in a Morning Sunrise · A, bars 1–9",
        defaultKeyId: "C",
      },
      {
        id: "emr-integrate-fly-me",
        kind: "integrate",
        applicationId: "emr-fly-me",
        title: "Integrate: Fly Me to the Moon",
        coverTitle: "Fly Me to the Moon",
        summary: "From E7♭9 into A minor on bar 7 of the A section.",
        context: "Fly Me to the Moon · A, bars 1–8",
        defaultKeyId: "C",
      },
      ...deriveYourTunesLessons("emr"),
    ], 1),
  },
  {
    id: "gts",
    number: 3,
    lickId: "gts",
    name: "Guide Tone Sequence",
    lessons: withSleeves([
      {
        id: "gts-learn",
        kind: "learn",
        applicationId: "gts-learn",
        title: "Learn the lick",
        coverTitle: "Learn the lick",
        summary: "Hear, play, and recall the guide-tone sequence.",
        context: "The lick in this key",
        defaultKeyId: "G",
      },
      {
        id: "gts-integrate-oleo",
        kind: "integrate",
        applicationId: "gts-oleo",
        title: "Integrate: Oleo",
        coverTitle: "Oleo",
        summary: "Full sequence on bars 3–4, half cell on bar 7.",
        context: "Oleo · last A, bars 1–8",
        defaultKeyId: "Bb",
      },
      {
        id: "gts-integrate-jones",
        kind: "integrate",
        applicationId: "gts-jones",
        title: "Integrate: Have You Met Miss Jones?",
        coverTitle: "Have You Met Miss Jones?",
        summary: "Full sequence on bars 5–6, resolving in bar 7.",
        context: "Have You Met Miss Jones? · last A, bars 1–8",
        defaultKeyId: "F",
      },
      {
        id: "gts-integrate-misty",
        kind: "integrate",
        applicationId: "gts-misty",
        title: "Integrate: Misty",
        coverTitle: "Misty",
        summary: "Half cell into A♭, then the full sequence into E♭.",
        context: "Misty · A, bars 1–9",
        defaultKeyId: "Eb",
      },
      ...deriveYourTunesLessons("gts"),
    ], 0),
  },
  {
    id: "bo",
    number: 4,
    lickId: "bo",
    name: "Bird Opening",
    lessons: withSleeves([
      {
        id: "bo-learn",
        kind: "learn",
        applicationId: "bo-learn",
        title: "Learn the lick",
        coverTitle: "Learn the lick",
        summary: "Hear, play, and recall the Bird opening, pickup included.",
        context: "The lick in this key",
        defaultKeyId: "G",
      },
      {
        id: "bo-integrate-billies",
        kind: "integrate",
        applicationId: "bo-billies",
        title: "Integrate: Billie's Bounce",
        coverTitle: "Billie's Bounce",
        summary: "First half into bars 1 and 7 of the blues.",
        context: "Billie's Bounce · 12-bar blues",
        defaultKeyId: "F",
      },
      {
        id: "bo-integrate-rhythm",
        kind: "integrate",
        applicationId: "bo-rhythm",
        title: "Integrate: I Got Rhythm",
        coverTitle: "I Got Rhythm",
        summary: "Full opening on the bridge, landing in bars 3 and 7.",
        context: "I Got Rhythm · bridge",
        defaultKeyId: "Bb",
      },
      {
        id: "bo-integrate-honeysuckle",
        kind: "integrate",
        applicationId: "bo-honeysuckle",
        title: "Integrate: Honeysuckle Rose",
        coverTitle: "Honeysuckle Rose",
        summary: "Full opening on the bridge, landing in bars 3 and 7.",
        context: "Honeysuckle Rose · bridge",
        defaultKeyId: "F",
      },
      ...deriveYourTunesLessons("bo"),
    ], 2),
  },
  {
    id: "hsr",
    number: 5,
    lickId: "hsr",
    name: "Honeysuckle Rose",
    lessons: withSleeves([
      {
        id: "hsr-learn",
        kind: "learn",
        applicationId: "hsr-learn",
        title: "Learn the lick",
        coverTitle: "Learn the lick",
        summary: "Hear, play, and recall the Honeysuckle Rose figure.",
        context: "The lick in this key",
        defaultKeyId: "C",
      },
      {
        id: "hsr-integrate-honeysuckle",
        kind: "integrate",
        applicationId: "hsr-honeysuckle",
        title: "Integrate: Honeysuckle Rose",
        coverTitle: "Honeysuckle Rose",
        summary: "The namesake A section, plain then altered.",
        context: "Honeysuckle Rose · A, bars 1–8",
        defaultKeyId: "F",
      },
      {
        id: "hsr-integrate-a-train",
        kind: "integrate",
        applicationId: "hsr-a-train",
        title: "Integrate: Take the A Train",
        coverTitle: "Take the A Train",
        summary: "Over ii in bar 5, altered over V in bar 6.",
        context: "Take the A Train · A, bars 1–8",
        defaultKeyId: "C",
      },
      {
        id: "hsr-integrate-satin",
        kind: "integrate",
        applicationId: "hsr-satin",
        title: "Integrate: Satin Doll",
        coverTitle: "Satin Doll",
        summary: "Four ii cells across the A section.",
        context: "Satin Doll · A, bars 1–8",
        defaultKeyId: "C",
      },
      {
        id: "hsr-integrate-attya",
        kind: "integrate",
        applicationId: "hsr-attya",
        title: "Integrate: All the Things You Are",
        coverTitle: "All the Things You Are",
        summary: "ii cells then the altered figure over V.",
        context: "All the Things You Are · A, bars 1–8",
        defaultKeyId: "Ab",
      },
      ...deriveYourTunesLessons("hsr"),
    ], 0),
  },
];

const CORE_SLEEVE_START = MODULES.reduce((sum, module) => sum + module.lessons.length, 0) % 3;
MODULES.push(...buildWorkbookModules(CORE_SLEEVE_START));
let sleeveIndex = 0;
for (const module of MODULES) {
  module.lessons = withSleeves(module.lessons, sleeveIndex % 3);
  sleeveIndex += module.lessons.length;
}

export const APPLICATIONS = ALL_APPLICATIONS.filter((app) => (
  app.id === "minor-home" || app.id === "altered-dominant"
));

export const TUNE_SECTION = {
  id: "tunes",
  number: null,
  lickId: null,
  name: "My tunes",
  lessons: withSleeves(deriveMyTunesLessons(), 1),
};

export const MODULE_LESSONS = MODULES.flatMap((module) => module.lessons.map((lesson) => ({
  ...lesson,
  moduleId: module.id,
  moduleNumber: module.number,
  moduleName: module.name,
})));

export const TUNE_LESSONS = TUNE_SECTION.lessons.map((lesson, index) => ({
  ...lesson,
  moduleId: "tunes",
  moduleNumber: null,
  moduleName: "My tunes",
  index,
}));

export const LESSONS = [...MODULE_LESSONS, ...TUNE_LESSONS];

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
  if (id === TUNE_SECTION.id) return TUNE_SECTION;
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

export function fragmentBeats(fragmentId, { withResolution = false } = {}) {
  const frag = FRAGMENTS[fragmentId];
  if (!frag) return 0;
  const base = frag.elements.reduce((sum, el) => sum + el.beats, 0);
  return withResolution && frag.resolution ? base + frag.resolution.beats : base;
}

export function spotsFor(applicationId) {
  const app = applicationById(applicationId);
  if (app.spots?.length) {
    return app.spots.map((spot) => ({
      fragment: "full",
      anchorInterval: app.cellTonicInterval ?? 0,
      pickup: false,
      lickId: spot.lickId ?? app.lickId,
      ...spot,
    }));
  }
  if (app.tuneId) {
    const form = formById(app.formId);
    const start = form?.excerptStartBar ?? 1;
    const end = start + (form?.bars?.length ?? 1) - 1;
    const derived = spotsForTune(tuneById(app.tuneId), app.lickId)
      .filter((spot) => spot.bar >= start && spot.bar <= end)
      .map((spot) => ({ ...spot, bar: spot.bar - start + 1 }));
    if (derived.length) return derived;
  }
  return [{
    bar: app.phraseStartBar ?? 1,
    fragment: "full",
    anchorInterval: app.cellTonicInterval ?? 0,
    pickup: Boolean(app.includePickup),
    lickId: app.lickId,
  }];
}

export function elementsForSpot(app, spot, nextSpot) {
  const lick = lickById(spot.lickId ?? app.lickId);
  const fragmentId = spot.fragment ?? "full";
  if (fragmentId === "full") {
    const pickup = Boolean(spot.pickup);
    return {
      elements: lick.elements,
      pickupBeats: pickup ? lick.pickupBeats : 0,
    };
  }
  const frag = FRAGMENTS[fragmentId];
  const elements = [...frag.elements];
  if (frag.resolution && nextSpot?.bar !== spot.bar + 1) {
    elements.push({ ...frag.resolution });
  }
  return {
    elements,
    pickupBeats: spot.pickup ? (frag.pickupBeats || 0) : 0,
  };
}

export function phraseSpanBars(applicationId) {
  const app = applicationById(applicationId);
  const spots = spotsFor(applicationId);
  const bars = new Set();
  spots.forEach((spot, index) => {
    const { elements, pickupBeats } = elementsForSpot(app, spot, spots[index + 1]);
    const sounding = elements.reduce((sum, el) => sum + el.beats, 0);
    const start = (spot.bar - 1) * 4 - (pickupBeats || 0);
    const end = start + sounding;
    const firstBar = Math.max(1, Math.floor((start + 1e-6) / 4) + 1);
    const lastBar = Math.max(firstBar, Math.ceil((end - 1e-6) / 4));
    for (let bar = firstBar; bar <= lastBar; bar += 1) bars.add(bar);
  });
  return [...bars].sort((a, b) => a - b);
}

export function spotNoteRange(app, spot, nextSpot) {
  const { elements, pickupBeats } = elementsForSpot(app, spot, nextSpot);
  const origin = (spot.bar - 1) * 4 - (pickupBeats || 0);
  let beat = origin;
  let start = null;
  let end = origin;
  for (const el of elements) {
    if (el.type === "note") {
      if (start == null) start = beat;
      end = beat + el.beats;
    }
    beat += el.beats;
  }
  return { start: start ?? origin, end };
}
