import '@fontsource/cinzel/700.css';
import '@fontsource/cinzel/900.css';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/400-italic.css';
import '@fontsource/eb-garamond/600.css';
import '@fontsource/im-fell-english-sc/400.css';
import './style.css';

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

import { Sim, LIMITS } from './sim.js';
import { Locomotive } from './locomotive.js';
import { Hall, makeEnvironment, FLOOR_Y } from './hall.js';
import { SteamEffects } from './particles.js';
import { Flows } from './flows.js';
import { EngineAudio } from './audio.js';
import { CylinderDiagram } from './diagram.js';
import { PARTS, VIEWS, TOUR } from './content.js';
import { makeGauge, makeLever, Labels, toast } from './ui.js';

const $ = (id) => document.getElementById(id);
document.body.classList.add('intro');

async function boot() {
  await Promise.all([
    document.fonts.load('700 20px Cinzel'), document.fonts.load('900 20px Cinzel'),
    document.fonts.load('400 20px "EB Garamond"'), document.fonts.load('italic 400 20px "EB Garamond"'),
    document.fonts.load('400 20px "IM Fell English SC"'),
  ]).catch(() => {});

  // ------------------------------------------------------------------ renderer & scene
  const canvas = $('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  const DPR = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(DPR);
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x120c08);
  scene.fog = new THREE.FogExp2(0x1a120c, 0.018);
  const envMap = makeEnvironment(renderer);
  scene.environment = envMap;
  scene.environmentIntensity = 0.85;

  const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.05, 220);
  camera.position.set(-6, 8, 26);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.07;
  controls.minDistance = 1.2; controls.maxDistance = 30;
  controls.maxPolarAngle = Math.PI * 0.53;
  controls.target.set(0, 2, 0);
  controls.autoRotateSpeed = 0.35;
  controls.zoomSpeed = 0.8;

  // lights: a warm key through the roof, cool dusk fill, warm bounce
  const key = new THREE.SpotLight(0xffd6a0, 300, 60, 0.42, 0.65, 1.6);
  key.position.set(7, 15, 11); key.target.position.set(-0.8, 1.2, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.00015; key.shadow.normalBias = 0.02;
  key.shadow.camera.near = 6; key.shadow.camera.far = 40;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x8090ff, 0.3);
  rim.position.set(-10, 9, -12);
  scene.add(rim);
  const hemi = new THREE.HemisphereLight(0x7a80b8, 0x4a2a18, 0.35);
  scene.add(hemi);
  // an inspection lamp that follows the visitor's eye when the engine is cut open
  const inspect = new THREE.PointLight(0xfff0dc, 0, 14, 1.4);
  inspect.position.set(0.6, 0.8, 0);
  camera.add(inspect);
  scene.add(camera);

  // ------------------------------------------------------------------ world
  const hall = new Hall(scene);
  const loco = new Locomotive({ envMap });
  scene.add(loco.group);
  const sim = new Sim();
  const effects = new SteamEffects(scene, loco, loco.noiseTex);
  const flows = new Flows(scene, loco);
  const audio = new EngineAudio();

  // ------------------------------------------------------------------ post-processing
  const rt = new THREE.WebGLRenderTarget(innerWidth * DPR, innerHeight * DPR, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const outline = new OutlinePass(new THREE.Vector2(innerWidth, innerHeight), scene, camera);
  outline.edgeStrength = 4; outline.edgeGlow = 0.7; outline.edgeThickness = 1.6; outline.pulsePeriod = 2.6;
  outline.visibleEdgeColor.set(0xffd27a); outline.hiddenEdgeColor.set(0x7a4a14);
  composer.addPass(outline);
  // guard: a single NaN/Inf pixel would be smeared across the frame by bloom
  composer.addPass(new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
      void main(){ vec4 c = texture2D(tDiffuse, vUv);
        bool bad = !(c.r == c.r) || !(c.g == c.g) || !(c.b == c.b) || c.r > 6.0e4 || c.g > 6.0e4 || c.b > 6.0e4;
        gl_FragColor = bad ? vec4(0.0, 0.0, 0.0, 1.0) : vec4(min(c.rgb, vec3(48.0)), c.a); }`,
  }));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.38, 0.55, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(innerWidth, innerHeight) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uRes; varying vec2 vUv;
      void main(){
        vec4 c = texture2D(tDiffuse, vUv);
        vec2 d = vUv - 0.5; d.x *= uRes.x / uRes.y * 0.75;
        float vig = smoothstep(0.95, 0.3, length(d));
        c.rgb *= mix(0.5, 1.0, vig);
        float g = fract(sin(dot(floor(vUv * uRes) + fract(uTime) * 91.0, vec2(12.9898, 78.233))) * 43758.5453);
        c.rgb += (g - 0.5) * 0.028;
        c.rgb = mix(c.rgb, c.rgb * vec3(1.05, 1.0, 0.92), 0.5);
        gl_FragColor = c;
      }`,
  });
  composer.addPass(grade);

  // ------------------------------------------------------------------ state
  const view = {
    cut: false, flows: false, labels: false, diagram: true, orbit: false, sound: true,
    timeScale: 1, camera, cutSide: 1,
  };
  let cutEase = 0;

  // ------------------------------------------------------------------ instruments
  const gP = makeGauge($('gPressure'), { min: 0, max: 200, major: 50, minor: 10, label: 'BOILER', unit: 'lb / sq in', red: [160, 200] });
  const gS = makeGauge($('gSpeed'), { min: 0, max: 80, major: 20, minor: 5, label: 'SPEED', unit: 'miles per hour' });
  const gF = makeGauge($('gFire'), { min: 0, max: 1600, major: 400, minor: 100, label: 'FIREBOX', unit: '°C', red: [1400, 1600], fmt: (v) => (v ? `${v / 100}` : '0'), face: '#f6e1c4' });
  const waterEl = $('waterLevel');

  // ------------------------------------------------------------------ driver's controls
  const regLever = makeLever($('regLever'), (v) => { sim.c.regulator = v; });
  const bindRange = (id, fn) => { const e = $(id); e.addEventListener('input', () => fn(+e.value)); return e; };
  const revEl = bindRange('reverser', (v) => { sim.c.reverser = v / 100; });
  const fireEl = bindRange('firing', (v) => { sim.c.firing = v / 100; if (sim.c.autoFireman) { sim.c.autoFireman = false; $('tAuto').checked = false; } });
  bindRange('blower', (v) => { sim.c.blower = v / 100; if (sim.c.autoFireman) { sim.c.autoFireman = false; $('tAuto').checked = false; } });
  bindRange('load', (v) => { sim.c.load = v / 100; });
  const bindToggle = (id, fn) => { const e = $(id); e.addEventListener('change', () => fn(e.checked)); return e; };
  const injEl = bindToggle('tInj', (v) => { sim.c.injector = v; if (sim.c.autoFireman) { sim.c.autoFireman = false; $('tAuto').checked = false; } });
  bindToggle('tDrain', (v) => { sim.c.drainCocks = v; });
  bindToggle('tAuto', (v) => { sim.c.autoFireman = v; });
  const cutEl = bindToggle('tCut', (v) => { view.cut = v; });
  const flowEl = bindToggle('tFlow', (v) => { view.flows = v; $('legend').classList.toggle('show', v); if (v && !view.cut) { view.cut = true; cutEl.checked = true; } });
  const labelEl = bindToggle('tLabels', (v) => { view.labels = v; labels.show(v); });
  const diagEl = bindToggle('tDiagram', (v) => { view.diagram = v; $('diagram').classList.toggle('off', !v); });
  const orbitEl = bindToggle('tOrbit', (v) => { view.orbit = v; controls.autoRotate = v; });
  const soundEl = bindToggle('tSound', (v) => { view.sound = v; audio.setEnabled(v); });

  const whistleBtn = $('whistle');
  const setWhistle = (on) => { sim.c.whistle = on; whistleBtn.classList.toggle('on', on); };
  whistleBtn.addEventListener('pointerdown', (e) => { whistleBtn.setPointerCapture(e.pointerId); setWhistle(true); });
  whistleBtn.addEventListener('pointerup', () => setWhistle(false));
  whistleBtn.addEventListener('pointercancel', () => setWhistle(false));

  // time controls (log scale slider)
  const timeEl = $('timeScale');
  const timeButtons = [...document.querySelectorAll('[data-speed]')];
  const setTime = (v, fromSlider = false) => {
    view.timeScale = v;
    if (!fromSlider) timeEl.value = v <= 0 ? 0 : Math.round(1000 + (Math.log10(v) / 1.5) * 1000);
    timeButtons.forEach((b) => b.classList.toggle('active', Math.abs(+b.dataset.speed - v) < 1e-3));
  };
  timeEl.addEventListener('input', () => {
    const t = +timeEl.value;
    setTime(t <= 5 ? 0 : Math.pow(10, ((t - 1000) / 1000) * 1.5), true);
  });
  timeButtons.forEach((b) => b.addEventListener('click', () => setTime(+b.dataset.speed)));

  // ------------------------------------------------------------------ views, labels, picking, cards
  const flight = { active: false };
  const flyTo = (pos, target, dur = 2.2) => {
    Object.assign(flight, {
      active: true, t: 0, dur,
      p0: camera.position.clone(), p1: new THREE.Vector3(...pos),
      t0: controls.target.clone(), t1: new THREE.Vector3(...target),
    });
    flight.arc = Math.min(2.5, flight.p0.distanceTo(flight.p1) * 0.12);
  };
  controls.addEventListener('start', () => { flight.active = false; canvas.classList.add('dragging'); });
  controls.addEventListener('end', () => canvas.classList.remove('dragging'));

  const viewsEl = $('views');
  Object.entries(VIEWS).forEach(([id, v], i) => {
    const b = document.createElement('button');
    b.className = 'brass-btn';
    b.textContent = v.label;
    b.title = `Key ${i + 1}`;
    b.addEventListener('click', () => flyTo(v.pos, v.target));
    viewsEl.appendChild(b);
  });

  const labels = new Labels(loco, (id) => showInfo(id));

  let selected = null, hovered = null;
  const setOutline = () => {
    const id = hovered || selected;
    outline.selectedObjects = id ? loco.parts.get(id) ?? [] : [];
  };
  const infoCard = $('infoCard');
  const showInfo = (id) => {
    const p = PARTS[id]; if (!p) return;
    hideTour();
    selected = id; setOutline();
    $('infoTitle').textContent = p.name;
    $('infoText').textContent = p.text;
    $('infoDetail').textContent = p.detail ?? '';
    infoCard.classList.remove('hidden');
  };
  const hideInfo = () => { infoCard.classList.add('hidden'); selected = null; setOutline(); };
  $('infoClose').addEventListener('click', hideInfo);
  $('infoFocus').addEventListener('click', () => {
    if (!selected) return;
    const a = loco.anchors[selected]; if (!a) return;
    const dir = camera.position.clone().sub(a).normalize();
    if (dir.z * (a.z >= 0 ? 1 : -1) < 0.2) dir.z = a.z >= 0 ? 0.8 : -0.8;
    dir.y = Math.max(0.15, dir.y); dir.normalize();
    const pos = a.clone().addScaledVector(dir, 3.2);
    pos.y = Math.max(FLOOR_Y + 0.6, pos.y);
    flyTo(pos.toArray(), a.toArray(), 1.8);
  });

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pick = (cx, cy) => {
    ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObject(loco.group, true);
    for (const h of hits) {
      const o = h.object;
      if (!o.isMesh || !o.visible) continue;
      const part = o.userData.part;
      const mat = o.material;
      if (mat.clippingPlanes && mat.clippingPlanes.some((p) => p.distanceToPoint(h.point) < 0)) continue;
      if (!part) return null;
      if (!PARTS[part]) continue;
      return part;
    }
    return null;
  };
  const tooltip = $('tooltip');
  let downAt = null;
  let lastPick = 0;
  canvas.addEventListener('pointermove', (e) => {
    if (e.buttons) { tooltip.classList.add('hidden'); return; }
    const now = performance.now();
    if (now - lastPick < 40) return;
    lastPick = now;
    const id = pick(e.clientX, e.clientY);
    if (id !== hovered) { hovered = id; setOutline(); }
    canvas.classList.toggle('pointing', !!id);
    if (id) {
      tooltip.textContent = PARTS[id].name;
      tooltip.style.left = `${e.clientX}px`; tooltip.style.top = `${e.clientY}px`;
      tooltip.classList.remove('hidden');
    } else tooltip.classList.add('hidden');
  });
  canvas.addEventListener('pointerleave', () => { hovered = null; setOutline(); tooltip.classList.add('hidden'); });
  canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  canvas.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
    const id = pick(e.clientX, e.clientY);
    if (id) showInfo(id); else hideInfo();
  });

  // ------------------------------------------------------------------ guided tour
  const tourCard = $('tourCard');
  let tourIdx = -1;
  const applySet = (s = {}) => {
    if (s.cut !== undefined) { view.cut = s.cut; cutEl.checked = s.cut; }
    if (s.flows !== undefined) { view.flows = s.flows; flowEl.checked = s.flows; $('legend').classList.toggle('show', s.flows); }
    if (s.slow !== undefined) setTime(s.slow);
    // in the tour the section diagram appears only where it is the subject
    $('diagram').classList.toggle('off', !s.diagram);
  };
  const goTour = (i) => {
    tourIdx = Math.max(0, Math.min(TOUR.length - 1, i));
    const st = TOUR[tourIdx];
    hideInfo();
    applySet(st.set);
    if (st.action?.regulator !== undefined && sim.c.regulator < 0.05) { sim.c.regulator = st.action.regulator; regLever.set(st.action.regulator); }
    if (st.action?.injector) { sim.c.injector = true; injEl.checked = true; }
    const v = VIEWS[st.view];
    flyTo(v.pos, v.target, 2.6);
    selected = st.part ?? null; setOutline();
    $('tourStep').textContent = `Guided tour · ${tourIdx + 1} of ${TOUR.length}`;
    $('tourTitle').textContent = st.title;
    $('tourText').textContent = st.text;
    $('tourPrev').disabled = tourIdx === 0;
    $('tourNext').textContent = tourIdx === TOUR.length - 1 ? 'Finish ✦' : 'Onward →';
    tourCard.classList.remove('hidden');
    document.body.classList.add('touring');
  };
  function hideTour() {
    if (tourIdx < 0) return;
    tourIdx = -1; tourCard.classList.add('hidden'); selected = null; setOutline();
    document.body.classList.remove('touring');
    $('diagram').classList.toggle('off', !view.diagram);
  }
  $('tourBtn').addEventListener('click', () => goTour(0));
  $('tourNext').addEventListener('click', () => (tourIdx === TOUR.length - 1 ? hideTour() : goTour(tourIdx + 1)));
  $('tourPrev').addEventListener('click', () => goTour(tourIdx - 1));
  $('tourClose').addEventListener('click', hideTour);

  // ------------------------------------------------------------------ keyboard
  const viewKeys = Object.values(VIEWS);
  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'range') return;
    if (e.repeat && e.key.toLowerCase() !== 'arrowup' && e.key.toLowerCase() !== 'arrowdown') return;
    const k = e.key.toLowerCase();
    const flip = (elx) => { elx.checked = !elx.checked; elx.dispatchEvent(new Event('change')); };
    if (k === 'w') setWhistle(true);
    else if (k === 'c') flip(cutEl);
    else if (k === 'f') flip(flowEl);
    else if (k === 'l') flip(labelEl);
    else if (k === 'v') flip(diagEl);
    else if (k === 'o') flip(orbitEl);
    else if (k === 'm') flip(soundEl);
    else if (k === 'i') flip(injEl);
    else if (k === 'd') flip($('tDrain'));
    else if (k === 'h') document.body.classList.toggle('ui-hidden');
    else if (k === ' ') { setTime(view.timeScale > 0 ? 0 : 1); e.preventDefault(); }
    else if (k === 'escape') { hideInfo(); hideTour(); }
    else if (k === 'arrowright' && tourIdx >= 0) goTour(tourIdx + 1);
    else if (k === 'arrowleft' && tourIdx >= 0) goTour(tourIdx - 1);
    else if (/^[1-9]$/.test(k) && viewKeys[+k - 1]) flyTo(viewKeys[+k - 1].pos, viewKeys[+k - 1].target);
  });
  addEventListener('keyup', (e) => { if (e.key.toLowerCase() === 'w') setWhistle(false); });

  // ------------------------------------------------------------------ diagram
  const diagram = new CylinderDiagram($('diagramCanvas'));

  // ------------------------------------------------------------------ resize
  const resize = () => {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h);
    composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    grade.uniforms.uRes.value.set(w * DPR, h * DPR);
    diagram.resize();
  };
  addEventListener('resize', resize);

  // ------------------------------------------------------------------ intro
  const enter = $('enter');
  enter.disabled = false;
  enter.textContent = 'Enter the Exhibition';
  let introDone = false;
  enter.addEventListener('click', async () => {
    try { await audio.init(); audio.setEnabled(view.sound); } catch (err) { console.warn('audio unavailable', err); }
    $('intro').classList.add('gone');
    document.body.classList.remove('intro');
    introDone = true;
    flyTo(VIEWS.overview.pos, VIEWS.overview.target, 4.5);
    setTimeout(() => {
      if (sim.c.regulator < 0.02) {
        const hint = $('hint');
        hint.textContent = 'Drag the regulator to open the throttle and set her moving.';
        hint.classList.add('parchment');
        hint.classList.remove('hidden');
      }
    }, 4800);
  }, { once: true });

  // ------------------------------------------------------------------ teaching moments
  let smokeT = 0, drainT = 0, notchT = 0;
  const teach = (dt) => {
    if (!introDone || tourIdx >= 0) return;
    if (sim.c.regulator > 0.03) $('hint').classList.add('hidden');
    for (const e of sim.events) {
      if (e.type === 'lowwater') toast('Low water!', 'The water has dropped below the top of the firebox. Turn on the <i>injector</i> at once, or the crown sheet will overheat and the fusible plug will melt.', 'low', 15000);
    }
    if (sim.safety > 0.3) toast('Blowing off', 'The boiler has reached 160 lb per sq in and the safety valves have lifted. Steam is being wasted. A good fireman keeps the pressure just below the red line.', 'safety', 60000);
    smokeT = sim.smoke > 0.55 ? smokeT + dt : 0;
    if (smokeT > 2) toast('Black smoke', 'Too much coal for the air available: it is not burning completely. Fire little and often, or open the blower to draw more air through the fire.', 'smoke', 45000);
    drainT = sim.c.drainCocks && sim.mph > 12 ? drainT + dt : 0;
    if (drainT > 6) toast('Close the drain cocks', 'The cylinders are warm and dry now. The open drain cocks are only wasting steam.', 'drain', 60000);
    notchT = Math.abs(sim.c.reverser) > 0.6 && sim.mph > 25 && sim.c.regulator > 0.2 ? notchT + dt : 0;
    if (notchT > 5) toast('Notch her up', 'At speed, move the reverser towards mid-gear. Steam is cut off earlier and expands to do more work, so you use less coal and water. Watch the indicator diagram change.', 'notch', 60000);
    if (sim.water < LIMITS.waterGlassLo + 0.06 && !sim.c.injector) toast('Mind the water', 'The level in the gauge glass is falling. Put the injector on to feed the boiler.', 'mind', 30000);
  };

  // ------------------------------------------------------------------ main loop
  const clock = new THREE.Clock();
  let t = 0, diagT = 0, uiT = 0, viewShift = 0;
  const easeIO = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const frame = () => {
    requestAnimationFrame(frame);
    const dt = Math.min(1 / 20, clock.getDelta());
    t += dt;
    const sdt = dt * view.timeScale;
    sim.step(sdt);

    // camera flight
    if (flight.active) {
      flight.t += dt;
      const k = easeIO(Math.min(1, flight.t / flight.dur));
      camera.position.lerpVectors(flight.p0, flight.p1, k);
      camera.position.y += Math.sin(Math.PI * k) * flight.arc;
      controls.target.lerpVectors(flight.t0, flight.t1, k);
      if (k >= 1) flight.active = false;
    } else if (!introDone) {
      // gentle drift behind the title card
      const a = t * 0.05;
      camera.position.set(Math.sin(a) * 17, 5.5 + Math.sin(t * 0.1), Math.cos(a) * 10.5);
      controls.target.set(-0.5, 2, 0);
    }
    controls.update();
    // while touring, shift the picture right so the subject is not under the card
    const shiftT = tourIdx >= 0 ? Math.min(220, innerWidth * 0.14) : (infoCard.classList.contains('hidden') ? 0 : Math.min(150, innerWidth * 0.1));
    viewShift += (shiftT - viewShift) * Math.min(1, dt * 3);
    if (Math.abs(viewShift) > 0.5) camera.setViewOffset(innerWidth, innerHeight, -viewShift, 0, innerWidth, innerHeight);
    else if (camera.view && camera.view.enabled) camera.clearViewOffset();

    // cutaway: animate the cut planes, cutting the half nearest the camera
    cutEase += ((view.cut ? 1 : 0) - cutEase) * Math.min(1, dt * 2.4);
    const e = cutEase < 0.001 ? 0 : cutEase;
    loco.cut = e;
    const side = camera.position.z >= 0 ? 1 : -1;
    view.cutSide = side;
    const P = loco.planes;
    P.center.normal.set(0, 0, -side); P.center.constant = 4.2 * (1 - e);
    if (side > 0) { P.right.constant = 1.12 + 3 * (1 - e); P.left.constant = 10; }
    else { P.left.constant = 1.12 + 3 * (1 - e); P.right.constant = 10; }

    inspect.intensity = 0.9 + e * 1.8;
    loco.update(sim, t, sdt, view);
    hall.update(sim, t);
    effects.update(sim, dt, sdt);
    flows.update(sim, dt, sdt, (renderer.domElement.height / 2) / Math.tan((camera.fov * Math.PI) / 360), view.flows);
    if (introDone) audio.update(sim, view.timeScale);
    labels.update(camera, innerWidth, innerHeight);
    teach(dt);

    // instruments
    uiT -= dt;
    if (uiT <= 0) {
      uiT = 1 / 30;
      gP.set(sim.pBoiler, `${Math.round(sim.pBoiler)}`);
      gS.set(Math.abs(sim.mph), `${Math.abs(sim.mph).toFixed(0)}`);
      gF.set(sim.fireTemp, `${Math.round(sim.fireTemp)}°`);
      const wl = (sim.water - LIMITS.waterGlassLo) / (LIMITS.waterGlassHi - LIMITS.waterGlassLo);
      waterEl.style.height = `${Math.max(0, Math.min(100, wl * 100))}%`;
      $('roCut').textContent = sim.c.reverser === 0 ? 'mid-gear' : `${Math.round(sim.cutoff * 100)}% ${sim.c.reverser > 0 ? 'fore' : 'back'}`;
      const hp = sim.indicatedPower();
      $('roHp').textContent = `${hp > 1 ? Math.round(hp) : 0} ihp`;
      $('roGen').textContent = `${Math.round(sim.gen * 7937).toLocaleString()} lb/hr`;
      $('roUse').textContent = `${Math.round(sim.use * 7937).toLocaleString()} lb/hr`;
      $('roTw').textContent = `${Math.round(sim.tenderWater).toLocaleString()} gal`;
      $('roCoal').textContent = `${sim.coal.toFixed(2)} tons`;
      $('regVal').textContent = sim.c.regulator < 0.02 ? 'Shut' : `${Math.round(sim.c.regulator * 100)}% open`;
      $('revVal').textContent = Math.abs(sim.c.reverser) < 0.02 ? 'mid-gear' : `${Math.round(sim.cutoff * 100)}% ${sim.c.reverser > 0 ? 'fore' : 'back'}`;
      $('fireVal').textContent = `${Math.round(sim.c.firing * 100)}%`;
      if (sim.c.autoFireman) {
        fireEl.value = Math.round(sim.c.firing * 100);
        $('blower').value = Math.round(sim.c.blower * 100);
        injEl.checked = sim.c.injector;
      }
      if (Math.abs(regLever.value - sim.c.regulator) > 1e-3) regLever.set(sim.c.regulator);
      revEl.value = Math.round(sim.c.reverser * 100);
    }
    diagT -= dt;
    if (view.diagram && diagT <= 0) { diagT = 1 / 30; diagram.draw(sim); }

    grade.uniforms.uTime.value = t;
    composer.render();
  };
  window.app = { audio, composer, bloom, outline, scene, renderer, sim, camera, controls, view, flyTo, loco, setTime, goTour, applySet, showInfo };
  frame();
}

boot().catch((e) => {
  console.error(e);
  const b = $('enter');
  b.textContent = 'The engine failed to start: see console';
});
