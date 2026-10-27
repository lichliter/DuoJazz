/**
 * YIN pitch detector shared by the sound-page grade check and Node tests.
 * Same threshold and window idea as pitch-worklet.js, without AudioWorklet.
 */

export const YIN_THRESHOLD = 0.15;

export function rms(buf) {
  let sum = 0;
  for (let i = 0; i < buf.length; i += 1) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

/** YIN period estimate. Confidence is 1 − d[tau] at the chosen lag. */
export function yinPitch(buf, sampleRate) {
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

export function yinFrequency(buf, sampleRate) {
  return yinPitch(buf, sampleRate).hz;
}

export function collectPitchTrack(pcm, sampleRate, tempo, { hop = 1024, window = 2048 } = {}) {
  const beatDur = 60 / tempo;
  const observations = [];
  for (let i = 0; i + window <= pcm.length; i += hop) {
    const frame = pcm.subarray(i, i + window);
    const amp = rms(frame);
    const hz = amp > 0.008 ? yinFrequency(frame, sampleRate) : 0;
    observations.push({ beat: i / sampleRate / beatDur, hz, amp });
  }
  return observations;
}

export function hzFromMidi(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function addTone(pcm, sampleRate, { midi, start, duration, amp = 0.2, harmonics = [1] }) {
  const hz = hzFromMidi(midi);
  const i0 = Math.max(0, Math.floor(start * sampleRate));
  const n = Math.max(1, Math.floor(duration * sampleRate));
  for (let i = 0; i < n && i0 + i < pcm.length; i += 1) {
    const t = i / sampleRate;
    const env = Math.min(1, t / 0.01) * Math.min(1, (duration - t) / 0.04);
    let s = 0;
    for (let h = 0; h < harmonics.length; h += 1) {
      s += Math.sin(2 * Math.PI * hz * harmonics[h] * t) * (harmonics[h] === 1 ? 1 : 0.35 / harmonics[h]);
    }
    pcm[i0 + i] += s * amp * env;
  }
}

export function addNoiseBurst(pcm, sampleRate, { start, duration, amp = 0.04, highpass = 0 }) {
  const i0 = Math.max(0, Math.floor(start * sampleRate));
  const n = Math.max(1, Math.floor(duration * sampleRate));
  let prev = 0;
  for (let i = 0; i < n && i0 + i < pcm.length; i += 1) {
    const env = 1 - i / n;
    const white = Math.random() * 2 - 1;
    const hp = white - prev;
    prev = white;
    pcm[i0 + i] += (highpass ? hp : white) * amp * env;
  }
}
