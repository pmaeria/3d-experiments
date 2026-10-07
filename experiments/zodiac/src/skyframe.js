// Per-frame sky cache: everything derived from (date, location, house system), computed once
// per change and shared by the scene, the wheel and the panels. getSkyState costs ~1.5 ms, so
// it must never be called more than once per frame.

import {
  getSkyState, localAngles, houseCusps, houseOf, horizonBasis, altAz, getAspects,
  signRingMatrix, clampDate, SIGNS,
} from './astro/index.js';
import { toContentId, houseSystemToEngine } from './ids.js';
import { apparentDirection } from './scene/layout.js';

/**
 * Frame shape:
 * {
 *   date, sky,                       // getSkyState(date)
 *   angles: {asc, mc, dsc, ic, ramc, lst, obliquity},
 *   basis,                           // horizonBasis(date, lat, lon)
 *   houses: {system: 'wholeSign'|'placidus', requested, cusps, fellBack},
 *   aspects: [...]                   // getAspects with angle ids mapped to 'ascendant'/'midheaven'
 *   ringMatrix: {rows, columnMajor}, // signRingMatrix(date)
 *   dirs: {id: {x,y,z}},             // apparent direction of each body (world unit vector)
 *   points: {id: {longitude, latitude, signIndex, degreeInSign, house}}  // bodies + angles
 *   altAz: {id: {alt, az}},          // sky-view altitude/azimuth of each body (geometric)
 *   sunUp, sunAlt,
 * }
 */
export function computeFrame(date, location, houseSystem) {
  const d = clampDate(date);
  const sky = getSkyState(d);
  const { lat, lon } = location;
  const angles = localAngles(d, lat, lon);
  const basis = horizonBasis(d, lat, lon);
  const requested = houseSystem;
  let hc = houseCusps(d, lat, lon, houseSystemToEngine(houseSystem));
  let fellBack = false;
  if (!hc) { hc = houseCusps(d, lat, lon, 'whole'); fellBack = true; }
  const houses = { system: fellBack ? 'wholeSign' : houseSystem, requested, cusps: hc.cusps, fellBack };
  const aspects = getAspects(sky, { asc: angles.asc, mc: angles.mc }).map((a) => ({
    ...a, a: toContentId(a.a), b: toContentId(a.b),
  }));
  const ringMatrix = signRingMatrix(d);
  const points = {};
  const alt = {};
  const dirs = {};
  for (const id of sky.order) {
    const b = sky.bodies[id];
    points[id] = {
      id, longitude: b.longitude, latitude: b.latitude, signIndex: b.signIndex,
      degreeInSign: b.degreeInSign, house: houseOf(b.longitude, houses.cusps),
    };
    dirs[id] = apparentDirection(ringMatrix.rows, b.longitude, b.latitude);
    alt[id] = altAz(dirs[id], basis);
  }
  for (const [id, lonv] of [['ascendant', angles.asc], ['midheaven', angles.mc]]) {
    const si = Math.floor(lonv / 30) % 12;
    points[id] = { id, longitude: lonv, latitude: 0, signIndex: si, degreeInSign: lonv - si * 30, house: houseOf(lonv, houses.cusps) };
  }
  return {
    date: d, sky, angles, basis, houses, aspects,
    ringMatrix,
    dirs,
    points,
    altAz: alt,
    sunAlt: alt.sun.alt,
    sunUp: alt.sun.alt > -0.833,
    risingSign: SIGNS[points.ascendant.signIndex].id,
  };
}

export function createSkyCache() {
  let key = '';
  let frame = null;
  return {
    /** Frame for the store state; recomputed only when date, place or house system change. */
    get(state) {
      const k = `${state.date.getTime()}|${state.location.lat}|${state.location.lon}|${state.houseSystem}`;
      if (k !== key || !frame) {
        frame = computeFrame(state.date, state.location, state.houseSystem);
        key = k;
      }
      return frame;
    },
    peek: () => frame,
  };
}
