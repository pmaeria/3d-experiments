// Regenerates public/data/stars.json and public/data/constellations.json from the d3-celestial
// data files (Olaf Frohn, BSD-3-Clause, https://github.com/ofrohn/d3-celestial, data/ folder).
//
// Usage:
//   node scripts/build-stars.mjs               # downloads into a fresh temp directory
//   node scripts/build-stars.mjs /path/to/dir  # uses stars.6.json, starnames.json,
//                                              # constellations.json, constellations.lines.json,
//                                              # constellations.bounds.json found there
//
// Downloads are untrusted data: they go into a new temp directory and are only JSON.parsed.
//
// stars.json:
//   {v:1, source, count, stars: [ra, dec, mag, bv, ra, dec, mag, bv, ...] (J2000 degrees,
//    sorted brightest first; bv null if unknown), names: [[starIndex, properName, designation], ...]}
// constellations.json:
//   {v:1, source, constellations: [{id, name, english, rank, label: [ra, dec], zodiac, ecliptic,
//    lines: [[ra, dec, ra, dec, ...], ...] (polylines), bounds: [[ra, dec, ...], ...] (closed
//    polygons) }]}

import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'public', 'data');
const BASE = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/';
const FILES = ['stars.6.json', 'starnames.json', 'constellations.json', 'constellations.lines.json', 'constellations.bounds.json'];
const ZODIAC = ['Ari', 'Tau', 'Gem', 'Cnc', 'Leo', 'Vir', 'Lib', 'Sco', 'Sgr', 'Cap', 'Aqr', 'Psc'];
const NAME_MAG_LIMIT = 4.0; // keep proper names for stars at least this bright
const SOURCE = 'd3-celestial data by Olaf Frohn (BSD-3-Clause), https://github.com/ofrohn/d3-celestial';

const ra360 = (ra) => (ra < 0 ? ra + 360 : ra);
const r = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
const read = (dir, f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const flatCoords = (pts) => pts.flatMap(([ra, dec]) => [r(ra360(ra), 3), r(dec, 3)]);

async function main() {
  let dir = process.argv[2];
  if (!dir) {
    dir = mkdtempSync(join(tmpdir(), 'zodiac-celestial-'));
    console.log('working in', dir);
    for (const f of FILES) {
      const res = await fetch(BASE + f);
      if (!res.ok) throw new Error(`${f}: HTTP ${res.status}`);
      writeFileSync(join(dir, f), Buffer.from(await res.arrayBuffer()));
    }
  }

  // Stars
  const stars = read(dir, 'stars.6.json').features
    .map((f) => ({
      id: String(f.id), ra: ra360(f.geometry.coordinates[0]), dec: f.geometry.coordinates[1],
      mag: f.properties.mag, bv: f.properties.bv === '' || f.properties.bv == null ? null : Number(f.properties.bv),
    }))
    .filter((s) => Number.isFinite(s.ra) && Number.isFinite(s.dec) && Number.isFinite(s.mag))
    .sort((a, b) => a.mag - b.mag);
  const names = read(dir, 'starnames.json');
  const flat = [];
  const named = [];
  stars.forEach((s, i) => {
    flat.push(r(s.ra, 4), r(s.dec, 4), r(s.mag, 2), s.bv === null || !Number.isFinite(s.bv) ? null : r(s.bv, 2));
    const n = names[s.id];
    if (n && n.name && s.mag <= NAME_MAG_LIMIT) {
      const desig = n.desig && n.c ? `${n.desig} ${n.c}` : '';
      named.push([i, n.name, desig]);
    }
  });
  const starsOut = { v: 1, source: SOURCE, count: stars.length, stars: flat, names: named };

  // Constellations (Serpens appears twice, Caput and Cauda: merged under one id)
  const byId = new Map();
  for (const f of read(dir, 'constellations.json').features) {
    if (byId.has(f.id)) continue;
    const p = f.properties;
    byId.set(f.id, {
      id: f.id, name: p.name, english: p.en, rank: Number(p.rank),
      label: [r(ra360(f.geometry.coordinates[0]), 2), r(f.geometry.coordinates[1], 2)],
      zodiac: ZODIAC.includes(f.id), ecliptic: ZODIAC.includes(f.id) || f.id === 'Oph',
      lines: [], bounds: [],
    });
  }
  for (const f of read(dir, 'constellations.lines.json').features) {
    byId.get(f.id)?.lines.push(...f.geometry.coordinates.map(flatCoords));
  }
  for (const f of read(dir, 'constellations.bounds.json').features) {
    const polys = f.geometry.type === 'Polygon' ? f.geometry.coordinates : f.geometry.coordinates.flat();
    byId.get(f.id)?.bounds.push(...polys.map(flatCoords));
  }
  const consOut = { v: 1, source: SOURCE, constellations: [...byId.values()] };

  mkdirSync(outDir, { recursive: true });
  for (const [file, obj] of [['stars.json', starsOut], ['constellations.json', consOut]]) {
    const json = JSON.stringify(obj);
    writeFileSync(join(outDir, file), json);
    console.log(`wrote ${file}: ${(json.length / 1024).toFixed(0)} KiB`);
  }
  console.log(`${stars.length} stars, ${named.length} named, ${byId.size} constellations`);
}

main().catch((e) => { console.error(e); process.exit(1); });
