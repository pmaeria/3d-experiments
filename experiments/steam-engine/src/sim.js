// A small, honest physics model of a Victorian locomotive on a rolling-road
// test bed. Steam masses are tracked in kg and pressures in psi; the cylinder
// model integrates each chamber through admission, expansion, release and
// compression using the real valve-gear kinematics, so torque, chuffs and the
// indicator diagram all emerge from the same numbers.

import { G, solve, ports, crossheadRate } from './valvegear.js';

const ATM = 14.7;               // psi absolute
const K = 29;                   // psi·m³/kg — steam treated as ideal gas near saturation
const CYL_A = Math.PI * G.BORE_R * G.BORE_R;
const STROKE = 2 * G.R;
const CLEAR = 0.07 * CYL_A * STROKE;
const CHEST_V = 0.12;
const C_ADMIT = 0.32;           // kg/s per psi at full port opening
const C_EXH = 0.42;
const C_REG = 0.22;
const WHEEL_R = 1.0;
const M_EFF = 60000;            // equivalent inertia of engine + test-bed rollers
const PSI = 6894.76;
const SUB_DT = 0.0004;

export const LIMITS = {
  safety: 160,       // psi gauge: safety valves lift
  redLine: 160,
  waterNormal: 2.88, // y of water surface (m)
  waterGlassLo: 2.58,
  waterGlassHi: 3.08,
  crown: 2.52,       // top of the firebox crown sheet
};

export class Sim {
  constructor() {
    this.c = {
      regulator: 0, reverser: 0.75, firing: 0.35, blower: 0.2,
      injector: false, drainCocks: true, whistle: false, load: 0.25,
      autoFireman: true,
    };
    this.theta = 0; this.omega = 0;
    this.pBoiler = 150;                 // psi gauge
    this.water = LIMITS.waterNormal;    // water surface height (m)
    this.tenderWater = 2800;            // gallons
    this.coal = 4.0;                    // tons
    this.bed = 0.55;                    // fire bed thickness (relative)
    this.fireTemp = 900;                // °C
    this.draught = 0.3;
    this.smoke = 0.2;                   // 0 clean steam … 1 black smoke
    this.safety = 0;                    // safety valve flow kg/s
    this.gen = 0; this.use = 0;
    this.blast = 0;                     // smoothed exhaust flow kg/s
    this.regFlow = 0;
    this.injFlow = 0;
    this.mChest = (ATM * CHEST_V) / K;
    this.time = 0;
    this.events = [];
    this.sides = [0, 1].map((i) => ({
      index: i,
      offset: i === 0 ? 0 : Math.PI / 2,       // right-hand crank leads by 90°
      kin: {}, port: {},
      mF: (ATM * CLEAR) / K, mR: (ATM * CLEAR) / K,
      pF: ATM, pR: ATM, vF: CLEAR, vR: CLEAR,
      exh: 0, exhOpenF: false, exhOpenR: false,
      admitF: 0, admitR: 0, exhF: 0, exhR: 0,
      card: { pF: new Float32Array(360).fill(ATM), pR: new Float32Array(360).fill(ATM), q: new Float32Array(360) },
    }));
    for (const s of this.sides) this.kinematics(s);
  }

  get speed() { return this.omega * WHEEL_R; }               // m/s
  get mph() { return this.speed * 2.23694; }
  get pChest() { return (this.mChest * K) / CHEST_V - ATM; }
  get cutoff() {
    // effective cut-off: fraction of stroke with front port open, sampled
    return this._cutoff ?? 0;
  }

  phiOf(s) { return -this.theta + s.offset; }

  kinematics(s) {
    const st = solve(this.phiOf(s), this.c.reverser, s.kin);
    ports(st.valve, s.port);
    const q = st.q;
    s.vF = CLEAR + CYL_A * (STROKE - q);
    s.vR = CLEAR + CYL_A * q;
    return st;
  }

  step(dt) {
    this.events.length = 0;
    let n = Math.ceil(dt / SUB_DT);
    if (n > 400) n = 400;
    const h = dt / n;
    for (let i = 0; i < n; i++) this.substep(h);
    this.slow(dt);
    this.time += dt;
  }

  substep(h) {
    const c = this.c;
    const pB = this.pBoiler + ATM;
    let pC = (this.mChest * K) / CHEST_V;

    // regulator: boiler -> steam chest
    const reg = c.regulator * c.regulator * (1.6 - 0.6 * c.regulator);
    const regFlow = Math.max(0, C_REG * reg * (pB - pC));
    this.mChest += regFlow * h;
    this.regFlow += (regFlow - this.regFlow) * Math.min(1, h * 8);

    let torque = 0;
    let exhaustFlow = 0;
    for (const s of this.sides) {
      const vF0 = s.vF, vR0 = s.vR;
      this.kinematics(s);
      // polytropic expansion/compression from volume change
      s.pF *= Math.pow(vF0 / s.vF, 1.15);
      s.pR *= Math.pow(vR0 / s.vR, 1.15);

      pC = (this.mChest * K) / CHEST_V;
      const pw = G.PORT_W;
      const drain = c.drainCocks ? 0.012 : 0;
      // each chamber relaxes toward a weighted equilibrium of chest and exhaust
      const relax = (p, v, aOpen, eOpen) => {
        const ka = (C_ADMIT * (aOpen / pw) * K) / v;
        const ke = ((C_EXH * (eOpen / pw) + drain) * K) / v;
        const kt = ka + ke;
        if (kt <= 0) return [p, 0, 0];
        const peq = (ka * pC + ke * ATM) / kt;
        const pn = peq + (p - peq) * Math.exp(-kt * h);
        const pm = 0.5 * (p + pn);
        const admit = C_ADMIT * (aOpen / pw) * Math.max(0, pC - pm);
        const exh = (C_EXH * (eOpen / pw) + drain) * Math.max(0, pm - ATM);
        return [pn, admit, exh];
      };
      const P = s.port;
      let r = relax(s.pF, s.vF, P.frontAdmit, P.frontExhaust);
      s.pF = Math.max(ATM * 0.6, r[0]); s.admitF = r[1]; s.exhF = r[2];
      r = relax(s.pR, s.vR, P.rearAdmit, P.rearExhaust);
      s.pR = Math.max(ATM * 0.6, r[0]); s.admitR = r[1]; s.exhR = r[2];
      this.mChest -= (s.admitF + s.admitR) * h;
      if (this.mChest < 0.001) this.mChest = 0.001;
      s.exh = s.exhF + s.exhR;
      exhaustFlow += s.exh;

      // chuff detection: exhaust port cracks open on a pressurised chamber
      const fOpen = P.frontExhaust > 0.002, rOpen = P.rearExhaust > 0.002;
      if (fOpen && !s.exhOpenF && s.pF > ATM + 4) this.events.push({ type: 'chuff', side: s.index, end: 'front', strength: (s.pF - ATM) / 140 });
      if (rOpen && !s.exhOpenR && s.pR > ATM + 4) this.events.push({ type: 'chuff', side: s.index, end: 'rear', strength: (s.pR - ATM) / 140 });
      s.exhOpenF = fOpen; s.exhOpenR = rOpen;

      // indicator card: pressure in each end binned by crank angle
      let a = (this.phiOf(s) % (2 * Math.PI)); if (a < 0) a += 2 * Math.PI;
      const bin = Math.min(359, Math.floor((a / (2 * Math.PI)) * 360));
      s.card.pF[bin] = s.pF; s.card.pR[bin] = s.pR; s.card.q[bin] = s.kin.q;

      // force on crosshead (+x) = (pR - pF)·A ; torque = F · dx/dθ
      const F = (s.pR - s.pF) * PSI * CYL_A;
      const dxdtheta = -crossheadRate(this.phiOf(s));
      torque += F * dxdtheta;
    }

    // resistance: rolling + test-bed brake + air (Davis-style)
    const v = this.omega * WHEEL_R;
    const resist = 1800 + 70 * Math.abs(v) + 16 * v * v + c.load * 38000;
    let tq = torque;
    if (Math.abs(this.omega) < 0.02 && Math.abs(tq) < resist * WHEEL_R) {
      this.omega = 0;
    } else {
      tq -= Math.sign(this.omega || tq) * resist * WHEEL_R;
      this.omega += (tq / (M_EFF * WHEEL_R * WHEEL_R)) * h;
    }
    this.theta += this.omega * h;
    this.torque = torque;
    this.blastInst = exhaustFlow;
    this.blast += (exhaustFlow - this.blast) * Math.min(1, h * 3);
  }

  slow(dt) {
    const c = this.c;
    // ---- the fireman (optional assistant) ----
    if (c.autoFireman) {
      if (this.water < LIMITS.waterNormal - 0.05) c.injector = true;
      else if (this.water > LIMITS.waterNormal + 0.04) c.injector = false;
      const want = 0.15 + 0.6 * Math.min(1, this.blast / 2.2) + (152 - this.pBoiler) * 0.02;
      c.firing += (Math.max(0.05, Math.min(0.9, want)) - c.firing) * Math.min(1, dt * 0.4);
      c.blower = this.c.regulator < 0.05 ? 0.35 : 0.1;
    }

    // the fireman swings a shovelful in every few seconds; the doors open briefly
    this._shovel = (this._shovel ?? 0) + dt * c.firing * 0.45;
    if (this._shovel >= 1) { this._shovel = 0; this._door = 0.9; this.events.push({ type: 'shovel' }); }
    this._door = Math.max(0, (this._door ?? 0) - dt);
    this.firingDoor = this._door > 0 ? Math.min(1, this._door * 4, (0.9 - this._door) * 6 + 0.2) : 0;

    // ---- fire & draught ----
    const blastN = Math.min(1.4, this.blast / 2.5);
    const air = 0.12 + 0.55 * c.blower + 1.25 * blastN + (c.firing > 0 ? 0 : 0);
    this.draught += (air - this.draught) * Math.min(1, dt * 2);
    const feed = c.firing * 0.16 * (this.coal > 0 ? 1 : 0);
    const burn = this.bed * Math.min(1.6, this.draught) * 0.11;
    this.bed = Math.max(0.05, Math.min(1.6, this.bed + (feed - burn) * dt));
    this.coal = Math.max(0, this.coal - c.firing * 0.00045 * dt);
    const heat = burn / 0.11; // 0 … ~2
    const target = 280 + 1150 * (1 - Math.exp(-heat * 1.35));
    this.fireTemp += (target - this.fireTemp) * Math.min(1, dt * 0.5);
    // black smoke when coal is piled on faster than air can burn it
    const smokeT = Math.max(0, Math.min(1, (feed * 6 - this.draught * 0.55) + (c.firing > 0.85 ? 0.2 : 0)));
    this.smoke += (smokeT - this.smoke) * Math.min(1, dt * 1.5);

    // ---- boiler ----
    this.gen = Math.max(0, (this.fireTemp - 260) / 1000) * 3.0 * (this.water > LIMITS.crown - 0.1 ? 1 : 0.4);
    let out = this.regFlow;
    if (c.blower > 0) out += 0.12 * c.blower;
    if (c.whistle) out += 0.35;
    this.injFlow = 0;
    if (c.injector && this.pBoiler > 40 && this.tenderWater > 0) {
      out += 0.3;
      this.injFlow = 3.2; // kg/s of feed water
    }
    const over = this.pBoiler - (LIMITS.safety - 2);
    this.safety = over > 0 ? Math.min(6, over * 0.9) : 0;
    out += this.safety;
    this.use = out;
    this.pBoiler += (this.gen - out) * 1.1 * dt - this.injFlow * 0.12 * dt;
    this.pBoiler = Math.max(0, Math.min(this.pBoiler, LIMITS.safety + 6));
    // water level (exaggerated ~3x so it is visible in a demo)
    this.water += (this.injFlow - this.gen) * dt * 0.001;
    this.water = Math.max(2.2, Math.min(3.15, this.water));
    this.tenderWater = Math.max(0, this.tenderWater - this.injFlow * 0.22 * dt);
    if (this.water < LIMITS.crown && !this._lowWarned) {
      this._lowWarned = true;
      this.events.push({ type: 'lowwater' });
    }
    if (this.water > LIMITS.crown + 0.05) this._lowWarned = false;

    // effective cut-off for display: front-port open fraction across the stroke
    this._cutoff = this.estimateCutoff();
  }

  // indicated power from the indicator cards (∮p dV over one revolution)
  indicatedPower() {
    let work = 0;
    for (const s of this.sides) {
      const c = s.card;
      for (let i = 0; i < 360; i++) {
        const j = (i + 1) % 360;
        const dq = c.q[j] - c.q[i];
        // rear end volume grows with q, front end shrinks
        work += ((c.pR[i] + c.pR[j]) / 2 - (c.pF[i] + c.pF[j]) / 2) * PSI * CYL_A * dq;
      }
    }
    const revs = Math.abs(this.omega) / (2 * Math.PI);
    return Math.abs(work) * revs / 745.7; // horsepower
  }

  estimateCutoff() {
    if (this._coRev === this.c.reverser) return this._coVal;
    // sample one revolution of the right-hand side with the current reverser
    const st = {};
    let start = null, end = null;
    let prevOpen = false;
    for (let i = 0; i <= 720; i++) {
      const th = (i / 360) * Math.PI * 2 * (this.c.reverser >= 0 ? 1 : -1);
      solve(-th, this.c.reverser, st);
      const o = ports(st.valve).frontAdmit > 0;
      if (o && !prevOpen && i > 0) start = st.q;
      if (!o && prevOpen && start !== null) { end = st.q; break; }
      prevOpen = o;
    }
    let v = 0;
    if (start !== null && end !== null) v = Math.max(0, Math.min(1, (start - end) / STROKE));
    this._coRev = this.c.reverser; this._coVal = v;
    return v;
  }
}

export const CONST = { ATM, K, CYL_A, STROKE, CLEAR, WHEEL_R };
