/**
 * High-mileage jazz superimpositions and cadence placements beyond the workbook pages.
 * Each definition uses existing lick/fragment intervals without changing any phrase pitches.
 */

const N = (interval, beats = 0.5, extra = {}) => ({ type: "note", interval, beats, ...extra });
const R = (beats) => ({ type: "rest", beats });
const chord = (root, family, beats = 4, extra = {}) => ({ root, family, beats, ...extra });
const single = (root, family, beats = 4, extra = {}) => [chord(root, family, beats, extra)];

const MAJ = ["major7", "major6"];
const MAJ_LYDIAN = ["major7", "major6", "major7b5"];
const MIN_DORIAN = ["minor7", "minor11", "minor", "minor6"];
const MIN_MELODIC = ["minor", "minor6", "minorb6", "minormaj7"];
const DOM_PLAIN = ["dominant7", "dominant9"];
const DOM_LYDIAN = ["dominant7", "dominant9", "dominant7s11"];
const DOM_SUS = ["dominant7", "dominant9", "dominant7sus"];
const DOM_ALTERED = ["dominant7", "dominant7alt", "dominant7b9", "dominant7s9", "dominant7b13", "dominant7s5"];
const DOM_HW_DIM = ["dominant7", "dominant7s9", "dominant7b9", "dominant7s11"];

function withPitches(elements, pitches) {
  let index = 0;
  return elements.map((element) => (
    element.type === "note" ? { ...element, interval: pitches[index++] } : { ...element }
  ));
}

function shift(elements, amount) {
  return elements.map((element) => (
    element.type === "note" ? { ...element, interval: element.interval + amount } : { ...element }
  ));
}

function replace(elements, values) {
  return elements.map((element) => (
    element.type === "note" ? { ...element, interval: values[element.interval] ?? element.interval } : { ...element }
  ));
}

function head(elements, beats) {
  let position = 0;
  return elements.flatMap((element) => {
    const remaining = beats - position;
    position += element.beats;
    return remaining > 1e-6 ? [{ ...element, beats: Math.min(element.beats, remaining) }] : [];
  });
}

function reversedPitches(elements) {
  return withPitches(
    elements,
    elements.filter((element) => element.type === "note").map((element) => element.interval).reverse(),
  );
}

function directions(id, label, pattern, elements) {
  return [
    { id, label, pattern, elements, pickupBeats: 0 },
    { id: `${id}-backwards`, label: `${label} · backwards`, pattern, elements: reversedPitches(elements), pickupBeats: 0 },
  ];
}

function scaleDurations(elements, factor) {
  return elements.map((element) => ({ ...element, beats: element.beats * factor }));
}

export function extendedApplicationDefinitions(licks, fragments) {
  const source = (id) => licks.find((lick) => lick.id === id).elements.map((el) => ({ ...el }));
  const variant = (id, label, pattern, elements, extra = {}) => ({
    id,
    label,
    pattern,
    elements,
    pickupBeats: 0,
    ...extra,
  });
  const definitions = [];
  const add = (lickId, id, label, description, exampleTitle, sourceNote, variants) => {
    definitions.push({
      lickId,
      id,
      label,
      description,
      exampleTitle,
      source: `Jazz superimposition · ${sourceNote}`,
      variants,
    });
  };
  const one = (lickId, id, label, description, exampleTitle, root, family, extra = {}, beats = 4) => {
    add(
      lickId,
      id,
      label,
      description,
      exampleTitle,
      `${label.toLowerCase()} practice`,
      [variant("original", "Original", single(root, family, beats, extra), source(lickId))],
    );
  };

  // 1. CMAR over half-diminished (from the b3): 11 - b3 - b7 - b5 - 11 - b3.
  one(
    "cmar",
    "halfdim",
    "Half-diminished",
    "Play the minor shape from the half-diminished chord’s minor third (11–♭3–♭7–♭5).",
    "Half-diminished vamp",
    9,
    "halfdim",
    { quality: "minor7b5" },
  );

  // 4. Bird Opening full-form cadences matching standard tunes.
  const bo = source("bo");
  add(
    "bo",
    "ii-v-i",
    "ii–V–I cadence",
    "Enter with the pickup into ii7, peak over V7, and resolve on the fifth of Imaj7.",
    "ii–V–I cadence",
    "full Bird Opening over ii–V–I",
    [variant("original", "Full opening", [
      chord(7, "minor", 4, { qualities: ["minor7", "minor11", "minor"], quality: "minor7" }),
      chord(0, "dominant", 4, { qualities: DOM_LYDIAN, quality: "dominant7" }),
      chord(5, "major", 4, { qualities: MAJ, quality: "major7" }),
    ], bo, { pickupBeats: 0.5 })],
  );
  add(
    "bo",
    "two-bar-v-resolution",
    "Two-bar V resolution",
    "Stretch the opening across two bars of V7 before resolving into I or V/IV.",
    "Two-bar V → I cadence",
    "Bird Opening bridge resolution",
    [
      variant("to-major", "Two-bar V → I", [
        chord(0, "dominant", 8, { qualities: DOM_PLAIN, quality: "dominant7" }),
        chord(5, "major", 4, { qualities: MAJ, quality: "major7" }),
      ], bo, { pickupBeats: 0.5 }),
      variant("to-dominant", "Two-bar V → V/IV", [
        chord(0, "dominant", 8, { qualities: DOM_PLAIN, quality: "dominant7" }),
        chord(5, "dominant", 4, { qualities: DOM_PLAIN, quality: "dominant7" }),
      ], bo, { pickupBeats: 0.5 }),
    ],
  );

  // 6. Modern upper-structure uses of the major 1235 cell.
  const cell1235 = source("1235");
  add(
    "1235",
    "altered-dominant",
    "Altered dominant cells",
    "Play the major 1235 cell from ♭6 (♭13–♭7–1–♯9) or ♯4 (♯11–♭13–♭7–♭9) over an altered dominant.",
    "Altered dominant vamp",
    "1235 upper structures on 7alt",
    [
      ...directions(
        "flat-six",
        "Major cell from flat sixth",
        single(4, "dominant", 4, {
          qualities: ["dominant7", "dominant7alt", "dominant7b13", "dominant7s5", "dominant7s9"],
          quality: "dominant7alt",
        }),
        cell1235,
      ),
      ...directions(
        "sharp-four",
        "Major cell from sharp fourth",
        single(6, "dominant", 4, {
          qualities: ["dominant7", "dominant7alt", "dominant7b9", "dominant7b13", "dominant7s5"],
          quality: "dominant7alt",
        }),
        cell1235,
      ),
    ],
  );
  add(
    "1235",
    "lydian-major",
    "Lydian major",
    "Play the major 1235 cell from the second degree (9–3–♯11–13) over a major chord.",
    "Lydian major vamp",
    "1235 from the second degree",
    directions("second", "Major cell from second", single(10, "major", 4, { qualities: MAJ_LYDIAN, quality: "major7b5" }), cell1235),
  );
  add(
    "1235",
    "halfdim",
    "Half-diminished cells",
    "Play the major 1235 cell from ♭6 (♭6–♭7–1–♭3) or ♭7 (♭7–1–9–11) over a half-diminished chord.",
    "Half-diminished vamp",
    "1235 over half-diminished",
    [
      ...directions("flat-six", "Major cell from flat sixth", single(4, "halfdim", 4, { quality: "minor7b5" }), cell1235),
      ...directions("flat-seven", "Major cell from flat seventh", single(2, "halfdim", 4, { quality: "minor7b5" }), cell1235),
    ],
  );

  // 7. Bird Resolution upper structures (relative major / Dorian).
  one(
    "br",
    "lydian-major",
    "Lydian major from fifth",
    "Play the Bird Resolution from the fifth of a major chord for a 9–3–♯11–13–5–7 Lydian color.",
    "Lydian major vamp",
    5,
    "major",
    { qualities: MAJ_LYDIAN, quality: "major7b5" },
    8,
  );
  one(
    "br",
    "minor-from-flat-third",
    "Minor 7 from flat third",
    "Play the Bird Resolution from the minor third for a Dorian ♭7–1–9–11–♭3–5 color.",
    "Dorian minor vamp",
    9,
    "minor",
    { qualities: MIN_DORIAN, quality: "minor7" },
    8,
  );

  // 8. Donna Lee Resolution tritone-sub and backdoor cadences.
  const dlr = source("dlr");
  add(
    "dlr",
    "tritone-sub",
    "Tritone-sub ♭II7 → I / i",
    "Start on the major seventh of ♭II7 (♯11–13–1–♭7–...) as a Lydian-dominant tritone substitute into I or i.",
    "Tritone-sub cadence",
    "tritone-sub dominant into tonic",
    [
      variant("to-major", "Resolve to major third", [
        chord(1, "dominant", 4, { qualities: DOM_HW_DIM, quality: "dominant7s11" }),
        chord(0, "major", 4, { qualities: MAJ, quality: "major7" }),
      ], dlr),
      variant("to-minor", "Resolve to minor third", [
        chord(1, "dominant", 4, { qualities: DOM_HW_DIM, quality: "dominant7s11" }),
        chord(0, "minor", 4, { qualities: MIN_DORIAN, quality: "minor7" }),
      ], replace(dlr, { 16: 15 })),
    ],
  );
  add(
    "dlr",
    "backdoor",
    "Backdoor ♭VII7 → I",
    "Use the altered line on ♭VII7 resolving up a whole step into the tonic major chord.",
    "Backdoor dominant cadence",
    "backdoor dominant into I",
    [
      variant("original", "Resolve to third", [
        chord(10, "dominant", 4, { qualities: ["dominant7", "dominant7b9", "dominant7s9"], quality: "dominant7" }),
        chord(0, "major", 4, { qualities: MAJ, quality: "major7" }),
      ], dlr),
      variant("root", "Resolve to root", [
        chord(10, "dominant", 4, { qualities: ["dominant7", "dominant7b9", "dominant7s9"], quality: "dominant7" }),
        chord(0, "major", 4, { qualities: MAJ, quality: "major7" }),
      ], replace(dlr, { 16: 12 })),
      variant("fifth", "Resolve to fifth", [
        chord(10, "dominant", 4, { qualities: ["dominant7", "dominant7b9", "dominant7s9"], quality: "dominant7" }),
        chord(0, "major", 4, { qualities: MAJ, quality: "major7" }),
      ], replace(dlr, { 16: 19 })),
    ],
  );

  // 14. Coltrane Diminished Pattern resolving into I.
  const jcdp = source("jcdp");
  const jcdpOneBar = head(jcdp, 4);
  add(
    "jcdp",
    "resolve-to-major",
    "Diminished V → I",
    "Run the diminished pattern on V7♯9 and resolve smoothly to a tonic major chord tone.",
    "V7♯9 → Imaj7 cadence",
    "half-whole diminished cadence",
    [
      variant("one-bar-fifth", "One-bar V → 5th of I", [
        chord(7, "dominant", 4, { qualities: DOM_HW_DIM, quality: "dominant7s9" }),
        chord(0, "major", 4, { qualities: MAJ, quality: "major7" }),
      ], [...jcdpOneBar, N(7, 2), R(2)]),
      variant("one-bar-third", "One-bar V → 3rd of I", [
        chord(7, "dominant", 4, { qualities: DOM_HW_DIM, quality: "dominant7s9" }),
        chord(0, "major", 4, { qualities: MAJ, quality: "major7" }),
      ], [...shift(jcdpOneBar, 9), N(16, 2), R(2)]),
      variant("one-bar-root", "One-bar V → root of I", [
        chord(7, "dominant", 4, { qualities: DOM_HW_DIM, quality: "dominant7s9" }),
        chord(0, "major", 4, { qualities: MAJ, quality: "major7" }),
      ], [...shift(jcdpOneBar, 3), N(12, 2), R(2)]),
      variant("two-bar-fifth", "Two-bar V → 5th of I", [
        chord(7, "dominant", 8, { qualities: DOM_HW_DIM, quality: "dominant7s9" }),
        chord(0, "major", 4, { qualities: MAJ, quality: "major7" }),
      ], jcdp),
    ],
  );

  // 18. Sonny Stitt Resolution upper-structure triad pairs.
  one(
    "ssr",
    "major-from-fifth",
    "Major 9 from fifth",
    "Play the triad pair from the fifth of a major chord (5–7–9 | 1–3–5) for a crisp maj9 sound.",
    "Major 9 vamp",
    5,
    "major",
    { qualities: MAJ, quality: "major7" },
  );
  one(
    "ssr",
    "minor-from-flat-seven",
    "Minor 7 from flat seventh",
    "Play the triad pair from the flat seventh of a minor chord (♭7–9–11 | ♭3–5–♭7) for a Dorian upper structure.",
    "Dorian minor vamp",
    2,
    "minor",
    { qualities: MIN_DORIAN, quality: "minor7" },
  );
  one(
    "ssr",
    "dominant-sus",
    "Dominant 9sus4",
    "Play the triad pair from the fourth of a dominant chord (4–13–1 | ♭7–9–4) for a classic sus4/13 voicing.",
    "Dominant 9sus4 vamp",
    7,
    "dominant",
    { qualities: DOM_SUS, quality: "dominant7sus" },
  );

  // 20. Common-Tone Diminished Cell as a melodic-minor line.
  one(
    "ctdc",
    "lydian-dominant",
    "Lydian dominant",
    "Use the cell’s melodic-minor contour over V7♯11 (♯11–13–9–1–♭7–5), landing cleanly on the fifth.",
    "Lydian dominant vamp",
    9,
    "dominant",
    { qualities: DOM_LYDIAN, quality: "dominant7s11" },
  );
  one(
    "ctdc",
    "altered-dominant",
    "Altered dominant",
    "Play the shape from the dominant’s ♭3/♯9 (1–♯9–♭13–♯11–3–♭9) for pure altered-scale color.",
    "Altered dominant vamp",
    3,
    "dominant",
    { qualities: DOM_ALTERED, quality: "dominant7alt" },
  );
  one(
    "ctdc",
    "melodic-minor",
    "Melodic minor",
    "Play the cell from the major third below a minor tonic (7–9–5–11–♭3–1), resolving on the root.",
    "Melodic minor vamp",
    4,
    "minor",
    { qualities: MIN_MELODIC, quality: "minormaj7" },
  );
  one(
    "ctdc",
    "halfdim",
    "Half-diminished",
    "Use the cell from a half-step below a half-diminished chord (9–11–♭7–♭6–♭5–♭3) for Locrian ♮2 color.",
    "Half-diminished vamp",
    1,
    "halfdim",
    { quality: "minor7b5" },
  );

  // 22. Neighbor-Tone Passage in melodic-minor parent contexts.
  one(
    "ntp",
    "altered-dominant",
    "Altered dominant",
    "Start the melodic-minor passage a half step above an altered dominant (♭9–1–♭9–♯9–3–♯9–3–♯11–♭13).",
    "Altered dominant vamp",
    11,
    "dominant",
    { qualities: DOM_ALTERED, quality: "dominant7alt" },
    8,
  );
  one(
    "ntp",
    "lydian-dominant",
    "Lydian dominant",
    "Start the melodic-minor passage on the fifth of V7♯11 (5–♯11–5–13–♭7–13–♭7–1–9).",
    "Lydian dominant vamp",
    5,
    "dominant",
    { qualities: DOM_LYDIAN, quality: "dominant7s11" },
    8,
  );

  // 24. Altered Enclosure tritone-sub and backdoor resolutions.
  const ae = source("ae");
  add(
    "ae",
    "tritone-sub",
    "Tritone-sub ♭II7 → I",
    "Outline 13–5–9–3 on the tritone substitute ♭II7 before resolving to the fifth of I.",
    "Tritone-sub cadence",
    "altered enclosure on ♭II7 → I",
    [
      variant("original", "Half-bar chords", [
        chord(1, "dominant", 2, { qualities: DOM_LYDIAN, quality: "dominant7s11" }),
        chord(0, "major", 2, { qualities: MAJ, quality: "major7" }),
      ], ae),
      variant("full-bars", "One bar per chord", [
        chord(1, "dominant", 4, { qualities: DOM_LYDIAN, quality: "dominant7s11" }),
        chord(0, "major", 4, { qualities: MAJ, quality: "major7" }),
      ], scaleDurations(ae, 2)),
    ],
  );
  add(
    "ae",
    "backdoor",
    "Backdoor ♭VII7 → I",
    "Outline 1–♭7–4–5 on the backdoor dominant ♭VII7 before landing on the fifth of I.",
    "Backdoor dominant cadence",
    "backdoor ♭VII7 → I",
    [
      variant("original", "Half-bar chords", [
        chord(10, "dominant", 2, { qualities: DOM_SUS, quality: "dominant7" }),
        chord(0, "major", 2, { qualities: MAJ, quality: "major7" }),
      ], ae),
      variant("full-bars", "One bar per chord", [
        chord(10, "dominant", 4, { qualities: DOM_SUS, quality: "dominant7" }),
        chord(0, "major", 4, { qualities: MAJ, quality: "major7" }),
      ], scaleDurations(ae, 2)),
    ],
  );

  // 26. Bread and Butter upper structures.
  one(
    "bb",
    "lydian-major",
    "Lydian major from fifth",
    "Play the major shape from the fifth of Imaj7 for a modern 9–3–♯11–13–5–7–9 Lydian line.",
    "Lydian major vamp",
    5,
    "major",
    { qualities: MAJ_LYDIAN, quality: "major7b5" },
  );
  one(
    "bb",
    "minor-from-flat-third",
    "Minor 7 from flat third",
    "Play the major shape from the minor third of a minor chord for a ♭7–1–9–11–♭3–5–♭7 Dorian line.",
    "Dorian minor vamp",
    9,
    "minor",
    { qualities: MIN_DORIAN, quality: "minor7" },
  );

  // 30. Nine to Nine Resolution in a minor iiø–V–i.
  add(
    "nnr",
    "minor-ii-v-i",
    "Minor iiø–V–i",
    "Move from the 11th of iiø7 into ♭13 of V7alt, then land on the ninth of the minor tonic.",
    "Minor iiø–V–i cadence",
    "minor cadence voice-leading",
    [variant("original", "Minor cadence", [
      chord(2, "halfdim", 2, { quality: "minor7b5" }),
      chord(7, "dominant", 2, { qualities: DOM_ALTERED, quality: "dominant7alt" }),
      chord(0, "minor", 4, { qualities: MIN_DORIAN, quality: "minor7" }),
    ], source("nnr"))],
  );

  void fragments;
  return definitions;
}
