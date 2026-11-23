import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { MODULES, PRACTICE_CATALOG, applicationById, formById, spotsFor, lickById, learnBeatsFor } from './registry.js';
import { getKey, phraseNotes, phraseABC, phraseMeasureCount, phraseTimeline, scheduleChorus } from './music.js';
import { TWELVE_KEY_IDS, createSession, jumpToCard, defaultPrefs, demoAudioConfig, recordBackingConfig } from './session.js';
import { expectedNotesFor, gradeSession, synthTrack, hzFromMidi } from './grade.js';
import { runFollower, octaveModeForLesson } from './follow.js';
import { livePlaybackEvents } from './sound-band.js';
import { matchApplication } from './practice-catalog.js';
import { phraseMEI, chorusStaffMEI } from './mei.js';

const appId = 'lotus-inspired-learn';
const durations = [.5, .5, .5, 1, .5, .5, .5, 1, 1, 1];
const starts = [-1.5, -1, -.5, 0, 1, 1.5, 2, 2.5, 3.5, 4.5];
const contour = [0, 1, 3, 4, 3, 1, 0, 3, 1, -4];
const groups = PRACTICE_CATALOG.groups.filter(g => g.moduleId === 'lotus-inspired');

test('Lotus starts on & of 3 with three pickups and preserves the corrected pitches and durations', async () => {
  const notes = phraseNotes(getKey('F'), 'concert', appId);
  assert.deepEqual(notes.map(n => n.concertName), ['E3','F3','G3','A♭3','G3','F3','E3','G3','F3','C3']);
  assert.deepEqual(notes.map(n => n.startBeat), starts);
  assert.deepEqual(notes.map(n => n.beats), durations);
  assert.deepEqual(notes.filter(n => n.pickup).map(n => n.startBeat), [-1.5, -1, -.5]);
  assert.equal(notes[3].startBeat, 0);
  assert.equal(lickById('lotus-inspired').pickupBeats, 1.5);
  assert.equal(learnBeatsFor(appId), 8);
  assert.equal(phraseMeasureCount(appId), 3); // Pickup measure plus two full bars.
  const rest = phraseTimeline(appId).at(-1);
  assert.equal(rest.type, 'rest');
  assert.equal(rest.beat, 5.5);
  assert.equal(rest.beats, 2.5);
  assert.equal(rest.beat + rest.beats, learnBeatsFor(appId));
  const abc = phraseABC(getKey('F'), 'concert', appId);
  assert.match(abc, /M:4\/4/);
  assert.match(abc, /K:Fmin clef=bass/);
  assert.match(abc, /clef=bass\n=E, F,G,\s+\|/);
  const mei = phraseMEI(getKey('F'), 'concert', appId);
  const pickupMeasure = mei.match(/<measure n="0" metcon="false">([\s\S]*?)<\/measure>/)[1];
  assert.equal((pickupMeasure.match(/<note\b/g) ?? []).length, 3);
  assert.doesNotMatch(pickupMeasure, /<rest\b/);
  assert.equal(defaultPrefs().lessons[appId].startKeyId, 'F');
  const contract = JSON.parse(await readFile(new URL('../references/lick-drafts/lotus-inspired.json', import.meta.url)));
  assert.equal(contract.notes.at(-1).pitch, 'C');
  assert.deepEqual(contract.notes.map(n => n.durationBeats), durations);
  assert.equal(contract.startBeatOffset, -1.5);
  assert.equal(contract.pickupBeats, 1.5);
  assert.equal(contract.preview.endRestBeats, rest.beats);
  const lotusModule = MODULES.find((m) => m.id === 'lotus-inspired');
  assert.ok(lotusModule);
  assert.deepEqual(lotusModule.lessons.map(l => l.kind), ['learn', 'master']);
});

test('Lotus notation and model agree in all keys, on both horns, with lead-only octave shifts', () => {
  for (const keyId of TWELVE_KEY_IDS) for (const displayMode of ['trombone', 'trumpet']) {
    const key = getKey(keyId);
    const notes = phraseNotes(key, displayMode, appId);
    assert.deepEqual(notes.map(n => n.concertMidi - notes[0].concertMidi), contour);
    assert.deepEqual(notes.map(n => n.shownMidi - n.concertMidi), notes.map(() => displayMode === 'trumpet' ? 2 : 0));
    const config = { concertKey: key, displayMode, applicationId: appId, stage: 'learn', includeModel: true };
    const events = scheduleChorus(config);
    const model = events.filter(e => e.type === 'melody');
    assert.deepEqual(model.map(e => e.midi), notes.map(n => n.concertMidi));
    assert.deepEqual(model.map(e => e.beat), starts);
    assert.deepEqual(model.map(e => e.durationBeats), durations);
    const shifted = scheduleChorus({ ...config, melodyRegister: 1 });
    assert.deepEqual(shifted.filter(e => e.type === 'melody').map(e => e.midi), model.map(e => e.midi + 12));
    assert.deepEqual(shifted.filter(e => e.type !== 'melody'), events.filter(e => e.type !== 'melody'));
  }
});

test('Lotus Learn and Master accept the corrected C ending and reject the old E ending', () => {
  for (const kind of ['learn', 'master']) {
    const session = jumpToCard(createSession({ lessonId: `lotus-inspired-${kind}`, startKeyId: 'F', swing: false }), 'play');
    const notes = expectedNotesFor(session);
    assert.equal(notes.length, 10);
    assert.deepEqual(notes.map(n => n.startBeat), starts);
    assert.equal(demoAudioConfig(session).lengthBeats, 8);
    assert.equal(gradeSession(session, synthTrack(notes)).passed, true);
    const wrong = notes.map((n, i) => i === notes.length - 1 ? { ...n, midi: n.midi + 4 } : n);
    const frames = (played) => played.flatMap((n, i) => Array.from({ length: 9 }, (_, j) => ({
      t: i * 250 + j * 20, hz: hzFromMidi(n.midi), amp: .3,
    })));
    const options = { octaveMode: octaveModeForLesson(kind, false) };
    assert.equal(runFollower(notes.map(n => n.midi), frames(notes), 0, options).passed, true);
    assert.equal(runFollower(notes.map(n => n.midi), frames(wrong), 0, options).reason, 'wrong');
  }
});

test('Lotus preserves harmonic-minor spelling in note names, ABC, and MEI after transposition', () => {
  const leading = ['B', 'B♯', 'C♯', 'D', 'D♯', 'E', 'E♯', 'F♯', 'G', 'G♯', 'A', 'A♯'];
  for (const keyId of TWELVE_KEY_IDS) for (const displayMode of ['concert', 'trumpet']) {
    const key = getKey(keyId);
    const notes = phraseNotes(key, displayMode, appId);
    assert.equal(notes[0].concertName.replace(/\d+$/, ''), leading[key.pc]);
    const name = leading[(key.pc + (displayMode === 'trumpet' ? 2 : 0)) % 12];
    assert.equal(notes[0].shownName.replace(/\d+$/, ''), name);
    assert.equal(notes[6].shownName, notes[0].shownName);
    const firstMeiNote = phraseMEI(key, displayMode, appId).match(/<note\b[^>]*>/)[0];
    assert.ok(firstMeiNote.includes(`pname="${name[0].toLowerCase()}"`));
  }
  assert.match(phraseABC(getKey('G'), 'concert', appId), /clef=bass\n\^F,/);
  for (const group of groups.filter(g => g.id.endsWith('minor-home') || g.id.endsWith('minor-cadence'))) {
    const applicationId = group.choices.find(c => c.chartId === 'autumn-leaves').lessonId;
    const notes = phraseNotes(getKey('G'), 'concert', applicationId);
    assert.equal(notes[0].concertName.replace(/\d+$/, ''), 'F♯');
    const mei = chorusStaffMEI({ concertKey: getKey('G'), displayMode: 'concert', applicationId, mode: 'model' });
    const firstMeiNote = mei.match(/<note\b[^>]*>/)[0];
    assert.match(firstMeiNote, /pname="f"/);
    assert.match(firstMeiNote, /accid="s"/);
  }
});

test('Lotus integrations have honest examples and real full-length Autumn Leaves placements', () => {
  assert.deepEqual(groups.map(g => g.label), ['Minor home', 'V → minor', 'Lydian dominant', 'Altered dominant', 'Half-diminished']);
  for (const group of groups.filter(g => g.id.endsWith('minor-home') || g.id.endsWith('minor-cadence'))) {
    const isCadence = group.id.endsWith('minor-cadence');
    const form = formById(applicationById(group.exampleLessonId).formId);
    assert.equal(form.bars.length, 8);
    assert.equal(form.bars[0].chords[0].quality, isCadence ? 'dominant7b9' : 'minormaj7');
    assert.equal(form.bars[1].chords[0].quality, 'minormaj7');
    assert.doesNotMatch(form.source + form.title, /Workbook|undefined/);
    const choice = group.choices.find(c => c.chartId === 'autumn-leaves');
    assert.ok(choice);
    assert.ok(spotsFor(choice.lessonId).some(s => s.bar === (isCadence ? 6 : 7) && s.anchorInterval === 0));
    for (const spot of spotsFor(choice.lessonId)) {
      assert.equal(spot.pickup, true);
      assert.equal(spot.pickupBeats, 1.5);
    }
    for (const lessonId of [group.exampleLessonId, choice.lessonId]) {
      const session = createSession({ lessonId, startKeyId: 'F', swing: false });
      const config = demoAudioConfig(session);
      const model = livePlaybackEvents(config).filter(e => e.type === 'melody');
      const notes = phraseNotes(config.concertKey, config.displayMode, config.applicationId, config.melodyRegister);
      assert.deepEqual(model.map(e => e.midi), notes.map(n => n.concertMidi));
      assert.deepEqual(model.map(e => e.beat), notes.map(n => n.startBeat));
      for (const [spotIndex, spot] of spotsFor(lessonId).entries()) {
        const origin = (spot.bar - 1) * 4 + (spot.beatOffset ?? 0);
        const phrase = phraseTimeline(lessonId).filter(n => n.type === 'note' && n.spotIndex === spotIndex);
        assert.deepEqual(phrase.map(n => n.beat), starts.map(beat => beat + origin));
      }
      assert.ok(livePlaybackEvents(recordBackingConfig(session)).every(e => e.type !== 'melody'));
    }
  }
  const melodicSpecs = [
    { id: 'lotus-inspired:lydian-dominant', quality: 'dominant7s11', chartId: 'take-the-a-train' },
    { id: 'lotus-inspired:altered-dominant', quality: 'dominant7alt', chartId: 'i-got-rhythm' },
    { id: 'lotus-inspired:halfdim', quality: 'minor7b5', chartId: null },
  ];
  for (const spec of melodicSpecs) {
    const group = groups.find(g => g.id === spec.id);
    assert.ok(group);
    const form = formById(applicationById(group.exampleLessonId).formId);
    assert.equal(form.bars[0].chords[0].quality, spec.quality);
    assert.doesNotMatch(form.source + form.title, /Workbook|undefined/);
    const lessonIds = [group.exampleLessonId];
    if (spec.chartId) {
      const choice = group.choices.find(c => c.chartId === spec.chartId);
      assert.ok(choice, `${spec.id} -> ${spec.chartId}`);
      lessonIds.push(choice.lessonId);
    }
    for (const lessonId of lessonIds) {
      for (const keyId of TWELVE_KEY_IDS) {
        const notes = phraseNotes(getKey(keyId), 'concert', lessonId);
        for (const note of notes) assert.doesNotMatch(note.shownName, /[𝄪𝄫]/u);
      }
      const session = createSession({ lessonId, startKeyId: 'F', swing: false });
      const config = demoAudioConfig(session);
      const model = livePlaybackEvents(config).filter(e => e.type === 'melody');
      const notes = phraseNotes(config.concertKey, config.displayMode, config.applicationId, config.melodyRegister);
      assert.deepEqual(model.map(e => e.midi), notes.map(n => n.concertMidi));
      assert.deepEqual(model.map(e => e.beat), notes.map(n => n.startBeat));
    }
  }
});

test('Lotus matching rejects incompatible sevenths, short changes, and a changed final chord', () => {
  const definitions = PRACTICE_CATALOG.definitions.filter(d => d.lickId === 'lotus-inspired');
  const home = definitions.find(d => d.id === 'minor-home').variants[0];
  const cadence = definitions.find(d => d.id === 'minor-cadence').variants[0];
  const chord = (root, quality, durationBeats = 4) => ({ intervalFromTonic: root, quality, durationBeats });
  const form = (...bars) => ({ bars: bars.map(chords => ({ chords })) });
  assert.equal(matchApplication(form([chord(0,'minor6')],[chord(0,'minor6')]),home).length, 1);
  assert.equal(matchApplication(form([chord(0,'minor7')],[chord(0,'minor7')]),home).length, 0);
  assert.equal(matchApplication(form([chord(7,'dominant7b9')],[chord(0,'minormaj7')]),cadence).length, 1);
  assert.equal(matchApplication(form([chord(7,'dominant7b9')],[chord(0,'minor7')]),cadence).length, 0);
  assert.equal(matchApplication(form([chord(7,'dominant7b9',2),chord(0,'minor6',2)],[chord(0,'minor6')]),cadence).length, 0);
  assert.equal(matchApplication(form([chord(7,'dominant7b9')],[chord(0,'minor6',1),chord(5,'minor6',3)]),cadence).length, 0);
  assert.equal(matchApplication(form([chord(7,'dominant7b9')],[chord(0,'minor6',1.5),chord(5,'minor6',2.5)]),cadence).length, 1);
  assert.equal(matchApplication(form([chord(7,'dominant7sus')],[chord(0,'minor6')]),cadence).length, 0);
  assert.equal(matchApplication(form([chord(7,'dominant7b9')],[chord(2,'minor6')]),cadence).length, 0);
});
