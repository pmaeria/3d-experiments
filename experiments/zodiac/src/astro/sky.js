// Sky state: everything the scene and chart need about the Sun, Moon and planets at one instant.

import * as A from 'astronomy-engine';
import { BODIES, BODY_IDS, MOON_PHASES, SIGNS } from './constants.js';
import { norm360, RAD, toSpherical, cross } from './math.js';
import { toTime, assertSupported } from './time.js';
import { eqjToWorld, obliquity, precessionSinceJ2000 } from './frames.js';
import {
  apparentEcliptic, longitudeSpeed, helioEqj, earthHelioEqj, geoGeometricEqj, plutoIsExtended,
} from './bodies.js';

/** Sign info for a tropical longitude: {signIndex, sign, degreeInSign, longitude}. */
export function signOf(longitude) {
  const lon = norm360(longitude);
  const signIndex = Math.floor(lon / 30) % 12;
  return { longitude: lon, signIndex, sign: SIGNS[signIndex].name, degreeInSign: lon - signIndex * 30 };
}

/**
 * Format a tropical longitude as e.g. "9°51' Capricorn" (or with glyph: "9°51' ♑").
 * Minutes are truncated (astrological convention), not rounded.
 */
export function formatLongitude(longitude, { glyph = false, seconds = false } = {}) {
  const { signIndex, degreeInSign } = signOf(longitude);
  const totalSec = Math.floor(degreeInSign * 3600 + 1e-6);
  const d = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const sign = glyph ? SIGNS[signIndex].glyph : SIGNS[signIndex].name;
  const mm = String(m).padStart(2, '0');
  return seconds ? `${d}°${mm}'${String(s).padStart(2, '0')}" ${sign}` : `${d}°${mm}' ${sign}`;
}

/** Mean lunar north node, tropical longitude of date (Meeus eq. 47.7 plus nutation in longitude). */
export function meanNodeLongitude(date) {
  const time = toTime(date);
  const T = time.tt / 36525;
  const om = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T * T * T) / 467441 - (T * T * T * T) / 60616000;
  return norm360(om + A.e_tilt(time).dpsi / 3600);
}

/**
 * True (osculating) lunar north node, tropical longitude of date: the ascending node of the
 * instantaneous geocentric Moon orbit on the true ecliptic of date.
 */
export function trueNodeLongitude(date) {
  const time = toTime(date);
  const s = A.GeoMoonState(time);
  const rot = A.Rotation_EQJ_ECT(time);
  const r = A.RotateVector(rot, new A.Vector(s.x, s.y, s.z, time));
  const v = A.RotateVector(rot, new A.Vector(s.vx, s.vy, s.vz, time));
  const h = cross(r, v);
  return norm360(Math.atan2(h.x, -h.y) * RAD);
}

/** Moon phase from elongation (Moon minus Sun tropical longitude, degrees). */
export function moonPhaseFromElongation(elongation, illumination = (1 - Math.cos(elongation * Math.PI / 180)) / 2) {
  const e = norm360(elongation);
  return {
    elongation: e,
    name: MOON_PHASES[Math.floor((e + 22.5) / 45) % 8],
    illumination,
    waxing: e < 180,
  };
}

/**
 * Position of one body, the fast path used by getSkyState and the event finder.
 * Returns tropical {longitude, latitude, distance, speed, retrograde} or null if unavailable.
 */
export function bodyLongitude(id, date) {
  const time = toTime(date);
  const p = apparentEcliptic(id, time);
  if (!p) return null;
  const speed = longitudeSpeed(id, time);
  return { longitude: p.lon, latitude: p.lat, distance: p.distance, speed, retrograde: speed < 0 };
}

function buildBody(id, time, earthHelio) {
  const p = apparentEcliptic(id, time);
  if (!p) return null;
  const speed = longitudeSpeed(id, time);
  const geoEqj = geoGeometricEqj(id, time);
  const geo = eqjToWorld(geoEqj);
  const helio = id === 'moon'
    ? { x: earthHelio.x + geo.x, y: earthHelio.y + geo.y, z: earthHelio.z + geo.z }
    : eqjToWorld(helioEqj(id, time));
  const eq = toSpherical(p.eqj);
  const c = A.Constellation(eq.lon / 15, eq.lat);
  return {
    id,
    name: BODIES[id].name,
    glyph: BODIES[id].glyph,
    longitude: p.lon,
    latitude: p.lat,
    distance: p.distance,
    ...signOf(p.lon),
    speed,
    retrograde: speed < 0,
    helio,
    geo,
    ra: eq.lon,
    dec: eq.lat,
    constellation: { symbol: c.symbol, name: c.name },
    approximate: id === 'pluto' && plutoIsExtended(time),
  };
}

/**
 * Full sky state at a UTC instant. Throws RangeError outside DATE_RANGE.supported.
 * See README "getSkyState" for the shape.
 */
export function getSkyState(date) {
  const support = assertSupported(date);
  const time = toTime(date);
  const earthHelio = eqjToWorld(earthHelioEqj(time));
  const bodies = {};
  for (const id of BODY_IDS) bodies[id] = buildBody(id, time, earthHelio);

  const elong = norm360(bodies.moon.longitude - bodies.sun.longitude);
  const illum = A.Illumination(A.Body.Moon, time).phase_fraction;
  const meanNode = meanNodeLongitude(time);
  const trueNode = trueNodeLongitude(time);

  return {
    date: new Date(date.getTime()),
    jdUt: time.ut + 2451545.0,
    jdTt: time.tt + 2451545.0,
    support,
    obliquity: obliquity(time),
    precession: precessionSinceJ2000(time),
    earthHelio,
    order: BODY_IDS,
    bodies,
    nodes: {
      meanNorth: meanNode,
      trueNorth: trueNode,
      meanSouth: norm360(meanNode + 180),
      trueSouth: norm360(trueNode + 180),
    },
    moonPhase: moonPhaseFromElongation(elong, illum),
  };
}
