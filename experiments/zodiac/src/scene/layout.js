// Layout: where things go in the scene. Pure math, no three.js, unit-tested in
// test/layout.test.js.
//
// THE HONESTY RULE. Astrological claims are about *directions as seen from Earth*. So:
//   * There is one world frame (J2000 ecliptic, z-up, the engine's frame), scaled to scene
//     units. Every body is placed at   P = E + u * r   where E is Earth's scene position,
//     u = unit(geo) is the body's true geocentric direction and r >= 0 is a display distance.
//     Whatever r is (true, compressed, flattened onto the sky dome), the direction from Earth
//     is exact. Distance is negotiable; direction is not.
//   * The zodiac ring is always centred on Earth (E) and oriented by signRingMatrix(date)
//     (true ecliptic and equinox of date -> world). A point at tropical longitude L on the ring
//     is R * (cos L, sin L, 0) in the ring's own frame. Sight lines are drawn in that frame from
//     the centre along the body's apparent (lon, lat) and dropped perpendicular to the ring
//     plane, so they land on the ring at exactly the longitude the readouts print.
//
// The view morph is three blend parameters plus a scale:
//   a  frame anchor: 0 = Sun fixed at the origin (helio), 1 = Earth fixed at the origin (geo/sky)
//   c  distance compression: 0 = true distance, 1 = schematic nested distances (about Earth)
//   s  sky flattening: 1 = every body on a dome of radius ~R around Earth (sky view)
//   R  ring radius in scene units (frames the view; the camera distance follows it)
// With c = s = 0, P = earthHelio*(1-a)*AU + geo*AU = (helio - a*earthHelio)*AU: the true
// solar system seen from a frame sliding from the Sun (a = 0) to Earth (a = 1).

/** Scene units per astronomical unit at true scale. */
export const AU = 10;

/** Ring radius presets, in AU (multiplied by AU for scene units). */
export const RING_AU = {
  helio: { earthSun: 2.2, inner: 3.1, outer: 52 },
  geoTrue: { earthSun: 1.6, inner: 3.0, outer: 52 },
  geoCompressed: 3.0,
  sky: 3.0,
};

export function ringRadiusFor(view, zoom, compression) {
  if (view === 'helio') return RING_AU.helio[zoom] * AU;
  if (view === 'sky') return RING_AU.sky * AU;
  return (compression ? RING_AU.geoCompressed : RING_AU.geoTrue[zoom]) * AU;
}

// Schematic distance: r = R * (M0 + B ln(1 + d / D0)). Monotonic, so the true order of
// distances is kept (Moon < Sun ~ inner planets < Jupiter < Saturn < Uranus < Neptune ~ Pluto)
// and retrograde loops survive in the trails, but everything out to 50 AU fits inside 0.9 R.
export const COMPRESS = { M0: 0.18, D0: 0.3, B: 0.72 / Math.log(1 + 50 / 0.3) };

export function compressedRadius(d, R) {
  return R * (COMPRESS.M0 + COMPRESS.B * Math.log(1 + d / COMPRESS.D0));
}

/** Radius of the sky dome bodies sit on in the sky view, as a fraction of R. */
export const SKY_DOME = { body: 0.9, moon: 0.86 };

/**
 * Display distance from Earth for a body at true geocentric distance d (AU).
 * minR: lower bound (scene units) on the true-scale distance; used for the Moon, which would
 * otherwise sit inside Earth's enlarged marker. Radial about Earth, so still honest.
 */
export function displayRadius(d, p, minR = 0, domeFrac = SKY_DOME.body) {
  const rTrue = Math.max(d * AU, minR);
  const rComp = compressedRadius(d, p.R);
  const r = rTrue + (rComp - rTrue) * p.c;
  return r + (domeFrac * p.R - r) * p.s;
}

/** Earth's scene position for frame anchor a. */
export function earthPosition(earthHelio, p, out = {}) {
  const k = AU * (1 - p.a);
  out.x = earthHelio.x * k; out.y = earthHelio.y * k; out.z = earthHelio.z * k;
  return out;
}

/**
 * Scene position (world frame, scene units) of a body seen from Earth along the unit direction
 * `dir` at true distance `dist` (AU). The app passes the body's APPARENT direction (its tropical
 * lon/lat rotated by signRingMatrix), so body, sight line and degree readout agree exactly.
 * (The geometric `geo` vector differs from it by aberration and light-time: < 0.02 deg.)
 */
export function bodyPosition(dir, dist, earthHelio, p, opts = {}, out = {}) {
  const r = displayRadius(dist, p, opts.minR ?? 0, opts.dome ?? SKY_DOME.body);
  const k = AU * (1 - p.a);
  out.x = earthHelio.x * k + dir.x * r;
  out.y = earthHelio.y * k + dir.y * r;
  out.z = earthHelio.z * k + dir.z * r;
  return out;
}

/** Unit vector (world frame) of a tropical lon/lat, given signRingMatrix rows. */
export function apparentDirection(rows, lonDeg, latDeg, out = {}) {
  const L = lonDeg * Math.PI / 180, B = latDeg * Math.PI / 180;
  const v = { x: Math.cos(B) * Math.cos(L), y: Math.cos(B) * Math.sin(L), z: Math.sin(B) };
  const w = mulRows(rows, v);
  out.x = w.x; out.y = w.y; out.z = w.z;
  return out;
}

/**
 * Sight line in the RING frame (true ecliptic of date, centred on Earth): from the centre along
 * apparent (lon, lat) to the cylinder of radius rMid, then straight down to the ring plane.
 * Returns {tip: [x,y,z], foot: [x,y,z]}; foot is exactly at longitude `lon` on the ring.
 */
export function sightLine(lonDeg, latDeg, rMid) {
  const L = lonDeg * Math.PI / 180, B = latDeg * Math.PI / 180;
  const x = rMid * Math.cos(L), y = rMid * Math.sin(L);
  return { tip: [x, y, rMid * Math.tan(B)], foot: [x, y, 0] };
}

/** A point on the ring plane at tropical longitude lon and radius r (ring frame). */
export function ringPoint(lonDeg, r, out = [0, 0, 0]) {
  const L = lonDeg * Math.PI / 180;
  out[0] = r * Math.cos(L); out[1] = r * Math.sin(L); out[2] = 0;
  return out;
}

/** Multiply a row-major 3x3 (engine {rows}) by a vector. */
export function mulRows(rows, v) {
  return {
    x: rows[0][0] * v.x + rows[0][1] * v.y + rows[0][2] * v.z,
    y: rows[1][0] * v.x + rows[1][1] * v.y + rows[1][2] * v.z,
    z: rows[2][0] * v.x + rows[2][1] * v.y + rows[2][2] * v.z,
  };
}

/** World ecliptic (z-up) -> three.js (y-up): (x, y, z) -> (x, z, -y). The one conversion. */
export function eclToThree(v, out) {
  out.x = v.x; out.y = v.z; out.z = -v.y;
  return out;
}
/** three.js (y-up) -> world ecliptic (z-up). */
export function threeToEcl(v, out = {}) {
  out.x = v.x; out.y = -v.z; out.z = v.y;
  return out;
}

export const smoothstep = (t) => t * t * (3 - 2 * t);
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
