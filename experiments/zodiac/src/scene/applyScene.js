// applyScene: drive the whole app from one declarative `scene` directive, the vocabulary used
// by src/content/tour.js. The tour player (next agent) calls this once per step.
//
// Merging: top-level keys omitted from the scene take `sceneDefaults`; `show` keys omitted are
// false. Supported keys (content vocabulary):
//   view      'helio' | 'geo' | 'sky'
//   zoom      'earthSun' | 'inner' | 'outer'           (omitted: 'inner')
//   date      'now' | 'birth' | ISO string | {event: name, ...}   (see scene/events.js)
//   rate      sky days per second; 0 pauses
//   location  'birth' | 'user' | {name, lat, lon, tz?}
//   bodies    'all' | ids (planets, 'earth', 'ascendant', 'midheaven')
//   show      {ring, signLabels, constellations, sightLines, aspects, trails, orbits, horizon,
//              houses, wheel, earthAxis, meridian}: true/false, 'all', or a list of body ids
//   focus     body id the camera follows
//   highlight {signs: [...], bodies: [...], aspect: [a, b]}
// Additions requested by the content author:
//   camera    {preset: 'top' | 'tilt' | 'edge' | 'default'}
//   stopAt    ISO string or 'now': playback halts when the date reaches it
//   houseSystem 'wholeSign' | 'placidus'
//   show.meridian (above)
// 'birth' with no chart set falls back to the current date / the user's place and sets
// state.birthMissing = true (also returned) so the tour UI can show a hint.

import { sceneDefaults } from '../content/index.js';
import { clampDate } from '../astro/index.js';
import { TOGGLE_KEYS, DEFAULT_LOCATION, loadSavedLocation, ALL_BODIES } from '../state.js';
import { resolveEvent } from './events.js';

const PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const KNOWN_TZ = [
  { name: 'London', lat: 51.5074, lon: -0.1278, tz: 'Europe/London' },
];

/** The scene with defaults applied (pure). */
export function resolveScene(scene = {}) {
  const merged = { ...sceneDefaults, ...scene };
  const show = {};
  for (const k of TOGGLE_KEYS) show[k] = scene.show?.[k] ?? false;
  merged.show = show;
  merged.highlight = { signs: [], bodies: [], aspect: null, ...(scene.highlight ?? {}) };
  return merged;
}

function withTz(loc, current) {
  if (loc.tz) return { ...loc };
  if (current && Math.abs(current.lat - loc.lat) < 1e-3 && Math.abs(current.lon - loc.lon) < 1e-3 && current.tz) return { ...loc, tz: current.tz };
  const k = KNOWN_TZ.find((p) => Math.abs(p.lat - loc.lat) < 0.05 && Math.abs(p.lon - loc.lon) < 0.05);
  return { ...loc, tz: k?.tz ?? null };
}

export function resolveDate(spec, { chart, now = new Date() }) {
  if (spec === undefined || spec === null || spec === 'now') return { date: now };
  if (spec === 'birth') return chart ? { date: new Date(chart.utc.getTime()) } : { date: now, birthMissing: true };
  if (typeof spec === 'string') {
    const d = new Date(spec);
    return Number.isNaN(d.getTime()) ? { date: now, error: `Bad date ${spec}` } : { date: clampDate(d) };
  }
  if (spec instanceof Date) return { date: clampDate(spec) };
  if (typeof spec === 'object' && spec.event) {
    const r = resolveEvent(spec, now);
    return r ? { date: clampDate(r.date), event: r } : { date: now, error: `Unknown event ${spec.event}` };
  }
  return { date: now };
}

export function resolveLocation(spec, { chart, current }) {
  if (spec === 'birth') {
    if (chart) {
      const p = chart.input.place;
      return { location: { name: p.name, lat: p.lat, lon: p.lon, tz: p.tz } };
    }
    return { location: loadSavedLocation() ?? current ?? { ...DEFAULT_LOCATION }, birthMissing: true };
  }
  if (spec === 'user') return { location: loadSavedLocation() ?? current ?? { ...DEFAULT_LOCATION } };
  if (spec && typeof spec === 'object' && typeof spec.lat === 'number') return { location: withTz(spec, current) };
  return { location: current ?? { ...DEFAULT_LOCATION } };
}

/**
 * Apply a scene directive to the store.
 * ctx: {store, now?: Date}. Returns {scene (resolved), date, birthMissing, errors}.
 */
export function applyScene(scene, { store, now = new Date() } = {}) {
  const st = store.get();
  const d = resolveScene(scene);
  const errors = [];
  let birthMissing = false;

  const dr = resolveDate(d.date, { chart: st.chart, now });
  if (dr.error) errors.push(dr.error);
  birthMissing ||= !!dr.birthMissing;
  const lr = resolveLocation(d.location, { chart: st.chart, current: st.location });
  birthMissing ||= !!lr.birthMissing;

  let bodies;
  if (d.bodies === 'all' || d.bodies === undefined) bodies = [...PLANETS, 'earth'];
  else bodies = [...d.bodies];

  const toggles = {};
  for (const k of TOGGLE_KEYS) {
    const v = d.show[k];
    toggles[k] = v === 'all' ? true : v;
  }

  const patch = {
    view: d.view,
    zoom: d.zoom ?? 'inner',
    date: dr.date,
    rate: typeof d.rate === 'number' ? d.rate : 0,
    location: lr.location,
    bodies,
    toggles,
    focus: d.focus ?? null,
    highlight: d.highlight,
    selection: null,
    birthMissing,
    stopAt: null,
  };
  if (patch.rate !== 0) patch.lastRate = patch.rate;
  if (d.houseSystem === 'wholeSign' || d.houseSystem === 'placidus') patch.houseSystem = d.houseSystem;
  if (d.stopAt) {
    const s = d.stopAt === 'now' ? now : new Date(d.stopAt);
    if (!Number.isNaN(s.getTime())) patch.stopAt = s;
  }
  patch.cameraRequest = { preset: d.camera?.preset ?? 'default', t: Date.now() };
  store.patch(patch);
  return { scene: d, date: dr.date, event: dr.event ?? null, birthMissing, errors };
}

export { ALL_BODIES };
