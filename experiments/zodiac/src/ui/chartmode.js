// "Your chart" mode: the birth moment and place locked in (with "Return to now"), the wheel
// enlarged, the big three, every placement (sign, degree, house, retrograde) and aspect as
// buttons that open the matching card, element and mode balance, a "today's sky" outer ring,
// saved charts (add, rename, delete, switch) and the share link. Renders into #modePanel.
// Birth data stays in this browser: localStorage, and the #c= hash only when shared.

import {
  ui, planets, signs, signOrder, elements, modalities, aspects as aspectContent, ordinal, houseSystems,
} from '../content/index.js';
import { encodeChartInput, formatYear } from '../astro/index.js';
import { loadSavedLocation, DEFAULT_LOCATION } from '../state.js';
import { toContentId } from '../ids.js';
import { h, formatDeg, glyphText } from './dom.js';
import { openBirthForm } from './birthform.js';
import {
  browserStorage, loadCharts, saveCharts, getActiveChartId, setActiveChartId, upsertChart,
  renameChart, removeChart, findChartByMoment,
} from './persist.js';

const PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');
const MODE_COLORS = { cardinal: '#e9c46f', fixed: '#9db7e8', mutable: '#b48cff' };

/** The birth moment as typed: "15 Jun 1990, 14:30" or "15 Jun 1990, time unknown". */
export function birthWhen(input) {
  const y = input.year >= 1000 && input.year <= 9999 ? String(input.year) : formatYear(input.year);
  return `${input.day} ${MONTHS[input.month - 1]} ${y}, ${input.timeKnown ? `${pad(input.hour)}:${pad(input.minute)}` : 'time unknown'}`;
}

export function chartScene(chart) {
  return {
    view: 'geo', date: 'birth', rate: 0, location: 'birth',
    bodies: chart.timeKnown ? [...PLANETS, 'ascendant', 'midheaven'] : [...PLANETS],
    show: { ring: true, signLabels: true, sightLines: 'all', wheel: true, houses: chart.timeKnown, aspects: true },
  };
}

export function initChartMode(ctx) {
  const { app, store } = ctx;
  const storage = browserStorage();
  const root = document.getElementById('modePanel');
  let list = loadCharts(storage);
  let activeId = getActiveChartId(storage);
  let offerSave = false;      // the chart came from a link and is not saved yet
  let renaming = null;        // chart id being renamed
  let confirmDelete = null;   // chart id awaiting delete confirmation
  let drift = null;
  let driftBar = null;

  const active = () => store.get().mode === 'chart';
  const persist = () => { saveCharts(storage, list); setActiveChartId(storage, activeId); };
  const activeEntry = () => list.find((c) => c.id === activeId) ?? null;

  function setHash() {
    const input = store.get().chartInput;
    if (!input) return;
    try { history.replaceState(null, '', `#c=${encodeChartInput(input)}`); } catch { /* ignore */ }
  }
  function clearHash() {
    if (location.hash.startsWith('#c=')) history.replaceState(null, '', location.pathname + location.search);
  }
  function shareUrl() {
    const input = store.get().chartInput;
    return input ? `${location.origin}${location.pathname}${location.search}#c=${encodeChartInput(input)}` : null;
  }

  // ---------------------------------------------------------------- mode enter / leave
  function showBirthMoment() {
    const chart = store.get().chart;
    if (!chart) return;
    app.applyScene(chartScene(chart));
  }

  function enter() {
    let st = store.get();
    if (!st.chart) {
      const saved = activeEntry() ?? list[0];
      if (!saved) { openForm({ then: 'chart' }); return; }
      activeId = saved.id; persist();
      app.setChart(saved.input, { updateHash: false });
      st = store.get();
    }
    if (st.mode === 'tour') ctx.tour.leave();
    store.patch({ mode: 'chart', panelOpen: true, selection: null });
    store.emit('mode', { mode: 'chart' });
    showBirthMoment();
    store.patch({ wheelExpanded: true });
    setHash();
    render();
  }

  function leave({ toNow = true, silent = false } = {}) {
    if (store.get().mode !== 'chart') return;
    const patch = { mode: 'explore', wheelExpanded: false, transits: false, selection: null, highlight: { signs: [], bodies: [], aspect: null } };
    if (toNow) Object.assign(patch, { date: new Date(), rate: 0, location: loadSavedLocation() ?? { ...DEFAULT_LOCATION }, birthMissing: false });
    store.patch(patch);
    store.emit('mode', { mode: 'explore' });
    clearHash();
    offerSave = false;
    root.replaceChildren();
    if (toNow && !silent) ctx.toast('Back to the sky right now.', 2000);
  }

  // ---------------------------------------------------------------- form + saved charts
  /** then: 'chart' (open Your chart), 'tour' (stay in the tour and re-apply its step), or auto. */
  function openForm({ edit = false, then = 'auto' } = {}) {
    const entry = edit ? activeEntry() : null;
    const initial = edit ? (entry?.input ?? store.get().chartInput) : null;
    openBirthForm(ctx, {
      initial,
      title: edit ? 'Edit birth details' : ui.birthForm.title,
      onSubmit: (input) => submit(input, { editId: entry?.id ?? null, then }),
    });
  }

  function submit(input, { editId = null, then = 'auto' } = {}) {
    const inTour = store.get().mode === 'tour';
    const target = then === 'auto' ? (inTour ? 'tour' : 'chart') : then;
    app.setChart(input, { jump: target === 'chart', updateHash: false }); // throws on bad input
    const res = upsertChart(list, input, editId);
    list = res.list;
    activeId = res.entry.id;
    offerSave = false;
    persist();
    if (target === 'tour' && inTour) {
      ctx.tour.reapply();
      ctx.toast(`Birth sky set${input.name ? ` for ${input.name}` : ''}. Saved in this browser only.`, 3200);
    } else {
      enter();
      ctx.toast('Saved in this browser only. Use Copy link to share.', 3200);
    }
  }

  function switchTo(id) {
    const entry = list.find((c) => c.id === id);
    if (!entry) return;
    activeId = id; persist();
    app.setChart(entry.input, { updateHash: false });
    offerSave = false;
    if (active()) { showBirthMoment(); store.patch({ wheelExpanded: true }); setHash(); }
    render();
  }

  function rename(id, name) {
    list = renameChart(list, id, name);
    persist();
    renaming = null;
    const entry = list.find((c) => c.id === id);
    if (id === activeId && entry) {
      app.setChart(entry.input, { jump: false, updateHash: false });
      if (active()) setHash();
    }
    render();
  }

  function remove(id) {
    list = removeChart(list, id);
    confirmDelete = null;
    if (id === activeId) {
      activeId = list[0]?.id ?? null;
      persist();
      if (activeId) switchTo(activeId);
      else { app.clearChart(); leave({ toNow: true, silent: true }); ctx.toast('Chart deleted from this browser.'); return; }
    } else persist();
    render();
  }

  function saveOffered() {
    const input = store.get().chartInput;
    if (!input) return;
    const res = upsertChart(list, input);
    list = res.list; activeId = res.entry.id; offerSave = false; persist();
    ctx.toast(`Saved${input.name ? ` "${input.name}"` : ''} to your charts in this browser.`);
    render();
  }

  async function copyLink() {
    const url = shareUrl();
    if (!url) { ctx.toast('Enter birth details first.'); return; }
    try {
      await navigator.clipboard.writeText(url);
      ctx.toast(`${ui.birthForm.copied}. ${ui.birthForm.shareNote.split('. ').slice(-1)[0]}`, 4200);
    } catch {
      const inp = h('input', { type: 'text', readonly: true, value: url, style: { width: '100%' } });
      ctx.openModal([h('h2', {}, ui.birthForm.share), h('p.note', {}, ui.birthForm.shareNote), inp]);
      inp.select();
    }
  }

  /** A #c= link was opened (on load or hashchange): offer to save it if it is new. */
  function fromLink() {
    const st = store.get();
    if (!st.chartInput) return;
    const known = findChartByMoment(list, st.chartInput);
    if (known) { activeId = known.id; persist(); offerSave = false; } else offerSave = true;
    enter();
  }

  /** Restore the last active saved chart quietly (no jump, no hash) so tour 'birth' steps work. */
  function restoreQuietly() {
    if (store.get().chart) return;
    const entry = activeEntry();
    if (!entry) return;
    try { app.setChart(entry.input, { jump: false, updateHash: false }); } catch { /* stale entry */ }
  }

  // ---------------------------------------------------------------- render
  const sel = (id) => ctx.select({ kind: 'body', id }, 'panel');
  const glyphOf = (id) => (id === 'ascendant' ? 'AC' : id === 'midheaven' ? 'MC' : glyphText(planets[id]?.glyph ?? ''));

  function bigThree(chart) {
    const byId = Object.fromEntries(chart.placements.map((p) => [toContentId(p.id), p]));
    const tile = (id, label, role) => {
      const p = byId[id];
      if (!p) {
        return h('div.big3-tile.unknown', {},
          h('div.b3-role', {}, label), h('div.b3-sign', {}, 'Unknown'),
          h('div.b3-deg', {}, 'needs a birth time'));
      }
      const s = signs[signOrder[p.signIndex]];
      return h('button.big3-tile', { type: 'button', style: { '--c': planets[id].color }, onclick: () => sel(id), title: `${planets[id].name}: ${formatDeg(p.longitude)}. Open the card.` },
        h('div.b3-role', {}, h('span.g', {}, glyphOf(id)), ` ${label}`),
        h('div.b3-sign', {}, h('span.g', {}, glyphText(s.glyph)), ` ${s.name}`),
        h('div.b3-deg', {}, `${formatDeg(p.longitude).split(' ')[0]}${p.house ? ` · ${ordinal(p.house)} house` : ''}`),
        h('div.b3-what', {}, role));
    };
    return h('div.big3', {},
      tile('sun', 'Sun', 'core identity'),
      tile('moon', 'Moon', 'emotional needs'),
      tile('ascendant', 'Rising', 'outward style'));
  }

  function placementsTable(chart) {
    const order = ['sun', 'moon', 'asc', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'northNode', 'mc'];
    const byId = Object.fromEntries(chart.placements.map((p) => [p.id, p]));
    const rows = order.filter((id) => byId[id]).map((eid) => {
      const p = byId[eid];
      const id = toContentId(eid);
      const s = signs[signOrder[p.signIndex]];
      return h('button.pl-row', { type: 'button', style: { '--c': planets[id].color }, onclick: () => sel(id), 'aria-label': `${planets[id].name}: ${formatDeg(p.longitude)}${p.house ? `, ${ordinal(p.house)} house` : ''}${p.retrograde ? ', retrograde' : ''}. Open the card.` },
        h('span.g.pl-g', {}, glyphOf(id)),
        h('span.pl-name', {}, planets[id].name),
        h('span.pl-sign', {}, h('span.g', {}, glyphText(s.glyph)), ` ${formatDeg(p.longitude)}`),
        h('span.pl-house', { title: p.house ? `${ordinal(p.house)} house` : 'No house without a birth time' }, p.house ? String(p.house) : '–'),
        h('span.pl-retro', { title: p.retrograde ? 'Retrograde' : '' }, p.retrograde ? '℞' : ''));
    });
    return h('div.pl-table', { role: 'list' },
      h('div.pl-head', { 'aria-hidden': 'true' }, h('span'), h('span', {}, 'Body'), h('span', {}, 'Sign and degree'), h('span', {}, 'House'), h('span')),
      ...rows);
  }

  function aspectsList(chart) {
    const items = chart.aspects.map((x) => ({ ...x, a: toContentId(x.a), b: toContentId(x.b) }))
      .filter((x) => planets[x.a] && planets[x.b]);
    if (!items.length) return h('p.note', {}, 'No major aspects.');
    return h('div.asp-list', {}, ...items.map((x) => h('button.aspect-row', {
      type: 'button', style: { '--c': aspectContent[x.aspect].color },
      onclick: () => ctx.select({ kind: 'aspect', id: `${x.a}|${x.b}` }, 'panel'),
    },
    h('span.g', { style: { color: planets[x.a].color } }, glyphOf(x.a)), h('span.g', {}, glyphText(aspectContent[x.aspect].glyph)), h('span.g', { style: { color: planets[x.b].color } }, glyphOf(x.b)),
    h('span', {}, `${planets[x.a].name} ${aspectContent[x.aspect].verb} ${planets[x.b].name}`),
    h('span.orb', { title: 'Orb: degrees from exact' }, `${x.orb.toFixed(1)}°`))));
  }

  function balance(chart) {
    const bar = (items, content) => h('div.bal-row', {}, ...items.map(([k, n]) => h('span.bal', {
      title: `${content[k].name}: ${n} of 10 bodies`, style: { '--c': content[k].color ?? MODE_COLORS[k] ?? '#9db7e8', flexGrow: String(Math.max(n, 0.35)) },
    }, `${content[k].name} ${n}`)));
    return h('div.balance', {},
      bar(Object.entries(chart.tallies.elements), elements),
      bar(Object.entries(chart.tallies.modalities), modalities));
  }

  function savedList() {
    const box = h('div.saved');
    for (const c of list) {
      const isActive = c.id === activeId;
      if (renaming === c.id) {
        const inp = h('input', { type: 'text', value: c.input.name ?? '', maxlength: '60', 'aria-label': 'New name' });
        const ok = () => rename(c.id, inp.value);
        inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); if (e.key === 'Escape') { e.stopPropagation(); renaming = null; render(); } });
        box.append(h('div.saved-row.editing', {}, inp,
          h('button.ghost-btn', { type: 'button', onclick: ok }, 'Save'),
          h('button.ghost-btn', { type: 'button', onclick: () => { renaming = null; render(); } }, 'Cancel')));
        setTimeout(() => inp.focus(), 0);
        continue;
      }
      if (confirmDelete === c.id) {
        box.append(h('div.saved-row.confirm', {}, h('span', {}, `Delete ${c.input.name || 'this chart'} from this browser?`),
          h('button.ghost-btn', { type: 'button', onclick: () => remove(c.id) }, 'Delete'),
          h('button.ghost-btn', { type: 'button', onclick: () => { confirmDelete = null; render(); } }, 'Keep')));
        continue;
      }
      box.append(h('div', { class: `saved-row${isActive ? ' active' : ''}` },
        h('button.saved-main', { type: 'button', 'aria-current': isActive ? 'true' : null, onclick: () => switchTo(c.id), title: isActive ? 'Showing now' : 'Show this chart' },
          h('b', {}, c.input.name || 'Unnamed chart'), h('small', {}, `${birthWhen(c.input)} · ${c.input.place.name}`)),
        h('button.icon-btn', { type: 'button', title: 'Rename', 'aria-label': `Rename ${c.input.name || 'chart'}`, onclick: () => { renaming = c.id; confirmDelete = null; render(); } }, '✎'),
        h('button.icon-btn', { type: 'button', title: 'Delete', 'aria-label': `Delete ${c.input.name || 'chart'}`, onclick: () => { confirmDelete = c.id; renaming = null; render(); } }, '×')));
    }
    box.append(h('div.row', {}, h('button.ghost-btn', { type: 'button', onclick: () => openForm({ then: 'chart' }) }, '+ Add a chart'),
      list.length > 1 ? h('span.note', {}, 'Switch to compare friends\' charts.') : null));
    return box;
  }

  function render() {
    if (!active()) return;
    const st = store.get();
    const chart = st.chart;
    if (!chart) { root.replaceChildren(); return; }
    const input = chart.input;
    const scroll = root.querySelector('.chart-scroll')?.scrollTop ?? 0;

    driftBar = h('div.drift', { hidden: !drift },
      h('span', {}, 'You have moved away from the birth moment.'),
      h('button.ghost-btn', { type: 'button', onclick: () => { showBirthMoment(); store.patch({ wheelExpanded: true }); } }, 'Back to the birth moment'));

    const unknownNote = !chart.timeKnown ? h('div.unknown-note', {},
      h('b', {}, 'Birth time unknown. '),
      'No Ascendant, Midheaven or houses: the rising sign changes about every two hours and the houses turn with it, so they need the birth time. Planets are placed for local noon. ',
      chart.moonRange ? moonRangeText(chart.moonRange) : '') : null;

    const otherNotes = chart.notes.filter((n) => !n.startsWith('Birth time unknown'));
    const transitsIn = h('input', { type: 'checkbox', name: 'transits' });
    transitsIn.checked = !!st.transits;
    transitsIn.addEventListener('change', () => store.patch({ transits: transitsIn.checked, wheelExpanded: true, toggles: { ...store.get().toggles, wheel: true } }));

    const content = h('div.chart-scroll', {},
      offerSave ? h('div.offer', {},
        h('span', {}, 'This chart came from a shared link. Keep it?'),
        h('button.brass-btn', { type: 'button', onclick: saveOffered }, 'Save to my charts'),
        h('button.link-btn', { type: 'button', onclick: () => { offerSave = false; render(); } }, 'Not now')) : null,
      driftBar,
      unknownNote,
      otherNotes.length ? h('ul.chart-notes', {}, ...otherNotes.map((n) => h('li', {}, n))) : null,
      h('div.section-label', {}, 'The big three'),
      bigThree(chart),
      h('div.section-label', {}, 'Placements'),
      placementsTable(chart),
      h('p.note', {}, chart.timeKnown ? `${houseSystems[st.houseSystem]?.name ?? 'Whole Sign'} houses${chart.houses?.system !== (st.houseSystem === 'placidus' ? 'placidus' : 'whole') ? ' (Placidus undefined here, so Whole Sign)' : ''}; switch the system in The Instrument. Click any row for its reading.` : 'Click any row for its reading.'),
      h('div.section-label', {}, 'Aspects'),
      aspectsList(chart),
      h('div.section-label', {}, 'Balance'),
      balance(chart),
      h('div.section-label', {}, 'Today'),
      h('label.toggle', { title: "Draw today's planets as an outer ring around the birth wheel" }, transitsIn, h('span.sw'), h('span', {}, "Today's sky as an outer ring")),
      h('div.section-label', {}, 'Your charts'),
      savedList(),
      h('p.bf-privacy', {}, ui.birthForm.privacy),
    );

    const head = h('div.chart-head', {},
      h('div.chart-title', {},
        h('h2', {}, input.name || 'Unnamed chart'),
        h('div.sub', {}, `${birthWhen(input)}${input.timeKnown ? ` (${chart.offsetLabel})` : ''}`),
        h('div.sub', {}, input.place.name)),
      h('button.card-close', { type: 'button', title: 'Return to now', 'aria-label': 'Close Your chart and return to now', onclick: () => leave() }, '×'));
    const actions = h('div.chart-actions', {},
      h('button.brass-btn', { type: 'button', onclick: () => leave(), title: 'Leave Your chart and show the sky right now' }, '↺ Return to now'),
      h('button.ghost-btn', { type: 'button', onclick: copyLink, title: ui.birthForm.shareNote }, 'Copy link'),
      h('button.ghost-btn', { type: 'button', onclick: () => openForm({ edit: true, then: 'chart' }) }, 'Edit'),
      h('button.ghost-btn', { type: 'button', onclick: () => store.patch({ wheelExpanded: !store.get().wheelExpanded, toggles: { ...store.get().toggles, wheel: true } }), title: 'Enlarge or shrink the wheel' }, st.wheelExpanded ? 'Smaller wheel' : 'Larger wheel'));

    root.replaceChildren(h('div.chartmode', { role: 'region', 'aria-label': 'Your chart' }, head, actions, content));
    root.querySelector('.chart-scroll').scrollTop = scroll;
  }

  function moonRangeText(r) {
    const a = Math.floor(r.start / 30), b = Math.floor(r.end / 30);
    if (a === b) return `The Moon was in ${signs[signOrder[a]].name} all day, so its sign is certain.`;
    return `The Moon moved from ${signs[signOrder[a]].name} into ${signs[signOrder[b]].name} that day, so its sign depends on the time.`;
  }

  store.subscribe(() => render(), ['chart', 'mode', 'houseSystem', 'wheelExpanded']);

  return {
    enter, leave, openForm, copyLink, fromLink, restoreQuietly,
    get hasCharts() { return list.length > 0 || !!store.get().chart; },
    frame(state) {
      if (!active() || !state.chart) return;
      const c = state.chart;
      const p = c.input.place;
      const d = Math.abs(state.date.getTime() - c.utc.getTime()) > 60000
        || Math.abs(state.location.lat - p.lat) > 1e-4 || Math.abs(state.location.lon - p.lon) > 1e-4;
      if (d !== drift) {
        drift = d;
        if (driftBar) driftBar.hidden = !d;
      }
    },
  };
}
