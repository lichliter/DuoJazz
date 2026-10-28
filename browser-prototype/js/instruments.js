/**
 * One row per instrument: clef, written transposition, comfortable concert range, samples.
 * Adding an instrument later means one row here plus a sample folder.
 */

export const DEFAULT_INSTRUMENT_ID = "piano";

/**
 * transposeSemitones = written MIDI minus concert MIDI.
 * Key names use that value mod 12. Bass/guitar are 8va (12) so names stay concert.
 * rangeLow / rangeHigh are comfortable concert MIDI used to pick octave (few ledger lines).
 */
export const INSTRUMENTS = Object.freeze([
  {
    id: "piano",
    label: "Piano",
    clef: "treble",
    transposeSemitones: 0,
    sampleSet: "piano",
    rangeLow: 55,
    rangeHigh: 81,
    writtenRange: "G3–A5",
    note: "Concert, treble clef",
  },
  {
    id: "bass",
    label: "Bass",
    clef: "bass",
    transposeSemitones: 12,
    sampleSet: "bass",
    rangeLow: 28,
    rangeHigh: 50,
    writtenRange: "E2–D4",
    note: "Sounds an octave below written, bass clef",
  },
  {
    id: "guitar",
    label: "Guitar",
    clef: "treble",
    transposeSemitones: 12,
    sampleSet: "guitar",
    rangeLow: 40,
    rangeHigh: 67,
    writtenRange: "E3–G5",
    note: "Sounds an octave below written, treble clef",
  },
  {
    id: "trumpet",
    label: "Trumpet",
    clef: "treble",
    transposeSemitones: 2,
    sampleSet: "trumpet",
    rangeLow: 52,
    rangeHigh: 80,
    writtenRange: "F♯3–A♯5",
    note: "B♭, treble clef",
  },
  {
    id: "tenor-sax",
    label: "Tenor sax",
    clef: "treble",
    transposeSemitones: 14,
    sampleSet: "tenor-sax",
    rangeLow: 44,
    rangeHigh: 67,
    writtenRange: "B♭3–A5",
    note: "B♭, treble clef",
  },
  {
    id: "alto-sax",
    label: "Alto sax",
    clef: "treble",
    transposeSemitones: 9,
    sampleSet: "alto-sax",
    rangeLow: 49,
    rangeHigh: 72,
    writtenRange: "B♭3–A5",
    note: "E♭, treble clef",
  },
  {
    id: "trombone",
    label: "Trombone",
    clef: "bass",
    transposeSemitones: 0,
    sampleSet: "trombone",
    rangeLow: 40,
    rangeHigh: 70,
    writtenRange: "E2–B♭4",
    note: "Concert, bass clef",
  },
]);

const BY_ID = new Map(INSTRUMENTS.map((instrument) => [instrument.id, instrument]));

export function instrumentById(id) {
  return BY_ID.get(id) ?? null;
}

export function instrumentOrDefault(id) {
  return instrumentById(id) ?? BY_ID.get(DEFAULT_INSTRUMENT_ID);
}

/**
 * Written-minus-concert semitones from a display mode, instrument id, or profile.
 * Legacy: "concert" → 0, "bb-written" → 2.
 */
export function writtenSemitones(displayMode) {
  if (displayMode == null || displayMode === "concert") return 0;
  if (displayMode === "bb-written") return 2;
  if (typeof displayMode === "number" && Number.isFinite(displayMode)) return Math.trunc(displayMode);
  if (typeof displayMode === "object") return Math.trunc(Number(displayMode.transposeSemitones) || 0);
  const instrument = instrumentById(displayMode);
  return instrument ? instrument.transposeSemitones : 0;
}

export function instrumentFromDisplay(displayMode) {
  if (displayMode && typeof displayMode === "object") {
    if (displayMode.id && BY_ID.has(displayMode.id)) return BY_ID.get(displayMode.id);
    if (Number.isFinite(displayMode.transposeSemitones)) return displayMode;
    return null;
  }
  if (typeof displayMode === "string") return instrumentById(displayMode);
  return null;
}

/**
 * Old prefs: bass clef + concert → Bass; treble + concert → Piano; B♭ written → Trumpet.
 * New users (no clef/display/instrument) default to Piano.
 */
export function migrateInstrumentId(raw = {}) {
  if (instrumentById(raw.instrumentId)) return raw.instrumentId;
  if (raw.displayMode === "bb-written") return "trumpet";
  if (raw.clef === "treble") return "piano";
  if (raw.clef === "bass") return "bass";
  return DEFAULT_INSTRUMENT_ID;
}
