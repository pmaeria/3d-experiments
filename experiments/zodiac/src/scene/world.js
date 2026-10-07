// The 3D world: renderer + bloom, the three linked views (helio / geo / sky) as one scene with
// a smooth morph between them, per-frame layout from the shared sky frame, and picking.
//
// Frames: all astronomy lives in `this.astro`, a group rotated -90 deg about x, so its children
// work directly in the engine's world frame (J2000 ecliptic, z-up) and three.js sees y-up:
// (x, y, z)ecl -> (x, z, -y), the same map as layout.eclToThree (used for cameras and labels).

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { horizonBasis, altAzToWorld, loadSkyData } from '../astro/index.js';
import { planets } from '../content/index.js';
import {
  AU, ringRadiusFor, RING_AU, bodyPosition, earthPosition, eclToThree, threeToEcl, easeInOutCubic, SKY_DOME,
} from './layout.js';
import { Labels } from './labels.js';
import { ZodiacRing } from './ring.js';
import { Starfield } from './starfield.js';
import { Bodies } from './bodies.js';
import { LocalSky } from './skydome.js';
import { Orbit, Trail, ORBIT_PERIODS, TRAIL_WINDOWS } from './paths.js';
import { toggleFor, toggleOn } from '../state.js';

const PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
// Marker radius as a fraction of camera distance, and a cap (AU) used at true scale so the
// enlarged markers never swallow neighbouring orbits.
const SIZE = {
  sun: [0.02, 0.22], moon: [0.0055, 0.012], mercury: [0.0055, 0.06], venus: [0.0075, 0.08],
  earth: [0.0075, 0.08], mars: [0.0065, 0.07], jupiter: [0.012, 0.6], saturn: [0.0105, 0.6],
  uranus: [0.0085, 0.5], neptune: [0.0085, 0.5], pluto: [0.005, 0.4],
};
// Angular radius (deg) of markers on the sky dome (Sun and Moon about twice true size).
const SKY_SIZE = { sun: 0.6, moon: 0.6, venus: 0.22, jupiter: 0.2, mars: 0.17, saturn: 0.17, mercury: 0.14, uranus: 0.12, neptune: 0.12, pluto: 0.1 };
const MORPH_TIME = { a: 1.15, c: 0.85, s: 1.25 };
const VIEW_TARGET = { helio: { a: 0, s: 0 }, geo: { a: 1, s: 0 }, sky: { a: 1, s: 1 } };
const PRESETS = { default: 50, tilt: 26, edge: 1.2, top: 89.5 };
const CAM_DIST = 3.7;
const NEAR_SHELL = 1.38; // radius (x R) of the ecliptic-constellation shell around Earth

const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpM = new THREE.Matrix4();

export class World {
  constructor({ canvas, labelLayer, store, reduced }) {
    this.store = store;
    this.reduced = reduced;
    this.canvas = canvas;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x04060c, 1);
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x04060c);

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 5000);
    this.orbitCam = new THREE.PerspectiveCamera(40, 1, 0.1, 5000);
    this.controls = new OrbitControls(this.orbitCam, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.9;
    this.controls.enablePan = false;

    this.astro = new THREE.Group();
    this.astro.rotation.x = -Math.PI / 2;
    this.scene.add(this.astro);

    this.labels = new Labels(labelLayer, this.camera);

    const pick = (sel) => this.onPick?.(sel);
    const hover = (h) => this.setHover(h, 'dom');
    this.starfield = new Starfield({ pixelRatio: renderer.getPixelRatio(), labels: this.labels });
    this.ring = new ZodiacRing({ renderer, labels: this.labels, onPickToken: pick, onHoverToken: hover });
    this.bodies = new Bodies({ labels: this.labels, onPick: pick, onHover: hover });
    this.localSky = new LocalSky({ labels: this.labels });
    this.astro.add(this.starfield.group, this.ring.group, this.bodies.group, this.localSky.group, this.localSky.equatorGroup);

    // orbits and trails
    this.orbits = {};
    for (const id of ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']) {
      const color = id === 'earth' ? '#4f8fdc' : planets[id].color;
      this.orbits[id] = new Orbit({ id, kind: id === 'earth' ? 'earth' : 'geo', periodDays: ORBIT_PERIODS[id], color, helio: id !== 'earth' });
      this.astro.add(this.orbits[id].object);
    }
    this.orbits.moon = new Orbit({ id: 'moon', periodDays: ORBIT_PERIODS.moon, color: planets.moon.color, earthFixed: true, n: 181 });
    this.sunPath = new Orbit({ id: 'sun', kind: 'sunPath', periodDays: 365.256, color: planets.sun.color });
    this.astro.add(this.orbits.moon.object, this.sunPath.object);
    this.trails = {};
    for (const id of PLANETS) {
      this.trails[id] = new Trail({ id, windowDays: TRAIL_WINDOWS[id], color: planets[id].color, n: id === 'moon' ? 200 : 300 });
      this.astro.add(this.trails[id].object);
    }

    // composer with bloom (restrained: only the Sun is bright enough to bloom)
    const size = new THREE.Vector2();
    renderer.getDrawingBufferSize(size);
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(renderer, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.55, 0.4, 0.92);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    // view morph state
    const st = store.get();
    const v = VIEW_TARGET[st.view];
    this.m = { a: v.a, c: st.view === 'helio' ? 0 : (st.compression ? 1 : 0), s: v.s };
    this.stages = [];
    this.zoomR = { h: ringRadiusFor('helio', st.zoom), g: RING_AU.geoTrue[st.zoom] * AU };
    this.zoomTween = null;
    this.p = { a: this.m.a, c: this.m.c, s: this.m.s, R: 30 };
    this.p.R = this.computeR();
    this.lastR = this.p.R;
    this.ringAlpha = 1;

    // camera
    this.target = new THREE.Vector3();
    this.focusFrom = null; this.focusBlend = 1; this.focusId = st.focus;
    this.setOrbitPose(PRESETS.default, 35, this.p.R * CAM_DIST);
    this.camTween = null;
    this.sky = { yaw: st.location.lat >= 0 ? 180 : 0, pitch: 22, fov: 62 };
    this.installSkyLook();
    this.installPointer();

    // per-frame scratch
    this.pos = {}; this.posThree = {};
    for (const id of [...PLANETS, 'earth']) { this.pos[id] = {}; this.posThree[id] = new THREE.Vector3(); }
    this.bodyLocal = {};
    for (const id of PLANETS) this.bodyLocal[id] = { x: 0, y: 0, z: 0, dist: 0 };
    this.E = { x: 0, y: 0, z: 0 };
    this.hover = null;
    this.pointer = { x: -1, y: -1, inside: false, dirty: false };
    this.stats = { frameMs: 0, fps: 0 };

    store.subscribe((s, ch) => this.onState(s, ch));
  }

  async loadSky() {
    const data = await loadSkyData();
    this.starfield.build(data);
    this.astro.add(this.starfield.near);
  }

  /** Free screen area not covered by HUD panels: the view centres itself there. */
  setSafeArea(rect) { this.safe = rect; this.applyViewOffset(); }

  applyViewOffset() {
    if (!this.w) return;
    const r = this.safe;
    const dx = r ? (r.left + r.right) / 2 - this.w / 2 : 0;
    const dy = r ? (r.top + r.bottom) / 2 - this.h / 2 : 0;
    for (const cam of [this.camera, this.orbitCam]) {
      cam.setViewOffset(this.w, this.h, -dx, -dy, this.w, this.h);
      cam.updateProjectionMatrix();
    }
  }

  setSize(w, h) {
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.orbitCam.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.orbitCam.updateProjectionMatrix();
    this.labels.setSize(w, h);
    this.w = w; this.h = h;
    this.applyViewOffset();
  }

  // ------------------------------------------------------------------ morph

  computeR() {
    const { a, c, s } = this.m;
    const L = Math.log;
    const lnHG = L(this.zoomR.h) + (L(this.zoomR.g) - L(this.zoomR.h)) * a;
    const lnC = lnHG + (L(RING_AU.geoCompressed * AU) - lnHG) * c;
    return Math.exp(lnC + (L(RING_AU.sky * AU) - lnC) * s);
  }

  targetMorph(st) {
    const v = VIEW_TARGET[st.view];
    const c = st.view === 'helio' ? 0 : (st.compression ? 1 : 0);
    return { a: v.a, c, s: v.s };
  }

  planMorph(st, instant = false) {
    const t = this.targetMorph(st);
    const inward = t.a >= this.m.a && t.s >= this.m.s;
    const order = inward ? ['a', 'c', 's'] : ['s', 'c', 'a'];
    this.stages = [];
    for (const k of order) {
      if (Math.abs(t[k] - this.m[k]) < 1e-4) continue;
      if (instant) { this.m[k] = t[k]; continue; }
      const dur = MORPH_TIME[k] * (this.reduced ? 0.25 : 1) * Math.max(0.35, Math.abs(t[k] - this.m[k]));
      this.stages.push({ k, from: null, to: t[k], dur, t: 0 });
    }
  }

  stepMorph(dt) {
    while (this.stages.length) {
      const st = this.stages[0];
      if (st.from === null) st.from = this.m[st.k];
      st.t += dt;
      const u = Math.min(1, st.t / st.dur);
      this.m[st.k] = st.from + (st.to - st.from) * easeInOutCubic(u);
      if (u < 1) break;
      this.stages.shift();
      dt = 0;
    }
    if (this.zoomTween) {
      const z = this.zoomTween;
      z.t += dt || 0.016;
      const u = Math.min(1, z.t / z.dur);
      const e = easeInOutCubic(u);
      this.zoomR.h = Math.exp(Math.log(z.from.h) + (Math.log(z.to.h) - Math.log(z.from.h)) * e);
      this.zoomR.g = Math.exp(Math.log(z.from.g) + (Math.log(z.to.g) - Math.log(z.from.g)) * e);
      if (u >= 1) this.zoomTween = null;
    }
    this.p.a = this.m.a; this.p.c = this.m.c; this.p.s = this.m.s;
    this.p.R = this.computeR();
  }

  get morphing() { return this.stages.length > 0 || !!this.zoomTween; }

  onState(st, changed) {
    if (changed.includes('view') || changed.includes('compression')) this.planMorph(st);
    if (changed.includes('zoom')) {
      const to = { h: ringRadiusFor('helio', st.zoom), g: RING_AU.geoTrue[st.zoom] * AU };
      this.zoomTween = { from: { ...this.zoomR }, to, t: 0, dur: this.reduced ? 0.2 : 1.1 };
    }
    if (changed.includes('focus')) {
      this.focusFrom = this.target.clone();
      this.focusBlend = 0;
      this.focusId = st.focus;
    }
    if (changed.includes('cameraRequest') && st.cameraRequest) this.applyPreset(st.cameraRequest.preset);
    if (changed.includes('location')) this.sky.yaw = st.location.lat >= 0 ? 180 : 0;
    if (changed.includes('date')) {
      // large jumps: trails restart from the new moment
      const d = st.date.getTime();
      if (this._lastDate && Math.abs(d - this._lastDate) > 86400000 * 400) for (const t of Object.values(this.trails)) t.reset();
      this._lastDate = d;
    }
  }

  // ------------------------------------------------------------------ cameras

  setOrbitPose(elevDeg, azDeg, dist) {
    const el = elevDeg * Math.PI / 180, az = azDeg * Math.PI / 180;
    this.orbitCam.position.set(
      this.target.x + dist * Math.cos(el) * Math.sin(az),
      this.target.y + dist * Math.sin(el),
      this.target.z + dist * Math.cos(el) * Math.cos(az),
    );
    this.controls.target.copy(this.target);
    this.orbitCam.lookAt(this.target);
  }

  applyPreset(preset) {
    const elev = PRESETS[preset] ?? PRESETS.default;
    const off = tmpV.copy(this.orbitCam.position).sub(this.controls.target);
    const sph = new THREE.Spherical().setFromVector3(off);
    // distances are in units of the ring radius, so a preset requested together with a
    // view/zoom change lands at the right scale once the morph finishes
    const k = preset === 'top' ? 4.5 : preset === 'edge' ? 3.6 : CAM_DIST;
    this.camTween = {
      from: { phi: sph.phi, theta: sph.theta, k: sph.radius / this.p.R },
      to: { phi: (90 - elev) * Math.PI / 180, theta: sph.theta, k },
      t: 0, dur: this.reduced ? 0.2 : 1.3,
    };
  }

  /** Where the camera looks: the origin of the morph frame (Sun -> Earth), or a followed body. */
  anchorPoint(out) {
    const id = this.focusId;
    if (id && this.posThree[id] && (id !== 'earth' || this.bodiesVisible.has('earth') || this.p.a > 0.5)) return out.copy(this.posThree[id]);
    return out.set(0, 0, 0);
  }

  updateCamera(dt) {
    const anchor = this.anchorPoint(tmpV2);
    if (this.focusBlend < 1) {
      this.focusBlend = Math.min(1, this.focusBlend + dt / (this.reduced ? 0.2 : 1.0));
      anchor.lerpVectors(this.focusFrom, anchor, easeInOutCubic(this.focusBlend));
    }
    // move the orbit camera with its target, and scale its distance with the ring radius
    const delta = tmpV.copy(anchor).sub(this.controls.target);
    this.orbitCam.position.add(delta);
    this.controls.target.copy(anchor);
    this.target.copy(anchor);
    const k = this.p.R / this.lastR;
    if (Math.abs(k - 1) > 1e-9) {
      const off = tmpV.copy(this.orbitCam.position).sub(anchor).multiplyScalar(k);
      this.orbitCam.position.copy(anchor).add(off);
      this.lastR = this.p.R;
    }
    if (this.camTween) {
      const c = this.camTween;
      c.t += dt;
      const u = easeInOutCubic(Math.min(1, c.t / c.dur));
      const sph = new THREE.Spherical(this.p.R * (c.from.k + (c.to.k - c.from.k) * u), c.from.phi + (c.to.phi - c.from.phi) * u, c.from.theta);
      this.orbitCam.position.copy(anchor).add(tmpV.setFromSpherical(sph));
      this.orbitCam.lookAt(anchor);
      if (c.t >= c.dur && !this.morphing) { this.camTween = null; this.lastR = this.p.R; }
    }
    this.controls.minDistance = this.p.R * 0.05;
    this.controls.maxDistance = this.p.R * 9;
    const skyMode = this.p.s > 0.5;
    this.controls.enabled = !skyMode && !this.camTween;
    if (!this.camTween) this.controls.update();
    const camDist = this.orbitCam.position.distanceTo(anchor);
    this.orbitCam.near = Math.max(0.01, camDist * 0.004);
    this.orbitCam.far = camDist * 30 + this.p.R * 6;
    this.camDist = camDist;

    // sky pose: at Earth, looking along (alt, az) in the horizon frame
    const basis = this.frame.basis;
    const fwd = altAzToWorld(this.sky.pitch, this.sky.yaw, basis);
    const E3 = this.posThree.earth;
    const f3 = eclToThree(fwd, tmpV);
    const up3 = eclToThree(basis.zenith, new THREE.Vector3());
    tmpM.lookAt(new THREE.Vector3(0, 0, 0), f3, up3); // camera convention: eye, target, up
    const skyQ = new THREE.Quaternion().setFromRotationMatrix(tmpM);

    const k2 = THREE.MathUtils.smoothstep(this.p.s, 0.1, 0.95);
    const cam = this.camera;
    cam.position.lerpVectors(this.orbitCam.position, E3, k2);
    tmpQ.copy(this.orbitCam.quaternion).slerp(skyQ, k2);
    cam.quaternion.copy(tmpQ);
    cam.fov = 40 + (this.sky.fov - 40) * k2;
    cam.near = this.orbitCam.near + (this.p.R * 0.01 - this.orbitCam.near) * k2;
    cam.far = this.orbitCam.far + (this.p.R * 4 - this.orbitCam.far) * k2;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }

  installSkyLook() {
    let drag = null;
    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.p.s < 0.5) return;
      drag = { x: e.clientX, y: e.clientY };
      this.canvas.setPointerCapture(e.pointerId);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const degPerPx = this.sky.fov / this.h;
      this.sky.yaw = (this.sky.yaw - (e.clientX - drag.x) * degPerPx + 360) % 360;
      this.sky.pitch = Math.max(-25, Math.min(89, this.sky.pitch + (e.clientY - drag.y) * degPerPx));
      drag = { x: e.clientX, y: e.clientY };
    });
    const end = () => { drag = null; };
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);
    this.canvas.addEventListener('wheel', (e) => {
      if (this.p.s < 0.5) return;
      e.preventDefault();
      this.sky.fov = Math.max(15, Math.min(110, this.sky.fov * Math.exp(e.deltaY * 0.0012)));
    }, { passive: false });
  }

  /** Turn the sky view to face an azimuth (degrees from north). */
  faceAzimuth(az, pitch = null) {
    const from = { yaw: this.sky.yaw, pitch: this.sky.pitch };
    let d = ((az - from.yaw + 540) % 360) - 180;
    const to = { yaw: from.yaw + d, pitch: pitch ?? from.pitch };
    const t0 = performance.now();
    const dur = this.reduced ? 150 : 900;
    const step = () => {
      const u = Math.min(1, (performance.now() - t0) / dur);
      const e = easeInOutCubic(u);
      this.sky.yaw = (from.yaw + (to.yaw - from.yaw) * e + 360) % 360;
      this.sky.pitch = from.pitch + (to.pitch - from.pitch) * e;
      if (u < 1) requestAnimationFrame(step);
    };
    step();
  }

  // ------------------------------------------------------------------ picking

  installPointer() {
    let down = null;
    this.canvas.addEventListener('pointermove', (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.pointer.x = e.clientX - r.left; this.pointer.y = e.clientY - r.top;
      this.pointer.inside = true; this.pointer.dirty = true;
    });
    this.canvas.addEventListener('pointerleave', () => { this.pointer.inside = false; this.pointer.dirty = true; });
    this.canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    this.canvas.addEventListener('pointerup', (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 5) return;
      const r = this.canvas.getBoundingClientRect();
      const hit = this.pickAt(e.clientX - r.left, e.clientY - r.top);
      if (hit) this.onPick?.(hit);
    });
  }

  setHover(h, source) {
    if (source === 'dom') this.domHover = h;
    const cur = this.store.get().hover;
    const nh = this.domHover ?? h;
    if ((cur?.kind ?? null) !== (nh?.kind ?? null) || (cur?.id ?? null) !== (nh?.id ?? null)) {
      this.store.patch({ hover: nh });
    }
    this.canvas.classList.toggle('pointing', !!nh);
  }

  pickAt(x, y) {
    if (!this.frame) return null;
    // bodies first: screen-space proximity (markers are small)
    let best = null, bestD = Infinity;
    for (const id of this.bodiesVisible) {
      if (id === 'ascendant' || id === 'midheaven') continue;
      const p3 = this.posThree[id];
      if (!p3) continue;
      tmpV.copy(p3).project(this.camera);
      if (tmpV.z > 1 || tmpV.z < -1) continue;
      const sx = (tmpV.x * 0.5 + 0.5) * this.w, sy = (-tmpV.y * 0.5 + 0.5) * this.h;
      const rpx = this.screenRadius(id, p3);
      const d = Math.hypot(sx - x, sy - y);
      if (d < Math.max(12, rpx + 6) && d < bestD) { best = id; bestD = d; }
    }
    if (best) return { kind: 'body', id: best };
    // ring slices / houses: analytic, in the ring's own frame
    if (this.ringAlpha > 0.5) {
      const ndc = new THREE.Vector2((x / this.w) * 2 - 1, -(y / this.h) * 2 + 1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, this.camera);
      const inv = tmpM.copy(this.ring.group.matrixWorld).invert();
      const o = ray.ray.origin.clone().applyMatrix4(inv);
      const d = ray.ray.direction.clone().transformDirection(inv);
      // transformDirection normalises; that is fine for both tests
      const hit = this.ring.pickLocal(o, d, this.p.s, toggleOn(this.store.get().toggles.houses));
      if (hit) return { kind: hit.kind, id: hit.id };
    }
    return null;
  }

  screenRadius(id, p3) {
    const size = this.bodies.sizes[id] ?? 0;
    const dist = this.camera.position.distanceTo(p3);
    return (size / Math.max(dist, 1e-6)) / Math.tan((this.camera.fov * Math.PI) / 360) * (this.h / 2);
  }

  /** Screen position of a selectable thing (for tooltips): {x, y} or null. */
  screenPosOf(sel) {
    if (!sel) return null;
    if (sel.kind === 'body') {
      const lbl = this.ring.tokens[sel.id];
      const p3 = this.posThree[sel.id];
      if (p3 && this.bodiesVisible.has(sel.id)) {
        tmpV.copy(p3).project(this.camera);
        if (tmpV.z < 1) return { x: (tmpV.x * 0.5 + 0.5) * this.w, y: (-tmpV.y * 0.5 + 0.5) * this.h, r: this.screenRadius(sel.id, p3) };
      }
      if (lbl?.screen.onScreen) return { x: lbl.screen.x, y: lbl.screen.y, r: 10 };
    }
    return null;
  }

  // ------------------------------------------------------------------ frame

  update(state, frame, dt, time) {
    const t0 = performance.now();
    this.frame = frame;
    this.stepMorph(dt);
    const p = this.p;
    const sky = frame.sky;
    const tg = state.toggles;

    // visibility
    const vis = new Set(state.bodies);
    if (p.a > 0.5) vis.add('earth');
    if (p.s > 0.5) vis.delete('earth');
    this.bodiesVisible = vis;

    // Earth and bodies
    const E = earthPosition(sky.earthHelio, p, this.E);
    eclToThree(E, this.posThree.earth);
    this.pos.earth = E;
    const camDist = this.camDist ?? p.R * CAM_DIST;
    const capScale = 1 / Math.max(1e-4, 1 - p.c);
    const earthF = SIZE.earth[0] + (0.028 - SIZE.earth[0]) * p.a;
    const earthSize = Math.min(earthF * camDist, SIZE.earth[1] * AU * capScale * (1 + 3 * p.a));
    const moonMinR = earthSize * 2.4;
    const rows = frame.ringMatrix.rows;
    for (const id of PLANETS) {
      const b = sky.bodies[id];
      const dome = id === 'moon' ? SKY_DOME.moon : SKY_DOME.body;
      const P = bodyPosition(frame.dirs[id], b.distance, sky.earthHelio, p, { minR: id === 'moon' ? moonMinR : 0, dome }, this.pos[id]);
      eclToThree(P, this.posThree[id]);
      // ring-local position (for sight lines): M^T (P - E) / R
      const dx = (P.x - E.x) / p.R, dy = (P.y - E.y) / p.R, dz = (P.z - E.z) / p.R;
      const bl = this.bodyLocal[id];
      bl.x = rows[0][0] * dx + rows[1][0] * dy + rows[2][0] * dz;
      bl.y = rows[0][1] * dx + rows[1][1] * dy + rows[2][1] * dz;
      bl.z = rows[0][2] * dx + rows[1][2] * dy + rows[2][2] * dz;
      bl.dist = Math.hypot(dx, dy, dz);
      const [f, cap] = SIZE[id];
      let size = Math.min(f * camDist, cap * AU * capScale);
      const skySize = (id === 'moon' ? SKY_DOME.moon : SKY_DOME.body) * p.R * Math.tan((SKY_SIZE[id] * Math.PI) / 180);
      size += (skySize - size) * p.s;
      this.bodies.sizes[id] = size;
      const mesh = this.bodies.meshes[id];
      mesh.position.set(P.x, P.y, P.z);
      mesh.scale.setScalar(size);
      mesh.visible = vis.has(id);
    }
    // lighting directions (true geometry, three coords)
    const sunDir = new THREE.Vector3();
    for (const id of PLANETS) {
      if (id === 'sun') continue;
      const b = sky.bodies[id];
      const v = id === 'moon'
        ? { x: sky.bodies.sun.geo.x - b.geo.x, y: sky.bodies.sun.geo.y - b.geo.y, z: sky.bodies.sun.geo.z - b.geo.z }
        : { x: -b.helio.x, y: -b.helio.y, z: -b.helio.z };
      eclToThree(v, sunDir).normalize();
      this.bodies.setSunDir(id, sunDir);
    }
    eclToThree({ x: -sky.earthHelio.x, y: -sky.earthHelio.y, z: -sky.earthHelio.z }, sunDir).normalize();
    this.bodies.setSunDir('earth', sunDir);
    this.bodies.sunMat.uniforms.uTime.value = this.reduced ? 0 : time;
    this.bodies.sunGlow.scale.setScalar(6 + 2 * (1 - p.s));

    // Earth globe: Earth-fixed axes from the horizon basis of (0,0) and the pole
    const b00 = horizonBasis(frame.date, 0, 0);
    const pole = horizonBasis(frame.date, 90, 0).zenith;
    const X = new THREE.Vector3(b00.zenith.x, b00.zenith.y, b00.zenith.z);
    const Z = new THREE.Vector3(pole.x, pole.y, pole.z);
    const Y = new THREE.Vector3().crossVectors(Z, X).normalize();
    tmpM.makeBasis(X, Y, Z);
    const ef = this.bodies.earthFixed;
    ef.quaternion.setFromRotationMatrix(tmpM);
    ef.position.set(E.x, E.y, E.z);
    const earthShown = vis.has('earth');
    const earthScale = earthSize * (1 - THREE.MathUtils.smoothstep(p.s, 0, 0.6));
    ef.scale.setScalar(Math.max(earthScale, 1e-6));
    ef.visible = earthShown && earthScale > 1e-4;
    this.bodies.sizes.earth = earthScale;
    const lat = state.location.lat * Math.PI / 180, lon = state.location.lon * Math.PI / 180;
    const pinDir = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat));
    this.bodies.earthMat.uniforms.uPin.value.copy(pinDir);
    this.bodies.pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pinDir);
    this.bodies.pin.visible = p.a > 0.3 || state.view !== 'helio';
    this.bodies.axis.visible = toggleOn(tg.earthAxis);

    // ring frame
    const ringOn = toggleOn(tg.ring) ? 1 : 0;
    this.ringAlpha += (ringOn - this.ringAlpha) * (1 - Math.exp(-dt * 7));
    const rg = this.ring.group;
    rg.position.set(E.x, E.y, E.z);
    tmpM.makeBasis(
      tmpV.set(rows[0][0], rows[1][0], rows[2][0]),
      tmpV2.set(rows[0][1], rows[1][1], rows[2][1]),
      new THREE.Vector3(rows[0][2], rows[1][2], rows[2][2]),
    );
    rg.quaternion.setFromRotationMatrix(tmpM);
    rg.scale.setScalar(p.R);

    // local sky + equator
    const ls = this.localSky;
    ls.setBasis(frame.basis);
    ls.group.position.set(E.x, E.y, E.z);
    ls.group.scale.setScalar(p.R);
    ls.setEquator(pole);
    ls.equatorGroup.position.set(E.x, E.y, E.z);
    ls.equatorGroup.scale.setScalar(p.R);

    // daylight (sky view only)
    const alt = frame.altAz.sun.alt;
    const dayOn = state.daylight && vis.has('sun');
    const day = dayOn ? THREE.MathUtils.smoothstep(alt, -4, 8) : 0;
    const twilight = dayOn ? THREE.MathUtils.smoothstep(alt, -18, -2) * (1 - day) : 0;
    const skyW = THREE.MathUtils.smoothstep(p.s, 0.35, 1);
    const sunH = frame.altAz.sun;
    const sunLocal = new THREE.Vector3(
      Math.cos(sunH.alt * Math.PI / 180) * Math.sin(sunH.az * Math.PI / 180),
      Math.cos(sunH.alt * Math.PI / 180) * Math.cos(sunH.az * Math.PI / 180),
      Math.sin(sunH.alt * Math.PI / 180),
    );

    // update the scene graph matrices before anything projects ring-local points
    this.updateCamera(dt);
    this.scene.updateMatrixWorld();

    ls.update({
      s: p.s, horizonOn: toggleOn(tg.horizon), meridianOn: toggleOn(tg.meridian), day: day * skyW, twilight: twilight * skyW,
      sunLocal, axisOn: toggleOn(tg.earthAxis), ringAlpha: Math.max(this.ringAlpha, 0.6),
    });

    const hlBodies = new Set(state.highlight?.bodies ?? []);
    this.ring.update({
      state, frame, s: p.s, dt, time, ringAlpha: this.ringAlpha, bodyLocal: this.bodyLocal, visible: vis,
      hover: state.hover, highlightBodies: hlBodies, reduced: this.reduced,
    });

    // stars
    const camEcl = threeToEcl(this.camera.position, {});
    const hlSigns = new Set(state.highlight?.signs ?? []);
    if (state.selection?.kind === 'sign') hlSigns.add(state.selection.id);
    if (state.hover?.kind === 'sign') hlSigns.add(state.hover.id);
    const extraCons = [];
    if (state.selection?.kind === 'body' && sky.bodies[state.selection.id]) extraCons.push(sky.bodies[state.selection.id].constellation.symbol);
    const nearWeight = 1 - THREE.MathUtils.smoothstep(p.s, 0.2, 0.8);
    if (this.starfield.near) {
      this.starfield.near.position.set(E.x, E.y, E.z);
      this.starfield.near.scale.setScalar(p.R * NEAR_SHELL);
    }
    this.starfield.update({
      nearWeight,
      nearToWorld: (dir, out) => out.set(E.x + dir.x * p.R * NEAR_SHELL, E.y + dir.y * p.R * NEAR_SHELL, E.z + dir.z * p.R * NEAR_SHELL).applyMatrix4(this.astro.matrixWorld),
      cameraEcl: new THREE.Vector3(camEcl.x, camEcl.y, camEcl.z),
      dim: 1 - 0.93 * day * skyW, time, reduced: this.reduced,
      showConstellations: toggleOn(tg.constellations), hlSigns, extraCons,
      toWorld: (dir, out) => out.copy(dir).multiplyScalar(48).add(new THREE.Vector3(camEcl.x, camEcl.y, camEcl.z)).applyMatrix4(this.astro.matrixWorld),
    });
    this.scene.background.setRGB(0.016, 0.024, 0.047);

    // paths
    this.updatePaths(state, frame, vis, moonMinR);

    // body labels and halos
    for (const id of [...PLANETS, 'earth']) {
      const lbl = this.bodies.labels[id];
      const shown = vis.has(id) && (id !== 'earth' || ef.visible);
      lbl.show = shown;
      if (!shown) continue;
      const size = this.bodies.sizes[id] ?? 0;
      lbl.pos.copy(this.posThree[id]);
      const rpx = this.screenRadius(id, this.posThree[id]);
      lbl.dy = -(rpx + 12);
      lbl.alpha = 1;
      const hl = hlBodies.has(id) || state.selection?.id === id;
      lbl.el.classList.toggle('hl', hl);
      lbl.el.classList.toggle('hover', state.hover?.id === id);
      lbl.el.classList.toggle('retro', !!sky.bodies[id]?.retrograde);
      lbl.el.classList.toggle('dim', hlBodies.size > 0 && !hl);
      void size;
    }
    const sel = state.selection?.kind === 'body' ? state.selection.id : null;
    const halo = this.bodies.halo;
    if (sel && this.posThree[sel] && vis.has(sel)) {
      halo.visible = true;
      tmpV.copy(this.posThree[sel]).applyMatrix4(tmpM.copy(this.astro.matrixWorld).invert());
      halo.position.copy(tmpV);
      halo.scale.setScalar(Math.max((this.bodies.sizes[sel] ?? 1) * 3.2, this.camera.position.distanceTo(this.posThree[sel]) * 0.03));
    } else halo.visible = false;
    const hov = state.hover?.kind === 'body' ? state.hover.id : null;
    const hh = this.bodies.hoverHalo;
    if (hov && hov !== sel && this.posThree[hov] && vis.has(hov)) {
      hh.visible = true;
      tmpV.copy(this.posThree[hov]).applyMatrix4(tmpM.copy(this.astro.matrixWorld).invert());
      hh.position.copy(tmpV);
      hh.scale.setScalar(Math.max((this.bodies.sizes[hov] ?? 1) * 3.2, this.camera.position.distanceTo(this.posThree[hov]) * 0.03));
    } else hh.visible = false;

    // hover picking (once per frame at most)
    if (this.pointer.dirty) {
      this.pointer.dirty = false;
      const h = this.pointer.inside ? this.pickAt(this.pointer.x, this.pointer.y) : null;
      this.setHover(h, '3d');
    }

    this.labels.update();
    this.composer.render();
    this.stats.frameMs = performance.now() - t0;
  }

  updatePaths(state, frame, vis, moonMinR) {
    const p = this.p;
    const tg = state.toggles;
    const sky = frame.sky;
    const eh = sky.earthHelio;
    const orbitsOn = toggleOn(tg.orbits);
    const morphA = Math.sin(Math.PI * Math.min(1, Math.max(0, p.a)));
    for (const [id, o] of Object.entries(this.orbits)) {
      let alpha = 0;
      if (id === 'moon') alpha = orbitsOn && vis.has('moon') ? 0.3 * (1 - p.s) : 0;
      else if (id === 'earth') alpha = (orbitsOn || morphA > 0.01) && (vis.has('earth') || p.a > 0) ? 0.55 * (1 - p.a) * (orbitsOn ? 1 : morphA) : 0;
      else alpha = orbitsOn && vis.has(id) ? 0.38 * (1 - p.a) : 0;
      o.object.visible = alpha > 0.005;
      if (!o.object.visible) continue;
      o.update(frame.date);
      o.line.setLayout(p, eh, id === 'moon' ? moonMinR : 0);
      o.line.uniforms.uOpacity.value = alpha;
    }
    // the Sun's yearly path around Earth: grows as the frame slides onto Earth
    const sunAlpha = vis.has('sun') && (orbitsOn || morphA > 0.01) ? 0.55 * p.a * (orbitsOn ? 1 : morphA) * (1 - p.s) : 0;
    this.sunPath.object.visible = sunAlpha > 0.005;
    if (this.sunPath.object.visible) {
      this.sunPath.update(frame.date);
      this.sunPath.line.setLayout(p, eh);
      this.sunPath.line.uniforms.uOpacity.value = sunAlpha;
    }
    // trails: fade out at very high rates (they would need thousands of samples per frame)
    const fast = Math.abs(state.rate) > 120;
    for (const id of PLANETS) {
      const tr = this.trails[id];
      const on = toggleFor(tg.trails, id) && vis.has(id) && !fast;
      tr.object.visible = on;
      if (!on) continue;
      tr.update(frame.date, sky);
      tr.line.setLayout(p, eh, id === 'moon' ? moonMinR : 0, id === 'moon' ? SKY_DOME.moon : SKY_DOME.body);
      tr.line.uniforms.uOpacity.value = 0.85;
    }
  }
}
