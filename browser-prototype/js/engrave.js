/**
 * Shared abcjs engraving for the session paper and the dev gallery.
 * Layout numbers come from lesson.notationLayout; ABC comes from music.js.
 */

import { jazzChordRootParts } from "./music.js";
import {
  CUE_LANE_GAP,
  accidentalMinGap,
  chorusStaffFit,
  cueLaneY,
  fullSystemScaleX,
  nextEngravingWidth,
  nextStaffsep,
  slashStrokeBox,
} from "./lesson.js";

function isCueNode(el) {
  return Boolean(
    el.classList?.contains("abcjs-chord")
    || el.classList?.contains("abcjs-annotation")
    || el.closest?.(".abcjs-chord, .abcjs-annotation"),
  );
}

function hideNoteGlyphs(el, keepContainer) {
  if (isCueNode(el)) return;
  const kids = [...el.children];
  if (keepContainer || kids.some((child) => isCueNode(child) || child.querySelector?.(".abcjs-chord, .abcjs-annotation"))) {
    kids.forEach((child) => hideNoteGlyphs(child, false));
    return;
  }
  el.setAttribute("opacity", "0");
}

function svgCssToUser(svg, cssPx) {
  const ctm = svg?.getScreenCTM?.();
  const k = ctm && Math.abs(ctm.d) > 0.05 ? Math.abs(ctm.d) : 1;
  return cssPx / k;
}

function nodeBox(node) {
  if (!node) return null;
  if (node.nodeType === Node.ELEMENT_NODE) return node.getBoundingClientRect();
  const range = document.createRange();
  range.selectNodeContents(node);
  return range.getBoundingClientRect();
}

function shiftDx(el, deltaEm) {
  const current = Number.parseFloat(el.getAttribute("dx") || "0");
  el.setAttribute("dx", `${current + deltaEm}em`);
}

function closeGap(rightEl, leftNode, fontPx, maxGap = 0.5) {
  if (!rightEl || !leftNode || !fontPx) return;
  for (let i = 0; i < 10; i += 1) {
    const leftBox = nodeBox(leftNode);
    const rightBox = rightEl.getBoundingClientRect();
    if (!leftBox || !rightBox.width) break;
    const gap = rightBox.left - leftBox.right;
    if (gap <= maxGap) break;
    shiftDx(rightEl, -gap / fontPx);
  }
}

function tightenChordSymbols(target) {
  const svgNS = "http://www.w3.org/2000/svg";
  for (const chord of target.querySelectorAll(".abcjs-chord")) {
    const lines = [...chord.children].filter((el) => el.tagName?.toLowerCase() === "tspan");
    for (const line of lines) {
      const qualities = [...line.children].filter((el) => (
        el.tagName?.toLowerCase() === "tspan"
        && !el.classList.contains("abcjs-chord-root")
        && !el.classList.contains("abcjs-chord-accidental")
      ));
      let root = line.querySelector(".abcjs-chord-root");
      const textNode = [...line.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
      if (!root && textNode) {
        let raw = textNode.textContent.trim();
        for (const quality of qualities) {
          const stolen = (quality.textContent ?? "").match(/^([♭♯b#])(.*)$/u);
          if (stolen) {
            raw += stolen[1] === "b" ? "♭" : stolen[1] === "#" ? "♯" : stolen[1];
            quality.textContent = stolen[2];
          }
        }
        const parts = jazzChordRootParts(raw);
        root = document.createElementNS(svgNS, "tspan");
        root.classList.add("abcjs-chord-root");
        root.textContent = parts ? `${parts.letter}${parts.accidental}` : raw;
        root.style.letterSpacing = parts ? "-0.12em" : "0";
        textNode.replaceWith(root);
      }
      for (const quality of qualities) {
        quality.setAttribute("dx", "0.02em");
      }
      const quality = qualities.find((el) => el.isConnected);
      const fontPx = Number.parseFloat(window.getComputedStyle(chord).fontSize) || 16;
      if (quality) closeGap(quality, root ?? textNode, fontPx, 0.2);
    }
  }
}

export function restyleAnnotations(target, layout = {}) {
  const svg = target.querySelector("svg");
  const annUser = svgCssToUser(svg, layout.annotationPx ?? 15);
  const chordUser = svgCssToUser(svg, layout.chordCssPx ?? 18);
  for (const el of target.querySelectorAll(".abcjs-annotation")) {
    el.style.fontSize = `${annUser}px`;
    el.style.fontWeight = "700";
    el.style.opacity = "1";
    el.style.fontFamily = '"Source Sans 3", sans-serif';
  }
  for (const el of target.querySelectorAll(".abcjs-chord")) {
    el.style.fontSize = `${chordUser}px`;
    el.style.fontWeight = "700";
    el.style.fontFamily = '"Noto Sans", "Source Sans 3", sans-serif';
  }
  tightenChordSymbols(target);
}

function elementBox(el) {
  if (!el || typeof el.getBBox !== "function") return null;
  try {
    const box = el.getBBox();
    if (!box || (!box.width && !box.height && !box.x && !box.y)) return null;
    return box;
  } catch {
    return null;
  }
}

function classToken(el, prefix) {
  const cls = el?.getAttribute?.("class") || el?.className?.baseVal || "";
  const match = cls.match(new RegExp(`${prefix}(\\d+)`));
  return match ? match[1] : null;
}

function lineIndex(el) {
  return classToken(el, "abcjs-l");
}

function measureIndex(el) {
  return classToken(el, "abcjs-m");
}

function barsPerLineCount(layout, fallback = 4) {
  const n = Number(layout?.barsPerLine);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function restBeatsFromClass(rest) {
  const cls = rest?.getAttribute?.("class") || "";
  const match = cls.match(/abcjs-d(\d+)(?:-(\d+))?/);
  if (!match) return 1;
  const frac = match[2] ? Number(match[2]) / 10 ** match[2].length : 0;
  return (Number(match[1]) + frac) * 4;
}

function nearestStaffBox(el, staffs) {
  const box = elementBox(el);
  let best = null;
  let bestDist = Infinity;
  for (const staff of staffs) {
    const staffBox = elementBox(staff);
    if (!staffBox) continue;
    const cy = (box?.y ?? staffBox.y) + (box?.height ?? staffBox.height) / 2;
    const dist = Math.abs(cy - (staffBox.y + staffBox.height / 2));
    if (dist < bestDist) {
      bestDist = dist;
      best = staffBox;
    }
  }
  return best;
}

function isSpacerRest(rest, staffBox) {
  const glyph = rest.querySelector("path, ellipse");
  if (!glyph) return true;
  const box = elementBox(glyph);
  if (!box) return true;
  if (box.width < 0.6 && box.height < 0.6) return true;
  if (staffBox?.height > 4 && box.height > staffBox.height * 1.35) return true;
  return false;
}

function drawSlashOn(host, glyphBox, staffBox, layout = {}) {
  const ns = "http://www.w3.org/2000/svg";
  const stroke = slashStrokeBox(glyphBox, staffBox ?? glyphBox);
  const slash = document.createElementNS(ns, "line");
  slash.setAttribute("x1", String(stroke.x1));
  slash.setAttribute("y1", String(stroke.y1));
  slash.setAttribute("x2", String(stroke.x2));
  slash.setAttribute("y2", String(stroke.y2));
  slash.setAttribute("stroke", "#2b211a");
  slash.setAttribute("stroke-width", String(layout.slashStroke ?? 1.85));
  slash.setAttribute("stroke-linecap", "round");
  slash.setAttribute("opacity", "1");
  slash.classList.add("rhythm-slash");
  host.append(slash);
}

function visitTuneElems(tune, fn) {
  for (const line of tune?.lines ?? []) {
    for (const staff of line.staff ?? []) {
      for (const voice of staff.voices ?? []) {
        for (const el of voice) fn(el);
      }
    }
  }
}

function restBeatsFromElem(el) {
  if (el?.duration > 0) return el.duration * 4;
  return 1;
}

function restSvgNode(el) {
  const nodes = el?.abselem?.elemset ?? [];
  return nodes.find((node) => node.classList?.contains("abcjs-rest")) ?? nodes[0] ?? null;
}

function slashLane(abselem, beats, staffBox, barsPerLine) {
  const barWidth = staffBox.width / Math.max(1, barsPerLine);
  const mid = (abselem?.x ?? staffBox.x) + (abselem?.w ?? 0) / 2;
  const rel = mid - staffBox.x;
  const barIndex = Math.min(barsPerLine - 1, Math.max(0, Math.floor(rel / barWidth + 1e-6)));
  const barLeft = staffBox.x + barIndex * barWidth;
  const beatWidth = barWidth / 4;
  const count = Math.max(1, Math.round(beats));
  if (count >= 4) {
    return { x: barLeft, width: barWidth, count: 4 };
  }
  const inBar = rel - barIndex * barWidth;
  let startBeat = Math.round(inBar / beatWidth - count / 2);
  if (count === 2) startBeat = inBar >= barWidth / 2 ? 2 : 0;
  startBeat = Math.min(4 - count, Math.max(0, startBeat));
  return { x: barLeft + startBeat * beatWidth, width: count * beatWidth, count };
}

function drawBeatSlashes(host, lane, staffBox, layout) {
  for (let i = 0; i < lane.count; i += 1) {
    const slotW = lane.width / lane.count;
    const cx = lane.x + slotW * (i + 0.5);
    drawSlashOn(host, { x: cx - slotW * 0.2, y: staffBox.y, width: slotW * 0.4, height: staffBox.height }, staffBox, layout);
  }
}

function hideRestGlyph(rest) {
  hideNoteGlyphs(rest, true);
  for (const glyph of rest.querySelectorAll("path, ellipse")) {
    if (isCueNode(glyph)) continue;
    glyph.setAttribute("opacity", "0");
    glyph.style.display = "none";
  }
}

export function applyRhythmSlashes(target, keepLandingNotes = false, layout = {}, tune = null) {
  const svg = target.querySelector("svg");
  if (!svg) return;
  const staffs = [...target.querySelectorAll(".abcjs-staff")];
  const barsPerLine = barsPerLineCount(layout);
  const used = new Set();
  visitTuneElems(tune, (el) => {
    if (!el.rest || el.rest.type === "spacer") return;
    const node = restSvgNode(el);
    if (!node || used.has(node)) return;
    const staffBox = nearestStaffBox(node, staffs);
    if (!staffBox || isSpacerRest(node, staffBox)) return;
    used.add(node);
    hideRestGlyph(node);
    const lane = slashLane(el.abselem, restBeatsFromElem(el), staffBox, barsPerLine);
    drawBeatSlashes(node, lane, staffBox, layout);
  });
  for (const rest of target.querySelectorAll(".abcjs-rest")) {
    if (used.has(rest)) continue;
    const staffBox = nearestStaffBox(rest, staffs)
      || elementBox(target.querySelector(`.abcjs-staff.abcjs-l${lineIndex(rest) ?? "0"}`));
    if (isSpacerRest(rest, staffBox)) continue;
    const glyph = rest.querySelector("path, ellipse") ?? rest;
    const box = elementBox(glyph);
    if (!box || !staffBox) continue;
    hideRestGlyph(rest);
    const beats = restBeatsFromClass(rest);
    if (beats >= 1.5) {
      const lane = slashLane({ x: box.x, w: box.width }, beats, staffBox, barsPerLine);
      drawBeatSlashes(rest, lane, staffBox, layout);
    } else {
      drawSlashOn(rest, box, staffBox, layout);
    }
    used.add(rest);
  }
  if (!keepLandingNotes) {
    for (const note of target.querySelectorAll(".abcjs-note")) {
      const head = note.querySelector(".abcjs-notehead")
        ?? [...note.querySelectorAll("ellipse, path")].find((node) => !isCueNode(node));
      if (!head) continue;
      const box = elementBox(head);
      if (!box) continue;
      hideNoteGlyphs(note, true);
      drawSlashOn(note, box, nearestStaffBox(head, staffs) ?? nearestStaffBox(note, staffs), layout);
    }
  }
  for (const el of target.querySelectorAll(".abcjs-chord, .abcjs-annotation")) {
    el.style.opacity = "1";
    el.removeAttribute("opacity");
  }
  if (keepLandingNotes) hideOrphanBeams(target);
  restyleAnnotations(target, layout);
}

function hideOrphanBeams(target) {
  for (const beam of target.querySelectorAll(".abcjs-beam, .abcjs-beam-elem")) {
    const host = beam.closest("g") ?? beam.parentElement;
    const heads = [...(host?.querySelectorAll(".abcjs-notehead") ?? [])];
    const visible = heads.filter((head) => (
      head.getAttribute("opacity") !== "0"
      && head.style.display !== "none"
      && head.closest("[opacity='0']") == null
    ));
    if (visible.length >= 2) continue;
    beam.setAttribute("opacity", "0");
    beam.style.display = "none";
  }
  for (const note of target.querySelectorAll(".abcjs-note")) {
    const hidden = note.getAttribute("opacity") === "0"
      || note.querySelector(".abcjs-notehead[opacity='0']");
    if (!hidden) continue;
    for (const el of note.querySelectorAll(".abcjs-stem, .abcjs-beam, .abcjs-flag")) {
      el.setAttribute("opacity", "0");
      el.style.display = "none";
    }
  }
}

export function svgHasBowingMarks(target) {
  if (!target?.querySelectorAll) return false;
  for (const el of target.querySelectorAll("[class]")) {
    const cls = el.getAttribute("class") || "";
    if (/upbow|downbow|bowing/i.test(cls)) return true;
  }
  return false;
}

export function capCueText(text, barWidth, fontPx) {
  const width = Number(barWidth) || 0;
  const px = Number(fontPx) || 14;
  const maxChars = Math.max(4, Math.floor(width / Math.max(6, px * 0.58)));
  const value = String(text);
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(1, maxChars - 1))}…`;
}

function normalizeSlashChords(target) {
  for (const chord of target.querySelectorAll(".abcjs-chord")) {
    if (!(chord.textContent ?? "").includes("/")) continue;
    for (const tspan of chord.querySelectorAll("tspan")) {
      tspan.removeAttribute("dy");
      tspan.style.fontSize = "1em";
      tspan.style.baselineShift = "baseline";
    }
  }
}

function alignChordBaseline(target) {
  const staffs = [...target.querySelectorAll(".abcjs-staff")];
  const groups = new Map();
  for (const chord of target.querySelectorAll(".abcjs-chord")) {
    const line = lineIndex(chord);
    const staff = line != null
      ? elementBox(target.querySelector(`.abcjs-staff.abcjs-l${line}`))
      : nearestStaffBox(chord, staffs);
    const key = line ?? (staff ? `${Math.round(staff.y)}` : "none");
    const list = groups.get(key) ?? [];
    list.push(chord);
    groups.set(key, list);
  }
  for (const list of groups.values()) {
    const ys = list
      .map((chord) => Number.parseFloat(chord.getAttribute("y") || ""))
      .filter((y) => Number.isFinite(y));
    if (!ys.length) continue;
    const y = Math.min(...ys);
    for (const chord of list) chord.setAttribute("y", String(y));
  }
}

function addTranslateY(el, dy) {
  if (!el || !Number.isFinite(dy) || Math.abs(dy) < 0.5) return;
  const prev = el.getAttribute("transform") || "";
  el.setAttribute("transform", `translate(0 ${dy})${prev ? ` ${prev}` : ""}`);
}

function addTranslateX(el, dx) {
  if (!el || !Number.isFinite(dx) || Math.abs(dx) < 0.35) return;
  const prev = el.getAttribute("transform") || "";
  el.setAttribute("transform", `translate(${dx} 0)${prev ? ` ${prev}` : ""}`);
}

function engravingRoots(svg) {
  const fit = svg.querySelector("[data-staff-fit]");
  const host = fit ?? svg;
  return [...host.children].filter((el) => {
    const tag = el.tagName?.toLowerCase();
    return tag !== "defs" && tag !== "clippath" && tag !== "title";
  });
}

function expandViewBox(svg, extraBottom) {
  if (!svg || extraBottom < 1) return;
  const vb = svg.viewBox?.baseVal;
  if (!vb?.width) return;
  svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${vb.width} ${vb.height + extraBottom}`);
}

function systemLowestY(target, staffBox, line) {
  let bottom = staffBox.y + staffBox.height;
  const nodes = target.querySelectorAll(
    ".abcjs-stem, .abcjs-beam, .abcjs-beam-elem, .abcjs-notehead, .abcjs-flag",
  );
  for (const el of nodes) {
    const elLine = lineIndex(el);
    const box = elementBox(el);
    if (!box) continue;
    if (elLine != null && line != null && String(elLine) !== String(line)) continue;
    if (elLine == null) {
      if (box.y > staffBox.y + staffBox.height + 36) continue;
      if (box.y + box.height < staffBox.y - 24) continue;
    }
    // Ignore huge spacer/rest leftovers that would detach the cue lane.
    if (box.height > staffBox.height * 2.4) continue;
    bottom = Math.max(bottom, box.y + box.height);
  }
  return bottom;
}

function systemChordTop(target, line, staffBox) {
  let top = staffBox.y;
  for (const chord of target.querySelectorAll(".abcjs-chord")) {
    const chordLine = lineIndex(chord);
    if (chordLine != null && line != null && String(chordLine) !== String(line)) continue;
    const box = elementBox(chord);
    if (!box) continue;
    if (chordLine == null && Math.abs(box.y + box.height - staffBox.y) > 48) continue;
    top = Math.min(top, box.y);
  }
  return top;
}

function cueBottom(target, line) {
  let bottom = -Infinity;
  for (const cue of target.querySelectorAll(".abcjs-annotation")) {
    if (line != null && String(lineIndex(cue)) !== String(line)) continue;
    const box = elementBox(cue);
    if (box) bottom = Math.max(bottom, box.y + box.height);
  }
  return Number.isFinite(bottom) ? bottom : null;
}

function shiftElementsFrom(svg, y0, dy) {
  for (const el of engravingRoots(svg)) {
    const box = elementBox(el);
    if (!box) continue;
    if (box.y + box.height / 2 < y0) continue;
    addTranslateY(el, dy);
  }
}

function ensureSystemGap(target, layout = {}) {
  const svg = target.querySelector("svg");
  const staffs = [...target.querySelectorAll(".abcjs-staff")];
  if (!svg || staffs.length < 2) return;
  const needed = Math.max(12, (layout.annotationPx ?? 18) * 0.55);
  const systems = staffs
    .map((staff, index) => ({
      staff,
      box: elementBox(staff),
      line: lineIndex(staff) ?? String(index),
    }))
    .filter((item) => item.box)
    .sort((a, b) => a.box.y - b.box.y);
  let extra = 0;
  for (let i = 1; i < systems.length; i += 1) {
    const prev = systems[i - 1];
    const cur = systems[i];
    const laneBottom = cueBottom(target, prev.line)
      ?? cueLaneY(prev.box, systemLowestY(target, prev.box, prev.line));
    const chordTop = systemChordTop(target, cur.line, cur.box);
    const gap = chordTop - laneBottom;
    const missing = needed - gap;
    if (missing <= 1) continue;
    shiftElementsFrom(svg, cur.box.y - 24, missing);
    extra += missing;
    cur.box = elementBox(cur.staff) ?? cur.box;
  }
  if (extra > 0) expandViewBox(svg, extra + 8);
}

function ensureCuesInView(svg, cues) {
  let maxBottom = 0;
  for (const cue of cues) {
    const box = elementBox(cue);
    if (box) maxBottom = Math.max(maxBottom, box.y + box.height);
  }
  const vb = svg?.viewBox?.baseVal;
  if (!vb || maxBottom <= 0) return;
  const overflow = maxBottom - (vb.y + vb.height) + 10;
  if (overflow > 0) expandViewBox(svg, overflow);
}

function layoutCueLane(target, layout = {}) {
  const svg = target.querySelector("svg");
  if (!svg) return;
  const staffs = [...target.querySelectorAll(".abcjs-staff")];
  const barsPerLine = barsPerLineCount(layout);
  const cues = [...target.querySelectorAll(".abcjs-annotation")];
  const grouped = new Map();
  for (const cue of cues) {
    const line = lineIndex(cue);
    const staffBox = line != null
      ? elementBox(target.querySelector(`.abcjs-staff.abcjs-l${line}`))
      : nearestStaffBox(cue, staffs);
    if (!staffBox?.width) continue;
    const key = line ?? `${Math.round(staffBox.y)}`;
    const list = grouped.get(key) ?? [];
    list.push({ cue, staffBox, measure: measureIndex(cue), line });
    grouped.set(key, list);
  }
  const ns = "http://www.w3.org/2000/svg";
  for (const list of grouped.values()) {
    const staffBox = list[0].staffBox;
    const line = list[0].line;
    const measureCount = Math.max(
      barsPerLine,
      ...list.map((item) => (item.measure == null ? 0 : Number(item.measure) + 1)),
    );
    const barWidth = staffBox.width / Math.max(1, measureCount);
    if (!Number.isFinite(barWidth) || barWidth < 8) continue;
    const low = systemLowestY(target, staffBox, line);
    const laneY = cueLaneY(staffBox, low, CUE_LANE_GAP);
    const cueBoxes = list
      .map((item) => ({ ...item, box: elementBox(item.cue) }))
      .filter((item) => item.box)
      .sort((a, b) => {
        const am = a.measure == null ? a.box.x : Number(a.measure);
        const bm = b.measure == null ? b.box.x : Number(b.measure);
        return am - bm;
      });
    let baseline = laneY;
    for (let i = 0; i < cueBoxes.length; i += 1) {
      const item = cueBoxes[i];
      const measure = item.measure != null ? Number(item.measure) : Math.max(
        0,
        Math.min(measureCount - 1, Math.floor((item.box.x - staffBox.x) / barWidth + 1e-6)),
      );
      const nextMeasure = i + 1 < cueBoxes.length
        ? Number(cueBoxes[i + 1].measure ?? Math.floor((cueBoxes[i + 1].box.x - staffBox.x) / barWidth + 1e-6))
        : measureCount;
      const span = Math.max(1, nextMeasure - measure);
      const available = span * barWidth - 6;
      const barLeft = staffBox.x + measure * barWidth + 2;
      item.cue.style.transform = "";
      item.cue.removeAttribute("transform");
      item.cue.removeAttribute("clip-path");
      for (const tspan of item.cue.querySelectorAll("tspan")) {
        tspan.removeAttribute("dy");
        tspan.removeAttribute("dx");
      }
      const cueFontPx = Number.parseFloat(window.getComputedStyle(item.cue).fontSize) || 14;
      item.cue.setAttribute("dominant-baseline", "hanging");
      item.cue.setAttribute("text-anchor", "start");
      item.cue.setAttribute("x", String(barLeft));
      item.cue.setAttribute("y", String(laneY));
      const placed = elementBox(item.cue);
      if (placed && placed.y < low + 2) {
        item.cue.setAttribute("y", String(Number(item.cue.getAttribute("y")) + (low + 2 - placed.y)));
      }
      const after = elementBox(item.cue);
      if (after) baseline = Math.max(baseline, Number(item.cue.getAttribute("y")) || laneY);
      const next = capCueText(item.cue.textContent ?? "", available, cueFontPx);
      if (next !== item.cue.textContent) {
        const tspan = item.cue.querySelector("tspan") ?? item.cue;
        tspan.textContent = next;
      }
      const clipped = elementBox(item.cue);
      if (clipped && clipped.width > available) {
        const id = `cue-clip-${line ?? "x"}-${measure}`;
        let clip = svg.querySelector(`[id="${id}"]`);
        if (!clip) {
          clip = document.createElementNS(ns, "clipPath");
          clip.setAttribute("id", id);
          const rect = document.createElementNS(ns, "rect");
          rect.setAttribute("x", String(barLeft));
          rect.setAttribute("y", String(low));
          rect.setAttribute("width", String(available));
          rect.setAttribute("height", "56");
          clip.append(rect);
          svg.append(clip);
        }
        item.cue.setAttribute("clip-path", `url(#${id})`);
      }
    }
    for (const item of cueBoxes) {
      item.cue.setAttribute("y", String(Math.max(laneY, baseline)));
    }
  }
  ensureCuesInView(svg, cues);
  ensureSystemGap(target, layout);
}

function flattenTies(target) {
  for (const tie of target.querySelectorAll(".abcjs-slur, .abcjs-tie")) {
    const box = elementBox(tie);
    if (!box || box.height < 4) continue;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height;
    tie.setAttribute("transform", `translate(${cx} ${cy}) scale(1 0.42) translate(${-cx} ${-cy})`);
  }
}

function placeArticulations(target) {
  for (const note of target.querySelectorAll(".abcjs-note")) {
    const head = note.querySelector(".abcjs-notehead");
    const stem = note.querySelector(".abcjs-stem");
    if (!head) continue;
    const marks = [...note.querySelectorAll(".abcjs-decoration, .abcjs-articulation, .abcjs-script")];
    if (!marks.length) continue;
    const headBox = elementBox(head);
    const stemBox = stem ? elementBox(stem) : null;
    if (!headBox) continue;
    const stemUp = stemBox ? (stemBox.y + stemBox.height / 2) < (headBox.y + headBox.height / 2) : true;
    for (const mark of marks) {
      const box = elementBox(mark);
      if (!box) continue;
      const y = stemUp ? headBox.y + headBox.height + 1 : headBox.y - box.height - 1;
      mark.style.transform = `translateY(${y - box.y}px)`;
    }
  }
}

function systemMeasureCount(target, line) {
  const measures = new Set();
  for (const el of target.querySelectorAll("[class]")) {
    if (String(lineIndex(el) ?? "") !== String(line)) continue;
    const measure = measureIndex(el);
    if (measure != null) measures.add(measure);
  }
  return measures.size;
}

function systemWrapper(svg, line) {
  return svg.querySelector(`.abcjs-staff-wrapper.abcjs-l${line}`)
    ?? svg.querySelector(`.abcjs-staff.abcjs-l${line}`)?.parentElement
    ?? null;
}

function scaleSystemX(svg, line, anchor, scaleX) {
  const wrapper = systemWrapper(svg, line);
  if (!wrapper || wrapper.getAttribute("data-system-justify") != null) return;
  const prev = wrapper.getAttribute("transform") || "";
  wrapper.setAttribute("data-system-justify", String(line));
  wrapper.setAttribute(
    "transform",
    `translate(${anchor} 0) scale(${scaleX} 1) translate(${-anchor} 0)${prev ? ` ${prev}` : ""}`,
  );
}

export function justifyFullSystems(target, layout = {}) {
  const svg = target.querySelector("svg");
  if (!svg || svg.querySelector("[data-system-justify]")) return;
  const vb = svg.viewBox?.baseVal;
  if (!vb?.width) return;
  const barsPerLine = barsPerLineCount(layout);
  const padRight = layout.paddingright ?? 16;
  const staffwidth = Math.max(80, layout.staffwidth ?? vb.width);
  const targetRight = Math.max(80, staffwidth - padRight);
  const staffs = [...target.querySelectorAll(".abcjs-staff")];
  const systems = staffs
    .map((staff, index) => {
      const line = lineIndex(staff) ?? String(index);
      const box = elementBox(staff);
      if (!box) return null;
      return {
        line,
        box,
        measures: systemMeasureCount(target, line),
        right: box.x + box.width,
      };
    })
    .filter(Boolean);
  for (const sys of systems) {
    const isFull = sys.measures >= barsPerLine || (systems.length === 1 && barsPerLine >= 3);
    let goal = sys.right;
    if (sys.right > targetRight + 1) goal = targetRight;
    else if (isFull && sys.right < targetRight - 1) goal = targetRight;
    else continue;
    const scaleX = fullSystemScaleX(sys.box.x, sys.right, goal);
    if (Math.abs(scaleX - 1) < 0.012) continue;
    scaleSystemX(svg, sys.line, sys.box.x, scaleX);
  }
  if (vb.width > staffwidth + 1) {
    lockSvgViewWidth(svg, staffwidth);
  }
}

function lockSvgViewWidth(svg, staffwidth) {
  const vb = svg.viewBox?.baseVal;
  if (!vb?.width || !(staffwidth > 80)) return;
  svg.setAttribute("viewBox", `${vb.x} ${vb.y} ${staffwidth} ${vb.height}`);
  svg.removeAttribute("width");
  svg.removeAttribute("height");
  const wrap = svg.closest(".paper-wrap") ?? svg.parentElement;
  const paperW = wrap?.clientWidth || svg.parentElement?.clientWidth || staffwidth;
  const displayHeight = Math.round(paperW * vb.height / staffwidth);
  svg.style.setProperty("width", "100%", "important");
  svg.style.setProperty("height", `${displayHeight}px`, "important");
  const container = svg.parentElement;
  if (container) {
    container.style.setProperty("height", `${displayHeight}px`, "important");
    container.style.setProperty("overflow", "visible");
    container.style.position = "relative";
  }
}

function accidentalGlyph(note) {
  const marked = note.querySelector(".abcjs-accidental");
  if (marked) return marked;
  const head = note.querySelector(".abcjs-notehead");
  const headBox = elementBox(head);
  if (!headBox) return null;
  return [...note.querySelectorAll("path")].find((el) => {
    if (el.classList.contains("abcjs-notehead") || el.classList.contains("abcjs-stem")) return false;
    const box = elementBox(el);
    return Boolean(box && box.x + box.width * 0.5 < headBox.x);
  }) ?? null;
}

export function padAccidentals(target, layout = {}) {
  const staffBox = elementBox(target.querySelector(".abcjs-staff"));
  const gap = accidentalMinGap(staffBox?.height ?? layout.minStaffPx ?? 20);
  const byLine = new Map();
  for (const note of target.querySelectorAll(".abcjs-note")) {
    const line = lineIndex(note) ?? "0";
    const list = byLine.get(line) ?? [];
    list.push(note);
    byLine.set(line, list);
  }
  for (const list of byLine.values()) {
    const notes = list
      .map((note) => ({
        note,
        box: elementBox(note),
        head: note.querySelector(".abcjs-notehead"),
        acc: accidentalGlyph(note),
      }))
      .filter((item) => item.box)
      .sort((a, b) => a.box.x - b.box.x);
    let carry = 0;
    for (let i = 0; i < notes.length; i += 1) {
      if (carry) addTranslateX(notes[i].note, carry);
      if (!notes[i].acc || i === 0) continue;
      const accBox = elementBox(notes[i].acc);
      const prevBox = notes[i - 1].head ? elementBox(notes[i - 1].head) : notes[i - 1].box;
      if (!accBox || !prevBox) continue;
      const overlap = prevBox.x + prevBox.width + gap - accBox.x;
      if (overlap <= 0.5 || overlap > 14) continue;
      addTranslateX(notes[i].note, overlap);
      carry += overlap;
    }
  }
}

function polishEngraving(target, layout = {}) {
  restyleAnnotations(target, layout);
  normalizeSlashChords(target);
  placeArticulations(target);
  alignChordBaseline(target);
  layoutCueLane(target, layout);
  flattenTies(target);
}

function fitChorusStaffSvg(target, svg, layout) {
  const minStaffPx = layout?.minStaffPx ?? 0;
  const wrap = target.parentElement;
  const staff = svg?.querySelector(".abcjs-staff");
  if (!svg || !wrap || !staff || minStaffPx < 40 || typeof staff.getBBox !== "function") return;
  if (svg.querySelector("[data-staff-fit]")) return;
  const vb = svg.viewBox?.baseVal;
  if (!vb?.width) return;
  let staffUserH = 0;
  try {
    staffUserH = staff.getBBox().height;
  } catch {
    return;
  }
  const fit = chorusStaffFit(vb.width, staffUserH, wrap.clientWidth, minStaffPx);
  if (fit.scaleX >= 0.98) return;
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("data-staff-fit", "1");
  g.setAttribute("transform", `scale(${fit.scaleX} 1)`);
  while (svg.firstChild) g.appendChild(svg.firstChild);
  svg.append(g);
  svg.setAttribute("viewBox", `0 0 ${fit.viewBoxWidth} ${vb.height}`);
  svg.removeAttribute("height");
  svg.removeAttribute("width");
  const displayHeight = `${Math.round(wrap.clientWidth * vb.height / fit.viewBoxWidth)}px`;
  svg.style.setProperty("width", "100%", "important");
  svg.style.setProperty("height", displayHeight, "important");
  const container = svg.parentElement;
  if (container) {
    container.style.setProperty("height", displayHeight, "important");
    container.style.setProperty("overflow", "visible");
  }
}

export function abcRenderOptions(layout, staffwidth, scale) {
  const width = Math.max(280, staffwidth);
  const format = {
    chordfont: layout.chordfont,
    annotationfont: layout.annotationfont,
  };
  if (layout.staffsep) format.staffsep = layout.staffsep;
  if (layout.flatbeams) format.flatbeams = true;
  if (layout.stretchlast != null) format.stretchlast = layout.stretchlast;
  if (layout.maxshrink != null) format.maxshrink = layout.maxshrink;
  const options = {
    add_classes: true,
    paddingtop: layout.paddingtop,
    paddingbottom: layout.paddingbottom,
    paddingright: layout.paddingright ?? 16,
    staffwidth: width,
    scale,
    responsive: "resize",
    stretchlast: layout.stretchlast ?? false,
    expandToWidest: layout.expandToWidest ?? false,
    jazzchords: layout.jazzchords ?? true,
    maxshrink: layout.maxshrink ?? 0.8,
    minPadding: layout.minPadding ?? 6,
    format: { ...format, maxshrink: layout.maxshrink ?? 0.8, stretchlast: layout.stretchlast ?? 0 },
    wrap: layout.wrap ? { ...layout.wrap, staffwidth: width } : undefined,
  };
  if (layout.paddingleft != null) options.paddingleft = layout.paddingleft;
  if (layout.timeBasedLayout) {
    const tbl = {
      minPadding: layout.timeBasedLayout.minPadding ?? layout.minPadding ?? 8,
      align: layout.timeBasedLayout.align ?? "left",
    };
    if (layout.timeBasedLayout.minWidth != null) tbl.minWidth = layout.timeBasedLayout.minWidth;
    options.timeBasedLayout = tbl;
  }
  return options;
}

function abcWithStaffsep(abc, staffsep) {
  if (!staffsep || abc.includes("%%staffsep")) return abc;
  return abc.replace(/^X:1\n/, `X:1\n%%staffsep ${staffsep}\n`);
}

function paperTargetHeight(target) {
  const wrap = target.parentElement;
  if (!wrap) return 0;
  return Math.floor(wrap.clientHeight);
}

export function renderFittedAbc(target, abc, layout, width) {
  const scale = layout.scale;
  const fullWidth = Math.max(280, width - 24);
  const minWidth = Math.max(200, Math.round(fullWidth * (layout.minEngravingRatio ?? 0.4)));
  let staffwidth = Math.round(fullWidth * (layout.engravingRatio ?? 1));
  staffwidth = Math.min(fullWidth, Math.max(minWidth, staffwidth));
  let staffsep = layout.staffsep;
  let rendered = null;
  const fill = layout.fillRatio ?? 0.92;
  const targetHeight = layout.fitToPaper ? Math.floor(paperTargetHeight(target) * fill) : 0;
  for (let i = 0; i < 8; i += 1) {
    target.replaceChildren();
    rendered = window.ABCJS.renderAbc(
      target,
      abcWithStaffsep(abc, layout.fillAxis === "width" ? 0 : staffsep),
      abcRenderOptions({ ...layout, staffsep }, staffwidth, scale),
    )[0];
    const svg = target.querySelector("svg");
    const height = svg ? svg.getBoundingClientRect().height : 0;
    if (!layout.fitToPaper || !targetHeight) break;
    if (layout.fillAxis === "staffsep" || layout.fillAxis === "both") {
      if (layout.fillAxis === "both") {
        const nextWidth = nextEngravingWidth(staffwidth, height, targetHeight, width, minWidth);
        if (nextWidth !== staffwidth) {
          staffwidth = nextWidth;
          continue;
        }
      }
      const nextSep = nextStaffsep(staffsep, height, targetHeight, layout.maxStaffsep ?? 380);
      if (nextSep === staffsep) break;
      staffsep = nextSep;
    } else if (layout.fillAxis === "width") {
      const nextWidth = nextEngravingWidth(staffwidth, height, targetHeight, width, minWidth);
      if (nextWidth === staffwidth) break;
      staffwidth = nextWidth;
    } else {
      break;
    }
  }
  return {
    tune: rendered,
    layout: { ...layout, scale, staffwidth, staffsep },
  };
}

function hideBeamedTupletBrackets(target) {
  for (const triplet of target.querySelectorAll(".abcjs-triplet")) {
    const beamed = Boolean(
      triplet.closest("g")?.querySelector(".abcjs-beam")
      || triplet.parentElement?.querySelector(".abcjs-beam"),
    );
    if (!beamed) continue;
    for (const path of triplet.querySelectorAll("path")) {
      path.setAttribute("opacity", "0");
      path.style.display = "none";
    }
  }
}

export function engraveAbc(target, abc, options = {}) {
  const layout = options.layout ?? {};
  const width = options.width ?? Math.max(320, target.clientWidth || 760);
  const fitted = renderFittedAbc(target, abc, layout, width);
  hideBeamedTupletBrackets(target);
  if (options.applySlashes) {
    applyRhythmSlashes(target, Boolean(options.keepLandingNotes), fitted.layout, fitted.tune);
  } else {
    restyleAnnotations(target, fitted.layout);
  }
  padAccidentals(target, fitted.layout);
  justifyFullSystems(target, fitted.layout);
  polishEngraving(target, fitted.layout);
  const svg = target.querySelector("svg");
  if (svg && (options.fitChorus || layout.fillAxis === "fit")) fitChorusStaffSvg(target, svg, fitted.layout);
  if (svg && (options.fitChorus || layout.fillAxis === "fit")) polishEngraving(target, fitted.layout);
  return { ...fitted, svg };
}
