// Offline place search over the bundled GeoNames city list (public/data/cities.json).
// The dataset (~1.7 MB, ~0.8 MB gzipped) is fetched lazily on the first search.

const MATCH_TIER_WEIGHT = 1.5;
const EXTRA_FOLDS = { ø: 'o', ł: 'l', ß: 'ss', æ: 'ae', œ: 'oe', đ: 'd', ð: 'd', þ: 'th', ı: 'i', ħ: 'h' };

/** Lowercase, strip accents and punctuation: "São Paulo" -> "sao paulo". */
export function normalizeName(s) {
  return String(s)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[øłßæœđðþıħ]/g, (c) => EXTRA_FOLDS[c])
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/**
 * Build a searchable index from the parsed cities.json object.
 * Returns {size, search(query, limit = 10)}. Queries may add a qualifier after a comma to
 * narrow by country code, country name or region: "paris, texas", "paris, fr", "london, canada".
 * Results: [{name, asciiName, label, country, countryCode, admin1, lat, lon, tz, population}],
 * ranked by match tier (exact > prefix > word-prefix > substring) blended with log population,
 * so "mexico" finds Mexico City before the small town called Mexico.
 */
export function createPlaceIndex(data) {
  if (!data || data.v !== 1) throw new Error('Unsupported cities.json version');
  const countryNorm = data.countries.map(([code, name]) => ({ code: code.toLowerCase(), name: normalizeName(name) }));
  const adminNorm = data.admin1.map(normalizeName);
  const rows = data.cities;
  const keys = rows.map((r) => {
    const a = normalizeName(r[0]);
    const b = r[1] ? normalizeName(r[1]) : a;
    return a === b ? [a] : [a, b];
  });

  const toResult = (r) => {
    const [code, country] = data.countries[r[2]];
    const admin1 = r[3] >= 0 ? data.admin1[r[3]] : null;
    const label = [r[0], admin1 && admin1 !== r[0] ? admin1 : null, country].filter(Boolean).join(', ');
    return {
      name: r[0], asciiName: r[1] || r[0], label, country, countryCode: code, admin1,
      lat: r[4], lon: r[5], tz: data.tz[r[6]], population: r[7],
    };
  };

  function rank(key, q) {
    if (key === q) return 0;
    if (key.startsWith(q)) return 1;
    if (key.includes(' ' + q)) return 2;
    if (key.includes(q)) return 3;
    return -1;
  }

  function search(query, limit = 10) {
    const [mainRaw, ...qualRaw] = String(query).split(',');
    const q = normalizeName(mainRaw);
    const qual = normalizeName(qualRaw.join(' '));
    if (!q) return [];
    const hits = [];
    for (let i = 0; i < rows.length; i++) {
      let best = -1;
      for (const k of keys[i]) {
        const s = rank(k, q);
        if (s >= 0 && (best < 0 || s < best)) best = s;
      }
      if (best < 0) continue;
      if (qual) {
        const r = rows[i];
        const c = countryNorm[r[2]];
        const adm = r[3] >= 0 ? adminNorm[r[3]] : '';
        if (!(c.code === qual || c.name.startsWith(qual) || adm.startsWith(qual))) continue;
      }
      // Blend match quality with size: each match tier costs a factor of ~30 in population.
      hits.push([best * MATCH_TIER_WEIGHT - Math.log10(rows[i][7] + 10), i]);
    }
    hits.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return hits.slice(0, limit).map(([, i]) => toResult(rows[i]));
  }

  return { size: rows.length, search };
}

let indexPromise = null;
let placesUrl = null;

function defaultUrl() {
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || './';
  return `${base}data/cities.json`;
}

/** Override where cities.json is fetched from (call before the first search). */
export function setPlacesUrl(url) {
  placesUrl = url;
  indexPromise = null;
}

/** Load (once) and return the place index. Uses fetch, so needs a browser or Node 18+. */
export function loadPlaceIndex() {
  if (!indexPromise) {
    indexPromise = fetch(placesUrl ?? defaultUrl())
      .then((r) => {
        if (!r.ok) throw new Error(`cities.json: HTTP ${r.status}`);
        return r.json();
      })
      .then(createPlaceIndex)
      .catch((e) => { indexPromise = null; throw e; });
  }
  return indexPromise;
}

/** Search places by name (async; lazy-loads the dataset). See createPlaceIndex for the result shape. */
export async function searchPlaces(query, limit = 10) {
  return (await loadPlaceIndex()).search(query, limit);
}
