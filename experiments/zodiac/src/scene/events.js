// Named sky events, shared by the tour's {event} dates and the time dial's "Jump to" menu.
// Retrograde jumps land a couple of weeks BEFORE the station so the slowdown is visible.

import {
  seasons, findMoonPhase, findStation, findIngress, findAspect, ASPECTS, addDays, BODIES, SIGNS,
} from '../astro/index.js';

export const RETRO_LEAD_DAYS = { mercury: 14, venus: 18, mars: 21, jupiter: 30, saturn: 30, uranus: 30, neptune: 30, pluto: 30 };

function seasonList(year) {
  const s = seasons(year);
  return [
    { date: s.marchEquinox, label: 'March equinox' },
    { date: s.juneSolstice, label: 'June solstice' },
    { date: s.septemberEquinox, label: 'September equinox' },
    { date: s.decemberSolstice, label: 'December solstice' },
  ];
}

function nextSeason(ref, dir) {
  const y = ref.getUTCFullYear();
  const all = [...seasonList(y - 1), ...seasonList(y), ...seasonList(y + 1)];
  const t = ref.getTime();
  if (dir > 0) return all.find((e) => e.date.getTime() > t + 60000) ?? null;
  return [...all].reverse().find((e) => e.date.getTime() < t - 60000) ?? null;
}

/** The next (dir=1) or previous (dir=-1) retrograde station of a planet, minus a lead time. */
export function retrogradeJump(body, ref, dir = 1) {
  const lead = RETRO_LEAD_DAYS[body] ?? 14;
  // search from the moment we would land, so "next" never returns the one we are sitting before
  let from = dir > 0 ? addDays(ref, lead + 0.01) : addDays(ref, lead - 0.01);
  for (let i = 0; i < 6; i++) {
    const st = findStation(body, from, { direction: dir, limitDays: 365.25 * 3 });
    if (!st) return null;
    if (st.type === 'retrograde') {
      return { date: addDays(st.date, -lead), station: st.date, label: `${BODIES[body].name} turns retrograde`, note: `Station ${lead} days after landing, at ${st.longitude.toFixed(1)}°` };
    }
    from = addDays(st.date, dir * 0.5);
  }
  return null;
}

/**
 * Resolve an event spec relative to `ref`.
 * spec: string name, or {event, body, a, b, aspect, direction}. Returns {date, label, ...} or null.
 * Names: marchEquinox, juneSolstice, septemberEquinox, decemberSolstice (this year's),
 * nextSeason/prevSeason, nextNewMoon/prevNewMoon, nextFullMoon/prevFullMoon,
 * nextMercuryRetrograde/prev..., nextMarsRetrograde/prev..., greatConjunction2020,
 * nextIngress {body}, prevIngress {body}, nextAspect {a, b, aspect}, prevAspect {...}.
 */
export function resolveEvent(spec, ref = new Date()) {
  const s = typeof spec === 'string' ? { event: spec } : spec;
  const name = s.event;
  const y = ref.getUTCFullYear();
  const sz = seasons(y);
  switch (name) {
    case 'marchEquinox': return { date: sz.marchEquinox, label: 'March equinox' };
    case 'juneSolstice': return { date: sz.juneSolstice, label: 'June solstice' };
    case 'septemberEquinox': return { date: sz.septemberEquinox, label: 'September equinox' };
    case 'decemberSolstice': return { date: sz.decemberSolstice, label: 'December solstice' };
    case 'nextSeason': return nextSeason(ref, 1);
    case 'prevSeason': return nextSeason(ref, -1);
    case 'nextNewMoon': case 'prevNewMoon': {
      const r = findMoonPhase('new', ref, { direction: name.startsWith('next') ? 1 : -1 });
      return r && { date: r.date, label: 'New moon' };
    }
    case 'nextFullMoon': case 'prevFullMoon': {
      const r = findMoonPhase('full', ref, { direction: name.startsWith('next') ? 1 : -1 });
      return r && { date: r.date, label: 'Full moon' };
    }
    case 'nextMercuryRetrograde': return retrogradeJump('mercury', ref, 1);
    case 'prevMercuryRetrograde': return retrogradeJump('mercury', ref, -1);
    case 'nextMarsRetrograde': return retrogradeJump('mars', ref, 1);
    case 'prevMarsRetrograde': return retrogradeJump('mars', ref, -1);
    case 'nextRetrograde': return retrogradeJump(s.body, ref, s.direction ?? 1);
    case 'greatConjunction2020': {
      const r = findAspect('jupiter', 'saturn', 0, new Date('2020-12-01T00:00:00Z'), { limitDays: 60 });
      return r && { date: r.date, label: 'Great conjunction of Jupiter and Saturn' };
    }
    case 'nextIngress': case 'prevIngress': {
      if (!s.body || !BODIES[s.body]) return null;
      const r = findIngress(s.body, ref, { direction: name.startsWith('next') ? 1 : -1 });
      return r && { date: r.date, label: `${BODIES[s.body].name} enters ${SIGNS[r.signIndex].name}${r.retrograde ? ' (retrograde)' : ''}` };
    }
    case 'nextAspect': case 'prevAspect': {
      const asp = ASPECTS.find((x) => x.id === s.aspect);
      if (!asp || !BODIES[s.a] || !BODIES[s.b] || s.a === s.b) return null;
      const r = findAspect(s.a, s.b, asp.angle, ref, { direction: name.startsWith('next') ? 1 : -1 });
      return r && { date: r.date, label: `${BODIES[s.a].name} ${asp.name.toLowerCase()} ${BODIES[s.b].name} (exact)` };
    }
    default: return null;
  }
}
