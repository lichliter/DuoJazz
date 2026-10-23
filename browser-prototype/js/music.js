/**
 * Interval-based lick engine for the DuoJazz browser prototype.
 * Registry lives in registry.js; this file transposes, spells, engraves, and schedules.
 */

import {
  ALL_APPLICATIONS,
  APPLICATIONS as REGISTRY_APPLICATIONS,
  LICKS,
  FORMS,
  applicationById as registryApplication,
  lickById,
  formById,
  lickForApplication,
  formForApplication,
  lickNoteElements,
  lickTotalBeats,
  formBeats,
  learnBeatsFor,
  formBeatsFor,
  applicationKeyQuality,
  phraseSpanBars,
  TROMBONE_LOW_MIDI,
  TROMBONE_HIGH_MIDI,
} from "./registry.js";

export {
  ALL_APPLICATIONS,
  lickById,
  formById,
  lickForApplication,
  formForApplication,
  learnBeatsFor,
  formBeatsFor,
  applicationKeyQuality,
  phraseSpanBars,
  TROMBONE_LOW_MIDI,
  TROMBONE_HIGH_MIDI,
};

const CMAR = lickById("cmar");
const AL_FORM = formById("autumn-leaves-8");

export const PHRASE_ID = "cry-me-a-river-minor-cell";
export const PHRASE_NAME = "Cry Me a River cell";
export const PHRASE_SOURCE = {
  shape: "9–1–5–♭3–2–1 from a minor tonic",
  rhythm: "quarter, eighth-note triplet, two eighths, quarter rest (one bar)",
  contour: "ninth above the tonic octave, down to 1, leap to 5, scale down ♭3–2–1",
  reference: "Common jazz-vocabulary minor cell (C minor: D–C–G–Eb–D–C). Concert G minor in trombone register sounds A3–G3–D3–Bb2–A2–G2.",
  notUsed: "DuoJazz BuiltInLicks.iiviCryMeEnclosure (id iivi-cry-me-enclosure) is a major ii–V–I double-enclosure (5–3–9–6–7…), not this cell",
};

export const FORM_ID = "autumn-leaves-opening-8";
export const FORM_TITLE = AL_FORM.title;
export const FORM_SOURCE = AL_FORM.source;

/** 9–1–5–♭3–2–1 from the cell’s minor tonic. Interval 14 is the ninth above the tonic octave. */
export const PHRASE_ELEMENTS = lickNoteElements(CMAR);

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

export function melodyOctaveOffset(register = DEFAULT_MELODY_REGISTER, octaveBase = PHRASE_OCTAVE) {
  return octaveBase + normalizeMelodyRegister(register);
}

export function melodySemitoneShift(register = DEFAULT_MELODY_REGISTER) {
  return normalizeMelodyRegister(register) * 12;
}

export const PHRASE_BEATS = lickTotalBeats(CMAR);
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
  halfdim7: "ø7",
  dominant7b9: "7♭9",
};

const QUALITY_ABC = { ...QUALITY_ASCII };

const QUALITY_INTERVALS = {
  minor7: [0, 3, 7, 10],
  dominant7: [0, 4, 7, 10],
  major7: [0, 4, 7, 11],
  minor7b5: [0, 3, 6, 10],
  minor6: [0, 3, 7, 9],
  halfdim7: [0, 3, 6, 10],
  dominant7b9: [0, 4, 7, 10, 13],
};

const GUIDE_INTERVALS = {
  minor7: [3, 10],
  dominant7: [4, 10],
  major7: [4, 11],
  minor7b5: [3, 10],
  minor6: [3, 9],
  halfdim7: [3, 10],
  dominant7b9: [4, 10],
};

const AL_FUNCTION = ["iv-7", "♭VII7", "♭IIImaj7", "♭VImaj7", "iiø7", "V7", "i6", "i6"];

/** One chord per bar, intervals from the excerpt’s minor tonic (G on the source chart). */
export const FORM_BARS = AL_FORM.bars.map((spec, index) => ({
  bar: index + 1,
  intervalFromTonic: spec.chords[0].intervalFromTonic,
  quality: spec.chords[0].quality,
  functionLabel: AL_FUNCTION[index],
}));

export const APPLICATIONS = REGISTRY_APPLICATIONS;

export function getKey(id) {
  return KEYS.find((key) => key.id === id) ?? KEYS.find((key) => key.id === DEFAULT_KEY_ID) ?? KEYS[0];
}

export function applicationById(id) {
  return registryApplication(id);
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

export function majorSpelling(key) {
  return {
    ...key,
    abc: key.abc,
    name: `${key.name} major`,
    shortName: key.name,
  };
}

export function writtenKeyFromConcert(concertKey) {
  const writtenPc = wrapPc(concertKey.pc + 2);
  const match = KEYS.find((key) => key.pc === writtenPc && key.usesFlats === concertKey.usesFlats);
  return match ?? KEYS.find((key) => key.pc === writtenPc) ?? concertKey;
}

export function displayKey(concertKey, displayMode, quality = "minor") {
  const raw = displayMode === "bb-written" ? writtenKeyFromConcert(concertKey) : concertKey;
  return quality === "major" ? majorSpelling(raw) : minorSpelling(raw);
}

export function chordRootPc(concertTonicPc, intervalFromTonic) {
  return wrapPc(concertTonicPc + intervalFromTonic);
}

export function chordDisplayName(concertTonic, intervalFromTonic, quality, displayMode) {
  const concertRoot = chordRootPc(concertTonic.pc, intervalFromTonic);
  const shownPc = displayMode === "bb-written" ? wrapPc(concertRoot + 2) : concertRoot;
  const shownKey = displayKey(concertTonic, displayMode, "minor");
  const usesFlats = displayKey(concertTonic, displayMode, applicationKeyQualityFromTonic(concertTonic)).usesFlats
    ?? shownKey.usesFlats;
  return `${pitchName(shownPc, usesFlats)}${QUALITY_ASCII[quality] ?? QUALITY_ASCII.dominant7}`;
}

function applicationKeyQualityFromTonic() {
  return "minor";
}

function usesFlatsFor(concertKey, displayMode, quality) {
  return displayKey(concertKey, displayMode, quality).usesFlats;
}

export function phraseDurationBeats(applicationId = DEFAULT_APPLICATION_ID) {
  return lickTotalBeats(lickForApplication(applicationId));
}

export function midiForInterval(concertTonicPc, interval, octaveOffset = PHRASE_OCTAVE) {
  return 60 + concertTonicPc + interval + octaveOffset * 12;
}

export function lickOctaveForKey(lick, keyPc) {
  const notes = lickNoteElements(lick);
  if (!notes.length || lick.id === "cmar") return lick.octave;
  let best = lick.octave;
  let bestScore = Infinity;
  for (const oct of [lick.octave - 1, lick.octave, lick.octave + 1]) {
    const midis = notes.map((note) => midiForInterval(keyPc, note.interval, oct));
    const min = Math.min(...midis);
    const max = Math.max(...midis);
    const below = Math.max(0, TROMBONE_LOW_MIDI - min);
    const above = Math.max(0, max - TROMBONE_HIGH_MIDI);
    const score = below * 4 + above * 4 + Math.abs(oct - lick.octave) * 0.25;
    if (score < bestScore) {
      bestScore = score;
      best = oct;
    }
  }
  return best;
}

export function octaveForApplication(applicationId, concertTonicPc) {
  const app = applicationById(applicationId);
  return lickOctaveForKey(lickForApplication(applicationId), wrapPc(concertTonicPc + app.cellTonicInterval));
}

export function melodyMidiForInterval(
  concertTonicPc,
  interval,
  melodyRegister = DEFAULT_MELODY_REGISTER,
  octaveBase = PHRASE_OCTAVE,
) {
  return midiForInterval(concertTonicPc, interval, melodyOctaveOffset(melodyRegister, octaveBase));
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
  if (Math.abs(beats - 0.25) < 1e-6) return "sixteenth";
  if (Math.abs(beats - 1 / 3) < 1e-6) return "triplet eighth";
  if (beats === 0.5) return "eighth";
  if (beats === 1) return "quarter";
  if (beats === 2) return "half";
  if (beats === 2.5) return "tied half";
  if (beats === 4) return "whole";
  return `${beats} beats`;
}

export function degreeInI(interval) {
  if (interval === 14) return "9";
  if (interval === 15) return "♭10";
  const normalized = wrapPc(interval);
  const octave = interval >= 12 ? " (8ve)" : interval < 0 ? " (below)" : "";
  return `${DEGREE_FROM_I[normalized]}${octave}`;
}

export function phraseStartBeat(applicationId) {
  const app = applicationById(applicationId);
  return (app.phraseStartBar - 1) * BEATS_PER_BAR;
}

export function phraseTimeline(applicationId, isolated = false) {
  const app = applicationById(applicationId);
  const lick = lickById(app.lickId);
  const pickup = !isolated && app.includePickup ? lick.pickupBeats : 0;
  const origin = isolated ? 0 : phraseStartBeat(applicationId) - pickup;
  let beat = origin;
  const items = [];
  for (const el of lick.elements) {
    items.push({
      ...el,
      beat,
      interval: el.type === "note" ? el.interval + app.cellTonicInterval : null,
      cellInterval: el.interval,
      role: "phrase",
    });
    beat += el.beats;
  }
  return items;
}

export function phraseEvents(applicationId, isolated = false) {
  return phraseTimeline(applicationId, isolated).filter((el) => el.type === "note");
}

export function modelSolo(applicationId) {
  const app = applicationById(applicationId);
  const lead = (app.leadIn ?? []).map((note) => ({ ...note, role: "lead" }));
  const resolve = (app.resolve ?? []).map((note) => ({ ...note, role: "resolve" }));
  return [...lead, ...phraseEvents(applicationId), ...resolve].sort((a, b) => a.beat - b.beat);
}

export function phraseNotes(
  concertKey,
  displayMode,
  applicationId = DEFAULT_APPLICATION_ID,
  melodyRegister = DEFAULT_MELODY_REGISTER,
) {
  const quality = applicationKeyQuality(applicationId);
  const shownKey = displayKey(concertKey, displayMode, quality);
  const concertSpell = quality === "major" ? majorSpelling(concertKey) : minorSpelling(concertKey);
  const octaveBase = octaveForApplication(applicationId, concertKey.pc);
  return phraseEvents(applicationId).map((event, index) => {
    const concertMidi = melodyMidiForInterval(concertKey.pc, event.interval, melodyRegister, octaveBase);
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
      tuplet: event.tuplet,
      articulation: event.articulation,
      pickup: event.pickup,
      tie: event.tie,
    };
  });
}

function materializeChord(concertKey, displayMode, spec, startBeat, quality) {
  const keyQuality = quality ?? "minor";
  const shownKey = displayKey(concertKey, displayMode, keyQuality);
  const name = `${pitchName(
    displayMode === "bb-written"
      ? wrapPc(chordRootPc(concertKey.pc, spec.intervalFromTonic) + 2)
      : chordRootPc(concertKey.pc, spec.intervalFromTonic),
    shownKey.usesFlats,
  )}${QUALITY_ASCII[spec.quality] ?? ""}`;
  return {
    ...spec,
    startBeat,
    durationBeats: spec.durationBeats ?? BEATS_PER_BAR,
    name,
    concertRootPc: chordRootPc(concertKey.pc, spec.intervalFromTonic),
  };
}

export function chorusChords(concertKey, displayMode, applicationId) {
  const form = applicationId ? formForApplication(applicationId) : AL_FORM;
  const quality = form.keyQuality ?? "minor";
  const chords = [];
  form.bars.forEach((barSpec, index) => {
    let beat = index * BEATS_PER_BAR;
    for (const spec of barSpec.chords) {
      chords.push(materializeChord(concertKey, displayMode, spec, beat, quality));
      beat += spec.durationBeats ?? BEATS_PER_BAR;
    }
  });
  return chords;
}

export function learnChords(concertKey, displayMode, applicationId = DEFAULT_APPLICATION_ID) {
  const app = applicationById(applicationId);
  const form = formForApplication(applicationId);
  const quality = form.keyQuality ?? "minor";
  if (app.copyKind === "learn" || String(form.id).endsWith("-learn")) {
    return chorusChords(concertKey, displayMode, applicationId);
  }
  const tonic = {
    intervalFromTonic: app.cellTonicInterval,
    quality: "minor6",
    durationBeats: CELL_BEATS,
  };
  return [materializeChord(concertKey, displayMode, tonic, 0, quality)].map((chord) => ({
    ...chord,
    durationBeats: CELL_BEATS,
    bar: 1,
  }));
}

export function chordAtBeat(chords, beat) {
  return [...chords]
    .reverse()
    .find((chord) => beat >= chord.startBeat && beat < chord.startBeat + chord.durationBeats);
}

export function cellTonicSpelling(concertKey, displayMode, applicationId = DEFAULT_APPLICATION_ID) {
  const app = applicationById(applicationId);
  const quality = applicationKeyQuality(applicationId);
  const shownKey = displayKey(concertKey, displayMode, quality);
  const concertPc = wrapPc(concertKey.pc + app.cellTonicInterval);
  const shownPc = displayMode === "bb-written" ? wrapPc(concertPc + 2) : concertPc;
  const name = pitchName(shownPc, shownKey.usesFlats);
  if (quality === "major") {
    return { name, minorName: `${name} major`, shortName: name, quality };
  }
  return {
    name,
    minorName: `${name} minor`,
    shortName: `${name}m`,
    quality,
  };
}

export function applicationContext(concertKey, displayMode, applicationId = DEFAULT_APPLICATION_ID) {
  const app = applicationById(applicationId);
  const shown = displayKey(concertKey, displayMode, applicationKeyQuality(applicationId));
  const cell = cellTonicSpelling(concertKey, displayMode, applicationId);
  const form = formForApplication(applicationId);
  const chords = chorusChords(concertKey, displayMode, applicationId);
  const startBeat = phraseStartBeat(applicationId);
  const target = chordAtBeat(chords, Math.max(0, startBeat)) ?? chords[0];
  const targetChord = target?.name ?? "";
  const homeChord = chordDisplayName(concertKey, 0, form.keyQuality === "major" ? "major7" : "minor6", displayMode);
  const dominantChord = chordDisplayName(concertKey, 7, "dominant7", displayMode);
  const enterBar = app.phraseStartBar;
  const readyBar = prepareBar(applicationId);
  const lick = lickById(app.lickId);
  const cellName = cell.minorName;
  const base = {
    id: app.id,
    label: app.label,
    cellName,
    cellShort: cell.shortName,
    targetChord,
    homeChord,
    dominantChord,
    tuneName: shown.name,
    tuneShort: shown.shortName,
    enterBar,
    readyBar,
    formTitle: form.shortTitle ?? form.title,
    lickName: lick.shortName,
    placement: `On ${targetChord} · Bar ${enterBar}`,
    shapeOver: `${cellName} over ${targetChord}`,
    listenBlurb: `${cellName} over ${targetChord}. Hear the phrase land in bar ${enterBar}.`,
    helpBlurb: `${cellName} over ${targetChord}. Get ready in bar ${readyBar}. Bring the phrase in on bar ${enterBar}.`,
    freeBlurb: `${cellName} over ${targetChord}. Your line over the form.`,
    learnBlurb: `${lick.shortName} in ${cellName}. Same intervals in this key.`,
    keysBlurb: `Same ${cellName} shape. Interval meaning stays put; only the door changes.`,
    checkRecallBlurb: `Recall the lick in ${cellName}. The app is not listening.`,
    checkApplyBlurb: `Use the lick over the form in ${shown.name}. No written door unless you reveal it.`,
    entranceQuestion: app.entranceQuestion ?? `Did you find the door on bar ${enterBar}?`,
    afterQuestion: app.afterQuestion ?? `Did you keep playing after bar ${enterBar}?`,
    phraseFunctionLabel: app.phraseFunctionLabel ?? `${targetChord} · ${lick.shortName}`,
    resolvePrompt: `Resolve into ${shown.name}. Keep going.`,
  };

  if (app.copyKind === "cmar-home" || app.copyKind === "cmar-altered") {
    return {
      ...base,
      placement: `On ${targetChord} · Bar ${enterBar}`,
      shapeOver: `${cellName} shape over ${targetChord}`,
      listenBlurb: `${cellName} shape over ${targetChord}. Hear the phrase land in bar ${enterBar}, then become part of the line.`,
      helpBlurb: `${cellName} shape over ${targetChord}. Get ready in bar ${readyBar}. Bring the phrase in on bar ${enterBar}.`,
      freeBlurb: `${cellName} shape over ${targetChord}. Your line over the eight bars.`,
      learnBlurb: `Cry Me a River cell in ${cellName}. Same intervals in this key.`,
      keysBlurb: `Same ${cellName} shape. Interval meaning stays put; only the door changes.`,
      checkRecallBlurb: `Recall the cell in ${cellName}. The app is not listening.`,
      checkApplyBlurb: `Use the cell over the eight bars in ${shown.name}. No written door unless you reveal it.`,
      entranceQuestion: `Did you find the ${cellName} door on bar ${enterBar}?`,
      afterQuestion: app.id === "altered-dominant"
        ? `Did you resolve into ${shown.name} and keep playing?`
        : `Did you keep playing on the second ${homeChord} bar?`,
      phraseFunctionLabel: app.id === "altered-dominant"
        ? `V7 · ${cellName} cell`
        : `i6 · Cry Me a River cell`,
      resolvePrompt: `Resolve into ${shown.name}. Keep going.`,
    };
  }
  return base;
}

export function supportBlurb(concertKey, displayMode, applicationId, supportId) {
  const ctx = applicationContext(concertKey, displayMode, applicationId);
  if (supportId === "help") return ctx.helpBlurb;
  if (supportId === "free") return ctx.freeBlurb;
  return ctx.listenBlurb;
}

export function voicingMidi(rootPc, quality, register = 52) {
  const root = rootPc + 12 * Math.floor((register - rootPc + 12) / 12);
  return (QUALITY_INTERVALS[quality] ?? QUALITY_INTERVALS.dominant7).map((interval) => root + interval);
}

export function guideToneMidi(rootPc, quality, register = 60) {
  const root = rootPc + 12 * Math.floor((register - rootPc + 12) / 12);
  return (GUIDE_INTERVALS[quality] ?? GUIDE_INTERVALS.dominant7).map((interval) => root + interval);
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
  const shifted = lickForApplication(applicationId).elements.map((el) => (
    el.type === "note" ? { ...el, interval: el.interval + app.cellTonicInterval } : { ...el }
  ));
  if (variationId === "sequence-down") {
    return shifted.map((el) => (el.type === "note" ? { ...el, interval: el.interval - 2 } : el));
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
  if (!swingEnabled || beats < 0) return beats * beatDur;
  const ratio = swingRatio(tempo);
  const whole = Math.floor(beats + 1e-9);
  const frac = beats - whole;
  let extra = 0;
  if (frac <= 0.5) extra = (frac / 0.5) * ratio * beatDur;
  else extra = ratio * beatDur + ((frac - 0.5) / 0.5) * (1 - ratio) * beatDur;
  return whole * beatDur + extra;
}

function almost(a, b, eps = 1e-6) {
  return Math.abs(a - b) < eps;
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
  const units = beats / 0.5;
  if (almost(units, 1)) return "";
  if (almost(units, 0.5)) return "/2";
  if (almost(units, 2)) return "2";
  if (almost(units, 3)) return "3";
  if (almost(units, 4)) return "4";
  if (almost(units, 5)) return "5";
  if (almost(units, 6)) return "6";
  if (almost(units, 8)) return "8";
  if (almost(units, 0)) return "";
  const rounded = Math.round(units);
  if (almost(units, rounded)) return String(rounded);
  return String(Math.round(units * 2) / 2);
}

function abcArticulation(item) {
  if (item.articulation === "staccato") return ".";
  if (item.articulation === "tenuto") return "!tenuto!";
  return "";
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

function abcChordName(concertTonic, intervalFromTonic, quality, displayMode, keyQuality = "minor") {
  const concertRoot = chordRootPc(concertTonic.pc, intervalFromTonic);
  const shownPc = displayMode === "bb-written" ? wrapPc(concertRoot + 2) : concertRoot;
  const shownKey = displayKey(concertTonic, displayMode, keyQuality);
  const root = pitchName(shownPc, shownKey.usesFlats);
  return `${root}${QUALITY_ABC[quality] ?? ""}`;
}

function atBeatBoundary(beat) {
  return Math.abs(beat - Math.round(beat)) < 1e-6;
}

function afterNoteSpacing(beat) {
  if (Math.abs(beat % 4) < 1e-6) return " | ";
  if (atBeatBoundary(beat)) return " ";
  return "";
}

function noteToAbcBody(item, concertKey, displayMode, melodyRegister, octaveBase, durationBeats, tieOut = false, keyQuality = "minor") {
  const shownKey = displayKey(concertKey, displayMode, keyQuality);
  const concertMidi = melodyMidiForInterval(concertKey.pc, item.interval, melodyRegister, octaveBase);
  const shownMidi = concertMidiToWritten(concertMidi, displayMode);
  const pitch = abcNote(shownMidi, shownKey.usesFlats);
  const dur = item.tuplet === 3 ? "" : abcDuration(durationBeats);
  return `${abcArticulation(item)}${pitch}${dur}${tieOut ? "-" : ""}`;
}

function renderSlice(items, start, end, ctx) {
  const covering = items
    .filter((item) => item.beat < end - 1e-6 && item.beat + item.beats > start + 1e-6)
    .sort((a, b) => a.beat - b.beat);
  let abc = "";
  let cursor = start;
  let i = 0;
  const restFill = (dur) => {
    let left = dur;
    let out = "";
    while (left > 1e-6) {
      const chunk = left >= 4 - 1e-6 ? 4 : left >= 2 - 1e-6 ? 2 : left >= 1 - 1e-6 ? 1 : left >= 0.5 - 1e-6 ? 0.5 : left;
      out += `z${abcDuration(chunk)}`;
      left -= chunk;
    }
    return out;
  };
  while (i < covering.length) {
    const item = covering[i];
    const iStart = Math.max(item.beat, start);
    if (iStart > cursor + 1e-6) {
      abc += restFill(iStart - cursor);
      cursor = iStart;
    }
    if (item.tuplet === 3) {
      const group = [];
      while (i < covering.length && covering[i].tuplet === 3 && group.length < 3) {
        group.push(covering[i]);
        i += 1;
      }
      abc += "(3";
      for (const note of group) {
        abc += noteToAbcBody(note, ctx.concertKey, ctx.displayMode, ctx.melodyRegister, ctx.octaveBase, 0.5, false, ctx.quality);
      }
      cursor = group[group.length - 1].beat + group[group.length - 1].beats;
      if (almost(cursor % 4, 0) && cursor > start + 1e-6 && cursor < end - 1e-6) abc += " | ";
      else if (atBeatBoundary(cursor) && Math.abs(cursor - end) > 1e-6) abc += " ";
      continue;
    }
    const iEnd = Math.min(item.beat + item.beats, end);
    const dur = iEnd - iStart;
    const tieOut = item.type === "note" && item.beat + item.beats > end + 1e-6;
    if (item.type === "rest") abc += restFill(dur);
    else abc += noteToAbcBody(item, ctx.concertKey, ctx.displayMode, ctx.melodyRegister, ctx.octaveBase, dur, tieOut, ctx.quality);
    cursor = iEnd;
    if (almost(cursor % 4, 0) && cursor > start + 1e-6 && cursor < end - 1e-6) abc += " | ";
    else if (atBeatBoundary(cursor) && Math.abs(cursor - end) > 1e-6) abc += " ";
    i += 1;
  }
  if (end > cursor + 1e-6) {
    const leftover = end - cursor;
    const toBar = (4 - (cursor % 4)) % 4;
    if (toBar > 1e-6 && leftover > toBar + 1e-6) {
      abc += restFill(toBar);
      cursor += toBar;
      abc += " | ";
    }
    abc += restFill(end - cursor);
  }
  return abc;
}

export function abcClef(clef = DEFAULT_CLEF) {
  return clef === "bass" ? "bass" : "treble";
}

function abcKeyLine(shownKey, clef = DEFAULT_CLEF) {
  return `K:${shownKey.abc} clef=${abcClef(clef)}`;
}

function barCueAnnotation(barNumber, applicationId, showCues) {
  if (!showCues) return "";
  const cue = cueCaption(barNumber, applicationId);
  return cue ? `"_${cue}"` : "";
}

function barAdvance(bar, barCount, barsPerLine = 4) {
  if (bar === barCount - 1) return " |]\n";
  if ((bar + 1) % barsPerLine === 0) return " |\n";
  return " | ";
}

function slashGlyph(clef, eighthUnit = false) {
  if (eighthUnit) return clef === "treble" ? "B2" : "D,2";
  return clef === "treble" ? "B" : "D,";
}

function renderSlashBeats(durationBeats, clef, eighthUnit = true) {
  const glyph = slashGlyph(clef, eighthUnit);
  const n = Math.max(1, Math.round(durationBeats));
  return Array.from({ length: n }, () => glyph).join(" ");
}

function formContext(concertKey, displayMode, applicationId, melodyRegister) {
  const quality = applicationKeyQuality(applicationId);
  return {
    concertKey,
    displayMode,
    applicationId,
    melodyRegister,
    octaveBase: octaveForApplication(applicationId, concertKey.pc),
    quality,
    shownKey: displayKey(concertKey, displayMode, quality),
  };
}

function notesForMode(applicationId, mode, isolated = false) {
  if (mode === "model") return modelSolo(applicationId).map((note) => ({ ...note, type: "note" }));
  return isolated ? phraseTimeline(applicationId, true) : phraseTimeline(applicationId, false);
}

function barHasPhrase(applicationId, barNumber) {
  return phraseSpanBars(applicationId).includes(barNumber);
}

function renderFormAbc({
  concertKey,
  displayMode,
  applicationId = DEFAULT_APPLICATION_ID,
  clef = DEFAULT_CLEF,
  melodyRegister = DEFAULT_MELODY_REGISTER,
  mode = "model",
  showCues = false,
  barsPerLine = 4,
  isolated = false,
}) {
  const ctx = formContext(concertKey, displayMode, applicationId, melodyRegister);
  const form = isolated && mode === "phrase"
    ? formForApplication(applicationId)
    : formForApplication(applicationId);
  const chords = chorusChords(concertKey, displayMode, applicationId);
  const barCount = isolated && mode === "phrase"
    ? Math.max(form.bars.length, Math.ceil(learnBeatsFor(applicationId) / BEATS_PER_BAR))
    : form.bars.length;
  const items = notesForMode(applicationId, mode === "phrase" ? "landing" : mode, isolated || mode === "phrase");
  const eighth = true;
  let abc = `X:1\nM:4/4\nL:1/8\n${abcKeyLine(ctx.shownKey, clef)}\n`;

  const pickupNotes = items.filter((item) => item.type === "note" && item.beat < -1e-6);
  if (pickupNotes.length && !isolated) {
    abc += renderSlice(items, pickupNotes[0].beat, 0, ctx);
    abc += " |";
  }

  for (let bar = 0; bar < barCount; bar += 1) {
    const barStart = bar * BEATS_PER_BAR;
    const barEnd = barStart + BEATS_PER_BAR;
    const barChords = chords.filter((chord) => (
      chord.startBeat < barEnd - 1e-6 && chord.startBeat + chord.durationBeats > barStart + 1e-6
    ));
    const useNotes = mode === "model" || mode === "phrase"
      || (mode === "landing" && barHasPhrase(applicationId, bar + 1));
    if (!barChords.length) {
      if (isolated && mode === "phrase") {
        abc += renderSlice(items, barStart, barEnd, ctx);
      } else {
        abc += renderSlashBeats(4, clef, eighth);
      }
      abc += barAdvance(bar, barCount, barsPerLine);
      continue;
    }
    for (const [index, chord] of barChords.entries()) {
      const sliceStart = Math.max(barStart, chord.startBeat);
      const sliceEnd = Math.min(barEnd, chord.startBeat + chord.durationBeats);
      abc += `"${abcChordName(concertKey, chord.intervalFromTonic, chord.quality, displayMode, ctx.quality)}"`;
      if (index === 0) abc += barCueAnnotation(bar + 1, applicationId, showCues);
      if (useNotes) abc += renderSlice(items, sliceStart, sliceEnd, ctx);
      else abc += renderSlashBeats(sliceEnd - sliceStart, clef, eighth);
    }
    abc += barAdvance(bar, barCount, barsPerLine);
  }
  return abc;
}

export function phraseABC(
  concertKey,
  displayMode,
  applicationId = DEFAULT_APPLICATION_ID,
  clef = DEFAULT_CLEF,
  melodyRegister = DEFAULT_MELODY_REGISTER,
) {
  const ctx = formContext(concertKey, displayMode, applicationId, melodyRegister);
  const items = phraseTimeline(applicationId, true);
  const length = learnBeatsFor(applicationId);
  const app = applicationById(applicationId);
  const firstChord = learnChords(concertKey, displayMode, applicationId)[0];
  let abc = `X:1\nM:4/4\nL:1/8\n${abcKeyLine(ctx.shownKey, clef)}\n`;
  abc += `"${abcChordName(
    concertKey,
    firstChord?.intervalFromTonic ?? app.cellTonicInterval,
    firstChord?.quality ?? "minor6",
    displayMode,
    ctx.quality,
  )}"`;
  abc += renderSlice(items, 0, length, ctx);
  if (!String(abc).includes("|]")) {
    if (!abc.trimEnd().endsWith("|")) abc += " |]";
    abc += "\n";
  } else if (!abc.endsWith("\n")) abc += "\n";
  return abc;
}

export function modelABC(
  concertKey,
  displayMode,
  applicationId = DEFAULT_APPLICATION_ID,
  clef = DEFAULT_CLEF,
  melodyRegister = DEFAULT_MELODY_REGISTER,
  options = {},
) {
  return renderFormAbc({
    concertKey,
    displayMode,
    applicationId,
    clef,
    melodyRegister,
    mode: "model",
    showCues: Boolean(options.showCues),
    barsPerLine: options.barsPerLine ?? 4,
  });
}

export function slashABC(
  concertKey,
  displayMode,
  applicationId = DEFAULT_APPLICATION_ID,
  clef = DEFAULT_CLEF,
  options = {},
) {
  const shownKey = displayKey(concertKey, displayMode, applicationKeyQuality(applicationId));
  const chords = chorusChords(concertKey, displayMode, applicationId);
  const form = formForApplication(applicationId);
  const showCues = Boolean(options.showCues);
  const barsPerLine = options.barsPerLine ?? 4;
  const slashPitch = slashGlyph(clef, false);
  const barCount = form.bars.length;
  let abc = `X:1\nM:4/4\nL:1/4\n${abcKeyLine(shownKey, clef)}\n`;
  for (let bar = 0; bar < barCount; bar += 1) {
    const barStart = bar * BEATS_PER_BAR;
    const barEnd = barStart + BEATS_PER_BAR;
    const barChords = chords.filter((chord) => (
      chord.startBeat < barEnd - 1e-6 && chord.startBeat + chord.durationBeats > barStart + 1e-6
    ));
    for (const [index, chord] of barChords.entries()) {
      abc += `"${abcChordName(concertKey, chord.intervalFromTonic, chord.quality, displayMode, shownKey.name.includes("minor") ? "minor" : "major")}"`;
      if (index === 0) abc += barCueAnnotation(bar + 1, applicationId, showCues);
      const n = Math.max(1, Math.round(Math.min(chord.durationBeats, barEnd - Math.max(barStart, chord.startBeat))));
      abc += Array.from({ length: n }, () => slashPitch).join(" ");
      if (index < barChords.length - 1) abc += " ";
    }
    abc += barAdvance(bar, barCount, barsPerLine);
  }
  return abc;
}

export function landingABC(
  concertKey,
  displayMode,
  applicationId = DEFAULT_APPLICATION_ID,
  clef = DEFAULT_CLEF,
  melodyRegister = DEFAULT_MELODY_REGISTER,
  options = {},
) {
  return renderFormAbc({
    concertKey,
    displayMode,
    applicationId,
    clef,
    melodyRegister,
    mode: "landing",
    showCues: Boolean(options.showCues),
    barsPerLine: options.barsPerLine ?? 4,
  });
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
  if (mode === "landing") {
    return landingABC(concertKey, displayMode, applicationId, clef, melodyRegister, { showCues, barsPerLine });
  }
  return modelABC(concertKey, displayMode, applicationId, clef, melodyRegister, { showCues, barsPerLine });
}

export function chartABC(concertKey, displayMode, clef = DEFAULT_CLEF, applicationId = DEFAULT_APPLICATION_ID) {
  const shownKey = displayKey(concertKey, displayMode, applicationKeyQuality(applicationId));
  const chords = chorusChords(concertKey, displayMode, applicationId);
  const form = formForApplication(applicationId);
  let abc = `X:1\nT:${form.title}\nM:4/4\nL:1/1\n${abcKeyLine(shownKey, clef)}\n`;
  const barCount = form.bars.length;
  for (let bar = 0; bar < barCount; bar += 1) {
    const barStart = bar * BEATS_PER_BAR;
    const chord = chords.find((item) => item.startBeat >= barStart - 1e-6 && item.startBeat < barStart + BEATS_PER_BAR);
    if (chord) abc += `"${abcChordName(concertKey, chord.intervalFromTonic, chord.quality, displayMode, shownKey.name.includes("minor") ? "minor" : "major")}"`;
    abc += "x";
    abc += bar === barCount - 1 ? " |]\n" : " | ";
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
  const isolated = stage === "learn";
  const length = lengthBeats ?? (isolated ? learnBeatsFor(applicationId) : formBeatsFor(applicationId));
  const form = isolated ? learnChords(concertKey, displayMode, applicationId) : chorusChords(concertKey, displayMode, applicationId);
  const phraseStart = isolated ? 0 : phraseStartBeat(applicationId);
  const cuesOn = includeCue ?? false;
  const octaveBase = octaveForApplication(applicationId, concertKey.pc);

  for (const chord of form) {
    if (chord.startBeat >= 0 && chord.startBeat < length) {
      events.push({
        type: "chord",
        beat: chord.startBeat,
        midis: voicingMidi(chord.concertRootPc, chord.quality),
        durationBeats: Math.min(chord.durationBeats, length - chord.startBeat),
        name: chord.name,
      });
    }
  }

  for (let beat = 0; beat < length; beat += 1) {
    if (includeClick) {
      events.push({ type: "click", beat, strong: beat % BEATS_PER_BAR === 0 });
    }
    const activeChord = chordAtBeat(form, beat);
    if (activeChord) {
      const next = chordAtBeat(form, beat + 1) ?? activeChord;
      const beatInChord = beat - activeChord.startBeat;
      events.push({
        type: "bass",
        beat,
        midi: walkingBassMidi(activeChord.concertRootPc, activeChord.quality, beatInChord, next.concertRootPc),
        durationBeats: 1,
      });
    }
  }

  if (includeGuides && !isolated) {
    const skipBars = new Set(phraseSpanBars(applicationId));
    for (const chord of form) {
      const bar = Math.floor(chord.startBeat / BEATS_PER_BAR) + 1;
      if (skipBars.has(bar)) continue;
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
    const source = isolated || modelScope === "phrase"
      ? phraseEvents(applicationId, isolated).map((note) => ({
        ...note,
        beat: isolated ? note.beat : note.beat,
      }))
      : modelSolo(applicationId);
    for (const note of source) {
      if (note.beat < length && (isolated ? note.beat >= -1e-6 : true)) {
        events.push({
          type: "melody",
          beat: note.beat,
          midi: melodyMidiForInterval(concertKey.pc, note.interval, melodyRegister, octaveBase),
          durationBeats: note.beats,
          role: note.role,
          swing: note.tuplet ? false : undefined,
        });
      }
    }
  }

  events.push({ type: "end", beat: length });
  return events.sort((a, b) => a.beat - b.beat || a.type.localeCompare(b.type));
}

export { LICKS, FORMS, usesFlatsFor };
