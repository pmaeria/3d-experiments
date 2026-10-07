// Aspects between bodies (and optionally the Ascendant / Midheaven).

import { ASPECTS, BODIES, LUMINARY_ORB_BONUS } from './constants.js';
import { wrap180 } from './math.js';

/**
 * Points to test for aspects, from a sky state plus optional chart angles.
 * Angles are treated as fixed (speed 0) for applying/separating, as most chart software does.
 */
export function aspectPoints(sky, angles = null) {
  const pts = sky.order.map((id) => {
    const b = sky.bodies[id];
    return { id, name: b.name, longitude: b.longitude, speed: b.speed, kind: 'body', luminary: !!BODIES[id].luminary };
  });
  if (angles) {
    pts.push({ id: 'asc', name: 'Ascendant', longitude: angles.asc, speed: 0, kind: 'angle', luminary: false });
    pts.push({ id: 'mc', name: 'Midheaven', longitude: angles.mc, speed: 0, kind: 'angle', luminary: false });
  }
  return pts;
}

/**
 * Find aspects among points [{id, name, longitude, speed, kind, luminary}].
 * options:
 *   orbs: {conjunction, sextile, square, trine, opposition} overrides (degrees)
 *   luminaryBonus: extra orb when Sun or Moon is involved (default 2)
 *   aspects: aspect definitions (default ASPECTS)
 * Angle-to-angle pairs are skipped. Each pair yields at most one aspect (the tightest).
 * Returns [{a, b, aspect, name, glyph, angle, separation, orb, maxOrb, applying}] sorted by orb.
 * `separation` is the actual angular distance [0,180]; `orb` = |separation - angle|;
 * `applying` true if the orb is shrinking, false if growing, null if both points are fixed.
 */
export function findAspects(points, { orbs = {}, luminaryBonus = LUMINARY_ORB_BONUS, aspects = ASPECTS } = {}) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const p = points[i], q = points[j];
      if (p.kind === 'angle' && q.kind === 'angle') continue;
      const d = wrap180(p.longitude - q.longitude);
      const separation = Math.abs(d);
      let best = null;
      for (const asp of aspects) {
        const maxOrb = (orbs[asp.id] ?? asp.orb) + (p.luminary || q.luminary ? luminaryBonus : 0);
        const orb = Math.abs(separation - asp.angle);
        if (orb <= maxOrb && (!best || orb < best.orb)) best = { asp, orb, maxOrb };
      }
      if (!best) continue;
      const relSpeed = (p.speed ?? 0) - (q.speed ?? 0);
      let applying = null;
      if (p.speed || q.speed) {
        const dSep = (d >= 0 ? 1 : -1) * relSpeed;
        const dOrb = (separation - best.asp.angle >= 0 ? 1 : -1) * dSep;
        applying = dOrb < 0;
      }
      out.push({
        a: p.id, b: q.id,
        aspect: best.asp.id, name: best.asp.name, glyph: best.asp.glyph, angle: best.asp.angle,
        separation, orb: best.orb, maxOrb: best.maxOrb, applying,
      });
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}

/** Convenience: aspects for a sky state (and optional angles). */
export function getAspects(sky, angles = null, options = {}) {
  return findAspects(aspectPoints(sky, angles), options);
}
