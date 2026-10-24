/**
 * Shared abcjs engraving for the session paper and the dev gallery.
 * Layout numbers come from lesson.notationLayout; ABC comes from music.js.
 */

import { jazzChordRootParts } from "./music.js";
import {
  chorusStaffFit,
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

function boxesOverlap(a, b, pad = 0) {
  return a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad;
}

function clearCueCollisions(target) {
  const notes = [...target.querySelectorAll(".abcjs-notehead, .abcjs-stem, .abcjs-beam, .abcjs-flag")];
  const blockers = [...target.querySelectorAll(".abcjs-chord, .abcjs-staff")];
  for (const cue of target.querySelectorAll(".abcjs-annotation")) {
    cue.style.transform = "";
    let shift = 0;
    for (let i = 0; i < 16; i += 1) {
      const cueBox = cue.getBoundingClientRect();
      const hitsNote = notes.some((node) => boxesOverlap(cueBox, node.getBoundingClientRect(), 5));
      if (!hitsNote) break;
      const next = shift + 6;
      cue.style.transform = `translateY(${next}px)`;
      const moved = cue.getBoundingClientRect();
      const hitsNextSystem = blockers.some((node) => boxesOverlap(moved, node.getBoundingClientRect(), 3));
      if (hitsNextSystem) {
        cue.style.transform = shift ? `translateY(${shift}px)` : "";
        break;
      }
      shift = next;
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
  clearCueCollisions(target);
}

function elementBox(el) {
  if (!el || typeof el.getBBox !== "function") return null;
  try {
    return el.getBBox();
  } catch {
    return null;
  }
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
  if (rest.querySelector(".abcjs-chord, .abcjs-annotation")) return true;
  const glyph = rest.querySelector("path, ellipse");
  if (!glyph) return true;
  const box = elementBox(glyph);
  if (!box) return true;
  if (box.width < 0.6 && box.height < 0.6) return true;
  if (staffBox && box.height > staffBox.height * 1.35) return true;
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
  const barsPerLine = layout.barsPerLine ?? 4;
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
    const staffBox = nearestStaffBox(rest, staffs);
    if (isSpacerRest(rest, staffBox)) continue;
    const glyph = rest.querySelector("path, ellipse") ?? rest;
    const box = elementBox(glyph);
    if (!box) continue;
    hideRestGlyph(rest);
    drawSlashOn(rest, box, staffBox, layout);
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
  restyleAnnotations(target, layout);
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
    stretchlast: layout.stretchlast ?? true,
    expandToWidest: layout.expandToWidest ?? true,
    jazzchords: layout.jazzchords ?? true,
    maxshrink: layout.maxshrink ?? 0.8,
    minPadding: layout.minPadding ?? 2.5,
    format: { ...format, maxshrink: layout.maxshrink ?? 0.8, stretchlast: layout.stretchlast ?? 1 },
    wrap: layout.wrap ? { ...layout.wrap, staffwidth: width } : undefined,
  };
  if (layout.paddingleft != null) options.paddingleft = layout.paddingleft;
  if (layout.timeBasedLayout) {
    options.timeBasedLayout = {
      minPadding: layout.timeBasedLayout.minPadding ?? layout.minPadding ?? 3,
      align: layout.timeBasedLayout.align ?? "left",
      minWidth: layout.timeBasedLayout.minWidth ?? width,
    };
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
  const svg = target.querySelector("svg");
  if (svg && (options.fitChorus || layout.fillAxis === "fit")) fitChorusStaffSvg(target, svg, fitted.layout);
  return { ...fitted, svg };
}
