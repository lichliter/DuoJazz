import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PitchMonitor, RAPID_MIC_CONSTRAINTS, VOICE_MIC_CONSTRAINTS } from "./pitch.js";
import { rapidMicStep } from "./rapid.js";

function fakeCtx() {
  return {
    state: "running",
    destination: {},
    audioWorklet: { addModule: async () => {} },
    resume: async () => {},
    close: async () => {},
    createMediaStreamSource() {
      return { connect() {}, disconnect() {} };
    },
    createGain() {
      return { gain: { value: 0 }, connect() {}, disconnect() {} };
    },
  };
}

function installMic() {
  const calls = [];
  const tracks = [];
  globalThis.AudioWorkletNode = class {
    constructor() {
      this.port = { onmessage: null, postMessage() {} };
    }

    connect() {}

    disconnect() {}
  };
  globalThis.navigator ??= {};
  globalThis.navigator.mediaDevices = {
    getUserMedia: async (constraints) => {
      calls.push(constraints);
      const track = {
        readyState: "live",
        stop() {
          this.readyState = "ended";
        },
      };
      tracks.push(track);
      return { getTracks: () => [track] };
    },
  };
  return { calls, tracks };
}

test("rapid fire asks for a raw mic and reuses it across attempts", async () => {
  const { calls, tracks } = installMic();
  const ctx = fakeCtx();
  const monitor = new PitchMonitor();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const live = monitor.isLive() && monitor.processing === false;
    const step = rapidMicStep(live, "attempt");
    assert.equal(step, attempt === 0 ? "open" : "reset");
    if (step === "reset") monitor.reset();
    else await monitor.start(ctx, { processing: false });
  }
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].audio, RAPID_MIC_CONSTRAINTS);
  assert.equal(RAPID_MIC_CONSTRAINTS.echoCancellation, false);
  assert.equal(RAPID_MIC_CONSTRAINTS.noiseSuppression, false);
  assert.equal(RAPID_MIC_CONSTRAINTS.autoGainControl, true);
  assert.equal(monitor.isLive(), true);
  assert.equal(tracks[0].readyState, "live");

  await monitor.start(ctx, { processing: false });
  assert.equal(calls.length, 1);

  for (const reason of ["pause", "hear", "leave", "wrapup", "hide"]) {
    assert.equal(rapidMicStep(monitor.isLive(), reason), "release");
  }
  monitor.stop();
  assert.equal(monitor.isLive(), false);
  assert.equal(tracks[0].readyState, "ended");
  await monitor.start(ctx, { processing: false });
  assert.equal(calls.length, 2);
});

test("other callers keep voice processing and a fresh stream", async () => {
  const { calls } = installMic();
  const monitor = new PitchMonitor();
  const ctx = fakeCtx();
  await monitor.start(ctx);
  assert.deepEqual(calls[0].audio, VOICE_MIC_CONSTRAINTS);
  assert.equal(monitor.processing, true);
  await monitor.start(ctx, { processing: false });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].audio, RAPID_MIC_CONSTRAINTS);

  const sound = await readFile(new URL("./sound-page.js", import.meta.url), "utf8");
  assert.match(sound, /mic\.start\(transport\.ctx\)/);
  assert.equal(sound.includes("processing: false"), false);
});

test("pausing while the prompt is open drops that stream", async () => {
  const { tracks } = installMic();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const hung = {
    readyState: "live",
    stop() {
      this.readyState = "ended";
    },
  };
  globalThis.navigator.mediaDevices.getUserMedia = () => gate.then(() => {
    tracks.push(hung);
    return { getTracks: () => [hung] };
  });
  const monitor = new PitchMonitor();
  const pending = monitor.start(fakeCtx(), { processing: false });
  monitor.stop();
  release();
  await pending;
  assert.equal(hung.readyState, "ended");
  assert.equal(monitor.isLive(), false);
});
