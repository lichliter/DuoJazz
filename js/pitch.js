/**
 * Microphone + AudioWorklet pitch monitor.
 * iPad Safari: start only after a user gesture, same-origin worklet, silent tap to keep the graph alive.
 */

const WORKLET_URL = new URL("./pitch-worklet.js?v=147", import.meta.url);

/** Sound lab and demo playback. Voice processing stays on for those callers. */
export const VOICE_MIC_CONSTRAINTS = Object.freeze({
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
});

/**
 * Rapid fire only. Echo cancellation and noise suppression smear a sustained
 * horn tone. Auto gain stays on so a raw iPad input is not stuck near silence.
 */
export const RAPID_MIC_CONSTRAINTS = Object.freeze({
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: true,
});

export class PitchMonitor {
  constructor() {
    this.ctx = null;
    this.stream = null;
    this.source = null;
    this.node = null;
    this.mute = null;
    this.observations = [];
    this.state = "idle";
    this.onState = () => {};
    this.onFrame = () => {};
    this.beatClock = () => 0;
    this.silentFrames = 0;
    this.ownsContext = false;
    this.holdSignal = false;
    this.processing = true;
    this.startToken = 0;
    this.graph = null;
    this.now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  }

  isLive() {
    const tracks = this.stream?.getTracks?.() ?? [];
    return Boolean(this.node && tracks.some((track) => track.readyState === "live"));
  }

  setState(state) {
    this.state = state;
    this.onState(state);
  }

  reset() {
    this.observations = [];
    this.silentFrames = 0;
  }

  feed(frames) {
    for (const frame of frames) {
      this.observations.push({
        beat: typeof frame.beat === "number" ? frame.beat : this.beatClock(),
        hz: frame.hz ?? 0,
        amp: frame.amp ?? 0.2,
      });
    }
    if (frames.length) this.setState("listening");
  }

  discardStream(stream) {
    if (!stream || stream === this.stream) return;
    for (const track of stream.getTracks?.() ?? []) {
      try {
        track.stop();
      } catch {}
    }
  }

  releaseGraph(graph) {
    if (!graph) return;
    for (const track of graph.stream?.getTracks?.() ?? []) track.removeEventListener?.('ended', graph.onEnded);
    try {
      if (graph.node?.port) graph.node.port.onmessage = null;
      graph.node?.port.postMessage("stop");
    } catch {}
    for (const name of ["source", "node", "mute"]) {
      try {
        graph[name]?.disconnect();
      } catch {}
      graph[name] = null;
    }
    this.discardStream(graph.stream);
    graph.stream = null;
    if (graph.ownsContext && graph.ctx) {
      graph.ownsContext = false;
      try {
        Promise.resolve(graph.ctx.close()).catch(() => {});
      } catch {}
    }
  }

  async start(ctx, options = {}) {
    const processing = options.processing !== false;
    const sameGraph = this.isLive()
      && this.processing === processing
      && this.ctx
      && this.ctx.state !== "closed"
      && (!ctx || ctx === this.ctx);
    if (sameGraph) {
      const token = this.startToken;
      const context = this.ctx;
      this.reset();
      try {
        if (context.state === "suspended" || context.state === "interrupted") await context.resume();
      } catch {
        if (token === this.startToken) {
          this.stop();
          this.setState("unsupported");
        }
        return;
      }
      if (token !== this.startToken) return;
      if (this.state !== "listening") this.setState("listening");
      return;
    }
    this.stop();
    const token = this.startToken;
    this.processing = processing;
    const graph = { ctx: null, ownsContext: !ctx, stream: null, source: null, node: null, mute: null };
    this.graph = graph;
    try {
      const Ctx = ctx ? null : window.AudioContext || window.webkitAudioContext;
      graph.ctx = ctx ?? new Ctx();
      this.ctx = graph.ctx;
      this.ownsContext = graph.ownsContext;
      if (graph.ctx.state === "closed") throw new Error("Audio context closed");
      if (graph.ctx.state === "suspended" || graph.ctx.state === "interrupted") await graph.ctx.resume();
      if (token !== this.startToken) return;
      if (typeof graph.ctx.audioWorklet?.addModule !== "function") throw new Error("AudioWorklet unavailable");
      this.setState("requesting");
      if (token !== this.startToken) return;
      graph.stream = await navigator.mediaDevices.getUserMedia({
        audio: processing ? VOICE_MIC_CONSTRAINTS : RAPID_MIC_CONSTRAINTS,
      });
      if (token !== this.startToken) return;
      this.stream = graph.stream;
      graph.onEnded = () => {
        if (token !== this.startToken) return;
        this.stop();
        this.setState("interrupted");
      };
      for (const track of graph.stream.getTracks()) track.addEventListener?.('ended', graph.onEnded);
      if (!graph.stream.getTracks().some(track => track.readyState === 'live')) {
        graph.onEnded();
        return;
      }
      await graph.ctx.audioWorklet.addModule(WORKLET_URL);
      if (token !== this.startToken) return;
      this.source = graph.source = graph.ctx.createMediaStreamSource(graph.stream);
      this.node = graph.node = new AudioWorkletNode(graph.ctx, "duojazz-pitch");
      this.mute = graph.mute = graph.ctx.createGain();
      graph.mute.gain.value = 0;
      graph.source.connect(graph.node);
      graph.node.connect(graph.mute);
      graph.mute.connect(graph.ctx.destination);
      graph.node.port.onmessage = (event) => { if (token === this.startToken) this.handleFrame(event.data); };
      this.setState("listening");
    } catch (error) {
      if (token === this.startToken) {
        this.stop();
        this.setState(error?.name === "NotAllowedError" ? "denied" : "unsupported");
      }
    } finally {
      if (token !== this.startToken) this.releaseGraph(graph);
    }
  }

  handleFrame(data) {
    const hz = data?.hz ?? 0;
    const amp = data?.amp ?? data?.rms ?? 0;
    const frame = {
      beat: this.beatClock(),
      hz,
      amp,
      rms: data?.rms ?? amp,
      t: this.now(),
    };
    if (typeof data?.confidence === "number" && Number.isFinite(data.confidence)) {
      frame.confidence = data.confidence;
    }
    if (amp < 0.01 || !(hz > 40 && hz < 2000)) {
      this.silentFrames += 1;
      if (!this.holdSignal && this.silentFrames > 12 && this.state === "listening") {
        this.setState("no-signal");
      }
      this.onFrame(frame);
      return;
    }
    this.silentFrames = 0;
    if (this.state !== "listening") this.setState("listening");
    this.observations.push(frame);
    this.onFrame(frame);
  }

  stop() {
    this.startToken += 1;
    this.source = null;
    this.node = null;
    this.mute = null;
    this.stream = null;
    this.releaseGraph(this.graph);
    this.graph = null;
    this.ctx = null;
    this.ownsContext = false;
    if (this.state === "listening" || this.state === "no-signal" || this.state === "requesting") {
      this.setState("idle");
    }
  }
}

export function micCopy(state) {
  if (state === "interrupted") return "Microphone disconnected. Reconnect it, then record again.";
  if (state === "denied") return "Microphone blocked. Enable it in Safari settings to grade.";
  if (state === "unsupported") return "This browser cannot run pitch detection. Try iPad Safari.";
  if (state === "no-signal") return "No signal. Play closer to the mic, or use headphones for the backing.";
  if (state === "requesting") return "Asking for the microphone…";
  return "";
}
