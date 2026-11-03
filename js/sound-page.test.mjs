import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "sound.html"), "utf8");

test("sound.html A/Bs Current, New (busy), and New-simple", () => {
  assert.match(html, /data-engine="current"/);
  assert.match(html, /data-engine="new"/);
  assert.match(html, /data-engine="new-simple"/);
  assert.match(html, /New \(busy\)/);
  assert.match(html, /New-simple/);
});
