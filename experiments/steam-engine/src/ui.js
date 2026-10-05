// DOM side of the exhibition: brass gauges, the regulator lever, labels,
// tooltips, info and tour cards, toasts.

import * as THREE from 'three';
import { PARTS, LABELS } from './content.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};
let gid = 0;

// ------------------------------------------------------------------ dial gauge
export function makeGauge(host, { min, max, major, minor, label, unit, red = null, fmt = (v) => v, face = '#f3e8cc' }) {
  const id = `g${gid++}`;
  const svg = el('svg', { viewBox: '-60 -60 120 120' }, host);
  const defs = el('defs', {}, svg);
  const bz = el('linearGradient', { id: `${id}b`, x1: 0, y1: 0, x2: 1, y2: 1 }, defs);
  [['0', '#fff1bd'], ['0.35', '#d3a14a'], ['0.6', '#7a5018'], ['1', '#e9c271']].forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, bz));
  const fc = el('radialGradient', { id: `${id}f`, cx: 0.5, cy: 0.4, r: 0.7 }, defs);
  [['0', '#fffaf0'], ['0.7', face], ['1', '#cbb88e']].forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, fc));
  const gl = el('linearGradient', { id: `${id}g`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  [['0', 'rgba(255,255,255,0.55)'], ['0.5', 'rgba(255,255,255,0.05)'], ['1', 'rgba(255,255,255,0)']].forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, gl));
  el('circle', { r: 58, fill: `url(#${id}b)` }, svg);
  el('circle', { r: 52, fill: '#3b2408' }, svg);
  el('circle', { r: 50.5, fill: `url(#${id}f)` }, svg);
  const a0 = -135, a1 = 135;
  const ang = (v) => a0 + ((v - min) / (max - min)) * (a1 - a0);
  const pol = (a, r) => [Math.sin((a * Math.PI) / 180) * r, -Math.cos((a * Math.PI) / 180) * r];
  if (red) {
    const [s, e] = [ang(red[0]), ang(red[1])];
    const [x0, y0] = pol(s, 41), [x1, y1] = pol(e, 41);
    el('path', { d: `M${x0},${y0} A41,41 0 ${e - s > 180 ? 1 : 0} 1 ${x1},${y1}`, stroke: '#b2221a', 'stroke-width': 5, fill: 'none' }, svg);
  }
  for (let v = min; v <= max + 1e-6; v += minor) {
    const isMaj = Math.abs((v - min) / major - Math.round((v - min) / major)) < 1e-6;
    const a = ang(v);
    const [x0, y0] = pol(a, isMaj ? 36 : 40), [x1, y1] = pol(a, 44);
    el('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: '#2a1a0c', 'stroke-width': isMaj ? 1.8 : 0.8 }, svg);
    if (isMaj) {
      const [tx, ty] = pol(a, 28);
      const t = el('text', { x: tx, y: ty + 3, 'text-anchor': 'middle', 'font-size': 8.5, 'font-family': 'Cinzel, Georgia', fill: '#2a1a0c', 'font-weight': 700 }, svg);
      t.textContent = fmt(v);
    }
  }
  const lt = el('text', { x: 0, y: 19, 'text-anchor': 'middle', 'font-size': 7.5, 'font-family': '"IM Fell English SC", Georgia', fill: '#5a3a18' }, svg);
  lt.textContent = label;
  const ut = el('text', { x: 0, y: 28, 'text-anchor': 'middle', 'font-size': 6.5, 'font-style': 'italic', 'font-family': '"EB Garamond", Georgia', fill: '#5a3a18' }, svg);
  ut.textContent = unit;
  const valueText = el('text', { x: 0, y: 40, 'text-anchor': 'middle', 'font-size': 8, 'font-family': 'Cinzel, Georgia', fill: '#2a1a0c', 'font-weight': 700 }, svg);
  const needle = el('g', {}, svg);
  el('path', { d: 'M-2.2,8 L-0.8,-42 L0,-46 L0.8,-42 L2.2,8 Z', fill: '#1a1210' }, needle);
  el('circle', { r: 5.5, fill: `url(#${id}b)`, stroke: '#3b2408', 'stroke-width': 0.8 }, svg);
  el('ellipse', { cx: -8, cy: -22, rx: 34, ry: 20, fill: `url(#${id}g)`, transform: 'rotate(-25)' }, svg);
  let cur = min;
  return {
    set(v, text) {
      const target = Math.max(min - (max - min) * 0.02, Math.min(max * 1.02, v));
      cur += (target - cur) * 0.2;
      needle.setAttribute('transform', `rotate(${ang(cur)})`);
      if (text !== undefined) valueText.textContent = text;
    },
  };
}

// ------------------------------------------------------------------ regulator lever
export function makeLever(host, onChange) {
  const svg = el('svg', { viewBox: '0 0 240 128' }, host);
  const defs = el('defs', {}, svg);
  const bz = el('linearGradient', { id: 'lvB', x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
  [['0', '#7a5018'], ['0.4', '#fff1bd'], ['0.6', '#d3a14a'], ['1', '#6b4512']].forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, bz));
  const st = el('linearGradient', { id: 'lvS', x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
  [['0', '#5a5e64'], ['0.45', '#f2f4f6'], ['0.6', '#a8adb4'], ['1', '#4a4e54']].forEach(([o, c]) => el('stop', { offset: o, 'stop-color': c }, st));
  const P = { x: 120, y: 120 }, R = 98;
  const A0 = -62, A1 = 62;
  const pol = (a, r) => [P.x + Math.sin((a * Math.PI) / 180) * r, P.y - Math.cos((a * Math.PI) / 180) * r];
  // quadrant plate
  const [qx0, qy0] = pol(A0 - 6, R + 12), [qx1, qy1] = pol(A1 + 6, R + 12);
  const [ix0, iy0] = pol(A1 + 6, R - 14), [ix1, iy1] = pol(A0 - 6, R - 14);
  el('path', { d: `M${qx0},${qy0} A${R + 12},${R + 12} 0 0 1 ${qx1},${qy1} L${ix0},${iy0} A${R - 14},${R - 14} 0 0 0 ${ix1},${iy1} Z`, fill: 'url(#lvB)', stroke: '#4a2e0a', 'stroke-width': 1.2 }, svg);
  const [sx0, sy0] = pol(A0, R), [sx1, sy1] = pol(A1, R);
  el('path', { d: `M${sx0},${sy0} A${R},${R} 0 0 1 ${sx1},${sy1}`, stroke: '#2a1606', 'stroke-width': 5, fill: 'none', 'stroke-linecap': 'round' }, svg);
  for (let i = 0; i <= 10; i++) {
    const a = A0 + ((A1 - A0) * i) / 10;
    const [x0, y0] = pol(a, R + 4), [x1, y1] = pol(a, R + (i % 5 ? 9 : 11));
    el('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: '#2a1606', 'stroke-width': i % 5 ? 1 : 2 }, svg);
  }
  const lab = (a, t) => { const [x, y] = pol(a, R - 7); const e = el('text', { x, y: y + 3, 'text-anchor': 'middle', 'font-size': 9, 'font-family': '"IM Fell English SC", Georgia', fill: '#2a1606', transform: `rotate(${a} ${x} ${y})` }, svg); e.textContent = t; };
  lab(A0 + 4, 'SHUT'); lab(0, 'HALF'); lab(A1 - 4, 'FULL');
  // the lever itself
  const g = el('g', {}, svg);
  el('rect', { x: -5, y: -R - 16, width: 10, height: R + 16, rx: 3, fill: 'url(#lvS)', stroke: '#2a2a2a', 'stroke-width': 0.8 }, g);
  el('rect', { x: -8, y: -R - 2, width: 16, height: 10, rx: 2, fill: 'url(#lvB)', stroke: '#4a2e0a', 'stroke-width': 0.8 }, g);
  el('ellipse', { cx: 0, cy: -R - 20, rx: 10, ry: 13, fill: '#5a2a12', stroke: '#2a1006', 'stroke-width': 1 }, g);
  el('ellipse', { cx: -3, cy: -R - 24, rx: 3, ry: 5, fill: 'rgba(255,220,180,.35)' }, g);
  el('circle', { cx: P.x, cy: P.y, r: 11, fill: 'url(#lvB)', stroke: '#4a2e0a' }, svg);
  el('circle', { cx: P.x, cy: P.y, r: 3.5, fill: '#3b2408' }, svg);
  svg.insertBefore(g, svg.lastChild.previousSibling);
  let value = 0;
  const draw = () => g.setAttribute('transform', `translate(${P.x} ${P.y}) rotate(${A0 + (A1 - A0) * value})`);
  draw();
  const fromEvent = (e) => {
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 240 - P.x;
    const y = ((e.clientY - r.top) / r.height) * 128 - P.y;
    const a = (Math.atan2(x, -y) * 180) / Math.PI;
    return Math.max(0, Math.min(1, (a - A0) / (A1 - A0)));
  };
  let drag = false;
  host.addEventListener('pointerdown', (e) => { drag = true; host.setPointerCapture(e.pointerId); api.set(fromEvent(e), true); });
  host.addEventListener('pointermove', (e) => { if (drag) api.set(fromEvent(e), true); });
  host.addEventListener('pointerup', () => { drag = false; });
  host.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { api.set(value + 0.05, true); e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { api.set(value - 0.05, true); e.preventDefault(); }
  });
  const api = {
    get value() { return value; },
    set(v, user = false) {
      value = Math.max(0, Math.min(1, v));
      draw();
      host.setAttribute('aria-valuenow', Math.round(value * 100));
      if (user) onChange(value);
    },
  };
  return api;
}

// ------------------------------------------------------------------ floating labels with leader lines
export class Labels {
  constructor(loco, onClick) {
    this.root = document.getElementById('labels');
    this.svg = document.getElementById('leaders');
    this.items = LABELS.filter((id) => loco.anchors[id]).map((id, i) => {
      const div = document.createElement('div');
      div.className = 'label';
      div.textContent = PARTS[id]?.name ?? id;
      div.addEventListener('click', () => onClick(id));
      this.root.appendChild(div);
      const line = el('line', {}, this.svg);
      const dot = el('circle', { r: 2.5 }, this.svg);
      return { id, div, line, dot, anchor: loco.anchors[id], lift: 34 + (i % 3) * 18 };
    });
    this.v = new THREE.Vector3();
    this.shown = false;
  }

  show(on) { this.shown = on; this.root.classList.toggle('show', on); }

  update(camera, w, h) {
    if (!this.shown) return;
    for (const it of this.items) {
      this.v.copy(it.anchor).project(camera);
      const vis = this.v.z < 1 && Math.abs(this.v.x) < 1.1 && Math.abs(this.v.y) < 1.1;
      it.div.style.display = vis ? '' : 'none';
      it.line.style.display = it.dot.style.display = vis ? '' : 'none';
      if (!vis) continue;
      const x = (this.v.x * 0.5 + 0.5) * w, y = (-this.v.y * 0.5 + 0.5) * h;
      const ly = y - it.lift;
      it.div.style.left = `${x}px`; it.div.style.top = `${ly}px`;
      it.line.setAttribute('x1', x); it.line.setAttribute('y1', y); it.line.setAttribute('x2', x); it.line.setAttribute('y2', ly);
      it.dot.setAttribute('cx', x); it.dot.setAttribute('cy', y);
    }
  }
}

// ------------------------------------------------------------------ toasts
const recent = new Map();
export function toast(title, text, key = title, cooldown = 25000) {
  const now = performance.now();
  if (recent.has(key) && now - recent.get(key) < cooldown) return;
  recent.set(key, now);
  const host = document.getElementById('toasts');
  const d = document.createElement('div');
  d.className = 'toast parchment';
  d.innerHTML = `<b>${title}</b>${text}`;
  host.appendChild(d);
  setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 700); }, 7000);
}
