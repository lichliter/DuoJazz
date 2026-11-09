import { writeStoredJson } from './storage.js';

export const SETTINGS_KEY = 'duojazz.accountSettings.v1';
export const SETTINGS_OWNER_KEY = 'duojazz.settingsOwner.v1';
export const PREFERENCE_NAMES = ['instrumentId', 'keyMode', 'startKeyId', 'allKeys', 'selectedKeyIds', 'tempo', 'swing', 'guideTones', 'metronome', 'auto', 'headphonesTipSeen', 'lessons', 'modules'];
const scalarNames = [...PREFERENCE_NAMES.filter(n => !['lessons', 'modules'].includes(n)), 'selectedModuleId'];
const zeroId = '00000000-0000-0000-0000-000000000000';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fieldDefault = name => name.startsWith('lesson:') ? (name.endsWith(':tempo') ? 96 : 0)
  : name.startsWith('module:') ? 'learn' : undefined;
const newer = (a, b) => !b || a.edit_clock > b.edit_clock || (a.edit_clock === b.edit_clock && a.edit_id > b.edit_id);
const validName = name => scalarNames.includes(name) || /^chart:[a-z0-9-]+$/.test(name)
  || /^lesson:[a-z0-9:-]+:(tempo|melodyRegister)$/.test(name) || /^module:[a-z0-9-]+:studyMode$/.test(name);
function flatten(values) {
  const result = Object.fromEntries(scalarNames.filter(n => Object.hasOwn(values, n)).map(n => [n, values[n]]));
  for (const id of values.myCharts ?? []) result[`chart:${id}`] = true;
  for (const [id, lesson] of Object.entries(values.lessons ?? {})) {
    for (const field of ['tempo', 'melodyRegister']) if (Object.hasOwn(lesson, field)) result[`lesson:${id}:${field}`] = lesson[field];
  }
  for (const [id, module] of Object.entries(values.modules ?? {})) result[`module:${id}:studyMode`] = module.studyMode;
  return Object.fromEntries(Object.entries(result).filter(([name, value]) => validName(name) && value !== undefined));
}
function initialSettings(values) {
  return Object.fromEntries(Object.entries(flatten(values)).filter(([name, value]) =>
    !(name.startsWith('lesson:') && ((name.endsWith(':tempo') && value === 96) || (name.endsWith(':melodyRegister') && value === 0)))
    && !(name.startsWith('module:') && value === 'learn')));
}
function expand(entries) {
  const result = { myCharts: [], lessons: {}, modules: {} };
  for (const [name, { value }] of Object.entries(entries)) {
    if (name.startsWith('chart:')) { if (value === true) result.myCharts.push(name.slice(6)); }
    else if (name.startsWith('lesson:') || name.startsWith('module:')) {
      const group = name.startsWith('lesson:') ? 'lessons' : 'modules';
      const end = name.lastIndexOf(':'), id = name.slice(7, end), field = name.slice(end + 1);
      (result[group][id] ??= {})[field] = value;
    } else result[name] = structuredClone(value);
  }
  result.myCharts.sort();
  return result;
}
export function createCloudSettings({ storage, onChange = () => {}, now = Date.now, uuid = () => crypto.randomUUID() } = {}) {
  let userId = null, generation = 0, entries = {}, seed = {}, memory = new Map();
  const store = () => storage ?? globalThis.localStorage;
  const key = () => `${SETTINGS_KEY}:${userId}`;
  const prefix = () => `${key()}:edit:`;
  function merge(rows) {
    for (const row of rows) if (validName(row.name) && (newer(row, entries[row.name]) || (row.edit_clock === entries[row.name]?.edit_clock && row.edit_id === entries[row.name]?.edit_id))) entries[row.name] = structuredClone(row);
  }
  function operations() {
    const ops = new Map(memory);
    try {
      const target = store();
      for (let i = 0; i < target.length; i++) {
        const name = target.key(i);
        if (name?.startsWith(prefix())) {
          const op = JSON.parse(target.getItem(name));
          if (op && validName(op.name)) ops.set(op.edit_id, op);
        }
      }
    } catch { /* Memory retains edits when the offline cache is unavailable. */ }
    return [...ops.values()];
  }
  function reload() {
    try {
      const cache = JSON.parse(store().getItem(key()) ?? 'null');
      if (cache?.format === 2) merge(Object.values(cache.entries ?? {}));
    } catch {}
    merge(operations());
  }
  function persist() {
    if (!userId) return true;
    return writeStoredJson(key(), { format: 2, entries, seed }, storage);
  }
  function edit(name, value) {
    const clock = Math.max(now(), ...Object.values(entries).map(e => e.edit_clock + 1));
    const op = { name, value: structuredClone(value), edit_clock: clock, edit_id: uuid() };
    memory.set(op.edit_id, op);
    if (writeStoredJson(prefix() + op.edit_id, op, storage)) memory.delete(op.edit_id);
    merge([op]);
  }
  function activate(id, legacy = {}) {
    generation++; userId = id; entries = {}; seed = {}; memory = new Map();
    if (!id) return values();
    let oldPending = {};
    try {
      const cache = JSON.parse(store().getItem(key()) ?? 'null');
      if (cache?.format === 2) { entries = cache.entries ?? {}; seed = cache.seed ?? {}; }
      else if (cache) { seed = initialSettings(cache.values ?? {}); oldPending = cache.pending ?? {}; }
      else {
        const owner = store().getItem(SETTINGS_OWNER_KEY);
        if (!owner || owner === id) { store().setItem(SETTINGS_OWNER_KEY, id); seed = initialSettings(legacy); }
      }
    } catch {}
    merge(Object.entries(seed).map(([name, value]) => ({ name, value, edit_clock: 0, edit_id: zeroId })));
    reload();
    if (Object.keys(oldPending).length) set(oldPending);
    persist();
    return values();
  }
  function values() { return expand(entries); }
  function set(changes) {
    if (!userId) return;
    // Compute list differences against what this tab actually displayed.
    const previousCharts = values().myCharts;
    const flat = flatten(changes);
    if (Object.hasOwn(changes, 'myCharts')) {
      for (const id of previousCharts) if (!changes.myCharts.includes(id)) flat[`chart:${id}`] = false;
      for (const id of changes.myCharts) if (previousCharts.includes(id)) delete flat[`chart:${id}`];
    }
    const changed = Object.entries(flat).filter(([name, value]) => !same(entries[name]?.value ?? fieldDefault(name), value));
    reload();
    for (const [name, value] of changed) edit(name, value);
    persist(); onChange();
  }
  function setChart(id, selected) {
    if (!userId || !validName(`chart:${id}`)) return;
    reload(); edit(`chart:${id}`, selected); persist(); onChange();
  }
  async function sync(client) {
    if (!userId) return true;
    const id = userId, version = generation, editPrefix = prefix();
    const active = () => version === generation;
    const read = async () => {
      const rows = [];
      for (let offset = 0; ; offset += 500) {
        const result = await client.from('user_preferences').select('name,value,edit_clock,edit_id').eq('user_id', id).order('name').range(offset, offset + 499);
        if (result.error) throw result.error;
        rows.push(...result.data);
        if (result.data.length < 500 || !active()) return rows;
      }
    };
    const remote = await read();
    if (!active()) return false;
    reload(); merge(remote);
    const pending = operations();
    const initial = Object.entries(seed).map(([name, value]) => ({ name, value, edit_clock: 0, edit_id: zeroId }));
    // Include only the newest edit for each field in a request. The database
    // also compares ordering markers atomically, so retries and delayed requests
    // cannot roll back a newer edit. Zero-clock imports never replace saved data.
    const batch = new Map();
    for (const row of [...initial, ...pending]) if (newer(row, batch.get(row.name))) batch.set(row.name, row);
    if (batch.size) {
      const result = await client.rpc('save_user_preferences', { changes: [...batch.values()] });
      if (result.error) throw result.error;
      if (!active()) return false;
    }
    const latest = await read();
    if (!active()) return false;
    reload(); merge(latest);
    for (const op of pending) {
      memory.delete(op.edit_id);
      try { store().removeItem(editPrefix + op.edit_id); } catch { /* Safe to retry the same id. */ }
    }
    seed = {};
    return persist();
  }
  return { activate, set, setChart, values, sync, reload, hasPending: () => operations().length > 0, get userId() { return userId; } };
}
