// Kinematics of one side of the engine: crank, connecting rod, crosshead and
// Walschaerts valve gear. Everything is solved in the 2D side plane (x forward,
// y up). Shared by the physics simulation and the 3D/2D visuals so the valve
// you see is exactly the valve the steam "feels".

export const G = {
  AX: 1.0, AY: 1.0,        // leading driving axle (main rod drives this one)
  R: 0.33,                 // crank radius (half stroke)
  L: 2.6,                  // connecting rod length
  PISTON_ROD: 0.95,        // crosshead pin -> piston centre
  E: 0.10,                 // return crank throw (from axle centre)
  DELTA: -Math.PI / 2,     // return crank angle relative to main crank
  P: { x: 2.55, y: 1.42 }, // expansion link trunnion
  LT: 0.36,                // link tail (eccentric rod pin) below trunnion
  SMAX: 0.26,              // max die block offset in the link
  YV: 1.47,                // valve spindle axis height
  XV0: 4.0,                // valve spindle crosshead mid position
  A: 0.10,                 // combination lever: valve pin -> radius rod pin
  B: 0.62,                 // combination lever: radius rod pin -> union link pin
  ARM: { dx: 0.06, y: 0.74 }, // crosshead drop arm pin (relative x, absolute y)
  // cylinder & valve geometry
  CYL_REAR: 4.1, CYL_FRONT: 5.0, BORE_R: 0.215,
  CHEST_C: 4.55, VALVE_H: 0.2, LAP: 0.045, PORT_W: 0.05, CAVITY_H: 0.105,
};

G.XC_MEAN = G.AX + G.L;
G.LE = Math.hypot(G.P.x - G.AX, (G.P.y - G.LT) - G.AY);
G.XC_MIN = G.AX - G.R + G.L;
G.XC_MAX = G.AX + G.R + G.L;
{
  const c1 = { x: G.XV0, y: G.YV - G.A };
  G.LR = Math.hypot(c1.x - G.P.x, c1.y - G.P.y);
  const c3 = { x: G.XV0, y: G.YV - G.A - G.B };
  G.LU = Math.hypot(c3.x - (G.XC_MEAN + G.ARM.dx), c3.y - G.ARM.y);
}

export function crosshead(phi) {
  const s = G.R * Math.sin(phi);
  return G.AX + G.R * Math.cos(phi) + Math.sqrt(G.L * G.L - s * s);
}

// d(crosshead x)/d(phi)
export function crossheadRate(phi) {
  const s = G.R * Math.sin(phi);
  const c = G.R * Math.cos(phi);
  return -G.R * Math.sin(phi) - (s * c) / Math.sqrt(G.L * G.L - s * s);
}

function circleIntersect(c0, r0, c1, r1, pickLower) {
  const dx = c1.x - c0.x, dy = c1.y - c0.y;
  const d = Math.hypot(dx, dy);
  const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r0 * r0 - a * a));
  const mx = c0.x + (a * dx) / d, my = c0.y + (a * dy) / d;
  const p1 = { x: mx + (h * dy) / d, y: my - (h * dx) / d };
  const p2 = { x: mx - (h * dy) / d, y: my + (h * dx) / d };
  return (p1.y < p2.y) === pickLower ? p1 : p2;
}

// Solve the full linkage for crank angle phi (radians, standard orientation in
// the side plane) and reverser setting rev in [-1, 1]. `st` carries the warm
// start for the combination-lever solve and receives the results.
export function solve(phi, rev, st = {}) {
  const crank = { x: G.AX + G.R * Math.cos(phi), y: G.AY + G.R * Math.sin(phi) };
  const rc = { x: G.AX + G.E * Math.cos(phi + G.DELTA), y: G.AY + G.E * Math.sin(phi + G.DELTA) };
  const xc = crosshead(phi);

  const tail = circleIntersect(G.P, G.LT, rc, G.LE, true);
  const ux = (tail.x - G.P.x) / G.LT, uy = (tail.y - G.P.y) / G.LT;
  const alpha = Math.atan2(ux, -uy);
  const s = rev * G.SMAX;
  const die = { x: G.P.x + s * ux, y: G.P.y + s * uy };
  const arm = { x: xc + G.ARM.dx, y: G.ARM.y };

  // Newton solve for valve spindle x and lever angle beta.
  // Seed from the small-angle solution so Newton stays on the physical branch
  // (union link pin ahead of the crosshead arm, radius rod pin ahead of the die).
  const c1g = die.x + G.LR, c3g = arm.x + G.LU;
  let beta = Math.asin(Math.max(-1, Math.min(1, (c3g - c1g) / G.B)));
  let xv = c1g - G.A * Math.sin(beta);
  const F = (xv, b) => {
    const sb = Math.sin(b), cb = Math.cos(b);
    const c1x = xv + G.A * sb, c1y = G.YV - G.A * cb;
    const c3x = xv + (G.A + G.B) * sb, c3y = G.YV - (G.A + G.B) * cb;
    return [
      (c1x - die.x) ** 2 + (c1y - die.y) ** 2 - G.LR * G.LR,
      (c3x - arm.x) ** 2 + (c3y - arm.y) ** 2 - G.LU * G.LU,
    ];
  };
  for (let i = 0; i < 8; i++) {
    const f = F(xv, beta);
    if (Math.abs(f[0]) + Math.abs(f[1]) < 1e-12) break;
    const h = 1e-6;
    const fx = F(xv + h, beta), fb = F(xv, beta + h);
    const j00 = (fx[0] - f[0]) / h, j01 = (fb[0] - f[0]) / h;
    const j10 = (fx[1] - f[1]) / h, j11 = (fb[1] - f[1]) / h;
    const det = j00 * j11 - j01 * j10;
    if (Math.abs(det) < 1e-14) break;
    xv -= (f[0] * j11 - f[1] * j01) / det;
    beta -= (j00 * f[1] - j10 * f[0]) / det;
  }
  const sb = Math.sin(beta), cb = Math.cos(beta);
  st.xv = xv; st.beta = beta;
  st.crank = crank; st.rc = rc; st.xc = xc; st.tail = tail; st.alpha = alpha;
  st.die = die; st.arm = arm;
  st.c2 = { x: xv, y: G.YV };
  st.c1 = { x: xv + G.A * sb, y: G.YV - G.A * cb };
  st.c3 = { x: xv + (G.A + G.B) * sb, y: G.YV - (G.A + G.B) * cb };
  st.valve = xv - G.XV0;               // valve displacement from mid (m)
  st.piston = xc + G.PISTON_ROD;        // piston centre x
  st.q = xc - G.XC_MIN;                  // piston travel from rear dead centre
  return st;
}

// Port openings (metres) for an outside-admission D slide valve.
export function ports(v, out = {}) {
  const w = G.PORT_W;
  const c = (x) => Math.min(w, Math.max(0, x));
  out.frontAdmit = c(-v - G.LAP);
  out.rearAdmit = c(v - G.LAP);
  out.frontExhaust = c(v);
  out.rearExhaust = c(-v);
  return out;
}
