// Billboarded particle clouds for steam, smoke and sparks. CPU-simulated,
// drawn as one instanced quad batch per system.

import * as THREE from 'three';

const VERT = /* glsl */`
  attribute vec3 aPos; attribute vec4 aData; attribute vec3 aColor;
  varying vec2 vUv; varying float vAlpha; varying vec3 vColor; varying float vSeed; varying float vDepth;
  void main(){
    vUv = uv; vAlpha = aData.y; vColor = aColor; vSeed = aData.z;
    vec4 mv = modelViewMatrix * vec4(aPos, 1.0);
    float a = aData.w;
    vec2 c = position.xy;
    c = vec2(c.x * cos(a) - c.y * sin(a), c.x * sin(a) + c.y * cos(a));
    mv.xy += c * aData.x;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }`;

const FRAG_SOFT = /* glsl */`
  uniform sampler2D uNoise; uniform vec3 uLight; uniform vec3 uFog; uniform float uFogD;
  varying vec2 vUv; varying float vAlpha; varying vec3 vColor; varying float vSeed; varying float vDepth;
  void main(){
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    float n = texture2D(uNoise, vUv * 0.55 + vec2(vSeed, vSeed * 1.7)).r;
    float n2 = texture2D(uNoise, vUv * 1.3 + vec2(vSeed * 2.3, vSeed)).r;
    float shape = smoothstep(1.0, 0.15, r + (n - 0.5) * 0.9 + (n2 - 0.5) * 0.35);
    float a = shape * vAlpha * smoothstep(0.4, 2.6, vDepth);
    if (a < 0.004) discard;
    // fake lighting: brighter on the upper side, warm lamp light from above
    float lit = 0.72 + 0.38 * (0.5 - p.y) + (n2 - 0.5) * 0.25;
    vec3 col = vColor * uLight * lit;
    float f = 1.0 - exp(-uFogD * uFogD * vDepth * vDepth);
    col = mix(col, uFog, f * 0.6);
    gl_FragColor = vec4(col, a);
  }`;

const FRAG_SPARK = /* glsl */`
  varying vec2 vUv; varying float vAlpha; varying vec3 vColor; varying float vSeed; varying float vDepth;
  void main(){
    float r = length(vUv - 0.5) * 2.0;
    float a = smoothstep(1.0, 0.0, r);
    a = a * a * vAlpha;
    gl_FragColor = vec4(vColor * a * 3.0, a);
  }`;

export class Particles {
  constructor({ max = 2000, noise, additive = false, renderOrder = 5 }) {
    this.max = max;
    this.count = 0;
    // per particle state
    this.p = new Float32Array(max * 3);
    this.v = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.age = new Float32Array(max);
    this.s0 = new Float32Array(max);
    this.s1 = new Float32Array(max);
    this.a0 = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.buoy = new Float32Array(max);
    this.spin = new Float32Array(max);
    this.col = new Float32Array(max * 3);
    const quad = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = quad.index;
    g.setAttribute('position', quad.attributes.position);
    g.setAttribute('uv', quad.attributes.uv);
    this.aPos = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.aData = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.aColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aPos', this.aPos); g.setAttribute('aData', this.aData); g.setAttribute('aColor', this.aColor);
    g.instanceCount = 0;
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: additive ? FRAG_SPARK : FRAG_SOFT,
      uniforms: {
        uNoise: { value: noise }, uLight: { value: new THREE.Color(1.0, 0.9, 0.78) },
        uFog: { value: new THREE.Color(0x1a1410) }, uFogD: { value: 0.02 },
      },
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = renderOrder;
  }

  emit(x, y, z, vx, vy, vz, o) {
    let i = this.count;
    if (i >= this.max) {
      // recycle the oldest-looking slot
      i = (Math.random() * this.max) | 0;
    } else this.count++;
    this.p[i * 3] = x; this.p[i * 3 + 1] = y; this.p[i * 3 + 2] = z;
    this.v[i * 3] = vx; this.v[i * 3 + 1] = vy; this.v[i * 3 + 2] = vz;
    this.life[i] = o.life; this.age[i] = 0;
    this.s0[i] = o.size0; this.s1[i] = o.size1; this.a0[i] = o.alpha;
    this.drag[i] = o.drag ?? 1.2; this.buoy[i] = o.buoy ?? 0.6; this.spin[i] = (Math.random() - 0.5) * (o.spin ?? 0.6);
    const c = o.color;
    this.col[i * 3] = c[0]; this.col[i * 3 + 1] = c[1]; this.col[i * 3 + 2] = c[2];
    this.aData.array[i * 4 + 2] = Math.random();
    this.aData.array[i * 4 + 3] = Math.random() * 6.28;
  }

  update(dt, ceiling = 14) {
    const P = this.p, V = this.v;
    let n = this.count;
    for (let i = 0; i < n; i++) {
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) {
        // swap-remove
        n--;
        this.copy(n, i);
        i--;
        continue;
      }
      const d = Math.exp(-this.drag[i] * dt);
      V[i * 3] *= d; V[i * 3 + 1] = V[i * 3 + 1] * d + this.buoy[i] * dt; V[i * 3 + 2] *= d;
      P[i * 3] += V[i * 3] * dt; P[i * 3 + 1] += V[i * 3 + 1] * dt; P[i * 3 + 2] += V[i * 3 + 2] * dt;
      if (P[i * 3 + 1] > ceiling) { P[i * 3 + 1] = ceiling; V[i * 3 + 1] = 0; V[i * 3] += (Math.random() - 0.5) * 0.4; V[i * 3 + 2] += (Math.random() - 0.5) * 0.4; }
    }
    this.count = n;
    const ap = this.aPos.array, ad = this.aData.array, ac = this.aColor.array;
    for (let i = 0; i < n; i++) {
      const t = this.age[i] / this.life[i];
      ap[i * 3] = P[i * 3]; ap[i * 3 + 1] = P[i * 3 + 1]; ap[i * 3 + 2] = P[i * 3 + 2];
      const grow = 1 - Math.pow(1 - t, 2.2);
      ad[i * 4] = this.s0[i] + (this.s1[i] - this.s0[i]) * grow;
      const fadeIn = Math.min(1, t * 10);
      ad[i * 4 + 1] = this.a0[i] * fadeIn * Math.pow(1 - t, 1.6);
      ad[i * 4 + 3] += this.spin[i] * dt;
      ac[i * 3] = this.col[i * 3]; ac[i * 3 + 1] = this.col[i * 3 + 1]; ac[i * 3 + 2] = this.col[i * 3 + 2];
    }
    this.geo.instanceCount = n;
    this.aPos.needsUpdate = this.aData.needsUpdate = this.aColor.needsUpdate = true;
    this.aPos.clearUpdateRanges?.(); this.aData.clearUpdateRanges?.(); this.aColor.clearUpdateRanges?.();
  }

  copy(from, to) {
    for (let k = 0; k < 3; k++) {
      this.p[to * 3 + k] = this.p[from * 3 + k]; this.v[to * 3 + k] = this.v[from * 3 + k]; this.col[to * 3 + k] = this.col[from * 3 + k];
    }
    this.life[to] = this.life[from]; this.age[to] = this.age[from];
    this.s0[to] = this.s0[from]; this.s1[to] = this.s1[from]; this.a0[to] = this.a0[from];
    this.drag[to] = this.drag[from]; this.buoy[to] = this.buoy[from]; this.spin[to] = this.spin[from];
    this.aData.array[to * 4 + 2] = this.aData.array[from * 4 + 2];
    this.aData.array[to * 4 + 3] = this.aData.array[from * 4 + 3];
  }
}

// All the steam effects of the engine, driven by the simulation.
export class SteamEffects {
  constructor(scene, loco, noise) {
    this.loco = loco;
    this.steam = new Particles({ max: 3600, noise });
    this.sparks = new Particles({ max: 500, noise, additive: true, renderOrder: 6 });
    scene.add(this.steam.mesh, this.sparks.mesh);
    this.acc = { safety: 0, whistle: 0, drain: [0, 0, 0, 0], wisp: 0, gland: 0, inj: 0, spark: 0 };
    this.prevInj = false;
    this.injT = 0;
  }

  update(sim, dt, sdt) {
    const E = this.loco.emitters;
    const S = this.steam;
    const rnd = Math.random;
    const smoke = sim.smoke;
    const steamCol = [0.93, 0.92, 0.9];
    const smokeCol = () => {
      const k = Math.min(1, smoke * 1.1);
      return [0.9 - k * 0.72, 0.89 - k * 0.72, 0.87 - k * 0.7];
    };
    // slow motion: emission follows simulated time, motion follows a blend so
    // clouds still drift gracefully when the engine is nearly frozen
    const ts = sdt / Math.max(1e-6, dt);
    const motion = Math.max(0.12, Math.min(1, ts));

    // chimney: one puff per exhaust beat
    for (const e of sim.events) {
      if (e.type !== 'chuff') continue;
      const k = Math.min(1.6, e.strength);
      const n = 6 + Math.round(k * 16);
      const c = E.chimney;
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2, r = rnd() * 0.12;
        const up = 3 + k * 7 + rnd() * 2;
        const col = rnd() < 0.5 ? smokeCol() : steamCol;
        S.emit(c.x + Math.cos(a) * r, c.y, c.z + Math.sin(a) * r, Math.cos(a) * 0.6 * rnd(), up, Math.sin(a) * 0.6 * rnd(),
          { life: 3.2 + rnd() * 2.5, size0: 0.35, size1: 2.4 + k * 1.6 + rnd(), alpha: 0.55 + k * 0.2, drag: 1.1, buoy: 0.5, color: col });
      }
      if (k > 0.6 && sim.blast > 1.5) {
        for (let i = 0; i < 4; i++) this.sparks.emit(c.x, c.y, c.z, (rnd() - 0.5) * 2, 6 + rnd() * 6, (rnd() - 0.5) * 2, { life: 0.8 + rnd(), size0: 0.05, size1: 0.02, alpha: 1, drag: 0.6, buoy: -3, color: [1, 0.5, 0.15], spin: 0 });
      }
    }
    // a lazy wisp from the chimney when standing (blower draught)
    this.acc.wisp += sdt * (0.6 + sim.c.blower * 6 + smoke * 4);
    while (this.acc.wisp > 1) {
      this.acc.wisp -= 1;
      const c = E.chimney;
      S.emit(c.x + (rnd() - 0.5) * 0.2, c.y, c.z + (rnd() - 0.5) * 0.2, 0, 1.2 + rnd(), 0,
        { life: 4 + rnd() * 2, size0: 0.4, size1: 2.2, alpha: 0.28, drag: 0.6, buoy: 0.35, color: smoke > 0.3 ? smokeCol() : [0.7, 0.68, 0.66] });
    }
    // safety valves blowing off
    this.acc.safety += sdt * sim.safety * 28;
    while (this.acc.safety > 1) {
      this.acc.safety -= 1;
      const c = E.safety;
      S.emit(c.x + (rnd() - 0.5) * 0.1, c.y, c.z + (rnd() - 0.5) * 0.1, (rnd() - 0.5) * 1.2, 9 + rnd() * 5, (rnd() - 0.5) * 1.2,
        { life: 1.8 + rnd() * 1.2, size0: 0.12, size1: 1.8, alpha: 0.6, drag: 1.6, buoy: 0.8, color: steamCol });
    }
    // whistle
    if (sim.c.whistle) {
      this.acc.whistle += sdt * 50;
      while (this.acc.whistle > 1) {
        this.acc.whistle -= 1;
        const c = E.whistle;
        S.emit(c.x, c.y, c.z, (rnd() - 0.5) * 1.5, 6 + rnd() * 3, (rnd() - 0.5) * 1.5,
          { life: 1.4 + rnd(), size0: 0.1, size1: 1.3, alpha: 0.65, drag: 1.8, buoy: 0.6, color: steamCol });
      }
    }
    // cylinder drain cocks: jets of steam and condensate
    if (sim.c.drainCocks) {
      sim.sides.forEach((side, si) => {
        const em = si === 0 ? E.drain_right : E.drain_left;
        const sgn = si === 0 ? 1 : -1;
        [side.pR, side.pF].forEach((p, k) => {
          const idx = si * 2 + k;
          this.acc.drain[idx] += sdt * Math.max(0, p - 20) * 0.9;
          while (this.acc.drain[idx] > 1) {
            this.acc.drain[idx] -= 1;
            const c = em[k];
            const fwd = k === 1 ? 1 : -0.4;
            S.emit(c.x, c.y, c.z, fwd * (3 + rnd() * 3), -0.4 + rnd() * 0.6, sgn * (2.5 + rnd() * 3),
              { life: 1.1 + rnd() * 0.9, size0: 0.12, size1: 1.4, alpha: 0.55, drag: 2.2, buoy: 0.9, color: steamCol });
          }
        });
      });
    }
    // injector: a puff from the overflow as it picks up
    if (sim.c.injector && !this.prevInj) this.injT = 1.2;
    this.prevInj = sim.c.injector;
    if (this.injT > 0) {
      this.injT -= sdt;
      this.acc.inj += sdt * 30;
      while (this.acc.inj > 1) {
        this.acc.inj -= 1;
        const c = E.injector;
        S.emit(c.x, c.y, c.z, (rnd() - 0.5), -1 - rnd(), (rnd() - 0.2) * 1.5,
          { life: 1.2 + rnd(), size0: 0.08, size1: 0.8, alpha: 0.45, drag: 2, buoy: 0.6, color: steamCol });
      }
    }
    // gland leaks — tiny wisps around the piston rods while under steam
    this.acc.gland += sdt * Math.max(0, sim.pChest) * 0.02;
    while (this.acc.gland > 1) {
      this.acc.gland -= 1;
      const sgn = rnd() < 0.5 ? 1 : -1;
      S.emit(3.98, 1.0, sgn * 1.12, -0.3, 0.3, sgn * 0.2, { life: 1.5, size0: 0.05, size1: 0.5, alpha: 0.25, drag: 1.5, buoy: 0.4, color: steamCol });
    }
    // embers when the fireman opens the doors
    if ((sim.firingDoor ?? 0) > 0.5) {
      this.acc.spark += sdt * 20;
      while (this.acc.spark > 1) {
        this.acc.spark -= 1;
        const c = this.loco.anchors.firehole;
        this.sparks.emit(c.x, c.y, c.z + (rnd() - 0.5) * 0.2, -(0.5 + rnd()), 0.5 + rnd(), (rnd() - 0.5), { life: 0.6 + rnd() * 0.5, size0: 0.04, size1: 0.01, alpha: 1, drag: 1, buoy: 0.4, color: [1, 0.55, 0.2], spin: 0 });
      }
    }
    // embers dancing inside the firebox (visible in the cutaway)
    if (this.loco.cut > 0.5) {
      const I = { x0: -2.4, x1: -0.8 };
      const k = sdt * (10 + sim.draught * 30);
      for (let i = 0; i < k * 1 + (rnd() < k % 1 ? 1 : 0); i++) {
        this.sparks.emit(I.x0 + rnd() * (I.x1 - I.x0), 1.5, (rnd() - 0.5) * 0.7, 0.4 + sim.draught, 0.6 + rnd(), (rnd() - 0.5) * 0.3,
          { life: 0.5 + rnd() * 0.6, size0: 0.03, size1: 0.01, alpha: 1, drag: 0.5, buoy: 0.6, color: [1, 0.6, 0.2], spin: 0 });
      }
    }
    S.update(dt * motion, 13.6);
    this.sparks.update(dt * motion, 13.6);
  }
}
