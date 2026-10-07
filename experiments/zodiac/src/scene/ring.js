// The zodiac ring and everything drawn in its frame (true ecliptic and equinox of date,
// centred on Earth): the engraved sign band (flat ring for the outside views, a band on the
// celestial sphere for the sky view), exact degree ticks, house sectors, sight lines, ring
// markers, the Ascendant/Midheaven marks and aspect chords.
//
// Ring frame: 0 deg Aries on +x, longitude toward +y, ecliptic pole +z, unit radius. The owner
// sets group.position = Earth, group rotation = signRingMatrix(date), group.scale = R.

import * as THREE from 'three';
import { signs, signOrder, planets, aspects as aspectContent } from '../content/index.js';
import { sightLine } from './layout.js';
import {
  makeRingBaseTexture, makeRingLabelTexture, RING_R, BAND_LAT,
} from './textures.js';
import { toggleFor, toggleOn } from '../state.js';

const DEG = Math.PI / 180;
const SEG = 720;
const HOUSE_R = [0.8, 0.985];
const HOUSE_LAT = [-BAND_LAT - 2.6, -BAND_LAT - 0.5];
const GOLD = new THREE.Color('#e9c46f');

const ringVert = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const ringFrag = /* glsl */`
  uniform sampler2D uBase;
  uniform sampler2D uLabels;
  uniform float uLabelsOn;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uHover;
  uniform float uHi[12];
  uniform float uBaseAlpha;
  varying vec2 vUv;
  void main() {
    vec4 base = texture2D(uBase, vUv);
    vec4 lab = texture2D(uLabels, vUv);
    float lon = (1.0 - vUv.x) * 360.0;
    int idx = int(floor(lon / 30.0));
    idx = clamp(idx, 0, 11);
    float hi = uHi[idx];
    vec3 col = base.rgb;
    float la = lab.a * uLabelsOn;
    col = mix(col, lab.rgb * (1.0 + 0.5 * hi), la);
    col += vec3(0.42, 0.29, 0.08) * hi * 0.55 * (1.0 - la);
    if (float(idx) == uHover) col += vec3(0.16, 0.12, 0.05);
    // slow specular sweep, like light moving across brass
    float sh = pow(max(0.0, sin(lon * 0.0174533 - uTime * 0.2)), 60.0) * 0.18;
    col += vec3(1.0, 0.85, 0.55) * sh * la;
    gl_FragColor = vec4(col, uOpacity * mix(uBaseAlpha, 1.0, max(la, hi * 0.5)));
    #include <colorspace_fragment>
  }
`;

const houseFrag = /* glsl */`
  uniform float uCusps[12];
  uniform float uOpacity;
  uniform float uHover;
  uniform float uSel;
  varying vec2 vUv;
  void main() {
    float lon = (1.0 - vUv.x) * 360.0;
    int h = 0;
    for (int i = 0; i < 12; i++) {
      float start = uCusps[i];
      float span = mod(uCusps[(i + 1) % 12] - start + 360.0, 360.0);
      if (mod(lon - start + 360.0, 360.0) < span) { h = i; }
    }
    vec3 a = vec3(0.07, 0.12, 0.26);
    vec3 b = vec3(0.03, 0.05, 0.12);
    vec3 col = (h % 2) == 0 ? a : b;
    float alpha = 0.45;
    if (float(h) == uHover) { col += 0.06; alpha = 0.6; }
    if (float(h) == uSel) { col += 0.1; alpha = 0.7; }
    float edge = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
    gl_FragColor = vec4(col, alpha * uOpacity * (0.55 + 0.45 * edge));
    #include <colorspace_fragment>
  }
`;

function annulus(r0, r1, seg = SEG) {
  const pos = [], uv = [], idx = [];
  for (let k = 0; k <= seg; k++) {
    const t = (k / seg) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    pos.push(r0 * c, r0 * s, 0, r1 * c, r1 * s, 0);
    uv.push(1 - k / seg, 0, 1 - k / seg, 1);
    if (k < seg) {
      const i = 2 * k;
      idx.push(i, i + 2, i + 1, i + 1, i + 2, i + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

function sphereBand(lat0, lat1, seg = SEG, rows = 6) {
  const pos = [], uv = [], idx = [];
  for (let k = 0; k <= seg; k++) {
    const t = (k / seg) * Math.PI * 2;
    for (let j = 0; j <= rows; j++) {
      const b = (lat0 + ((lat1 - lat0) * j) / rows) * DEG;
      pos.push(Math.cos(b) * Math.cos(t), Math.cos(b) * Math.sin(t), Math.sin(b));
      uv.push(1 - k / seg, j / rows);
    }
  }
  const W = rows + 1;
  for (let k = 0; k < seg; k++) {
    for (let j = 0; j < rows; j++) {
      const a = k * W + j, b = (k + 1) * W + j;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// radial position r (flat ring units) -> latitude on the sky band
const rToLat = (r) => -BAND_LAT + ((r - RING_R.inner) / (RING_R.outer - RING_R.inner)) * 2 * BAND_LAT;

/** Point on the flat ring (r) or the sky band (lat from r), blended by s. */
function bandPoint(lonDeg, r, s, out, latOverride = null) {
  const L = lonDeg * DEG;
  const fx = r * Math.cos(L), fy = r * Math.sin(L);
  const lat = (latOverride ?? rToLat(r)) * DEG;
  const sx = Math.cos(lat) * Math.cos(L), sy = Math.cos(lat) * Math.sin(L), sz = Math.sin(lat);
  out[0] = fx + (sx - fx) * s; out[1] = fy + (sy - fy) * s; out[2] = sz * s;
  return out;
}

function tickGeometry(sky) {
  const pos = [];
  const p = [0, 0, 0];
  const push = (lon, r0, r1) => {
    if (sky) {
      bandPoint(lon, r0, 1, p); pos.push(...p);
      bandPoint(lon, r1, 1, p); pos.push(...p);
    } else {
      pos.push(r0 * Math.cos(lon * DEG), r0 * Math.sin(lon * DEG), 0, r1 * Math.cos(lon * DEG), r1 * Math.sin(lon * DEG), 0);
    }
  };
  const o = RING_R.outer, i = RING_R.inner, w = o - i;
  for (let d = 0; d < 360; d++) {
    if (d % 30 === 0) push(d, i, o);
    else if (d % 10 === 0) push(d, o - w * 0.3, o);
    else if (d % 5 === 0) push(d, o - w * 0.2, o);
    else push(d, o - w * 0.11, o);
  }
  // rims
  const rims = [i, o, o - w * 0.22];
  for (const r of rims) {
    for (let k = 0; k < 360; k++) {
      if (sky) {
        bandPoint(k, r, 1, p); pos.push(...p);
        bandPoint(k + 1, r, 1, p); pos.push(...p);
      } else {
        pos.push(r * Math.cos(k * DEG), r * Math.sin(k * DEG), 0, r * Math.cos((k + 1) * DEG), r * Math.sin((k + 1) * DEG), 0);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

function gridGeometry() {
  const pos = [];
  for (const r of [0.25, 0.5, 0.75]) {
    for (let k = 0; k < 360; k += 2) {
      pos.push(r * Math.cos(k * DEG), r * Math.sin(k * DEG), 0, r * Math.cos((k + 2) * DEG), r * Math.sin((k + 2) * DEG), 0);
    }
  }
  for (let k = 0; k < 360; k += 30) {
    pos.push(0.06 * Math.cos(k * DEG), 0.06 * Math.sin(k * DEG), 0, 0.99 * Math.cos(k * DEG), 0.99 * Math.sin(k * DEG), 0);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

/** A dynamic LineSegments with RGBA vertex colours. */
function dynLines(maxSegments, opts = {}) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(maxSegments * 6);
  const col = new Float32Array(maxSegments * 8);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('color', new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage));
  g.setDrawRange(0, 0);
  const m = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, ...opts });
  const lines = new THREE.LineSegments(g, m);
  lines.frustumCulled = false;
  let n = 0;
  return {
    object: lines,
    begin() { n = 0; },
    seg(a, b, c0, a0, c1 = c0, a1 = a0) {
      if (n >= maxSegments) return;
      pos.set(a, n * 6); pos.set(b, n * 6 + 3);
      col[n * 8] = c0.r; col[n * 8 + 1] = c0.g; col[n * 8 + 2] = c0.b; col[n * 8 + 3] = a0;
      col[n * 8 + 4] = c1.r; col[n * 8 + 5] = c1.g; col[n * 8 + 6] = c1.b; col[n * 8 + 7] = a1;
      n++;
    },
    end() {
      g.setDrawRange(0, n * 2);
      g.attributes.position.needsUpdate = true;
      g.attributes.color.needsUpdate = true;
    },
  };
}

const ANGLE_STYLE = {
  ascendant: { label: 'AC', color: planets.ascendant.color },
  midheaven: { label: 'MC', color: planets.midheaven.color },
};

export class ZodiacRing {
  constructor({ renderer, labels, onPickToken, onHoverToken }) {
    this.group = new THREE.Group();
    this.group.name = 'zodiacRing';
    this.labels = labels;

    const base = makeRingBaseTexture(renderer);
    const lab = makeRingLabelTexture(renderer);
    this.uniforms = {
      uBase: { value: base }, uLabels: { value: lab }, uLabelsOn: { value: 1 },
      uOpacity: { value: 0.95 }, uTime: { value: 0 }, uHover: { value: -1 },
      uHi: { value: new Array(12).fill(0) }, uBaseAlpha: { value: 0.9 },
    };
    const mk = () => new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(this.uniforms),
      vertexShader: ringVert, fragmentShader: ringFrag,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    this.flatMat = mk();
    this.skyMat = mk();
    for (const m of [this.flatMat, this.skyMat]) { m.uniforms.uBase.value = base; m.uniforms.uLabels.value = lab; }
    this.skyMat.uniforms.uBaseAlpha.value = 0.5;
    this.flat = new THREE.Mesh(annulus(RING_R.inner, RING_R.outer), this.flatMat);
    this.flat.renderOrder = 2;
    this.sky = new THREE.Mesh(sphereBand(-BAND_LAT, BAND_LAT), this.skyMat);
    this.sky.renderOrder = 2;
    this.group.add(this.flat, this.sky);

    const tickMat = () => new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.8, depthWrite: false });
    this.ticksFlat = new THREE.LineSegments(tickGeometry(false), tickMat());
    this.ticksSky = new THREE.LineSegments(tickGeometry(true), tickMat());
    this.ticksFlat.renderOrder = this.ticksSky.renderOrder = 3;
    this.group.add(this.ticksFlat, this.ticksSky);

    this.grid = new THREE.LineSegments(gridGeometry(), new THREE.LineBasicMaterial({ color: 0x8fa3c8, transparent: true, opacity: 0.07, depthWrite: false }));
    this.group.add(this.grid);

    // houses
    this.cuspArray = new Array(12).fill(0);
    const hm = () => new THREE.ShaderMaterial({
      uniforms: { uCusps: { value: this.cuspArray }, uOpacity: { value: 0 }, uHover: { value: -1 }, uSel: { value: -1 } },
      vertexShader: ringVert, fragmentShader: houseFrag,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    this.housesFlat = new THREE.Mesh(annulus(HOUSE_R[0], HOUSE_R[1], 360), hm());
    this.housesSky = new THREE.Mesh(sphereBand(HOUSE_LAT[0], HOUSE_LAT[1], 360, 2), hm());
    this.housesFlat.renderOrder = this.housesSky.renderOrder = 1;
    this.group.add(this.housesFlat, this.housesSky);
    this.houseNumbers = [];
    for (let i = 0; i < 12; i++) {
      this.houseNumbers.push(labels.add({ cls: 'house-num', text: String(i + 1) }));
    }

    // dynamic line sets
    this.sight = dynLines(64);
    this.marks = dynLines(64);
    this.cusps = dynLines(16);
    this.chords = dynLines(80);
    this.sight.object.renderOrder = 4;
    this.marks.object.renderOrder = 5;
    this.chords.object.renderOrder = 4;
    this.group.add(this.sight.object, this.marks.object, this.cusps.object, this.chords.object);

    // DOM tokens
    this.tokens = {};
    for (const id of Object.keys(planets).filter((k) => k !== 'northNode')) {
      const p = planets[id];
      const isAngle = id === 'ascendant' || id === 'midheaven';
      const glyph = isAngle ? ANGLE_STYLE[id].label : p.glyph;
      this.tokens[id] = labels.add({
        cls: `token${isAngle ? ' angle' : ''}`,
        html: `<span class="g">${glyph}</span>`,
        title: `${p.name} on the zodiac ring`,
        onClick: () => onPickToken?.({ kind: 'body', id }),
        onEnter: () => onHoverToken?.({ kind: 'body', id }),
        onLeave: () => onHoverToken?.(null),
      });
      this.tokens[id].el.style.setProperty('--c', isAngle ? ANGLE_STYLE[id].color : p.color);
    }
    this.ariesLabel = labels.add({ cls: 'aries0', html: `0° <span class="g">${signs.aries.glyph}</span>` });
    this.dscLabel = labels.add({ cls: 'token minor', text: 'DC' });
    this.icLabel = labels.add({ cls: 'token minor', text: 'IC' });
    this.chordLabels = [];
    for (let i = 0; i < 6; i++) this.chordLabels.push(labels.add({ cls: 'chord-lbl', text: '' }));

    this.hi = new Array(12).fill(0);
    this.aspectState = new Map();
    this.colorCache = {};
    this._p = [0, 0, 0]; this._q = [0, 0, 0]; this._o = [0, 0, 0];
    this._v = new THREE.Vector3();
  }

  col(hex) {
    return this.colorCache[hex] ??= new THREE.Color(hex);
  }

  /** World position of a ring-local point. */
  toWorld(arr, out) {
    return out.set(arr[0], arr[1], arr[2]).applyMatrix4(this.group.matrixWorld);
  }

  /**
   * ctx: {state, frame, s (sky blend), dt, time, ringVisible, bodyLocalDist: {id: dist in R units},
   *       visible: Set of ids, hover, selection, highlightBodies: Set, reduced}
   */
  update(ctx) {
    const { state, frame, s, dt, time } = ctx;
    const t = state.toggles;
    const ringOn = toggleOn(t.ring);
    const flatW = (1 - s), skyW = s;
    const ringAlpha = ctx.ringAlpha;
    this.group.visible = ringAlpha > 0.001;
    if (!this.group.visible) {
      for (const tk of Object.values(this.tokens)) tk.show = false;
      for (const h of this.houseNumbers) h.show = false;
      this.ariesLabel.show = this.dscLabel.show = this.icLabel.show = false;
      for (const c of this.chordLabels) c.show = false;
      return;
    }

    // highlight: tour highlight + hover + selection
    const hiSigns = new Set(state.highlight?.signs ?? []);
    if (state.selection?.kind === 'sign') hiSigns.add(state.selection.id);
    const k = 1 - Math.exp(-dt * 8);
    for (let i = 0; i < 12; i++) {
      const target = hiSigns.has(signOrder[i]) ? 1 : 0;
      this.hi[i] += (target - this.hi[i]) * k;
    }
    const hoverSign = ctx.hover?.kind === 'sign' ? signOrder.indexOf(ctx.hover.id) : -1;
    const labelsOn = toggleOn(t.signLabels) ? 1 : 0;
    for (const [m, w] of [[this.flatMat, flatW], [this.skyMat, skyW]]) {
      m.uniforms.uOpacity.value = w * ringAlpha;
      m.uniforms.uLabelsOn.value += (labelsOn - m.uniforms.uLabelsOn.value) * k;
      m.uniforms.uTime.value = ctx.reduced ? 0 : time;
      m.uniforms.uHover.value = hoverSign;
      m.uniforms.uHi.value = this.hi;
    }
    this.flat.visible = flatW * ringAlpha > 0.01;
    this.sky.visible = skyW * ringAlpha > 0.01;
    this.ticksFlat.material.opacity = 0.85 * flatW * ringAlpha;
    this.ticksSky.material.opacity = 0.85 * skyW * ringAlpha;
    this.ticksFlat.visible = this.flat.visible;
    this.ticksSky.visible = this.sky.visible;
    this.grid.material.opacity = 0.07 * flatW * ringAlpha;
    this.grid.visible = flatW > 0.01;

    // ---- houses
    const housesOn = toggleOn(t.houses) ? 1 : 0;
    const cusps = frame.houses.cusps;
    for (let i = 0; i < 12; i++) this.cuspArray[i] = cusps[i];
    this.houseAlpha = (this.houseAlpha ?? 0) + (housesOn * ringAlpha - (this.houseAlpha ?? 0)) * k;
    const hHover = ctx.hover?.kind === 'house' ? Number(ctx.hover.id) - 1 : -1;
    const hSel = state.selection?.kind === 'house' ? Number(state.selection.id) - 1 : -1;
    for (const [mesh, w] of [[this.housesFlat, flatW], [this.housesSky, skyW]]) {
      const u = mesh.material.uniforms;
      u.uOpacity.value = this.houseAlpha * w;
      u.uHover.value = hHover;
      u.uSel.value = hSel;
      mesh.visible = this.houseAlpha * w > 0.01;
    }
    const P = this._p, Q = this._q;
    this.cusps.begin();
    const cuspCol = this.col('#9db7e8');
    for (let i = 0; i < 12; i++) {
      const c = cusps[i];
      const span = ((cusps[(i + 1) % 12] - c) % 360 + 360) % 360;
      const mid = c + span / 2;
      const isAngle = i === 0 || i === 3 || i === 6 || i === 9;
      bandPoint(c, HOUSE_R[0], s, P, HOUSE_LAT[0]);
      bandPoint(c, RING_R.inner, s, Q, BAND_LAT);
      this.cusps.seg(P, Q, cuspCol, this.houseAlpha * (isAngle ? 0.9 : 0.5));
      const hn = this.houseNumbers[i];
      bandPoint(mid, (HOUSE_R[0] + HOUSE_R[1]) / 2, s, P, (HOUSE_LAT[0] + HOUSE_LAT[1]) / 2);
      this.toWorld(P, hn.pos);
      hn.show = this.houseAlpha > 0.05;
      hn.alpha = this.houseAlpha;
    }
    this.cusps.end();

    // ---- sight lines, ring marks, tokens
    const sightToggle = t.sightLines;
    this.sight.begin();
    this.marks.begin();
    const O = [0, 0, 0];
    const tipFlat = [0, 0, 0];
    const tipSky = [0, 0, 0];
    const bodyOn = ctx.visible;
    for (const id of frame.sky.order) {
      const tok = this.tokens[id];
      const b = frame.sky.bodies[id];
      const on = bodyOn.has(id);
      tok.show = on && ringOn;
      if (!on) continue;
      const color = this.col(planets[id].color);
      const hl = ctx.highlightBodies.has(id) || state.selection?.id === id;
      const { tip, foot } = sightLine(b.longitude, b.latitude, RING_R.inner);
      // the body itself in ring-local units
      const bl = ctx.bodyLocal[id];
      const lineOn = toggleFor(sightToggle, id);
      if (lineOn && flatW > 0.01) {
        // Earth -> through the body -> to the ring cylinder (further if the body is beyond)
        const tipLen = Math.hypot(tip[0], tip[1], tip[2]);
        const reach = Math.max(tipLen, bl.dist);
        const f = reach / tipLen;
        tipFlat[0] = tip[0] * f; tipFlat[1] = tip[1] * f; tipFlat[2] = tip[2] * f;
        const a = (hl ? 0.95 : 0.6) * flatW * ringAlpha;
        this.sight.seg(O, tipFlat, color, a * 0.25, color, a);
        if (Math.abs(b.latitude) > 0.05) this.sight.seg(tip, foot, color, a * 0.8);
      }
      if (lineOn && skyW > 0.01) {
        // sky: drop from the body to the ecliptic band
        tipSky[0] = bl.x; tipSky[1] = bl.y; tipSky[2] = bl.z;
        this.sight.seg(tipSky, foot, color, 0.7 * skyW * ringAlpha, color, 0.9 * skyW * ringAlpha);
      }
      // mark across the band at the exact longitude
      bandPoint(b.longitude, RING_R.inner, s, P);
      bandPoint(b.longitude, RING_R.outer, s, Q);
      this.marks.seg(P, Q, color, ringAlpha * (hl ? 1 : 0.9));
      // token just outside the band
      bandPoint(b.longitude, RING_R.outer + 0.065, s, P, -BAND_LAT - 1.8);
      this.toWorld(P, tok.pos);
      tok.alpha = ringAlpha;
      tok.el.classList.toggle('hl', hl);
      tok.el.classList.toggle('retro', b.retrograde);
      tok.el.classList.toggle('hover', ctx.hover?.id === id);
    }
    // angles
    const ang = frame.angles;
    const angleVals = { ascendant: ang.asc, midheaven: ang.mc };
    for (const id of ['ascendant', 'midheaven']) {
      const tok = this.tokens[id];
      const on = bodyOn.has(id);
      tok.show = on && ringOn;
      if (!on) continue;
      const color = this.col(ANGLE_STYLE[id].color);
      const lon = angleVals[id];
      bandPoint(lon, RING_R.inner - 0.05, s, P, -BAND_LAT - 1.0);
      bandPoint(lon, RING_R.outer + 0.03, s, Q, BAND_LAT + 1.0);
      this.marks.seg(P, Q, color, ringAlpha);
      // outside views: just beyond the band; sky view: exactly on the point (so the AC token
      // visibly sits on the horizon and the MC token on the meridian)
      bandPoint(lon, RING_R.outer + 0.07, s, P, 0);
      this.toWorld(P, tok.pos);
      tok.alpha = ringAlpha;
      const hl = ctx.highlightBodies.has(id) || state.selection?.id === id;
      tok.el.classList.toggle('hl', hl);
    }
    const anglesOn = bodyOn.has('ascendant');
    for (const [lbl, lon] of [[this.dscLabel, ang.dsc], [this.icLabel, ang.ic]]) {
      lbl.show = anglesOn && ringOn;
      if (!lbl.show) continue;
      bandPoint(lon, RING_R.inner - 0.03, s, P, -BAND_LAT - 0.6);
      bandPoint(lon, RING_R.outer + 0.02, s, Q, BAND_LAT + 0.6);
      this.marks.seg(P, Q, this.col('#8aa0c0'), ringAlpha * 0.6);
      bandPoint(lon, RING_R.outer + 0.06, s, P, BAND_LAT + 2.0);
      this.toWorld(P, lbl.pos);
      lbl.alpha = ringAlpha * 0.8;
    }
    // 0 deg Aries: the anchor of the whole system
    bandPoint(0, RING_R.inner - 0.06, s, P, -BAND_LAT - 1.4);
    bandPoint(0, RING_R.outer + 0.06, s, Q, BAND_LAT + 1.4);
    this.marks.seg(P, Q, this.col('#fff1c0'), ringAlpha);
    bandPoint(0, RING_R.outer + 0.13, s, P, BAND_LAT + 3.2);
    this.toWorld(P, this.ariesLabel.pos);
    this.ariesLabel.show = ringOn;
    this.ariesLabel.alpha = ringAlpha;
    this.sight.end();
    this.marks.end();

    // ---- aspects
    this.updateAspects(ctx, ringAlpha);
  }

  updateAspects(ctx, ringAlpha) {
    const { state, frame, dt } = ctx;
    const on = toggleOn(state.toggles.aspects);
    const hlPair = state.highlight?.aspect;
    const hlKey = hlPair ? [...hlPair].sort().join('|') : null;
    const selKey = state.selection?.kind === 'aspect' ? state.selection.id : null;
    const P = this._p, Q = this._q;
    const s = ctx.s;
    this.chords.begin();
    const seen = new Set();
    const lonOf = (id) => frame.points[id]?.longitude;
    const k = 1 - Math.exp(-dt * 5);
    let li = 0;
    const visible = ctx.visible;
    const consider = [];
    if (on) {
      for (const a of frame.aspects) {
        if (!visible.has(a.a) || !visible.has(a.b)) continue;
        consider.push(a);
      }
    }
    for (const a of consider) {
      const key = [a.a, a.b].sort().join('|');
      seen.add(key);
      let st = this.aspectState.get(key);
      const signed = a.separation - a.angle;
      if (!st) { st = { alpha: 0, pulse: 0, lastSigned: signed, aspect: a.aspect }; this.aspectState.set(key, st); }
      // exactness crossing -> pulse
      if (st.aspect === a.aspect && Math.sign(signed) !== Math.sign(st.lastSigned) && Math.abs(signed - st.lastSigned) < 5) st.pulse = 1;
      st.lastSigned = signed; st.aspect = a.aspect;
      const tight = 1 - a.orb / a.maxOrb;
      const emph = key === hlKey || key === selKey ? 1 : (hlKey ? 0.4 : 1);
      const target = (0.22 + 0.6 * tight) * emph;
      st.alpha += (target - st.alpha) * k;
      st.pulse = Math.max(0, st.pulse - dt / 1.6);
      const c = this.col(aspectContent[a.aspect].color);
      bandPoint(lonOf(a.a), RING_R.inner, s, P);
      bandPoint(lonOf(a.b), RING_R.inner, s, Q);
      const alpha = Math.min(1, st.alpha + st.pulse * 0.8) * ringAlpha;
      this.chords.seg(P, Q, c, alpha);
      if ((st.pulse > 0.02 || key === hlKey || key === selKey) && li < this.chordLabels.length) {
        const lb = this.chordLabels[li++];
        this._o[0] = (P[0] + Q[0]) / 2; this._o[1] = (P[1] + Q[1]) / 2; this._o[2] = (P[2] + Q[2]) / 2;
        this.toWorld(this._o, lb.pos);
        lb.el.textContent = `${aspectContent[a.aspect].glyph} ${st.pulse > 0.02 ? 'exact' : `${a.separation.toFixed(1)}°`}`;
        lb.el.style.setProperty('--c', aspectContent[a.aspect].color);
        lb.show = true;
        lb.alpha = ringAlpha * Math.max(st.pulse, key === hlKey || key === selKey ? 1 : 0);
      }
    }
    for (const key of [...this.aspectState.keys()]) if (!seen.has(key)) this.aspectState.delete(key);
    // highlighted pair even when not in aspect: show the separation
    if (hlPair && visible.has(hlPair[0]) && visible.has(hlPair[1]) && !seen.has(hlKey) && lonOf(hlPair[0]) !== undefined) {
      bandPoint(lonOf(hlPair[0]), RING_R.inner, s, P);
      bandPoint(lonOf(hlPair[1]), RING_R.inner, s, Q);
      const c = this.col('#f3e3bf');
      this.chords.seg(P, Q, c, 0.55 * ringAlpha);
      if (li < this.chordLabels.length) {
        const lb = this.chordLabels[li++];
        this._o[0] = (P[0] + Q[0]) / 2; this._o[1] = (P[1] + Q[1]) / 2; this._o[2] = (P[2] + Q[2]) / 2;
        this.toWorld(this._o, lb.pos);
        const sep = Math.abs(((lonOf(hlPair[0]) - lonOf(hlPair[1]) + 540) % 360) - 180);
        lb.el.textContent = `${sep.toFixed(1)}° apart`;
        lb.el.style.setProperty('--c', '#f3e3bf');
        lb.show = true; lb.alpha = ringAlpha;
      }
    }
    for (; li < this.chordLabels.length; li++) this.chordLabels[li].show = false;
    this.chords.end();
  }

  /** Pick in ring-local coordinates. Returns {kind:'sign'|'house', id, lon} or null. */
  pickLocal(origin, dir, s, housesOn) {
    if (s > 0.5) {
      const d = dir.clone().normalize();
      const lat = Math.asin(Math.max(-1, Math.min(1, d.z))) / DEG;
      const lon = ((Math.atan2(d.y, d.x) / DEG) + 360) % 360;
      if (Math.abs(lat) <= BAND_LAT + 0.3) return { kind: 'sign', id: signOrder[Math.floor(lon / 30) % 12], lon };
      if (housesOn && lat >= HOUSE_LAT[0] && lat <= HOUSE_LAT[1]) return { kind: 'house', id: this.houseAt(lon), lon };
      return null;
    }
    if (Math.abs(dir.z) < 1e-9) return null;
    const t = -origin.z / dir.z;
    if (t < 0) return null;
    const x = origin.x + dir.x * t, y = origin.y + dir.y * t;
    const r = Math.hypot(x, y);
    const lon = ((Math.atan2(y, x) / DEG) + 360) % 360;
    if (r >= RING_R.inner - 0.005 && r <= RING_R.outer + 0.01) return { kind: 'sign', id: signOrder[Math.floor(lon / 30) % 12], lon };
    if (housesOn && r >= HOUSE_R[0] && r <= HOUSE_R[1]) return { kind: 'house', id: this.houseAt(lon), lon };
    return null;
  }

  houseAt(lon) {
    const c = this.cuspArray;
    for (let i = 0; i < 12; i++) {
      const span = ((c[(i + 1) % 12] - c[i]) % 360 + 360) % 360;
      if (((lon - c[i]) % 360 + 360) % 360 < span) return i + 1;
    }
    return 1;
  }
}
