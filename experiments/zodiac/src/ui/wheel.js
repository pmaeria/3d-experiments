// Chart wheel HUD (SVG): the current moment and place flattened into the familiar natal
// wheel. Ascendant on the left, longitudes counterclockwise, houses, planet glyphs with
// collision avoidance and leader lines, Asc/MC axes and aspect lines. Every element selects the
// same object as in 3D (shared state.selection).

import { planets, signs, signOrder, elements, aspects as aspectContent, houses, ui } from '../content/index.js';
import { toggleOn, birthTimeUnknownShown } from '../state.js';
import { getSkyState } from '../astro/index.js';
import { h, formatDeg } from './dom.js';

const NS = 'http://www.w3.org/2000/svg';
const R = { bezel: 106, signOut: 100, signIn: 85, tick: 81, planet: 70, house: 36, aspect: 33, transit: 119 };
const VIEW = { normal: '-112 -112 224 224', transits: '-131 -131 262 262' };

function svg(tag, attrs = {}, ...kids) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) e.setAttribute(k, v);
  for (const k of kids.flat()) if (k) e.append(k);
  return e;
}

export function initWheel(ctx) {
  const { store } = ctx;
  const box = document.getElementById('wheelBox');
  const root = svg('svg', { viewBox: VIEW.normal, role: 'group', 'aria-label': 'Chart wheel for the moment and place shown' });
  const defs = svg('defs', {},
    svg('radialGradient', { id: 'wfFace', cx: '0.5', cy: '0.45', r: '0.6' },
      svg('stop', { offset: '0', 'stop-color': '#18213b' }), svg('stop', { offset: '1', 'stop-color': '#070b16' })),
    svg('linearGradient', { id: 'wfBrass', x1: '0', y1: '0', x2: '1', y2: '1' },
      ...[['0', '#fff1bd'], ['0.35', '#d3a14a'], ['0.6', '#7a5018'], ['1', '#e9c271']].map(([o, c]) => svg('stop', { offset: o, 'stop-color': c }))));
  root.append(defs);
  const layer = svg('g');
  root.append(layer);
  const caption = h('div.wheel-caption');
  const expandBtn = h('button.brass-btn', { type: 'button', title: 'Enlarge the wheel', 'aria-label': 'Enlarge the wheel', onclick: () => store.patch({ wheelExpanded: !store.get().wheelExpanded }) }, '⤢');
  box.append(root, caption, h('div.wheel-tools', {}, expandBtn));
  let scrim = null;

  const sel = (kind, id) => ctx.select({ kind, id }, 'wheel');
  const hover = (kind, id) => {
    const cur = store.get().hover;
    if (kind === null) { if (cur) store.patch({ hover: null }); return; }
    if (cur?.kind !== kind || cur?.id !== id) store.patch({ hover: { kind, id } });
  };

  function hit(g, kind, id, label) {
    g.setAttribute('class', 'wheel-hit');
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', label);
    g.addEventListener('click', (e) => { e.stopPropagation(); sel(kind, id); });
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); sel(kind, id); } });
    g.addEventListener('pointerenter', () => hover(kind, id));
    g.addEventListener('pointerleave', () => hover(null));
    return g;
  }

  // today's sky for the transit ring, recomputed at most once a minute
  let transitSky = null;
  let transitKey = -1;
  function todaySky() {
    const k = Math.floor(Date.now() / 60000);
    if (k !== transitKey) { transitSky = getSkyState(new Date()); transitKey = k; }
    return transitSky;
  }

  function draw(state, frame) {
    // a birth chart with unknown time has no Ascendant or houses: draw a "natural" wheel
    // with 0° Aries on the left instead
    const noTime = birthTimeUnknownShown(state);
    const asc = noTime ? 0 : frame.angles.asc;
    const th = (lon) => ((180 + lon - asc) * Math.PI) / 180;
    const P = (lon, r) => [r * Math.cos(th(lon)), -r * Math.sin(th(lon))];
    const arc = (l0, l1, r0, r1) => {
      const [x0, y0] = P(l0, r1), [x1, y1] = P(l1, r1), [x2, y2] = P(l1, r0), [x3, y3] = P(l0, r0);
      const large = ((l1 - l0 + 360) % 360) > 180 ? 1 : 0;
      return `M${x0},${y0} A${r1},${r1} 0 ${large} 0 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 ${large} 1 ${x3},${y3} Z`;
    };
    const hiSigns = new Set(state.highlight?.signs ?? []);
    const hiBodies = new Set(state.highlight?.bodies ?? []);
    const s = state.selection;
    const hv = state.hover;
    const g = svg('g');

    g.append(svg('circle', { r: R.bezel, fill: 'url(#wfBrass)' }));
    g.append(svg('circle', { r: R.bezel - 3, fill: 'url(#wfFace)' }));

    // sign ring
    for (let i = 0; i < 12; i++) {
      const id = signOrder[i];
      const sg = signs[id];
      const on = hiSigns.has(id) || (s?.kind === 'sign' && s.id === id);
      const isHover = hv?.kind === 'sign' && hv.id === id;
      const grp = svg('g');
      grp.append(svg('path', { class: 'wh', d: arc(i * 30, i * 30 + 30, R.signIn, R.signOut), fill: elements[sg.element].color, 'fill-opacity': on ? 0.42 : isHover ? 0.3 : 0.14, stroke: '#e9c46f', 'stroke-opacity': 0.55, 'stroke-width': 0.5 }));
      const [gx, gy] = P(i * 30 + 15, (R.signIn + R.signOut) / 2);
      grp.append(svg('text', { x: gx, y: gy, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 10.5, fill: on ? '#fff3c4' : '#e9c46f', 'font-family': 'Noto Sans Symbols, Noto Sans Symbols 2, serif' }, sg.glyph));
      g.append(hit(grp, 'sign', id, `${sg.name}, ${sg.startDeg} to ${sg.startDeg + 30} degrees`));
    }
    // degree ticks
    let ticks = '';
    for (let d = 0; d < 360; d += 5) {
      const [x0, y0] = P(d, R.signIn);
      const [x1, y1] = P(d, d % 10 === 0 ? R.tick - 1.5 : R.tick + 1);
      ticks += `M${x0},${y0}L${x1},${y1}`;
    }
    g.append(svg('path', { d: ticks, stroke: '#e9c46f', 'stroke-opacity': 0.5, 'stroke-width': 0.4 }));
    g.append(svg('circle', { r: R.signIn, fill: 'none', stroke: '#e9c46f', 'stroke-opacity': 0.7, 'stroke-width': 0.6 }));
    g.append(svg('circle', { r: R.aspect, fill: '#060912', 'fill-opacity': 0.6, stroke: '#e9c46f', 'stroke-opacity': 0.45, 'stroke-width': 0.5 }));

    // houses
    const cusps = frame.houses.cusps;
    const housesOn = !noTime;
    if (housesOn) {
      for (let i = 0; i < 12; i++) {
        const c = cusps[i];
        const span = ((cusps[(i + 1) % 12] - c) % 360 + 360) % 360;
        const isAxis = i % 3 === 0;
        const [x0, y0] = P(c, R.aspect), [x1, y1] = P(c, R.signIn);
        g.append(svg('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: '#9db7e8', 'stroke-opacity': isAxis ? 0 : 0.4, 'stroke-width': 0.5 }));
        const [nx, ny] = P(c + span / 2, R.house + 4.5);
        const n = i + 1;
        const on = s?.kind === 'house' && Number(s.id) === n;
        const hg = svg('g');
        hg.append(svg('circle', { class: 'focus-ring', cx: nx, cy: ny, r: 4.6, fill: on ? 'rgba(157,183,232,.35)' : 'transparent', stroke: 'none' }));
        hg.append(svg('text', { class: 'wh', x: nx, y: ny, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 5.2, fill: '#b9cdf5', 'font-family': 'Cinzel, serif' }, String(n)));
        g.append(hit(hg, 'house', String(n), houses[n].name));
      }
    }

    // angles: horizon and meridian axes
    const ang = frame.angles;
    const axis = (l, color, label, id) => {
      const [x0, y0] = P(l, R.aspect), [x1, y1] = P(l, R.signOut + 3);
      const [xo, yo] = P(l + 180, R.aspect), [xo1, yo1] = P(l + 180, R.signIn);
      g.append(svg('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: color, 'stroke-width': 1.1 }));
      g.append(svg('line', { x1: xo, y1: yo, x2: xo1, y2: yo1, stroke: color, 'stroke-width': 0.6, 'stroke-opacity': 0.6 }));
      const [lx, ly] = P(l, R.signOut + 8);
      const on = (s?.kind === 'body' && s.id === id) || hiBodies.has(id);
      const ag = svg('g');
      ag.append(svg('text', { class: 'wh', x: lx, y: ly, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': on ? 7.5 : 6.2, 'font-weight': 700, fill: color, 'font-family': 'Cinzel, serif' }, label));
      g.append(hit(ag, 'body', id, `${planets[id].name}: ${formatDeg(l)}`));
    };
    if (!noTime && state.bodies.includes('ascendant')) axis(ang.asc, planets.ascendant.color, 'AC', 'ascendant');
    if (!noTime && state.bodies.includes('midheaven')) axis(ang.mc, planets.midheaven.color, 'MC', 'midheaven');

    // transits: today's planets on an outer ring around a birth chart
    const transits = !!(state.transits && state.chart);
    root.setAttribute('viewBox', transits ? VIEW.transits : VIEW.normal);
    if (transits) {
      const ts = todaySky();
      g.append(svg('circle', { r: R.bezel + 3.5, fill: 'none', stroke: '#9cc3ff', 'stroke-opacity': 0.35, 'stroke-width': 0.5 }));
      g.append(svg('circle', { r: R.transit + 8, fill: 'none', stroke: '#9cc3ff', 'stroke-opacity': 0.2, 'stroke-width': 0.5, 'stroke-dasharray': '1.5 2' }));
      const tItems = ts.order.map((id) => ({ id, lon: ts.bodies[id].longitude, d: ts.bodies[id].longitude })).sort((a, b) => a.lon - b.lon);
      for (let pass = 0; pass < 40 && tItems.length > 1; pass++) {
        let moved = false;
        for (let i = 0; i < tItems.length; i++) {
          const a = tItems[i], b = tItems[(i + 1) % tItems.length];
          let gap = b.d - a.d;
          if (i === tItems.length - 1) gap += 360;
          if (gap < 6.5) { const push = (6.5 - gap) / 2 + 0.01; a.d -= push; b.d += push; moved = true; }
        }
        if (!moved) break;
      }
      for (const it of tItems) {
        const p = planets[it.id];
        const [x0, y0] = P(it.lon, R.bezel + 1);
        const [x1, y1] = P(it.lon, R.bezel + 5);
        const [gx, gy] = P(it.d, R.transit);
        g.append(svg('g', { role: 'img', 'aria-label': `Today: ${p.name} at ${formatDeg(it.lon)}` },
          svg('title', {}, `Today: ${p.name} at ${formatDeg(it.lon)}${ts.bodies[it.id].retrograde ? ', retrograde' : ''}`),
          svg('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: p.color, 'stroke-width': 0.9 }),
          svg('circle', { cx: gx, cy: gy, r: 4.4, fill: '#0a0f1d', stroke: p.color, 'stroke-opacity': 0.55, 'stroke-width': 0.4 }),
          svg('text', { x: gx, y: gy, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 6.2, fill: p.color, 'font-family': 'Noto Sans Symbols, Noto Sans Symbols 2, serif' }, p.glyph)));
      }
    }

    // planets with collision avoidance
    const items = frame.sky.order.filter((id) => state.bodies.includes(id)).map((id) => ({ id, lon: frame.points[id].longitude, d: frame.points[id].longitude }));
    items.sort((a, b) => a.lon - b.lon);
    const MIN = 8.5; // degrees between glyphs; the degree labels under them need the room
    for (let pass = 0; pass < 40 && items.length > 1; pass++) {
      let moved = false;
      for (let i = 0; i < items.length; i++) {
        const a = items[i], b = items[(i + 1) % items.length];
        let gap = b.d - a.d;
        if (i === items.length - 1) gap += 360;
        if (gap < MIN) {
          const push = (MIN - gap) / 2 + 0.01;
          a.d -= push; b.d += push;
          moved = true;
        }
      }
      if (!moved) break;
    }
    // aspects (inside)
    if (toggleOn(state.toggles.aspects) || state.highlight?.aspect || s?.kind === 'aspect') {
      const hlKey = state.highlight?.aspect ? [...state.highlight.aspect].sort().join('|') : null;
      for (const x of frame.aspects) {
        if (!state.bodies.includes(x.a) || !state.bodies.includes(x.b)) continue;
        const key = [x.a, x.b].sort().join('|');
        const selKey = s?.kind === 'aspect' ? s.id.split('|').sort().join('|') : null;
        const strong = key === hlKey || key === selKey;
        if (!toggleOn(state.toggles.aspects) && !strong) continue;
        const [x0, y0] = P(frame.points[x.a].longitude, R.aspect);
        const [x1, y1] = P(frame.points[x.b].longitude, R.aspect);
        const tight = 1 - x.orb / x.maxOrb;
        const ag = svg('g');
        ag.append(svg('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: 'transparent', 'stroke-width': 4 }));
        ag.append(svg('line', { class: 'wh', x1: x0, y1: y0, x2: x1, y2: y1, stroke: aspectContent[x.aspect].color, 'stroke-width': strong ? 1.4 : 0.4 + 0.7 * tight, 'stroke-opacity': strong ? 1 : 0.35 + 0.55 * tight, 'stroke-dasharray': x.aspect === 'sextile' || x.aspect === 'trine' ? null : null }));
        g.append(hit(ag, 'aspect', `${x.a}|${x.b}`, `${planets[x.a].name} ${aspectContent[x.aspect].verb} ${planets[x.b].name}, orb ${x.orb.toFixed(1)} degrees`));
      }
    }
    for (const it of items) {
      const p = planets[it.id];
      const b = frame.sky.bodies[it.id];
      const on = (s?.kind === 'body' && s.id === it.id) || hiBodies.has(it.id);
      const isHover = hv?.kind === 'body' && hv.id === it.id;
      const pg = svg('g');
      const [tx0, ty0] = P(it.lon, R.signIn);
      const [tx1, ty1] = P(it.lon, R.tick - 2);
      pg.append(svg('line', { x1: tx0, y1: ty0, x2: tx1, y2: ty1, stroke: p.color, 'stroke-width': 1.1 }));
      const [lx, ly] = P(it.d, R.planet + 4.5);
      pg.append(svg('line', { x1: tx1, y1: ty1, x2: lx, y2: ly, stroke: p.color, 'stroke-opacity': 0.45, 'stroke-width': 0.4 }));
      const [gx, gy] = P(it.d, R.planet);
      pg.append(svg('circle', { class: 'focus-ring', cx: gx, cy: gy, r: 5.6, fill: on ? 'rgba(255,230,160,.18)' : isHover ? 'rgba(255,255,255,.08)' : 'transparent', stroke: on ? '#ffe3a0' : 'none', 'stroke-width': 0.6 }));
      pg.append(svg('text', { class: 'wh', x: gx, y: gy, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': on ? 9.5 : 8.2, fill: p.color, 'font-family': 'Noto Sans Symbols, Noto Sans Symbols 2, serif' }, p.glyph));
      const [dx, dy] = P(it.d, R.planet - 9);
      pg.append(svg('text', { x: dx, y: dy, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 3.6, fill: '#cdbf9e', 'font-family': 'EB Garamond, serif' }, `${Math.floor(frame.points[it.id].degreeInSign)}°${b?.retrograde ? '℞' : ''}`));
      g.append(hit(pg, 'body', it.id, `${p.name}: ${formatDeg(it.lon)}${b?.retrograde ? ', retrograde' : ''}${noTime ? '' : `, house ${frame.points[it.id].house}`}`));
    }
    layer.replaceChildren(g);
  }

  function applyVisibility(s) {
    const on = toggleOn(s.toggles.wheel);
    box.classList.toggle('hidden', !on);
    box.classList.toggle('expanded', on && s.wheelExpanded);
    expandBtn.textContent = s.wheelExpanded ? '×' : '⤢';
    expandBtn.setAttribute('aria-label', s.wheelExpanded ? 'Shrink the wheel' : 'Enlarge the wheel');
    if (on && s.wheelExpanded && !scrim) {
      scrim = h('div.wheel-scrim', { onclick: () => store.patch({ wheelExpanded: false }) });
      document.body.append(scrim);
    } else if ((!on || !s.wheelExpanded) && scrim) { scrim.remove(); scrim = null; }
  }
  applyVisibility(store.get());
  store.subscribe(applyVisibility, ['toggles', 'wheelExpanded']);

  let lastKey = '';
  let lastDraw = 0;
  return {
    frame(state, frame) {
      if (!toggleOn(state.toggles.wheel)) return;
      const now = performance.now();
      const pts = frame.sky.order.map((id) => frame.points[id].longitude.toFixed(1)).join(',');
      const key = [pts, frame.angles.asc.toFixed(1), frame.houses.cusps.map((c) => c.toFixed(1)).join(','), state.bodies.join(','),
        JSON.stringify(state.toggles), state.selection?.kind, state.selection?.id, state.hover?.kind, state.hover?.id,
        JSON.stringify(state.highlight), state.wheelExpanded,
        state.transits && state.chart ? Math.floor(Date.now() / 60000) : 0, birthTimeUnknownShown(state)].join('|');
      if (key === lastKey) return;
      if (state.rate !== 0 && now - lastDraw < 50) return;
      lastKey = key; lastDraw = now;
      draw(state, frame);
      const ch = state.chart;
      const isBirth = ch && Math.abs(ch.utc.getTime() - frame.date.getTime()) < 60000;
      caption.textContent = isBirth
        ? `Birth chart${ch.input.name ? `: ${ch.input.name}` : ''}${ch.timeKnown ? '' : ' · time unknown, no houses'}${state.transits ? ' · outer ring: today' : ''}`
        :`${ui.toggles.wheel.label} · ${state.location.name} · ${frame.houses.system === 'placidus' ? 'Placidus' : 'Whole Sign'}`;
    },
  };
}
