// Chart builder and share links. All inputs are synthetic or public events.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildChart, encodeChartInput, decodeChartInput, validateChartInput, wrap180, SIGNS } from '../src/astro/index.js';

const SWE = JSON.parse(readFileSync(new URL('./fixtures/swiss-ephemeris.json', import.meta.url), 'utf8'));

// Apollo 11 launch: 1969-07-16 09:32 EDT, Launch Complex 39A, Kennedy Space Center.
const APOLLO = {
  name: 'Apollo 11 launch', year: 1969, month: 7, day: 16, hour: 9, minute: 32, timeKnown: true,
  place: { name: 'Kennedy Space Center', lat: 28.573, lon: -80.649, tz: 'America/New_York' },
};

describe('buildChart', () => {
  it('builds the Apollo 11 launch chart, matching Swiss Ephemeris angles and Placidus cusps', () => {
    const ref = SWE.cases.find((c) => c.label === 'apollo11-launch-ksc');
    const chart = buildChart(APOLLO, { houseSystem: 'placidus' });
    expect(chart.utc.toISOString()).toBe('1969-07-16T13:32:00.000Z');
    expect(chart.offsetLabel).toBe('UTC-04:00');
    expect(Math.abs(wrap180(chart.angles.asc - ref.asc))).toBeLessThan(1 / 3600);
    expect(Math.abs(wrap180(chart.angles.mc - ref.mc))).toBeLessThan(1 / 3600);
    chart.houses.cusps.forEach((c, i) => expect(Math.abs(wrap180(c - ref.placidus[i]))).toBeLessThan(1 / 3600));
    expect(chart.houses.system).toBe('placidus');
    const sun = chart.placements.find((p) => p.id === 'sun');
    expect(sun.sign).toBe('Cancer');
    expect(sun.house).toBeGreaterThanOrEqual(1);
    expect(chart.placements.find((p) => p.id === 'asc').formatted).toBe("0°42' Virgo"); // Swiss Ephemeris: 150.7092
  });

  it('tallies elements and modalities over the ten bodies', () => {
    const chart = buildChart(APOLLO);
    const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
    expect(sum(chart.tallies.elements)).toBe(10);
    expect(sum(chart.tallies.modalities)).toBe(10);
    for (const p of chart.placements.filter((x) => x.kind === 'body')) {
      expect(p.element).toBe(SIGNS[p.signIndex].element);
    }
  });

  it('defaults to Whole Sign houses: house 1 = the Ascendant sign', () => {
    const chart = buildChart(APOLLO);
    expect(chart.houses.system).toBe('whole');
    expect(chart.houses.cusps[0]).toBe(Math.floor(chart.angles.asc / 30) * 30);
    for (const p of chart.placements.filter((x) => x.kind === 'body')) {
      expect(p.house).toBe(((p.signIndex - Math.floor(chart.angles.asc / 30) + 12) % 12) + 1);
    }
  });

  it('unknown birth time: no angles/houses, noon positions, Moon range given', () => {
    const chart = buildChart({ ...APOLLO, timeKnown: false });
    expect(chart.angles).toBeNull();
    expect(chart.houses).toBeNull();
    expect(chart.placements.every((p) => p.house === null)).toBe(true);
    expect(chart.utc.toISOString()).toBe('1969-07-16T16:00:00.000Z');
    const span = ((chart.moonRange.end - chart.moonRange.start) + 360) % 360;
    expect(span).toBeGreaterThan(10);
    expect(span).toBeLessThan(16);
    expect(chart.aspects.some((a) => a.a === 'asc' || a.b === 'asc')).toBe(false);
  });

  it('falls back to Whole Sign when Placidus is undefined (polar), with a note', () => {
    const chart = buildChart({
      name: 'Synthetic', year: 2001, month: 1, day: 1, hour: 12, minute: 0, timeKnown: true,
      place: { name: 'Tromsø', lat: 69.65, lon: 18.96, tz: 'Europe/Oslo' },
    }, { houseSystem: 'placidus' });
    expect(chart.houses.system).toBe('whole');
    expect(chart.houses.requested).toBe('placidus');
    expect(chart.notes.join(' ')).toMatch(/Placidus/);
  });

  it('reports DST problems in notes', () => {
    const c = buildChart({
      name: 'Synthetic', year: 2021, month: 3, day: 14, hour: 2, minute: 30, timeKnown: true,
      place: { name: 'New York City', lat: 40.71, lon: -74.01, tz: 'America/New_York' },
    });
    expect(c.tzStatus).toBe('skipped');
    expect(c.notes[0]).toMatch(/did not exist/);
  });

  it('validates input', () => {
    expect(validateChartInput({ ...APOLLO, month: 13 })).toContain('Month must be 1-12');
    expect(() => buildChart({ ...APOLLO, place: { ...APOLLO.place, tz: 'Nowhere/Land' } })).toThrow(/time zone/);
  });
});

describe('share links', () => {
  const cases = [
    APOLLO,
    { ...APOLLO, timeKnown: false, hour: 12, minute: 0 },
    {
      name: 'Zoë ~ "test" & co/ü 🌙', year: 1990, month: 2, day: 28, hour: 0, minute: 5, timeKnown: true,
      place: { name: 'São Paulo, Brazil', lat: -23.5475, lon: -46.6361, tz: 'America/Sao_Paulo' },
    },
    {
      name: '', year: -43, month: 3, day: 15, hour: 11, minute: 0, timeKnown: true,
      place: { name: 'Rome', lat: 41.8919, lon: 12.5113, tz: 'LMT' },
    },
  ];

  it('round-trips', () => {
    for (const input of cases) {
      const s = encodeChartInput(input);
      expect(s).toMatch(/^1~/);
      expect(s).not.toMatch(/[#\s?&]/);
      expect(decodeChartInput(s)).toEqual(input);
      expect(decodeChartInput('#' + s)).toEqual(input);
      expect(decodeChartInput(encodeURI(s).replace(/%25/g, '%'))).toEqual(input);
    }
  });

  it('is compact and readable', () => {
    expect(encodeChartInput(APOLLO)).toBe('1~Apollo%2011%20launch~1969.7.16~9.32~28.573~-80.649~America%2FNew_York~Kennedy%20Space%20Center');
  });

  it('rejects malformed or unknown-version links', () => {
    expect(() => decodeChartInput('2~a~1990.1.1~~0~0~UTC~x')).toThrow(/version/);
    expect(() => decodeChartInput('1~a~1990.1~~0~0~UTC~x')).toThrow(/date/);
    expect(() => decodeChartInput('1~a~1990.1.1~25.00~0~0~UTC~x')).toThrow(/Hour/);
    expect(() => decodeChartInput('1~a~1990.1.1~~95~0~UTC~x')).toThrow(/Latitude/);
    expect(() => decodeChartInput('1~a~1990.1.1~~0~0~UTC')).toThrow(/fields/);
    expect(() => decodeChartInput('1~%E0%A4%A~1990.1.1~~0~0~UTC~x')).toThrow(/escaping/);
  });
});
