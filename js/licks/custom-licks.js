function N(interval, beats, extra = {}) {
  return { type: "note", interval, beats, ...extra };
}

function R(beats) {
  return { type: "rest", beats };
}

function bar(chords) {
  return { chords };
}

function chord(intervalFromTonic, quality, durationBeats = 4, extra = {}) {
  return { intervalFromTonic, quality, durationBeats, ...extra };
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
];
