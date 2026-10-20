/**
 * Concert-pitch music data for the prototype.
 * Intervals match DuoJazz BuiltInLicks.shortIIVI (semitones from I).
 */

export const KEYS = [
  { id: "C", name: "C", pc: 0, flats: false },
  { id: "F", name: "F", pc: 5, flats: true },
  { id: "Bb", name: "B♭", pc: 10, flats: true },
  { id: "Eb", name: "E♭", pc: 3, flats: true },
  { id: "Ab", name: "A♭", pc: 8, flats: true },
  { id: "Db", name: "D♭", pc: 1, flats: true },
  { id: "Gb", name: "G♭", pc: 6, flats: true },
  { id: "B", name: "B", pc: 11, flats: false },
  { id: "E", name: "E", pc: 4, flats: false },
  { id: "A", name: "A", pc: 9, flats: false },
  { id: "D", name: "D", pc: 2, flats: false },
  { id: "G", name: "G", pc: 7, flats: false },
];

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const QUALITY = {
  maj7: { intervals: [0, 4, 7, 11], suffix: "maj7" },
  m7: { intervals: [0, 3, 7, 10], suffix: "m7" },
  "7": { intervals: [0, 4, 7, 10], suffix: "7" },
};

/** Eight-bar form. Phrase occupies bars 3–4 (short major ii–V–I). */
export const FORM = [
  { bar: 1, degree: 0, quality: "maj7", role: "improv-before", label: "before" },
  { bar: 2, degree: 0, quality: "maj7", role: "improv-before", label: "before" },
  { bar: 3, degree: 2, quality: "m7", role: "phrase", label: "phrase", split: { beats: 2, next: { degree: 7, quality: "7" } } },
  { bar: 4, degree: 0, quality: "maj7", role: "phrase", label: "resolve" },
  { bar: 5, degree: 0, quality: "maj7", role: "improv-after", label: "after" },
  { bar: 6, degree: 9, quality: "m7", role: "improv-after", label: "after" },
  { bar: 7, degree: 2, quality: "m7", role: "improv-after", label: "after" },
  { bar: 8, degree: 7, quality: "7", role: "improv-after", label: "turnaround" },
];

export const ORIGINAL_PHRASE = {
  id: "short-ii-v-i",
  name: "Short ii–V–I",
  source: "DuoJazz BuiltInLicks.shortIIVI",
  notes: [
    { interval: 2, beats: 0.5 },
    { interval: 4, beats: 0.5 },
    { interval: 5, beats: 0.5 },
    { interval: 7, beats: 0.5 },
    { interval: 9, beats: 0.5 },
    { interval: 12, beats: 0.5 },
    { interval: 11, beats: 0.5 },
    { interval: 9, beats: 0.5 },
    { interval: 7, beats: 2 },
  ],
};

export const VARIATIONS = [
  ORIGINAL_PHRASE,
  {
    id: "resolve-third",
    name: "Land on the 3rd",
    source: "Same line, I resolution to the 3rd",
    notes: [
      { interval: 2, beats: 0.5 },
      { interval: 4, beats: 0.5 },
      { interval: 5, beats: 0.5 },
      { interval: 7, beats: 0.5 },
      { interval: 9, beats: 0.5 },
      { interval: 12, beats: 0.5 },
      { interval: 11, beats: 0.5 },
      { interval: 9, beats: 0.5 },
      { interval: 4, beats: 2 },
    ],
  },
  {
    id: "rhythmic-delay",
    name: "Wait an eighth",
    source: "Pickup rest, then the same intervals",
    notes: [
      { interval: 0, beats: 0.5, rest: true },
      { interval: 2, beats: 0.5 },
      { interval: 4, beats: 0.5 },
      { interval: 5, beats: 0.5 },
      { interval: 7, beats: 0.5 },
      { interval: 9, beats: 0.5 },
      { interval: 12, beats: 0.5 },
      { interval: 11, beats: 0.5 },
      { interval: 9, beats: 0.5 },
      { interval: 7, beats: 1.5 },
    ],
  },
];

export function keyById(id) {
  return KEYS.find((key) => key.id === id) ?? KEYS[0];
}

export function pitchClassName(pc, flats) {
  const n = ((pc % 12) + 12) % 12;
  return (flats ? FLAT_NAMES : SHARP_NAMES)[n];
}

export function chordName(key, degree, quality) {
  const root = pitchClassName(key.pc + degree, key.flats);
  return `${root}${QUALITY[quality].suffix}`;
}

export function chordTonesMidi(key, degree, quality, octaveMidi = 48) {
  const root = octaveMidi + ((key.pc + degree) % 12);
  return QUALITY[quality].intervals.map((interval) => root + interval);
}

export function melodyMidi(key, interval, rootMidi = 60) {
  return rootMidi + key.pc + interval;
}

export function chordsAtFormBeat(formBeat) {
  const barIndex = Math.floor(formBeat / 4);
  const beatInBar = formBeat % 4;
  const bar = FORM[barIndex];
  if (bar.split && beatInBar >= bar.split.beats) {
    return { degree: bar.split.next.degree, quality: bar.split.next.quality, bar: bar.bar, role: bar.role };
  }
  return { degree: bar.degree, quality: bar.quality, bar: bar.bar, role: bar.role };
}

function midiToAbc(midi, flats) {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const name = pitchClassName(pc, flats);
  let letter = name[0];
  let acc = "";
  if (name.includes("b")) acc = "_";
  if (name.includes("#")) acc = "^";
  if (octave >= 5) letter = letter.toLowerCase() + "'".repeat(octave - 5);
  else letter = letter.toUpperCase() + ",".repeat(4 - octave);
  return acc + letter;
}

function durationToAbc(beats) {
  const sixteenths = Math.round(beats * 4);
  const map = {
    1: "/2",
    2: "",
    3: "3/2",
    4: "2",
    6: "3",
    8: "4",
  };
  return map[sixteenths] ?? `${sixteenths}/4`;
}

export function phraseToAbc(key, phrase) {
  const bar3a = chordName(key, 2, "m7");
  const bar3b = chordName(key, 7, "7");
  const bar4 = chordName(key, 0, "maj7");
  let body = `"${bar3a}"`;
  let beat = 0;
  let labeledV = false;
  let labeledI = false;
  for (const note of phrase.notes) {
    if (beat >= 2 - 1e-6 && !labeledV) {
      body += `"${bar3b}"`;
      labeledV = true;
    }
    if (beat >= 4 - 1e-6 && !labeledI) {
      body += ` | "${bar4}"`;
      labeledI = true;
    }
    const token = note.rest
      ? `z${durationToAbc(note.beats)}`
      : `${midiToAbc(melodyMidi(key, note.interval), key.flats)}${durationToAbc(note.beats)}`;
    body += token;
    beat += note.beats;
  }
  if (!labeledI) body += ` | "${bar4}"`;
  const remaining = 8 - beat;
  if (remaining > 0.05) body += `z${durationToAbc(remaining)}`;
  body += " |]";
  return [
    "X:1",
    `T:${phrase.name}`,
    "M:4/4",
    "L:1/8",
    `K:${key.id}`,
    body,
  ].join("\n");
}

export function formChordSymbols(key) {
  return FORM.map((bar) => {
    if (bar.split) {
      return {
        bar: bar.bar,
        symbols: [
          chordName(key, bar.degree, bar.quality),
          chordName(key, bar.split.next.degree, bar.split.next.quality),
        ],
        role: bar.role,
        label: bar.label,
      };
    }
    return {
      bar: bar.bar,
      symbols: [chordName(key, bar.degree, bar.quality)],
      role: bar.role,
      label: bar.label,
    };
  });
}
