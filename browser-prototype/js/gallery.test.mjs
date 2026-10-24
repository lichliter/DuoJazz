import test from "node:test";
import assert from "node:assert/strict";
import { abcForShot, galleryShots } from "./gallery.js";
import { getKey } from "./music.js";

test("gallery lists Learn keys, one standards lesson per module, a Play card, and three tune pages", () => {
  const shots = galleryShots();
  const ids = shots.map((shot) => shot.id);
  assert.equal(shots.filter((shot) => shot.id.startsWith("learn-")).length, 20);
  for (const lick of ["cmar", "emr", "gts", "bo", "hsr"]) {
    for (const key of ["C", "G", "Bb", "F#"]) {
      assert.equal(ids.includes(`learn-${lick}-${key}`), true, `learn-${lick}-${key}`);
    }
  }
  assert.deepEqual(
    shots.filter((shot) => shot.id.startsWith("standards-")).map((shot) => shot.id),
    ["standards-cmar", "standards-emr", "standards-gts", "standards-bo", "standards-hsr"],
  );
  assert.equal(ids.includes("play-billies"), true);
  assert.deepEqual(
    shots.filter((shot) => shot.id.startsWith("tune-")).map((shot) => shot.id),
    ["tune-st-thomas", "tune-four", "tune-attya"],
  );
  const gtsBb = shots.find((shot) => shot.id === "learn-gts-Bb");
  const abc = abcForShot(gtsBb);
  assert.match(abc, /K:Bb clef=bass/);
  assert.equal(getKey(gtsBb.keyId).id, "Bb");
});
