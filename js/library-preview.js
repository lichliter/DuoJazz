import { Transport } from './audio.js';
import { engraveMei } from './engrave.js';
import { notationLayout } from './lesson.js';
import { phraseMEI } from './mei.js';
import { getKey } from './music.js';
import { lessonById } from './registry.js';
import { createSession, demoAudioConfig, sessionEngraveSpec } from './session.js';

function previewSession(module, prefs) {
  const lesson = module.lessons.find(item => item.kind === 'learn');
  return createSession({
    lessonId: lesson.id,
    startKeyId: lesson.defaultKeyId,
    instrumentId: prefs.instrumentId,
    tempo: prefs.lessons[lesson.id]?.tempo ?? prefs.tempo,
    swing: prefs.swing,
    melodyRegister: prefs.lessons[lesson.id]?.melodyRegister ?? 0,
  });
}

export function setupLibraryPreview(getPrefs) {
  const player = new Transport();
  let pendingSamples;
  let generation = 0;
  const previewAudio = {
    onEnded: () => {},
    prepare() {
      pendingSamples ??= player.prepareBacking({ sampleSet: 'piano' }).finally(() => {
        pendingSamples = null;
      });
      return pendingSamples;
    },
    async play(module) {
      const request = ++generation;
      await player.ensure();
      if (request !== generation) return;
      await previewAudio.prepare();
      if (request !== generation) return;
      const config = demoAudioConfig(previewSession(module, getPrefs()));
      await player.start({ ...config, includeCue: false }, { countIn: false });
    },
    stop() {
      generation += 1;
      player.stop();
    },
  };
  player.onEnded = () => previewAudio.onEnded();

  async function engravePreview(target, module) {
    const session = previewSession(module, getPrefs());
    const style = getComputedStyle(target);
    const width = target.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const layout = notationLayout({
      staffWidth: width,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      showPhraseNotation: true,
      phraseBars: sessionEngraveSpec(session).phraseBars,
    });
    if (width < 480) layout.barsPerLine = Math.min(layout.barsPerLine, 2);
    const mei = phraseMEI(getKey(session.startKeyId), session.displayMode, lessonById(session.lessonId).applicationId,
      session.clef, session.melodyRegister, { barsPerLine: layout.barsPerLine });
    await engraveMei(target, mei, { width, layout });
  }

  return { previewAudio, engravePreview };
}
