/**
 * Interval-based music helpers for the DuoJazz integration prototype.
 * Mirrors DuoJazz lick `short-ii-v-i` (BuiltInLicks.shortIIVI) and
 * ChordProgression.shortIIVI without importing native code.
 */

export const PHRASE_ID = "short-ii-v-i";
export const PHRASE_NAME = "Short ii–V–I";

/** Eighth-default elements from BuiltInLicks.shortIIVI */
export const PHRASE_ELEMENTS = [
  { type: "note", interval: 2, beats: 0.5 },
  { type: "note", interval: 4, beats: 0.5 },
  { type: "note", interval: 5, beats: 0.5 },
  { type: "note", interval: 7, beats: 0.5 },
  { type: "note", interval: 9, beats: 0.5 },
  { type: "note", interval: 12, beats: 0.5 },
  { type: "note", interval: 11, beats: 0.5 },
  { type: "note", interval: 9, beats: 0.5 },
  { type: "note", interval: 7, beats: 2 },
];

export const PHRASE_BEATS = PHRASE_ELEMENTS.reduce((sum, el) => sum + el.beats, 0);
export const CELL_BEATS = 8;
export const BARS_PER_CHORUS = 8;
export const BEATS_PER_BAR = 4;
export const CHORUS_BEATS = BARS_PER_CHORUS * BEATS_PER_BAR;
export const PHRASE_START_BEAT = CELL_BEATS;
export const COUNT_IN_BEATS = 4;

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

export const PRIMARY_KEY_IDS = ["C", "F", "Bb", "Eb", "Ab", "G", "D", "A"];

const SHARP = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const FLAT = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"];
const DEGREE_FROM_I = ["1", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"];

const QUALITY_ASCII = {
  minor7: "-7",
  dominant7: "7",
  major7: "maj7",
};

const QUALITY_ABC = {
  minor7: "m7",
  dominant7: "7",
  major7: "maj7",
};

const QUALITY_INTERVALS = {
  minor7: [0, 3, 7, 10],
  dominant7: [0, 4, 7, 10],
  major7: [0, 4, 7, 11],
};

const GUIDE_INTERVALS = {
  minor7: [3, 10],
  dominant7: [4, 10],
  major7: [4, 11],
};

/** Two-bar short ii–V–I: beats 0–2 ii-7, 2–4 V7, 4–8 Imaj7 */
export const CELL_CHORDS = [
  { degree: 2, quality: "minor7", startBeat: 0, durationBeats: 2, functionLabel: "ii-7" },
  { degree: 5, quality: "dominant7", startBeat: 2, durationBeats: 2, functionLabel: "V7" },
  { degree: 1, quality: "major7", startBeat: 4, durationBeats: 4, functionLabel: "Imaj7" },
];

const DEGREE_SEMITONES = { 1: 0, 2: 2, 3: 4, 4: 5, 5: 7, 6: 9, 7: 11 };

export function getKey(id) {
  return KEYS.find((key) => key.id === id) ?? KEYS[0];
}

export function wrapPc(pc) {
  return ((pc % 12) + 12) % 12;
}

export function pitchName(pc, usesFlats) {
  return (usesFlats ? FLAT : SHARP)[wrapPc(pc)];
}

export function writtenKeyFromConcert(concertKey) {
  const writtenPc = wrapPc(concertKey.pc + 2);
  const match = KEYS.find((key) => key.pc === writtenPc && key.usesFlats === concertKey.usesFlats);
  return match ?? KEYS.find((key) => key.pc === writtenPc) ?? concertKey;
}

export function displayKey(concertKey, displayMode) {
  return displayMode === "bb-written" ? writtenKeyFromConcert(concertKey) : concertKey;
}

export function chordRootPc(concertTonicPc, degree) {
  return wrapPc(concertTonicPc + DEGREE_SEMITONES[degree]);
}

export function chordDisplayName(concertTonic, degree, quality, displayMode) {
  const concertRoot = chordRootPc(concertTonic.pc, degree);
  const shownPc = displayMode === "bb-written" ? wrapPc(concertRoot + 2) : concertRoot;
  const shownKey = displayKey(concertTonic, displayMode);
  return `${pitchName(shownPc, shownKey.usesFlats)}${QUALITY_ASCII[quality]}`;
}

export function phraseDurationBeats() {
  return PHRASE_BEATS;
}

export function midiForInterval(concertTonicPc, interval, octaveOffset = 0) {
  return 60 + concertTonicPc + interval + octaveOffset * 12;
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
  const normalized = wrapPc(interval);
  const octave = interval >= 12 ? " (8ve)" : interval < 0 ? " (below)" : "";
  return `${DEGREE_FROM_I[normalized]}${octave}`;
}

export function phraseNotes(concertKey, displayMode) {
  const shownKey = displayKey(concertKey, displayMode);
  let beat = 0;
  return PHRASE_ELEMENTS.filter((el) => el.type === "note").map((el, index) => {
    const concertMidi = midiForInterval(concertKey.pc, el.interval);
    const shownMidi = concertMidiToWritten(concertMidi, displayMode);
    const spelled = spellMidi(shownMidi, shownKey.usesFlats);
    const concertSpelled = spellMidi(concertMidi, concertKey.usesFlats);
    const row = {
      index,
      startBeat: beat,
      beats: el.beats,
      interval: el.interval,
      concertMidi,
      shownMidi,
      shownName: `${spelled.name}${spelled.octave}`,
      concertName: `${concertSpelled.name}${concertSpelled.octave}`,
      degree: degreeInI(el.interval),
      rhythm: rhythmLabel(el.beats),
    };
    beat += el.beats;
    return row;
  });
}

export function chorusChords(concertKey, displayMode) {
  const chords = [];
  for (let cell = 0; cell < BARS_PER_CHORUS / 2; cell += 1) {
    const cellStart = cell * CELL_BEATS;
    for (const chord of CELL_CHORDS) {
      chords.push({
        ...chord,
        startBeat: cellStart + chord.startBeat,
        name: chordDisplayName(concertKey, chord.degree, chord.quality, displayMode),
        concertRootPc: chordRootPc(concertKey.pc, chord.degree),
        functionLabel: chord.functionLabel,
        role: cell === 1 ? "phrase" : cell === 0 ? "setup" : "continue",
      });
    }
  }
  return chords;
}

export function barRoles() {
  return [
    { bar: 1, role: "setup", label: "Improvise into it" },
    { bar: 2, role: "setup", label: "Prepare the door" },
    { bar: 3, role: "phrase", label: "Entrance — phrase" },
    { bar: 4, role: "phrase", label: "Resolve on I" },
    { bar: 5, role: "continue", label: "Keep going" },
    { bar: 6, role: "continue", label: "Keep going" },
    { bar: 7, role: "continue", label: "Keep going" },
    { bar: 8, role: "continue", label: "Keep going" },
  ];
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
  const root = 36 + wrapPc(rootPc);
  const fifth = root + 7;
  const third = root + QUALITY_INTERVALS[quality][1];
  if (beatInChord === 0) return root;
  if (beatInChord === 1) return fifth;
  if (beatInChord === 2) return third;
  const target = 36 + wrapPc(nextRootPc ?? rootPc);
  const below = target - 1;
  return below >= 28 ? below : target + 2;
}

export function variationElements(variationId) {
  if (variationId === "sequence-down") {
    return PHRASE_ELEMENTS.map((el) => ({ ...el, interval: el.interval - 2 }));
  }
  if (variationId === "neighbor") {
    return [
      { type: "note", interval: 1, beats: 0.5 },
      { type: "note", interval: 2, beats: 0.5 },
      { type: "note", interval: 4, beats: 0.5 },
      { type: "note", interval: 5, beats: 0.5 },
      { type: "note", interval: 7, beats: 0.5 },
      { type: "note", interval: 9, beats: 0.5 },
      { type: "note", interval: 11, beats: 0.5 },
      { type: "note", interval: 12, beats: 0.5 },
      { type: "note", interval: 7, beats: 2 },
    ];
  }
  return PHRASE_ELEMENTS;
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

function abcChordName(concertTonic, degree, quality, displayMode) {
  const concertRoot = chordRootPc(concertTonic.pc, degree);
  const shownPc = displayMode === "bb-written" ? wrapPc(concertRoot + 2) : concertRoot;
  const shownKey = displayKey(concertTonic, displayMode);
  const root = pitchName(shownPc, shownKey.usesFlats).replaceAll("♭", "b").replaceAll("♯", "#");
  return `${root}${QUALITY_ABC[quality]}`;
}

export function phraseABC(concertKey, displayMode, { withPickupRest = true } = {}) {
  const shownKey = displayKey(concertKey, displayMode);
  const chords = CELL_CHORDS.map((chord) => ({
    beat: chord.startBeat,
    text: abcChordName(concertKey, chord.degree, chord.quality, displayMode),
  }));

  let abc = `X:1\nT:${PHRASE_NAME}\nM:4/4\nL:1/8\nK:${shownKey.abc} clef=treble\n`;
  let beat = 0;
  for (const el of PHRASE_ELEMENTS) {
    const chord = chords.find((item) => Math.abs(item.beat - beat) < 1e-6);
    if (chord) abc += `"${chord.text}"`;
    const concertMidi = midiForInterval(concertKey.pc, el.interval);
    const shownMidi = concertMidiToWritten(concertMidi, displayMode);
    abc += abcNote(shownMidi, shownKey.usesFlats) + abcDuration(el.beats);
    beat += el.beats;
    if (Math.abs(beat - 4) < 1e-6) abc += " | ";
  }
  if (withPickupRest && PHRASE_BEATS < CELL_BEATS) {
    const remaining = CELL_BEATS - PHRASE_BEATS;
    abc += remaining === 2 ? " z4" : ` z${abcDuration(remaining)}`;
  }
  abc += " |]\n";
  return abc;
}

export function chartABC(concertKey, displayMode) {
  const shownKey = displayKey(concertKey, displayMode);
  const chords = chorusChords(concertKey, displayMode);
  let abc = `X:1\nT:Eight-bar form\nM:4/4\nL:1/1\nK:${shownKey.abc} clef=treble\n`;
  for (let bar = 0; bar < BARS_PER_CHORUS; bar += 1) {
    const beat = bar * BEATS_PER_BAR;
    const here = chords.filter((chord) => chord.startBeat >= beat && chord.startBeat < beat + BEATS_PER_BAR);
    if (here.length === 0) {
      const current = chordAtBeat(chords, beat);
      if (current) abc += `"${abcChordName(concertKey, current.degree, current.quality, displayMode)}"`;
    } else {
      for (const chord of here) {
        abc += `"${abcChordName(concertKey, chord.degree, chord.quality, displayMode)}"`;
      }
    }
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
}) {
  const events = [];
  const chords = chorusChords(concertKey, displayMode);
  const length = lengthBeats ?? (stage === "learn" ? CELL_BEATS : CHORUS_BEATS);
  const phraseStart = stage === "learn" ? 0 : PHRASE_START_BEAT;
  const cuesOn = includeCue ?? stage !== "learn";
  const elements = variationElements(variationId);

  for (let beat = 0; beat < length; beat += 1) {
    if (includeClick) {
      events.push({ type: "click", beat, strong: beat % BEATS_PER_BAR === 0 });
    }
    const chord = chordAtBeat(chords, stage === "learn" ? beat : beat);
    const learnChord = chordAtBeat(chorusChords(concertKey, displayMode).slice(0, 3), beat);
    const activeChord = stage === "learn" ? learnChord : chord;
    if (activeChord && beat === activeChord.startBeat) {
      events.push({
        type: "chord",
        beat,
        midis: voicingMidi(activeChord.concertRootPc, activeChord.quality),
        durationBeats: activeChord.durationBeats,
        name: activeChord.name,
      });
    }
    if (activeChord) {
      const next = chordAtBeat(stage === "learn" ? chorusChords(concertKey, displayMode).slice(0, 3) : chords, beat + 1)
        ?? activeChord;
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
    for (const chord of chords) {
      if (chord.startBeat >= length) break;
      if (chord.role === "phrase") continue;
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
    let local = 0;
    for (const el of elements) {
      if (el.type === "note" && phraseStart + local < length) {
        events.push({
          type: "melody",
          beat: phraseStart + local,
          midi: midiForInterval(concertKey.pc, el.interval),
          durationBeats: el.beats,
          index: elements.filter((item) => item.type === "note").indexOf(el),
        });
      }
      local += el.beats;
    }
  }

  events.push({ type: "end", beat: length });
  return events.sort((a, b) => a.beat - b.beat || a.type.localeCompare(b.type));
}

