/**
 * Module-home dotted trail geometry.
 * Routes between record sleeves and stays out of caption boxes.
 */

export const PATH_SLOT_PCTS = [28, 50, 72];

const CAPTION_RESUME = 12;
const CAPTION_CLEAR = 8;

function round(n) {
  return Math.round(n * 10) / 10;
}

/**
 * Horizontal exit from a sleeve toward the next stop, past that sleeve's caption.
 * @param {{ cx: number, captionLeft?: number, captionRight?: number, halfW?: number }} from
 * @param {{ cx: number }} to
 */
export function trailExitX(from, to) {
  const dir = Math.sign(to.cx - from.cx) || -1;
  const toward = from.cx + (to.cx - from.cx) * 0.68;
  const pad = 16;
  const past = dir > 0
    ? (from.captionRight ?? from.cx + (from.halfW ?? 0)) + pad
    : (from.captionLeft ?? from.cx - (from.halfW ?? 0)) - pad;
  return dir > 0
    ? Math.min(Math.max(toward, past), to.cx)
    : Math.max(Math.min(toward, past), to.cx);
}

export function xClearsCaption(from, x) {
  if (from.captionLeft == null || from.captionRight == null) return true;
  return x <= from.captionLeft - CAPTION_CLEAR || x >= from.captionRight + CAPTION_CLEAR;
}

function sleeveBottom(from) {
  return from.cy + (from.halfH ?? 0);
}

function aboveCaption(from) {
  if (from.captionTop == null) return sleeveBottom(from);
  return from.captionTop - 6;
}

function belowCaption(from) {
  if (from.captionBottom == null) return sleeveBottom(from) + CAPTION_RESUME;
  return from.captionBottom + CAPTION_RESUME;
}

function curveTo(fromX, fromY, to) {
  const midY = (fromY + to.cy) / 2;
  return { type: "C", x1: fromX, y1: midY, x2: to.cx, y2: midY, x: to.cx, y: to.cy };
}

/**
 * Drop to just above the caption, skip it, resume below, then curve.
 * Used on stacked phone sleeves and for the 03 → end-cap connector.
 */
function gappedCurve(segs, from, to) {
  const topY = Math.min(aboveCaption(from), sleeveBottom(from));
  const bottomY = belowCaption(from);
  segs.push({ type: "L", x: from.cx, y: topY });
  segs.push({ type: "M", x: from.cx, y: bottomY });
  segs.push(curveTo(from.cx, bottomY, to));
}

function windingCurve(segs, from, to) {
  const exitX = trailExitX(from, to);
  const fromBottom = from.captionBottom ?? sleeveBottom(from);
  const toTop = to.cy - (to.halfH ?? 0);
  const room = toTop - fromBottom;
  const gapY = fromBottom + Math.max(10, room > 0 ? room * 0.4 : 10);
  const midY = (gapY + to.cy) / 2;
  segs.push({ type: "L", x: exitX, y: from.cy });
  segs.push({ type: "L", x: exitX, y: gapY });
  segs.push({ type: "C", x1: exitX, y1: midY, x2: to.cx, y2: midY, x: to.cx, y: to.cy });
}

function copyStop(to) {
  return {
    cx: to.cx,
    cy: to.cy,
    halfW: to.halfW ?? 0,
    halfH: to.halfH ?? 0,
    captionLeft: to.captionLeft,
    captionRight: to.captionRight,
    captionTop: to.captionTop,
    captionBottom: to.captionBottom ?? to.cy,
  };
}

/**
 * @param {Array<{ cx: number, cy: number, halfW?: number, halfH?: number, captionTop?: number, captionBottom?: number, captionLeft?: number, captionRight?: number }>} sleeves
 * @param {{ cx: number, cy: number } | null} end
 */
export function trailSegments(sleeves, end = null) {
  if (!sleeves.length) return [];
  const segs = [{ type: "M", x: sleeves[0].cx, y: sleeves[0].cy }];
  const stops = end ? [...sleeves.slice(1), end] : sleeves.slice(1);
  let from = sleeves[0];
  stops.forEach((to, index) => {
    const toEndCap = Boolean(end) && index === stops.length - 1;
    const exitX = trailExitX(from, to);
    if (toEndCap || !xClearsCaption(from, exitX)) gappedCurve(segs, from, to);
    else windingCurve(segs, from, to);
    from = copyStop(to);
  });
  return segs;
}

export function trailPathD(segments) {
  return segments.map((seg) => {
    if (seg.type === "M") return `M ${round(seg.x)} ${round(seg.y)}`;
    if (seg.type === "L") return `L ${round(seg.x)} ${round(seg.y)}`;
    return `C ${round(seg.x1)} ${round(seg.y1)}, ${round(seg.x2)} ${round(seg.y2)}, ${round(seg.x)} ${round(seg.y)}`;
  }).join(" ");
}

export function sleeveTrailPath(sleeves, end = null) {
  return trailPathD(trailSegments(sleeves, end));
}

export function captionRect(sleeve) {
  return {
    left: sleeve.captionLeft,
    right: sleeve.captionRight,
    top: sleeve.captionTop,
    bottom: sleeve.captionBottom,
  };
}

export function pointInRect(point, rect, inset = 1) {
  return point.x > rect.left + inset
    && point.x < rect.right - inset
    && point.y > rect.top + inset
    && point.y < rect.bottom - inset;
}

function cubicPoint(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}

/** Dense samples along the constructed trail, for caption-collision tests. */
export function sampleTrail(segments, steps = 12) {
  const points = [];
  let cur = { x: 0, y: 0 };
  for (const seg of segments) {
    if (seg.type === "M") {
      cur = { x: seg.x, y: seg.y };
      points.push(cur);
      continue;
    }
    if (seg.type === "L") {
      for (let i = 1; i <= steps; i += 1) {
        const t = i / steps;
        points.push({
          x: cur.x + (seg.x - cur.x) * t,
          y: cur.y + (seg.y - cur.y) * t,
        });
      }
      cur = { x: seg.x, y: seg.y };
      continue;
    }
    const c1 = { x: seg.x1, y: seg.y1 };
    const c2 = { x: seg.x2, y: seg.y2 };
    const end = { x: seg.x, y: seg.y };
    for (let i = 1; i <= steps; i += 1) {
      points.push(cubicPoint(cur, c1, c2, end, i / steps));
    }
    cur = end;
  }
  return points;
}
