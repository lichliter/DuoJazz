import test from 'node:test';
import assert from 'node:assert/strict';
import { CHART_LIBRARY, CHART_MODULES } from './registry.js';
import { createSession, recordBackingConfig, sessionPresentation, sessionScreenTitle, completeCard, wrapupCopy, wrapupNextModule } from './session.js';
import { expectedNotesFor, gradeSession, synthTrack } from './grade.js';
import { getKey, beatsToSeconds } from './music.js';
import { chordToneIntervals } from './chord-tones.js';
import { emptyMastery, recordQuizPass } from './medals.js';
import { INSTRUMENTS } from './instruments.js';

test('timed charts cover every change at its actual duration and keep the full backing form', () => {
  for (const chart of CHART_LIBRARY) {
    const lesson = CHART_MODULES.find(module => module.id === `chart-${chart.id}`).lessons.find(lesson => lesson.chartTimed);
    for (const instrument of INSTRUMENTS) {
      const session = createSession({ lessonId: lesson.id, startKeyId: 'D', instrumentId: instrument.id, swing: false });
      const notes = expectedNotesFor(session), chords = chart.sections.flatMap(section => section.bars.flat());
      const bars = chart.sections.flatMap(section => section.bars).length;
      assert.equal(notes.length, chords.length * 4);
      let beat = 0;
      for (const [index, chord] of chords.entries()) {
        for (const [toneIndex, interval] of chordToneIntervals(chord.quality).entries()) {
          const note = notes[index * 4 + toneIndex];
          assert.equal(note.startBeat, beat + toneIndex * chord.durationBeats / 4);
          assert.equal(note.beats, chord.durationBeats / 4);
          assert.equal(note.midi % 12, (getKey('D').pc + chord.intervalFromTonic + interval + 120) % 12);
        }
        beat += chord.durationBeats;
      }
      const config = recordBackingConfig(session);
      assert.equal(config.lengthBeats, bars * 4);
      assert.equal(config.looping, false);
      assert.equal(config.includeModel, false);
      assert.equal(config.includeGuides, false);
      assert.equal(session.keyQueue.length, 1);
      assert.equal(sessionPresentation(session).hideStaff, true);
      assert.equal(sessionScreenTitle(session), chart.title);
    }
  }
});

test('timed grading rewards accurate timing, reports silence, and gives an overall grade', () => {
  const lesson = CHART_MODULES[0].lessons.find(lesson => lesson.chartTimed);
  const session = createSession({ lessonId: lesson.id, swing: false });
  const notes = expectedNotesFor(session);
  assert.equal(gradeSession(session, synthTrack(notes)).percent, 100);
  const late = gradeSession(session, synthTrack(notes, { delayBeats: 0.48 }));
  assert.ok(late.percent < 40);
  assert.equal(late.passed, false);
  const silent = gradeSession(session, []);
  assert.equal(silent.percent, 0);
  assert.equal(silent.passed, false);
  const partial = gradeSession(session, synthTrack(notes.filter((_, index) => index % 10 !== 0)));
  assert.ok(partial.percent >= 80 && partial.percent < 100);
  assert.equal(partial.passed, true);
  const done = completeCard(session, partial);
  assert.equal(done.screen, 'wrapup');
  assert.equal(wrapupCopy(done).heading, `${partial.percent}%`);
  assert.equal(wrapupCopy(done).results.length, recordBackingConfig(session).lengthBeats / 4);
  assert.equal(wrapupNextModule(done), null);
});

test('half-bar chord tones follow swing timing and old per-chord passes never complete timed Master', () => {
  const parent = CHART_MODULES.find(module => module.id === 'chart-recordame');
  const lesson = parent.lessons.find(lesson => lesson.chartTimed);
  const straight = createSession({ lessonId: lesson.id, tempo: 96, swing: false });
  const swing = { ...straight, swing: true };
  const expected = expectedNotesFor(straight), swung = expectedNotesFor(swing);
  const eighth = expected.findIndex(note => note.startBeat % 1 === 0.5);
  assert.ok(eighth >= 0);
  assert.equal(swung[eighth].startBeat, beatsToSeconds(expected[eighth].startBeat, 96, true) * 96 / 60);
  assert.equal(gradeSession(swing, synthTrack(swung)).percent, 100);
  const practiced = recordQuizPass(emptyMastery(), parent.lessons.find(lesson => lesson.chartPractice).id, 'C');
  assert.deepEqual(practiced.lessons[lesson.id].passedKeys, []);
});
