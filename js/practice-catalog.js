import { workbookApplicationDefinitions } from "./workbook-applications.js";

const pc = (n) => ((n % 12) + 12) % 12;
const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const near = (a, b) => Math.abs(a - b) < 1e-6;

export function chordFamily(quality) {
  if (quality === "halfdim7" || quality === "minor7b5") return "halfdim";
  if (quality.startsWith("diminished")) return "dim";
  if (quality.startsWith("major")) return "major";
  if (quality.startsWith("minor")) return "minor";
  if (quality.startsWith("dominant") && quality !== "dominant7sus") return "dominant";
  return quality;
}

export function formTimeline(form) {
  let beat = 0;
  return form.bars.flatMap((bar) => (bar.chords ?? bar).map((chord) => {
    const event = { ...chord, beat, end: beat + (chord.durationBeats ?? 4) };
    beat = event.end;
    return event;
  }));
}

export function variantSoundEnd(variant) {
  let beat = -variant.pickupBeats;
  let end = 0;
  for (const element of variant.elements) {
    if (element.type === "note") end = beat + element.beats;
    beat += element.beats;
  }
  return end;
}

/** Every sounding beat must fit the stated harmony, including sustained notes. */
export function matchesAt(timeline, variant, start, anchor) {
  const needed = variantSoundEnd(variant);
  let position = 0;
  for (const expected of variant.pattern) {
    const end = Math.min(position + expected.beats, needed);
    for (let cursor = position; cursor < end - 1e-6;) {
      const actual = timeline.find((event) => event.beat <= start + cursor + 1e-6 && event.end > start + cursor + 1e-6);
      if (!actual || chordFamily(actual.quality) !== expected.family
        || pc(actual.intervalFromTonic) !== pc(anchor + expected.root)) return false;
      cursor = Math.min(end, actual.end - start);
    }
    position += expected.beats;
    if (position >= needed - 1e-6) return true;
  }
  return false;
}

export function matchApplication(form, variant) {
  const timeline = formTimeline(form);
  const spots = [];
  let lastEnd = -Infinity;
  for (const [index, event] of timeline.entries()) {
    const previous = timeline[index - 1];
    // A chord held over another bar is one opportunity, not a new entrance.
    if (variant.pattern.length === 1 && previous && pc(previous.intervalFromTonic) === pc(event.intervalFromTonic)
      && chordFamily(previous.quality) === chordFamily(event.quality)) continue;
    if (event.beat - variant.pickupBeats < lastEnd - 1e-6) continue;
    const anchor = event.intervalFromTonic - variant.pattern[0].root;
    if (!matchesAt(timeline, variant, event.beat, anchor)) continue;
    spots.push({
      bar: Math.floor(event.beat / 4) + 1, beatOffset: event.beat % 4,
      anchorInterval: anchor, fragment: "full", elements: variant.elements,
      pickup: variant.pickupBeats > 0, pickupBeats: variant.pickupBeats,
      variantId: variant.id,
    });
    lastEnd = event.beat + variantSoundEnd(variant);
  }
  return spots;
}

const QUALITY = { major: "major7", minor: "minor7", dominant: "dominant7", halfdim: "minor7b5", dim: "diminished7" };

function exampleQuality(definition, variant, event) {
  if (event.family === "major" && definition.id.includes("lydian")) return "major7b5";
  if (event.family !== "dominant") return QUALITY[event.family];
  if (["jcdp", "tdp", "dss"].includes(definition.lickId)) return "dominant7s9";
  if (definition.lickId === "gts") return variant.id.includes("natural") ? "dominant9" : "dominant7b9";
  if (definition.lickId === "hsr" && definition.id === "altered-dominant" && variant.id === "original") return "dominant7b9";
  if (definition.lickId === "emr" || definition.id.includes("altered")
    || definition.id === "minor-resolution" || variant.id.includes("minor-resolution") || variant.id.includes("flat-nine")) return "dominant7alt";
  if (definition.id.includes("flat-nine")) return definition.lickId === "tisc" || definition.lickId === "lg" ? "dominant7b9" : "dominant7alt";
  if (definition.lickId === "dlr") return "dominant7b9";
  if (definition.id.includes("lydian") || variant.id.includes("lydian")) return "dominant7s11";
  return QUALITY.dominant;
}

function exampleForm(id, definition, variant, keyQuality) {
  const events = variant.pattern.map((item) => ({ ...item }));
  const total = events.reduce((sum, event) => sum + event.beats, 0);
  if (total < 32) events.push({ ...events.at(-1), beats: 32 - total });
  const bars = [];
  let beat = 0;
  for (const event of events) {
    let remaining = event.beats;
    while (remaining > 1e-6) {
      if (near(beat % 4, 0)) bars.push({ chords: [] });
      const duration = Math.min(4 - (beat % 4), remaining);
      bars.at(-1).chords.push({ intervalFromTonic: event.root, quality: exampleQuality(definition, variant, event), durationBeats: duration });
      beat += duration;
      remaining -= duration;
    }
  }
  return { id, title: "Workbook example", shortTitle: "Workbook example", source: `Essential Jazz Vocabulary Workbook, p. ${variant.page ?? definition.page}. ${definition.note}`.trim(), keyQuality, bars };
}

export function buildPracticeCatalog({ modules, tunes, licks, fragments, applicationById, formById }) {
  const definitions = workbookApplicationDefinitions(licks, fragments);
  const charts = tunes.map((tune) => ({ id: tune.id, title: tune.title }));
  const sources = [];
  for (const module of modules) {
    for (const lesson of module.lessons.filter((item) => item.kind === "integrate" && item.group !== "your-tunes")) {
      const app = applicationById(lesson.applicationId);
      const form = formById(app.formId);
      const title = ["minor-home", "altered-dominant"].includes(app.id) ? "Autumn Leaves" : lesson.coverTitle;
      let chart = charts.find((item) => item.id === (lesson.tuneId ?? app.tuneId ?? form.tuneId))
        ?? charts.find((item) => slug(item.title) === slug(title));
      if (!chart && title === "Billie's Bounce") chart = charts.find((item) => item.id === "nows-time");
      if (!chart) { chart = { id: slug(title), title }; charts.push(chart); }
      if (!sources.some((source) => source.form.id === form.id)) {
        sources.push({ chart, form, key: lesson.defaultKeyId, moduleId: module.id });
      }
    }
  }
  for (const tune of tunes) {
    sources.push({ chart: charts.find((chart) => chart.id === tune.id), form: formById(`tune-${tune.id}`), key: tune.key });
  }

  const forms = {};
  const groups = [];
  const applications = [];
  const lessons = [];
  for (const definition of definitions) {
    const module = modules.find((item) => item.id === definition.lickId);
    const lick = licks.find((item) => item.id === definition.lickId);
    const group = { ...definition, id: `${module.id}:${definition.id}`, moduleId: module.id, choices: [], variants: [] };
    const prefix = `practice-${module.id}-${definition.id}`;
    const sleeve = ["oxblood", "amber", "teal"][groups.filter((item) => item.moduleId === module.id).length % 3];
    const register = (id, form, spots, key, chart, variant) => {
      applications.push({
        id, lickId: module.id, formId: form.id, label: definition.label,
        cellTonicInterval: spots[0].anchorInterval, phraseStartBar: spots[0].bar,
        spots, leadIn: [], resolve: [], copyKind: "place",
        workbookApplicationId: group.id, workbookVariantId: variant.id,
      });
      const offset = form.excerptStartBar ?? 1;
      const locations = spots.map((spot) => `${spot.bar + offset - 1}${spot.beatOffset ? ` beat ${spot.beatOffset + 1}` : ""}`);
      const title = chart?.title ?? "Workbook example";
      const context = chart ? `${title} · ${locations.length === 1 ? "bar" : "bars"} ${locations.join(", ")}` : `Workbook · page ${variant.page ?? definition.page}`;
      lessons.push({
        id, kind: "integrate", applicationId: id, group: "application-practice",
        title: `${definition.label} · ${title}`, coverTitle: definition.label,
        context, summary: definition.description, defaultKeyId: key,
        tuneId: chart?.id ?? null, moduleId: module.id, moduleName: module.name,
        moduleNumber: module.number, practiceApplicationId: group.id, sleeve,
      });
      return { chartId: chart?.id, lessonId: id, title, context, variantId: variant.id };
    };
    for (const [index, variant] of definition.variants.entries()) {
      const exampleId = `${prefix}-example-${variant.id}`;
      const form = exampleForm(`${exampleId}-form`, definition, variant, lick.keyQuality);
      forms[form.id] = form;
      register(exampleId, form, [{ bar: 1, beatOffset: 0, anchorInterval: 0, fragment: "full", elements: variant.elements, pickupBeats: variant.pickupBeats, pickup: variant.pickupBeats > 0, variantId: variant.id }], lick.defaultKeyId, null, variant);
      group.variants.push({ id: variant.id, label: variant.label, page: variant.page ?? definition.page, exampleLessonId: exampleId });
      // Prefer the lick's existing excerpt where it satisfies the complete rule.
      const ordered = [...sources.filter((source) => source.moduleId === module.id), ...sources.filter((source) => source.moduleId !== module.id)];
      for (const source of ordered) {
        if (group.choices.some((choice) => choice.chartId === source.chart.id && choice.variantId === variant.id)) continue;
        const spots = matchApplication(source.form, variant);
        if (!spots.length) continue;
        const id = `${prefix}-${source.chart.id}${index ? `--${variant.id}` : ""}`;
        group.choices.push(register(id, source.form, spots, source.key, source.chart, variant));
      }
    }
    group.exampleLessonId = group.variants[0].exampleLessonId;
    groups.push(group);
  }
  return { charts: charts.sort((a, b) => a.title.localeCompare(b.title)), groups, applications, lessons, forms, definitions };
}

export function chartChoices(group, selectedIds, variantId = group.variants?.[0]?.id) {
  const selected = new Set(selectedIds);
  const choices = group.choices.filter((choice) => !variantId || choice.variantId === variantId);
  const yours = choices.filter((choice) => selected.has(choice.chartId));
  return { yours, suggested: yours.length ? [] : choices };
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
