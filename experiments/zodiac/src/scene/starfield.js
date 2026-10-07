// Fixed stars, constellation figures and a faint Milky Way, all at infinity: the group rides
// along with the camera so they never show parallax. World frame (J2000 ecliptic): the stars
// never move in it; only the sign ring (equinox of date) slides across them with precession.

import * as THREE from 'three';
import { raDecToWorld, ZODIAC_CONSTELLATIONS, bvToRgb } from '../astro/index.js';
import { signOrder } from '../content/index.js';

const STAR_R = 50;

const starVert = /* glsl */`
  attribute float mag;
  attribute vec3 tint;
  attribute float phase;
  uniform float uPixelRatio;
  uniform float uDim;
  uniform float uTime;
  uniform float uTwinkle;
  uniform float uScale;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position * ${STAR_R.toFixed(1)}, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = clamp(4.6 - mag * 0.62, 1.1, 6.0) * uScale;
    gl_PointSize = size * uPixelRatio;
    float tw = 1.0 + uTwinkle * 0.18 * sin(uTime * (1.3 + fract(phase * 7.1)) + phase * 6.283);
    vAlpha = clamp(1.25 - mag * 0.15, 0.14, 1.0) * uDim * tw;
    vColor = tint;
  }
`;
const starFrag = /* glsl */`
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.0, d);
    a = a * a;
    gl_FragColor = vec4(vColor * (0.7 + 0.6 * a), a * vAlpha);
    #include <colorspace_fragment>
  }
`;

const mwVert = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const mwFrag = /* glsl */`
  uniform vec3 uPole;
  uniform vec3 uCentre;
  uniform float uDim;
  varying vec3 vDir;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    float n = mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                  mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
    return n;
  }
  void main() {
    float b = asin(clamp(dot(vDir, uPole), -1.0, 1.0));
    float toward = dot(vDir, uCentre) * 0.5 + 0.5;
    float width = 0.13 + 0.1 * toward;
    float band = exp(-pow(b / width, 2.0));
    float n = noise(vDir * 9.0) * 0.6 + noise(vDir * 23.0) * 0.4;
    float dust = smoothstep(0.02, 0.0, abs(b + 0.015)) * 0.5;
    float a = band * (0.35 + 0.9 * n) * (0.5 + 0.8 * toward * toward) * (1.0 - dust);
    gl_FragColor = vec4(vec3(0.62, 0.66, 0.82) * a, 1.0) * 0.085 * uDim;
    #include <colorspace_fragment>
  }
`;

export class Starfield {
  constructor({ pixelRatio, labels }) {
    this.group = new THREE.Group();
    this.group.name = 'starfield';
    this.labels = labels;
    this.uniforms = {
      uPixelRatio: { value: pixelRatio }, uDim: { value: 1 }, uTime: { value: 0 },
      uTwinkle: { value: 1 }, uScale: { value: 1 },
    };
    this.ready = false;
    this.conLabels = [];
    this.highlightCons = new Set();

    // Milky Way
    const pole = raDecToWorld(192.85948, 27.12825);
    const centre = raDecToWorld(266.405, -28.936);
    this.mwMat = new THREE.ShaderMaterial({
      uniforms: { uPole: { value: new THREE.Vector3(pole.x, pole.y, pole.z) }, uCentre: { value: new THREE.Vector3(centre.x, centre.y, centre.z) }, uDim: { value: 1 } },
      vertexShader: mwVert, fragmentShader: mwFrag, side: THREE.BackSide, depthWrite: false, depthTest: false,
      transparent: true, blending: THREE.AdditiveBlending,
    });
    this.milkyWay = new THREE.Mesh(new THREE.SphereGeometry(STAR_R * 1.05, 64, 32), this.mwMat);
    this.milkyWay.renderOrder = -20;
    this.group.add(this.milkyWay);
  }

  build({ stars, constellations }) {
    const n = stars.count;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(stars.positions, 3));
    g.setAttribute('mag', new THREE.BufferAttribute(stars.magnitudes, 1));
    const tint = new Float32Array(n * 3);
    const phase = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const bv = stars.bv[i];
      const c = Number.isNaN(bv) ? { r: 1, g: 1, b: 1 } : bvToRgb(bv);
      // desaturate a little: catalogue colours read too strong on screen
      tint[i * 3] = 0.35 + 0.65 * c.r; tint[i * 3 + 1] = 0.35 + 0.65 * c.g; tint[i * 3 + 2] = 0.35 + 0.65 * c.b;
      phase[i] = (i * 0.618034) % 1;
    }
    g.setAttribute('tint', new THREE.BufferAttribute(tint, 3));
    g.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
    this.starMat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: starVert, fragmentShader: starFrag,
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
    });
    this.stars = new THREE.Points(g, this.starMat);
    this.stars.renderOrder = -10;
    this.stars.frustumCulled = false;
    this.group.add(this.stars);

    // constellation figures: ordinary, ecliptic (13) and highlighted sets
    const plain = [], ecl = [];
    this.conById = {};
    for (const c of constellations) {
      this.conById[c.id] = c;
      (c.ecliptic ? ecl : plain).push(...c.lines);
    }
    const lineGeo = (arr) => {
      const gg = new THREE.BufferGeometry();
      const f = new Float32Array(arr.length);
      for (let i = 0; i < arr.length; i++) f[i] = arr[i] * STAR_R * 0.999;
      gg.setAttribute('position', new THREE.BufferAttribute(f, 3));
      return gg;
    };
    const lm = (color, opacity) => new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: false });
    this.linesPlain = new THREE.LineSegments(lineGeo(plain), lm(0x6f86b8, 0.32));
    this.linesEcl = new THREE.LineSegments(lineGeo(ecl), lm(0xc9a86a, 0.55));
    this.linesPlain.renderOrder = this.linesEcl.renderOrder = -9;
    this.group.add(this.linesPlain, this.linesEcl);
    // highlight overlay (figure + boundary) rebuilt on demand
    this.hlGeo = new THREE.BufferGeometry();
    this.hlLines = new THREE.LineSegments(this.hlGeo, lm(0xffe3a0, 0.9));
    this.hlBounds = new THREE.LineSegments(new THREE.BufferGeometry(), lm(0xffd27a, 0.35));
    this.hlLines.renderOrder = this.hlBounds.renderOrder = -8;
    this.group.add(this.hlLines, this.hlBounds);

    // The 13 ecliptic constellations again, on a shell centred on EARTH just outside the ring,
    // for the outside views: a direction-preserving projection (like an armillary's star band),
    // so the figure behind each sign is the one you would see from Earth.
    this.near = new THREE.Group();
    this.near.name = 'eclipticConstellationShell';
    const unitGeo = (arr) => new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    const nm = (color, opacity) => new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
    this.nearLines = new THREE.LineSegments(unitGeo(ecl), nm(0xd9b77a, 0.6));
    this.nearHl = new THREE.LineSegments(new THREE.BufferGeometry(), nm(0xffe3a0, 0.95));
    this.nearBounds = new THREE.LineSegments(new THREE.BufferGeometry(), nm(0xffd27a, 0.3));
    this.near.add(this.nearLines, this.nearHl, this.nearBounds);

    for (const c of constellations) {
      const lbl = this.labels.add({ cls: `con-name${c.ecliptic ? ' ecl' : ''}`, text: c.name });
      lbl.dir = new THREE.Vector3(c.label.x, c.label.y, c.label.z);
      lbl.con = c;
      this.conLabels.push(lbl);
    }
    this.ready = true;
  }

  setHighlight(ids) {
    const key = [...ids].sort().join(',');
    if (key === this._hlKey || !this.ready) return;
    this._hlKey = key;
    const lines = [], bounds = [];
    for (const id of ids) {
      const c = this.conById[id];
      if (!c) continue;
      for (const v of c.lines) lines.push(v * STAR_R * 0.998);
      for (const v of c.bounds) bounds.push(v * STAR_R * 0.998);
    }
    this.hlLines.geometry.setAttribute('position', new THREE.Float32BufferAttribute(lines, 3));
    this.hlBounds.geometry.setAttribute('position', new THREE.Float32BufferAttribute(bounds, 3));
    const k = 1 / (STAR_R * 0.998);
    this.nearHl.geometry.setAttribute('position', new THREE.Float32BufferAttribute(lines.map((v) => v * k), 3));
    this.nearBounds.geometry.setAttribute('position', new THREE.Float32BufferAttribute(bounds.map((v) => v * k), 3));
    this.highlightCons = new Set(ids);
  }

  /** ctx: {cameraEcl (THREE.Vector3 in world-ecliptic coords), show, dim, time, toWorld(fn), reduced, hlSigns} */
  update(ctx) {
    this.group.position.copy(ctx.cameraEcl);
    this.uniforms.uDim.value = ctx.dim;
    this.uniforms.uTime.value = ctx.time;
    this.uniforms.uTwinkle.value = ctx.reduced ? 0 : 1;
    this.mwMat.uniforms.uDim.value = ctx.dim;
    if (!this.ready) return;
    const on = ctx.showConstellations;
    const nw = ctx.nearWeight ?? 0;
    this.linesPlain.visible = this.linesEcl.visible = on;
    this.linesPlain.material.opacity = (0.32 * ctx.dim + 0.06) * (1 - 0.6 * nw);
    this.linesEcl.material.opacity = (0.55 * ctx.dim + 0.1) * (1 - 0.75 * nw);
    this.near.visible = on && nw > 0.01;
    this.nearLines.material.opacity = 0.6 * nw;
    this.nearHl.material.opacity = 0.95 * nw;
    this.nearBounds.material.opacity = 0.3 * nw;
    // highlight the constellation behind highlighted/hovered signs
    const ids = [];
    for (const sid of ctx.hlSigns) {
      const i = signOrder.indexOf(sid);
      if (i >= 0) ids.push(ZODIAC_CONSTELLATIONS[i]);
    }
    if (ctx.extraCons) ids.push(...ctx.extraCons);
    this.setHighlight(on ? ids : ids.slice(0, 0));
    this.hlLines.visible = this.hlBounds.visible = on && ids.length > 0;
    for (const l of this.conLabels) {
      l.show = on && (l.con.rank <= 2 || l.con.ecliptic || this.highlightCons.has(l.con.id));
      if (!l.show) continue;
      if (l.con.ecliptic && nw > 0.5 && ctx.nearToWorld) ctx.nearToWorld(l.dir, l.pos);
      else ctx.toWorld(l.dir, l.pos);
      l.alpha = this.highlightCons.has(l.con.id) ? 1 : (l.con.ecliptic ? 0.85 : 0.55) * (0.4 + 0.6 * ctx.dim);
      l.el.classList.toggle('hl', this.highlightCons.has(l.con.id));
    }
  }
}
