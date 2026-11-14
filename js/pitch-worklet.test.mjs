import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('./pitch-worklet.js', import.meta.url), 'utf8');
function processor(sampleRate = 48000) {
  let Processor;
  vm.runInNewContext(source, {
    sampleRate,
    AudioWorkletProcessor: class { constructor() { this.port = { postMessage() {} }; } },
    registerProcessor(_, value) { Processor = value; },
  });
  return new Processor();
}
test('stopped microphone worklets release their processing lifetime', () => {
  const worklet = processor();
  assert.equal(worklet.process([]), true);
  assert.equal(typeof worklet.port.onmessage, 'function');
  worklet.port.onmessage({ data: 'stop' });
  assert.equal(worklet.process([]), false);
});
test('worklet detects successive pitches without stale difference-buffer values', () => {
  for (const sampleRate of [44100, 48000]) {
    const worklet = processor(sampleRate);
    let frame;
    worklet.port.postMessage = value => { frame = value; };
    for (const hz of [110, 440, 220, 880, 0, 330]) {
      const input = Float32Array.from({ length: 4096 }, (_, i) => hz ? 0.25 * Math.sin(2 * Math.PI * hz * i / sampleRate) : 0);
      assert.equal(worklet.process([[input]]), true);
      if (hz) {
        assert.ok(Math.abs(1200 * Math.log2(frame.hz / hz)) < 5, `${sampleRate}: ${hz} heard ${frame.hz}`);
        assert.ok(frame.confidence > 0.95);
      } else assert.equal(frame.hz, 0);
    }
  }
});
