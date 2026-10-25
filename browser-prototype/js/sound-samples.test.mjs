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
