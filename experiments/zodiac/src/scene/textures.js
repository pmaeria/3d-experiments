// Canvas-drawn textures: the engraved zodiac ring strip, soft glows, planet surfaces.
// Nothing is downloaded; everything is procedural.

import * as THREE from 'three';
import { signs, signOrder, elements } from '../content/index.js';

export const GLYPH_FONT = `'Noto Sans Symbols', 'Noto Sans Symbols 2', 'Apple Symbols', 'Segoe UI Symbol', serif`;
export const DISPLAY_FONT = `'Cinzel', 'Trajan Pro', Georgia, serif`;

// Ring strip layout. The strip is unrolled longitude (u) by radial position (v).
// u = 1 - lon/360 so that text drawn left-to-right reads clockwise seen from ecliptic north
// (tops outward) and left-to-right seen from inside (sky view, tops toward ecliptic north).
export const STRIP = { W: 8192, H: 256, tickZone: 56, glyphZone: [56, 214] };
// Radial extent of the flat ring (fractions of R) and half-width of the sky band (degrees).
export const RING_R = { inner: 1.0, outer: 1.14 };
export const BAND_LAT = 4.2;

function sliceX(i) {
  // x-range in the canvas for sign i (lon 30i..30i+30)
  const W = STRIP.W;
  return [W * (1 - (30 * i + 30) / 360), W * (1 - (30 * i) / 360)];
}

/** Base: dark lacquered band, engraved rims, subtle element tint strip. */
export function makeRingBaseTexture(renderer) {
  const { W, H } = STRIP;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  // lacquer with a faint brushed texture
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#1d150b');
  grad.addColorStop(0.5, '#120d07');
  grad.addColorStop(1, '#1a130a');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  g.globalAlpha = 0.06;
  for (let y = 0; y < H; y += 2) {
    g.fillStyle = y % 4 ? '#fff4d0' : '#000';
    g.fillRect(0, y, W, 1);
  }
  g.globalAlpha = 1;
  // element tint strip (inner edge) and a whisper of tint across the slice
  for (let i = 0; i < 12; i++) {
    const s = signs[signOrder[i]];
    const col = elements[s.element].color;
    const [x0, x1] = sliceX(i);
    g.fillStyle = col;
    g.globalAlpha = 0.55;
    g.fillRect(x0, STRIP.glyphZone[1] + 6, x1 - x0, H - STRIP.glyphZone[1] - 10);
    g.globalAlpha = 0.07;
    g.fillRect(x0, STRIP.tickZone, x1 - x0, STRIP.glyphZone[1] - STRIP.tickZone);
  }
  g.globalAlpha = 1;
  // engraved rule lines (dark groove + light lip)
  const rule = (y) => {
    g.fillStyle = 'rgba(0,0,0,0.8)'; g.fillRect(0, y - 1, W, 2);
    g.fillStyle = 'rgba(240,200,110,0.55)'; g.fillRect(0, y + 1, W, 1.5);
  };
  rule(STRIP.tickZone);
  rule(STRIP.glyphZone[1] + 4);
  const tex = new THREE.CanvasTexture(cv);
  finishTexture(tex, renderer);
  return tex;
}

/** Labels: glyph + name for each sign, engraved gold, on transparent. */
export function makeRingLabelTexture(renderer) {
  const { W, H } = STRIP;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const cy = (STRIP.glyphZone[0] + STRIP.glyphZone[1]) / 2 + 4;
  for (let i = 0; i < 12; i++) {
    const s = signs[signOrder[i]];
    const [x0, x1] = sliceX(i);
    const xc = (x0 + x1) / 2;
    g.textBaseline = 'middle';
    // measure to centre glyph + name as one unit
    g.font = `400 104px ${GLYPH_FONT}`;
    const gw = g.measureText(s.glyph).width;
    g.font = `700 46px ${DISPLAY_FONT}`;
    const name = s.name.toUpperCase();
    const spaced = name.split('').join(' ');
    const nw = g.measureText(spaced).width;
    const gap = 26;
    const total = gw + gap + nw;
    const gx = xc - total / 2;
    const nx = gx + gw + gap;
    engraved(g, () => { g.font = `400 104px ${GLYPH_FONT}`; return [s.glyph, gx, cy + 2]; });
    engraved(g, () => { g.font = `700 46px ${DISPLAY_FONT}`; return [spaced, nx, cy + 4]; });
    // small degree numerals in the tick zone: 10 and 20 within each sign
    g.font = `600 26px ${DISPLAY_FONT}`;
    for (const d of [10, 20]) {
      const lon = 30 * i + d;
      const x = W * (1 - lon / 360);
      g.textAlign = 'center';
      g.fillStyle = 'rgba(233,196,111,0.85)';
      g.fillText(String(d), x, STRIP.tickZone - 16);
    }
    g.textAlign = 'left';
  }
  const tex = new THREE.CanvasTexture(cv);
  finishTexture(tex, renderer);
  return tex;
}

function engraved(g, setup) {
  const [text, x, y] = setup();
  g.textAlign = 'left';
  g.fillStyle = 'rgba(0,0,0,0.85)';
  g.fillText(text, x - 1.5, y - 1.5);
  const gr = g.createLinearGradient(0, y - 50, 0, y + 50);
  gr.addColorStop(0, '#fff3c4');
  gr.addColorStop(0.45, '#e6b85c');
  gr.addColorStop(0.55, '#a8772c');
  gr.addColorStop(1, '#f0cf7c');
  g.fillStyle = gr;
  g.fillText(text, x, y);
}

function finishTexture(tex, renderer) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.RepeatWrapping;
  tex.needsUpdate = true;
}

/** Radial soft glow sprite texture. */
export function makeGlowTexture(size = 256, stops = [[0, 'rgba(255,255,255,1)'], [0.2, 'rgba(255,240,200,0.6)'], [1, 'rgba(255,200,120,0)']]) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
