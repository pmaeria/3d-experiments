// Frames, sign-ring orientation and precession.

import { describe, it, expect } from 'vitest';
import * as A from 'astronomy-engine';
import {
  signRingMatrix, worldToEclipticOfDateMatrix, eclipticOfDateToWorld, worldToEclipticOfDate,
  vernalEquinoxDirection, precessionSinceJ2000, equinoxConstellation, worldToJ2000Ecliptic,
  raDecToWorld, worldToRaDec, eqjToWorld, getSkyState, makeUtcDate, wrap180, BODY_IDS,
} from '../src/astro/index.js';

const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const angleBetween = (a, b) => Math.acos(Math.min(1, dot(a, b) / Math.hypot(a.x, a.y, a.z) / Math.hypot(b.x, b.y, b.z))) * 180 / Math.PI;

describe('world frame', () => {
  it('is the J2000 mean ecliptic: the J2000 equinox is +x and the celestial pole is tilted 23.44 deg from +z', () => {
    const x = raDecToWorld(0, 0);
    expect(x.x).toBeCloseTo(1, 12);
    const pole = raDecToWorld(0, 90);
    expect(Math.acos(pole.z) * 180 / Math.PI).toBeCloseTo(84381.406 / 3600, 6); // IAU 2006 J2000 obliquity
    expect(pole.x).toBeCloseTo(0, 12);
    expect(pole.y).toBeGreaterThan(0); // the north celestial pole lies at ecliptic longitude 90 deg
  });

  it('round-trips RA/Dec', () => {
    const r = worldToRaDec(raDecToWorld(123.4, -45.6));
    expect(r.ra).toBeCloseTo(123.4, 9);
    expect(r.dec).toBeCloseTo(-45.6, 9);
  });
});

describe('sign ring orientation', () => {
  it('is a proper rotation and its inverse is the transpose', () => {
    for (const y of [-2000, 0, 2000, 4000]) {
      const m = signRingMatrix(makeUtcDate(y, 1, 1)).rows;
      const inv = worldToEclipticOfDateMatrix(makeUtcDate(y, 1, 1)).rows;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
        let s = 0;
        for (let k = 0; k < 3; k++) s += m[i][k] * m[j][k];
        expect(s).toBeCloseTo(i === j ? 1 : 0, 12);
        expect(inv[i][j]).toBeCloseTo(m[j][i], 15);
      }
      const det = m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
      expect(det).toBeCloseTo(1, 12);
    }
  });

  it('columnMajor matches rows (THREE.Matrix3.fromArray layout)', () => {
    const { rows, columnMajor } = signRingMatrix(new Date());
    expect(columnMajor[1]).toBe(rows[1][0]);
    expect(columnMajor[3]).toBe(rows[0][1]);
  });

  it('places each body (geocentric direction) at its tropical longitude/latitude on the ring', () => {
    const date = new Date(Date.UTC(2024, 4, 1, 12));
    const sky = getSkyState(date);
    for (const id of BODY_IDS) {
      const b = sky.bodies[id];
      const onRing = eclipticOfDateToWorld(b.longitude, b.latitude, date);
      // geo is geometric, longitude is apparent: they differ by aberration + light-time (< 0.01 deg),
      // plus up to ~0.05 deg for the nearby Moon's light-time-free vs apparent position.
      expect(angleBetween(onRing, b.geo), id).toBeLessThan(0.02);
      const back = worldToEclipticOfDate(onRing, date);
      expect(Math.abs(wrap180(back.lon - b.longitude))).toBeLessThan(1e-9);
    }
  });

  it('is the identity (to nutation) at J2000 and rotates ~1.4 deg per century', () => {
    const j2000 = new Date(Date.UTC(2000, 0, 1, 12));
    expect(Math.abs(precessionSinceJ2000(j2000))).toBeLessThan(1e-6);
    const eq2000 = worldToJ2000Ecliptic(vernalEquinoxDirection(j2000));
    expect(Math.abs(wrap180(eq2000.lon))).toBeLessThan(0.01); // nutation in longitude is < 0.006 deg
    const eq2100 = worldToJ2000Ecliptic(vernalEquinoxDirection(new Date(Date.UTC(2100, 0, 1, 12))));
    expect(wrap180(eq2100.lon)).toBeCloseTo(-1.397, 1);
  });

  it('scalar precession matches the geometric slide of the equinox across millennia', () => {
    for (const y of [-2500, -1000, 1, 1500, 3000, 5000]) {
      const d = makeUtcDate(y, 3, 20);
      const geometric = -wrap180(worldToJ2000Ecliptic(vernalEquinoxDirection(d)).lon);
      expect(Math.abs(precessionSinceJ2000(d) - geometric), `year ${y}`).toBeLessThan(0.02);
    }
  });
});

describe('precession against the constellations ("Age of ...")', () => {
  const at = (y) => equinoxConstellation(makeUtcDate(y, 3, 20)).symbol;

  it('0° Aries was in the constellation Aries in 1000 BCE and in Taurus in 2000 BCE', () => {
    expect(at(-999)).toBe('Ari');
    expect(at(-1999)).toBe('Tau');
  });

  it('crosses the Aries/Pisces border between 130 BCE and 1 CE (about 68 BCE)', () => {
    expect(at(-129)).toBe('Ari'); // 130 BCE
    expect(at(1)).toBe('Psc');
    let lo = -129, hi = 1;
    while (hi - lo > 1) { const m = Math.floor((lo + hi) / 2); if (at(m) === 'Ari') lo = m; else hi = m; }
    expect(hi).toBeGreaterThan(-80);
    expect(hi).toBeLessThan(-55);
  });

  it('is deep in Pisces today and reaches Aquarius around 2600 CE', () => {
    expect(at(2026)).toBe('Psc');
    // Deep: still Pisces 400 years from now; Aquarius only by ~2600.
    expect(at(2426)).toBe('Psc');
    expect(at(2650)).toBe('Aqr');
  });

  it('agrees with astronomy-engine Constellation() for a body direction', () => {
    const sky = getSkyState(new Date(Date.UTC(2000, 0, 1)));
    expect(sky.bodies.pluto.constellation.symbol).toBe('Oph'); // Pluto in Sagittarius sign, in front of Ophiuchus
    expect(sky.bodies.sun.constellation.symbol).toBe('Sgr'); // Sun in Capricorn sign, in front of Sagittarius
    const eqj = A.GeoVector(A.Body.Mars, new Date(Date.UTC(2000, 0, 1)), true);
    const rd = worldToRaDec(eqjToWorld(eqj));
    expect(A.Constellation(rd.ra / 15, rd.dec).symbol).toBe(sky.bodies.mars.constellation.symbol);
  });
});
