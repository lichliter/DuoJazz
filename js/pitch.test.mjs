import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PitchMonitor, RAPID_MIC_CONSTRAINTS, VOICE_MIC_CONSTRAINTS } from "./pitch.js";
import { rapidMicStep } from "./rapid.js";

const originalWindow = globalThis.window;
const originalWorkletNode = globalThis.AudioWorkletNode;
const originalMediaDevices = globalThis.navigator?.mediaDevices;
after(() => {
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  if (originalWorkletNode === undefined) delete globalThis.AudioWorkletNode;
  else globalThis.AudioWorkletNode = originalWorkletNode;
  if (originalMediaDevices === undefined) delete globalThis.navigator.mediaDevices;
  else globalThis.navigator.mediaDevices = originalMediaDevices;
});

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
      const track = Object.assign(new EventTarget(), {
        readyState: "live",
        stop() {
          this.readyState = "ended";
        },
      });
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

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function startupFixture({ failure, disconnectFailure = false, closeFailure = false } = {}) {
  const mic = installMic();
  const nodes = [];
  const ctx = fakeCtx();
  ctx.closeCalls = 0;
  ctx.close = () => {
    ctx.closeCalls += 1;
    ctx.state = "closed";
    return closeFailure ? Promise.reject(new Error("close failed")) : Promise.resolve();
  };
  const makeNode = (kind) => {
    if (failure === kind) throw new Error(`${kind} failed`);
    const node = {
      kind,
      disconnects: 0,
      gain: { value: 1 },
      port: { onmessage: null, postMessage() {} },
      connect() {
        if (failure === `${kind}-connect`) throw new Error("connect failed");
      },
      disconnect() {
        this.disconnects += 1;
        if (disconnectFailure && kind === "source") throw new Error("disconnect failed");
      },
    };
    nodes.push(node);
    return node;
  };
  ctx.createMediaStreamSource = () => makeNode("source");
  ctx.createGain = () => makeNode("mute");
  ctx.audioWorklet.addModule = async () => {
    if (failure === "module") throw new Error("module failed");
  };
  globalThis.AudioWorkletNode = class {
    constructor() { return makeNode("node"); }
  };
  globalThis.window = { AudioContext: class { constructor() { return ctx; } } };
  return { ...mic, ctx, nodes };
}

for (const owned of [true, false]) {
  for (const failure of ["module", "source", "node", "mute", "source-connect", "node-connect", "mute-connect"]) {
    test(`pitch startup cleans ${owned ? "owned" : "shared"} resources after ${failure} failure`, async () => {
      const { ctx, nodes, tracks } = startupFixture({ failure, disconnectFailure: true, closeFailure: true });
      const monitor = new PitchMonitor();
      await monitor.start(owned ? undefined : ctx);
      assert.equal(monitor.state, "unsupported");
      assert.equal(tracks.length, 1);
      assert.equal(tracks[0].readyState, "ended");
      for (const node of nodes) {
        assert.equal(node.disconnects, 1, node.kind);
        assert.equal(node.port.onmessage, null);
      }
      assert.equal(ctx.closeCalls, owned ? 1 : 0);
      assert.equal(monitor.ctx, null);
      assert.equal(monitor.stream, null);
      assert.equal(monitor.source, null);
      assert.equal(monitor.node, null);
      assert.equal(monitor.mute, null);
      assert.equal(monitor.isLive(), false);
      monitor.stop();
      assert.equal(monitor.state, "unsupported");
      assert.equal(ctx.closeCalls, owned ? 1 : 0);
    });
  }
}

for (const failure of ["resume", "worklet", "permission", "media-api", "context"]) {
  test(`pitch startup cleans failures before acquisition: ${failure}`, async () => {
    const { ctx, tracks } = startupFixture();
    if (failure === "resume") {
      ctx.state = "suspended";
      ctx.resume = async () => { throw new Error("resume failed"); };
    }
    if (failure === "worklet") ctx.audioWorklet = null;
    if (failure === "permission") {
      globalThis.navigator.mediaDevices.getUserMedia = async () => {
        throw Object.assign(new Error("permission denied"), { name: "NotAllowedError" });
      };
    }
    if (failure === "media-api") globalThis.navigator.mediaDevices = undefined;
    if (failure === "context") globalThis.window.AudioContext = undefined;
    const monitor = new PitchMonitor();
    await monitor.start();
    assert.equal(monitor.state, failure === "permission" ? "denied" : "unsupported");
    assert.equal(tracks.length, 0);
    assert.equal(ctx.closeCalls, failure === "context" ? 0 : 1);
    assert.equal(monitor.ctx, null);
    assert.equal(monitor.graph, null);
  });
}

test("an obsolete worklet rejection cannot tear down a newer shared microphone graph", async () => {
  const { ctx: olderContext, tracks } = startupFixture();
  const moduleGate = deferred();
  const entered = deferred();
  olderContext.audioWorklet.addModule = () => {
    entered.resolve();
    return moduleGate.promise;
  };
  const monitor = new PitchMonitor();
  const pending = monitor.start();
  await entered.promise;
  const newerContext = fakeCtx();
  let newerClosed = 0;
  newerContext.close = async () => { newerClosed += 1; };
  await monitor.start(newerContext, { processing: false });
  const newerNode = monitor.node;
  moduleGate.reject(new Error("obsolete worklet failed"));
  await pending;
  assert.equal(olderContext.closeCalls, 1);
  assert.equal(tracks[0].readyState, "ended");
  assert.equal(tracks[1].readyState, "live");
  assert.equal(newerClosed, 0);
  assert.equal(monitor.ctx, newerContext);
  assert.equal(monitor.node, newerNode);
  assert.equal(monitor.state, "listening");
  assert.equal(monitor.isLive(), true);
  monitor.stop();
  assert.equal(newerClosed, 0);
});

test("a stale microphone permission result releases only its own stream", async () => {
  const { ctx } = startupFixture();
  const permission = deferred();
  const entered = deferred();
  const requestMic = globalThis.navigator.mediaDevices.getUserMedia;
  const oldStream = await requestMic({});
  let calls = 0;
  globalThis.navigator.mediaDevices.getUserMedia = (constraints) => {
    if (++calls > 1) return requestMic(constraints);
    entered.resolve();
    return permission.promise;
  };
  const monitor = new PitchMonitor();
  const pending = monitor.start();
  await entered.promise;
  await monitor.start(fakeCtx());
  const activeStream = monitor.stream;
  permission.resolve(oldStream);
  await pending;
  assert.equal(ctx.closeCalls, 1);
  assert.equal(oldStream.getTracks()[0].readyState, "ended");
  assert.equal(activeStream.getTracks()[0].readyState, "live");
  assert.equal(monitor.stream, activeStream);
  assert.equal(monitor.state, "listening");
  monitor.stop();
});

test("an obsolete resume rejection leaves a newer microphone graph listening", async () => {
  const { ctx } = startupFixture();
  const resumeGate = deferred();
  ctx.state = "suspended";
  ctx.resume = () => resumeGate.promise;
  const monitor = new PitchMonitor();
  const pending = monitor.start();
  const newerContext = fakeCtx();
  await monitor.start(newerContext);
  resumeGate.reject(new Error("obsolete resume failed"));
  await pending;
  assert.equal(ctx.closeCalls, 1);
  assert.equal(monitor.ctx, newerContext);
  assert.equal(monitor.state, "listening");
  assert.equal(monitor.isLive(), true);
  monitor.stop();
});

test("resuming an existing graph cleans its stream on failure without closing a shared context", async () => {
  const { ctx, tracks, nodes } = startupFixture();
  const monitor = new PitchMonitor();
  await monitor.start(ctx);
  ctx.state = "suspended";
  ctx.resume = async () => { throw new Error("resume failed"); };
  await monitor.start(ctx);
  assert.equal(monitor.state, "unsupported");
  assert.equal(tracks[0].readyState, "ended");
  assert.equal(ctx.closeCalls, 0);
  for (const node of nodes) assert.equal(node.disconnects, 1);
});

test('a disconnected microphone releases its graph and can start again', async () => {
  const { ctx, tracks, nodes } = startupFixture();
  const monitor = new PitchMonitor();
  await monitor.start(ctx);
  const oldFrame = monitor.node.port.onmessage;
  tracks[0].readyState = 'ended';
  tracks[0].dispatchEvent(new Event('ended'));
  assert.equal(monitor.state, 'interrupted');
  assert.equal(monitor.isLive(), false);
  for (const node of nodes) assert.equal(node.disconnects, 1);
  assert.equal(ctx.closeCalls, 0);
  await monitor.start(ctx);
  tracks[0].dispatchEvent(new Event('ended'));
  oldFrame({ data: { hz: 440, amp: 0.2 } });
  assert.equal(monitor.state, 'listening');
  assert.equal(monitor.isLive(), true);
  assert.equal(monitor.observations.length, 0);
  monitor.stop();
});

test('a microphone disconnect during worklet startup cannot leave a phantom live graph', async () => {
  const { ctx, tracks } = startupFixture();
  const gate = deferred(), entered = deferred();
  ctx.audioWorklet.addModule = () => { entered.resolve(); return gate.promise; };
  const monitor = new PitchMonitor();
  const pending = monitor.start(ctx);
  await entered.promise;
  tracks[0].readyState = 'ended'; tracks[0].dispatchEvent(new Event('ended'));
  gate.resolve(); await pending;
  assert.equal(monitor.state, 'interrupted');
  assert.equal(monitor.node, null);
  assert.equal(monitor.isLive(), false);
});

test('interrupted audio contexts resume; closed contexts never report listening', async () => {
  const { ctx, tracks } = startupFixture();
  const monitor = new PitchMonitor();
  await monitor.start(ctx);
  let resumes = 0;
  ctx.state = 'interrupted'; ctx.resume = async () => { resumes++; ctx.state = 'running'; };
  await monitor.start(ctx);
  assert.equal(resumes, 1);
  assert.equal(monitor.state, 'listening');
  ctx.state = 'closed';
  await monitor.start(ctx);
  assert.equal(monitor.state, 'unsupported');
  assert.equal(tracks[0].readyState, 'ended');
  assert.equal(monitor.isLive(), false);
});
