// Low-level body positions on top of astronomy-engine, including the extended Pluto table.
// Internal module: most callers want sky.js. All vectors here are EQJ (J2000 equatorial), AU.

import * as A from 'astronomy-engine';
import { BODIES } from './constants.js';
import { PLUTO_EXTENDED } from './data/pluto-extended.js';
import { RAD, norm360 } from './math.js';

const C_AU_PER_DAY = A.C_AUDAY ?? 173.1446326846693;
const PLUTO_TABLE_MIN_TT = -730000;
const PLUTO_TABLE_MAX_TT = 730000;

const aeBody = (id) => A.Body[BODIES[id].aeName];

/** True when Pluto at this time comes from the generated extension table rather than astronomy-engine directly. */
export function plutoIsExtended(time) {
  return time.tt < PLUTO_TABLE_MIN_TT || time.tt > PLUTO_TABLE_MAX_TT;
}

/** Heliocentric EQJ Pluto from the extension table (4-point Lagrange), or null outside it. */
function plutoFromTable(tt) {
  const step = PLUTO_EXTENDED.stepDays;
  for (const seg of PLUTO_EXTENDED.segments) {
    const n = seg.xyz.length / 3;
    const u = (tt - seg.startTt) / step;
    if (u < 0 || u > n - 1) continue;
    const i0 = Math.min(Math.max(Math.floor(u) - 1, 0), n - 4);
    const s = u - i0;
    // Lagrange basis on nodes 0..3 at parameter s.
    const w = [
      -(s - 1) * (s - 2) * (s - 3) / 6,
      s * (s - 2) * (s - 3) / 2,
      -s * (s - 1) * (s - 3) / 2,
      s * (s - 1) * (s - 2) / 6,
    ];
    let x = 0, y = 0, z = 0;
    for (let k = 0; k < 4; k++) {
      const j = (i0 + k) * 3;
      x += w[k] * seg.xyz[j];
      y += w[k] * seg.xyz[j + 1];
      z += w[k] * seg.xyz[j + 2];
    }
    return { x, y, z };
  }
  return null;
}

/** Heliocentric EQJ vector (AU) of a body. Sun is the origin. Returns null if unavailable. */
export function helioEqj(id, time) {
  if (id === 'sun') return { x: 0, y: 0, z: 0 };
  if (id === 'pluto' && plutoIsExtended(time)) return plutoFromTable(time.tt);
  const v = A.HelioVector(aeBody(id), time);
  return { x: v.x, y: v.y, z: v.z };
}

/** Heliocentric EQJ vector of the Earth (centre). */
export function earthHelioEqj(time) {
  const v = A.HelioVector(A.Body.Earth, time);
  return { x: v.x, y: v.y, z: v.z };
}

/** Geometric geocentric EQJ vector (no light-time, no aberration): helio(body) - helio(Earth). */
export function geoGeometricEqj(id, time) {
  if (id === 'moon') {
    const m = A.GeoMoon(time);
    return { x: m.x, y: m.y, z: m.z };
  }
  const e = earthHelioEqj(time);
  const b = helioEqj(id, time);
  if (!b) return null;
  return { x: b.x - e.x, y: b.y - e.y, z: b.z - e.z };
}

/**
 * Apparent geocentric EQJ vector: corrected for light travel time and annual aberration
 * (what astrologers and almanacs use). Returns an astronomy-engine Vector carrying `.t`.
 */
export function geoApparentEqj(id, time) {
  if (id !== 'pluto' || !plutoIsExtended(time)) {
    return A.GeoVector(aeBody(id), time, true);
  }
  // Extended Pluto: light-time iteration plus first-order aberration.
  const e = earthHelioEqj(time);
  let p = plutoFromTable(time.tt);
  if (!p) return null;
  for (let i = 0; i < 2; i++) {
    const d = Math.hypot(p.x - e.x, p.y - e.y, p.z - e.z);
    p = plutoFromTable(time.tt - d / C_AU_PER_DAY) ?? p;
  }
  const g = { x: p.x - e.x, y: p.y - e.y, z: p.z - e.z };
  const d = Math.hypot(g.x, g.y, g.z);
  const ev = A.HelioState(A.Body.Earth, time);
  const k = d / C_AU_PER_DAY;
  return new A.Vector(g.x + ev.vx * k, g.y + ev.vy * k, g.z + ev.vz * k, time);
}

/**
 * Apparent geocentric tropical position: longitude/latitude on the true ecliptic and
 * equinox of date (degrees), distance (AU). `eqj` is the apparent EQJ vector used.
 */
export function apparentEcliptic(id, time) {
  const eqj = geoApparentEqj(id, time);
  if (!eqj) return null;
  const ecl = A.Ecliptic(eqj.t ? eqj : new A.Vector(eqj.x, eqj.y, eqj.z, time));
  return { lon: norm360(ecl.elon), lat: ecl.elat, distance: Math.hypot(eqj.x, eqj.y, eqj.z), eqj };
}

/** Tropical apparent longitude only, degrees in [0,360). */
export function apparentLongitude(id, time) {
  const p = apparentEcliptic(id, time);
  return p ? p.lon : NaN;
}

/** Longitude speed in deg/day by central difference (h in days). */
export function longitudeSpeed(id, time, h = 1 / 24) {
  const a = apparentLongitude(id, time.AddDays(-h));
  const b = apparentLongitude(id, time.AddDays(h));
  let d = b - a;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d / (2 * h);
}

export { RAD };
