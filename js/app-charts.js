import {
  describeChartApplicationChoice,
  findDefinitionVariant,
  groupChartApplications,
} from "./application-harmony.js";
import { transposeToneKey } from "./chord-tones.js";
import { closeSheet } from "./dialogs.js";
import { compactChordSymbol, fillMusicLabel } from "./engrave.js";
import { displayKey, getKey } from "./music.js";
import {
  CHART_MODULES,
  MODULES,
  PRACTICE_CATALOG,
  applicationById,
  lessonById,
  lickById,
  moduleById,
} from "./registry.js";
import { moduleRoadNodes } from "./session.js";

export function renderChartGrid(host, grid) {
  let chordIndex = 0;
  host.replaceChildren(
    ...grid.rows.map((row) => {
      const line = document.createElement("div");
      line.className = "ireal-row";
      for (const bar of row.bars) {
        const cell = document.createElement("div");
        cell.className = "ireal-bar";
        cell.dataset.bar = bar.number;
        if (bar.sectionLabel) {
          const mark = document.createElement("span");
          mark.className = "ireal-section";
          mark.textContent = bar.sectionLabel;
          cell.append(mark);
        }
        if (bar.repeatStart) {
          const mark = document.createElement("span");
          mark.className = "ireal-repeat start";
          mark.textContent = "|:";
          cell.append(mark);
        }
        if (bar.repeatEnd) {
          const mark = document.createElement("span");
          mark.className = "ireal-repeat end";
          mark.textContent = ":|";
          cell.append(mark);
        }
        const chords = document.createElement("div");
        chords.className = "ireal-chords";
        for (const chord of bar.chords) {
          const symbol = document.createElement("span");
          symbol.className = "chord-symbol";
          symbol.dataset.chordIndex = chordIndex++;
          const label = compactChordSymbol(chord.name);
          fillMusicLabel(symbol, label);
          const parts = /^([A-G])(.+)$/u.exec(label);
          if (parts) {
            const suffix = document.createElement("span");
            suffix.className = "chart-chord-suffix";
            suffix.textContent = parts[2];
            symbol.replaceChildren(parts[1], suffix);
          }
          chords.append(symbol);
        }
        cell.append(chords);
        line.append(cell);
      }
      return line;
    }),
  );
}

/** Create the charts detail view and lick-application picker modal controller. */
export function createChartsView({
  getPrefs,
  getRotationLicks,
  currentChart,
  chartConcertKey,
  keysByLesson,
  startChartTones,
  startPracticeApplication,
  moduleBanner,
  sleeveButton,
  openLickPicker,
  paintPathTrail,
}) {
  function chartApplications(chartId, moduleId) {
    return PRACTICE_CATALOG.groups
      .filter((group) => group.moduleId === moduleId)
      .flatMap((group) => group.choices.filter((choice) => choice.chartId === chartId).map((choice) => ({ group, choice })));
  }

  function buildFractionElement(info) {
    const fraction = document.createElement("span");
    fraction.className = "app-fraction";
    if (info.wideFraction) fraction.classList.add("is-wide");
    fraction.setAttribute("aria-hidden", "true");
    const top = document.createElement("span");
    top.className = "app-fraction-top";
    fillMusicLabel(top, info.top);
    const bar = document.createElement("span");
    bar.className = "app-fraction-bar";
    const bottom = document.createElement("span");
    bottom.className = "app-fraction-bottom";
    fillMusicLabel(bottom, info.bottom);
    fraction.append(top, bar, bottom);
    return fraction;
  }

  function openChartApplications(moduleId) {
    const chart = currentChart();
    const matches = chartApplications(chart.id, moduleId);
    if (!matches.length) return;

    const module = moduleById(moduleId);
    const prefs = getPrefs();
    const displayMode = prefs.instrumentId ?? prefs.displayMode ?? "piano";
    const chartKeyId = chartConcertKey(chart);
    const writtenChartKey = displayKey(getKey(chartKeyId), displayMode, chart.keyQuality).shortName;
    const delta = getKey(chartKeyId).pc - getKey(chart.key).pc;

    const dialog = document.getElementById("chart-applications");
    document.getElementById("chart-applications-title").textContent = module.name;
    fillMusicLabel(
      document.getElementById("chart-applications-description"),
      `${chart.title} · ${writtenChartKey}`,
    );

    const enriched = matches.map(({ group, choice }) => {
      const lesson = lessonById(choice.lessonId);
      const app = applicationById(lesson.applicationId);
      const lick = lickById(app.lickId);
      const { definition, variant } = findDefinitionVariant(app.workbookApplicationId, app.workbookVariantId);
      const concertKey = getKey(transposeToneKey(lesson.defaultKeyId, delta));
      const info = describeChartApplicationChoice({
        definition,
        variant,
        lick,
        application: app,
        concertKey,
        displayMode,
      });
      return { group, choice, info };
    });

    const renderChoiceButton = ({ group, choice, info }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chart-application-choice";
      button.dataset.lesson = choice.lessonId;

      const version = group.variants.find((variant) => variant.id === choice.variantId);
      const titleText = group.variants.length > 1 && version
        ? `${group.label} · ${version.label}`
        : group.label;

      const body = document.createElement("div");
      body.className = "app-choice-body";
      const head = document.createElement("div");
      head.className = "app-choice-head";
      const title = document.createElement("strong");
      title.className = "app-choice-title";
      title.textContent = titleText;
      head.append(title);
      if (info.degreesLabel) {
        const degrees = document.createElement("span");
        degrees.className = "app-choice-degrees";
        fillMusicLabel(degrees, info.degreesLabel);
        head.append(degrees);
      }

      const concrete = document.createElement("span");
      concrete.className = "app-choice-concrete";
      if (info.concreteSummary && info.barsLabel) {
        fillMusicLabel(concrete, info.concreteSummary);
        const barsSpan = document.createElement("span");
        barsSpan.className = "app-choice-bars";
        barsSpan.textContent = info.barsLabel;
        concrete.append(" · ", barsSpan);
      } else {
        fillMusicLabel(concrete, info.line || choice.context);
      }

      body.append(head, concrete);
      button.append(buildFractionElement(info), body);
      button.setAttribute(
        "aria-label",
        [`Play ${info.spoken}`, titleText, info.line || choice.context].filter(Boolean).join(". "),
      );
      button.onclick = () => {
        closeSheet(dialog);
        startPracticeApplication(choice.lessonId);
      };
      return button;
    };

    const sections = groupChartApplications(enriched);
    const list = document.getElementById("chart-applications-list");
    if (sections.length > 1) {
      list.replaceChildren(...sections.map((section) => {
        const groupEl = document.createElement("section");
        groupEl.className = "chart-application-group";
        const heading = document.createElement("h3");
        heading.className = "chart-application-group-title";
        heading.textContent = section.heading;
        groupEl.append(heading, ...section.items.map(renderChoiceButton));
        return groupEl;
      }));
    } else {
      list.replaceChildren(...enriched.map(renderChoiceButton));
    }
    dialog.showModal();
  }

  function renderCharts() {
    const tune = currentChart();
    const prefs = getPrefs();
    const lickRotation = getRotationLicks();
    const chartConcertKeyId = chartConcertKey(tune);
    const parent = CHART_MODULES.find((module) => module.id === `chart-${tune.id}`);
    const first = [
      parent.lessons.find((lesson) => lesson.kind === "learn"),
      parent.lessons.find((lesson) => lesson.chartPractice),
      parent.lessons.find((lesson) => lesson.chartTimed),
    ];
    const progress = keysByLesson();
    const delta = getKey(chartConcertKeyId).pc - getKey(tune.key).pc;
    const nodes = moduleRoadNodes({ ...parent, lessons: first }, prefs, {}).map((node, index) => {
      const kind = ["learn", "practice", "master"][index];
      const lessons = parent.lessons.filter((lesson) => (index === 2
        ? lesson.chartTimed
        : !lesson.chartTimed && (index === 1 ? lesson.chartPractice : lesson.kind === "learn")));
      const passed = lessons.filter((lesson) => progress[lesson.id]?.includes(transposeToneKey(lesson.defaultKeyId, delta))).length;
      const label = ["Learn", "Practice", "Master"][index];
      return {
        ...node,
        title: index === 2 ? "Master the changes from memory, in time" : `${label} chord tones`,
        coverTitle: label,
        passedCount: passed,
        keyTarget: lessons.length,
        progressUnit: index === 2 ? "runs" : "chords",
        complete: passed === lessons.length,
        vinylTier: passed === lessons.length ? "gold" : passed ? "bronze" : "black",
        onSelect: () => startChartTones(kind),
      };
    });
    const block = document.createElement("section");
    block.className = "module-block is-current";
    block.append(moduleBanner({ ...parent, chart: true }));
    const practice = document.createElement("section");
    practice.className = "lesson-section";
    const practiceHeading = document.createElement("h3");
    practiceHeading.className = "lesson-section-title";
    practiceHeading.id = `section-${parent.id}-practice`;
    practiceHeading.textContent = "Practice";
    practice.setAttribute("aria-labelledby", practiceHeading.id);
    practice.append(practiceHeading, ...nodes.map(sleeveButton));
    const integrate = document.createElement("section");
    integrate.className = "lesson-section";
    const favoritesHeader = document.createElement("div");
    favoritesHeader.className = "chart-favorites-header";
    const heading = document.createElement("h3");
    heading.className = "lesson-section-title";
    heading.textContent = "Integrate";
    heading.id = `section-${parent.id}-integrate`;
    integrate.setAttribute("aria-labelledby", heading.id);
    const manage = document.createElement("button");
    manage.type = "button";
    manage.className = "collection-action chart-favorites-manage";
    manage.textContent = "Manage";
    manage.setAttribute("aria-label", "Manage licks in My Rotation");
    manage.setAttribute("aria-haspopup", "dialog");
    manage.setAttribute("aria-controls", "quick-view");
    manage.onclick = () => openLickPicker();
    favoritesHeader.append(heading, manage);
    integrate.append(favoritesHeader);
    const favorites = MODULES.filter((module) => lickRotation.includes(module.id) && module.id !== "chord-tones");
    const matchingFavorites = favorites
      .map((module) => ({ module, matches: chartApplications(tune.id, module.id) }))
      .filter(({ matches }) => matches.length > 0);
    for (const [index, { module, matches }] of matchingFavorites.entries()) {
      const node = {
        id: `chart-favorite-${module.id}`,
        title: module.name,
        coverTitle: module.name,
        number: "Lick",
        practice: true,
        caption: `${matches.length} matching applications`,
        sleeve: ["oxblood", "amber", "teal"][index % 3],
        align: index % 2 ? "right" : "left",
        vinylTier: "black",
        onSelect: () => openChartApplications(module.id),
      };
      integrate.append(sleeveButton(node));
    }
    if (!matchingFavorites.length) {
      const empty = document.createElement("p");
      empty.className = "help library-empty";
      empty.textContent = favorites.length
        ? "No licks in My Rotation match this chart."
        : "Add licks to My Rotation to practice them on this chart.";
      integrate.append(empty);
    }
    block.append(practice, integrate);
    document.getElementById("chart-tree").replaceChildren(block);
    requestAnimationFrame(paintPathTrail);
  }

  return {
    openChartApplications,
    renderCharts,
  };
}
