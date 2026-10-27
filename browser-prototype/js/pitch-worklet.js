/**
 * YIN pitch detector for iPad Safari AudioWorklet.
 * Runs whenever the frame is above the absolute floor and posts
 * { hz, amp, rms, confidence } with confidence = 1 - d[tau].
 */
const YIN_THRESHOLD = 0.15;
const YIN_RMS_FLOOR = 0.0015;

function rms(buf) {
  let sum = 0;
  for (let i = 0; i < buf.length; i += 1) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

function yinPitch(buf, sampleRate) {
  const n = buf.length;
  const half = n >> 1;
  if (half < 4 || !(sampleRate > 0)) return { hz: 0, confidence: 0 };
  const d = new Float32Array(half);
  for (let tau = 1; tau < half; tau += 1) {
    let sum = 0;
    for (let i = 0; i < half; i += 1) {
      const delta = buf[i] - buf[i + tau];
      sum += delta * delta;
    }
    d[tau] = sum;
  }
  d[0] = 1;
  let running = 0;
  for (let tau = 1; tau < half; tau += 1) {
    running += d[tau];
    d[tau] = running > 0 ? (d[tau] * tau) / running : 1;
  }
  let tau = -1;
  for (let i = 2; i < half; i += 1) {
    if (d[i] < YIN_THRESHOLD) {
      tau = i;
      while (tau + 1 < half && d[tau + 1] < d[tau]) tau += 1;
      break;
    }
  }
  if (tau < 0 || tau >= half - 1) {
    let best = 2;
    for (let i = 3; i < half; i += 1) if (d[i] < d[best]) best = i;
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
    this.buffer = new Float32Array(2048);
    this.offset = 0;
    this.hop = 1024;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel || !channel.length) return true;
    let i = 0;
    while (i < channel.length) {
      const room = this.buffer.length - this.offset;
      const take = Math.min(room, channel.length - i);
      this.buffer.set(channel.subarray(i, i + take), this.offset);
      this.offset += take;
      i += take;
      if (this.offset >= this.buffer.length) {
        const amp = rms(this.buffer);
        let hz = 0;
        let confidence = 0;
        if (amp > YIN_RMS_FLOOR) {
          const pitch = yinPitch(this.buffer, sampleRate);
          hz = pitch.hz;
          confidence = pitch.confidence;
        }
        this.port.postMessage({ hz, amp, rms: amp, confidence });
        this.buffer.copyWithin(0, this.hop);
        this.offset = this.buffer.length - this.hop;
      }
    }
    return true;
  }
}

registerProcessor("duojazz-pitch", PitchProcessor);
