import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createCloudMock, launchBrowser, poll, withAppUrl } from './lib/browser-harness.mjs';

await mkdir('artifacts', { recursive: true });
const cloud = createCloudMock();

async function device(browser, appUrl, viewport = { width: 1100, height: 950 }) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block', recordVideo: { dir: 'artifacts/library-videos' } });
  await cloud.installRoutes(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(appUrl, { waitUntil: 'networkidle' });
  await page.locator('#account-chip').click();
  return { context, page, errors };
}

const results = [];
await withAppUrl(async (appUrl) => {
  const browser = await launchBrowser();
  try {
    const a = await device(browser, appUrl, { width: 390, height: 844 });
    await a.page.locator('#settings-close').click();
    await a.page.locator('#lesson-list .module-banner').click();
    await a.page.locator('[data-library-tab=charts]').click();
    await a.page.locator('#library-browse').click();
    await a.page.getByRole('button', { name: 'Add Cry Me a River', exact: true }).click();
    await a.page.getByRole('button', { name: 'Open Cry Me a River', exact: true }).click();
    assert.deepEqual(await a.page.locator('#chart-tree .sleeve-title').allTextContents(), ['Learn', 'Practice', 'Master']);
    await a.page.screenshot({ animations: 'disabled', path: 'artifacts/chart-three-modes.png', fullPage: true });
    await a.page.locator('#chart-tree .sleeve-node').nth(2).click();
    const id = await a.page.evaluate(() => window.__DUOJAZZ__.getSession().lessonId);
    assert.ok(id.endsWith('-timed-master'));
    assert.equal(await a.page.locator('#notation').isVisible(), false);
    assert.equal(await a.page.locator('#show-notes').isVisible(), false);
    assert.equal(await a.page.locator('#hear-it').isVisible(), false);
    assert.equal(await a.page.locator('#continue-btn').isVisible(), false);
    assert.equal(await a.page.locator('#auto-toggle').isVisible(), false);
    await a.page.evaluate(async () => {
      navigator.mediaDevices.getUserMedia = async () => {
        const ctx = window.__DUOJAZZ__.transport.ctx;
        const dest = ctx.createMediaStreamDestination();
        window.chartTestMic = { ctx, dest };
        return dest.stream;
      };
    });
    await a.page.locator('#primary').click();
    await a.page.waitForFunction(() => window.__DUOJAZZ__.transport.playing);
    assert.equal(await a.page.locator('#primary').getAttribute('aria-label'), 'Stop run');
    await a.page.evaluate(async () => {
      const { expectedNotesFor, hzFromMidi } = await import('/js/grade.js');
      const app = window.__DUOJAZZ__, session = app.getSession(), transport = app.transport;
      const { ctx, dest } = window.chartTestMic;
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      gain.gain.value = 0; osc.connect(gain); gain.connect(dest);
      const notes = expectedNotesFor(session), seconds = 60 / session.tempo;
      notes.forEach((note, index) => {
        const t = transport.startedAt + note.startBeat * seconds;
        osc.frequency.setValueAtTime(hzFromMidi(note.midi + (index === 0 ? 1 : 0)), t);
        gain.gain.setValueAtTime(0.3, t); gain.gain.setValueAtTime(0, t + note.beats * seconds * 0.85);
      });
      osc.start(); osc.stop(transport.startedAt + transport.chorusLengthBeats * seconds + 0.1);
    });
    await a.page.waitForFunction(() => window.__DUOJAZZ__.transport.snapshot().bar >= 3);
    assert.equal(await a.page.locator('#screen-wrapup').isVisible(), false);
    assert.equal(await a.page.locator('#grade-line').isVisible(), false);
    await a.page.screenshot({ animations: 'disabled', path: 'artifacts/chart-master-memory.png' });
    await a.page.locator('#screen-wrapup').waitFor({ state: 'visible', timeout: 40000 });
    const result = await a.page.evaluate(() => window.__DUOJAZZ__.getSession().cardResults[0]);
    assert.ok(result.percent >= 80 && result.percent < 100, JSON.stringify({ percent: result.percent, notes: result.notes.filter(n => !n.passed) }));
    assert.equal(result.passed, true);
    assert.match(await a.page.locator('#wrapup-heading').textContent(), /%/);
    assert.equal(await a.page.locator('#result-list li').count(), 8);
    await poll(() => [...cloud.progress.values()].some(row => row.lesson_id === id && row.kind === 'passedKeys'));
    assert.equal(await a.page.evaluate(() => window.scrollY), 0);
    assert.equal(await a.page.locator('#wrapup-kicker').evaluate(el => el.getBoundingClientRect().top >= 0), true);
    assert.equal(await a.page.locator('#screen-wrapup').evaluate(el => getComputedStyle(el).overflowY), 'auto');
    await a.page.screenshot({ animations: 'disabled', path: 'artifacts/chart-master-grade.png', fullPage: true });
    await a.page.locator('#again-key').scrollIntoViewIfNeeded();
    assert.equal(await a.page.locator('#again-key').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), true);
    await a.page.screenshot({ animations: 'disabled', path: 'artifacts/chart-master-grade-detail.png' });
    results.push('PASS: real microphone worklet grades a complete timed chart, continues after a wrong note, and saves the final pass');
    await a.page.locator('#again-key').click();
    await a.page.locator('#primary').click();
    await a.page.waitForFunction(() => window.__DUOJAZZ__.transport.playing);
    await a.page.locator('#primary').click();
    assert.equal(await a.page.evaluate(() => window.__DUOJAZZ__.transport.playing), false);
    assert.equal(await a.page.locator('#screen-wrapup').isVisible(), false);
    assert.equal(await a.page.evaluate(() => window.__DUOJAZZ__.getSession().cardResults.length), 0);
    results.push('PASS: stopping a timed run cancels it without a grade');
    await a.page.evaluate(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Denied', 'NotAllowedError'); }; });
    await a.page.locator('#primary').click();
    await a.page.waitForFunction(() => document.querySelector('#meter').textContent.includes('failed to start'));
    assert.equal(await a.page.evaluate(() => window.__DUOJAZZ__.transport.playing), false);
    assert.equal(await a.page.locator('#screen-wrapup').isVisible(), false);
    results.push('PASS: denied microphone access never starts the chart or awards a grade');
    assert.deepEqual(a.errors, []);
    const video = a.page.video();
    await a.context.close();
    await video.saveAs('artifacts/chart-master-flow.webm');
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
});
