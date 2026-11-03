import test from "node:test";
import assert from "node:assert/strict";
import { INSTRUMENTS } from "./instruments.js";
import {
  BACKING_DUCK_DB,
  MELODY_GAIN_TABLE,
  MELODY_NOTE_GAIN,
  MELODY_SAMPLE_SETS,
  MELODY_TARGET_AMPLITUDE,
  MELODY_VELOCITY,
  busGain,
  lickBalance,
  melodyPlayGain,
  sampleRms,
} from "./melody-gain.js";
import { SAMPLE_NOTES } from "./sound-samples.js";
import { livePlaybackEvents } from "./sound-band.js";
import { createSession, demoAudioConfig, recordBackingConfig } from "./session.js";

const HEAR_IT_MIDIS = {
  trombone: [57, 55, 50, 46, 45, 43],
  trumpet: [69, 67, 62, 58, 57, 55],
};

test("the gain table covers every melody sample set", () => {
  assert.deepEqual([...MELODY_SAMPLE_SETS].sort(), Object.keys(SAMPLE_NOTES).sort());
  assert.deepEqual(Object.keys(MELODY_GAIN_TABLE).sort(), [...MELODY_SAMPLE_SETS].sort());
  for (const instrument of INSTRUMENTS) {
    assert.ok(MELODY_GAIN_TABLE[instrument.sampleSet], instrument.id);
  }
  for (const set of MELODY_SAMPLE_SETS) {
    for (const note of SAMPLE_NOTES[set]) {
      const gain = MELODY_GAIN_TABLE[set][note.midi];
      assert.equal(typeof gain, "number", `${set} ${note.name}`);
      assert.ok(gain > 0, `${set} ${note.name}`);
      const audible = melodyPlayGain(set, note.midi) * sampleRms(set, note.midi) * busGain("melody", true);
      assert.ok(
        Math.abs(audible - MELODY_TARGET_AMPLITUDE) < 1e-9,
        `${set} ${note.name} landed at ${audible}`,
      );
      assert.equal(melodyPlayGain(set, note.midi), MELODY_NOTE_GAIN * MELODY_VELOCITY * gain);
    }
  }
});

test("Hear it ducks the backing by 6 dB and Record keeps the normal buses", () => {
  const ducked = busGain("piano", false) / busGain("piano", true);
  assert.ok(Math.abs(20 * Math.log10(ducked) - BACKING_DUCK_DB) < 0.01);
  assert.equal(busGain("bass", false), 0.85);
  assert.equal(busGain("drum", false), 0.7);
  assert.equal(busGain("melody", true), busGain("melody", false));
  const session = createSession({
    lessonId: "learn-lick",
    studyMode: "learn",
    instrumentId: "trombone",
    startKeyId: "G",
  });
  assert.equal(demoAudioConfig(session).duckBacking, true);
  assert.equal(recordBackingConfig(session).duckBacking, false);
  assert.equal(recordBackingConfig(session).includeModel, false);
});

test("Hear it Lesson 1 G minor melody sits at least 6 dB above piano and bass", () => {
  for (const instrumentId of ["trombone", "trumpet"]) {
    const session = createSession({
      lessonId: "learn-lick",
      studyMode: "learn",
      instrumentId,
      startKeyId: "G",
    });
    const demo = demoAudioConfig(session);
    const events = livePlaybackEvents(demo, { sampled: true });
    const midis = events.filter((event) => event.type === "melody").map((event) => event.midi);
    assert.deepEqual(midis, HEAR_IT_MIDIS[instrumentId], `${instrumentId} register`);
    const level = lickBalance(events, instrumentId, { duckBacking: true });
    assert.ok(
      level.marginDb >= 6,
      `${instrumentId} melody ${level.melodyRms.toFixed(4)} vs backing ${level.backingRms.toFixed(4)} (${level.marginDb.toFixed(2)} dB)`,
    );
    assert.ok(
      level.minMarginDb >= 6,
      `${instrumentId} quietest note ${level.minMarginDb.toFixed(2)} dB`,
    );
    const open = lickBalance(events, instrumentId, { duckBacking: false });
    const duckDb = 20 * Math.log10(open.backingRms / level.backingRms);
    assert.ok(Math.abs(duckDb - BACKING_DUCK_DB) < 0.05, `${instrumentId} duck ${duckDb.toFixed(2)} dB`);
    assert.ok(Math.abs(open.melodyRms - level.melodyRms) < 1e-12);
  }
});
