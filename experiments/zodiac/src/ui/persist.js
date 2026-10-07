// Browser-only persistence for the tour, the welcome choice and saved birth charts. Pure
// functions over an injectable storage (localStorage in the app, a Map-backed stub in tests).
// Nothing here ever leaves the browser.

export const KEYS = {
  welcome: 'zodiac.welcome',   // 'tour' | 'explore'
  tour: 'zodiac.tour',         // {index, active, done: {stepId: true}, visited: {stepId: true}}
  charts: 'zodiac.charts',     // [{id, input, savedAt}]
  activeChart: 'zodiac.activeChart',
};

export function browserStorage() {
  try {
    const s = window.localStorage;
    const k = '__zodiac_probe__';
    s.setItem(k, '1'); s.removeItem(k);
    return s;
  } catch {
    return memoryStorage();
  }
}

/** Minimal Storage stand-in (tests, or when localStorage is blocked). */
export function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}

function readJSON(storage, key, fallback) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function writeJSON(storage, key, value) {
  try { storage.setItem(key, JSON.stringify(value)); } catch { /* quota or blocked: ignore */ }
}

export function getItem(storage, key) {
  try { return storage.getItem(key); } catch { return null; }
}
export function setItem(storage, key, value) {
  try { storage.setItem(key, value); } catch { /* ignore */ }
}

// ---------------------------------------------------------------- tour progress

export function loadTourProgress(storage, total) {
  const p = readJSON(storage, KEYS.tour, null);
  const out = { index: 0, active: false, done: {}, visited: {} };
  if (p && typeof p === 'object') {
    if (Number.isInteger(p.index)) out.index = Math.max(0, Math.min(total - 1, p.index));
    out.active = !!p.active;
    if (p.done && typeof p.done === 'object') out.done = { ...p.done };
    if (p.visited && typeof p.visited === 'object') out.visited = { ...p.visited };
  }
  return out;
}
export const saveTourProgress = (storage, p) => writeJSON(storage, KEYS.tour, p);

/**
 * Task gate for one tour step. Decides when a task counts as done, given successive
 * observations of `check(task.check)`:
 * - 'clicked': the click log is reset when the step starts, so the first true counts.
 * - 'view': only a view change made after the step started counts (the scene's own view
 *   switch never does); call noteViewChange() when the user changes the view.
 * - every other type (state conditions such as risingSign or bodyInSign) must be seen false
 *   at least once after the step started and then become true, so a condition that happens
 *   to hold when the step opens does not complete it for free.
 */
export function createTaskGate(check, { alreadyDone = false } = {}) {
  const type = check?.type ?? null;
  let armed = type === 'clicked';
  let viewChanged = false;
  let done = alreadyDone || !check;
  let last = null;
  return {
    get done() { return done; },
    get type() { return type; },
    /** True while a state condition already held when the step opened and has not lapsed yet. */
    get alreadyTrue() { return !done && !armed && type !== 'view' && last === true; },
    noteViewChange() { viewChanged = true; },
    /** Feed the current value of the check; returns true on the call the task completes. */
    observe(value) {
      last = !!value;
      if (done) return false;
      if (type === 'view') {
        if (value && viewChanged) { done = true; return true; }
        return false;
      }
      if (!value) { armed = true; return false; }
      if (armed) { done = true; return true; }
      return false;
    },
  };
}

// ---------------------------------------------------------------- saved charts

function normInput(i) {
  if (!i) return null;
  return {
    name: i.name ?? '', year: i.year, month: i.month, day: i.day,
    hour: i.timeKnown ? i.hour : null, minute: i.timeKnown ? i.minute : null, timeKnown: !!i.timeKnown,
    place: {
      name: i.place?.name ?? '',
      lat: Number(Number(i.place?.lat).toFixed(4)),
      lon: Number(Number(i.place?.lon).toFixed(4)),
      tz: i.place?.tz ?? '',
    },
  };
}
/** Same birth moment and place, ignoring names (used to recognise a shared link). */
export function sameMoment(a, b) {
  const x = normInput(a), y = normInput(b);
  if (!x || !y) return false;
  x.name = ''; y.name = ''; x.place.name = ''; y.place.name = '';
  return JSON.stringify(x) === JSON.stringify(y);
}

export function loadCharts(storage) {
  const list = readJSON(storage, KEYS.charts, []);
  return Array.isArray(list) ? list.filter((c) => c && c.id && c.input && c.input.place) : [];
}
export const saveCharts = (storage, list) => writeJSON(storage, KEYS.charts, list);

export const getActiveChartId = (storage) => getItem(storage, KEYS.activeChart);
export function setActiveChartId(storage, id) {
  try { if (id) storage.setItem(KEYS.activeChart, id); else storage.removeItem(KEYS.activeChart); } catch { /* ignore */ }
}

let seq = 0;
const newId = () => `c${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Add a chart, or update the entry with `id` (if given and present). Returns {list, entry}. */
export function upsertChart(list, input, id = null) {
  const existing = id ? list.find((c) => c.id === id) : null;
  if (existing) {
    const entry = { ...existing, input: { ...input }, savedAt: Date.now() };
    return { list: list.map((c) => (c.id === existing.id ? entry : c)), entry };
  }
  const entry = { id: newId(), input: { ...input }, savedAt: Date.now() };
  return { list: [...list, entry], entry };
}
export function renameChart(list, id, name) {
  return list.map((c) => (c.id === id ? { ...c, input: { ...c.input, name: String(name).trim().slice(0, 60) } } : c));
}
export const removeChart = (list, id) => list.filter((c) => c.id !== id);
export const findChartByMoment = (list, input) => list.find((c) => sameMoment(c.input, input)) ?? null;
