// Orbits and trails. Every vertex stores a body's geocentric vector and Earth's heliocentric
// vector at its own sample time; the vertex shader applies exactly the same layout as the
// bodies (layout.js), so paths morph with the view: Earth's orbit shrinks to a point while
// the Sun's yearly path grows around Earth, and geocentric trails show retrograde loops.

import * as THREE from 'three';
import * as A from 'astronomy-engine';
import { eqjToWorld } from '../astro/index.js';
import { helioEqj, earthHelioEqj, geoGeometricEqj } from '../astro/bodies.js';
import { AU, COMPRESS } from './layout.js';

const pathVert = /* glsl */`
  attribute vec3 geo;
  attribute vec3 earth;
  attribute float age;
  uniform float uA, uC, uS, uR, uMinR, uDome, uAU;
  uniform float uEarthFixed;
  uniform float uHelio;
  uniform vec3 uEarthNow;
  varying float vAge;
  void main() {
    float d = length(geo);
    vec3 u = d > 0.0 ? geo / d : vec3(0.0);
    float rTrue = max(d * uAU, uMinR);
    float rComp = uR * (${COMPRESS.M0.toFixed(6)} + ${COMPRESS.B.toFixed(8)} * log(1.0 + d / ${COMPRESS.D0.toFixed(6)}));
    float r = mix(rTrue, rComp, uC);
    r = mix(r, uDome * uR, uS);
    if (d == 0.0) r = 0.0;
    vec3 e = mix(earth, uEarthNow, uEarthFixed);
    vec3 p = e * uAU * (1.0 - uA) + u * r;
    // heliocentric orbits: a rigid path in the Sun's frame, sliding with the frame anchor
    if (uHelio > 0.5) p = (geo + earth - uA * uEarthNow) * uAU;
    vAge = age;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const pathFrag = /* glsl */`
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uFade;
  varying float vAge;
  void main() {
    float a = uOpacity * mix(1.0, smoothstep(0.0, 1.0, vAge), uFade);
    gl_FragColor = vec4(uColor, a);
    #include <colorspace_fragment>
  }
`;

const toWorld = (v) => eqjToWorld(v);

/** Sample a path vertex: {geo, earth} world-frame AU vectors. kind: 'geo'|'orbit'|'earth'|'sunPath'. */
function sample(kind, id, date) {
  const t = A.MakeTime(date);
  const e = toWorld(earthHelioEqj(t));
  if (kind === 'earth') return { geo: { x: 0, y: 0, z: 0 }, earth: e };
  if (kind === 'sunPath') return { geo: { x: -e.x, y: -e.y, z: -e.z }, earth: e };
  const g = toWorld(geoGeometricEqj(id, t) ?? { x: 0, y: 0, z: 0 });
  return { geo: g, earth: e };
}

class PathLine {
  constructor({ color, n, fade = false, earthFixed = false, dashed = false, helio = false }) {
    this.n = n;
    const g = new THREE.BufferGeometry();
    this.geoArr = new Float32Array(n * 3);
    this.earthArr = new Float32Array(n * 3);
    this.ageArr = new Float32Array(n);
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('geo', new THREE.BufferAttribute(this.geoArr, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('earth', new THREE.BufferAttribute(this.earthArr, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('age', new THREE.BufferAttribute(this.ageArr, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    this.uniforms = {
      uA: { value: 0 }, uC: { value: 0 }, uS: { value: 0 }, uR: { value: 30 }, uMinR: { value: 0 },
      uDome: { value: 0.9 }, uAU: { value: AU }, uEarthFixed: { value: earthFixed ? 1 : 0 },
      uHelio: { value: helio ? 1 : 0 }, uEarthNow: { value: new THREE.Vector3() }, uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0.5 }, uFade: { value: fade ? 1 : 0 },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: pathVert, fragmentShader: pathFrag,
      transparent: true, depthWrite: false,
    });
    this.object = new THREE.Line(g, this.material);
    this.object.frustumCulled = false;
    this.object.renderOrder = 1;
    this.geometry = g;
    this.dashed = dashed;
  }

  write(i, smp, age) {
    this.geoArr[i * 3] = smp.geo.x; this.geoArr[i * 3 + 1] = smp.geo.y; this.geoArr[i * 3 + 2] = smp.geo.z;
    this.earthArr[i * 3] = smp.earth.x; this.earthArr[i * 3 + 1] = smp.earth.y; this.earthArr[i * 3 + 2] = smp.earth.z;
    this.ageArr[i] = age;
  }

  commit(count) {
    this.geometry.setDrawRange(0, count);
    for (const k of ['geo', 'earth', 'age']) this.geometry.attributes[k].needsUpdate = true;
  }

  setLayout(p, earthNow, minR = 0, dome = 0.9) {
    const u = this.uniforms;
    u.uA.value = p.a; u.uC.value = p.c; u.uS.value = p.s; u.uR.value = p.R;
    u.uMinR.value = minR; u.uDome.value = dome;
    u.uEarthNow.value.set(earthNow.x, earthNow.y, earthNow.z);
  }
}

/** A full orbit sampled over one period centred on the current date. */
export class Orbit {
  constructor({ id, kind = 'geo', periodDays, color, n = 361, earthFixed = false, helio = false }) {
    this.id = id; this.kind = kind; this.period = periodDays;
    this.line = new PathLine({ color, n, earthFixed, helio });
    this.centre = null;
  }
  get object() { return this.line.object; }
  /** Resample when the date has drifted far from the centre (cheap enough every few seconds). */
  update(date) {
    const t = date.getTime();
    const P = this.period * 86400000;
    if (this.centre !== null && Math.abs(t - this.centre) < P / 24) return;
    this.centre = t;
    const n = this.line.n;
    for (let i = 0; i < n; i++) {
      const d = new Date(t + ((i / (n - 1)) - 0.5) * P);
      this.line.write(i, sample(this.kind, this.id, d), 1);
    }
    this.line.commit(n);
  }
}

/** A geocentric trail over the recent past, on a fixed time grid so samples are reused. */
export class Trail {
  constructor({ id, windowDays, color, n = 300 }) {
    this.id = id;
    this.window = windowDays;
    this.n = n;
    this.step = (windowDays * 86400000) / n;
    this.cache = new Map();
    this.line = new PathLine({ color, n: n + 1, fade: true });
    this.lastK = null;
  }
  get object() { return this.line.object; }
  reset() { this.cache.clear(); this.lastK = null; }
  /** sky: the frame's sky state (the "now" vertex uses its geo/earthHelio, no extra cost). */
  update(date, sky) {
    const kNow = Math.floor(date.getTime() / this.step);
    const n = this.n;
    if (kNow !== this.lastK) {
      const k0 = kNow - n + 1;
      for (const k of this.cache.keys()) if (k < k0 || k > kNow) this.cache.delete(k);
      for (let i = 0; i < n; i++) {
        const k = k0 + i;
        let smp = this.cache.get(k);
        if (!smp) {
          smp = sample('geo', this.id, new Date(k * this.step));
          this.cache.set(k, smp);
        }
        this.line.write(i, smp, i / n);
      }
      this.lastK = kNow;
    }
    const b = sky.bodies[this.id];
    this.line.write(n, { geo: b.geo, earth: sky.earthHelio }, 1);
    this.line.commit(n + 1);
  }
}

export const ORBIT_PERIODS = {
  mercury: 87.969, venus: 224.701, earth: 365.256, mars: 686.98, jupiter: 4332.59,
  saturn: 10759.2, uranus: 30688.5, neptune: 60182, pluto: 90560, moon: 27.3217,
};
export const TRAIL_WINDOWS = {
  moon: 27.3, sun: 365.25, mercury: 116, venus: 292, mars: 400, jupiter: 400, saturn: 380,
  uranus: 370, neptune: 367, pluto: 367,
};
