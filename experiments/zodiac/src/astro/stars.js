// Star and constellation data loader: turns the compact public/data files into
// world-frame unit vectors (J2000 mean ecliptic) ready for three.js buffers.
// Stars are fixed at their J2000 positions (proper motion ignored: under ~1.5 deg for any
// naked-eye star over 3000 years, mostly far less).

import { raDecToWorld } from './frames.js';

const MAX_EDGE_DEG = 1; // boundary edges are subdivided so they follow the sphere

function pushWorld(arr, ra, dec) {
  const v = raDecToWorld(ra, dec);
  arr.push(v.x, v.y, v.z);
}

/** Polyline [ra, dec, ra, dec, ...] -> line-segment pairs (for THREE.LineSegments), optionally closed. */
function polylineToSegments(flat, out, { closed = false, subdivide = false } = {}) {
  const n = flat.length / 2;
  const edges = closed ? n : n - 1;
  for (let i = 0; i < edges; i++) {
    const ra1 = flat[2 * i], dec1 = flat[2 * i + 1];
    const j = (i + 1) % n;
    let dra = flat[2 * j] - ra1;
    if (dra > 180) dra -= 360;
    if (dra < -180) dra += 360;
    const ddec = flat[2 * j + 1] - dec1;
    const steps = subdivide ? Math.max(1, Math.ceil(Math.max(Math.abs(dra), Math.abs(ddec)) / MAX_EDGE_DEG)) : 1;
    for (let k = 0; k < steps; k++) {
      pushWorld(out, ra1 + (dra * k) / steps, dec1 + (ddec * k) / steps);
      pushWorld(out, ra1 + (dra * (k + 1)) / steps, dec1 + (ddec * (k + 1)) / steps);
    }
  }
}

/**
 * B-V colour index to an approximate sRGB colour, components 0..1 (Ballesteros 2012
 * temperature, then a blackbody-ish ramp). null/undefined -> white.
 */
export function bvToRgb(bv) {
  if (bv === null || bv === undefined || !Number.isFinite(bv)) return { r: 1, g: 1, b: 1 };
  const b = Math.max(-0.4, Math.min(2.0, bv));
  const t = 4600 * (1 / (0.92 * b + 1.7) + 1 / (0.92 * b + 0.62)); // Kelvin
  const k = t / 100;
  const clamp = (x) => Math.max(0, Math.min(255, x)) / 255;
  const r = k <= 66 ? 1 : clamp(329.698727446 * (k - 60) ** -0.1332047592);
  const g = k <= 66 ? clamp(99.4708025861 * Math.log(k) - 161.1195681661) : clamp(288.1221695283 * (k - 60) ** -0.0755148492);
  const bl = k >= 66 ? 1 : k <= 19 ? 0 : clamp(138.5177312231 * Math.log(k - 10) - 305.0447927307);
  return { r, g, b: bl };
}

/**
 * Parse stars.json. Returns {
 *   count,
 *   positions: Float32Array(3n) world-frame unit vectors,
 *   magnitudes: Float32Array(n), bv: Float32Array(n) (NaN where unknown),
 *   ra, dec: Float32Array(n) J2000 degrees,
 *   names: [{index, name, designation}]  (stars brighter than mag 4 with proper names),
 * }  Stars are sorted brightest first.
 */
export function parseStarCatalog(json) {
  if (!json || json.v !== 1) throw new Error('Unsupported stars.json version');
  const n = json.count;
  const positions = new Float32Array(3 * n);
  const magnitudes = new Float32Array(n), bv = new Float32Array(n), ra = new Float32Array(n), dec = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const [r, d, m, c] = json.stars.slice(4 * i, 4 * i + 4);
    const v = raDecToWorld(r, d);
    positions[3 * i] = v.x; positions[3 * i + 1] = v.y; positions[3 * i + 2] = v.z;
    magnitudes[i] = m; bv[i] = c === null ? NaN : c; ra[i] = r; dec[i] = d;
  }
  const names = json.names.map(([index, name, designation]) => ({ index, name, designation }));
  return { count: n, positions, magnitudes, bv, ra, dec, names };
}

/**
 * Parse constellations.json. Returns [{
 *   id (IAU 3-letter), name (Latin), english, rank (1 = prominent .. 3 = faint),
 *   zodiac (one of the 12), ecliptic (zodiac or Ophiuchus),
 *   label: {x,y,z} world unit vector for the name label,
 *   lines: Float32Array of segment endpoint pairs (xyz xyz ...) for THREE.LineSegments,
 *   bounds: Float32Array of segment pairs outlining the IAU boundary (edges subdivided),
 * }]
 */
export function parseConstellations(json) {
  if (!json || json.v !== 1) throw new Error('Unsupported constellations.json version');
  return json.constellations.map((c) => {
    const lines = [], bounds = [];
    for (const pl of c.lines) polylineToSegments(pl, lines);
    for (const pg of c.bounds) polylineToSegments(pg, bounds, { closed: true, subdivide: true });
    return {
      id: c.id, name: c.name, english: c.english, rank: c.rank, zodiac: c.zodiac, ecliptic: c.ecliptic,
      label: raDecToWorld(c.label[0], c.label[1]),
      lines: new Float32Array(lines), bounds: new Float32Array(bounds),
    };
  });
}

/**
 * Fetch and parse both files. baseUrl defaults to Vite's BASE_URL + 'data/'.
 * Returns Promise<{stars, constellations}>.
 */
export async function loadSkyData(baseUrl) {
  const base = baseUrl ?? `${(import.meta.env && import.meta.env.BASE_URL) || './'}data/`;
  const get = async (f) => {
    const r = await fetch(base + f);
    if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`);
    return r.json();
  };
  const [s, c] = await Promise.all([get('stars.json'), get('constellations.json')]);
  return { stars: parseStarCatalog(s), constellations: parseConstellations(c) };
}
