/**
 * Arrangement for the sound.html A/B page.
 * Current = today's close-position synth voicings + walkingBassMidi.
 * New (busy) = rootless piano with varied comp cells, walking bass, swing ride kit.
 * New-simple = same bass/drums, calmer piano: one hit on short chords, Charleston or 2-and-4 on long chords.
 */

import {
  chordAtBeat,
  chorusChords,
  getKey,
  voicingMidi,
  walkingBassMidi,
  wrapPc,
} from "./music.js";

export const BEATS_PER_BAR = 4;
export const DEFAULT_TEMPO = 140;
export const TEMPOS = [100, 140, 200];
export const BLUES_CHORUSES = 2;
export const HUMANIZE_TIMING_BEATS = 0.028;
export const HUMANIZE_VELOCITY = 0.08;
export const SIMPLE_HUMANIZE_MS = 10;
export const SIMPLE_HUMANIZE_VELOCITY = 0.04;
export const SHELL_LOW = 48; // C3
export const SHELL_HIGH = 72; // C5
export const SECTION_BEATS = BEATS_PER_BAR * 4;
export const SAMPLED_ENGINES = new Set(["new", "new-simple"]);

export const SIMPLE_LONG_PATTERN = {
  charleston: { offsets: [0, 1.5], durations: [1.45, 2.2] },
  twoAndFour: { offsets: [1, 3], durations: [1.7, 0.9] },
};

const F_BLUES_BARS = [
  { root: 5, quality: "dominant7", name: "F7" },
  { root: 10, quality: "dominant7", name: "B♭7" },
  { root: 5, quality: "dominant7", name: "F7" },
  { root: 5, quality: "dominant7", name: "F7" },
  { root: 10, quality: "dominant7", name: "B♭7" },
  { root: 10, quality: "dominant7", name: "B♭7" },
  { root: 5, quality: "dominant7", name: "F7" },
  { root: 5, quality: "dominant7", name: "F7" },
  { root: 0, quality: "dominant7", name: "C7" },
  { root: 10, quality: "dominant7", name: "B♭7" },
  { root: 5, quality: "dominant7", name: "F7" },
  { root: 0, quality: "dominant7", name: "C7" },
];

const TENSIONS = {
  dominant7: { third: 4, seventh: 10, ninth: 14, thirteenth: 21 },
  dominant7b9: { third: 4, seventh: 10, ninth: 13, thirteenth: 21 },
  dominant9: { third: 4, seventh: 10, ninth: 14, thirteenth: 21 },
  dominant7b13: { third: 4, seventh: 10, ninth: 14, thirteenth: 20 },
  dominant7s11: { third: 4, seventh: 10, ninth: 14, thirteenth: 21 },
  dominant7sus: { third: 5, seventh: 10, ninth: 14, thirteenth: 21 },
  minor7: { third: 3, seventh: 10, ninth: 14, thirteenth: 19 },
  minor6: { third: 3, seventh: 9, ninth: 14, thirteenth: 19 },
  minorb6: { third: 3, seventh: 8, ninth: 14, thirteenth: 20 },
  halfdim7: { third: 3, seventh: 10, ninth: 13, thirteenth: 18 },
  major7: { third: 4, seventh: 11, ninth: 14, thirteenth: 21 },
  major6: { third: 4, seventh: 9, ninth: 14, thirteenth: 21 },
  diminished7: { third: 3, seventh: 9, ninth: 12, thirteenth: 18 },
  minor: { third: 3, seventh: 10, ninth: 14, thirteenth: 19 },
};

export const COMP_CELLS = [
  [0, 1.5],
  [1.5],
  [0],
  [2.5],
  [3],
  [3.5],
  [0.5, 2],
  [],
  [1, 3],
  [0, 2.5],
];

/** Cry Me cell in trombone register — same pitches the app grades in G. */
export const TEST_PHRASE = [
  { midi: 57, startBeat: 0, beats: 1, bar: 1, number: 1, index: 0, spotIndex: 0 },
  { midi: 55, startBeat: 1, beats: 1 / 3, bar: 1, number: 2, index: 1, spotIndex: 0 },
  { midi: 50, startBeat: 1 + 1 / 3, beats: 1 / 3, bar: 1, number: 3, index: 2, spotIndex: 0 },
  { midi: 46, startBeat: 1 + 2 / 3, beats: 1 / 3, bar: 1, number: 4, index: 3, spotIndex: 0 },
  { midi: 45, startBeat: 2, beats: 0.5, bar: 1, number: 5, index: 4, spotIndex: 0 },
  { midi: 43, startBeat: 2.5, beats: 0.5, bar: 1, number: 6, index: 5, spotIndex: 0 },
];

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function formLengthBeats(chords) {
  return chords.reduce((max, chord) => Math.max(max, chord.startBeat + chord.durationBeats), 0);
}

export function fBluesChords(choruses = BLUES_CHORUSES) {
  const chords = [];
  for (let chorus = 0; chorus < choruses; chorus += 1) {
    F_BLUES_BARS.forEach((bar, index) => {
      chords.push({
        startBeat: (chorus * 12 + index) * BEATS_PER_BAR,
        durationBeats: BEATS_PER_BAR,
        concertRootPc: bar.root,
        quality: bar.quality,
        name: bar.name,
      });
    });
  }
  return chords;
}

export function stThomasChords() {
  return chorusChords(getKey("C"), "concert", "tune-st-thomas");
}

export function chordsForForm(formId) {
  return formId === "st-thomas" ? stThomasChords() : fBluesChords();
}

function placePc(pc, low, high, prefer = null) {
  const options = [];
  for (let midi = wrapPc(pc); midi <= high + 12; midi += 12) {
    if (midi >= low && midi <= high) options.push(midi);
  }
  if (!options.length) {
    let midi = wrapPc(pc);
    while (midi < low) midi += 12;
    while (midi > high) midi -= 12;
    return midi;
  }
  if (prefer == null) return options[0];
  return options.reduce((best, midi) => (Math.abs(midi - prefer) < Math.abs(best - prefer) ? midi : best));
}

export function rootlessVoicing(rootPc, quality, prevMidis = null) {
  const t = TENSIONS[quality] ?? TENSIONS.dominant7;
  const root = wrapPc(rootPc);
  const make = (spec) => spec.map((part) => placePc(root + t[part.degree], part.low, part.high, part.prefer)).sort((a, b) => a - b);
  const a = make([
    { degree: "third", low: 52, high: 64, prefer: prevMidis?.[0] },
    { degree: "thirteenth", low: 55, high: 69, prefer: prevMidis?.[1] },
    { degree: "seventh", low: 58, high: 72, prefer: prevMidis?.[2] },
    { degree: "ninth", low: 60, high: 76, prefer: prevMidis?.[3] },
  ]);
  const b = make([
    { degree: "seventh", low: 50, high: 62, prefer: prevMidis?.[0] },
    { degree: "ninth", low: 53, high: 66, prefer: prevMidis?.[1] },
    { degree: "third", low: 55, high: 70, prefer: prevMidis?.[2] },
    { degree: "thirteenth", low: 58, high: 74, prefer: prevMidis?.[3] },
  ]);
  if (!prevMidis) return a;
  const dist = (voicing) => voicing.reduce((sum, midi, i) => sum + Math.abs(midi - (prevMidis[i] ?? midi)), 0);
  return dist(a) <= dist(b) ? a : b;
}

export function voicingHasGuideTones(midis, rootPc, quality) {
  const t = TENSIONS[quality] ?? TENSIONS.dominant7;
  const pcs = new Set(midis.map((midi) => wrapPc(midi)));
  return pcs.has(wrapPc(rootPc + t.third)) && pcs.has(wrapPc(rootPc + t.seventh));
}

export function isSampledEngine(engine) {
  return SAMPLED_ENGINES.has(engine);
}

export function timingBeatsForMs(ms, tempo = DEFAULT_TEMPO) {
  return (ms / 1000) * (tempo / 60);
}

function assignmentCost(a, b) {
  const from = a.length <= b.length ? a : b;
  const to = a.length <= b.length ? b : a;
  let best = Infinity;
  const used = new Array(to.length).fill(false);
  const search = (i, acc) => {
    if (acc >= best) return;
    if (i === from.length) {
      best = acc;
      return;
    }
    for (let j = 0; j < to.length; j += 1) {
      if (used[j]) continue;
      used[j] = true;
      search(i + 1, acc + Math.abs(from[i] - to[j]));
      used[j] = false;
    }
  };
  search(0, 0);
  return best + Math.abs(a.length - b.length) * 3;
}

function shellCost(voicing, prevMidis) {
  if (!prevMidis) {
    const mid = (Math.min(...voicing) + Math.max(...voicing)) / 2;
    return Math.abs(mid - 60);
  }
  return assignmentCost(voicing, prevMidis);
}

/** 3–4 note rootless shells (3–7 plus 9 or 13) in C3–C5 with tight voice leading. */
export function rootlessShell(rootPc, quality, prevMidis = null) {
  const t = TENSIONS[quality] ?? TENSIONS.dominant7;
  const root = wrapPc(rootPc);
  const degreeSets = [
    ["third", "seventh", "ninth"],
    ["third", "seventh", "thirteenth"],
    ["third", "seventh", "ninth", "thirteenth"],
  ];
  const candidates = [];
  for (const rawDegrees of degreeSets) {
    const degrees = rawDegrees.filter((degree) => wrapPc(t[degree]) !== 0);
    if (!degrees.includes("third") || !degrees.includes("seventh") || degrees.length < 3) continue;
    const options = degrees.map((degree) => {
      const pc = wrapPc(root + t[degree]);
      const list = [];
      for (let midi = pc; midi <= SHELL_HIGH; midi += 12) {
        if (midi >= SHELL_LOW) list.push(midi);
      }
      return list;
    });
    const rec = (i, acc) => {
      if (i === options.length) {
        const voicing = [...acc].sort((a, b) => a - b);
        const span = voicing[voicing.length - 1] - voicing[0];
        if (span <= 16 && new Set(voicing).size === voicing.length) candidates.push(voicing);
        return;
      }
      for (const midi of options[i]) rec(i + 1, [...acc, midi]);
    };
    rec(0, []);
  }
  const unique = [];
  const seen = new Set();
  for (const voicing of candidates) {
    const key = voicing.join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(voicing);
  }
  unique.sort((a, b) => shellCost(a, prevMidis) - shellCost(b, prevMidis) || a.length - b.length);
  return unique[0] ?? rootlessVoicing(rootPc, quality, prevMidis).map((midi) => Math.min(SHELL_HIGH, Math.max(SHELL_LOW, midi)));
}

function inBassRange(midi, low, high, prev) {
  let note = midi;
  while (note < low) note += 12;
  while (note > high) note -= 12;
  if (prev == null) return note;
  const up = note < prev ? note + 12 : note;
  const down = note > prev ? note - 12 : note;
  const candidates = [note, up, down].filter((value) => value >= low && value <= high);
  return candidates.reduce((best, value) => (Math.abs(value - prev) < Math.abs(best - prev) ? value : best));
}

function approachNote(from, target) {
  if (from == null) return target;
  if (target === from) return target > 40 ? target - 2 : target + 2;
  return target > from ? target - 1 : target + 1;
}

export function walkingBassLine(chords, { low = 28, high = 50, seed = 1 } = {}) {
  const rng = mulberry32(seed);
  const notes = [];
  const length = formLengthBeats(chords);
  let prev = null;
  for (let beat = 0; beat < length; beat += 1) {
    const chord = chordAtBeat(chords, beat);
    const next = chordAtBeat(chords, beat + 1) ?? chord;
    const root = 36 + wrapPc(chord.concertRootPc);
    const fifth = root + 7;
    const third = root + (TENSIONS[chord.quality] ?? TENSIONS.dominant7).third;
    const lastOfChord = !next || next.startBeat !== chord.startBeat;
    const beatInBar = beat % BEATS_PER_BAR;
    let midi;
    if (beat === chord.startBeat || beatInBar === 0) {
      midi = inBassRange(root, low, high, prev);
    } else if (lastOfChord || beatInBar === 3) {
      const target = inBassRange(36 + wrapPc(next.concertRootPc), low, high, prev);
      midi = inBassRange(approachNote(prev ?? root, target), low, high, prev);
    } else {
      const choice = beatInBar === 1 ? fifth : rng() < 0.5 ? third : fifth;
      midi = inBassRange(choice, low, high, prev);
    }
    if (prev != null && midi === prev) midi = inBassRange(midi + (midi > 40 ? -2 : 2), low, high, prev);
    prev = midi;
    notes.push({
      type: "bass",
      beat,
      midi,
      durationBeats: 0.92,
      velocity: 0.7 + rng() * 0.14,
    });
  }
  return notes;
}

export function pianoComping(chords, { seed = 2 } = {}) {
  const rng = mulberry32(seed);
  const events = [];
  const length = formLengthBeats(chords);
  const bars = Math.round(length / BEATS_PER_BAR);
  let prev = null;
  for (let bar = 0; bar < bars; bar += 1) {
    const pattern = COMP_CELLS[Math.floor(rng() * COMP_CELLS.length)];
    for (const offset of pattern) {
      const beat = bar * BEATS_PER_BAR + offset;
      if (beat >= length) continue;
      const lookAhead = offset >= 3.5 ? beat + 0.55 : beat;
      const chord = chordAtBeat(chords, lookAhead) ?? chordAtBeat(chords, beat);
      const midis = rootlessVoicing(chord.concertRootPc, chord.quality, prev);
      prev = midis;
      events.push({
        type: "piano",
        beat,
        midis,
        durationBeats: offset === 0 ? 1.35 : offset === 1.5 ? 1.1 : 0.85,
        velocity: 0.42 + rng() * 0.22,
      });
    }
  }
  return events;
}

function sectionPatternNames(lengthBeats, rng) {
  const count = Math.max(1, Math.ceil(lengthBeats / SECTION_BEATS));
  const names = [];
  let current = rng() < 0.5 ? "charleston" : "twoAndFour";
  for (let section = 0; section < count; section += 1) {
    if (section > 0 && rng() < 0.22) current = current === "charleston" ? "twoAndFour" : "charleston";
    names.push(current);
  }
  return names;
}

function patternAtBeat(names, beat) {
  return names[Math.min(names.length - 1, Math.max(0, Math.floor(beat / SECTION_BEATS)))];
}

export function relativeCompOffsets(hits, chordStart) {
  return hits.map((event) => Number((event.beat - chordStart).toFixed(3))).sort((a, b) => a - b);
}

export function isCharlestonOffsets(offsets) {
  return offsets.length === 2 && offsets[0] === 0 && offsets[1] === 1.5;
}

export function isTwoAndFourOffsets(offsets) {
  return offsets.length === 2 && offsets[0] === 1 && offsets[1] === 3;
}

/**
 * Calmer piano: short chords get one held voicing; 4+ beat chords stay on one simple pattern per section.
 * Same velocity ballpark as the busy comp — simpler, not quieter.
 */
export function pianoCompingSimple(chords, { seed = 2 } = {}) {
  const rng = mulberry32(seed);
  const events = [];
  const names = sectionPatternNames(formLengthBeats(chords), rng);
  let prev = null;
  let lastWasAnticipation = false;
  const velocity = () => 0.5 + rng() * 0.1;

  for (const chord of chords) {
    const midis = rootlessShell(chord.concertRootPc, chord.quality, prev);
    prev = midis;

    if (chord.durationBeats >= 4) {
      lastWasAnticipation = false;
      for (let window = 0; window + 4 <= chord.durationBeats + 1e-9; window += 4) {
        const windowStart = chord.startBeat + window;
        const spec = SIMPLE_LONG_PATTERN[patternAtBeat(names, windowStart)];
        spec.offsets.forEach((offset, index) => {
          events.push({
            type: "piano",
            beat: windowStart + offset,
            chordStartBeat: chord.startBeat,
            midis,
            durationBeats: spec.durations[index],
            velocity: velocity(),
          });
        });
      }
      continue;
    }

    let beat = chord.startBeat;
    let anticipated = false;
    if (chord.durationBeats <= 2 && chord.startBeat >= 0.5 && !lastWasAnticipation && rng() < 0.18) {
      beat = chord.startBeat - 0.5;
      anticipated = true;
    }
    lastWasAnticipation = anticipated;
    events.push({
      type: "piano",
      beat,
      chordStartBeat: chord.startBeat,
      midis,
      durationBeats: anticipated ? chord.durationBeats + 0.45 : chord.durationBeats * 0.96,
      velocity: velocity(),
    });
  }
  return events;
}

export function drumPattern(lengthBeats, { brushes = false, seed = 3 } = {}) {
  const rng = mulberry32(seed);
  const events = [];
  const ride = brushes ? "brushRide" : "ride";
  const hat = brushes ? "hatClosed" : "hat";
  const snare = brushes ? "brushTap" : "snare";
  for (let beat = 0; beat < lengthBeats; beat += 1) {
    const beatInBar = beat % BEATS_PER_BAR;
    events.push({
      type: "drum",
      beat,
      drum: ride,
      durationBeats: 0.55,
      velocity: beatInBar === 0 ? 0.52 : 0.38 + rng() * 0.08,
    });
    if (beatInBar === 1 || beatInBar === 3) {
      events.push({
        type: "drum",
        beat: beat + 0.5,
        drum: ride,
        durationBeats: 0.28,
        velocity: 0.32 + rng() * 0.08,
      });
      events.push({
        type: "drum",
        beat,
        drum: hat,
        durationBeats: 0.18,
        velocity: 0.48 + rng() * 0.08,
      });
    }
    if (beatInBar === 0 || (beatInBar === 2 && rng() < 0.4)) {
      events.push({
        type: "drum",
        beat,
        drum: "kick",
        durationBeats: 0.2,
        velocity: 0.14 + rng() * 0.08,
      });
    }
    if (rng() < 0.11) {
      events.push({
        type: "drum",
        beat: beat + (rng() < 0.65 ? 0.5 : 0),
        drum: snare,
        durationBeats: 0.14,
        velocity: 0.2 + rng() * 0.12,
      });
    }
  }
  return events;
}

export function humanize(events, { seed = 4, timingBeats = HUMANIZE_TIMING_BEATS, velocityJitter = HUMANIZE_VELOCITY } = {}) {
  const rng = mulberry32(seed);
  return events.map((event) => ({
    ...event,
    beat: event.beat + (rng() - 0.5) * 2 * timingBeats,
    velocity: Math.min(1, Math.max(0.05, (event.velocity ?? 0.7) + (rng() - 0.5) * 2 * velocityJitter)),
  }));
}

function sortEvents(events) {
  return events.sort((a, b) => a.beat - b.beat || String(a.type).localeCompare(String(b.type)));
}

export function scheduleCurrent(chords) {
  const events = [];
  const lengthBeats = formLengthBeats(chords);
  for (const chord of chords) {
    events.push({
      type: "chord",
      beat: chord.startBeat,
      midis: voicingMidi(chord.concertRootPc, chord.quality),
      durationBeats: chord.durationBeats,
      name: chord.name,
    });
  }
  for (let beat = 0; beat < lengthBeats; beat += 1) {
    const active = chordAtBeat(chords, beat);
    const next = chordAtBeat(chords, beat + 1) ?? active;
    events.push({
      type: "bass",
      beat,
      midi: walkingBassMidi(active.concertRootPc, active.quality, beat - active.startBeat, next.concertRootPc),
      durationBeats: 1,
      velocity: 0.8,
    });
  }
  events.push({ type: "end", beat: lengthBeats });
  return { events: sortEvents(events), lengthBeats, chords };
}

export function scheduleNew(chords, { brushes = false, seed = 7 } = {}) {
  const lengthBeats = formLengthBeats(chords);
  const events = humanize(
    [...pianoComping(chords, { seed }), ...walkingBassLine(chords, { seed: seed + 1 }), ...drumPattern(lengthBeats, { brushes, seed: seed + 2 })],
    { seed: seed + 3 },
  );
  events.push({ type: "end", beat: lengthBeats });
  return { events: sortEvents(events), lengthBeats, chords };
}

export function scheduleNewSimple(chords, { brushes = false, seed = 7, tempo = DEFAULT_TEMPO } = {}) {
  const lengthBeats = formLengthBeats(chords);
  const piano = humanize(pianoCompingSimple(chords, { seed }), {
    seed: seed + 3,
    timingBeats: timingBeatsForMs(SIMPLE_HUMANIZE_MS, tempo),
    velocityJitter: SIMPLE_HUMANIZE_VELOCITY,
  });
  const rest = humanize(
    [...walkingBassLine(chords, { seed: seed + 1 }), ...drumPattern(lengthBeats, { brushes, seed: seed + 2 })],
    { seed: seed + 3 },
  );
  const events = [...piano, ...rest];
  events.push({ type: "end", beat: lengthBeats });
  return { events: sortEvents(events), lengthBeats, chords };
}

export function melodyEventsFromPhrase(phrase = TEST_PHRASE) {
  return phrase.map((note) => ({
    type: "melody",
    beat: note.startBeat,
    midi: note.midi,
    durationBeats: note.beats,
    velocity: 0.85,
  }));
}

export function backingFor(engine, formId, { brushes = false, tempo = DEFAULT_TEMPO } = {}) {
  const chords = chordsForForm(formId);
  if (engine === "new-simple") return scheduleNewSimple(chords, { brushes, tempo });
  if (engine === "new") return scheduleNew(chords, { brushes });
  return scheduleCurrent(chords);
}

export function clipArrangement(arranged, lengthBeats) {
  const events = arranged.events
    .filter((event) => event.type === "end" || event.beat < lengthBeats)
    .map((event) => (event.type === "end" ? { ...event, beat: lengthBeats } : event));
  if (!events.some((event) => event.type === "end")) events.push({ type: "end", beat: lengthBeats });
  return { ...arranged, events, lengthBeats };
}

export function withMelody(arranged, phrase = TEST_PHRASE) {
  return {
    ...arranged,
    events: [...arranged.events.filter((event) => event.type !== "end"), ...melodyEventsFromPhrase(phrase), { type: "end", beat: arranged.lengthBeats }],
  };
}
