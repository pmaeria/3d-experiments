// Geometry helpers for building the locomotive out of lathed, extruded and
// merged primitives.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Lathe around the X axis (the boiler axis). pts: [[radius, x], ...]
export function latheX(pts, seg = 48) {
  const g = new THREE.LatheGeometry(pts.map(([r, x]) => new THREE.Vector2(r, x)), seg);
  g.rotateZ(-Math.PI / 2);
  return g;
}

// Lathe around the Y axis (chimney, dome …). pts: [[radius, y], ...]
export function latheY(pts, seg = 48) {
  return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
}

// Lathe around Z (wheels, buffers on the side …). pts: [[radius, z], ...]
export function latheZ(pts, seg = 64) {
  const g = new THREE.LatheGeometry(pts.map(([r, z]) => new THREE.Vector2(r, z)), seg);
  g.rotateX(Math.PI / 2);
  return g;
}

// Cylinder whose axis runs along X
export function cylX(r, len, seg = 40, open = false, r2 = r) {
  const g = new THREE.CylinderGeometry(r2, r, len, seg, 1, open);
  g.rotateZ(-Math.PI / 2);
  return g;
}
export function cylZ(r, len, seg = 32, open = false) {
  const g = new THREE.CylinderGeometry(r, r, len, seg, 1, open);
  g.rotateX(Math.PI / 2);
  return g;
}
export function cylY(r, len, seg = 32, open = false, r2 = r) {
  return new THREE.CylinderGeometry(r2, r, len, seg, 1, open);
}

export function box(w, h, d) { return new THREE.BoxGeometry(w, h, d); }

export function merge(geos) {
  const ok = geos.map((g) => {
    let n = g.index ? g.toNonIndexed() : g;
    if (!n.attributes.uv) {
      n.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
    }
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
    return n;
  });
  return mergeGeometries(ok, false);
}

export function at(g, x, y, z) {
  if (g.isObject3D) g.position.set(x, y, z); else g.translate(x, y, z);
  return g;
}

// A pipe following a smooth path through points
export function pipe(points, r = 0.04, seg = 64, radial = 12) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, 'centripetal', 0.5);
  return new THREE.TubeGeometry(curve, seg, r, radial, false);
}

// Curved strip with UVs running along the arc (curved nameplates, beading)
export function arcStrip(rIn, rOut, a0, a1, seg = 48) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const a = a1 + (a0 - a1) * t; // left-to-right reading for an arc above the centre
    const c = Math.cos(a), s = Math.sin(a);
    pos.push(rIn * c, rIn * s, 0, rOut * c, rOut * s, 0);
    uv.push(t, 0, t, 1);
    if (i < seg) {
      const k = i * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Tapered, round-ended bar in the XY plane, extruded along Z (rods & links).
// Runs from x=0 to x=len.
export function rodGeometry(len, h0, h1, depth, endR0 = h0 * 0.75, endR1 = h1 * 0.75) {
  const s = new THREE.Shape();
  s.moveTo(0, -h0 / 2);
  s.lineTo(len, -h1 / 2);
  s.absarc(len, 0, endR1, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(0, h0 / 2);
  s.absarc(0, 0, endR0, Math.PI / 2, Math.PI * 1.5, false);
  const g = new THREE.ExtrudeGeometry(s, {
    depth, bevelEnabled: true, bevelThickness: depth * 0.18, bevelSize: Math.min(h0, h1) * 0.12,
    bevelSegments: 2, curveSegments: 16,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

// Railway wheel: tyre with flange, spokes, hub, optional crank boss and
// balance weight. `inner` is the direction (+1/-1 along Z) the flange faces.
export function wheelGeometry({ R, spokes, hubR, inner = -1, crankR = 0, balance = false, width = 0.13 }) {
  const paint = [], steel = [];
  const w = width / 2;
  const fl = 0.035 + R * 0.01;
  // tyre profile [radius, z] — from inner bore round to tread and flange
  let prof = [
    [R - 0.075, -w], [R - 0.075, w], [R - 0.004, w], [R, w - 0.01], [R, -w + 0.02],
    [R + fl * 0.6, -w - 0.004], [R + fl, -w - 0.018], [R + fl * 0.85, -w - 0.03], [R - 0.02, -w - 0.03], [R - 0.075, -w],
  ];
  if (inner > 0) prof = prof.map(([r, z]) => [r, -z]).reverse();
  steel.push(latheZ(prof, 72));
  // wheel centre rim
  paint.push(latheZ(inner > 0
    ? [[R - 0.075, -w * 0.5], [R - 0.12, -w * 0.45], [R - 0.12, w * 0.45], [R - 0.075, w * 0.5]].reverse()
    : [[R - 0.075, -w * 0.5], [R - 0.12, -w * 0.45], [R - 0.12, w * 0.45], [R - 0.075, w * 0.5]], 72));
  // spokes: tapered, oval section
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 + Math.PI / spokes;
    const len = R - 0.1 - hubR;
    const g = new THREE.CylinderGeometry(0.022 + R * 0.012, 0.03 + R * 0.02, len, 8, 1, false);
    g.scale(1, 1, 0.7);
    g.translate(0, hubR + len / 2, 0);
    g.rotateZ(a - Math.PI / 2);
    paint.push(g);
  }
  // hub
  paint.push(latheZ([[0, -w * 0.9], [hubR, -w * 0.9], [hubR * 1.05, -w * 0.6], [hubR * 1.05, w * 0.6], [hubR, w * 0.9], [0, w * 0.9]], 32));
  // axle end cap (outside)
  const capZ = -inner * (w * 0.9);
  const cap = cylZ(hubR * 0.45, 0.06, 24);
  cap.translate(0, 0, capZ - inner * 0.03);
  steel.push(cap);
  if (crankR > 0) {
    // crank boss in the wheel plane at local angle 0
    const boss = cylZ(0.12, width * 0.9, 24);
    boss.translate(crankR, 0, 0);
    paint.push(boss);
    const web = new THREE.BoxGeometry(crankR, 0.16, width * 0.8);
    web.translate(crankR / 2, 0, 0);
    paint.push(web);
  }
  if (balance) {
    const s = new THREE.Shape();
    const a0 = Math.PI - 0.62, a1 = Math.PI + 0.62;
    const ro = R - 0.11, ri = R * 0.48;
    s.absarc(0, 0, ro, a0, a1, false);
    s.absarc(0, 0, ri, a1, a0, true);
    const g = new THREE.ExtrudeGeometry(s, { depth: width * 0.75, bevelEnabled: false, curveSegments: 24 });
    g.translate(0, 0, -width * 0.375);
    paint.push(g);
  }
  return { paint: merge(paint), steel: merge(steel) };
}
