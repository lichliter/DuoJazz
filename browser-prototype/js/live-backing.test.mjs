import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { scheduleChorus } from "./music.js";
import {
  SAMPLE_FALLBACK_NOTICE,
  countInEvents,
  eventIsAudibleFrom,
  livePlaybackEvents,
  mergeLiveBacking,
  rootlessShell,
  voicingHasGuideTones,
} from "./sound-band.js";
import { createSession, jumpToCard, sessionAudioConfig } from "./session.js";
import { wrapPc } from "./music.js";

function melodyBeats(events) {
  return events.filter((event) => event.type === "melody").map((event) => event.beat);
}

test("New-simple live backing replaces synth chords and keeps melody timing", () => {
  const config = sessionAudioConfig(createSession({ lessonId: "learn-lick", tempo: 96, swing: true }));
  const chorus = scheduleChorus(config);
  const live = livePlaybackEvents(config, { sampled: true });
  assert.deepEqual(melodyBeats(live), melodyBeats(chorus));
  assert.equal(live.some((event) => event.type === "chord"), false);
  assert.ok(live.some((event) => event.type === "piano"));
  assert.ok(live.some((event) => event.type === "bass"));
  assert.ok(live.some((event) => event.type === "drum"));
  assert.equal(live.find((event) => event.type === "end").beat, chorus.find((event) => event.type === "end").beat);
  assert.equal(live.find((event) => event.type === "end").beat, config.lengthBeats);
});

test("synth fallback keeps the old chord pad", () => {
  const config = sessionAudioConfig(createSession({ lessonId: "learn-lick" }));
  const live = livePlaybackEvents(config, { sampled: false });
  assert.ok(live.some((event) => event.type === "chord"));
  assert.equal(live.some((event) => event.type === "piano"), false);
  assert.equal(live.some((event) => event.type === "drum"), false);
  assert.match(SAMPLE_FALLBACK_NOTICE, /synth backing/);
});

test("Play, memory, and tune pages keep cue/melody policy with sampled backing", () => {
  const play = sessionAudioConfig(jumpToCard(createSession({ lessonId: "learn-lick" }), "play"));
  const playLive = livePlaybackEvents(play, { sampled: true });
  assert.equal(playLive.filter((event) => event.type === "melody").length, 0);
  assert.ok(playLive.some((event) => event.type === "piano"));

  const memory = sessionAudioConfig(jumpToCard(createSession({ lessonId: "learn-lick" }), "quiz"));
  const memoryLive = livePlaybackEvents(memory, { sampled: true });
  assert.equal(memoryLive.filter((event) => event.type === "melody").length, 0);
  assert.ok(memoryLive.some((event) => event.type === "drum"));

  const integratePlay = sessionAudioConfig(jumpToCard(createSession({ lessonId: "integrate-minor-home" }), "play"));
  const helpLive = livePlaybackEvents(integratePlay, { sampled: true });
  assert.ok(helpLive.some((event) => event.type === "cue"));
  assert.equal(helpLive.filter((event) => event.type === "melody").length, 0);

  const tune = sessionAudioConfig(createSession({ lessonId: "tune-st-thomas", tempo: 140 }));
  const tuneLive = livePlaybackEvents(tune, { sampled: true });
  assert.ok(tuneLive.some((event) => event.type === "piano"));
  assert.ok(tuneLive.some((event) => event.type === "drum"));
  assert.equal(tuneLive.find((event) => event.type === "end").beat, tune.lengthBeats);
});

test("tempo, swing, and metronome stay on the live config", () => {
  const swung = sessionAudioConfig(createSession({ lessonId: "learn-lick", tempo: 140, swing: true, metronome: true }));
  assert.equal(swung.tempo, 140);
  assert.equal(swung.swing, true);
  assert.equal(swung.includeClick, true);
  const live = livePlaybackEvents(swung, { sampled: true });
  assert.ok(live.some((event) => event.type === "click"));
  const straight = sessionAudioConfig(createSession({ lessonId: "learn-lick", tempo: 80, swing: false }));
  assert.equal(straight.tempo, 80);
  assert.equal(straight.swing, false);
});

test("count-in is ride/hat when sampled and clicks when falling back", () => {
  const kit = countInEvents({ sampled: true });
  assert.equal(kit.length, 4);
  assert.ok(kit.every((event) => event.beat < 0 && event.swing === false));
  assert.equal(kit[3].drum, "ride");
  assert.ok(kit.slice(0, 3).every((event) => event.drum === "hatClosed"));
  const clicks = countInEvents({ sampled: false });
  assert.ok(clicks.every((event) => event.type === "click" && event.strong));
});

test("anticipated comps just before a resume beat still schedule", () => {
  assert.equal(eventIsAudibleFrom({ type: "piano", beat: -0.5 }, 0), true);
  assert.equal(eventIsAudibleFrom({ type: "end", beat: 8 }, 0), false);
  assert.equal(eventIsAudibleFrom({ type: "bass", beat: 8 }, 8), true);
});

test("merge keeps melody and drops synth chords", () => {
  const merged = mergeLiveBacking(
    [
      { type: "chord", beat: 0, midis: [60] },
      { type: "melody", beat: 0, midi: 57 },
      { type: "end", beat: 8 },
    ],
    [
      { type: "piano", beat: 0, midis: [52, 55, 62] },
      { type: "bass", beat: 0, midi: 36 },
      { type: "end", beat: 8 },
    ],
  );
  assert.equal(merged.some((event) => event.type === "chord"), false);
  assert.equal(merged.filter((event) => event.type === "melody").length, 1);
  assert.ok(merged.some((event) => event.type === "piano"));
});

test("app forms with half-diminished still get guide-tone shells", () => {
  const shell = rootlessShell(2, "minor7b5");
  assert.equal(voicingHasGuideTones(shell, 2, "minor7b5"), true);
  assert.equal(shell.map((midi) => wrapPc(midi)).includes(2), false);
});

test("play button has a loading state and sound.html stays unlinked", async () => {
  const hig = await readFile(new URL("../css/hig.css", import.meta.url), "utf8");
  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(hig, /data-state="loading"/);
  assert.match(hig, /play-round-spin/);
  assert.doesNotMatch(index, /sound\.html/);
});
