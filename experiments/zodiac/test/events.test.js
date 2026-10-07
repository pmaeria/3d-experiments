// Event finder: conjunctions, stations, ingresses, lunar phases, seasons; plus retrograde flags.

import { describe, it, expect } from 'vitest';
import {
  findAspect, findStation, findIngress, findMoonPhase, seasons, getSkyState, bodyLongitude, wrap180, makeUtcDate,
} from '../src/astro/index.js';

const MIN = 60000;
const minutesBetween = (a, b) => Math.abs(a.getTime() - b.getTime()) / MIN;

describe('aspect search', () => {
  it('finds the 2020 Jupiter-Saturn great conjunction (forward and backward)', () => {
    // JPL Horizons (quantity 31, 5-minute steps) puts the exact conjunction in apparent
    // ecliptic-of-date longitude at 2020-12-21 18:20:37 UT, at 300.4860 deg (0°29.2' Aquarius).
    // The relative motion is only ~0.11 deg/day, so a 3" position difference moves the time ~6 min.
    const ref = new Date(Date.UTC(2020, 11, 21, 18, 20, 37));
    const fwd = findAspect('jupiter', 'saturn', 0, new Date(Date.UTC(2019, 0, 1)));
    expect(minutesBetween(fwd.date, ref)).toBeLessThan(10);
    expect(Math.abs(fwd.longitudeA - 300.486)).toBeLessThan(0.01);
    const back = findAspect('saturn', 'jupiter', 0, new Date(Date.UTC(2023, 0, 1)), { direction: -1 });
    expect(minutesBetween(back.date, ref)).toBeLessThan(10);
  });

  it('finds the previous and next ones ~20 years apart (2000 and 2040)', () => {
    const prev = findAspect('jupiter', 'saturn', 0, new Date(Date.UTC(2020, 0, 1)), { direction: -1 });
    expect(prev.date.getUTCFullYear()).toBe(2000);
    const next = findAspect('jupiter', 'saturn', 0, new Date(Date.UTC(2021, 0, 1)));
    expect(next.date.getUTCFullYear()).toBe(2040);
  });

  it('returns exact aspects for both waxing and waning forms', () => {
    const sq = findAspect('moon', 'sun', 90, new Date(Date.UTC(2024, 0, 1)));
    const d = Math.abs(wrap180(sq.longitudeA - sq.longitudeB));
    expect(Math.abs(d - 90)).toBeLessThan(1e-3);
    // Next square after 2024-01-01: last quarter 2024-01-04 03:30 UT (USNO); first quarter is later.
    expect(minutesBetween(sq.date, new Date(Date.UTC(2024, 0, 4, 3, 30)))).toBeLessThan(5);
  });

  it('is fast enough for interactive use', () => {
    const t0 = performance.now();
    findAspect('jupiter', 'saturn', 0, new Date(Date.UTC(2021, 0, 1)));
    findAspect('moon', 'venus', 120, new Date(Date.UTC(2021, 0, 1)));
    findAspect('uranus', 'neptune', 0, new Date(Date.UTC(2000, 0, 1)), { direction: -1 });
    findAspect('mars', 'saturn', 180, new Date(Date.UTC(2021, 0, 1)));
    expect((performance.now() - t0) / 4).toBeLessThan(100);
  });
});

describe('stations and retrograde flags', () => {
  // Reference station times from Swiss Ephemeris 2.10 (Moshier): Mercury R 2023-12-13 07:09 UT,
  // D 2024-01-02 03:08 UT; Mars R 2024-12-06 23:33 UT, D 2025-02-24 02:00 UT.
  it('finds Mercury stations of Dec 2023 / Jan 2024', () => {
    const r = findStation('mercury', new Date(Date.UTC(2023, 11, 1)));
    expect(r.type).toBe('retrograde');
    expect(minutesBetween(r.date, new Date(Date.UTC(2023, 11, 13, 7, 9)))).toBeLessThan(30);
    const d = findStation('mercury', r.date);
    expect(d.type).toBe('direct');
    expect(minutesBetween(d.date, new Date(Date.UTC(2024, 0, 2, 3, 8)))).toBeLessThan(30);
    const back = findStation('mercury', new Date(Date.UTC(2024, 0, 1)), { direction: -1 });
    expect(back.type).toBe('retrograde');
    expect(minutesBetween(back.date, r.date)).toBeLessThan(1);
  });

  it('finds the Mars stations of 2024-2025', () => {
    const r = findStation('mars', new Date(Date.UTC(2024, 6, 1)));
    expect(r.type).toBe('retrograde');
    expect(minutesBetween(r.date, new Date(Date.UTC(2024, 11, 6, 23, 33)))).toBeLessThan(30);
    const d = findStation('mars', r.date);
    expect(d.type).toBe('direct');
    expect(minutesBetween(d.date, new Date(Date.UTC(2025, 1, 24, 2, 0)))).toBeLessThan(30);
  });

  it('flags retrograde inside the period and direct outside it', () => {
    expect(getSkyState(new Date(Date.UTC(2023, 11, 25))).bodies.mercury.retrograde).toBe(true);
    expect(getSkyState(new Date(Date.UTC(2023, 11, 5))).bodies.mercury.retrograde).toBe(false);
    expect(getSkyState(new Date(Date.UTC(2024, 0, 10))).bodies.mercury.retrograde).toBe(false);
    expect(getSkyState(new Date(Date.UTC(2025, 0, 15))).bodies.mars.retrograde).toBe(true);
    expect(getSkyState(new Date(Date.UTC(2025, 3, 1))).bodies.mars.retrograde).toBe(false);
    // Sun and Moon are never retrograde.
    for (let i = 0; i < 60; i++) {
      const s = getSkyState(new Date(Date.UTC(2024, 0, 1) + i * 6.1 * 86400000));
      expect(s.bodies.sun.retrograde).toBe(false);
      expect(s.bodies.moon.retrograde).toBe(false);
    }
  });

  it('refuses Sun and Moon stations', () => {
    expect(() => findStation('sun', new Date())).toThrow();
    expect(() => findStation('moon', new Date())).toThrow();
  });
});

describe('ingresses', () => {
  it('Sun enters Aquarius 2024-01-20 14:07 UT (USNO/astro almanacs)', () => {
    const ing = findIngress('sun', new Date(Date.UTC(2024, 0, 1)));
    expect(ing.sign).toBe('Aquarius');
    expect(ing.fromSignIndex).toBe(9);
    expect(minutesBetween(ing.date, new Date(Date.UTC(2024, 0, 20, 14, 7)))).toBeLessThan(3);
    expect(Math.abs(bodyLongitude('sun', ing.date).longitude - 300)).toBeLessThan(1e-4);
  });

  it("Pluto's first ingress into Aquarius (2023-03-23) and its retrograde return to Capricorn", () => {
    const into = findIngress('pluto', new Date(Date.UTC(2020, 0, 1)), { signIndex: 10 });
    expect(into.date.toISOString().slice(0, 10)).toBe('2023-03-23');
    const back = findIngress('pluto', into.date);
    expect(back.sign).toBe('Capricorn');
    expect(back.retrograde).toBe(true);
    expect(back.date.toISOString().slice(0, 7)).toBe('2023-06');
  });

  it('searches backward with forward-time "from"/"into"', () => {
    const ing = findIngress('moon', new Date(Date.UTC(2024, 0, 1)), { direction: -1 });
    expect(ing.date < new Date(Date.UTC(2024, 0, 1))).toBe(true);
    expect((ing.fromSignIndex + 1) % 12).toBe(ing.signIndex);
  });
});

describe('lunar phases and seasons', () => {
  it('full moon 2024-01-25 17:54 UT and new moon 2023-12-12 23:32 UT (USNO)', () => {
    const full = findMoonPhase('full', new Date(Date.UTC(2024, 0, 1)));
    expect(minutesBetween(full.date, new Date(Date.UTC(2024, 0, 25, 17, 54)))).toBeLessThan(2);
    const nm = findMoonPhase('new', new Date(Date.UTC(2024, 0, 1)), { direction: -1 });
    expect(minutesBetween(nm.date, new Date(Date.UTC(2023, 11, 12, 23, 32)))).toBeLessThan(2);
    expect(getSkyState(full.date).moonPhase.name).toBe('Full Moon');
  });

  it('at the March equinox the Sun is at 0° Aries within arcseconds', () => {
    for (const y of [1900, 2024, 2100, -500]) {
      const eq = seasons(y).marchEquinox;
      const lon = bodyLongitude('sun', eq).longitude;
      expect(Math.abs(wrap180(lon)) * 3600, `year ${y}`).toBeLessThan(1);
    }
    expect(minutesBetween(seasons(2024).marchEquinox, new Date(Date.UTC(2024, 2, 20, 3, 6)))).toBeLessThan(2);
    const s = seasons(2024);
    expect(Math.abs(wrap180(bodyLongitude('sun', s.juneSolstice).longitude - 90)) * 3600).toBeLessThan(1);
    expect(Math.abs(wrap180(bodyLongitude('sun', s.decemberSolstice).longitude - 270)) * 3600).toBeLessThan(1);
  });

  it('works far from the present', () => {
    const e = findIngress('sun', makeUtcDate(-1000, 3, 1), { signIndex: 0 });
    expect(Math.abs(wrap180(bodyLongitude('sun', e.date).longitude)) * 3600).toBeLessThan(1);
  });
});
