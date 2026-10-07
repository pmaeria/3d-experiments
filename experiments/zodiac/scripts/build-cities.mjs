// Regenerates public/data/cities.json from GeoNames (CC BY 4.0, https://www.geonames.org/).
//
// Usage:
//   node scripts/build-cities.mjs                 # downloads into a fresh temp directory
//   node scripts/build-cities.mjs /path/to/dir    # uses cities15000.txt (or .zip),
//                                                 # admin1CodesASCII.txt, countryInfo.txt there
//
// Downloads are treated as untrusted data: they go into their own new temp directory outside
// the repo, the zip is extracted there with the system `unzip` (no shell), and the files are
// only parsed as tab-separated text.
//
// Output (compact, sorted by population, descending):
// {
//   v: 1, source, generated,
//   countries: [[code, name], ...],
//   admin1: [name, ...],
//   tz: [ianaId, ...],
//   cities: [[name, asciiName | "", countryIdx, admin1Idx | -1, lat, lon, tzIdx, population], ...]
// }

import { readFileSync, writeFileSync, existsSync, mkdtempSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outFile = join(here, '..', 'public', 'data', 'cities.json');
const BASE = 'https://download.geonames.org/export/dump/';

async function download(dir) {
  for (const f of ['cities15000.zip', 'admin1CodesASCII.txt', 'countryInfo.txt']) {
    const res = await fetch(BASE + f);
    if (!res.ok) throw new Error(`${f}: HTTP ${res.status}`);
    writeFileSync(join(dir, f), Buffer.from(await res.arrayBuffer()));
    console.log('downloaded', f);
  }
}

function citiesText(dir) {
  const txt = join(dir, 'cities15000.txt');
  if (existsSync(txt)) return readFileSync(txt, 'utf8');
  const zip = join(dir, 'cities15000.zip');
  const extractDir = mkdtempSync(join(tmpdir(), 'zodiac-cities-x-'));
  execFileSync('unzip', ['-q', '-o', zip, 'cities15000.txt', '-d', extractDir]);
  return readFileSync(join(extractDir, 'cities15000.txt'), 'utf8');
}

const lines = (s) => s.split('\n').filter((l) => l && !l.startsWith('#'));

async function main() {
  let dir = process.argv[2];
  if (!dir) {
    dir = mkdtempSync(join(tmpdir(), 'zodiac-geonames-'));
    console.log('working in', dir);
    await download(dir);
  }

  const countryName = new Map();
  for (const l of lines(readFileSync(join(dir, 'countryInfo.txt'), 'utf8'))) {
    const c = l.split('\t');
    if (/^[A-Z]{2}$/.test(c[0])) countryName.set(c[0], c[4]);
  }
  const admin1Name = new Map();
  for (const l of lines(readFileSync(join(dir, 'admin1CodesASCII.txt'), 'utf8'))) {
    const c = l.split('\t');
    admin1Name.set(c[0], c[1]);
  }

  const rows = [];
  for (const l of lines(citiesText(dir))) {
    const c = l.split('\t');
    if (c.length < 19) continue;
    const [name, ascii, lat, lon, cc, a1, pop, tz] = [c[1], c[2], Number(c[4]), Number(c[5]), c[8], c[10], Number(c[14]), c[17]];
    if (!name || !tz || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    rows.push({ name, ascii, lat, lon, cc, a1: admin1Name.get(`${cc}.${a1}`) ?? null, pop: pop || 0, tz });
  }
  rows.sort((a, b) => b.pop - a.pop || a.name.localeCompare(b.name));

  const idx = (list, map) => (v) => {
    if (!map.has(v)) { map.set(v, list.length); list.push(v); }
    return map.get(v);
  };
  const countries = [], admin1 = [], tzs = [];
  const ci = idx(countries, new Map()), ai = idx(admin1, new Map()), ti = idx(tzs, new Map());
  const round = (v) => Math.round(v * 1000) / 1000;
  const cities = rows.map((r) => [
    r.name,
    r.ascii === r.name ? '' : r.ascii,
    ci(r.cc),
    r.a1 ? ai(r.a1) : -1,
    round(r.lat),
    round(r.lon),
    ti(r.tz),
    r.pop,
  ]);
  const out = {
    v: 1,
    source: 'GeoNames cities15000 (https://www.geonames.org/, CC BY 4.0)',
    generated: new Date().toISOString().slice(0, 10),
    countries: countries.map((cc) => [cc, countryName.get(cc) ?? cc]),
    admin1,
    tz: tzs,
    cities,
  };
  mkdirSync(dirname(outFile), { recursive: true });
  const json = JSON.stringify(out);
  writeFileSync(outFile, json);
  console.log(`wrote ${outFile}: ${cities.length} cities, ${(json.length / 1024).toFixed(0)} KiB`);
}

main().catch((e) => { console.error(e); process.exit(1); });
