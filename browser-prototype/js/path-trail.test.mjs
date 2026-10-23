import test from "node:test";
import assert from "node:assert/strict";
import {
  PATH_SLOT_PCTS,
  trailExitX,
  trailSegments,
  sleeveTrailPath,
  captionRect,
  pointInRect,
  sampleTrail,
} from "./path-trail.js";

function sleeveAt(pct, cy, width = 1000) {
  const size = 240;
  const cx = width * (pct / 100);
  const half = size / 2;
  const captionTop = cy + half + 6;
  const captionBottom = captionTop + 36;
  return {
    cx,
    cy,
    halfW: half,
    halfH: half,
    captionTop,
    captionBottom,
    captionLeft: cx - half + 8,
    captionRight: cx + half - 8,
  };
}

const ipadSleeves = [
  sleeveAt(28, 160),
  sleeveAt(50, 500),
  sleeveAt(72, 840),
];
const endCap = { cx: 500, cy: 1040 };

test("path slots sit at 28, 50 and 72 percent", () => {
  assert.deepEqual(PATH_SLOT_PCTS, [28, 50, 72]);
});

test("exit x clears the origin sleeve caption toward the next stop", () => {
  const left = ipadSleeves[0];
  const center = ipadSleeves[1];
  const x = trailExitX(left, center);
  assert.equal(x > left.captionRight, true);
  assert.equal(x <= center.cx, true);
  const back = trailExitX(ipadSleeves[2], endCap);
  assert.equal(back < ipadSleeves[2].captionLeft, true);
});

test("constructed trail never crosses lesson captions or key-dot rows", () => {
  const segs = trailSegments(ipadSleeves, endCap);
  assert.equal(sleeveTrailPath(ipadSleeves, endCap).startsWith("M "), true);
  const samples = sampleTrail(segs, 16);
  assert.equal(samples.length > 20, true);
  for (const sleeve of ipadSleeves) {
    const caption = captionRect(sleeve);
    for (const point of samples) {
      assert.equal(
        pointInRect(point, caption, 0.5),
        false,
        `trail hit caption at ${point.x.toFixed(1)},${point.y.toFixed(1)}`,
      );
    }
  }
});

test("trail ends on the more-licks cap instead of running off the canvas", () => {
  const segs = trailSegments(ipadSleeves, endCap);
  const last = segs.at(-1);
  assert.equal(last.x, endCap.cx);
  assert.equal(last.y, endCap.cy);
});
