/**
 * YIN pitch detector for iPad Safari AudioWorklet.
 * Runs whenever the frame is above the absolute floor and posts
 * { hz, amp, rms, confidence } with confidence = 1 - d[tau].
 */
const YIN_THRESHOLD = 0.15;
const YIN_RMS_FLOOR = 0.0015;
const MIN_PITCH_HZ = 38;

function rms(buf) {
  let sum = 0;
  for (let i = 0; i < buf.length; i += 1) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

function yinPitch(buf, sampleRate, d) {
  const n = buf.length;
  const half = n >> 1;
  if (half < 4 || !(sampleRate > 0)) return { hz: 0, confidence: 0 };
  const minTau = Math.max(2, Math.floor(sampleRate / 2200));
  const maxTau = half;
  d[0] = 1;
  let running = 0;
  let tau = -1;
  let best = minTau;
  // Fuse difference + cumulative mean normalization and exit on the first valley
  // below YIN_THRESHOLD so common horn pitches skip 60–85% of the lag scan.
  for (let lag = 1; lag < maxTau; lag += 1) {
    let sum = 0;
    for (let i = 0; i < half; i += 1) {
      const delta = buf[i] - buf[i + lag];
      sum += delta * delta;
    }
    running += sum;
    const cmndf = running > 0 ? (sum * lag) / running : 1;
    d[lag] = cmndf;
    if (lag >= minTau && cmndf < d[best]) best = lag;
    if (tau >= 0) {
      if (cmndf < d[tau]) {
        tau = lag;
      } else {
        break;
      }
    } else if (lag >= minTau && cmndf < YIN_THRESHOLD) {
      tau = lag;
    }
  }
  if (tau < 0 || tau >= maxTau - 1) {
    const confidence = Math.max(0, Math.min(1, 1 - d[best]));
    return { hz: 0, confidence };
  }
  const x0 = tau - 1;
  const x2 = tau + 1;
  const s0 = d[x0];
  const s1 = d[tau];
  const s2 = d[x2];
  const denom = 2 * s1 - s2 - s0;
  const better = denom ? tau + (s2 - s0) / (2 * denom) : tau;
  const confidence = Math.max(0, Math.min(1, 1 - d[tau]));
  if (!(better > 0)) return { hz: 0, confidence };
  return { hz: sampleRate / better, confidence };
}

class PitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    // Average adjacent samples to keep the bass lag search affordable at high
    // device rates. Two periods at the pitch floor fit at every input rate.
    this.samplesPerPoint = Math.max(1, Math.round(sampleRate / 24000));
    this.analysisRate = sampleRate / this.samplesPerPoint;
    this.buffer = new Float32Array(2 * (Math.ceil(this.analysisRate / MIN_PITCH_HZ) + 2));
    this.difference = new Float32Array(this.buffer.length >> 1);
    this.sampleSum = 0;
    this.sampleCount = 0;
    this.offset = 0;
    this.hop = Math.round(this.analysisRate * 1024 / 48000);
    this.stopped = false;
    this.port.onmessage = event => {
      if (event.data === 'stop') this.stopped = true;
    };
  }

  process(inputs) {
    if (this.stopped) return false;
    const channel = inputs[0] && inputs[0][0];
    if (!channel || !channel.length) return true;
    for (let i = 0; i < channel.length; i += 1) {
      this.sampleSum += channel[i];
      this.sampleCount += 1;
      if (this.sampleCount < this.samplesPerPoint) continue;
      this.buffer[this.offset++] = this.sampleSum / this.sampleCount;
      this.sampleCount = 0;
      this.sampleSum = 0;
      if (this.offset >= this.buffer.length) {
        const amp = rms(this.buffer);
        let hz = 0;
        let confidence = 0;
        if (amp > YIN_RMS_FLOOR) {
          const pitch = yinPitch(this.buffer, this.analysisRate, this.difference);
          hz = pitch.hz;
          confidence = pitch.confidence;
        }
        const audioTime = (currentFrame + i + 1 - this.buffer.length * this.samplesPerPoint / 2) / sampleRate;
        this.port.postMessage({ hz, amp, rms: amp, confidence, audioTime });
        this.buffer.copyWithin(0, this.hop);
        this.offset = this.buffer.length - this.hop;
      }
    }
    return true;
  }
}

registerProcessor("duojazz-pitch", PitchProcessor);
