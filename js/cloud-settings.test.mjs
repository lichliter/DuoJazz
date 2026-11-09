import test from 'node:test';
import assert from 'node:assert/strict';
import { createCloudSettings } from './cloud-settings.js';
import { storageWarning } from './storage.js';

const storage = () => {
  const map = new Map();
  return { get length() { return map.size; }, key: i => [...map.keys()][i], getItem: key => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key) };
};
function server() {
  const rows = new Map();
  const api = { rows, fail: false, beforeWrite: null,
    from(table) {
      assert.equal(table, 'user_preferences');
      return { select() { let id; const q = {
        eq(_, next) { id = next; return q; }, order() { return q; },
        async range(start, end) {
          if (api.fail) return { error: Error('offline') };
          return { data: [...rows.values()].filter(row => row.user_id === id).sort((a,b) => a.name.localeCompare(b.name)).slice(start,end+1).map(row => structuredClone(row)) };
        },
      }; return q; } };
    },
    async rpc(name, { changes }) {
      assert.equal(name, 'save_user_preferences');
      if (api.fail) return { error: Error('offline') };
      if (api.beforeWrite) await api.beforeWrite(changes);
      for (const row of changes) {
        const key = `${api.userId ?? 'a'}:${row.name}`, saved = rows.get(key);
        if (!saved || row.edit_clock > saved.edit_clock || (row.edit_clock === saved.edit_clock && row.edit_id > saved.edit_id)) {
          rows.set(key, { ...structuredClone(row), user_id: api.userId ?? 'a' });
        }
      }
      return {};
    },
  };
  return api;
}
const empty = { myCharts: [], lessons: {}, modules: {} };

test('settings and favorites restore in a fresh browser; stale caches do not overwrite them', async () => {
  const api = server();
  const first = createCloudSettings({ storage: storage() });
  first.activate('a', { ...empty, tempo: 96, myCharts: ['four'] });
  await first.sync(api);
  const other = createCloudSettings({ storage: storage() });
  other.activate('a', { tempo: 80, myCharts: [] });
  await other.sync(api);
  assert.deepEqual(other.values(), { ...empty, tempo: 96, myCharts: ['four'] });
  first.set({ tempo: 120, instrumentId: 'trumpet' });
  await first.sync(api);
  other.set({ myCharts: ['recordame'], metronome: true });
  await other.sync(api);
  await first.sync(api);
  assert.deepEqual(first.values(), { ...empty, tempo: 120, instrumentId: 'trumpet', myCharts: ['recordame'], metronome: true });
});

test('offline changes survive reopening and retry, including removing all favorites', async () => {
  const disk = storage(), api = server();
  let settings = createCloudSettings({ storage: disk });
  settings.activate('a', { myCharts: ['four'] });
  await settings.sync(api);
  api.fail = true;
  settings.set({ ...empty, myCharts: [], swing: false });
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
  assert.deepEqual(fresh.values(), { ...empty, myCharts: [], swing: false });
});

test('account switches isolate caches, legacy imports, and in-flight responses', async () => {
  const settings = createCloudSettings({ storage: storage() }), api = server();
  settings.activate('a', { tempo: 100 });
  await settings.sync(api);
  settings.set({ tempo: 120 });
  api.beforeWrite = async () => { settings.activate('b', { tempo: 100 }); };
  await settings.sync(api);
  assert.deepEqual(settings.values(), empty);
  api.beforeWrite = null;
  api.userId = 'b';
  await settings.sync(api);
  assert.deepEqual(settings.values(), empty);
  api.userId = 'a';
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
  assert.deepEqual(a.values(), { ...empty, tempo: 120, swing: false });
  assert.equal(a.hasPending(), false);
});

test('blocked cache writes still allow account saving', async () => {
  const disk = { getItem: () => null, setItem() { throw Error('blocked'); } };
  const settings = createCloudSettings({ storage: disk }), api = server();
  settings.activate('a'); settings.set({ tempo: 120 });
  assert.equal(await settings.sync(api), false);
  assert.equal(api.rows.get('a:tempo').value, 120);
});

test('a delayed older request cannot undo a newer save or leave the cache stale', async () => {
  const disk = storage(), api = server();
  const a = createCloudSettings({ storage: disk }), b = createCloudSettings({ storage: disk });
  a.activate('a'); b.activate('a');
  let release, entered;
  const blocked = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { entered = resolve; });
  api.beforeWrite = async rows => { if (rows.some(row => row.name === 'tempo' && row.value === 100)) { entered(); await blocked; } };
  a.set({ tempo: 100 }); const old = a.sync(api); await started;
  b.set({ tempo: 120 }); await b.sync(api); release(); await old;
  a.reload(); b.reload();
  assert.equal(api.rows.get('a:tempo').value, 120);
  assert.equal(a.values().tempo, 120); assert.equal(b.values().tempo, 120);
  assert.equal(a.hasPending(), false); assert.equal(b.hasPending(), false);
});

test('favorite additions and removals merge across independent devices, including stale replays', async () => {
  const api = server(), a = createCloudSettings({ storage: storage() }), b = createCloudSettings({ storage: storage() });
  a.activate('a', { myCharts: ['four'] }); await a.sync(api);
  b.activate('a'); await b.sync(api);
  a.setChart('autumn-leaves', true); await a.sync(api);
  b.setChart('recordame', true); b.setChart('four', false); await b.sync(api);
  await a.sync(api);
  assert.deepEqual(a.values().myCharts, ['autumn-leaves', 'recordame']);
  const fresh = createCloudSettings({ storage: storage() });
  fresh.activate('a', { myCharts: ['four'] }); await fresh.sync(api);
  assert.deepEqual(fresh.values().myCharts, ['autumn-leaves', 'recordame']);
});

test('independent lesson edits do not replace other lessons', async () => {
  const api = server(), a = createCloudSettings({ storage: storage() }), b = createCloudSettings({ storage: storage() });
  const lessons = { first: { tempo: 96, melodyRegister: 0 }, second: { tempo: 96, melodyRegister: 0 } };
  a.activate('a', { lessons }); await a.sync(api); b.activate('a'); await b.sync(api);
  a.set({ lessons: { ...lessons, first: { tempo: 96, melodyRegister: 1 } } }); await a.sync(api);
  b.set({ lessons: { ...lessons, second: { tempo: 96, melodyRegister: -1 } } }); await b.sync(api); await a.sync(api);
  assert.equal(a.values().lessons.first.melodyRegister, 1);
  assert.equal(a.values().lessons.second.melodyRegister, -1);
});

test('all twelve account starting keys retain their pitch and selected-key membership', async () => {
  const { normalizeAccountPrefs, TWELVE_KEY_IDS } = await import('./session.js');
  for (const key of TWELVE_KEY_IDS) {
    const api = server(), source = createCloudSettings({ storage: storage() });
    source.activate('a'); source.set({ startKeyId: key, selectedKeyIds: [key], allKeys: false }); await source.sync(api);
    const fresh = createCloudSettings({ storage: storage() }); fresh.activate('a'); await fresh.sync(api);
    const restored = normalizeAccountPrefs(fresh.values());
    assert.equal(restored.startKeyId, key);
    assert.deepEqual(restored.selectedKeyIds, [key]);
  }
});

test('damaged snapshots and journal entries do not hide valid settings or poison new saves', async () => {
  const disk = storage(), api = server(), prefix = 'duojazz.accountSettings.v1:a';
  const good = { name: 'swing', value: false, edit_clock: 1, edit_id: crypto.randomUUID() };
  disk.setItem(prefix, JSON.stringify({ format: 2, entries: {
    tempo: null, instrumentId: { name: 'instrumentId', value: {}, edit_clock: 'bad', edit_id: 'bad' },
  }, seed: { metronome: {}, allKeys: false } }));
  disk.setItem(prefix + ':edit:broken', '{');
  disk.setItem(prefix + ':edit:' + good.edit_id, JSON.stringify(good));
  const settings = createCloudSettings({ storage: disk });
  assert.doesNotThrow(() => settings.activate('a'));
  assert.equal(settings.values().swing, false);
  assert.equal(settings.values().allKeys, false);
  assert.equal(settings.values().metronome, undefined);
  api.rows.set('a:tempo', { user_id: 'a', name: 'tempo', value: {}, edit_clock: 'broken', edit_id: null });
  await settings.sync(api);
  settings.set({ tempo: 120 });
  // Remove the corrupt server fixture so a subsequent valid write can be stored.
  api.rows.delete('a:tempo');
  await settings.sync(api);
  assert.equal(api.rows.get('a:tempo').value, 120);
  assert.equal(Number.isSafeInteger(api.rows.get('a:tempo').edit_clock), true);
  assert.equal(settings.hasPending(), false);
});

test('a failed journal write survives reopening through the snapshot and still uploads', async () => {
  const disk = storage(), api = server();
  const write = disk.setItem;
  disk.setItem = (key, value) => { if (key.includes(':edit:')) throw Error('quota'); write(key, value); };
  let settings = createCloudSettings({ storage: disk });
  settings.activate('a'); settings.set({ tempo: 124 });
  settings = createCloudSettings({ storage: disk });
  settings.activate('a');
  assert.equal(settings.hasPending(), true);
  await settings.sync(api);
  assert.equal(api.rows.get('a:tempo').value, 124);
  assert.equal(storageWarning(), '');
  settings = createCloudSettings({ storage: disk }); settings.activate('a');
  assert.equal(settings.hasPending(), false);
});

test('malformed legacy values and unknown field shapes cannot break activation', () => {
  const settings = createCloudSettings({ storage: storage() });
  assert.doesNotThrow(() => settings.activate('a', { myCharts: {}, lessons: { a: null }, modules: { b: null } }));
  settings.set({ tempo: {}, selectedKeyIds: {}, myCharts: {}, lessons: { a: [] } });
  assert.deepEqual(settings.values(), empty);
  assert.equal(settings.hasPending(), false);
});
