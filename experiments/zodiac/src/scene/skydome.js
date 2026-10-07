// The observer's local frame: ground, horizon, compass points, meridian and daylight for the
// sky view; the horizon plane through Earth's centre for the outside views; the celestial
// equator. The horizon group is oriented by horizonBasis (x = east, y = north, z = zenith)
// and centred on Earth, so the Ascendant (on the ring) meets the horizon exactly.

import * as THREE from 'three';

const DEG = Math.PI / 180;

const domeVert = /* glsl */`
  varying vec3 vP;
  void main() { vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const domeFrag = /* glsl */`
  uniform float uDay;
  uniform float uTwilight;
  uniform vec3 uSunLocal;
  uniform float uOpacity;
  varying vec3 vP;
  void main() {
    float alt = vP.z;
    if (alt < -0.02) discard;
    vec3 zenithDay = vec3(0.025, 0.09, 0.32);
    vec3 horizDay = vec3(0.2, 0.32, 0.5);
    vec3 day = mix(horizDay, zenithDay, pow(max(alt, 0.0), 0.5));
    float sunGlow = pow(max(dot(vP, uSunLocal), 0.0), 8.0);
    vec3 twi = mix(vec3(0.5, 0.18, 0.05), vec3(0.03, 0.04, 0.12), smoothstep(0.0, 0.35, alt));
    vec3 col = mix(twi, day, uDay);
    col += vec3(0.8, 0.6, 0.35) * sunGlow * (0.2 + 0.35 * uDay);
    float a = max(uDay * 0.93, uTwilight * (0.55 * (1.0 - smoothstep(0.0, 0.45, alt)) + 0.15));
    // a faint airglow at the horizon even at night
    a = max(a, 0.18 * (1.0 - smoothstep(0.0, 0.12, alt)));
    if (uDay + uTwilight < 0.01) col = vec3(0.02, 0.03, 0.07);
    gl_FragColor = vec4(col, a * uOpacity);
    #include <colorspace_fragment>
  }
`;
const groundFrag = /* glsl */`
  uniform float uOpacity;
  uniform float uDay;
  varying vec3 vP;
  void main() {
    float alt = vP.z;
    if (alt > 0.0) discard;
    float k = smoothstep(-0.25, 0.0, alt);
    vec3 col = mix(vec3(0.004, 0.005, 0.006), vec3(0.018, 0.022, 0.016), k) * (1.0 + 6.0 * uDay);
    gl_FragColor = vec4(col, uOpacity * (0.97 - 0.05 * k));
    #include <colorspace_fragment>
  }
`;
const discFrag = /* glsl */`
  uniform float uOpacity;
  varying vec3 vP;
  varying vec2 vXY;
  void main() {
    float r = length(vXY);
    float a = (0.22 - 0.12 * r) * smoothstep(1.0, 0.97, r);
    float ringLine = smoothstep(0.012, 0.0, abs(r - 0.5)) * 0.25;
    gl_FragColor = vec4(vec3(0.45, 0.75, 0.6), (a + ringLine) * uOpacity);
    #include <colorspace_fragment>
  }
`;

export const COMPASS = [
  ['N', 0], ['NE', 45], ['E', 90], ['SE', 135], ['S', 180], ['SW', 225], ['W', 270], ['NW', 315],
];

export class LocalSky {
  constructor({ labels }) {
    this.group = new THREE.Group(); // horizon frame, scale R
    this.group.name = 'localSky';

    this.domeMat = new THREE.ShaderMaterial({
      uniforms: { uDay: { value: 0 }, uTwilight: { value: 0 }, uSunLocal: { value: new THREE.Vector3(0, 0, 1) }, uOpacity: { value: 0 } },
      vertexShader: domeVert, fragmentShader: domeFrag, transparent: true, depthWrite: false, side: THREE.BackSide,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1.25, 64, 32), this.domeMat);
    this.dome.renderOrder = -5;
    this.groundMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 }, uDay: { value: 0 } },
      vertexShader: domeVert, fragmentShader: groundFrag, transparent: true, depthWrite: false, side: THREE.BackSide,
    });
    this.ground = new THREE.Mesh(new THREE.SphereGeometry(0.5, 64, 32), this.groundMat);
    this.ground.renderOrder = 6;
    // horizon line
    const hz = [];
    for (let k = 0; k <= 360; k++) hz.push(new THREE.Vector3(0.5 * Math.sin(k * DEG), 0.5 * Math.cos(k * DEG), 0));
    this.horizonLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(hz), new THREE.LineBasicMaterial({ color: 0xb9d7c4, transparent: true, opacity: 0, depthWrite: false }));
    this.horizonLine.renderOrder = 7;
    // meridian: north point -> zenith -> south point
    const mer = [];
    for (let k = 0; k <= 180; k++) {
      const a = k * DEG;
      mer.push(new THREE.Vector3(0, 0.96 * Math.cos(a), 0.96 * Math.sin(a)));
    }
    this.meridian = new THREE.Line(new THREE.BufferGeometry().setFromPoints(mer), new THREE.LineDashedMaterial({ color: 0x7fd6ff, dashSize: 0.02, gapSize: 0.015, transparent: true, opacity: 0, depthWrite: false }));
    this.meridian.computeLineDistances();
    this.meridian.renderOrder = 3;
    // horizon plane through Earth's centre (outside views)
    const discGeo = new THREE.CircleGeometry(1, 128);
    this.discMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 } },
      vertexShader: /* glsl */`varying vec3 vP; varying vec2 vXY; void main(){ vP = position; vXY = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: discFrag, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    this.disc = new THREE.Mesh(discGeo, this.discMat);
    this.disc.renderOrder = 1;
    const cross = [
      new THREE.Vector3(-1, 0, 0), new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 1, 0),
    ];
    this.discCross = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(cross), new THREE.LineBasicMaterial({ color: 0x9fd8b8, transparent: true, opacity: 0, depthWrite: false }));
    this.group.add(this.dome, this.ground, this.horizonLine, this.meridian, this.disc, this.discCross);

    this.compass = COMPASS.map(([name, az]) => {
      const l = labels.add({ cls: `compass${name.length === 1 ? ' major' : ''}`, text: name });
      l.az = az;
      return l;
    });
    this.discLabels = ['N', 'E', 'S', 'W'].map((name, i) => {
      const l = labels.add({ cls: 'compass disc', text: name === 'E' ? 'E · rising' : name === 'W' ? 'W · setting' : name });
      l.az = i * 90;
      return l;
    });
    this.zenithLabel = labels.add({ cls: 'compass minor', text: 'zenith' });

    // celestial equator (equatorial frame, scale R)
    this.equatorGroup = new THREE.Group();
    const eq = [];
    for (let k = 0; k <= 360; k++) eq.push(new THREE.Vector3(Math.cos(k * DEG), Math.sin(k * DEG), 0));
    this.equator = new THREE.Line(new THREE.BufferGeometry().setFromPoints(eq), new THREE.LineDashedMaterial({ color: 0x8fb8ff, dashSize: 0.03, gapSize: 0.02, transparent: true, opacity: 0, depthWrite: false }));
    this.equator.computeLineDistances();
    this.equatorGroup.add(this.equator);
    this.equatorLabel = labels.add({ cls: 'small-note', text: 'celestial equator' });
    this._v = new THREE.Vector3();
  }

  /** Orient: basis vectors (world ecliptic) -> local x=east, y=north, z=zenith. */
  setBasis(basis) {
    const m = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(basis.east.x, basis.east.y, basis.east.z),
      new THREE.Vector3(basis.north.x, basis.north.y, basis.north.z),
      new THREE.Vector3(basis.zenith.x, basis.zenith.y, basis.zenith.z),
    );
    this.group.quaternion.setFromRotationMatrix(m);
  }

  setEquator(pole) {
    this.equatorGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(pole.x, pole.y, pole.z));
  }

  /**
   * ctx: {s, horizonOn, meridianOn, daylight (0..1 effective), twilight, sunLocal (Vector3), axisOn, ringAlpha}
   */
  update(ctx) {
    const { s } = ctx;
    const sky = THREE.MathUtils.smoothstep(s, 0.35, 1);
    this.domeMat.uniforms.uOpacity.value = sky;
    this.domeMat.uniforms.uDay.value = ctx.day;
    this.domeMat.uniforms.uTwilight.value = ctx.twilight;
    this.domeMat.uniforms.uSunLocal.value.copy(ctx.sunLocal);
    this.groundMat.uniforms.uOpacity.value = sky;
    this.groundMat.uniforms.uDay.value = ctx.day;
    this.dome.visible = this.ground.visible = sky > 0.01;
    this.horizonLine.material.opacity = 0.8 * sky;
    this.horizonLine.visible = sky > 0.01;
    this.meridian.material.opacity = ctx.meridianOn ? 0.75 * Math.max(sky, 0.6 * (1 - s)) : 0;
    this.meridian.visible = ctx.meridianOn;
    const disc = ctx.horizonOn ? (1 - THREE.MathUtils.smoothstep(s, 0, 0.5)) : 0;
    this.discMat.uniforms.uOpacity.value = disc;
    this.discCross.material.opacity = 0.35 * disc;
    this.disc.visible = this.discCross.visible = disc > 0.01;
    const v = this._v;
    for (const l of this.compass) {
      l.show = sky > 0.05;
      l.alpha = sky;
      v.set(0.5 * Math.sin(l.az * DEG), 0.5 * Math.cos(l.az * DEG), 0.004);
      l.pos.copy(v).applyMatrix4(this.group.matrixWorld);
    }
    for (const l of this.discLabels) {
      l.show = disc > 0.05;
      l.alpha = disc;
      v.set(1.06 * Math.sin(l.az * DEG), 1.06 * Math.cos(l.az * DEG), 0);
      l.pos.copy(v).applyMatrix4(this.group.matrixWorld);
    }
    this.zenithLabel.show = ctx.meridianOn && sky > 0.05;
    this.zenithLabel.alpha = sky;
    this.zenithLabel.pos.set(0, 0, 0.95).applyMatrix4(this.group.matrixWorld);
    const eq = ctx.axisOn ? 0.7 * ctx.ringAlpha : 0;
    this.equator.material.opacity = eq;
    this.equator.visible = eq > 0.01;
    this.equatorLabel.show = eq > 0.01;
    this.equatorLabel.alpha = eq;
    this.equatorLabel.pos.set(Math.cos(1.2), Math.sin(1.2), 0).applyMatrix4(this.equatorGroup.matrixWorld);
  }
}
