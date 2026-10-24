/**
 * Dev-only visual check page. Not linked from the app.
 * Renders Learn / standards / Play / tune staves with the same ABC the session uses.
 */
import {
  chorusStaffABC,
  getKey,
  phraseABC,
} from "./music.js";
import {
  chorusStaffFit,
  notationLayout,
  slashFitsStaff,
  slashStrokeBox,
} from "./lesson.js";

const KEYS = [
  { id: "C", label: "C" },
  { id: "G", label: "G" },
  { id: "Bb", label: "B♭" },
  { id: "F#", label: "F♯" },
];

const LICK_LEARNS = [
  { lickId: "cmar", applicationId: "cmar-learn", name: "Cry Me a River" },
  { lickId: "emr", applicationId: "emr-learn", name: "Embellished minor resolution" },
  { lickId: "gts", applicationId: "gts-learn", name: "Guide tone sequence" },
  { lickId: "bo", applicationId: "bo-learn", name: "Bird opening" },
  { lickId: "hsr", applicationId: "hsr-learn", name: "Honeysuckle Rose" },
];

const STANDARDS = [
  { id: "standards-cmar", title: "CMAR · Autumn Leaves (minor home)", applicationId: "minor-home", keyId: "G", mode: "model" },
  { id: "standards-emr", title: "EMR · Autumn Leaves", applicationId: "emr-autumn-leaves-a", keyId: "G", mode: "model" },
  { id: "standards-gts", title: "GTS · Oleo", applicationId: "gts-oleo", keyId: "Bb", mode: "model" },
  { id: "standards-bo", title: "BO · Billie's Bounce", applicationId: "bo-billies", keyId: "F", mode: "model" },
  { id: "standards-hsr", title: "HSR · Honeysuckle Rose", applicationId: "hsr-honeysuckle", keyId: "F", mode: "model" },
];

const TUNES = [
  { id: "tune-st-thomas", title: "St. Thomas", applicationId: "tune-st-thomas", keyId: "C" },
  { id: "tune-four", title: "Four", applicationId: "tune-four", keyId: "Eb" },
  { id: "tune-attya", title: "All the Things You Are", applicationId: "tune-attya", keyId: "Ab" },
];

export function galleryShots() {
  const shots = [];
  for (const lick of LICK_LEARNS) {
    for (const key of KEYS) {
      shots.push({
        id: `learn-${lick.lickId}-${key.id}`,
        title: `Learn · ${lick.name} in ${key.label}`,
        applicationId: lick.applicationId,
        keyId: key.id,
        mode: "phrase",
        showCues: false,
      });
    }
  }
  for (const row of STANDARDS) {
    shots.push({
      ...row,
      showCues: true,
    });
  }
  shots.push({
    id: "play-billies",
    title: "Play card · Billie's Bounce",
    applicationId: "bo-billies",
    keyId: "F",
    mode: "landing",
    showCues: true,
    slashes: true,
  });
  for (const row of TUNES) {
    shots.push({
      ...row,
      mode: "model",
      showCues: true,
    });
  }
  return shots;
}

export function abcForShot(shot) {
  const key = getKey(shot.keyId);
  if (shot.mode === "phrase") {
    return phraseABC(key, "concert", shot.applicationId, "bass", 0);
  }
  return chorusStaffABC({
    concertKey: key,
    displayMode: "concert",
    applicationId: shot.applicationId,
    clef: "bass",
    melodyRegister: 0,
    mode: shot.mode,
    showCues: Boolean(shot.showCues),
    barsPerLine: 4,
  });
}

function standLayout(phrase) {
  return notationLayout({
    staffWidth: 960,
    viewportWidth: 1024,
    viewportHeight: 1366,
    showPhraseNotation: phrase,
    showEntranceCues: true,
  });
}

function abcRenderOptions(layout, staffwidth) {
  const width = Math.max(280, staffwidth);
  const format = {
    chordfont: layout.chordfont,
    annotationfont: layout.annotationfont,
  };
  if (layout.staffsep) format.staffsep = layout.staffsep;
  return {
    add_classes: true,
    paddingtop: layout.paddingtop,
    paddingbottom: layout.paddingbottom,
    staffwidth: width,
    scale: layout.scale,
    responsive: "resize",
    stretchlast: false,
    jazzchords: true,
    format,
  };
}

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

function applyLandingSlashes(root, layout) {
  const staffs = [...root.querySelectorAll(".abcjs-staff")];
  for (const rest of root.querySelectorAll(".abcjs-rest")) {
    if (rest.querySelector(".abcjs-chord, .abcjs-annotation")) continue;
    const glyph = rest.querySelector("path, ellipse") ?? rest;
    const box = elementBox(glyph);
    const staffBox = nearestStaffBox(rest, staffs);
    if (!box || !staffBox) continue;
    if (box.width < 0.6 && box.height < 0.6) continue;
    const stroke = slashStrokeBox(box, staffBox);
    if (!slashFitsStaff(stroke, staffBox)) continue;
    hideNoteGlyphs(rest, true);
    for (const g of rest.querySelectorAll("path, ellipse")) {
      if (isCueNode(g)) continue;
      g.setAttribute("opacity", "0");
    }
    const slash = document.createElementNS("http://www.w3.org/2000/svg", "line");
    slash.setAttribute("x1", String(stroke.x1));
    slash.setAttribute("y1", String(stroke.y1));
    slash.setAttribute("x2", String(stroke.x2));
    slash.setAttribute("y2", String(stroke.y2));
    slash.setAttribute("stroke", "#2b211a");
    slash.setAttribute("stroke-width", String(layout.slashStroke ?? 1.45));
    slash.setAttribute("stroke-linecap", "round");
    slash.classList.add("rhythm-slash");
    rest.append(slash);
  }
}

function fitChorus(svg, wrap, layout) {
  const minStaffPx = layout?.minStaffPx ?? 0;
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
  svg.style.setProperty("width", "100%", "important");
}

function renderShot(paper, shot) {
  const phrase = shot.mode === "phrase";
  const layout = standLayout(phrase);
  const abc = abcForShot(shot);
  paper.replaceChildren();
  if (!window.ABCJS) {
    const pre = document.createElement("pre");
    pre.textContent = abc;
    paper.append(pre);
    return;
  }
  const width = Math.max(280, paper.clientWidth || 960);
  window.ABCJS.renderAbc(paper, abc, abcRenderOptions(layout, width - 24));
  if (shot.slashes) applyLandingSlashes(paper, layout);
  const svg = paper.querySelector("svg");
  if (svg && layout.fillAxis === "fit") fitChorus(svg, paper, layout);
}

function selectedShot() {
  const id = new URLSearchParams(location.search).get("shot");
  const shots = galleryShots();
  if (!id) return null;
  return shots.find((shot) => shot.id === id) ?? null;
}

function mount() {
  const root = document.getElementById("gallery");
  const one = selectedShot();
  const shots = one ? [one] : galleryShots();
  document.body.classList.toggle("solo", Boolean(one));
  if (one) document.title = `DuoJazz gallery · ${one.title}`;
  for (const shot of shots) {
    const section = document.createElement("section");
    section.className = "shot";
    section.dataset.shot = shot.id;
    section.id = shot.id;
    const head = document.createElement("header");
    const h = document.createElement("h2");
    h.textContent = shot.title;
    const meta = document.createElement("p");
    meta.textContent = `${shot.id} · 1024×1366`;
    head.append(h, meta);
    const paper = document.createElement("div");
    paper.className = "paper";
    section.append(head, paper);
    root.append(section);
    requestAnimationFrame(() => renderShot(paper, shot));
  }
}

if (typeof document !== "undefined" && document.getElementById("gallery")) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
}
