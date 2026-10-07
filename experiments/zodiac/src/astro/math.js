// Small angle, vector and 3x3 matrix helpers. Vectors are plain {x, y, z} objects
// (directly usable with THREE.Vector3.copy). Matrices are arrays of 3 rows.

export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

/** Normalise an angle in degrees to [0, 360). */
export function norm360(a) {
  const r = a % 360;
  return r < 0 ? r + 360 : r;
}

/** Normalise an angle in degrees to [-180, 180). */
export function wrap180(a) {
  const r = norm360(a);
  return r >= 180 ? r - 360 : r;
}

/** Unsigned angular separation of two longitudes, in [0, 180]. */
export function angularSeparation(a, b) {
  return Math.abs(wrap180(a - b));
}

export const vec = (x, y, z) => ({ x, y, z });
export const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const scale = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const length = (a) => Math.hypot(a.x, a.y, a.z);
export function normalize(a) {
  const l = length(a);
  return l > 0 ? scale(a, 1 / l) : { x: 0, y: 0, z: 0 };
}

/** Unit vector from spherical angles in degrees (lon measured in the xy plane from +x toward +y). */
export function fromSpherical(lonDeg, latDeg, r = 1) {
  const cl = Math.cos(latDeg * DEG);
  return { x: r * cl * Math.cos(lonDeg * DEG), y: r * cl * Math.sin(lonDeg * DEG), z: r * Math.sin(latDeg * DEG) };
}

/** Spherical angles in degrees from a vector: {lon in [0,360), lat, r}. */
export function toSpherical(v) {
  const r = length(v);
  const lon = norm360(Math.atan2(v.y, v.x) * RAD);
  const lat = r > 0 ? Math.asin(Math.max(-1, Math.min(1, v.z / r))) * RAD : 0;
  return { lon, lat, r };
}

/** Matrix (array of rows) times vector. */
export function mulMV(m, v) {
  return {
    x: m[0][0] * v.x + m[0][1] * v.y + m[0][2] * v.z,
    y: m[1][0] * v.x + m[1][1] * v.y + m[1][2] * v.z,
    z: m[2][0] * v.x + m[2][1] * v.y + m[2][2] * v.z,
  };
}

/** Matrix product a*b (apply b first, then a). */
export function mulMM(a, b) {
  const r = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      r[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
  return r;
}

export function transpose(m) {
  return [[m[0][0], m[1][0], m[2][0]], [m[0][1], m[1][1], m[2][1]], [m[0][2], m[1][2], m[2][2]]];
}

/** Convert an astronomy-engine RotationMatrix (rot[col][row]) into an array of rows. */
export function rowsFromAe(rm) {
  const r = rm.rot;
  return [[r[0][0], r[1][0], r[2][0]], [r[0][1], r[1][1], r[2][1]], [r[0][2], r[1][2], r[2][2]]];
}

/** Package a row matrix for consumers: rows plus a column-major flat array (THREE.Matrix3.fromArray). */
export function packMatrix(rows) {
  return {
    rows,
    columnMajor: [rows[0][0], rows[1][0], rows[2][0], rows[0][1], rows[1][1], rows[2][1], rows[0][2], rows[1][2], rows[2][2]],
  };
}

/** Bisection on a function of a number, assuming f(a) and f(b) differ in sign. */
export function bisect(f, a, b, fa, tol, maxIter = 80) {
  let lo = a, hi = b, flo = fa;
  for (let i = 0; i < maxIter && Math.abs(hi - lo) > tol; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (fm === 0) return mid;
    if ((fm < 0) === (flo < 0)) { lo = mid; flo = fm; } else { hi = mid; }
  }
  return (lo + hi) / 2;
}
