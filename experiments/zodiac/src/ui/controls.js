// Left panel: every toggle in the scene vocabulary, distance compression, zoom, camera
// presets, house system, daylight, which bodies are shown and which one the camera follows.

import { ui, planets, earth as earthContent, houseSystems } from '../content/index.js';
import { TOGGLE_KEYS, toggleOn } from '../state.js';
import { h } from './dom.js';

const TOGGLE_LABELS = {
  ...ui.toggles,
  meridian: { label: 'Meridian', help: 'The line from due north, over your head, to due south; the Midheaven sits on it.' },
};
const BODY_IDS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'earth', 'ascendant', 'midheaven'];

export function initControls(ctx) {
  const { store } = ctx;
  const root = document.getElementById('controls');
  const collapsed = window.innerWidth < 820;
  if (collapsed) root.classList.add('collapsed');

  const titleBtn = h('button', { type: 'button', 'aria-expanded': String(!collapsed), 'aria-controls': 'controlsBody' }, 'The Instrument');
  const caret = h('span', { 'aria-hidden': 'true' }, collapsed ? '▸' : '▾');
  titleBtn.addEventListener('click', () => {
    const c = root.classList.toggle('collapsed');
    titleBtn.setAttribute('aria-expanded', String(!c));
    caret.textContent = c ? '▸' : '▾';
  });
  const body = h('div#controlsBody');
  root.append(h('h2.panel-title', {}, titleBtn, caret), body);

  // ---- show toggles
  body.append(h('div.section-label', {}, 'Show'));
  const toggleEls = {};
  for (const k of TOGGLE_KEYS) {
    const info = TOGGLE_LABELS[k];
    const input = h('input', { type: 'checkbox', name: `toggle-${k}`, 'aria-describedby': `tgh-${k}` });
    const part = h('span.part', { title: 'Shown for some bodies only' });
    input.addEventListener('change', () => store.setToggle(k, input.checked));
    const row = h('label.toggle', { title: info.help }, input, h('span.sw'), h('span', {}, info.label), part, h('span.sr', { id: `tgh-${k}` }, info.help));
    toggleEls[k] = { input, part };
    body.append(row);
  }

  // ---- distances, zoom, camera
  body.append(h('div.section-label', {}, 'Scale'));
  const compIn = h('input', { type: 'checkbox', name: 'compression' });
  compIn.addEventListener('change', () => store.patch({ compression: compIn.checked }));
  body.append(h('label.toggle', { title: 'Earth-centred view: squeeze distances so all ten bodies fit. Directions from Earth stay exact.' }, compIn, h('span.sw'), h('span', {}, 'Schematic distances')));
  const zoomSeg = h('div.seg', { role: 'group', 'aria-label': ui.controls.zoom.label });
  const zoomBtns = {};
  for (const [k, o] of Object.entries(ui.controls.zoom.options)) {
    zoomBtns[k] = h('button.ghost-btn', { type: 'button', title: o.help, 'aria-pressed': 'false', onclick: () => store.patch({ zoom: k }) }, o.label);
    zoomSeg.append(zoomBtns[k]);
  }
  body.append(h('div.note', {}, `${ui.controls.zoom.label}:`), zoomSeg);
  const zoomNote = h('p.note');
  body.append(zoomNote);
  const camSeg = h('div.seg', { role: 'group', 'aria-label': 'Camera' });
  for (const [k, label] of [['top', 'Top'], ['tilt', 'Tilt'], ['edge', 'Edge-on'], ['default', 'Reset']]) {
    camSeg.append(h('button.ghost-btn', { type: 'button', onclick: () => store.patch({ cameraRequest: { preset: k, t: Date.now() } }) }, label));
  }
  body.append(h('div.note', {}, 'Camera:'), camSeg);

  // ---- houses and sky
  body.append(h('div.section-label', {}, ui.controls.houseSystem.label));
  const hsSeg = h('div.seg', { role: 'group', 'aria-label': ui.controls.houseSystem.label });
  const hsBtns = {};
  for (const [k, o] of Object.entries(ui.controls.houseSystem.options)) {
    hsBtns[k] = h('button.ghost-btn', { type: 'button', title: o.help, 'aria-pressed': 'false', onclick: () => store.patch({ houseSystem: k }) }, o.label);
    hsSeg.append(hsBtns[k]);
  }
  const hsNote = h('p.note');
  body.append(hsSeg, hsNote);
  const dayIn = h('input', { type: 'checkbox', name: 'daylight' });
  dayIn.addEventListener('change', () => store.patch({ daylight: dayIn.checked }));
  body.append(h('label.toggle', { title: 'Sky view: tint the sky while the Sun is up. Turn off to see which stars the Sun sits in front of.' }, dayIn, h('span.sw'), h('span', {}, 'Daylight')));

  // ---- bodies
  body.append(h('div.section-label', {}, ui.controls.bodies.label));
  const chips = h('div.chips', { role: 'group', 'aria-label': ui.controls.bodies.help });
  const chipEls = {};
  for (const id of BODY_IDS) {
    const c = id === 'earth' ? earthContent : planets[id];
    const glyph = id === 'ascendant' ? 'AC' : id === 'midheaven' ? 'MC' : c.glyph;
    chipEls[id] = h('button.chip', {
      type: 'button', 'aria-pressed': 'false', title: c.name, style: { '--c': c.color },
      onclick: () => {
        const cur = new Set(store.get().bodies);
        if (cur.has(id)) cur.delete(id); else cur.add(id);
        store.patch({ bodies: BODY_IDS.filter((b) => cur.has(b)) });
      },
    }, h('span.g', {}, glyph), c.name);
    chips.append(chipEls[id]);
  }
  body.append(chips);
  const focusSel = h('select', { name: 'focus', 'aria-label': ui.controls.focus.label, title: ui.controls.focus.help },
    h('option', { value: '' }, 'Nothing (centre)'),
    ...['earth', 'sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].map((id) => h('option', { value: id }, (id === 'earth' ? earthContent : planets[id]).name)));
  focusSel.addEventListener('change', () => store.patch({ focus: focusSel.value || null }));
  body.append(h('label.toggle', { style: { cursor: 'default' } }, h('span', {}, `${ui.controls.focus.label}:`), focusSel));

  const render = (s) => {
    for (const k of TOGGLE_KEYS) {
      const v = s.toggles[k];
      toggleEls[k].input.checked = toggleOn(v);
      toggleEls[k].part.textContent = Array.isArray(v) && v.length ? 'some' : '';
    }
    compIn.checked = s.compression;
    compIn.disabled = s.view === 'helio';
    for (const [k, b] of Object.entries(zoomBtns)) b.setAttribute('aria-pressed', String(s.zoom === k));
    zoomNote.textContent = s.view === 'geo' && s.compression ? 'Zoom applies to true distances; schematic distances always fit.' : s.view === 'sky' ? 'In the sky view, scroll to zoom.' : '';
    for (const [k, b] of Object.entries(hsBtns)) b.setAttribute('aria-pressed', String(s.houseSystem === k));
    hsNote.textContent = houseSystems[s.houseSystem]?.short ?? '';
    dayIn.checked = s.daylight;
    for (const [id, c] of Object.entries(chipEls)) c.setAttribute('aria-pressed', String(s.bodies.includes(id)));
    focusSel.value = s.focus ?? '';
  };
  render(store.get());
  store.subscribe(render, ['toggles', 'compression', 'zoom', 'houseSystem', 'daylight', 'bodies', 'focus', 'view']);

  let lastFell = null;
  return {
    frame(state, frame) {
      const fell = frame.houses.fellBack;
      if (fell !== lastFell) {
        lastFell = fell;
        if (fell) hsNote.textContent = 'Placidus cannot be calculated at this latitude (inside a polar circle); showing Whole Sign.';
        else hsNote.textContent = houseSystems[state.houseSystem]?.short ?? '';
      }
    },
  };
}
