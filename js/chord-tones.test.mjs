import test from 'node:test';
import assert from 'node:assert/strict';
import { CHORD_QUALITIES, chordToneIntervals, transposeToneKey } from './chord-tones.js';
import { MODULES, CHART_LIBRARY, CHART_MODULES, LESSONS } from './registry.js';
import { createSession, defaultPrefs, lessonSessionPlan, skipCard, wrapupCopy, repeatKey, wrapupNextModule, recommendedLessonId, TWELVE_KEY_IDS, demoAudioConfig, sessionScreenTitle } from './session.js';
import { expectedNotesFor } from './grade.js';
import { afterPass, isLastRapidKey } from './rapid.js';
import { emptyMastery, recordQuizPass, moduleMastery } from './medals.js';
import { getKey, learnChords, scheduleChorus } from './music.js';
import { phraseMEI } from './mei.js';
import { INSTRUMENTS } from './instruments.js';

test('module one teaches all four qualities with independent learn/master lessons and unchanged workbook IDs', () => {
  assert.equal(MODULES[0].id, 'chord-tones');
  assert.equal(MODULES[0].lessons.length, 8);
  assert.equal(MODULES[1].id, 'cmar');
  assert.equal(MODULES[1].number, 2);
  assert.ok(LESSONS.some(lesson => lesson.id === 'master-lick'));
  for (const quality of CHORD_QUALITIES) for (const kind of ['learn', 'master']) {
    const lessonId = `tones-${quality.id}-${kind}`;
    const prefs = { ...defaultPrefs(), startKeyId: 'D' };
    const plan = lessonSessionPlan(lessonId, prefs);
    assert.equal(plan.startKeyId, 'D'); // A minor chord uses the requested root, not its relative minor.
    const session = createSession({ lessonId, ...plan });
    assert.equal(session.keyQueue.length, kind === 'master' ? 12 : 1);
    assert.deepEqual(expectedNotesFor(session).map(note => (note.midi - getKey('D').pc + 120) % 12), quality.intervals);
  }
});

test('chart exercises cover every chord in order, preserving sixth, diminished, and altered-fifth structures', () => {
  for (const chart of CHART_LIBRARY) {
    const chords = chart.sections.flatMap(section => section.bars.flat());
    const module = CHART_MODULES.find(module => module.id === `chart-${chart.id}`);
    assert.equal(module.lessons.length, chords.length * 2 + 1);
    for (const [index, chord] of chords.entries()) {
      const lesson = module.lessons[index * 2 + 1];
      const plan = lessonSessionPlan(lesson.id, defaultPrefs());
      const harmony = learnChords(getKey(plan.startKeyId), 'concert', lesson.applicationId);
      assert.equal(harmony.length, 1);
      assert.equal(harmony[0].quality, chord.quality);
      assert.equal(harmony[0].durationBeats, 4);
      for (const instrument of INSTRUMENTS) {
        const session = createSession({ lessonId: lesson.id, ...plan, instrumentId: instrument.id });
        assert.equal(session.keyQueue.length, 1);
        const root = getKey(chart.key).pc + chord.intervalFromTonic;
        assert.deepEqual(expectedNotesFor(session).map(note => (note.midi - root + 120) % 12), chordToneIntervals(chord.quality).map(n => n % 12));
      }
    }
  }
});

test('chord-tone notation and backing use the taught quality in every key and instrument', () => {
  for (const quality of CHORD_QUALITIES) for (const kind of ['learn', 'master']) {
    const lessonId = `tones-${quality.id}-${kind}`, applicationId = `tones-${quality.id}`;
    for (const keyId of TWELVE_KEY_IDS) for (const instrument of INSTRUMENTS) {
      const session = createSession({ lessonId, startKeyId: keyId, instrumentId: instrument.id });
      const key = getKey(keyId);
      const harmony = learnChords(key, session.displayMode, applicationId);
      assert.equal(harmony.length, 1);
      assert.equal(harmony[0].quality, quality.id);
      assert.equal(harmony[0].durationBeats, 4);
      const events = scheduleChorus(demoAudioConfig(session));
      const backing = events.filter(event => event.type === 'chord');
      assert.equal(backing.length, 1);
      assert.deepEqual(backing[0].midis.map(midi => (midi - key.pc + 120) % 12), quality.intervals);
      assert.deepEqual(events.filter(event => event.type === 'melody').map(event => event.midi), expectedNotesFor(session).map(note => note.midi));
    }
    const suffix = { major7: 'M7', dominant7: '7', minor7: '-7', halfdim7: 'h7' }[quality.id];
    for (const [instrumentId, writtenRoot] of [['trombone', 'Bb'], ['trumpet', 'C'], ['alto-sax', 'G']]) {
      const session = createSession({ lessonId, startKeyId: 'Bb', instrumentId });
      const mei = phraseMEI(getKey('Bb'), session.displayMode, applicationId, session.clef);
      const symbols = [...mei.matchAll(/<harm\b[^>]*>([\s\S]*?)<\/harm>/g)].map(match => match[1].replace(/<[^>]+>/g, ''));
      assert.deepEqual(symbols, [writtenRoot + suffix]);
      const title = sessionScreenTitle(session).replaceAll('♭', 'b').replaceAll('△', 'M').replaceAll('−', '-').replaceAll('ø', 'h');
      assert.equal(symbols[0], title);
    }
  }
});

test('chart passes and skips advance to the next chord; only the final chord opens wrap-up', () => {
  const lessons = CHART_MODULES[0].lessons.filter(lesson => lesson.kind === 'master').slice(0, 3);
  const sequence = lessons.map(lesson => ({ lessonId: lesson.id, keyId: transposeToneKey(lesson.defaultKeyId, 2) }));
  let session = { ...createSession({ lessonId: sequence[0].lessonId, startKeyId: sequence[0].keyId }), sequence, sequenceIndex: 0 };
  assert.equal(isLastRapidKey(session), false);
  session = afterPass(session).session;
  assert.equal(session.lessonId, sequence[1].lessonId);
  assert.equal(session.startKeyId, sequence[1].keyId);
  assert.equal(session.screen, 'session');
  session = skipCard(session);
  assert.equal(session.lessonId, sequence[2].lessonId);
  assert.equal(isLastRapidKey(session), true);
  session = afterPass(session).session;
  assert.equal(session.screen, 'wrapup');
  assert.deepEqual(session.sequenceMarks, ['passed', 'skipped', 'passed']);
  assert.equal(wrapupCopy(session).detail, '2 of 3 chords passed');
  assert.deepEqual(wrapupCopy(session).results.map(row => row.summary), ['Passed', 'Skipped', 'Passed']);
  assert.equal(wrapupNextModule(session), null);
  const again = repeatKey(session);
  assert.equal(again.sequenceIndex, 0);
  assert.equal(again.lessonId, sequence[0].lessonId);
  assert.deepEqual(again.sequenceMarks, []);
});

test('chart lessons do not change the curriculum recommendation, and transposition accepts enharmonic keys', () => {
  const done = Object.fromEntries(MODULES.flatMap(module => module.lessons).map(lesson => [lesson.id, TWELVE_KEY_IDS]));
  assert.equal(recommendedLessonId(done), null);
  assert.equal(transposeToneKey('F#', 2), 'Ab');
  assert.equal(transposeToneKey('C#', -2), 'B');
  assert.deepEqual(chordToneIntervals('major6'), [0, 4, 7, 9]);
  assert.deepEqual(chordToneIntervals('halfdim7'), [0, 3, 6, 10]);
  assert.deepEqual(chordToneIntervals('dominant7s5'), [0, 4, 8, 10]);
  assert.ok(LESSONS.every(lesson => lesson.id.length <= 100));
});

test('a foundation key is mastered only after all four qualities are passed', () => {
  let mastery = emptyMastery();
  for (const [index, quality] of CHORD_QUALITIES.entries()) {
    mastery = recordQuizPass(mastery, `tones-${quality.id}-master`, 'C');
    assert.equal(moduleMastery(mastery, 'chord-tones').masteredKeys.length, index === 3 ? 1 : 0);
  }
});
