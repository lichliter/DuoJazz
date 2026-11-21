// Isolated account transport: never touches live accounts or cloud data.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { launchBrowser, withAppUrl } from './lib/browser-harness.mjs';

await mkdir('artifacts', { recursive: true });
const results = [], errors = [];
const sdk = `window.supabase = {createClient: () => ({auth: {
 onAuthStateChange() {}, async getSession() {return {data:{session:{user:{id:'review-test',email:'review@example.com'}}}};},
}, from() {return {select() {const q={eq(){return q;},order(){return q;},range(){return q;},then(resolve,reject){return Promise.resolve({data:[]}).then(resolve,reject);}};return q;},async upsert(){return {};}};},async rpc(){return {};}})};`;

await withAppUrl(async (appUrl) => {
  const browser = await launchBrowser();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', recordVideo: { dir: 'artifacts/review-videos' } });
  await context.route('https://*.supabase.co/**', route => route.abort());
  await context.route('**/js/pwa.js*', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await context.route('**/js/vendor/supabase-2.119.0.js', route => route.fulfill({ contentType: 'application/javascript', body: sdk }));
  // A damaged optional manifest should not force synthetic audio.
  await context.route('**/sound/manifest.json', route => route.fulfill({ contentType: 'application/json', body: '{broken' }));
  try {
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(appUrl);
    await page.locator('#account-chip').waitFor({ state: 'visible' });
    await page.evaluate(() => {
      window.__DUOJAZZ__.createAndShow({ lessonId: 'learn-lick' });
      document.querySelector('#session-exit').click();
    });
    await page.waitForTimeout(100);
    await page.evaluate(() => window.__DUOJAZZ__.createAndShow({ lessonId: 'learn-lick' }));
    await page.locator('#notation svg .note').first().waitFor();
    results.push('PASS: leaving before engraving finishes does not cache an empty score');
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      window.reviewSvg = document.querySelector('#notation svg');
      window.reviewReplacements = 0;
      new MutationObserver(records => {
        for (const record of records) if ([...record.removedNodes].some(node => node === window.reviewSvg)) window.reviewReplacements++;
      }).observe(document.querySelector('#notation'), { childList: true });
      window.dispatchEvent(new Event('focus'));
    });
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => window.reviewSvg === document.querySelector('#notation svg')), true);
    assert.equal(await page.evaluate(() => window.reviewReplacements), 0);
    results.push('PASS: background sync retains the active SVG instead of engraving it again');
    await page.screenshot({ path: 'artifacts/review-practice.png' });

    await page.locator('#hear-it').click();
    await page.waitForFunction(() => window.__DUOJAZZ__.transport.playing);
    assert.equal(await page.evaluate(() => window.__DUOJAZZ__.sampleStatus()), 'ready');
    results.push('PASS: recorded samples play even with a corrupt optional manifest');
    await page.locator('#hear-it').click();
    await page.evaluate(() => window.__DUOJAZZ__.transport.ctx.close());
    await page.locator('#hear-it').click();
    await page.waitForFunction(() => window.__DUOJAZZ__.transport.playing);
    assert.equal(await page.evaluate(() => {
      const t = window.__DUOJAZZ__.transport;
      return [t.master, t.pianoBus, t.bassBus, t.drumBus, t.melodyBus].every(node => node.context === t.ctx) && t.ctx.state === 'running';
    }), true);
    results.push('PASS: Hear it recovers after an actual browser AudioContext closes');
    await page.locator('#hear-it').click();

    await page.evaluate(() => window.__DUOJAZZ__.setMelodyOctave(1));
    await page.waitForFunction(() => document.querySelector('#notation svg') !== window.reviewSvg);
    await page.locator('#notation svg .note').first().waitFor();
    results.push('PASS: changing the melody octave invalidates the notation cache');
    await page.setViewportSize({ width: 1100, height: 950 });
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: 'artifacts/review-desktop.png' });
    await page.locator('#session-exit').click();
    await page.locator('#lesson-list .module-banner').click();
    await page.locator('#library-browse').click();
    await page.locator('#library-search').fill('Cry Me a River');
    await page.getByRole('button', { name: 'Add Cry Me a River', exact: true }).click();
    await page.locator('#library-search').fill('Guide Tone Sequence');
    await page.getByRole('button', { name: 'Add Guide Tone Sequence', exact: true }).click();
    await page.locator('#library-search').fill('');
    await page.getByRole('button', { name: 'My Rotation', exact: true }).click();
    await page.getByLabel('Options for Cry Me a River', { exact: true }).click();
    await page.getByRole('button', { name: 'Remove Cry Me a River', exact: true }).focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.testid), 'quick-view-module-gts');
    await page.getByLabel('Options for Guide Tone Sequence', { exact: true }).click();
    await page.getByRole('button', { name: 'Remove Guide Tone Sequence', exact: true }).focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.testid), 'quick-view-module-chord-tones');
    results.push('PASS: removing a lick keeps keyboard focus in My Rotation');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'artifacts/review-library.png' });
    assert.deepEqual(errors, []);
    await writeFile('artifacts/review-browser-results.json', JSON.stringify({ results, errors }, null, 2));
    console.log(JSON.stringify(results, null, 2));
    const video = page.video();
    await context.close();
    await video.saveAs('artifacts/review-flow.webm');
  } finally {
    await context.close();
    await browser.close();
  }
});
