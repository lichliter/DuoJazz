import test from "node:test";
import assert from "node:assert/strict";
import { expectedNotesFor, hzFromMidi } from "./grade.js";
import { displayKey, getKey, midiForSpelledPitch } from "./music.js";
import { createSession, currentKeyId, sessionKeyQuality, TWELVE_KEY_IDS } from "./session.js";
import { rms, yinPitch } from "./sound-yin.js";
import {
  AMP_FLOOR,
  CONFIDENCE_MIN,
  FOLLOW_CENTS,
  NOISE_RATIO,
  NO_SOUND_MS,
  SILENCE_MS,
  SUSTAIN_MS,
  VOICED_MAX_HZ,
  VOICED_MIN_HZ,
  createFollower,
  debugTextForKey,
  describeAttempt,
  formatLiveLine,
  matchPitch,
  noteName,
  runFollower,
  stepFollower,
  tickFollower,
} from "./follow.js";

function tone(midi, start, dur = 120, { cents = 0, amp = 0.25, step = 20, confidence } = {}) {
  const hz = hzFromMidi(midi) * 2 ** (cents / 1200);
  const frames = [];
  for (let t = start; t <= start + dur; t += step) {
    const frame = { t, hz, amp };
    if (confidence != null) frame.confidence = confidence;
    frames.push(frame);
  }
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

test("a quiet take near 0.004 rms still passes", () => {
  const amp = 0.004;
  const state = play([60, 64, 67], [
    ...tone(60, 0, 120, { amp }),
    ...tone(64, 220, 120, { amp }),
    ...tone(67, 440, 120, { amp }),
  ]);
  assert.equal(state.passed, true);
  assert.equal(state.heard.length, 3);
  assert.equal(AMP_FLOOR, 0.0015);
  assert.ok(amp > AMP_FLOOR);
  assert.ok(amp < 0.01);
});

test("low-confidence noise is not voiced and does not hold an attempt open", () => {
  let quiet = createFollower([60], 0);
  for (let t = 0; t <= 200; t += 20) {
    quiet = stepFollower(quiet, { t, hz: 180, amp: 0.08, confidence: 0.2 });
  }
  assert.ok(0.2 < CONFIDENCE_MIN);
  assert.equal(quiet.started, false);
  assert.equal(quiet.lastVoicedT, null);
  assert.equal(quiet.ended, false);

  let state = play([60, 64], [...tone(60, 0, 80)]);
  const voicedAt = state.lastVoicedT;
  state = stepFollower(state, { t: voicedAt + SILENCE_MS, hz: 180, amp: 0.2, confidence: 0.1 });
  assert.equal(state.lastVoicedT, voicedAt);
  assert.equal(state.ended, true);
  assert.equal(state.reason, "silence");
});

test("a frame must clear three times the recent noise floor", () => {
  let state = createFollower([60], 0);
  for (let t = 0; t < 240; t += 20) {
    state = stepFollower(state, { t, hz: 440, amp: 0.002, confidence: 0.3 });
  }
  assert.equal(state.started, false);
  state = stepFollower(state, { t: 260, hz: hzFromMidi(60), amp: 0.004, confidence: 0.95 });
  assert.equal(state.started, false);
  assert.equal(NOISE_RATIO, 3);
  for (const frame of tone(60, 280, 160, { amp: 0.008, confidence: 0.95 })) {
    state = stepFollower(state, frame);
  }
  assert.equal(state.passed, true);
});

test("a repeated note re-attacks from a relative dip at a low level", () => {
  const frames = [
    ...tone(60, 0, 100, { amp: 0.004 }),
    ...tone(60, 120, 40, { amp: 0.0016 }),
    ...tone(60, 180, 160, { amp: 0.004 }),
  ];
  const state = play([60, 60], frames);
  assert.equal(state.passed, true);
  assert.equal(state.heard.length, 2);
});

test("a twelfth is not an octave match, and a 3rd-harmonic misread does not stick", () => {
  const fundamental = hzFromMidi(69);
  const harmonic = fundamental * 3;
  assert.equal(matchPitch(harmonic, 69), null);

  const burst = [];
  for (let t = 0; t <= 400; t += 20) burst.push({ t, hz: harmonic, amp: 0.2, confidence: 0.93 });
  let stuck = play([69, 67], burst);
  assert.equal(stuck.heard.length, 0);
  assert.equal(stuck.index, 0);
  assert.equal(stuck.passed, false);
  stuck = tickFollower(stuck, stuck.lastVoicedT + SILENCE_MS);
  assert.equal(stuck.ended, true);
  assert.equal(stuck.reason, "silence");
  assert.equal(stuck.hint, "1st note");

  const recovered = play([69, 67], [
    ...burst,
    ...tone(69, 420, 160, { amp: 0.2, confidence: 0.95 }),
    ...tone(67, 640, 160, { amp: 0.2, confidence: 0.95 }),
  ]);
  assert.equal(recovered.passed, true);
  assert.equal(recovered.heard.length, 2);
  assert.ok(Math.abs(recovered.heard[0].midi - 69) % 12 === 0);
  assert.notEqual(recovered.heard[0].midi, 88);
});

const TROMBONE_PARTIALS = [
  { ratio: 1, gain: 0.22 },
  { ratio: 2, gain: 0.85 },
  { ratio: 3, gain: 1 },
  { ratio: 4, gain: 0.28 },
];

function addGlide(pcm, sampleRate, { from, to, start, duration, amp, glide }) {
  const i0 = Math.max(0, Math.floor(start * sampleRate));
  const n = Math.floor(duration * sampleRate);
  const glideN = Math.max(1, Math.floor(glide * sampleRate));
  const phases = TROMBONE_PARTIALS.map(() => 0);
  for (let i = 0; i < n && i0 + i < pcm.length; i += 1) {
    const k = Math.min(1, i / glideN);
    const smooth = k * k * (3 - 2 * k);
    const midi = from + (to - from) * smooth;
    const hz = hzFromMidi(midi);
    const t = i / sampleRate;
    const env = Math.min(1, t / 0.015) * Math.min(1, (duration - t) / 0.04);
    let sample = 0;
    for (let p = 0; p < TROMBONE_PARTIALS.length; p += 1) {
      phases[p] += (2 * Math.PI * hz * TROMBONE_PARTIALS[p].ratio) / sampleRate;
      sample += Math.sin(phases[p]) * TROMBONE_PARTIALS[p].gain;
    }
    pcm[i0 + i] += sample * amp * env;
  }
}

function renderTromboneLick(sampleRate) {
  const midis = [69, 67, 62, 58, 57, 55];
  const noteDur = 0.34;
  const gap = 0.08;
  const total = 0.05 + midis.length * (noteDur + gap);
  const pcm = new Float32Array(Math.ceil(total * sampleRate));
  let cursor = 0.04;
  let prev = midis[0] + 2;
  for (const midi of midis) {
    addGlide(pcm, sampleRate, {
      from: prev,
      to: midi,
      start: cursor,
      duration: noteDur,
      amp: 0.16,
      glide: 0.045,
    });
    cursor += noteDur + gap;
    prev = midi;
  }
  return { pcm, midis };
}

function scaleToRms(pcm, target) {
  let sum = 0;
  for (let i = 0; i < pcm.length; i += 1) sum += pcm[i] * pcm[i];
  const level = Math.sqrt(sum / pcm.length);
  const gain = level > 0 ? target / level : 1;
  const out = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i += 1) out[i] = pcm[i] * gain;
  return out;
}

function framesFromPcm(pcm, sampleRate) {
  const window = 2048;
  const hop = 1024;
  const frames = [];
  for (let i = 0; i + window <= pcm.length; i += hop) {
    const slice = pcm.subarray(i, i + window);
    const amp = rms(slice);
    let hz = 0;
    let confidence = 0;
    if (amp > AMP_FLOOR) {
      const pitch = yinPitch(slice, sampleRate);
      hz = pitch.hz;
      confidence = pitch.confidence;
    }
    frames.push({ t: (i / sampleRate) * 1000, hz, amp, confidence });
  }
  return frames;
}

test("a synthetic trombone lick with a weak fundamental passes, including a quiet copy", () => {
  const sampleRate = 48000;
  const rendered = renderTromboneLick(sampleRate);
  const loud = framesFromPcm(rendered.pcm, sampleRate);
  const state = play(rendered.midis, loud);
  assert.equal(state.passed, true, describeAttempt(state).text);
  assert.equal(state.heard.length, rendered.midis.length);

  const quietPcm = scaleToRms(rendered.pcm, 0.004);
  const quiet = play(rendered.midis, framesFromPcm(quietPcm, sampleRate));
  assert.equal(quiet.passed, true, describeAttempt(quiet).text);
});

test("YIN on a lone 3rd harmonic does not stick the follower on that note", () => {
  const sampleRate = 48000;
  const duration = 0.45;
  const pcm = new Float32Array(Math.ceil((duration + 0.02) * sampleRate));
  const harmonic = hzFromMidi(69) * 3;
  const n = Math.floor(duration * sampleRate);
  for (let i = 0; i < n; i += 1) {
    const t = i / sampleRate;
    const env = Math.min(1, t / 0.02) * Math.min(1, (duration - t) / 0.03);
    pcm[i] = Math.sin(2 * Math.PI * harmonic * t) * 0.2 * env;
  }
  const frames = framesFromPcm(pcm, sampleRate);
  const voiced = frames.filter((frame) => frame.hz > 0 && frame.confidence >= CONFIDENCE_MIN);
  assert.ok(voiced.length > 5);
  const sorted = voiced.map((frame) => frame.hz).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  assert.ok(Math.abs(1200 * Math.log2(median / harmonic)) < 40);
  let state = play([69], frames);
  assert.equal(state.passed, false);
  assert.equal(state.heard.length, 0);
  assert.equal(state.index, 0);
  const tail = frames[frames.length - 1].t;
  state = stepFollower(state, { t: tail + SILENCE_MS, hz: 0, amp: 0, confidence: 0 });
  assert.equal(state.ended, true);
  assert.equal(state.reason, "silence");
  assert.equal(state.hint, "1st note");
});

test("the live debug line shows level, note, cents, and confidence", () => {
  const shown = displayKey(getKey("G"), "concert", "minor");
  const hz = hzFromMidi(69) * 2 ** (-12 / 1200);
  const line = formatLiveLine({ hz, amp: 0.004, rms: 0.004, confidence: 0.91 }, shown);
  assert.match(line, /0\.0040 rms/);
  assert.match(line, /dB/);
  assert.match(line, /A4 −12¢/);
  assert.match(line, /conf 0\.91/);
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

function midiFromNoteLabel(label) {
  const match = /^([A-G])(𝄫|♭|♯|𝄪)?(-?\d+)$/.exec(label);
  assert.ok(match, label);
  const acc = { "𝄫": -2, "♭": -1, "♯": 1, "𝄪": 2 }[match[2]] ?? 0;
  return midiForSpelledPitch(match[1], acc, Number(match[3]));
}

test("debug note names keep the written octave with the letter", () => {
  const abMinor = displayKey(getKey("Ab"), "concert", "minor");
  assert.equal(noteName(59, abMinor), "C♭4");

  const sevenSharps = { pc: 1, usesFlats: false, sigCount: 7 };
  assert.equal(noteName(60, sevenSharps), "B♯3");

  for (const keyId of TWELVE_KEY_IDS) {
    const session = createSession({
      lessonId: "learn-lick",
      keyMode: "one",
      startKeyId: keyId,
    });
    const shown = displayKey(
      getKey(currentKeyId(session)),
      session.displayMode,
      sessionKeyQuality(session),
    );
    const notes = expectedNotesFor(session);
    assert.ok(notes.length > 0, keyId);
    for (const note of notes) {
      const label = noteName(note.midi, shown);
      assert.equal(
        midiFromNoteLabel(label),
        Math.round(note.midi),
        `${keyId} ${note.midi} -> ${label}`,
      );
    }
  }
});
