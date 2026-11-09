import { PRACTICE_CATALOG, lessonById } from "./registry.js";
import { MY_CHARTS_KEY, loadMyCharts, normalizeMyCharts, chartChoices } from "./practice-catalog.js";
import { writeStoredJson } from "./storage.js";
import { closeSheet } from "./dialogs.js";

export function setupPracticeUI({ onPractice, onChanged, onSaveChart, onManageCharts }) {
  const catalog = PRACTICE_CATALOG;
  let selected = loadMyCharts(catalog.charts);
  let currentGroup = null;
  let currentVariantId = null;
  const picker = document.getElementById("application-charts");
  const variantSelect = document.getElementById("application-variant");
  function paragraph(text, className = "help") {
    const p = document.createElement("p"); p.className = className; p.textContent = text; return p;
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
    document.getElementById("application-favorites-empty").hidden = yours.length > 0;
    const note = document.getElementById("application-charts-note");
    note.textContent = selected.length
      ? "No favorite charts match this version yet. Manage your favorites or try a suggested chart below."
      : "No favorite charts yet. Add charts you know or want to learn.";
    const list = document.getElementById("application-charts-list");
    const suggestions = document.getElementById("application-suggested-list");
    list.hidden = yours.length === 0;
    suggestions.hidden = suggested.length === 0;
    document.getElementById("application-suggested-empty").hidden = suggested.length > 0;
    function chartCard(choice, index) {
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
        closeSheet(picker);
        onPractice(choice.lessonId);
      });
      card.append(button);
      if (!selected.includes(choice.chartId)) {
        const add = document.createElement("button");
        add.type = "button";
        add.className = "collection-action";
        add.textContent = "+ Favorite";
        add.setAttribute("aria-label", `Add ${choice.title} to favorite charts`);
        add.addEventListener("click", () => {
          selected = [...selected, choice.chartId];
          if (onSaveChart) onSaveChart(choice.chartId, true);
          else writeStoredJson(MY_CHARTS_KEY, selected);
          onChanged();
          renderPicker();
          list.querySelector(`[data-testid="practice-chart-${choice.chartId}"]`)?.focus({ preventScroll: true });
        });
        card.append(add);
      }
      return card;
    }
    list.replaceChildren(...yours.map(chartCard));
    suggestions.replaceChildren(...suggested.map(chartCard));
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

  variantSelect.addEventListener("change", () => {
    currentVariantId = variantSelect.value;
    renderPicker();
  });
  document.getElementById("application-workbook-example").addEventListener("click", () => {
    if (!currentGroup) return;
    const variant = currentGroup.variants.find((item) => item.id === currentVariantId);
    closeSheet(picker);
    onPractice(variant.exampleLessonId);
  });
  document.getElementById("application-manage-charts").addEventListener("click", () => {
    closeSheet(picker);
    onManageCharts();
  });
  for (const dialog of [picker]) {
    dialog.querySelector("[data-close]").addEventListener("click", () => closeSheet(dialog));
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeSheet(dialog);
    });
  }
  return {
    openApplication,
    getSelected: () => [...selected],
    setSelected(ids) {
      const next = normalizeMyCharts(ids, catalog.charts);
      if (JSON.stringify(next) === JSON.stringify(selected)) return;
      selected = next;
      renderPicker();
    },
  };
}
