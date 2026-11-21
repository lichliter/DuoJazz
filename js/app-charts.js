import { chartGrid, chartKeyChoices } from "./charts.js";
import { transposeToneKey } from "./chord-tones.js";
import { closeSheet } from "./dialogs.js";
import { compactChordSymbol, fillMusicLabel } from "./engrave.js";
import { getKey } from "./music.js";
import { CHART_MODULES, MODULES, PRACTICE_CATALOG, lessonById, moduleById } from "./registry.js";
import { moduleRoadNodes } from "./session.js";

/** Create the charts detail view and lick-application picker modal controller. */
export function createChartsView({
  els,
  getPrefs,
  getRotationLicks,
  currentChart,
  chartConcertKey,
  keysByLesson,
  startChartTones,
  startLesson,
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

  function openChartApplications(moduleId) {
    const chart = currentChart();
    const module = moduleById(moduleId);
    const dialog = document.getElementById("chart-applications");
    document.getElementById("chart-applications-title").textContent = module.name;
    document.getElementById("chart-applications-description").textContent = `Applications in ${chart.title}`;
    const matches = chartApplications(chart.id, moduleId);
    const list = document.getElementById("chart-applications-list");
    list.replaceChildren(...matches.map(({ group, choice }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chart-application-choice";
      button.dataset.lesson = choice.lessonId;
      const title = document.createElement("strong");
      title.textContent = group.label;
      const version = group.variants.find((variant) => variant.id === choice.variantId);
      const detail = document.createElement("span");
      detail.textContent = `${group.description} ${group.variants.length > 1 ? `${version.label}. ` : ""}${choice.context}`;
      button.append(title, detail);
      button.onclick = () => {
        closeSheet(dialog);
        const lesson = lessonById(choice.lessonId);
        const delta = getKey(chartConcertKey(chart)).pc - getKey(chart.key).pc;
        startLesson(lesson.id, { keyId: transposeToneKey(lesson.defaultKeyId, delta) });
      };
      return button;
    }));
    if (!matches.length) {
      const empty = document.createElement("p");
      empty.className = "help";
      empty.textContent = "No supported applications of this lick match this chart. Try another lick or chart from My Rotation.";
      list.append(empty);
    }
    dialog.showModal();
  }

  function renderChartDetail() {
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
    block.append(moduleBanner({ ...parent, chart: true }), document.getElementById("view-chart"));
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
    for (const [index, module] of favorites.entries()) {
      const matches = chartApplications(tune.id, module.id);
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
    if (!favorites.length) {
      const empty = document.createElement("p");
      empty.className = "help library-empty";
      empty.textContent = "Add licks to My Rotation to practice them on this chart.";
      integrate.append(empty);
    }
    block.append(practice, integrate);
    document.getElementById("chart-tree").replaceChildren(block);
    requestAnimationFrame(paintPathTrail);
    const grid = chartGrid(tune, { instrumentId: prefs.instrumentId, concertKeyId: chartConcertKeyId });
    document.getElementById("chart-heading-title").textContent = tune.title;
    els.chartKeys.replaceChildren(...chartKeyChoices(tune.keyQuality, prefs.instrumentId).map((choice) => {
      const option = document.createElement("option");
      option.value = choice.id;
      option.textContent = choice.label;
      return option;
    }));
    els.chartKeys.value = chartConcertKeyId;
    if (els.chartGrid) {
      els.chartGrid.replaceChildren(
        ...grid.rows.map((row) => {
          const line = document.createElement("div");
          line.className = "ireal-row";
          for (const bar of row.bars) {
            const cell = document.createElement("div");
            cell.className = "ireal-bar";
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
              fillMusicLabel(symbol, compactChordSymbol(chord.name));
              chords.append(symbol);
            }
            cell.append(chords);
            line.append(cell);
          }
          return line;
        }),
      );
    }
  }

  function renderCharts() {
    renderChartDetail();
  }

  return {
    renderChartDetail,
    renderCharts,
  };
}
