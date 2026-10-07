// The single store. Everything the scene and UI show is derived from this state plus the
// per-frame sky cache (skyframe.js). Mutate only through patch(); subscribers get
// (state, changedKeys). The tour player and birth form (later) drive the app through this
// store and through applyScene() in scene/applyScene.js.
//
// Fields
//   date          Date      the instant shown (a UTC instant)
//   rate          number    sky days per real second; 0 = paused (negative runs backwards)
//   lastRate      number    the rate to resume with when un-pausing
//   view          'helio' | 'geo' | 'sky'
//   zoom          'earthSun' | 'inner' | 'outer'
//   location      {name, lat, lon, tz}   observer (sky view, horizon, angles, houses)
//   houseSystem   'wholeSign' | 'placidus'
//   bodies        string[]  visible ids: planets, 'earth', 'ascendant', 'midheaven'
//   toggles       {ring, signLabels, constellations, sightLines, aspects, trails, orbits,
//                  horizon, houses, wheel, earthAxis, meridian}: true/false, or string[] of ids
//   compression   boolean   Earth-centred view: schematic, direction-preserving distances
//   daylight      boolean   sky view: tint the sky and dim stars while the Sun is up
//   focus         string|null   body the camera follows
//   highlight     {signs: [], bodies: [], aspect: [a, b] | null}
//   selection     {kind: 'body'|'sign'|'house'|'aspect'|'term', id} | null  (shared 3D/wheel/panel)
//   hover         same shape | null
//   chart         null | chart object from astro.buildChart (set by the birth form; see README)
//   chartInput    null | ChartInput that built `chart`
//   stopAt        Date | null    playback halts when the date reaches it
//   birthMissing  boolean   a scene asked for 'birth' but no chart is set (tour UI shows a hint)
//   mode          'explore' | 'tour' | 'chart'   active top-bar mode (slots for later UIs)
//   panelOpen     boolean   right-hand info panel visible
//   wheelExpanded boolean
//   cameraRequest {preset, t} | null   one-shot camera preset request (applyScene / UI)
//   transits      boolean   "Your chart" mode: today's sky as an outer ring on the natal wheel

export const TOGGLE_KEYS = [
  'ring', 'signLabels', 'constellations', 'sightLines', 'aspects', 'trails', 'orbits',
  'horizon', 'houses', 'wheel', 'earthAxis', 'meridian',
];

export const DEFAULT_LOCATION = Object.freeze({ name: 'London', lat: 51.5074, lon: -0.1278, tz: 'Europe/London' });

const LS_LOCATION = 'zodiac.location';

export function loadSavedLocation() {
  try {
    const raw = localStorage.getItem(LS_LOCATION);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.lat === 'number' && typeof p?.lon === 'number' && p.name) return p;
  } catch { /* ignore */ }
  return null;
}

export function saveLocation(loc) {
  try { localStorage.setItem(LS_LOCATION, JSON.stringify(loc)); } catch { /* ignore */ }
}

export function createStore(initial) {
  let state = { ...initial };
  const subs = new Set();
  const listeners = new Map();

  const store = {
    get: () => state,
    /** Shallow-merge `partial` into the state and notify subscribers of the changed keys. */
    patch(partial) {
      const changed = [];
      for (const k of Object.keys(partial)) if (state[k] !== partial[k]) changed.push(k);
      if (!changed.length) return;
      state = { ...state, ...partial };
      for (const fn of [...subs]) fn(state, changed);
    },
    /** Set one toggle (true/false or a list of body ids). */
    setToggle(key, value) {
      store.patch({ toggles: { ...state.toggles, [key]: value } });
    },
    /** fn(state, changedKeys). Optional `keys` filters notifications. Returns unsubscribe. */
    subscribe(fn, keys = null) {
      const wrapped = keys ? (s, ch) => { if (ch.some((k) => keys.includes(k))) fn(s, ch); } : fn;
      subs.add(wrapped);
      return () => subs.delete(wrapped);
    },
    /** Event bus. 'click' {kind: 'body'|'sign'|'house'|'aspect', id, source: '3d'|'wheel'|'panel'}. */
    on(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(fn);
      return () => listeners.get(type).delete(fn);
    },
    emit(type, payload) {
      for (const fn of [...(listeners.get(type) ?? [])]) fn(payload);
    },
  };
  return store;
}

export const ALL_BODIES = [
  'sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
  'earth', 'ascendant', 'midheaven',
];

export function initialState() {
  return {
    date: new Date(),
    rate: 0,
    lastRate: 1,
    view: 'geo',
    zoom: 'inner',
    location: loadSavedLocation() ?? { ...DEFAULT_LOCATION },
    houseSystem: 'wholeSign',
    bodies: [...ALL_BODIES],
    toggles: {
      ring: true, signLabels: true, constellations: false, sightLines: true, aspects: false,
      trails: false, orbits: true, horizon: false, houses: false, wheel: true, earthAxis: false,
      meridian: false,
    },
    compression: true,
    daylight: true,
    focus: null,
    highlight: { signs: [], bodies: [], aspect: null },
    selection: null,
    hover: null,
    chart: null,
    chartInput: null,
    stopAt: null,
    birthMissing: false,
    mode: 'explore',
    panelOpen: typeof window === 'undefined' || window.innerWidth >= 820,
    wheelExpanded: false,
    cameraRequest: null,
    transits: false,
  };
}

/**
 * True when the moment shown is the birth moment of a chart whose time is unknown: the chart
 * then has no Ascendant, Midheaven or houses, so the wheel and cards must not show them.
 */
export function birthTimeUnknownShown(state) {
  const c = state.chart;
  return !!c && !c.timeKnown && Math.abs(c.utc.getTime() - state.date.getTime()) < 60000;
}

/** Is a toggle on for one body? Values may be true/false, 'all', or a list of ids. */
export function toggleFor(value, id) {
  if (value === true || value === 'all') return true;
  if (Array.isArray(value)) return value.includes(id);
  return false;
}
/** Is a toggle on at all? */
export const toggleOn = (value) => value === true || value === 'all' || (Array.isArray(value) && value.length > 0);
