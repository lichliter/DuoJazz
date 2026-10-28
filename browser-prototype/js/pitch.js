/**
 * Microphone + AudioWorklet pitch monitor.
 * iPad Safari: start only after a user gesture, same-origin worklet, silent tap to keep the graph alive.
 */

const WORKLET_URL = new URL("./pitch-worklet.js?v=119", import.meta.url);

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
    for (const track of stream.getTracks?.() ?? []) track.stop();
  }

  async start(ctx, options = {}) {
    const processing = options.processing !== false;
    const sameGraph = this.isLive()
      && this.processing === processing
      && this.ctx
      && (!ctx || ctx === this.ctx);
    if (sameGraph) {
      this.reset();
      if (this.ctx.state === "suspended") await this.ctx.resume();
      if (this.state !== "listening") this.setState("listening");
      return;
    }
    this.stop();
    const token = this.startToken;
    this.processing = processing;
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        this.setState("unsupported");
        return;
      }
      this.ctx = new Ctx();
      this.ownsContext = true;
    } else {
      this.ctx = ctx;
      this.ownsContext = false;
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    if (token !== this.startToken) return;
    if (typeof this.ctx.audioWorklet?.addModule !== "function") {
      this.setState("unsupported");
      return;
    }
    this.setState("requesting");
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: processing ? VOICE_MIC_CONSTRAINTS : RAPID_MIC_CONSTRAINTS,
      });
    } catch (error) {
      if (token !== this.startToken) return;
      this.setState(error?.name === "NotAllowedError" ? "denied" : "unsupported");
      return;
    }
    if (token !== this.startToken) {
      this.discardStream(stream);
      return;
    }
    this.stream = stream;
    try {
      await this.ctx.audioWorklet.addModule(WORKLET_URL);
      if (token !== this.startToken) return;
      this.source = this.ctx.createMediaStreamSource(this.stream);
      this.node = new AudioWorkletNode(this.ctx, "duojazz-pitch");
      this.mute = this.ctx.createGain();
      this.mute.gain.value = 0;
      this.source.connect(this.node);
      this.node.connect(this.mute);
      this.mute.connect(this.ctx.destination);
      this.node.port.onmessage = (event) => this.handleFrame(event.data);
      if (token !== this.startToken) return;
      this.setState("listening");
    } catch {
      if (token === this.startToken) this.setState("unsupported");
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
    try {
      this.node?.port.postMessage("stop");
    } catch {
      /* ignore */
    }
    try {
      this.source?.disconnect();
      this.node?.disconnect();
      this.mute?.disconnect();
    } catch {
      /* ignore */
    }
    this.source = null;
    this.node = null;
    this.mute = null;
    if (this.stream) {
      for (const track of this.stream.getTracks()) track.stop();
      this.stream = null;
    }
    if (this.ownsContext && this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    if (this.state === "listening" || this.state === "no-signal" || this.state === "requesting") {
      this.setState("idle");
    }
  }
}

export function micCopy(state) {
  if (state === "denied") return "Microphone blocked. Enable it in Safari settings to grade.";
  if (state === "unsupported") return "This browser cannot run pitch detection. Try iPad Safari.";
  if (state === "no-signal") return "No signal. Play closer to the mic, or use headphones for the backing.";
  if (state === "requesting") return "Asking for the microphone…";
  return "";
}
