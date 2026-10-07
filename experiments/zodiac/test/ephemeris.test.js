// Planet/Moon/Sun tropical longitudes against JPL Horizons (independent ephemeris, DE441).
// Reference values: test/fixtures/horizons-*.json (see their "source" field).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as A from 'astronomy-engine';
import { getSkyState, BODY_IDS, wrap180, formatLongitude, DATE_RANGE, dateSupport, makeUtcDate } from '../src/astro/index.js';
import { apparentEcliptic } from '../src/astro/bodies.js';

const fixture = (f) => JSON.parse(readFileSync(new URL(`./fixtures/${f}`, import.meta.url), 'utf8'));
const UT = fixture('horizons-ut.json');
const TT = fixture('horizons-tt.json');
const jdToDate = (jd) => new Date(Math.round((jd - 2440587.5) * 86400000));

describe('tropical longitudes vs JPL Horizons (UT dates 1700-2150)', () => {
  // Brief tolerance: 0.05 deg Sun/planets, 0.1 deg Moon. Dates: 1700, 1850 (pre-1900), 2000,
  // 2020 (great conjunction), 2075 and 2150 (post-2050).
  UT.jd.forEach((jd, i) => {
    const date = jdToDate(jd);
    it(`${date.toISOString()}`, () => {
      const sky = getSkyState(date);
      for (const id of BODY_IDS) {
        const [lon, lat] = UT.bodies[id][i];
        const tol = id === 'moon' ? 0.1 : 0.05;
        expect(Math.abs(wrap180(sky.bodies[id].longitude - lon)), `${id} longitude`).toBeLessThan(tol);
        expect(Math.abs(sky.bodies[id].latitude - lat), `${id} latitude`).toBeLessThan(tol);
      }
    });
  });

  it('is in fact within ~0.01 deg (Moon ~0.04 deg) across 1700-2150', () => {
    let worst = 0, worstMoon = 0;
    UT.jd.forEach((jd, i) => {
      const sky = getSkyState(jdToDate(jd));
      for (const id of BODY_IDS) {
        const e = Math.abs(wrap180(sky.bodies[id].longitude - UT.bodies[id][i][0]));
        if (id === 'moon') worstMoon = Math.max(worstMoon, e); else worst = Math.max(worst, e);
      }
    });
    expect(worst).toBeLessThan(0.01);
    expect(worstMoon).toBeLessThan(0.04);
  });

  it('matches the 2000-01-01 00:00 UT orientation values from the brief', () => {
    const sky = getSkyState(new Date(Date.UTC(2000, 0, 1)));
    // Horizons gives Mars 327.5755 = 27°34.5' Aqr, Uranus 314.7841 = 14°47.0' Aqr (the brief's
    // "27°35'" / "14°47'" are rounded); formatLongitude truncates minutes.
    expect(formatLongitude(sky.bodies.sun.longitude)).toBe("9°51' Capricorn");
    expect(formatLongitude(sky.bodies.moon.longitude)).toBe("7°17' Scorpio");
    expect(formatLongitude(sky.bodies.jupiter.longitude)).toBe("25°14' Aries");
    expect(formatLongitude(sky.bodies.saturn.longitude)).toBe("10°24' Taurus");
    expect(formatLongitude(sky.bodies.neptune.longitude)).toBe("3°10' Aquarius");
    expect(formatLongitude(sky.bodies.pluto.longitude)).toBe("11°26' Sagittarius");
    expect(sky.bodies.saturn.retrograde).toBe(true);
    expect(sky.bodies.jupiter.retrograde).toBe(false);
  });
});

describe('date range tiers (TT, measured against Horizons)', () => {
  // Tolerances per tier, as documented in DATE_RANGE / README "Date range".
  const tierTol = (year) => {
    if (year >= DATE_RANGE.accurate.minYear && year <= DATE_RANGE.accurate.maxYear) return { planet: 0.05, pluto: 0.05, moon: 0.1 };
    if (year >= DATE_RANGE.good.minYear && year <= DATE_RANGE.good.maxYear) return { planet: 0.3, pluto: 0.65, moon: 0.6 };
    return { planet: 0.6, pluto: 0.8, moon: 2.0 };
  };
  TT.jd.forEach((jd, i) => {
    const year = Math.round(2000 + (jd - 2451545) / 365.25);
    it(`year ${year}`, () => {
      const time = A.AstroTime.FromTerrestrialTime(jd - 2451545);
      const tol = tierTol(year);
      for (const id of BODY_IDS) {
        const p = apparentEcliptic(id, time);
        const err = Math.abs(wrap180(p.lon - TT.bodies[id][i][0]));
        const t = id === 'moon' ? tol.moon : id === 'pluto' ? tol.pluto : tol.planet;
        expect(err, `${id} at ${year}`).toBeLessThan(t);
      }
    });
  });

  it('reports support levels and refuses dates outside the supported range', () => {
    expect(dateSupport(makeUtcDate(2024, 6, 1)).level).toBe('accurate');
    expect(dateSupport(makeUtcDate(-500, 6, 1)).level).toBe('good');
    expect(dateSupport(makeUtcDate(-2500, 6, 1)).level).toBe('approximate');
    expect(dateSupport(makeUtcDate(-3500, 6, 1)).level).toBe('unsupported');
    expect(() => getSkyState(makeUtcDate(-3500, 1, 1))).toThrow(RangeError);
    expect(() => getSkyState(makeUtcDate(6100, 1, 1))).toThrow(RangeError);
  });

  it('computes every body quickly at the extremes of the range (extended Pluto table)', () => {
    for (const y of [-3000, -1500, 0, 4500, 6000]) {
      const t0 = performance.now();
      const sky = getSkyState(makeUtcDate(y, 6, 1));
      expect(performance.now() - t0).toBeLessThan(50);
      for (const id of BODY_IDS) expect(Number.isFinite(sky.bodies[id].longitude)).toBe(true);
      expect(sky.bodies.pluto.approximate).toBe(y < 1 || y > 3999);
    }
  });

  it('extended Pluto table joins astronomy-engine smoothly at both ends of its fast table', () => {
    for (const tt of [-730000, 730000]) {
      for (const dt of [-0.5, 0.5]) {
        const p = apparentEcliptic('pluto', A.AstroTime.FromTerrestrialTime(tt + dt));
        const q = apparentEcliptic('pluto', A.AstroTime.FromTerrestrialTime(tt - dt));
        // Pluto moves < 0.04 deg/day, so 1 day apart must agree closely across the seam.
        expect(Math.abs(wrap180(p.lon - q.lon))).toBeLessThan(0.05);
      }
    }
  });
});
