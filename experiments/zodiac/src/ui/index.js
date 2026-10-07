// UI hub: builds every DOM component and owns the shared bits (selection, hover tooltip,
// glossary popover, toasts, keyboard).

import { ui, planets, signs, houses, earth as earthContent, resolveTerm, signOrder, ordinal } from '../content/index.js';
import { h, richText, formatDeg } from './dom.js';
import { initTopbar } from './topbar.js';
import { initControls } from './controls.js';
import { initPanel } from './panel.js';
import { initWheel } from './wheel.js';
import { initTimeDial } from './timedial.js';
import { initCompass } from './compass.js';
import { initTour } from './tour.js';
import { initChartMode } from './chartmode.js';
import { showWelcome, welcomeChoice } from './welcome.js';

export function initUI(app) {
  const { store } = app;
  const pointer = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });

  // ---------------------------------------------------------------- toasts
  const toastBox = document.getElementById('toasts');
  function toast(text, ms = 3200) {
    const t = h('div.toast', {}, text);
    toastBox.append(t);
    setTimeout(() => t.remove(), ms);
  }

  // ---------------------------------------------------------------- glossary popover
  const pop = document.getElementById('popover');
  pop.classList.add('panel');
  let popAnchor = null;
  function closePopover() {
    pop.hidden = true;
    if (popAnchor) popAnchor.setAttribute('aria-expanded', 'false');
    popAnchor = null;
  }
  function openTerm(key, anchor) {
    const t = resolveTerm(key);
    if (!t) return;
    if (popAnchor === anchor && !pop.hidden) { closePopover(); return; }
    pop.replaceChildren(
      h('div', { class: `kind ${t.kind}` }, ui.voices[t.kind]?.label ?? ''),
      h('h3', {}, t.term),
      richText(t.short, openTerm),
      h('div.disclose', {},
        h('button.link-btn', { type: 'button', onclick: () => { closePopover(); ctx.select({ kind: 'term', id: key }, 'popover'); } }, ui.tour.tellMeMore),
        h('button.link-btn', { type: 'button', onclick: closePopover }, 'Close')),
    );
    pop.hidden = false;
    pop.setAttribute('aria-label', t.term);
    const r = anchor.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x = Math.min(window.innerWidth - pw - 10, Math.max(10, r.left + r.width / 2 - pw / 2));
    let y = r.bottom + 8;
    if (y + ph > window.innerHeight - 10) y = r.top - ph - 8;
    pop.style.left = `${x}px`; pop.style.top = `${y}px`;
    popAnchor = anchor;
    anchor.setAttribute('aria-expanded', 'true');
    pop.querySelector('button')?.focus({ preventScroll: true });
  }
  document.addEventListener('pointerdown', (e) => {
    if (!pop.hidden && !pop.contains(e.target) && e.target !== popAnchor) closePopover();
  });

  // ---------------------------------------------------------------- selection
  function select(sel, source = 'ui') {
    if (!sel) { store.patch({ selection: null }); return; }
    store.patch({ selection: sel, panelOpen: true });
    if (sel.kind !== 'term' && sel.kind !== 'explainer') store.emit('click', { ...sel, source });
  }

  // ---------------------------------------------------------------- tooltip
  const tip = document.getElementById('tooltip');
  function tooltipContent(hv, frame) {
    if (hv.kind === 'body') {
      if (hv.id === 'earth') return [h('span.g', { style: { '--c': earthContent.color } }, earthContent.glyph), ` Earth · you are here`, h('span.t2', {}, 'Every sign position is a direction measured from here.')];
      const p = planets[hv.id];
      const pt = frame.points[hv.id];
      if (!p || !pt) return null;
      const b = frame.sky.bodies[hv.id];
      const parts = [formatDeg(pt.longitude)];
      if (b) parts.push(`in front of ${b.constellation.name}`);
      if (b?.retrograde) parts.push('retrograde');
      const t = h('span', {}, h('span.g', { style: { color: p.color } }, p.glyph), ` ${p.name} · ${parts.join(' · ')}`);
      return [t, h('span.t2', {}, `${ordinal(pt.house)} house · click for its card`)];
    }
    if (hv.kind === 'sign') {
      const s = signs[hv.id];
      const occupants = frame.sky.order.filter((id) => signOrder[frame.sky.bodies[id].signIndex] === hv.id).map((id) => planets[id].glyph).join(' ');
      return [h('span', {}, h('span.g', { style: { color: '#e9c46f' } }, s.glyph), ` ${s.name} · ${s.startDeg}°–${s.startDeg + 30}° · ${s.element}, ${s.modality}`),
        h('span.t2', {}, `${occupants ? `Here now: ${occupants} · ` : ''}Sun here ${s.dates}`)];
    }
    if (hv.kind === 'house') {
      const hs = houses[hv.id];
      return [h('span', {}, hs.name), h('span.t2', {}, hs.sky)];
    }
    return null;
  }
  let tipKey = '';
  function updateTooltip(state, frame) {
    const hv = state.hover;
    if (!hv) { if (!tip.hidden) tip.hidden = true; tipKey = ''; return; }
    const key = `${hv.kind}|${hv.id}|${Math.floor(frame.date.getTime() / 60000)}`;
    if (key !== tipKey) {
      const c = tooltipContent(hv, frame);
      if (!c) { tip.hidden = true; return; }
      tip.replaceChildren(...c);
      tipKey = key;
    }
    tip.hidden = false;
    const w = tip.offsetWidth, ht = tip.offsetHeight;
    let x = pointer.x + 16, y = pointer.y + 18;
    if (x + w > window.innerWidth - 8) x = pointer.x - w - 12;
    if (y + ht > window.innerHeight - 8) y = pointer.y - ht - 12;
    tip.style.left = `${x}px`; tip.style.top = `${y}px`;
  }

  // ---------------------------------------------------------------- modal
  const modal = document.getElementById('modal');
  function openModal(content, { onClose } = {}) {
    const card = h('div.modal-card.panel', { role: 'dialog', 'aria-modal': 'true' }, content);
    modal.replaceChildren(card);
    modal.hidden = false;
    const close = () => { modal.hidden = true; modal.replaceChildren(); onClose?.(); };
    modal.onclick = (e) => { if (e.target === modal) close(); };
    card.querySelector('input, select, button')?.focus();
    return close;
  }

  const ctx = {
    app, store, toast, openTerm, closePopover, select, openModal, pointer,
    scrubbing: false,
  };

  const topbar = initTopbar(ctx);
  const controls = initControls(ctx);
  const panel = initPanel(ctx);
  const wheel = initWheel(ctx);
  const dial = initTimeDial(ctx);
  const compass = initCompass(ctx);
  const tour = initTour(ctx);
  const chartMode = initChartMode(ctx);
  ctx.tour = tour;
  app.tour = tour;          // window.zodiac.tour: enter(), leave(), goTo(i), index
  app.charts = chartMode;   // window.zodiac.charts: enter(), leave(), openForm(), copyLink()

  // ---------------------------------------------------------------- modes (tour, Your chart)
  // Only one mode at a time; each owns #modePanel while active. Cards opened during a mode
  // slide over it, with a "Back to ..." button to return.
  ctx.modes = {
    current: () => store.get().mode,
    get tourResumable() { return tour.resumable; },
    toggleTour() { if (store.get().mode === 'tour') tour.leave(); else tour.enter(); },
    enterTour: (opts) => tour.enter(opts),
    leaveTour: () => tour.leave(),
    toggleChart() {
      if (store.get().mode === 'chart') chartMode.leave();
      else if (!store.get().chart && !chartMode.hasCharts) chartMode.openForm({ then: 'chart' });
      else chartMode.enter();
    },
    enterChart: () => chartMode.enter(),
    leaveChart: (opts) => chartMode.leave(opts),
    openBirthForm: (opts) => chartMode.openForm(opts),
    copyLink: () => chartMode.copyLink(),
  };

  const backBtn = document.getElementById('backToMode');
  backBtn.addEventListener('click', () => store.patch({ selection: null }));
  const setModeClasses = (s) => {
    const inMode = s.mode === 'tour' || s.mode === 'chart';
    document.body.classList.toggle('mode-tour', s.mode === 'tour');
    document.body.classList.toggle('mode-chart', s.mode === 'chart');
    document.body.classList.toggle('has-sel', !!s.selection);
    document.body.classList.toggle('panel-closed', !s.panelOpen);
    backBtn.hidden = !(inMode && s.selection && s.panelOpen);
    backBtn.textContent = s.mode === 'tour' ? '◂ Back to the tour' : '◂ Back to your chart';
  };
  setModeClasses(store.get());
  store.subscribe(setModeClasses, ['mode', 'selection', 'panelOpen']);

  // ---------------------------------------------------------------- keyboard
  window.addEventListener('keydown', (e) => {
    const tag = e.target?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
    const st = store.get();
    if (e.key === ' ' && !(tag === 'BUTTON' && e.target.closest('#timedial, #views'))) {
      e.preventDefault();
      dial.togglePlay();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      if (e.target?.classList?.contains('track')) return;
      e.preventDefault();
      dial.step(e.key === 'ArrowRight' ? 1 : -1, e.shiftKey ? 10 : 1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (tag === 'BUTTON' && e.target.closest('.wheel-hit')) return;
      e.preventDefault();
      dial.shiftUnit(e.key === 'ArrowUp' ? 1 : -1);
    } else if (e.key === '1' || e.key === '2' || e.key === '3') {
      store.patch({ view: ['helio', 'geo', 'sky'][Number(e.key) - 1] });
    } else if (e.key === '?') {
      ctx.select({ kind: 'explainer', id: st.view }, 'key');
    } else if (e.key === 'Escape') {
      if (!pop.hidden) closePopover();
      else if (!modal.hidden) { modal.hidden = true; modal.replaceChildren(); }
      else if (st.wheelExpanded) store.patch({ wheelExpanded: false });
      else store.patch({ selection: null });
    } else if (e.key === 'n' || e.key === 'N') {
      dial.now();
    }
  });

  // body classes for view-dependent CSS
  const setBodyView = (s) => {
    document.body.classList.toggle('view-helio', s.view === 'helio');
    document.body.classList.toggle('view-geo', s.view === 'geo');
    document.body.classList.toggle('view-sky', s.view === 'sky');
  };
  setBodyView(store.get());
  store.subscribe(setBodyView, ['view']);

  // ---------------------------------------------------------------- landing
  // A #c= share link opens Your chart (offering to save it). Otherwise a tour left open
  // resumes; first-time visitors get the welcome choice.
  if (location.hash.startsWith('#c=') && store.get().chart) chartMode.fromLink();
  else {
    chartMode.restoreQuietly();
    if (tour.wasActive) tour.enter();
    else if (!welcomeChoice()) showWelcome(ctx, { onTour: () => tour.enter(), onExplore: () => {} });
  }
  window.addEventListener('hashchange', () => {
    if (location.hash.startsWith('#c=') && store.get().chart) chartMode.fromLink();
  });

  return {
    select,
    get scrubbing() { return ctx.scrubbing; },
    frame(state, frame, dt) {
      tour.frame(state, frame);
      chartMode.frame(state, frame);
      dial.frame(state, frame, dt);
      panel.frame(state, frame, dt);
      wheel.frame(state, frame, dt);
      compass.frame(state, frame, dt);
      controls.frame?.(state, frame, dt);
      topbar.frame?.(state, frame, dt);
      updateTooltip(state, frame);
    },
  };
}
