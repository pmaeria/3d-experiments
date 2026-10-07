// Place picker: GeoNames search via the engine (lazy-loads data/cities.json), "my location"
// on request only, persisted in localStorage. Credit line required by the GeoNames licence.

import { ui } from '../content/index.js';
import { searchPlaces, loadPlaceIndex } from '../astro/index.js';
import { saveLocation, DEFAULT_LOCATION } from '../state.js';
import { h } from './dom.js';

let menu = null;
let closer = null;

export function openLocationMenu(ctx, anchor) {
  const { store } = ctx;
  if (menu) { closer?.(); return; }
  closer = close;
  loadPlaceIndex().catch(() => {});
  const input = h('input', { type: 'search', placeholder: 'Search a town or city…', 'aria-label': 'Search places', autocomplete: 'off', style: { width: '100%' } });
  const results = h('div.place-results', { role: 'listbox', 'aria-label': 'Places' });
  const status = h('p.note');
  const choose = (p) => {
    const loc = { name: p.label ?? p.name, lat: p.lat, lon: p.lon, tz: p.tz ?? null };
    store.patch({ location: loc });
    saveLocation(loc);
    ctx.toast(`Place: ${loc.name} (${Math.abs(loc.lat).toFixed(2)}°${loc.lat >= 0 ? 'N' : 'S'}, ${Math.abs(loc.lon).toFixed(2)}°${loc.lon >= 0 ? 'E' : 'W'})`);
    close();
    anchor.focus();
  };
  let seq = 0;
  input.addEventListener('input', async () => {
    const q = input.value.trim();
    const my = ++seq;
    if (q.length < 2) { results.replaceChildren(); status.textContent = ''; return; }
    status.textContent = 'Searching…';
    try {
      const found = await searchPlaces(q, 8);
      if (my !== seq) return;
      status.textContent = found.length ? '' : 'No match. Try the local spelling (e.g. Köln, not Cologne).';
      results.replaceChildren(...found.map((p) => h('button.mi', { type: 'button', role: 'option', onclick: () => choose(p) },
        h('span', {}, p.label), h('small', {}, `${p.lat.toFixed(1)}, ${p.lon.toFixed(1)}`))));
    } catch (e) {
      status.textContent = `Place data failed to load (${e.message}).`;
    }
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') results.querySelector('button')?.click();
    if (e.key === 'ArrowDown') { e.preventDefault(); results.querySelector('button')?.focus(); }
  });
  const mine = h('button.ghost-btn', {
    type: 'button', title: ui.controls.location.user.help,
    onclick: () => {
      if (!navigator.geolocation) { ctx.toast('Location is not available in this browser.'); return; }
      status.textContent = 'Asking your browser…';
      navigator.geolocation.getCurrentPosition(
        (pos) => choose({ name: 'My location', label: 'My location', lat: +pos.coords.latitude.toFixed(4), lon: +pos.coords.longitude.toFixed(4), tz: Intl.DateTimeFormat().resolvedOptions().timeZone }),
        () => { status.textContent = 'Location permission was not given.'; },
        { timeout: 10000, maximumAge: 600000 },
      );
    },
  }, ui.controls.location.user.label);
  const london = h('button.ghost-btn', { type: 'button', onclick: () => choose({ ...DEFAULT_LOCATION, label: DEFAULT_LOCATION.name }) }, 'London');
  menu = h('div.menu.panel', { role: 'dialog', 'aria-label': ui.controls.location.label },
    h('div.mh', {}, ui.controls.location.label),
    h('p.note', { style: { margin: '0 8px 6px' } }, ui.controls.location.help),
    h('div.mrow', {}, input),
    h('div.mrow', {}, mine, london),
    status, results,
    h('div.credit', {}, 'Place data © ', h('a', { href: 'https://www.geonames.org/', target: '_blank', rel: 'noopener' }, 'GeoNames'), ' (CC BY 4.0). Your place stays in this browser.'));
  document.body.append(menu);
  const r = anchor.getBoundingClientRect();
  menu.style.width = '320px';
  menu.style.left = `${Math.max(8, Math.min(window.innerWidth - 330, r.left))}px`;
  menu.style.top = `${Math.max(8, r.top - menu.offsetHeight - 10)}px`;
  // keep it anchored above the button while results grow
  const ro = new ResizeObserver(() => { if (menu) menu.style.top = `${Math.max(8, r.top - menu.offsetHeight - 10)}px`; });
  ro.observe(menu);
  menu._ro = ro;
  input.focus();
  menu.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); anchor.focus(); } });
  setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
  function outside(e) { if (menu && !menu.contains(e.target) && e.target !== anchor) close(); }
  function close() {
    menu?._ro?.disconnect();
    menu?.remove();
    menu = null;
    document.removeEventListener('pointerdown', outside, true);
  }
}
