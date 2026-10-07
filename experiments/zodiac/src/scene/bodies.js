// Sun, Moon, planets and Earth: procedural materials (no texture downloads), lit by the true
// direction to the Sun so the Moon's phase is right. Sizes are exaggerated markers, set each
// frame by the world from the camera distance (the UI says "sizes not to scale").

import * as THREE from 'three';
import { planets, earth as earthContent } from '../content/index.js';
import { raDecToWorld } from '../astro/index.js';
import { makeGlowTexture } from './textures.js';

const NOISE = /* glsl */`
  float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float vnoise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
`;

const bodyVert = /* glsl */`
  varying vec3 vN;
  varying vec3 vObj;
  varying vec3 vView;
  void main() {
    vObj = normalize(position);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const planetFrag = /* glsl */`
  uniform vec3 uColor;
  uniform vec3 uColor2;
  uniform vec3 uSunDir;
  uniform float uBands;
  uniform float uNoise;
  uniform float uAmbient;
  uniform float uRim;
  uniform float uSeed;
  uniform float uBright;
  varying vec3 vN;
  varying vec3 vObj;
  varying vec3 vView;
  ${NOISE}
  void main() {
    vec3 n = normalize(vN);
    float lat = vObj.z;
    float nz = fbm(vObj * 3.0 + uSeed);
    float band = 0.5 + 0.5 * sin(lat * uBands * 3.14159 + nz * 2.2);
    vec3 base = mix(uColor, uColor2, clamp(band * step(0.5, uBands) + (nz - 0.5) * uNoise * 2.0 + 0.5 * (1.0 - step(0.5, uBands)) * nz * uNoise, 0.0, 1.0));
    float l = max(dot(n, uSunDir), 0.0);
    float term = smoothstep(-0.05, 0.25, dot(n, uSunDir));
    vec3 col = base * (uAmbient + 1.15 * l * term);
    float rim = pow(1.0 - max(dot(n, vView), 0.0), 3.0) * uRim * (0.25 + 0.75 * term);
    col += uColor * rim;
    gl_FragColor = vec4(col * uBright, 1.0);
    #include <colorspace_fragment>
  }
`;

const sunFrag = /* glsl */`
  uniform float uTime;
  varying vec3 vN;
  varying vec3 vObj;
  varying vec3 vView;
  ${NOISE}
  void main() {
    float mu = max(dot(normalize(vN), vView), 0.0);
    float limb = 0.45 + 0.55 * pow(mu, 0.45);
    float g = fbm(vObj * 14.0 + vec3(uTime * 0.05));
    vec3 col = mix(vec3(1.0, 0.62, 0.22), vec3(1.0, 0.93, 0.7), limb) * (0.9 + 0.2 * g);
    gl_FragColor = vec4(col * 2.6 * limb, 1.0);
    #include <colorspace_fragment>
  }
`;

const earthFrag = /* glsl */`
  uniform vec3 uSunDir;
  uniform vec3 uPin;
  varying vec3 vN;
  varying vec3 vObj;
  varying vec3 vView;
  ${NOISE}
  void main() {
    vec3 n = normalize(vN);
    float h = fbm(vObj * 2.1 + 3.7) + 0.35 * fbm(vObj * 6.0);
    float land = smoothstep(0.66, 0.70, h);
    float ice = smoothstep(0.80, 0.86, abs(vObj.z) + 0.05 * fbm(vObj * 8.0));
    vec3 ocean = mix(vec3(0.03, 0.12, 0.32), vec3(0.06, 0.24, 0.5), fbm(vObj * 5.0));
    vec3 ground = mix(vec3(0.20, 0.36, 0.14), vec3(0.52, 0.45, 0.28), smoothstep(0.7, 0.9, h));
    vec3 base = mix(ocean, ground, land);
    base = mix(base, vec3(0.9, 0.93, 0.97), ice);
    float d = dot(n, uSunDir);
    float day = smoothstep(-0.08, 0.15, d);
    vec3 col = base * (0.08 + 1.1 * max(d, 0.0)) * mix(0.35, 1.0, day);
    // night-side glow of populated land
    col += (1.0 - day) * land * vec3(1.0, 0.75, 0.4) * 0.08 * smoothstep(0.55, 0.8, fbm(vObj * 18.0));
    float rim = pow(1.0 - max(dot(n, vView), 0.0), 2.5);
    col += vec3(0.35, 0.6, 1.0) * rim * (0.15 + 0.6 * day);
    // the observer's spot
    float pin = smoothstep(0.9975, 0.9992, dot(vObj, uPin));
    col = mix(col, vec3(1.0, 0.85, 0.4), pin);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

const STYLE = {
  moon: { color2: '#8b8b93', bands: 0, noise: 0.9, ambient: 0.03, rim: 0.05 },
  mercury: { color2: '#6d665f', bands: 0, noise: 0.8, ambient: 0.1, rim: 0.1 },
  venus: { color2: '#fff2cf', bands: 1.2, noise: 0.3, ambient: 0.1, rim: 0.4 },
  mars: { color2: '#8a3a1c', bands: 0, noise: 0.9, ambient: 0.1, rim: 0.25 },
  jupiter: { color2: '#9c6b43', bands: 7, noise: 0.4, ambient: 0.12, rim: 0.2 },
  saturn: { color2: '#b0915a', bands: 5, noise: 0.25, ambient: 0.12, rim: 0.2 },
  uranus: { color2: '#5fb8c8', bands: 2, noise: 0.15, ambient: 0.14, rim: 0.4 },
  neptune: { color2: '#2a4fae', bands: 3, noise: 0.3, ambient: 0.14, rim: 0.4 },
  pluto: { color2: '#6e5a48', bands: 0, noise: 0.8, ambient: 0.12, rim: 0.1 },
};
// Planet base colours lifted a touch from the content palette so they read on black.
const BASE_COLOR = {
  moon: '#d9d9e0', mercury: '#b5aea5', venus: '#f1d9a6', mars: '#d0613b', jupiter: '#d9b48a',
  saturn: '#e3cf93', uranus: '#9fe0ea', neptune: '#5a7fe0', pluto: '#c9b29a',
};

const sphereZ = (seg = 48) => new THREE.SphereGeometry(1, seg, seg / 2).rotateX(Math.PI / 2);

export class Bodies {
  constructor({ labels, onPick, onHover }) {
    this.group = new THREE.Group();
    this.group.name = 'bodies';
    this.meshes = {};
    this.mats = {};
    this.labels = {};
    const geo = sphereZ(48);

    // Sun
    this.sunMat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 } }, vertexShader: bodyVert, fragmentShader: sunFrag });
    this.meshes.sun = new THREE.Mesh(geo, this.sunMat);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeGlowTexture(256, [[0, 'rgba(255,240,200,0.9)'], [0.18, 'rgba(255,200,110,0.45)'], [0.45, 'rgba(255,150,60,0.12)'], [1, 'rgba(255,120,40,0)']]),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
    }));
    glow.scale.setScalar(7);
    this.sunGlow = glow;
    this.meshes.sun.add(glow);
    this.group.add(this.meshes.sun);

    for (const id of ['moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']) {
      const st = STYLE[id];
      const m = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(BASE_COLOR[id]) }, uColor2: { value: new THREE.Color(st.color2) },
          uSunDir: { value: new THREE.Vector3(1, 0, 0) }, uBands: { value: st.bands }, uNoise: { value: st.noise },
          uAmbient: { value: st.ambient }, uRim: { value: st.rim }, uSeed: { value: id.length * 3.1 }, uBright: { value: 1 },
        },
        vertexShader: bodyVert, fragmentShader: planetFrag,
      });
      this.mats[id] = m;
      this.meshes[id] = new THREE.Mesh(geo, m);
      this.group.add(this.meshes[id]);
    }
    // Saturn's rings in its equatorial plane (pole RA 40.59, Dec 83.54, J2000)
    const sp = raDecToWorld(40.589, 83.537);
    const ringGeo = new THREE.RingGeometry(1.25, 2.25, 96, 1);
    const ringMat = new THREE.ShaderMaterial({
      uniforms: { uSunDir: { value: new THREE.Vector3() } },
      vertexShader: /* glsl */`varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */`varying vec2 vP; void main(){ float r = length(vP); float b = 0.72 + 0.18*sin(r*14.0) + 0.1*sin(r*41.0); float gap = smoothstep(1.92,1.95,r)*(1.0-smoothstep(1.98,2.01,r)); float a = (1.0 - gap*0.85) * smoothstep(1.25,1.32,r) * (1.0 - smoothstep(2.15,2.25,r)); gl_FragColor = vec4(vec3(0.86,0.78,0.6)*b, a*0.8);
#include <colorspace_fragment>
}`,
      transparent: true, side: THREE.DoubleSide, depthWrite: false,
    });
    this.saturnRing = new THREE.Mesh(ringGeo, ringMat);
    this.saturnRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(sp.x, sp.y, sp.z));
    this.meshes.saturn.add(this.saturnRing);

    // Earth: a globe in Earth-fixed axes (x = lat 0 lon 0, z = north pole)
    this.earthMat = new THREE.ShaderMaterial({
      uniforms: { uSunDir: { value: new THREE.Vector3(1, 0, 0) }, uPin: { value: new THREE.Vector3(0, 0, 1) } },
      vertexShader: bodyVert, fragmentShader: earthFrag,
    });
    this.earthFixed = new THREE.Group();
    this.meshes.earth = new THREE.Mesh(sphereZ(64), this.earthMat);
    this.earthFixed.add(this.meshes.earth);
    // axis and location pin live in the same Earth-fixed frame
    const axisGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -2.6), new THREE.Vector3(0, 0, 2.6)]);
    this.axis = new THREE.Line(axisGeo, new THREE.LineBasicMaterial({ color: 0x9fc4ff, transparent: true, opacity: 0.85 }));
    this.earthFixed.add(this.axis);
    this.pin = new THREE.Group();
    const pinStem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8).rotateX(Math.PI / 2).translate(0, 0, 1.17), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
    const pinHead = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 8).translate(0, 0, 1.36), new THREE.MeshBasicMaterial({ color: 0xffe3a0 }));
    this.pin.add(pinStem, pinHead);
    this.earthFixed.add(this.pin);
    this.group.add(this.earthFixed);

    // selection halo
    const haloTex = (() => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 128;
      const g = cv.getContext('2d');
      g.strokeStyle = 'rgba(255,230,160,0.95)'; g.lineWidth = 5;
      g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = 'rgba(255,230,160,0.35)'; g.lineWidth = 12;
      g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.stroke();
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, depthWrite: false, depthTest: false }));
    this.halo.renderOrder = 10;
    this.group.add(this.halo);
    this.hoverHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, transparent: true, depthWrite: false, depthTest: false, opacity: 0.45 }));
    this.hoverHalo.renderOrder = 10;
    this.group.add(this.hoverHalo);

    // labels
    for (const id of [...Object.keys(this.meshes)]) {
      const c = id === 'earth' ? earthContent : planets[id];
      const lbl = labels.add({
        cls: 'body-lbl',
        html: `<span class="g">${c.glyph}</span><span class="n">${c.name}</span><span class="r" aria-label="retrograde">℞</span>`,
        title: c.name,
        onClick: () => onPick?.({ kind: 'body', id }),
        onEnter: () => onHover?.({ kind: 'body', id }),
        onLeave: () => onHover?.(null),
      });
      lbl.el.style.setProperty('--c', c.color);
      this.labels[id] = lbl;
    }
    this.sizes = {};
  }

  setSunDir(id, dirThree) {
    if (id === 'earth') this.earthMat.uniforms.uSunDir.value.copy(dirThree);
    else if (this.mats[id]) this.mats[id].uniforms.uSunDir.value.copy(dirThree);
  }
}
