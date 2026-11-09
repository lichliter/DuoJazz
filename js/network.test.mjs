import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchWithTimeout, withTimeout } from './network.js';

test('stalled account startup times out while successful startup returns normally', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const pending = withTimeout(new Promise(() => {}));
  const rejected = assert.rejects(pending, /timed out/);
  t.mock.timers.tick(15000);
  await rejected;
  assert.equal(await withTimeout(Promise.resolve('ready')), 'ready');
});

test('network deadline remains active through response reading and preserves caller cancellation', async t => {
  let deadline, passedSignal;
  t.mock.method(AbortSignal, 'timeout', ms => {
    assert.equal(ms, 20000);
    deadline = new AbortController(); return deadline.signal;
  });
  t.mock.method(globalThis, 'fetch', async (_, init) => {
    passedSignal = init.signal;
    return { json: () => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason))) };
  });
  const original = new AbortController();
  const response = await fetchWithTimeout('https://example.test', { signal: original.signal });
  const reading = response.json();
  const rejected = assert.rejects(reading, /deadline/);
  deadline.abort(new Error('deadline'));
  await rejected;
  assert.equal(original.signal.aborted, false);
  await fetchWithTimeout('https://example.test', { signal: original.signal });
  original.abort(new Error('caller cancelled'));
  assert.equal(passedSignal.aborted, true);
  assert.equal(passedSignal.reason.message, 'caller cancelled');
});
