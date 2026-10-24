/**
 * Verovio drawing layer for the session paper and the dev gallery.
 * Layout numbers come from lesson.notationLayout; MEI comes from mei.js.
 */

import { chorusStaffFit } from "./lesson.js";
import { meiHasBowing } from "./mei.js";

const INK = "#2b211a";
const READY_TIMEOUT_MS = 20000;

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

export function verovioOptions(layout = {}, cssWidth = 760, { hasSb = false } = {}) {
  const unit = 12;
  const staffVU = 8 * unit;
  const phrase = layout.fillAxis === "width";
  const shortFill = phrase && (layout.barsPerLine ?? 2) <= 2;
  const targetStaff = layout.minStaffPx
    || (shortFill ? 132 : phrase ? 78 : 72);
  const width = Math.max(280, cssWidth);
  const pageWidth = Math.round(staffVU * width / Math.max(48, targetStaff));
  const cue = (layout.annotationPx ?? 0) > 16 || (layout.paddingbottom ?? 0) > 30;
  return {
    font: "Leipzig",
    scale: 100,
    unit,
    pageWidth: Math.max(400, Math.min(8000, pageWidth)),
    pageHeight: 24000,
    adjustPageHeight: true,
    adjustPageWidth: shortFill,
    breaks: hasSb ? "encoded" : "none",
    minLastJustification: 0.88,
    justifyVertically: false,
    header: "none",
    footer: "none",
    svgViewBox: true,
    svgHtml5: true,
    beamMaxSlope: 4,
    spacingSystem: cue ? 16 : 8,
    spacingStaff: 8,
    pageMarginTop: Math.max(48, Math.round((layout.paddingtop ?? 12) + 32)),
    pageMarginBottom: Math.max(cue ? 80 : 28, Math.round(layout.paddingbottom ?? 16)),
    pageMarginLeft: 18,
    pageMarginRight: 18,
    harmDist: 2.2,
    topMarginHarm: 1.0,
    lyricSize: shortFill ? 3.9 : 3.05,
    leftMarginAccid: 1.25,
    rightMarginAccid: 0.7,
    xmlIdSeed: 1,
    svgCss: `.harm, .harm text, .harm tspan { font-family: "Noto Sans", "Source Sans 3", sans-serif; font-weight: 700; font-stretch: normal; letter-spacing: 0; fill: ${INK}; } .dir, .dir text { font-family: "Source Sans 3", sans-serif; font-weight: 700; fill: ${INK}; }`,
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

function restyleText(svg, layout = {}) {
  const phrase = layout.fillAxis === "width";
  const shortFill = phrase && (layout.barsPerLine ?? 2) <= 2;
  const cueVU = Math.round((shortFill ? 340 : 250) * 0.88);
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
    const size = parseFloat(anchor.getAttribute("font-size") || text.getAttribute("font-size") || "0");
    const minVU = shortFill ? 360 : 240;
    const maxVU = shortFill ? 480 : 330;
    const target = Math.min(maxVU, Math.max(minVU, size > 0 ? size * 1.35 : minVU));
    const x = anchor.getAttribute("x") ?? text.getAttribute("x");
    const y = anchor.getAttribute("y") ?? text.getAttribute("y");
    text.replaceChildren();
    const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
    tspan.textContent = compact;
    tspan.setAttribute("font-family", "Noto Sans, Source Sans 3, sans-serif");
    tspan.setAttribute("font-weight", "700");
    tspan.setAttribute("font-size", `${Math.round(target)}px`);
    tspan.setAttribute("fill", INK);
    tspan.setAttribute("letter-spacing", "0");
    if (x != null) tspan.setAttribute("x", x);
    if (y != null) tspan.setAttribute("y", y);
    text.append(tspan);
    text.setAttribute("font-family", "Noto Sans, Source Sans 3, sans-serif");
    text.setAttribute("font-weight", "700");
    text.setAttribute("font-size", `${Math.round(target)}px`);
    text.setAttribute("letter-spacing", "0");
    text.setAttribute("fill", INK);
  }
  for (const el of svg.querySelectorAll(".dir text, .dir tspan")) {
    el.setAttribute("font-family", "Source Sans 3, sans-serif");
    el.setAttribute("font-weight", "700");
    if (el.children.length) continue;
    const size = parseFloat(el.getAttribute("font-size") || "0");
    if (size > cueVU) el.setAttribute("font-size", `${cueVU}px`);
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

export function separateChordSymbols(svg) {
  if (!svg?.querySelectorAll) return;
  const harms = [...svg.querySelectorAll(".harm")];
  for (let pass = 0; pass < 6; pass += 1) {
    let moved = false;
    for (let i = 0; i < harms.length - 1; i += 1) {
      let boxA;
      let boxB;
      try {
        boxA = harms[i].getBBox();
        boxB = harms[i + 1].getBBox();
      } catch {
        continue;
      }
      if (Math.abs((boxA.y + boxA.height / 2) - (boxB.y + boxB.height / 2)) > Math.max(boxA.height, boxB.height) * 0.8) {
        continue;
      }
      const overlap = boxA.x + boxA.width + 12 - boxB.x;
      if (overlap <= 0) continue;
      for (const harm of [harms[i], harms[i + 1]]) {
        for (const el of harm.querySelectorAll("text, tspan")) {
          const size = parseFloat(el.getAttribute("font-size") || "0");
          if (size <= 220) continue;
          el.setAttribute("font-size", `${Math.max(220, size * 0.88)}px`);
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

function fitStaff(target, svg, layout) {
  const minStaffPx = layout?.minStaffPx ?? 0;
  const wrap = target.parentElement;
  const staff = svg?.querySelector(".staff");
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
  svg.style.setProperty("width", "100%", "important");
  svg.style.setProperty("height", `${Math.round(wrap.clientWidth * vb.height / fit.viewBoxWidth)}px`, "important");
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
    if (options.fitChorus || layout.fillAxis === "fit") fitStaff(target, svg, layout);
  }
  return {
    svg,
    layout: { ...layout, staffwidth: width },
    elapsedMs: performance.now() - started,
    pageCount: pages,
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
