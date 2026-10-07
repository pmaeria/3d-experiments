// Zodiac: The Sky Behind Your Birth Chart. Entry point: fonts, store, sky cache, 3D world,
// UI, and the main loop. `window.zodiac` exposes the app hooks (see README "Scene and UI").

import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/400-italic.css';
import '@fontsource/eb-garamond/600.css';
import '@fontsource/im-fell-english-sc/400.css';
import '@fontsource/noto-sans-symbols/400.css';
import './style.css';

import { clampDate, DATE_RANGE, makeUtcDate, buildChart, encodeChartInput, decodeChartInput } from './astro/index.js';
import { createStore, initialState } from './state.js';
import { createSkyCache } from './skyframe.js';
import { World } from './scene/world.js';
import { applyScene } from './scene/applyScene.js';
import { evaluateCheck, createCheckTracker } from './scene/checks.js';
import { houseSystemToEngine } from './ids.js';
import { initUI } from './ui/index.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

async function waitForFonts() {
  if (!document.fonts?.load) return;
  const loads = [
    document.fonts.load('400 64px "Noto Sans Symbols"', '♈♉♊♋♌♍♎♏♐♑♒♓☽☿♀♂♃♄♅♆♇'),
    document.fonts.load('400 64px "Noto Sans Symbols 2"', '☉□△'),
    document.fonts.load('700 46px "Cinzel"', 'ARIES'),
    document.fonts.load('600 26px "Cinzel"', '10 20'),
    document.fonts.load('400 16px "EB Garamond"', 'Sky'),
  ];
  await Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, 2500))]);
}

async function start() {
  await waitForFonts();
  const store = createStore(initialState());
  const cache = createSkyCache();
  const canvas = document.getElementById('scene');
  const world = new World({ canvas, labelLayer: document.getElementById('labels'), store, reduced });
  const checks = createCheckTracker(store);

  const app = {
    store,
    world,
    reduced,
    /** The current shared sky frame (see skyframe.js). */
    getFrame: () => cache.get(store.get()),
    /** Apply a tour `scene` directive (see scene/applyScene.js). Returns {birthMissing, date}. */
    applyScene: (scene, opts) => applyScene(scene, { store, getFrame: () => cache.get(store.get()), ...opts }),
    /** Evaluate a tour `task.check` against the current state. */
    check: (check) => evaluateCheck(check, { state: store.get(), frame: cache.get(store.get()), clicks: checks }),
    checks,
    /**
     * Set the birth chart from a ChartInput ({name, year, month, day, hour, minute, timeKnown,
     * place: {name, lat, lon, tz}}). Builds it with the engine, moves date and place there,
     * and writes #c=<encoded> to the URL. Throws the engine's validation Error on bad input.
     */
    setChart(input, { jump = true, updateHash = true } = {}) {
      const st = store.get();
      const chart = buildChart(input, { houseSystem: houseSystemToEngine(st.houseSystem) });
      const patch = { chart, chartInput: input, birthMissing: false };
      if (jump) {
        patch.date = chart.utc;
        patch.rate = 0;
        patch.location = { name: input.place.name, lat: input.place.lat, lon: input.place.lon, tz: input.place.tz };
      }
      store.patch(patch);
      if (updateHash) history.replaceState(null, '', `#c=${encodeChartInput(input)}`);
      store.emit('chart', chart);
      return chart;
    },
    clearChart() {
      store.patch({ chart: null, chartInput: null });
      if (location.hash.startsWith('#c=')) history.replaceState(null, '', location.pathname + location.search);
      store.emit('chart', null);
    },
  };
  window.zodiac = app;

  // rebuild the chart if the house system changes
  store.subscribe((s) => {
    if (s.chartInput) {
      try { store.patch({ chart: buildChart(s.chartInput, { houseSystem: houseSystemToEngine(s.houseSystem) }) }); } catch { /* ignore */ }
    }
  }, ['houseSystem']);

  // #c= chart links (reserved for the birth form; decoded here so links work today)
  const fromHash = () => {
    if (!location.hash.startsWith('#c=')) return;
    try { app.setChart(decodeChartInput(location.hash.slice(3)), { updateHash: false }); } catch (e) { console.warn(e.message); }
  };
  fromHash();
  window.addEventListener('hashchange', fromHash);

  const ui = initUI(app);

  const safeArea = () => {
    const w = window.innerWidth, hgt = window.innerHeight;
    if (w < 820) return { left: 0, right: w, top: 56, bottom: hgt - 160 };
    const ctl = document.getElementById('controls').getBoundingClientRect();
    // the tour and Your chart use #modePanel, in the same slot as the info panel
    const st = store.get();
    const inMode = st.mode === 'tour' || st.mode === 'chart';
    const panel = document.getElementById(inMode ? 'modePanel' : 'panel');
    const pr = panel.getBoundingClientRect();
    const open = st.panelOpen && pr.width > 0;
    const dial = document.getElementById('timedial').getBoundingClientRect();
    return { left: ctl.right + 8, right: open ? pr.left - 8 : w, top: 90, bottom: dial.top - 8 };
  };
  const resize = () => {
    world.setSize(window.innerWidth, window.innerHeight);
    world.setSafeArea(safeArea());
  };
  window.addEventListener('resize', resize);
  store.subscribe(() => setTimeout(() => world.setSafeArea(safeArea()), 420), ['panelOpen', 'mode']);
  resize();

  world.loadSky().catch((e) => console.warn('Sky data failed to load:', e));
  world.onPick = (sel) => ui.select(sel, '3d');

  // ---- main loop
  const minT = makeUtcDate(DATE_RANGE.supported.minYear, 1, 1).getTime();
  const maxT = makeUtcDate(DATE_RANGE.supported.maxYear, 12, 31, 23, 59).getTime();
  let last = performance.now();
  let fpsAcc = 0, fpsN = 0, fpsT = 0;
  const loop = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const st = store.get();
    if (st.rate !== 0 && !ui.scrubbing) {
      let t = st.date.getTime() + st.rate * dt * 86400000;
      const patch = {};
      if (st.stopAt) {
        const s = st.stopAt.getTime();
        const before = st.date.getTime();
        if ((before - s) * (t - s) <= 0 && before !== s) {
          t = s; patch.rate = 0; patch.stopAt = null;
          store.emit('stopped', { at: new Date(s) });
        }
      }
      if (t <= minT || t >= maxT) { t = Math.min(maxT, Math.max(minT, t)); patch.rate = 0; }
      patch.date = clampDate(new Date(t));
      store.patch(patch);
    }
    const state = store.get();
    const frame = cache.get(state);
    world.update(state, frame, dt, now / 1000);
    ui.frame(state, frame, dt);
    fpsAcc += dt; fpsN++;
    if (now - fpsT > 1000) { world.stats.fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; fpsT = now; }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  document.body.classList.remove('loading');
}

start().catch((e) => {
  console.error(e);
  const l = document.getElementById('loader');
  if (l) l.textContent = `Something went wrong: ${e.message}`;
});
