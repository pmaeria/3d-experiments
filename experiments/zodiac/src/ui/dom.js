// Small DOM helpers, rich text with glossary links, and formatting.

import { parseLinks, resolveTerm } from '../content/index.js';
import { utcToLocal, formatYear, SIGNS, formatOffset, zoneOffsetMinutes } from '../astro/index.js';

/** h('div.cls#id', {attrs}, children...) */
export function h(tag, attrs = {}, ...children) {
  const m = tag.match(/^([a-z0-9-]+)((?:[.#][\w-]+)*)$/i);
  const el = document.createElement(m ? m[1] : tag);
  if (m && m[2]) {
    for (const part of m[2].match(/[.#][\w-]+/g)) {
      if (part[0] === '.') el.classList.add(part.slice(1)); else el.id = part.slice(1);
    }
  }
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') {
      // custom properties (--c) need setProperty; Object.assign silently drops them
      for (const [sk, sv] of Object.entries(v)) {
        if (sk.startsWith('--')) el.style.setProperty(sk, sv); else el.style[sk] = sv;
      }
    }
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/**
 * Text with [[term]] / [[term|text]] links turned into glossary buttons. Paragraph breaks
 * (blank lines) become <p>. onTerm(key, anchorEl) opens the popover.
 */
export function richText(text, onTerm, { paragraphs = true } = {}) {
  const frag = document.createDocumentFragment();
  const paras = paragraphs ? String(text).split(/\n\s*\n/) : [String(text)];
  for (const para of paras) {
    const p = paragraphs ? document.createElement('p') : document.createElement('span');
    const parts = parseLinks(para);
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (typeof part === 'string') { p.append(part); continue; }
      const known = !!resolveTerm(part.key);
      if (!known) { p.append(part.text); continue; }
      const b = h('button.term', { type: 'button', 'data-term': part.key, 'aria-haspopup': 'dialog' }, part.text);
      b.addEventListener('click', (e) => { e.stopPropagation(); onTerm?.(part.key, b); });
      // a button is an atomic inline, so the line could break between it and the punctuation
      // that follows ("conjunction / ; planets"): keep that punctuation glued to it
      const next = parts[i + 1];
      const punct = typeof next === 'string' ? /^[,.;:!?)\]’”'"]+/.exec(next)?.[0] : null;
      if (punct) {
        p.append(h('span.term-wrap', {}, b, punct));
        parts[i + 1] = next.slice(punct.length);
      } else p.append(b);
    }
    frag.append(p);
  }
  return frag;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');

/** "21 Dec 2020 CE, 18:20" from calendar fields (astronomical year numbering). */
export function formatFields(f, { seconds = false } = {}) {
  const yr = f.year >= 1000 && f.year <= 9999 ? String(f.year) : formatYear(f.year);
  const y = f.year >= 1000 && f.year <= 9999 ? yr : yr;
  return `${f.day} ${MONTHS[f.month - 1]} ${y}, ${pad(f.hour)}:${pad(f.minute)}${seconds ? `:${pad(Math.floor(f.second))}` : ''}`;
}

export function utcFields(date) {
  return {
    year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(),
    hour: date.getUTCHours(), minute: date.getUTCMinutes(), second: date.getUTCSeconds(),
  };
}

/** Local fields at a place (IANA tz, else local mean time from longitude). */
export function localFields(date, location) {
  try {
    if (location.tz) return utcToLocal(date, location.tz);
  } catch { /* fall through */ }
  return utcToLocal(date, 'LMT', { lon: location.lon });
}

export function offsetLabel(date, location) {
  try {
    const m = location.tz ? zoneOffsetMinutes(location.tz, date) : zoneOffsetMinutes('LMT', date, location.lon);
    return formatOffset(m);
  } catch { return ''; }
}

/** 14°03' Virgo (truncated minutes, astrological convention). */
export function formatDeg(lon, { glyph = false } = {}) {
  const l = ((lon % 360) + 360) % 360;
  const si = Math.floor(l / 30);
  const dIn = l - si * 30;
  const tot = Math.floor(dIn * 60 + 1e-6);
  const s = SIGNS[si];
  return `${Math.floor(tot / 60)}°${pad(tot % 60)}' ${glyph ? s.glyph + '︎' : s.name}`;
}

export function formatDistance(au, id) {
  if (id === 'moon') return `${Math.round(au * 149597870.7).toLocaleString('en-GB')} km`;
  const km = au * 149597870.7;
  const mkm = km / 1e6;
  return `${au.toFixed(au < 2 ? 3 : 2)} AU (${mkm >= 1000 ? `${(mkm / 1000).toFixed(2)} billion` : `${Math.round(mkm)} million`} km)`;
}

export const glyphText = (g) => (g && !g.endsWith('︎') && /[☀-⛿]/.test(g) ? g + '︎' : g);
