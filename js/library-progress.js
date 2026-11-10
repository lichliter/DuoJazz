/** Earned passes across graded lesson/key targets; revealed Master notes do not count. */
export function gradedMasteryPercent(lessons, progress, keysForLesson) {
  let earned = 0, total = 0;
  for (const lesson of lessons) {
    if (!['learn', 'master'].includes(lesson.kind)) continue;
    const keys = keysForLesson(lesson);
    total += keys.length;
    earned += keys.filter(key => progress.lessons?.[lesson.id]?.passedKeys?.includes(key)).length;
  }
  return total ? Math.floor(100 * earned / total) : 0;
}
