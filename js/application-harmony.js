/**
 * Relative polychord fractions, chord-tone color degrees, and concrete transposed
 * chart pairings for lick applications.
 */

import {
  chorusChords,
  chordAtBeat,
  displayKey,
  shownPc,
  spellChordRoot,
  wrapPc,
} from "./music.js";
import {
  PRACTICE_CATALOG,
  LICKS,
  formById,
  lickById,
} from "./registry.js";

const pc = wrapPc;

const LICK_SHAPE_BASE = Object.freeze({
  cmar: { offset: 0, suffix: "m" },
  hsr: { offset: 0, suffix: "m" },
  mp: { offset: 0, suffix: "m" },
  ntp: { offset: 0, suffix: "m" },
  "minor-rise-return": { offset: 0, suffix: "m" },
  "lotus-inspired": { offset: 0, suffix: "m" },
  "south-of-the-river": { offset: 0, suffix: "m" },
  1235: { offset: 0, suffix: "maj" },
  br: { offset: 0, suffix: "maj" },
  et: { offset: 0, suffix: "maj" },
  ssr: { offset: 0, suffix: "maj" },
  bb: { offset: 0, suffix: "maj" },
  fe: { offset: 0, suffix: "maj" },
  ae: { offset: 0, suffix: "maj" },
  dct: { offset: 0, suffix: "maj" },
  tisc: { offset: 0, suffix: "△7" },
  lg: { offset: 0, suffix: "Lyd" },
  bo: { offset: 0, suffix: "dom" },
  cbc: { offset: 7, suffix: "dom" },
  jcdp: { offset: 7, suffix: "dim" },
  tdp: { offset: 7, suffix: "dim" },
  dss: { offset: 0, suffix: "dim" },
  ctdc: { offset: 0, suffix: "°" },
  "south-of-the-river-opening": { offset: 0, suffix: "△7" },
  "south-of-the-river-climb-and-landing": { offset: 0, suffix: "△7" },
});

const TIGHT_SUFFIXES = new Set(["", "m", "m7", "m△7", "ø7", "°7", "°△7", "°", "△7", "△♭5"]);

const DEGREE_NAMES_DEFAULT = ["1", "♭2", "2", "♭3", "3", "4", "♯4", "5", "♭6", "6", "♭7", "7"];
const DEGREE_NAMES_DIM = ["1", "♭2", "2", "♭3", "3", "4", "♭5", "5", "♭6", "6", "♭7", "7"];

const COLOR_DEGREES = {
  minor: ["1", "♭9", "9", "♭3", "3", "11", "♯11", "5", "♭13", "13", "♭7", "7"],
  major: ["1", "♭9", "9", "♯9", "3", "4", "♯11", "5", "♯5", "6", "♭7", "7"],
  dominant: ["1", "♭9", "9", "♯9", "3", "11", "♯11", "5", "♭13", "13", "♭7", "7"],
  halfdim: ["1", "♭9", "9", "♭3", "3", "11", "♭5", "5", "♭13", "13", "♭7", "7"],
  dim: ["1", "♭9", "9", "♭3", "3", "11", "♭5", "5", "♭13", "6", "♭7", "7"],
};

const GROUP_ORDER = ["minor", "major", "dominant", "halfdim", "dim", "progression"];

const GROUP_HEADINGS = Object.freeze({
  minor: "Over minor",
  major: "Over major",
  dominant: "Over dominant",
  halfdim: "Over half-diminished",
  dim: "Over diminished",
  progression: "Over progressions",
});

const CONCRETE_SUFFIX = Object.freeze({
  m: "m",
  m7: "m7",
  "m△7": "m△7",
  maj: " maj",
  "△7": "maj7",
  "△♭5": "maj7♭5",
  Lyd: " Lyd",
  dom: "7",
  alt: " alt",
  ø7: "ø7",
  "°7": "°7",
  "°△7": "°△7",
  "°": "°",
  dim: " dim",
});

const JCDP_DOM_DEGREES = { 0: "1", 3: "♯9", 6: "♯11", 9: "13" };
const JCDP_DIM_DEGREES = { 11: "7", 2: "9", 5: "11", 8: "♭13" };

const ROOT_QUALITY_ADAPTED_LICKS = new Set(["mp", "br", "ntp", "dct", "ae", "fe", "bb", "et", "bo"]);

function notePcs(elements = []) {
  return new Set(elements.filter((el) => el.type === "note").map((el) => pc(el.interval)));
}

function firstNoteInterval(elements = []) {
  const first = elements.find((el) => el.type === "note");
  return first ? first.interval : 0;
}

function lastNoteInterval(elements = []) {
  for (let i = elements.length - 1; i >= 0; i -= 1) {
    if (elements[i].type === "note") return elements[i].interval;
  }
  return 0;
}

function formatDegreeTop(degreeLabel, suffix) {
  if (!suffix) return degreeLabel;
  return TIGHT_SUFFIXES.has(suffix) ? `${degreeLabel}${suffix}` : `${degreeLabel} ${suffix}`;
}

function semitoneToDegree(degPc, family) {
  const table = family === "halfdim" || family === "dim" ? DEGREE_NAMES_DIM : DEGREE_NAMES_DEFAULT;
  return table[pc(degPc)];
}

function singleChordBottom(definition, variant, event) {
  const { family, quality } = event;
  const lickId = definition.lickId;
  const defId = definition.id;
  const varId = variant.id;
  if (family === "minor") return quality === "minormaj7" ? "m△7" : "m7";
  if (family === "major") return "maj7";
  if (family === "halfdim") return "ø7";
  if (family === "dim") return "°7";
  if (family !== "dominant") return quality ?? family;

  if (quality === "dominant7sus" || defId === "dominant-sus") return "7sus";
  if (quality === "dominant7b13" || defId.includes("flat-thirteen")) return "7♭13";
  if (quality === "dominant7b9" || defId.includes("flat-nine")) return "7♭9";
  if (["jcdp", "tdp"].includes(lickId) || quality === "dominant7s9") return "7♯9";
  if (
    quality === "dominant7alt"
    || defId.includes("altered")
    || (lickId === "hsr" && defId === "altered-dominant" && varId.includes("flat-seven"))
  ) {
    return (lickId === "hsr" && varId === "original") ? "7♭9" : "7alt";
  }
  if (quality === "dominant7s11" || (defId.includes("lydian") && lickId !== "cmar")) return "7♯11";
  return "7";
}

function singleChordShape(definition, variant, event) {
  const lickId = definition.lickId;
  const defId = definition.id;
  const varId = variant.id;
  const elements = variant.elements ?? [];
  const base = LICK_SHAPE_BASE[lickId] ?? { offset: 0, suffix: "maj" };

  if (lickId === "1235") {
    const pcs = notePcs(elements);
    return { offset: 0, suffix: pcs.has(3) && !pcs.has(4) ? "m" : "maj" };
  }

  if (lickId === "tisc") {
    const pcs = notePcs(elements);
    if (pcs.has(4) && pcs.has(6) && pcs.has(11)) return { offset: 0, suffix: "△♭5" };
    if (pcs.has(4) && pcs.has(7) && pcs.has(11)) return { offset: 0, suffix: "△7" };
    if (pcs.has(4) && pcs.has(7) && pcs.has(10)) return { offset: 0, suffix: "dom" };
    if (pcs.has(3) && pcs.has(7) && pcs.has(10)) return { offset: 0, suffix: "m7" };
    if (pcs.has(3) && pcs.has(6) && pcs.has(10)) return { offset: 0, suffix: "ø7" };
    if (pcs.has(3) && pcs.has(6) && pcs.has(11)) return { offset: 0, suffix: "°△7" };
    if (pcs.has(3) && pcs.has(6) && pcs.has(9)) return { offset: 0, suffix: "°7" };
    return { offset: 0, suffix: "△7" };
  }

  if (lickId === "se" && defId.endsWith("-targets")) {
    const targetPc = pc(lastNoteInterval(elements) - event.root);
    const targetDegree = targetPc === 0 ? "1" : targetPc === 3 ? "♭3" : targetPc === 4 ? "3" : targetPc === 7 ? "5" : semitoneToDegree(targetPc, event.family);
    return {
      offset: targetPc,
      suffix: "",
      explicitTop: `→ ${targetDegree}`,
      explicitDegree: targetDegree,
      isTargetOnly: true,
    };
  }

  if (lickId === "hsr" && defId === "altered-dominant") {
    return { offset: 0, suffix: "alt" };
  }

  if (lickId === "cbc" && ["halfdim", "minor-home", "dominant-flat-nine"].includes(defId)) {
    return { offset: 7, suffix: "alt" };
  }

  if (lickId === "acvl" && defId === "passing-diminished") {
    return { offset: 2, suffix: "ø7" };
  }

  if (lickId === "jcdp" || lickId === "tdp") {
    const entryOffset = pc(firstNoteInterval(elements) - event.root);
    if (event.family === "dominant") {
      const deg = JCDP_DOM_DEGREES[entryOffset] ?? semitoneToDegree(entryOffset, "dominant");
      return {
        offset: pc(event.root + entryOffset),
        suffix: "dim",
        explicitTop: `${deg} dim`,
        explicitDegree: deg,
        entryOffset,
      };
    }
    const deg = JCDP_DIM_DEGREES[entryOffset] ?? semitoneToDegree(entryOffset, "dim");
    return {
      offset: pc(event.root + entryOffset),
      suffix: "dim",
      explicitTop: `${deg} dim`,
      explicitDegree: deg,
      entryOffset,
    };
  }

  if (ROOT_QUALITY_ADAPTED_LICKS.has(lickId) && event.root === 0) {
    if (event.family === "major") return { offset: 0, suffix: "maj" };
    if (event.family === "minor") {
      const melodic = event.quality === "minormaj7" || defId === "melodic-minor" || varId === "minor-home";
      return { offset: 0, suffix: melodic && lickId === "br" ? "m△7" : "m" };
    }
    if (event.family === "dominant") {
      const altered = ["dominant7alt", "dominant7b9", "dominant7b13"].includes(event.quality)
        || varId.includes("flat-nine")
        || defId.includes("flat-nine")
        || defId.includes("altered");
      return { offset: 0, suffix: altered ? "alt" : "dom" };
    }
    if (event.family === "halfdim") return { offset: 0, suffix: "ø7" };
    if (event.family === "dim") return { offset: 0, suffix: "°7" };
  }

  return base;
}

function colorDegreesForSingle(variant, event) {
  const table = COLOR_DEGREES[event.family] ?? COLOR_DEGREES.major;
  const seen = new Set();
  const degrees = [];
  for (const el of variant.elements ?? []) {
    if (el.type !== "note") continue;
    const deg = pc(el.interval - event.root);
    if (seen.has(deg)) continue;
    seen.add(deg);
    degrees.push(table[deg]);
  }
  if (!degrees.length || degrees.length > 5) return [];
  return degrees;
}

function progressionBottom(pattern) {
  const sig = pattern.map((step) => `${step.root}:${step.family}`).join("->");
  switch (sig) {
    case "4:minor->9:dominant->2:minor->7:dominant->0:major":
    case "2:minor->7:dominant->0:major":
    case "7:minor->0:dominant->5:major":
    case "0:minor->5:dominant->10:major":
      return "ii–V–I";
    case "2:dominant->7:dominant->0:major":
      return "II7–V–I";
    case "2:halfdim->7:dominant->0:major":
      return "iiø–V–I";
    case "2:halfdim->7:dominant->0:minor":
      return "iiø–V–i";
    case "6:halfdim->11:dominant->4:minor":
      return "iiø–V–i";
    case "6:halfdim->11:halfdim->4:minor":
      return "iiø–vø–i";
    case "2:minor->7:dominant->0:minor":
      return "ii–V–i";
    case "2:minor->7:dominant":
    case "0:minor->5:dominant":
    case "4:minor->9:dominant":
      return "ii–V";
    case "2:halfdim->7:dominant":
    case "0:halfdim->5:dominant":
      return "iiø–V";
    case "7:dominant->0:major":
    case "0:dominant->5:major":
      return "V7→I";
    case "7:dominant->0:minor":
    case "0:dominant->5:minor":
      return "V7→i";
    case "1:dominant->0:major":
      return "♭II7→I";
    case "1:dominant->0:minor":
      return "♭II7→i";
    case "10:dominant->0:major":
      return "♭VII7→I";
    case "0:dominant->5:dominant":
      return "V→V/IV";
    case "0:minor->5:minor":
      return "i→iv";
    case "3:major->8:major":
      return "I→IV";
    case "0:major->9:dominant":
      return "I→VI7";
    default:
      return pattern.map((step) => step.family[0]).join("→");
  }
}

function resolutionTargetLabel(variant, dest) {
  if (!dest) return "→ 1";
  const targetPc = pc(lastNoteInterval(variant.elements) - dest.root);
  if (targetPc === 0) return "→ 1";
  if (targetPc === 3) return "→ ♭3";
  if (targetPc === 4) return "→ 3";
  if (targetPc === 7) return "→ 5";
  if (targetPc === 2) return "→ 9";
  return `→ ${semitoneToDegree(targetPc, dest.family)}`;
}

function progressionTop(definition, variant) {
  const { lickId, id: defId } = definition;
  const varId = variant.id;
  const pattern = variant.pattern;
  const first = pattern[0];
  const last = pattern.at(-1);

  if (lickId === "emr") {
    if (varId === "third") return "3 enc";
    if (varId === "fifth") return "5 enc";
    return "1 enc";
  }
  if (lickId === "gts") {
    return varId.includes("natural") ? "♮9" : "♭9";
  }
  if (lickId === "bo") return "1 dom";
  if (lickId === "br") {
    if (varId === "flat-seven") return "♭7 maj";
    return "1m";
  }
  if (lickId === "dlr") return resolutionTargetLabel(variant, last);
  if (lickId === "acvl" || lickId === "tm") return "arp";
  if (lickId === "tisc") return "1△7";
  if (lickId === "jcdp" || lickId === "tdp") {
    return defId === "resolve-to-major" ? resolutionTargetLabel(variant, last) : "dim";
  }
  if (lickId === "se") return "→ 3";
  if (lickId === "mp") return "1m";
  if (lickId === "sat") return "→ 9";
  if (lickId === "ctdc") return "1°";
  if (lickId === "tpr") return "triad";
  if (lickId === "ntp") return first.family === "halfdim" ? "1ø7" : "1m";
  if (lickId === "dct") return first.family === "dominant" ? "7♭9" : "1m";
  if (lickId === "ae") return resolutionTargetLabel(variant, last);
  if (lickId === "fe") return "→ 1";
  if (lickId === "bcf") return last.family === "minor" ? "→ ♭3" : "→ 3";
  if (lickId === "dss") return "dim";
  if (lickId === "nnr") {
    if (defId === "major-resolution") return "13→9";
    if (defId === "minor-ii-v-i") return "11→9";
    return "9→9";
  }
  if (lickId === "lotus-inspired") return "1m";
  if (lickId === "south-of-the-river") {
    const base = LICK_SHAPE_BASE[lickId] ?? { offset: 0, suffix: "m" };
    const deg = semitoneToDegree(base.offset - first.root, first.family);
    return formatDegreeTop(deg, base.suffix);
  }
  if (lickId === "south-of-the-river-climb-and-landing") {
    const deg = semitoneToDegree(0 - first.root, first.family);
    return formatDegreeTop(deg, "△7");
  }
  return "1";
}

function progressionShapeOffset(definition, variant) {
  const base = LICK_SHAPE_BASE[definition.lickId];
  return base ? base.offset : 0;
}

/**
 * Locate the workbook/extended definition and variant for an application.
 */
export function findDefinitionVariant(
  workbookApplicationId,
  workbookVariantId,
  definitions = PRACTICE_CATALOG.definitions,
) {
  if (!workbookApplicationId) return { definition: null, variant: null };
  const definition = definitions.find(
    (item) => `${item.lickId}:${item.id}` === workbookApplicationId,
  ) ?? null;
  if (!definition) return { definition: null, variant: null };
  const variant = definition.variants.find((item) => item.id === workbookVariantId)
    ?? definition.variants[0]
    ?? null;
  return { definition, variant };
}

/**
 * Compute relative stacked-fraction harmony metadata for an application variant.
 */
export function describeApplicationHarmony({ definition, variant, lick } = {}) {
  if (!definition || !variant) {
    return {
      top: "",
      bottom: "",
      compact: "",
      spoken: "",
      groupFamily: "progression",
      groupHeading: GROUP_HEADINGS.progression,
      degrees: [],
      degreesLabel: "",
      isSingleChord: false,
      shapeOffset: 0,
      shapeSuffix: "",
      degreeLabel: "",
      wideFraction: false,
    };
  }
  const pattern = variant.pattern ?? [];
  const isSingleChord = pattern.length === 1;
  if (!isSingleChord) {
    const top = progressionTop(definition, variant);
    const bottom = progressionBottom(pattern);
    const compact = `${top} / ${bottom}`;
    return {
      top,
      bottom,
      compact,
      spoken: `${top} over ${bottom}`,
      groupFamily: "progression",
      groupHeading: GROUP_HEADINGS.progression,
      degrees: [],
      degreesLabel: "",
      isSingleChord: false,
      shapeOffset: progressionShapeOffset(definition, variant),
      shapeSuffix: "",
      degreeLabel: "",
      wideFraction: top.length > 5 || bottom.length > 5,
    };
  }

  const event = pattern[0];
  const shape = singleChordShape(definition, variant, event);
  const degreeLabel = shape.explicitDegree ?? semitoneToDegree(shape.offset - event.root, event.family);
  const top = shape.explicitTop ?? formatDegreeTop(degreeLabel, shape.suffix);
  const bottom = singleChordBottom(definition, variant, event);
  const degrees = colorDegreesForSingle(variant, event);
  const groupFamily = GROUP_ORDER.includes(event.family) ? event.family : "progression";

  return {
    top,
    bottom,
    compact: `${top} / ${bottom}`,
    spoken: `${top} over ${bottom}`,
    groupFamily,
    groupHeading: GROUP_HEADINGS[groupFamily],
    degrees,
    degreesLabel: degrees.join(" · "),
    isSingleChord: true,
    shapeOffset: shape.offset,
    shapeSuffix: shape.suffix,
    degreeLabel,
    isTargetOnly: Boolean(shape.isTargetOnly),
    entryOffset: shape.entryOffset ?? null,
    wideFraction: top.length > 5 || bottom.length > 5,
    lickKeyQuality: lick?.keyQuality ?? "minor",
  };
}

function preferFlatsForPair(overChord, degreeLabel) {
  if (/^[A-G]♯/u.test(overChord)) return false;
  if (/^[A-G]♭/u.test(overChord)) return true;
  if (degreeLabel?.startsWith("♯")) return false;
  if (degreeLabel?.startsWith("♭")) return true;
  if (/^F(?![♯#])/u.test(overChord)) return true;
  return false;
}

function formatPlayChord(playRoot, shapeSuffix) {
  const suffix = CONCRETE_SUFFIX[shapeSuffix] ?? shapeSuffix;
  return `${playRoot}${suffix}`;
}

function spotBarsLabel(application) {
  const form = formById(application.formId);
  const offset = form?.excerptStartBar ?? 1;
  const locations = (application.spots ?? []).map((spot) => {
    const bar = spot.bar + offset - 1;
    return spot.beatOffset ? `${bar} beat ${spot.beatOffset + 1}` : `${bar}`;
  });
  if (!locations.length) return "";
  return `${locations.length === 1 ? "bar" : "bars"} ${locations.join(", ")}`;
}

function chordNamesInWindow(chords, startBeat, pattern) {
  const names = [];
  let cursor = startBeat;
  for (const step of pattern) {
    const chord = chordAtBeat(chords, cursor);
    if (chord?.name && names.at(-1) !== chord.name) names.push(chord.name);
    cursor += step.beats ?? 4;
  }
  return names;
}

/**
 * Compute transposed concrete chart pairings alongside relative polychord metadata.
 */
export function describeChartApplicationChoice({
  definition,
  variant,
  lick,
  application,
  concertKey,
  displayMode = "piano",
}) {
  const harmony = describeApplicationHarmony({ definition, variant, lick });
  const chords = application ? chorusChords(concertKey, displayMode, application.id) : [];
  const shownKey = displayKey(concertKey, displayMode, lick?.keyQuality ?? "minor");
  const spots = application?.spots ?? [];
  const concretePairs = [];

  if (harmony.isSingleChord) {
    for (const spot of spots) {
      const beat = (spot.bar - 1) * 4 + (spot.beatOffset ?? 0);
      const overChord = chordAtBeat(chords, Math.max(0, beat))?.name ?? "";
      if (!overChord) continue;
      if (harmony.isTargetOnly) {
        concretePairs.push(overChord);
        continue;
      }
      const offsetFromAnchor = harmony.entryOffset != null
        ? (variant.pattern[0].root + harmony.entryOffset)
        : harmony.shapeOffset;
      const playConcertPc = pc(concertKey.pc + spot.anchorInterval + offsetFromAnchor);
      const playShownPc = shownPc(playConcertPc, displayMode);
      const flats = preferFlatsForPair(overChord, harmony.degreeLabel);
      const playRoot = spellChordRoot(playShownPc, shownKey, flats);
      const playChord = formatPlayChord(playRoot, harmony.shapeSuffix);
      concretePairs.push(`${playChord} over ${overChord}`);
    }
  } else {
    const pattern = variant?.pattern ?? [];
    for (const spot of spots) {
      const beat = (spot.bar - 1) * 4 + (spot.beatOffset ?? 0);
      const names = chordNamesInWindow(chords, Math.max(0, beat), pattern);
      if (names.length) concretePairs.push(names.join(" → "));
    }
  }

  const unique = [];
  const seen = new Set();
  for (const pair of concretePairs) {
    if (seen.has(pair)) continue;
    seen.add(pair);
    unique.push(pair);
  }

  let concreteSummary = "";
  if (unique.length === 1) concreteSummary = unique[0];
  else if (unique.length === 2) concreteSummary = `${unique[0]}, ${unique[1]}`;
  else if (unique.length > 2) concreteSummary = `${unique[0]} (+${unique.length - 1} more)`;

  const barsLabel = application ? spotBarsLabel(application) : "";
  const line = [concreteSummary, barsLabel].filter(Boolean).join(" · ");

  return {
    ...harmony,
    concretePairs,
    concreteSummary,
    barsLabel,
    line,
  };
}

/**
 * Group enriched chart application items by chord family in canonical order.
 */
export function groupChartApplications(items) {
  const buckets = new Map();
  for (const item of items) {
    const family = item.info?.groupFamily ?? "progression";
    if (!buckets.has(family)) buckets.set(family, []);
    buckets.get(family).push(item);
  }
  return GROUP_ORDER
    .filter((family) => buckets.has(family))
    .map((family) => ({
      family,
      heading: GROUP_HEADINGS[family],
      items: buckets.get(family),
    }));
}

/**
 * Format the session header pill for practice/integrate lessons.
 */
export function formatSessionApplicationLabel(
  application,
  { definitions = PRACTICE_CATALOG.definitions, licks = LICKS } = {},
) {
  if (!application) return "";
  if (!application.workbookApplicationId) return application.label ?? "";
  const { definition, variant } = findDefinitionVariant(
    application.workbookApplicationId,
    application.workbookVariantId,
    definitions,
  );
  if (!definition || !variant) return application.label ?? "";
  const lick = licks.find((item) => item.id === application.lickId) ?? lickById(application.lickId);
  const harmony = describeApplicationHarmony({ definition, variant, lick });
  return harmony.compact ? `${harmony.compact} · ${application.label}` : (application.label ?? "");
}
