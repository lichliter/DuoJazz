import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { precacheSource } from '../tools/generate-precache.mjs';

async function pwaHarness({ online = true, failure = false, active = false } = {}) {
  const status = { textContent: '', hidden: true };
  const events = {};
  const workerEvents = {};
  const worker = { state: 'installing', addEventListener(name, handler) { workerEvents[name] = handler; } };
  const registration = { active: active ? {} : null, installing: worker, addEventListener() {} };
  const navigator = { onLine: online, serviceWorker: {
    controller: active ? {} : null,
    async register() {
      if (failure) throw new Error('Registration failed');
      return registration;
    },
  } };
  const source = (await readFile(new URL('./pwa.js', import.meta.url), 'utf8'))
    .replace('import.meta.url', JSON.stringify('https://example.test/DuoJazz/js/pwa.js'));
  vm.runInNewContext(source, {
    URL, navigator, document: { getElementById: () => status },
    addEventListener(name, handler) { events[name] = handler; },
  });
  await new Promise(resolve => setImmediate(resolve));
  return { status, navigator, events, registration,
    recover() { failure = false; },
    state(value) { worker.state = value; workerEvents.statechange(); },
  };
}

test('PWA setup, activation and normal offline use stay silent', async () => {
  for (const online of [true, false]) {
    const app = await pwaHarness({ online });
    assert.equal(app.status.hidden, true);
    app.state('installed');
    assert.equal(app.status.hidden, true);
    app.state('activated');
    assert.equal(app.status.hidden, true);
    assert.equal(app.status.textContent, '');
  }
});

test('PWA installation and update failures appear and clear after recovery', async () => {
  for (const active of [true, false]) {
    const app = await pwaHarness({ active });
    app.state('redundant');
    assert.equal(app.status.hidden, false);
    assert.match(app.status.textContent, /could not finish/);
    app.state('activated');
    assert.equal(app.status.hidden, true);
  }
});

test('registration failures persist until a successful reconnect', async () => {
  const app = await pwaHarness({ failure: true });
  assert.equal(app.status.hidden, false);
  assert.match(app.status.textContent, /could not finish/);
  app.recover();
  app.registration.active = {};
  app.registration.installing = null;
  await app.events.online();
  assert.equal(app.status.hidden, true);
});

test('offline release includes the current application assets', async () => {
  assert.equal(await readFile(new URL('../precache.js', import.meta.url), 'utf8'), await precacheSource());
});

test('worker serves scoped assets and query navigation without intercepting auth or writes', async () => {
  const events = {};
  const scope = 'https://example.test/DuoJazz/';
  const context = {
    URL, Request, importScripts() {}, PRECACHE_VERSION: 'test',
    PRECACHE_URLS: ['./index.html', './js/app.js'],
    self: { registration: { scope }, location: { origin: 'https://example.test' },
      addEventListener: (name, handler) => { events[name] = handler; } },
    caches: { open: async () => ({ match: async url => new Response(url) }) },
  };
  vm.runInNewContext(await readFile(new URL('../sw.js', import.meta.url), 'utf8'), context);
  async function request(url, method = 'GET', mode = 'navigate') {
    let response;
    events.fetch({ request: { url, method, mode }, respondWith(value) { response = value; } });
    return response ? (await response).text() : null;
  }
  assert.equal(await request(scope + '?auth=signup'), scope + 'index.html');
  assert.equal(await request(scope + 'js/app.js?v=150'), scope + 'js/app.js');
  assert.equal(await request('https://example.test/other/'), null);
  assert.equal(await request('https://auth.example.test/token'), null);
  assert.equal(await request(scope + 'index.html', 'POST'), null);
  assert.equal(await request(scope + 'api/private'), null);
});
