// Birth-chart form (modal): name, date, time or "time unknown", place search over the bundled
// GeoNames cities (debounced, keyboard navigable) with a manual latitude / longitude / time
// zone fallback, and a live "UTC+hh:mm at that date" line so people can sanity-check the zone.
// Everything stays in the browser.

import { ui } from '../content/index.js';
import {
  searchPlaces, loadPlaceIndex, localToUtc, isValidTimeZone, makeUtcDate, DATE_RANGE, formatYear,
} from '../astro/index.js';
import { h } from './dom.js';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
let formSeq = 0;

const latLonText = (lat, lon) => `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;

function timeZones() {
  try { return Intl.supportedValuesOf('timeZone'); } catch { return []; }
}

/**
 * Open the form. opts: {initial: ChartInput | null, title, submitLabel, onSubmit(input) -> void
 * (throws Error to show a message)}.
 */
export function openBirthForm(ctx, { initial = null, title = ui.birthForm.title, submitLabel = ui.birthForm.submit, onSubmit }) {
  const uid = `bf${++formSeq}`;
  loadPlaceIndex().catch(() => {});
  const field = (label, control, help = null, id = null) => h('div.bf-field', {},
    h('label', { for: id ?? control.id }, label), control, help ? h('div.bf-help', { id: `${id ?? control.id}-help` }, help) : null);

  // ---- name
  const name = h('input', { id: `${uid}-name`, type: 'text', maxlength: '60', autocomplete: 'off', placeholder: 'Optional, e.g. "Me" or a friend\'s first name', value: initial?.name ?? '' });

  // ---- date
  const day = h('input', { id: `${uid}-day`, type: 'number', min: '1', max: '31', inputmode: 'numeric', placeholder: 'Day', 'aria-label': 'Day', value: initial ? String(initial.day) : '' });
  const month = h('select', { id: `${uid}-month`, 'aria-label': 'Month' }, h('option', { value: '' }, 'Month…'), ...MONTHS.map((m, i) => h('option', { value: String(i + 1) }, m)));
  if (initial) month.value = String(initial.month);
  const year = h('input', { id: `${uid}-year`, type: 'number', min: '1', max: '6000', inputmode: 'numeric', placeholder: 'Year', 'aria-label': 'Year', value: initial ? String(initial.year) : '' });
  const dateRow = h('div.bf-date', { role: 'group', 'aria-labelledby': `${uid}-datelbl` }, day, month, year);

  // ---- time
  const time = h('input', { id: `${uid}-time`, type: 'time', step: '60', value: initial?.timeKnown ? `${String(initial.hour).padStart(2, '0')}:${String(initial.minute).padStart(2, '0')}` : '' });
  const unknown = h('input', { id: `${uid}-unknown`, type: 'checkbox' });
  unknown.checked = initial ? !initial.timeKnown : false;
  const unknownHelp = h('div.bf-help', { hidden: !unknown.checked }, ui.birthForm.unknownTime.help);

  // ---- place
  let place = initial?.place ? { ...initial.place } : null;
  const placeInput = h('input', {
    id: `${uid}-place`, type: 'search', autocomplete: 'off', placeholder: 'Start typing a town or city…',
    role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': 'false', 'aria-controls': `${uid}-list`,
  });
  const list = h('div.bf-results', { id: `${uid}-list`, role: 'listbox', 'aria-label': 'Matching places', hidden: true });
  const placeStatus = h('div.bf-help', { 'aria-live': 'polite' });
  const chosen = h('div.bf-chosen', { hidden: true });
  let results = [];
  let activeIdx = -1;
  let searchSeq = 0;
  let debounce = null;

  const manualName = h('input', { id: `${uid}-mname`, type: 'text', placeholder: 'e.g. Little Snoring', autocomplete: 'off' });
  const manualLat = h('input', { id: `${uid}-mlat`, type: 'number', step: 'any', min: '-90', max: '90', placeholder: 'e.g. 52.86' });
  const manualLon = h('input', { id: `${uid}-mlon`, type: 'number', step: 'any', min: '-180', max: '180', placeholder: 'e.g. 0.92' });
  const tzListId = `${uid}-tzs`;
  const manualTz = h('input', { id: `${uid}-mtz`, type: 'text', list: tzListId, autocomplete: 'off', placeholder: 'e.g. Europe/London', value: Intl.DateTimeFormat().resolvedOptions().timeZone ?? '' });
  const tzList = h('datalist', { id: tzListId }, ...['LMT', 'UTC', ...timeZones()].map((z) => h('option', { value: z })));
  const manualBox = h('details.bf-manual', {},
    h('summary', {}, "Can't find the place? Enter coordinates"),
    h('p.bf-help', {}, 'Use the nearest town for the time zone, or look the coordinates up on a map. North and east are positive; south and west negative. "LMT" uses local mean time from the longitude (for births before standard time).'),
    h('div.bf-grid', {},
      field('Place name', manualName),
      field('Latitude', manualLat),
      field('Longitude', manualLon),
      field('Time zone', manualTz)),
    tzList,
    h('div.row', {}, h('button.ghost-btn', { type: 'button', onclick: () => useManual() }, 'Use these coordinates')));

  const offsetLine = h('div.bf-offset', { 'aria-live': 'polite' });
  const err = h('div.bf-error', { role: 'alert' });

  function showChosen() {
    if (!place) { chosen.hidden = true; placeInput.hidden = false; return; }
    chosen.hidden = false;
    placeInput.hidden = true;
    list.hidden = true;
    chosen.replaceChildren(
      h('span.g', { 'aria-hidden': 'true' }, '⌖'),
      h('span', {}, h('b', {}, place.name), h('small', {}, ` ${latLonText(place.lat, place.lon)} · ${place.tz}`)),
      h('button.link-btn', { type: 'button', onclick: () => { place = null; showChosen(); placeInput.value = ''; placeInput.focus(); updateOffset(); } }, 'Change'));
    updateOffset();
  }

  function choose(p) {
    place = { name: p.label ?? p.name, lat: p.lat, lon: p.lon, tz: p.tz };
    placeStatus.textContent = '';
    showChosen();
    form.querySelector('.bf-actions .brass-btn')?.focus();
  }
  function useManual() {
    const lat = Number(manualLat.value), lon = Number(manualLon.value);
    const tz = manualTz.value.trim();
    const problems = [];
    if (manualLat.value === '' || !Number.isFinite(lat) || lat < -90 || lat > 90) problems.push('latitude must be between -90 and 90');
    if (manualLon.value === '' || !Number.isFinite(lon) || lon < -180 || lon > 180) problems.push('longitude must be between -180 and 180');
    if (!tz || !isValidTimeZone(tz)) problems.push('time zone must be an IANA name such as Europe/London (or UTC, LMT)');
    if (problems.length) { err.textContent = `Coordinates: ${problems.join('; ')}.`; return; }
    err.textContent = '';
    place = { name: manualName.value.trim() || latLonText(lat, lon), lat, lon, tz };
    manualBox.open = false;
    showChosen();
  }

  function renderResults() {
    list.replaceChildren(...results.map((p, i) => h('div.bf-opt', {
      id: `${uid}-opt${i}`, role: 'option', 'aria-selected': String(i === activeIdx),
      onpointerdown: (e) => { e.preventDefault(); choose(p); },
    }, h('span', {}, p.label), h('small', {}, `${latLonText(p.lat, p.lon)} · ${p.tz}`))));
    const open = results.length > 0;
    list.hidden = !open;
    placeInput.setAttribute('aria-expanded', String(open));
    if (activeIdx >= 0) {
      placeInput.setAttribute('aria-activedescendant', `${uid}-opt${activeIdx}`);
      list.children[activeIdx]?.scrollIntoView({ block: 'nearest' });
    } else placeInput.removeAttribute('aria-activedescendant');
  }
  placeInput.addEventListener('input', () => {
    clearTimeout(debounce);
    const q = placeInput.value.trim();
    if (q.length < 2) { results = []; activeIdx = -1; renderResults(); placeStatus.textContent = ''; return; }
    debounce = setTimeout(async () => {
      const my = ++searchSeq;
      placeStatus.textContent = 'Searching…';
      try {
        const found = await searchPlaces(q, 8);
        if (my !== searchSeq) return;
        results = found;
        activeIdx = found.length ? 0 : -1;
        placeStatus.textContent = found.length ? '' : 'No match. Try the local spelling (Köln, not Cologne), add a country ("paris, fr"), or enter coordinates below.';
        renderResults();
      } catch (e) {
        placeStatus.textContent = `Place data failed to load (${e.message}). You can enter coordinates below.`;
      }
    }, 160);
  });
  placeInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && results.length) { e.preventDefault(); activeIdx = (activeIdx + 1) % results.length; renderResults(); }
    else if (e.key === 'ArrowUp' && results.length) { e.preventDefault(); activeIdx = (activeIdx - 1 + results.length) % results.length; renderResults(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[activeIdx]) choose(results[activeIdx]); }
    else if (e.key === 'Escape' && !list.hidden) { e.preventDefault(); e.stopPropagation(); results = []; activeIdx = -1; renderResults(); }
  });
  placeInput.addEventListener('blur', () => setTimeout(() => { list.hidden = true; placeInput.setAttribute('aria-expanded', 'false'); }, 150));
  placeInput.addEventListener('focus', () => { if (results.length) renderResults(); });

  // ---- collect + offset preview
  function collect({ strict }) {
    const problems = [];
    const y = Number(year.value), m = Number(month.value), d = Number(day.value);
    if (!year.value || !Number.isInteger(y)) problems.push('the year');
    if (!month.value) problems.push('the month');
    if (!day.value || !Number.isInteger(d) || d < 1 || d > 31) problems.push('the day');
    let hour = 12, minute = 0;
    const timeKnown = !unknown.checked;
    if (timeKnown) {
      const tm = /^(\d{1,2}):(\d{2})/.exec(time.value);
      if (!tm) problems.push('the birth time (or tick "I don\'t know")');
      else { hour = Number(tm[1]); minute = Number(tm[2]); }
    }
    if (!place) problems.push('the birth place');
    if (problems.length) return strict ? { error: `Please fill in ${problems.join(', ')}.` } : null;
    if (y < DATE_RANGE.supported.minYear || y > DATE_RANGE.supported.maxYear) {
      return { error: `Years from ${formatYear(DATE_RANGE.supported.minYear)} to ${formatYear(DATE_RANGE.supported.maxYear)} only.` };
    }
    if (makeUtcDate(y, m, d).getUTCDate() !== d) return { error: `${MONTHS[m - 1]} ${y} has no day ${d}.` };
    return { input: { name: name.value.trim(), year: y, month: m, day: d, hour: timeKnown ? hour : 12, minute: timeKnown ? minute : 0, timeKnown, place: { ...place } } };
  }

  function updateOffset() {
    const c = collect({ strict: false });
    if (!c || c.error) {
      offsetLine.replaceChildren(c?.error ? h('span.warn', {}, c.error) : h('span.dim', {}, 'The UTC offset for that date and place will show here.'));
      return;
    }
    const { input } = c;
    try {
      const r = localToUtc({ year: input.year, month: input.month, day: input.day, hour: input.hour, minute: input.minute }, input.place.tz, { lon: input.place.lon });
      const at = input.timeKnown ? 'at that date and time' : 'at local noon that day';
      const parts = [h('b', {}, r.offsetLabel), ` ${at} (${input.place.tz === 'LMT' ? 'local mean time' : input.place.tz})`];
      if (r.status === 'skipped') parts.push(h('div.warn', {}, `That clock time did not exist: the clocks jumped forward. It will be read as ${String(r.wallClock.hour).padStart(2, '0')}:${String(r.wallClock.minute).padStart(2, '0')}.`));
      if (r.status === 'ambiguous') parts.push(h('div.warn', {}, 'That clock time happened twice (the clocks went back); the first occurrence is used.'));
      if (r.isLocalMeanTime && input.place.tz !== 'LMT') parts.push(h('div.dim', {}, `Before standard time: this is the local mean time of the zone's main city. For a different town, enter coordinates with time zone LMT.`));
      offsetLine.replaceChildren(...parts);
    } catch (e) {
      offsetLine.replaceChildren(h('span.warn', {}, e.message));
    }
  }
  for (const el of [day, month, year, time]) el.addEventListener('input', updateOffset);
  unknown.addEventListener('change', () => {
    time.disabled = unknown.checked;
    unknownHelp.hidden = !unknown.checked;
    updateOffset();
  });
  time.disabled = unknown.checked;

  let close = null;
  const submit = (e) => {
    e?.preventDefault();
    const c = collect({ strict: true });
    if (c.error) { err.textContent = c.error; return; }
    try {
      onSubmit(c.input);
      close?.();
    } catch (ex) {
      err.textContent = ex.message;
    }
  };

  const form = h('form.birth-form', { novalidate: true, onsubmit: submit },
    h('h2', {}, title),
    h('p.bf-intro', {}, ui.birthForm.intro),
    field('Name', name, null),
    h('div.bf-field', {}, h('label', { id: `${uid}-datelbl`, for: `${uid}-day` }, ui.birthForm.date.label), dateRow, h('div.bf-help', {}, ui.birthForm.date.help)),
    h('div.bf-field', {},
      h('label', { for: time.id }, ui.birthForm.time.label),
      h('div.bf-timerow', {}, time, h('label.bf-check', { for: unknown.id }, unknown, h('span', {}, ui.birthForm.unknownTime.label))),
      h('div.bf-help', {}, ui.birthForm.time.help),
      unknownHelp),
    h('div.bf-field.bf-placefield', {},
      h('label', { for: placeInput.id }, ui.birthForm.place.label),
      chosen, placeInput, list, placeStatus,
      h('div.bf-help', {}, ui.birthForm.place.help),
      h('div.credit', {}, 'Place data © ', h('a', { href: 'https://www.geonames.org/', target: '_blank', rel: 'noopener' }, 'GeoNames'), ' (CC BY 4.0), towns of 15,000 people or more.')),
    manualBox,
    offsetLine,
    h('details.bf-why', {}, h('summary', {}, 'Why do time and place matter?'), h('p', {}, ui.birthForm.whyTimeAndPlace)),
    h('p.bf-privacy', {}, ui.birthForm.privacy),
    err,
    h('div.row.bf-actions', {},
      h('button.brass-btn', { type: 'submit' }, submitLabel),
      h('button.ghost-btn', { type: 'button', onclick: () => close?.() }, 'Cancel')),
  );
  close = ctx.openModal(form);
  form.closest('.modal-card')?.classList.add('bf-card');
  showChosen();
  updateOffset();
  (initial ? name : day).focus();
  return close;
}
