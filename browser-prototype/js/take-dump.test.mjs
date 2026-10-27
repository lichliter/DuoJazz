import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildTakeRecord,
  closeTakeRecorder,
  createTakeLog,
  deliverTake,
  openTakeRecorder,
  pushTakeFrame,
} from "./take-dump.js";

function fakeDocument() {
  const link = {
    download: "",
    href: "",
    rel: "",
    clicked: false,
    click() {
      this.clicked = true;
    },
    remove() {},
  };
  return {
    link,
    body: { appendChild() {} },
    createElement() {
      return link;
    },
  };
}

test("a take record keeps the mic, the frames, and the result", () => {
  const record = buildTakeRecord({
    userAgent: "iPad",
    sampleRate: 48000,
    trackSettings: { autoGainControl: true, echoCancellation: false, noiseSuppression: false },
    instrument: { id: "trombone", label: "Trombone" },
    lesson: { id: "learn-lick", title: "Lesson 1" },
    key: "G",
    expectedMidis: [69, 67],
    frames: [{ t: 10, hz: 440, amp: 0.004, confidence: 0.91, extra: true }],
    result: { passed: false, reason: "silence", hint: "2nd note" },
    audioBase64: "aGVsbG8=",
    audioMimeType: "audio/mp4",
  });
  assert.equal(record.userAgent, "iPad");
  assert.equal(record.sampleRate, 48000);
  assert.equal(record.trackSettings.autoGainControl, true);
  assert.equal(record.instrument.id, "trombone");
  assert.equal(record.lesson.id, "learn-lick");
  assert.equal(record.key, "G");
  assert.deepEqual(record.expectedMidis, [69, 67]);
  assert.deepEqual(record.frames[0], { t: 10, hz: 440, amp: 0.004, confidence: 0.91 });
  assert.equal(record.result.hint, "2nd note");
  assert.equal(record.audioBase64, "aGVsbG8=");
  assert.equal(record.audioMimeType, "audio/mp4");
});

test("Save take uses a blob download, then the share sheet when that is blocked", async () => {
  const record = buildTakeRecord({
    userAgent: "iPad",
    frames: [{ t: 0, hz: 440, amp: 0.004, confidence: 0.9 }],
    result: { passed: true },
  });
  const doc = fakeDocument();
  const shared = [];
  const nav = {
    share: async (payload) => {
      shared.push(payload);
    },
    canShare: () => true,
  };
  const downloaded = await deliverTake(record, {
    document: doc,
    navigator: nav,
    filename: "duojazz-take.json",
  });
  assert.equal(downloaded.method, "download");
  assert.equal(doc.link.clicked, true);
  assert.equal(doc.link.download, "duojazz-take.json");
  assert.equal(shared.length, 0);

  const blocked = fakeDocument();
  blocked.link.click = () => {
    throw new Error("download blocked");
  };
  const sharedTake = await deliverTake(record, {
    document: blocked,
    navigator: nav,
    filename: "duojazz-take.json",
  });
  assert.equal(sharedTake.method, "share");
  assert.equal(shared.length, 1);
  assert.equal(shared[0].files.length, 1);
  assert.equal(shared[0].files[0] instanceof File, true);
  assert.equal(shared[0].files[0].name, "duojazz-take.json");
  assert.equal(shared[0].files[0].type, "application/json");
});

test("the raw mic is recorded when MediaRecorder exists", async () => {
  class FakeRecorder {
    constructor(stream) {
      this.stream = stream;
      this.state = "inactive";
      this.mimeType = "audio/mp4";
      this.listeners = {};
    }

    addEventListener(type, fn) {
      this.listeners[type] ??= [];
      this.listeners[type].push(fn);
    }

    start() {
      this.state = "recording";
    }

    requestData() {}

    stop() {
      this.state = "inactive";
      const data = new Blob(["mic"], { type: this.mimeType });
      for (const fn of this.listeners.dataavailable ?? []) fn({ data });
      for (const fn of this.listeners.stop ?? []) fn();
    }
  }

  const log = createTakeLog();
  pushTakeFrame(log, { t: 12, hz: 440, amp: 0.004, confidence: 0.88, rms: 0.004 });
  openTakeRecorder(log, { id: "mic" }, FakeRecorder);
  assert.equal(log.recorder.state, "recording");
  const blob = await closeTakeRecorder(log);
  assert.equal(blob?.type, "audio/mp4");
  assert.equal(blob?.size > 0, true);
  assert.deepEqual(log.frames, [{ t: 12, hz: 440, amp: 0.004, confidence: 0.88 }]);
  const again = await closeTakeRecorder(log);
  assert.equal(again, blob);
});

test("debug mode shows a live level and Save take", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  const worklet = await readFile(new URL("./pitch-worklet.js", import.meta.url), "utf8");
  assert.match(html, /id="debug-live"/);
  assert.match(html, /id="save-take"/);
  assert.match(html, /Save take/);
  assert.match(app, /formatLiveLine/);
  assert.match(app, /deliverTake/);
  assert.match(app, /openTakeRecorder/);
  assert.match(worklet, /0\.0015/);
  assert.match(worklet, /1 - d\[tau\]/);
  assert.match(worklet, /confidence/);
});
