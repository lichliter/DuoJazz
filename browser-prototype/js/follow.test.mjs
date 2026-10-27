import test from "node:test";
import assert from "node:assert/strict";
import { hzFromMidi } from "./grade.js";
import { displayKey, getKey } from "./music.js";
import {
  FOLLOW_CENTS,
  NO_SOUND_MS,
  SILENCE_MS,
  SUSTAIN_MS,
  VOICED_MAX_HZ,
  VOICED_MIN_HZ,
  createFollower,
  debugTextForKey,
  describeAttempt,
  matchPitch,
  runFollower,
  stepFollower,
  tickFollower,
} from "./follow.js";

function tone(midi, start, dur = 120, { cents = 0, amp = 0.25, step = 20 } = {}) {
  const hz = hzFromMidi(midi) * 2 ** (cents / 1200);
  const frames = [];
  for (let t = start; t <= start + dur; t += step) frames.push({ t, hz, amp });
  return frames;
}

function play(expected, frames) {
  return runFollower(expected, frames, 0);
}

test("notes in order pass once each has been held", () => {
  const state = play([60, 64, 67], [
    ...tone(60, 0),
    ...tone(64, 220),
    ...tone(67, 440),
  ]);
  assert.equal(state.passed, true);
  assert.equal(state.reason, "matched");
  assert.equal(state.hint, null);
  assert.equal(state.heard.length, 3);
  assert.ok(SUSTAIN_MS >= 80);
  assert.equal(FOLLOW_CENTS, 50);
});

test("extra wrong notes do not fail or steal the next pitch", () => {
  const state = play([60, 64], [
    ...tone(70, 0, 100),
    ...tone(60, 200),
    ...tone(63, 400, 80),
    ...tone(64, 560),
  ]);
  assert.equal(state.passed, true);
  assert.equal(state.heard.length, 2);
});

test("an octave shift still matches", () => {
  const state = play([60, 64], [
    ...tone(72, 0),
    ...tone(76, 220),
  ]);
  assert.equal(state.passed, true);
  assert.equal(state.heard[0].midi, 72);
  assert.ok(Math.abs(state.heard[0].cents) < 5);
});

test("60 cents flat does not match", () => {
  assert.equal(matchPitch(hzFromMidi(60) * 2 ** (-60 / 1200), 60), null);
  const state = play([60, 64, 67], [
    ...tone(60, 0),
    ...tone(64, 220),
    ...tone(67, 440, 160, { cents: -60 }),
  ]);
  assert.equal(state.passed, false);
  assert.equal(state.ended, false);
  const ended = tickFollower(state, state.lastVoicedT + SILENCE_MS);
  assert.equal(ended.ended, true);
  assert.equal(ended.passed, false);
  assert.equal(ended.hint, "3rd note");
  const shown = displayKey(getKey("G"), "concert", "minor");
  const described = describeAttempt(ended, shown);
  assert.match(described.text, /Expected/);
  assert.equal(described.heard[2], "G♭4 +40¢");
  assert.doesNotMatch(described.heard[2], /−60¢/);
});

test("49 cents flat still matches", () => {
  const state = play([60], [...tone(60, 0, 120, { cents: -49 })]);
  assert.equal(state.passed, true);
  assert.ok(Math.abs(state.heard[0].cents) <= FOLLOW_CENTS);
});

test("a missing note fails on that note and does not skip ahead", () => {
  let state = play([60, 64, 67], [
    ...tone(60, 0),
    ...tone(67, 220),
  ]);
  assert.equal(state.passed, false);
  state = tickFollower(state, state.lastVoicedT + SILENCE_MS);
  assert.equal(state.ended, true);
  assert.equal(state.hint, "2nd note");
  assert.equal(state.heard.length, 1);
});

test("a repeated note needs a new attack, not one long tone", () => {
  const held = play([60, 60], [...tone(60, 0, 500)]);
  assert.equal(held.passed, false);
  assert.equal(held.heard.length, 1);
  const ended = tickFollower(held, held.lastVoicedT + SILENCE_MS);
  assert.equal(ended.hint, "2nd note");

  const gap = play([60, 60], [
    ...tone(60, 0, 120),
    ...tone(60, 260, 160),
  ]);
  assert.equal(gap.passed, true);
  assert.equal(gap.heard.length, 2);
});

test("an amplitude dip re-arms a repeated note", () => {
  const frames = [
    ...tone(60, 0, 80, { amp: 0.3 }),
    ...tone(60, 100, 40, { amp: 0.05 }),
    ...tone(60, 160, 160, { amp: 0.3 }),
  ];
  const state = play([60, 60], frames);
  assert.equal(state.passed, true);
  assert.equal(state.heard.length, 2);
});

test("octave-equivalent repeats still need a re-attack", () => {
  const held = play([60, 72], [...tone(60, 0, 400)]);
  assert.equal(held.heard.length, 1);
  assert.equal(held.passed, false);
  const split = play([60, 72], [
    ...tone(60, 0, 120),
    ...tone(72, 280, 160),
  ]);
  assert.equal(split.passed, true);
});

test("silence ends the attempt one second after sound, and never before", () => {
  let state = play([60, 64], [...tone(60, 0, 100)]);
  state = tickFollower(state, state.lastVoicedT + SILENCE_MS - 1);
  assert.equal(state.ended, false);
  state = tickFollower(state, state.lastVoicedT + SILENCE_MS);
  assert.equal(state.ended, true);
  assert.equal(state.reason, "silence");
  assert.equal(state.passed, false);
});

test("eight seconds of no sound ends the attempt", () => {
  let state = createFollower([60, 64], 0);
  state = tickFollower(state, NO_SOUND_MS - 1);
  assert.equal(state.ended, false);
  state = tickFollower(state, NO_SOUND_MS);
  assert.equal(state.ended, true);
  assert.equal(state.reason, "timeout");
  assert.equal(state.hint, "1st note");
  assert.equal(state.passed, false);
});

test("a quiet second before the first note does not end the attempt", () => {
  let state = createFollower([60], 0);
  state = tickFollower(state, SILENCE_MS);
  assert.equal(state.ended, false);
  for (const frame of tone(60, SILENCE_MS + 20)) state = stepFollower(state, frame);
  assert.equal(state.passed, true);
});

test("diagnostics name the expected notes and the cents that were heard", () => {
  const state = play([60], [...tone(60, 0, 120, { cents: -12 })]);
  const shown = displayKey(getKey("G"), "concert", "minor");
  const described = describeAttempt(state, shown);
  assert.equal(described.expected[0].includes("C"), true);
  assert.match(described.heard[0], /−12¢/);
  assert.match(described.text, /Expected/);
});

test("pitches outside 40–2000 Hz are unvoiced and do not keep an attempt alive", () => {
  assert.equal(VOICED_MIN_HZ, 40);
  assert.equal(VOICED_MAX_HZ, 2000);
  let quiet = createFollower([60], 0);
  for (const hz of [0, 20, 40, 2000, 2500]) {
    quiet = stepFollower(quiet, { t: 400, hz, amp: 0.5 });
  }
  assert.equal(quiet.started, false);
  assert.equal(quiet.lastVoicedT, null);
  assert.equal(quiet.ended, false);

  const frames = [
    ...tone(60, 0, 60),
    { t: 80, hz: 20, amp: 0.5 },
    { t: 90, hz: 2400, amp: 0.5 },
    ...tone(60, 100, 40),
  ];
  assert.equal(play([60], frames).passed, true);

  let noisy = play([60, 64], [...tone(60, 0, 60)]);
  const voicedAt = noisy.lastVoicedT;
  noisy = stepFollower(noisy, { t: voicedAt + 500, hz: 15, amp: 0.8 });
  assert.equal(noisy.started, true);
  assert.equal(noisy.lastVoicedT, voicedAt);
  assert.equal(noisy.ended, false);
  noisy = stepFollower(noisy, { t: voicedAt + SILENCE_MS, hz: 3000, amp: 0.8 });
  assert.equal(noisy.lastVoicedT, voicedAt);
  assert.equal(noisy.ended, true);
  assert.equal(noisy.reason, "silence");
});

test("an unmatched note shows the heard pitch, not the target with a large cent error", () => {
  const hz = hzFromMidi(73) * 2 ** (1 / 1200);
  const frames = [];
  for (let t = 0; t <= 160; t += 20) frames.push({ t, hz, amp: 0.3 });
  const state = play([74], frames);
  const shown = displayKey(getKey("D"), "concert", "major");
  const described = describeAttempt(state, shown);
  assert.equal(described.heard[0], "C♯5 +1¢");
  assert.doesNotMatch(described.heard[0], /D/);
  assert.doesNotMatch(described.heard[0], /99/);
});

test("the debug strip clears when the key advances", () => {
  const gMinor = displayKey(getKey("G"), "concert", "minor");
  const cMajor = displayKey(getKey("C"), "concert", "major");
  const previous = describeAttempt(createFollower([67]), gMinor).text;
  const next = describeAttempt(createFollower([60]), cMajor).text;
  assert.notEqual(previous, next);
  assert.match(next, /^Expected /);
  assert.equal(debugTextForKey({ keyId: "G", text: previous }, "C", next), next);
  assert.equal(debugTextForKey({ keyId: "G", text: previous }, "G", next), previous);
  assert.equal(debugTextForKey(null, "C", next), next);
});
