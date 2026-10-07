// Birth charts: input -> chart object, plus compact share-link encoding of the input.

import { BODY_IDS, SIGNS, ELEMENTS, MODALITIES } from './constants.js';
import { getSkyState, signOf, formatLongitude, bodyLongitude } from './sky.js';
import { localAngles, wholeSignCusps, placidusCusps, houseOf } from './local.js';
import { getAspects } from './aspects.js';
import { localToUtc, isValidTimeZone } from './tz.js';

/**
 * @typedef {Object} ChartInput
 * @property {string} name
 * @property {number} year   astronomical numbering (0 = 1 BCE)
 * @property {number} month  1-12
 * @property {number} day
 * @property {number} hour   0-23 (ignored when timeKnown is false)
 * @property {number} minute 0-59
 * @property {boolean} timeKnown
 * @property {{name: string, lat: number, lon: number, tz: string}} place  lon east-positive; tz IANA id, 'UTC' or 'LMT'
 */

/** Check a ChartInput; returns an array of human-readable problems (empty if valid). */
export function validateChartInput(input) {
  const errs = [];
  const isInt = (v) => Number.isInteger(v);
  if (!input || typeof input !== 'object') return ['Missing input'];
  if (!isInt(input.year)) errs.push('Year must be a whole number');
  if (!isInt(input.month) || input.month < 1 || input.month > 12) errs.push('Month must be 1-12');
  if (!isInt(input.day) || input.day < 1 || input.day > 31) errs.push('Day must be 1-31');
  if (input.timeKnown) {
    if (!isInt(input.hour) || input.hour < 0 || input.hour > 23) errs.push('Hour must be 0-23');
    if (!isInt(input.minute) || input.minute < 0 || input.minute > 59) errs.push('Minute must be 0-59');
  }
  const p = input.place;
  if (!p) errs.push('Missing place');
  else {
    if (!Number.isFinite(p.lat) || p.lat < -90 || p.lat > 90) errs.push('Latitude must be -90..90');
    if (!Number.isFinite(p.lon) || p.lon < -180 || p.lon > 180) errs.push('Longitude must be -180..180');
    if (!p.tz || !isValidTimeZone(p.tz)) errs.push(`Unknown time zone: ${p.tz}`);
  }
  return errs;
}

const placement = (id, name, glyph, longitude, extra = {}) => {
  const s = signOf(longitude);
  return {
    id, name, glyph, ...s,
    formatted: formatLongitude(longitude),
    element: SIGNS[s.signIndex].element,
    modality: SIGNS[s.signIndex].modality,
    house: null, retrograde: false, constellation: null, kind: 'body',
    ...extra,
  };
};

/**
 * Build a chart.
 * options: {houseSystem: 'whole' | 'placidus' (default 'whole'), nodeType: 'true' | 'mean'
 *   (default 'true'), orbs, disambiguation (see localToUtc)}
 * Throws Error listing validation problems, or RangeError outside the supported date range.
 * Returns the chart object described in the README ("buildChart").
 */
export function buildChart(input, { houseSystem = 'whole', nodeType = 'true', orbs, disambiguation = 'compatible' } = {}) {
  const problems = validateChartInput(input);
  if (problems.length) throw new Error(problems.join('; '));
  const { place, timeKnown } = input;
  const notes = [];

  const local = { year: input.year, month: input.month, day: input.day, hour: timeKnown ? input.hour : 12, minute: timeKnown ? input.minute : 0 };
  const conv = localToUtc(local, place.tz, { disambiguation, lon: place.lon });
  if (conv.status === 'skipped') notes.push(`That clock time did not exist (clocks jumped forward); used ${conv.offsetLabel}.`);
  if (conv.status === 'ambiguous') notes.push(`That clock time happened twice (clocks went back); used ${conv.offsetLabel}.`);
  if (conv.isLocalMeanTime && place.tz !== 'LMT') notes.push('Before standard time: the zone gives the local mean time of its main city.');
  if (!timeKnown) notes.push('Birth time unknown: positions for local noon; no Ascendant, Midheaven or houses; the Moon may be up to ~7° either side.');

  const sky = getSkyState(conv.date);
  for (const n of sky.support.notes) notes.push(n);

  let angles = null, houses = null;
  if (timeKnown) {
    angles = localAngles(conv.date, place.lat, place.lon);
    let cusps = houseSystem === 'placidus' ? placidusCusps(angles.ramc, place.lat, angles.obliquity) : wholeSignCusps(angles.asc);
    let system = houseSystem;
    if (!cusps) {
      notes.push('Placidus houses are undefined this close to the pole; using Whole Sign houses.');
      cusps = wholeSignCusps(angles.asc);
      system = 'whole';
    }
    houses = { system, requested: houseSystem, cusps };
  }

  const placements = BODY_IDS.map((id) => {
    const b = sky.bodies[id];
    return placement(id, b.name, b.glyph, b.longitude, {
      retrograde: b.retrograde, speed: b.speed, constellation: b.constellation,
      house: houses ? houseOf(b.longitude, houses.cusps) : null,
    });
  });
  const nodeLon = nodeType === 'mean' ? sky.nodes.meanNorth : sky.nodes.trueNorth;
  placements.push(placement('northNode', `North Node (${nodeType})`, '☊', nodeLon, {
    kind: 'point', house: houses ? houseOf(nodeLon, houses.cusps) : null,
  }));
  if (angles) {
    placements.push(placement('asc', 'Ascendant', 'AC', angles.asc, { kind: 'angle', house: 1 }));
    placements.push(placement('mc', 'Midheaven', 'MC', angles.mc, { kind: 'angle', house: houseOf(angles.mc, houses.cusps) }));
  }

  const tallies = { elements: Object.fromEntries(ELEMENTS.map((e) => [e, 0])), modalities: Object.fromEntries(MODALITIES.map((m) => [m, 0])) };
  for (const p of placements) {
    if (p.kind !== 'body') continue;
    tallies.elements[p.element]++;
    tallies.modalities[p.modality]++;
  }

  let moonRange = null;
  if (!timeKnown) {
    const start = localToUtc({ ...local, hour: 0, minute: 0 }, place.tz, { lon: place.lon }).date;
    const end = localToUtc({ ...local, hour: 23, minute: 59 }, place.tz, { lon: place.lon }).date;
    moonRange = { start: bodyLongitude('moon', start).longitude, end: bodyLongitude('moon', end).longitude };
  }

  return {
    input,
    utc: conv.date,
    offsetMinutes: conv.offsetMinutes,
    offsetLabel: conv.offsetLabel,
    tzStatus: conv.status,
    tzAlternatives: conv.alternatives,
    timeKnown: !!timeKnown,
    sky,
    angles,
    houses,
    placements,
    aspects: getAspects(sky, angles, { orbs }),
    tallies,
    moonRange,
    notes,
  };
}

// ---------------------------------------------------------------------------------------------
// Share links. Format version 1, '~'-separated, URL-hash safe and human-readable:
//   1~<name>~<Y>.<M>.<D>~<HH>.<MM> (empty if time unknown)~<lat>~<lon>~<tz>~<place name>
// Text fields use encodeURIComponent plus escaping of '~'. Example:
//   1~Ada~1990.6.15~14.30~51.5074~-0.1278~Europe%2FLondon~London
// ---------------------------------------------------------------------------------------------

export const SHARE_VERSION = 1;

const esc = (s) => encodeURIComponent(s ?? '').replace(/~/g, '%7E');
const unesc = (s) => decodeURIComponent(s);
const num = (v, digits) => String(Number(v.toFixed(digits)));

/** Encode a ChartInput into a compact URL-safe string (for location.hash). */
export function encodeChartInput(input) {
  const problems = validateChartInput(input);
  if (problems.length) throw new Error(problems.join('; '));
  const p = input.place;
  return [
    SHARE_VERSION,
    esc(input.name),
    `${input.year}.${input.month}.${input.day}`,
    input.timeKnown ? `${input.hour}.${String(input.minute).padStart(2, '0')}` : '',
    num(p.lat, 4),
    num(p.lon, 4),
    esc(p.tz),
    esc(p.name),
  ].join('~');
}

/**
 * Decode a string from encodeChartInput (a leading '#' is ignored). Returns a ChartInput.
 * Throws Error('Invalid chart link: ...') on malformed or unsupported input.
 */
export function decodeChartInput(str) {
  const fail = (why) => { throw new Error(`Invalid chart link: ${why}`); };
  if (typeof str !== 'string') fail('not a string');
  const parts = str.replace(/^#/, '').split('~');
  if (parts[0] !== String(SHARE_VERSION)) fail(`unsupported version ${parts[0]}`);
  if (parts.length !== 8) fail('wrong number of fields');
  let name, tz, placeName;
  try { name = unesc(parts[1]); tz = unesc(parts[6]); placeName = unesc(parts[7]); } catch { fail('bad escaping'); }
  const dm = /^(-?\d+)\.(\d{1,2})\.(\d{1,2})$/.exec(parts[2]);
  if (!dm) fail('bad date');
  let hour = 12, minute = 0, timeKnown = false;
  if (parts[3] !== '') {
    const tm = /^(\d{1,2})\.(\d{2})$/.exec(parts[3]);
    if (!tm) fail('bad time');
    hour = Number(tm[1]); minute = Number(tm[2]); timeKnown = true;
  }
  const lat = Number(parts[4]), lon = Number(parts[5]);
  if (parts[4] === '' || parts[5] === '' || !Number.isFinite(lat) || !Number.isFinite(lon)) fail('bad coordinates');
  const input = {
    name, year: Number(dm[1]), month: Number(dm[2]), day: Number(dm[3]), hour, minute, timeKnown,
    place: { name: placeName, lat, lon, tz },
  };
  const problems = validateChartInput(input);
  if (problems.length) fail(problems.join('; '));
  return input;
}
