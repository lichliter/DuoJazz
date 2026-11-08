// Optional audio verification: requires ffmpeg on PATH.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { yinPitch } from '../js/sound-yin.js';
import { sampleRms } from '../js/melody-gain.js';

const sources = JSON.parse(readFileSync(new URL('../sound/recording-sources.json', import.meta.url)));
let worstCents = 0;
for (const note of sources.samples) {
  const file = fileURLToPath(new URL(`../sound/samples/${note.kind}/${note.name}.m4a`, import.meta.url));
  const bytes = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', '22050', '-f', 'f32le', '-']);
  const pcm = new Float32Array(bytes.buffer, bytes.byteOffset, bytes.length / 4);
  const measuredRms = Math.sqrt(pcm.slice(0, 5512).reduce((sum, value) => sum + value * value, 0) / 5512);
  assert.ok(Math.abs(measuredRms - sampleRms(note.kind, note.midi)) < 0.000002, `${file}: loudness table is stale`);
  const pitches = [0.08, 0.14, 0.22, 0.32, 0.45, 0.65].map(seconds => {
    const start = Math.floor(seconds * 22050);
    return yinPitch(pcm.slice(start, start + 2048), 22050);
  }).filter(pitch => pitch.hz > 0 && pitch.confidence > 0.85)
    .map(pitch => 69 + 12 * Math.log2(pitch.hz / 440)).sort((a, b) => a - b);
  assert.ok(pitches.length >= 3, `${file}: insufficient stable pitch`);
  const cents = Math.abs((pitches[Math.floor(pitches.length / 2)] - note.midi) * 100);
  assert.ok(cents < 25, `${file}: ${cents.toFixed(1)} cents off target`);
  worstCents = Math.max(worstCents, cents);
}
console.log(`${sources.samples.length} samples: tuning within ${worstCents.toFixed(1)} cents, loudness calibration verified.`);
