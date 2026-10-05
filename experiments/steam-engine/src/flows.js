// Colour-coded particles tracing where water, fire gases, live steam and
// exhaust steam travel through the engine. Activity of each stream comes
// straight from the simulation.

import * as THREE from 'three';
import { softSprite } from './textures.js';

export const FLOW_COLOURS = {
  water: 0x3fa4ff,
  gas: 0xff8a2a,
  steam: 0xff3b3b,
  exhaust: 0xb79bff,
};

class Stream {
  constructor(points, count, color, size, speed, group, sprite) {
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
    this.len = curve.getLength();
    this.lut = curve.getSpacedPoints(Math.max(32, Math.ceil(this.len * 40)));
    this.count = count;
    this.speed = speed;
    this.phase = new Float32Array(count).map((_, i) => i / count + Math.random() * 0.3 / count);
    this.jit = new Float32Array(count * 3).map(() => (Math.random() - 0.5) * 0.05);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('aT', new THREE.BufferAttribute(new Float32Array(count), 1));
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(color) }, uAlpha: { value: 0 }, uSize: { value: size },
        uScale: { value: 600 }, uMap: { value: sprite }, uFadeTail: { value: 0 },
      },
      vertexShader: `attribute float aT; uniform float uSize; uniform float uScale; varying float vT;
        void main(){ vT = aT; vec4 mv = modelViewMatrix*vec4(position,1.0); gl_PointSize = uSize * uScale / -mv.z; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uAlpha; uniform sampler2D uMap; uniform float uFadeTail; varying float vT;
        void main(){ vec4 s = texture2D(uMap, gl_PointCoord); float a = s.a * uAlpha * (1.0 - uFadeTail * smoothstep(0.55, 1.0, vT));
          vec3 c = mix(uColor, vec3(1.0), s.a * 0.35);
          if (uFadeTail > 0.0) c = mix(c, vec3(0.45,0.42,0.4), smoothstep(0.5,0.95,vT) * uFadeTail);
          gl_FragColor = vec4(c * a, a); }`,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 8;
    group.add(this.points);
    this.activity = 0;
    this.offset = 0;
  }

  update(dt, target, rate) {
    this.activity += (target - this.activity) * Math.min(1, dt * 6);
    this.offset += (dt * this.speed * rate) / this.len;
    const pos = this.points.geometry.attributes.position.array;
    const ta = this.points.geometry.attributes.aT.array;
    const n = this.lut.length - 1;
    for (let i = 0; i < this.count; i++) {
      let t = (this.phase[i] + this.offset) % 1;
      if (t < 0) t += 1;
      const f = t * n, k = Math.floor(f), u = f - k;
      const a = this.lut[k], b = this.lut[Math.min(n, k + 1)];
      pos[i * 3] = a.x + (b.x - a.x) * u + this.jit[i * 3];
      pos[i * 3 + 1] = a.y + (b.y - a.y) * u + this.jit[i * 3 + 1];
      pos[i * 3 + 2] = a.z + (b.z - a.z) * u + this.jit[i * 3 + 2];
      ta[i] = t;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.aT.needsUpdate = true;
  }
}

export class Flows {
  constructor(scene, loco) {
    this.group = new THREE.Group();
    scene.add(this.group);
    const sp = softSprite();
    const P = loco.paths;
    const C = FLOW_COLOURS;
    this.water = [new Stream(P.water[0], 70, C.water, 0.08, 1.4, this.group, sp)];
    this.gas = P.gas.map((p) => { const s = new Stream(p, 46, C.gas, 0.09, 2.2, this.group, sp); s.mat.uniforms.uFadeTail.value = 1; return s; });
    this.steam = new Stream(P.steam, 60, C.steam, 0.08, 1.6, this.group, sp);
    this.sides = [1, -1].map((s) => ({
      main: new Stream(P.steamSide(s), 30, C.steam, 0.08, 1.6, this.group, sp),
      admitF: new Stream(P.admitFront(s), 14, C.steam, 0.07, 1.2, this.group, sp),
      admitR: new Stream(P.admitRear(s), 14, C.steam, 0.07, 1.2, this.group, sp),
      exhF: new Stream(P.exhaustFront(s), 60, C.exhaust, 0.08, 2.4, this.group, sp),
      exhR: new Stream(P.exhaustRear(s), 60, C.exhaust, 0.08, 2.4, this.group, sp),
    }));
    this.visible = false;
    this.fade = 0;
  }

  all() {
    return [...this.water, ...this.gas, this.steam, ...this.sides.flatMap((s) => Object.values(s))];
  }

  update(sim, dt, sdt, scale, enabled) {
    this.fade += ((enabled ? 1 : 0) - this.fade) * Math.min(1, dt * 4);
    this.group.visible = this.fade > 0.01;
    if (!this.group.visible) return;
    // slow-motion slows the flows too, but never quite to a standstill
    const rate = Math.max(0.08, Math.min(1, sdt / Math.max(dt, 1e-6)));
    const clamp = (v) => Math.max(0, Math.min(1, v));
    this.water[0].update(dt, clamp(sim.injFlow / 3), rate);
    for (const g of this.gas) g.update(dt, clamp(0.25 + sim.draught * 0.6), rate * (0.5 + sim.draught));
    this.steam.update(dt, clamp(sim.regFlow / 2.5 + (sim.c.regulator > 0.02 ? 0.15 : 0)), rate * (0.4 + Math.min(1.5, sim.regFlow)));
    sim.sides.forEach((side, i) => {
      const S = this.sides[i];
      S.main.update(dt, clamp(sim.regFlow / 3 + (sim.c.regulator > 0.02 ? 0.1 : 0)), rate * (0.4 + Math.min(1.5, sim.regFlow)));
      S.admitF.update(dt, clamp(side.admitF / 2), rate);
      S.admitR.update(dt, clamp(side.admitR / 2), rate);
      S.exhF.update(dt, clamp(side.exhF / 3), rate * 1.4);
      S.exhR.update(dt, clamp(side.exhR / 3), rate * 1.4);
    });
    for (const s of this.all()) {
      s.mat.uniforms.uAlpha.value = s.activity * this.fade;
      s.mat.uniforms.uScale.value = scale;
    }
  }
}
