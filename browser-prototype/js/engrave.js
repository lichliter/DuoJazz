/**
 * Verovio drawing layer for the session paper and the dev gallery.
 * Layout numbers come from lesson.notationLayout; MEI comes from mei.js.
 */

import { chordTargetCss, STAFF_PX } from "./lesson.js";
import { meiHasBowing } from "./mei.js";

const INK = "#2b211a";
const SVG_NS = "http://www.w3.org/2000/svg";
const READY_TIMEOUT_MS = 20000;
/** One face for chord letters and accidentals. DejaVu subset, see css/tokens.css. */
export const MUSIC_FONT_FAMILY = '"DuoJazz Music", "DejaVu Sans", sans-serif';
export const VEROVIO_UNIT = 12;
export const STAFF_USER_UNITS = 8 * VEROVIO_UNIT;

let toolkit = null;
let toolkitPromise = null;

export function verovioModuleIsReady(vrv = globalThis.verovio) {
  const mod = vrv?.module;
  if (!mod) return false;
  if (vrv.__duojazzReady || mod.calledRun || mod.runtimeInitialized) return true;
  return typeof mod._vrvToolkit_constructor === "function";
}

function bindRuntimeHook(vrv) {
  if (!vrv?.module || vrv.__duojazzBound) return;
  vrv.__duojazzBound = true;
  const prev = vrv.module.onRuntimeInitialized;
  vrv.module.onRuntimeInitialized = () => {
    if (typeof prev === "function") prev();
    vrv.__duojazzReady = true;
    if (typeof document !== "undefined") {
      document.dispatchEvent(new Event("verovio-ready"));
    }
  };
  if (verovioModuleIsReady(vrv)) vrv.__duojazzReady = true;
}

function waitForVerovioScript() {
  if (globalThis.verovio) return Promise.resolve(globalThis.verovio);
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (globalThis.verovio) {
        resolve(globalThis.verovio);
        return;
      }
      if (Date.now() - started > READY_TIMEOUT_MS) {
        reject(new Error("Verovio toolkit is not loaded"));
        return;
      }
      setTimeout(tick, 40);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("load", tick, { once: true });
      document.addEventListener("DOMContentLoaded", tick, { once: true });
      document.addEventListener("verovio-ready", tick);
    }
    tick();
  });
}

function waitForVerovioRuntime(vrv) {
  bindRuntimeHook(vrv);
  if (verovioModuleIsReady(vrv)) return Promise.resolve(vrv);
  return new Promise((resolve, reject) => {
    const started = Date.now();
    let settled = false;
    const done = () => {
      if (settled) return;
      vrv.__duojazzReady = true;
      settled = true;
      resolve(vrv);
    };
    if (typeof document !== "undefined") {
      document.addEventListener("verovio-ready", done, { once: true });
    }
    const poll = () => {
      if (settled) return;
      bindRuntimeHook(vrv);
      if (verovioModuleIsReady(vrv)) {
        done();
        return;
      }
      try {
        const probe = new vrv.toolkit();
        probe.destroy?.();
        done();
        return;
      } catch {
        // WASM is present but not callable yet.
      }
      if (Date.now() - started > READY_TIMEOUT_MS) {
        settled = true;
        reject(new Error("Verovio WASM timed out"));
        return;
      }
      setTimeout(poll, 40);
    };
    poll();
  });
}

export function whenVerovioReady() {
  if (toolkit) return Promise.resolve(toolkit);
  if (toolkitPromise) return toolkitPromise;
  toolkitPromise = waitForVerovioScript()
    .then(waitForVerovioRuntime)
    .then((vrv) => {
      toolkit = new vrv.toolkit();
      vrv.__duojazzReady = true;
      return toolkit;
    })
    .catch((err) => {
      toolkitPromise = null;
      throw err;
    });
  return toolkitPromise;
}

export function resetVerovioForTests() {
  toolkit = null;
  toolkitPromise = null;
}

export function staffPxOf(layout = {}) {
  return layout.minStaffPx || STAFF_PX;
}

export function isNaturalWidth(layout = {}) {
  return Boolean(layout.naturalWidth);
}

/** CSS px of a 5-line staff when the SVG is drawn at `cssWidth`. */
export function staffCssFromPage(pageWidth, cssWidth) {
  if (!pageWidth || !cssWidth) return STAFF_PX;
  return STAFF_USER_UNITS * cssWidth / pageWidth;
}

export function verovioOptions(layout = {}, cssWidth = 760, { hasSb = false } = {}) {
  const unit = VEROVIO_UNIT;
  const staffVU = STAFF_USER_UNITS;
  const targetStaff = staffPxOf(layout);
  const width = Math.max(280, cssWidth);
  const pageWidth = Math.round(staffVU * width / Math.max(36, targetStaff));
  const cue = (layout.annotationPx ?? 0) > 12 || (layout.paddingbottom ?? 0) > 20;
  return {
    font: "Leipzig",
    scale: 100,
    unit,
    pageWidth: Math.max(400, Math.min(8000, pageWidth)),
    pageHeight: 24000,
    adjustPageHeight: true,
    adjustPageWidth: isNaturalWidth(layout),
    breaks: hasSb ? "encoded" : "none",
    minLastJustification: 0,
    justifyVertically: false,
    header: "none",
    footer: "none",
    svgViewBox: true,
    svgHtml5: true,
    beamMaxSlope: 4,
    spacingSystem: 6,
    spacingStaff: 8,
    pageMarginTop: 24,
    pageMarginBottom: cue ? 28 : 16,
    pageMarginLeft: 16,
    pageMarginRight: 16,
    harmDist: 1.05,
    topMarginHarm: 0.7,
    lyricSize: 2.6,
    lyricTopMinMargin: 1.2,
    leftMarginAccid: 2,
    rightMarginAccid: 1.2,
    spacingLinear: globalThis.DUOJAZZ_VEROVIO_SPACING?.spacingLinear ?? 0.7,
    spacingNonLinear: globalThis.DUOJAZZ_VEROVIO_SPACING?.spacingNonLinear ?? 0.35,
    xmlIdSeed: 1,
    svgCss: `.harm, .harm text, .harm tspan { font-family: ${MUSIC_FONT_FAMILY}; font-weight: 700; font-stretch: normal; letter-spacing: 0; fill: ${INK}; } .dir, .dir text, .dir tspan { font-family: "Source Sans 3", sans-serif; font-weight: 400; font-style: italic; fill: ${INK}; }`,
  };
}

function recolor(svg) {
  for (const el of svg.querySelectorAll("[fill], [stroke]")) {
    const fill = el.getAttribute("fill");
    const stroke = el.getAttribute("stroke");
    if (fill && /^#000000$|^#000$|^black$/i.test(fill)) el.setAttribute("fill", INK);
    if (stroke && /^#000000$|^#000$|^black$/i.test(stroke)) el.setAttribute("stroke", INK);
  }
}

function decodeFigbassText(text) {
  return String(text)
    .replaceAll("\uEA63", "𝄫")
    .replaceAll("\uEA64", "♭")
    .replaceAll("\uEA65", "♮")
    .replaceAll("\uEA66", "♯")
    .replaceAll("\uEA67", "𝄪");
}

const SMUFL_CHORD = {
  E260: "♭",
  E261: "♮",
  E262: "♯",
  E263: "𝄪",
  E264: "𝄫",
  E26A: "♭",
  E26B: "♮",
  E26C: "♯",
  E870: "°",
  E871: "ø",
  E872: "+",
  E873: "Δ",
  EA63: "𝄫",
  EA64: "♭",
  EA65: "♮",
  EA66: "♯",
  EA67: "𝄪",
};

export function smuflChordChar(href) {
  const code = String(href ?? "").replace(/^.*#/, "").toUpperCase();
  return SMUFL_CHORD[code] ?? "";
}

const ACCIDENTAL = /[♭♯♮𝄫𝄪°øΔ]/u;

/** Write a chord or key as one run so the accidental uses the same face as the letters. */
export function fillMusicLabel(el, text) {
  if (!el) return;
  const value = String(text ?? "");
  el.textContent = value;
  const surface = el.classList?.contains("chord-symbol")
    || el.classList?.contains("chart-row-key")
    || el.classList?.contains("key-btn")
    || el.id === "session-key"
    || el.id === "chart-heading-meta"
    || el.id === "next-key"
    || el.id === "wrapup-heading"
    || el.id === "celebrate-key"
    || el.id === "key-order-preview"
    || (typeof el.closest === "function" && el.closest("#chart-keys, #setup-keys"));
  el.classList?.toggle("music-label", Boolean(surface) || ACCIDENTAL.test(value));
}

export function compactChordSymbol(text) {
  let s = decodeFigbassText(text)
    .replace(/[\s\u00A0\u2000-\u200B\u202F\u205F\u3000]+/g, "");
  s = s.replace(/b13/g, "♭13");
  s = s.replace(/#11/g, "♯11");
  s = s.replace(/b9/g, "♭9");
  s = s.replace(/#9/g, "♯9");
  s = s.replace(/b5/g, "♭5");
  s = s.replace(/b6/g, "♭6");
  s = s.replace(/o7/g, "°7");
  s = s.replace(/h7/g, "ø7");
  s = s.replace(/mM7/g, "mΔ7");
  s = s.replace(/([A-G])b/g, "$1♭");
  s = s.replace(/([A-G][♭]?)#/g, "$1♯");
  return s;
}

/** ASCII-safe harm text so Verovio does not split accidentals into figbass. */
export function meiChordText(name) {
  return compactChordSymbol(name)
    .replaceAll("♭", "b")
    .replaceAll("♯", "#")
    .replaceAll("°", "o")
    .replaceAll("ø", "h")
    .replaceAll("Δ", "M");
}

export function harmRawText(harm) {
  let out = "";
  const walk = (node) => {
    if (!node) return;
    if (node.nodeType === 3) {
      out += node.textContent ?? "";
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = (node.localName || node.tagName || "").toLowerCase();
    if (tag === "use") {
      out += smuflChordChar(node.getAttribute("href") || node.getAttribute("xlink:href"));
      return;
    }
    for (const child of node.childNodes ?? []) walk(child);
  };
  walk(harm);
  return out;
}

/** Verovio definition-factor font size. 400 VU ≈ 16–18px cap at a 40px staff. */
export const CHORD_FONT_VU = 400;
/** ~13–14px italic at a 40px staff (230 VU read as ~9px in round 2). */
export const CUE_FONT_VU = 330;

export function chordFontVU(_layout = {}) {
  return CHORD_FONT_VU;
}

export function cueFontVU(_layout = {}) {
  return CUE_FONT_VU;
}

function isSvgText(el) {
  return (el?.localName || el?.tagName || "").toLowerCase() === "text";
}

function textAnchor(el) {
  const tspan = el?.querySelector?.("tspan");
  return {
    x: tspan?.getAttribute("x") ?? el?.getAttribute?.("x"),
    y: tspan?.getAttribute("y") ?? el?.getAttribute?.("y"),
  };
}

function paintChordText(text, compact, chordVU, x, y) {
  text.replaceChildren();
  const tspan = document.createElementNS(SVG_NS, "tspan");
  tspan.textContent = compact;
  tspan.setAttribute("font-family", MUSIC_FONT_FAMILY);
  tspan.setAttribute("font-weight", "700");
  tspan.setAttribute("font-size", `${chordVU}px`);
  tspan.setAttribute("fill", INK);
  tspan.setAttribute("letter-spacing", "0");
  tspan.setAttribute("kerning", "0");
  tspan.setAttribute("xml:space", "preserve");
  if (x != null) tspan.setAttribute("x", x);
  if (y != null) tspan.setAttribute("y", y);
  text.append(tspan);
  text.setAttribute("font-family", MUSIC_FONT_FAMILY);
  text.setAttribute("font-weight", "700");
  text.setAttribute("font-size", `${chordVU}px`);
  text.setAttribute("letter-spacing", "0");
  text.setAttribute("kerning", "0");
  text.setAttribute("fill", INK);
  text.style.whiteSpace = "nowrap";
}

function isChordFragment(text) {
  return /^(maj7|m7|m6|sus|♭5|♭9|♭13|♯9|♯11|°7|ø7|Δ7|[♭♯°øΔ])/.test(text);
}

export function mergeSplitChordSymbols(svg) {
  if (!svg?.querySelectorAll) return;
  const harms = [...svg.querySelectorAll(".harm")];
  for (let i = 1; i < harms.length; i += 1) {
    const prev = compactChordSymbol(harmRawText(harms[i - 1]));
    const cur = compactChordSymbol(harmRawText(harms[i]));
    if (!prev || !cur || !isChordFragment(cur)) continue;
    const host = harms[i - 1];
    const { x, y } = textAnchor(harmTextEl(host));
    const joined = compactChordSymbol(`${prev}${cur}`);
    host.replaceChildren();
    if (isSvgText(host)) {
      paintChordText(host, joined, chordFontVU(), x, y);
    } else {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      host.append(text);
      paintChordText(text, joined, chordFontVU(), x, y);
    }
    harms[i].remove();
    harms[i] = host;
  }
}

function restyleHarms(svg, chordVU) {
  for (const harm of svg.querySelectorAll(".harm")) {
    const compact = compactChordSymbol(harmRawText(harm));
    if (!compact) continue;
    const texts = [...harm.querySelectorAll("text")];
    const target = isSvgText(harm) ? harm : texts[0];
    const { x, y } = textAnchor(target);
    for (const extra of texts) {
      if (extra !== target) extra.remove();
    }
    for (const use of harm.querySelectorAll("use")) use.remove();
    if (target) {
      paintChordText(target, compact, chordVU, x, y);
    } else {
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      harm.replaceChildren(text);
      paintChordText(text, compact, chordVU, x, y);
    }
  }
  mergeSplitChordSymbols(svg);
}

function restyleDirs(svg, cueVU) {
  const paint = (el) => {
    el.setAttribute("font-family", "Source Sans 3, sans-serif");
    el.setAttribute("font-weight", "400");
    el.setAttribute("font-style", "italic");
    el.setAttribute("font-size", `${cueVU}px`);
    el.setAttribute("fill", INK);
  };
  for (const dir of svg.querySelectorAll(".dir")) {
    if (isSvgText(dir)) paint(dir);
    for (const el of dir.querySelectorAll("text, tspan")) paint(el);
  }
}

function restyleText(svg, layout = {}) {
  restyleHarms(svg, chordFontVU(layout));
  restyleDirs(svg, cueFontVU(layout));
}

/** Practice peeks the first written note. Slash heads and cue notes stay hidden. */
export function markFirstMelodyNote(root) {
  if (!root?.querySelectorAll) return;
  for (const note of root.querySelectorAll(".note.memory-first")) {
    note.classList.remove("memory-first");
  }
  for (const note of root.querySelectorAll(".note")) {
    const cls = note.getAttribute("class") || "";
    if (/\bcue\b/.test(cls)) continue;
    if (isSlashHead(note)) continue;
    note.classList.add("memory-first");
    return;
  }
}

function isSlashHead(el) {
  const cls = `${el.getAttribute("class") || ""} ${el.closest("[class]")?.getAttribute("class") || ""}`;
  if (/\bslash\b/i.test(cls)) return true;
  const hrefs = [el.getAttribute("href"), el.getAttribute("xlink:href")];
  for (const use of el.querySelectorAll?.("use") ?? []) {
    hrefs.push(use.getAttribute("href"), use.getAttribute("xlink:href"));
  }
  return hrefs.some((href) => /E10[0-4]/i.test(href || ""));
}

function harmTextEl(harm) {
  return harm.querySelector("text") ?? harm;
}

function paintChordSize(harm, size) {
  const px = `${size}px`;
  for (const el of harm.querySelectorAll("text, tspan")) {
    el.setAttribute("font-size", px);
    el.setAttribute("font-weight", "700");
    el.setAttribute("font-family", MUSIC_FONT_FAMILY);
    el.setAttribute("font-stretch", "normal");
  }
}

/**
 * Draw every chord symbol at one size and one weight. A later symbol that
 * still collides is nudged sideways. Nothing is shrunk on its own, so the
 * last bar cannot come out larger or heavier than the rest, and bass and
 * treble stay the same size at the same staff.
 */
export function separateChordSymbols(svg, layout = {}) {
  if (!svg?.querySelectorAll) return;
  const harms = [...svg.querySelectorAll(".harm")];
  if (!harms.length) return;
  const measuredStaff = fiveLineStaffHeightCss(svg.querySelector(".staff"));
  const target = chordTargetCss(measuredStaff || staffPxOf(layout));
  const sample = harmTextEl(harms[0]);
  const sampleBox = screenBox(sample);
  const sampleSize = parseFloat(sample.getAttribute("font-size") || "0");
  const size = sampleBox?.height > 0 && sampleSize > 0
    ? sampleSize * target / sampleBox.height
    : sampleSize;
  if (size > 0) {
    for (const harm of harms) paintChordSize(harm, size);
  }
  const userPerPx = (() => {
    const rect = svg.getBoundingClientRect?.();
    const box = svg.viewBox?.baseVal;
    if (rect?.width && box?.width) return box.width / rect.width;
    return 1;
  })();
  const gap = 4;
  for (let i = 0; i < harms.length - 1; i += 1) {
    let boxA;
    let boxB;
    try {
      boxA = harmTextEl(harms[i]).getBoundingClientRect();
      boxB = harmTextEl(harms[i + 1]).getBoundingClientRect();
    } catch {
      break;
    }
    if (!boxA.width || !boxB.width) break;
    if (Math.abs((boxA.top + boxA.height / 2) - (boxB.top + boxB.height / 2)) > Math.max(boxA.height, boxB.height)) {
      continue;
    }
    if (boxA.right + gap <= boxB.left) continue;
    translateSvg(harms[i + 1], (boxA.right + gap - boxB.left) * userPerPx, 0);
  }
}

export function staffLineYs(staff) {
  const ys = [];
  for (const path of staff?.querySelectorAll?.(":scope > path") ?? []) {
    let box;
    try {
      box = path.getBBox();
    } catch {
      continue;
    }
    if (!box || box.width < 8) continue;
    if (box.width > box.height * 6) ys.push(box.y + box.height / 2);
  }
  ys.sort((a, b) => a - b);
  return ys;
}

export function middleStaffLineY(staff) {
  const ys = staffLineYs(staff);
  if (ys.length >= 5) return ys[2];
  if (ys.length) return ys[Math.floor(ys.length / 2)];
  try {
    const box = staff.getBBox();
    return box.y + box.height / 2;
  } catch {
    return null;
  }
}

function screenBox(el) {
  if (!el || typeof el.getBoundingClientRect !== "function") return null;
  try {
    const box = el.getBoundingClientRect();
    if (!box || !(box.height > 0) || !(box.width > 0)) return null;
    return box;
  } catch {
    return null;
  }
}

/** Staff-line centers in screen px. Path bboxes ignore the transforms that stack the five lines. */
function staffLineScreenCenters(staff) {
  const centers = [];
  for (const path of staff?.querySelectorAll?.(":scope > path") ?? []) {
    let box;
    try {
      box = path.getBoundingClientRect();
    } catch {
      continue;
    }
    if (!box || box.width < 8) continue;
    // Unstroked staff lines report a zero height. They are still the line.
    if (box.height > 0 && box.width <= box.height * 6) continue;
    centers.push(box.top + box.height / 2);
  }
  centers.sort((a, b) => a - b);
  return centers;
}

/** Screen-space y delta that centers a slash glyph on the middle staff line. */
export function slashRecenterDelta(lineCenters, glyphTop, glyphHeight) {
  if (!Array.isArray(lineCenters) || lineCenters.length < 5 || !(glyphHeight > 0)) return 0;
  const delta = lineCenters[2] - (glyphTop + glyphHeight / 2);
  return Math.abs(delta) < 0.35 ? 0 : delta;
}

/**
 * Negative screen y moves chord text up. `chordBottom` and `inkTop` share
 * screen coordinates; a positive gap means the ink starts below the text.
 */
export function chordLiftForGap(chordBottom, inkTop, em) {
  if (!(em > 0) || !Number.isFinite(chordBottom) || !Number.isFinite(inkTop)) return 0;
  const gap = inkTop - chordBottom;
  const need = em * 0.5;
  if (gap >= need - 0.4) return 0;
  return gap - need;
}

function screenDeltaToLocal(el, dxScreen, dyScreen) {
  if (typeof DOMPoint === "undefined") return null;
  try {
    const toScreen = typeof el.getScreenCTM === "function" ? el.getScreenCTM() : null;
    if (!toScreen) return null;
    const inv = toScreen.inverse();
    const origin = new DOMPoint(0, 0).matrixTransform(inv);
    const shifted = new DOMPoint(dxScreen || 0, dyScreen || 0).matrixTransform(inv);
    const dx = shifted.x - origin.x;
    const dy = shifted.y - origin.y;
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
    return { dx, dy };
  } catch {
    return null;
  }
}

function screenDyToLocal(el, dyScreen) {
  if (!Number.isFinite(dyScreen) || Math.abs(dyScreen) < 0.35) return 0;
  if (typeof DOMPoint === "undefined") return null;
  try {
    const svg = el.ownerSVGElement;
    const toScreen = typeof el.getScreenCTM === "function" ? el.getScreenCTM() : null;
    if (toScreen) {
      const inv = toScreen.inverse();
      const origin = new DOMPoint(0, 0).matrixTransform(inv);
      const shifted = new DOMPoint(0, dyScreen).matrixTransform(inv);
      const dy = shifted.y - origin.y;
      if (Number.isFinite(dy)) return dy;
    }
    const screenCtm = svg?.getScreenCTM?.();
    const localCtm = el.getCTM?.();
    if (!screenCtm || !localCtm) return null;
    const invScreen = screenCtm.inverse();
    const start = new DOMPoint(0, 0).matrixTransform(invScreen);
    const end = new DOMPoint(0, dyScreen).matrixTransform(invScreen);
    const invLocal = localCtm.inverse();
    const origin = new DOMPoint(0, 0).matrixTransform(invLocal);
    const shifted = new DOMPoint(0, end.y - start.y).matrixTransform(invLocal);
    const dy = shifted.y - origin.y;
    return Number.isFinite(dy) ? dy : null;
  } catch {
    return null;
  }
}

function renderedChordEm(text) {
  const specified = parseFloat(text.getAttribute?.("font-size") || "");
  const screen = screenBox(text);
  if (!(screen?.height > 0)) return 0;
  let userHeight = 0;
  try {
    userHeight = text.getBBox()?.height || 0;
  } catch {
    userHeight = 0;
  }
  if (specified > 0 && userHeight > 0) return specified * screen.height / userHeight;
  return screen.height;
}

export function centerSlashNoteheads(svg) {
  if (!svg?.querySelectorAll) return;
  for (const staff of svg.querySelectorAll(".staff")) {
    const lineCenters = staffLineScreenCenters(staff);
    const heads = [...staff.querySelectorAll(".notehead, .note, [class*='slash']")].filter(isSlashHead);
    const seen = new Set();
    for (const head of heads) {
      const target = head.classList?.contains("notehead") || head.classList?.contains("slash")
        ? head
        : head.closest(".notehead") ?? head;
      if (seen.has(target)) continue;
      seen.add(target);
      const slashNote = target.closest?.(".note.slash, .slash");
      if (slashNote && slashNote !== target) continue;
      const box = screenBox(target);
      const dyScreen = slashRecenterDelta(lineCenters, box?.top, box?.height);
      const dy = dyScreen ? screenDyToLocal(target, dyScreen) : 0;
      if (dy == null) continue;
      // Leave the rhythmic x that Verovio chose. Shifting every slash on a
      // system into four global beats piles them onto the lick.
      const dx = 0;
      if (Math.abs(dy) < 0.35 && Math.abs(dx) < 0.35) continue;
      const prev = target.getAttribute("transform") || "";
      target.setAttribute("transform", `${prev} translate(${dx} ${dy})`.trim());
    }
  }
}

function considerInkTop(inkTop, box) {
  if (!box) return inkTop;
  return inkTop == null ? box.top : Math.min(inkTop, box.top);
}

function highestInkTop(group) {
  let inkTop = null;
  for (const el of group.querySelectorAll(".notehead, .note, [class*='slash']")) {
    const slash = isSlashHead(el);
    let target = null;
    if (slash) {
      target = el.classList?.contains("note") || el.classList?.contains("slash") || el.classList?.contains("notehead")
        ? el
        : el.closest?.(".note") ?? el;
    } else if (el.classList?.contains("notehead")) {
      target = el;
    }
    if (!target) continue;
    inkTop = considerInkTop(inkTop, screenBox(target));
  }
  // Triplet numerals sit above the beam. On treble they climb into the chords.
  for (const el of group.querySelectorAll(".tupletNum, .tuplet-num, .tuplet text")) {
    inkTop = considerInkTop(inkTop, screenBox(el));
  }
  return inkTop;
}

/** Lift a system's chord symbols only as far as a 0.5em gap over slashes and noteheads requires. */
export function clearChordInkGap(svg) {
  if (!svg?.querySelectorAll) return;
  const systems = [...svg.querySelectorAll(".system")];
  const groups = systems.length ? systems : [...svg.querySelectorAll(".staff")];
  for (const group of groups) {
    const harms = [...group.querySelectorAll(".harm")];
    if (!harms.length) continue;
    let chordBottom = null;
    let em = 0;
    let anchor = null;
    for (const harm of harms) {
      const text = harmTextEl(harm);
      const box = screenBox(text);
      if (!box) continue;
      if (chordBottom == null || box.bottom > chordBottom) {
        chordBottom = box.bottom;
        em = renderedChordEm(text);
        anchor = text;
      }
    }
    const inkTop = highestInkTop(group);
    const lift = chordLiftForGap(chordBottom, inkTop, em);
    if (!lift || !anchor) continue;
    const dy = screenDyToLocal(anchor, lift);
    if (dy == null || Math.abs(dy) < 0.35) continue;
    for (const harm of harms) translateSvg(harm, 0, dy);
  }
}

function applyFixedStaffSize(target, svg, layout) {
  const staffPx = staffPxOf(layout);
  const wrap = target.parentElement;
  const vb = svg?.viewBox?.baseVal;
  if (!svg || !vb?.width) return;
  target.classList.toggle("notation-natural", isNaturalWidth(layout));
  if (!isNaturalWidth(layout)) {
    const measured = fiveLineStaffHeightCss(svg.querySelector(".staff"));
    const drawn = svg.getBoundingClientRect();
    if (measured > staffPx + 1.5 && drawn.width > 0) {
      const cssW = drawn.width * staffPx / measured;
      svg.style.setProperty("width", `${Math.max(1, Math.round(cssW))}px`, "important");
      svg.style.setProperty("height", "auto", "important");
      svg.style.setProperty("margin-inline", "auto", "important");
      return;
    }
    svg.style.setProperty("width", "100%", "important");
    svg.style.setProperty("height", "auto", "important");
    svg.style.removeProperty("margin-inline");
    return;
  }
  const cssW = vb.width * staffPx / STAFF_USER_UNITS;
  const maxW = wrap?.clientWidth || cssW;
  const width = Math.min(cssW, maxW);
  svg.style.setProperty("width", `${Math.round(width)}px`, "important");
  svg.style.setProperty("max-width", "100%", "important");
  svg.style.setProperty("height", "auto", "important");
  svg.style.setProperty("margin-inline", "auto", "important");
}

function mountSvg(target, svgText) {
  target.replaceChildren();
  const host = document.createElement("div");
  host.className = "vrv-container";
  host.innerHTML = svgText;
  const svg = host.querySelector("svg");
  if (svg) {
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.style.width = "100%";
    svg.style.height = "auto";
    svg.style.display = "block";
    svg.style.overflow = "visible";
  }
  target.append(host);
  return svg;
}

export async function engraveMei(target, mei, options = {}) {
  const started = performance.now();
  const tk = await whenVerovioReady();
  const layout = options.layout ?? {};
  const width = options.width ?? Math.max(320, target.clientWidth || 760);
  tk.setOptions(verovioOptions(layout, width, { hasSb: /<sb\/>/.test(mei) }));
  tk.loadData(mei);
  const pages = tk.getPageCount();
  const parts = [];
  for (let page = 1; page <= pages; page += 1) parts.push(tk.renderToSVG(page));
  let timemap = [];
  try {
    const raw = tk.renderToTimemap?.({ includeRests: true }) ?? tk.renderToTimemap?.();
    timemap = parseTimemap(raw);
  } catch {
    timemap = [];
  }
  const svg = mountSvg(target, parts.join(""));
  if (svg && typeof document !== "undefined" && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Fall back to whatever faces are already available.
    }
  }
  if (svg) {
    recolor(svg);
    restyleText(svg, layout);
    mergeSplitChordSymbols(svg);
    separateChordSymbols(svg, layout);
    centerSlashNoteheads(svg);
    clearChordInkGap(svg);
    layoutCueLabels(svg);
    applyFixedStaffSize(target, svg, layout);
    // The width lock changes the scale. Measure after that, then once more
    // after the new viewBox has been laid out, so a HERE under the last system
    // is inside the page rather than clipped by it.
    padViewBoxToInk(svg);
    for (const el of svg.querySelectorAll(".dir.cue, .harm, .system")) el.getBoundingClientRect();
    padViewBoxToInk(svg);
  }
  return {
    svg,
    layout: { ...layout, staffwidth: width },
    elapsedMs: performance.now() - started,
    pageCount: pages,
    timemap,
  };
}

export function parseTimemap(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function soundingIdsAt(timemap, qstamp) {
  if (!(qstamp >= 0) || !Array.isArray(timemap) || !timemap.length) return [];
  const events = [...timemap].sort((a, b) => (a.qstamp ?? a.tstamp ?? 0) - (b.qstamp ?? b.tstamp ?? 0));
  const on = new Set();
  for (const ev of events) {
    const at = ev.qstamp ?? 0;
    if (at > qstamp + 1e-6) break;
    for (const id of ev.off ?? []) on.delete(id);
    for (const id of ev.on ?? []) on.add(id);
  }
  return [...on];
}

export function applySoundingHighlight(root, ids) {
  const svg = root?.querySelector?.("svg") ?? root;
  if (!svg?.querySelectorAll) return;
  for (const el of svg.querySelectorAll(".sounding")) el.classList.remove("sounding");
  for (const id of ids ?? []) {
    const el = svg.querySelector(`[id="${id}"]`) ?? svg.querySelector(`#${id}`);
    if (!el) continue;
    el.classList.add("sounding");
    for (const part of el.querySelectorAll(".notehead, .stem, .flag, .accid, .rest, .slash, use, path, text, tspan")) {
      part.classList.add("sounding");
    }
  }
}

export function highlightActiveChords(svg, beats, chords = []) {
  if (!svg) return [];
  const harms = [...svg.querySelectorAll(".harm")];
  const active = [];
  for (const [index, harm] of harms.entries()) {
    const chord = chords[index];
    const start = chord?.startBeat ?? Number.NaN;
    const end = chord?.endBeat ?? start + (chord?.durationBeats ?? 4);
    const on = Number.isFinite(start) && beats >= start - 1e-6 && beats < end - 1e-6;
    harm.classList.toggle("sounding", on);
    if (on) active.push(index);
  }
  return active;
}

export function fiveLineStaffHeight(staff) {
  if (!staff || typeof staff.getBBox !== "function") return 0;
  const paths = [...staff.querySelectorAll(":scope > path")];
  if (!paths.length) {
    try {
      return staff.getBBox().height;
    } catch {
      return 0;
    }
  }
  let best = 0;
  let bestDelta = Infinity;
  for (const path of paths) {
    let box;
    try {
      box = path.getBBox();
    } catch {
      continue;
    }
    const delta = Math.abs(box.height - STAFF_USER_UNITS);
    if (delta < bestDelta) {
      best = box.height;
      bestDelta = delta;
    }
  }
  return best;
}

/** CSS px from the top staff line to the bottom staff line. */
export function fiveLineStaffHeightCss(staff) {
  const lines = [...(staff?.querySelectorAll?.(":scope > path") ?? [])];
  if (lines.length >= 2 && typeof lines[0].getBoundingClientRect === "function") {
    try {
      const top = lines[0].getBoundingClientRect().top;
      const bot = lines[lines.length - 1].getBoundingClientRect().top;
      const css = Math.abs(bot - top);
      if (css > 8) return css;
    } catch {
      // SVG not in the document.
    }
  }
  return 0;
}

export function measureEngraving(root) {
  const svg = root?.querySelector?.("svg");
  if (!svg) return null;
  const svgBox = svg.getBoundingClientRect();
  const vb = svg.viewBox?.baseVal;
  const scale = vb?.width && svgBox.width ? svgBox.width / vb.width : 1;
  const staffs = [...svg.querySelectorAll(".staff")];
  const staffPx = staffs.map((staff) => {
    const css = fiveLineStaffHeightCss(staff);
    if (css) return css;
    return fiveLineStaffHeight(staff) * scale;
  });
  const systemPitch = [];
  for (let i = 1; i < staffs.length; i += 1) {
    try {
      systemPitch.push((staffs[i].getBBox().y - staffs[i - 1].getBBox().y) * scale);
    } catch {
      // skip
    }
  }
  const chord = svg.querySelector(".harm text, .harm tspan");
  const cue = svg.querySelector(".dir text, .dir tspan");
  let chordPx = 0;
  let cuePx = 0;
  try {
    if (chord) chordPx = chord.getBBox().height * scale;
  } catch {
    chordPx = 0;
  }
  try {
    if (cue) cuePx = cue.getBBox().height * scale;
  } catch {
    cuePx = 0;
  }
  return {
    staffPx,
    staffMean: staffPx.length ? staffPx.reduce((a, b) => a + b, 0) / staffPx.length : 0,
    systemPitch,
    chordPx,
    cuePx,
    svgWidth: svgBox.width,
    viewBoxWidth: vb?.width ?? 0,
  };
}

export function boxesIntersect(a, b, pad = 0) {
  if (!a || !b || !a.width || !a.height || !b.width || !b.height) return false;
  return a.x + pad < b.x + b.width
    && a.x + a.width > b.x + pad
    && a.y + pad < b.y + b.height
    && a.y + a.height > b.y + pad;
}

/**
 * Fit cue labels inside their bars and below anything hanging under the staff.
 * Coordinates are the engraving's user units. `y` is the top of the label.
 */
export function placeCueBoxes(cues, { gap = 36 } = {}) {
  const placed = cues.map((cue) => ({ ...cue, scale: cue.scale ?? 1 }));
  const rows = [];
  for (const cue of [...placed].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const row = rows.find((items) => Math.abs(items[0].y - cue.y) < Math.max(40, items[0].height * 0.45));
    if (row) row.push(cue);
    else rows.push([cue]);
  }
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
    for (let i = 0; i < row.length; i += 1) {
      const cue = row[i];
      const next = row[i + 1];
      const inset = cue.gap ?? gap;
      const barLimit = Number.isFinite(cue.barRight) ? cue.barRight - inset : Infinity;
      const nextLimit = next ? next.x - inset : Infinity;
      const limit = Math.min(barLimit, nextLimit);
      const room = limit - cue.x;
      if (room > 8 && cue.width > room) {
        const fit = room / cue.width;
        cue.scale *= fit;
        cue.width *= fit;
        cue.height *= fit;
      }
    }
  }
  for (const cue of placed) {
    if (cue.obstacleBottom == null) continue;
    const pad = Math.max(10, (cue.gap ?? gap) * 0.28);
    const minY = cue.obstacleBottom + pad;
    if (cue.y >= minY) continue;
    const maxY = cue.nextTop == null ? minY : cue.nextTop - pad - cue.height;
    cue.y = maxY >= minY ? minY : Math.max(cue.y, maxY);
  }
  return placed;
}

function translateSvg(el, dx, dy) {
  if (!el || (Math.abs(dx) < 0.4 && Math.abs(dy) < 0.4)) return;
  const prev = el.getAttribute("transform") || "";
  el.setAttribute("transform", `${prev} translate(${dx} ${dy})`.trim());
}

function firstLickNote(measure) {
  for (const note of measure?.querySelectorAll?.(".note") ?? []) {
    const cls = note.getAttribute("class") || "";
    if (/\bcue\b/.test(cls) || isSlashHead(note)) continue;
    return note;
  }
  return null;
}

function firstLickHead(measure) {
  const note = firstLickNote(measure);
  return note?.querySelector(".notehead") ?? note;
}

/** Lowest ink at or below the staff that shares the cue's horizontal span. */
function inkFloor(measure, x0, x1, staffBottom) {
  let floor = staffBottom;
  const consider = (el) => {
    if (!el || el.closest?.(".dir")) return;
    let box;
    try {
      box = el.getBoundingClientRect();
    } catch {
      return;
    }
    if (!box || box.height < 0.4) return;
    if (box.bottom < staffBottom - 0.5) return;
    if (box.right < x0 - 1 || box.left > x1 + 1) return;
    floor = Math.max(floor, box.bottom);
  };
  for (const note of measure?.querySelectorAll?.(".note") ?? []) {
    const cls = note.getAttribute("class") || "";
    if (/\bcue\b/.test(cls) || isSlashHead(note)) continue;
    consider(note);
  }
  for (const el of measure?.querySelectorAll?.(".beam, .tuplet, .tupletNum, .flag, .accid, .ledgerLines") ?? []) {
    consider(el);
  }
  return floor;
}

function nextHarmTop(svg, below) {
  let top = null;
  for (const harm of svg.querySelectorAll(".harm")) {
    const box = screenBox(harmTextEl(harm));
    if (!box || box.top < below + 12) continue;
    top = top == null ? box.top : Math.min(top, box.top);
  }
  return top;
}

/**
 * Screen-pixel move that parks a cue below the lick ink, centered on the
 * first note. `inkBottom` / `noteBottom` are the lowest ink that shares the
 * word's horizontal span (beam, tuplet numeral, stem). The word stays below
 * that ink instead of climbing back into it when the next system is close.
 */
export function cueJustBelowStaff(cue, staffBottom, noteCenterX, limits = {}) {
  const gap = Number.isFinite(limits.gap) ? limits.gap : 6;
  const noteBottom = Number.isFinite(limits.noteBottom) ? limits.noteBottom : staffBottom;
  const inkBottom = Number.isFinite(limits.inkBottom) ? limits.inkBottom : noteBottom;
  const floor = Math.max(staffBottom, noteBottom, inkBottom);
  const top = floor + gap;
  let left = noteCenterX - cue.width / 2;
  if (Number.isFinite(limits.minLeft)) left = Math.max(limits.minLeft, left);
  if (Number.isFinite(limits.maxRight)) left = Math.min(left, limits.maxRight - cue.width);
  return { dx: left - cue.left, dy: top - cue.top, top, left };
}

/** Grow a viewBox in user units so top or bottom overflow becomes padding. Width stays put, so the staff scale does not change. */
export function expandedViewBox(viewBox, { top = 0, bottom = 0 } = {}) {
  const growTop = top > 0 ? top : 0;
  const growBottom = bottom > 0 ? bottom : 0;
  return {
    x: viewBox.x,
    y: viewBox.y - growTop,
    width: viewBox.width,
    height: viewBox.height + growTop + growBottom,
  };
}

/** Park each HERE below the first lick note's beam, stems, and tuplet numeral. */
export function layoutCueLabels(svg) {
  if (!svg?.querySelectorAll) return;
  for (const cue of svg.querySelectorAll(".dir.cue")) {
    const measure = cue.closest(".measure");
    const lines = staffLineScreenCenters(measure?.querySelector(".staff"));
    if (lines.length < 2) continue;
    const staffTop = lines[0];
    const staffBottom = lines[lines.length - 1];
    const staffH = staffBottom - staffTop;
    const head = firstLickHead(measure);
    const headBox = screenBox(head);
    const text = cue.querySelector("text") ?? cue;
    const cueBox = screenBox(text) ?? screenBox(cue);
    if (!cueBox) continue;
    const noteCenter = headBox
      ? headBox.left + headBox.width / 2
      : cueBox.left + cueBox.width / 2;
    const measureBox = screenBox(measure);
    const minLeft = measureBox ? measureBox.left + 2 : undefined;
    const maxRight = measureBox ? measureBox.right - 2 : undefined;
    let left = noteCenter - cueBox.width / 2;
    if (Number.isFinite(minLeft)) left = Math.max(minLeft, left);
    if (Number.isFinite(maxRight)) left = Math.min(left, maxRight - cueBox.width);
    const inkBottom = inkFloor(measure, left, left + cueBox.width, staffBottom);
    const gap = Math.max(6, staffH * 0.1);
    const move = cueJustBelowStaff(cueBox, staffBottom, noteCenter, {
      gap,
      noteBottom: headBox?.bottom,
      inkBottom,
      minLeft,
      maxRight,
    });
    const ceiling = nextHarmTop(svg, staffBottom);
    if (ceiling != null && move.top + cueBox.height + gap > ceiling) {
      const drop = move.top + cueBox.height + gap - ceiling;
      for (const system of svg.querySelectorAll(".system")) {
        const box = screenBox(system);
        if (!box || box.top < staffBottom) continue;
        const shift = screenDeltaToLocal(system, 0, drop);
        if (shift) translateSvg(system, shift.dx, shift.dy);
      }
    }
    const delta = screenDeltaToLocal(cue, move.dx, move.dy);
    if (delta) translateSvg(cue, delta.dx, delta.dy);
  }
}

/**
 * Pull chord symbols and cue words that hang outside the page back inside it.
 * Extra room is added as viewBox padding. The width is unchanged, so the staff
 * and chord size stay the same when nothing was clipped.
 */
function inkUserBounds(svg) {
  try {
    const box = svg.getBBox();
    if (box && box.width > 0 && box.height > 0) return box;
  } catch {
    // SVG not laid out yet.
  }
  return null;
}

export function padViewBoxToInk(svg, { topPad = 8, bottomPad = 8 } = {}) {
  const vb = svg?.viewBox?.baseVal;
  const rect = svg?.getBoundingClientRect?.();
  if (!vb?.width || !(rect?.width > 0)) return;
  const userPerPx = vb.width / rect.width;
  const ink = inkUserBounds(svg);
  let overflowTop = ink ? vb.y - ink.y : 0;
  let overflowBottom = ink ? (ink.y + ink.height) - (vb.y + vb.height) : 0;
  for (const el of svg.querySelectorAll(".harm, .dir.cue")) {
    const box = screenBox(el.querySelector("text") ?? el);
    if (!box) continue;
    overflowTop = Math.max(overflowTop, (rect.top - box.top) * userPerPx);
    overflowBottom = Math.max(overflowBottom, (box.bottom - rect.bottom) * userPerPx);
  }
  const next = expandedViewBox(vb, {
    top: overflowTop > 0.5 ? overflowTop + topPad * userPerPx : 0,
    bottom: overflowBottom > 0.5 ? overflowBottom + bottomPad * userPerPx : 0,
  });
  if (next.y === vb.y && next.height === vb.height) return;
  const n = (value) => Math.round(value * 100) / 100;
  svg.setAttribute("viewBox", `${n(next.x)} ${n(next.y)} ${n(next.width)} ${n(next.height)}`);
}

export function capCueText(text, barWidth, fontPx) {
  const width = Number(barWidth) || 0;
  const px = Number(fontPx) || 14;
  const maxChars = Math.max(4, Math.floor(width / Math.max(6, px * 0.58)));
  const value = String(text);
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(1, maxChars - 1))}…`;
}

export function svgHasBowingMarks(target) {
  if (!target) return false;
  if (typeof target === "string") return meiHasBowing(target);
  if (!target.querySelectorAll) return false;
  for (const el of target.querySelectorAll("[class], [artic]")) {
    const cls = el.getAttribute("class") || "";
    const artic = el.getAttribute("artic") || "";
    if (/upbow|downbow|bowing|dnbow|upbow/i.test(`${cls} ${artic}`)) return true;
  }
  return false;
}
