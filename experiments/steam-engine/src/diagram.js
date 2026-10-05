// A live engraving-style section of the right-hand cylinder and slide valve,
// with the indicator diagram (pressure against piston travel) beside it.

import { G } from './valvegear.js';

const ATM = 14.7;
const INK = '#2a1a0c';

function steamRGB(pAbs, pBoil) {
  const f = Math.max(0, Math.min(1, (pAbs - ATM) / Math.max(1, pBoil - ATM)));
  const lerp = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const cool = [150, 135, 235], warm = [245, 160, 70], hot = [225, 50, 30];
  const c = f > 0.5 ? lerp(warm, hot, (f - 0.5) * 2) : lerp(cool, warm, f * 2);
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export class CylinderDiagram {
  constructor(canvas) {
    this.c = canvas;
    this.x = canvas.getContext('2d');
    this.side = 0;
    this.prevQ = 0;
    this.resize();
  }

  resize() {
    const r = this.c.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(10, r.width); this.h = Math.max(10, r.height);
    this.c.width = this.w * dpr; this.c.height = this.h * dpr;
    this.x.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  phase(admit, exhaust, growing) {
    if (admit > 0.0005) return ['ADMISSION', '#b8321c'];
    if (exhaust > 0.0005) return ['EXHAUST', '#5a4cc0'];
    return growing ? ['EXPANSION', '#c07020'] : ['COMPRESSION', '#806040'];
  }

  draw(sim) {
    const x = this.x, W = this.w, H = this.h;
    x.clearRect(0, 0, W, H);
    const side = sim.sides[this.side];
    const k = side.kin, P = side.port;
    const pBoil = sim.pBoiler + ATM;
    const secW = W * 0.56;
    // ---------------- section (schematic: true horizontal scale, compressed vertical layout) ----------------
    const x0 = G.CYL_REAR - 0.2, x1 = G.CYL_FRONT + 0.06;
    const sc = (secW - 16) / (x1 - x0);
    const X = (v) => 8 + (v - x0) * sc;
    const usable = H - 66;
    const ycTop = 22, chH = usable * 0.27, gap = usable * 0.2, cyH = usable * 0.36;
    const ycBot = ycTop + chH, ykTop = ycBot + gap, ykBot = ykTop + cyH, yMid = (ykTop + ykBot) / 2;
    const XR = X(G.CYL_REAR), XF = X(G.CYL_FRONT);
    x.lineJoin = 'round'; x.lineCap = 'round';
    const chestCol = steamRGB(sim.pChest + ATM, pBoil);
    // steam pipe in from the boiler, and the chest
    x.fillStyle = chestCol; x.strokeStyle = INK; x.lineWidth = 2.5;
    x.fillRect(X(G.CHEST_C) - 7, 8, 14, ycTop - 8); x.strokeRect(X(G.CHEST_C) - 7, 8, 14, ycTop - 8);
    x.globalAlpha = 0.6; x.fillRect(XR, ycTop, XF - XR, chH); x.globalAlpha = 1;
    x.lineWidth = 3; x.strokeRect(XR, ycTop, XF - XR, chH);
    // passages from the ports down and along to each cylinder end
    const pf = G.CHEST_C + G.VALVE_H - G.LAP - G.PORT_W / 2, pr = 2 * G.CHEST_C - pf;
    const pw = Math.max(8, G.PORT_W * sc);
    const passY = ycBot + gap * 0.45;
    const pass = (px, endX, col) => {
      const pts = [[X(px), ycBot], [X(px), passY], [X(endX), passY], [X(endX), ykTop + 2]];
      for (const [lw, c] of [[pw + 5, INK], [pw, col]]) {
        x.strokeStyle = c; x.lineWidth = lw; x.lineCap = 'butt';
        x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke();
      }
    };
    pass(pf, G.CYL_FRONT - 0.06, steamRGB(side.pF, pBoil));
    pass(pr, G.CYL_REAR + 0.06, steamRGB(side.pR, pBoil));
    // exhaust port: straight down, then away to the blastpipe (towards you)
    const exCol = side.exh > 0.2 ? '#8f7cff' : '#d8ccb0';
    const exY = ycBot + gap * 0.92;
    for (const [lw, c] of [[0.08 * sc + 5, INK], [0.08 * sc, exCol]]) {
      x.strokeStyle = c; x.lineWidth = lw; x.lineCap = 'butt';
      x.beginPath(); x.moveTo(X(G.CHEST_C), ycBot); x.lineTo(X(G.CHEST_C), exY - 4); x.stroke();
    }
    x.fillStyle = exCol; x.strokeStyle = INK; x.lineWidth = 2;
    x.beginPath(); x.arc(X(G.CHEST_C), exY - 2, 8, 0, Math.PI * 2); x.fill(); x.stroke();
    x.beginPath(); x.arc(X(G.CHEST_C), exY - 2, 2.5, 0, Math.PI * 2); x.fillStyle = INK; x.fill();
    // cylinder with the steam in each end
    const pistonX = k.piston, pt = 0.08 * sc;
    x.fillStyle = steamRGB(side.pR, pBoil);
    x.fillRect(XR, ykTop, X(pistonX) - pt / 2 - XR, cyH);
    x.fillStyle = steamRGB(side.pF, pBoil);
    x.fillRect(X(pistonX) + pt / 2, ykTop, XF - X(pistonX) - pt / 2, cyH);
    x.strokeStyle = INK; x.lineWidth = 4; x.strokeRect(XR, ykTop, XF - XR, cyH);
    x.lineWidth = 1; x.strokeStyle = 'rgba(42,26,12,0.45)';
    for (let i = XR; i < XF; i += 5) { x.beginPath(); x.moveTo(i, ykBot + 2); x.lineTo(i + 5, ykBot + 7); x.stroke(); }
    // piston and rod
    x.fillStyle = '#a3a8ae'; x.strokeStyle = INK; x.lineWidth = 2;
    x.fillRect(X(pistonX) - pt / 2, ykTop + 2, pt, cyH - 4); x.strokeRect(X(pistonX) - pt / 2, ykTop + 2, pt, cyH - 4);
    x.fillRect(X(x0) - 10, yMid - 3, X(pistonX) - pt / 2 - X(x0) + 10, 6); x.strokeRect(X(x0) - 10, yMid - 3, X(pistonX) - pt / 2 - X(x0) + 10, 6);
    // slide valve on its seat
    const vc = G.CHEST_C + k.valve, vh = Math.min(chH * 0.55, 0.12 * sc), vy = ycBot;
    x.fillStyle = '#c9a463'; x.strokeStyle = INK; x.lineWidth = 2;
    x.beginPath();
    x.moveTo(X(vc - G.VALVE_H), vy); x.lineTo(X(vc - G.CAVITY_H), vy); x.lineTo(X(vc - G.CAVITY_H) + 4, vy - vh * 0.55);
    x.lineTo(X(vc + G.CAVITY_H) - 4, vy - vh * 0.55); x.lineTo(X(vc + G.CAVITY_H), vy); x.lineTo(X(vc + G.VALVE_H), vy);
    x.lineTo(X(vc + G.VALVE_H), vy - vh); x.lineTo(X(vc - G.VALVE_H), vy - vh); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = side.exh > 0.2 ? 'rgba(143,124,255,0.9)' : 'rgba(216,204,176,0.95)';
    x.beginPath(); x.moveTo(X(vc - G.CAVITY_H) + 2, vy - 1); x.lineTo(X(vc - G.CAVITY_H) + 5, vy - vh * 0.55 + 2);
    x.lineTo(X(vc + G.CAVITY_H) - 5, vy - vh * 0.55 + 2); x.lineTo(X(vc + G.CAVITY_H) - 2, vy - 1); x.closePath(); x.fill();
    x.strokeStyle = INK; x.lineWidth = 3;
    x.beginPath(); x.moveTo(X(x0) - 10, vy - vh / 2); x.lineTo(X(vc - G.VALVE_H), vy - vh / 2); x.stroke();
    // flow arrows into open admission ports
    const arrow = (ax, ay, bx, by, col) => {
      x.strokeStyle = col; x.fillStyle = col; x.lineWidth = 2.5;
      x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();
      const a = Math.atan2(by - ay, bx - ax);
      x.beginPath(); x.moveTo(bx, by); x.lineTo(bx - Math.cos(a - 0.5) * 7, by - Math.sin(a - 0.5) * 7); x.lineTo(bx - Math.cos(a + 0.5) * 7, by - Math.sin(a + 0.5) * 7); x.closePath(); x.fill();
    };
    if (P.frontAdmit > 0.0005) arrow(X(pf) + 12, ycTop + 8, X(pf) + 2, ycBot - 3, '#b8321c');
    if (P.rearAdmit > 0.0005) arrow(X(pr) - 12, ycTop + 8, X(pr) - 2, ycBot - 3, '#b8321c');

    // labels
    x.fillStyle = INK; x.font = '10px "IM Fell English SC", Georgia, serif';
    x.textAlign = 'left'; x.fillText('steam chest', XR + 4, ycTop + 11);
    x.textAlign = 'right'; x.fillText('from boiler', X(G.CHEST_C) - 11, 15);
    x.textAlign = 'left'; x.fillText('exhaust to blastpipe', X(G.CHEST_C) + 11, exY + 1);
    x.textAlign = 'right'; x.fillText('slide valve', XF - 4, ycTop + 11);
    x.textAlign = 'left'; x.fillText('piston rod', X(x0) - 8, yMid - 7);
    // phase of each end
    const growF = side.vF > (this.prevVF ?? side.vF), growR = side.vR > (this.prevVR ?? side.vR);
    this.prevVF = side.vF; this.prevVR = side.vR;
    if (Math.abs(sim.omega) > 1e-4) { this.phR = this.phase(P.rearAdmit, P.rearExhaust, growR); this.phF = this.phase(P.frontAdmit, P.frontExhaust, growF); }
    const [phR, colR] = this.phR ?? this.phase(P.rearAdmit, P.rearExhaust, false);
    const [phF, colF] = this.phF ?? this.phase(P.frontAdmit, P.frontExhaust, false);
    const by = ykBot + 17;
    x.font = '10px "IM Fell English SC", Georgia, serif'; x.fillStyle = INK;
    x.textAlign = 'left'; x.fillText('rear end', XR, by);
    x.textAlign = 'right'; x.fillText('front end', XF, by);
    x.font = '700 12px "IM Fell English SC", Georgia, serif';
    x.textAlign = 'left'; x.fillStyle = colR; x.fillText(phR, XR, by + 14);
    x.textAlign = 'right'; x.fillStyle = colF; x.fillText(phF, XF, by + 14);
    x.textAlign = 'left';

    // ---------------- indicator diagram ----------------
    const gx = secW + 22, gy = 22, gw = W - gx - 8, gh = H - 64;
    x.strokeStyle = INK; x.lineWidth = 1.5;
    x.strokeRect(gx, gy, gw, gh);
    x.font = '600 10px "IM Fell English SC", Georgia, serif'; x.fillStyle = INK;
    x.textAlign = 'center';
    x.fillText('INDICATOR DIAGRAM', gx + gw / 2, gy - 8);
    x.fillText('piston travel →', gx + gw / 2, gy + gh + 13);
    x.save(); x.translate(gx - 6, gy + gh / 2); x.rotate(-Math.PI / 2); x.fillText('pressure', 0, 0); x.restore();
    // grid
    x.strokeStyle = 'rgba(42,26,12,0.15)'; x.lineWidth = 1;
    for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(gx, gy + (gh * i) / 4); x.lineTo(gx + gw, gy + (gh * i) / 4); x.stroke(); }
    const pMax = 200 + ATM;
    const PX = (q) => gx + (q / (2 * G.R)) * gw;
    const PY = (p) => gy + gh - ((p - ATM * 0.6) / (pMax - ATM * 0.6)) * gh;
    // atmospheric line
    x.strokeStyle = 'rgba(42,26,12,0.5)'; x.setLineDash([4, 3]);
    x.beginPath(); x.moveTo(gx, PY(ATM)); x.lineTo(gx + gw, PY(ATM)); x.stroke(); x.setLineDash([]);
    const c = side.card;
    const loop = (arr, col) => {
      x.strokeStyle = col; x.lineWidth = 2; x.fillStyle = col;
      x.beginPath();
      for (let i = 0; i <= 360; i++) {
        const j = i % 360;
        const px = PX(c.q[j]), py = PY(arr[j]);
        if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
      x.globalAlpha = 0.15; x.fill(); x.globalAlpha = 1; x.stroke();
    };
    loop(c.pR, '#b8321c');
    loop(c.pF, '#2a5aa8');
    // current state dots
    x.fillStyle = '#b8321c'; x.beginPath(); x.arc(PX(k.q), PY(side.pR), 3.5, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#2a5aa8'; x.beginPath(); x.arc(PX(k.q), PY(side.pF), 3.5, 0, Math.PI * 2); x.fill();
    x.textAlign = 'left'; x.font = '600 9px "IM Fell English SC", Georgia, serif';
    x.fillStyle = '#b8321c'; x.fillText('● rear end', gx + 4, gy + 11);
    x.fillStyle = '#2a5aa8'; x.fillText('● front end', gx + 4, gy + 22);
    // footer
    x.fillStyle = INK; x.font = 'italic 11px "EB Garamond", Georgia, serif'; x.textAlign = 'left';
    const hp = sim.indicatedPower();
    x.fillText(`Cut-off ${Math.round(sim.cutoff * 100)}%  ·  Indicated power ≈ ${hp > 1 ? Math.round(hp) : 0} hp  ·  the shaded loop's area is the work done each stroke`, 10, H - 8);
  }
}
