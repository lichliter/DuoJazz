function N(interval, beats, extra = {}) {
  return { type: "note", interval, beats, ...extra };
}

function R(beats, extra = {}) {
  return { type: "rest", beats, ...extra };
}

function bar(chords) {
  return { chords };
}

function chord(intervalFromTonic, quality, durationBeats = 4, extra = {}) {
  return { intervalFromTonic, quality, durationBeats, ...extra };
}

const TRIPLET_EIGHTH = 1 / 3;
const SEXTUPLET_SIXTEENTH = 1 / 6;

const southSource = "Brian’s adaptation of Tom Misch’s South of the River";
const southId = "south-of-the-river";

// Original beats 1–2, including the sextuplet entrance rest.
const southOpening = [
  R(TRIPLET_EIGHTH, { tuplet: 6 }),
  N(9, SEXTUPLET_SIXTEENTH, { tuplet: 6, diatonicStep: 5 }),
  N(10, SEXTUPLET_SIXTEENTH, { tuplet: 6, diatonicStep: 6 }),
  N(14, SEXTUPLET_SIXTEENTH, { tuplet: 6, diatonicStep: 8 }),
  N(17, SEXTUPLET_SIXTEENTH, { tuplet: 6, diatonicStep: 10 }),
  N(14, 0.25, { swing: false, diatonicStep: 8 }),
  N(15, 0.25, { swing: false, diatonicStep: 9 }),
  N(19, 0.25, { swing: false, diatonicStep: 11 }),
  N(22, 0.25, { swing: false, diatonicStep: 13 }),
];

// Same concert pitches as southOpening, rooted on the relative major tonic (B♭ in G minor).
const southOpeningMajor = southOpening.map((element) => (
  element.type === "note"
    ? { ...element, interval: element.interval - 3, diatonicStep: element.diatonicStep - 2 }
    : element
));

// Original beats 3–4 and the B♭ landing on the following downbeat.
const southLanding = [
  N(19, 0.25, { swing: false, diatonicStep: 11 }),
  N(20, 0.25, { swing: false, diatonicStep: 12 }),
  N(24, 0.25, { swing: false, diatonicStep: 14 }),
  N(27, 0.25, { swing: false, diatonicStep: 16 }),
  N(31, 0.25, { swing: false, diatonicStep: 18 }),
  N(30, 0.25, { swing: false }),
  N(29, 0.25, { swing: false, diatonicStep: 17 }),
  N(28, 0.25, { swing: false }),
  N(27, 1, { diatonicStep: 16 }),
];

function halfTime(elements) {
  return elements.map((element) => ({
    ...element,
    beats: element.beats * 2,
    ...(element.beats === 0.25 && { swing: true }),
    ...(element.tuplet === 6 && { tupletSpanBeats: 2 }),
  }));
}

const halfTimeOpening = halfTime(southOpening);
const halfTimeOpeningMajor = halfTime(southOpeningMajor);
const halfTimeLanding = [...halfTime(southLanding), R(2)];
const southTonicBar = bar([chord(0, "minor7")]);
const southMajorTonicBar = bar([chord(0, "major7")]);
const southLandingBar = bar([chord(5, "minor7")]);

const southMinorQualities = ["minor7", "minor11", "minor"];
const southDomQualities = ["dominant7", "dominant9", "dominant7s11", "dominant7sus", "dominant7b9", "dominant7s9", "dominant7b13", "dominant7s5", "dominant7alt"];
const southMajorQualities = ["major7", "major6"];
const southLydianMajorQualities = ["major7", "major6", "major7b5"];

const southBlocks = [
  {
    id: `${southId}-opening`,
    name: "Sextuplet Run",
    blockBeats: "Bar 1",
    keyQuality: "major",
    defaultKeyId: "Bb",
    context: "Major · Half-time practice",
    elements: halfTimeOpeningMajor,
    bars: [southMajorTonicBar],
    summary: "Play the even sextuplet across beats 1 and 2, then swing the eighths on beats 3 and 4.",
    practiceDefinitions(elements) {
      return [
        {
          id: "lydian-major",
          label: "Major home (Lydian)",
          description: "Outline Vmaj7 (♯11–5–7–9) into Imaj7 (7–1–3–5) for a bright Lydian upper structure that lands on the tonic arpeggio.",
          source: `${southSource} · Sextuplet Run Lydian practice`,
          exampleTitle: "Major tonic vamp",
          pattern: [{ root: 0, family: "major", beats: 4, qualities: southLydianMajorQualities, quality: "major7" }],
          elements,
        },
        {
          id: "minor-home",
          label: "Relative minor (Dorian)",
          description: "Play ♭VIImaj7 (6–♭7–9–11) into ♭IIImaj7 (9–♭3–5–♭7) — two third-inversion major-seventh arpeggios a fourth apart for a pure Dorian sound.",
          source: `${southSource} · Sextuplet Run practice`,
          exampleTitle: "Minor tonic vamp",
          pattern: [{ root: 9, family: "minor", beats: 4, qualities: ["minor7", "minor11"], quality: "minor7" }],
          elements,
        },
        {
          id: "dominant-sus",
          label: "Dominant 13 / sus",
          description: "Play IVmaj7 (3–4–13–1) into ♭VIImaj7 (13–♭7–9–11) for a Mixolydian or sus upper structure.",
          source: `${southSource} · Sextuplet Run dominant practice`,
          exampleTitle: "Dominant sus vamp",
          pattern: [{ root: 2, family: "dominant", beats: 4, qualities: ["dominant7", "dominant9", "dominant7sus"], quality: "dominant7sus" }],
          elements,
        },
        {
          id: "major-home",
          label: "Major tonic (I → IV)",
          description: "Outline Imaj7 (7–1–3–5) into IVmaj7 (3–4–6–1) over a major tonic, landing back on the root.",
          source: `${southSource} · Sextuplet Run major practice`,
          exampleTitle: "Major tonic vamp",
          pattern: [{ root: 7, family: "major", beats: 4, qualities: southMajorQualities, quality: "major7" }],
          elements,
        },
      ];
    },
  },
  {
    id: `${southId}-climb-and-landing`,
    name: "Chromatic Landing",
    blockBeats: "Bar 2 plus resolution",
    elements: halfTimeLanding,
    bars: [southTonicBar, southLandingBar],
    summary: "Swing the eighths through the climb and chromatic descent, then land on the next downbeat.",
    minorHomeDescription: "Climb from the fifth, then descend chromatically to the minor third over the same chord.",
    extraPracticeDefinitions(elements) {
      return [
        {
          id: "minor-ii-v",
          label: "ii → V",
          description: "Climb and walk down chromatically over ii7, then land on the flat seventh guide tone of V7.",
          source: `${southSource} · Chromatic Landing ii–V practice`,
          exampleTitle: "ii → V vamp",
          pattern: [
            { root: 0, family: "minor", beats: 4, qualities: southMinorQualities, quality: "minor7" },
            { root: 5, family: "dominant", beats: 4, qualities: southDomQualities, quality: "dominant7" },
          ],
          elements,
        },
        {
          id: "major-home",
          label: "Relative major",
          description: "Walk down chromatically from the major third through the flat third and second to land on the tonic root.",
          source: `${southSource} · Chromatic Landing major practice`,
          exampleTitle: "Major tonic vamp",
          pattern: [{ root: 3, family: "major", beats: 8, qualities: southMajorQualities, quality: "major7" }],
          elements,
        },
      ];
    },
  },
];

function southBlockEntry({
  id,
  name,
  blockBeats,
  keyQuality = "minor",
  defaultKeyId = "G",
  context = "Minor · Half-time practice",
  elements,
  bars,
  summary,
  minorHomeDescription,
  extraPracticeDefinitions,
  practiceDefinitions,
}) {
  const learnId = `${id}-learn`;
  return {
    lick: {
      id, name, shortName: name, elements,
      source: southSource, octave: -2, pickupBeats: 0, learnBeats: bars.length * 4, keyQuality, defaultKeyId,
    },
    learnForm: {
      id: learnId, title: name, shortTitle: name, keyQuality,
      bars,
    },
    learnApplication: {
      id: learnId, lickId: id, formId: learnId, label: "Learn the lick",
      cellTonicInterval: 0, phraseStartBar: 1, leadIn: [], resolve: [], copyKind: "learn",
    },
    module: {
      id, lickId: id, name, blockBeats, compositeId: southId,
      lessons: [{
        id: learnId, kind: "learn", applicationId: learnId, title: "Learn the lick", coverTitle: "Learn the lick",
        summary, context, defaultKeyId,
      }],
    },
    practiceDefinitions() {
      const toVariantDef = (def) => ({
        lickId: id,
        id: def.id,
        label: def.label,
        description: def.description,
        source: def.source,
        exampleTitle: def.exampleTitle,
        variants: [{
          id: "original",
          label: "Half-time",
          elements: def.elements,
          pickupBeats: 0,
          pattern: def.pattern,
        }],
      });
      if (practiceDefinitions) {
        return practiceDefinitions(elements).map(toVariantDef);
      }
      const extras = (extraPracticeDefinitions?.(elements) ?? []).map(toVariantDef);
      return [{
        lickId: id,
        id: "minor-home",
        label: "Minor home",
        description: minorHomeDescription,
        source: `${southSource} · ${name} practice`,
        exampleTitle: "Minor tonic vamp",
        variants: [{
          id: "original", label: "Half-time", elements, pickupBeats: 0,
          pattern: [{ root: 0, family: "minor", beats: 8, qualities: ["minor7", "minor11"], quality: "minor7" }],
        }],
      }, ...extras];
    },
  };
}

export const CUSTOM_LICKS = [
  {
    lick: {
      id: "minor-rise-return",
      name: "Minor Rise and Return",
      shortName: "Minor rise and return",
      source: "Brian’s lick",
      octave: -2,
      pickupBeats: 0,
      learnBeats: 4,
      keyQuality: "minor",
      defaultKeyId: "Bb",
      elements: [N(0, 0.5), N(2, 0.5), N(3, 0.5), N(5, 0.5), N(2, 0.5), N(0, 0.5)],
    },
    learnForm: {
      id: "minor-rise-return-learn",
      title: "Minor Rise and Return",
      shortTitle: "The lick",
      keyQuality: "minor",
      bars: [bar([chord(0, "minor7")])],
    },
    learnApplication: {
      id: "minor-rise-return-learn",
      lickId: "minor-rise-return",
      formId: "minor-rise-return-learn",
      label: "Learn the lick",
      cellTonicInterval: 0,
      phraseStartBar: 1,
      leadIn: [],
      resolve: [],
      copyKind: "learn",
    },
    module: {
      id: "minor-rise-return",
      lickId: "minor-rise-return",
      name: "Minor Rise and Return",
      lessons: [{
        id: "minor-rise-return-learn",
        kind: "learn",
        applicationId: "minor-rise-return-learn",
        title: "Learn the lick",
        coverTitle: "Learn the lick",
        summary: "Rise from B♭ through C, D♭ and E♭, then return through C to B♭, all eighth notes.",
        context: "The lick in this key",
        defaultKeyId: "Bb",
      }],
    },
    practiceDefinitions(lick) {
      const def = (id, label, description, sourceNote, exampleTitle, pattern) => ({
        lickId: "minor-rise-return",
        id,
        label,
        description,
        source: `Brian’s lick · ${sourceNote}`,
        exampleTitle,
        variants: [{
          id: "original",
          label: "Original",
          pattern,
          elements: lick.elements,
          pickupBeats: 0,
        }],
      });
      return [
        def(
          "minor-home",
          "Minor home",
          "Play the shape from the minor chord’s root, rising to the fourth and returning home.",
          "minor chord practice",
          "Minor vamp",
          [{ root: 0, family: "minor", beats: 4 }],
        ),
        def(
          "altered-dominant",
          "Altered dominant",
          "Play the minor tetrachord a half step above an altered dominant (♭9–♯9–3–♯11–♯9–♭9).",
          "altered dominant practice",
          "Altered dominant vamp",
          [{
            root: 11,
            family: "dominant",
            beats: 4,
            qualities: ["dominant7", "dominant7alt", "dominant7b9", "dominant7s9", "dominant7b13", "dominant7s5"],
            quality: "dominant7alt",
          }],
        ),
        def(
          "dominant-13",
          "Dominant 13 / sus",
          "Play the minor tetrachord from the fifth of a dominant or sus chord (5–13–♭7–1–13–5).",
          "dominant 13 / sus practice",
          "Dominant 13 vamp",
          [{
            root: 5,
            family: "dominant",
            beats: 4,
            qualities: ["dominant7", "dominant9", "dominant7s11", "dominant7sus"],
            quality: "dominant9",
          }],
        ),
        def(
          "halfdim",
          "Half-diminished",
          "Play the minor tetrachord from the minor third of a half-diminished chord (♭3–11–♭5–♭13–11–♭3).",
          "half-diminished practice",
          "Half-diminished vamp",
          [{ root: 9, family: "halfdim", beats: 4, quality: "minor7b5" }],
        ),
        def(
          "lydian-major",
          "Lydian major",
          "Play the minor tetrachord from the major third for a bright Lydian color (3–♯11–5–13–♯11–3).",
          "Lydian major practice",
          "Lydian major vamp",
          [{ root: 8, family: "major", beats: 4, qualities: ["major7", "major6", "major7b5"], quality: "major7b5" }],
        ),
        def(
          "major-color",
          "Major 6/9 color",
          "Play the minor tetrachord from the sixth of a major chord (6–7–1–9–7–6).",
          "major color practice",
          "Major 7 vamp",
          [{ root: 3, family: "major", beats: 4, qualities: ["major7", "major6"], quality: "major7" }],
        ),
        def(
          "minor-fifth",
          "Minor from the fifth",
          "Play the minor tetrachord from the fifth of a Dorian minor chord (5–13–♭7–1–13–5).",
          "Dorian minor practice",
          "Dorian minor vamp",
          [{ root: 5, family: "minor", beats: 4, qualities: ["minor", "minor6", "minor7", "minor11"], quality: "minor7" }],
        ),
      ];
    },
  },
  {
    lick: {
      id: "lotus-inspired",
      name: "Lotus-inspired",
      shortName: "Lotus-inspired",
      source: "Brian’s simplified adaptation of Lotus by Shaun Martin (around 1:28); not an exact transcription.",
      octave: -1,
      pickupBeats: 1.5,
      learnBeats: 8,
      keyQuality: "minor",
      defaultKeyId: "F",
      // Relative to F: E F G Ab G F E G F C. The final C is below the opening E.
      // Three eighth-note pickups begin on & of 3; Ab lands on the first downbeat.
      elements: [
        N(-1, 0.5, { diatonicStep: -1, pickup: true }), N(0, 0.5, { diatonicStep: 0, pickup: true }),
        N(2, 0.5, { diatonicStep: 1, pickup: true }), N(3, 1, { diatonicStep: 2 }),
        N(2, 0.5, { diatonicStep: 1 }), N(0, 0.5, { diatonicStep: 0 }),
        N(-1, 0.5, { diatonicStep: -1 }), N(2, 1, { diatonicStep: 1 }),
        N(0, 1, { diatonicStep: 0 }), N(-5, 1, { diatonicStep: -3 }), R(2.5),
      ],
    },
    learnForm: {
      id: "lotus-inspired-learn",
      title: "Lotus-inspired",
      shortTitle: "The lick",
      keyQuality: "minor",
      bars: [bar([chord(0, "minormaj7")]), bar([chord(0, "minormaj7")])],
    },
    learnApplication: {
      id: "lotus-inspired-learn",
      lickId: "lotus-inspired",
      formId: "lotus-inspired-learn",
      label: "Learn the lick",
      cellTonicInterval: 0,
      phraseStartBar: 1,
      includePickup: true,
      leadIn: [],
      resolve: [],
      copyKind: "learn",
    },
    module: {
      id: "lotus-inspired",
      lickId: "lotus-inspired",
      name: "Lotus-inspired",
      lessons: [{
        id: "lotus-inspired-learn",
        kind: "learn",
        applicationId: "lotus-inspired-learn",
        title: "Learn the lick",
        coverTitle: "Learn the lick",
        summary: "Enter on the & of 3 with three pickup notes, land on the minor third on beat 1, then descend to the fifth below home.",
        context: "Harmonic minor · simplified from Shaun Martin’s Lotus",
        defaultKeyId: "F",
      }],
    },
    practiceDefinitions(lick) {
      // Keep the leading tone away from an explicit minor seventh in the backing.
      const tonic = {
        root: 0,
        family: "minor",
        beats: 8,
        qualities: ["minor", "minor6", "minorb6", "minormaj7"],
        quality: "minormaj7",
      };
      const source = "Brian’s simplified adaptation of Shaun Martin’s Lotus · harmonic-minor practice";
      const melodicSource = "Brian’s simplified adaptation of Shaun Martin’s Lotus · melodic-minor practice";
      const variant = (pattern) => ({
        id: "original",
        label: "Original",
        pattern,
        elements: lick.elements,
        pickupBeats: lick.pickupBeats,
      });
      return [{
        lickId: "lotus-inspired",
        id: "minor-home",
        label: "Minor home",
        description: "Enter on the & of 3 with three pickup notes into minor. Use the raised seventh as a leading tone and finish on the fifth below the minor root.",
        source,
        exampleTitle: "Minor tonic vamp",
        variants: [variant([tonic])],
      }, {
        lickId: "lotus-inspired",
        id: "minor-cadence",
        label: "V → minor",
        description: "Lead into V7 with three eighth-note pickups from the & of 3, then carry the phrase into minor and finish on the tonic chord’s fifth.",
        source,
        exampleTitle: "Minor cadence",
        variants: [variant([
          {
            root: 7,
            family: "dominant",
            beats: 4,
            qualities: ["dominant7", "dominant7b9", "dominant7b13"],
            quality: "dominant7b9",
          },
          { ...tonic, beats: 4 },
        ])],
      }, {
        lickId: "lotus-inspired",
        id: "lydian-dominant",
        label: "Lydian dominant",
        description: "Play the melodic-minor shape from the dominant’s fifth (#11–5–13–♭7 on beat 1), landing on the ninth.",
        source: melodicSource,
        exampleTitle: "Lydian dominant vamp",
        variants: [variant([{
          root: 5,
          family: "dominant",
          beats: 8,
          qualities: ["dominant7", "dominant9", "dominant7s11"],
          quality: "dominant7s11",
        }])],
      }, {
        lickId: "lotus-inspired",
        id: "altered-dominant",
        label: "Altered dominant",
        description: "Play the melodic-minor shape a half step above an altered dominant (1–♭9–♯9–3 on beat 1), landing on the flat thirteenth.",
        source: melodicSource,
        exampleTitle: "Altered dominant vamp",
        variants: [variant([{
          root: 11,
          family: "dominant",
          beats: 8,
          qualities: ["dominant7", "dominant7alt", "dominant7b9", "dominant7s9", "dominant7b13", "dominant7s5"],
          quality: "dominant7alt",
        }])],
      }, {
        lickId: "lotus-inspired",
        id: "halfdim",
        label: "Half-diminished",
        description: "Play the melodic-minor shape from the half-diminished chord’s minor third (9–♭3–11–♭5 on beat 1), resolving to the flat seventh.",
        source: melodicSource,
        exampleTitle: "Half-diminished vamp",
        variants: [variant([{
          root: 9,
          family: "halfdim",
          beats: 8,
          quality: "minor7b5",
        }])],
      }];
    },
  },
  {
    lick: {
      id: "south-of-the-river",
      name: "South of the River",
      shortName: "South of the River",
      source: `${southSource}; not an exact transcription.`,
      octave: -2,
      pickupBeats: 0,
      learnBeats: 12,
      keyQuality: "minor",
      defaultKeyId: "G",
      elements: [...halfTimeOpening, ...halfTimeLanding],
    },
    learnForm: {
      id: "south-of-the-river-learn",
      title: "South of the River",
      shortTitle: "The lick",
      keyQuality: "minor",
      bars: [southTonicBar, southTonicBar, southLandingBar],
    },
    learnApplication: {
      id: "south-of-the-river-learn",
      lickId: "south-of-the-river",
      formId: "south-of-the-river-learn",
      label: "Learn the lick",
      cellTonicInterval: 0,
      phraseStartBar: 1,
      leadIn: [],
      resolve: [],
      copyKind: "learn",
    },
    module: {
      id: "south-of-the-river",
      lickId: "south-of-the-river",
      name: "South of the River",
      buildingBlockIds: southBlocks.map(({ id }) => id),
      lessons: [{
        id: "south-of-the-river-learn",
        kind: "learn",
        applicationId: "south-of-the-river-learn",
        title: "Learn the lick",
        coverTitle: "Learn the lick",
        summary: "Play the even sextuplet across beats 1 and 2, then swing the eighths from beat 3. Walk down chromatically to B♭ on the downbeat of bar 3.",
        context: "Minor i → iv · Half-time practice",
        defaultKeyId: "G",
      }],
    },
    practiceDefinitions() {
      const source = southSource;
      const elements = [...halfTimeOpening, ...halfTimeLanding];
      const variant = (pattern) => ({
        id: "original",
        label: "Half-time",
        pattern,
        elements,
        pickupBeats: 0,
      });
      const minorQualities = ["minor7", "minor11", "minor"];
      const majorQualities = ["major7", "major6"];
      return [
        {
          lickId: "south-of-the-river",
          id: "minor-i-iv",
          label: "Minor i → iv",
          description: "Play the ascent and chromatic descent over i7, then land on the seventh of iv7 on the next downbeat.",
          source: `${source} · minor i → iv practice`,
          exampleTitle: "Minor i → iv vamp",
          variants: [variant([
            { root: 0, family: "minor", beats: 8, qualities: minorQualities, quality: "minor7" },
            { root: 5, family: "minor", beats: 4, qualities: minorQualities, quality: "minor7" },
          ])],
        },
        {
          lickId: "south-of-the-river",
          id: "minor-home",
          label: "Minor home",
          description: "Stay over three bars of static minor seventh, starting the descent on the fifth and resolving on the minor third.",
          source: `${source} · static minor practice`,
          exampleTitle: "Minor tonic vamp",
          variants: [variant([
            { root: 0, family: "minor", beats: 12, qualities: minorQualities, quality: "minor7" },
          ])],
        },
        {
          lickId: "south-of-the-river",
          id: "major-i-iv",
          label: "Major I → IV",
          description: "Play the opening ♯11–5–7–9 figure over the relative major tonic, then resolve to the fifth of IV on the next downbeat.",
          source: `${source} · major I → IV practice`,
          exampleTitle: "Major I → IV vamp",
          variants: [variant([
            { root: 3, family: "major", beats: 8, qualities: majorQualities, quality: "major7" },
            { root: 8, family: "major", beats: 4, qualities: majorQualities, quality: "major7" },
          ])],
        },
        {
          lickId: "south-of-the-river",
          id: "minor-ii-v",
          label: "Minor ii → V",
          description: "Play the Dorian ascent and chromatic descent over ii7, then land on the flat seventh guide tone of V7 on the next downbeat.",
          source: `${source} · ii–V practice`,
          exampleTitle: "Minor ii → V vamp",
          variants: [variant([
            { root: 0, family: "minor", beats: 8, qualities: minorQualities, quality: "minor7" },
            { root: 5, family: "dominant", beats: 4, qualities: southDomQualities, quality: "dominant7" },
          ])],
        },
      ];
    },
  },
  ...southBlocks.map(southBlockEntry),
];
