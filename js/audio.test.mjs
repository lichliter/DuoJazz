import test, { after } from "node:test";
import assert from "node:assert/strict";
import { Transport } from "./audio.js";
import { BandTransport } from "./sound-engine.js";
import { COUNT_IN_BEATS, beatsToSeconds } from "./music.js";
import { createSession, demoAudioConfig } from "./session.js";
import { expectedNotesFor } from "./grade.js";

const originalWindow = globalThis.window;
after(() => {
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
});

class AudioParamMock {
  constructor() {
    this.value = 0;
  }

  setValueAtTime() {}

  exponentialRampToValueAtTime() {}
}

class AudioNodeMock {
  constructor(context, kind) {
    this.context = context;
    this.kind = kind;
    this.connections = [];
    this.disconnected = false;
    this.gain = new AudioParamMock();
    this.frequency = new AudioParamMock();
    this.playbackRate = new AudioParamMock();
  }

  connect(node) {
    this.connections.push(node);
  }

  disconnect() {
    this.disconnected = true;
  }

  start(time) {
    this.startAt = time;
  }

  stop(time) {
    this.stopAt = time ?? this.context.currentTime;
    if (time === undefined) this.end();
  }

  end() {
    if (this.ended) return;
    this.ended = true;
    this.onended?.();
  }
}

class AudioContextMock {
  constructor() {
    this.currentTime = 0;
    this.state = "running";
    this.sampleRate = 8000;
    this.destination = {};
    this.created = [];
  }

  makeNode(kind) {
    const node = new AudioNodeMock(this, kind);
    this.created.push(node);
    return node;
  }

  createGain() { return this.makeNode("gain"); }
  createOscillator() { return this.makeNode("oscillator"); }
  createBufferSource() { return this.makeNode("buffer"); }
  createBiquadFilter() { return this.makeNode("filter"); }
  createMediaStreamDestination() { return this.makeNode("tap"); }

  createDynamicsCompressor() {
    const node = this.makeNode("compressor");
    for (const name of ["threshold", "knee", "ratio"]) node[name] = new AudioParamMock();
    return node;
  }

  createBuffer(channels, length) {
    return { getChannelData: () => new Float32Array(length) };
  }

  advance(time) {
    this.currentTime = time;
    for (const node of this.created) {
      if (node.stopAt <= time) node.end();
    }
  }
}

async function setup(TransportClass = Transport) {
  let frameId = 0;
  const frames = new Map();
  globalThis.window = {
    AudioContext: AudioContextMock,
    requestAnimationFrame(callback) {
      frames.set(++frameId, callback);
      return frameId;
    },
    cancelAnimationFrame(id) { frames.delete(id); },
  };
  const transport = new TransportClass();
  await transport.ensure();
  const context = transport.ctx;
  return {
    transport,
    context,
    frames,
    frame(time) {
      context.advance(time);
      assert.equal(frames.size, 1);
      const [id, callback] = frames.entries().next().value;
      frames.delete(id);
      callback();
    },
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function almost(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
}

function sampledLibrary() {
  const buffer = {};
  return {
    buffer,
    ready: true,
    backingReady: true,
    nearest: () => ({ midi: 60, buffer, playbackRate: 1 }),
    drum: () => ({}),
  };
}

test("different sample requests serialize, recheck readiness, and keep the latest instrument", async () => {
  const { transport } = await setup();
  const started = [];
  const loaded = new Set();
  const entered = [deferred(), deferred()];
  const gates = [deferred(), deferred()];
  const progress = [];
  transport.library = {
    backingReady: false,
    hasMelody: (sampleSet) => loaded.has(sampleSet),
    async load(context, { sampleSet, onProgress }) {
      const index = started.length;
      started.push(sampleSet);
      entered[index].resolve();
      await gates[index].promise;
      loaded.add(sampleSet);
      this.backingReady = true;
      onProgress({ sampleSet });
    },
  };
  const older = transport.prepareBacking({ sampleSet: "trumpet", onProgress: () => progress.push("old") });
  await entered[0].promise;
  const newer = transport.prepareBacking({ sampleSet: "trombone", onProgress: () => progress.push("new") });
  const duplicate = transport.prepareBacking({ sampleSet: "trombone", onProgress: () => progress.push("latest") });
  assert.deepEqual(started, ["trumpet"]);
  gates[0].resolve();
  assert.equal((await older).status, "ready");
  assert.equal(transport.melodyKind, "trombone");
  assert.equal(transport.sampleStatus, "loading");
  await entered[1].promise;
  assert.deepEqual(started, ["trumpet", "trombone"]);
  gates[1].resolve();
  assert.equal((await newer).status, "ready");
  assert.equal((await duplicate).status, "ready");
  assert.equal(transport.sampleStatus, "ready");
  assert.equal(transport.melodyKind, "trombone");
  assert.equal(transport.loadPromise, null);
  assert.deepEqual(progress, []);
});

test("an obsolete failed sample load cannot replace a cached selection or its ready state", async () => {
  const { transport } = await setup();
  const gate = deferred();
  const entered = deferred();
  transport.library = {
    backingReady: true,
    hasMelody: (sampleSet) => sampleSet === "piano",
    async load() {
      entered.resolve();
      await gate.promise;
    },
  };
  const older = transport.prepareBacking({ sampleSet: "trumpet" });
  await entered.promise;
  assert.equal((await transport.prepareBacking({ sampleSet: "piano" })).status, "ready");
  gate.reject(new Error("sample unavailable"));
  assert.equal((await older).status, "fallback");
  assert.equal(transport.melodyKind, "piano");
  assert.equal(transport.sampleStatus, "ready");
  assert.equal(transport.sampleNotice, "");
});

for (const lessonId of ["dss-learn", "dss-master"]) {
  for (const sampled of [false, true]) {
    test(`${lessonId} Hear it schedules the full pickup with ${sampled ? "samples" : "synth"}`, async () => {
      const { transport } = await setup();
      if (sampled) transport.library = sampledLibrary();
      const session = createSession({ lessonId, startKeyId: "C" });
      const melody = [];
      const scheduleEvent = transport.scheduleEvent.bind(transport);
      transport.scheduleEvent = (event, origin) => {
        if (event.type === "melody") melody.push({ beat: event.beat, midi: event.midi });
        scheduleEvent(event, origin);
      };
      await transport.start(demoAudioConfig(session));
      assert.deepEqual(melody.slice(0, 3).map((note) => note.beat), [-1, -0.5, 0]);
      assert.deepEqual(melody, expectedNotesFor(session).map((note) => ({ beat: note.startBeat, midi: note.midi })));
      assert.equal(transport.snapshot().inCountIn, true);
      transport.stop();
    });
  }
}

test("loop lookahead schedules anticipated pickups before the next downbeat", async () => {
  const { transport, context, frame } = await setup();
  transport.library = sampledLibrary();
  await transport.start({
    tempo: 120, swing: true, looping: true, lengthBeats: 4,
    events: [{ type: "bass", midi: 36, beat: -0.5, durationBeats: 0.25 }],
  });
  const boundary = transport.startedAt + 2;
  frame(boundary - 0.4);
  const pickup = context.created.filter((node) => node.buffer === transport.library.buffer).at(-1);
  almost(pickup.startAt, boundary - 0.25);
  assert.ok(pickup.startAt > context.currentTime);
  transport.stop();
});

for (const TransportClass of [Transport, BandTransport]) {
  test(`${TransportClass.name} maps note endpoints for swing, straight, tuplets, and count-in`, async () => {
    const { transport, context } = await setup(TransportClass);
    transport.tempo = 120;
    transport.swing = true;
    transport.engine = "new";
    transport.library = sampledLibrary();
    const cases = [
      { beat: 0, durationBeats: 0.5 },
      { beat: 0.5, durationBeats: 0.5 },
      { beat: 1.5, durationBeats: 1 },
      { beat: 0.5, durationBeats: 0.5, swing: false },
      { beat: 1 / 3, durationBeats: 1 / 3, swing: false },
      { beat: -0.5, durationBeats: 1 },
      { beat: -1, durationBeats: 0.5, swing: false },
    ];
    for (const placement of cases) {
      const swing = placement.swing !== false && placement.beat >= 0;
      const time = 10 + beatsToSeconds(placement.beat, 120, swing);
      const duration = beatsToSeconds(placement.beat + placement.durationBeats, 120, swing)
        - beatsToSeconds(placement.beat, 120, swing);
      transport.scheduleEvent({ type: "bass", midi: 36, ...placement }, 10);
      const source = context.created.at(-2);
      almost(source.startAt, time);
      almost(source.stopAt - source.startAt - 0.05, duration);
      if (transport.eventTime) assert.deepEqual(transport.eventTime(placement, 10), { time, dur: duration });
    }
    transport.swing = false;
    transport.scheduleEvent({ type: "bass", midi: 36, beat: 0.5, durationBeats: 0.5 }, 10);
    almost(context.created.at(-2).stopAt - context.created.at(-2).startAt - 0.05, 0.25);
    transport.library = null;
    transport.swing = true;
    const before = context.created.length;
    transport.scheduleEvent({ type: "melody", midi: 60, beat: 0.5, durationBeats: 0.5 }, 10);
    const oscillator = context.created[before];
    const shortEighth = beatsToSeconds(1, 120, true) - beatsToSeconds(0.5, 120, true);
    almost(oscillator.stopAt - oscillator.startAt - 0.05, shortEighth * 0.92);
  });

  test(`${TransportClass.name} keeps repeated early and late loop boundaries on the audio clock`, async () => {
    const { transport, context, frame } = await setup(TransportClass);
    transport.library = sampledLibrary();
    transport.engine = "new";
    const config = {
      tempo: 120, swing: true, looping: true, lengthBeats: 4,
      events: [{ type: "bass", midi: 36, beat: 0, durationBeats: 0.25 }],
    };
    await transport.start(config);
    const origin = COUNT_IN_BEATS * 0.5;
    const scheduledNotes = () => context.created.filter((node) => node.buffer === transport.library.buffer);
    almost(scheduledNotes()[0].startAt, origin);
    assert.equal(transport.snapshot().inCountIn, true);
    const countInSources = context.created.filter((node) => node.startAt !== undefined).length - 1;
    for (let chorus = 1; chorus <= 25; chorus += 1) {
      const boundary = origin + chorus * 2;
      frame(boundary - 0.02);
      almost(transport.currentBeats(), 3.96);
      almost(scheduledNotes()[chorus].startAt, boundary);
      assert.equal(scheduledNotes().length, chorus + 1);
      frame(boundary);
      almost(transport.currentBeats(), 0);
      frame(boundary + 0.17);
      almost(transport.currentBeats(), 0.34);
      assert.equal(scheduledNotes().length, chorus + 1);
      almost(transport.startedAt, origin);
      assert.ok(transport.nodes.length <= 1);
    }
    assert.equal(context.created.filter((node) => node.startAt !== undefined).length, countInSources + 26);
    transport.stop();
  });

  test(`${TransportClass.name} skips missed choruses with bounded catchup and no timeline drift`, async () => {
    const { transport, context, frame } = await setup(TransportClass);
    transport.library = sampledLibrary();
    transport.engine = "new";
    const origins = [];
    const armChorus = transport.armChorus.bind(transport);
    transport.armChorus = (config, options) => {
      origins.push(options.origin ?? transport.startedAt);
      armChorus(config, options);
    };
    await transport.start({
      tempo: 120, swing: true, looping: true, lengthBeats: 4,
      events: [{ type: "bass", midi: 36, beat: 0, durationBeats: 0.5 }],
    });
    const origin = transport.startedAt;
    frame(origin + 20000 + 1.8);
    assert.deepEqual(origins, [origin, origin + 20000, origin + 20002]);
    almost(transport.currentBeats(), 3.6);
    const nextNote = context.created.filter((node) => node.buffer === transport.library.buffer).at(-1);
    almost(nextNote.startAt, origin + 20002);
    frame(origin + 20002.1);
    assert.equal(origins.length, 3);
    almost(transport.currentBeats(), 0.2);
    transport.stop();
  });

  test(`${TransportClass.name} keeps fractional-tempo playheads aligned across repeated boundaries`, async () => {
    const { transport, context, frame } = await setup(TransportClass);
    context.currentTime = 30;
    transport.library = sampledLibrary();
    transport.engine = "new";
    await transport.start({
      tempo: 137, swing: true, looping: true, lengthBeats: 4,
      events: [{ type: "bass", midi: 36, beat: 0, durationBeats: 0.25 }],
    });
    const origin = transport.startedAt;
    const lengthSeconds = 4 * 60 / 137;
    for (let chorus = 1; chorus <= 100; chorus += 1) {
      const boundary = origin + chorus * lengthSeconds;
      frame(boundary - 0.02);
      const next = context.created.filter((node) => node.buffer === transport.library.buffer).at(-1);
      almost(next.startAt, boundary);
      frame(boundary);
      almost(transport.currentBeats(), 0);
      assert.equal(transport.snapshot().bar, 1);
      assert.equal(transport.scheduledChorus, chorus);
    }
    transport.stop();
  });

  test(`${TransportClass.name} pause/resume retains loop position and remaining count-in`, async () => {
    const { transport, context, frame, frames } = await setup(TransportClass);
    const config = {
      tempo: 120, swing: false, looping: true, lengthBeats: 4,
      events: [{ type: "click", beat: 0 }, { type: "click", beat: 2 }],
    };
    await transport.start(config);
    context.advance(0.5);
    transport.pause();
    assert.equal(transport.snapshot().inCountIn, true);
    assert.equal(transport.pausedBeats, 1 - COUNT_IN_BEATS);
    assert.equal(transport.nodes.length, 0);
    assert.equal(frames.size, 0);
    context.advance(10);
    const beforeResume = context.created.length;
    await transport.start(config, { resume: true });
    almost(transport.currentBeats(), 1 - COUNT_IN_BEATS);
    const resumedClicks = context.created.slice(beforeResume).filter((node) => node.startAt !== undefined);
    assert.equal(resumedClicks.length, COUNT_IN_BEATS - 1 + 2);
    frame(transport.startedAt + 4.3);
    almost(transport.currentBeats(), 0.6);
    transport.pause();
    almost(transport.pausedBeats, 0.6);
    context.advance(30);
    await transport.start(config, { resume: true });
    almost(transport.currentBeats(), 0.6);
    assert.equal(transport.snapshot().inCountIn, false);
    transport.stop();
  });

  test(`${TransportClass.name} non-looping playback ends at, not before, its exact boundary`, async () => {
    const { transport, frame, frames } = await setup(TransportClass);
    let ended = 0;
    transport.onEnded = () => { ended += 1; };
    await transport.start({ tempo: 120, swing: true, looping: false, lengthBeats: 4, events: [] });
    const boundary = transport.startedAt + 2;
    frame(boundary - 0.02);
    assert.equal(transport.playing, true);
    assert.equal(ended, 0);
    frame(boundary);
    assert.equal(transport.playing, false);
    assert.equal(transport.ended, true);
    assert.equal(ended, 1);
    assert.equal(frames.size, 0);
  });

  test(`${TransportClass.name} releases ended synth, sample, and click graphs without retaining sources`, async () => {
    const { transport, context } = await setup(TransportClass);
    const persistentNodes = context.created.length;
    for (let iteration = 0; iteration < 100; iteration += 1) {
      const time = context.currentTime + 0.01;
      if (transport.toneTo) transport.toneTo(transport.master, time, 440, 0.1);
      else transport.tone(time, 440, 0.1);
      transport.playBuffer({}, time, { bus: transport.master, duration: 0.1 });
      transport.noiseClick(time);
      assert.equal(transport.nodes.length, 3);
      context.advance(time + 1);
      assert.equal(transport.nodes.length, 0);
    }
    for (const node of context.created.slice(persistentNodes)) assert.equal(node.disconnected, true);
    for (const node of context.created.slice(0, persistentNodes)) assert.equal(node.disconnected, false);
    const beforeStop = context.created.length;
    transport.tone(context.currentTime + 10, 440, 1);
    transport.playBuffer({}, context.currentTime + 10, { bus: transport.master });
    transport.noiseClick(context.currentTime + 10);
    transport.stopAllNodes();
    assert.equal(transport.nodes.length, 0);
    for (const node of context.created.slice(beforeStop)) assert.equal(node.disconnected, true);
  });
}
