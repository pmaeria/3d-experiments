// Observer-dependent quantities: sidereal time, chart angles, houses, horizon basis, alt/az.
// Latitude in degrees (north positive), longitude in degrees (EAST positive).

import * as A from 'astronomy-engine';
import { DEG, RAD, norm360, dot, mulMV, rowsFromAe, mulMM } from './math.js';
import { toTime } from './time.js';

const EARTH_EQUATORIAL_RADIUS_AU = 6378.137 / A.KM_PER_AU;

/** Local apparent sidereal time in hours [0,24). */
export function localSiderealTime(date, lon) {
  const gast = A.SiderealTime(toTime(date));
  return norm360((gast + lon / 15) * 15) / 15;
}

/** Rotate an equatorial-of-date vector into the true ecliptic of date. */
function eqdToEct(v, eps) {
  const c = Math.cos(eps * DEG), s = Math.sin(eps * DEG);
  return { x: v.x, y: v.y * c + v.z * s, z: -v.y * s + v.z * c };
}

/**
 * Angles from the right ascension of the MC (RAMC, degrees), latitude and obliquity.
 * Pure geometry, exported for testing. Returns tropical longitudes in degrees.
 *  - asc: the intersection of ecliptic and horizon in the EASTERN half of the sky.
 *  - mc: the ecliptic point on the upper meridian (hour angle 0), conventional definition;
 *    above the horizon everywhere except inside the polar circles.
 */
export function anglesFromRamc(ramc, lat, eps) {
  const th = ramc * DEG, ph = lat * DEG;
  const zen = eqdToEct({ x: Math.cos(ph) * Math.cos(th), y: Math.cos(ph) * Math.sin(th), z: Math.sin(ph) }, eps);
  const east = eqdToEct({ x: -Math.sin(th), y: Math.cos(th), z: 0 }, eps);
  const upper = eqdToEct({ x: Math.cos(th), y: Math.sin(th), z: 0 }, eps);

  // Ecliptic pole is +z in ECT. Ecliptic ∩ horizon direction = K × zenith.
  let d = { x: -zen.y, y: zen.x, z: 0 };
  let asc;
  if (Math.hypot(d.x, d.y) < 1e-12) {
    asc = NaN; // ecliptic coincides with horizon (only exactly at |lat| = 90 - eps): fix below
  } else {
    if (dot(d, east) < 0) d = { x: -d.x, y: -d.y, z: 0 };
    asc = norm360(Math.atan2(d.y, d.x) * RAD);
  }
  // Ecliptic ∩ meridian plane (normal = east) = K × east, choose the upper-meridian side.
  let m = { x: -east.y, y: east.x, z: 0 };
  if (dot(m, upper) < 0) m = { x: -m.x, y: -m.y, z: 0 };
  const mc = norm360(Math.atan2(m.y, m.x) * RAD);
  if (Number.isNaN(asc)) asc = norm360(mc + 90);
  return { asc, mc, dsc: norm360(asc + 180), ic: norm360(mc + 180) };
}

/**
 * Chart angles for an instant and place.
 * Returns {lst (hours), ramc (deg), obliquity (true, deg), asc, dsc, mc, ic (tropical deg)}.
 */
export function localAngles(date, lat, lon) {
  const time = toTime(date);
  const lst = localSiderealTime(time, lon);
  const ramc = lst * 15;
  const eps = A.e_tilt(time).tobl;
  return { lst, ramc, obliquity: eps, ...anglesFromRamc(ramc, lat, eps) };
}

/** Whole Sign cusps: cusp 1 at 0 deg of the Ascendant's sign, then every 30 deg. */
export function wholeSignCusps(asc) {
  const first = Math.floor(norm360(asc) / 30) * 30;
  return Array.from({ length: 12 }, (_, i) => norm360(first + 30 * i));
}

/**
 * Placidus cusps (12 tropical longitudes, index 0 = cusp 1) from RAMC, latitude, obliquity.
 * Returns null where Placidus is undefined: |lat| >= 90 - obliquity (polar circles), or if
 * the semi-arc iteration fails.
 */
export function placidusCusps(ramc, lat, eps) {
  if (Math.abs(lat) >= 90 - eps) return null;
  const tanPhi = Math.tan(lat * DEG);
  const sinEps = Math.sin(eps * DEG), cosEps = Math.cos(eps * DEG);
  const lonFromRa = (ra) => norm360(Math.atan2(Math.sin(ra * DEG), Math.cos(ra * DEG) * cosEps) * RAD);

  // hourAngleEast(dsa): how far east of the upper meridian (in RA) the cusp lies.
  const solve = (hourAngleEast) => {
    let ra = ramc + hourAngleEast(90);
    for (let i = 0; i < 100; i++) {
      const lon = lonFromRa(ra);
      const sinDec = sinEps * Math.sin(lon * DEG);
      const tanDec = sinDec / Math.sqrt(1 - sinDec * sinDec);
      const x = -tanPhi * tanDec;
      if (x < -1 || x > 1) return null;
      const dsa = Math.acos(x) * RAD;
      const next = ramc + hourAngleEast(dsa);
      if (Math.abs(next - ra) < 1e-10) return lonFromRa(next);
      ra = next;
    }
    return null;
  };
  const c11 = solve((dsa) => dsa / 3);
  const c12 = solve((dsa) => (2 * dsa) / 3);
  const c2 = solve((dsa) => 60 + (2 * dsa) / 3);
  const c3 = solve((dsa) => 120 + dsa / 3);
  if ([c11, c12, c2, c3].some((c) => c === null)) return null;
  const { asc, mc } = anglesFromRamc(ramc, lat, eps);
  const cusps = [asc, c2, c3, mc + 180, c11 + 180, c12 + 180, asc + 180, c2 + 180, c3 + 180, mc, c11, c12];
  return cusps.map(norm360);
}

/**
 * House cusps for an instant and place.
 * system: 'whole' (default) or 'placidus'. Returns {system, cusps} or null (Placidus undefined).
 */
export function houseCusps(date, lat, lon, system = 'whole') {
  const ang = localAngles(date, lat, lon);
  if (system === 'whole') return { system, cusps: wholeSignCusps(ang.asc) };
  if (system === 'placidus') {
    const cusps = placidusCusps(ang.ramc, lat, ang.obliquity);
    return cusps ? { system, cusps } : null;
  }
  throw new Error(`Unknown house system: ${system}`);
}

/** House number 1-12 containing a tropical longitude, given 12 cusps (index 0 = cusp 1). */
export function houseOf(longitude, cusps) {
  const lon = norm360(longitude);
  for (let i = 0; i < 12; i++) {
    const start = cusps[i];
    const span = norm360(cusps[(i + 1) % 12] - start);
    if (norm360(lon - start) < span) return i + 1;
  }
  return 1; // only reachable with degenerate cusps
}

/**
 * Local horizon basis in the WORLD frame at (date, lat, lon): unit vectors zenith, north, east
 * (east × north = zenith), plus `observer`, the observer's geocentric position (AU, world frame,
 * spherical Earth of equatorial radius) for topocentric corrections (matters only for the Moon).
 */
export function horizonBasis(date, lat, lon) {
  const time = toTime(date);
  const th = localSiderealTime(time, lon) * 15 * DEG;
  const ph = lat * DEG;
  const eqdToWorld = mulMM(rowsFromAe(A.Rotation_EQJ_ECL()), rowsFromAe(A.Rotation_EQD_EQJ(time)));
  const zenith = mulMV(eqdToWorld, { x: Math.cos(ph) * Math.cos(th), y: Math.cos(ph) * Math.sin(th), z: Math.sin(ph) });
  const north = mulMV(eqdToWorld, { x: -Math.sin(ph) * Math.cos(th), y: -Math.sin(ph) * Math.sin(th), z: Math.cos(ph) });
  const east = mulMV(eqdToWorld, { x: -Math.sin(th), y: Math.cos(th), z: 0 });
  const r = EARTH_EQUATORIAL_RADIUS_AU;
  return { zenith, north, east, observer: { x: zenith.x * r, y: zenith.y * r, z: zenith.z * r } };
}

/**
 * Altitude/azimuth (degrees) of a world-frame direction in a horizon basis.
 * Azimuth from north through east [0,360). Geometric unless refraction: true
 * (then astronomy-engine's 'normal' refraction is added to the altitude).
 */
export function altAz(worldDir, basis, { refraction = false } = {}) {
  const l = Math.hypot(worldDir.x, worldDir.y, worldDir.z);
  const u = { x: worldDir.x / l, y: worldDir.y / l, z: worldDir.z / l };
  let alt = Math.asin(Math.max(-1, Math.min(1, dot(u, basis.zenith)))) * RAD;
  const az = norm360(Math.atan2(dot(u, basis.east), dot(u, basis.north)) * RAD);
  if (refraction) alt += A.Refraction('normal', alt);
  return { alt, az };
}

/** World-frame unit vector for a given altitude/azimuth (degrees) in a horizon basis. */
export function altAzToWorld(alt, az, basis) {
  const ca = Math.cos(alt * DEG), sa = Math.sin(alt * DEG);
  const cz = Math.cos(az * DEG), sz = Math.sin(az * DEG);
  const { zenith: z, north: n, east: e } = basis;
  return {
    x: z.x * sa + ca * (n.x * cz + e.x * sz),
    y: z.y * sa + ca * (n.y * cz + e.y * sz),
    z: z.z * sa + ca * (n.z * cz + e.z * sz),
  };
}

