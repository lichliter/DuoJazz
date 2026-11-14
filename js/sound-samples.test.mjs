import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BASS_NOTES,
  PIANO_NOTES,
  TRUMPET_NOTES,
  allSampleEntries,
  loadEntriesFor,
  nearestNote,
} from "./sound-samples.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "sound/manifest.json"), "utf8"));

test("sample pack stays under 10MB and lists every file", () => {
  assert.ok(manifest.totalBytes < 10 * 1024 * 1024);
  assert.ok(manifest.totalBytes > 100 * 1024);
  assert.equal(manifest.files.length, allSampleEntries().length);
  for (const file of manifest.files) {
    const bytes = readFileSync(join(root, "sound/samples", file.path)).byteLength;
    assert.equal(bytes, file.bytes);
    assert.match(file.path, /\.m4a$/);
  }
});

test("nearest-note pitching stays within a minor third of a real sample", () => {
  const c4 = nearestNote(PIANO_NOTES, 60);
  assert.equal(c4.midi, 60);
  assert.equal(c4.playbackRate, 1);
  const b3 = nearestNote(PIANO_NOTES, 59);
  assert.ok(Math.abs(b3.midi - 59) <= 3);
  const lowE = nearestNote(BASS_NOTES, 28);
  assert.equal(lowE.midi, 28);
  const writtenD = nearestNote(TRUMPET_NOTES, 62);
  assert.ok(Math.abs(writtenD.midi - 62) <= 3);
});

test("lazy load pulls backing plus only the selected instrument", () => {
  const piano = loadEntriesFor("piano");
  const trumpet = loadEntriesFor("trumpet");
  assert.ok(piano.every((entry) => entry.kind === "piano" || entry.kind === "bass" || entry.kind === "drum"));
  assert.ok(trumpet.some((entry) => entry.kind === "trumpet"));
  assert.equal(trumpet.some((entry) => entry.kind === "guitar"), false);
  assert.ok(trumpet.length > piano.length);
  assert.ok(allSampleEntries().length > trumpet.length);
});

const { SampleLibrary } = await import('./sound-samples.js');
const context = { decodeAudioData: async () => ({ decoded: true }) };
const sampleResponse = () => new Response(new Uint8Array([1, 2, 3]));

for (const failure of ['network', 'invalid-json']) {
  test(`sample playback works when optional manifest metadata fails: ${failure}`, async t => {
    t.mock.method(globalThis, 'fetch', async url => {
      if (String(url).endsWith('manifest.json')) {
        if (failure === 'network') throw Error('offline metadata');
        return new Response('not json');
      }
      return sampleResponse();
    });
    const library = await new SampleLibrary().load(context);
    assert.equal(library.backingReady, true);
    assert.equal(library.packBytes, 0);
  });
}

test('unreadable sample cache falls back to bounded network requests', async t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'caches');
  t.after(() => { if (original) Object.defineProperty(globalThis, 'caches', original); else delete globalThis.caches; });
  globalThis.caches = { open: async () => ({
    match: async () => { throw Error('cache unavailable'); }, put: async () => {},
  }) };
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.ok(init?.signal instanceof AbortSignal, 'downloads must have a deadline');
    return String(url).endsWith('manifest.json') ? Response.json({}) : sampleResponse();
  });
  assert.equal((await new SampleLibrary().load(context)).backingReady, true);
});

test('a failed load settles all active workers before allowing a retry', async t => {
  let release, downloads = 0;
  const gate = new Promise(resolve => { release = resolve; });
  t.mock.method(globalThis, 'fetch', async url => {
    if (String(url).endsWith('manifest.json')) return Response.json({});
    downloads++;
    if (downloads === 1) throw Error('sample failed');
    await gate;
    return sampleResponse();
  });
  const library = new SampleLibrary();
  let settled = false;
  const loading = library.load(context).finally(() => { settled = true; });
  const rejected = assert.rejects(loading, /sample failed/);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false);
  release();
  await rejected;
  assert.equal(downloads, 4, 'failed workers must not drain the rest of the queue');
  await library.load(context);
  assert.equal(library.backingReady, true);
});

test('a corrupt cached sample is evicted so the next attempt can recover', async t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'caches');
  t.after(() => { if (original) Object.defineProperty(globalThis, 'caches', original); else delete globalThis.caches; });
  const badUrl = loadEntriesFor()[0].url;
  const cache = new Map([[badUrl, new Response(new Uint8Array([0]))]]);
  globalThis.caches = { open: async () => ({
    match: async url => cache.get(url)?.clone(),
    put: async (url, response) => cache.set(url, response),
    delete: async url => cache.delete(url),
  }) };
  t.mock.method(globalThis, 'fetch', async url => String(url).endsWith('manifest.json') ? Response.json({}) : sampleResponse());
  const decoder = { decodeAudioData: async bytes => {
    if (new Uint8Array(bytes)[0] === 0) throw Error('corrupt audio');
    return {};
  } };
  const library = new SampleLibrary();
  await assert.rejects(library.load(decoder), /corrupt audio/);
  assert.equal(cache.has(badUrl), false);
  await library.load(decoder);
  assert.equal(library.backingReady, true);
});
