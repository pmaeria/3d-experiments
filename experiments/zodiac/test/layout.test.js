// The honesty rule: whatever the view, a body's direction from Earth is exact, and the sight
// line lands on the ring at the body's tropical longitude.
import { describe, it, expect } from 'vitest';
import {
  getSkyState, signRingMatrix, worldToEclipticOfDate, localAngles, horizonBasis, altAz,
  eclipticOfDateToWorld, makeUtcDate,
} from '../src/astro/index.js';
import {
  bodyPosition, earthPosition, sightLine, mulRows, compressedRadius, apparentDirection, AU,
} from '../src/scene/layout.js';

// Angle between two vectors, degrees (atan2 form: accurate for tiny angles).
const angle = (u, v) => {
  const cx = u.y * v.z - u.z * v.y, cy = u.z * v.x - u.x * v.z, cz = u.x * v.y - u.y * v.x;
  return Math.atan2(Math.hypot(cx, cy, cz), u.x * v.x + u.y * v.y + u.z * v.z) * 180 / Math.PI;
};
const DATES = [
  new Date('2020-12-21T18:20:00Z'), new Date('2025-03-20T09:01:00Z'), new Date('1969-07-16T13:32:00Z'),
  makeUtcDate(1, 3, 22, 12), makeUtcDate(-2500, 6, 1), makeUtcDate(5500, 1, 1),
];
const PARAMS = [
  { a: 0, c: 0, s: 0, R: 31 }, { a: 0.37, c: 0, s: 0, R: 120 }, { a: 1, c: 0.5, s: 0, R: 30 },
  { a: 1, c: 1, s: 0, R: 30 }, { a: 1, c: 1, s: 1, R: 30 }, { a: 1, c: 0.2, s: 0.6, R: 520 },
];

describe('layout keeps directions from Earth exact', () => {
  for (const date of DATES) {
    const sky = getSkyState(date);
    for (const p of PARAMS) {
      it(`${date.toISOString()} a=${p.a} c=${p.c} s=${p.s}`, () => {
        const E = earthPosition(sky.earthHelio, p);
        const M = signRingMatrix(date);
        for (const id of sky.order) {
          const b = sky.bodies[id];
          const dir = apparentDirection(M.rows, b.longitude, b.latitude);
          const P = bodyPosition(dir, b.distance, sky.earthHelio, p, { minR: id === 'moon' ? 2 : 0 });
          const d = { x: P.x - E.x, y: P.y - E.y, z: P.z - E.z };
          // Direction from Earth = the apparent direction, whose ecliptic-of-date longitude is the readout.
          expect(angle(d, dir)).toBeLessThan(1e-9);
          const back = worldToEclipticOfDate(d, date);
          expect(Math.abs(((back.lon - b.longitude + 540) % 360) - 180)).toBeLessThan(1e-9);
        }
      });
    }
  }
  it('with a=c=s=0 bodies sit at their heliocentric positions (to aberration/light-time)', () => {
    const sky = getSkyState(DATES[0]);
    const M = signRingMatrix(DATES[0]);
    const p = { a: 0, c: 0, s: 0, R: 31 };
    for (const id of ['mars', 'jupiter', 'saturn', 'pluto']) {
      const b = sky.bodies[id];
      const P = bodyPosition(apparentDirection(M.rows, b.longitude, b.latitude), b.distance, sky.earthHelio, p);
      const h = b.helio;
      // within 0.0003 x distance from Earth (about 1 arcminute) plus light-time distance change
      expect(Math.hypot(P.x - h.x * AU, P.y - h.y * AU, P.z - h.z * AU) / AU).toBeLessThan(0.0003 * b.distance + 0.001);
    }
  });
  it('compression is monotonic in distance', () => {
    let last = -Infinity;
    for (let d = 0.002; d < 60; d *= 1.3) {
      const r = compressedRadius(d, 30);
      expect(r).toBeGreaterThan(last);
      last = r;
    }
    expect(compressedRadius(50, 30)).toBeLessThanOrEqual(0.9 * 30 + 1e-9);
  });
});

describe('sight lines land on the ring at the tropical longitude', () => {
  for (const date of DATES) {
    it(date.toISOString(), () => {
      const sky = getSkyState(date);
      const M = signRingMatrix(date);
      for (const id of sky.order) {
        const b = sky.bodies[id];
        const { tip, foot } = sightLine(b.longitude, b.latitude, 30);
        // The foot of the sight line, read back as a tropical longitude, is the readout.
        const footLon = Math.atan2(foot[1], foot[0]) * 180 / Math.PI;
        expect(Math.abs(((footLon - b.longitude + 540) % 360) - 180)).toBeLessThan(1e-9);
        expect(foot[2]).toBe(0);
        // The tip direction, rotated into the world, is the body's true direction from Earth
        // (apparent vs geometric differ only by aberration/light-time: < 0.01 deg).
        const tipWorld = mulRows(M.rows, { x: tip[0], y: tip[1], z: tip[2] });
        // Apparent (what we draw) vs geometric (geo): aberration + light-time, under 1 arcminute.
        expect(angle(tipWorld, b.geo)).toBeLessThan(0.02);
        expect(angle(tipWorld, apparentDirection(M.rows, b.longitude, b.latitude))).toBeLessThan(1e-9);
      }
    });
  }
  it('Jupiter and Saturn share 0 deg Aquarius at the 2020 great conjunction', () => {
    const sky = getSkyState(new Date('2020-12-21T18:20:00Z'));
    const j = sky.bodies.jupiter, s = sky.bodies.saturn;
    expect(j.sign).toBe('Aquarius');
    expect(s.sign).toBe('Aquarius');
    expect(j.degreeInSign).toBeLessThan(1);
    expect(Math.abs(j.longitude - s.longitude)).toBeLessThan(0.02);
    // ...while about 5 AU apart in space.
    const dj = j.helio, ds = s.helio;
    expect(Math.hypot(dj.x - ds.x, dj.y - ds.y, dj.z - ds.z)).toBeGreaterThan(4.5);
  });
});

describe('the Ascendant marker sits on the eastern horizon', () => {
  const places = [[51.5074, -0.1278], [-33.87, 151.21], [64.1, -21.9], [0, 0]];
  for (const date of DATES.slice(0, 3)) {
    for (const [lat, lon] of places) {
      it(`${date.toISOString()} ${lat},${lon}`, () => {
        const ang = localAngles(date, lat, lon);
        const basis = horizonBasis(date, lat, lon);
        const asc = altAz(eclipticOfDateToWorld(ang.asc, 0, date), basis);
        expect(Math.abs(asc.alt)).toBeLessThan(1e-6);
        expect(asc.az).toBeGreaterThan(0);
        expect(asc.az).toBeLessThan(180);
        const mc = altAz(eclipticOfDateToWorld(ang.mc, 0, date), basis);
        // on the meridian: azimuth 0 or 180
        expect(Math.min(Math.abs(mc.az - 180), mc.az, 360 - mc.az)).toBeLessThan(1e-6);
      });
    }
  }
});
