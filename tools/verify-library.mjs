import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createCloudMock, launchBrowser, poll, withAppUrl } from './lib/browser-harness.mjs';

await mkdir('artifacts', { recursive: true });
const cloud = createCloudMock();

async function device(browser, appUrl, viewport = { width: 820, height: 1180 }) {
  const context = await browser.newContext({
    viewport,
    serviceWorkers: 'block',
    hasTouch: viewport.width < 600,
    recordVideo: { dir: 'artifacts/library-videos' },
  });
  await cloud.installRoutes(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', response => {
    if (response.url().startsWith(appUrl) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto(appUrl, { waitUntil: 'networkidle' });
  await page.locator('#account-chip').click();
  return { context, page, errors };
}

async function swipeTouch(cdp, row, dx, dy = 0) {
  const { x, y, width, height } = await row.boundingBox();
  const startX = x + width * (dx < -100 ? 0.87 : 0.38);
  const centerY = y + height / 2;
  const dispatch = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
  await dispatch('touchStart', [{ x: startX, y: centerY }]);
  for (let step = 1; step <= 8; step++) {
    await dispatch('touchMove', [{ x: startX + dx * step / 8, y: centerY + dy * step / 8 }]);
  }
  await dispatch('touchEnd', []);
}

const results = [];
let video, phoneVideo;
await withAppUrl(async (appUrl) => {
  const browser = await launchBrowser();
  try {
    const a = await device(browser, appUrl);
    video = a.page.video();
    assert.equal(await a.page.locator('#my-charts-button').count(), 0);
    await a.page.locator('#settings-close').click();
    const end = a.page.locator('[data-testid="home-next-module"]');
    assert.equal(await end.textContent(), 'Explore licks');
    await end.click();
    assert.equal(await a.page.locator('#quick-view #library-tabs').count(), 1);
    await a.page.getByRole('button', { name: /^Classics/ }).click();
    const card = a.page.locator('.library-lick-card').filter({ has: a.page.getByRole('heading', { name: 'Cry Me a River', exact: true }) });
    await card.locator('.note').first().waitFor();
    assert.equal(await card.getByRole('button', { name: 'Open Cry Me a River', exact: true }).isVisible(), true);
    await a.page.evaluate(async () => {
      const { Transport } = await import('/js/audio.js');
      const start = Transport.prototype.start;
      Transport.prototype.start = async function(config, options) {
        await start.call(this, config, options);
        if (options?.countIn === false) window.rotationPreview = this;
      };
    });
    await card.getByRole('button', { name: 'Play Cry Me a River', exact: true }).click();
    await a.page.waitForFunction(() => window.rotationPreview?.playing);
    assert.equal(await a.page.evaluate(() => {
      const preview = window.rotationPreview;
      return preview.lastConfig.includeModel && preview.lastConfig.duckBacking && preview.samplesReady()
        && ['melody', 'piano', 'bass', 'drum'].every(type => preview.lastConfig.events?.some(event => event.type === type));
    }), true);
    assert.equal(await a.page.evaluate(() => window.rotationPreview.snapshot().inCountIn), false);
    await card.getByRole('button', { name: 'Stop Cry Me a River', exact: true }).click();
    await a.page.getByRole('button', { name: 'Add Cry Me a River', exact: true }).click();
    await poll(() => cloud.rows.get('test-account-a:lick:cmar')?.value === true);
    const added = a.page.getByRole('region', { name: 'Added', exact: true });
    const remove = added.getByRole('button', { name: 'Remove Cry Me a River', exact: true });
    assert.equal(await remove.evaluate(button => button === document.activeElement), true);
    assert.equal(await remove.evaluate(button => button.classList.contains('library-action-primary')), false);
    assert.equal(await a.page.locator('#quick-view-list > :last-child').getAttribute('aria-labelledby'), 'library-added-title');
    await a.page.screenshot({ animations: 'disabled', path: 'artifacts/rotation-tablet-cards.png' });
    await remove.click();
    await poll(() => cloud.rows.get('test-account-a:lick:cmar')?.value === false);
    assert.equal(await card.getByRole('button', { name: 'Add Cry Me a River', exact: true }).isVisible(), true);
    await card.getByRole('button', { name: 'Add Cry Me a River', exact: true }).click();
    await card.getByRole('button', { name: 'Open Cry Me a River', exact: true }).click();
    await a.page.locator('#lesson-list .module-banner').click();
    await a.page.locator('[data-library-tab="charts"]').click();
    assert.equal(await a.page.locator('#quick-view').isVisible(), true);
    await a.page.locator('#library-browse').click();
    await a.page.locator('#library-search').fill('Autumn Leaves');
    await a.page.getByRole('button', { name: 'Add Autumn Leaves', exact: true }).click();
    await poll(() => cloud.rows.get('test-account-a:chart:autumn-leaves')?.value === true);
    await a.page.getByRole('button', { name: 'Open Autumn Leaves', exact: true }).click();
    assert.equal(await a.page.locator('#chart-tree .sleeve-node').count(), 4);
    await a.page.screenshot({ animations: 'disabled', path: 'artifacts/library-chart-tree.png', fullPage: true });
    results.push('PASS: shared picker enrolls licks and charts; profile no longer contains My Charts');
    await a.page.locator('[data-testid="lesson-chart-favorite-cmar"]').click();
    const choices = a.page.locator('#chart-applications-list [data-lesson]');
    assert.ok(await choices.count() > 1);
    await a.page.screenshot({ animations: 'disabled', path: 'artifacts/library-chart-applications.png' });
    const selected = await choices.first().getAttribute('data-lesson');
    await choices.first().click();
    await a.page.waitForFunction(id => window.__DUOJAZZ__.getSession()?.lessonId === id, selected);
    await a.page.locator('#session-exit').click();
    assert.equal(await a.page.locator('#screen-charts').isVisible(), true);
    results.push('PASS: favorite lick opens only matching chart applications and starts the selected exercise');
    await a.page.locator('#chart-tree .sleeve-node').first().click();
    await a.page.waitForFunction(() => window.__DUOJAZZ__.getSession()?.sequence?.length > 1);
    const grade = await a.page.evaluate(async () => {
      const { expectedNotesFor, hzFromMidi } = await import('/js/grade.js');
      const session = window.__DUOJAZZ__.getSession();
      const notes = expectedNotesFor(session);
      window.__DUOJAZZ__.feedPitchTrack(notes.flatMap(note => Array.from({ length: 10 }, (_, i) => ({ beat: note.startBeat + (i + 0.5) * note.beats / 10, hz: hzFromMidi(note.midi), amp: 0.3 }))));
      return window.__DUOJAZZ__.gradeNow();
    });
    assert.equal(grade.passed, true);
    const first = await a.page.evaluate(() => window.__DUOJAZZ__.getSession().lessonId);
    // Send real Web Audio through the microphone worklet and live pitch follower.
    // This synthetic stream never opens a physical microphone.
    await a.page.evaluate(async () => {
      const { expectedNotesFor, hzFromMidi } = await import('/js/grade.js');
      navigator.mediaDevices.getUserMedia = async () => {
        const ctx = new AudioContext(), dest = ctx.createMediaStreamDestination();
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(dest); gain.gain.value = 0;
        const start = ctx.currentTime + 0.8;
        expectedNotesFor(window.__DUOJAZZ__.getSession()).forEach((note, index) => {
          const t = start + index * 0.45;
          osc.frequency.setValueAtTime(hzFromMidi(note.midi), t);
          gain.gain.setValueAtTime(0.3, t); gain.gain.setValueAtTime(0, t + 0.35);
        });
        osc.start(); await ctx.resume();
        dest.stream.getAudioTracks()[0].addEventListener('ended', () => ctx.close());
        window.libraryTestAudio = ctx;
        return dest.stream;
      };
    });
    await a.page.locator('#auto-toggle').uncheck();
    await a.page.locator('#primary').click();
    await a.page.waitForFunction(id => window.__DUOJAZZ__.getSession().lessonId !== id, first);
    assert.equal(await a.page.evaluate(() => window.__DUOJAZZ__.getSession().sequenceIndex), 1);
    await poll(() => [...cloud.progress.values()].some(row => row.lesson_id === first && row.kind === 'passedKeys'));
    results.push('PASS: synthetic horn audio passes the real microphone worklet and follower, saves the chord, and advances');
    await a.page.locator('#session-exit').click();
    await a.page.locator('#chart-tree .sleeve-node').nth(1).click();
    await a.page.waitForFunction(() => window.__DUOJAZZ__.getSession()?.lessonId.endsWith('-master'));
    await a.page.locator('#show-notes').waitFor({ state: 'visible' });
    await a.page.screenshot({ animations: 'disabled', path: 'artifacts/library-chart-master.png' });
    await a.page.locator('#continue-btn').waitFor({ state: 'visible' });
    await a.page.evaluate(() => { while (window.__DUOJAZZ__.getSession()?.screen === 'session') window.__DUOJAZZ__.skipCard(); });
    await a.page.locator('#screen-wrapup').waitFor({ state: 'visible' });
    assert.match(await a.page.locator('#wrapup-detail').textContent(), /^0 of \d+ chords passed$/);
    await a.page.locator('#again-key').click();
    assert.equal(await a.page.evaluate(() => window.__DUOJAZZ__.getSession().sequenceIndex), 0);
    await a.page.locator('#session-exit').click();
    assert.equal(await a.page.locator('#chart-tree .sleeve-node').nth(1).getAttribute('data-complete'), 'false');
    results.push('PASS: chart Learn/Practice use horn grading, advance in chord order, and hide Practice notes');
    assert.deepEqual(a.errors, []);
    await a.context.close();
    await video.saveAs('artifacts/rotation-tablet-flow.webm');
    const fresh = await device(browser, appUrl);
    const swipeVideo = fresh.page.video();
    await fresh.page.locator('#settings-close').click();
    await fresh.page.locator('#lesson-list .module-banner').click();
    await fresh.page.locator('[data-library-tab="charts"]').click();
    await fresh.page.locator('[data-testid="quick-view-chart-autumn-leaves"]').click();
    assert.equal(await fresh.page.locator('[data-testid="lesson-chart-favorite-cmar"]').count(), 1);
    await fresh.page.locator('#chart-tree .module-banner').click();
    const chartPick = fresh.page.getByTestId('quick-view-chart-autumn-leaves');
    const chartRow = chartPick.locator('..');
    const chartRemove = fresh.page.getByRole('button', { name: 'Remove Autumn Leaves', exact: true });
    await chartPick.focus();
    await chartPick.press('ArrowLeft');
    assert.equal(await chartRemove.evaluate(button => button === document.activeElement), true);
    await chartRemove.press('ArrowRight');
    assert.equal(await chartRow.getAttribute('data-revealed'), null);
    const { x, y, width, height } = await chartRow.boundingBox();
    await fresh.page.mouse.move(x + width * 0.8, y + height / 2);
    await fresh.page.mouse.down();
    await fresh.page.mouse.move(x + width * 0.8 - 75, y + height / 2, { steps: 8 });
    await fresh.page.mouse.up();
    assert.equal(await chartRow.getAttribute('data-revealed'), 'true');
    await fresh.page.screenshot({ animations: 'disabled', path: 'artifacts/rotation-ipad-remove.png' });
    await chartRemove.click();
    await poll(() => cloud.rows.get('test-account-a:chart:autumn-leaves')?.value === false);
    assert.deepEqual(fresh.errors, []);
    await fresh.context.close();
    await swipeVideo.saveAs('artifacts/rotation-ipad-remove.webm');
    results.push('PASS: both rotations restore on a fresh device, and partial drag and keyboard reveal chart removal');
    const earned = { user_id: 'test-account-a', lesson_id: 'fe-master', key_id: 'C', kind: 'passedKeys' };
    cloud.progress.set('test-account-a:fe-master:C:passedKeys', earned);
    const mobile = await device(browser, appUrl, { width: 390, height: 844 });
    phoneVideo = mobile.page.video();
    await mobile.page.locator('#settings-close').click();
    await mobile.page.locator('#lesson-list .module-banner').click();
    await mobile.page.locator('[data-library-tab=licks]').click();
    await mobile.page.locator('[data-testid=quick-view-module-fe]').waitFor();
    await poll(() => cloud.rows.get('test-account-a:lick:fe')?.value === true);
    await mobile.page.locator('#library-browse').click();
    await mobile.page.screenshot({ animations: 'disabled', path: 'artifacts/rotation-phone-categories.png' });
    await mobile.page.locator('#library-search').fill('Guide Tone Sequence');
    await mobile.page.locator('.library-staff .note').first().waitFor();
    await mobile.page.screenshot({ animations: 'disabled', path: 'artifacts/rotation-phone-card.png' });
    await mobile.page.getByRole('button', { name: 'Add Guide Tone Sequence', exact: true }).click();
    await mobile.page.getByRole('button', { name: 'Back to categories' }).click();
    assert.equal(await mobile.page.getByRole('button', { name: /^Minor/ }).isVisible(), true);
    assert.equal(await mobile.page.locator('#quick-view button[aria-label^="Back to"]:visible').count(), 0);
    await mobile.page.getByRole('button', { name: 'Close library' }).click();
    await mobile.page.locator('#lesson-list .module-banner').click();
    assert.equal(await mobile.page.locator('#quick-view-list .library-picker-row').count(), 4);
    await mobile.page.screenshot({ animations: 'disabled', path: 'artifacts/rotation-phone-list.png' });
    await mobile.page.locator('[data-library-tab=charts]').click();
    await mobile.page.locator('#library-browse').click();
    await mobile.page.locator('#library-search').fill('Autumn Leaves');
    await mobile.page.getByRole('button', { name: 'Add Autumn Leaves', exact: true }).click();
    await mobile.page.getByRole('button', { name: 'Open Autumn Leaves', exact: true }).click();
    await mobile.page.locator('[data-testid=lesson-chart-favorite-gts]').click();
    assert.match(await mobile.page.locator('#chart-applications-list').textContent(), /No supported applications/);
    await mobile.page.getByRole('button', { name: 'Close applications', exact: true }).click();
    await mobile.page.locator('#chart-applications').waitFor({ state: 'hidden' });
    await mobile.page.evaluate(() => window.scrollTo(0, 0));
    await mobile.page.screenshot({ animations: 'disabled', path: 'artifacts/library-mobile-chart.png', fullPage: true });
    assert.equal(await mobile.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await mobile.page.locator('[data-testid=lesson-chart-favorite-cmar]').click();
    await mobile.page.locator('#chart-applications-list [data-lesson]').first().waitFor({ state: 'visible' });
    await mobile.page.screenshot({ animations: 'disabled', path: 'artifacts/library-mobile-applications.png' });
    assert.equal(await mobile.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    results.push('PASS: phone layout, My Rotation, and a lick with no supported chart application');
    await mobile.page.getByRole('button', { name: 'Close applications', exact: true }).click();
    await mobile.page.locator('#chart-tree .module-banner').click();
    await mobile.page.locator('[data-library-tab="licks"]').click();
    const lickPick = mobile.page.getByTestId('quick-view-module-gts');
    const lickRow = lickPick.locator('..');
    const cdp = await mobile.context.newCDPSession(mobile.page);
    await swipeTouch(cdp, lickRow, -70);
    await mobile.page.waitForFunction(() => document.querySelector('[data-testid=quick-view-module-gts]').parentElement.dataset.revealed === 'true');
    await mobile.page.screenshot({ animations: 'disabled', path: 'artifacts/rotation-phone-remove.png' });
    await swipeTouch(cdp, lickRow, 65);
    await mobile.page.waitForFunction(() => !document.querySelector('[data-testid=quick-view-module-gts]').parentElement.dataset.revealed);
    await swipeTouch(cdp, lickRow, -295);
    await lickPick.waitFor({ state: 'detached' });
    await poll(() => cloud.rows.get('test-account-a:lick:gts')?.value === false);
    assert.equal(await mobile.page.locator('#quick-view').isVisible(), true);
    results.push('PASS: partial touch swipe reveals Remove, right swipe closes it, and full left swipe removes the lick');
    await mobile.page.setViewportSize({ width: 390, height: 360 });
    const firstSwipeableRow = mobile.page.getByTestId('quick-view-module-cmar').locator('..');
    await swipeTouch(cdp, firstSwipeableRow, 0, -100);
    await mobile.page.waitForFunction(() => document.getElementById('quick-view-list').scrollTop > 0);
    assert.equal(await firstSwipeableRow.getAttribute('data-revealed'), null);
    results.push('PASS: a vertical touch swipe still scrolls the rotation list');
    assert.deepEqual(mobile.errors, []);
    await mobile.context.close();
    await phoneVideo.saveAs('artifacts/rotation-phone-flow.webm');
    console.log(JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
});
