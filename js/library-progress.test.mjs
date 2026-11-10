import test from 'node:test';
import assert from 'node:assert/strict';
import { gradedMasteryPercent } from './library-progress.js';
test('counts graded lesson/key passes without integration or revealed-note credit', () => {
  const lessons = [{id:'learn',kind:'learn'}, {id:'master',kind:'master'}, {id:'tune',kind:'integrate'}];
  const progress = {lessons:{learn:{passedKeys:['C','D']}, master:{passedKeys:['C'],learnedKeys:['D']}}};
  assert.equal(gradedMasteryPercent(lessons, progress, () => ['C','D']), 75);
  assert.equal(gradedMasteryPercent(lessons, progress, () => ['C']), 100);
  assert.equal(gradedMasteryPercent(lessons, {}, () => ['C']), 0);
  assert.equal(gradedMasteryPercent([], progress, () => ['C']), 0);
});
