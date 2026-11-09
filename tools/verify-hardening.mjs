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
await context.addInitScript(() => {
  window.testLoginExposures = 0;
  new MutationObserver(() => {
    const login = document.getElementById('login-screen');
    if (login && !login.hidden) window.testLoginExposures++;
  }).observe(document, { subtree: true, childList: true, attributes: true });
});
await context.route('https://*.supabase.co/**', route => route.abort());
// Isolate these auth fixtures from the real offline cache, tested separately.
await context.route('**/js/pwa.js', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
let releaseSdk;
const sdkReady = new Promise(resolve => { releaseSdk = resolve; });
await context.route('**/js/vendor/supabase-2.119.0.js', async route => {
  await sdkReady;
  await route.fulfill({ contentType: 'application/javascript', body: sdk });
});
let startupVideo;
try {
  const page = await context.newPage();
  startupVideo = page.video();
  await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('#account-loading').isVisible(), true);
  assert.equal(await page.locator('#login-screen').isVisible(), false);
  assert.equal(await page.locator('#app-shell').isVisible(), false);
  assert.equal(await page.evaluate(() => window.testLoginExposures), 0);
  releaseSdk();
  await page.waitForFunction(() => typeof window.testRestore === 'function');
  assert.equal(await page.locator('#login-screen').isVisible(), false);
  assert.equal(await page.locator('.skip-link').getAttribute('href'), '#account-loading-title');
  await page.locator('.skip-link').focus(); await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'account-loading-title');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'artifacts/account-loading.png' });
  results.push('PASS: initial HTML, delayed SDK loading, and pending session restoration keep sign-in hidden');

  // A newer auth event must win over an old session lookup arriving later.
  await page.evaluate(() => window.testAuthEvent('SIGNED_IN', { id: 'hardening-test', email: 'test@example.com' }));
  await page.locator('#account-chip').waitFor({ state: 'visible' });
  await page.evaluate(() => window.testRestore(null));
  await page.waitForFunction(() => !document.querySelector('#account-signin').disabled);
  assert.equal(await page.locator('#app-shell').isVisible(), true);
  assert.equal(await page.locator('#account-loading').isVisible(), false);
  assert.equal(await page.evaluate(() => window.testLoginExposures), 0);
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

  const returning = await context.newPage();
  await returning.goto(appUrl);
  await returning.waitForFunction(() => typeof window.testRestore === 'function');
  await returning.evaluate(() => window.testRestore({ user: { id: 'returning-test', email: 'returning@example.com' } }));
  await returning.locator('#account-chip').waitFor({ state: 'visible' });
  assert.equal(await returning.evaluate(() => window.testLoginExposures), 0);
  assert.equal(await returning.locator('#account-loading').isVisible(), false);
  results.push('PASS: returning users move directly from loading into the app without exposing sign-in');

  const signedOut = await context.newPage();
  await signedOut.goto(appUrl + '/?auth=signup');
  await signedOut.waitForFunction(() => typeof window.testRestore === 'function');
  assert.equal(await signedOut.locator('#login-screen').isVisible(), false);
  await signedOut.evaluate(() => window.testRestore(null));
  await signedOut.locator('#signup-submit').waitFor({ state: 'visible' });
  assert.equal(await signedOut.locator('#account-loading').isVisible(), false);
  assert.equal(await signedOut.locator('.skip-link').getAttribute('href'), '#login-title');
  await signedOut.getByRole('button', { name: 'Back to sign in', exact: true }).click();
  assert.equal(await signedOut.locator('#account-signin').isVisible(), true);
  results.push('PASS: signed-out visitors see the requested auth form only after session restoration finishes');

  await returning.evaluate(() => window.testAuthEvent('PASSWORD_RECOVERY', { id: 'returning-test', email: 'returning@example.com' }));
  await returning.locator('#password-submit').waitFor({ state: 'visible' });
  assert.equal(await returning.locator('#app-shell').isVisible(), false);
  assert.equal(await returning.locator('#account-loading').isVisible(), false);
  results.push('PASS: password recovery still opens the password form');

  const stalled = await context.newPage();
  await stalled.clock.install();
  await stalled.goto(appUrl);
  await stalled.waitForFunction(() => typeof window.testRestore === 'function');
  await stalled.clock.fastForward(16000);
  await stalled.waitForFunction(() => !document.querySelector('#account-signin').disabled);
  assert.match(await stalled.locator('#account-status').textContent(), /Couldn’t restore your account/);
  assert.equal(await stalled.locator('#login-screen').isVisible(), true);
  assert.equal(await stalled.locator('#account-loading').isVisible(), false);
  await stalled.screenshot({ path: 'artifacts/hardening-signin-timeout.png' });
  results.push('PASS: stalled account restoration times out and leaves sign-in controls usable');

  const failedSdk = await context.newPage();
  await failedSdk.route('**/js/vendor/supabase-2.119.0.js', route => route.abort());
  await failedSdk.goto(appUrl);
  await failedSdk.waitForFunction(() => document.querySelector('#account-status').textContent.includes('Couldn’t load sign-in'));
  assert.equal(await failedSdk.locator('#login-screen').isVisible(), true);
  assert.equal(await failedSdk.locator('#account-loading').isVisible(), false);
  results.push('PASS: a failed auth script reveals a recovery message instead of getting stuck on loading');
  assert.deepEqual(errors, []);
  await writeFile('artifacts/hardening-browser-results.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  releaseSdk();
  await context.close();
  if (startupVideo) await startupVideo.saveAs('artifacts/account-startup.webm');
  await browser.close();
}
