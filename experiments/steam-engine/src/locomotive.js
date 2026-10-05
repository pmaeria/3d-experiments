// The locomotive "Prometheus": a Victorian 4-4-0 express engine with tender.
// x runs forward, y up, +z is the engine's right-hand side. Dimensions are in
// metres and roughly to scale.

import * as THREE from 'three';
import { G } from './valvegear.js';
import { LIMITS } from './sim.js';
import {
  latheX, latheY, latheZ, cylX, cylY, cylZ, box, merge, at, pipe, arcStrip, rodGeometry, wheelGeometry,
} from './geom.js';
import { linedPanel, nameplate, numberplate, rng, noiseTexture, softSprite } from './textures.js';

export const LAYOUT = {
  boilerY: 2.55, boilerR: 0.72,
  barrel: [-0.6, 3.3],
  smokebox: [3.3, 4.55], smokeboxR: 0.78,
  firebox: [-2.6, -0.6],
  inner: { x: [-2.45, -0.75], y: [1.35, 2.45], z: 0.46 },
  drivers: [G.AX, G.AX - 2.5], driverR: 1.0,
  bogie: [3.7, 4.9], bogieR: 0.45,
  tender: [-4.7, -6.0, -7.3], tenderR: 0.6,
  cylZ: 1.12,
  footY: 1.76,
  chimneyX: 4.0, domeX: 1.3, safetyX: -1.55,
};
const L = LAYOUT;

function wrapperOutline(R = 0.74, half = 0.58, bottom = 1.25) {
  const cy = L.boilerY;
  const a = Math.acos(half / R);
  const pts = [new THREE.Vector2(half, bottom)];
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const t = -a + ((Math.PI + 2 * a) * i) / n;
    pts.push(new THREE.Vector2(Math.cos(t) * R, cy + Math.sin(t) * R));
  }
  pts.push(new THREE.Vector2(-half, bottom));
  return pts;
}

function remapUV(g, x0, x1, y0, y1, ax = 'x', ay = 'y') {
  const p = g.attributes.position, uv = g.attributes.uv;
  const ia = { x: 0, y: 1, z: 2 };
  for (let i = 0; i < p.count; i++) {
    const a = p.array[i * 3 + ia[ax]], b = p.array[i * 3 + ia[ay]];
    uv.setXY(i, (a - x0) / (x1 - x0), (b - y0) / (y1 - y0));
  }
  uv.needsUpdate = true;
}

export class Locomotive {
  constructor({ envMap }) {
    this.group = new THREE.Group();
    this.parts = new Map();        // part id -> [meshes]
    this.anchors = {};             // part id -> world position for labels/tour
    this.anim = {};
    this.emitters = {};
    this.paths = {};
    this.lights = {};
    // cut-away planes: centre-line, and one per cylinder
    this.planes = {
      center: new THREE.Plane(new THREE.Vector3(0, 0, -1), 10),
      right: new THREE.Plane(new THREE.Vector3(0, 0, -1), 10),
      left: new THREE.Plane(new THREE.Vector3(0, 0, 1), 10),
      water: new THREE.Plane(new THREE.Vector3(0, -1, 0), LIMITS.waterNormal),
      tenderWater: new THREE.Plane(new THREE.Vector3(0, -1, 0), 2.4),
    };
    this.cut = 0;
    this.makeMaterials(envMap);
    this.buildFrames();
    this.buildWheels();
    this.buildBoiler();
    this.buildFirebox();
    this.buildSmokebox();
    this.buildFittings();
    this.buildCab();
    this.buildCylinders();
    this.buildMotion();
    this.buildTender();
    this.buildPipework();
    this.buildCutEdges();
    this.group.traverse((o) => {
      if (o.isMesh && o.userData.shadow !== false) { o.castShadow = true; o.receiveShadow = true; }
    });
  }

  // ------------------------------------------------------------------ materials
  makeMaterials(envMap) {
    const std = (o) => new THREE.MeshStandardMaterial({ envMapIntensity: 1, ...o });
    const phys = (o) => new THREE.MeshPhysicalMaterial({ envMapIntensity: 1, ...o });
    const noise = noiseTexture(128);
    noise.repeat.set(3, 3);
    this.noiseTex = noise;
    const M = {
      paint: phys({ color: 0x17442b, roughness: 0.42, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.1 }),
      black: phys({ color: 0x141414, roughness: 0.5, metalness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.35 }),
      smokebox: std({ color: 0x1a1a1a, roughness: 0.62, metalness: 0.35, roughnessMap: noise }),
      red: phys({ color: 0x7c160f, roughness: 0.45, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.15 }),
      brass: std({ color: 0xd9a548, roughness: 0.2, metalness: 1 }),
      copper: std({ color: 0xc8714a, roughness: 0.28, metalness: 1 }),
      steel: std({ color: 0xc7ccd2, roughness: 0.2, metalness: 1 }),
      tyre: std({ color: 0xa9adb3, roughness: 0.38, metalness: 1 }),
      iron: std({ color: 0x2b2b2d, roughness: 0.55, metalness: 0.7 }),
      interior: std({ color: 0x4a3a30, roughness: 0.85, metalness: 0.4, roughnessMap: noise, side: THREE.BackSide }),
      soot: std({ color: 0x2c231d, roughness: 0.95, metalness: 0.1, side: THREE.BackSide }),
      fireCopper: std({ color: 0x7a4026, roughness: 0.75, metalness: 0.5, emissive: 0x0c0301, emissiveIntensity: 1, side: THREE.DoubleSide }),
      brick: std({ color: 0x8a4a2c, roughness: 0.9, emissive: 0x662010, emissiveIntensity: 0.6 }),
      wood: std({ color: 0x5a3018, roughness: 0.7 }),
      coal: std({ color: 0x121212, roughness: 0.42, metalness: 0.3, bumpMap: noise, bumpScale: 2 }),
      glass: phys({ color: 0xbfd6e6, roughness: 0.05, metalness: 0, transmission: 0, transparent: true, opacity: 0.25 }),
      bronze: std({ color: 0xb08040, roughness: 0.35, metalness: 1 }),
      lamp: std({ color: 0xfff1c8, emissive: 0xffd28a, emissiveIntensity: 4 }),
    };
    M.paintEdge = M.paint;
    this.M = M;
    this._clipCache = new Map();
  }

  // a clipped variant of a material (cached)
  C(mat, which = 'center', extra = null) {
    const key = mat.uuid + which + (extra ? extra.map((p) => p.uuid ?? '').join() : '');
    if (this._clipCache.has(key)) return this._clipCache.get(key);
    const m = mat.clone();
    m.clippingPlanes = [this.planes[which], ...(extra || [])];
    m.clipShadows = true;
    if (m.side === THREE.FrontSide && !m.userData.keepSide) m.side = THREE.FrontSide;
    this._clipCache.set(key, m);
    return m;
  }

  add(geo, mat, part, parent = this.group) {
    const m = new THREE.Mesh(geo, mat);
    m.userData.part = part;
    parent.add(m);
    if (part) {
      if (!this.parts.has(part)) this.parts.set(part, []);
      this.parts.get(part).push(m);
    }
    return m;
  }

  // outer painted surface plus a dark inner wall, both cut by the same plane
  shell(geo, mat, part, which = 'center', inner = this.M.interior, parent = this.group) {
    const o = this.add(geo, this.C(mat, which), part, parent);
    const i = this.add(geo, this.C(inner, which), part, parent);
    i.userData.shadow = false;
    return [o, i];
  }

  // ------------------------------------------------------------------ frames
  buildFrames() {
    const M = this.M;
    const fy = L.footY;
    // main plate frames
    for (const s of [1, -1]) {
      const g = box(8.95, 0.92, 0.035);
      at(g, 0.85, 1.16, s * 0.62);
      this.add(g, M.red, 'frames');
    }
    // running boards: outer strip continuous, inner strip broken for the drivers
    const strips = [];
    for (const s of [1, -1]) {
      strips.push(at(box(8.9, 0.04, 0.5), 0.85, fy - 0.02, s * 1.13));
      for (const [x0, x1] of [[-3.6, -2.22], [-0.78, 0.28], [1.72, 5.3]]) {
        strips.push(at(box(x1 - x0, 0.04, 0.28), (x0 + x1) / 2, fy - 0.02, s * 0.75));
      }
    }
    this.add(merge(strips), M.black, 'frames');
    // valance with polished brass edge
    for (const s of [1, -1]) {
      this.add(at(box(8.9, 0.16, 0.025), 0.85, fy - 0.1, s * 1.385), M.paint, 'frames');
      this.add(at(cylX(0.014, 8.9, 10), 0.85, fy + 0.005, s * 1.39), M.brass, 'frames');
    }
    // front buffer beam & buffers, rear drag beam
    this.add(at(box(0.12, 0.5, 2.8), 5.36, 1.3, 0), M.red, 'frames');
    this.add(at(box(0.12, 0.42, 2.6), -3.66, 1.42, 0), M.red, 'frames');
    for (const s of [1, -1]) {
      const stock = latheX([[0.001, 5.42], [0.13, 5.42], [0.13, 5.46], [0.085, 5.52], [0.075, 5.62], [0.001, 5.62]], 24);
      this.add(at(stock, 0, 1.3, s * 0.88), M.black, 'frames');
      const rod = cylX(0.045, 0.2, 16); at(rod, 5.68, 1.3, s * 0.88);
      this.add(rod, M.steel, 'frames');
      const head = latheX([[0.001, 5.74], [0.2, 5.74], [0.2, 5.77], [0.17, 5.8], [0.001, 5.81]], 32);
      this.add(at(head, 0, 1.3, s * 0.88), M.steel, 'frames');
    }
    // coupling hook
    this.add(at(box(0.3, 0.06, 0.05), 5.55, 1.3, 0), M.iron, 'frames');
    // head lamps (oil lamps on the buffer beam and smokebox)
    const lamp = (x, y, z) => {
      const body = latheY([[0.001, 0], [0.1, 0], [0.11, 0.05], [0.1, 0.24], [0.06, 0.3], [0.03, 0.34], [0.001, 0.36]], 20);
      this.add(at(body, x, y, z), M.black, 'frames');
      const lens = cylX(0.07, 0.03, 20); at(lens, x + 0.1, y + 0.13, z);
      this.add(lens, M.lamp, 'frames');
    };
    lamp(5.32, 1.55, 0.55); lamp(5.32, 1.55, -0.55);
    // guard irons & sand boxes
    for (const s of [1, -1]) {
      this.add(at(box(0.05, 0.6, 0.04), 5.2, 0.55, s * 0.75), M.black, 'frames');
      const sand = latheY([[0.001, 0], [0.13, 0], [0.13, 0.22], [0.1, 0.26], [0.04, 0.27], [0.04, 0.32], [0.001, 0.32]], 24);
      this.add(at(sand, 2.15, fy, s * 0.95), this.C(M.paint), 'frames');
      this.add(at(cylY(0.045, 0.03, 20), 2.15, fy + 0.33, s * 0.95), this.C(M.brass), 'frames');
    }
    // handrails along the boiler on brass stanchions
    for (const s of [1, -1]) {
      this.add(at(cylX(0.016, 4.9, 10), 1.1, L.boilerY + 0.42, s * 0.84), this.C(M.steel), 'boiler');
      for (const x of [-0.4, 0.6, 1.8, 2.6, 3.4]) {
        const st = cylZ(0.012, 0.16, 8); at(st, x, L.boilerY + 0.42, s * 0.77);
        this.add(st, this.C(M.brass), 'boiler');
        this.add(at(new THREE.SphereGeometry(0.03, 12, 10), x, L.boilerY + 0.42, s * 0.84), this.C(M.brass), 'boiler');
      }
    }
    this.anchors.frames = new THREE.Vector3(-0.25, 1.2, 1.4);
  }

  // ------------------------------------------------------------------ wheels
  buildWheels() {
    const M = this.M;
    this.anim.wheels = [];
    const makeSet = (x, R, spokes, hubR, crank, balance, part, axleY = R) => {
      for (const s of [1, -1]) {
        const geo = wheelGeometry({ R, spokes, hubR, inner: -s, crankR: crank ? G.R : 0, balance });
        const g = new THREE.Group();
        g.position.set(x, axleY, s * 0.75);
        this.add(geo.paint, M.paint, part, g);
        this.add(geo.steel, M.tyre, part, g);
        this.group.add(g);
        this.anim.wheels.push({ g, R, side: s, crank, x });
      }
      const ax = cylZ(0.085, 1.5, 16); at(ax, x, axleY, 0);
      this.add(ax, M.iron, part);
    };
    for (const x of L.drivers) makeSet(x, L.driverR, 20, 0.2, true, true, 'drivers');
    for (const x of L.bogie) makeSet(x, L.bogieR, 12, 0.11, false, false, 'bogie');
    for (const x of L.tender) makeSet(x, L.tenderR, 12, 0.13, false, false, 'tender');
    // bogie frame & pivot
    const bogieX = (L.bogie[0] + L.bogie[1]) / 2;
    for (const s of [1, -1]) {
      this.add(at(box(1.9, 0.22, 0.05), bogieX, 0.52, s * 0.55), M.black, 'bogie');
      for (const x of L.bogie) this.add(at(box(0.26, 0.3, 0.12), x, 0.48, s * 0.55), M.iron, 'bogie');
      // equalising spring
      for (let k = 0; k < 6; k++) this.add(at(box(0.9 - k * 0.12, 0.022, 0.1), bogieX, 0.72 + k * 0.024, s * 0.55), M.iron, 'bogie');
    }
    this.add(at(box(0.5, 0.18, 1.1), bogieX, 0.68, 0), M.black, 'bogie');
    this.add(at(cylY(0.22, 0.14, 24), bogieX, 0.82, 0), M.iron, 'bogie');
    // splashers over the driving wheels with brass beading
    const fy = L.footY;
    const a = Math.asin((fy - G.AY) / 1.1);
    for (const x of L.drivers) for (const s of [1, -1]) {
      const top = new THREE.CylinderGeometry(1.1, 1.1, 0.28, 48, 1, true, Math.PI / 2 + a, Math.PI - 2 * a);
      top.rotateX(Math.PI / 2);
      at(top, x, G.AY, s * 0.76);
      this.add(top, this.C(this.M.paint), 'splasher');
      // flat face
      const sh = new THREE.Shape();
      const w = Math.cos(a) * 1.1;
      sh.moveTo(-w, fy - G.AY);
      sh.absarc(0, 0, 1.1, a, Math.PI - a, false);
      const face = new THREE.ShapeGeometry(sh, 32);
      if (s < 0) face.rotateY(Math.PI);
      at(face, x, G.AY, s * 0.9);
      this.add(face, this.C(M.paint), 'splasher');
      const bead = new THREE.TorusGeometry(1.1, 0.014, 8, 48, Math.PI - 2 * a);
      bead.rotateZ(a);
      at(bead, x, G.AY, s * 0.9);
      this.add(bead, this.C(M.brass), 'splasher');
    }
    // curved brass nameplate on the leading splashers
    const npTex = nameplate('PROMETHEUS');
    const npMat = new THREE.MeshStandardMaterial({ map: npTex, metalness: 0.6, roughness: 0.35, envMapIntensity: 1.2 });
    for (const s of [1, -1]) {
      const g = arcStrip(0.9, 1.05, a + 0.22, Math.PI - a - 0.22, 40);
      if (s < 0) { g.rotateY(Math.PI); }
      at(g, L.drivers[0], G.AY, s * 0.905);
      // left side reads correctly when mirrored UVs are flipped
      if (s < 0) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i)); }
      this.add(g, this.C(npMat), 'nameplate');
    }
    this.anchors.drivers = new THREE.Vector3(L.drivers[1], 1.0, 1.0);
    this.anchors.bogie = new THREE.Vector3(bogieX, 0.5, 1.0);
    this.anchors.nameplate = new THREE.Vector3(L.drivers[0], 1.95, 0.95);
  }

  // ------------------------------------------------------------------ boiler
  buildBoiler() {
    const M = this.M;
    const [x0, x1] = L.barrel;
    const len = x1 - x0;
    const barrel = cylX(L.boilerR, len, 72, true);
    at(barrel, (x0 + x1) / 2, L.boilerY, 0);
    this.shell(barrel, M.paint, 'boiler');
    // brass boiler bands
    for (const x of [-0.45, 0.5, 2.1, 2.9]) {
      const t = new THREE.TorusGeometry(L.boilerR + 0.004, 0.014, 8, 72);
      t.rotateY(Math.PI / 2); at(t, x, L.boilerY, 0);
      this.add(t, this.C(M.brass), 'boiler');
    }
    // front tube plate (in the smokebox)
    const tp = new THREE.CircleGeometry(L.boilerR - 0.005, 48); tp.rotateY(Math.PI / 2); at(tp, x1, L.boilerY, 0);
    this.add(tp, this.C(M.iron), 'boiler');

    // fire tubes — they glow where the furnace gases enter them
    const tubes = [];
    const sp = 0.088;
    for (let row = 0; row < 12; row++) {
      const y = 1.96 + row * sp * 0.866;
      for (let col = -8; col <= 8; col++) {
        const z = col * sp + (row % 2 ? sp / 2 : 0);
        if (Math.abs(z) > 0.42) continue;
        if (Math.hypot(z, y - L.boilerY) > 0.6) continue;
        if (y > 2.4) continue;
        tubes.push([y, z]);
      }
    }
    this.tubeCount = tubes.length;
    const tlen = x1 - L.inner.x[1];
    const tg = new THREE.CylinderGeometry(0.026, 0.026, tlen, 12, 1, true);
    tg.rotateZ(-Math.PI / 2);
    const grad = document.createElement('canvas'); grad.width = 4; grad.height = 256;
    const gx = grad.getContext('2d');
    const gg = gx.createLinearGradient(0, 256, 0, 0);
    gg.addColorStop(0, '#ffd8a0'); gg.addColorStop(0.08, '#ff8a30'); gg.addColorStop(0.3, '#6a1804'); gg.addColorStop(0.6, '#140300'); gg.addColorStop(1, '#000000');
    gx.fillStyle = gg; gx.fillRect(0, 0, 4, 256);
    const gt = new THREE.CanvasTexture(grad);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x6b5a4c, roughness: 0.5, metalness: 0.7, emissive: 0xff6a20, emissiveMap: gt, emissiveIntensity: 1.5, side: THREE.DoubleSide,
    });
    const im = new THREE.InstancedMesh(tg, this.C(tubeMat), tubes.length);
    const m4 = new THREE.Matrix4();
    tubes.forEach(([y, z], i) => { m4.makeTranslation((L.inner.x[1] + x1) / 2, y, z); im.setMatrixAt(i, m4); });
    im.userData.part = 'tubes';
    this.group.add(im);
    this.parts.set('tubes', [im]);
    this.anim.tubeMat = this.C(tubeMat);
    this.tubes = tubes;

    // water: translucent body cut at the water level, plus a rippling surface
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1d6fc4, roughness: 0.15, metalness: 0.0, transparent: true, opacity: 0.4,
      emissive: 0x0b4f9a, emissiveIntensity: 0.9, depthWrite: false, side: THREE.DoubleSide,
    });
    const wm = this.C(waterMat, 'center', [this.planes.water]);
    const waters = [];
    const wb = cylX(L.boilerR - 0.02, len, 48, false); at(wb, (x0 + x1) / 2, L.boilerY, 0); waters.push(wb);
    const [fx0, fx1] = L.firebox; const I = L.inner;
    waters.push(at(box(fx1 - fx0 - 0.04, 3.27 - I.y[1], 1.12), (fx0 + fx1) / 2, (I.y[1] + 3.27) / 2 + 0.005, 0)); // over the crown
    for (const s of [1, -1]) waters.push(at(box(fx1 - fx0 - 0.04, I.y[1] - 1.29, 0.09), (fx0 + fx1) / 2, (I.y[1] + 1.29) / 2, s * 0.515));
    waters.push(at(box(0.11, I.y[1] - 1.29, 0.92), fx0 + 0.08, (I.y[1] + 1.29) / 2, 0));
    waters.push(at(box(0.13, L.boilerY - L.boilerR - 1.29 + 0.02, 0.92), I.x[1] + 0.07, (1.29 + L.boilerY - L.boilerR) / 2 + 0.01, 0));
    const water = this.add(merge(waters), wm, 'water');
    water.renderOrder = 2; water.userData.shadow = false;
    const surfMat = new THREE.MeshStandardMaterial({
      color: 0x8fd0ff, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.55,
      emissive: 0x1a5a8a, emissiveIntensity: 0.6, bumpMap: this.noiseTex, bumpScale: 0.6, depthWrite: false, side: THREE.DoubleSide,
    });
    const surf = this.add(new THREE.PlaneGeometry(1, 1, 1, 1).rotateX(-Math.PI / 2), this.C(surfMat), 'water');
    surf.renderOrder = 3; surf.userData.shadow = false;
    this.anim.waterSurf = surf; this.anim.waterSurfMat = this.C(surfMat);
    this.anchors.water = new THREE.Vector3(0.6, 2.7, 0.2);
    this.anchors.boiler = new THREE.Vector3(1.9, 3.2, 0.5);
    this.anchors.tubes = new THREE.Vector3(1.6, 2.1, 0.1);

    // bubbles rising through the water (rendered as points, spawned on the far half)
    const n = 500;
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const bm = new THREE.PointsMaterial({ color: 0xcfeaff, size: 0.028, map: softSprite(), transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
    const bp = new THREE.Points(bg, bm);
    bp.frustumCulled = false;
    this.group.add(bp);
    this.anim.bubbles = { pts: bp, n, data: new Float32Array(n * 4), rand: rng(42) };
    for (let i = 0; i < n; i++) this.resetBubble(i, true);
  }

  resetBubble(i, initial = false) {
    const B = this.anim.bubbles; const r = B.rand; const d = B.data;
    // x, y, z, speed
    let x, y, z;
    if (r() < 0.35) { // off the firebox walls
      x = L.inner.x[0] + r() * (L.inner.x[1] - L.inner.x[0]);
      z = (r() < 0.5 ? 0.49 : -0.49) * 1; y = 1.4 + r() * 1.0;
      if (r() < 0.4) { z = (r() - 0.5) * 0.9; y = L.inner.y[1] + 0.02; }
    } else { // off the tubes
      const t = this.tubes[(r() * this.tubes.length) | 0];
      x = L.inner.x[1] + r() * 3.9 * Math.pow(r(), 0.6);
      y = t[0] + 0.03; z = t[1];
    }
    d[i * 4] = x; d[i * 4 + 1] = initial ? y + r() * 0.3 : y; d[i * 4 + 2] = z; d[i * 4 + 3] = 0.2 + r() * 0.4;
  }

  // ------------------------------------------------------------------ firebox
  buildFirebox() {
    const M = this.M;
    const [fx0, fx1] = L.firebox;
    const flen = fx1 - fx0;
    const outer = new THREE.Shape(wrapperOutline(0.74, 0.58, 1.25));
    outer.holes.push(new THREE.Path(wrapperOutline(0.72, 0.56, 1.27).reverse()));
    const wrap = new THREE.ExtrudeGeometry(outer, { depth: flen, bevelEnabled: false, curveSegments: 32 });
    wrap.rotateY(-Math.PI / 2); at(wrap, fx1, 0, 0);
    this.add(wrap, this.C(M.paint), 'firebox');
    // inner faces of the wrapper (dark), as back faces of a slightly smaller shell
    const innerShell = new THREE.ExtrudeGeometry(new THREE.Shape(wrapperOutline(0.72, 0.56, 1.27)), { depth: flen, bevelEnabled: false, curveSegments: 32 });
    innerShell.rotateY(-Math.PI / 2); at(innerShell, fx1, 0, 0);
    this.add(innerShell, this.C(M.interior), 'firebox').userData.shadow = false;
    // backhead in the cab with the firehole
    const bh = new THREE.Shape(wrapperOutline(0.74, 0.58, 1.25));
    bh.holes.push(new THREE.Path().absarc(0, 2.0, 0.19, 0, Math.PI * 2, true));
    const bhg = new THREE.ShapeGeometry(bh, 32); bhg.rotateY(-Math.PI / 2); at(bhg, fx0, 0, 0);
    this.add(bhg, this.C(new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide })), 'backhead');
    // throat plate around the barrel
    const th = new THREE.Shape(wrapperOutline(0.74, 0.58, 1.25));
    th.holes.push(new THREE.Path().absarc(0, L.boilerY, L.boilerR, 0, Math.PI * 2, true));
    const thg = new THREE.ShapeGeometry(th, 48); thg.rotateY(Math.PI / 2); at(thg, fx1, 0, 0);
    this.add(thg, this.C(M.paint.clone()), 'firebox').material.side = THREE.DoubleSide;
    // brass band where the firebox meets the barrel
    const bandG = new THREE.TorusGeometry(0.745, 0.016, 8, 64, Math.PI + 2 * Math.acos(0.58 / 0.74));
    bandG.rotateZ(-Math.acos(0.58 / 0.74)); bandG.rotateY(Math.PI / 2); at(bandG, fx1 - 0.01, L.boilerY, 0);
    this.add(bandG, this.C(M.brass), 'firebox');

    // the inner copper firebox: five plates, open at the bottom over the grate
    const I = L.inner;
    const iw = I.x[1] - I.x[0], ih = I.y[1] - I.y[0], iz = I.z * 2;
    const cx = (I.x[0] + I.x[1]) / 2, cy = (I.y[0] + I.y[1]) / 2;
    const fc = this.C(M.fireCopper);
    this.add(at(new THREE.PlaneGeometry(iw, iz).rotateX(-Math.PI / 2), cx, I.y[1], 0), fc, 'firebox');
    for (const s of [1, -1]) this.add(at(new THREE.PlaneGeometry(iw, ih), cx, cy, s * I.z), fc, 'firebox');
    // tube plate with dark tube mouths
    const tps = new THREE.Shape(); tps.moveTo(-I.z, I.y[0]); tps.lineTo(I.z, I.y[0]); tps.lineTo(I.z, I.y[1]); tps.lineTo(-I.z, I.y[1]); tps.closePath();
    for (const [y, z] of this.tubes) tps.holes.push(new THREE.Path().absarc(z, y, 0.026, 0, Math.PI * 2, true));
    const tpg = new THREE.ShapeGeometry(tps, 8); tpg.rotateY(Math.PI / 2); at(tpg, I.x[1], 0, 0);
    this.add(tpg, fc, 'firebox');
    const bps = new THREE.Shape(); bps.moveTo(-I.z, I.y[0]); bps.lineTo(I.z, I.y[0]); bps.lineTo(I.z, I.y[1]); bps.lineTo(-I.z, I.y[1]); bps.closePath();
    bps.holes.push(new THREE.Path().absarc(0, 2.0, 0.19, 0, Math.PI * 2, true));
    const bpg = new THREE.ShapeGeometry(bps, 24); bpg.rotateY(Math.PI / 2); at(bpg, I.x[0], 0, 0);
    this.add(bpg, fc, 'firebox');
    // crown stays
    const stays = [];
    for (let i = 0; i < 9; i++) for (let j = -2; j <= 2; j++) stays.push(at(cylY(0.016, 0.3, 6), I.x[0] + 0.12 + i * 0.18, I.y[1] + 0.15, j * 0.17));
    this.add(merge(stays), this.C(M.copper), 'firebox');
    // brick arch: deflects flames so they burn fully before the tubes
    const arch = box(0.95, 0.07, iz - 0.02);
    arch.rotateZ(-0.32);
    at(arch, I.x[1] - 0.45, 1.86, 0);
    this.add(arch, this.C(M.brick), 'brickarch');
    this.anchors.brickarch = new THREE.Vector3(I.x[1] - 0.45, 1.86, 0.2);

    // grate bars and ashpan
    const bars = [];
    for (let i = 0; i < 16; i++) bars.push(at(box(iw - 0.04, 0.05, 0.022), cx, I.y[0] + 0.02, -I.z + 0.03 + i * ((iz - 0.06) / 15)));
    this.add(merge(bars), M.iron, 'grate');
    this.add(at(box(iw, 0.04, iz), cx, 1.08, 0), M.iron, 'grate');
    for (const s of [1, -1]) this.add(at(box(iw, 0.26, 0.03), cx, 1.2, s * I.z), M.iron, 'grate');

    // coal bed: lumps with a heat-glow shader
    const lumps = 190;
    const lg = new THREE.IcosahedronGeometry(0.06, 0);
    const coalMat = new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.7, metalness: 0.1, emissive: 0xff5a10, emissiveIntensity: 1 });
    coalMat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = { value: 0 }; sh.uniforms.uHeat = { value: 1 };
      coalMat.userData.shader = sh;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vSeed;\nvarying vec3 vLocal;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSeed = float(gl_InstanceID) * 0.6180339;\nvLocal = position;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uHeat; varying float vSeed; varying vec3 vLocal;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float fl = 0.55 + 0.45 * sin(uTime * (2.0 + fract(vSeed*7.0)*3.0) + vSeed * 40.0);
          float crack = smoothstep(0.2, 0.9, fract(sin(dot(vLocal.xy*31.0 + vSeed, vec2(12.9898,78.233))) * 43758.5453));
          float core = mix(0.25, 1.0, crack) * fl;
          vec3 hot = mix(vec3(0.6,0.08,0.0), vec3(1.0,0.75,0.35), core * uHeat);
          totalEmissiveRadiance = hot * core * uHeat * 1.4;`);
    };
    const coal = new THREE.InstancedMesh(lg, coalMat, lumps);
    const r = rng(9);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    this.anim.coalBase = [];
    for (let i = 0; i < lumps; i++) {
      p.set(I.x[0] + 0.05 + r() * (iw - 0.1), I.y[0] + 0.06 + r() * 0.12, (r() - 0.5) * (iz - 0.08));
      e.set(r() * 6, r() * 6, r() * 6); q.setFromEuler(e);
      const k = 0.6 + r() * 0.8; sc.set(k, k * (0.6 + r() * 0.5), k);
      m4.compose(p, q, sc); coal.setMatrixAt(i, m4);
    }
    coal.userData.part = 'grate';
    this.group.add(coal);
    this.parts.get('grate').push(coal);
    this.anim.coalMat = coalMat;

    // flames: additive billboards driven by a noise shader
    const flameMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uNoise: { value: this.noiseTex }, uHeat: { value: 1 }, uDraught: { value: 0.5 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uTime, uHeat, uDraught; uniform sampler2D uNoise; varying vec2 vUv;
        void main(){
          vec2 uv = vUv;
          float speed = 0.6 + uDraught * 1.6;
          float n1 = texture2D(uNoise, vec2(uv.x * 1.3 + uv.y * 0.3 * uDraught, uv.y * 0.9 - uTime * speed)).r;
          float n2 = texture2D(uNoise, vec2(uv.x * 2.7 - 0.3, uv.y * 1.7 - uTime * speed * 1.7)).r;
          float n = n1 * 0.6 + n2 * 0.4;
          float shape = (1.0 - uv.y) * smoothstep(0.0, 0.25, uv.x) * smoothstep(1.0, 0.75, uv.x);
          float f = smoothstep(0.25, 0.9, n * shape * 1.9 + (1.0-uv.y)*0.25 - 0.1);
          vec3 col = mix(vec3(1.0,0.25,0.02), vec3(1.0,0.85,0.45), f);
          col = mix(col, vec3(0.75,0.85,1.0), smoothstep(0.85,1.0,f) * 0.4);
          gl_FragColor = vec4(col * f * uHeat * 0.75, f * uHeat);
        }`,
    });
    this.anim.flameMat = flameMat;
    this.anim.flames = [];
    for (let i = 0; i < 7; i++) {
      const pl = new THREE.PlaneGeometry(0.75, 0.75);
      pl.translate(0, 0.375, 0);
      const f = new THREE.Mesh(pl, flameMat);
      f.position.set(I.x[0] + 0.2 + i * 0.22, I.y[0] + 0.12, (i % 3 - 1) * 0.18);
      f.userData.base = f.position.clone();
      f.userData.shadow = false;
      f.renderOrder = 4;
      this.group.add(f);
      this.anim.flames.push(f);
    }
    // firelight
    const fl = new THREE.PointLight(0xff7a2a, 6, 3.5, 1.6);
    fl.position.set(cx, 1.75, 0);
    this.group.add(fl);
    this.lights.fire = fl;
    this.anchors.firebox = new THREE.Vector3(-1.6, 1.85, 0.35);
    this.anchors.grate = new THREE.Vector3(-1.8, 1.45, 0.3);
  }

  // ------------------------------------------------------------------ smokebox
  buildSmokebox() {
    const M = this.M;
    const [x0, x1] = L.smokebox;
    const sb = cylX(L.smokeboxR, x1 - x0, 64, true);
    at(sb, (x0 + x1) / 2, L.boilerY, 0);
    this.shell(sb, M.smokebox, 'smokebox', 'center', M.soot);
    // rear ring joining the barrel
    const ring = new THREE.RingGeometry(L.boilerR, L.smokeboxR, 64); ring.rotateY(-Math.PI / 2); at(ring, x0, L.boilerY, 0);
    this.add(ring, this.C(M.smokebox.clone()), 'smokebox').material.side = THREE.DoubleSide;
    // front ring & dished door
    const fr = latheX([[L.smokeboxR + 0.02, x1 - 0.02], [L.smokeboxR + 0.02, x1 + 0.03], [L.smokeboxR - 0.04, x1 + 0.05], [0.001, x1 + 0.05]], 64);
    at(fr, 0, L.boilerY, 0);
    const door = latheX([[0.66, x1 + 0.05], [0.6, x1 + 0.12], [0.42, x1 + 0.17], [0.001, x1 + 0.19]], 64);
    at(door, 0, L.boilerY, 0);
    this.add(fr, this.C(M.smokebox.clone()), 'smokebox').material.side = THREE.DoubleSide;
    this.add(door, this.C(M.black.clone()), 'smokebox').material.side = THREE.DoubleSide;
    // door dart handle, hinge straps
    const hub = cylX(0.05, 0.08, 16); at(hub, x1 + 0.22, L.boilerY, 0); this.add(hub, M.steel, 'smokebox');
    for (const a of [0, Math.PI / 2]) {
      const h = box(0.03, 0.03, 0.28); h.rotateX(a); at(h, x1 + 0.27, L.boilerY, 0);
      this.add(h, this.C(M.steel), 'smokebox');
    }
    for (const y of [-0.38, 0.38]) this.add(at(box(0.03, 0.06, 1.2), x1 + 0.14 + Math.abs(y) * -0.08, L.boilerY + y, 0.2), this.C(M.steel), 'smokebox');
    // smokebox saddle down to the cylinders
    this.add(at(box(0.95, 0.6, 1.24), 4.35, 1.62, 0), this.C(M.black.clone()), 'smokebox').material.side = THREE.DoubleSide;
    // chimney: lathed, hollow, cut with the boiler
    const cx = L.chimneyX, base = L.boilerY + 0.62;
    const prof = [[0.42, 0], [0.36, 0.06], [0.28, 0.14], [0.235, 0.24], [0.215, 0.4], [0.21, 0.82], [0.215, 0.86]];
    this.profiles = { ...(this.profiles || {}), chimney: [prof, cx, base] };
    const ch = latheY(prof, 48); at(ch, cx, base, 0);
    this.shell(ch, M.black, 'chimney', 'center', M.soot);
    const capP = [[0.205, 0.8], [0.25, 0.86], [0.29, 0.95], [0.305, 1.0], [0.3, 1.04], [0.26, 1.05], [0.2, 1.03]];
    this.profiles.cap = [capP, cx, base];
    const cap = latheY(capP, 48); at(cap, cx, base, 0);
    this.shell(cap, M.copper, 'chimney', 'center', M.soot);
    this.emitters.chimney = new THREE.Vector3(cx, base + 1.05, 0);
    // blastpipe and petticoat inside the smokebox
    const bp = latheY([[0.13, 0], [0.12, 0.3], [0.09, 0.6], [0.07, 0.78], [0.075, 0.82], [0.001, 0.82]], 24);
    at(bp, cx, 1.9, 0);
    this.add(bp, M.iron, 'blastpipe');
    const pc = latheY([[0.32, 0], [0.22, 0.2], [0.2, 0.3]], 32); at(pc, cx, base - 0.38, 0);
    const pcm = M.iron.clone(); pcm.side = THREE.DoubleSide;
    this.add(pc, this.C(pcm), 'blastpipe');
    this.anchors.smokebox = new THREE.Vector3(3.9, 2.55, 0.8);
    this.anchors.chimney = new THREE.Vector3(cx, base + 0.95, 0.25);
    this.anchors.blastpipe = new THREE.Vector3(cx, 2.55, 0.05);
  }

  // ------------------------------------------------------------------ dome, safety valves, whistle
  buildFittings() {
    const M = this.M;
    const top = L.boilerY + L.boilerR;
    // polished brass dome
    const dprof = [[0.46, -0.2], [0.44, -0.02], [0.4, 0.02], [0.35, 0.06], [0.33, 0.12], [0.33, 0.3], [0.32, 0.38], [0.27, 0.46], [0.17, 0.52], [0.06, 0.545], [0.001, 0.55]];
    this.profiles.dome = [dprof.filter(([, y]) => y > -0.03), L.domeX, top - 0.05];
    const dome = latheY(dprof, 64); at(dome, L.domeX, top - 0.05, 0);
    this.shell(dome, M.brass, 'dome', 'center', M.interior);
    // regulator inside the dome: standpipe + sliding valve head
    const sp = cylY(0.07, 0.42, 20); at(sp, L.domeX, top - 0.08, 0);
    this.add(sp, M.iron, 'regulator');
    const head = box(0.2, 0.06, 0.2); at(head, L.domeX, top + 0.14, 0);
    const valve = this.add(head, M.bronze, 'regulator');
    this.anim.regHead = valve;
    const port = box(0.12, 0.02, 0.12); at(port, L.domeX, top + 0.11, 0);
    this.add(port, new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 1 }), 'regulator');
    // regulator rod back to the cab
    const rod = cylX(0.018, L.domeX - L.firebox[0] + 0.12, 8); at(rod, (L.domeX + L.firebox[0] - 0.12) / 2, top - 0.2, 0.05);
    this.add(rod, M.steel, 'regulator');
    this.anchors.dome = new THREE.Vector3(L.domeX, top + 0.45, 0.2);
    this.anchors.regulator = new THREE.Vector3(L.domeX, top + 0.14, 0.1);

    // Ramsbottom safety valves under a brass trumpet
    const fbTop = L.boilerY + 0.74;
    const svp = [[0.22, 0.02], [0.14, 0.12], [0.1, 0.28], [0.1, 0.42], [0.13, 0.5], [0.15, 0.56]];
    this.profiles.safety = [svp, L.safetyX, fbTop - 0.02];
    const sv = latheY([[0.26, -0.06], ...svp], 48);
    at(sv, L.safetyX, fbTop - 0.02, 0);
    this.add(sv, this.C(M.brass), 'safety');
    for (const dx of [-0.06, 0.06]) {
      this.add(at(cylY(0.035, 0.2, 12), L.safetyX + dx, fbTop + 0.62, 0), M.steel, 'safety');
    }
    const lever = box(0.5, 0.03, 0.04); at(lever, L.safetyX - 0.12, fbTop + 0.72, 0);
    this.anim.safetyLever = this.add(lever, M.steel, 'safety');
    this.emitters.safety = new THREE.Vector3(L.safetyX, fbTop + 0.74, 0);
    this.anchors.safety = new THREE.Vector3(L.safetyX, fbTop + 0.6, 0.15);

    // whistle on the firebox back
    const wx = L.firebox[0] + 0.28;
    const wp = cylY(0.025, 0.3, 10); at(wp, wx, fbTop + 0.1, 0);
    this.add(wp, M.brass, 'whistle');
    const bell = latheY([[0.001, 0], [0.07, 0], [0.07, 0.03], [0.055, 0.05], [0.06, 0.24], [0.04, 0.28], [0.015, 0.31], [0.015, 0.36], [0.03, 0.38], [0.001, 0.4]], 32);
    at(bell, wx, fbTop + 0.25, 0);
    this.add(bell, M.brass, 'whistle');
    this.emitters.whistle = new THREE.Vector3(wx, fbTop + 0.33, 0);
    this.anchors.whistle = new THREE.Vector3(wx, fbTop + 0.55, 0.1);

    // clack valve on the right side of the barrel (injector delivery)
    const ca = Math.PI / 5;
    const cpos = new THREE.Vector3(0.1, L.boilerY + Math.sin(ca) * L.boilerR, Math.cos(ca) * L.boilerR);
    const clack = latheY([[0.001, 0], [0.08, 0], [0.08, 0.06], [0.06, 0.09], [0.06, 0.18], [0.035, 0.2], [0.001, 0.22]], 24);
    clack.rotateX(Math.PI / 2 - ca);
    at(clack, cpos.x, cpos.y, cpos.z);
    this.add(clack, this.C(M.brass), 'clack');
    this.anchors.clack = cpos.clone().add(new THREE.Vector3(0, 0.15, 0.15));
    this.clackPos = cpos;
  }

  // ------------------------------------------------------------------ cab
  buildCab() {
    const M = this.M;
    const fy = L.footY;
    const cx0 = -3.62, cx1 = L.firebox[0];
    this.add(at(box(cx1 - cx0 + 0.02, 0.05, 2.5), (cx0 + cx1) / 2, fy, 0), this.C(M.wood), 'cab');
    // spectacle plate
    const sp = new THREE.Shape();
    sp.moveTo(-1.25, fy); sp.lineTo(1.25, fy); sp.lineTo(1.25, 3.5);
    sp.quadraticCurveTo(0.9, 3.86, 0, 3.92); sp.quadraticCurveTo(-0.9, 3.86, -1.25, 3.5); sp.closePath();
    sp.holes.push(new THREE.Path(wrapperOutline(0.755, 0.595, fy + 0.01).reverse()));
    for (const s of [1, -1]) sp.holes.push(new THREE.Path().absarc(s * 0.82, 3.3, 0.17, 0, Math.PI * 2, true));
    const spg = new THREE.ShapeGeometry(sp, 32); spg.rotateY(-Math.PI / 2); at(spg, cx1 + 0.02, 0, 0);
    const spm = M.paint.clone(); spm.side = THREE.DoubleSide;
    this.add(spg, this.C(spm), 'cab');
    for (const s of [1, -1]) {
      const rim = new THREE.TorusGeometry(0.17, 0.022, 10, 32); rim.rotateY(Math.PI / 2); at(rim, cx1 + 0.03, 3.3, s * 0.82);
      this.add(rim, this.C(M.brass), 'cab');
      const gl = new THREE.CircleGeometry(0.17, 32); gl.rotateY(Math.PI / 2); at(gl, cx1 + 0.02, 3.3, s * 0.82);
      this.add(gl, this.C(M.glass), 'cab').userData.shadow = false;
    }
    // side sheets with lining & number plate
    const panel = linedPanel({ w: 512, h: 512, base: '#17442b' });
    const sideMat = new THREE.MeshPhysicalMaterial({ map: panel, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.1, side: THREE.DoubleSide });
    for (const s of [1, -1]) {
      const sh = new THREE.Shape();
      sh.moveTo(cx0, fy - 0.16); sh.lineTo(cx1, fy - 0.16); sh.lineTo(cx1, 3.5);
      sh.lineTo(cx1 - 0.18, 3.5);
      sh.bezierCurveTo(cx1 - 0.3, 3.2, cx1 - 0.3, 2.85, cx1 - 0.55, 2.75);
      sh.lineTo(cx0, 2.75); sh.closePath();
      const g = new THREE.ShapeGeometry(sh, 24);
      remapUV(g, cx0, cx1, fy - 0.16, 3.5);
      at(g, 0, 0, s * 1.25);
      this.add(g, this.C(sideMat), 'cab');
      const cap = cylX(0.022, cx1 - cx0, 10); at(cap, (cx0 + cx1) / 2, 2.76, s * 1.25);
      this.add(cap, this.C(M.brass), 'cab');
      const np = new THREE.PlaneGeometry(0.42, 0.21);
      if (s < 0) np.rotateY(Math.PI);
      at(np, (cx0 + cx1) / 2, 2.25, s * 1.258);
      this.add(np, this.C(new THREE.MeshStandardMaterial({ map: numberplate('1851'), metalness: 0.6, roughness: 0.35, transparent: true, alphaTest: 0.5 })), 'cab');
      // rear pillar
      this.add(at(cylY(0.03, 1.05, 10), cx0 + 0.04, 3.25, s * 1.22), this.C(M.black), 'cab');
    }
    // roof
    const roof = new THREE.CylinderGeometry(3.2, 3.2, cx1 - cx0 + 0.25, 64, 1, true, -0.42, 0.84);
    roof.rotateZ(Math.PI / 2); roof.rotateX(Math.PI / 2); roof.rotateZ(Math.PI / 2);
    at(roof, (cx0 + cx1) / 2 - 0.05, 3.92 - 3.2, 0);
    const rm = M.paint.clone(); rm.side = THREE.DoubleSide;
    this.add(roof, this.C(rm), 'cab');
    this.anchors.cab = new THREE.Vector3(-3.1, 3.0, 1.0);

    // backhead fittings: pressure gauge with a live dial, water gauge, regulator handle
    const gc = document.createElement('canvas'); gc.width = gc.height = 256;
    this.gaugeCanvas = gc;
    this.gaugeTex = new THREE.CanvasTexture(gc); this.gaugeTex.colorSpace = THREE.SRGBColorSpace;
    const gx = L.firebox[0] - 0.05;
    const gface = new THREE.CircleGeometry(0.14, 40); gface.rotateY(-Math.PI / 2); at(gface, gx - 0.035, 3.0, 0.32);
    this.add(gface, new THREE.MeshStandardMaterial({ map: this.gaugeTex, roughness: 0.35, emissive: 0xffffff, emissiveMap: this.gaugeTex, emissiveIntensity: 0.25 }), 'gauges');
    const gb = latheX([[0.17, gx - 0.03], [0.16, gx - 0.05], [0.15, gx - 0.045], [0.15, gx + 0.03], [0.001, gx + 0.03]], 40);
    at(gb, 0, 3.0, 0.32);
    gb.translate(0, 0, 0);
    this.add(gb, M.brass, 'gauges');
    this.add(at(cylX(0.02, 0.1, 8), gx + 0.02, 2.82, 0.32), M.brass, 'gauges');
    // water gauge glass
    const wgx = gx - 0.06;
    this.add(at(cylY(0.022, 0.5, 16, true), wgx, 2.85, -0.36), this.M.glass, 'gauges');
    for (const y of [2.58, 3.12]) this.add(at(box(0.07, 0.07, 0.07), wgx, y, -0.36), M.brass, 'gauges');
    const wlevel = this.add(at(cylY(0.018, 1, 12), 0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0x5ab0ff, emissive: 0x1a5a9a, emissiveIntensity: 0.8, transparent: true, opacity: 0.85 }), 'gauges');
    const wlg = new THREE.Group(); wlg.position.set(wgx, 2.6, -0.36); wlg.add(wlevel); this.group.add(wlg);
    this.anim.gaugeWater = wlg;
    // regulator handle (rotates as the regulator opens)
    const rh = new THREE.Group(); rh.position.set(gx - 0.03, 2.86, 0.05);
    this.add(at(cylX(0.04, 0.06, 16), -0.02, 0, 0), M.steel, 'regulator', rh);
    this.add(at(box(0.03, 0.42, 0.04), -0.05, -0.18, 0), M.steel, 'regulator', rh);
    this.add(at(new THREE.SphereGeometry(0.035, 12, 10), -0.05, -0.39, 0), M.wood, 'regulator', rh);
    this.group.add(rh);
    this.anim.regHandle = rh;
    // firehole doors and the glow behind them
    this.anim.fireDoors = [];
    for (const s of [1, -1]) {
      const d = this.add(at(box(0.03, 0.4, 0.22), gx - 0.04, 2.0, s * 0.11), M.iron, 'firehole');
      d.userData.baseZ = s * 0.11;
      this.anim.fireDoors.push(d);
    }
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.18, 32).rotateY(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.set(gx + 0.02, 2.0, 0);
    this.group.add(glow);
    this.anim.fireGlow = glow;
    const cabLight = new THREE.PointLight(0xff8a3a, 0, 4, 1.8);
    cabLight.position.set(gx - 0.5, 2.1, 0);
    this.group.add(cabLight);
    this.lights.cab = cabLight;
    this.anchors.gauges = new THREE.Vector3(gx - 0.05, 3.05, 0.3);
    this.anchors.firehole = new THREE.Vector3(gx - 0.05, 2.0, 0);
    // reversing lever on the right of the cab
    const rl = new THREE.Group(); rl.position.set(-3.05, fy + 0.05, 1.0);
    this.add(at(box(0.05, 0.85, 0.04), 0, 0.42, 0), M.steel, 'reverser', rl);
    this.add(at(new THREE.SphereGeometry(0.04, 10, 8), 0, 0.86, 0), M.wood, 'reverser', rl);
    const quad = new THREE.TorusGeometry(0.62, 0.015, 6, 24, 0.9); quad.rotateZ(Math.PI / 2 - 0.45); at(quad, -3.05, fy + 0.05, 1.04);
    this.add(quad, M.brass, 'reverser');
    this.group.add(rl);
    this.anim.reverseLever = rl;
    this.anchors.reverser = new THREE.Vector3(-3.05, fy + 0.8, 1.0);
  }

  // ------------------------------------------------------------------ cylinders, steam chests, valves
  buildCylinders() {
    const M = this.M;
    this.anim.cyl = [];
    for (const s of [1, -1]) {
      const z = s * L.cylZ;
      const which = s > 0 ? 'right' : 'left';
      const cx = (G.CYL_REAR + G.CYL_FRONT) / 2, clen = G.CYL_FRONT - G.CYL_REAR;
      const cyl = cylX(0.29, clen, 48, true); at(cyl, cx, G.AY, z);
      this.shell(cyl, M.paint, 'cylinder', which, M.interior);
      for (const x of [G.CYL_REAR + 0.06, G.CYL_FRONT - 0.06]) {
        const band = new THREE.TorusGeometry(0.292, 0.012, 8, 48); band.rotateY(Math.PI / 2); at(band, x, G.AY, z);
        this.add(band, this.C(M.brass, which), 'cylinder');
      }
      // covers
      const fc = latheX([[0.3, G.CYL_FRONT], [0.3, G.CYL_FRONT + 0.04], [0.24, G.CYL_FRONT + 0.07], [0.12, G.CYL_FRONT + 0.1], [0.001, G.CYL_FRONT + 0.105]], 48);
      at(fc, 0, G.AY, z);
      this.add(fc, this.C(M.steel, which), 'cylinder');
      const rc = latheX([[0.001, G.CYL_REAR - 0.04], [0.3, G.CYL_REAR - 0.04], [0.3, G.CYL_REAR]], 48);
      at(rc, 0, G.AY, z);
      const rcm = M.black.clone(); rcm.side = THREE.DoubleSide;
      this.add(rc, this.C(rcm, which), 'cylinder');
      const gland = cylX(0.07, 0.12, 20); at(gland, G.CYL_REAR - 0.1, G.AY, z);
      this.add(gland, M.brass, 'cylinder');
      // bore liner, visible when cut open
      const bore = cylX(G.BORE_R + 0.005, clen, 40, true); at(bore, cx, G.AY, z);
      this.add(bore, this.C(new THREE.MeshStandardMaterial({ color: 0x9a9ea4, metalness: 1, roughness: 0.35, side: THREE.BackSide }), which), 'cylinder');

      // steam in each end of the cylinder: colour shows pressure
      const mkSteam = () => new THREE.MeshStandardMaterial({
        color: 0xff5533, emissive: 0xff3311, emissiveIntensity: 1, transparent: true, opacity: 0.5, depthWrite: false, roughness: 1, side: THREE.DoubleSide,
      });
      const fMat = this.C(mkSteam(), which), rMat = this.C(mkSteam(), which);
      const unit = cylX(G.BORE_R - 0.004, 1, 32); // scaled each frame along x
      const front = this.add(unit, fMat, 'cylinder'); front.userData.shadow = false;
      const rear = this.add(unit, rMat, 'cylinder'); rear.userData.shadow = false;
      front.renderOrder = rear.renderOrder = 2;
      // piston & rod
      const piston = new THREE.Group();
      this.add(cylX(G.BORE_R - 0.003, 0.08, 40), M.steel, 'piston', piston);
      for (const dx of [-0.025, 0, 0.025]) this.add(at(cylX(G.BORE_R - 0.001, 0.008, 40), dx, 0, 0), M.bronze, 'piston', piston);
      this.add(at(cylX(0.04, G.PISTON_ROD, 16), -G.PISTON_ROD / 2, 0, 0), M.steel, 'piston', piston);
      piston.position.set(0, G.AY, z);
      this.group.add(piston);

      // steam chest on top
      const chY0 = 1.29, chY1 = 1.66, chW = 0.36;
      const chest = box(clen, chY1 - chY0, chW); at(chest, cx, (chY0 + chY1) / 2, z);
      const chm = M.paint.clone();
      const ch = this.add(chest, this.C(chm, which), 'steamchest');
      this.add(chest, this.C(M.interior, which), 'steamchest').userData.shadow = false;
      const lid = box(clen + 0.06, 0.04, chW + 0.06); at(lid, cx, chY1 + 0.02, z);
      this.add(lid, this.C(M.black, which), 'steamchest');
      const chestSteam = this.add(at(box(clen - 0.02, chY1 - chY0 - 0.12, chW - 0.04), cx, chY0 + 0.1 + (chY1 - chY0 - 0.12) / 2, z), this.C(mkSteam(), which), 'steamchest');
      chestSteam.userData.shadow = false; chestSteam.renderOrder = 1;
      // valve seat with three ports (front, exhaust, rear)
      this.add(at(box(clen - 0.02, 0.03, chW - 0.04), cx, chY0 + 0.015, z), M.iron, 'valve');
      const portMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
      const pf = G.CHEST_C + G.VALVE_H - G.LAP - G.PORT_W / 2;
      for (const px of [pf, G.CHEST_C, 2 * G.CHEST_C - pf]) {
        this.add(at(box(px === G.CHEST_C ? 0.08 : G.PORT_W, 0.006, 0.22), px, chY0 + 0.031, z), portMat, 'valve');
      }
      // D slide valve
      const vg = new THREE.Group();
      const vs = new THREE.Shape();
      const H = G.VALVE_H, C = G.CAVITY_H;
      vs.moveTo(-H, 0); vs.lineTo(-C, 0); vs.lineTo(-C + 0.02, 0.06); vs.lineTo(C - 0.02, 0.06); vs.lineTo(C, 0); vs.lineTo(H, 0);
      vs.lineTo(H, 0.1); vs.quadraticCurveTo(H, 0.14, H - 0.04, 0.14); vs.lineTo(-H + 0.04, 0.14); vs.quadraticCurveTo(-H, 0.14, -H, 0.1); vs.closePath();
      const vgeo = new THREE.ExtrudeGeometry(vs, { depth: 0.2, bevelEnabled: true, bevelSize: 0.005, bevelThickness: 0.005, bevelSegments: 1 });
      vgeo.translate(0, 0, -0.1);
      this.add(vgeo, M.bronze, 'valve', vg);
      this.add(at(cylX(0.02, 0.6, 10), -0.3 - H + 0.1, 0.07, 0), M.steel, 'valve', vg);
      vg.position.set(G.CHEST_C, chY0 + 0.031, z);
      this.group.add(vg);
      // steam passages from ports to the cylinder ends (coloured with that end's steam)
      const pY = chY0 + 0.01;
      const pr = 2 * G.CHEST_C - pf;
      const fPass = pipe([[pf, pY + 0.01, z], [pf + 0.02, 1.252, z], [pf + 0.08, 1.25, z], [G.CYL_FRONT - 0.08, 1.25, z], [G.CYL_FRONT - 0.045, 1.19, z]], 0.026, 40, 10);
      const rPass = pipe([[pr, pY + 0.01, z], [pr - 0.02, 1.252, z], [pr - 0.08, 1.25, z], [G.CYL_REAR + 0.08, 1.25, z], [G.CYL_REAR + 0.045, 1.19, z]], 0.026, 40, 10);
      this.add(fPass, fMat, 'cylinder').userData.shadow = false;
      this.add(rPass, rMat, 'cylinder').userData.shadow = false;
      const exhMat = this.C(new THREE.MeshStandardMaterial({ color: 0x8a7cff, emissive: 0x5a4cff, emissiveIntensity: 0.6, transparent: true, opacity: 0.55, depthWrite: false }), which);
      const ePass = pipe([[G.CHEST_C, pY + 0.01, z], [G.CHEST_C, 1.26, z - s * 0.08], [G.CHEST_C - 0.05, 1.26, s * 0.84], [4.15, 1.62, s * 0.42], [L.chimneyX, 1.9, 0]], 0.035, 40, 10);
      const ep = this.add(ePass, exhMat, 'blastpipe'); ep.userData.shadow = false;
      // drain cocks
      for (const x of [G.CYL_REAR + 0.08, G.CYL_FRONT - 0.08]) {
        this.add(at(cylY(0.018, 0.12, 8), x, G.AY - 0.33, z), M.brass, 'draincocks');
      }
      this.emitters[`drain_${which}`] = [new THREE.Vector3(G.CYL_REAR + 0.08, G.AY - 0.4, z), new THREE.Vector3(G.CYL_FRONT - 0.08, G.AY - 0.4, z)];
      this.anim.cyl.push({ s, front, rear, fMat, rMat, piston, valve: vg, chestSteam, exhMat });
      ch.userData.side = s;
    }
    this.anchors.cylinder = new THREE.Vector3(4.55, 1.0, 1.42);
    this.anchors.piston = new THREE.Vector3(4.55, 1.0, 1.15);
    this.anchors.steamchest = new THREE.Vector3(4.55, 1.62, 1.3);
    this.anchors.valve = new THREE.Vector3(4.55, 1.42, 1.15);
    this.anchors.draincocks = new THREE.Vector3(4.55, 0.62, 1.15);
  }

  // ------------------------------------------------------------------ motion: rods & valve gear
  buildMotion() {
    const M = this.M;
    const A = this.anim;
    A.motion = [];
    const unitRod = (len, h0, h1, d) => rodGeometry(len, h0, h1, d);
    for (const s of [1, -1]) {
      const zc = s * L.cylZ;
      const m = { s };
      // slide bars & motion plate
      for (const dy of [0.115, -0.115]) this.add(at(box(1.05, 0.04, 0.09), 3.62, G.AY + dy, zc), M.steel, 'crosshead');
      this.add(at(box(0.08, 0.55, 0.55), 3.08, 1.12, s * 0.9), M.black, 'crosshead');
      this.add(at(box(0.22, 0.75, 0.04), G.P.x, 1.36, s * 0.68), M.black, 'valvegear');
      this.add(at(box(0.18, 0.16, 0.55), G.P.x, 1.5, s * 0.95), M.black, 'valvegear');
      // crosshead
      const xh = new THREE.Group();
      this.add(box(0.26, 0.19, 0.1), M.steel, 'crosshead', xh);
      this.add(at(box(0.07, G.AY - G.ARM.y + 0.02, 0.05), G.ARM.dx, -(G.AY - G.ARM.y) / 2, s * 0.08), M.steel, 'crosshead', xh);
      this.add(at(cylZ(0.04, 0.2, 16), 0, 0, -s * 0.06), M.steel, 'crosshead', xh);
      xh.position.set(0, G.AY, zc);
      this.group.add(xh); m.xh = xh;
      // connecting rod (crosshead -> crank pin), built along +x then rotated
      const conG = unitRod(G.L, 0.15, 0.11, 0.05); conG.rotateZ(Math.PI); // big end at origin pointing -x
      const con = new THREE.Group();
      this.add(conG, M.steel, 'conrod', con);
      this.add(at(cylZ(0.12, 0.08, 24), 0, 0, 0), M.steel, 'conrod', con);
      con.position.z = s * 1.03;
      this.group.add(con); m.con = con;
      // coupling rod between the driving wheels
      const cpl = new THREE.Group();
      const span = L.drivers[0] - L.drivers[1];
      const cg = unitRod(span, 0.11, 0.11, 0.045); cg.translate(-span / 2, 0, 0);
      this.add(cg, M.steel, 'couplingrod', cpl);
      cpl.position.z = s * 0.93;
      this.group.add(cpl); m.cpl = cpl;
      // crank pins
      m.pins = [];
      for (const x of L.drivers) {
        const pin = this.add(cylZ(0.05, 0.32, 16), M.steel, 'drivers');
        pin.position.set(x, G.AY, s * 0.98); m.pins.push(pin);
      }
      // return crank, eccentric rod, expansion link, die block, radius rod, combination lever, union link
      const bar = (part, w, d, mat = M.steel) => { const g = box(1, w, d); const msh = this.add(g, mat, part); return msh; };
      m.ret = bar('valvegear', 0.09, 0.05);
      m.ret.position.z = s * 1.1;
      m.ecc = new THREE.Group(); m.ecc.userData.len = G.LE; this.add(unitRod(G.LE, 0.075, 0.07, 0.04), M.steel, 'valvegear', m.ecc); m.ecc.position.z = s * 1.14; this.group.add(m.ecc);
      m.link = new THREE.Group();
      // curved slotted expansion link: an arc centred on the radius-rod length
      const lk = new THREE.Shape();
      const LR = G.LR, sp = 0.36 / LR;
      lk.absarc(LR, 0, LR + 0.045, Math.PI - sp, Math.PI + sp, false);
      lk.absarc(LR, 0, LR - 0.045, Math.PI + sp, Math.PI - sp, true);
      const lkg = new THREE.ExtrudeGeometry(lk, { depth: 0.022, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.006, bevelSegments: 1, curveSegments: 24 });
      lkg.rotateZ(Math.PI / 2); lkg.rotateZ(-Math.PI / 2);
      for (const dz of [-0.05, 0.028]) { const g = lkg.clone(); g.translate(0, 0, dz); this.add(g, M.steel, 'valvegear', m.link); }
      this.add(at(box(0.05, 0.42, 0.045), 0.0, -0.3, 0), M.steel, 'valvegear', m.link);
      this.add(at(cylZ(0.04, 0.16, 12), 0, 0, 0), M.iron, 'valvegear', m.link);
      m.link.position.set(G.P.x, G.P.y, s * 1.18); this.group.add(m.link);
      m.die = this.add(box(0.08, 0.1, 0.06), M.brass, 'valvegear'); m.die.position.z = s * 1.18;
      m.radius = new THREE.Group(); m.radius.userData.len = G.LR; this.add(unitRod(G.LR, 0.07, 0.065, 0.035), M.steel, 'valvegear', m.radius); m.radius.position.z = s * 1.22; this.group.add(m.radius);
      m.comb = new THREE.Group(); m.comb.userData.len = G.A + G.B; this.add(unitRod(G.A + G.B, 0.085, 0.065, 0.04), M.steel, 'valvegear', m.comb); m.comb.position.z = s * 1.25; this.group.add(m.comb);
      m.union = new THREE.Group(); m.union.userData.len = G.LU; this.add(unitRod(G.LU, 0.065, 0.065, 0.035), M.steel, 'valvegear', m.union); m.union.position.z = s * 1.25; this.group.add(m.union);
      m.vcross = this.add(box(0.1, 0.08, 0.14), M.steel, 'valvegear'); m.vcross.position.z = s * 1.17;
      m.spindle = this.add(cylX(0.022, 0.55, 10), M.steel, 'valvegear'); m.spindle.position.z = zc;
      // reach rod from the cab and lifting arm
      m.reach = this.add(cylX(0.02, 4.6, 8), M.steel, 'reverser');
      m.reach.position.set(-0.6, 1.95, s * 1.18);
      m.lift = new THREE.Group(); this.add(at(box(0.04, 0.32, 0.03), 0, 0.16, 0), M.steel, 'reverser', m.lift); m.lift.position.set(G.P.x - 0.2, 1.6, s * 1.24); this.group.add(m.lift);
      A.motion.push(m);
    }
    this.anchors.crosshead = new THREE.Vector3(3.6, 1.0, 1.2);
    this.anchors.conrod = new THREE.Vector3(2.3, 1.0, 1.1);
    this.anchors.couplingrod = new THREE.Vector3(-0.25, 1.0, 1.0);
    this.anchors.valvegear = new THREE.Vector3(G.P.x, G.P.y + 0.15, 1.25);
  }

  // ------------------------------------------------------------------ tender
  buildTender() {
    const M = this.M;
    const tx0 = -8.25, tx1 = -3.92, cx = (tx0 + tx1) / 2, tl = tx1 - tx0;
    const y0 = 1.32, y1 = 2.78;
    // outside frames with axleboxes and laminated springs
    for (const s of [1, -1]) {
      this.add(at(box(tl, 0.36, 0.05), cx, 1.0, s * 1.02), M.black, 'tender');
      for (const x of L.tender) {
        this.add(at(box(0.3, 0.3, 0.14), x, L.tenderR, s * 1.02), M.iron, 'tender');
        for (let k = 0; k < 7; k++) this.add(at(box(1.0 - k * 0.12, 0.024, 0.1), x, 0.82 + k * 0.026, s * 1.02), M.iron, 'tender');
      }
    }
    this.add(at(box(tl, 0.12, 2.3), cx, 1.24, 0), M.black, 'tender');
    for (const x of [tx0 - 0.06, tx1 + 0.06]) this.add(at(box(0.12, 0.38, 2.5), x, 1.2, 0), M.red, 'tender');
    for (const s of [1, -1]) {
      const stock = latheX([[0.001, tx0 - 0.42], [0.11, tx0 - 0.42], [0.11, tx0 - 0.12], [0.001, tx0 - 0.12]], 20);
      this.add(at(stock, 0, 1.2, s * 0.88), M.black, 'tender');
      const head = latheX([[0.001, tx0 - 0.47], [0.19, tx0 - 0.46], [0.19, tx0 - 0.42], [0.001, tx0 - 0.42]], 24);
      this.add(at(head, 0, 1.2, s * 0.88), M.steel, 'tender');
    }
    // tank sides (lined panels), rear, front and deck — all cut away with the boiler
    const sideTex = linedPanel({ w: 1536, h: 512, base: '#17442b', crest: true });
    const sideMat = new THREE.MeshPhysicalMaterial({ map: sideTex, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.1 });
    for (const s of [1, -1]) {
      const g = new THREE.PlaneGeometry(tl, y1 - y0);
      if (s < 0) g.rotateY(Math.PI);
      at(g, cx, (y0 + y1) / 2, s * 1.2);
      this.add(g, this.C(sideMat), 'tender');
      this.add(at(cylX(0.025, tl, 10), cx, y1 + 0.01, s * 1.2), this.C(M.brass), 'tender');
      // flared coping
      const fl = box(tl, 0.02, 0.18); fl.rotateX(s * 0.6); at(fl, cx, y1 + 0.07, s * 1.27);
      this.add(fl, this.C(M.black), 'tender');
    }
    const tm = M.paint.clone(); tm.side = THREE.DoubleSide;
    this.add(at(new THREE.PlaneGeometry(2.4, y1 - y0).rotateY(Math.PI / 2), tx0, (y0 + y1) / 2, 0), this.C(tm), 'tender');
    this.add(at(new THREE.PlaneGeometry(2.4, y1 - y0 + 0.4).rotateY(Math.PI / 2), tx1, (y0 + y1 + 0.4) / 2, 0), this.C(tm), 'tender');
    this.add(at(new THREE.PlaneGeometry(tl, 2.4).rotateX(-Math.PI / 2), cx, y1, 0), this.C(tm), 'tender');
    const inner = this.add(at(box(tl - 0.02, y1 - y0 - 0.01, 2.38), cx, (y0 + y1) / 2, 0), this.C(M.interior), 'tender');
    inner.userData.shadow = false;
    // water in the tank
    const twMat = new THREE.MeshStandardMaterial({ color: 0x1d6fc4, transparent: true, opacity: 0.45, emissive: 0x0b4f9a, emissiveIntensity: 0.9, depthWrite: false, roughness: 0.15, side: THREE.DoubleSide });
    const tw = this.add(at(box(tl - 0.06, y1 - y0 - 0.06, 2.34), cx, (y0 + y1) / 2, 0), this.C(twMat, 'center', [this.planes.tenderWater]), 'tenderwater');
    tw.userData.shadow = false; tw.renderOrder = 2;
    this.tenderY = [y0 + 0.03, y1 - 0.03];
    // coal heap
    const cg = new THREE.PlaneGeometry(2.3, 2.3, 48, 48); cg.rotateX(-Math.PI / 2);
    const r = rng(77);
    const pos = cg.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const d = Math.max(Math.abs(x) / 1.15, Math.abs(z) / 1.15);
      const h = Math.max(0, 1 - Math.pow(d, 3)) * (0.45 - x * 0.12) + (r() - 0.5) * 0.06;
      pos.setY(i, h);
    }
    cg.computeVertexNormals();
    at(cg, tx1 - 1.25, y1, 0);
    this.add(cg, this.C(M.coal), 'coal');
    const lumpG = new THREE.IcosahedronGeometry(0.07, 0);
    const lumps = new THREE.InstancedMesh(lumpG, this.C(M.coal), 120);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i < 120; i++) {
      const x = (r() - 0.5) * 2.0, z = (r() - 0.5) * 2.0;
      const d = Math.max(Math.abs(x) / 1.15, Math.abs(z) / 1.15);
      p.set(tx1 - 1.25 + x, y1 + Math.max(0, 1 - Math.pow(d, 3)) * (0.45 - x * 0.12) + 0.02, z);
      e.set(r() * 6, r() * 6, r() * 6); q.setFromEuler(e); const k = 0.6 + r(); sc.set(k, k, k);
      m4.compose(p, q, sc); lumps.setMatrixAt(i, m4);
    }
    lumps.userData.part = 'coal'; this.group.add(lumps); this.parts.get('coal').push(lumps);
    // water filler and tool boxes
    const filler = latheY([[0.001, 0], [0.26, 0], [0.26, 0.12], [0.22, 0.16], [0.001, 0.17]], 32);
    this.add(at(filler, tx0 + 0.6, y1, 0), this.C(M.black), 'tender');
    this.add(at(cylY(0.05, 0.05, 16), tx0 + 0.6, y1 + 0.18, 0), M.brass, 'tender');
    for (const s of [1, -1]) this.add(at(box(0.9, 0.34, 0.4), tx0 + 1.55, y1 + 0.17, s * 0.8), this.C(M.paint), 'tender');
    // hand brake column
    this.add(at(cylY(0.03, 0.9, 10), tx1 + 0.12, y1 - 0.2 + 0.45, 0.85), M.steel, 'tender');
    this.add(at(new THREE.TorusGeometry(0.12, 0.018, 8, 24).rotateX(Math.PI / 2), tx1 + 0.12, y1 + 0.7, 0.85), M.brass, 'tender');
    // rear lamp
    const lamp = latheY([[0.001, 0], [0.1, 0], [0.11, 0.05], [0.1, 0.24], [0.06, 0.3], [0.001, 0.36]], 20);
    this.add(at(lamp, tx0 - 0.02, 1.4, 0.6), M.black, 'tender');
    this.add(at(cylX(0.07, 0.03, 20), tx0 - 0.1, 1.53, 0.6), new THREE.MeshStandardMaterial({ color: 0xff3020, emissive: 0xff2010, emissiveIntensity: 3 }), 'tender');
    this.anchors.tender = new THREE.Vector3(cx - 0.8, y1 + 0.2, 1.25);
    this.anchors.coal = new THREE.Vector3(tx1 - 1.0, y1 + 0.45, 0.5);
    this.anchors.tenderwater = new THREE.Vector3(cx - 0.8, 1.9, 0.3);
    this.tenderBox = { x0: tx0, x1: tx1 };
  }

  // ------------------------------------------------------------------ pipework
  buildPipework() {
    const M = this.M;
    const top = L.boilerY + L.boilerR;
    // internal main steam pipe: regulator -> along the steam space -> smokebox
    const main = pipe([[L.domeX, top - 0.3, 0], [L.domeX + 0.3, top - 0.36, 0], [L.barrel[1] - 0.2, top - 0.36, 0], [L.barrel[1] + 0.3, top - 0.4, 0], [3.95, 2.6, 0]], 0.06, 64, 14);
    this.add(main, M.copper, 'steampipe');
    // outside steam pipes from the smokebox down to each steam chest
    for (const s of [1, -1]) {
      const pts = [[3.95, 2.6, 0], [3.95, 2.45, s * 0.45], [3.95, 2.2, s * 0.82], [4.3, 1.95, s * 1.05], [G.CHEST_C, 1.7, s * L.cylZ]];
      this.add(pipe(pts, 0.065, 48, 14), M.black, 'steampipe');
    }
    // injector under the cab on the right, feed from the tender, delivery to the clack
    const inj = new THREE.Group();
    this.add(latheX([[0.001, -0.22], [0.06, -0.22], [0.09, -0.1], [0.07, 0.05], [0.09, 0.2], [0.001, 0.22]], 24), M.brass, 'injector', inj);
    this.add(at(cylY(0.03, 0.25, 10), 0, -0.15, 0), M.brass, 'injector', inj);
    inj.position.set(-3.1, 1.48, 1.0);
    this.group.add(inj);
    this.injectorPos = inj.position.clone();
    const feed = pipe([[-4.05, 1.38, 0.75], [-3.8, 1.3, 0.95], [-3.32, 1.46, 1.0], [-3.25, 1.48, 1.0]], 0.035, 32, 10);
    this.add(feed, M.copper, 'injector');
    const c = this.clackPos;
    const feedRoute = [[-2.95, 1.5, 1.0], [-2.6, 1.7, 1.02], [-2.2, 1.82, 1.02], [-0.7, 1.82, 1.02], [-0.25, 1.95, 0.98], [-0.05, 2.5, 0.86], [c.x - 0.04, c.y + 0.08, c.z + 0.1]];
    const deliv = pipe(feedRoute, 0.032, 80, 10);
    this.add(deliv, this.C(M.copper), 'injector');
    this.anchors.injector = new THREE.Vector3(-3.1, 1.45, 1.15);
    this.anchors.steampipe = new THREE.Vector3(3.95, 2.2, 0.9);
    this.emitters.injector = new THREE.Vector3(-3.1, 1.2, 1.0);

    // flow paths (used by the flow visualiser)
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const I = L.inner;
    this.paths.water = [
      [V(-7.6, 1.5, 0.3), V(-5.5, 1.45, 0.5), V(-4.15, 1.42, 0.7), V(-3.8, 1.3, 0.95), V(-3.3, 1.46, 1.0), V(-2.95, 1.5, 1.0), V(-2.6, 1.7, 1.02), V(-2.2, 1.82, 1.02), V(-0.7, 1.82, 1.02), V(-0.25, 1.95, 0.98), V(-0.05, 2.5, 0.86), V(c.x - 0.04, c.y + 0.08, c.z + 0.1), V(c.x, c.y, c.z), V(0.3, 2.55, 0.25), V(0.8, 2.4, 0)],
    ];
    const gas = [];
    for (const [ty, tz] of [[2.0, -0.05], [2.22, 0.1], [2.38, -0.2], [2.1, 0.3], [2.3, 0.25]]) {
      gas.push([V(I.x[0] + 0.35, I.y[0] + 0.15, tz * 0.6), V(I.x[0] + 0.45, 2.05, tz * 0.8), V(-1.3, 2.32, tz), V(I.x[1] - 0.15, ty + 0.02, tz),
        V(I.x[1] + 0.2, ty, tz), V(L.barrel[1] - 0.1, ty, tz), V(L.barrel[1] + 0.35, ty + 0.3, tz * 0.5), V(3.9, 2.9, 0.05), V(L.chimneyX, 3.4, 0), V(L.chimneyX, 4.2, 0)]);
    }
    this.paths.gas = gas;
    this.paths.steam = [V(0.9, 2.95, -0.1), V(L.domeX, top - 0.1, 0), V(L.domeX, top + 0.2, 0), V(L.domeX, top + 0.12, 0), V(L.domeX, top - 0.28, 0), V(L.domeX + 0.3, top - 0.36, 0), V(L.barrel[1] - 0.2, top - 0.36, 0), V(L.barrel[1] + 0.3, top - 0.4, 0), V(3.95, 2.6, 0)];
    this.paths.steamSide = (s) => [V(3.95, 2.6, 0), V(3.95, 2.45, s * 0.45), V(3.95, 2.2, s * 0.82), V(4.3, 1.95, s * 1.05), V(G.CHEST_C, 1.7, s * L.cylZ), V(G.CHEST_C + 0.05, 1.52, s * L.cylZ)];
    const pf = G.CHEST_C + G.VALVE_H - G.LAP - G.PORT_W / 2, pr = 2 * G.CHEST_C - pf;
    this.paths.admitFront = (s) => [V(G.CHEST_C + 0.22, 1.5, s * L.cylZ), V(pf, 1.32, s * L.cylZ), V(pf + 0.06, 1.25, s * L.cylZ), V(G.CYL_FRONT - 0.08, 1.25, s * L.cylZ), V(G.CYL_FRONT - 0.07, 1.12, s * L.cylZ), V(G.CYL_FRONT - 0.14, G.AY, s * L.cylZ)];
    this.paths.admitRear = (s) => [V(G.CHEST_C - 0.22, 1.5, s * L.cylZ), V(pr, 1.32, s * L.cylZ), V(pr - 0.06, 1.25, s * L.cylZ), V(G.CYL_REAR + 0.08, 1.25, s * L.cylZ), V(G.CYL_REAR + 0.07, 1.12, s * L.cylZ), V(G.CYL_REAR + 0.14, G.AY, s * L.cylZ)];
    const exTail = (s) => [V(G.CHEST_C, 1.3, s * L.cylZ), V(G.CHEST_C, 1.26, s * (L.cylZ - 0.08)), V(G.CHEST_C - 0.05, 1.26, s * 0.84), V(4.15, 1.62, s * 0.42), V(L.chimneyX, 1.95, 0), V(L.chimneyX, 2.7, 0), V(L.chimneyX, 3.4, 0), V(L.chimneyX, 4.4, 0)];
    this.paths.exhaustFront = (s) => [V(G.CYL_FRONT - 0.14, G.AY, s * L.cylZ), V(G.CYL_FRONT - 0.07, 1.12, s * L.cylZ), V(G.CYL_FRONT - 0.08, 1.25, s * L.cylZ), V(pf + 0.06, 1.25, s * L.cylZ), V(pf, 1.33, s * L.cylZ), V(G.CHEST_C + 0.04, 1.36, s * L.cylZ), ...exTail(s)];
    this.paths.exhaustRear = (s) => [V(G.CYL_REAR + 0.14, G.AY, s * L.cylZ), V(G.CYL_REAR + 0.07, 1.12, s * L.cylZ), V(G.CYL_REAR + 0.08, 1.25, s * L.cylZ), V(pr - 0.06, 1.25, s * L.cylZ), V(pr, 1.33, s * L.cylZ), V(G.CHEST_C - 0.04, 1.36, s * L.cylZ), ...exTail(s)];
  }


  // ------------------------------------------------------------------ red-painted cut edges
  // Sectioned museum engines have their cut faces painted red; these strips
  // trace every place the cut-away planes slice through a shell.
  buildCutEdges() {
    const mat = new THREE.MeshStandardMaterial({ color: 0xc8301e, emissive: 0x6a0c04, emissiveIntensity: 0.8, roughness: 0.5 });
    const seg = (a, b, r = 0.012) => {
      const d = new THREE.Vector3().subVectors(b, a); const len = d.length();
      const g = new THREE.CylinderGeometry(r, r, len, 6, 1, true);
      g.translate(0, len / 2, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
      g.translate(a.x, a.y, a.z);
      return g;
    };
    const poly = (pts, out, z = 0) => { for (let i = 0; i < pts.length - 1; i++) out.push(seg(new THREE.Vector3(pts[i][0], pts[i][1], z), new THREE.Vector3(pts[i + 1][0], pts[i + 1][1], z))); };
    const lathe = ([prof, cx, base], out) => {
      poly(prof.map(([r, y]) => [cx + r, base + y]), out);
      poly(prof.map(([r, y]) => [cx - r, base + y]), out);
    };
    const c = [];
    const by = L.boilerY, R = L.boilerR, SR = L.smokeboxR;
    for (const sg of [1, -1]) {
      poly([[L.barrel[0], by + sg * R], [L.barrel[1], by + sg * R]], c);
      poly([[L.smokebox[0], by + sg * SR], [L.smokebox[1], by + sg * SR]], c);
      poly([[L.smokebox[0], by + sg * R], [L.smokebox[0], by + sg * SR]], c);
      poly([[L.smokebox[1] + 0.03, by + sg * (SR + 0.02)], [L.smokebox[1] + 0.05, by + sg * 0.66], [L.smokebox[1] + 0.12, by + sg * 0.6], [L.smokebox[1] + 0.17, by + sg * 0.42], [L.smokebox[1] + 0.19, by]], c);
    }
    const [fx0, fx1] = L.firebox, I = L.inner;
    poly([[fx0, by + 0.74], [fx1, by + 0.74]], c);
    poly([[fx0, 1.25], [fx0, 1.81]], c); poly([[fx0, 2.19], [fx0, by + 0.74]], c);
    poly([[fx1, 1.25], [fx1, by - R]], c);
    poly([[fx0, 1.25], [fx1, 1.25]], c);
    poly([[I.x[0], I.y[1]], [I.x[1], I.y[1]], [I.x[1], I.y[0]]], c);
    poly([[I.x[0], I.y[1]], [I.x[0], 2.19]], c); poly([[I.x[0], 1.81], [I.x[0], I.y[0]]], c);
    lathe(this.profiles.dome, c); lathe(this.profiles.chimney, c); lathe(this.profiles.cap, c); lathe(this.profiles.safety, c);
    // cab roof & spectacle plate, tender tank
    poly([[-3.75, 3.92], [-2.45, 3.92]], c);
    poly([[fx0 + 0.02, by + 0.755], [fx0 + 0.02, 3.92]], c);
    const T = this.tenderBox;
    poly([[T.x0, 1.32], [T.x0, 2.78], [T.x1, 2.78], [T.x1, 1.32]], c);
    this.cutEdges = { center: new THREE.Mesh(merge(c), mat) };
    for (const [name, s] of [['right', 1], ['left', -1]]) {
      const e = [];
      const z = s * L.cylZ;
      for (const sg of [1, -1]) poly([[G.CYL_REAR, G.AY + sg * 0.29], [G.CYL_FRONT, G.AY + sg * 0.29]], e, z);
      poly([[G.CYL_REAR, 1.29], [G.CYL_REAR, 1.66], [G.CYL_FRONT, 1.66], [G.CYL_FRONT, 1.29], [G.CYL_REAR, 1.29]], e, z);
      poly([[G.CYL_REAR - 0.04, G.AY - 0.3], [G.CYL_REAR - 0.04, G.AY + 0.3]], e, z);
      poly([[G.CYL_FRONT + 0.04, G.AY - 0.3], [G.CYL_FRONT + 0.07, G.AY - 0.24], [G.CYL_FRONT + 0.1, G.AY - 0.12], [G.CYL_FRONT + 0.105, G.AY], [G.CYL_FRONT + 0.1, G.AY + 0.12], [G.CYL_FRONT + 0.07, G.AY + 0.24], [G.CYL_FRONT + 0.04, G.AY + 0.3]], e, z);
      this.cutEdges[name] = new THREE.Mesh(merge(e), mat);
    }
    for (const m of Object.values(this.cutEdges)) { m.visible = false; m.userData.shadow = false; this.group.add(m); }
  }

  // ------------------------------------------------------------------ per-frame update
  update(sim, t, dt, view) {
    const A = this.anim;
    const theta = sim.theta;
    const edgesOn = this.cut > 0.985;
    this.cutEdges.center.visible = edgesOn;
    this.cutEdges.right.visible = edgesOn && view.cutSide > 0;
    this.cutEdges.left.visible = edgesOn && view.cutSide < 0;
    // wheels
    for (const w of A.wheels) {
      if (w.crank) {
        const side = w.side > 0 ? sim.sides[0] : sim.sides[1];
        w.g.rotation.z = sim.phiOf(side);
      } else {
        w.g.rotation.z = -theta * (L.driverR / w.R);
      }
    }
    // motion per side (+z = sides[0])
    const tmp = new THREE.Vector3();
    A.motion.forEach((m, i) => {
      const side = sim.sides[i];
      const k = side.kin;
      const s = m.s;
      const phi = sim.phiOf(side);
      const cpx = Math.cos(phi) * G.R, cpy = Math.sin(phi) * G.R;
      m.pins.forEach((p, j) => p.position.set(L.drivers[j] + cpx, G.AY + cpy, s * 0.98));
      m.cpl.position.set((L.drivers[0] + L.drivers[1]) / 2 + cpx, G.AY + cpy, s * 0.93);
      m.xh.position.x = k.xc;
      m.con.position.set(k.crank.x, k.crank.y, s * 1.03);
      m.con.rotation.z = Math.atan2(k.crank.y - G.AY, k.crank.x - k.xc);
      const seg = (obj, a, b) => {
        const dx = b.x - a.x, dy = b.y - a.y;
        obj.position.x = a.x; obj.position.y = a.y;
        obj.rotation.z = Math.atan2(dy, dx);
        obj.scale.x = Math.hypot(dx, dy) / obj.userData.len;
      };
      // return crank (a plain box centred between its ends)
      const rcx = (k.crank.x + k.rc.x) / 2, rcy = (k.crank.y + k.rc.y) / 2;
      m.ret.position.set(rcx, rcy, s * 1.1);
      m.ret.rotation.z = Math.atan2(k.rc.y - k.crank.y, k.rc.x - k.crank.x);
      m.ret.scale.x = Math.hypot(k.rc.x - k.crank.x, k.rc.y - k.crank.y) + 0.06;
      seg(m.ecc, k.rc, k.tail);
      m.link.rotation.z = k.alpha;
      m.die.position.set(k.die.x, k.die.y, s * 1.18); m.die.rotation.z = k.alpha;
      seg(m.radius, k.die, k.c1);
      seg(m.comb, k.c2, k.c3);
      seg(m.union, k.c3, k.arm);
      m.vcross.position.set(k.c2.x, k.c2.y, s * 1.17);
      m.spindle.position.set(k.c2.x + 0.275, G.YV, s * L.cylZ);
      m.lift.rotation.z = -sim.c.reverser * 0.5;
      // piston, valve, steam colours
      const c = A.cyl[i];
      c.piston.position.x = k.piston;
      c.valve.position.x = G.CHEST_C + k.valve;
      const pRear0 = G.CYL_REAR + 0.02, pFront1 = G.CYL_FRONT - 0.02;
      const pb = k.piston - 0.04, pf = k.piston + 0.04;
      c.rear.scale.x = Math.max(0.001, pb - pRear0); c.rear.position.set((pRear0 + pb) / 2, G.AY, s * L.cylZ);
      c.front.scale.x = Math.max(0.001, pFront1 - pf); c.front.position.set((pf + pFront1) / 2, G.AY, s * L.cylZ);
      const pBoil = sim.pBoiler + 14.7;
      steamColour(c.fMat, side.pF, pBoil);
      steamColour(c.rMat, side.pR, pBoil);
      steamColour(c.chestSteam.material, sim.pChest + 14.7, pBoil);
      c.exhMat.emissiveIntensity = 0.3 + Math.min(1.5, side.exh * 0.5);
    });
    // regulator
    A.regHead.position.x = L.domeX + sim.c.regulator * 0.1;
    A.regHandle.rotation.x = 0;
    A.regHandle.rotation.z = 0;
    A.regHandle.rotation.y = 0;
    A.regHandle.rotation.x = sim.c.regulator * 1.1;
    A.reverseLever.rotation.z = -sim.c.reverser * 0.38;

    // fire
    const heat = Math.max(0, Math.min(1.4, (sim.fireTemp - 250) / 1000));
    if (A.coalMat.userData.shader) {
      A.coalMat.userData.shader.uniforms.uTime.value = t;
      A.coalMat.userData.shader.uniforms.uHeat.value = 0.35 + heat * 0.9;
    }
    A.flameMat.uniforms.uTime.value = t;
    A.flameMat.uniforms.uHeat.value = 0.25 + heat * 0.9;
    A.flameMat.uniforms.uDraught.value = Math.min(1.5, sim.draught);
    A.flames.forEach((f, i) => {
      // flames lean towards the tubes as the draught pulls them forward
      f.lookAt(view.camera.position.x, f.position.y, view.camera.position.z);
      const lean = Math.min(0.9, sim.draught * 0.45);
      f.rotation.z += 0; f.position.copy(f.userData.base);
      const sc = 0.6 + heat * 0.7 + Math.sin(t * 7 + i) * 0.08;
      f.scale.set(0.8 + heat * 0.3, sc, 1);
      f.position.x += lean * 0.18;
    });
    A.tubeMat.emissiveIntensity = 0.15 + heat * 1.1;
    this.M.brick.emissiveIntensity = 0.3 + heat * 1.6;
    this.lights.fire.intensity = this.cut * (1 + heat * 5) * (0.85 + 0.15 * Math.sin(t * 17) * Math.sin(t * 7.3));
    // the fireman: doors open while firing
    const firing = sim.firingDoor ?? 0;
    A.fireDoors.forEach((d) => { d.position.z = d.userData.baseZ * (1 + firing * 1.0); });
    A.fireGlow.material.opacity = 0.15 + firing * 0.85 * (0.6 + heat * 0.4);
    this.lights.cab.intensity = (0.4 + firing * 5) * (0.6 + heat * 0.5);

    // water
    const lvl = sim.water;
    this.planes.water.constant = lvl;
    const surf = A.waterSurf;
    const dy = lvl - L.boilerY;
    const halfW = Math.sqrt(Math.max(0.0001, (L.boilerR - 0.02) ** 2 - dy * dy));
    surf.position.set((L.firebox[0] + L.barrel[1]) / 2, lvl, 0);
    surf.scale.set(L.barrel[1] - L.firebox[0] - 0.05, 1, halfW * 2);
    this.noiseTex.offset.set(t * 0.05, t * 0.03);
    A.waterSurfMat.bumpScale = 0.3 + Math.min(1, sim.gen / 2) * 1.5;
    A.gaugeWater.scale.y = Math.max(0.001, Math.min(0.5, (lvl - LIMITS.waterGlassLo) / (LIMITS.waterGlassHi - LIMITS.waterGlassLo) * 0.5));
    // tender water
    const tw = sim.tenderWater / 2800;
    this.planes.tenderWater.constant = this.tenderY[0] + (this.tenderY[1] - this.tenderY[0]) * tw;

    // bubbles (only drawn on the half that is still there)
    const B = A.bubbles;
    const pos = B.pts.geometry.attributes.position.array;
    const boil = Math.min(1.5, sim.gen / 1.8);
    const sideSign = view.cutSide; // camera side; draw bubbles on the other half
    const active = Math.floor(B.n * Math.min(1, boil));
    for (let i = 0; i < B.n; i++) {
      const d = B.data;
      if (i >= active) { pos[i * 3 + 1] = -100; continue; }
      d[i * 4 + 1] += d[i * 4 + 3] * dt * (0.5 + boil);
      d[i * 4] += Math.sin(t * 3 + i) * dt * 0.02;
      if (d[i * 4 + 1] > lvl - 0.01) this.resetBubble(i);
      pos[i * 3] = d[i * 4];
      pos[i * 3 + 1] = d[i * 4 + 1];
      pos[i * 3 + 2] = this.cut > 0.5 ? -sideSign * Math.abs(d[i * 4 + 2]) : d[i * 4 + 2];
    }
    B.pts.geometry.attributes.position.needsUpdate = true;
    B.pts.material.opacity = 0.75 * this.cut;
    B.pts.visible = this.cut > 0.02;

    // safety valve lever lifts when blowing off
    A.safetyLever.rotation.z = sim.safety > 0.05 ? 0.06 : 0;

    if ((this._gaugeT = (this._gaugeT ?? 0) - dt) <= 0) { this._gaugeT = 0.1; this.drawGauge(sim.pBoiler); }
  }

  drawGauge(p) {
    const x = this.gaugeCanvas.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.fillStyle = '#f1e7cf'; x.fillRect(0, 0, 256, 256);
    x.translate(128, 128);
    x.strokeStyle = '#222'; x.fillStyle = '#222'; x.lineWidth = 3;
    const a0 = Math.PI * 0.75, span = Math.PI * 1.5;
    for (let v = 0; v <= 200; v += 10) {
      const a = a0 + (v / 200) * span;
      const r0 = v % 50 ? 100 : 88;
      x.beginPath(); x.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); x.lineTo(Math.cos(a) * 112, Math.sin(a) * 112); x.stroke();
    }
    x.strokeStyle = '#b01818'; x.lineWidth = 8;
    x.beginPath(); x.arc(0, 0, 106, a0 + (160 / 200) * span, a0 + span); x.stroke();
    x.font = 'bold 22px Georgia'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let v = 0; v <= 200; v += 50) { const a = a0 + (v / 200) * span; x.fillText(String(v), Math.cos(a) * 68, Math.sin(a) * 68); }
    x.font = 'italic 16px Georgia'; x.fillText('lb / sq in', 0, 50);
    const a = a0 + (Math.min(200, p) / 200) * span;
    x.strokeStyle = '#111'; x.lineWidth = 5;
    x.beginPath(); x.moveTo(-Math.cos(a) * 18, -Math.sin(a) * 18); x.lineTo(Math.cos(a) * 96, Math.sin(a) * 96); x.stroke();
    x.beginPath(); x.arc(0, 0, 9, 0, Math.PI * 2); x.fill();
    this.gaugeTex.needsUpdate = true;
  }
}

const HOT = new THREE.Color(0xff3a1a), WARM = new THREE.Color(0xffa040), COOL = new THREE.Color(0x7a6cff);
const tmpC = new THREE.Color();
function steamColour(mat, pAbs, pBoil) {
  const f = Math.max(0, Math.min(1, (pAbs - 14.7) / Math.max(1, pBoil - 14.7)));
  if (f > 0.5) tmpC.copy(WARM).lerp(HOT, (f - 0.5) * 2); else tmpC.copy(COOL).lerp(WARM, f * 2);
  mat.color.copy(tmpC); mat.emissive.copy(tmpC);
  mat.emissiveIntensity = 0.35 + f * 1.4;
  mat.opacity = 0.32 + f * 0.4;
}
