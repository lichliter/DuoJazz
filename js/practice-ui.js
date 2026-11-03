import { PRACTICE_CATALOG, lessonById } from "./registry.js";
import { MY_CHARTS_KEY, loadMyCharts, chartChoices } from "./practice-catalog.js";
import { writeStoredJson } from "./storage.js";

export function setupPracticeUI({ onPractice, onChanged }) {
  const catalog = PRACTICE_CATALOG;
  let selected = loadMyCharts(catalog.charts);
  let currentGroup = null;
  let currentVariantId = null;
  const chartsDialog = document.getElementById("my-charts");
  const addDialog = document.getElementById("add-charts");
  const addButton = document.getElementById("add-chart-button");
  const picker = document.getElementById("application-charts");
  const search = document.getElementById("my-charts-search");
  const selectedList = document.getElementById("my-charts-list");
  const results = document.getElementById("my-charts-results");
  const status = document.getElementById("my-charts-status");
  const variantSelect = document.getElementById("application-variant");

  function paragraph(text, className = "help") {
    const p = document.createElement("p");
    p.className = className;
    p.textContent = text;
    return p;
  }

  function change(id, add, button) {
    selected = add ? [...new Set([...selected, id])] : selected.filter((item) => item !== id);
    writeStoredJson(MY_CHARTS_KEY, selected);
    onChanged();
    if (add) {
      // Keep the clicked row and focus in place while browsing the catalog.
      renderSelectedCharts();
      button.textContent = "Added";
      button.setAttribute("aria-label", `${catalog.charts.find((chart) => chart.id === id).title} added`);
      button.setAttribute("aria-disabled", "true");
    } else {
      renderCharts();
    }
    renderPicker();
    const message = `${catalog.charts.find((chart) => chart.id === id).title} ${add ? "added" : "removed"}.`;
    status.textContent = message;
    document.getElementById("add-charts-status").textContent = message;
    if (!add) addButton.focus({ preventScroll: true });
  }

  function chartRow(chart, isSelected) {
    const row = document.createElement("div");
    row.className = "collection-row";
    row.append(paragraph(chart.title, "collection-title"));
    const button = document.createElement("button");
    button.type = "button";
    button.className = "collection-action";
    button.textContent = isSelected ? "Remove" : "Add";
    button.setAttribute("aria-label", `${button.textContent} ${chart.title}`);
    button.addEventListener("click", () => {
      if (button.getAttribute("aria-disabled") === "true") return;
      change(chart.id, !isSelected, button);
    });
    row.append(button);
    return row;
  }

  function renderSelectedCharts() {
    const yours = catalog.charts.filter((chart) => selected.includes(chart.id));
    selectedList.replaceChildren(...(yours.length
      ? yours.map((chart) => chartRow(chart, true))
      : [paragraph("Add charts you know or want to learn. We'll use them for application practice.")]));
  }

  function renderCharts() {
    renderSelectedCharts();
    const query = search.value.trim().toLocaleLowerCase();
    const matches = catalog.charts.filter((chart) => chart.title.toLocaleLowerCase().includes(query));
    results.replaceChildren(...(matches.length ? matches.map((chart) => {
      if (!selected.includes(chart.id)) return chartRow(chart, false);
      const row = document.createElement("div");
      row.className = "collection-row";
      row.append(paragraph(chart.title, "collection-title"), paragraph("Added", "collection-added"));
      return row;
    }) : [paragraph("No charts found. Try another title.")]));
  }

  function openMyCharts() {
    status.textContent = "";
    renderCharts();
    chartsDialog.showModal();
  }

  function openAddCharts() {
    search.value = "";
    document.getElementById("add-charts-status").textContent = "";
    renderCharts();
    addDialog.showModal();
    search.focus();
  }

  function renderPicker() {
    if (!currentGroup) return;
    document.getElementById("application-charts-title").textContent = currentGroup.label;
    document.getElementById("application-charts-description").textContent = currentGroup.description;
    const variant = currentGroup.variants.find((item) => item.id === currentVariantId) ?? currentGroup.variants[0];
    currentVariantId = variant.id;
    document.getElementById("application-variant-row").hidden = currentGroup.variants.length <= 1;
    variantSelect.replaceChildren(...currentGroup.variants.map((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.label;
      return option;
    }));
    variantSelect.value = currentVariantId;
    document.getElementById("application-workbook-source").textContent = `Workbook · page ${variant.page}`;
    const { yours, suggested } = chartChoices(currentGroup, selected, currentVariantId);
    document.getElementById("application-charts-section").textContent = yours.length ? "Your charts" : suggested.length ? "Suggested charts" : "Workbook example";
    const note = document.getElementById("application-charts-note");
    note.hidden = yours.length > 0;
    note.textContent = !yours.length && !suggested.length
      ? "No compatible chart passage is available for this version yet. Practice its workbook example below."
      : selected.length
      ? "None of your charts have a passage for this application yet. Try one of these."
      : "Choose a chart to try this application. Add favorites to My charts anytime.";
    const list = document.getElementById("application-charts-list");
    list.replaceChildren(...[...yours, ...suggested].map((choice, index) => {
      const card = document.createElement("div");
      card.className = "practice-chart-card";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "practice-chart-choice";
      button.dataset.sleeve = ["oxblood", "amber", "teal"][index % 3];
      button.dataset.testid = `practice-chart-${choice.chartId}`;
      button.setAttribute("aria-label", `Practice ${currentGroup.label} in ${choice.title}. ${choice.context}`);
      const art = document.createElement("span");
      art.className = "practice-record";
      art.setAttribute("aria-hidden", "true");
      const sleeve = document.createElement("span");
      sleeve.textContent = choice.title;
      art.append(sleeve);
      button.append(art, paragraph(choice.title, "collection-title"),
        paragraph(choice.context.replace(`${choice.title} · `, ""), "help"));
      button.addEventListener("click", () => {
        picker.close();
        onPractice(choice.lessonId);
      });
      card.append(button);
      if (!selected.includes(choice.chartId)) {
        const add = document.createElement("button");
        add.type = "button";
        add.className = "collection-action";
        add.textContent = "+ My charts";
        add.setAttribute("aria-label", `Add ${choice.title} to My charts`);
        add.addEventListener("click", () => {
          selected = [...selected, choice.chartId];
          writeStoredJson(MY_CHARTS_KEY, selected);
          onChanged();
          renderPicker();
          list.querySelector("button")?.focus();
        });
        card.append(add);
      }
      return card;
    }));
  }

  function openApplication(id) {
    currentGroup = catalog.groups.find((group) => group.id === id);
    if (!currentGroup) return;
    currentVariantId = currentGroup.variants[0].id;
    const module = lessonById(currentGroup.exampleLessonId).moduleName;
    document.getElementById("application-charts-lick").textContent = module;
    renderPicker();
    picker.showModal();
  }

  search.addEventListener("input", renderCharts);
  variantSelect.addEventListener("change", () => {
    currentVariantId = variantSelect.value;
    renderPicker();
  });
  document.getElementById("application-workbook-example").addEventListener("click", () => {
    if (!currentGroup) return;
    const variant = currentGroup.variants.find((item) => item.id === currentVariantId);
    picker.close();
    onPractice(variant.exampleLessonId);
  });
  addButton.addEventListener("click", openAddCharts);
  document.getElementById("my-charts-button").addEventListener("click", openMyCharts);
  document.getElementById("application-manage-charts").addEventListener("click", openMyCharts);
  for (const dialog of [chartsDialog, addDialog, picker]) {
    dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  }
  return { openApplication, openMyCharts };
}
