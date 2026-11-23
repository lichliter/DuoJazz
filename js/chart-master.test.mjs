import test from 'node:test';
import assert from 'node:assert/strict';
import { CHART_LIBRARY, CHART_MODULES } from './registry.js';
import { advanceKey, createSession, recordBackingConfig, sessionPresentation, sessionScreenTitle, completeCard, wrapupCopy, wrapupNextModule } from './session.js';
import { chartPassFeedback, expectedNotesFor, gradePerformance, gradeSession, hzFromMidi, synthTrack } from './grade.js';
import { getKey, beatsToSeconds } from './music.js';
import { chordToneIntervals } from './chord-tones.js';
import { emptyMastery, recordQuizPass } from './medals.js';
import { sessionVinylTier } from './app-wrapup.js';
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
  const summary = wrapupCopy(done);
  assert.equal(summary.heading, 'Lesson complete');
  assert.equal(summary.kicker, 'Master');
  assert.equal(summary.grade.percent, partial.percent);
  assert.equal(summary.results.length, recordBackingConfig(session).lengthBeats / 4);
  assert.ok(summary.missed.length >= 1);
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

test('timed grading and bar dings use attacks when early notes ring across the beat', () => {
  const session = createSession({ lessonId: 'tones-chart-honeysuckle-rose-timed-master', tempo: 96, swing: false });
  const notes = expectedNotesFor(session);
  for (const early of [0, 0.6]) {
    const frames = [];
    const ding = chartPassFeedback(notes, session.tempo);
    let dings = 0;
    for (const [i, note] of notes.entries()) {
      const start = i === 0 ? 0 : note.startBeat - early;
      const end = (notes[i + 1]?.startBeat ?? note.startBeat + note.beats) - early - 0.07;
      for (let beat = start; beat < end; beat += 0.032) {
        frames.push({ beat, hz: hzFromMidi(note.midi), amp: 0.12 });
        if (ding(beat, frames)) dings++;
      }
    }
    const result = gradeSession(session, frames);
    assert.equal(result.passedCount, early ? 1 : notes.length);
    assert.equal(dings, early ? 0 : notes.at(-1).bar);
  }
});

test('a repeated pitch needs a release or new attack, including at the end of the count-in', () => {
  const expected = [0, 1].map((startBeat, i) => ({ startBeat, midi: 60, beats: 1, bar: 1, number: i + 1 }));
  const frames = Array.from({ length: 55 }, (_, i) => ({ beat: i / 32, hz: hzFromMidi(60), amp: 0.1 }));
  const grade = observations => gradePerformance({ expected, observations, tempo: 96, strictTiming: true }).passedCount;
  assert.equal(grade(frames), 1);
  assert.equal(grade(frames.filter(frame => frame.beat < 0.8 || frame.beat >= 1)), 2);
  assert.equal(grade(frames.map(frame => ({ ...frame, amp: frame.beat >= 0.9 && frame.beat < 1 ? 0.02 : 0.1 }))), 2);
  const countIn = frames.slice(0, 32).map(frame => ({ ...frame, beat: frame.beat - 1 }));
  assert.equal(grade([...countIn, ...frames]), 0);
});

test('timed Master grades quiet confident horns and ignores low-confidence noise', () => {
  const lesson = CHART_MODULES[0].lessons.find(lesson => lesson.chartTimed);
  const session = createSession({ lessonId: lesson.id, swing: false });
  const notes = expectedNotesFor(session);
  const quiet = synthTrack(notes, { amp: 0.004 }).map(frame => ({ ...frame, confidence: 0.95 }));
  assert.equal(gradeSession(session, quiet).passed, true);
  const noise = synthTrack(notes, { amp: 0.004 }).map(frame => ({ ...frame, confidence: 0.3 }));
  assert.equal(gradeSession(session, noise).percent, 0);
});

test('chart dings once for each fully correct bar and resumes feedback after a miss', () => {
  const lesson = CHART_MODULES[0].lessons.find(lesson => lesson.chartTimed);
  const session = createSession({ lessonId: lesson.id, swing: false });
  const notes = expectedNotesFor(session).filter(note => note.bar <= 3);
  const pitched = notes.filter((note, index) => note.bar !== 2 || index % 4 !== 0);
  const observations = [];
  const dingBeats = [];
  const check = chartPassFeedback(notes, session.tempo);
  for (const frame of synthTrack(pitched)) {
    observations.push(frame);
    if (check(frame.beat, observations)) dingBeats.push(frame.beat);
  }
  assert.deepEqual(dingBeats, [1, 3].map(bar => notes.filter(note => note.bar === bar).at(-1).startBeat));

  const firstBar = notes.filter(note => note.bar === 1);
  const lastBeat = firstBar.at(-1).startBeat;
  const learnCheck = chartPassFeedback(firstBar, session.tempo, { writtenOctave: true });
  assert.equal(learnCheck(lastBeat, synthTrack(firstBar, { octave: 1 })), false);
  assert.equal(learnCheck(lastBeat, synthTrack(firstBar)), true);
});

test('chart tier follows the selected key and sequence advancement preserves its starting tier', () => {
  const lessons = CHART_MODULES[0].lessons;
  const timed = lessons.find(lesson => lesson.chartTimed);
  const progress = recordQuizPass(emptyMastery(), timed.id, 'C');
  for (const [startKeyId, tier] of [['C', 'gold'], ['D', 'black']]) {
    assert.equal(sessionVinylTier(createSession({ lessonId: timed.id, startKeyId }), progress), tier);
  }
  const sequence = lessons.filter(lesson => lesson.kind === 'learn')
    .map(lesson => ({ lessonId: lesson.id, keyId: lesson.defaultKeyId }));
  let session = { ...createSession({ lessonId: sequence[0].lessonId, startKeyId: sequence[0].keyId }),
    sequence, sequenceIndex: 0, startVinylTier: 'bronze' };
  for (let i = 1; i < sequence.length; i++) {
    session = advanceKey(session);
    assert.equal(session.startVinylTier, 'bronze');
  }
});
