import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { precacheSource } from '../tools/generate-precache.mjs';

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
