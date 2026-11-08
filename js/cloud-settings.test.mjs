import test from 'node:test';
import assert from 'node:assert/strict';
import { createCloudSettings } from './cloud-settings.js';

const storage = () => {
  const map = new Map();
  return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
};
function server() {
  const rows = new Map();
  const api = { rows, fail: false, beforeWrite: null,
    from(table) {
      assert.equal(table, 'user_preferences');
      return {
        select() { return { async eq(_, id) {
          if (api.fail) return { error: Error('offline') };
          return { data: [...rows.values()].filter(row => row.user_id === id).map(row => structuredClone(row)) };
        } }; },
        async upsert(batch, options) {
          if (api.fail) return { error: Error('offline') };
          if (api.beforeWrite) await api.beforeWrite();
          for (const row of batch) {
            const key = `${row.user_id}:${row.name}`;
            if (!options.ignoreDuplicates || !rows.has(key)) rows.set(key, structuredClone(row));
          }
          return {};
        },
      };
    },
  };
  return api;
}

test('settings and favorites restore in a fresh browser; stale caches do not overwrite them', async () => {
  const api = server();
  const first = createCloudSettings({ storage: storage() });
  first.activate('a', { tempo: 96, myCharts: ['four'] });
  await first.sync(api);
  const other = createCloudSettings({ storage: storage() });
  other.activate('a', { tempo: 80, myCharts: [] });
  await other.sync(api);
  assert.deepEqual(other.values(), { tempo: 96, myCharts: ['four'] });
  first.set({ tempo: 120, instrumentId: 'trumpet' });
  await first.sync(api);
  other.set({ myCharts: ['recordame'], metronome: true });
  await other.sync(api);
  await first.sync(api);
  assert.deepEqual(first.values(), { tempo: 120, instrumentId: 'trumpet', myCharts: ['recordame'], metronome: true });
});

test('offline changes survive reopening and retry, including removing all favorites', async () => {
  const disk = storage(), api = server();
  let settings = createCloudSettings({ storage: disk });
  settings.activate('a', { myCharts: ['four'] });
  await settings.sync(api);
  api.fail = true;
  settings.set({ myCharts: [], swing: false });
  await assert.rejects(settings.sync(api));
  settings = createCloudSettings({ storage: disk });
  settings.activate('a');
  assert.deepEqual(settings.values().myCharts, []);
  assert.equal(settings.hasPending(), true);
  api.fail = false;
  await settings.sync(api);
  assert.equal(settings.hasPending(), false);
  const fresh = createCloudSettings({ storage: storage() });
  fresh.activate('a');
  await fresh.sync(api);
  assert.deepEqual(fresh.values(), { myCharts: [], swing: false });
});

test('account switches isolate caches, legacy imports, and in-flight responses', async () => {
  const settings = createCloudSettings({ storage: storage() }), api = server();
  settings.activate('a', { tempo: 100 });
  await settings.sync(api);
  settings.set({ tempo: 120 });
  api.beforeWrite = async () => { settings.activate('b', { tempo: 100 }); };
  await settings.sync(api);
  assert.deepEqual(settings.values(), {});
  api.beforeWrite = null;
  await settings.sync(api);
  assert.deepEqual(settings.values(), {});
  settings.activate('a');
  await settings.sync(api);
  assert.equal(settings.values().tempo, 120);
});

test('edits made during an upload remain queued and are not replaced by the response', async () => {
  const settings = createCloudSettings({ storage: storage() }), api = server();
  settings.activate('a');
  settings.set({ tempo: 100 });
  api.beforeWrite = async () => { settings.set({ tempo: 112 }); };
  await settings.sync(api);
  assert.equal(settings.values().tempo, 112);
  assert.equal(settings.hasPending(), true);
  api.beforeWrite = null;
  await settings.sync(api);
  assert.equal(settings.hasPending(), false);
  assert.equal(api.rows.get('a:tempo').value, 112);
});

test('two tabs preserve each other’s pending fields', async () => {
  const disk = storage(), api = server();
  const a = createCloudSettings({ storage: disk }), b = createCloudSettings({ storage: disk });
  a.activate('a'); b.activate('a');
  a.set({ tempo: 120 }); b.set({ swing: false });
  await b.sync(api); a.reload();
  assert.deepEqual(a.values(), { tempo: 120, swing: false });
  assert.equal(a.hasPending(), false);
});

test('blocked cache writes still allow account saving', async () => {
  const disk = { getItem: () => null, setItem() { throw Error('blocked'); } };
  const settings = createCloudSettings({ storage: disk }), api = server();
  settings.activate('a'); settings.set({ tempo: 120 });
  assert.equal(await settings.sync(api), false);
  assert.equal(api.rows.get('a:tempo').value, 120);
});
