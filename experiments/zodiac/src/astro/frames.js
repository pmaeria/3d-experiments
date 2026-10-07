// Reference frames.
//
// WORLD frame (used for every vector this engine returns): J2000 mean ecliptic,
// x toward the J2000 mean equinox, z toward the J2000 north ecliptic pole, right-handed.
// It is astronomy-engine's "ECL" frame. Distances in AU.
//
// "Of date" frames move with precession: the true ecliptic and equinox of date (ECT)
// is what tropical astrology measures longitudes in.

import * as A from 'astronomy-engine';
import { DEG, RAD, norm360, mulMV, mulMM, transpose, rowsFromAe, packMatrix, fromSpherical, toSpherical } from './math.js';
import { toTime } from './time.js';

const EQJ_TO_WORLD = rowsFromAe(A.Rotation_EQJ_ECL());
const WORLD_TO_EQJ = transpose(EQJ_TO_WORLD);

/** Rotate a J2000 equatorial (EQJ) vector into the world frame. Accepts any {x,y,z}. */
export function eqjToWorld(v) {
  return mulMV(EQJ_TO_WORLD, v);
}

/** Rotate a world-frame vector into J2000 equatorial (EQJ). */
export function worldToEqj(v) {
  return mulMV(WORLD_TO_EQJ, v);
}

/** Unit vector in the world frame for J2000 right ascension / declination in degrees. */
export function raDecToWorld(raDeg, decDeg) {
  return eqjToWorld(fromSpherical(raDeg, decDeg));
}

/** J2000 RA (degrees, 0-360) and Dec (degrees) of a world-frame vector. */
export function worldToRaDec(v) {
  const s = toSpherical(worldToEqj(v));
  return { ra: s.lon, dec: s.lat };
}

/** J2000 ecliptic longitude/latitude (degrees) of a world-frame vector. Not tropical of date. */
export function worldToJ2000Ecliptic(v) {
  const s = toSpherical(v);
  return { lon: s.lon, lat: s.lat, r: s.r };
}

/** Mean and true obliquity of the ecliptic of date, degrees. */
export function obliquity(date) {
  const t = A.e_tilt(toTime(date));
  return { mean: t.mobl, true: t.tobl };
}

/** Rows of the rotation taking true-ecliptic-of-date (ECT) vectors to the world frame. */
function ectToWorldRows(time) {
  return mulMM(EQJ_TO_WORLD, rowsFromAe(A.Rotation_ECT_EQJ(time)));
}

/**
 * Rotation from the true ecliptic and equinox of date (the tropical zodiac frame) to the
 * world frame. Apply it to the 12-sign ring built in its own frame (0 deg Aries on +x,
 * longitudes increasing toward +y, ecliptic pole on +z) to orient the ring among J2000 stars.
 * Returns {rows, columnMajor} (columnMajor suits THREE.Matrix3.fromArray).
 */
export function signRingMatrix(date) {
  return packMatrix(ectToWorldRows(toTime(date)));
}

/** Inverse of signRingMatrix: world frame to true ecliptic of date. */
export function worldToEclipticOfDateMatrix(date) {
  return packMatrix(transpose(ectToWorldRows(toTime(date))));
}

/** World-frame unit vector for a tropical (true ecliptic of date) longitude/latitude. */
export function eclipticOfDateToWorld(lonDeg, latDeg, date) {
  return mulMV(ectToWorldRows(toTime(date)), fromSpherical(lonDeg, latDeg));
}

/** Tropical (true ecliptic of date) longitude/latitude in degrees of a world-frame vector. */
export function worldToEclipticOfDate(v, date) {
  const s = toSpherical(mulMV(transpose(ectToWorldRows(toTime(date))), v));
  return { lon: s.lon, lat: s.lat, r: s.r };
}

/** World-frame unit vector of the 0 deg Aries point (true vernal equinox) of date. */
export function vernalEquinoxDirection(date) {
  const m = ectToWorldRows(toTime(date));
  return { x: m[0][0], y: m[1][0], z: m[2][0] };
}

/**
 * General precession in longitude since J2000, degrees (IAU 2006, Capitaine et al. 2003 p_A).
 * Positive after 2000 (the equinox has slid westward, i.e. toward lower J2000 longitudes).
 * About 1.397 deg per century. Unwrapped, so it grows smoothly across millennia.
 */
export function precessionSinceJ2000(date) {
  const T = toTime(date).tt / 36525;
  const asec = ((((-0.0000000383 * T - 0.000023857) * T + 0.00007964) * T + 1.1054348) * T + 5028.796195) * T;
  return asec / 3600;
}

/**
 * Which IAU constellation the 0 deg Aries point of date lies in (the "Age of ..." idea).
 * Returns {symbol, name, ra, dec} with J2000 ra/dec in degrees.
 */
export function equinoxConstellation(date) {
  const { ra, dec } = worldToRaDec(vernalEquinoxDirection(date));
  const c = A.Constellation(ra / 15, dec);
  return { symbol: c.symbol, name: c.name, ra, dec };
}

/** Constellation for a world-frame direction: {symbol, name}. */
export function constellationOfWorld(v) {
  const { ra, dec } = worldToRaDec(v);
  const c = A.Constellation(ra / 15, dec);
  return { symbol: c.symbol, name: c.name };
}

export { DEG, RAD, norm360 };
