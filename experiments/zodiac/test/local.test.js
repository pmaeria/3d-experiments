// Ascendant / MC / houses / horizon basis.
// Independent checks: astronomy-engine's own Horizon() and SearchAltitude() for geometry, and
// Swiss Ephemeris (test/fixtures/swiss-ephemeris.json) for published-software agreement.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as A from 'astronomy-engine';
import {
  localAngles, anglesFromRamc, placidusCusps, wholeSignCusps, houseCusps, houseOf, horizonBasis, altAz,
  altAzToWorld, localSiderealTime, meanNodeLongitude, trueNodeLongitude, getSkyState, wrap180, norm360,
} from '../src/astro/index.js';

const SWE = JSON.parse(readFileSync(new URL('./fixtures/swiss-ephemeris.json', import.meta.url), 'utf8'));
const DEG = Math.PI / 180;

/** Horizontal coordinates of an ecliptic-of-date point, computed by astronomy-engine (independent path). */
function eclipticPointHorizon(date, lon, lat, obsLat, obsLon) {
  const time = A.MakeTime(date);
  const eps = A.e_tilt(time).tobl * DEG;
  const l = lon * DEG;
  // ecliptic (lat 0) -> equatorial of date
  const x = Math.cos(l), y = Math.sin(l) * Math.cos(eps), z = Math.sin(l) * Math.sin(eps);
  const ra = norm360(Math.atan2(y, x) / DEG) / 15;
  const dec = Math.asin(z) / DEG;
  return A.Horizon(time, new A.Observer(obsLat, obsLon, 0), ra, dec);
}

// Spread of latitudes including southern, near-equator and high (non-polar) latitudes.
const LATS = [-55, -33.9, -12, -0.2, 0, 1.3, 19.4, 35.7, 51.5, 60.2, 66];
const LONS = [-157.8, -74, -0.13, 18.4, 77.2, 151.2];
const DATES = [
  new Date(Date.UTC(1890, 2, 14, 3, 0)), new Date(Date.UTC(1969, 6, 16, 13, 32)), new Date(Date.UTC(1999, 11, 31, 23, 59)),
  new Date(Date.UTC(2024, 5, 21, 6, 15)), new Date(Date.UTC(2051, 9, 3, 18, 40)),
];

describe('Ascendant and MC: geometric checks over many latitudes, longitudes and times', () => {
  it('Ascendant is on the horizon in the east; MC on the meridian above the horizon', () => {
    let n = 0;
    for (const date of DATES) for (const lat of LATS) for (const lon of LONS) for (let h = 0; h < 24; h += 5) {
      const d = new Date(date.getTime() + h * 3600e3);
      const ang = localAngles(d, lat, lon);
      const asc = eclipticPointHorizon(d, ang.asc, 0, lat, lon);
      expect(Math.abs(asc.altitude), `asc alt lat=${lat}`).toBeLessThan(1e-3);
      expect(asc.azimuth, 'asc in the east').toBeGreaterThan(0);
      expect(asc.azimuth).toBeLessThan(180);
      const dsc = eclipticPointHorizon(d, ang.dsc, 0, lat, lon);
      expect(Math.abs(dsc.altitude)).toBeLessThan(1e-3);
      expect(dsc.azimuth).toBeGreaterThan(180);
      const mc = eclipticPointHorizon(d, ang.mc, 0, lat, lon);
      expect(mc.altitude, 'mc above horizon').toBeGreaterThan(0);
      // On the meridian: azimuth 0 or 180 (unless at the zenith where azimuth is undefined).
      if (mc.altitude < 89.9) expect(Math.min(Math.abs(wrap180(mc.azimuth)), Math.abs(wrap180(mc.azimuth - 180)))).toBeLessThan(1e-3);
      n++;
    }
    expect(n).toBeGreaterThan(1500);
  });

  it('at geometric sunrise the Sun is on the Ascendant', () => {
    for (const [lat, lon] of [[51.5, -0.13], [-33.9, 18.4], [1.3, 103.8], [64.1, -21.9], [-54.8, -68.3], [19.4, -99.1]]) {
      for (const start of [new Date(Date.UTC(2024, 0, 10)), new Date(Date.UTC(2024, 3, 2)), new Date(Date.UTC(2024, 8, 15))]) {
        // Geometric sunrise of the Sun's centre, no refraction (astronomy-engine SearchAltitude).
        // SearchAltitude is topocentric; the chart is geocentric, so aim for topocentric altitude
        // = -solar parallax (8.794"), i.e. geocentric altitude 0.
        const rise = A.SearchAltitude(A.Body.Sun, new A.Observer(lat, lon, 0), +1, start, 2, -8.794 / 3600);
        const sun = getSkyState(rise.date).bodies.sun.longitude;
        const asc = localAngles(rise.date, lat, lon).asc;
        // Residual: the Sun's ecliptic latitude (< 1"), amplified where the ecliptic meets the
        // horizon at a shallow angle (high latitudes).
        expect(Math.abs(wrap180(sun - asc)), `lat ${lat}`).toBeLessThan(0.01);
      }
    }
  });

  it('MC formula matches the classical closed form tan(MC) = tan(RAMC)/cos(eps)', () => {
    for (const ramc of [0, 17, 89.9, 90, 135, 180, 270, 333]) {
      const { mc } = anglesFromRamc(ramc, 40, 23.44);
      const expected = norm360(Math.atan2(Math.sin(ramc * DEG), Math.cos(ramc * DEG) * Math.cos(23.44 * DEG)) / DEG);
      expect(Math.abs(wrap180(mc - expected))).toBeLessThan(1e-9);
    }
  });
});

describe('agreement with Swiss Ephemeris (synthetic charts + Apollo 11 launch)', () => {
  for (const c of SWE.cases) {
    it(c.label, () => {
      const [y, m, d, h] = c.utc;
      const date = new Date(Date.UTC(y, m - 1, d) + h * 3600e3);
      const ang = localAngles(date, c.lat, c.lon);
      expect(Math.abs(wrap180(ang.ramc - c.armc))).toBeLessThan(1 / 3600);
      expect(Math.abs(wrap180(ang.asc - c.asc))).toBeLessThan(1 / 3600);
      expect(Math.abs(wrap180(ang.mc - c.mc))).toBeLessThan(1 / 3600);
      const cusps = placidusCusps(ang.ramc, c.lat, ang.obliquity);
      cusps.forEach((cu, i) => expect(Math.abs(wrap180(cu - c.placidus[i])), `cusp ${i + 1}`).toBeLessThan(1 / 3600));
      expect(Math.abs(wrap180(meanNodeLongitude(date) - c.meanNode))).toBeLessThan(1 / 3600);
      expect(Math.abs(wrap180(trueNodeLongitude(date) - c.trueNode))).toBeLessThan(60 / 3600);
    });
  }
});

describe('Placidus', () => {
  it('cusp 1 = Asc, cusp 10 = MC, opposite cusps 180 apart, cusps in zodiacal order', () => {
    for (const lat of [-60, -45, -20, 0, 10, 35, 52, 60, 65]) for (let ramc = 0; ramc < 360; ramc += 13) {
      const eps = 23.44;
      const c = placidusCusps(ramc, lat, eps);
      const ang = anglesFromRamc(ramc, lat, eps);
      expect(c).not.toBeNull();
      expect(Math.abs(wrap180(c[0] - ang.asc))).toBeLessThan(1e-9);
      expect(Math.abs(wrap180(c[9] - ang.mc))).toBeLessThan(1e-9);
      for (let i = 0; i < 6; i++) expect(Math.abs(wrap180(c[i + 6] - c[i] - 180))).toBeLessThan(1e-9);
      let total = 0;
      for (let i = 0; i < 12; i++) {
        const span = norm360(c[(i + 1) % 12] - c[i]);
        expect(span).toBeGreaterThan(0);
        expect(span).toBeLessThan(180);
        total += span;
      }
      expect(total).toBeCloseTo(360, 9);
    }
  });

  it('is null inside the polar circles', () => {
    expect(placidusCusps(100, 70, 23.44)).toBeNull();
    expect(placidusCusps(100, -80, 23.44)).toBeNull();
    expect(houseCusps(new Date(Date.UTC(2024, 0, 1)), 69.65, 18.96, 'placidus')).toBeNull(); // Tromsø
    expect(houseCusps(new Date(Date.UTC(2024, 0, 1)), 69.65, 18.96, 'whole').cusps).toHaveLength(12);
  });
});

describe('Whole Sign houses and houseOf', () => {
  it('starts at 0° of the Ascendant sign', () => {
    expect(wholeSignCusps(137.2)).toEqual([120, 150, 180, 210, 240, 270, 300, 330, 0, 30, 60, 90]);
  });
  it('houseOf handles wrap-around', () => {
    const cusps = wholeSignCusps(345); // Pisces rising
    expect(houseOf(350, cusps)).toBe(1);
    expect(houseOf(5, cusps)).toBe(2);
    expect(houseOf(329.9, cusps)).toBe(12);
    const pl = placidusCusps(200, 51.5, 23.44);
    for (let i = 0; i < 12; i++) expect(houseOf(pl[i] + 0.01, pl)).toBe(i + 1);
  });
});

describe('horizon basis and alt/az', () => {
  it('is orthonormal and right-handed (east × north = zenith)', () => {
    const b = horizonBasis(new Date(), -33.9, 151.2);
    const dot = (a, c) => a.x * c.x + a.y * c.y + a.z * c.z;
    for (const v of [b.zenith, b.north, b.east]) expect(dot(v, v)).toBeCloseTo(1, 12);
    expect(dot(b.zenith, b.north)).toBeCloseTo(0, 12);
    expect(dot(b.zenith, b.east)).toBeCloseTo(0, 12);
    const c = { x: b.east.y * b.north.z - b.east.z * b.north.y, y: b.east.z * b.north.x - b.east.x * b.north.z, z: b.east.x * b.north.y - b.east.y * b.north.x };
    expect(dot(c, b.zenith)).toBeCloseTo(1, 12);
  });

  it('gives the same altitude/azimuth as astronomy-engine for the Sun and planets', () => {
    for (const [lat, lon] of [[51.5, -0.13], [-33.9, 151.2], [0.5, 32.6], [64.1, -21.9]]) {
      const date = new Date(Date.UTC(2024, 6, 4, 15, 30));
      const sky = getSkyState(date);
      const basis = horizonBasis(date, lat, lon);
      const obs = new A.Observer(lat, lon, 0);
      for (const id of ['sun', 'venus', 'jupiter', 'saturn']) {
        const mine = altAz(sky.bodies[id].geo, basis);
        const eq = A.Equator(A.Body[sky.bodies[id].name], date, obs, true, true);
        const ref = A.Horizon(date, obs, eq.ra, eq.dec);
        expect(Math.abs(mine.alt - ref.altitude), `${id} alt`).toBeLessThan(0.02);
        if (Math.abs(ref.altitude) < 85) expect(Math.abs(wrap180(mine.az - ref.azimuth)), `${id} az`).toBeLessThan(0.05);
      }
    }
  });

  it('altAzToWorld inverts altAz; refraction lifts objects near the horizon', () => {
    const b = horizonBasis(new Date(), 40, -3.7);
    const v = altAzToWorld(12.3, 245.6, b);
    const r = altAz(v, b);
    expect(r.alt).toBeCloseTo(12.3, 9);
    expect(r.az).toBeCloseTo(245.6, 9);
    expect(altAz(altAzToWorld(0, 90, b), b, { refraction: true }).alt).toBeGreaterThan(0.4);
  });

  it('local sidereal time = Greenwich sidereal time + longitude/15', () => {
    const d = new Date(Date.UTC(2024, 2, 20, 3));
    expect(localSiderealTime(d, 0)).toBeCloseTo(A.SiderealTime(d), 9);
    expect(norm360(localSiderealTime(d, 90) * 15 - localSiderealTime(d, 0) * 15)).toBeCloseTo(90, 9);
  });
});
