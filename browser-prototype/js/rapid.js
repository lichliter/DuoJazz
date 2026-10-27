/**
 * Rapid-fire Play transitions.
 * Pass shows a check, then the next key. Fail stays on the key.
 * Auto re-arms on its own. Pause keeps the current key.
 */

import { advanceKey, currentCard, currentKeyId } from "./session.js";

export const CHECK_MS = 500;
export const RETRY_MS = 900;

export function shouldRecordMastery(session, passed) {
  return Boolean(session && passed && session.studyMode === "practice");
}

export function isLastRapidKey(session) {
  if (!session) return true;
  if (session.keyMode === "one") return true;
  return session.keyIndex + 1 >= session.keyQueue.length;
}

function passedRow(session) {
  return {
    cardId: currentCard(session),
    outcome: "passed",
    graded: true,
    passed: true,
    percent: 100,
    correction: null,
  };
}

/**
 * After the check mark. The last key opens wrap-up.
 * Otherwise the next key is armed, and Auto listens again.
 */
export function afterPass(session, { auto = true } = {}) {
  if (!session) return { session, autoStart: false, phase: "idle", keyId: null };
  if (isLastRapidKey(session)) {
    return {
      session: {
        ...session,
        screen: "wrapup",
        demo: false,
        cardResults: [passedRow(session)],
      },
      autoStart: false,
      phase: "wrapup",
      keyId: currentKeyId(session),
    };
  }
  const next = advanceKey({ ...session, demo: false, screen: "session" });
  return {
    session: next,
    autoStart: Boolean(auto),
    phase: auto ? "listening" : "idle",
    keyId: currentKeyId(next),
  };
}

/** Fail stays on this key. Auto listens again; otherwise wait for Play. */
export function afterFail(session, { auto = true, hint = "1st note" } = {}) {
  return {
    session: session ? { ...session, screen: "session", demo: false } : session,
    autoStart: Boolean(auto),
    phase: auto ? "listening" : "idle",
    hint,
    keyId: session ? currentKeyId(session) : null,
    keyIndex: session?.keyIndex ?? 0,
  };
}

/** Pause stops listening and does not move the key. */
export function pausePosition(session) {
  return {
    session: session ? { ...session, screen: "session" } : session,
    phase: "idle",
    autoStart: false,
    keyId: session ? currentKeyId(session) : null,
    keyIndex: session?.keyIndex ?? 0,
  };
}

export function rapidFireButton({ listening = false, demoPlaying = false, pausedDemo = false } = {}) {
  if (demoPlaying) return { id: "pause", label: "Pause" };
  if (pausedDemo) return { id: "resume", label: "Resume" };
  if (listening) return { id: "pause", label: "Pause" };
  return { id: "play", label: "Play" };
}
