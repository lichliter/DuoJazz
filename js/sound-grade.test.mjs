import test from "node:test";
import assert from "node:assert/strict";
import { gradePerformance } from "./grade.js";
import { beatsToSeconds } from "./music.js";
import { TEST_PHRASE, fBluesChords, scheduleCurrent, scheduleNew, scheduleNewSimple } from "./sound-band.js";
import { addNoiseBurst, addTone, collectPitchTrack, hzFromMidi } from "./sound-yin.js";

const SAMPLE_RATE = 22050;
const TEMPO = 140;

function secondsFor(beat) {
  return beatsToSeconds(beat, TEMPO, true);
}

function renderPhrase(pcm, amp) {
  for (const note of TEST_PHRASE) {
    addTone(pcm, SAMPLE_RATE, {
      midi: note.midi,
      start: secondsFor(note.startBeat),
      duration: Math.max(0.12, secondsFor(note.startBeat + note.beats) - secondsFor(note.startBeat)),
      amp,
      harmonics: [1, 2, 3],
    });
  }
}

function renderCurrentBacking(pcm, gain) {
  const { events } = scheduleCurrent(fBluesChords(1));
  for (const event of events) {
    if (event.beat >= 8) continue;
    if (event.type === "chord") {
      for (const midi of event.midis) {
        addTone(pcm, SAMPLE_RATE, {
          midi,
          start: secondsFor(event.beat),
          duration: secondsFor(event.durationBeats),
          amp: 0.045 * gain,
          harmonics: [1],
        });
      }
    }
    if (event.type === "bass") {
      addTone(pcm, SAMPLE_RATE, {
        midi: event.midi,
        start: secondsFor(event.beat),
        duration: 0.35,
        amp: 0.12 * gain,
        harmonics: [1, 2],
      });
    }
  }
}

function renderSampledBacking(pcm, gain, events) {
  for (const event of events) {
    if (event.beat >= 8 || event.beat < 0) continue;
    if (event.type === "piano") {
      for (const midi of event.midis) {
        addTone(pcm, SAMPLE_RATE, {
          midi,
          start: secondsFor(event.beat),
          duration: 0.4,
          amp: 0.05 * gain * (event.velocity ?? 0.5),
          harmonics: [1, 2, 3, 4],
        });
      }
    }
    if (event.type === "bass") {
      addTone(pcm, SAMPLE_RATE, {
        midi: event.midi,
        start: secondsFor(event.beat),
        duration: 0.32,
        amp: 0.1 * gain * (event.velocity ?? 0.7),
        harmonics: [1, 2],
      });
    }
    if (event.type === "drum") {
      addNoiseBurst(pcm, SAMPLE_RATE, {
        start: secondsFor(event.beat),
        duration: event.drum === "kick" ? 0.08 : 0.04,
        amp: 0.03 * gain * (event.velocity ?? 0.4),
        highpass: event.drum !== "kick",
      });
    }
  }
}

function score(pcm) {
  const observations = collectPitchTrack(pcm, SAMPLE_RATE, TEMPO);
  return gradePerformance({ expected: TEST_PHRASE, observations, tempo: TEMPO });
}

test("test phrase alone still grades as a pass", () => {
  const pcm = new Float32Array(SAMPLE_RATE * 5);
  renderPhrase(pcm, 0.28);
  const result = score(pcm);
  assert.equal(result.passed, true);
  assert.ok(result.percent >= 80);
});

test("New backing through a speaker-like mix grades as well as Current", () => {
  const currentPcm = new Float32Array(SAMPLE_RATE * 5);
  const newPcm = new Float32Array(SAMPLE_RATE * 5);
  renderPhrase(currentPcm, 0.28);
  renderPhrase(newPcm, 0.28);
  // Speaker leak: backing well below the horn, not headphones-silent.
  renderCurrentBacking(currentPcm, 0.55);
  renderSampledBacking(newPcm, 0.55, scheduleNew(fBluesChords(1), { seed: 7 }).events);
  const current = score(currentPcm);
  const next = score(newPcm);
  assert.equal(current.passed, true, `Current ${current.percent}% ${current.correction}`);
  assert.equal(next.passed, true, `New ${next.percent}% ${next.correction}`);
  assert.ok(next.percent >= current.percent - 15, `New ${next.percent}% vs Current ${current.percent}%`);
  assert.ok(Math.abs(hzFromMidi(57) - 220) < 1);
});

test("New-simple backing through a speaker-like mix grades as well as Current", () => {
  const currentPcm = new Float32Array(SAMPLE_RATE * 5);
  const simplePcm = new Float32Array(SAMPLE_RATE * 5);
  renderPhrase(currentPcm, 0.28);
  renderPhrase(simplePcm, 0.28);
  renderCurrentBacking(currentPcm, 0.55);
  renderSampledBacking(simplePcm, 0.55, scheduleNewSimple(fBluesChords(1), { seed: 7, tempo: TEMPO }).events);
  const current = score(currentPcm);
  const simple = score(simplePcm);
  assert.equal(current.passed, true, `Current ${current.percent}% ${current.correction}`);
  assert.equal(simple.passed, true, `New-simple ${simple.percent}% ${simple.correction}`);
  assert.ok(simple.percent >= current.percent - 15, `New-simple ${simple.percent}% vs Current ${current.percent}%`);
});
