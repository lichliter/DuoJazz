import { writeStoredJson } from './storage.js';

export const SETTINGS_KEY = 'duojazz.accountSettings.v1';
export const SETTINGS_OWNER_KEY = 'duojazz.settingsOwner.v1';
export const PREFERENCE_NAMES = ['instrumentId', 'keyMode', 'startKeyId', 'allKeys', 'selectedKeyIds', 'tempo', 'swing', 'guideTones', 'metronome', 'auto', 'headphonesTipSeen', 'lessons', 'modules'];
export const SETTING_NAMES = [...PREFERENCE_NAMES, 'selectedModuleId', 'myCharts'];
const pick = values => Object.fromEntries(SETTING_NAMES.filter(name => Object.hasOwn(values ?? {}, name)).map(name => [name, structuredClone(values[name])]));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// The account is authoritative. Only explicit edits are uploaded; cached values
// are never blindly written over settings fetched from another device.
export function createCloudSettings({ storage, onChange = () => {} } = {}) {
  let userId = null, generation = 0;
  let state = { values: {}, pending: {}, seed: {} };
  let cacheSaved = true;
  const store = () => storage ?? globalThis.localStorage;
  const key = () => `${SETTINGS_KEY}:${userId}`;
  function persist() {
    if (!userId) return true;
    try { if (store().getItem(key()) === JSON.stringify(state)) return true; } catch {}
    cacheSaved = writeStoredJson(key(), state, storage);
    return cacheSaved;
  }
  function reload() {
    if (!userId) return;
    try {
      const cached = JSON.parse(store().getItem(key()) ?? 'null');
      if (!cached) return;
      const unsaved = cacheSaved ? {} : state.pending;
      state = { values: { ...pick(cached.values), ...unsaved }, pending: { ...pick(cached.pending), ...unsaved }, seed: pick(cached.seed) };
    } catch { /* Retain the in-memory copy if the offline cache is unavailable. */ }
  }
  function values() { return structuredClone(state.values); }
  function activate(id, legacy = {}) {
    generation++;
    cacheSaved = true;
    userId = id;
    state = { values: {}, pending: {}, seed: {} };
    if (!id) return values();
    try {
      const cached = JSON.parse(store().getItem(key()) ?? 'null');
      if (cached) {
        state = { values: pick(cached.values), pending: pick(cached.pending), seed: pick(cached.seed) };
      } else {
        const owner = store().getItem(SETTINGS_OWNER_KEY);
        if (!owner || owner === id) {
          // Claim before importing; a second account must not inherit this data.
          store().setItem(SETTINGS_OWNER_KEY, id);
          state.values = pick(legacy);
          state.seed = pick(legacy);
        }
      }
    } catch { /* Keep practicing; failed local writes are reported by persist. */ }
    persist();
    return values();
  }
  function set(changes) {
    if (!userId) return;
    reload();
    for (const [name, value] of Object.entries(pick(changes))) {
      if (same(state.values[name], value)) continue;
      state.values[name] = value;
      state.pending[name] = value;
    }
    persist();
    onChange();
  }
  async function sync(client) {
    if (!userId) return true;
    const id = userId, version = generation;
    const active = () => version === generation;
    const { data, error } = await client.from('user_preferences').select('name,value').eq('user_id', id);
    if (error) throw error;
    if (!active()) return false;
    reload();
    const remote = pick(Object.fromEntries(data.map(row => [row.name, row.value])));
    const seed = Object.fromEntries(Object.entries(state.seed).filter(([name]) => !Object.hasOwn(remote, name) && !Object.hasOwn(state.pending, name)));
    const rows = entries => Object.entries(entries).map(([name, value]) => ({ user_id: id, name, value }));
    if (Object.keys(seed).length) {
      const result = await client.from('user_preferences').upsert(rows(seed), { onConflict: 'user_id,name', ignoreDuplicates: true });
      if (result.error) throw result.error;
      if (!active()) return false;
    }
    const pending = structuredClone(state.pending);
    if (Object.keys(pending).length) {
      const result = await client.from('user_preferences').upsert(rows(pending), { onConflict: 'user_id,name' });
      if (result.error) throw result.error;
      if (!active()) return false;
    }
    // Fetch after writes, including migration conflicts with another device.
    const latest = await client.from('user_preferences').select('name,value').eq('user_id', id);
    if (latest.error) throw latest.error;
    if (!active()) return false;
    reload();
    for (const [name, value] of Object.entries(pending)) {
      if (same(state.pending[name], value)) delete state.pending[name];
    }
    state.seed = {};
    state.values = { ...pick(Object.fromEntries(latest.data.map(row => [row.name, row.value]))), ...state.pending };
    return persist();
  }
  return { activate, set, values, sync, reload, hasPending: () => Object.keys(state.pending).length > 0, get userId() { return userId; } };
}
