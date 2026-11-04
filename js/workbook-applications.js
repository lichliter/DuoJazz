/**
 * Harmonic applications taught on the workbook's numbered teaching pages.
 * Each variant states its harmony in semitones from the cell's anchor, and
 * supplies the actual notes when the use requires a different form of the cell.
 * Rhythmic demonstrations are not extra harmonic applications.
 */
const N = (interval, beats = 0.5, extra = {}) => ({ type: "note", interval, beats, ...extra });
const R = (beats) => ({ type: "rest", beats });
const chord = (root, family, beats = 4) => ({ root, family, beats });
const single = (root, family, beats = 4) => [chord(root, family, beats)];
const cadence = (quality = "major", beats = 2, ii = "minor") => [
  chord(2, ii, beats), chord(7, "dominant", beats), chord(0, quality, 4),
];

function withPitches(elements, pitches) {
  let index = 0;
  const result = elements.map((element) => element.type === "note"
    ? { ...element, interval: pitches[index++] } : { ...element });
  if (index !== pitches.length) throw new Error("Application note count does not match its rhythm");
  return result;
}

function shift(elements, amount) {
  return elements.map((element) => element.type === "note"
    ? { ...element, interval: element.interval + amount } : { ...element });
}

function replace(elements, values) {
  return elements.map((element) => element.type === "note"
    ? { ...element, interval: values[element.interval] ?? element.interval } : { ...element });
}

function head(elements, beats) {
  let position = 0;
  return elements.flatMap((element) => {
    const remaining = beats - position;
    position += element.beats;
    return remaining > 1e-6 ? [{ ...element, beats: Math.min(element.beats, remaining) }] : [];
  });
}

function diatonic(elements, scale) {
  const major = [0, 2, 4, 5, 7, 9, 11];
  return elements.map((element) => {
    if (element.type !== "note") return { ...element };
    const octave = Math.floor(element.interval / 12);
    const degree = major.indexOf(((element.interval % 12) + 12) % 12);
    if (degree < 0) throw new Error("Diatonic application needs an explicitly diatonic source");
    return { ...element, interval: octave * 12 + scale[degree] };
  });
}

export function workbookApplicationDefinitions(licks, fragments) {
  const source = (id) => licks.find((lick) => lick.id === id).elements.map((el) => ({ ...el }));
  const variant = (id, label, pattern, elements, extra = {}) => ({ id, label, pattern, elements, pickupBeats: 0, ...extra });
  const base = (lickId, pattern, extra = {}) => variant("original", "Original", pattern, source(lickId), extra);
  const group = (lickId, id, label, description, variants, note = "") => {
    const index = licks.findIndex((lick) => lick.id === lickId);
    return { lickId, id, label, description, page: index * 2 + 1, note, variants };
  };
  const g = [];
  const add = (...args) => g.push(group(...args));
  const one = (lick, id, label, description, root, family, elements = source(lick), beats = 4) =>
    add(lick, id, label, description, [variant("original", "Original", single(root, family, beats), elements)]);

  // 1. Same minor cell, six demonstrated harmonic placements (p. 1).
  one("cmar", "minor-home", "Minor home", "Play the minor shape from the chord's root.", 0, "minor");
  one("cmar", "minor-fifth", "Minor from the fifth", "Play the minor shape a fifth above the minor chord's root.", 5, "minor");
  one("cmar", "major-color", "Major color", "Play the minor shape from the major chord's sixth.", 3, "major");
  one("cmar", "lydian-major", "Lydian major", "Play the minor shape from the major chord's third for a raised-fourth color.", 8, "major");
  one("cmar", "lydian-dominant", "Lydian dominant", "Play the minor shape from the dominant chord's fifth for a sharp-eleven color.", 5, "dominant");
  one("cmar", "altered-dominant", "Altered dominant", "Play the minor shape a half step above the dominant root.", 11, "dominant");

  // 2. All three triadic enclosure entries lead to the same minor resolution.
  add("emr", "minor-resolution", "Resolve to minor", "Embellish the dominant triad, then resolve into minor.",
    [0, 4, 7].map((offset, index) => variant(["root", "third", "fifth"][index],
      ["Root enclosure", "Third enclosure", "Fifth enclosure"][index],
      [chord(7, "dominant"), chord(0, "minor")], source("emr").map((el, i) =>
        el.type === "note" && i < 4 ? { ...el, interval: el.interval + offset } : el))));

  // 3. Full guide-tone sequence, and its reusable ii–V half-cell.
  const gts = source("gts");
  const gtsPattern = [chord(4, "minor", 2), chord(9, "dominant", 2), ...cadence()];
  add("gts", "ii-v-i", "ii–V–I resolution", "Play the full guide-tone sequence into a major arrival.", [
    variant("original", "Flat ninths", gtsPattern, gts),
    variant("natural-ninths", "Natural ninths", gtsPattern, replace(gts, { 10: 11, 8: 9 })),
  ]);
  const halfGts = fragments["gts-half"].elements;
  add("gts", "ii-v", "Chained ii–V cells", "Use the short cell on a ii–V, including a chain that continues into another minor chord.", [
    variant("original", "Flat ninth", cadence().slice(0, 2), halfGts),
    variant("natural-ninth", "Natural ninth", cadence().slice(0, 2), replace(halfGts, { 8: 9 })),
  ]);

  // 4. The whole phrase and the two independently useful halves.
  add("bo", "dominant", "Dominant opening", "Use Bird's complete opening over a sustained dominant chord.",
    [base("bo", single(0, "dominant", 12), { pickupBeats: 0.5 })]);
  add("bo", "dominant-first-half", "Dominant first half", "Use the first half to open or extend a dominant phrase.",
    [variant("original", "First half", single(0, "dominant"), fragments["bo-first"].elements, { pickupBeats: 0.5 })]);
  one("bo", "dominant-second-half", "Dominant second half", "Use the second half as a dominant continuation.", 0, "dominant", fragments["bo-second"].elements, 8);
  one("bo", "major-second-half", "Major second half", "Use the second half over a major-nine sound.", 0, "major", fragments["bo-second"].elements, 8);

  // 5. The eight chord examples on p. 9, retaining the altered note changes.
  one("hsr", "minor-ii", "Minor ii chord", "Play the original minor shape from the chord's root.", 0, "minor");
  one("hsr", "dominant", "Dominant chord", "Use the minor shape from the dominant's fifth.", 5, "dominant");
  one("hsr", "halfdim", "Half-diminished", "Use the minor shape from the half-diminished chord's minor third.", 9, "halfdim");
  one("hsr", "major-color", "Major color", "Use the minor shape from the major chord's sixth.", 3, "major");
  one("hsr", "lydian-major", "Lydian major", "Use the minor shape from the major chord's third.", 8, "major");
  one("hsr", "minor-fifth", "Minor from the fifth", "Use the minor shape from the minor chord's fifth.", 5, "minor");
  add("hsr", "altered-dominant", "Altered dominant", "Change the low note as shown in the workbook's altered figure.", [
    variant("original", "Flat-nine color · shape from fifth", single(5, "dominant"), fragments["hsr-altered"].elements),
    variant("from-flat-seven", "Altered color · shape from flat seventh", single(2, "dominant"), fragments["hsr-altered"].elements),
  ]);

  // 6. Major/minor cells, both directions, and all four dominant placements.
  const cell = source("1235");
  const minorCell = replace(cell, { 4: 3 });
  const directions = (id, label, pattern, elements) => [
    variant(id, label, pattern, elements),
    variant(`${id}-backwards`, `${label} · backwards`, pattern,
      withPitches(elements, elements.filter((el) => el.type === "note").map((el) => el.interval).reverse())),
  ];
  add("1235", "major-home", "Major cell", "Use a major 1235 cell, forwards or backwards.", directions("original", "From root", single(0, "major"), cell));
  add("1235", "minor-home", "Minor cell", "Lower the third for the minor version.", directions("original", "From root", single(0, "minor"), minorCell));
  add("1235", "dominant", "Dominant cells", "Use the four diatonic placements demonstrated over a dominant chord.", [
    ...directions("root", "Major cell from root", single(0, "dominant"), cell),
    ...directions("ninth", "Minor cell from ninth", single(10, "dominant"), minorCell),
    ...directions("fifth", "Minor cell from fifth", single(5, "dominant"), minorCell),
    ...directions("flat-seven", "Major cell from flat seventh", single(2, "dominant"), cell),
  ]);

  // 7–10. Resolution and sequence contexts explicitly taught on these pages.
  one("br", "major-home", "Major resolution", "Use the figure after arriving on a major chord.", 0, "major", source("br"), 8);
  one("br", "minor-home", "Melodic minor resolution", "Lower the destination third while retaining the leading tone.", 0, "minor", replace(source("br"), { 16: 15 }), 8);
  add("dlr", "major-resolution", "Resolve to major", "Use the altered dominant cell and land on a destination chord tone.", [
    variant("original", "Resolve to third", [chord(7, "dominant"), chord(0, "major")], source("dlr")),
    variant("root", "Resolve to root", [chord(7, "dominant"), chord(0, "major")], replace(source("dlr"), { 16: 12 })),
    variant("fifth", "Resolve to fifth", [chord(7, "dominant"), chord(0, "major")], replace(source("dlr"), { 16: 19 })),
  ]);
  add("acvl", "ii-v-i", "ii–V–I resolution", "Follow the arpeggiated voice-leading into major.", [base("acvl", cadence("major", 4))]);
  add("acvl", "ii-v", "Chained ii–V cells", "Repeat the two-bar cell through a chain of ii–Vs.", [variant("original", "Two-bar cell", cadence("major", 4).slice(0, 2), head(source("acvl"), 8))]);
  add("tm", "ii-v", "ii–V movement", "Connect the minor arpeggio to its dominant chord.", [base("tm", cadence("major", 4).slice(0, 2))]);

  // 11. Arpeggio quality changes are explicit; chromatic entries stay chromatic.
  const tisc = source("tisc");
  one("tisc", "major-home", "Major arpeggio", "Ascend a major-seventh arpeggio from its seventh.", 0, "major");
  const arp = (pitches) => withPitches(tisc, pitches);
  add("tisc", "minor-home", "Minor arpeggios", "Use a minor arpeggio or one of the demonstrated upper structures.", [
    variant("original", "Minor seventh", single(0, "minor"), arp([10, 12, 15, 19, 22])),
    variant("chromatic", "Chromatic approach to root", single(0, "minor"), arp([11, 12, 15, 19, 22])),
    variant("flat-third", "Major arpeggio from minor third", single(9, "minor"), tisc),
    variant("fifth", "Minor arpeggio from fifth", single(5, "minor"), arp([10, 12, 15, 19, 22])),
  ]);
  add("tisc", "halfdim", "Half-diminished arpeggio", "Lower the third and fifth; retain either the seventh or a chromatic entry.", [
    variant("original", "From flat seventh", single(0, "halfdim"), arp([10, 12, 15, 18, 22])),
    variant("chromatic", "Chromatic approach", single(0, "halfdim"), arp([11, 12, 15, 18, 22])),
  ]);
  add("tisc", "dominant", "Dominant arpeggio", "Use the dominant-seventh arpeggio with either entry.", [
    variant("original", "From flat seventh", single(0, "dominant"), arp([10, 12, 16, 19, 22])),
    variant("chromatic", "Chromatic approach", single(0, "dominant"), arp([11, 12, 16, 19, 22])),
  ]);
  one("tisc", "dominant-flat-nine", "Dominant flat-nine color", "Use a diminished-major-seventh structure from the dominant's flat seventh.", 2, "dominant", arp([11, 12, 15, 18, 23]));

  one("et", "major-home", "Major triad", "Decorate the descending major triad with its written approach notes.", 0, "major", source("et"), 8);

  // 13. Same cell over V, ii and I, plus two distinct color placements.
  one("cbc", "dominant", "Dominant chord", "Use the original cell over V7.", 7, "dominant");
  one("cbc", "minor-ii", "Minor ii chord", "Use the same pitches over the related ii chord.", 2, "minor");
  one("cbc", "major-home", "Major arrival", "Use the same pitches over the related I chord.", 0, "major");
  one("cbc", "lydian-major", "Lydian major", "Start the cell on the sixth for a sharp-eleven sound.", 10, "major");
  one("cbc", "altered-dominant", "Altered dominant", "Start the figure a tritone above the dominant root.", 1, "dominant");

  // 14–15. The four symmetry-related entries are choices, not four tune claims.
  add("jcdp", "altered-dominant", "Diminished dominant pattern", "Use the four equivalent entries on an altered dominant.",
    [0, 3, 6, 9].map((amount, i) => variant(["original", "sharp-nine", "sharp-eleven", "thirteen"][i],
      ["From root", "From sharp ninth", "From sharp eleventh", "From thirteenth"][i], single(7, "dominant", 12), shift(source("jcdp"), amount))));
  add("jcdp", "diminished", "Diminished chord", "Use the entries specified for a diminished-seventh chord.",
    [0, 3, 6, 9].map((amount, i) => variant(["original", "ninth", "eleventh", "flat-thirteen"][i],
      ["From major seventh", "From ninth", "From eleventh", "From flat thirteenth"][i], single(8, "dim", 12), shift(source("jcdp"), amount))));
  add("tdp", "altered-dominant", "Diminished dominant turns", "Use the pattern at its four minor-third-related starting points.",
    [0, 3, 6, 9].map((amount, i) => variant(["original", "sharp-nine", "sharp-eleven", "thirteen"][i],
      ["From root", "From sharp ninth", "From sharp eleventh", "From thirteenth"][i], single(7, "dominant"), shift(source("tdp"), amount))));

  // 16. Standard major/minor ii–V contexts and the explicitly generalized target.
  add("se", "ii-v", "ii–V enclosure", "Enclose the dominant third from the preceding minor chord.", [base("se", cadence().slice(0, 2))]);
  add("se", "minor-ii-v", "Half-diminished ii–V", "Adjust the fifth for the half-diminished ii chord.",
    [variant("original", "Dominant third", cadence("minor", 2, "halfdim").slice(0, 2), replace(source("se"), { 9: 8 }))]);
  add("se", "dominant-targets", "Other dominant targets", "Keep the first two notes a diatonic fourth apart and enclose another target.",
    [7, 11, 14].map((target, i) => variant(["root", "third", "fifth"][i],
      ["Target root", "Target third", "Target fifth"][i], single(7, "dominant"),
      withPitches(source("se"), [target + 3, target - 2, target + 1, target - 2, target]))));

  // 17–18. Quality changes, not a generic transposition of the minor form.
  one("mp", "minor-home", "Minor passage", "Use the original minor passage.", 0, "minor");
  one("mp", "major-home", "Major passage", "Raise the thirds for the major version.", 0, "major", replace(source("mp"), { 3: 4 }));
  add("mp", "lydian-major", "Lydian major", "Use the two minor structures shown over a major sharp-eleven chord.", [
    variant("sixth", "Minor passage from sixth", single(3, "major"), source("mp")),
    variant("third", "Minor passage from third", single(8, "major"), source("mp")),
  ]);
  one("ssr", "major-home", "Major resolution", "Use the original major resolution, including at the end of a solo.", 0, "major");

  add("sat", "ii-v-i", "Resolve to major", "Connect thirteen to flat thirteen on V, then arrive on the ninth of I.", [base("sat", cadence())]);
  add("sat", "minor-resolution", "Resolve to minor", "Use the same ninth arrival in minor, adjusting the ii chord when needed.", [
    variant("minor-ii", "Minor-seven ii", cadence("minor"), source("sat")),
    variant("halfdim-ii", "Half-diminished ii", cadence("minor", 2, "halfdim"), replace(source("sat"), { 9: 8 })),
  ]);
  one("ctdc", "major-home", "Major common-tone color", "Imply a rootless diminished-major-seventh color over the major chord.", 0, "major");
  add("ctdc", "major-resolution", "Dominant to major", "Use the same common-tone cell over V and resolve to I.",
    [base("ctdc", [chord(7, "dominant", 2), chord(0, "major", 2)])]);
  add("tpr", "ii-v-i", "ii–V–I resolution", "Connect the major triad to its pentatonic resolution.", [base("tpr", cadence())]);

  // 22. Five explicitly demonstrated chord qualities; the diminished version is longer.
  one("ntp", "minor-home", "Minor neighbors", "Use the original minor neighbor-tone passage.", 0, "minor", source("ntp"), 8);
  const majorNtp = withPitches(source("ntp"), [12, 11, 12, 14, 16, 15, 16, 17, 19]);
  one("ntp", "major-home", "Major neighbors", "Raise the third and its chromatic lower neighbor.", 0, "major", majorNtp, 8);
  one("ntp", "dominant", "Dominant neighbors", "Use the major-third version over a dominant chord.", 0, "dominant", majorNtp, 8);
  one("ntp", "halfdim", "Half-diminished neighbors", "Use the flat ninth and flat fifth with the minor third.", 0, "halfdim", withPitches(source("ntp"), [12, 11, 12, 13, 15, 14, 15, 17, 18]), 8);
  one("ntp", "diminished", "Diminished neighbors", "Use the longer diminished-scale example.", 0, "dim",
    [...[0, -1, 0, 2, 3, 2, 3, 5, 6, 5, 7, 8, 9, 8, 9, 11].map((pitch) => N(pitch)), N(12, 2), R(2)], 12);

  // 23. The book explicitly generalizes the diatonic decoration to other qualities.
  for (const [id, label, family, scale] of [
    ["major-home", "Major chord tones", "major", [0, 2, 4, 5, 7, 9, 11]],
    ["minor-home", "Minor chord tones", "minor", [0, 2, 3, 5, 7, 9, 10]],
    ["dominant", "Dominant chord tones", "dominant", [0, 2, 4, 5, 7, 9, 10]],
    ["halfdim", "Half-diminished chord tones", "halfdim", [0, 1, 3, 5, 6, 8, 10]],
    ["diminished", "Diminished chord tones", "dim", [0, 2, 3, 5, 6, 8, 9]],
  ]) one("dct", id, label, "Keep the decoration diatonic to the selected chord quality.", 0, family, diatonic(source("dct"), scale), 12);

  add("ae", "altered-dominant", "Altered resolution", "Enclose the fifth of the destination major chord.", [
    base("ae", [chord(7, "dominant", 2), chord(0, "major", 2)]),
    variant("full-bars", "One bar per chord", [chord(7, "dominant"), chord(0, "major")], source("ae").map((el) => ({ ...el, beats: el.beats * 2 }))),
  ]);
  // The ordinary 54123 cell is demonstrated as the harmonic contrast to the altered use.
  one("ae", "major-cell", "Diatonic major enclosure", "Use the plain 54123 cell in its major-scale setting.", 0, "major", withPitches(source("ae"), [7, 5, 0, 2, 4]));
  one("fe", "major-home", "Major enclosure", "Enclose the major chord's root with the original chromatic figure.", 0, "major");
  one("fe", "minor-home", "Minor enclosure", "Use the same leading-tone enclosure for a melodic-minor sound.", 0, "minor");
  one("fe", "dominant", "Dominant enclosure", "Use the root enclosure in the dominant context shown in the solo example.", 0, "dominant");

  // 26. C BB over Dm7 is a whole step BELOW the chord root; G7 needs a new second cell.
  one("bb", "major-home", "Major home", "Use the original 1235 plus major-seventh arpeggio combination.", 0, "major");
  one("bb", "minor-home", "Minor seventh", "Use the original shape from the minor chord's flat seventh.", 2, "minor");
  one("bb", "dominant", "Dominant seventh", "Use the flat-seventh 1235 cell, then replace the second half with a half-diminished arpeggio.", 0, "dominant",
    withPitches(source("bb"), [10, 12, 14, 17, 14, 16, 19, 22]));

  // 27. Engraved F LG / G13 and Ab LG / Dø7 determine the actual grip roots.
  one("lg", "lydian", "Lydian major", "Use the grip on its own major sharp-eleven sound.", 0, "major");
  add("lg", "dominant", "Dominant thirteen color", "Use the grip from the dominant's flat seventh, as in the engraved F LG over G13 example.",
    [base("lg", single(2, "dominant"))], "Page 53 says '13th', but its F LG over G13 notation places the grip on the flat seventh. The engraved pitches are used here.");
  one("lg", "altered-dominant", "Altered dominant", "Use the grip from the dominant's third.", 8, "dominant");
  add("lg", "halfdim", "Half-diminished color", "Use the grip from the half-diminished chord's flat fifth, as in Ab LG over Dø7.",
    [base("lg", single(6, "halfdim"))], "The last prose paragraph calls this a dominant application; the engraved first chord is Dø7. Both shown chord contexts are mapped separately.");
  one("lg", "dominant-flat-nine", "Dominant flat-nine color", "Continue that grip over the dominant flat-nine chord, as in Ab LG over G7.", 11, "dominant");

  add("bcf", "ii-v-i", "Major ii–V–I", "Use the full chromatic phrase through the major cadence.", [base("bcf", cadence("major", 4))]);
  add("bcf", "halfdim-sequence", "Half-diminished sequence", "Use the alternate G-sharp half-diminished / C-sharp half-diminished / F-sharp minor setting shown on page 55.",
    [variant("original", "Workbook setting", [chord(6, "halfdim"), chord(11, "halfdim"), chord(4, "minor")], replace(source("bcf"), { 17: 18 }))]);
  add("dss", "diminished", "Diminished chord", "Use the whole-half diminished passage over a diminished chord.", [base("dss", single(0, "dim", 8), { pickupBeats: 1 })]);
  add("dss", "ii-v", "Minor-seven ii–V", "Use the diminished passage across the minor-seven ii and altered V.", [base("dss", [chord(0, "minor"), chord(5, "dominant")], { pickupBeats: 1 })]);
  add("dss", "minor-ii-v", "Half-diminished ii–V", "Use the same passage across a half-diminished ii and altered V.", [base("dss", [chord(0, "halfdim"), chord(5, "dominant")], { pickupBeats: 1 })]);
  add("dss", "altered-dominant", "Extended dominant pattern", "Continue the symmetrical passage over the altered dominant.", [base("dss", single(5, "dominant", 8), { pickupBeats: 1 })]);
  add("nnr", "ii-v-i", "Nine to nine", "Move from the ninth of ii through V's flat thirteenth to the ninth of I.", [base("nnr", cadence())]);

  // Continuation pages add harmonic contexts beyond the introductory diagrams.
  // These use the same cells (or the named partial cells), not all of the free
  // connecting material in the author's composed example lines.
  const context = (...args) => { add(...args); g.at(-1).page += 1; };
  const extend = (lick, id, variants) => {
    const definition = g.find((item) => item.lickId === lick && item.id === id);
    definition.variants.push(...variants.map((v) => ({ ...v, page: definition.page + 1 })));
  };
  const iiVEntry = (quality, ii = "minor") => [chord(2, ii, 2), chord(7, "dominant", 2), chord(0, quality)];

  context("emr", "major-resolution", "Resolve to major", "Use the dominant enclosure and ninth arrival in the major resolution shown on page 4.", [
    ...[0, 4, 7].map((amount, i) => variant(["root", "third", "fifth"][i], ["Root enclosure", "Third enclosure", "Fifth enclosure"][i],
      [chord(7, "dominant"), chord(0, "major")], source("emr").map((el, index) => el.type === "note" && index < 4 ? { ...el, interval: el.interval + amount } : el))),
    variant("early-ii-v", "Half-bar ii–V entry", iiVEntry("major", "halfdim"), source("emr")),
  ]);
  extend("emr", "minor-resolution", [variant("early-ii-v", "Half-bar ii–V entry", iiVEntry("minor", "halfdim"), source("emr"))]);

  context("bo", "major-first-half", "Major first half", "Use the opening half in the major-chord context on page 8.",
    [variant("original", "First half", single(0, "major"), fragments["bo-first"].elements, { pickupBeats: 0.5 })]);
  context("bo", "minor-first-half", "Minor first half", "Use the chromatic opening half in the minor-chord context.",
    [variant("original", "First half", single(0, "minor"), fragments["bo-first"].elements, { pickupBeats: 0.5 })]);
  context("bo", "lydian-dominant", "Lydian dominant opening", "Use the opening half from the dominant's ninth for a sharp-eleven color.",
    [variant("original", "First half from ninth", single(10, "dominant"), fragments["bo-first"].elements, { pickupBeats: 0.5 })]);

  extend("1235", "major-home", [
    ...directions("fifth", "Major cell from fifth", single(5, "major"), cell),
    ...directions("sixth", "Minor cell from sixth", single(3, "major"), minorCell),
  ]);
  extend("1235", "minor-home", [
    ...directions("flat-third", "Major cell from flat third", single(9, "minor"), cell),
    ...directions("flat-seven", "Major cell from flat seventh", single(2, "minor"), cell),
    ...directions("fifth", "Minor cell from fifth", single(5, "minor"), minorCell),
  ]);
  context("br", "ii-v", "Minor ii–V", "Carry the Bird Resolution through the minor ii and its dominant.", [
    variant("minor-root", "Minor shape from ii root", [chord(0, "minor"), chord(5, "dominant")], replace(source("br"), { 16: 15 })),
    variant("flat-seven", "Major shape from ii flat seventh", [chord(2, "minor"), chord(7, "dominant")], source("br")),
  ]);
  extend("dlr", "major-resolution", [variant("early-ii-v", "Half-bar ii–V entry", iiVEntry("major"), source("dlr"))]);
  context("dlr", "minor-resolution", "Resolve to minor", "Lower the destination third for the minor arrival shown on page 16.", [
    variant("third", "Resolve to minor third", [chord(7, "dominant"), chord(0, "minor")], replace(source("dlr"), { 16: 15 })),
    variant("root", "Resolve to root", [chord(7, "dominant"), chord(0, "minor")], replace(source("dlr"), { 16: 12 })),
    variant("fifth", "Resolve to fifth", [chord(7, "dominant"), chord(0, "minor")], replace(source("dlr"), { 16: 19 })),
    variant("early-ii-v", "Half-bar half-diminished ii–V entry", iiVEntry("minor", "halfdim"), replace(source("dlr"), { 16: 15 })),
  ]);
  context("acvl", "dominant-ii-v-i", "Dominant ii–V–I", "Raise the first arpeggio's third for the dominant-II context on page 18.", [
    variant("original", "Dominant first chord", [chord(2, "dominant"), chord(7, "dominant"), chord(0, "major")], source("acvl").map((el, i) => i < 8 && el.interval === 17 ? { ...el, interval: 18 } : el)),
  ]);
  context("acvl", "passing-diminished", "Passing diminished chord", "Use the first arpeggiated cell as a half-diminished upper structure over the passing diminished chord.", [
    variant("original", "First cell", single(5, "dim"), replace(head(source("acvl"), 4), { 21: 20 })),
  ]);

  extend("tisc", "major-home", [variant("minor-third", "Minor arpeggio from major third", single(8, "major"), arp([10, 12, 15, 19, 22]))]);
  extend("tisc", "minor-home", [variant("dim-major", "Diminished-major-seventh color", single(0, "minor"), arp([11, 12, 15, 18, 23]))]);
  extend("tisc", "halfdim", [variant("lydian-flat-five", "Major-flat-five arpeggio from flat fifth", single(6, "halfdim"), arp([11, 12, 16, 18, 23]))]);
  extend("tisc", "dominant", [
    variant("ninth", "Dominant arpeggio from ninth", single(10, "dominant"), arp([10, 12, 16, 19, 22])),
    variant("flat-seven", "Major arpeggio from flat seventh", single(2, "dominant"), tisc),
  ]);
  extend("tisc", "dominant-flat-nine", [
    variant("dim-flat-nine", "Diminished arpeggio from flat ninth", single(11, "dominant"), arp([9, 12, 15, 18, 21])),
    variant("lydian-flat-nine", "Major-flat-five arpeggio from flat ninth", single(11, "dominant"), arp([11, 12, 16, 18, 23])),
  ]);
  context("tisc", "major-resolution", "Major anticipation", "Begin the major arpeggio over V and carry it into I.", [base("tisc", [chord(7, "dominant", 2), chord(0, "major", 2)])]);

  context("et", "minor-color", "Minor triad colors", "Use major-triad upper structures in the minor-chord contexts on page 24.", [
    variant("flat-third", "Major triad from flat third", single(9, "minor", 8), source("et")),
    variant("flat-seven", "Major triad from flat seventh", single(2, "minor", 8), source("et")),
  ]);
  context("et", "dominant-flat-nine", "Dominant flat-nine color", "Decorate the dominant major triad with flat-nine and flat-thirteen upper neighbors.",
    [variant("original", "Flat-nine / flat-thirteen form", single(0, "dominant", 8), replace(source("et"), { 26: 25, 21: 20, 14: 13 }))]);
  context("et", "lydian-dominant", "Lydian dominant triad", "Use the major triad from the dominant's ninth.", [base("et", single(10, "dominant", 8))]);

  const minorCbc = replace(source("cbc"), { 9: 8, 4: 3 });
  context("cbc", "halfdim", "Half-diminished ii", "Use the minor-key form over the half-diminished ii chord.", [variant("original", "Minor-key cell", single(2, "halfdim"), minorCbc)]);
  context("cbc", "minor-home", "Minor arrival", "Use the minor-key form at the tonic-minor arrival.", [variant("original", "Minor-key cell", single(0, "minor"), minorCbc)]);
  context("cbc", "dominant-flat-nine", "Dominant flat-nine color", "Use the minor-key cell's flat ninth and flat thirteenth over V.", [variant("original", "Minor-key cell", single(7, "dominant"), minorCbc)]);

  extend("jcdp", "altered-dominant", [4, 8].flatMap((beats) => [0, 3, 6, 9].map((amount, i) =>
    variant(`${beats === 4 ? "one-bar" : "two-bar"}-${i}`, `${beats === 4 ? "One-bar" : "Two-bar"} cell · ${["root", "sharp ninth", "sharp eleventh", "thirteenth"][i]}`,
      single(7, "dominant", beats), shift(head(source("jcdp"), beats), amount)))));
  context("jcdp", "ii-v", "Diminished ii–V pattern", "Begin the two-bar diminished pattern over ii before reaching the dominant.", [
    variant("minor-ii", "Minor-seven ii", [chord(4, "minor"), chord(9, "dominant")], head(source("jcdp"), 8)),
    variant("halfdim-ii", "Half-diminished ii", [chord(4, "halfdim"), chord(9, "dominant")], head(source("jcdp"), 8)),
  ]);
  context("tdp", "ii-v", "Diminished ii–V turns", "Stretch the turning pattern over the ii–V window, as in the continuation examples.",
    [variant("original", "Two-bar turning pattern", [chord(7, "minor"), chord(0, "dominant")], source("tdp").map((el) => ({ ...el, beats: el.beats * 2 })))]);

  const targetEnclosure = (scale, degree) => {
    const at = (index) => scale[((index % 7) + 7) % 7] + Math.floor(index / 7) * 12;
    return [at(degree + 2), at(degree - 1), at(degree + 1), at(degree - 1), at(degree)];
  };
  const targets = (scale, family) => [0, 2, 4].map((degree, i) => variant(["root", "third", "fifth"][i],
    ["Target root", "Target third", "Target fifth"][i], single(0, family), withPitches(source("se"), targetEnclosure(scale, degree))));
  // The generalized targets must follow their chord's diatonic fourths.
  g.find((item) => item.lickId === "se" && item.id === "dominant-targets").variants = targets([0, 2, 4, 5, 7, 9, 10], "dominant");
  context("se", "major-targets", "Major targets", "Apply the sandwich to major-chord targets with diatonic approach notes.", targets([0, 2, 4, 5, 7, 9, 11], "major"));
  context("se", "minor-targets", "Minor targets", "Apply the sandwich to minor-chord targets with diatonic approach notes.", targets([0, 2, 3, 5, 7, 9, 10], "minor"));

  context("mp", "halfdim", "Half-diminished color", "Use the minor passage from the half-diminished chord's minor third.", [base("mp", single(9, "halfdim"))]);
  context("mp", "altered-dominant", "Altered dominant", "Use the minor passage from the dominant's flat ninth.", [base("mp", single(11, "dominant"))]);
  context("mp", "ii-v", "Minor ii–V passage", "Let the minor passage continue over the related dominant.", [base("mp", [chord(0, "minor", 2), chord(5, "dominant", 2)])]);
  context("ctdc", "major-secondary-dominant", "Major to secondary dominant", "Carry the common-tone color from I into its secondary dominant.", [base("ctdc", [chord(0, "major", 2), chord(9, "dominant", 2)])]);
  context("ntp", "ii-v", "Neighbor-tone ii–V", "Sustain the passage's final note across the change to V.", [
    variant("minor-ii", "Minor-seven ii", [chord(0, "minor"), chord(5, "dominant")], source("ntp")),
    variant("halfdim-ii", "Half-diminished ii", [chord(0, "halfdim"), chord(5, "dominant")], withPitches(source("ntp"), [12, 11, 12, 13, 15, 14, 15, 17, 18])),
  ]);

  for (const id of ["major-home", "minor-home", "dominant", "halfdim", "diminished"]) {
    const definition = g.find((item) => item.lickId === "dct" && item.id === id);
    const original = definition.variants[0];
    original.label = "Full pattern";
    extend("dct", id, [variant("two-bar-body", "Two-bar body", [{ ...original.pattern[0], beats: 8 }], head(original.elements, 8))]);
  }
  const phrygianDct = diatonic(source("dct"), [0, 1, 4, 5, 7, 8, 10]);
  const lydianDct = diatonic(source("dct"), [0, 2, 4, 6, 7, 9, 10]);
  extend("dct", "dominant", [
    variant("flat-nine-flat-thirteen", "Flat-nine / flat-thirteen form", single(0, "dominant", 12), phrygianDct),
    variant("flat-nine-body", "Flat-nine / flat-thirteen · two-bar body", single(0, "dominant", 8), head(phrygianDct, 8)),
    variant("lydian", "Sharp-eleven form", single(0, "dominant", 12), lydianDct),
    variant("lydian-body", "Sharp-eleven · two-bar body", single(0, "dominant", 8), head(lydianDct, 8)),
  ]);
  context("dct", "ii-v-i", "ii–V–I decoration", "Carry the Dorian decoration through ii–V and hold its ninth over I.",
    [variant("original", "Dorian cadence", [chord(0, "minor"), chord(5, "dominant"), chord(10, "major")], diatonic(source("dct"), [0, 2, 3, 5, 7, 9, 10]))]);
  context("dct", "minor-resolution", "Dominant to minor", "Use the flat-nine / flat-thirteen form and carry the final common tone into minor.",
    [variant("original", "Minor cadence", [chord(0, "dominant", 8), chord(5, "minor")], phrygianDct)]);

  context("ae", "minor-cell", "Diatonic minor enclosure", "Use the 54123 cell with a minor third, as in the minor-chord examples.",
    [variant("original", "Minor cell", single(0, "minor"), withPitches(source("ae"), [7, 5, 0, 2, 3]))]);
  context("ae", "halfdim-cell", "Half-diminished enclosure", "Use the Locrian form of the cell over a half-diminished chord.",
    [variant("original", "Locrian cell", single(0, "halfdim"), withPitches(source("ae"), [6, 5, 0, 1, 3]))]);
  context("fe", "ii-v", "ii–V enclosure", "Begin the enclosure over ii and reach the dominant root as V arrives.", [
    variant("minor-ii", "Minor-seven ii", [chord(2, "minor", 2), chord(7, "dominant", 2)], shift(source("fe"), 7)),
    variant("halfdim-ii", "Half-diminished ii", [chord(2, "halfdim", 2), chord(7, "dominant", 2)], shift(source("fe"), 7)),
  ]);
  context("lg", "minor-color", "Minor chord color", "Use the grip from the minor chord's minor third in the Dorian ii-chord setting.", [base("lg", single(9, "minor"))]);
  extend("lg", "dominant-flat-nine", [variant("flat-thirteen", "Grip from flat thirteenth", single(4, "dominant"), source("lg"))]);
  context("bcf", "minor-ii-v-i", "Minor ii–V–i", "Use the alternate figure in the normal half-diminished / dominant / minor setting on page 56.",
    [variant("original", "Minor cadence", [chord(6, "halfdim"), chord(11, "dominant"), chord(4, "minor")], replace(source("bcf"), { 17: 18 }))]);
  context("nnr", "major-resolution", "Dominant to major", "Start the thirteen-to-flat-thirteen voice-leading on V before its ninth arrival on I.",
    [base("nnr", [chord(7, "dominant"), chord(0, "major")])]);

  return g;
}
