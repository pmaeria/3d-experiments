// Procedurally painted textures: nothing is downloaded, everything is drawn on
// canvases at start-up so the exhibition is self-contained.

import * as THREE from 'three';

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function tex(c, { repeat = [1, 1], srgb = true, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = aniso;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// deterministic pseudo random
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function speckle(ctx, w, h, n, alpha, rand, light = false) {
  for (let i = 0; i < n; i++) {
    const v = light ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${rand() * alpha})`;
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
  }
}

// Minton-style encaustic tile floor
export function tileFloor() {
  const S = 1024, T = S / 4;
  const [c, x] = canvas(S);
  const [rc, r] = canvas(S);
  const rand = rng(7);
  const terracotta = '#8f3b22', buff = '#cdb48a', black = '#1c1714', slate = '#3d4a52', ochre = '#b0782c';
  r.fillStyle = '#5a5a5a'; r.fillRect(0, 0, S, S);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const ox = i * T, oy = j * T;
    const odd = (i + j) % 2;
    x.save(); x.translate(ox, oy);
    x.fillStyle = odd ? buff : terracotta; x.fillRect(0, 0, T, T);
    x.translate(T / 2, T / 2);
    // eight-pointed star
    x.fillStyle = odd ? terracotta : black;
    x.beginPath();
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2;
      const rr = k % 2 ? T * 0.2 : T * 0.42;
      x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    x.closePath(); x.fill();
    x.fillStyle = odd ? slate : ochre;
    x.beginPath(); x.arc(0, 0, T * 0.14, 0, Math.PI * 2); x.fill();
    x.fillStyle = odd ? buff : buff;
    x.beginPath(); x.arc(0, 0, T * 0.06, 0, Math.PI * 2); x.fill();
    // corner quarter-circles
    x.fillStyle = odd ? black : slate;
    for (const [cx, cy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      x.beginPath(); x.arc((cx * T) / 2, (cy * T) / 2, T * 0.16, 0, Math.PI * 2); x.fill();
    }
    x.restore();
    // per-tile wear
    x.fillStyle = `rgba(255,240,220,${rand() * 0.06})`; x.fillRect(ox, oy, T, T);
    x.fillStyle = `rgba(0,0,0,${rand() * 0.12})`; x.fillRect(ox, oy, T, T);
    r.fillStyle = `rgb(${70 + rand() * 40 | 0},0,0)`; r.fillRect(ox + 3, oy + 3, T - 6, T - 6);
  }
  // grout
  x.strokeStyle = 'rgba(20,16,12,0.9)'; x.lineWidth = 4;
  r.strokeStyle = '#d8d8d8'; r.lineWidth = 6;
  for (let i = 0; i <= 4; i++) {
    for (const g of [x, r]) {
      g.beginPath(); g.moveTo(i * T, 0); g.lineTo(i * T, S); g.stroke();
      g.beginPath(); g.moveTo(0, i * T); g.lineTo(S, i * T); g.stroke();
    }
  }
  speckle(x, S, S, 26000, 0.12, rand);
  speckle(x, S, S, 9000, 0.08, rand, true);
  // roughness is read from the green channel
  const rd = r.getImageData(0, 0, S, S);
  for (let i = 0; i < rd.data.length; i += 4) { const v = rd.data[i]; rd.data[i + 1] = v; rd.data[i + 2] = v; }
  r.putImageData(rd, 0, 0);
  return { map: tex(c, { repeat: [14, 10] }), rough: tex(rc, { repeat: [14, 10], srgb: false }) };
}

export function brick() {
  const W = 1024, H = 1024;
  const [c, x] = canvas(W, H);
  const [bc, b] = canvas(W, H);
  const rand = rng(11);
  x.fillStyle = '#5a4a3e'; x.fillRect(0, 0, W, H);
  b.fillStyle = '#202020'; b.fillRect(0, 0, W, H);
  const bh = 32, bw = 96;
  for (let row = 0; row < H / bh; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let col = -1; col < W / bw + 1; col++) {
      const px = col * bw + off, py = row * bh;
      const h = 8 + rand() * 14, s = 45 + rand() * 20, l = 22 + rand() * 14;
      x.fillStyle = `hsl(${h},${s}%,${l}%)`;
      x.fillRect(px + 3, py + 3, bw - 6, bh - 6);
      const g = 150 + rand() * 80;
      b.fillStyle = `rgb(${g},${g},${g})`;
      b.fillRect(px + 3, py + 3, bw - 6, bh - 6);
      if (rand() < 0.3) { x.fillStyle = `rgba(0,0,0,${rand() * 0.3})`; x.fillRect(px + 3, py + 3, bw - 6, bh - 6); }
    }
  }
  speckle(x, W, H, 40000, 0.18, rand);
  speckle(b, W, H, 30000, 0.3, rand);
  // soot gradient from the top
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(10,6,4,0.35)'); g.addColorStop(1, 'rgba(10,6,4,0)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  return { map: tex(c), bump: tex(bc, { srgb: false }) };
}

export function mahogany() {
  const [c, x] = canvas(512);
  const rand = rng(5);
  x.fillStyle = '#3a160c'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 260; i++) {
    const y = rand() * 512;
    x.strokeStyle = `rgba(${rand() < 0.5 ? '90,30,15' : '20,6,3'},${0.15 + rand() * 0.3})`;
    x.lineWidth = 0.5 + rand() * 2.5;
    x.beginPath();
    x.moveTo(0, y);
    for (let k = 0; k <= 512; k += 32) x.lineTo(k, y + Math.sin(k * 0.02 + i) * 4 + (rand() - 0.5) * 2);
    x.stroke();
  }
  return tex(c);
}

export function noiseTexture(size = 128) {
  // tileable value-noise fbm, used for smoke and fire shaders
  const [c, x] = canvas(size);
  const img = x.createImageData(size, size);
  const rand = rng(3);
  const grids = [4, 8, 16, 32].map((g) => {
    const a = new Float32Array(g * g);
    for (let i = 0; i < a.length; i++) a[i] = rand();
    return { g, a };
  });
  const sm = (t) => t * t * (3 - 2 * t);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    let v = 0, amp = 0.5, tot = 0;
    for (const { g, a } of grids) {
      const fx = (i / size) * g, fy = (j / size) * g;
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const tx = sm(fx - x0), ty = sm(fy - y0);
      const at = (xx, yy) => a[((yy % g) * g) + (xx % g)];
      const top = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx;
      const bot = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
      v += (top * (1 - ty) + bot * ty) * amp; tot += amp; amp *= 0.55;
    }
    v /= tot;
    const k = (j * size + i) * 4;
    img.data[k] = img.data[k + 1] = img.data[k + 2] = v * 255; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = tex(c, { srgb: false });
  return t;
}

// Painted side panel with Victorian lining (black edge, fine gold line)
export function linedPanel({ w = 1024, h = 360, base = '#1d4630', text = null, crest = false, number = null } = {}) {
  const [c, x] = canvas(w, h);
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,255,255,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0.18)');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  const m = 22, r = 30;
  const round = (ix, iy, iw, ih, rr) => {
    x.beginPath();
    x.moveTo(ix + rr, iy); x.lineTo(ix + iw - rr, iy); x.arcTo(ix + iw, iy, ix + iw, iy + rr, rr);
    x.lineTo(ix + iw, iy + ih - rr); x.arcTo(ix + iw, iy + ih, ix + iw - rr, iy + ih, rr);
    x.lineTo(ix + rr, iy + ih); x.arcTo(ix, iy + ih, ix, iy + ih - rr, rr);
    x.lineTo(ix, iy + rr); x.arcTo(ix, iy, ix + rr, iy, rr); x.closePath();
  };
  x.strokeStyle = '#0b0b09'; x.lineWidth = 16; x.strokeRect(0, 0, w, h);
  x.strokeStyle = '#d9a441'; x.lineWidth = 3; round(m, m, w - 2 * m, h - 2 * m, r); x.stroke();
  x.strokeStyle = '#0b0b09'; x.lineWidth = 6; round(m + 9, m + 9, w - 2 * m - 18, h - 2 * m - 18, r - 6); x.stroke();
  if (crest) {
    const cx = w / 2, cy = h / 2;
    x.save(); x.translate(cx, cy);
    x.fillStyle = '#d9a441';
    x.beginPath(); x.ellipse(0, 0, 70, 82, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#7a1912';
    x.beginPath(); x.ellipse(0, 0, 60, 72, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#e8d9a8';
    x.beginPath(); x.moveTo(0, -48); x.lineTo(34, 18); x.lineTo(-34, 18); x.closePath(); x.fill();
    x.fillStyle = '#7a1912';
    x.font = 'bold 34px Cinzel, Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('P', 0, 4);
    x.fillStyle = '#d9a441'; x.font = 'bold 22px Cinzel, Georgia, serif';
    x.fillText('MDCCCLI', 0, 52);
    x.restore();
  }
  if (text) {
    x.fillStyle = '#e2b450';
    x.font = `bold ${h * 0.24}px Cinzel, Georgia, serif`;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = 'rgba(0,0,0,0.8)'; x.shadowBlur = 2; x.shadowOffsetX = 3; x.shadowOffsetY = 3;
    const parts = text.split('|');
    x.fillText(parts[0], w * 0.22, h / 2);
    if (parts[1]) x.fillText(parts[1], w * 0.78, h / 2);
    x.shadowColor = 'transparent';
  }
  if (number) {
    x.fillStyle = '#e2b450'; x.font = `bold ${h * 0.26}px Cinzel, Georgia, serif`;
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(number, w / 2, h / 2);
  }
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

export function nameplate(name = 'PROMETHEUS') {
  const [c, x] = canvas(1024, 160);
  x.fillStyle = '#c99a3c'; x.fillRect(0, 0, 1024, 160);
  x.fillStyle = '#6e1410'; x.fillRect(14, 14, 996, 132);
  x.fillStyle = '#e8bf5c';
  x.font = 'bold 104px Cinzel, Georgia, serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(name, 512, 86);
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

export function numberplate(n = '1851') {
  const [c, x] = canvas(256, 128);
  x.fillStyle = '#c99a3c'; x.beginPath(); x.ellipse(128, 64, 126, 62, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#121212'; x.beginPath(); x.ellipse(128, 64, 114, 52, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#e8bf5c'; x.font = 'bold 60px Cinzel, Georgia, serif';
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n, 128, 68);
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

export function duskGlass() {
  const [c, x] = canvas(64, 512);
  const g = x.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0.0, '#1b2350');
  g.addColorStop(0.45, '#4a3f78');
  g.addColorStop(0.7, '#b0607a');
  g.addColorStop(0.86, '#f0a35a');
  g.addColorStop(1.0, '#ffd28a');
  x.fillStyle = g; x.fillRect(0, 0, 64, 512);
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

export function banner(lines) {
  const [c, x] = canvas(2048, 320);
  x.fillStyle = '#5c1010'; x.fillRect(0, 0, 2048, 320);
  const g = x.createLinearGradient(0, 0, 0, 320);
  g.addColorStop(0, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0.35)');
  x.fillStyle = g; x.fillRect(0, 0, 2048, 320);
  x.strokeStyle = '#d6a542'; x.lineWidth = 8; x.strokeRect(24, 24, 2000, 272);
  x.lineWidth = 2; x.strokeRect(40, 40, 1968, 240);
  x.fillStyle = '#efc767'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = 'bold 118px Cinzel, Georgia, serif'; x.fillText(lines[0], 1024, 140);
  x.font = 'italic 52px "EB Garamond", Georgia, serif'; x.fillText(lines[1], 1024, 236);
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

export function clockFace() {
  const [c, x] = canvas(512);
  x.translate(256, 256);
  x.fillStyle = '#efe4c8'; x.beginPath(); x.arc(0, 0, 250, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#2a1e12'; x.lineWidth = 6; x.beginPath(); x.arc(0, 0, 236, 0, Math.PI * 2); x.stroke();
  const roman = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  x.fillStyle = '#1d140c'; x.font = '44px Cinzel, Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    x.lineWidth = i % 5 ? 2 : 5;
    x.beginPath(); x.moveTo(Math.sin(a) * 222, -Math.cos(a) * 222); x.lineTo(Math.sin(a) * (i % 5 ? 212 : 200), -Math.cos(a) * (i % 5 ? 212 : 200)); x.stroke();
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    x.save(); x.translate(Math.sin(a) * 170, -Math.cos(a) * 170); x.rotate(a); x.fillText(roman[i], 0, 0); x.restore();
  }
  x.font = 'italic 22px "EB Garamond", Georgia, serif'; x.fillText('Prometheus & Co. · London', 0, 80);
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

export function plaque(title, sub) {
  const [c, x] = canvas(1024, 384);
  const g = x.createLinearGradient(0, 0, 0, 384);
  g.addColorStop(0, '#e6c06a'); g.addColorStop(0.5, '#b8862e'); g.addColorStop(1, '#8a5f1c');
  x.fillStyle = g; x.fillRect(0, 0, 1024, 384);
  x.strokeStyle = '#4b3010'; x.lineWidth = 6; x.strokeRect(18, 18, 988, 348);
  x.fillStyle = '#2c1a06'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = 'bold 76px Cinzel, Georgia, serif'; x.fillText(title, 512, 140);
  x.font = 'italic 40px "EB Garamond", Georgia, serif';
  sub.split('\n').forEach((l, i) => x.fillText(l, 512, 232 + i * 52));
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

// soft radial sprite for particles and glows
export function softSprite() {
  const [c, x] = canvas(128);
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); return t;
}
