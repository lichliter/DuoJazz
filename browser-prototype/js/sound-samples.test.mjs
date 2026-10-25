import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BASS_NOTES, PIANO_NOTES, allSampleEntries, nearestNote } from "./sound-samples.js";

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
});
