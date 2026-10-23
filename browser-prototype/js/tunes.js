/**
 * Brian's practice tunes. Spots are data so a later matcher can add more.
 * Chords from iReal Pro Jazz 1460. Lessons are derived in registry.js.
 */

function C(intervalFromTonic, quality, durationBeats = 4, extra = {}) {
  return { intervalFromTonic, quality, durationBeats, ...extra };
}

function ireal(tune) {
  return `iReal Pro Jazz 1460 · ${tune}`;
}

/** Lick → tune ids, in the order the brief lists under "Your tunes". */
export const YOUR_TUNES_BY_LICK = {
  cmar: ["four", "autumn-leaves", "so-what"],
  emr: ["st-thomas", "autumn-leaves", "another-you"],
  gts: ["four", "st-thomas", "attya", "another-you"],
  bo: ["nows-time", "four", "tune-up", "attya", "autumn-leaves", "another-you"],
  hsr: ["nows-time", "four", "tune-up", "st-thomas", "attya", "autumn-leaves", "so-what", "another-you"],
};

export const TUNES = [
  {
    id: "nows-time",
    title: "Now's the Time / Billie's Bounce",
    key: "F",
    keyQuality: "major",
    chords: ireal("Now's the Time"),
    sections: [
      {
        bars: [
          [C(0, "dominant7")],
          [C(5, "dominant7")],
          [C(0, "dominant7")],
          [C(7, "minor7", 2), C(0, "dominant7", 2)],
          [C(5, "dominant7")],
          [C(6, "diminished7")],
          [C(0, "dominant7")],
          [C(4, "minor7", 2), C(9, "dominant7", 2)],
          [C(2, "minor7")],
          [C(7, "dominant7")],
          [C(0, "dominant7", 2), C(9, "dominant7", 2)],
          [C(2, "minor7", 2), C(7, "dominant7", 2)],
        ],
      },
    ],
    spots: [
      { bar: 1, lickId: "bo", fragment: "bo-first", anchor: 0, pickup: true },
      { bar: 4, lickId: "hsr", anchor: 7 },
      { bar: 7, lickId: "bo", fragment: "bo-first", anchor: 0, pickup: true },
      { bar: 9, lickId: "bo", anchor: 7, pickup: true },
    ],
  },
  {
    id: "four",
    title: "Four",
    key: "Eb",
    keyQuality: "major",
    chords: ireal("Four"),
    sections: [
      {
        label: "A",
        bars: [
          [C(0, "major7")],
          [C(0, "major7")],
          [C(0, "minor7")],
          [C(5, "dominant7")],
          [C(2, "minor7")],
          [C(2, "minor7")],
          [C(5, "minor7")],
          [C(10, "dominant7")],
        ],
      },
      {
        label: "B",
        bars: [
          [C(0, "major7", 4, { slashIntervalFromTonic: 4 })],
          [C(3, "minor7", 2, { usesFlats: false }), C(8, "dominant7", 2)],
          [C(2, "minor7")],
          [C(7, "dominant7")],
          [C(0, "major7", 4, { slashIntervalFromTonic: 4 })],
          [C(3, "minor7", 2, { usesFlats: false }), C(8, "dominant7", 2)],
          [C(2, "minor7")],
          [C(7, "dominant7")],
        ],
      },
      {
        label: "A",
        bars: [
          [C(0, "major7")],
          [C(0, "major7")],
          [C(0, "minor7")],
          [C(5, "dominant7")],
          [C(2, "minor7")],
          [C(2, "minor7")],
          [C(5, "minor7")],
          [C(10, "dominant7")],
        ],
      },
      {
        label: "C",
        bars: [
          [C(0, "major7", 4, { slashIntervalFromTonic: 4 })],
          [C(3, "minor7", 2, { usesFlats: false }), C(8, "dominant7", 2)],
          [C(2, "minor7")],
          [C(7, "dominant7")],
          [C(4, "minor7", 2), C(3, "minor7", 2, { usesFlats: true })],
          [C(2, "minor7", 2), C(7, "dominant7", 2)],
          [C(0, "major7")],
          [C(0, "major7")],
        ],
      },
    ],
    spots: [
      { bar: 3, lickId: "hsr", anchor: 0 },
      { bar: 5, lickId: "cmar", anchor: 2 },
      { bar: 7, lickId: "hsr", anchor: 5 },
      { bar: 10, lickId: "hsr", anchor: 3 },
      { bar: 11, lickId: "bo", anchor: 7, pickup: true },
      { bar: 15, lickId: "bo", anchor: 7, pickup: true },
      { bar: 19, lickId: "hsr", anchor: 0 },
      { bar: 21, lickId: "hsr", anchor: 2 },
      { bar: 23, lickId: "hsr", anchor: 5 },
      { bar: 27, lickId: "bo", anchor: 7, pickup: true },
      { bar: 30, lickId: "gts", fragment: "gts-half", anchor: 0 },
    ],
  },
  {
    id: "tune-up",
    title: "Tune Up",
    key: "D",
    keyQuality: "major",
    chords: ireal("Tune Up"),
    sections: [
      {
        bars: [
          [C(2, "minor7")],
          [C(7, "dominant7")],
          [C(0, "major7")],
          [C(0, "major7")],
          [C(0, "minor7")],
          [C(5, "dominant7")],
          [C(10, "major7")],
          [C(10, "major7")],
          [C(10, "minor7")],
          [C(3, "dominant7")],
          [C(8, "major7", 4, { usesFlats: true })],
          [C(5, "minor7")],
          [C(2, "minor7")],
          [C(3, "dominant7")],
          [C(8, "major7", 4, { usesFlats: true })],
          [C(7, "dominant7")],
        ],
      },
    ],
    spots: [
      { bar: 1, lickId: "bo", anchor: 7, pickup: true },
      { bar: 5, lickId: "hsr", anchor: 0 },
      { bar: 6, lickId: "hsr", fragment: "hsr-altered", anchor: 0 },
      { bar: 9, lickId: "bo", anchor: 3, pickup: true },
    ],
  },
  {
    id: "st-thomas",
    title: "St. Thomas",
    key: "C",
    keyQuality: "major",
    chords: ireal("St. Thomas"),
    sections: [
      {
        bars: [
          [C(0, "major7", 2), C(5, "dominant7", 2)],
          [C(4, "minor7", 2), C(9, "dominant7", 2)],
          [C(2, "minor7", 2), C(7, "dominant7", 2)],
          [C(0, "major6")],
          [C(0, "major7", 2), C(5, "dominant7", 2)],
          [C(4, "minor7", 2), C(9, "dominant7", 2)],
          [C(2, "minor7", 2), C(7, "dominant7", 2)],
          [C(0, "major6")],
          [C(4, "halfdim7")],
          [C(9, "dominant7b9")],
          [C(2, "minor7")],
          [C(7, "dominant7")],
          [C(0, "major7", 2), C(0, "dominant7", 2, { slashIntervalFromTonic: 4 })],
          [C(5, "major7", 2), C(6, "diminished7", 2, { usesFlats: false })],
          [C(7, "dominant7")],
          [C(0, "major6")],
        ],
      },
    ],
    spots: [
      { bar: 2, lickId: "gts", anchor: 0 },
      { bar: 7, lickId: "gts", fragment: "gts-half", anchor: 0 },
      { bar: 10, lickId: "emr", anchor: 2 },
      { bar: 12, lickId: "hsr", fragment: "hsr-altered", anchor: 2 },
    ],
  },
  {
    id: "attya",
    title: "All the Things You Are",
    key: "Ab",
    keyQuality: "major",
    chords: ireal("All the Things You Are"),
    sections: [
      {
        label: "A",
        bars: [
          [C(9, "minor7")],
          [C(2, "minor7")],
          [C(7, "dominant7")],
          [C(0, "major7")],
          [C(5, "major7")],
          [C(6, "minor7", 2), C(11, "dominant7", 2)],
          [C(4, "major7")],
          [C(4, "major7")],
        ],
      },
      {
        label: "A",
        bars: [
          [C(4, "minor7")],
          [C(9, "minor7")],
          [C(2, "dominant7")],
          [C(7, "major7")],
          [C(0, "major7")],
          [C(1, "minor7", 2), C(6, "dominant7", 2)],
          [C(11, "major7")],
          [C(11, "major7")],
        ],
      },
      {
        label: "B",
        bars: [
          [C(1, "minor7")],
          [C(6, "dominant7")],
          [C(11, "major7")],
          [C(11, "major7")],
          [C(10, "halfdim7", 4, { usesFlats: false })],
          [C(3, "dominant7b9")],
          [C(8, "major7")],
          [C(4, "dominant7b13")],
        ],
      },
      {
        label: "C",
        bars: [
          [C(9, "minor7")],
          [C(2, "minor7")],
          [C(7, "dominant7")],
          [C(0, "major7")],
          [C(5, "major7")],
          [C(5, "minormaj7")],
          [C(4, "minor7")],
          [C(3, "diminished7")],
          [C(2, "minor7")],
          [C(7, "dominant7")],
          [C(0, "major7")],
          [C(11, "halfdim7", 2), C(4, "dominant7b9", 2)],
        ],
      },
    ],
    spots: [
      { bar: 1, lickId: "hsr", anchor: 9 },
      { bar: 2, lickId: "bo", anchor: 7, pickup: true },
      { bar: 6, lickId: "gts", fragment: "gts-half", anchor: 4 },
      { bar: 9, lickId: "hsr", anchor: 4 },
      { bar: 10, lickId: "bo", anchor: 2, pickup: true },
      { bar: 14, lickId: "gts", fragment: "gts-half", anchor: 11 },
      { bar: 17, lickId: "bo", anchor: 6, pickup: true },
      { bar: 25, lickId: "hsr", anchor: 9 },
      { bar: 26, lickId: "bo", anchor: 7, pickup: true },
      { bar: 33, lickId: "bo", anchor: 7, pickup: true },
    ],
  },
  {
    id: "autumn-leaves",
    title: "Autumn Leaves",
    key: "G",
    keyQuality: "minor",
    chords: ireal("Autumn Leaves"),
    sections: [
      {
        label: "A",
        bars: [
          [C(5, "minor7")],
          [C(10, "dominant7")],
          [C(3, "major7")],
          [C(8, "major7")],
          [C(2, "halfdim7")],
          [C(7, "dominant7b13")],
          [C(0, "minor6")],
          [C(0, "minor6")],
        ],
      },
      {
        label: "A",
        bars: [
          [C(2, "halfdim7")],
          [C(7, "dominant7b13")],
          [C(0, "minor6")],
          [C(0, "minor6")],
          [C(5, "minor7")],
          [C(10, "dominant7")],
          [C(3, "major7")],
          [C(8, "major7")],
        ],
      },
      {
        label: "B",
        bars: [
          [C(2, "halfdim7")],
          [C(7, "dominant7b13")],
          [C(0, "minor7", 2), C(11, "dominant7", 2)],
          [C(10, "minor7", 2), C(9, "dominant7", 2)],
          [C(2, "halfdim7")],
          [C(7, "dominant7b13")],
          [C(0, "minor6")],
          [C(0, "minor6")],
        ],
      },
    ],
    spots: [
      { bar: 1, lickId: "hsr", anchor: 5 },
      { bar: 6, lickId: "emr", anchor: 0 },
      { bar: 10, lickId: "emr", anchor: 0 },
      { bar: 13, lickId: "bo", anchor: 10, pickup: true },
      { bar: 18, lickId: "emr", anchor: 0 },
      { bar: 23, lickId: "cmar", anchor: 0 },
    ],
  },
  {
    id: "so-what",
    title: "So What",
    key: "D",
    keyQuality: "minor",
    chords: ireal("So What"),
    sections: [
      {
        label: "A",
        bars: Array.from({ length: 8 }, () => [C(0, "minor11")]),
      },
      {
        label: "A",
        bars: Array.from({ length: 8 }, () => [C(0, "minor11")]),
      },
      {
        label: "B",
        bars: Array.from({ length: 8 }, () => [C(1, "minor11")]),
      },
      {
        label: "A",
        bars: Array.from({ length: 8 }, () => [C(0, "minor11")]),
      },
    ],
    spots: [
      { bar: 1, lickId: "cmar", anchor: 0 },
      { bar: 5, lickId: "hsr", anchor: 0 },
      { bar: 9, lickId: "cmar", anchor: 0 },
      { bar: 13, lickId: "hsr", anchor: 0 },
      { bar: 17, lickId: "cmar", anchor: 1 },
      { bar: 21, lickId: "hsr", anchor: 1 },
      { bar: 25, lickId: "cmar", anchor: 0 },
      { bar: 29, lickId: "hsr", anchor: 0 },
    ],
  },
  {
    id: "another-you",
    title: "There Will Never Be Another You",
    key: "Eb",
    keyQuality: "major",
    chords: ireal("There Will Never Be Another You"),
    sections: [
      {
        label: "A",
        bars: [
          [C(0, "major7")],
          [C(0, "major7")],
          [C(11, "halfdim7")],
          [C(4, "dominant7b9")],
          [C(9, "minor7")],
          [C(9, "minor7")],
          [C(7, "minor7")],
          [C(0, "dominant7")],
        ],
      },
      {
        label: "B",
        bars: [
          [C(5, "major7")],
          [C(10, "dominant7s11")],
          [C(0, "major7")],
          [C(9, "minor7")],
          [C(2, "dominant7")],
          [C(2, "dominant7")],
          [C(2, "minor7")],
          [C(7, "dominant7")],
        ],
      },
      {
        label: "A",
        bars: [
          [C(0, "major7")],
          [C(0, "major7")],
          [C(11, "halfdim7")],
          [C(4, "dominant7b9")],
          [C(9, "minor7")],
          [C(9, "minor7")],
          [C(7, "minor7")],
          [C(0, "dominant7")],
        ],
      },
      {
        label: "C",
        bars: [
          [C(5, "major7")],
          [C(10, "dominant7s11")],
          [C(0, "major7")],
          [C(6, "halfdim7", 2), C(11, "dominant7", 2)],
          [C(0, "major7", 2), C(5, "dominant7", 2)],
          [C(4, "minor7", 2), C(9, "dominant7", 2)],
          [C(2, "minor7", 2), C(7, "dominant7", 2)],
          [C(0, "major6", 2), C(7, "dominant7", 2)],
        ],
      },
    ],
    spots: [
      { bar: 4, lickId: "emr", anchor: 9 },
      { bar: 7, lickId: "bo", anchor: 0, pickup: true },
      { bar: 12, lickId: "hsr", anchor: 9 },
      { bar: 13, lickId: "bo", anchor: 2, pickup: true },
      { bar: 20, lickId: "emr", anchor: 9 },
      { bar: 23, lickId: "bo", anchor: 0, pickup: true },
      { bar: 30, lickId: "gts", anchor: 0 },
    ],
  },
];

export function tuneById(id) {
  return TUNES.find((tune) => tune.id === id) ?? TUNES[0];
}

export function tuneFormId(tuneId) {
  return `tune-${tuneId}`;
}

export function tunePlayLessonId(tuneId) {
  return `tune-${tuneId}`;
}

export function tuneLickLessonId(tuneId, lickId) {
  return `tune-${tuneId}-${lickId}`;
}

export function tuneApplicationId(tuneId, lickId = null) {
  return lickId ? `tune-${tuneId}-${lickId}` : `tune-${tuneId}`;
}

export function learnLessonIdForLick(lickId) {
  return lickId === "cmar" ? "learn-lick" : `${lickId}-learn`;
}

export function normalizeTuneSpot(spot) {
  return {
    bar: spot.bar,
    lickId: spot.lickId,
    fragment: spot.fragment ?? "full",
    anchorInterval: spot.anchor ?? 0,
    pickup: Boolean(spot.pickup),
  };
}

export function spotsForTune(tune, lickId = null) {
  const spots = (tune.spots ?? []).map(normalizeTuneSpot);
  return lickId ? spots.filter((spot) => spot.lickId === lickId) : spots;
}

export function tuneBarCount(tune) {
  return tune.sections.reduce((sum, section) => sum + section.bars.length, 0);
}

export function tuneFormBars(tune) {
  return tune.sections.flatMap((section) => section.bars.map((chords) => ({ chords })));
}

export function tuneSectionMeta(tune) {
  const sections = [];
  let startBar = 1;
  for (const section of tune.sections) {
    if (section.label) sections.push({ label: section.label, startBar });
    startBar += section.bars.length;
  }
  return sections;
}

export function deriveTuneForms(tunes = TUNES) {
  const forms = {};
  for (const tune of tunes) {
    const id = tuneFormId(tune.id);
    forms[id] = {
      id,
      title: tune.title,
      shortTitle: tune.title,
      source: tune.chords,
      keyQuality: tune.keyQuality,
      bars: tuneFormBars(tune),
      sections: tuneSectionMeta(tune),
      tuneId: tune.id,
    };
  }
  return forms;
}

export function deriveTuneApplications(tunes = TUNES) {
  const apps = [];
  for (const tune of tunes) {
    const allSpots = spotsForTune(tune);
    const first = allSpots[0];
    apps.push({
      id: tuneApplicationId(tune.id),
      lickId: first?.lickId ?? "cmar",
      formId: tuneFormId(tune.id),
      label: tune.title,
      cellTonicInterval: first?.anchorInterval ?? 0,
      phraseStartBar: first?.bar ?? 1,
      copyKind: "tune",
      tuneId: tune.id,
      spots: allSpots,
    });
    const lickIds = [...new Set(allSpots.map((spot) => spot.lickId))];
    for (const lickId of lickIds) {
      const spots = spotsForTune(tune, lickId);
      apps.push({
        id: tuneApplicationId(tune.id, lickId),
        lickId,
        formId: tuneFormId(tune.id),
        label: tune.title,
        cellTonicInterval: spots[0]?.anchorInterval ?? 0,
        phraseStartBar: spots[0]?.bar ?? 1,
        copyKind: "place",
        tuneId: tune.id,
        spots,
      });
    }
  }
  return apps;
}

export function deriveYourTunesLessons(lickId, tunes = TUNES) {
  const ids = YOUR_TUNES_BY_LICK[lickId] ?? [];
  return ids.map((tuneId) => {
    const tune = tuneById(tuneId);
    const spots = spotsForTune(tune, lickId);
    const n = spots.length;
    return {
      id: tuneLickLessonId(tuneId, lickId),
      kind: "integrate",
      applicationId: tuneApplicationId(tuneId, lickId),
      title: `Your tunes: ${tune.title}`,
      coverTitle: tune.title,
      summary: `Play ${tune.title} and grade only the ${lickId.toUpperCase()} spots.`,
      context: `${n} spot${n === 1 ? "" : "s"} · full form`,
      defaultKeyId: tune.key,
      group: "your-tunes",
      tuneId,
      lickId,
    };
  });
}

export function deriveMyTunesLessons(tunes = TUNES) {
  return tunes.map((tune) => {
    const n = spotsForTune(tune).length;
    return {
      id: tunePlayLessonId(tune.id),
      kind: "integrate",
      applicationId: tuneApplicationId(tune.id),
      title: tune.title,
      coverTitle: tune.title,
      summary: `Play ${tune.title} with every lick spot in order.`,
      context: `${n} spots · full form`,
      defaultKeyId: tune.key,
      group: "my-tunes",
      tuneId: tune.id,
      moduleId: "tunes",
      moduleName: "My tunes",
    };
  });
}

export function licksInTune(tune) {
  return [...new Set(spotsForTune(tune).map((spot) => spot.lickId))];
}

export function tunesForLick(lickId, tunes = TUNES) {
  return (YOUR_TUNES_BY_LICK[lickId] ?? []).map(tuneById);
}
