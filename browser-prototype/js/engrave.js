/**
 * Verovio drawing layer for the session paper and the dev gallery.
 * Layout numbers come from lesson.notationLayout; MEI comes from mei.js.
 */

import { chorusStaffFit } from "./lesson.js";
import { meiHasBowing } from "./mei.js";

const INK = "#2b211a";

let toolkit = null;
let toolkitPromise = null;

export function whenVerovioReady() {
  if (toolkit) return Promise.resolve(toolkit);
  if (toolkitPromise) return toolkitPromise;
  toolkitPromise = new Promise((resolve, reject) => {
    const vrv = globalThis.verovio;
    if (!vrv) {
      reject(new Error("Verovio toolkit is not loaded"));
      return;
    }
    const boot = () => {
      toolkit = new vrv.toolkit();
      resolve(toolkit);
    };
    if (vrv.module?.calledRun) {
      boot();
      return;
    }
    if (typeof vrv.module?.onRuntimeInitialized === "object" || typeof vrv.module?.onRuntimeInitialized === "function" || vrv.module) {
      const prev = vrv.module.onRuntimeInitialized;
      vrv.module.onRuntimeInitialized = () => {
        if (typeof prev === "function") prev();
        boot();
      };
      if (vrv.module.calledRun) boot();
      return;
    }
    boot();
  });
  return toolkitPromise;
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
    harmDist: 3.2,
    topMarginHarm: 2.0,
    leftMarginAccid: 1.25,
    rightMarginAccid: 0.7,
    xmlIdSeed: 1,
    svgCss: `.harm, .harm text { font-family: "Noto Sans", "Source Sans 3", sans-serif; font-weight: 700; fill: ${INK}; } .dir, .dir text { font-family: "Source Sans 3", sans-serif; font-weight: 700; fill: ${INK}; }`,
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

const SMUFL_PUA = /[\uE000-\uF8FF]/;

function restyleText(svg) {
  for (const el of svg.querySelectorAll(".harm text, .harm tspan, .dir text, .dir tspan")) {
    el.setAttribute("fill", INK);
  }
  for (const el of svg.querySelectorAll(".harm text, .harm tspan")) {
    if (SMUFL_PUA.test(el.textContent ?? "")) continue;
    el.setAttribute("font-family", "Noto Sans, Source Sans 3, sans-serif");
    el.setAttribute("font-weight", "700");
  }
  for (const el of svg.querySelectorAll(".dir text, .dir tspan")) {
    el.setAttribute("font-family", "Source Sans 3, sans-serif");
    el.setAttribute("font-weight", "700");
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
    restyleText(svg);
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
