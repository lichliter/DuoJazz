/** Group existing, curated placements by musical use; never invent tune matches. */
const USES = {
  "minor-home": ["Minor home", "Use the lick over a minor chord."],
  "altered-dominant": ["Altered dominant", "Bring out the tension over a dominant chord."],
  "major-color": ["Major color", "Use the minor shape to color a major chord."],
  "minor-resolution": ["Resolve to minor", "Carry the phrase from V into a minor arrival."],
  "major-resolution": ["Resolve to major", "Carry the phrase from V into a major arrival."],
  "major-home": ["Major home", "Use the lick on a major arrival."],
  "ii-v": ["ii–V movement", "Follow the movement from ii to V."],
  "ii-v-i": ["ii–V–I resolution", "Follow the changes into a major arrival."],
  "minor-ii": ["Minor ii chord", "Use the lick on the minor chord before V."],
  dominant: ["Dominant chord", "Use the lick over a dominant chord."],
  diminished: ["Diminished chord", "Use the pattern on a diminished chord."],
  lydian: ["Lydian color", "Bring a raised fourth color to a major chord."],
};

const DEFAULT_USE = {
  emr: "minor-resolution", gts: "ii-v-i", bo: "dominant", hsr: "minor-ii",
  "1235": "major-home", br: "major-home", dlr: "major-resolution",
  acvl: "ii-v-i", tm: "ii-v", tisc: "major-home", et: "major-home",
  cbc: "dominant", jcdp: "major-resolution", tdp: "altered-dominant",
  se: "ii-v", mp: "minor-home", ssr: "major-home", sat: "ii-v-i",
  ctdc: "major-home", tpr: "ii-v-i", ntp: "minor-home", dct: "major-home",
  ae: "altered-dominant", fe: "major-home", bb: "major-home", lg: "lydian",
  bcf: "ii-v-i", dss: "diminished", nnr: "ii-v-i",
};

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const pc = (n) => ((n % 12) + 12) % 12;

function useFor(moduleId, app, spot, form) {
  if (moduleId === "hsr") return spot.fragment === "hsr-altered" ? "altered-dominant" : "minor-ii";
  if (moduleId === "cmar") {
    if (app.id === "minor-home" || app.id === "altered-dominant") return app.id;
    const bar = form.bars[spot.bar - 1];
    const chord = (bar?.chords ?? bar ?? [])[0];
    if (chord?.quality.startsWith("major")) return "major-color";
    if (chord?.quality.startsWith("dominant") && pc(spot.anchorInterval - chord.intervalFromTonic) === 1) return "altered-dominant";
    if (chord?.quality.startsWith("minor")) return "minor-home";
    return null;
  }
  if (moduleId === "emr") {
    const bar = form.bars[spot.bar];
    const next = (bar?.chords ?? bar ?? [])[0];
    return next?.quality.startsWith("major") ? "major-resolution" : "minor-resolution";
  }
  return DEFAULT_USE[moduleId];
}

export function buildPracticeCatalog({ modules, tunes, applicationById, formById, spotsFor }) {
  const charts = tunes.map((tune) => ({ id: tune.id, title: tune.title }));
  const groups = [];
  const applications = [];
  const lessons = [];
  for (const module of modules) {
    const byUse = new Map();
    for (const lesson of module.lessons.filter((item) => item.kind === "integrate" && item.group !== "your-tunes")) {
      const app = applicationById(lesson.applicationId);
      const form = formById(app.formId);
      const title = app.id === "minor-home" || app.id === "altered-dominant"
        ? "Autumn Leaves" : lesson.coverTitle;
      let chart = charts.find((item) => item.id === (lesson.tuneId ?? app.tuneId ?? form.tuneId))
        ?? charts.find((item) => slug(item.title) === slug(title));
      // Legacy excerpts predate the full chart catalog. Keep their real titles.
      if (!chart && title === "Billie's Bounce") chart = charts.find((item) => item.id === "nows-time");
      if (!chart) {
        chart = { id: slug(title), title };
        charts.push(chart);
      }
      const spotsByUse = new Map();
      for (const spot of spotsFor(app.id)) {
        const use = useFor(module.id, app, spot, form);
        if (!use) continue;
        if (!spotsByUse.has(use)) spotsByUse.set(use, []);
        spotsByUse.get(use).push(spot);
      }
      for (const [use, spots] of spotsByUse) {
        if (!byUse.has(use)) {
          const [label, description] = USES[use];
          byUse.set(use, { id: `${module.id}:${use}`, moduleId: module.id, label, description, choices: [] });
        }
        const group = byUse.get(use);
        // Prefer the curated excerpt when a full-chart legacy lesson duplicates it.
        if (group.choices.some((choice) => choice.chartId === chart.id)) continue;
        const id = `practice-${module.id}-${use}-${chart.id}`;
        const variant = {
          ...app, id, spots, leadIn: [], resolve: [],
          cellTonicInterval: spots[0].anchorInterval,
          phraseStartBar: spots[0].bar,
        };
        applications.push(variant);
        const start = form.excerptStartBar ?? 1;
        const bars = spots.map((spot) => start + spot.bar - 1);
        const context = `${chart.title} · ${bars.length === 1 ? "bar" : "bars"} ${bars.join(", ")}`;
        lessons.push({
          ...lesson, id, applicationId: id, group: "application-practice",
          title: `${group.label} · ${chart.title}`, coverTitle: group.label,
          context, tuneId: chart.id, moduleId: module.id, moduleName: module.name,
          moduleNumber: module.number, practiceApplicationId: group.id,
        });
        group.choices.push({ chartId: chart.id, lessonId: id, title: chart.title, context });
      }
    }
    groups.push(...byUse.values());
  }
  return { charts: charts.sort((a, b) => a.title.localeCompare(b.title)), groups, applications, lessons };
}

export function chartChoices(group, selectedIds) {
  const selected = new Set(selectedIds);
  const yours = group.choices.filter((choice) => selected.has(choice.chartId));
  return { yours, suggested: yours.length ? [] : group.choices };
}

export const MY_CHARTS_KEY = "duojazz.myCharts.v1";

export function normalizeMyCharts(value, charts) {
  const available = new Set(charts.map((chart) => chart.id));
  return Array.isArray(value) ? [...new Set(value.filter((id) => available.has(id)))] : [];
}

export function loadMyCharts(charts, storage) {
  try { return normalizeMyCharts(JSON.parse((storage ?? globalThis.localStorage).getItem(MY_CHARTS_KEY)), charts); }
  catch { return []; }
}
