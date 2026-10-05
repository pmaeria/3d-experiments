// The Victorian Hall of Engineering: tiled floor, brick walls with dusk
// windows, cast-iron columns, lattice roof trusses under a glass roof, gas
// lamps, a display plinth with a rolling-road test bed, and velvet ropes.

import * as THREE from 'three';
import { tileFloor, brick, mahogany, duskGlass, banner, clockFace, plaque, rng, softSprite } from './textures.js';
import { latheY, cylX, cylY, cylZ, box, merge, at, pipe } from './geom.js';
import { LAYOUT as LZ } from './locomotive.js';

export const FLOOR_Y = -0.9;
const HALL = { x: 34, z: 17, colZ: 12.5, colH: 8.5, apex: 15.5 };

export class Hall {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.anim = { rollers: [], motes: null, lampGlows: [] };
    this.lights = [];
    const M = this.M = {
      brass: new THREE.MeshStandardMaterial({ color: 0xd2a04a, metalness: 1, roughness: 0.25 }),
      iron: new THREE.MeshStandardMaterial({ color: 0x27333d, metalness: 0.6, roughness: 0.45 }),
      ironDark: new THREE.MeshStandardMaterial({ color: 0x1c1f22, metalness: 0.6, roughness: 0.5 }),
      gold: new THREE.MeshStandardMaterial({ color: 0xc9953a, metalness: 1, roughness: 0.3 }),
      stone: new THREE.MeshStandardMaterial({ color: 0xb9a688, roughness: 0.75 }),
      wood: new THREE.MeshStandardMaterial({ color: 0x3b2012, roughness: 0.55 }),
      sleeper: new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 0.9 }),
      rail: new THREE.MeshStandardMaterial({ color: 0x8a8d92, metalness: 1, roughness: 0.48 }),
      ballast: new THREE.MeshStandardMaterial({ color: 0x5f5850, roughness: 1 }),
      velvet: new THREE.MeshPhysicalMaterial({ color: 0x6a0d18, roughness: 0.85, sheen: 1, sheenColor: 0xff6070, sheenRoughness: 0.5 }),
      globe: new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: 0xffc070, emissiveIntensity: 3.2, roughness: 0.3 }),
    };
    this.buildFloor();
    this.buildWalls();
    this.buildRoof();
    this.buildPlinth();
    this.buildLamps();
    this.buildFurnishings();
    this.buildMotes();
    this.group.traverse((o) => { if (o.isMesh) { o.receiveShadow = true; } });
  }

  buildFloor() {
    const t = tileFloor();
    const mat = new THREE.MeshStandardMaterial({ map: t.map, roughnessMap: t.rough, roughness: 1, metalness: 0.0, envMapIntensity: 0.8 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALL.x * 2, HALL.z * 2), mat);
    floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR_Y;
    this.group.add(floor);
    // stone border strips along the aisles
    for (const s of [1, -1]) this.group.add(at(new THREE.Mesh(box(HALL.x * 2, 0.02, 0.6), this.M.stone), 0, FLOOR_Y + 0.01, s * HALL.colZ));
  }

  buildWalls() {
    const b = brick();
    b.map.repeat.set(10, 3); b.bump.repeat.set(10, 3);
    const wallMat = new THREE.MeshStandardMaterial({ map: b.map, bumpMap: b.bump, bumpScale: 1.5, roughness: 0.9 });
    const endMap = b.map.clone(); endMap.repeat.set(6, 3); endMap.needsUpdate = true;
    const endBump = b.bump.clone(); endBump.repeat.set(6, 3); endBump.needsUpdate = true;
    const endMat = new THREE.MeshStandardMaterial({ map: endMap, bumpMap: endBump, bumpScale: 1.5, roughness: 0.9 });
    const H = 11;
    for (const s of [1, -1]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(HALL.x * 2, H), wallMat);
      w.position.set(0, FLOOR_Y + H / 2, -s * HALL.z); if (s < 0) w.rotation.y = Math.PI;
      this.group.add(w);
      const e = new THREE.Mesh(new THREE.PlaneGeometry(HALL.z * 2, H + 6), endMat);
      e.position.set(-s * HALL.x, FLOOR_Y + (H + 6) / 2, 0); e.rotation.y = s * Math.PI / 2;
      this.group.add(e);
    }
    // stone dado & cornice
    for (const s of [1, -1]) {
      this.group.add(at(new THREE.Mesh(box(HALL.x * 2, 1.1, 0.25), this.M.stone), 0, FLOOR_Y + 0.55, -s * (HALL.z - 0.12)));
      this.group.add(at(new THREE.Mesh(box(HALL.x * 2, 0.35, 0.4), this.M.stone), 0, FLOOR_Y + HALL.colH + 0.2, -s * (HALL.z - 0.2)));
    }
    // arched dusk windows along both long walls
    const glassTex = duskGlass();
    const glassMat = new THREE.MeshBasicMaterial({ map: glassTex, color: 0xffffff, fog: false });
    const frames = [];
    const winW = 2.6, winH = 5.2, winY = FLOOR_Y + 2.4;
    const mullions = [];
    for (const s of [1, -1]) for (let x = -28; x <= 28; x += 8) {
      const sh = new THREE.Shape();
      sh.moveTo(-winW / 2, 0); sh.lineTo(winW / 2, 0); sh.lineTo(winW / 2, winH - winW / 2);
      sh.absarc(0, winH - winW / 2, winW / 2, 0, Math.PI, false); sh.closePath();
      const g = new THREE.ShapeGeometry(sh, 24);
      const pa = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < pa.count; i++) uv.setXY(i, (pa.getX(i) + winW / 2) / winW, pa.getY(i) / winH);
      if (s < 0) g.rotateY(Math.PI);
      at(g, x, winY, -s * (HALL.z - 0.02));
      this.group.add(new THREE.Mesh(g, glassMat));
      // stone surround & cast-iron glazing bars
      const arch = new THREE.TorusGeometry(winW / 2 + 0.12, 0.14, 8, 32, Math.PI);
      if (s < 0) arch.rotateY(Math.PI);
      frames.push(at(arch, x, winY + winH - winW / 2, -s * (HALL.z - 0.05)));
      for (const dx of [-1, 1]) frames.push(at(box(0.28, winH - winW / 2, 0.2), x + dx * (winW / 2 + 0.12), winY + (winH - winW / 2) / 2, -s * (HALL.z - 0.05)));
      frames.push(at(box(winW + 0.6, 0.22, 0.35), x, winY - 0.1, -s * (HALL.z - 0.1)));
      for (const dx of [-0.65, 0, 0.65]) mullions.push(at(box(0.05, winH - 0.3, 0.05), x + dx, winY + (winH - 0.3) / 2, -s * (HALL.z - 0.06)));
      for (let k = 1; k < 6; k++) mullions.push(at(box(winW, 0.04, 0.05), x, winY + k * 0.75, -s * (HALL.z - 0.06)));
    }
    this.group.add(new THREE.Mesh(merge(frames), this.M.stone));
    this.group.add(new THREE.Mesh(merge(mullions), this.M.ironDark));
    // the great lunette windows in the end walls, following the roof curve
    for (const s of [1, -1]) {
      const sh = new THREE.Shape();
      const rz = HALL.colZ - 0.5, ry = HALL.apex - HALL.colH - 1.2;
      sh.moveTo(-rz, 0);
      for (let i = 0; i <= 48; i++) { const a = Math.PI - (i / 48) * Math.PI; sh.lineTo(Math.cos(a) * rz, Math.sin(a) * ry); }
      sh.closePath();
      const g = new THREE.ShapeGeometry(sh, 32);
      const pa = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < pa.count; i++) uv.setXY(i, 0.5, 0.25 + 0.75 * (pa.getY(i) / ry));
      g.rotateY(s * Math.PI / 2);
      at(g, -s * (HALL.x - 0.05), FLOOR_Y + HALL.colH + 0.6, 0);
      this.group.add(new THREE.Mesh(g, glassMat));
      const bars = [];
      for (let i = 1; i < 12; i++) {
        const a = Math.PI - (i / 12) * Math.PI;
        const len = Math.hypot(Math.cos(a) * rz, Math.sin(a) * ry);
        const bg = box(0.08, len, 0.08); bg.translate(0, len / 2, 0); bg.rotateZ(Math.atan2(Math.sin(a) * ry, Math.cos(a) * rz) - Math.PI / 2);
        bg.rotateY(s * Math.PI / 2);
        bars.push(at(bg, -s * (HALL.x - 0.1), FLOOR_Y + HALL.colH + 0.6, 0));
      }
      for (const k of [0.35, 0.7]) {
        const c = new THREE.TorusGeometry(1, 0.05, 6, 48, Math.PI); c.scale(rz * k, ry * k, 1); c.rotateY(s * Math.PI / 2);
        bars.push(at(c, -s * (HALL.x - 0.1), FLOOR_Y + HALL.colH + 0.6, 0));
      }
      this.group.add(new THREE.Mesh(merge(bars), this.M.ironDark));
    }
    // banner and clock
    const ban = new THREE.Mesh(new THREE.PlaneGeometry(12, 1.875), new THREE.MeshStandardMaterial({ map: banner(['THE STEAM LOCOMOTIVE', 'An Illustrated Exhibition of Victorian Engineering · MDCCCLXII']), roughness: 0.8 }));
    ban.position.set(-HALL.x + 0.15, FLOOR_Y + 5.6, 0); ban.rotation.y = Math.PI / 2;
    this.group.add(ban);
    const clock = new THREE.Group();
    clock.add(new THREE.Mesh(new THREE.CircleGeometry(1.3, 64), new THREE.MeshStandardMaterial({ map: clockFace(), roughness: 0.4, emissive: 0xfff2d8, emissiveIntensity: 0.25, emissiveMap: clockFace() })));
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.33, 0.09, 12, 64), this.M.gold); clock.add(rim);
    const hand = (len, w) => { const g = box(w, len, 0.02); g.translate(0, len / 2 - 0.08, 0.03); return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x111111 })); };
    this.anim.hourHand = hand(0.7, 0.07); this.anim.minHand = hand(1.05, 0.045);
    clock.add(this.anim.hourHand, this.anim.minHand);
    clock.position.set(HALL.x - 0.1, FLOOR_Y + HALL.colH + 3.2, 0); clock.rotation.y = -Math.PI / 2;
    this.group.add(clock);
  }

  buildRoof() {
    const M = this.M;
    // cast-iron columns with lathed bases and capitals
    const colGeo = merge([
      latheY([[0.5, 0], [0.5, 0.25], [0.38, 0.32], [0.34, 0.5], [0.24, 0.62], [0.2, 0.8], [0.18, HALL.colH - 1.0], [0.24, HALL.colH - 0.8], [0.22, HALL.colH - 0.65], [0.36, HALL.colH - 0.35], [0.45, HALL.colH - 0.2], [0.45, HALL.colH], [0.001, HALL.colH]], 24),
    ]);
    const cols = [];
    for (const s of [1, -1]) for (let x = -24; x <= 24; x += 8) cols.push(at(colGeo.clone(), x, FLOOR_Y, s * HALL.colZ));
    this.group.add(new THREE.Mesh(merge(cols), M.iron));
    // gilded bands on the capitals
    const bands = [];
    for (const s of [1, -1]) for (let x = -24; x <= 24; x += 8) bands.push(at(new THREE.TorusGeometry(0.25, 0.03, 8, 24).rotateX(Math.PI / 2), x, FLOOR_Y + HALL.colH - 0.8, s * HALL.colZ));
    this.group.add(new THREE.Mesh(merge(bands), M.gold));
    // longitudinal girders along the column tops
    for (const s of [1, -1]) this.group.add(at(new THREE.Mesh(box(HALL.x * 2, 0.5, 0.3), M.iron), 0, FLOOR_Y + HALL.colH + 0.2, s * HALL.colZ));
    // elliptical lattice trusses
    const ry = HALL.apex - HALL.colH, rz = HALL.colZ, y0 = FLOOR_Y + HALL.colH;
    const ell = (a, k = 1) => new THREE.Vector3(0, y0 + Math.sin(a) * ry * k, Math.cos(a) * rz * k);
    const truss = [];
    const N = 40;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI, a1 = ((i + 1) / N) * Math.PI;
      const segs = [[ell(a0), ell(a1)], [ell(a0, 0.95), ell(a1, 0.95)], [ell(a0), ell(a1, 0.95)]];
      for (const [p, q] of segs) {
        const d = q.clone().sub(p); const len = d.length();
        const g = box(0.08, len, 0.08);
        g.translate(0, len / 2, 0);
        const ang = Math.atan2(d.z, d.y);
        g.rotateX(ang);
        g.translate(p.x, p.y, p.z);
        truss.push(g);
      }
    }
    // spandrel brackets
    for (const s of [1, -1]) {
      const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(1.6, 0); sh.quadraticCurveTo(0.2, 0.2, 0, -1.6); sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false }); g.rotateY(-s * Math.PI / 2); g.translate(0, y0 + 0.3, s * HALL.colZ);
      truss.push(g);
    }
    const trussGeo = merge(truss);
    const tr = [];
    for (let x = -24; x <= 24; x += 8) tr.push(trussGeo.clone().translate(x, 0, 0));
    this.group.add(new THREE.Mesh(merge(tr), M.iron));
    // glass roof: an elliptical vault with a shader for glazing bars and dusk sky
    const vault = new THREE.CylinderGeometry(1, 1, HALL.x * 2, 64, 1, true, 0, Math.PI);
    vault.rotateZ(Math.PI / 2);
    vault.scale(1, ry * 1.01, rz * 1.01);
    vault.translate(0, y0, 0);
    const vmat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide, fog: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `varying vec3 vP; varying vec2 vUv; void main(){ vP = position; vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
      fragmentShader: `varying vec3 vP; varying vec2 vUv;
        void main(){
          float h = clamp((vP.y - ${y0.toFixed(2)}) / ${ry.toFixed(2)}, 0.0, 1.0);
          vec3 sky = mix(vec3(0.33,0.2,0.32), vec3(0.06,0.08,0.2), h);
          sky = mix(sky, vec3(0.75,0.4,0.25), smoothstep(0.35,0.0,h) * 0.35 * smoothstep(-5.0, 15.0, vP.z));
          float gx = abs(fract(vP.x / 1.2) - 0.5);
          float gy = abs(fract(vUv.x * 28.0) - 0.5);
          float bar = 1.0 - smoothstep(0.43, 0.47, max(gx, gy));
          vec3 col = mix(vec3(0.03,0.035,0.04), sky, bar);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.group.add(new THREE.Mesh(vault, vmat));
    // lean-to aisle roofs from the column girders up to the wall heads
    for (const s of [1, -1]) {
      const dz = HALL.z - HALL.colZ, dy = 11 - (HALL.colH + 0.4);
      const c = new THREE.Mesh(box(HALL.x * 2, 0.15, Math.hypot(dz, dy)), new THREE.MeshStandardMaterial({ color: 0x2a1d14, roughness: 0.8 }));
      c.rotation.x = -s * Math.atan2(dy, dz);
      c.position.set(0, FLOOR_Y + HALL.colH + 0.4 + dy / 2, s * (HALL.colZ + dz / 2));
      this.group.add(c);
    }
  }

  buildPlinth() {
    const M = this.M;
    const x0 = -10.6, x1 = 7.4, zW = 2.3;
    const mah = mahogany();
    mah.repeat.set(8, 1);
    const plinthMat = new THREE.MeshStandardMaterial({ map: mah, roughness: 0.38, metalness: 0.0 });
    this.group.add(at(new THREE.Mesh(box(x1 - x0, 0.55, zW * 2), plinthMat), (x0 + x1) / 2, FLOOR_Y + 0.275, 0));
    this.group.add(at(new THREE.Mesh(box(x1 - x0 + 0.2, 0.08, zW * 2 + 0.2), M.stone), (x0 + x1) / 2, FLOOR_Y + 0.59, 0));
    for (const s of [1, -1]) {
      this.group.add(at(new THREE.Mesh(cylX(0.025, x1 - x0 + 0.2, 10), M.brass), (x0 + x1) / 2, FLOOR_Y + 0.62, s * (zW + 0.1)));
      this.group.add(at(new THREE.Mesh(cylX(0.02, x1 - x0, 10), M.brass), (x0 + x1) / 2, FLOOR_Y + 0.1, s * (zW + 0.005)));
    }
    // ballast bed
    const bal = box(x1 - x0 - 0.4, 0.25, 3.2);
    const pa = bal.attributes.position;
    for (let i = 0; i < pa.count; i++) if (pa.getY(i) > 0) pa.setZ(i, pa.getZ(i) * 0.82);
    bal.computeVertexNormals();
    const ballastTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
      const r = rng(21); x.fillStyle = '#4e4840'; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 2600; i++) { const v = 50 + r() * 80; x.fillStyle = `rgb(${v},${v * 0.95},${v * 0.88})`; x.beginPath(); x.arc(r() * 256, r() * 256, 1 + r() * 3, 0, Math.PI * 2); x.fill(); }
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(20, 4); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    this.group.add(at(new THREE.Mesh(bal, new THREE.MeshStandardMaterial({ map: ballastTex, roughness: 1 })), (x0 + x1) / 2, FLOOR_Y + 0.6, 0));
    // sleepers
    const sl = [];
    const railTop = 0;
    for (let x = x0 + 0.5; x < x1 - 0.3; x += 0.75) sl.push(at(box(0.26, 0.14, 2.6), x, railTop - 0.2, 0));
    this.group.add(new THREE.Mesh(merge(sl), M.sleeper));
    // rails, interrupted where the rollers carry each wheel
    const axles = [...LZ.drivers.map((x) => [x, LZ.driverR]), ...LZ.bogie.map((x) => [x, LZ.bogieR]), ...LZ.tender.map((x) => [x, LZ.tenderR])].sort((a, b) => a[0] - b[0]);
    const gaps = axles.map(([x]) => [x - 0.5, x + 0.5]);
    const rails = [];
    for (const s of [1, -1]) {
      let cur = x0 + 0.3;
      for (const [g0, g1] of [...gaps, [x1 - 0.3, x1 - 0.3]]) {
        if (g0 > cur) {
          const len = g0 - cur;
          rails.push(at(box(len, 0.075, 0.07), cur + len / 2, railTop - 0.0375, s * 0.7175));
          rails.push(at(box(len, 0.06, 0.02), cur + len / 2, railTop - 0.105, s * 0.7175));
          rails.push(at(box(len, 0.02, 0.14), cur + len / 2, railTop - 0.125, s * 0.7175));
        }
        cur = Math.max(cur, g1);
      }
    }
    this.group.add(new THREE.Mesh(merge(rails), M.rail));
    // rolling-road test bed: a pair of rollers under every wheel
    const cradles = [];
    for (const [ax, R] of axles) {
      const r = 0.12, d = R > 0.8 ? 0.3 : 0.22;
      const yr = R - Math.sqrt((R + r) ** 2 - d * d);
      for (const s of [1, -1]) {
        for (const dx of [-d, d]) {
          const roller = new THREE.Mesh(cylZ(r, 0.22, 32), M.rail);
          roller.position.set(ax + dx, yr, s * 0.75);
          // knurled marks so the rotation reads
          const mark = new THREE.Mesh(box(0.02, 0.02, 0.225), M.ironDark); mark.position.set(r - 0.005, 0, 0); roller.add(mark);
          this.group.add(roller);
          this.anim.rollers.push({ m: roller, ratio: R / r });
        }
        cradles.push(at(box(d * 2 + 0.36, 0.2, 0.32), ax, yr - 0.15, s * 0.75));
        for (const dx of [-d, d]) cradles.push(at(box(0.14, 0.22, 0.36), ax + dx, yr - 0.02, s * 0.75));
      }
      cradles.push(at(box(0.3, 0.12, 1.5), ax, yr - 0.22, 0));
    }
    this.group.add(new THREE.Mesh(merge(cradles), M.ironDark));
    // brass plaque on a lectern before the engine
    const lect = new THREE.Group();
    lect.add(at(new THREE.Mesh(cylY(0.07, 1.0, 16), M.ironDark), 0, 0.5, 0));
    lect.add(at(new THREE.Mesh(cylY(0.3, 0.05, 24), M.ironDark), 0, 0.02, 0));
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.41), new THREE.MeshStandardMaterial({
      map: plaque('PROMETHEUS', '4-4-0 Express Passenger Engine\nBuilt at the Prometheus Works, 1859'), metalness: 0.75, roughness: 0.35,
    }));
    pl.position.set(0, 1.05, 0.08); pl.rotation.x = -0.6;
    lect.add(pl);
    lect.position.set(1.0, FLOOR_Y, 4.3);
    this.group.add(lect);
    // velvet ropes on brass stanchions around the plinth
    const posts = [];
    const px0 = x0 - 0.8, px1 = x1 + 0.8, pz = zW + 1.2;
    const ring = [];
    for (let x = px0; x <= px1 + 0.01; x += (px1 - px0) / 8) { ring.push([x, pz]); }
    for (let x = px1; x >= px0 - 0.01; x -= (px1 - px0) / 8) { ring.push([x, -pz]); }
    const stanchion = merge([
      latheY([[0.17, 0], [0.17, 0.04], [0.06, 0.08], [0.035, 0.12], [0.03, 0.9], [0.05, 0.93], [0.05, 0.97], [0.001, 1.0]], 20),
    ]);
    const pts = [];
    for (const [x, z] of ring) { posts.push(at(stanchion.clone(), x, FLOOR_Y, z)); pts.push(new THREE.Vector3(x, FLOOR_Y + 0.92, z)); }
    this.group.add(new THREE.Mesh(merge(posts), M.brass));
    const ropes = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (Math.abs(a.z - b.z) > 0.1) continue;
      const m = a.clone().lerp(b, 0.5); m.y -= 0.22;
      ropes.push(pipe([[a.x, a.y, a.z], [m.x, m.y, m.z], [b.x, b.y, b.z]], 0.028, 20, 8));
    }
    this.group.add(new THREE.Mesh(merge(ropes), M.velvet));
  }

  buildLamps() {
    const M = this.M;
    // hanging gas pendants down the nave
    const pend = (x, z, y, light) => {
      const g = new THREE.Group();
      g.add(at(new THREE.Mesh(cylY(0.015, HALL.apex - y - 1.2, 6), M.ironDark), 0, (HALL.apex - y - 1.2) / 2 + 0.6, 0));
      g.add(at(new THREE.Mesh(latheY([[0.001, 0.3], [0.42, 0.42], [0.46, 0.46], [0.3, 0.56], [0.06, 0.62], [0.001, 0.62]], 24), M.brass), 0, 0, 0));
      const globe = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 16), M.globe);
      globe.position.y = 0.1; g.add(globe);
      g.position.set(x, y, z);
      this.group.add(g);
      this.anim.lampGlows.push(globe);
      if (light) {
        const l = new THREE.PointLight(0xffb565, 26, 22, 1.5);
        l.position.set(x, y - 0.1, z);
        this.group.add(l); this.lights.push(l);
      }
    };
    for (const x of [-16, -6, 4, 14]) pend(x, 0, FLOOR_Y + 7.2, true);
    for (const s of [1, -1]) for (const x of [-20, -8, 4, 16]) pend(x, s * 6.5, FLOOR_Y + 8.0, false);
    // lamp standards at the plinth corners
    for (const [x, z] of [[-11.8, 4.2], [8.6, 4.2], [-11.8, -4.2], [8.6, -4.2]]) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(latheY([[0.3, 0], [0.3, 0.15], [0.16, 0.3], [0.09, 0.6], [0.06, 1.2], [0.05, 3.2], [0.09, 3.3], [0.001, 3.3]], 20), M.iron));
      const lantern = new THREE.Mesh(latheY([[0.001, 3.3], [0.2, 3.35], [0.24, 3.7], [0.3, 3.8], [0.08, 4.05], [0.001, 4.1]], 6), new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffb860, emissiveIntensity: 2.4, roughness: 0.4 }));
      g.add(lantern);
      g.position.set(x, FLOOR_Y, z);
      this.group.add(g);
    }
    for (const [x, z] of [[-11.8, 4.2], [8.6, 4.2]]) {
      const l = new THREE.PointLight(0xffa850, 8, 12, 1.6);
      l.position.set(x, FLOOR_Y + 3.6, z); this.group.add(l); this.lights.push(l);
    }
    // soft glow cones under the pendants (hazy air)
    const coneMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      uniforms: { uColor: { value: new THREE.Color(0xffa860) }, uI: { value: 0.07 } },
      vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uI; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){ float rim = pow(abs(dot(vN, vV)), 1.5); float fade = pow(vUv.y, 1.6); gl_FragColor = vec4(uColor * rim * fade * uI, 1.0); }`,
    });
    for (const x of [-16, -6, 4, 14]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 3.2, 7.5, 32, 1, true), coneMat);
      c.position.set(x, FLOOR_Y + 7.0 - 3.75, 0);
      this.group.add(c);
    }
  }

  buildFurnishings() {
    const M = this.M;
    // benches along the aisles
    const bench = () => {
      const g = [];
      for (let i = 0; i < 5; i++) g.push(at(box(2.2, 0.04, 0.09), 0, 0.45, -0.2 + i * 0.1));
      for (let i = 0; i < 4; i++) { const b = box(2.2, 0.04, 0.08); b.rotateX(-0.25); g.push(at(b, 0, 0.62 + i * 0.12, -0.32 - i * 0.03)); }
      return merge(g);
    };
    const legs = () => {
      const g = [];
      for (const x of [-1.0, 1.0]) {
        g.push(at(box(0.06, 0.45, 0.06), x, 0.22, 0.15), at(box(0.06, 1.0, 0.06), x, 0.5, -0.3), at(box(0.06, 0.06, 0.55), x, 0.42, -0.05));
      }
      return merge(g);
    };
    const bg = bench(), lg = legs();
    const benches = [], bl = [];
    for (const s of [1, -1]) for (const x of [-20, -4, 12]) {
      const b = bg.clone(); const l = lg.clone();
      if (s > 0) { b.rotateY(Math.PI); l.rotateY(Math.PI); }
      benches.push(at(b, x, FLOOR_Y, -s * (HALL.z - 1.2))); bl.push(at(l, x, FLOOR_Y, -s * (HALL.z - 1.2)));
    }
    this.group.add(new THREE.Mesh(merge(benches), M.wood));
    this.group.add(new THREE.Mesh(merge(bl), M.ironDark));
    // potted palms between the columns (a conservatory touch)
    const leafTex = (() => {
      const c = document.createElement('canvas'); c.width = 64; c.height = 256; const x = c.getContext('2d');
      x.fillStyle = '#2f5a2a'; x.strokeStyle = '#3d7034'; x.lineWidth = 2;
      for (let i = 0; i < 40; i++) {
        const y = 10 + i * 6, w = 28 * Math.sin((i / 40) * Math.PI);
        x.beginPath(); x.moveTo(32, y); x.quadraticCurveTo(32 - w, y + 4, 32 - w * 1.05, y + 14); x.lineTo(32, y + 3); x.fill();
        x.beginPath(); x.moveTo(32, y); x.quadraticCurveTo(32 + w, y + 4, 32 + w * 1.05, y + 14); x.lineTo(32, y + 3); x.fill();
      }
      x.fillStyle = '#5a6a30'; x.fillRect(31, 0, 2, 256);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const leafMat = new THREE.MeshStandardMaterial({ map: leafTex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.7 });
    const potMat = new THREE.MeshStandardMaterial({ color: 0x7a3a22, roughness: 0.6 });
    const r = rng(31);
    for (const s of [1, -1]) for (const x of [-12, 0, 12]) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(latheY([[0.001, 0], [0.32, 0], [0.42, 0.55], [0.48, 0.6], [0.001, 0.6]], 20), potMat));
      g.add(at(new THREE.Mesh(cylY(0.06, 1.3, 8, false, 0.04), new THREE.MeshStandardMaterial({ color: 0x4a3a28, roughness: 1 })), 0, 1.2, 0));
      for (let i = 0; i < 11; i++) {
        const leaf = new THREE.PlaneGeometry(0.55, 1.8, 1, 8);
        const p = leaf.attributes.position;
        for (let k = 0; k < p.count; k++) { const y = p.getY(k) + 0.9; p.setY(k, y); p.setZ(k, -0.25 * y * y); }
        leaf.computeVertexNormals();
        leaf.rotateX(-0.6 - r() * 0.5);
        leaf.rotateY((i / 11) * Math.PI * 2 + r() * 0.3);
        g.add(at(new THREE.Mesh(leaf, leafMat), 0, 1.8, 0));
      }
      g.position.set(x + 4, FLOOR_Y, s * (HALL.colZ + 1.4));
      this.group.add(g);
    }
  }

  buildMotes() {
    const n = 1400;
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(n * 3);
    const r = rng(99);
    for (let i = 0; i < n; i++) { p[i * 3] = (r() - 0.5) * 30; p[i * 3 + 1] = FLOOR_Y + r() * 10; p[i * 3 + 2] = (r() - 0.5) * 16; }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const m = new THREE.PointsMaterial({ size: 0.028, map: softSprite(), color: 0xffd9a0, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    this.group.add(pts);
    this.anim.motes = { pts, base: p.slice(), n };
  }

  update(sim, t) {
    for (const r of this.anim.rollers) r.m.rotation.z = sim.theta * r.ratio;
    const M = this.anim.motes; const p = M.pts.geometry.attributes.position.array;
    for (let i = 0; i < M.n; i++) {
      p[i * 3] = M.base[i * 3] + Math.sin(t * 0.07 + i) * 0.6;
      p[i * 3 + 1] = M.base[i * 3 + 1] + Math.sin(t * 0.05 + i * 1.7) * 0.4;
      p[i * 3 + 2] = M.base[i * 3 + 2] + Math.cos(t * 0.06 + i * 0.3) * 0.6;
    }
    M.pts.geometry.attributes.position.needsUpdate = true;
    const d = new Date();
    const h = d.getHours() % 12 + d.getMinutes() / 60, mi = d.getMinutes() + d.getSeconds() / 60;
    this.anim.hourHand.rotation.z = -(h / 12) * Math.PI * 2;
    this.anim.minHand.rotation.z = -(mi / 60) * Math.PI * 2;
    for (const [i, gl] of this.anim.lampGlows.entries()) gl.material.emissiveIntensity = 3.0 + Math.sin(t * 9 + i * 2) * 0.08;
  }
}

// An environment map with warm lamps and cool dusk windows, for reflections.
export function makeEnvironment(renderer) {
  const scene = new THREE.Scene();
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(50, 64, 32), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `varying vec3 vP; void main(){ float h = normalize(vP).y;
      vec3 floorC = vec3(0.16,0.09,0.06); vec3 wall = vec3(0.32,0.2,0.13); vec3 roof = vec3(0.12,0.12,0.22);
      vec3 c = h < 0.0 ? mix(wall, floorC, smoothstep(0.0,-0.4,h)) : mix(wall, roof, smoothstep(0.05,0.7,h));
      gl_FragColor = vec4(c, 1.0); }`,
  }));
  scene.add(sphere);
  const lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 4.2, 2.4) });
  for (const x of [-16, -6, 4, 14]) { const m = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 8), lamp); m.position.set(x, 9, 0); scene.add(m); }
  const win = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.55, 0.65) });
  for (const s of [1, -1]) for (let x = -28; x <= 28; x += 8) { const m = new THREE.Mesh(new THREE.PlaneGeometry(3, 6), win); m.position.set(x, 4, s * 30); m.lookAt(0, 4, 0); scene.add(m); }
  const sky = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 0.3, 0.6) });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(60, 18), sky); top.position.set(0, 30, 0); top.rotation.x = Math.PI / 2; scene.add(top);
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(scene, 0.02);
  pm.dispose();
  return rt.texture;
}
