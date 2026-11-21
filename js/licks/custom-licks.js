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

const southBlocks = [
  {
    id: `${southId}-opening`,
    name: "Sextuplet Run",
    blockBeats: "Beats 1–2",
    elements: [...southOpening, R(2)],
    chords: [chord(0, "minor7")],
    summary: "Play the sextuplet into beat 2, then finish the opening figure in straight sixteenths.",
    minorHomeDescription: "Use the natural sixth in the sextuplet, then climb from the ninth to the seventh in straight sixteenths.",
  },
  {
    id: `${southId}-climb-and-landing`,
    name: "Chromatic Landing",
    blockBeats: "Beats 3–4 plus resolution",
    elements: [...southLanding, R(1)],
    chords: [chord(0, "minor7", 2), chord(5, "minor7", 2)],
    summary: "Start on beat 1, climb to the high note, then descend chromatically to the landing on beat 3.",
    minorHomeDescription: "Climb from the fifth, then descend chromatically to the minor third over the same chord.",
  },
];

function southBlockEntry({ id, name, blockBeats, elements, chords, summary, minorHomeDescription }) {
  const learnId = `${id}-learn`;
  return {
    lick: {
      id, name, shortName: name, elements,
      source: southSource, octave: -2, pickupBeats: 0, learnBeats: 4, keyQuality: "minor", defaultKeyId: "G",
    },
    learnForm: {
      id: learnId, title: name, shortTitle: name, keyQuality: "minor",
      bars: [bar(chords)],
    },
    learnApplication: {
      id: learnId, lickId: id, formId: learnId, label: "Learn the lick",
      cellTonicInterval: 0, phraseStartBar: 1, leadIn: [], resolve: [], copyKind: "learn",
    },
    module: {
      id, lickId: id, name, blockBeats, compositeId: southId,
      lessons: [{
        id: learnId, kind: "learn", applicationId: learnId, title: "Learn the lick", coverTitle: "Learn the lick",
        summary, context: "Minor · One bar", defaultKeyId: "G",
      }],
    },
    practiceDefinitions() {
      return [{
        lickId: id,
        id: "minor-home",
        label: "Minor home",
        description: minorHomeDescription,
        source: `${southSource} · ${name} practice`,
        exampleTitle: "Minor tonic vamp",
        variants: [{
          id: "original", label: "Original", elements, pickupBeats: 0,
          pattern: [{ root: 0, family: "minor", beats: 4, qualities: ["minor7", "minor11"], quality: "minor7" }],
        }],
      }];
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
      return [{
        lickId: "minor-rise-return",
        id: "minor-home",
        label: "Minor home",
        description: "Play the shape from the minor chord’s root, rising to the fourth and returning home.",
        source: "Brian’s lick · minor chord practice",
        exampleTitle: "Minor vamp",
        variants: [{
          id: "original",
          label: "Original",
          pattern: [{ root: 0, family: "minor", beats: 4 }],
          elements: lick.elements,
          pickupBeats: 0,
        }],
      }];
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
      learnBeats: 8,
      keyQuality: "minor",
      defaultKeyId: "G",
      elements: [...southOpening, ...southLanding, R(3)],
    },
    learnForm: {
      id: "south-of-the-river-learn",
      title: "South of the River",
      shortTitle: "The lick",
      keyQuality: "minor",
      bars: [bar([chord(0, "minor7")]), bar([chord(5, "minor7")])],
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
        summary: "Play the sextuplet into beat 2 and climb in sixteenths to high D on beat 4. Walk down chromatically to B♭ on the next downbeat.",
        context: "Minor i → iv · adapted from Tom Misch’s South of the River",
        defaultKeyId: "G",
      }],
    },
    practiceDefinitions(lick) {
      const source = southSource;
      const variant = (pattern) => ({
        id: "original",
        label: "Original",
        pattern,
        elements: lick.elements,
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
            { root: 0, family: "minor", beats: 4, qualities: minorQualities, quality: "minor7" },
            { root: 5, family: "minor", beats: 4, qualities: minorQualities, quality: "minor7" },
          ])],
        },
        {
          lickId: "south-of-the-river",
          id: "minor-home",
          label: "Minor home",
          description: "Stay over two bars of static minor seventh, starting the descent on the fifth and resolving on the minor third.",
          source: `${source} · static minor practice`,
          exampleTitle: "Minor tonic vamp",
          variants: [variant([
            { root: 0, family: "minor", beats: 8, qualities: minorQualities, quality: "minor7" },
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
            { root: 3, family: "major", beats: 4, qualities: majorQualities, quality: "major7" },
            { root: 8, family: "major", beats: 4, qualities: majorQualities, quality: "major7" },
          ])],
        },
      ];
    },
  },
  ...southBlocks.map(southBlockEntry),
];
