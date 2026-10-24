/**
 * Verovio drawing layer for the session paper and the dev gallery.
 * Layout numbers come from lesson.notationLayout; MEI comes from mei.js.
 */

import { CUE_PX, STAFF_PX } from "./lesson.js";
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
    spacingSystem: cue ? 10 : 6,
    spacingStaff: 8,
    pageMarginTop: 24,
    pageMarginBottom: cue ? 36 : 16,
    pageMarginLeft: 16,
    pageMarginRight: 16,
    harmDist: 1.05,
    topMarginHarm: 0.7,
    lyricSize: 2.6,
    lyricTopMinMargin: 1.2,
    leftMarginAccid: 1.25,
    rightMarginAccid: 0.7,
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

export function compactChordSymbol(text) {
  return decodeFigbassText(text).replace(/\s+/g, "");
}

function leafTspans(textEl) {
  return [...textEl.querySelectorAll("tspan")].filter((el) => !el.children.length);
}

function chordFontVU(layout = {}) {
  // Verovio draws text in definition-factor coordinates, not viewBox CSS px.
  // 400 VU ≈ 16–18px cap height at a 40px staff (1024×1366).
  const staffPx = staffPxOf(layout);
  return Math.round(400 * staffPx / STAFF_PX);
}

function cueFontVU(layout = {}) {
  const staffPx = staffPxOf(layout);
  const cuePx = layout.annotationPx || CUE_PX;
  return Math.round(230 * cuePx / CUE_PX * staffPx / STAFF_PX);
}

function restyleText(svg, layout = {}) {
  const chordVU = chordFontVU(layout);
  const cueVU = cueFontVU(layout);
  for (const el of svg.querySelectorAll(".harm text, .harm tspan, .dir text, .dir tspan")) {
    el.setAttribute("fill", INK);
  }
  for (const text of svg.querySelectorAll(".harm text")) {
    const leaves = leafTspans(text);
    const raw = leaves.length
      ? leaves.map((el) => el.textContent ?? "").join("")
      : (text.textContent ?? "");
    const compact = compactChordSymbol(raw);
    if (!compact) continue;
    const anchor = leaves[0] ?? text;
    const x = anchor.getAttribute("x") ?? text.getAttribute("x");
    const y = anchor.getAttribute("y") ?? text.getAttribute("y");
    text.replaceChildren();
    const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
    tspan.textContent = compact;
    tspan.setAttribute("font-family", "Noto Sans, Source Sans 3, sans-serif");
    tspan.setAttribute("font-weight", "700");
    tspan.setAttribute("font-size", `${chordVU}px`);
    tspan.setAttribute("fill", INK);
    tspan.setAttribute("letter-spacing", "0");
    if (x != null) tspan.setAttribute("x", x);
    if (y != null) tspan.setAttribute("y", y);
    text.append(tspan);
    text.setAttribute("font-family", "Noto Sans, Source Sans 3, sans-serif");
    text.setAttribute("font-weight", "700");
    text.setAttribute("font-size", `${chordVU}px`);
    text.setAttribute("letter-spacing", "0");
    text.setAttribute("fill", INK);
  }
  for (const el of svg.querySelectorAll(".dir text, .dir tspan")) {
    el.setAttribute("font-family", "Source Sans 3, sans-serif");
    el.setAttribute("font-weight", "400");
    el.setAttribute("font-style", "italic");
    el.setAttribute("font-size", `${cueVU}px`);
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

function harmAnchorX(harm) {
  const el = harm.querySelector("tspan") ?? harm.querySelector("text") ?? harm;
  const x = parseFloat(el.getAttribute("x") || "");
  if (Number.isFinite(x)) return x;
  try {
    return harmTextEl(harm).getBBox().x;
  } catch {
    return 0;
  }
}

function harmTextWidth(harm) {
  const text = harmTextEl(harm);
  if (typeof text.getComputedTextLength === "function") {
    try {
      const width = text.getComputedTextLength();
      if (width > 0) return width;
    } catch {
      // fall through to bbox
    }
  }
  try {
    return text.getBBox().width;
  } catch {
    return 0;
  }
}

export function separateChordSymbols(svg) {
  if (!svg?.querySelectorAll) return;
  const harms = [...svg.querySelectorAll(".harm")];
  for (let pass = 0; pass < 8; pass += 1) {
    let moved = false;
    for (let i = 0; i < harms.length - 1; i += 1) {
      let boxA;
      let boxB;
      try {
        boxA = harmTextEl(harms[i]).getBBox();
        boxB = harmTextEl(harms[i + 1]).getBBox();
      } catch {
        continue;
      }
      if (Math.abs((boxA.y + boxA.height / 2) - (boxB.y + boxB.height / 2)) > Math.max(boxA.height, boxB.height) * 0.8) {
        continue;
      }
      const xA = harmAnchorX(harms[i]);
      const xB = harmAnchorX(harms[i + 1]);
      const overlap = xA + harmTextWidth(harms[i]) + 48 - xB;
      if (overlap <= 0) continue;
      const floor = 240;
      for (const harm of [harms[i], harms[i + 1]]) {
        for (const el of harm.querySelectorAll("text, tspan")) {
          const size = parseFloat(el.getAttribute("font-size") || "0");
          if (size <= floor) continue;
          el.setAttribute("font-size", `${Math.max(floor, size * 0.9)}px`);
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
}

export function centerSlashNoteheads(svg) {
  if (!svg?.querySelectorAll) return;
  for (const staff of svg.querySelectorAll(".staff")) {
    let staffBox;
    try {
      staffBox = staff.getBBox();
    } catch {
      continue;
    }
    if (!staffBox?.height) continue;
    const mid = staffBox.y + staffBox.height / 2;
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
      if (Math.abs(dy) < 0.35) continue;
      const prev = target.getAttribute("transform") || "";
      target.setAttribute("transform", `${prev} translate(0 ${dy})`.trim());
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
  const svg = mountSvg(target, parts.join(""));
  if (svg) {
    recolor(svg);
    restyleText(svg, layout);
    separateChordSymbols(svg);
    centerSlashNoteheads(svg);
    applyFixedStaffSize(target, svg, layout);
  }
  return {
    svg,
    layout: { ...layout, staffwidth: width },
    elapsedMs: performance.now() - started,
    pageCount: pages,
  };
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

export function measureEngraving(root) {
  const svg = root?.querySelector?.("svg");
  if (!svg) return null;
  const svgBox = svg.getBoundingClientRect();
  const vb = svg.viewBox?.baseVal;
  const scale = vb?.width && svgBox.width ? svgBox.width / vb.width : 1;
  const staffs = [...svg.querySelectorAll(".staff")];
  const staffPx = staffs.map((staff) => fiveLineStaffHeight(staff) * scale);
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
