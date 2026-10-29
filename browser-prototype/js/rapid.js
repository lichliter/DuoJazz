/**
 * Rapid-fire Play transitions.
 * A pass covers the session with a check, then shows the next lick
 * before listening. A miss stays on the key. Pause keeps the current key,
 * except during the celebration, where it still advances and does not listen.
 */

import { advanceKey, currentCard, currentKeyId, markKeyOutcome, skipCard, skipResult } from "./session.js";

export const CELEBRATE_MS = 2000;
export const READ_MS = 500;
export const RETRY_MS = 900;

export function shouldRecordMastery(session, passed, { notesShown = false } = {}) {
  return Boolean(session && passed && session.studyMode === "practice" && !notesShown);
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
  const marked = markKeyOutcome(session, "passed");
  if (isLastRapidKey(marked)) {
    return {
      session: {
        ...marked,
        screen: "wrapup",
        demo: false,
        cardResults: [passedRow(marked)],
      },
      autoStart: false,
      phase: "wrapup",
      keyId: currentKeyId(marked),
    };
  }
  const next = advanceKey({ ...marked, demo: false, screen: "session" });
  return {
    session: next,
    autoStart: Boolean(auto),
    phase: auto ? "listening" : "idle",
    keyId: currentKeyId(next),
  };
}

/**
 * Timed steps after a pass.
 * celebrate holds the key just passed. reveal shows the next lick.
 * listening starts after the read beat when Auto is on.
 * skip drops the celebration wait. pause advances and does not listen.
 */
export function passSchedule(session, { auto = true, skip = false, pause = false } = {}) {
  const passedKeyId = session ? currentKeyId(session) : null;
  const advanced = afterPass(session, { auto: false });
  const last = advanced.session?.screen === "wrapup";
  const arm = Boolean(auto) && !pause && !last;
  const steps = [
    {
      phase: "celebrate",
      ms: skip || pause ? 0 : CELEBRATE_MS,
      keyId: passedKeyId,
      screen: "session",
    },
    {
      phase: last ? "wrapup" : "reveal",
      ms: arm ? READ_MS : 0,
      keyId: advanced.session ? currentKeyId(advanced.session) : null,
      screen: advanced.session?.screen ?? "session",
    },
  ];
  if (!last) {
    steps.push({
      phase: arm ? "listening" : "idle",
      ms: 0,
      keyId: advanced.session ? currentKeyId(advanced.session) : null,
      screen: "session",
      autoStart: arm,
    });
  }
  return {
    steps,
    session: advanced.session,
    autoStart: arm,
    passedKeyId,
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

/**
 * Skip the current key with no result screen in between.
 * Auto listens on the next key. Auto off leaves that key idle.
 * The last key opens wrap-up. The result is always Skipped, never mastery.
 */
export function skipAhead(session, { auto = true } = {}) {
  const result = session ? skipResult(session) : null;
  const next = skipCard(session);
  const onSession = next?.screen === "session";
  const arm = Boolean(auto && onSession);
  return {
    session: next,
    result,
    autoStart: arm,
    phase: next?.screen === "wrapup" ? "wrapup" : (arm ? "listening" : "idle"),
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

const MIC_RELEASE = new Set(["pause", "hear", "leave", "wrapup", "hide"]);

/**
 * "open" calls getUserMedia. "reset" keeps that stream and only resets the follower.
 * Pause, Hear it, leaving, wrap-up, and page hide release the tracks.
 */
export function rapidMicStep(live, reason) {
  if (MIC_RELEASE.has(reason)) return "release";
  if (reason === "attempt") return live ? "reset" : "open";
  return "keep";
}

export function rapidFireButton({ listening = false, demoPlaying = false, pausedDemo = false } = {}) {
  if (demoPlaying) return { id: "pause", label: "Pause" };
  if (pausedDemo) return { id: "resume", label: "Resume" };
  if (listening) return { id: "pause", label: "Pause" };
  return { id: "record", label: "Record" };
}

/** Hear it icon. A running demo shows a stop square; the center Record button stays Record. */
export function hearItButton({ active = false } = {}) {
  if (active) return { label: "Stop", title: "Stop", icon: "stop" };
  return { label: "Hear it", title: "Hear it", icon: "play" };
}

/**
 * Hear it only starts or stops demo audio.
 * Tapping Record while a demo is playing stops it, then listens.
 * Tapping Hear it while listening is the caller's cue to release the mic first.
 */
export function hearDemoGesture({ active = false, record = false } = {}) {
  if (active && record) return { stop: true, listen: true, play: false, releaseMic: false };
  if (active) return { stop: true, listen: false, play: false, releaseMic: false };
  return { stop: false, listen: false, play: true, releaseMic: true };
}
