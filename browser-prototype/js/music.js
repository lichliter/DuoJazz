/**
 * Cry Me a River minor cell over the opening eight bars of Autumn Leaves
 * (concert G minor). Not DuoJazz `iivi-cry-me-enclosure` and not a loop of
 * repeated ii–V–I cells.
 */

export const PHRASE_ID = "cry-me-a-river-minor-cell";
export const PHRASE_NAME = "Cry Me a River cell";
export const PHRASE_SOURCE = {
  shape: "9–1–5–♭3–2–1 from a minor tonic",
  rhythm: "eighth, eighth, quarter, eighth, eighth, quarter (one bar)",
  contour: "ninth above the tonic octave, down to 1, leap to 5, scale down ♭3–2–1",
  reference: "Common jazz-vocabulary minor cell (C minor: D–C–G–Eb–D–C). Concert G minor in trombone register sounds A3–G3–D3–Bb2–A2–G2.",
  notUsed: "DuoJazz BuiltInLicks.iiviCryMeEnclosure (id iivi-cry-me-enclosure) is a major ii–V–I double-enclosure (5–3–9–6–7…), not this cell",
};

export const FORM_ID = "autumn-leaves-opening-8";
export const FORM_TITLE = "Autumn Leaves · opening 8 bars";
export const FORM_SOURCE = {
  tune: "Autumn Leaves (Kosma / Mercer)",
  variant: "Concert G minor, Verse 1, one chord per bar",
  chart: "https://tabs.ultimate-guitar.com/tab/misc-traditional/autumn-leaves-chords-4419731",
  author: "jbpicon, last update Aug 21 2025, key Gm, capo none",
  excerpt: "| Cm7 | F7 | B♭maj7 | E♭maj7 | Am7♭5 | D7 | Gm6 | Gm6 |",
  simplification: "No head melody, no pickup, no later-verse turnaround. Bars 7–8 use Gm6 as on that chart (not Gm7 / Gmin(maj7)). This is an excerpt for placing a lick, not a substitute for singing the tune.",
};

/** 9–1–5–♭3–2–1 from the cell’s minor tonic. Interval 14 is the ninth above the tonic octave. */
export const PHRASE_ELEMENTS = [
  { type: "note", interval: 14, beats: 0.5 },
  { type: "note", interval: 12, beats: 0.5 },
  { type: "note", interval: 7, beats: 1 },
  { type: "note", interval: 3, beats: 0.5 },
  { type: "note", interval: 2, beats: 0.5 },
  { type: "note", interval: 0, beats: 1 },
];

/**
 * Two octaves below MIDI 60+pc so concert G minor sits in a trombone
 * bass-clef register: A3–G3–D3–Bb2–A2–G2. Same offset for notation and model audio.
 * Melody register is a relative −1 / 0 / +1 octave on top of this default.
 */
export const PHRASE_OCTAVE = -2;
export const DEFAULT_CLEF = "bass";
export const DEFAULT_MELODY_REGISTER = 0;
export const MELODY_REGISTERS = [
  { id: -1, label: "−1 octave" },
  { id: 0, label: "Original" },
  { id: 1, label: "+1 octave" },
];

export function normalizeMelodyRegister(value) {
  const n = Number(value);
  return n === -1 || n === 1 ? n : DEFAULT_MELODY_REGISTER;
}

export function melodyOctaveOffset(register = DEFAULT_MELODY_REGISTER) {
  return PHRASE_OCTAVE + normalizeMelodyRegister(register);
}

export function melodySemitoneShift(register = DEFAULT_MELODY_REGISTER) {
  return normalizeMelodyRegister(register) * 12;
}

export const PHRASE_BEATS = PHRASE_ELEMENTS.reduce((sum, el) => sum + el.beats, 0);
export const CELL_BEATS = 8;
export const BARS_PER_CHORUS = 8;
export const BEATS_PER_BAR = 4;
export const CHORUS_BEATS = BARS_PER_CHORUS * BEATS_PER_BAR;
export const COUNT_IN_BEATS = 4;
export const DEFAULT_KEY_ID = "G";
export const DEFAULT_APPLICATION_ID = "minor-home";

export const KEYS = [
  { id: "C", pc: 0, name: "C", usesFlats: false, abc: "C" },
  { id: "F", pc: 5, name: "F", usesFlats: true, abc: "F" },
  { id: "Bb", pc: 10, name: "B♭", usesFlats: true, abc: "Bb" },
  { id: "Eb", pc: 3, name: "E♭", usesFlats: true, abc: "Eb" },
  { id: "Ab", pc: 8, name: "A♭", usesFlats: true, abc: "Ab" },
  { id: "Db", pc: 1, name: "D♭", usesFlats: true, abc: "Db" },
  { id: "Gb", pc: 6, name: "G♭", usesFlats: true, abc: "Gb" },
  { id: "G", pc: 7, name: "G", usesFlats: false, abc: "G" },
  { id: "D", pc: 2, name: "D", usesFlats: false, abc: "D" },
  { id: "A", pc: 9, name: "A", usesFlats: false, abc: "A" },
  { id: "E", pc: 4, name: "E", usesFlats: false, abc: "E" },
  { id: "B", pc: 11, name: "B", usesFlats: false, abc: "B" },
  { id: "F#", pc: 6, name: "F♯", usesFlats: false, abc: "F#" },
  { id: "C#", pc: 1, name: "C♯", usesFlats: false, abc: "C#" },
];

export const PRIMARY_KEY_IDS = ["G", "C", "D", "F", "Bb", "A", "Eb", "E"];

const SHARP = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const FLAT = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
const DEGREE_FROM_I = ["1", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"];

const QUALITY_ASCII = {
  minor7: "m7",
  dominant7: "7",
  major7: "maj7",
  minor7b5: "m7♭5",
  minor6: "m6",
};

const QUALITY_ABC = {
  minor7: "m7",
  dominant7: "7",
  major7: "maj7",
  minor7b5: "m7♭5",
  minor6: "m6",
};

const QUALITY_INTERVALS = {
  minor7: [0, 3, 7, 10],
  dominant7: [0, 4, 7, 10],
  major7: [0, 4, 7, 11],
  minor7b5: [0, 3, 6, 10],
  minor6: [0, 3, 7, 9],
};

const GUIDE_INTERVALS = {
  minor7: [3, 10],
  dominant7: [4, 10],
  major7: [4, 11],
  minor7b5: [3, 10],
  minor6: [3, 9],
};

/** One chord per bar, intervals from the excerpt’s minor tonic (G on the source chart). */
export const FORM_BARS = [
  { bar: 1, intervalFromTonic: 5, quality: "minor7", functionLabel: "iv-7" },
  { bar: 2, intervalFromTonic: 10, quality: "dominant7", functionLabel: "♭VII7" },
  { bar: 3, intervalFromTonic: 3, quality: "major7", functionLabel: "♭IIImaj7" },
  { bar: 4, intervalFromTonic: 8, quality: "major7", functionLabel: "♭VImaj7" },
  { bar: 5, intervalFromTonic: 2, quality: "minor7b5", functionLabel: "iiø7" },
  { bar: 6, intervalFromTonic: 7, quality: "dominant7", functionLabel: "V7" },
  { bar: 7, intervalFromTonic: 0, quality: "minor6", functionLabel: "i6" },
  { bar: 8, intervalFromTonic: 0, quality: "minor6", functionLabel: "i6" },
];

/**
 * Same recognizable cell, two harmonic jobs on this excerpt.
 * cellTonicInterval is measured from the tune tonic (G): 0 = G minor, -4 = E♭ minor.
 */
export const APPLICATIONS = [
  {
    id: "minor-home",
    label: "Minor home",
    blurb: "G-minor shape on the Gm arrival (bar 7). Settled minor sound, then keep going.",
    cellName: "G minor",
    cellTonicInterval: 0,
    phraseStartBar: 7,
    phraseFunctionLabel: "i6 · Cry Me a River cell",
    entranceQuestion: "Did you find the G-minor door on bar 7?",
    afterQuestion: "Did you keep playing on the second Gm6 bar?",
    leadIn: [
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
    ],
    resolve: [
      { beat: 28, interval: 3, beats: 1 },
      { beat: 29, interval: 2, beats: 0.5 },
      { beat: 29.5, interval: 0, beats: 0.5 },
      { beat: 30, interval: 7, beats: 1 },
      { beat: 31, interval: 0, beats: 1 },
    ],
  },
  {
    id: "altered-dominant",
    label: "Altered dominant",
    blurb: "E♭-minor shape over D7 (bar 6), then a written resolution into Gm. Not the G-minor notes pasted on the dominant.",
    cellName: "E♭ minor",
    cellTonicInterval: -4,
    phraseStartBar: 6,
    phraseFunctionLabel: "V7 · E♭-minor cell (half-step above D)",
    entranceQuestion: "Did you enter on D7 (bar 6) with the E♭-minor shape?",
    afterQuestion: "Did you resolve into Gm and keep playing?",
    leadIn: [
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
    ],
    resolve: [
      { beat: 24, interval: 7, beats: 1 },
      { beat: 25, interval: 0, beats: 1 },
      { beat: 26, interval: 3, beats: 1 },
      { beat: 27, interval: 2, beats: 0.5 },
      { beat: 27.5, interval: 0, beats: 0.5 },
      { beat: 28, interval: 3, beats: 1 },
      { beat: 29, interval: 0, beats: 1 },
      { beat: 30, interval: 7, beats: 1 },
      { beat: 31, interval: 0, beats: 1 },
    ],
  },
];

export function getKey(id) {
  return KEYS.find((key) => key.id === id) ?? KEYS.find((key) => key.id === DEFAULT_KEY_ID) ?? KEYS[0];
}

export function applicationById(id) {
  return APPLICATIONS.find((item) => item.id === id) ?? APPLICATIONS[0];
}

export function prepareBar(applicationId) {
  return Math.max(1, applicationById(applicationId).phraseStartBar - 1);
}

export function cueCaption(bar, applicationId = DEFAULT_APPLICATION_ID) {
  const app = applicationById(applicationId);
  if (bar === app.phraseStartBar) return "HERE";
  if (bar === app.phraseStartBar - 1) return "Get ready";
  return "";
}

export function cellTonicSpelling(concertKey, displayMode, applicationId = DEFAULT_APPLICATION_ID) {
  const app = applicationById(applicationId);
  const shownKey = displayKey(concertKey, displayMode);
  const concertPc = wrapPc(concertKey.pc + app.cellTonicInterval);
  const shownPc = displayMode === "bb-written" ? wrapPc(concertPc + 2) : concertPc;
  const name = pitchName(shownPc, shownKey.usesFlats);
  return {
    name,
    minorName: `${name} minor`,
    shortName: `${name}m`,
  };
}

export function applicationContext(concertKey, displayMode, applicationId = DEFAULT_APPLICATION_ID) {
  const app = applicationById(applicationId);
  const shown = displayKey(concertKey, displayMode);
  const cell = cellTonicSpelling(concertKey, displayMode, applicationId);
  const targetSpec = FORM_BARS[app.phraseStartBar - 1];
  const targetChord = chordDisplayName(
    concertKey,
    targetSpec.intervalFromTonic,
    targetSpec.quality,
    displayMode,
  );
  const homeChord = chordDisplayName(concertKey, 0, "minor6", displayMode);
  const dominantChord = chordDisplayName(concertKey, 7, "dominant7", displayMode);
  const enterBar = app.phraseStartBar;
  const readyBar = prepareBar(applicationId);
  return {
    id: app.id,
    label: app.label,
    cellName: cell.minorName,
    cellShort: cell.shortName,
    targetChord,
    homeChord,
    dominantChord,
    tuneName: shown.name,
    tuneShort: shown.shortName,
    enterBar,
    readyBar,
    placement: `On ${targetChord} · Bar ${enterBar}`,
    shapeOver: `${cell.minorName} shape over ${targetChord}`,
    listenBlurb: `${cell.minorName} shape over ${targetChord}. Hear the phrase land in bar ${enterBar}, then become part of the line.`,
    helpBlurb: `${cell.minorName} shape over ${targetChord}. Get ready in bar ${readyBar}. Bring the phrase in on bar ${enterBar}.`,
    freeBlurb: `${cell.minorName} shape over ${targetChord}. Your line over the eight bars.`,
    learnBlurb: `Cry Me a River cell in ${cell.minorName}. Same intervals in this key.`,
    keysBlurb: `Same ${cell.minorName} shape. Interval meaning stays put; only the door changes.`,
    checkRecallBlurb: `Recall the cell in ${cell.minorName}. The app is not listening.`,
    checkApplyBlurb: `Use the cell over the eight bars in ${shown.name}. No written door unless you reveal it.`,
    entranceQuestion: `Did you find the ${cell.minorName} door on bar ${enterBar}?`,
    afterQuestion: app.id === "altered-dominant"
      ? `Did you resolve into ${shown.name} and keep playing?`
      : `Did you keep playing on the second ${homeChord} bar?`,
    phraseFunctionLabel: app.id === "altered-dominant"
      ? `V7 · ${cell.minorName} cell`
      : `i6 · Cry Me a River cell`,
    resolvePrompt: `Resolve into ${shown.name}. Keep going.`,
  };
}

export function supportBlurb(concertKey, displayMode, applicationId, supportId) {
  const ctx = applicationContext(concertKey, displayMode, applicationId);
  if (supportId === "help") return ctx.helpBlurb;
  if (supportId === "free") return ctx.freeBlurb;
  return ctx.listenBlurb;
}

export function wrapPc(pc) {
  return ((pc % 12) + 12) % 12;
}

export function pitchName(pc, usesFlats) {
  return (usesFlats ? FLAT : SHARP)[wrapPc(pc)];
}

export function minorSpelling(key) {
  const relativeMajorPc = wrapPc(key.pc + 3);
  const relative = KEYS.find((item) => item.pc === relativeMajorPc && item.usesFlats)
    ?? KEYS.find((item) => item.pc === relativeMajorPc)
    ?? key;
  return {
    ...key,
    usesFlats: relative.usesFlats,
    abc: `${key.abc}min`,
    name: `${key.name} minor`,
    shortName: `${key.name}m`,
  };
}

export function writtenKeyFromConcert(concertKey) {
  const writtenPc = wrapPc(concertKey.pc + 2);
  const match = KEYS.find((key) => key.pc === writtenPc && key.usesFlats === concertKey.usesFlats);
  return match ?? KEYS.find((key) => key.pc === writtenPc) ?? concertKey;
}

export function displayKey(concertKey, displayMode) {
  const raw = displayMode === "bb-written" ? writtenKeyFromConcert(concertKey) : concertKey;
  return minorSpelling(raw);
}

export function chordRootPc(concertTonicPc, intervalFromTonic) {
  return wrapPc(concertTonicPc + intervalFromTonic);
}

export function chordDisplayName(concertTonic, intervalFromTonic, quality, displayMode) {
  const concertRoot = chordRootPc(concertTonic.pc, intervalFromTonic);
  const shownPc = displayMode === "bb-written" ? wrapPc(concertRoot + 2) : concertRoot;
  const shownKey = displayKey(concertTonic, displayMode);
  return `${pitchName(shownPc, shownKey.usesFlats)}${QUALITY_ASCII[quality]}`;
}

export function phraseDurationBeats() {
  return PHRASE_BEATS;
}

export function midiForInterval(concertTonicPc, interval, octaveOffset = PHRASE_OCTAVE) {
  return 60 + concertTonicPc + interval + octaveOffset * 12;
}

export function melodyMidiForInterval(concertTonicPc, interval, melodyRegister = DEFAULT_MELODY_REGISTER) {
  return midiForInterval(concertTonicPc, interval, melodyOctaveOffset(melodyRegister));
}

export function concertMidiToWritten(midi, displayMode) {
  return displayMode === "bb-written" ? midi + 2 : midi;
}

export function spellMidi(midi, usesFlats) {
  const pc = wrapPc(midi);
  const octave = Math.floor(midi / 12) - 1;
  return { name: pitchName(pc, usesFlats), octave, pc };
}

export function rhythmLabel(beats) {
  if (beats === 0.5) return "eighth";
  if (beats === 1) return "quarter";
  if (beats === 2) return "half";
  if (beats === 4) return "whole";
  return `${beats} beats`;
}

export function degreeInI(interval) {
  if (interval === 14) return "9";
  const normalized = wrapPc(interval);
  const octave = interval >= 12 ? " (8ve)" : interval < 0 ? " (below)" : "";
  return `${DEGREE_FROM_I[normalized]}${octave}`;
}

export function phraseStartBeat(applicationId) {
  const app = applicationById(applicationId);
  return (app.phraseStartBar - 1) * BEATS_PER_BAR;
}

export function phraseEvents(applicationId) {
  const app = applicationById(applicationId);
  const start = phraseStartBeat(applicationId);
  let beat = start;
  return PHRASE_ELEMENTS.filter((el) => el.type === "note").map((el) => {
    const event = {
      beat,
      interval: el.interval + app.cellTonicInterval,
      beats: el.beats,
      role: "phrase",
      cellInterval: el.interval,
    };
    beat += el.beats;
    return event;
  });
}

export function modelSolo(applicationId) {
  const app = applicationById(applicationId);
  const lead = app.leadIn.map((note) => ({ ...note, role: "lead" }));
  const resolve = app.resolve.map((note) => ({ ...note, role: "resolve" }));
  return [...lead, ...phraseEvents(applicationId), ...resolve].sort((a, b) => a.beat - b.beat);
}

export function phraseNotes(concertKey, displayMode, applicationId = DEFAULT_APPLICATION_ID, melodyRegister = DEFAULT_MELODY_REGISTER) {
  const shownKey = displayKey(concertKey, displayMode);
  const concertSpell = minorSpelling(concertKey);
  return phraseEvents(applicationId).map((event, index) => {
    const concertMidi = melodyMidiForInterval(concertKey.pc, event.interval, melodyRegister);
    const shownMidi = concertMidiToWritten(concertMidi, displayMode);
    const spelled = spellMidi(shownMidi, shownKey.usesFlats);
    const concertSpelled = spellMidi(concertMidi, concertSpell.usesFlats);
    return {
      index,
      startBeat: event.beat,
      beats: event.beats,
      interval: event.interval,
      cellInterval: event.cellInterval,
      concertMidi,
      shownMidi,
      shownName: `${spelled.name}${spelled.octave}`,
      concertName: `${concertSpelled.name}${concertSpelled.octave}`,
      degree: degreeInI(event.cellInterval),
      rhythm: rhythmLabel(event.beats),
      role: event.role,
    };
  });
}

function materializeChord(concertKey, displayMode, spec, startBeat) {
  return {
    ...spec,
    startBeat,
    durationBeats: BEATS_PER_BAR,
    name: chordDisplayName(concertKey, spec.intervalFromTonic, spec.quality, displayMode),
    concertRootPc: chordRootPc(concertKey.pc, spec.intervalFromTonic),
  };
}

export function chorusChords(concertKey, displayMode) {
  return FORM_BARS.map((spec) => materializeChord(concertKey, displayMode, spec, (spec.bar - 1) * BEATS_PER_BAR));
}

export function learnChords(concertKey, displayMode, applicationId = DEFAULT_APPLICATION_ID) {
  const app = applicationById(applicationId);
  const tonic = {
    bar: 1,
    intervalFromTonic: app.cellTonicInterval,
    quality: "minor6",
    functionLabel: "cell i6",
  };
  return [materializeChord(concertKey, displayMode, tonic, 0)].map((chord) => ({
    ...chord,
    durationBeats: CELL_BEATS,
  }));
}

export function chordAtBeat(chords, beat) {
  return [...chords]
    .reverse()
    .find((chord) => beat >= chord.startBeat && beat < chord.startBeat + chord.durationBeats);
}

export function voicingMidi(rootPc, quality, register = 52) {
  const root = rootPc + 12 * Math.floor((register - rootPc + 12) / 12);
  return QUALITY_INTERVALS[quality].map((interval) => root + interval);
}

export function guideToneMidi(rootPc, quality, register = 60) {
  const root = rootPc + 12 * Math.floor((register - rootPc + 12) / 12);
  return GUIDE_INTERVALS[quality].map((interval) => root + interval);
}

export function walkingBassMidi(rootPc, quality, beatInChord, nextRootPc) {
  const qualityIntervals = QUALITY_INTERVALS[quality] ?? QUALITY_INTERVALS.minor7;
  const root = 36 + wrapPc(rootPc);
  const fifth = root + qualityIntervals[2];
  const third = root + qualityIntervals[1];
  if (beatInChord === 0) return root;
  if (beatInChord === 1) return fifth;
  if (beatInChord === 2) return third;
  const target = 36 + wrapPc(nextRootPc ?? rootPc);
  const below = target - 1;
  return below >= 28 ? below : target + 2;
}

export function variationElements(variationId, applicationId = DEFAULT_APPLICATION_ID) {
  const app = applicationById(applicationId);
  const shifted = PHRASE_ELEMENTS.map((el) => ({ ...el, interval: el.interval + app.cellTonicInterval }));
  if (variationId === "sequence-down") {
    return shifted.map((el) => ({ ...el, interval: el.interval - 2 }));
  }
  return shifted;
}

export function swingRatio(tempo) {
  const minTempo = 50;
  const maxTempo = 280;
  const clamped = Math.min(Math.max(tempo, minTempo), maxTempo);
  const slowRatio = 0.72;
  const fastRatio = 0.54;
  const t = Math.log(clamped / minTempo) / Math.log(maxTempo / minTempo);
  return slowRatio - (slowRatio - fastRatio) * t;
}

export function beatsToSeconds(beats, tempo, swingEnabled) {
  const beatDur = 60 / tempo;
  if (!swingEnabled) return beats * beatDur;
  const ratio = swingRatio(tempo);
  const whole = Math.floor(beats + 1e-9);
  const frac = beats - whole;
  let extra = 0;
  if (frac <= 0.5) extra = (frac / 0.5) * ratio * beatDur;
  else extra = ratio * beatDur + ((frac - 0.5) / 0.5) * (1 - ratio) * beatDur;
  return whole * beatDur + extra;
}

function abcNote(midi, usesFlats) {
  const pc = wrapPc(midi);
  const octave = Math.floor(midi / 12) - 1;
  const name = pitchName(pc, usesFlats);
  const letter = name[0];
  const accidental = name.includes("♯") ? "^" : name.includes("♭") ? "_" : "";
  if (octave <= 3) return `${accidental}${letter}${",".repeat(4 - octave)}`;
  if (octave === 4) return `${accidental}${letter}`;
  if (octave === 5) return `${accidental}${letter.toLowerCase()}`;
  return `${accidental}${letter.toLowerCase()}${"'".repeat(octave - 5)}`;
}

function abcDuration(beats) {
  if (beats === 0.5) return "";
  if (beats === 1) return "2";
  if (beats === 2) return "4";
  if (beats === 4) return "8";
  if (beats === 1.5) return "3";
  return String(Math.round(beats * 2));
}

/**
 * Split a jazz-chord root into letter + accidental so the accidental stays
 * full-size with the letter (B♭, F♯) instead of joining the superscript quality.
 */
export function jazzChordRootParts(text) {
  const match = String(text).match(/^([A-G])([♭♯b#])(.*)$/u);
  if (!match) return null;
  const accidental = match[2] === "b" ? "♭" : match[2] === "#" ? "♯" : match[2];
  return { letter: match[1], accidental, rest: match[3] };
}

function abcChordName(concertTonic, intervalFromTonic, quality, displayMode) {
  const concertRoot = chordRootPc(concertTonic.pc, intervalFromTonic);
  const shownPc = displayMode === "bb-written" ? wrapPc(concertRoot + 2) : concertRoot;
  const shownKey = displayKey(concertTonic, displayMode);
  // Keep Unicode accidentals on the root so abcjs jazzchords superscripts
  // only the quality (B♭ + maj7), not B + ♭maj7.
  const root = pitchName(shownPc, shownKey.usesFlats);
  return `${root}${QUALITY_ABC[quality]}`;
}

function atBeatBoundary(beat) {
  return Math.abs(beat - Math.round(beat)) < 1e-6;
}

function afterNoteSpacing(beat) {
  if (Math.abs(beat % 4) < 1e-6) return " | ";
  if (atBeatBoundary(beat)) return " ";
  return "";
}

function notesToAbc(notes, concertKey, displayMode, melodyRegister = DEFAULT_MELODY_REGISTER) {
  const shownKey = displayKey(concertKey, displayMode);
  let abc = "";
  let beat = 0;
  for (const note of notes) {
    while (beat + 1e-6 < note.beat) {
      const gap = Math.min(0.5, note.beat - beat);
      abc += `z${abcDuration(gap)}`;
      beat += gap;
      abc += afterNoteSpacing(beat);
    }
    const concertMidi = melodyMidiForInterval(concertKey.pc, note.interval, melodyRegister);
    const shownMidi = concertMidiToWritten(concertMidi, displayMode);
    abc += abcNote(shownMidi, shownKey.usesFlats) + abcDuration(note.beats);
    beat += note.beats;
    abc += afterNoteSpacing(beat);
  }
  return abc;
}

export function abcClef(clef = DEFAULT_CLEF) {
  return clef === "bass" ? "bass" : "treble";
}

function abcKeyLine(shownKey, clef = DEFAULT_CLEF) {
  return `K:${shownKey.abc} clef=${abcClef(clef)}`;
}

export function phraseABC(concertKey, displayMode, applicationId = DEFAULT_APPLICATION_ID, clef = DEFAULT_CLEF, melodyRegister = DEFAULT_MELODY_REGISTER) {
  const shownKey = displayKey(concertKey, displayMode);
  const app = applicationById(applicationId);
  const tonicName = abcChordName(concertKey, app.cellTonicInterval, "minor6", displayMode);
  let abc = `X:1\nM:4/4\nL:1/8\n${abcKeyLine(shownKey, clef)}\n"${tonicName}"`;
  abc += notesToAbc(phraseEvents(applicationId).map((note) => ({ ...note, beat: note.beat - phraseStartBeat(applicationId) })), concertKey, displayMode, melodyRegister);
  abc += "z8 |]\n";
  return abc;
}

function barCueAnnotation(barNumber, applicationId, showCues) {
  if (!showCues) return "";
  const cue = cueCaption(barNumber, applicationId);
  return cue ? `"_${cue}"` : "";
}

function barAdvance(bar, barsPerLine = 4) {
  if (bar === BARS_PER_CHORUS - 1) return " |]\n";
  if ((bar + 1) % barsPerLine === 0) return " |\n";
  return " | ";
}

export function modelABC(concertKey, displayMode, applicationId = DEFAULT_APPLICATION_ID, clef = DEFAULT_CLEF, melodyRegister = DEFAULT_MELODY_REGISTER, options = {}) {
  const shownKey = displayKey(concertKey, displayMode);
  const chords = chorusChords(concertKey, displayMode);
  const notes = modelSolo(applicationId);
  const showCues = Boolean(options.showCues);
  const barsPerLine = options.barsPerLine ?? 4;
  let abc = `X:1\nM:4/4\nL:1/8\n${abcKeyLine(shownKey, clef)}\n`;
  let beat = 0;
  let noteIndex = 0;
  for (let bar = 0; bar < BARS_PER_CHORUS; bar += 1) {
    const chord = chords[bar];
    abc += `"${abcChordName(concertKey, chord.intervalFromTonic, chord.quality, displayMode)}"`;
    abc += barCueAnnotation(bar + 1, applicationId, showCues);
    const barEnd = (bar + 1) * BEATS_PER_BAR;
    while (noteIndex < notes.length && notes[noteIndex].beat < barEnd - 1e-6) {
      const note = notes[noteIndex];
      if (note.beat > beat + 1e-6) {
        abc += `z${abcDuration(note.beat - beat)}`;
        beat = note.beat;
        if (atBeatBoundary(beat) && Math.abs(beat % 4) > 1e-6) abc += " ";
      }
      const concertMidi = melodyMidiForInterval(concertKey.pc, note.interval, melodyRegister);
      const shownMidi = concertMidiToWritten(concertMidi, displayMode);
      abc += abcNote(shownMidi, shownKey.usesFlats) + abcDuration(note.beats);
      beat += note.beats;
      if (atBeatBoundary(beat) && Math.abs(beat % 4) > 1e-6) abc += " ";
      noteIndex += 1;
    }
    abc += barAdvance(bar, barsPerLine);
    beat = barEnd;
  }
  return abc;
}

export function slashABC(concertKey, displayMode, applicationId = DEFAULT_APPLICATION_ID, clef = DEFAULT_CLEF, options = {}) {
  const shownKey = displayKey(concertKey, displayMode);
  const chords = chorusChords(concertKey, displayMode);
  const showCues = Boolean(options.showCues);
  const barsPerLine = options.barsPerLine ?? 4;
  const slashPitch = clef === "treble" ? "B" : "D,";
  let abc = `X:1\nM:4/4\nL:1/4\n${abcKeyLine(shownKey, clef)}\n`;
  for (let bar = 0; bar < BARS_PER_CHORUS; bar += 1) {
    const chord = chords[bar];
    abc += `"${abcChordName(concertKey, chord.intervalFromTonic, chord.quality, displayMode)}"`;
    abc += barCueAnnotation(bar + 1, applicationId, showCues);
    abc += `${slashPitch} ${slashPitch} ${slashPitch} ${slashPitch}`;
    abc += barAdvance(bar, barsPerLine);
  }
  return abc;
}

export function chorusStaffABC({
  concertKey,
  displayMode,
  applicationId = DEFAULT_APPLICATION_ID,
  clef = DEFAULT_CLEF,
  melodyRegister = DEFAULT_MELODY_REGISTER,
  mode = "model",
  showCues = false,
  barsPerLine = 4,
}) {
  if (mode === "slash") {
    return slashABC(concertKey, displayMode, applicationId, clef, { showCues, barsPerLine });
  }
  return modelABC(concertKey, displayMode, applicationId, clef, melodyRegister, { showCues, barsPerLine });
}

export function chartABC(concertKey, displayMode, clef = DEFAULT_CLEF) {
  const shownKey = displayKey(concertKey, displayMode);
  const chords = chorusChords(concertKey, displayMode);
  let abc = `X:1\nT:${FORM_TITLE}\nM:4/4\nL:1/1\n${abcKeyLine(shownKey, clef)}\n`;
  for (let bar = 0; bar < BARS_PER_CHORUS; bar += 1) {
    const chord = chords[bar];
    abc += `"${abcChordName(concertKey, chord.intervalFromTonic, chord.quality, displayMode)}"`;
    abc += "x";
    abc += bar === BARS_PER_CHORUS - 1 ? " |]\n" : " | ";
  }
  return abc;
}

export function scheduleChorus({
  concertKey,
  displayMode,
  includeModel,
  includeGuides,
  includeClick,
  includeCue,
  variationId,
  stage,
  lengthBeats,
  applicationId = DEFAULT_APPLICATION_ID,
  modelScope = "phrase",
  melodyRegister = DEFAULT_MELODY_REGISTER,
}) {
  const events = [];
  const app = applicationById(applicationId);
  const length = lengthBeats ?? (stage === "learn" ? CELL_BEATS : CHORUS_BEATS);
  const form = chorusChords(concertKey, displayMode);
  const learn = learnChords(concertKey, displayMode, applicationId);
  const phraseStart = stage === "learn" ? 0 : phraseStartBeat(applicationId);
  const cuesOn = includeCue ?? false;

  for (let beat = 0; beat < length; beat += 1) {
    if (includeClick) {
      events.push({ type: "click", beat, strong: beat % BEATS_PER_BAR === 0 });
    }
    const activeChord = stage === "learn" ? chordAtBeat(learn, beat) : chordAtBeat(form, beat);
    if (activeChord) {
      if (beat === activeChord.startBeat) {
        events.push({
          type: "chord",
          beat,
          midis: voicingMidi(activeChord.concertRootPc, activeChord.quality),
          durationBeats: Math.min(activeChord.durationBeats, length - beat),
          name: activeChord.name,
        });
      }
      const next = chordAtBeat(stage === "learn" ? learn : form, beat + 1) ?? activeChord;
      const beatInChord = beat - activeChord.startBeat;
      events.push({
        type: "bass",
        beat,
        midi: walkingBassMidi(activeChord.concertRootPc, activeChord.quality, beatInChord, next.concertRootPc),
        durationBeats: 1,
      });
    }
  }

  if (includeGuides && stage !== "learn") {
    for (const chord of form) {
      if (chord.bar === app.phraseStartBar) continue;
      events.push({
        type: "guide",
        beat: chord.startBeat,
        midis: guideToneMidi(chord.concertRootPc, chord.quality),
        durationBeats: Math.min(1, chord.durationBeats),
      });
    }
  }

  if (cuesOn && phraseStart > 0 && phraseStart < length) {
    events.push({ type: "cue", beat: phraseStart - 1, kind: "warning" });
    events.push({ type: "cue", beat: phraseStart, kind: "downbeat" });
  }

  if (includeModel && variationId !== "skip") {
    const source = stage === "learn" || modelScope === "phrase"
      ? phraseEvents(applicationId).map((note) => ({
        ...note,
        beat: stage === "learn" ? note.beat - phraseStartBeat(applicationId) : note.beat,
      }))
      : modelSolo(applicationId);
    for (const note of source) {
      if (note.beat < length && note.beat >= 0) {
        events.push({
          type: "melody",
          beat: note.beat,
          midi: melodyMidiForInterval(concertKey.pc, note.interval, melodyRegister),
          durationBeats: note.beats,
          role: note.role,
        });
      }
    }
  }

  events.push({ type: "end", beat: length });
  return events.sort((a, b) => a.beat - b.beat || a.type.localeCompare(b.type));
}
