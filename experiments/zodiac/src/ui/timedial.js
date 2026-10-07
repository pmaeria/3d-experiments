// The time dial: date in the place's zone and UTC, play/pause/direction, rate chips, a jog
// track to scrub, an era slider across the supported range, a date picker, Now, and the
// "Jump to" menu built on the engine's event finders.

import { ui, planets } from '../content/index.js';
import {
  DATE_RANGE, makeUtcDate, clampDate, localToUtc, formatYear, BODY_IDS, ASPECTS,
} from '../astro/index.js';
import { h, formatFields, utcFields, localFields, offsetLabel } from './dom.js';
import { resolveEvent } from '../scene/events.js';
import { openLocationMenu } from './location.js';

export const UNITS = [
  { id: 'hour', label: '1 h/s', days: 1 / 24, name: 'hour' },
  { id: 'day', label: '1 d/s', days: 1, name: 'day' },
  { id: 'week', label: '1 w/s', days: 7, name: 'week' },
  { id: 'month', label: '1 mo/s', days: 30.436875, name: 'month' },
  { id: 'year', label: '1 y/s', days: 365.2425, name: 'year' },
  { id: 'century', label: '1 century/s', days: 36524.25, name: 'century' },
];

function describeRate(rate) {
  if (rate === 0) return ui.controls.rate.pause;
  const a = Math.abs(rate);
  const dir = rate < 0 ? ' backwards' : '';
  let txt;
  if (a < 1 / 24 * 0.999) txt = `${(a * 1440).toFixed(a * 1440 < 10 ? 1 : 0)} min`;
  else if (a < 1) txt = `${(a * 24).toFixed(a * 24 < 10 ? 1 : 0)} h`;
  else if (a < 30) txt = `${+a.toFixed(1)} day${a === 1 ? '' : 's'}`;
  else if (a < 365) txt = `${+(a / 30.436875).toFixed(1)} months`;
  else if (a < 36000) txt = `${+(a / 365.2425).toFixed(1)} years`;
  else txt = `${+(a / 36524.25).toFixed(1)} centuries`;
  return `${txt} ${ui.controls.rate.perSecond}${dir}`;
}

export function initTimeDial(ctx) {
  const { store } = ctx;
  const root = document.getElementById('timedial');
  let unit = 1;
  let dir = 1;

  // ---- left: date and place
  const dateEl = h('div.td-date', { 'aria-live': 'off' });
  const utcEl = h('span');
  const setBtn = h('button.link-btn', { type: 'button', title: 'Type a date and time', onclick: () => openDatePicker() }, 'Set…');
  const nowBtn = h('button.ghost-btn', { type: 'button', title: `${ui.controls.date.now.help} (N)`, onclick: () => now() }, ui.controls.date.now.label);
  const placeBtn = h('button.ghost-btn', { type: 'button', title: ui.controls.location.help, 'aria-haspopup': 'dialog' });
  placeBtn.addEventListener('click', () => openLocationMenu(ctx, placeBtn));
  root.append(h('div.td-left', {},
    dateEl,
    h('div.td-sub', {}, utcEl, setBtn),
    h('div.td-place', {}, h('span.g', { 'aria-hidden': 'true', style: { color: '#ffd27a' } }, '⌖'), placeBtn, nowBtn)));

  // ---- middle: rates, jog track, era
  const backBtn = h('button.ghost-btn', { type: 'button', title: ui.controls.rate.reverse, 'aria-pressed': 'false', onclick: () => { dir = -dir; applyRate(true); } }, '◀ back');
  const playBtn = h('button.ghost-btn.play', { type: 'button', title: `${ui.controls.rate.play} / ${ui.controls.rate.pause} (space)`, onclick: () => togglePlay() }, '▶');
  const unitBtns = UNITS.map((u, i) => h('button.ghost-btn', {
    type: 'button', 'aria-pressed': 'false', title: `${u.name} of sky time per real second`,
    onclick: () => { unit = i; applyRate(true); },
  }, u.label));
  const rateText = h('span.note', { style: { margin: '0 0 0 6px', fontStyle: 'italic' } });
  const track = h('div.track', { tabindex: '0', role: 'slider', 'aria-label': 'Scrub time: drag, or use arrow keys', 'aria-valuetext': '' },
    h('div.center'), h('div.hint', {}, h('span', {}, '◀ earlier'), h('span.trk-unit', {}, ''), h('span', {}, 'later ▶')));
  const eraIn = h('input', { type: 'range', name: 'year', min: String(DATE_RANGE.supported.minYear), max: String(DATE_RANGE.supported.maxYear), step: '1', 'aria-label': 'Year' });
  const eraTicks = h('div.ticks', {}, ...[-3000, -2000, -1000, 1, 1000, 2000, 3000, 4000, 5000, 6000].map((y) => h('span', {}, y === 1 ? '1 CE' : formatYear(y).replace(' CE', ''))));
  root.append(h('div.td-mid', {},
    h('div.td-rates', {}, backBtn, playBtn, ...unitBtns, rateText),
    track,
    h('div.era', {}, eraIn, eraTicks)));

  // ---- right: jump + accuracy note
  const jumpBtn = h('button.brass-btn', { type: 'button', 'aria-haspopup': 'menu', onclick: () => openJumpMenu(jumpBtn) }, `${ui.events.jumpTo}…`);
  const support = h('div.support-note.hidden');
  root.append(h('div.td-right', {}, jumpBtn, support));

  // ---------------------------------------------------------------- behaviour
  function applyRate(play) {
    const r = dir * UNITS[unit].days;
    if (play || store.get().rate !== 0) store.patch({ rate: r, lastRate: r, stopAt: null });
    else store.patch({ lastRate: r });
  }
  function togglePlay() {
    const st = store.get();
    if (st.rate !== 0) store.patch({ rate: 0, lastRate: st.rate });
    else store.patch({ rate: st.lastRate || dir * UNITS[unit].days });
  }
  function setDate(d) {
    store.patch({ date: clampDate(d) });
  }
  function step(sign, mult = 1) {
    const st = store.get();
    setDate(new Date(st.date.getTime() + sign * mult * UNITS[unit].days * 86400000));
  }
  function shiftUnit(delta) {
    unit = Math.max(0, Math.min(UNITS.length - 1, unit + delta));
    applyRate(false);
    renderControls(store.get());
    ctx.toast(`Step and speed: one ${UNITS[unit].name}`, 1200);
  }
  function now() { setDate(new Date()); }

  // jog track: 14 px per unit
  let drag = null;
  track.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, t: store.get().date.getTime(), wasRate: store.get().rate };
    ctx.scrubbing = true;
    track.setPointerCapture(e.pointerId);
  });
  track.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const accel = 1 + Math.abs(dx) / 400;
    setDate(new Date(drag.t + (dx / 14) * accel * UNITS[unit].days * 86400000));
  });
  const endDrag = () => { if (drag) { drag = null; ctx.scrubbing = false; } };
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); step(e.key === 'ArrowRight' ? 1 : -1, e.shiftKey ? 10 : 1); }
  });
  eraIn.addEventListener('input', () => {
    const d = store.get().date;
    const f = utcFields(d);
    setDate(makeUtcDate(Number(eraIn.value), f.month, Math.min(f.day, 28), f.hour, f.minute));
  });
  eraIn.addEventListener('pointerdown', () => { ctx.scrubbing = true; });
  eraIn.addEventListener('pointerup', () => { ctx.scrubbing = false; });

  // ---------------------------------------------------------------- date picker
  function openDatePicker() {
    const st = store.get();
    const loc = st.location;
    const lf = localFields(st.date, loc);
    const year = h('input', { type: 'number', value: String(lf.year > 0 ? lf.year : 1 - lf.year), min: '1', max: '6000', style: { width: '6em' } });
    const era = h('select', {}, h('option', { value: 'CE' }, 'CE'), h('option', { value: 'BCE' }, 'BCE'));
    era.value = lf.year > 0 ? 'CE' : 'BCE';
    const month = h('input', { type: 'number', min: '1', max: '12', value: String(lf.month), style: { width: '4em' } });
    const day = h('input', { type: 'number', min: '1', max: '31', value: String(lf.day), style: { width: '4em' } });
    const hour = h('input', { type: 'number', min: '0', max: '23', value: String(lf.hour), style: { width: '4em' } });
    const minute = h('input', { type: 'number', min: '0', max: '59', value: String(lf.minute), style: { width: '4em' } });
    const zone = h('select', {}, h('option', { value: 'local' }, `Local time at ${loc.name}`), h('option', { value: 'utc' }, 'UTC'));
    const err = h('p.note', { style: { color: '#ffb08a' } });
    let close = null;
    const apply = () => {
      const y = era.value === 'BCE' ? 1 - Number(year.value) : Number(year.value);
      const fields = { year: y, month: Number(month.value), day: Number(day.value), hour: Number(hour.value), minute: Number(minute.value), second: 0 };
      if (Object.values(fields).some((v) => !Number.isFinite(v))) { err.textContent = 'Please fill in every field.'; return; }
      if (y < DATE_RANGE.supported.minYear || y > DATE_RANGE.supported.maxYear) { err.textContent = `Years from ${formatYear(DATE_RANGE.supported.minYear)} to ${formatYear(DATE_RANGE.supported.maxYear)} only.`; return; }
      let d;
      if (zone.value === 'utc') d = makeUtcDate(fields.year, fields.month, fields.day, fields.hour, fields.minute);
      else {
        const r = localToUtc(fields, loc.tz || 'LMT', { lon: loc.lon });
        d = r.date;
        if (r.status !== 'ok') ctx.toast(r.status === 'skipped' ? 'That clock time was skipped by a daylight-saving change; moved forward.' : 'That clock time happened twice (clocks went back); using the first.');
      }
      store.patch({ date: clampDate(d), rate: 0 });
      close?.();
    };
    close = ctx.openModal([
      h('h2', {}, ui.controls.date.label),
      h('p.note', {}, 'Gregorian calendar, extended back before 1582. Year 1 BCE is followed by 1 CE.'),
      h('div.row', {}, h('label', {}, 'Day', day), h('label', {}, 'Month', month), h('label', {}, 'Year', year), h('label', {}, 'Era', era)),
      h('div.row', {}, h('label', {}, 'Hour', hour), h('label', {}, 'Minute', minute), h('label', {}, 'Clock', zone)),
      err,
      h('div.row', {}, h('button.brass-btn', { type: 'button', onclick: apply }, 'Go'), h('button.ghost-btn', { type: 'button', onclick: () => close() }, 'Cancel')),
    ]);
  }

  // ---------------------------------------------------------------- jump menu
  let menu = null;
  function closeMenu() { menu?.remove(); menu = null; document.removeEventListener('pointerdown', outside, true); }
  function outside(e) { if (menu && !menu.contains(e.target) && e.target !== jumpBtn) closeMenu(); }
  function jump(spec, { landNote = null } = {}) {
    const st = store.get();
    let r;
    try { r = resolveEvent(spec, st.date); } catch (e) { r = null; console.warn(e); }
    if (!r) { ctx.toast('No such event within the search range.'); return; }
    const keepRate = typeof spec === 'object' && spec.keepRate;
    store.patch({ date: clampDate(r.date), rate: keepRate ? st.rate : (r.station ? 1 : 0), stopAt: null });
    const lf = localFields(r.date, st.location);
    ctx.toast(`${r.label}${r.station ? ' (playing up to the station)' : ''}: ${formatFields(r.station ? localFields(r.station, st.location) : lf)}${landNote ?? ''}`, 4200);
    closeMenu();
  }
  function openJumpMenu(anchor) {
    if (menu) { closeMenu(); return; }
    const sel = store.get().selection;
    const selBody = sel?.kind === 'body' && BODY_IDS.includes(sel.id) ? sel.id : null;
    const item = (label, spec, help = '') => h('button.mi', { type: 'button', role: 'menuitem', title: help, onclick: () => jump(spec) }, h('span', {}, label), help ? h('small', {}, '') : null);
    const pair = (label, next, prev) => h('div.mrow', {},
      h('span', { style: { flex: '1' } }, label),
      h('button.ghost-btn', { type: 'button', title: `Previous ${label.toLowerCase()}`, onclick: () => jump(prev) }, '◀ prev'),
      h('button.ghost-btn', { type: 'button', title: `Next ${label.toLowerCase()}`, onclick: () => jump(next) }, 'next ▶'));
    const bodyOpts = () => BODY_IDS.map((id) => h('option', { value: id }, planets[id].name));
    const aSel = h('select', { 'aria-label': 'First body' }, ...bodyOpts());
    const bSel = h('select', { 'aria-label': 'Second body' }, ...bodyOpts());
    aSel.value = selBody ?? 'jupiter'; bSel.value = selBody === 'saturn' ? 'jupiter' : 'saturn';
    const asSel = h('select', { 'aria-label': 'Aspect' }, ...ASPECTS.map((a) => h('option', { value: a.id }, a.name)));
    const ingressBody = h('select', { 'aria-label': 'Body' }, ...bodyOpts());
    ingressBody.value = selBody ?? 'sun';
    menu = h('div.menu.panel', { role: 'menu', 'aria-label': ui.events.jumpTo },
      h('div.mh', {}, 'Moon'),
      pair('New moon', 'nextNewMoon', 'prevNewMoon'),
      pair('Full moon', 'nextFullMoon', 'prevFullMoon'),
      h('div.mh', {}, 'Seasons'),
      pair('Equinox or solstice', 'nextSeason', 'prevSeason'),
      item(`${ui.events.marchEquinox.label} (this year)`, 'marchEquinox', ui.events.marchEquinox.help),
      h('div.mh', {}, 'Retrograde (lands a few weeks before the turn, playing)'),
      pair('Mercury retrograde', 'nextMercuryRetrograde', 'prevMercuryRetrograde'),
      pair('Mars retrograde', 'nextMarsRetrograde', 'prevMarsRetrograde'),
      h('hr'),
      h('div.mh', {}, 'Next sign change'),
      h('div.mrow', {}, ingressBody,
        h('button.ghost-btn', { type: 'button', onclick: () => jump({ event: 'prevIngress', body: ingressBody.value }) }, '◀ prev'),
        h('button.ghost-btn', { type: 'button', onclick: () => jump({ event: 'nextIngress', body: ingressBody.value }) }, 'next ▶')),
      h('div.mh', {}, 'Next exact aspect'),
      h('div.mrow', {}, aSel, asSel, bSel),
      h('div.mrow', {},
        h('button.ghost-btn', { type: 'button', onclick: () => jump({ event: 'prevAspect', a: aSel.value, b: bSel.value, aspect: asSel.value }) }, '◀ prev'),
        h('button.ghost-btn', { type: 'button', onclick: () => jump({ event: 'nextAspect', a: aSel.value, b: bSel.value, aspect: asSel.value }) }, 'next ▶')),
      h('hr'),
      item(ui.events.greatConjunction2020.label, 'greatConjunction2020', ui.events.greatConjunction2020.help),
    );
    document.body.append(menu);
    const r = anchor.getBoundingClientRect();
    const mh = menu.offsetHeight, mw = menu.offsetWidth;
    menu.style.left = `${Math.max(8, Math.min(window.innerWidth - mw - 8, r.right - mw))}px`;
    menu.style.top = `${Math.max(8, r.top - mh - 8)}px`;
    menu.querySelector('button')?.focus();
    menu.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeMenu(); anchor.focus(); } });
    setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
  }

  // ---------------------------------------------------------------- render
  function renderControls(st) {
    const playing = st.rate !== 0;
    playBtn.textContent = playing ? '❚❚' : '▶';
    playBtn.setAttribute('aria-label', playing ? ui.controls.rate.pause : ui.controls.rate.play);
    const r = playing ? st.rate : st.lastRate;
    if (r) dir = r < 0 ? -1 : 1;
    backBtn.setAttribute('aria-pressed', String(dir < 0));
    // nearest unit chip to the active rate
    if (playing) {
      const a = Math.abs(st.rate);
      const exact = UNITS.findIndex((u) => Math.abs(u.days - a) / u.days < 0.01);
      if (exact >= 0) unit = exact;
    }
    unitBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === unit && playing && Math.abs(Math.abs(st.rate) - UNITS[i].days) / UNITS[i].days < 0.01)));
    rateText.textContent = describeRate(st.rate);
    track.querySelector('.trk-unit').textContent = `drag: 1 ${UNITS[unit].name} per notch · ← → step`;
    placeBtn.textContent = st.location.name;
  }
  renderControls(store.get());
  store.subscribe(renderControls, ['rate', 'lastRate', 'location']);

  let lastKey = '';
  let lastSupport = '';
  return {
    togglePlay, step, shiftUnit, now,
    frame(st, frame) {
      const key = `${Math.floor(st.date.getTime() / 60000)}|${st.location.name}`;
      if (key !== lastKey) {
        lastKey = key;
        const lf = localFields(st.date, st.location);
        dateEl.textContent = formatFields(lf);
        const off = offsetLabel(st.date, st.location);
        utcEl.textContent = `${st.location.tz ? '' : 'local mean time · '}${off} · UTC ${formatFields(utcFields(st.date))} `;
        if (!ctx.scrubbing || document.activeElement !== eraIn) eraIn.value = String(st.date.getUTCFullYear());
        track.setAttribute('aria-valuetext', formatFields(lf));
      }
      const sup = frame.sky.support;
      const sk = sup.level === 'accurate' ? '' : `${sup.level}|${sup.notes.join(' ')}`;
      if (sk !== lastSupport) {
        lastSupport = sk;
        support.classList.toggle('hidden', !sk);
        support.textContent = sk ? `Accuracy: ${sup.level}. ${sup.notes.join(' ')}` : '';
        support.title = support.textContent;
      }
    },
  };
}
