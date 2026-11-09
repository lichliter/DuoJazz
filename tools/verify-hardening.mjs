// Synthetic account only. All Supabase traffic is blocked.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const appUrl = process.env.APP_URL ?? 'http://127.0.0.1:4174';
const sdk = `
let authListener;
const rows = new Map();
window.testAuthEvent = (event, user) => authListener(event, user ? {user} : null);
window.supabase = {createClient: () => ({auth: {
 onAuthStateChange(cb) { authListener = cb; },
 getSession() { return new Promise(resolve => window.testRestore = session => resolve({data:{session}})); },
 async signOut() { window.testAuthEvent('SIGNED_OUT', null); return {}; },
 async stopAutoRefresh() {},
}, from(table) { return {
 select() { const q = {eq(){return q;},order(){return q;},range(){return q;},
 then(resolve,reject){return Promise.resolve({data: table === 'user_preferences' ? [...rows.values()] : []}).then(resolve,reject);}};return q;},
 async upsert(){return {};},
};}, async rpc(_, args) {for(const row of args.changes) rows.set(row.name,row);return {};}
})};
`;
const results = [];
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', recordVideo: { dir: 'artifacts/hardening-videos' } });
const errors = [];
context.on('page', page => page.on('pageerror', e => errors.push(e.message)));
await context.route('https://*.supabase.co/**', route => route.abort());
// Isolate these auth fixtures from the real offline cache, tested separately.
await context.route('**/js/pwa.js', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
await context.route('**/js/vendor/supabase-2.119.0.js', route => route.fulfill({ contentType: 'application/javascript', body: sdk }));
try {
  const page = await context.newPage();
  await page.goto(appUrl);
  await page.waitForFunction(() => typeof window.testRestore === 'function');
  assert.equal(await page.locator('#login-screen').isVisible(), true);
  assert.match(await page.locator('#account-status').textContent(), /Checking your account/);
  assert.equal(await page.locator('#account-status').evaluate(node => node.getBoundingClientRect().bottom <= innerHeight), true);
  assert.equal(await page.locator('.skip-link').getAttribute('href'), '#login-title');
  await page.locator('.skip-link').focus(); await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'login-title');
  assert.match(await page.locator('#account-status').textContent(), /Checking your account/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'artifacts/hardening-signin-loading.png' });
  results.push('PASS: slow startup shows a readable mobile sign-in screen with a working skip link');

  // A newer auth event must win over an old session lookup arriving later.
  await page.evaluate(() => window.testAuthEvent('SIGNED_IN', { id: 'hardening-test', email: 'test@example.com' }));
  await page.locator('#account-chip').waitFor({ state: 'visible' });
  await page.evaluate(() => window.testRestore(null));
  await page.waitForFunction(() => !document.querySelector('#account-signin').disabled);
  assert.equal(await page.locator('#app-shell').isVisible(), true);
  assert.equal(await page.locator('.skip-link').getAttribute('href'), '#main');
  results.push('PASS: a late session lookup cannot undo a newer sign-in');

  await page.locator('#account-chip').click();
  const radio = page.locator('input[name="instrument"][value="trumpet"]');
  await radio.check(); await radio.focus();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForTimeout(500);
  assert.equal(await radio.evaluate(node => node === document.activeElement), true);
  await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(() => document.activeElement.name), 'instrument');
  assert.notEqual(await page.evaluate(() => document.activeElement.value), 'trumpet');
  await page.screenshot({ path: 'artifacts/hardening-instrument-focus.png' });
  results.push('PASS: instrument selection and background sync preserve keyboard focus');

  const stalled = await context.newPage();
  await stalled.clock.install();
  await stalled.goto(appUrl);
  await stalled.waitForFunction(() => typeof window.testRestore === 'function');
  await stalled.clock.fastForward(16000);
  await stalled.waitForFunction(() => !document.querySelector('#account-signin').disabled);
  assert.match(await stalled.locator('#account-status').textContent(), /Couldn’t restore your account/);
  assert.equal(await stalled.locator('#login-screen').isVisible(), true);
  await stalled.screenshot({ path: 'artifacts/hardening-signin-timeout.png' });
  results.push('PASS: stalled account restoration times out and leaves sign-in controls usable');
  assert.deepEqual(errors, []);
  await writeFile('artifacts/hardening-browser-results.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await context.close(); await browser.close(); }
