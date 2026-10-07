// Right-hand info panel: cards for bodies, signs, houses, aspects, glossary terms and the
// per-view explainer. Progressive disclosure (short -> Tell me more -> Go deeper), with the
// astronomy and astrology voices visually distinguished and labelled. Body cards carry live
// data that refreshes while time runs.

import {
  ui, planets, signs, signOrder, houses, houseSystems, aspects as aspectContent, glossary, resolveTerm,
  composePlacement, composeAspect, ordinal, earth as earthContent, elements, modalities, ophiuchus,
  orbText, applyingSeparatingText,
} from '../content/index.js';
import { equinoxConstellation, houseOf } from '../astro/index.js';
import { birthTimeUnknownShown } from '../state.js';
import { h, richText, formatDeg, formatDistance } from './dom.js';

const VOICE_LABEL = { astronomy: ui.voices.astronomy.label, astrology: ui.voices.astrology.label, both: ui.voices.both.label };

export function initPanel(ctx) {
  const { store } = ctx;
  const root = document.getElementById('panel');
  let current = null; // {key, live: fn(frame) | null}
  const term = (k, a) => ctx.openTerm(k, a);

  /** A voice block with layered disclosure. layers: [short, more?, deep?] */
  function voice(kind, layers, extra = null) {
    const [short, more, deep] = layers;
    const box = h(`div.voice.${kind}`, { role: 'group', 'aria-label': VOICE_LABEL[kind] },
      h('div.voice-tag', { title: ui.voices[kind].help }, VOICE_LABEL[kind]));
    box.append(richText(short, term));
    const moreEl = more ? h('div.layer-more', { hidden: true }, richText(more, term)) : null;
    const deepEl = deep ? h('div.layer-deep', { hidden: true }, richText(deep, term)) : null;
    if (moreEl) box.append(moreEl);
    if (deepEl) box.append(deepEl);
    if (extra) box.append(extra);
    if (more) {
      const btn = h('button.link-btn', { type: 'button', 'aria-expanded': 'false' }, ui.tour.tellMeMore);
      let level = 0;
      const max = deep ? 2 : 1;
      btn.addEventListener('click', () => {
        level = level >= max ? 0 : level + 1;
        moreEl.hidden = level < 1;
        if (deepEl) deepEl.hidden = level < 2;
        btn.textContent = level === 0 ? ui.tour.tellMeMore : level < max ? ui.cards.showDeep : ui.cards.showLess;
        btn.setAttribute('aria-expanded', String(level > 0));
      });
      box.append(h('div.disclose', {}, btn));
    }
    return box;
  }

  const close = () => h('button.card-close', { type: 'button', 'aria-label': 'Close card', title: 'Close (Esc)', onclick: () => store.patch({ selection: null }) }, '×');
  const head = (glyph, title, sub, color) => h('div.card-head', { style: { '--c': color } },
    glyph ? h('div.big-glyph', { 'aria-hidden': 'true' }, glyph) : null,
    h('div', {}, h('h2', {}, title), sub ? h('div.sub', {}, sub) : null), close());

  function liveList() {
    const dl = h('dl.live');
    const rows = {};
    return {
      el: dl,
      set(key, label, value, cls = '') {
        if (!rows[key]) {
          rows[key] = { dt: h('dt', {}, label), dd: h('dd') };
          dl.append(rows[key].dt, rows[key].dd);
        }
        const r = rows[key];
        if (r.v !== value) { r.dd.textContent = value; r.v = value; }
        r.dd.className = cls;
      },
    };
  }

  // ---------------------------------------------------------------- body card
  function bodyCard(id, frame) {
    if (id === 'earth') {
      return {
        el: h('div', {}, head(earthContent.glyph, 'Earth', 'You are here', earthContent.color),
          voice('astronomy', [earthContent.astronomy.short]),
          voice('both', [earthContent.short])),
        live: null,
      };
    }
    const p = planets[id];
    const isAngle = id === 'ascendant' || id === 'midheaven';
    const live = liveList();
    const grammar = h('div.grammar');
    const el = h('div', {},
      head(isAngle ? (id === 'ascendant' ? 'AC' : 'MC') : p.glyph, p.name, p.keywords.slice(0, 3).join(' · '), p.color),
      live.el,
      grammar,
      voice('astronomy', [p.astronomy.short, p.astronomy.more], h('div.facts', {},
        p.astronomy.orbitalPeriod ? h('div', {}, h('b', {}, `${ui.cards.orbitalPeriod}: `), p.astronomy.orbitalPeriod) : null,
        p.astronomy.timePerSign ? h('div', {}, h('b', {}, `${ui.cards.timePerSign}: `), p.astronomy.timePerSign) : null,
        p.astronomy.retrograde ? h('div', {}, h('b', {}, `${ui.cards.retrograde}: `), p.astronomy.retrograde) : null)),
      voice('astrology', [p.short, p.more, p.deep], h('div', {},
        h('div.kw', {}, ...p.keywords.map((k) => h('span', {}, k))),
        p.rules?.length ? h('div.facts', {}, h('b', {}, `${ui.cards.rules}: `), p.rules.map((s) => signs[s].name).join(', ')) : null)),
    );
    let lastGrammar = '';
    const update = (f) => {
      let pt = f.points[id];
      if (!pt && id === 'northNode' && f.sky.nodes) {
        // the North Node is not a scene body; take it from the sky state (true node, as charts use)
        const lon = f.sky.nodes.trueNorth;
        pt = { longitude: lon, signIndex: Math.floor(lon / 30) % 12, house: houseOf(lon, f.houses.cusps) };
      }
      if (!pt) return;
      const sid = signOrder[pt.signIndex];
      // birth chart with unknown time: there are no houses to speak of
      const house = birthTimeUnknownShown(store.get()) ? null : pt.house;
      live.set('sign', 'Sign', `${formatDeg(pt.longitude)}  (${pt.longitude.toFixed(2)}° along the ring)`);
      live.set('house', 'House', house ? `${ordinal(house)} (${houseSystems[f.houses.system].name}${f.houses.fellBack ? ', Placidus undefined here' : ''})` : 'Unknown: houses need the birth time');
      const b = f.sky.bodies[id];
      if (b) {
        live.set('speed', 'Speed', `${b.speed >= 0 ? '+' : ''}${b.speed.toFixed(3)}° per day`);
        live.set('motion', 'Motion', b.retrograde ? 'Retrograde ℞ (appears to move backwards)' : (id === 'sun' || id === 'moon' ? 'Direct (always)' : 'Direct'), b.retrograde ? 'retro' : '');
        live.set('con', 'In front of', `${b.constellation.name}${signOrder.indexOf(sid) !== -1 && signs[sid].name !== b.constellation.name ? ` (sign: ${signs[sid].name})` : ''}`);
        live.set('dist', 'Distance', formatDistance(b.distance, id));
        if (id === 'moon') live.set('phase', 'Phase', `${f.sky.moonPhase.name}, ${(f.sky.moonPhase.illumination * 100).toFixed(0)}% lit`);
        const alt = f.altAz[id];
        live.set('alt', 'From your place', `${alt.alt >= 0 ? 'up' : 'below the horizon'}: altitude ${alt.alt.toFixed(1)}°, azimuth ${alt.az.toFixed(0)}°`);
      } else if (id === 'northNode') {
        live.set('def', 'Defined by', "Where the Moon's orbit crosses the ecliptic heading north (true node)");
      } else {
        live.set('def', 'Defined by', id === 'ascendant' ? `Eastern horizon at ${store.get().location.name}` : `Upper meridian at ${store.get().location.name}`);
      }
      const gk = `${sid}|${house}`;
      if (gk !== lastGrammar) {
        lastGrammar = gk;
        const c = composePlacement(id, sid, house);
        grammar.replaceChildren(
          h('div.voice-tag', { style: { color: 'var(--astrol)' } }, ui.cards.grammar),
          h('div', {}, c.sentence),
          h('div.parts', {}, ...c.parts.map((x) => h('span.part', {}, h('b', {}, x.label), `${x.source}: ${x.text}`))),
          c.reading ? h('div', { style: { marginTop: '8px' } }, h('i', {}, c.reading.title), h('div', {}, richText(c.reading.text, term))) : null,
        );
      }
    };
    update(frame);
    return { el, live: update };
  }

  // ---------------------------------------------------------------- sign card
  function signCard(id, frame) {
    const s = signs[id];
    const occ = h('div.facts');
    const con = s.constellation;
    const el = h('div', {},
      head(s.glyph, s.name, `${s.symbol} · ${s.dates}`, elements[s.element].color),
      h('div.facts', {},
        h('div', {}, h('b', {}, `${ui.cards.element}: `), elements[s.element].name, ' · ', h('b', {}, `${ui.cards.modality}: `), modalities[s.modality].name, ' · ', h('b', {}, `${ui.cards.ruler}: `), planets[s.ruler].name),
        h('div', {}, h('b', {}, 'Slice: '), `${s.startDeg}° to ${s.startDeg + 30}° from the March equinox point`)),
      occ,
      voice('astrology', [s.short, s.more, s.deep], h('div', {}, h('div.kw', {}, ...s.keywords.map((k) => h('span', {}, k))), s.shadow ? h('div.facts', {}, h('b', {}, `${ui.cards.shadow}: `), s.shadow) : null)),
      voice('astronomy', [s.astronomy.short, con?.note], con ? h('div.facts', {}, h('b', {}, `${ui.cards.sunActuallyThere}: `), con.sunActuallyThere) : null),
      id === 'sagittarius' || id === 'scorpio' ? voice('astronomy', [ophiuchus.note]) : null,
    );
    const update = (f) => {
      const here = f.sky.order.filter((b) => signOrder[f.sky.bodies[b].signIndex] === id);
      const angles = ['ascendant', 'midheaven'].filter((a) => signOrder[f.points[a].signIndex] === id);
      const all = [...here, ...angles];
      const key = all.join(',');
      if (occ.dataset.k === key) return;
      occ.dataset.k = key;
      occ.replaceChildren(h('b', {}, 'Here now: '), all.length ? '' : 'nothing',
        ...all.map((b) => h('button.chip', { type: 'button', style: { '--c': planets[b].color }, onclick: () => ctx.select({ kind: 'body', id: b }, 'panel') },
          h('span.g', {}, b === 'ascendant' ? 'AC' : b === 'midheaven' ? 'MC' : planets[b].glyph), planets[b].name)));
    };
    update(frame);
    return { el, live: update };
  }

  // ---------------------------------------------------------------- house card
  function houseCard(n, frame) {
    const hs = houses[n];
    const live = liveList();
    const el = h('div', {},
      head(String(n), hs.name, hs.keywords.slice(0, 4).join(' · '), '#9db7e8'),
      live.el,
      voice('astrology', [hs.short, hs.more]),
      voice('astronomy', [hs.sky]),
      h('div.facts', {}, h('b', {}, `${houseSystems[frame.houses.system].name}: `), houseSystems[frame.houses.system].short),
    );
    const update = (f) => {
      const c = f.houses.cusps;
      live.set('cusp', 'Starts at', formatDeg(c[n - 1]));
      const span = ((c[n % 12] - c[n - 1]) % 360 + 360) % 360;
      live.set('size', 'Size', `${span.toFixed(1)}° of the zodiac`);
      const inside = f.sky.order.filter((b) => f.points[b].house === Number(n)).map((b) => planets[b].name);
      live.set('in', 'Bodies inside', inside.length ? inside.join(', ') : 'none');
    };
    update(frame);
    return { el, live: update };
  }

  // ---------------------------------------------------------------- aspect card
  function aspectCard(key, frame) {
    const [a, b] = key.split('|');
    const live = liveList();
    const body = h('div');
    const el = h('div', {}, body);
    let lastType = null;
    const update = (f) => {
      const x = f.aspects.find((q) => (q.a === a && q.b === b) || (q.a === b && q.b === a));
      const type = x?.aspect ?? null;
      if (type !== lastType) {
        lastType = type;
        if (!type) {
          body.replaceChildren(head('', `${planets[a].name} and ${planets[b].name}`, 'No major aspect right now', '#e9c46f'), live.el,
            h('p.empty-card', {}, 'Run time and watch for the line to appear.'));
        } else {
          const ac = aspectContent[type];
          const c = composeAspect(a, b, type);
          body.replaceChildren(
            head(ac.glyph, c.heading, `${ac.name} · ${ac.angle}°`, ac.color),
            live.el,
            h('div.grammar', {}, h('div.voice-tag', { style: { color: 'var(--astrol)' } }, ui.cards.grammar), c.sentence),
            voice('astronomy', [ac.astronomy.short, ac.astronomy.more]),
            voice('astrology', [ac.short, ac.more, ac.deep]),
            voice('both', [orbText.short, orbText.more]),
          );
        }
      }
      const la = f.points[a]?.longitude, lb = f.points[b]?.longitude;
      if (la !== undefined && lb !== undefined) {
        const sep = Math.abs(((la - lb + 540) % 360) - 180);
        live.set('sep', 'Apart', `${sep.toFixed(2)}° as seen from Earth`);
      }
      if (x) {
        live.set('orb', 'Orb', `${x.orb.toFixed(2)}° from exact (allowed ${x.maxOrb}°)`);
        live.set('ap', 'Trend', x.applying === null ? 'fixed points' : x.applying ? 'applying (getting closer to exact)' : 'separating (moving apart)');
      }
    };
    update(frame);
    return { el, live: update };
  }

  // ---------------------------------------------------------------- glossary term card
  function termCard(key) {
    const t = resolveTerm(key) ?? glossary[key];
    if (!t) return { el: h('div', {}, head('', key, '', '#e9c46f')), live: null };
    return {
      el: h('div', {},
        head('', t.term, ui.cards.glossary, '#e9c46f'),
        voice(t.kind, [t.short, t.more]),
        t.related?.length ? h('div', {}, h('div.section-label', {}, ui.cards.related), h('div.related', {},
          ...t.related.filter((r) => resolveTerm(r)).map((r) => h('button.ghost-btn', { type: 'button', onclick: () => ctx.select({ kind: 'term', id: r }, 'panel') }, resolveTerm(r).term)))) : null),
      live: null,
    };
  }

  // ---------------------------------------------------------------- explainer / default
  function explainerCard(view, frame) {
    const v = ui.views[view];
    const aspList = h('div');
    const el = h('div', {},
      head('', ui.tour.whatAmI, v.label, '#e9c46f'),
      voice('both', [v.whatAmI.short, v.whatAmI.more]),
      h('div.section-label', {}, 'Right now'),
      h('div.facts.eq'),
      aspList,
      h('div.section-label', {}, 'Try'),
      h('ul.note', { style: { paddingLeft: '18px', fontStyle: 'normal' } },
        h('li', {}, 'Click a planet, a sign slice or a ring marker for its card.'),
        h('li', {}, 'Press space to run time; 1, 2, 3 switch views.'),
        h('li', {}, 'Underlined words open a short definition.')),
      h('div.voice.astronomy', {}, h('div.voice-tag', {}, ui.about.title), h('p', {}, ui.about.text)),
    );
    const update = (f) => {
      const eq = el.querySelector('.eq');
      const ec = equinoxConstellation(f.date);
      const k = `${ec.name}|${f.aspects.length}|${Math.floor(f.date.getTime() / 3600000)}`;
      if (eq.dataset.k === k) return;
      eq.dataset.k = k;
      eq.replaceChildren(
        h('div', {}, h('b', {}, '0° Aries lies in front of: '), `${ec.name} (precession has moved it ${f.sky.precession.toFixed(1)}° since 2000 CE)`),
        h('div', {}, h('b', {}, 'Rising sign at '), `${store.get().location.name}: `, signs[f.risingSign].name),
        h('div', {}, h('b', {}, 'Moon: '), `${f.sky.moonPhase.name}, ${(f.sky.moonPhase.illumination * 100).toFixed(0)}% lit`),
      );
      const top = f.aspects.filter((x) => x.a !== 'ascendant' && x.b !== 'ascendant' && x.a !== 'midheaven' && x.b !== 'midheaven').slice(0, 6);
      aspList.replaceChildren(h('div.facts', {}, h('b', {}, 'Tightest aspects:')),
        ...top.map((x) => h('button.aspect-row', { type: 'button', style: { '--c': aspectContent[x.aspect].color }, onclick: () => ctx.select({ kind: 'aspect', id: `${x.a}|${x.b}` }, 'panel') },
          h('span.g', {}, planets[x.a].glyph), h('span.g', {}, aspectContent[x.aspect].glyph), h('span.g', {}, planets[x.b].glyph),
          h('span', {}, `${planets[x.a].name} ${aspectContent[x.aspect].verb} ${planets[x.b].name}`),
          h('span.orb', {}, `${x.orb.toFixed(1)}°`))));
    };
    update(frame);
    return { el, live: update };
  }

  function render(state, frame) {
    const sel = state.selection;
    const key = sel ? `${sel.kind}|${sel.id}` : `explainer|${state.view}`;
    if (current?.key === key) return;
    let card;
    if (!sel) card = explainerCard(state.view, frame);
    else if (sel.kind === 'body') card = bodyCard(sel.id, frame);
    else if (sel.kind === 'sign') card = signCard(sel.id, frame);
    else if (sel.kind === 'house') card = houseCard(Number(sel.id), frame);
    else if (sel.kind === 'aspect') card = aspectCard(sel.id, frame);
    else if (sel.kind === 'term') card = termCard(sel.id);
    else if (sel.kind === 'explainer') card = explainerCard(sel.id, frame);
    else return;
    root.replaceChildren(card.el);
    root.scrollTop = 0;
    current = { key, live: card.live };
  }

  root.classList.toggle('closed', !store.get().panelOpen);
  store.subscribe((s) => root.classList.toggle('closed', !s.panelOpen), ['panelOpen']);

  let acc = 0;
  let lastDate = 0;
  return {
    frame(state, frame, dt) {
      render(state, frame);
      acc += dt;
      const d = frame.date.getTime();
      if (current?.live && (acc > 0.2 || (state.rate === 0 && d !== lastDate))) {
        acc = 0;
        lastDate = d;
        current.live(frame);
      }
    },
  };
}
