/**
 * Dev-only engraving gallery. Not linked from the app.
 * Renders Learn cards, one standard per module, a Play card, and three tune pages.
 */

import {
  chorusStaffABC,
  displayKey,
  getKey,
  phraseABC,
  phraseMeasureCount,
  applicationKeyQuality,
} from "./music.js";
import { chorusStaffMEI, phraseMEI } from "./mei.js";
import {
  NOTATION_SCALE_LABELS,
  NOTATION_SCALE_VALUES,
  notationLayout,
  persistNotationScale,
  resolveNotationScale,
} from "./lesson.js";
import { MODULES } from "./registry.js";
import { TUNES, tuneById } from "./tunes.js";
import { engraveMei, measureEngraving, whenVerovioReady } from "./engrave.js";

const LEARN_KEYS = ["C", "G", "Bb", "F#"];
const VIEWPORT = { width: 1024, height: 1366, staffWidth: 980 };
const COMPARE_PIECES = [
  { id: "st-thomas", title: "St. Thomas", kind: "tune", applicationId: "tune-st-thomas", keyId: "C", showCues: true, phrase: false },
  { id: "gts-learn-bb", title: "GTS Learn in B♭", kind: "learn", applicationId: "gts-learn", keyId: "Bb", showCues: false, phrase: true },
];

let galleryScale = 1;

const TUNE_PAGES = [
  { id: "st-thomas", shotId: "st-thomas" },
  { id: "four", shotId: "four" },
  { id: "attya", shotId: "attya" },
];

export function learnLessons() {
  return MODULES.map((module) => {
    const lesson = module.lessons.find((item) => item.kind === "learn");
    return {
      moduleId: module.id,
      moduleName: module.name,
      lessonId: lesson.id,
      applicationId: lesson.applicationId,
      defaultKeyId: lesson.defaultKeyId,
    };
  });
}

export function standardLessons() {
  return MODULES.map((module) => {
    const lesson = module.lessons.find((item) => item.kind === "integrate" && item.group !== "your-tunes");
    return {
      moduleId: module.id,
      moduleName: module.name,
      lessonId: lesson.id,
      applicationId: lesson.applicationId,
      title: lesson.coverTitle ?? lesson.title,
      defaultKeyId: lesson.defaultKeyId,
    };
  });
}

export function galleryPanels() {
  const panels = [];
  for (const learn of learnLessons()) {
    for (const keyId of LEARN_KEYS) {
      const gtsBb = learn.moduleId === "gts" && keyId === "Bb";
      panels.push({
        id: gtsBb ? "gts-learn-bb" : `learn-${learn.moduleId}-${keyId}`,
        section: "learn",
        kind: "learn",
        title: `${learn.moduleName} · Learn`,
        subtitle: keyLabel(keyId, learn.applicationId),
        applicationId: learn.applicationId,
        keyId,
        showCues: false,
        phrase: true,
        shot: gtsBb,
      });
    }
  }
  for (const standard of standardLessons()) {
    panels.push({
      id: `standard-${standard.moduleId}`,
      section: "standards",
      kind: "landing",
      title: `${standard.moduleName} · ${standard.title}`,
      subtitle: keyLabel(standard.defaultKeyId, standard.applicationId),
      applicationId: standard.applicationId,
      keyId: standard.defaultKeyId,
      showCues: true,
      phrase: false,
    });
  }
  panels.push({
    id: "billies-bounce-play",
    section: "play",
    kind: "play",
    title: "Billie's Bounce · Play",
    subtitle: keyLabel("F", "bo-billies"),
    applicationId: "bo-billies",
    keyId: "F",
    showCues: true,
    phrase: false,
    shot: true,
  });
  for (const page of TUNE_PAGES) {
    const tune = tuneById(page.id);
    const applicationId = `tune-${tune.id}`;
    panels.push({
      id: page.shotId,
      section: "tunes",
      kind: "tune",
      title: tune.title,
      subtitle: keyLabel(tune.key, applicationId),
      applicationId,
      keyId: tune.key,
      showCues: true,
      phrase: false,
      shot: true,
    });
  }
  return panels;
}

export function comparePanels() {
  return COMPARE_PIECES.flatMap((piece) => NOTATION_SCALE_VALUES.map((notationScale) => ({
    id: `compare-${piece.id}-${String(notationScale).replace(".", "p")}`,
    section: "compare",
    kind: piece.kind,
    title: `${piece.title} · ${NOTATION_SCALE_LABELS[notationScale]}`,
    subtitle: keyLabel(piece.keyId, piece.applicationId),
    applicationId: piece.applicationId,
    keyId: piece.keyId,
    showCues: piece.showCues,
    phrase: piece.phrase,
    notationScale,
    shot: false,
  })));
}

function keyLabel(keyId, applicationId) {
  const shown = displayKey(getKey(keyId), "concert", applicationKeyQuality(applicationId));
  return shown.name;
}

export function abcForPanel(panel) {
  const concertKey = getKey(panel.keyId);
  const layout = layoutForPanel(panel);
  if (panel.phrase) {
    return phraseABC(concertKey, "concert", panel.applicationId, "bass", 0, {
      barsPerLine: layout.barsPerLine,
    });
  }
  return chorusStaffABC({
    concertKey,
    displayMode: "concert",
    applicationId: panel.applicationId,
    clef: "bass",
    melodyRegister: 0,
    mode: "landing",
    showCues: panel.showCues,
    barsPerLine: layout.barsPerLine,
  });
}

export function meiForPanel(panel) {
  const concertKey = getKey(panel.keyId);
  const layout = layoutForPanel(panel);
  if (panel.phrase) {
    return phraseMEI(concertKey, "concert", panel.applicationId, "bass", 0, {
      barsPerLine: layout.barsPerLine,
    });
  }
  return chorusStaffMEI({
    concertKey,
    displayMode: "concert",
    applicationId: panel.applicationId,
    clef: "bass",
    melodyRegister: 0,
    mode: panel.kind === "play" || panel.kind === "landing" || panel.kind === "tune" ? "landing" : "model",
    showCues: panel.showCues,
    barsPerLine: layout.barsPerLine,
  });
}

function layoutForPanel(panel, staffWidth = VIEWPORT.staffWidth) {
  return notationLayout({
    staffWidth,
    viewportWidth: VIEWPORT.width,
    viewportHeight: VIEWPORT.height,
    showPhraseNotation: Boolean(panel.phrase),
    showEntranceCues: Boolean(panel.showCues),
    phraseBars: panel.phrase ? phraseMeasureCount(panel.applicationId) : undefined,
    notationScale: panel.notationScale ?? galleryScale,
  });
}

function renderPanel(panel, paper) {
  const layout = layoutForPanel(panel, paper.clientWidth || VIEWPORT.staffWidth);
  paper.classList.toggle("slash", false);
  return engraveMei(paper, meiForPanel(panel), {
    layout,
    width: paper.clientWidth || VIEWPORT.staffWidth,
  }).then((engraved) => {
    if (panel.section === "compare") {
      const measured = measureEngraving(paper);
      const meta = paper.closest("article")?.querySelector("header p");
      const staff = Math.round(measured?.staffMean || layout.minStaffPx || 0);
      if (meta && staff) {
        meta.textContent = `${panel.subtitle} · staff ${staff}px`;
      }
    }
    return engraved;
  });
}

function sectionEl(id, title) {
  const section = document.createElement("section");
  section.id = id;
  section.className = "gallery-section";
  const heading = document.createElement("h2");
  heading.textContent = title;
  section.append(heading);
  return section;
}

function mountPanel(panel, parent) {
  const article = document.createElement("article");
  article.id = panel.id;
  article.className = panel.shot ? "gallery-card shot" : "gallery-card";
  article.dataset.kind = panel.kind;
  if (panel.notationScale) article.dataset.notation = String(panel.notationScale);
  const head = document.createElement("header");
  const title = document.createElement("h3");
  title.textContent = panel.title;
  const meta = document.createElement("p");
  meta.textContent = panel.subtitle;
  head.append(title, meta);
  const wrap = document.createElement("div");
  wrap.className = "paper-wrap";
  const paper = document.createElement("div");
  paper.className = "paper";
  paper.setAttribute("aria-label", `${panel.title} notation`);
  wrap.append(paper);
  article.append(head, wrap);
  parent.append(article);
  return paper;
}

let mainPapers = [];

function bindSizeSwitcher() {
  const group = document.getElementById("gallery-size");
  if (!group) return;
  const buttons = [...group.querySelectorAll("[data-notation]")];
  const paint = () => {
    for (const btn of buttons) {
      const value = Number(btn.dataset.notation);
      btn.setAttribute("aria-pressed", String(value === galleryScale));
    }
  };
  group.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-notation]");
    if (!btn) return;
    const next = persistNotationScale(btn.dataset.notation);
    if (next == null || next === galleryScale) return;
    galleryScale = next;
    paint();
    for (const [panel, paper] of mainPapers) renderPanel(panel, paper);
  });
  paint();
}

function boot() {
  if (typeof document === "undefined") return;
  const root = document.getElementById("gallery");
  if (!root) return;
  galleryScale = resolveNotationScale();
  bindSizeSwitcher();
  const panels = galleryPanels();
  const compared = comparePanels();
  const sections = {
    compare: sectionEl("compare", "Size compare · St. Thomas and GTS Learn in B♭"),
    learn: sectionEl("learn-licks", "Learn cards · C, G, B♭, F♯"),
    standards: sectionEl("standards", "One standards lesson per module"),
    play: sectionEl("play-card", "Play card"),
    tunes: sectionEl("tune-pages", "Tune pages"),
  };
  mainPapers = [];
  const comparePapers = [];
  for (const panel of compared) {
    comparePapers.push([panel, mountPanel(panel, sections.compare)]);
  }
  for (const panel of panels) {
    mainPapers.push([panel, mountPanel(panel, sections[panel.section])]);
  }
  // Engrave after insert so SVG getBBox has real geometry.
  root.replaceChildren(
    sections.compare,
    sections.learn,
    sections.standards,
    sections.play,
    sections.tunes,
  );
  void root.offsetWidth;
  whenVerovioReady().then(() => {
    for (const [panel, paper] of comparePapers) renderPanel(panel, paper);
    for (const [panel, paper] of mainPapers) renderPanel(panel, paper);
  }).catch((err) => {
    root.textContent = `Verovio failed to load: ${err.message}`;
  });
}

if (typeof document !== "undefined") {
  const start = () => {
    if (globalThis.verovio) boot();
    else window.addEventListener("load", boot, { once: true });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
}

export { COMPARE_PIECES, LEARN_KEYS, TUNE_PAGES, TUNES, VIEWPORT };
