import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createCloudMock, launchBrowser, poll, withAppUrl } from './lib/browser-harness.mjs';

await mkdir('artifacts', { recursive: true });
const cloud = createCloudMock();

async function device(browser, appUrl) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 950 }, serviceWorkers: 'block' });
  await cloud.installRoutes(context, { blockPwa: false });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(appUrl, { waitUntil: 'networkidle' });
  await page.locator('#account-chip').click();
  return { context, page, errors };
}

async function earn(page, key) {
  await page.evaluate(k => {
    const m = window.__DUOJAZZ__.getMastery();
    m.lessons['master-lick'].passedKeys = [k];
    window.__DUOJAZZ__.setMastery(m);
  }, key);
}

const findings = [];
await withAppUrl(async (appUrl) => {
  const browser = await launchBrowser();
  try {
    const a = await device(browser, appUrl);
    await a.page.locator('#start-key').selectOption('D');
    await poll(() => cloud.rows.get('test-account-a:startKeyId')?.value === 'D');
    await a.page.waitForFunction(() => document.querySelector('#start-key').value === 'D');
    const fresh = await device(browser, appUrl);
    await fresh.page.waitForFunction(() => document.querySelector('#start-key').value === 'D');
    findings.push('PASS: D stays D after account sync and fresh-device restore');
    await fresh.context.close();
    await new Promise(r => setTimeout(r, 300));
    cloud.setFail(true);
    cloud.resetProgressRequests();
    await earn(a.page, 'C');
    await a.page.waitForFunction(() => document.querySelector('#account-error').textContent.includes('haven’t reached'));
    await poll(() => cloud.progress.size === 1);
    findings.push('PASS: earned progress uploads while the settings endpoint fails');
    cloud.setFail(false);
    await a.page.evaluate(() => window.dispatchEvent(new Event('focus')));
    const b = await a.context.newPage();
    await b.goto(appUrl, { waitUntil: 'networkidle' });
    await earn(b, 'G');
    await poll(() => cloud.progress.size === 2);
    await a.page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await a.page.waitForFunction(() => window.__DUOJAZZ__.getMastery().lessons['master-lick'].passedKeys.length === 2);
    await new Promise(r => setTimeout(r, 300));
    await a.page.evaluate(() => window.testEnableStorage());
    await b.evaluate(() => window.testEnableStorage());
    cloud.resetProgressRequests();
    await b.evaluate(() => window.dispatchEvent(new Event('focus')));
    await new Promise(r => setTimeout(r, 2000));
    const initial = cloud.getProgressRequests();
    await new Promise(r => setTimeout(r, 2000));
    assert.equal(cloud.getProgressRequests() - initial, 0);
    findings.push('PASS: two tabs converge without repeated progress requests');
    await a.page.locator('#settings-close').click();
    await a.page.locator('#lesson-list .module-banner').click();
    await a.page.locator('[data-library-tab=charts]').click();
    await a.page.locator('#library-search').fill('Autumn Leaves');
    await a.page.getByRole('button', { name: 'Add Autumn Leaves to favorites', exact: true }).click();
    await poll(() => cloud.rows.get('test-account-a:chart:autumn-leaves')?.value === true);
    const c = await device(browser, appUrl);
    await c.page.locator('#settings-close').click();
    await c.page.locator('#lesson-list .module-banner').click();
    await c.page.locator('[data-library-tab=charts]').click();
    await c.page.getByRole('button', { name: 'Remove Autumn Leaves from favorites', exact: true }).waitFor();
    await c.page.screenshot({ path: 'artifacts/fixed-account-favorites.png' });
    await c.page.getByRole('button', { name: 'Remove Autumn Leaves from favorites', exact: true }).click();
    await poll(() => cloud.rows.get('test-account-a:chart:autumn-leaves')?.value === false);
    findings.push('PASS: favorite additions and removals persist through the account');
    assert.deepEqual(a.errors, []);
    assert.deepEqual(c.errors, []);
    console.log(JSON.stringify(findings, null, 2));
  } finally {
    await browser.close();
  }
});
