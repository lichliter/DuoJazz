import test from "node:test";
import assert from "node:assert/strict";
import { getKey, restBeatsForSpan, phraseMeasureCount } from "./music.js";
import {
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
  assert.match(bass, /pname="a" oct="3"/);
  assert.match(treble, /pname="a" oct="3"/);
  assert.match(written, /keysig="0"/);
  assert.match(written, /pname="b" oct="3"/);
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
  assert.match(mei, /pname="a" oct="3"/);
  const slashes = slashMEI(getKey("G"), "concert", "minor-home", "bass");
  assert.match(slashes, /head\.shape="slash"/);
  assert.match(slashes, /type="slash"/);
  assert.match(slashes, /loc="0"/);
  assert.doesNotMatch(slashes, /pname="a" oct="3"/);
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
    { app: "gts-learn", keysig: { C: "0", G: "1s", Bb: "2f", "F#": "6s", Eb: "3f" } },
    { app: "bo-learn", keysig: { C: "0", G: "1s", Bb: "2f", "F#": "6s", Eb: "3f" } },
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

test("long cue labels wrap at a word instead of overflowing the next bar", () => {
  assert.equal(wrapCueLines("HERE"), "HERE");
  assert.equal(wrapCueLines("Get ready"), "Get ready");
  assert.equal(wrapCueLines("Guide tone sequence"), "Guide tone<lb/>sequence");
  const st = landingMEI(getKey("C"), "concert", "tune-st-thomas", "bass", 0, { showCues: true });
  assert.match(st, /Guide tone<lb\/>sequence/);
  assert.doesNotMatch(st, /Get ready<lb\/>/);
});
