import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { MODULES, PRACTICE_CATALOG, applicationById, formById, spotsFor, lickById, learnBeatsFor } from './registry.js';
import { getKey, phraseNotes, phraseABC, phraseMeasureCount, phraseTimeline, scheduleChorus, chorusChords, beamGroupsCrossBeat3 } from './music.js';
import { TWELVE_KEY_IDS, createSession, jumpToCard, defaultPrefs, demoAudioConfig, recordBackingConfig } from './session.js';
import { expectedNotesFor, gradeSession, synthTrack, hzFromMidi } from './grade.js';
import { runFollower, octaveModeForLesson } from './follow.js';
import { livePlaybackEvents } from './sound-band.js';
import { matchApplication } from './practice-catalog.js';
import { phraseMEI, chorusStaffMEI, meiBeamGroupsCrossBeat3 } from './mei.js';
import { verovioOptions } from './engrave.js';

const appId = 'south-of-the-river-learn';
const durations = [...Array(4).fill(1 / 6), ...Array(12).fill(0.25), 1];
const starts = [1 / 3, 0.5, 2 / 3, 5 / 6, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4];
const contour = [0, 1, 5, 8, 5, 6, 10, 13, 10, 11, 15, 18, 22, 21, 20, 19, 18];
const groups = PRACTICE_CATALOG.groups.filter(g => g.moduleId === 'south-of-the-river');
const blocks = [
  { id: 'south-of-the-river-opening', from: 0, to: 8, offset: 0, rest: 2, chords: [['Gm7', 4]] },
  { id: 'south-of-the-river-climb-and-landing', from: 8, to: 17, offset: 2, rest: 1, chords: [['Gm7', 2], ['Cm7', 2]] },
];

const nearList = (actual, expected) => {
  assert.equal(actual.length, expected.length);
  actual.forEach((v, i) => assert.ok(Math.abs(v - expected[i]) < 1e-6, `${i}: ${v} !== ${expected[i]}`));
};

test('South of the River preserves Brian’s 4/4 sextuplet into beat 2 and B♭ resolution on the next downbeat, pitches, rhythm, and distinctness from Workbook Lick 26', async () => {
  const notes = phraseNotes(getKey('G'), 'concert', appId);
  assert.deepEqual(
    notes.map(n => n.concertName),
    ['E3', 'F3', 'A3', 'C4', 'A3', 'B♭3', 'D4', 'F4', 'D4', 'E♭4', 'G4', 'B♭4', 'D5', 'D♭5', 'C5', 'B4', 'B♭4'],
  );
  nearList(notes.map(n => n.startBeat), starts);
  nearList(notes.map(n => n.beats), durations);
  assert.ok(Math.abs(notes[4].startBeat - 1) < 1e-6); // Low A on beat 2.
  assert.ok(Math.abs(notes[16].startBeat - 4) < 1e-6); // Final B♭ on the next downbeat.
  assert.equal(lickById('south-of-the-river').pickupBeats, 0);
  assert.equal(learnBeatsFor(appId), 8);
  assert.equal(phraseMeasureCount(appId), 2);
  const timeline = phraseTimeline(appId);
  const rests = timeline.filter(item => item.type === 'rest');
  nearList(rests.map(rest => rest.beat), [0, 5]);
  nearList(rests.map(rest => rest.beats), [1 / 3, 3]);
  assert.equal(rests[0].tuplet, 6);
  const abc = phraseABC(getKey('G'), 'concert', appId);
  assert.match(abc, /M:4\/4/);
  assert.match(abc, /K:Gmin clef=bass/);
  assert.match(abc, /\(6:4:5z=E,\/2F,\/2A,\/2C\/2/);
  assert.equal(beamGroupsCrossBeat3(abc), false);
  const mei = phraseMEI(getKey('G'), 'concert', appId);
  assert.match(mei, /<tuplet num="6" numbase="4" bracket\.visible="true"><rest dur="8"\/><beam/);
  assert.equal((mei.match(/<note\b/g) ?? []).length, 17);
  assert.equal((mei.match(/<rest\b/g) ?? []).length, 3);
  assert.equal(meiBeamGroupsCrossBeat3(mei), false);
  assert.equal(defaultPrefs().lessons[appId].startKeyId, 'G');
  const contract = JSON.parse(await readFile(new URL('../references/lick-drafts/south-of-the-river.json', import.meta.url)));
  assert.deepEqual(
    contract.notes.map(n => n.pitch),
    ['E', 'F', 'A', 'C', 'A', 'Bb', 'D', 'F', 'D', 'Eb', 'G', 'Bb', 'D', 'Db', 'C', 'B', 'Bb'],
  );
  nearList(contract.notes.map(n => n.durationBeats), durations);
  assert.equal(contract.meter, '4/4');
  assert.equal(contract.startBeatOffset, 0);
  assert.equal(contract.endRestBeats, 3);
  assert.equal(contract.pickupBeats, 0);
  const composite = MODULES.find(module => module.id === 'south-of-the-river');
  assert.equal(composite.number, 34);
  assert.deepEqual(composite.lessons.map(l => l.kind), ['learn', 'master']);
  assert.deepEqual(composite.buildingBlockIds, blocks.map(block => block.id));
  assert.deepEqual(contract.buildingBlocks.map(block => [block.id, block.endRestBeats]), blocks.map(block => [block.id, block.rest]));
  // Workbook Lick 26 (Bread and Butter) remains unchanged.
  assert.deepEqual(
    phraseNotes(getKey('Bb'), 'concert', 'bb-learn').map(n => n.concertName),
    ['F3', 'G3', 'A3', 'C4', 'A3', 'B♭3', 'D4', 'F4'],
  );
});

test('South of the River building blocks preserve the phrase across keys and use one-bar lessons', () => {
  for (const block of blocks) {
    const module = MODULES.find(item => item.id === block.id);
    assert.equal(module.compositeId, 'south-of-the-river');
    assert.deepEqual(module.lessons.map(l => l.kind), ['learn', 'master']);
    const applicationId = module.lessons[0].applicationId;
    const blockStarts = starts.slice(block.from, block.to).map(beat => beat - block.offset);
    const blockDurations = durations.slice(block.from, block.to);
    assert.equal(phraseMeasureCount(applicationId), 1);
    assert.equal(phraseTimeline(applicationId).at(-1).beats, block.rest);
    assert.deepEqual(chorusChords(getKey('G'), 'concert', applicationId).map(c => [c.name, c.durationBeats]), block.chords);
    for (const keyId of TWELVE_KEY_IDS) for (const displayMode of ['trombone', 'trumpet']) {
      const key = getKey(keyId);
      const full = phraseNotes(key, displayMode, appId).slice(block.from, block.to);
      const notes = phraseNotes(key, displayMode, applicationId);
      const octaveDifference = notes[0].concertMidi - full[0].concertMidi;
      assert.equal(octaveDifference % 12 || 0, 0);
      assert.deepEqual(notes.map(n => n.concertMidi), full.map(n => n.concertMidi + octaveDifference));
      for (const note of notes) assert.equal(note.shownMidi - note.concertMidi, displayMode === 'trumpet' ? 2 : 0);
      assert.equal((phraseMEI(key, displayMode, applicationId).match(/<note\b/g) ?? []).length, notes.length);
      assert.equal(beamGroupsCrossBeat3(phraseABC(key, displayMode, applicationId)), false);
      const config = { concertKey: key, displayMode, applicationId, stage: 'learn', includeModel: true };
      const events = scheduleChorus(config);
      const model = events.filter(event => event.type === 'melody');
      nearList(model.map(event => event.beat), blockStarts);
      nearList(model.map(event => event.durationBeats), blockDurations);
      assert.deepEqual(model.map(event => event.midi), notes.map(note => note.concertMidi));
      const raised = scheduleChorus({ ...config, melodyRegister: 1 });
      assert.deepEqual(raised.filter(event => event.type === 'melody').map(event => event.midi), notes.map(note => note.concertMidi + 12));
      assert.deepEqual(raised.filter(event => event.type !== 'melody'), events.filter(event => event.type !== 'melody'));
    }
    for (const lesson of module.lessons) {
      const session = jumpToCard(createSession({ lessonId: lesson.id, startKeyId: 'G' }), 'play');
      const notes = expectedNotesFor(session);
      nearList(notes.map(n => n.startBeat), blockStarts);
      assert.equal(demoAudioConfig(session).lengthBeats, 4);
      assert.equal(gradeSession(session, synthTrack(notes)).passed, true);
      const wrong = notes.map(n => ({ ...n, midi: n.midi + 1 }));
      assert.equal(gradeSession(session, synthTrack(wrong)).passed, false);
    }
  }
});

test('Both building blocks have a Minor home vamp and match charts through their last sounding note', () => {
  for (const block of blocks) {
    const group = PRACTICE_CATALOG.groups.find(item => item.id === `${block.id}:minor-home`);
    const choice = group.choices.find(item => item.chartId === 'so-what');
    assert.ok(choice);
    assert.ok(spotsFor(choice.lessonId).some(spot => spot.bar === 1));
    for (const lessonId of [group.exampleLessonId, choice.lessonId]) {
      const session = createSession({ lessonId });
      const config = demoAudioConfig(session);
      assert.equal(livePlaybackEvents(config).filter(event => event.type === 'melody').length, block.to - block.from);
      assert.ok(livePlaybackEvents(recordBackingConfig(session)).every(event => event.type !== 'melody'));
    }
    assert.equal(chorusChords(getKey('G'), 'concert', group.exampleLessonId)[0].name, 'Gm7');
    const [variant] = PRACTICE_CATALOG.definitions.find(definition => definition.lickId === block.id).variants;
    const form = (quality, durationBeats) => ({ bars: [{ chords: [
      { intervalFromTonic: 0, quality, durationBeats },
      { intervalFromTonic: 5, quality: 'minor7', durationBeats: 4 - durationBeats },
    ] }] });
    const startsOnBeatOne = (quality, duration) =>
      matchApplication(form(quality, duration), variant).some(spot => spot.beatOffset === 0);
    assert.equal(startsOnBeatOne('minor7', 3), true);
    assert.equal(startsOnBeatOne('minor7', 1.5), false);
    assert.equal(startsOnBeatOne('minormaj7', 3), false);
    assert.equal(startsOnBeatOne('minor7', 2), block.offset === 0);
  }
});

test('South of the River notation and model agree in all keys, on both horns, with lead-only octave shifts', () => {
  for (const keyId of TWELVE_KEY_IDS) for (const displayMode of ['trombone', 'trumpet']) {
    const key = getKey(keyId);
    const notes = phraseNotes(key, displayMode, appId);
    assert.deepEqual(notes.map(n => n.concertMidi - notes[0].concertMidi), contour);
    assert.deepEqual(notes.map(n => n.shownMidi - n.concertMidi), notes.map(() => displayMode === 'trumpet' ? 2 : 0));
    for (const note of notes) {
      assert.doesNotMatch(note.shownName, /[𝄪𝄫]/u, `${keyId} ${displayMode} ${note.shownName}`);
      assert.doesNotMatch(note.concertName, /[𝄪𝄫]/u, `${keyId} ${displayMode} ${note.concertName}`);
    }
    const mei = phraseMEI(key, displayMode, appId);
    assert.doesNotMatch(mei, /accid="(?:ss|ff)"/, `${keyId} ${displayMode} MEI`);
    const config = { concertKey: key, displayMode, applicationId: appId, stage: 'learn', includeModel: true };
    const events = scheduleChorus(config);
    const model = events.filter(e => e.type === 'melody');
    assert.deepEqual(model.map(e => e.midi), notes.map(n => n.concertMidi));
    nearList(model.map(e => e.beat), starts);
    nearList(model.map(e => e.durationBeats), durations);
    assert.ok(model.slice(0, -1).every(e => e.swing === false));
    const shiftedUp = scheduleChorus({ ...config, melodyRegister: 1 });
    assert.deepEqual(shiftedUp.filter(e => e.type === 'melody').map(e => e.midi), model.map(e => e.midi + 12));
    assert.deepEqual(shiftedUp.filter(e => e.type !== 'melody'), events.filter(e => e.type !== 'melody'));
    const shiftedDown = scheduleChorus({ ...config, melodyRegister: -1 });
    assert.deepEqual(shiftedDown.filter(e => e.type === 'melody').map(e => e.midi), model.map(e => e.midi - 12));
    assert.deepEqual(shiftedDown.filter(e => e.type !== 'melody'), events.filter(e => e.type !== 'melody'));
  }
});

test('South of the River Learn and Master grade the 17-note phrase and reject wrong notes', () => {
  for (const kind of ['learn', 'master']) {
    const session = jumpToCard(createSession({ lessonId: `south-of-the-river-${kind}`, startKeyId: 'G' }), 'play');
    const notes = expectedNotesFor(session);
    assert.equal(notes.length, 17);
    nearList(notes.map(n => n.startBeat), starts);
    assert.equal(demoAudioConfig(session).lengthBeats, 8);
    assert.equal(gradeSession(session, synthTrack(notes)).passed, true);
    const wrong = notes.map((n, i) => (i === notes.length - 1 ? { ...n, midi: n.midi - 2 } : n));
    const frames = played => played.flatMap((n, i) => Array.from({ length: 9 }, (_, j) => ({
      t: i * 250 + j * 20, hz: hzFromMidi(n.midi), amp: 0.3,
    })));
    const options = { octaveMode: octaveModeForLesson(kind, false) };
    assert.equal(runFollower(notes.map(n => n.midi), frames(notes), 0, options).passed, true);
    assert.equal(runFollower(notes.map(n => n.midi), frames(wrong), 0, options).reason, 'wrong');
  }
});

test('South of the River integrations have valid vamps, real charts, and matching audio/notation', () => {
  assert.deepEqual(groups.map(g => g.label), ['Minor i → iv', 'Minor home', 'Major I → IV']);
  const expected = {
    'south-of-the-river:minor-i-iv': { chords: ['Gm7', 'Cm7'], chartId: 'blue-bossa', bar: 2, anchor: 0 },
    'south-of-the-river:minor-home': { chords: ['Gm7', 'Gm7'], chartId: 'so-what', bar: 1, anchor: 0 },
    'south-of-the-river:major-i-iv': { chords: ['B♭maj7', 'E♭maj7'], chartId: 'autumn-leaves', bar: 3, anchor: 0 },
  };
  for (const group of groups) {
    const spec = expected[group.id];
    const form = formById(applicationById(group.exampleLessonId).formId);
    assert.equal(form.bars.length, 8);
    assert.deepEqual(chorusChords(getKey('G'), 'concert', group.exampleLessonId).slice(0, 2).map(c => c.name), spec.chords);
    assert.doesNotMatch(form.source + form.title, /Workbook|undefined/);
    const choice = group.choices.find(c => c.chartId === spec.chartId);
    assert.ok(choice, `${group.id} ${spec.chartId}`);
    assert.ok(spotsFor(choice.lessonId).some(s => s.bar === spec.bar && ((s.anchorInterval % 12) + 12) % 12 === spec.anchor));
    for (const lessonId of [group.exampleLessonId, choice.lessonId]) {
      const session = createSession({ lessonId, startKeyId: 'G', swing: false });
      const config = demoAudioConfig(session);
      const model = livePlaybackEvents(config).filter(e => e.type === 'melody');
      const notes = phraseNotes(config.concertKey, config.displayMode, config.applicationId, config.melodyRegister);
      assert.deepEqual(model.map(e => e.midi), notes.map(n => n.concertMidi));
      nearList(model.map(e => e.beat), notes.map(n => n.startBeat));
      assert.ok(livePlaybackEvents(recordBackingConfig(session)).every(e => e.type !== 'melody'));
      const mei = chorusStaffMEI({ concertKey: getKey('G'), displayMode: 'concert', applicationId: config.applicationId, mode: 'landing' });
      assert.doesNotMatch(mei, /accid="(?:ss|ff)"/);
    }
  }
  const leavesChoice = groups.find(g => g.id === 'south-of-the-river:major-i-iv').choices.find(c => c.chartId === 'autumn-leaves');
  assert.deepEqual(
    phraseNotes(getKey('G'), 'concert', leavesChoice.lessonId).map(n => n.concertName),
    ['E3', 'F3', 'A3', 'C4', 'A3', 'B♭3', 'D4', 'F4', 'D4', 'E♭4', 'G4', 'B♭4', 'D5', 'D♭5', 'C5', 'B4', 'B♭4'],
  );
});

test('South of the River matching rejects short durations, wrong roots, and conflicting qualities', () => {
  const definitions = PRACTICE_CATALOG.definitions.filter(d => d.lickId === 'south-of-the-river');
  const minorIIv = definitions.find(d => d.id === 'minor-i-iv').variants[0];
  const minorHome = definitions.find(d => d.id === 'minor-home').variants[0];
  const majorIIv = definitions.find(d => d.id === 'major-i-iv').variants[0];
  const chord = (root, quality, durationBeats = 4) => ({ intervalFromTonic: root, quality, durationBeats });
  const form = (...bars) => ({ bars: bars.map(chords => ({ chords })) });

  assert.equal(matchApplication(form([chord(0, 'minor7')], [chord(5, 'minor7')]), minorIIv).length, 1);
  assert.equal(matchApplication(form([chord(0, 'minor7')]), minorIIv).length, 0);
  assert.equal(matchApplication(form([chord(0, 'minor7')], [chord(7, 'minor7')]), minorIIv).length, 0);
  assert.equal(matchApplication(form([chord(0, 'minormaj7')], [chord(5, 'minor7')]), minorIIv).length, 0);
  assert.equal(matchApplication(form([chord(0, 'minor6')], [chord(5, 'minor7')]), minorIIv).length, 0);

  assert.equal(matchApplication(form([chord(0, 'minor7')], [chord(0, 'minor7')]), minorHome).length, 1);
  assert.equal(matchApplication(form([chord(0, 'minor7')]), minorHome).length, 0);
  assert.equal(matchApplication(form([chord(0, 'minorb6')], [chord(0, 'minorb6')]), minorHome).length, 0);

  assert.equal(matchApplication(form([chord(0, 'major7')], [chord(5, 'major7')]), majorIIv).length, 1);
  assert.equal(matchApplication(form([chord(0, 'major7b5')], [chord(5, 'major7')]), majorIIv).length, 0);
  assert.equal(matchApplication(form([chord(0, 'major7')]), majorIIv).length, 0);
});

test('Verovio 6.3.0 renders South of the River MEI cleanly with sextuplet bracket and rest', async () => {
  const file = path.resolve('js/vendor/verovio-6.3.0.js');
  const code = readFileSync(file, 'utf8');
  const mod = { exports: {} };
  const fn = new Function('exports', 'require', 'module', '__filename', '__dirname', code);
  fn(mod.exports, createRequire(file), mod, file, path.dirname(file));
  const verovio = await new Promise((resolve) => {
    if (mod.exports.module?._vrvToolkit_constructor) return resolve(mod.exports);
    mod.exports.module.onRuntimeInitialized = () => resolve(mod.exports);
  });
  const tk = new verovio.toolkit();
  tk.setOptions(verovioOptions({}, 720));
  tk.loadData(phraseMEI(getKey('G'), 'concert', appId));
  const svg = tk.renderToSVG(1);
  assert.equal((svg.match(/\sclass="note"/g) ?? []).length, 17);
  assert.equal((svg.match(/\sclass="tuplet"/g) ?? []).length, 1);
  assert.equal((svg.match(/\sclass="rest"/g) ?? []).length, 3);
});
