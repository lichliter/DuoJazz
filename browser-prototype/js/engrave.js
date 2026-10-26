/**
 * Verovio drawing layer for the session paper and the dev gallery.
 * Layout numbers come from lesson.notationLayout; MEI comes from mei.js.
 */

import { STAFF_PX } from "./lesson.js";
import { meiHasBowing } from "./mei.js";

const INK = "#2b211a";
const READY_TIMEOUT_MS = 20000;
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
    xmlIdSeed: 1,
    svgCss: `.harm, .harm text, .harm tspan { font-family: "Noto Sans", "Source Sans 3", sans-serif; font-weight: 700; font-stretch: normal; letter-spacing: 0; fill: ${INK}; } .dir, .dir text, .dir tspan { font-family: "Source Sans 3", sans-serif; font-weight: 400; font-style: italic; fill: ${INK}; }`,
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

/** Split chord and key labels so each accidental can use a font that actually has the glyph. */
export function musicTextParts(text) {
  const value = String(text ?? "");
  const parts = [];
  const re = /[♭♯♮𝄫𝄪]/gu;
  let last = 0;
  for (const match of value.matchAll(re)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ text: value.slice(last, index) });
    parts.push({ accidental: match[0] });
    last = index + match[0].length;
  }
  if (last < value.length) parts.push({ text: value.slice(last) });
  return parts;
}

export function fillMusicLabel(el, text) {
  if (!el) return;
  const parts = musicTextParts(text);
  el.replaceChildren();
  if (!parts.length) return;
  for (const part of parts) {
    if (part.accidental) {
      const span = document.createElement("span");
      span.className = part.accidental === "♯" || part.accidental === "𝄪"
        ? "accidental is-sharp"
        : "accidental";
      span.textContent = part.accidental;
      el.append(span);
    } else if (part.text) {
      el.append(part.text);
    }
  }
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
  const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
  tspan.textContent = compact;
  tspan.setAttribute("font-family", "Noto Sans, Source Sans 3, sans-serif");
  tspan.setAttribute("font-weight", "700");
  tspan.setAttribute("font-size", `${chordVU}px`);
  tspan.setAttribute("fill", INK);
  tspan.setAttribute("letter-spacing", "0");
  tspan.setAttribute("kerning", "0");
  tspan.setAttribute("xml:space", "preserve");
  if (x != null) tspan.setAttribute("x", x);
  if (y != null) tspan.setAttribute("y", y);
  text.append(tspan);
  text.setAttribute("font-family", "Noto Sans, Source Sans 3, sans-serif");
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

export function separateChordSymbols(svg) {
  if (!svg?.querySelectorAll) return;
  const harms = [...svg.querySelectorAll(".harm")];
  const floor = 160;
  const shrink = (harm) => {
    let changed = false;
    for (const el of harm.querySelectorAll("text, tspan")) {
      const size = parseFloat(el.getAttribute("font-size") || "0");
      if (size <= floor) continue;
      el.setAttribute("font-size", `${Math.max(floor, size * 0.88)}px`);
      changed = true;
    }
    return changed;
  };
  for (let i = 0; i < harms.length - 1; i += 1) {
    for (let step = 0; step < 12; step += 1) {
      let boxA;
      let boxB;
      try {
        boxA = harmTextEl(harms[i]).getBoundingClientRect();
        boxB = harmTextEl(harms[i + 1]).getBoundingClientRect();
      } catch {
        break;
      }
      if (!boxA.width || !boxB.width) break;
      if (Math.abs((boxA.y + boxA.height / 2) - (boxB.y + boxB.height / 2)) > Math.max(boxA.height, boxB.height) * 0.8) {
        break;
      }
      if (boxA.right + 6 <= boxB.left) break;
      const movedA = shrink(harms[i]);
      const movedB = shrink(harms[i + 1]);
      if (!movedA && !movedB) break;
      void harmTextEl(harms[i]).getBoundingClientRect();
    }
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

function staffLineBox(staff) {
  let best = null;
  for (const path of staff?.querySelectorAll?.(":scope > path") ?? []) {
    let box;
    try {
      box = path.getBBox();
    } catch {
      continue;
    }
    if (!best || box.width > best.width) best = box;
  }
  return best;
}

function beatSlotsForStaff(staff, beats = 4) {
  const lines = staffLineBox(staff);
  if (!lines) return [];
  const notes = [...staff.querySelectorAll(".note")];
  let left = lines.x;
  const right = lines.x + lines.width;
  if (notes.length) {
    try {
      const noteLeft = Math.min(...notes.map((note) => note.getBBox().x));
      if (Number.isFinite(noteLeft) && noteLeft > left + 8) left = noteLeft;
    } catch {
      // keep the line box
    }
  }
  const width = Math.max(8, right - left);
  const slot = width / beats;
  return Array.from({ length: beats }, (_, i) => ({ x: left + i * slot, w: slot }));
}

export function centerSlashNoteheads(svg) {
  if (!svg?.querySelectorAll) return;
  for (const staff of svg.querySelectorAll(".staff")) {
    const mid = middleStaffLineY(staff);
    if (mid == null) continue;
    const slots = beatSlotsForStaff(staff);
    const slashNotes = [...staff.querySelectorAll(".note")].filter((el) => isSlashHead(el));
    const heads = [...staff.querySelectorAll(".notehead, .note, [class*='slash']")].filter(isSlashHead);
    const seen = new Set();
    for (const head of heads) {
      const target = head.classList?.contains("notehead") || head.classList?.contains("slash")
        ? head
        : head.closest(".notehead") ?? head;
      if (seen.has(target)) continue;
      seen.add(target);
      let box;
      try {
        box = target.getBBox();
      } catch {
        continue;
      }
      if (!box.height) continue;
      const dy = mid - (box.y + box.height / 2);
      let dx = 0;
      const note = target.closest(".note") ?? head.closest?.(".note");
      if (note && slots.length === 4 && slashNotes.length) {
        const trailing = slashNotes.indexOf(note);
        const slotIndex = slashNotes.length === 4
          ? trailing
          : 4 - slashNotes.length + trailing;
        const slot = slots[Math.max(0, Math.min(3, slotIndex))];
        if (slot) dx = slot.x + slot.w / 2 - (box.x + box.width / 2);
      }
      if (Math.abs(dy) < 0.35 && Math.abs(dx) < 0.35) continue;
      const prev = target.getAttribute("transform") || "";
      target.setAttribute("transform", `${prev} translate(${dx} ${dy})`.trim());
    }
  }
}

function applyFixedStaffSize(target, svg, layout) {
  const staffPx = staffPxOf(layout);
  const wrap = target.parentElement;
  const vb = svg?.viewBox?.baseVal;
  if (!svg || !vb?.width) return;
  target.classList.toggle("notation-natural", isNaturalWidth(layout));
  if (!isNaturalWidth(layout)) {
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
  if (svg) {
    recolor(svg);
    restyleText(svg, layout);
    mergeSplitChordSymbols(svg);
    separateChordSymbols(svg);
    centerSlashNoteheads(svg);
    applyFixedStaffSize(target, svg, layout);
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
