import test from "node:test";
import assert from "node:assert/strict";
import { INSTRUMENTS } from "./instruments.js";
import { LESSONS } from "./registry.js";
import {
  BEATS_PER_BAR,
  concertMidiToWritten,
  eventMelodyMidi,
  formForApplication,
  getKey,
  KEYS,
  learnBeatsFor,
  modelSolo,
  octaveForApplication,
  phraseMeasureCount,
  phraseTimeline,
  restBeatsForSpan,
  spellShownMidi,
  withSpotOctaves,
} from "./music.js";
import {
  chordsOnlyMEI,
  chorusStaffMEI,
  countMeasures,
  countSystemBreaks,
  landingMEI,
  meiBeamGroupsCrossBeat3,
  meiHasBowing,
  modelMEI,
  phraseMEI,
  slashMEI,
  wrapCueLines,
} from "./mei.js";

function stripTags(xml) {
  return String(xml).replace(/<[^>]+>/g, "");
}

function harms(mei) {
  return [...String(mei).matchAll(/<harm\b[^>]*>([\s\S]*?)<\/harm>/g)].map((m) => stripTags(m[1]));
}

function harmAttrs(mei) {
  return [...String(mei).matchAll(/<harm\b([^>]*)>([\s\S]*?)<\/harm>/g)].map((m) => ({
    attrs: m[1],
    text: stripTags(m[2]),
  }));
}

function dirs(mei) {
  return [...String(mei).matchAll(/<dir\b[^>]*>([\s\S]*?)<\/dir>/g)].map((m) => stripTags(m[1]));
}

function keysig(mei) {
  return String(mei).match(/keysig="([^"]+)"/)?.[1];
}

function clefShape(mei) {
  return String(mei).match(/clef\.shape="([^"]+)"/)?.[1];
}

test("phrase MEI is bass clef with the Learn chord and the cell pitches", () => {
  const mei = phraseMEI(getKey("G"), "concert", "minor-home");
  assert.equal(clefShape(mei), "F");
  assert.equal(keysig(mei), "2f");
  assert.ok(harms(mei).includes("Gm6"));
  assert.match(mei, /pname="a" oct="3"/);
  assert.match(mei, /<tuplet num="3" numbase="2"/);
  assert.equal(meiHasBowing(mei), false);
});

test("clef and B-flat names do not change concert spelling in MEI", () => {
  const bass = phraseMEI(getKey("G"), "concert", "minor-home", "bass");
  const treble = phraseMEI(getKey("G"), "concert", "minor-home", "treble");
  const written = phraseMEI(getKey("G"), "bb-written", "minor-home", "bass");
  assert.equal(clefShape(bass), "F");
  assert.equal(clefShape(treble), "G");
  assert.match(bass, /pname="a" oct="4"/);
  assert.match(treble, /pname="a" oct="4"/);
  assert.match(written, /keysig="0"/);
  assert.match(written, /pname="b" oct="4"/);
});

test("a two-chord bar places the second harm on beat 3", () => {
  const gts = phraseMEI(getKey("G"), "concert", "gts-learn");
  const gtsHarms = harmAttrs(gts);
  assert.ok(gtsHarms.some((harm) => harm.text === "Bm7" && /tstamp="1"/.test(harm.attrs)));
  assert.ok(gtsHarms.some((harm) => harm.text === "E7" && /tstamp="3"/.test(harm.attrs)));
  const st = landingMEI(getKey("C"), "concert", "tune-st-thomas", "bass", 0, { showCues: true });
  assert.ok(harms(st).includes("Cmaj7"));
  assert.ok(harms(st).includes("F7"));
  assert.ok(harms(st).includes("C7/E"));
  assert.match(st, /<rend fontfam="sans-serif"/);
  assert.match(st, /<space dur="4"\/>/);
});

test("empty bars are a single mRest; partial bars never hide beat 3", () => {
  assert.deepEqual(restBeatsForSpan(0, 4), [4]);
  assert.deepEqual(restBeatsForSpan(0, 3), [2, 1]);
  const integrate = modelMEI(getKey("C"), "concert", "cmar-blue-bossa");
  assert.match(integrate, /<mRest\/>/);
  assert.doesNotMatch(integrate, /<rest dur="2"\/>\s*<rest dur="2"\/>/);
  const landing = landingMEI(getKey("C"), "concert", "cmar-blue-bossa");
  assert.match(landing, /head\.shape="slash"/);
  assert.doesNotMatch(landing, /<mRest\/>/);
});

test("landing MEI keeps lick notes and slashes empty bars", () => {
  const mei = landingMEI(getKey("G"), "concert", "minor-home", "bass", 0, { showCues: true });
  assert.ok(harms(mei).includes("Cm7"));
  assert.match(mei, /head\.shape="slash"/);
  assert.ok(dirs(mei).includes("HERE"));
  assert.ok(dirs(mei).includes("Get ready"));
  assert.match(mei, /pname="a" oct="4"/);
  const slashes = slashMEI(getKey("G"), "concert", "minor-home", "bass");
  assert.match(slashes, /head\.shape="slash"/);
  assert.match(slashes, /type="slash"/);
  assert.match(slashes, /loc="0"/);
  assert.doesNotMatch(slashes, /pname="a" oct="4"/);
  assert.doesNotMatch(slashes, /Get ready|HERE/);
});

test("encoded system breaks are every four bars on tunes and none on short licks", () => {
  const gts = phraseMEI(getKey("Bb"), "concert", "gts-learn");
  assert.equal(phraseMeasureCount("gts-learn"), 3);
  assert.equal(countSystemBreaks(gts), 0);
  assert.equal(countMeasures(gts), 3);
  const bo = phraseMEI(getKey("G"), "concert", "bo-learn");
  assert.equal(phraseMeasureCount("bo-learn"), 5);
  assert.equal(countSystemBreaks(bo), 0);
  const four = modelMEI(getKey("G"), "concert", "minor-home", "bass", 0, { showCues: true, barsPerLine: 4 });
  assert.equal(countSystemBreaks(four), 1);
  const two = modelMEI(getKey("G"), "concert", "minor-home", "bass", 0, { showCues: true, barsPerLine: 2 });
  assert.equal(countSystemBreaks(two), 3);
});

test("MEI beams eighths inside a half-bar and never a u/v bowing artic", () => {
  const samples = [
    phraseMEI(getKey("G"), "concert", "minor-home"),
    phraseMEI(getKey("Bb"), "concert", "gts-learn"),
    phraseMEI(getKey("G"), "concert", "bo-learn"),
    landingMEI(getKey("C"), "concert", "tune-st-thomas", "bass", 0, { showCues: true }),
    landingMEI(getKey("F"), "concert", "bo-billies", "bass", 0, { showCues: true }),
    slashMEI(getKey("F"), "concert", "bo-billies", "bass", { showCues: true }),
  ];
  for (const mei of samples) {
    assert.equal(meiHasBowing(mei), false);
    assert.equal(meiBeamGroupsCrossBeat3(mei), false);
  }
  assert.match(phraseMEI(getKey("G"), "concert", "gts-learn"), /<beam>/);
});

test("Learn MEI spells against the key signature in C, G, B♭, F♯, and E♭", () => {
  const samples = [
    { app: "cmar-learn", keysig: { C: "3f", G: "2f", Bb: "5f", "F#": "3s", Eb: "6f" } },
    { app: "gts-learn", keysig: { C: "0", G: "1s", Bb: "2f", "F#": "6f", Eb: "3f" } },
    { app: "bo-learn", keysig: { C: "0", G: "1s", Bb: "2f", "F#": "6f", Eb: "3f" } },
  ];
  for (const sample of samples) {
    for (const [keyId, sig] of Object.entries(sample.keysig)) {
      const mei = phraseMEI(getKey(keyId), "concert", sample.app);
      assert.equal(keysig(mei), sig, `${sample.app} ${keyId}`);
      assert.equal(clefShape(mei), "F");
    }
  }
  const gtsG = phraseMEI(getKey("G"), "concert", "gts-learn");
  assert.match(gtsG, /accid="n"/);
});

test("chorusStaffMEI routes slash, landing, and model the same way as ABC", () => {
  const landing = chorusStaffMEI({
    concertKey: getKey("G"),
    displayMode: "concert",
    applicationId: "altered-dominant",
    mode: "landing",
    showCues: true,
  });
  assert.ok(dirs(landing).includes("HERE"));
  assert.match(landing, /head\.shape="slash"/);
  const model = chorusStaffMEI({
    concertKey: getKey("F"),
    displayMode: "concert",
    applicationId: "bo-billies",
    mode: "model",
    showCues: true,
  });
  assert.ok(harms(model).some((name) => name.includes("F")));
});

test("staccato and tenuto encode as artic, never bowing", () => {
  const mei = phraseMEI(getKey("C"), "concert", "emr-learn");
  assert.doesNotMatch(mei, /upbow|dnbow|bowing/);
  if (mei.includes("artic=")) {
    assert.match(mei, /artic="(?:stacc|ten)"/);
  }
});

test("flat and sharp chord names encode without spaces so Verovio will not figbass-split them", () => {
  const gts = phraseMEI(getKey("Bb"), "concert", "gts-learn");
  assert.ok(harms(gts).includes("Bbmaj7"));
  assert.match(gts, /<rend fontfam="sans-serif"[^>]*>Bbmaj7<\/rend>/);
  assert.doesNotMatch(gts, /B♭\s+maj7|Bb\s+maj7/);
  const billies = landingMEI(getKey("F"), "concert", "bo-billies");
  assert.ok(harms(billies).some((name) => /Bb|B♭|o7|°/.test(name)));
  assert.doesNotMatch(billies, /[A-G][b#]?\s+(maj7|o7|b9|b5)/);
});

test("chords-only MEI keeps barlines and chord symbols without lick notes", () => {
  const mei = chordsOnlyMEI(getKey("G"), "concert", "minor-home", "bass", { isolated: true });
  assert.ok(harms(mei).includes("Gm6"));
  assert.equal(countMeasures(mei), 2);
  assert.match(mei, /<space /);
  assert.doesNotMatch(mei, /pname="a" oct="3"/);
  assert.doesNotMatch(mei, /head\.shape="slash"/);
});

test("Donna Lee Resolution MEI spells G7♭9 alterations as A♭ and B♭", () => {
  const mei = phraseMEI(getKey("C"), "concert", "dlr-learn");
  assert.match(mei, /pname="a"[^>]*accid="f"/);
  assert.match(mei, /pname="b"[^>]*accid="f"/);
  assert.doesNotMatch(mei, /pname="g"[^>]*accid="s"/);
  assert.doesNotMatch(mei, /pname="a"[^>]*accid="s"/);
});

const NATURAL = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const ACCID = { n: 0, s: 1, f: -1, ss: 2, ff: -2 };

function signatureAccidentals(mei) {
  const raw = String(mei).match(/keysig="([^"]+)"/)?.[1] ?? "0";
  const map = { c: 0, d: 0, e: 0, f: 0, g: 0, a: 0, b: 0 };
  const match = raw.match(/^(\d+)([sf])$/);
  if (!match) return map;
  const count = Number(match[1]);
  const sharp = match[2] === "s";
  const order = sharp
    ? ["f", "c", "g", "d", "a", "e", "b"]
    : ["b", "e", "a", "d", "g", "c", "f"];
  for (let i = 0; i < count && i < order.length; i += 1) map[order[i]] = sharp ? 1 : -1;
  return map;
}

/** Sounding MIDI of each engraved note, using the key signature when accid is omitted. */
function engravedMidis(mei) {
  const sig = signatureAccidentals(mei);
  const midis = [];
  for (const measure of String(mei).matchAll(/<measure\b[^>]*>([\s\S]*?)<\/measure>/g)) {
    const state = { ...sig };
    for (const note of measure[1].matchAll(/<note\b([^>]*)>/g)) {
      const attrs = note[1];
      if (/\btype="slash"/.test(attrs)) continue;
      const pname = attrs.match(/\bpname="([a-g])"/)?.[1];
      const oct = attrs.match(/\boct="(-?\d+)"/)?.[1];
      if (!pname || oct == null) continue;
      const accid = attrs.match(/\baccid="(ss|ff|s|f|n)"/)?.[1];
      const acc = accid != null ? ACCID[accid] : state[pname];
      if (accid != null) state[pname] = acc;
      midis.push((Number(oct) + 1) * 12 + NATURAL[pname] + acc);
    }
  }
  return midis;
}

function expectedEngravedMidis({ concertKey, displayMode, applicationId, mode }) {
  const isolated = mode === "phrase";
  const barCount = isolated
    ? Math.max(1, Math.ceil(learnBeatsFor(applicationId) / BEATS_PER_BAR))
    : formForApplication(applicationId).bars.length;
  const octaveBase = octaveForApplication(applicationId, concertKey.pc, displayMode);
  const source = mode === "model"
    ? modelSolo(applicationId).map((note) => ({ ...note, type: "note" }))
    : phraseTimeline(applicationId, isolated);
  const items = withSpotOctaves(source, applicationId, concertKey.pc, displayMode);
  const midis = [];
  const pushOverlap = (start, end) => {
    const covering = items
      .filter((item) => item.type === "note" && item.beat < end - 1e-6 && item.beat + item.beats > start + 1e-6)
      .sort((a, b) => a.beat - b.beat);
    for (const item of covering) {
      const concertMidi = eventMelodyMidi(concertKey, item, 0, octaveBase);
      midis.push(concertMidiToWritten(concertMidi, displayMode));
    }
  };
  const pickup = items.filter((item) => item.type === "note" && item.beat < -1e-6);
  if (pickup.length) pushOverlap(pickup[0].beat, 0);
  for (let bar = 0; bar < barCount; bar += 1) {
    const barStart = bar * BEATS_PER_BAR;
    const barEnd = isolated
      ? Math.min(learnBeatsFor(applicationId), barStart + BEATS_PER_BAR)
      : barStart + BEATS_PER_BAR;
    pushOverlap(barStart, barEnd);
  }
  return midis;
}

function meiForMode(mode, concertKey, instrument, applicationId) {
  const clef = instrument.clef;
  if (mode === "phrase") return phraseMEI(concertKey, instrument.id, applicationId, clef);
  if (mode === "landing") return landingMEI(concertKey, instrument.id, applicationId, clef);
  return modelMEI(concertKey, instrument.id, applicationId, clef);
}

test("midi 59 spelled C-flat is octave 4 and midi 60 spelled B-sharp is octave 3", () => {
  const ab = spellShownMidi(59, { pc: 8, usesFlats: true, sigCount: -7 });
  assert.equal(ab.name, "C♭");
  assert.equal(ab.octave, 4);
  const sevenSharps = spellShownMidi(60, { pc: 1, usesFlats: false, sigCount: 7 });
  assert.equal(sevenSharps.name, "B♯");
  assert.equal(sevenSharps.octave, 3);
  const mei = phraseMEI(getKey("Ab"), "trombone", "minor-home", "bass");
  assert.match(mei, /pname="c" oct="4"/);
  assert.doesNotMatch(mei, /pname="c" oct="3"/);
});

test("Cry Me a River Lesson 1 in A-flat minor descends in trombone and treble", () => {
  const lesson = LESSONS.find((item) => item.id === "learn-lick");
  const expected = [70, 68, 63, 59, 58, 56];
  const trombone = INSTRUMENTS.find((item) => item.id === "trombone");
  const piano = INSTRUMENTS.find((item) => item.id === "piano");
  for (const instrument of [trombone, piano]) {
    const mei = phraseMEI(getKey("Ab"), instrument.id, lesson.applicationId, instrument.clef);
    assert.equal(clefShape(mei), instrument.clef === "bass" ? "F" : "G", instrument.id);
    const midis = engravedMidis(mei);
    assert.deepEqual(midis, expected, instrument.id);
    assert.ok(midis.every((midi, index) => index === 0 || midi < midis[index - 1]), instrument.id);
  }
});

test("engraved spelling round-trips to the shown MIDI in every key, instrument, and lesson", () => {
  const modes = ["phrase", "landing", "model"];
  for (const lesson of LESSONS) {
    for (const key of KEYS) {
      for (const instrument of INSTRUMENTS) {
        for (const mode of modes) {
          const mei = meiForMode(mode, key, instrument, lesson.applicationId);
          const got = engravedMidis(mei);
          const expected = expectedEngravedMidis({
            concertKey: key,
            displayMode: instrument.id,
            applicationId: lesson.applicationId,
            mode,
          });
          const index = got.findIndex((midi, note) => midi !== expected[note]);
          assert.equal(
            got.length,
            expected.length,
            `${lesson.id} ${key.id} ${instrument.id} ${mode} count ${got.length} != ${expected.length}`,
          );
          assert.equal(
            index,
            -1,
            `${lesson.id} ${key.id} ${instrument.id} ${mode} note ${index}: ${got[index]} != ${expected[index]}`,
          );
        }
      }
    }
  }
});

test("long cue labels wrap at a word instead of overflowing the next bar", () => {
  assert.equal(wrapCueLines("HERE"), "HERE");
  assert.equal(wrapCueLines("Get ready"), "Get ready");
  assert.equal(wrapCueLines("Guide tone sequence"), "Guide tone<lb/>sequence");
  const st = landingMEI(getKey("C"), "concert", "tune-st-thomas", "bass", 0, { showCues: true });
  assert.match(st, /Guide tone<lb\/>sequence/);
  assert.doesNotMatch(st, /Get ready<lb\/>/);
});
