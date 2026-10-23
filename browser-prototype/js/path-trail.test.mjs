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
  xClearsCaption,
} from "./path-trail.js";

function sleeveAt(pct, cy, width = 1000, size = 240, captionHalf = null) {
  const cx = width * (pct / 100);
  const half = size / 2;
  const capHalf = captionHalf ?? half - 8;
  const captionTop = cy + half + 6;
  const captionBottom = captionTop + 36;
  return {
    cx,
    cy,
    halfW: half,
    halfH: half,
    captionTop,
    captionBottom,
    captionLeft: cx - capHalf,
    captionRight: cx + capHalf,
  };
}

const ipadSleeves = [
  sleeveAt(28, 160),
  sleeveAt(50, 500),
  sleeveAt(72, 840),
];
const endCap = { cx: 500, cy: 1040 };

const phoneSleeves = [
  sleeveAt(50, 140, 375, 124, 100),
  sleeveAt(50, 360, 375, 124, 100),
  sleeveAt(50, 580, 375, 124, 100),
];
const phoneEnd = { cx: 187.5, cy: 760 };

function assertCaptionsClear(sleeves, end) {
  const segs = trailSegments(sleeves, end);
  const samples = sampleTrail(segs, 16);
  assert.equal(samples.length > 20, true);
  for (const sleeve of sleeves) {
    const caption = captionRect(sleeve);
    for (const point of samples) {
      assert.equal(
        pointInRect(point, caption, 0.5),
        false,
        `trail hit caption at ${point.x.toFixed(1)},${point.y.toFixed(1)}`,
      );
    }
  }
  return segs;
}

test("path slots sit at 28, 50 and 72 percent", () => {
  assert.deepEqual(PATH_SLOT_PCTS, [28, 50, 72]);
});

test("exit x clears the origin sleeve caption toward the next stop", () => {
  const left = ipadSleeves[0];
  const center = ipadSleeves[1];
  const x = trailExitX(left, center);
  assert.equal(x > left.captionRight, true);
  assert.equal(x <= center.cx, true);
  assert.equal(xClearsCaption(left, x), true);
  const onward = trailExitX(ipadSleeves[1], ipadSleeves[2]);
  assert.equal(onward > ipadSleeves[1].captionRight, true);
});

test("constructed trail never crosses lesson captions", () => {
  const segs = assertCaptionsClear(ipadSleeves, endCap);
  assert.equal(sleeveTrailPath(ipadSleeves, endCap).startsWith("M "), true);
  assert.equal(segs.some((seg) => seg.type === "C"), true);
});

test("trail still clears short captions after the key-dot row is gone", () => {
  const short = ipadSleeves.map((sleeve) => ({
    ...sleeve,
    captionTop: sleeve.cy + sleeve.halfH + 6,
    captionBottom: sleeve.cy + sleeve.halfH + 22,
  }));
  assertCaptionsClear(short, endCap);
  assertCaptionsClear(
    phoneSleeves.map((sleeve) => ({
      ...sleeve,
      captionTop: sleeve.cy + sleeve.halfH + 4,
      captionBottom: sleeve.cy + sleeve.halfH + 20,
    })),
    phoneEnd,
  );
});

test("stacked phone trail skips captions instead of running through them", () => {
  assertCaptionsClear(phoneSleeves, phoneEnd);
  const segs = trailSegments(phoneSleeves, phoneEnd);
  const moves = segs.filter((seg) => seg.type === "M");
  assert.equal(moves.length >= 4, true);
});

test("end-cap connector starts below lesson 03's caption and ends on the cap", () => {
  const last = ipadSleeves[2];
  const segs = trailSegments(ipadSleeves, endCap);
  const lastMove = [...segs].reverse().find((seg) => seg.type === "M");
  assert.equal(lastMove.x, last.cx);
  assert.equal(lastMove.y > last.captionBottom, true);
  const curve = segs.at(-1);
  assert.equal(curve.type, "C");
  assert.equal(curve.x, endCap.cx);
  assert.equal(curve.y, endCap.cy);
  const sideExitAtSleeveCenter = segs.some((seg) => (
    seg.type === "L" && seg.y === last.cy && seg.x !== last.cx
  ));
  assert.equal(sideExitAtSleeveCenter, false);
});

test("trail ends on the more-licks cap instead of running off the canvas", () => {
  const segs = trailSegments(ipadSleeves, endCap);
  const last = segs.at(-1);
  assert.equal(last.x, endCap.cx);
  assert.equal(last.y, endCap.cy);
});
