#!/usr/bin/env node
// Completeness and consistency check for the content modules.
// Run: node src/content/validate.mjs   (exits 1 on any error)

import * as C from './index.js';

const {
  glossary, glossaryKey, LINK_PATTERN, plainText,
  planets, planetOrder, pointOrder, earth,
  signs, signOrder, elements, modalities, polarities,
  houses, houseSystems,
  aspects, aspectOrder, orbText, applyingSeparatingText,
  placements, rising, houseMeanings, composePlacement, composeAspect,
  tour, chapters, sceneDefaults,
  ui,
} = C;

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

const VS15 = '︎';
const SIGN_IDS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const PLANET_IDS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const POINT_IDS = ['ascendant', 'midheaven', 'northNode'];
const ASPECT_IDS = ['conjunction', 'sextile', 'square', 'trine', 'opposition'];
const ELEMENTS = ['fire', 'earth', 'air', 'water'];
const MODALITIES = ['cardinal', 'fixed', 'mutable'];
const GROUPS = ['luminary', 'personal', 'social', 'generational', 'angle', 'point'];

// ---- word budgets -------------------------------------------------------
const words = (t) => plainText(t).trim().split(/\s+/).filter(Boolean).length;
const SLACK = 0.15; // outside the strict range but within 15% -> warning; beyond -> error
function budget(label, text, min, max) {
  if (typeof text !== 'string' || !text.trim()) { err(`${label}: missing text`); return; }
  const n = words(text);
  if (n >= min && n <= max) return;
  const lo = Math.floor(min * (1 - SLACK));
  const hi = Math.ceil(max * (1 + SLACK));
  const msg = `${label}: ${n} words (target ${min}-${max})`;
  if (n >= lo && n <= hi) warn(msg); else err(msg);
}
const SHORT = [1, 25], MORE = [60, 120], DEEP = [150, 250];

function requireFields(label, obj, fields) {
  for (const f of fields) {
    if (obj[f] === undefined || obj[f] === null || obj[f] === '') err(`${label}: missing field "${f}"`);
  }
}
function exactKeys(label, obj, expected) {
  const got = Object.keys(obj);
  for (const k of expected) if (!got.includes(k)) err(`${label}: missing "${k}"`);
  for (const k of got) if (!expected.includes(k)) err(`${label}: unexpected "${k}"`);
}
function glyphOk(label, g) {
  if (typeof g !== 'string' || !g) return err(`${label}: missing glyph`);
  if (/^[\x20-\x7E]+$/.test(g)) return; // ASCII abbreviations like AC / MC
  if (!g.endsWith(VS15)) err(`${label}: glyph "${g}" lacks U+FE0E text presentation selector`);
}

// ---- planets --------------------------------------------------------------
exactKeys('planets', planets, [...PLANET_IDS, ...POINT_IDS]);
if (JSON.stringify(planetOrder) !== JSON.stringify(PLANET_IDS)) err('planetOrder does not list the 10 planets in order');
if (JSON.stringify(pointOrder) !== JSON.stringify(POINT_IDS)) err('pointOrder mismatch');
for (const [id, p] of Object.entries(planets)) {
  const L = `planets.${id}`;
  requireFields(L, p, ['id', 'name', 'glyph', 'color', 'group', 'keywords', 'short', 'more', 'deep', 'astronomy', 'rules', 'traditionalRules', 'whatPhrase']);
  if (p.id !== id) err(`${L}: id mismatch`);
  glyphOk(L, p.glyph);
  if (!/^#[0-9a-f]{6}$/i.test(p.color)) err(`${L}: bad colour ${p.color}`);
  if (!GROUPS.includes(p.group)) err(`${L}: bad group ${p.group}`);
  budget(`${L}.short`, p.short, ...SHORT);
  budget(`${L}.more`, p.more, ...MORE);
  budget(`${L}.deep`, p.deep, ...DEEP);
  requireFields(`${L}.astronomy`, p.astronomy, ['short', 'more', 'orbitalPeriod', 'timePerSign', 'retrograde']);
  budget(`${L}.astronomy.short`, p.astronomy.short, ...SHORT);
  budget(`${L}.astronomy.more`, p.astronomy.more, ...MORE);
  for (const s of [...p.rules, ...p.traditionalRules]) if (!SIGN_IDS.includes(s)) err(`${L}: rules unknown sign ${s}`);
  if (!Array.isArray(p.keywords) || p.keywords.length < 3) err(`${L}: needs 3+ keywords`);
}
glyphOk('earth', earth.glyph);

// ---- signs ------------------------------------------------------------------
exactKeys('signs', signs, SIGN_IDS);
if (JSON.stringify(signOrder) !== JSON.stringify(SIGN_IDS)) err('signOrder mismatch');
for (const [id, s] of Object.entries(signs)) {
  const L = `signs.${id}`;
  requireFields(L, s, ['id', 'name', 'glyph', 'index', 'startDeg', 'dates', 'symbol', 'element', 'modality', 'ruler', 'traditionalRuler', 'polarity', 'keywords', 'short', 'more', 'deep', 'shadow', 'howPhrase', 'bodyPart', 'constellation', 'color']);
  if (s.index !== SIGN_IDS.indexOf(id)) err(`${L}: wrong index`);
  if (s.startDeg !== s.index * 30) err(`${L}: wrong startDeg`);
  glyphOk(L, s.glyph);
  if (!ELEMENTS.includes(s.element)) err(`${L}: bad element`);
  if (!MODALITIES.includes(s.modality)) err(`${L}: bad modality`);
  if (ELEMENTS[s.index % 4] !== s.element) err(`${L}: element out of sequence`);
  if (MODALITIES[s.index % 3] !== s.modality) err(`${L}: modality out of sequence`);
  if (!planets[s.ruler] || !planets[s.traditionalRuler]) err(`${L}: unknown ruler`);
  if (!planets[s.ruler]?.rules.includes(id)) err(`${L}: ruler ${s.ruler} does not list ${id} in rules`);
  if (!planets[s.traditionalRuler]?.traditionalRules.includes(id)) err(`${L}: traditional ruler ${s.traditionalRuler} does not list ${id}`);
  if (!polarities[s.polarity]) err(`${L}: unknown polarity`);
  budget(`${L}.short`, s.short, ...SHORT);
  budget(`${L}.more`, s.more, ...MORE);
  budget(`${L}.deep`, s.deep, ...DEEP);
  budget(`${L}.shadow`, s.shadow, 5, 25);
  budget(`${L}.astronomy.short`, s.astronomy?.short, ...SHORT);
  requireFields(`${L}.constellation`, s.constellation, ['note', 'sunActuallyThere']);
  budget(`${L}.constellation.note`, s.constellation.note, 20, 70);
}
exactKeys('elements', elements, ELEMENTS);
exactKeys('modalities', modalities, MODALITIES);
for (const [k, e] of Object.entries({ ...elements, ...modalities })) {
  budget(`elements/modalities.${k}.short`, e.short, ...SHORT);
  budget(`elements/modalities.${k}.more`, e.more, 40, 120);
  for (const s of e.signs) if (!signs[s]) err(`${k}: unknown sign ${s}`);
}

// ---- houses -----------------------------------------------------------------
exactKeys('houses', houses, Array.from({ length: 12 }, (_, i) => String(i + 1)));
for (const [n, h] of Object.entries(houses)) {
  const L = `houses.${n}`;
  requireFields(L, h, ['number', 'name', 'keywords', 'short', 'more', 'wherePhrase', 'sky']);
  if (h.number !== Number(n)) err(`${L}: number mismatch`);
  budget(`${L}.short`, h.short, ...SHORT);
  budget(`${L}.more`, h.more, ...MORE);
  if (!/^in /.test(h.wherePhrase)) err(`${L}: wherePhrase should start with "in "`);
}
for (const n of [1, 4, 7, 10]) if (!houses[n].angle) err(`houses.${n}: missing angle`);
for (const id of ['wholeSign', 'placidus']) {
  requireFields(`houseSystems.${id}`, houseSystems[id] ?? {}, ['name', 'short', 'more']);
  budget(`houseSystems.${id}.short`, houseSystems[id]?.short, ...SHORT);
  budget(`houseSystems.${id}.more`, houseSystems[id]?.more, ...MORE);
}
if (!houseSystems[houseSystems.default]) err('houseSystems.default does not resolve');

// ---- aspects ----------------------------------------------------------------
exactKeys('aspects', aspects, ASPECT_IDS);
if (JSON.stringify(aspectOrder) !== JSON.stringify(ASPECT_IDS)) err('aspectOrder mismatch');
const ANGLES = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };
for (const [id, a] of Object.entries(aspects)) {
  const L = `aspects.${id}`;
  requireFields(L, a, ['id', 'name', 'verb', 'glyph', 'nature', 'color', 'keywords', 'short', 'more', 'deep', 'astronomy', 'talkPhrase', 'orb']);
  if (a.angle !== ANGLES[id]) err(`${L}: angle should be ${ANGLES[id]}`);
  glyphOk(L, a.glyph);
  budget(`${L}.short`, a.short, ...SHORT);
  budget(`${L}.more`, a.more, ...MORE);
  budget(`${L}.deep`, a.deep, ...DEEP);
  budget(`${L}.astronomy.short`, a.astronomy?.short, ...SHORT);
  budget(`${L}.astronomy.more`, a.astronomy?.more, 40, 120);
}
budget('orbText.short', orbText.short, ...SHORT);
budget('orbText.more', orbText.more, 40, 120);
budget('applyingSeparatingText.short', applyingSeparatingText.short, ...SHORT);
budget('applyingSeparatingText.more', applyingSeparatingText.more, 40, 120);

// ---- placements ---------------------------------------------------------------
let placementCount = 0;
const seenTexts = new Set();
exactKeys('placements', placements, PLANET_IDS);
for (const pid of PLANET_IDS) {
  exactKeys(`placements.${pid}`, placements[pid] ?? {}, SIGN_IDS);
  for (const sid of SIGN_IDS) {
    const pl = placements[pid]?.[sid];
    if (!pl) continue;
    placementCount++;
    requireFields(`placements.${pid}.${sid}`, pl, ['title', 'text']);
    budget(`placements.${pid}.${sid}.text`, pl.text, 35, 60);
    if (seenTexts.has(pl.text)) err(`placements.${pid}.${sid}: duplicate text`);
    seenTexts.add(pl.text);
  }
}
exactKeys('rising', rising, SIGN_IDS);
for (const sid of SIGN_IDS) {
  requireFields(`rising.${sid}`, rising[sid] ?? {}, ['title', 'text']);
  budget(`rising.${sid}.text`, rising[sid]?.text, 35, 60);
}
for (const id of [...PLANET_IDS, ...POINT_IDS]) if (!houseMeanings[id]) err(`houseMeanings.${id} missing`);
try {
  const c = composePlacement('sun', 'sagittarius', 10);
  if (!c.sentence || c.parts.length !== 3) err('composePlacement: unexpected result');
  for (const pid of [...PLANET_IDS, ...POINT_IDS]) for (const sid of SIGN_IDS) composePlacement(pid, sid);
  for (let h = 1; h <= 12; h++) composePlacement('moon', 'cancer', h);
  const a = composeAspect('mars', 'jupiter', 'conjunction');
  if (!a.sentence) err('composeAspect: empty sentence');
} catch (e) { err(`compose helpers threw: ${e.message}`); }

// ---- glossary -----------------------------------------------------------------
const gCount = Object.keys(glossary).length;
if (gCount < 45 || gCount > 70) err(`glossary: ${gCount} terms (want 45-70)`);
for (const [k, g] of Object.entries(glossary)) {
  const L = `glossary.${k}`;
  if (glossaryKey(k) !== k) err(`${L}: key is not normalised`);
  requireFields(L, g, ['term', 'short', 'more', 'kind', 'related']);
  if (!['astronomy', 'astrology', 'both'].includes(g.kind)) err(`${L}: bad kind`);
  budget(`${L}.short`, g.short, ...SHORT);
  budget(`${L}.more`, g.more, 15, 110);
  for (const r of g.related) if (!glossary[r]) err(`${L}: related "${r}" not in glossary`);
}
const REQUIRED_TERMS = ['ecliptic', 'zodiac', 'sign', 'constellation', 'tropical-zodiac', 'sidereal-zodiac', 'precession', 'equinox', 'solstice', 'ascendant', 'descendant', 'midheaven', 'ic', 'house', 'cusp', 'aspect', 'orb', 'conjunction', 'sextile', 'square', 'trine', 'opposition', 'retrograde', 'station', 'direct', 'ingress', 'transit', 'natal-chart', 'element', 'modality', 'ruler', 'luminary', 'degree', 'geocentric', 'heliocentric', 'celestial-sphere', 'horizon', 'meridian', 'celestial-equator', 'obliquity', 'new-moon', 'full-moon', 'lunar-node', 'eclipse', 'big-three', 'orrery', 'au', 'ophiuchus', 'whole-sign-houses', 'placidus'];
for (const t of REQUIRED_TERMS) if (!glossary[t]) err(`glossary: missing required term "${t}"`);

// Walk every string in every export and resolve [[links]].
let linkCount = 0;
const linkedTerms = new Set();
function walk(value, path) {
  if (typeof value === 'string') {
    const opens = (value.match(/\[\[/g) || []).length;
    const closes = (value.match(/\]\]/g) || []).length;
    if (opens !== closes) err(`${path}: unbalanced [[ ]]`);
    for (const m of value.matchAll(LINK_PATTERN)) {
      linkCount++;
      const key = glossaryKey(m[1]);
      linkedTerms.add(key);
      if (!glossary[key]) err(`${path}: link [[${m[1]}]] does not resolve`);
    }
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, `${path}[${i}]`));
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
  }
}
for (const [name, value] of Object.entries(C)) if (typeof value !== 'function' && !(value instanceof RegExp)) walk(value, name);

// ---- tour -----------------------------------------------------------------------
const VIEWS = ['helio', 'geo', 'sky'];
const ZOOMS = ['earthSun', 'inner', 'outer'];
const EVENTS = ['marchEquinox', 'greatConjunction2020', 'nextMarsRetrograde', 'nextFullMoon', 'nextNewMoon', 'nextMercuryRetrograde'];
const SHOW_KEYS = ['ring', 'signLabels', 'constellations', 'sightLines', 'aspects', 'trails', 'orbits', 'horizon', 'houses', 'wheel', 'earthAxis'];
const SCENE_KEYS = ['view', 'zoom', 'date', 'rate', 'location', 'bodies', 'show', 'focus', 'highlight'];
const BODY_IDS = [...PLANET_IDS, 'earth', 'ascendant', 'midheaven'];
const TASK_TYPES = ['bodyInSign', 'aspect', 'view', 'clicked', 'retrograde', 'risingSign'];
const CLICKABLE = [...BODY_IDS, ...SIGN_IDS, ...ASPECT_IDS, 'northNode'];

function bodyList(label, v, allowAll = true) {
  if (v === 'all' && allowAll) return;
  if (!Array.isArray(v)) return err(`${label}: must be ${allowAll ? "'all' or " : ''}an array`);
  for (const b of v) if (!BODY_IDS.includes(b)) err(`${label}: unknown body "${b}"`);
}
function checkScene(L, sc) {
  for (const k of Object.keys(sc)) if (!SCENE_KEYS.includes(k)) err(`${L}: unknown scene key "${k}"`);
  if (!VIEWS.includes(sc.view)) err(`${L}: bad view`);
  if (sc.zoom !== undefined && !ZOOMS.includes(sc.zoom)) err(`${L}: bad zoom`);
  const d = sc.date;
  if (d !== undefined) {
    if (typeof d === 'string') {
      if (!['now', 'birth'].includes(d) && Number.isNaN(Date.parse(d))) err(`${L}: unparseable date ${d}`);
    } else if (!d || !EVENTS.includes(d.event)) err(`${L}: bad date event`);
  }
  if (sc.rate !== undefined && typeof sc.rate !== 'number') err(`${L}: rate must be a number`);
  const loc = sc.location;
  if (loc !== undefined && !['birth', 'user'].includes(loc)) {
    if (!loc || typeof loc.name !== 'string' || typeof loc.lat !== 'number' || typeof loc.lon !== 'number') err(`${L}: bad location`);
  }
  if (sc.bodies !== undefined) bodyList(`${L}.bodies`, sc.bodies);
  for (const [k, v] of Object.entries(sc.show ?? {})) {
    if (!SHOW_KEYS.includes(k)) err(`${L}.show: unknown key "${k}"`);
    else if (k === 'sightLines') { if (!(v === false || v === 'all' || Array.isArray(v))) err(`${L}.show.sightLines: bad value`); else if (Array.isArray(v)) bodyList(`${L}.show.sightLines`, v, false); }
    else if (k === 'trails') { if (!(v === false || Array.isArray(v))) err(`${L}.show.trails: bad value`); else if (Array.isArray(v)) bodyList(`${L}.show.trails`, v, false); }
    else if (typeof v !== 'boolean') err(`${L}.show.${k}: must be boolean`);
  }
  if (sc.focus !== undefined && !BODY_IDS.includes(sc.focus)) err(`${L}: unknown focus ${sc.focus}`);
  if (sc.highlight) {
    for (const k of Object.keys(sc.highlight)) if (!['signs', 'bodies', 'aspect'].includes(k)) err(`${L}.highlight: unknown key ${k}`);
    for (const s of sc.highlight.signs ?? []) if (!SIGN_IDS.includes(s)) err(`${L}.highlight: unknown sign ${s}`);
    if (sc.highlight.bodies) bodyList(`${L}.highlight.bodies`, sc.highlight.bodies, false);
    if (sc.highlight.aspect) { if (sc.highlight.aspect.length !== 2) err(`${L}.highlight.aspect: needs 2 ids`); bodyList(`${L}.highlight.aspect`, sc.highlight.aspect, false); }
  }
}
checkScene('sceneDefaults', sceneDefaults);

if (tour.length < 30 || tour.length > 40) err(`tour: ${tour.length} steps (want 30-40)`);
const chapterIds = chapters.map((c) => c.id);
if (chapterIds.length !== 15) err(`chapters: ${chapterIds.length} (want 15)`);
const stepIds = new Set();
const perChapter = {};
let lastChapterIdx = -1;
for (const step of tour) {
  const L = `tour.${step.id}`;
  requireFields(L, step, ['id', 'chapter', 'title', 'voice', 'body', 'scene']);
  if (stepIds.has(step.id)) err(`${L}: duplicate id`);
  stepIds.add(step.id);
  const ci = chapterIds.indexOf(step.chapter);
  if (ci < 0) err(`${L}: unknown chapter ${step.chapter}`);
  if (ci < lastChapterIdx) err(`${L}: chapter out of order`);
  lastChapterIdx = Math.max(lastChapterIdx, ci);
  perChapter[step.chapter] = (perChapter[step.chapter] ?? 0) + 1;
  if (!['astronomy', 'astrology', 'both'].includes(step.voice)) err(`${L}: bad voice`);
  budget(`${L}.body`, step.body, 40, 90);
  if (step.deeper !== undefined) budget(`${L}.deeper`, step.deeper, 30, 150);
  if (step.lookFor !== undefined) budget(`${L}.lookFor`, step.lookFor, 3, 20);
  checkScene(`${L}.scene`, step.scene);
  if (step.task) {
    requireFields(`${L}.task`, step.task, ['prompt', 'check']);
    const c = step.task.check ?? {};
    if (!TASK_TYPES.includes(c.type)) err(`${L}.task: bad check type ${c.type}`);
    if (c.type === 'bodyInSign' && (!BODY_IDS.includes(c.body) || !SIGN_IDS.includes(c.sign))) err(`${L}.task: bad bodyInSign`);
    if (c.type === 'aspect' && (!BODY_IDS.includes(c.a) || !BODY_IDS.includes(c.b) || !ASPECT_IDS.includes(c.aspect))) err(`${L}.task: bad aspect check`);
    if (c.type === 'view' && !VIEWS.includes(c.view)) err(`${L}.task: bad view`);
    if (c.type === 'clicked' && !CLICKABLE.includes(c.id)) err(`${L}.task: unknown clickable ${c.id}`);
    if (c.type === 'retrograde' && !PLANET_IDS.includes(c.body)) err(`${L}.task: bad retrograde body`);
    if (c.type === 'risingSign' && !SIGN_IDS.includes(c.sign)) err(`${L}.task: bad rising sign`);
  }
}
for (const c of chapterIds) {
  const n = perChapter[c] ?? 0;
  if (n < 1 || n > 4) err(`chapter ${c}: ${n} steps (want 1-4)`);
}
const taskCount = tour.filter((s) => s.task).length;

// ---- ui -------------------------------------------------------------------------
exactKeys('ui.views', ui.views, VIEWS);
for (const v of VIEWS) {
  requireFields(`ui.views.${v}`, ui.views[v], ['label', 'sentence', 'whatAmI']);
  budget(`ui.views.${v}.whatAmI.short`, ui.views[v].whatAmI.short, ...SHORT);
  budget(`ui.views.${v}.whatAmI.more`, ui.views[v].whatAmI.more, 40, 120);
}
exactKeys('ui.toggles', ui.toggles, SHOW_KEYS);
for (const k of ['view', 'zoom', 'date', 'rate', 'location', 'bodies', 'focus', 'highlight']) if (!ui.controls[k]) err(`ui.controls.${k} missing`);
for (const z of ZOOMS) if (!ui.controls.zoom.options[z]) err(`ui.controls.zoom.options.${z} missing`);
for (const e of EVENTS) if (!ui.events[e]) err(`ui.events.${e} missing`);
requireFields('ui.birthForm', ui.birthForm, ['date', 'time', 'unknownTime', 'place', 'whyTimeAndPlace', 'privacy', 'shareNote']);
const aboutSentences = ui.about.text.split(/(?<=[.!?])\s+/).filter(Boolean).length;
if (aboutSentences !== 2) err(`ui.about.text: ${aboutSentences} sentences (want 2)`);

// ---- privacy: no birth data of real people ----------------------------------
// (heuristic) dates in tour scenes must be events, 'now', 'birth' or documented fixed demo dates
const ALLOWED_FIXED = ['2025-12-05T12:00:00Z', '2025-10-12T12:00:00Z', '0001-03-22T12:00:00Z'];
for (const step of tour) {
  const d = step.scene.date;
  if (typeof d === 'string' && !['now', 'birth'].includes(d) && !ALLOWED_FIXED.includes(d)) warn(`tour.${step.id}: unlisted fixed date ${d}`);
}

// ---- report -----------------------------------------------------------------
const unusedTerms = Object.keys(glossary).filter((k) => !linkedTerms.has(k));
console.log('Zodiac content validation');
console.log(`  planets:     ${PLANET_IDS.length} planets + ${POINT_IDS.length} points`);
console.log(`  signs:       ${Object.keys(signs).length}`);
console.log(`  houses:      ${Object.keys(houses).length} (+ ${Object.keys(houseSystems).length - 1} house systems)`);
console.log(`  aspects:     ${Object.keys(aspects).length}`);
console.log(`  placements:  ${placementCount} planet-in-sign + ${Object.keys(rising).length} rising`);
console.log(`  glossary:    ${gCount} terms, ${linkCount} links, all resolving: ${errors.every((e) => !e.includes('does not resolve'))}`);
console.log(`  glossary terms never linked (still reachable via related/search): ${unusedTerms.length ? unusedTerms.join(', ') : 'none'}`);
console.log(`  tour:        ${tour.length} steps in ${chapterIds.length} chapters, ${taskCount} tasks`);
if (warnings.length) {
  console.log(`\nWarnings (${warnings.length}):`);
  for (const w of warnings) console.log(`  - ${w}`);
}
if (errors.length) {
  console.log(`\nErrors (${errors.length}):`);
  for (const e of errors) console.log(`  x ${e}`);
  process.exit(1);
}
console.log('\nOK: all checks passed.');
