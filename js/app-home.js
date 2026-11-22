import { CHORD_QUALITIES } from "./chord-tones.js";
import { fillMusicLabel } from "./engrave.js";
import { sleeveTrailPath } from "./path-trail.js";
import { MODULES, PRACTICE_CATALOG, lessonById, moduleById } from "./registry.js";
import { isPracticeLesson, moduleRoadNodes } from "./session.js";

/** Create the home road view, sleeve builder, trail painter, and chip helper. */
export function createHomeView({
  els,
  getPrefs,
  getSelectedModuleId,
  setSelectedModuleId,
  keysByLesson,
  requestQuickView,
  nextRotationItem,
  isInRotation = () => true,
  addToRotation = () => {},
  openExplore,
  selectModule,
  openSetup,
  openApplication,
}) {
  function moduleBanner(module) {
    const section = document.createElement("button");
    section.type = "button";
    section.className = "module-banner";
    section.dataset.testid = `module-banner-${module.id}`;
    section.setAttribute("aria-haspopup", "dialog");
    section.setAttribute("aria-controls", "quick-view");
    section.setAttribute("aria-label", `My Rotation. ${module.name}`);
    const copy = document.createElement("div");
    copy.className = "banner-copy";
    const kicker = document.createElement("p");
    kicker.className = "banner-kicker";
    kicker.textContent = "My Rotation";
    const title = document.createElement("h2");
    title.textContent = module.name;
    copy.append(kicker, title);
    const chevron = document.createElement("span");
    chevron.className = "banner-chevron";
    chevron.setAttribute("aria-hidden", "true");
    chevron.innerHTML = `<svg viewBox="0 0 24 24" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="M5.5 9 12 16l6.5-7"/></svg>`;
    section.append(copy, chevron);
    section.addEventListener("click", () => requestQuickView());
    return section;
  }

  function sleeveButton(node) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sleeve-node";
    btn.dataset.testid = `lesson-${node.id}`;
    btn.dataset.sleeve = node.sleeve;
    btn.dataset.align = node.align;
    btn.dataset.recommended = String(node.recommended);
    btn.dataset.complete = String(node.complete);
    btn.dataset.vinylTier = node.vinylTier;
    btn.dataset.practice = node.practice ? "true" : "false";
    const bits = node.practice
      ? [`Practice: ${node.title}`, node.caption].filter(Boolean)
      : [
        `Lesson ${node.number}: ${node.title}`,
        `${node.passedCount} of ${node.keyTarget ?? 12} ${node.progressUnit ?? "keys"} passed`,
        `${node.vinylTier} vinyl`,
      ];
    if (node.recommended) bits.push("recommended start");
    if (node.complete) bits.push(`all ${node.progressUnit ?? "keys"} passed`);
    btn.setAttribute("aria-label", bits.join(". "));

    const stage = document.createElement("span");
    stage.className = "sleeve-stage";
    const vinyl = document.createElement("span");
    vinyl.className = "vinyl";
    vinyl.dataset.tier = node.vinylTier;
    vinyl.setAttribute("aria-hidden", "true");
    const vinylLabel = document.createElement("span");
    vinylLabel.className = "vinyl-label";
    vinyl.append(vinylLabel);
    const sleeve = document.createElement("span");
    sleeve.className = "sleeve";
    const deco = document.createElement("span");
    deco.className = "sleeve-deco";
    deco.setAttribute("aria-hidden", "true");
    const num = document.createElement("span");
    num.className = "sleeve-num";
    num.textContent = node.number;
    const cover = document.createElement("span");
    cover.className = "sleeve-title";
    cover.textContent = node.coverTitle;
    sleeve.append(deco, num, cover);
    stage.append(vinyl, sleeve);
    btn.append(stage);

    const applicationId = node.onSelect ? null : lessonById(node.id).practiceApplicationId;
    if (applicationId) {
      btn.dataset.application = applicationId;
      btn.setAttribute("aria-haspopup", "dialog");
      btn.setAttribute("aria-controls", "application-charts");
    }
    btn.addEventListener("click", () => (node.onSelect
      ? node.onSelect()
      : applicationId
        ? openApplication(applicationId)
        : openSetup(node.id)));
    return btn;
  }

  function relatedLicksSection(id, label, rows) {
    const section = document.createElement("section");
    section.className = "related-licks";
    const title = document.createElement("h3");
    title.className = "lesson-section-title";
    title.id = `${id}-title`;
    title.textContent = label;
    section.setAttribute("aria-labelledby", title.id);

    const list = document.createElement("ul");
    list.className = "related-licks-list";
    for (const { lick, detail } of rows) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "related-licks-row";
      button.addEventListener("click", () => {
        selectModule(lick.id, { preview: true });
        els.lessonList.querySelector(".module-banner")?.focus({ preventScroll: true });
      });
      const name = document.createElement("strong");
      name.textContent = lick.name;
      button.append(name);
      if (detail) {
        const subtitle = document.createElement("span");
        subtitle.textContent = detail;
        button.append(subtitle);
      }
      item.append(button);
      list.append(item);
    }
    section.append(title, list);
    return section;
  }

  function rotationAddButton(module) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rotation-add-button";
    button.dataset.testid = "add-to-rotation";
    const plus = document.createElement("span");
    plus.className = "rotation-add-plus";
    plus.setAttribute("aria-hidden", "true");
    plus.textContent = "+";
    const label = document.createElement("span");
    label.textContent = "Add to My Rotation";
    button.append(plus, label);
    button.addEventListener("click", () => {
      addToRotation(module.id);
      els.lessonList.querySelector(".module-banner")?.focus({ preventScroll: true });
    });
    return button;
  }

  function moduleBlock(module, nodes) {
    const wrap = document.createElement("section");
    wrap.className = "module-block is-current";
    wrap.dataset.module = module.id;
    const header = document.createElement("div");
    header.className = "module-header";
    if (!isInRotation(module.id)) header.append(rotationAddButton(module));
    header.append(moduleBanner(module));
    wrap.append(header);
    if (module.buildingBlockIds?.length) {
      const blocks = module.buildingBlockIds.map(moduleById);
      wrap.append(relatedLicksSection("building-blocks", "Building blocks",
        blocks.map((lick) => ({ lick, detail: lick.blockBeats }))));
    }
    const groups = module.id === "chord-tones"
      ? CHORD_QUALITIES.map((quality) => ({ id: quality.id, title: quality.title, nodes: nodes.filter((node) => lessonById(node.id).chordQuality === quality.id) }))
      : [
        { id: "practice", title: "Practice", nodes: nodes.filter((node) => !node.practice) },
        { id: "integrate", title: "Integrate", nodes: nodes.filter((node) => node.practice) },
      ];
    for (const group of groups) {
      if (!group.nodes.length) continue;
      const section = document.createElement("section");
      section.className = "lesson-section";
      const heading = document.createElement("h3");
      heading.className = "lesson-section-title";
      heading.id = `section-${module.id}-${group.id}`;
      heading.textContent = group.title;
      section.setAttribute("aria-labelledby", heading.id);
      section.append(heading, ...group.nodes.map((node, index) => sleeveButton({
        ...node,
        align: group.nodes.length === 2 ? (index ? "right" : "left") : ["left", "center", "right"][index % 3],
        coverTitle: node.practice ? node.coverTitle : (lessonById(node.id).kind === "learn" ? "Learn" : "Master"),
        number: node.practice ? "Integrate" : node.number,
      })));
      wrap.append(section);
    }
    if (module.compositeId) {
      wrap.append(relatedLicksSection("lick-uses", "Uses", [
        { lick: moduleById(module.compositeId) },
      ]));
    }
    return wrap;
  }

  function homeNextModuleButton(link) {
    const wrap = document.createElement("div");
    wrap.className = "path-end path-end-next";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "next-module-path";
    btn.dataset.testid = "home-next-module";
    btn.textContent = link.label;
    btn.addEventListener("click", () => {
      if (link.id) selectModule(link.id);
      else openExplore();
    });
    wrap.append(btn);
    return wrap;
  }

  function sleeveBoxFromStage(stage, svgRect) {
    const stageRect = stage.getBoundingClientRect();
    return {
      cx: stageRect.left + stageRect.width / 2 - svgRect.left,
      cy: stageRect.top + stageRect.height / 2 - svgRect.top,
      halfW: stageRect.width / 2,
      halfH: stageRect.height / 2,
    };
  }

  function paintLessonTrail(container) {
    const svg = container.querySelector(".path-trail");
    const lessonList = container.querySelector(".lesson-list");
    const path = svg?.querySelector("[data-trail]");
    const cap = svg?.querySelector("[data-trail-cap]");
    if (!svg || !path || !lessonList) return;
    const svgRect = svg.getBoundingClientRect();
    if (svgRect.width < 8 || svgRect.height < 8) {
      path.setAttribute("d", "");
      return;
    }
    svg.setAttribute("viewBox", `0 0 ${svgRect.width} ${svgRect.height}`);
    const sleeves = [...lessonList.querySelectorAll(".sleeve-node .sleeve-stage")]
      .map((stage) => sleeveBoxFromStage(stage, svgRect));
    const endEl = lessonList.querySelector(".path-end-sleeve");
    let end = null;
    if (endEl) {
      const rect = endEl.getBoundingClientRect();
      end = {
        cx: rect.left + rect.width / 2 - svgRect.left,
        cy: rect.top + rect.height / 2 - svgRect.top,
      };
    }
    const sections = [...lessonList.querySelectorAll(".lesson-section")];
    const trails = sections.map((section, index) => {
      const group = [...section.querySelectorAll(".sleeve-stage")].map((stage) => sleeveBoxFromStage(stage, svgRect));
      return sleeveTrailPath(group, index === sections.length - 1 ? end : null);
    });
    path.setAttribute("d", sections.length ? trails.join(" ") : sleeveTrailPath(sleeves, end));
    const last = end ?? sleeves.at(-1);
    if (cap && last) {
      cap.setAttribute("cx", String(last.cx));
      cap.setAttribute("cy", String(last.cy));
      cap.setAttribute("r", "8");
    }
  }

  function paintPathTrail() {
    for (const container of document.querySelectorAll(".lesson-path")) paintLessonTrail(container);
  }

  function renderHome() {
    let selectedId = getSelectedModuleId();
    if (!MODULES.some((module) => module.id === selectedId)) {
      selectedId = MODULES[0].id;
      setSelectedModuleId(selectedId);
    }
    const module = moduleById(selectedId) ?? MODULES[0];
    const keys = keysByLesson();
    const applications = PRACTICE_CATALOG.groups.filter((group) => group.moduleId === module.id);
    const lessons = [
      ...module.lessons.filter((lesson) => !isPracticeLesson(lesson)),
      ...applications.map((group) => ({
        ...lessonById(group.choices[0]?.lessonId ?? group.exampleLessonId),
        title: group.label,
        coverTitle: group.label,
        context: group.description,
      })),
    ];
    const nodes = moduleRoadNodes({ ...module, lessons }, getPrefs(), keys);
    els.lessonList.replaceChildren(
      moduleBlock(module, nodes),
      homeNextModuleButton(nextRotationItem(module.id)),
    );
    requestAnimationFrame(paintPathTrail);
  }

  function chipRow(host, options, current, onPick) {
    host.replaceChildren(
      ...options.map((option) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "chip";
        fillMusicLabel(btn, option.label);
        btn.setAttribute("aria-pressed", String(option.id === current));
        btn.addEventListener("click", () => onPick(option.id));
        return btn;
      }),
    );
  }

  return {
    moduleBanner,
    sleeveButton,
    paintPathTrail,
    renderHome,
    chipRow,
  };
}
