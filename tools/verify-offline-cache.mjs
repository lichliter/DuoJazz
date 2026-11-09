const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1100, height: 950 } });
try {
  // Seed a synthetic local session. No live account or database is used.
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'onLine', { get: () => false });
    if (localStorage.getItem('offline-cache-fixture')) return;
    const user = { id: '11111111-1111-4111-8111-111111111111', email: 'offline@example.com' };
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const token = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })) + '.' + btoa(JSON.stringify({ sub: user.id, exp })) + '.test';
    localStorage.setItem('sb-ogttqddpizpnocrtvixi-auth-token', JSON.stringify({ access_token: token, refresh_token: 'test', expires_at: exp, expires_in: 3600, token_type: 'bearer', user }));
    localStorage.setItem('offline-cache-fixture', 'true');
  });
  await context.route('https://*.supabase.co/**', route => route.abort());
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.env.APP_URL ?? 'http://127.0.0.1:4174');
  await page.locator('#account-chip').waitFor({ state: 'visible' });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  const cache = await page.evaluate(async () => {
    const keys = await caches.keys(), app = await caches.open(keys.find(key => key.startsWith('duojazz-app:')));
    const urls = (await app.keys()).map(request => request.url);
    return { entries: urls.length, hasNetworkModule: urls.some(url => url.endsWith('/js/network.js')), allSameOrigin: urls.every(url => new URL(url).origin === location.origin) };
  });
  assert.equal(cache.hasNetworkModule, true); assert.equal(cache.allSameOrigin, true);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#account-chip').click();
  await page.locator('#start-key').selectOption('D');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#account-chip').click();
  assert.equal(await page.locator('#start-key').inputValue(), 'D');
  assert.match(await page.locator('#account-error').textContent(), /Offline/);
  assert.equal(await page.locator('#offline-status').isVisible(), false);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: 'artifacts/hardening-offline-reload.png' });
  const result = { ...cache, offlineAccountRestore: true, offlinePreferenceSurvivesReload: true, pageErrors: errors };
  await writeFile('artifacts/hardening-offline-cache-results.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally { await context.close(); await browser.close(); }
