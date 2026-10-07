// Sky state shape, moon phase, nodes, vectors, aspects.

import { describe, it, expect } from 'vitest';
import * as A from 'astronomy-engine';
import {
  getSkyState, getAspects, findAspects, signOf, formatLongitude, BODY_IDS, wrap180, worldToEqj,
} from '../src/astro/index.js';

describe('getSkyState', () => {
  const date = new Date(Date.UTC(2024, 3, 8, 18, 18)); // total solar eclipse, North America
  const sky = getSkyState(date);

  it('has every body with consistent sign fields', () => {
    for (const id of BODY_IDS) {
      const b = sky.bodies[id];
      expect(b.signIndex).toBe(Math.floor(b.longitude / 30));
      expect(b.degreeInSign).toBeCloseTo(b.longitude - 30 * b.signIndex, 12);
      expect(b.constellation.symbol).toMatch(/^[A-Z][a-z]{2}$/);
    }
  });

  it('new moon at the 2024 eclipse: elongation ~0, phase name, illumination ~0', () => {
    expect(Math.abs(wrap180(sky.moonPhase.elongation))).toBeLessThan(1);
    expect(sky.moonPhase.name).toBe('New Moon');
    expect(sky.moonPhase.illumination).toBeLessThan(0.001);
    // The Moon is close to a node at an eclipse (well inside the ~15 deg solar-eclipse limit)
    // and so very close to the ecliptic.
    expect(Math.min(Math.abs(wrap180(sky.bodies.moon.longitude - sky.nodes.trueNorth)), Math.abs(wrap180(sky.bodies.moon.longitude - sky.nodes.trueSouth)))).toBeLessThan(6);
    expect(Math.abs(sky.bodies.moon.latitude)).toBeLessThan(0.5);
  });

  it('vectors: geo = helio - earthHelio; Sun at origin; Moon near Earth', () => {
    for (const id of BODY_IDS) {
      const b = sky.bodies[id];
      expect(b.helio.x - sky.earthHelio.x).toBeCloseTo(b.geo.x, 9);
      expect(b.helio.z - sky.earthHelio.z).toBeCloseTo(b.geo.z, 9);
    }
    expect(sky.bodies.sun.helio).toEqual({ x: 0, y: 0, z: 0 });
    const moonDist = Math.hypot(sky.bodies.moon.geo.x, sky.bodies.moon.geo.y, sky.bodies.moon.geo.z);
    expect(moonDist).toBeGreaterThan(0.0023);
    expect(moonDist).toBeLessThan(0.0028);
    // Earth's heliocentric vector matches astronomy-engine (converted to the world frame).
    const e = A.HelioVector(A.Body.Earth, date);
    const w = worldToEqj(sky.earthHelio);
    expect(w.x).toBeCloseTo(e.x, 12);
  });

  it('obliquity ~23.44 and true/mean node within 2 deg', () => {
    expect(sky.obliquity.true).toBeCloseTo(23.44, 1);
    expect(Math.abs(wrap180(sky.nodes.trueNorth - sky.nodes.meanNorth))).toBeLessThan(2);
    expect(Math.abs(wrap180(sky.nodes.trueSouth - sky.nodes.trueNorth))).toBeCloseTo(180, 9);
  });

  it('is fast (< 10 ms typical)', () => {
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) getSkyState(new Date(Date.UTC(2024, 0, 1) + i * 86400000 * 13));
    expect((performance.now() - t0) / 20).toBeLessThan(10);
  });
});

describe('formatting', () => {
  it('signOf / formatLongitude', () => {
    expect(signOf(-1).sign).toBe('Pisces');
    expect(signOf(360).sign).toBe('Aries');
    expect(formatLongitude(300.4860)).toBe("0°29' Aquarius");
    expect(formatLongitude(0.5, { glyph: true, seconds: true })).toBe("0°30'00\" ♈");
  });
});

describe('aspects', () => {
  const pts = (a, b, sa = 0, sb = 0) => [
    { id: 'a', name: 'A', longitude: a, speed: sa, kind: 'body', luminary: false },
    { id: 'b', name: 'B', longitude: b, speed: sb, kind: 'body', luminary: false },
  ];

  it('detects each aspect with orb and separation, across 0°', () => {
    expect(findAspects(pts(355, 3))[0]).toMatchObject({ aspect: 'conjunction', separation: 8 });
    expect(findAspects(pts(10, 72))[0]).toMatchObject({ aspect: 'sextile', orb: 2 });
    expect(findAspects(pts(10, 95))[0].aspect).toBe('square');
    expect(findAspects(pts(350, 115))[0].aspect).toBe('trine');
    expect(findAspects(pts(0, 185))[0]).toMatchObject({ aspect: 'opposition', orb: 5 });
    expect(findAspects(pts(0, 45))).toHaveLength(0);
  });

  it('applying vs separating', () => {
    // Fast A at 10 behind B at 15 (conjunction orb 5): A catching up -> applying.
    expect(findAspects(pts(10, 15, 1, 0.1))[0].applying).toBe(true);
    expect(findAspects(pts(20, 15, 1, 0.1))[0].applying).toBe(false);
    // Square: separation 88 and growing -> applying toward 90.
    expect(findAspects(pts(0, 88, -0.5, 0.5))[0].applying).toBe(true);
    // Both fixed -> null.
    expect(findAspects(pts(0, 120))[0].applying).toBeNull();
  });

  it('wider orbs for the Sun/Moon and custom orbs', () => {
    const p = pts(0, 9.5);
    expect(findAspects(p)).toHaveLength(0);
    p[0].luminary = true;
    expect(findAspects(p)).toHaveLength(1);
    expect(findAspects(pts(0, 9.5), { orbs: { conjunction: 10 } })).toHaveLength(1);
  });

  it('includes Ascendant/MC aspects when angles are supplied, but not Asc-MC', () => {
    const sky = getSkyState(new Date(Date.UTC(2020, 11, 21, 18, 20)));
    const asp = getAspects(sky, { asc: sky.bodies.jupiter.longitude + 1, mc: sky.bodies.jupiter.longitude + 271 });
    const js = asp.find((x) => [x.a, x.b].includes('jupiter') && [x.a, x.b].includes('saturn'));
    expect(js.aspect).toBe('conjunction');
    expect(js.orb).toBeLessThan(0.01);
    expect(asp.some((x) => x.b === 'asc' && x.a === 'jupiter' && x.aspect === 'conjunction')).toBe(true);
    expect(asp.some((x) => x.a === 'asc' && x.b === 'mc')).toBe(false);
    expect(asp.map((x) => x.orb)).toEqual([...asp.map((x) => x.orb)].sort((a, b) => a - b));
  });
});
