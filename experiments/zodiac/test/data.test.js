// Bundled data: place search and star/constellation catalogues.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  createPlaceIndex, normalizeName, parseStarCatalog, parseConstellations, raDecToWorld, bvToRgb,
  ECLIPTIC_CONSTELLATIONS, eclipticOfDateToWorld,
} from '../src/astro/index.js';

const load = (f) => JSON.parse(readFileSync(new URL(`../public/data/${f}`, import.meta.url), 'utf8'));
const places = createPlaceIndex(load('cities.json'));

describe('place search', () => {
  it('normalizes accents and punctuation', () => {
    expect(normalizeName('São Paulo')).toBe('sao paulo');
    expect(normalizeName('Reykjavík')).toBe('reykjavik');
    expect(normalizeName('Łódź')).toBe('lodz');
    expect(normalizeName('  St.-Étienne ')).toBe('st etienne');
  });

  it('finds Kuala Lumpur with its zone', () => {
    const [kl] = places.search('kuala lumpur');
    expect(kl.name).toBe('Kuala Lumpur');
    expect(kl.countryCode).toBe('MY');
    expect(kl.tz).toBe('Asia/Kuala_Lumpur');
    expect(kl.lat).toBeCloseTo(3.14, 1);
    expect(kl.lon).toBeCloseTo(101.69, 1);
  });

  it('finds São Paulo from "sao paulo" (accent-insensitive) and from a prefix', () => {
    expect(places.search('sao paulo')[0]).toMatchObject({ name: 'São Paulo', countryCode: 'BR', tz: 'America/Sao_Paulo' });
    expect(places.search('São Pau')[0].name).toBe('São Paulo');
  });

  it('distinguishes same-named cities by country, ranks by population, accepts a qualifier', () => {
    const paris = places.search('paris', 10);
    expect(paris[0]).toMatchObject({ countryCode: 'FR', tz: 'Europe/Paris' });
    const tx = paris.find((p) => p.countryCode === 'US');
    expect(tx.label).toBe('Paris, Texas, United States');
    expect(tx.tz).toBe('America/Chicago');
    expect(places.search('paris, texas')[0].countryCode).toBe('US');
    const london = places.search('london', 5);
    expect(london[0].countryCode).toBe('GB');
    expect(london.some((p) => p.countryCode === 'CA')).toBe(true);
    expect(places.search('london, canada')[0].admin1).toBe('Ontario');
    expect(places.search('mexico')[0].name).toBe('Mexico City');
  });

  it('substring matches and limits', () => {
    expect(places.search('lumpur').some((p) => p.name === 'Kuala Lumpur')).toBe(true);
    expect(places.search('a', 3)).toHaveLength(3);
    expect(places.search('   ')).toEqual([]);
  });

  it('has a sensible dataset', () => {
    expect(places.size).toBeGreaterThan(30000);
  });
});

describe('star catalogue', () => {
  const stars = parseStarCatalog(load('stars.json'));

  it('has ~5000 stars to magnitude 6, brightest first, unit vectors', () => {
    expect(stars.count).toBeGreaterThan(4900);
    expect(stars.magnitudes[0]).toBeLessThan(-1);
    expect(Math.max(...stars.magnitudes)).toBeLessThanOrEqual(6.01);
    for (let i = 0; i < stars.count; i += 97) {
      const l = Math.hypot(stars.positions[3 * i], stars.positions[3 * i + 1], stars.positions[3 * i + 2]);
      expect(l).toBeCloseTo(1, 6);
    }
  });

  it('names bright stars at the right place (Sirius, Regulus near the ecliptic)', () => {
    const sirius = stars.names.find((n) => n.name === 'Sirius');
    expect(sirius.index).toBe(0);
    expect(sirius.designation).toBe('α CMa');
    const reg = stars.names.find((n) => n.name === 'Regulus').index;
    // Regulus: J2000 ecliptic latitude +0.46 deg, longitude ~149.8 deg.
    const z = stars.positions[3 * reg + 2];
    expect(Math.asin(z) * 180 / Math.PI).toBeCloseTo(0.46, 1);
    const v = raDecToWorld(stars.ra[reg], stars.dec[reg]);
    expect(v.x).toBeCloseTo(stars.positions[3 * reg], 6);
  });

  it('B-V colours: blue stars bluish, red stars reddish', () => {
    const blue = bvToRgb(-0.2), red = bvToRgb(1.6);
    expect(blue.b).toBeGreaterThan(blue.r);
    expect(red.r).toBeGreaterThan(red.b);
    expect(bvToRgb(null)).toEqual({ r: 1, g: 1, b: 1 });
  });
});

describe('constellations', () => {
  const cons = parseConstellations(load('constellations.json'));

  it('has all 88 IAU constellations with lines and boundaries', () => {
    expect(cons).toHaveLength(88);
    for (const c of cons) {
      expect(c.bounds.length % 6).toBe(0);
      expect(c.bounds.length).toBeGreaterThan(0);
      expect(c.lines.length % 6).toBe(0);
    }
  });

  it('flags the 13 ecliptic constellations (12 zodiac + Ophiuchus)', () => {
    const ecl = cons.filter((c) => c.ecliptic).map((c) => c.id).sort();
    expect(ecl).toEqual([...ECLIPTIC_CONSTELLATIONS].sort());
    expect(cons.filter((c) => c.zodiac)).toHaveLength(12);
    expect(cons.find((c) => c.id === 'Oph').zodiac).toBe(false);
  });

  it('places zodiac labels near the ecliptic', () => {
    for (const c of cons.filter((x) => x.zodiac)) {
      expect(Math.abs(Math.asin(c.label.z) * 180 / Math.PI), c.id).toBeLessThan(25);
    }
    // Leo's label is roughly at J2000 ecliptic longitude 150 (sign of Virgo-ish today).
    const leo = cons.find((c) => c.id === 'Leo').label;
    const lon = (Math.atan2(leo.y, leo.x) * 180 / Math.PI + 360) % 360;
    expect(lon).toBeGreaterThan(125);
    expect(lon).toBeLessThan(175);
    expect(eclipticOfDateToWorld(0, 0, new Date(Date.UTC(2000, 0, 1, 12))).x).toBeCloseTo(1, 4);
  });
});
