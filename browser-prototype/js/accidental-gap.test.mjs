import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chartGrid, chartKeyChoices } from "./charts.js";
import { chorusChords, getKey } from "./music.js";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

function chromeBin() {
  return CHROME_CANDIDATES.find((path) => existsSync(path)) ?? null;
}

function tally(names) {
  const counts = new Map();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return counts;
}

function sameCounts(actual, expected) {
  const left = tally(actual);
  const right = tally(expected);
  if (left.size !== right.size) return false;
  for (const [name, count] of right) {
    if (left.get(name) !== count) return false;
  }
  return true;
}

const MEASURE = `(() => {
  const accidental = /[♭♯♮𝄫𝄪]/u;
  const space = /\\s/u;
  function rectOf(node, index) {
    const range = document.createRange();
    range.setStart(node, index);
    range.setEnd(node, index + 1);
    const rect = range.getClientRects()[0];
    return rect ? { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height } : null;
  }
  function hostOf(node) {
    const el = node.parentElement;
    if (!el || el.closest("[hidden]")) return null;
    return el.closest(".chord-symbol, .harm, .music-label, #session-key, #chart-heading-meta");
  }
  const groups = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const host = hostOf(node);
    if (host) {
      const style = getComputedStyle(host);
      if (style.display !== "none" && style.visibility !== "hidden") {
        let chars = groups.get(host);
        if (!chars) {
          chars = [];
          groups.set(host, chars);
        }
        const text = node.textContent ?? "";
        const fontSize = parseFloat(style.fontSize) || 16;
        for (let i = 0; i < text.length; i += 1) {
          const rect = rectOf(node, i);
          if (!rect || (rect.width === 0 && rect.height === 0)) continue;
          chars.push({ ch: text[i], rect, fontSize, chord: host.matches(".chord-symbol, .harm") });
        }
      }
    }
    node = walker.nextNode();
  }
  const gaps = [];
  for (const chars of groups.values()) {
    chars.forEach((item, index) => {
      if (!accidental.test(item.ch)) return;
      for (const neighbor of [chars[index - 1], chars[index + 1]]) {
        if (!neighbor) continue;
        const gapPx = neighbor === chars[index + 1]
          ? neighbor.rect.left - item.rect.right
          : item.rect.left - neighbor.rect.right;
        const fontSize = item.fontSize;
        gaps.push({
          pair: neighbor === chars[index + 1] ? item.ch + neighbor.ch : neighbor.ch + item.ch,
          gapPx: Math.round(gapPx * 100) / 100,
          gapEm: Math.round((gapPx / fontSize) * 1000) / 1000,
          dTopEm: Math.round(((item.rect.top - neighbor.rect.top) / fontSize) * 1000) / 1000,
          dBotEm: Math.round(((item.rect.bottom - neighbor.rect.bottom) / fontSize) * 1000) / 1000,
          space: space.test(neighbor.ch),
          chord: item.chord,
          sample: chars.map((entry) => entry.ch).join(""),
        });
      }
    });
  }
  const sample = document.querySelector(".chord-symbol, #chart-keys .music-label, .harm");
  return {
    fontReady: document.fonts.check('700 16px "DuoJazz Music"') && document.fonts.check('400 16px "DuoJazz Music"'),
    family: sample ? getComputedStyle(sample).fontFamily : "",
    chips: [...document.querySelectorAll("#chart-keys .chip")].map((el) => el.textContent),
    chords: [...document.querySelectorAll(".chord-symbol")].map((el) => el.textContent),
    harms: [...document.querySelectorAll(".harm")].map((el) => (el.textContent ?? "").replace(/\\s+/g, "")),
    sessionKey: document.querySelector("#session-key")?.textContent ?? "",
    gaps,
  };
})()`;

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let next = 0;
  const pending = new Map();
  const opened = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", () => reject(new Error("Chrome DevTools socket failed")));
  });
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    pending.get(message.id)(message);
    pending.delete(message.id);
  });
  async function send(method, params = {}, timeout = 20000) {
    await opened;
    const id = ++next;
    ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`${method} timed out`)), timeout);
      pending.set(id, (message) => {
        clearTimeout(timer);
        if (message.error) reject(new Error(`${method}: ${JSON.stringify(message.error)}`));
        else resolve(message.result);
      });
    });
  }
  return { send, close: () => ws.close() };
}

async function waitForJson(url) {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {
      // Chrome is still booting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`No Chrome debugging target at ${url}`);
}

test("rendered accidentals keep a 0 to 0.15em gap", { skip: !chromeBin() && "Chrome is not available", timeout: 180000 }, async () => {
  const port = 8766;
  const debugPort = 9344;
  const root = new URL("..", import.meta.url);
  const profile = await mkdtemp(join(tmpdir(), "duojazz-gap-"));
  const server = spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], {
    cwd: root,
    stdio: "ignore",
  });
  const chrome = spawn(chromeBin(), [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--hide-scrollbars",
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${debugPort}`,
    "--remote-allow-origins=*",
    "about:blank",
  ], { stdio: "ignore" });
  const shots = existsSync("/opt/cursor/artifacts") ? "/opt/cursor/artifacts" : null;
  if (shots) mkdirSync(shots, { recursive: true });
  let client;
  try {
    const targets = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`);
    const page = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
    assert.ok(page, "Chrome did not expose a page target");
    client = connect(page.webSocketDebuggerUrl);
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    const base = `http://127.0.0.1:${port}`;
    const pages = [
      {
        name: "blue-bossa-chart",
        path: "/?tab=charts&tune=blue-bossa",
        ready: `document.querySelector("#chart-heading-title")?.textContent === "Blue Bossa" && document.querySelectorAll("#chart-keys .chip").length === 12 && document.querySelectorAll(".chord-symbol").length > 0`,
        shot: true,
        expectChips: chartKeyChoices("minor").map((choice) => choice.label),
        expectChords: chartGrid("blue-bossa").rows.flatMap((row) => row.bars.flatMap((bar) => bar.chords.map((chord) => chord.name))),
      },
      {
        name: "recordame-chart",
        path: "/?tab=charts&tune=recordame",
        ready: `document.querySelector("#chart-heading-title")?.textContent === "Recordame" && document.querySelectorAll("#chart-keys .chip").length === 12 && document.querySelectorAll(".chord-symbol").length > 0`,
        expectChips: chartKeyChoices("minor").map((choice) => choice.label),
        expectChords: chartGrid("recordame").rows.flatMap((row) => row.bars.flatMap((bar) => bar.chords.map((chord) => chord.name))),
      },
      {
        name: "cry-me-lesson-4",
        path: "/?screen=session&lesson=cmar-integrate-blue-bossa&card=learn&key=C",
        ready: `document.querySelector("#session-title")?.textContent === "Cry Me a River · Lesson 4" && document.querySelectorAll(".harm").length > 0`,
        shot: true,
        expectHarms: chorusChords(getKey("C"), "concert", "cmar-blue-bossa").map((chord) => chord.name),
      },
      {
        name: "cry-me-a-river",
        path: "/?screen=session&lesson=cmar-integrate-cry-me&card=learn&key=Eb",
        ready: `document.querySelector("#session-title")?.textContent === "Cry Me a River · Lesson 7" && document.querySelectorAll(".harm").length > 0`,
        expectHarms: chorusChords(getKey("Eb"), "concert", "cmar-cry-me").map((chord) => chord.name),
      },
    ];
    const viewports = [
      { width: 1024, height: 1366 },
      { width: 390, height: 844 },
    ];
    const gaps = [];
    for (const viewport of viewports) {
      await client.send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        mobile: viewport.width < 700,
      });
      for (const spec of pages) {
        await client.send("Page.navigate", { url: `${base}${spec.path}` });
        const started = Date.now();
        let ready = false;
        while (Date.now() - started < 40000) {
          const state = await client.send("Runtime.evaluate", {
            expression: `document.readyState === "complete" && ${spec.ready}`,
            returnByValue: true,
          });
          if (state.result?.value) {
            ready = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        assert.equal(ready, true, `${spec.name} at ${viewport.width}x${viewport.height} did not render`);
        await client.send("Runtime.evaluate", {
          expression: `Promise.all([document.fonts.load('400 16px "DuoJazz Music"'), document.fonts.load('700 16px "DuoJazz Music"'), document.fonts.ready])`,
          awaitPromise: true,
          returnByValue: true,
        });
        const measured = await client.send("Runtime.evaluate", {
          expression: MEASURE,
          returnByValue: true,
        });
        assert.equal(measured.exceptionDetails, undefined, `${spec.name} measure threw`);
        const value = measured.result.value;
        assert.equal(value.fontReady, true, `${spec.name} DuoJazz Music did not load`);
        assert.match(value.family, /DuoJazz Music/, `${spec.name} computed family ${value.family}`);
        if (spec.expectChips) assert.deepEqual(value.chips, spec.expectChips, spec.name);
        if (spec.expectChords) {
          assert.equal(sameCounts(value.chords, spec.expectChords), true, `${spec.name} chords ${value.chords.join(" | ")}`);
        }
        if (spec.expectHarms) {
          const rendered = value.harms.join(" ");
          for (const name of spec.expectHarms) {
            assert.equal(rendered.includes(name.replace(/\s+/g, "")), true, `${spec.name} missing ${name} in ${rendered}`);
          }
        }
        for (const gap of value.gaps) {
          gaps.push({ ...gap, page: spec.name, viewport: `${viewport.width}x${viewport.height}` });
          assert.equal(gap.gapPx >= -0.75, true, `${spec.name} ${gap.sample} ${gap.pair} overlaps by ${gap.gapPx}px`);
          assert.equal(gap.gapEm <= 0.15, true, `${spec.name} ${gap.sample} ${gap.pair} gap ${gap.gapEm}em`);
          assert.equal(Math.abs(gap.dTopEm) <= 0.15, true, `${spec.name} ${gap.sample} ${gap.pair} vertical ${gap.dTopEm}em`);
          if (gap.chord) assert.equal(gap.space, false, `${spec.name} chord ${gap.sample} has a space beside ${gap.pair}`);
        }
        if (shots && spec.shot) {
          const image = await client.send("Page.captureScreenshot", { format: "png" });
          writeFileSync(join(shots, `${spec.name}-${viewport.width}x${viewport.height}.png`), Buffer.from(image.data, "base64"));
        }
      }
    }
    const ems = gaps.map((gap) => gap.gapEm);
    assert.ok(ems.length > 0, "no accidentals were measured");
    const summary = { count: ems.length, minEm: Math.min(...ems), maxEm: Math.max(...ems) };
    writeFileSync(join(shots ?? tmpdir(), "accidental-gaps.json"), JSON.stringify(summary, null, 2));
    console.log(`accidental gaps n=${summary.count} min=${summary.minEm}em max=${summary.maxEm}em`);
  } finally {
    client?.close();
    chrome.kill("SIGTERM");
    server.kill("SIGTERM");
  }
});
