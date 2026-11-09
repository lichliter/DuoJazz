/** Horn exercises: chord symbols answered with their structural chord tones. */
export const CHORD_QUALITIES = [
  { id: 'major7', title: 'Major 7', suffix: 'maj7', intervals: [0, 4, 7, 11] },
  { id: 'dominant7', title: 'Dominant 7', suffix: '7', intervals: [0, 4, 7, 10] },
  { id: 'minor7', title: 'Minor 7', suffix: 'm7', intervals: [0, 3, 7, 10] },
  { id: 'halfdim7', title: 'Half-diminished', suffix: 'm7♭5', intervals: [0, 3, 6, 10] },
];
const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
export function transposeToneKey(key, interval) {
  const pc = KEYS.indexOf(({ 'F#': 'Gb', 'C#': 'Db' })[key] ?? key);
  if (pc < 0) throw new Error(`Unknown chord-tone key: ${key}`);
  return KEYS[((pc + interval) % 12 + 12) % 12];
}
export function chordToneIntervals(quality) {
  if (quality === 'minor7b5' || quality === 'halfdim7') return [0, 3, 6, 10];
  if (quality.startsWith('diminished')) return [0, 3, 6, 9];
  if (quality === 'minormaj7') return [0, 3, 7, 11];
  if (quality === 'minor6') return [0, 3, 7, 9];
  if (quality === 'minorb6') return [0, 3, 7, 8];
  if (quality === 'minor') return [0, 3, 7, 12];
  if (quality.startsWith('minor')) return [0, 3, 7, 10];
  if (quality === 'major6') return [0, 4, 7, 9];
  if (quality === 'major') return [0, 4, 7, 12];
  if (quality === 'major7b5') return [0, 4, 6, 11];
  if (quality.startsWith('major')) return [0, 4, 7, 11];
  if (quality === 'dominant7sus') return [0, 5, 7, 10];
  if (quality === 'dominant7s5') return [0, 4, 8, 10];
  if (quality.startsWith('dominant')) return [0, 4, 7, 10];
  throw new Error(`Unsupported chord-tone quality: ${quality}`);
}
export function buildChordToneExercises(charts = []) {
  const licks = [], forms = {}, applications = [], lessons = [], chartModules = [];
  const module = { id: 'chord-tones', number: 1, name: 'Chord Tones', lickId: 'tones-major7', lessons: [] };
  function exercise(id, quality, title) {
    const elements = chordToneIntervals(quality).map(interval => ({ type: 'note', interval, beats: 1 }));
    licks.push({ id, name: title, shortName: title, keyQuality: quality.startsWith('minor') || quality === 'halfdim7' ? 'minor' : 'major', defaultKeyId: 'C', octave: -1, pickupBeats: 0, learnBeats: 4, elements });
    forms[id] = { id, title, shortTitle: title, keyQuality: licks.at(-1).keyQuality, bars: [{ chords: [{ intervalFromTonic: 0, quality, durationBeats: 4 }] }] };
    applications.push({ id, lickId: id, formId: id, label: title, cellTonicInterval: 0, phraseStartBar: 1, leadIn: [], resolve: [], spots: [{ bar: 1, anchorInterval: 0, elements }] });
    return id;
  }
  function lesson(id, applicationId, kind, parent, extra = {}) {
    return { id, kind, applicationId, title: `${kind === 'learn' ? 'Learn' : 'Master'} ${extra.qualityTitle ?? 'chord tones'}`, coverTitle: kind === 'learn' ? 'Learn' : 'Master', summary: 'Play the chord tones in order on your instrument.', context: 'Chord tones', defaultKeyId: 'C', chordTones: true, moduleId: parent.id, moduleName: parent.name, moduleNumber: parent.number, sleeve: kind === 'learn' ? 'amber' : 'teal', ...extra };
  }
  for (const quality of CHORD_QUALITIES) {
    const applicationId = exercise(`tones-${quality.id}`, quality.id, quality.title);
    for (const kind of ['learn', 'master']) module.lessons.push(lesson(`tones-${quality.id}-${kind}`, applicationId, kind, module, { qualityTitle: quality.title, chordQuality: quality.id, coverTitle: `${kind === 'learn' ? 'Learn' : 'Master'} ${quality.title}` }));
  }
  for (const chart of charts) {
    const parent = { id: `chart-${chart.id}`, name: chart.title, number: null, lessons: [] };
    const timedSpots = [], timedBars = [];
    let index = 0, bar = 0;
    for (const section of chart.sections) for (const chords of section.bars) {
      bar++;
      timedBars.push({ chords });
      let beatOffset = 0;
      for (const [position, chord] of chords.entries()) {
        const applicationId = exercise(`tones-chart-${chart.id}-${index}`, chord.quality, `${chart.title} · bar ${bar}`);
        for (const kind of ['learn', 'master']) parent.lessons.push(lesson(`${applicationId}-${kind}`, applicationId, kind, parent, {
          chartId: chart.id, group: 'chart-tones', chordIndex: index, chordQuality: chord.quality,
          context: `Bar ${bar}${chords.length > 1 ? ` · chord ${position + 1}` : ''}`,
          defaultKeyId: transposeToneKey(chart.key, chord.intervalFromTonic),
          ...(kind === 'master' ? { chartPractice: true, title: 'Practice chord tones', coverTitle: 'Practice' } : {}),
        }));
        timedSpots.push({ bar, beatOffset, anchorInterval: chord.intervalFromTonic,
          elements: chordToneIntervals(chord.quality).map(interval => ({ type: 'note', interval, beats: chord.durationBeats / 4 })) });
        beatOffset += chord.durationBeats;
        index++;
      }
    }
    const timedId = exercise(`tones-chart-${chart.id}-timed`, 'major7', chart.title);
    licks.at(-1).keyQuality = chart.keyQuality;
    forms[timedId] = { id: timedId, title: chart.title, shortTitle: chart.title, keyQuality: chart.keyQuality, bars: timedBars };
    applications.at(-1).spots = timedSpots;
    parent.lessons.push(lesson(`${timedId}-master`, timedId, 'master', parent, {
      chartId: chart.id, group: 'chart-tones', chartTimed: true, defaultKeyId: chart.key,
      title: 'Master the changes', coverTitle: 'Master', context: 'From memory · in time', sleeve: 'oxblood',
    }));
    chartModules.push(parent); lessons.push(...parent.lessons);
  }
  return { module, chartModules, licks, forms, applications, lessons };
}
