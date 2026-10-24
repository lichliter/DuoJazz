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
import { notationLayout } from "./lesson.js";
import { MODULES } from "./registry.js";
import { TUNES, tuneById } from "./tunes.js";
import { engraveAbc } from "./engrave.js";

const LEARN_KEYS = ["C", "G", "Bb", "F#"];
const VIEWPORT = { width: 1024, height: 1366, staffWidth: 980 };

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

function layoutForPanel(panel, staffWidth = VIEWPORT.staffWidth) {
  return notationLayout({
    staffWidth,
    viewportWidth: VIEWPORT.width,
    viewportHeight: VIEWPORT.height,
    showPhraseNotation: Boolean(panel.phrase),
    showEntranceCues: Boolean(panel.showCues),
    phraseBars: panel.phrase ? phraseMeasureCount(panel.applicationId) : undefined,
  });
}

function renderPanel(panel, paper) {
  const layout = layoutForPanel(panel, paper.clientWidth || VIEWPORT.staffWidth);
  const playLike = panel.kind === "play" || panel.kind === "landing" || panel.kind === "tune";
  paper.classList.toggle("slash", false);
  engraveAbc(paper, abcForPanel(panel), {
    layout,
    width: paper.clientWidth || VIEWPORT.staffWidth,
    applySlashes: playLike,
    keepLandingNotes: playLike,
    fitChorus: layout.fillAxis === "fit",
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

function boot() {
  if (typeof document === "undefined" || !window.ABCJS) return;
  const root = document.getElementById("gallery");
  if (!root) return;
  const panels = galleryPanels();
  const sections = {
    learn: sectionEl("learn-licks", "Learn cards · C, G, B♭, F♯"),
    standards: sectionEl("standards", "One standards lesson per module"),
    play: sectionEl("play-card", "Play card"),
    tunes: sectionEl("tune-pages", "Tune pages"),
  };
  const papers = [];
  for (const panel of panels) {
    papers.push([panel, mountPanel(panel, sections[panel.section])]);
  }
  // Engrave after insert so SVG getBBox has real geometry (slashes, cues, chords).
  root.replaceChildren(sections.learn, sections.standards, sections.play, sections.tunes);
  void root.offsetWidth;
  for (const [panel, paper] of papers) renderPanel(panel, paper);
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      if (window.ABCJS) boot();
      else window.addEventListener("load", boot, { once: true });
    });
  } else if (window.ABCJS) boot();
  else window.addEventListener("load", boot, { once: true });
}

export { LEARN_KEYS, TUNE_PAGES, TUNES, VIEWPORT };
