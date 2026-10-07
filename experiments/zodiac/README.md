# Zodiac: The Sky Behind Your Birth Chart

An interactive 3D experiment for learning Western (tropical) astrology by seeing the astronomy
underneath it: an orrery, an Earth-centred view with the zodiac ring and sight lines, a
standing-on-Earth sky view, a time dial from hours to millennia (precession), and shareable
birth charts.

This README documents the **astronomy engine** (`src/astro/`), the bundled data, and the
**three.js scene and UI** built on them (see [Scene and UI](#scene-and-ui)).

```bash
npm install
npm run dev       # http://localhost:5327
npm run build     # -> dist/
npm run preview   # http://localhost:5328
npm test          # vitest, ~0.5 s
npm run data:cities | data:stars | data:pluto   # regenerate data (see "Data")
```

---

## Conventions (read this first)

| Thing | Convention |
| --- | --- |
| Instants | JS `Date` (a UTC instant). Calendar is **proleptic Gregorian**, astronomical year numbering (year 0 = 1 BCE, -99 = 100 BCE), exactly like JS `Date`. Use `makeUtcDate(y, m, d, h, min)` for years < 100 or negative. |
| Angles | **Degrees** everywhere (sidereal time is in hours, and says so). |
| Distances | **AU**. |
| Longitudes on Earth | **East positive** (London -0.13, Tokyo +139.7). Latitude north positive. |
| World frame | **J2000 mean ecliptic**: +x toward the J2000 equinox, +z toward the north ecliptic pole, right-handed (astronomy-engine's `ECL`). Every vector the engine returns is in this frame. The fixed stars never move in it. |
| Tropical longitude | Geocentric **apparent** ecliptic longitude on the **true ecliptic and equinox of date** (light-time, aberration, precession and nutation applied), same as Swiss Ephemeris / astro.com. This is what signs and degrees are measured in. |
| Vectors | Plain `{x, y, z}` objects, usable directly with `new THREE.Vector3().copy(v)`. |
| Matrices | `{rows, columnMajor}`: `rows[i][j]` is row i, column j; `columnMajor` is a flat array for `THREE.Matrix3.fromArray()`. |

**Three.js tip.** three.js is y-up; the world frame is z-up (ecliptic north). Either set
`camera.up.set(0, 0, 1)` and work in the world frame directly, or put all astronomy content
inside one `THREE.Group` rotated by `-Math.PI / 2` about x (maps world +z to three +y).

**Why two frames matter.** Planets and stars live in the fixed world frame. The 12-sign ring is
attached to the equinox *of date*, which precesses ~1.4° per century. Build the ring in its own
frame (0° Aries on +x, longitudes increasing toward +y, ecliptic pole +z) and apply
`signRingMatrix(date)`. Scrub millennia and the ring visibly slides against the stars.

Import everything from the barrel: `import * as astro from './astro/index.js'`.

---

## API reference

### Constants (`constants.js`)

| Export | Description |
| --- | --- |
| `BODY_IDS` | `['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto']` (display order). |
| `BODIES[id]` | `{id, name, glyph, aeName, luminary?}`. |
| `SIGNS[0..11]` | `{index, id, name, glyph, element, modality, ruler}`; index 0 = Aries (0-30°). |
| `ASPECTS` | `[{id, name, angle, glyph, orb}]` for conjunction 0 (orb 8), sextile 60 (5), square 90 (7), trine 120 (7), opposition 180 (8). |
| `LUMINARY_ORB_BONUS` | `2`: extra orb when Sun or Moon is involved. |
| `ELEMENTS`, `MODALITIES` | `['fire','earth','air','water']`, `['cardinal','fixed','mutable']`. |
| `MOON_PHASES` | 8 phase names by elongation octant. |
| `ZODIAC_CONSTELLATIONS` | The 12 IAU codes `['Ari',...,'Psc']`. `ECLIPTIC_CONSTELLATIONS` adds `'Oph'`. |
| `MAX_SPEED[id]` | Upper bound of \|longitude speed\| in °/day (used by the event finder). |

### Math helpers (`math.js`)

`DEG`, `RAD` (conversion factors), `norm360(a)` → [0,360), `wrap180(a)` → [-180,180),
`angularSeparation(a, b)` → [0,180], `fromSpherical(lonDeg, latDeg, r = 1)` → `{x,y,z}`,
`toSpherical(v)` → `{lon, lat, r}`.

### Time (`time.js`)

| Export | Description |
| --- | --- |
| `makeUtcDate(year, month=1, day=1, hour=0, minute=0, second=0)` | UTC `Date` from fields; safe for years < 100 and negative years. |
| `addDays(date, days)` | New `Date`. |
| `decimalYear(date)` | e.g. `2024.5`. |
| `formatYear(year)` | `'2020 CE'`, `'131 BCE'` (input: astronomical year number). |
| `DATE_RANGE` | `{accurate, good, supported}` each `{minYear, maxYear}`. See [Date range](#date-range). |
| `dateSupport(date)` | `{level: 'accurate'\|'good'\|'approximate'\|'unsupported', year, notes: string[]}`. Notes are user-facing (Delta T, Julian calendar caveats). |
| `clampDate(date)` | Clamp into `DATE_RANGE.supported` (use in the time scrubber). |

### Frames and precession (`frames.js`)

| Export | Returns |
| --- | --- |
| `eqjToWorld(v)` / `worldToEqj(v)` | Rotate between J2000 equatorial (EQJ) and the world frame. |
| `raDecToWorld(raDeg, decDeg)` | World unit vector for J2000 RA/Dec (RA in **degrees**). |
| `worldToRaDec(v)` | `{ra, dec}` J2000, degrees. |
| `worldToJ2000Ecliptic(v)` | `{lon, lat, r}` in the world frame itself (not tropical). |
| `obliquity(date)` | `{mean, true}` obliquity of the ecliptic of date, degrees. |
| `signRingMatrix(date)` | `{rows, columnMajor}`: rotation **true ecliptic of date → world**. Apply to the sign ring. Example: `ring.setRotationFromMatrix(new THREE.Matrix4().setFromMatrix3(new THREE.Matrix3().fromArray(m.columnMajor)))`. |
| `worldToEclipticOfDateMatrix(date)` | The inverse (transpose). |
| `eclipticOfDateToWorld(lon, lat, date)` | World unit vector for a tropical longitude/latitude (e.g. sign boundaries, Ascendant point). |
| `worldToEclipticOfDate(v, date)` | `{lon, lat, r}` tropical of date. |
| `vernalEquinoxDirection(date)` | World unit vector of 0° Aries of date. |
| `precessionSinceJ2000(date)` | Accumulated general precession in longitude since J2000, degrees (IAU 2006 p_A). Positive after 2000, about -27.8 at 1 CE, +14.0 at 3000. Unwrapped. |
| `equinoxConstellation(date)` | `{symbol, name, ra, dec}`: IAU constellation containing 0° Aries ("Age of Pisces"). In Aries until ~68 BCE, Pisces until ~2597 CE, then Aquarius. |
| `constellationOfWorld(v)` | `{symbol, name}` for any world direction. |

### Sky state (`sky.js`)

**`getSkyState(date)`** → (throws `RangeError` outside `DATE_RANGE.supported`; ~1-3 ms)

```js
{
  date, jdUt, jdTt,
  support,                    // dateSupport(date)
  obliquity: {mean, true},    // degrees
  precession,                 // precessionSinceJ2000, degrees
  earthHelio: {x,y,z},        // Earth centre, heliocentric, world frame, AU
  order: BODY_IDS,
  bodies: {
    sun: {
      id, name, glyph,
      longitude, latitude,    // tropical apparent, true ecliptic & equinox of date, degrees
      distance,               // apparent geocentric distance, AU
      signIndex, sign, degreeInSign,
      speed,                  // longitude speed, deg/day (central difference, ±1 h)
      retrograde,             // speed < 0
      helio: {x,y,z},         // heliocentric, world frame, AU (Sun = origin)
      geo: {x,y,z},           // geocentric, world frame, AU, GEOMETRIC (= helio - earthHelio)
      ra, dec,                // apparent J2000 RA/Dec, degrees
      constellation: {symbol, name},  // IAU constellation the body is in front of
      approximate,            // true for Pluto outside ~0-4000 CE (extension table)
    },
    moon: {...}, mercury: {...}, ...
  },
  nodes: {meanNorth, trueNorth, meanSouth, trueSouth},  // tropical longitudes
  moonPhase: {elongation, name, illumination, waxing},  // elongation = Moon - Sun longitude (0-360); illumination 0..1
}
```

Notes:
- `geo`/`helio` are geometric so the orrery and Earth views agree exactly. The apparent
  `longitude` differs from the direction of `geo` by aberration and light-time (up to ~0.016°,
  largest for Mercury and Venus; under 1 arcminute).
- `constellation` can be a non-zodiac constellation (Cetus, Orion, Ophiuchus, Sextans...)
  because planets wander off the ecliptic and the IAU boundaries are irregular.
- The true node is the osculating ascending node of the Moon's geocentric orbit; the mean node
  is Meeus 47.7 plus nutation. Both match Swiss Ephemeris (true node within 30").

Other exports:

| Export | Description |
| --- | --- |
| `bodyLongitude(id, date)` | Fast single body: `{longitude, latitude, distance, speed, retrograde}`. |
| `signOf(longitude)` | `{longitude, signIndex, sign, degreeInSign}`. |
| `formatLongitude(lon, {glyph=false, seconds=false})` | `"9°51' Capricorn"`, `"9°51' ♑"`; minutes truncated (astrological convention). |
| `meanNodeLongitude(date)`, `trueNodeLongitude(date)` | Tropical longitude of the lunar north node. |
| `moonPhaseFromElongation(elong, illumination?)` | `{elongation, name, illumination, waxing}`. |

### Observer, angles and houses (`local.js`)

| Export | Description |
| --- | --- |
| `localSiderealTime(date, lon)` | Local apparent sidereal time, **hours** [0,24). |
| `localAngles(date, lat, lon)` | `{lst, ramc, obliquity, asc, dsc, mc, ic}`; angles are tropical longitudes. `ramc` = LST × 15. |
| `anglesFromRamc(ramc, lat, eps)` | The pure geometry behind it. Asc = ecliptic ∩ horizon on the **eastern** side; MC = ecliptic ∩ upper meridian (conventional; above the horizon everywhere outside the polar circles). |
| `wholeSignCusps(asc)` | 12 cusps, cusp 1 = 0° of the Ascendant's sign. |
| `placidusCusps(ramc, lat, eps)` | 12 cusps (index 0 = cusp 1) or **`null`** when \|lat\| ≥ 90° - obliquity (~66.56°). |
| `houseCusps(date, lat, lon, system='whole')` | `{system, cusps}`; `'placidus'` may return `null`. |
| `houseOf(longitude, cusps)` | House number 1-12. |
| `horizonBasis(date, lat, lon)` | `{zenith, north, east, observer}`: world-frame unit vectors (east × north = zenith), plus `observer`, the observer's geocentric position in AU (Earth equatorial radius), for topocentric corrections (only the Moon needs it: up to ~1°). |
| `altAz(worldDir, basis, {refraction=false})` | `{alt, az}` degrees, azimuth from north through east. Geometric unless `refraction: true`. Pass `body.geo` for the sky view (or `geo - basis.observer` for a topocentric Moon). |
| `altAzToWorld(alt, az, basis)` | Inverse: world unit vector. Handy for drawing the horizon ring and compass points. |

The horizon plane through the observer is spanned by `north` and `east`; the ecliptic of date is
the plane perpendicular to `signRingMatrix(date)` applied to (0,0,1).

### Aspects (`aspects.js`)

| Export | Description |
| --- | --- |
| `getAspects(sky, angles=null, options)` | Aspects among the 10 bodies, plus Ascendant/MC if `angles` (`{asc, mc}`, e.g. from `localAngles`) is given. |
| `findAspects(points, options)` | Generic: points are `[{id, name, longitude, speed, kind: 'body'\|'angle', luminary}]`. |
| `aspectPoints(sky, angles)` | Builds those points. Angles get speed 0 (treated as fixed). |

`options`: `{orbs: {conjunction, sextile, square, trine, opposition}, luminaryBonus = 2, aspects = ASPECTS}`.
Result (sorted by orb): `[{a, b, aspect, name, glyph, angle, separation, orb, maxOrb, applying}]`.
`separation` is the real angular distance [0,180]; `orb` = |separation - angle|; `applying`:
`true` if the orb is shrinking, `false` if growing, `null` if both points are fixed. Each pair
gets at most one aspect; angle-to-angle pairs are skipped.

### Event finder (`events.js`)

All take `{direction = 1 | -1, limitDays}` and return the first event strictly after (before)
`date`, or `null`. Time accuracy ~1 s numerically (true accuracy limited by the ephemeris:
seconds for the Sun and Moon, minutes for slow conjunctions and stations). Typical run time
0.2-35 ms.

| Export | Returns |
| --- | --- |
| `findAspect(bodyA, bodyB, angle, date, opts)` | `{date, bodyA, bodyB, angle, longitudeA, longitudeB}`. Both waxing and waning forms for angles other than 0/180. Default limit 600 years. |
| `findStation(body, date, opts)` | `{date, body, type: 'retrograde'\|'direct', longitude}`. Throws for Sun/Moon. Default limit 3 years. |
| `findIngress(body, date, {signIndex, ...})` | `{date, body, signIndex, sign, fromSignIndex, longitude, retrograde}`. Counts retrograde re-entries; `signIndex` restricts to entries into one sign. |
| `findMoonPhase(phase, date, opts)` | `phase`: `'new'\|'firstQuarter'\|'full'\|'lastQuarter'` or an elongation in degrees. `{date, phase, elongation}`. |
| `seasons(year)` | `{marchEquinox, juneSolstice, septemberEquinox, decemberSolstice}` (Dates). |

### Time zones (`tz.js`)

Historical IANA rules come from the runtime's `Intl` (ICU tzdb, which every modern browser and
Node ship). No library.

| Export | Description |
| --- | --- |
| `localToUtc(local, tz, {disambiguation='compatible', lon})` | `local = {year, month, day, hour, minute, second}`. Returns `{date, offsetMinutes, offsetLabel, status: 'ok'\|'ambiguous'\|'skipped', alternatives, wallClock, isLocalMeanTime}`. |
| `utcToLocal(date, tz, {lon})` | `{year, month, day, hour, minute, second, offsetMinutes}`. |
| `zoneOffsetMinutes(tz, date, lon?)` | Offset at a UTC instant, minutes east of UTC (fractional for LMT). |
| `formatOffset(minutes)` | `'UTC+07:30'`, `'UTC-04:56:02'`. |
| `isValidTimeZone(tz)` | Boolean. |

- `tz` may be an IANA id, `'UTC'`, or `'LMT'` (local mean time from `lon`: offset = lon/15 h).
- **Ambiguous** (clocks went back, the time happened twice): `'compatible'`/`'earlier'` use the
  first occurrence, `'later'` the second. `alternatives` lists both.
- **Skipped** (clocks jumped forward): `'compatible'`/`'later'` push forward by the gap
  (02:30 → 03:30); `'earlier'` goes back (→ 01:30). `wallClock` shows the resulting clock
  reading and `offsetMinutes` the offset actually in force then.
- `isLocalMeanTime` is true when the zone's rule is a pre-standard-time LMT entry (offset not a
  whole minute). That LMT belongs to the zone's main city; for another town the UI could offer
  `tz: 'LMT'` instead.

### Birth charts and share links (`chart.js`)

`ChartInput`: `{name, year, month, day, hour, minute, timeKnown, place: {name, lat, lon, tz}}`.

| Export | Description |
| --- | --- |
| `buildChart(input, {houseSystem='whole', nodeType='true', orbs, disambiguation})` | Chart object (below). Throws `Error` listing validation problems, `RangeError` for unsupported dates. ~1-5 ms. |
| `validateChartInput(input)` | Array of human-readable problems (empty = valid). |
| `encodeChartInput(input)` | Compact URL-hash-safe string. |
| `decodeChartInput(str)` | `ChartInput` (leading `#` ignored). Throws `Error('Invalid chart link: ...')`. |
| `SHARE_VERSION` | `1`. |

Chart object:

```js
{
  input, utc: Date, offsetMinutes, offsetLabel, tzStatus, tzAlternatives, timeKnown,
  sky,                         // getSkyState(utc)
  angles,                      // localAngles(...) or null if time unknown
  houses: {system, requested, cusps} | null,   // falls back to 'whole' if Placidus undefined
  placements: [{               // 10 bodies, then northNode, then asc and mc (if time known)
    id, name, glyph, kind: 'body'|'point'|'angle',
    longitude, signIndex, sign, degreeInSign, formatted, element, modality,
    house (1-12 | null), retrograde, speed, constellation,
  }],
  aspects,                     // getAspects(sky, angles, {orbs})
  tallies: {elements: {fire, earth, air, water}, modalities: {cardinal, fixed, mutable}},  // over the 10 bodies
  moonRange: {start, end} | null,  // Moon longitude at local 00:00 and 23:59 when time unknown
  notes: string[],             // DST problems, LMT, unknown time, Placidus fallback, date caveats
}
```

Unknown birth time uses local noon and omits angles, houses and angle aspects.

Share format v1 (`~`-separated; text fields `encodeURIComponent`-escaped, `~` escaped too):

```
1~<name>~<Y>.<M>.<D>~<H>.<MM or empty if unknown>~<lat>~<lon>~<tz>~<place name>
1~Apollo%2011%20launch~1969.7.16~9.32~28.573~-80.649~America%2FNew_York~Kennedy%20Space%20Center
```

Put it in `location.hash`; the hash never reaches the server. Bump the leading version if the
format changes and keep decoding old versions.

### Place search (`places.js`)

| Export | Description |
| --- | --- |
| `searchPlaces(query, limit=10)` | **Async.** Lazy-fetches `data/cities.json` once (~1.7 MB, ~0.8 MB gzipped), then 1-5 ms per query. |
| `loadPlaceIndex()` | Promise of the index (call early to prefetch). |
| `setPlacesUrl(url)` | Override the URL (default `import.meta.env.BASE_URL + 'data/cities.json'`). |
| `createPlaceIndex(json)` | Synchronous index from parsed JSON: `{size, search(query, limit)}`. |
| `normalizeName(s)` | `'São Paulo'` → `'sao paulo'`. |

Results: `[{name, asciiName, label, country, countryCode, admin1, lat, lon, tz, population}]`,
`label` like `"Paris, Texas, United States"`. Matching is accent- and case-insensitive on the
name and ASCII name: exact > prefix > word-prefix > substring, blended with log population (so
"mexico" finds Mexico City first). A qualifier after a comma filters by country code, country
name or region (full names): `"paris, texas"`, `"london, canada"`, `"paris, fr"`. No alternate/English exonyms (search "Köln" or
"koln", not "Cologne"); cities with population ≥ 15,000 only.

### Stars and constellations (`stars.js`)

| Export | Description |
| --- | --- |
| `loadSkyData(baseUrl?)` | Promise `{stars, constellations}` (fetches `data/stars.json` + `data/constellations.json`). |
| `parseStarCatalog(json)` | `{count, positions: Float32Array(3n), magnitudes, bv (NaN if unknown), ra, dec: Float32Array(n), names: [{index, name, designation}]}`. Unit vectors in the world frame, **brightest first** (so `drawRange` can cut by magnitude). 5044 stars to mag 6; 304 proper names (mag ≤ 4). |
| `parseConstellations(json)` | 88 × `{id, name, english, rank (1-3), zodiac, ecliptic, label: {x,y,z}, lines: Float32Array, bounds: Float32Array}`. `lines` and `bounds` are segment pairs (xyz xyz ...) ready for `THREE.LineSegments`; boundary edges are subdivided to ≤ 1°. `ecliptic` flags the 13 (12 zodiac + Ophiuchus). |
| `bvToRgb(bv)` | Approximate star colour `{r, g, b}` 0..1. |

Stars are fixed at J2000 (no proper motion: < 1.5° for any naked-eye star over 3000 years).

---

## Date range

Measured against JPL Horizons (DE441) apparent ecliptic-of-date longitudes in Terrestrial Time
(fixtures in `test/fixtures/`):

| Tier (`dateSupport().level`) | Years | Worst error seen |
| --- | --- | --- |
| `accurate` | 1000 to 3000 CE | ≤ 0.05° for all bodies; 1700-2150 within 0.01° (Moon 0.04°) |
| `good` | 1000 BCE to 4000 CE | planets ≤ 0.26°, Pluto 0.58°, Moon 0.55° |
| `approximate` | 3000 BCE to 6000 CE | planets ≤ 0.56°, Pluto 0.70°, Moon 1.8° |
| `unsupported` | outside | `getSkyState` throws `RangeError`; use `clampDate` |

Additionally, the Earth's rotation (Delta T) is poorly known before ~1600 (hours of uncertainty
by 1000 BCE), so for a given *clock time* the Moon (~0.5°/h) and especially the Ascendant and
houses (~15°/h) are uncertain. Planet positions in time are unaffected. `dateSupport().notes`
carries user-facing wording for all of this.

**Pluto.** astronomy-engine's fast Pluto table covers ~1 CE to ~4000 CE. Outside it the library
integrates on every call (0.2-1 s each), far too slow for a scrubber. `scripts/build-pluto.mjs`
runs that integration once with astronomy-engine's `GravitySimulator` and stores positions every
1460 days (`src/astro/data/pluto-extended.js`, 34 KB) covering ~3010 BCE to ~6010 CE; the
engine interpolates it (cubic, < 1" interpolation error). Such bodies carry `approximate: true`.

**Calendar.** All dates are proleptic Gregorian. Historical dates before 1582 are usually
quoted in the Julian calendar (e.g. 15 March 44 BCE Julian = 13 March proleptic Gregorian); the
UI must convert if it accepts historical Julian dates.

## Verification

`npm test` runs 170 tests (9 files): 113 engine tests plus 57 scene-layout tests
(`test/layout.test.js`, see [Scene and UI](#scene-and-ui)). Engine highlights:

- **Ephemeris**: all 10 bodies vs JPL Horizons at 1700, 1850, 2000, 2020, 2075, 2150 (UT) and
  at 15 dates from 3000 BCE to 6000 CE (TT), with the tier tolerances above.
- **Angles**: ~1,600 combinations of 11 latitudes (-55° to 66°), 6 longitudes, 5 dates and
  hours: the Ascendant point has altitude 0 in the east and the MC is on the meridian above the
  horizon, both checked with astronomy-engine's independent `Horizon()`; at geometric sunrise
  the Sun's longitude equals the Ascendant (< 0.01°).
- **Swiss Ephemeris 2.10** (8 cases incl. the Apollo 11 launch): RAMC, Ascendant, MC and all
  12 Placidus cusps within 1" (actually ~0.1"), mean node within 1", true node within 60".
- Placidus invariants, polar `null`; time zones (Kuala Lumpur 1981/1982, London 1970 BST,
  New York gap/overlap, LMT); stations (Mercury and Mars vs Swiss Ephemeris), the 2020 great
  conjunction (vs Horizons: 18:20:37 UT, engine within 6 min), ingresses, lunar phases,
  equinox Sun within 1" of 0° Aries; precession (0° Aries in Aries/Pisces border crossing
  ~68 BCE, Pisces today, Aquarius ~2600); share-link round trips; place search; star data.

## Data

| File | Raw | Gzipped | Source |
| --- | --- | --- | --- |
| `public/data/cities.json` | 1.7 MB | 0.77 MB | GeoNames `cities15000` (34,153 places) |
| `public/data/stars.json` | 140 KB | 60 KB | d3-celestial `stars.6.json` + `starnames.json` |
| `public/data/constellations.json` | 49 KB | 16 KB | d3-celestial lines, bounds, names |
| `src/astro/data/pluto-extended.js` | 34 KB | (in bundle) | generated from astronomy-engine |

Regenerate with `npm run data:cities`, `npm run data:stars`, `npm run data:pluto`. The first two
download into a fresh temp directory outside the repo (or take a directory of already-downloaded
files as an argument) and only parse the files as data.

The engine bundle (engine + astronomy-engine, no three.js) is ~103 KB minified, ~47 KB gzipped.

## Scene and UI

`index.html` + `src/main.js` build the experience: three linked 3D views (Sun-centred `helio`,
Earth-centred `geo`, standing-on-Earth `sky`) that are **one scene** with a smooth morph between
them, a time dial, the zodiac ring with sight lines, info cards, a chart wheel, and a
declarative scene-directive system for the tour.

### Files

| File | Role |
| --- | --- |
| `src/main.js` | Entry: fonts, store, sky cache, world, UI, main loop; exposes `window.zodiac` (the app hooks). |
| `src/state.js` | The single store (`createStore`, `initialState`, toggle helpers, saved location). |
| `src/ids.js` | The one place engine ids meet content ids: `asc`/`mc` <-> `ascendant`/`midheaven`, `whole` <-> `wholeSign`. |
| `src/skyframe.js` | Per-frame sky cache: `getSkyState`, angles, houses, aspects, horizon basis, apparent directions. Recomputed only when date, place or house system change; shared by scene, wheel and panels. |
| `src/scene/layout.js` | Pure layout math (the honesty scheme below). Unit-tested. |
| `src/scene/world.js` | Renderer, bloom, cameras (orbit + sky look), view morph, per-frame layout, picking. |
| `src/scene/ring.js` | Zodiac ring (flat ring and sky band), exact ticks, houses, sight lines, ring markers, angles, aspect chords. |
| `src/scene/bodies.js` | Sun, Moon (true phase lighting), planets, Saturn's rings, Earth globe with axis and location pin. |
| `src/scene/paths.js` | Orbits and geocentric trails (the vertex shader applies the same layout as the bodies). |
| `src/scene/starfield.js` | Stars (magnitude size, B-V colour, twinkle), Milky Way, constellations, ecliptic-constellation shell. |
| `src/scene/skydome.js` | Ground, horizon, compass points, meridian, daylight, horizon plane, celestial equator. |
| `src/scene/labels.js` | DOM labels pinned to 3D points (crisp text and glyphs). |
| `src/scene/applyScene.js` | The tour's `scene` directive vocabulary. |
| `src/scene/checks.js` | The tour's `task.check` evaluators. |
| `src/scene/events.js` | Named events for `{event}` dates and the "Jump to" menu. |
| `src/ui/*.js` | Top bar, controls, info panel (cards), chart wheel (SVG), time dial, place picker, compass. |
| `src/ui/tour.js` | The guided tour player (below). |
| `src/ui/birthform.js` | The birth-chart form (modal). |
| `src/ui/chartmode.js` | "Your chart" mode: placements, aspects, balance, transits ring, saved charts, share link. |
| `src/ui/welcome.js` | First-visit choice: take the tour or explore freely. |
| `src/ui/persist.js` | localStorage helpers and the tour's task gate (pure, unit-tested in `test/persist.test.js`). |

### The honesty rule and the layout scheme

Every astrological claim here is about *direction as seen from Earth*, so direction from
Earth is exact everywhere; distance is negotiable.

- **One world frame**: J2000 ecliptic, z-up (the engine's frame). All astronomy lives in one
  `THREE.Group` rotated -90° about x, so three.js sees (x, y, z)ecl -> (x, z, -y)
  (`layout.eclToThree` is the same map for cameras and labels). Stars never move in it.
- **Every body** is placed at `P = E + u * r`: `E` is Earth's scene position, `u` the body's
  **apparent** direction (its tropical lon/lat rotated by `signRingMatrix(date)`), and `r >= 0`
  a display distance. Whatever `r` is, the direction from Earth is exact, and it is the same
  direction the readouts print. (`geo` differs from it by aberration and light-time, < 1'.)
- **The zodiac ring** is always centred on Earth and oriented by `signRingMatrix(date)`, so
  precession slides it against the stars. Ticks are real geometry at exact degrees. A sight
  line is drawn in the ring's frame from the centre along (lon, lat) to the ring radius, then
  dropped perpendicular to the ring plane: its foot is exactly at the body's longitude. Bodies
  beyond the ring extend the line through it; their marker still sits on the ring.
- **The morph** is three blend parameters plus a scale (`world.p`): `a` frame anchor (0 = Sun
  at the origin, 1 = Earth at the origin), `c` compression (0 = true distance, 1 = schematic),
  `s` sky flattening (1 = everything on a dome around Earth), `R` ring radius. With
  `c = s = 0`, `P = (helio - a * earthHelio) * AU`: the true solar system in a frame sliding
  from the Sun to Earth, so the camera target (the origin) glides from Sun to Earth. helio ->
  geo animates `a` (1.15 s: Earth's orbit shrinks while the Sun's yearly path grows around
  Earth; planet orbits slide rigidly and fade), then `c` (0.85 s: distances relax into the
  schematic layout). geo -> sky animates `s` and flies the camera into Earth's centre. The
  reverse runs the stages backwards. Easing is cubic in-out; reduced motion shortens it.
- **Schematic distances** (`compressedRadius`): `r = R (0.18 + B ln(1 + d / 0.3 AU))`, with B
  chosen so 50 AU lands at 0.9 R. Monotonic, so the true order of distances and the retrograde
  loops in the trails survive (loops are flatter than at true distance; switch "Schematic
  distances" off to see them full size). Radial about Earth, so directions are untouched.
- **Helio view**: true scale in AU, the ring centred on Earth with radius by zoom (`earthSun`
  2.2 AU, `inner` 3.1 AU, `outer` 52 AU). Body sizes are enlarged markers (the UI says so),
  capped so they never swallow neighbouring orbits. The Moon is pushed radially out from Earth
  to stay visible (direction kept).
- **Sky view**: camera at Earth's centre, up = `horizonBasis` zenith, mouse-look and a compass.
  The ring becomes a band on the celestial sphere; the Ascendant and Midheaven are ring points,
  so they sit exactly on the eastern horizon and the meridian (verified in
  `test/layout.test.js`). Geocentric throughout, like charts; the Moon's topocentric parallax
  (< 1°) is not applied.
- **Constellations in the outside views**: stars are at infinity, so from an outside camera
  they are not the stars behind each sign as seen from Earth. The 13 ecliptic constellations
  are therefore also drawn on a shell of radius 1.38 R centred on Earth (a radial projection,
  like an armillary's star band); in the sky view the real sky takes over.

`test/layout.test.js` checks, for dates from 2500 BCE to 5500 CE and many morph states: the
direction from Earth to every body equals its apparent direction to 1e-9°; sight-line feet read
back as the exact tropical longitude; Jupiter and Saturn share 0° Aquarius at the 2020 great
conjunction while ~4.9 AU apart; the Ascendant point has altitude 0 on the eastern side and the
MC azimuth 0/180, at four latitudes.

### Store fields (`src/state.js`)

`date` (Date), `rate` (sky days per real second, 0 = paused), `lastRate`, `view`
(`helio|geo|sky`), `zoom` (`earthSun|inner|outer`), `location` `{name, lat, lon, tz}`,
`houseSystem` (`wholeSign|placidus`), `bodies` (visible ids incl. `earth`, `ascendant`,
`midheaven`), `toggles` (`ring, signLabels, constellations, sightLines, aspects, trails,
orbits, horizon, houses, wheel, earthAxis, meridian`; each `true/false` or a list of body ids),
`compression`, `daylight`, `focus`, `highlight` `{signs, bodies, aspect}`, `selection` and
`hover` (`{kind: 'body'|'sign'|'house'|'aspect'|'term'|'explainer', id}`; shared by the 3D
scene, wheel and panel), `chart` (null or `buildChart` output), `chartInput`, `stopAt`,
`birthMissing`, `mode` (`explore|tour|chart`), `panelOpen`, `wheelExpanded`, `cameraRequest`.

`store.patch(partial)`, `store.subscribe(fn, keys?)`, `store.setToggle(key, value)`,
`store.on(type, fn)` / `store.emit(type, payload)`. Events: `click` `{kind, id, source}` for
bodies, ring tokens, sign slices, houses and aspects (from the 3D scene, wheel or panel);
`stopped` when `stopAt` halts playback; `mode` when a mode button is pressed; `chart`.

### Hooks for the tour player and the birth form (`window.zodiac`)

| Hook | Use |
| --- | --- |
| `zodiac.applyScene(scene)` | Apply a tour step's `scene`. Returns `{scene, date, event, birthMissing, errors}`. Synchronous (event searches take < 40 ms). |
| `zodiac.checks.reset()` | Call at the start of each step so `clicked` checks only count new clicks. |
| `zodiac.check(task.check)` | Boolean. Poll it each frame (or from `store.subscribe`) to unlock Next. Some checks can already be true when a step starts (e.g. `risingSign` at some hours); the player decides whether that counts. |
| `zodiac.setChart(input)` | Birth-form submit. `input` is an engine `ChartInput`. Builds the chart (throws the engine's validation `Error`), sets `state.chart`, jumps date and place there, writes `#c=<encodeChartInput(input)>`. |
| `zodiac.clearChart()` | Clears the chart and the hash. |
| `zodiac.store` | The store (above). `state.mode` is `explore`, `tour` or `chart`; the `mode` event fires on every switch. |
| `zodiac.tour` | `enter({at})`, `leave()`, `goTo(i)`, `index`: the tour player (handy for testing a step). |
| `zodiac.charts` | `enter()`, `leave()`, `openForm({edit})`, `copyLink()`: Your chart mode. |
| `zodiac.getFrame()` | The shared sky frame (positions, angles, houses, aspects, rising sign). |

`#c=` links are decoded on load and on `hashchange`; the UI then opens Your chart and offers to
save the chart if it is not saved yet.

### Scene directive vocabulary (`src/scene/applyScene.js`)

As used in `src/content/tour.js`, merged with `sceneDefaults` (omitted `show` keys are false):
`view`, `zoom` (omitted: `inner`), `date` (`'now'`, `'birth'`, an ISO string, or `{event}`:
`marchEquinox`, `greatConjunction2020`, `nextMarsRetrograde`, `nextFullMoon`, `nextNewMoon`,
`nextMercuryRetrograde`, plus `juneSolstice`, `septemberEquinox`, `decemberSolstice`,
`nextSeason`/`prevSeason`, `prev...` variants, `{event: 'nextIngress', body}` and
`{event: 'nextAspect', a, b, aspect}`), `rate`, `location` (`'birth'`, `'user'` = the saved
place, or `{name, lat, lon, tz?}`), `bodies`, `show`, `focus`, `highlight`.

**Additions** requested by the content author:

- `camera: {preset: 'top' | 'tilt' | 'edge' | 'default'}`: animated; distances are in units of
  the ring radius, so a preset given together with a view or zoom change lands at the right
  scale.
- `stopAt`: ISO string or `'now'`; playback halts exactly there and `stopped` is emitted.
- `show.meridian`: the north-zenith-south line in the sky view.
- `houseSystem: 'wholeSign' | 'placidus'` (Placidus falls back to Whole Sign inside the polar
  circles, and the UI says so).
- `'birth'` without a chart: falls back to the current moment and the saved place, sets
  `state.birthMissing = true` and returns `birthMissing: true` so the tour UI can show a hint.

Retrograde events land a couple of weeks before the station (Mercury 14 d, Mars 21 d).
Check types: `bodyInSign`, `aspect` (within `orb`, default 3°), `view`, `clicked` (bodies,
sign slices, houses, aspects), `retrograde`, `risingSign`, plus `birthEntered`.

### Tour, birth form and Your chart

- **Landing**: a `#c=` link opens Your chart. Otherwise a tour left open resumes at its step,
  and a first-time visitor gets a welcome overlay (Take the tour / Explore freely; remembered).
- **Tour** (`#modePanel`, replacing the info panel): chapter list and a 40-segment progress bar,
  step text with glossary popovers, Tell me more (`deeper`), Look for, Back / Next (keyboard
  ← →; with the tour open these change step instead of stepping time, except on the time
  dial's jog track), Reset this step, and × to leave (the step is remembered). Each step calls
  `checks.reset()` then `applyScene(step.scene)`; the user can still change anything. Big date
  or zoom jumps dip the scene to dark for ~0.2 s; view changes never do, so the helio -> geo
  morph always plays in full.
- **Tasks** (`createTaskGate` in `persist.js`): `clicked` counts the first click after the step
  starts; `view` only counts a view switch made by the user, never the scene's own; every
  other check must be seen false after the step starts and then become true (if it already
  holds, the task says so and asks the user to let time bring it round again). Next is always
  available (it reads Skip while a task is pending). Done tasks are remembered.
- **Cards during a mode** slide over the mode panel with a "Back to the tour / your chart" button.
- **Birth form**: name, date (day / month / year), time or "I don't know", place search
  (debounced, ↑ ↓ Enter Esc, GeoNames credit) with a manual latitude / longitude / IANA zone
  (or `LMT`) fallback, and a live "UTC+hh:mm at that date" line with DST-gap and LMT warnings.
  From the tour it fills in the birth steps; elsewhere it opens Your chart.
- **Your chart**: date, place and view locked to the birth moment (a bar offers to return if
  you wander off), wheel enlarged, big three, placements (sign, degree, house, ℞) and aspects as
  buttons that open their cards, element / mode balance, a "today's sky" outer ring on the
  wheel (`state.transits`), saved charts (add, rename, delete, switch) and Copy link. Unknown
  birth time: no Ascendant, Midheaven or houses anywhere (the wheel draws 0° Aries on the left),
  and the panel says why and whether the Moon's sign is certain. "Return to now" leaves the
  mode, restores the present and the saved place, and drops the `#c=` hash.
- **Storage** (browser only): `zodiac.welcome`, `zodiac.tour` (step, done tasks, seen steps),
  `zodiac.charts` and `zodiac.activeChart`, plus `zodiac.location`. Never commit real birth data;
  tests use fictional inputs.

### UI notes

- Glyphs carry U+FE0E and use Noto Sans Symbols (signs, planets, aspects) plus a 1 KB subset of
  Noto Sans Symbols 2 (☉ □ △) in `src/fonts/` (SIL OFL). ⊕ and ℞ are in neither and fall back to
  system fonts. Ring glyphs are drawn into a canvas texture after the fonts have loaded.
- Keyboard: space play/pause, ←/→ step by the current unit (shift ×10), ↑/↓ change the unit,
  1/2/3 views, `?` explainer, N now, Esc closes popovers, then the wheel, then the card.
- Reduced motion: morphs and camera moves shorten to ~25 %, no twinkle, no ring sheen.
- Trails pause above 120 days/s (they would need thousands of samples per frame).
- Performance (Apple M5, 1600×1000, pixel ratio capped at 2, everything on): 60 fps in all
  three views, `world.update` 0.6–0.9 ms of CPU per frame.

## Credits and licences

- **Fonts**: Cinzel, EB Garamond, IM Fell English SC and Noto Sans Symbols (via @fontsource),
  and a subset of Noto Sans Symbols 2 (`src/fonts/`), all SIL Open Font License.
- **three.js**, MIT licence.

- **astronomy-engine** by Don Cross, MIT licence: https://github.com/cosinekitty/astronomy
- **GeoNames** city data, CC BY 4.0: https://www.geonames.org/ (attribution required: keep a
  visible "Place data © GeoNames" credit in the UI).
- **d3-celestial** star, star-name and constellation data by Olaf Frohn, BSD-3-Clause:
  https://github.com/ofrohn/d3-celestial (see that project for its upstream catalogue sources).
- Reference values used only in tests: NASA/JPL Horizons (https://ssd.jpl.nasa.gov/horizons/),
  Swiss Ephemeris 2.10 by Astrodienst (via pyswisseph, run offline, not shipped).
