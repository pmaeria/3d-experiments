// Sky-view compass: a heading strip plus buttons to face north, east, south or west.

import { h } from './dom.js';
import { COMPASS } from '../scene/skydome.js';

export function initCompass(ctx) {
  const { store, app } = ctx;
  const root = document.getElementById('compass');
  const inner = h('div.strip-inner');
  const PX_PER_DEG = 2.2;
  for (let rep = -1; rep <= 1; rep++) {
    for (const [name, az] of COMPASS) {
      inner.append(h(`span.cp${name.length === 1 ? '.major' : ''}`, { style: { left: `${(az + rep * 360) * PX_PER_DEG}px` } }, name));
    }
    for (let a = 15; a < 360; a += 15) {
      if (a % 45 === 0) continue;
      inner.append(h('span.cp', { style: { left: `${(a + rep * 360) * PX_PER_DEG}px`, opacity: 0.45 } }, '·'));
    }
  }
  const strip = h('div.strip', { 'aria-hidden': 'true' }, inner, h('div.needle'));
  const headingTxt = h('span.sr', { 'aria-live': 'polite' });
  const face = (az) => app.world.faceAzimuth(az);
  root.append(
    ...['N', 'E', 'S', 'W'].map((d, i) => h('button.ghost-btn', { type: 'button', title: `Face ${['north', 'east (where signs rise)', 'south', 'west (where they set)'][i]}`, onclick: () => face(i * 90) }, d)).slice(0, 2),
    strip,
    ...['S', 'W'].map((d) => h('button.ghost-btn', { type: 'button', title: `Face ${d === 'S' ? 'south' : 'west (where signs set)'}`, onclick: () => face(d === 'S' ? 180 : 270) }, d)),
    h('button.ghost-btn', { type: 'button', title: 'Look straight up', onclick: () => app.world.faceAzimuth(app.world.sky.yaw, 85) }, 'Up'),
    headingTxt,
  );
  let last = -1;
  return {
    frame(state) {
      const show = state.view === 'sky' && app.world.p.s > 0.6;
      if (root.hidden === show) root.hidden = !show;
      if (!show) return;
      const yaw = app.world.sky.yaw;
      if (Math.abs(yaw - last) < 0.05) return;
      last = yaw;
      inner.style.transform = `translateX(${130 - yaw * PX_PER_DEG}px)`;
    },
  };
}
