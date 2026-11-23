// Isolated account transport: no real accounts or cloud data are used.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { launchBrowser, withAppUrl } from './lib/browser-harness.mjs';

await mkdir('artifacts', { recursive: true });
const errors = [], results = [];
const sdk = `
let listener;
window.guestTest = { cloudRequests: 0, signouts: 0 };
window.supabase = {createClient: () => ({auth: {
 onAuthStateChange(cb) { listener = cb; },
 async getSession() { return {data:{session:null}}; },
 async signInWithPassword({email,password}) {
   if(password !== 'test-password') return {error:{message:'Invalid login credentials'}};
   listener('SIGNED_IN',{user:{id:'guest-test-account',email}}); return {data:{}};
 },
 async signOut() { window.guestTest.signouts++; listener('SIGNED_OUT',null); return {}; },
 async stopAutoRefresh() {}
}, from() { window.guestTest.cloudRequests++; return {
 select() {const q={eq(){return q;},order(){return q;},range(){return q;},then(resolve,reject){return Promise.resolve({data:[]}).then(resolve,reject);}};return q;},
 async upsert(){return {};}
};}, async rpc(){window.guestTest.cloudRequests++;return {};}})};`;

async function open(browser, appUrl, { offline = false, brokenSdk = false, video = false, stubPwa = true, viewport = { width: 390, height: 844 } } = {}) {
  const context = await browser.newContext({
    viewport,
    serviceWorkers: 'block',
    ...(video ? { recordVideo: { dir: 'artifacts/guest-videos' } } : {}),
  });
  await context.route('https://*.supabase.co/**', route => route.abort());
  if (stubPwa) await context.route('**/js/pwa.js*', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await context.route('**/js/vendor/supabase-2.119.0.js', route => brokenSdk ? route.abort() : route.fulfill({ contentType: 'application/javascript', body: sdk }));
  if (offline) await context.addInitScript(() => Object.defineProperty(navigator, 'onLine', { get: () => false }));
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(appUrl);
  await page.locator('#login-screen').waitFor({ state: 'visible' });
  return { context, page };
}

async function enterGuest(page) {
  await page.getByRole('button', { name: 'View as guest', exact: true }).click();
  await page.locator('#app-shell').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#app-shell').evaluate(node => node.inert), false);
  assert.equal(await page.locator('#main').evaluate(node => node === document.activeElement), true);
  await page.getByRole('button', { name: 'Profile: Guest', exact: true }).click();
  assert.equal(await page.locator('#account-name').textContent(), 'Guest');
  assert.equal(await page.getByRole('button', { name: 'Log in', exact: true }).isVisible(), true);
  assert.equal(await page.locator('#account-signout').isVisible(), false);
}

await withAppUrl(async (appUrl) => {
  const browser = await launchBrowser();
  try {
    const { context, page } = await open(browser, appUrl, { video: true });
    await page.screenshot({ path: 'artifacts/guest-login.png' });
    await enterGuest(page);
    await page.screenshot({ path: 'artifacts/guest-profile.png' });
    await page.locator('#account-login').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'artifacts/guest-profile-login.png' });
    assert.equal(await page.evaluate(() => window.guestTest.cloudRequests), 0);
    await page.locator('#settings-close').click();
    await page.evaluate(() => {
      const mastery = window.__DUOJAZZ__.getMastery();
      mastery.lessons['master-lick'].passedKeys = ['C'];
      window.__DUOJAZZ__.setMastery(mastery);
      window.__DUOJAZZ__.createAndShow({ lessonId: 'learn-lick' });
    });
    await page.locator('#hear-it').click();
    await page.waitForFunction(() => window.__DUOJAZZ__.transport.playing);
    await page.locator('#session-exit').click();
    await page.locator('#account-chip').click();
    await page.locator('#account-login').click();
    assert.equal(await page.locator('#login-screen').isVisible(), true);
    assert.equal(await page.locator('#settings-modal').evaluate(node => node.open), false);
    assert.equal(await page.locator('#app-shell').evaluate(node => node.inert), true);
    assert.equal(await page.locator('#login-title').evaluate(node => node === document.activeElement), true);
    assert.equal(await page.evaluate(() => window.guestTest.signouts), 0);
    assert.equal(await page.evaluate(() => window.__DUOJAZZ__.transport.playing), false);
    await page.reload();
    await enterGuest(page);
    assert.deepEqual(await page.evaluate(() => window.__DUOJAZZ__.getMastery().lessons['master-lick'].passedKeys), ['C']);
    results.push('PASS: guest navigation, accessible focus, local progress after reload, and no account requests');
    await page.locator('#account-login').click();
    await page.locator('#account-email').fill('guest.test@example.com');
    await page.locator('#account-password').fill('wrong-password');
    await page.locator('#account-signin').click();
    await page.waitForFunction(() => document.querySelector('#account-status').textContent.includes('Invalid login'));
    assert.equal(await page.locator('#app-shell').isVisible(), false);
    await page.locator('#account-password').fill('test-password');
    await page.locator('#account-signin').click();
    await page.locator('#app-shell').waitFor({ state: 'visible' });
    await page.locator('#account-chip').click();
    assert.equal(await page.locator('#account-signout').isVisible(), true);
    assert.equal(await page.locator('#account-login').isVisible(), false);
    assert.equal(await page.locator('#account-identity').textContent(), 'guest.test@example.com');
    assert.deepEqual(await page.evaluate(() => window.__DUOJAZZ__.getMastery().lessons['master-lick'].passedKeys), ['C']);
    await page.locator('#account-signout').click();
    await page.locator('#login-screen').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#app-shell').isVisible(), false);
    results.push('PASS: failed login stays on login; successful login claims guest progress and shows Sign out; sign-out returns to login');
    const video = page.video();
    await context.close();
    await video.saveAs('artifacts/guest-flow.webm');

    for (const options of [{ offline: true }, { brokenSdk: true }]) {
      const { context: altContext, page: altPage } = await open(browser, appUrl, options);
      await enterGuest(altPage);
      await altPage.locator('#account-login').click();
      assert.equal(await altPage.locator('#login-screen').isVisible(), true);
      await altContext.close();
    }
    results.push('PASS: guest access and return to login work offline and when the auth SDK cannot load');
    for (const [size, viewport] of [['phone', { width: 390, height: 844 }], ['ipad', { width: 820, height: 1180 }]]) {
      const device = await open(browser, appUrl, { stubPwa: false, viewport, video: true });
      const lesson = device.page;
      await lesson.getByRole('button', { name: 'View as guest' }).click();
      await lesson.getByTestId('lesson-tones-major7-learn').click();
      await lesson.locator('#offline-status').waitFor();
      await lesson.locator('#notation svg .note').first().waitFor();
      const banner = await lesson.locator('#offline-status').boundingBox();
      const back = await lesson.locator('#session-exit').boundingBox();
      assert.ok(back.y >= banner.y + banner.height - 1);
      for (const selector of ['#primary', '#continue-btn', '#session-exit']) {
        await lesson.locator(selector).click({ trial: true, timeout: 3000 });
      }
      assert.equal(await lesson.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await lesson.screenshot({ path: `artifacts/offline-session-${size}.png` });
      await lesson.locator('#session-exit').click();
      await lesson.locator('#screen-home').waitFor();
      const recording = lesson.video();
      await device.context.close();
      await recording.saveAs(`artifacts/offline-session-${size}.webm`);
    }
    results.push('PASS: the offline setup warning leaves practice controls and Back accessible on phone and iPad');
    assert.deepEqual(errors, []);
    console.log(results.join('\n'));
  } finally {
    await browser.close();
  }
});
