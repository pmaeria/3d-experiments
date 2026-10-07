// DOM labels pinned to 3D points. Crisp text (real fonts, real glyphs), cheap to update.
// Each label: {el, pos: THREE.Vector3 (three.js world coords), show (bool), alpha (0..1),
// dx, dy (pixel offset), screen: {x, y, z, onScreen}}.

import * as THREE from 'three';

const v = new THREE.Vector3();

export class Labels {
  constructor(container, camera) {
    this.container = container;
    this.camera = camera;
    this.items = [];
    this.w = 1; this.h = 1;
  }

  add({ cls = '', html = '', text = null, title = null, data = null, onClick = null, onEnter = null, onLeave = null, interactive = false } = {}) {
    const el = document.createElement(interactive || onClick ? 'button' : 'div');
    el.className = `lbl ${cls}`;
    if (interactive || onClick) el.type = 'button';
    if (text !== null) el.textContent = text; else el.innerHTML = html;
    if (title) el.setAttribute('aria-label', title);
    if (!(interactive || onClick)) el.setAttribute('aria-hidden', 'true');
    if (onClick) el.addEventListener('click', (e) => { e.stopPropagation(); onClick(e); });
    if (onEnter) el.addEventListener('pointerenter', onEnter);
    if (onLeave) el.addEventListener('pointerleave', onLeave);
    el.style.opacity = '0';
    this.container.appendChild(el);
    const item = {
      el, pos: new THREE.Vector3(), show: true, alpha: 1, dx: 0, dy: 0, data,
      screen: { x: -1e4, y: -1e4, z: 1, onScreen: false },
      _x: NaN, _y: NaN, _o: -1,
    };
    this.items.push(item);
    return item;
  }

  setSize(w, h) { this.w = w; this.h = h; }

  update() {
    const { w, h, camera } = this;
    for (const it of this.items) {
      const vis = it.show && it.alpha > 0.01;
      let o = 0;
      if (vis) {
        v.copy(it.pos).project(camera);
        const inFront = v.z < 1 && v.z > -1;
        it.screen.x = (v.x * 0.5 + 0.5) * w;
        it.screen.y = (-v.y * 0.5 + 0.5) * h;
        it.screen.z = v.z;
        it.screen.onScreen = inFront && it.screen.x > -50 && it.screen.x < w + 50 && it.screen.y > -50 && it.screen.y < h + 50;
        if (it.screen.onScreen) {
          o = it.alpha;
          const x = Math.round((it.screen.x + it.dx) * 2) / 2;
          const y = Math.round((it.screen.y + it.dy) * 2) / 2;
          if (x !== it._x || y !== it._y) {
            it.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
            it._x = x; it._y = y;
          }
        }
      } else {
        it.screen.onScreen = false;
      }
      const oq = Math.round(o * 50) / 50;
      if (oq !== it._o) {
        it.el.style.opacity = String(oq);
        it.el.style.visibility = oq > 0 ? 'visible' : 'hidden';
        it._o = oq;
      }
    }
  }
}
