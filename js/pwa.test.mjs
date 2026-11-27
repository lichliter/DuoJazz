import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { releaseAssets } from '../tools/generate-precache.mjs';

async function pwaHarness({ online = true, failure = false, active = false, waiting = false } = {}) {
  const status = { textContent: '', hidden: true };
  const headerButton = {
    hidden: true,
    disabled: false,
    addEventListener(_, handler) { this.click = handler; },
  };
  const headerStatus = { textContent: '', classList: { toggle() {} } };
  const events = {};
  const messages = [];
  const worker = Object.assign(new EventTarget(), {
    state: waiting ? 'installed' : 'installing', postMessage(message) { messages.push(message); },
  });
  let updateListeners = 0;
  let updates = 0;
  let reloads = 0;
  const registration = {
    active: active ? {} : null,
    installing: waiting ? null : worker,
    waiting: waiting ? worker : null,
    addEventListener(name) { if (name === 'updatefound') updateListeners += 1; },
    async update() { updates += 1; },
  };
  const navigator = { onLine: online, serviceWorker: Object.assign(new EventTarget(), {
    controller: active ? {} : null,
    async register() {
      if (failure) throw new Error('Registration failed');
      return registration;
    },
  }) };
  const source = (await readFile(new URL('./pwa.js', import.meta.url), 'utf8'))
    .replace('import.meta.url', JSON.stringify('https://example.test/DuoJazz/js/pwa.js'));
  vm.runInNewContext(source, {
    URL, navigator, setTimeout, clearTimeout, setInterval() {},
    location: { reload() { reloads += 1; } },
    document: {
      getElementById: id => ({
        'offline-status': status,
        'header-update': headerButton,
        'header-update-status': headerStatus,
      })[id],
      addEventListener(name, handler) { events[name] = handler; },
      visibilityState: 'visible',
    },
    addEventListener(name, handler) { events[name] = handler; },
  });
  await new Promise(resolve => setImmediate(resolve));
  return { status, navigator, events, registration, headerButton, headerStatus, messages, worker,
    updateListeners: () => updateListeners,
    updates: () => updates,
    reloads: () => reloads,
    recover() { failure = false; },
    state(value) {
      worker.state = value;
      if (value === 'installed') {
        registration.installing = null;
        registration.waiting = worker;
      }
      if (value === 'redundant') registration.installing = null;
      worker.dispatchEvent(new Event('statechange'));
    },
  };
}

test('PWA setup, activation and normal offline use stay silent', async () => {
  for (const online of [true, false]) {
    const app = await pwaHarness({ online });
    assert.equal(app.status.hidden, true);
    app.state('installed');
    assert.equal(app.status.hidden, true);
    assert.equal(app.headerButton.hidden, true);
    app.state('activated');
    assert.equal(app.status.hidden, true);
    assert.equal(app.status.textContent, '');
  }
});

test('background installation failures only surface before offline setup', async () => {
  for (const active of [true, false]) {
    const app = await pwaHarness({ active });
    app.state('redundant');
    assert.equal(app.status.hidden, active);
    if (!active) assert.match(app.status.textContent, /could not finish/);
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
  await app.events.online();
  await app.events.online();
  assert.equal(app.updateListeners(), 1);
  assert.equal(app.updates(), 3);
});

test('header shows staged updates and can apply one offline without another check', async () => {
  const app = await pwaHarness({ active: true, online: false });
  assert.equal(app.headerButton.hidden, true);
  app.state('installed');
  assert.equal(app.headerButton.hidden, false);
  assert.equal(app.headerStatus.textContent, 'App update available.');
  assert.equal(app.reloads(), 0);

  const updating = app.headerButton.click();
  assert.equal(app.headerStatus.textContent, 'Updating app…');
  assert.equal(app.headerButton.disabled, true);
  assert.equal(app.updates(), 0);
  assert.deepEqual(app.messages, ['ACTIVATE_UPDATE']);
  assert.equal(app.reloads(), 0);
  app.navigator.serviceWorker.controller = app.worker;
  app.navigator.serviceWorker.dispatchEvent(new Event('controllerchange'));
  await updating;
  assert.equal(app.reloads(), 1);
});

test('header sees an already waiting update and offers a reload after another tab activates it', async () => {
  const app = await pwaHarness({ active: true, waiting: true });
  assert.equal(app.headerButton.hidden, false);
  app.registration.waiting = null;
  app.registration.active = app.worker;
  app.navigator.serviceWorker.controller = app.worker;
  app.navigator.serviceWorker.dispatchEvent(new Event('controllerchange'));
  assert.equal(app.headerButton.hidden, false);
  assert.equal(app.reloads(), 0);
  await app.headerButton.click();
  assert.deepEqual(app.messages, []);
  assert.equal(app.reloads(), 1);
});

test('an unsuccessful header update leaves the current page available for retry', async () => {
  const app = await pwaHarness({ active: true, waiting: true });
  app.worker.postMessage = () => { throw new Error('Activation failed'); };
  await app.headerButton.click();
  assert.equal(app.headerStatus.textContent, 'Update failed. Tap to retry.');
  assert.equal(app.headerButton.disabled, false);
  assert.equal(app.reloads(), 0);
});

test('offline release includes the current application assets', async () => {
  const assets = await releaseAssets();
  assert.equal(await readFile(new URL('../precache.js', import.meta.url), 'utf8'), assets.precache);
  assert.equal(await readFile(new URL('./version.js', import.meta.url), 'utf8'), assets.version);
  const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const settings = index.slice(index.indexOf('id="settings-modal"'), index.indexOf('</dialog>', index.indexOf('id="settings-modal"')));
  assert.match(settings, /id="app-version"[^>]*class="profile-version"/);
  assert.ok(settings.indexOf('id="app-version"') > settings.indexOf('class="profile-actions"'));
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

test('worker falls back to fetch when cache open fails', async () => {
  const events = {};
  const scope = 'https://example.test/DuoJazz/';
  const context = {
    URL, Request, importScripts() {}, PRECACHE_VERSION: 'test',
    PRECACHE_URLS: ['./index.html', './js/app.js'],
    fetch: async request => new Response(`network:${request.url}`),
    self: { registration: { scope }, location: { origin: 'https://example.test' },
      addEventListener: (name, handler) => { events[name] = handler; } },
    caches: { open: async () => { throw new Error('CacheStorage failed'); } },
  };
  vm.runInNewContext(await readFile(new URL('../sw.js', import.meta.url), 'utf8'), context);
  let response;
  events.fetch({ request: { url: scope + 'js/app.js?v=150', method: 'GET', mode: 'cors' }, respondWith(value) { response = value; } });
  assert.equal(await (await response).text(), `network:${scope}js/app.js?v=150`);
});
