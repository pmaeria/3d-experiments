// Event finder for "jump to next/previous ..." buttons.
// All searches take a start Date and {direction: +1 | -1, limitDays} and return the first
// event strictly after (or before) the start, or null if none within limitDays.
// Times are refined by bisection to about 1 second.

import * as A from 'astronomy-engine';
import { MAX_SPEED, SIGNS, BODY_IDS } from './constants.js';
import { wrap180, norm360, bisect } from './math.js';
import { apparentLongitude, longitudeSpeed } from './bodies.js';

const TOL_DAYS = 1 / 86400;
const NUDGE_DAYS = 1 / 1440; // skip 1 minute so an event exactly at the start is not returned again
const ut0 = (date) => A.MakeTime(date).ut;
const lonAt = (id, ut) => apparentLongitude(id, A.MakeTime(ut));

function checkBody(id) {
  if (!BODY_IDS.includes(id)) throw new Error(`Unknown body: ${id}`);
}

/**
 * Root search for f(t) in [-180,180) (degrees) whose rate is bounded by `bound` deg/day.
 * Steps of |f|/bound can never jump over a root; wrap-around jumps (+180 -> -180) are ignored.
 */
function safeStepSearch(f, bound, startUt, dir, limitDays, minStep) {
  const end = startUt + dir * limitDays;
  let t = startUt + dir * NUDGE_DAYS;
  let ft = f(t);
  while (dir > 0 ? t < end : t > end) {
    if (ft === 0) return t;
    const step = Math.max(minStep, (0.95 * Math.abs(ft)) / bound);
    let t2 = t + dir * step;
    if (dir > 0 ? t2 > end : t2 < end) t2 = end;
    const f2 = f(t2);
    if ((ft < 0) !== (f2 < 0) && Math.abs(ft - f2) < 180) {
      return dir > 0 ? bisect(f, t, t2, ft, TOL_DAYS) : bisect(f, t2, t, f2, TOL_DAYS);
    }
    if (t2 === end) break;
    t = t2;
    ft = f2;
  }
  return null;
}

/**
 * Next exact aspect (angle in degrees, e.g. 0, 60, 90, 120, 180) between two bodies.
 * For angles other than 0/180 both the waxing (+angle) and waning (-angle) forms count.
 * Returns {date, bodyA, bodyB, angle, longitudeA, longitudeB} or null.
 * Default limit 600 years (enough for every pair, including Neptune-Pluto).
 */
export function findAspect(bodyA, bodyB, angle, date, { direction = 1, limitDays = 365.25 * 600 } = {}) {
  checkBody(bodyA); checkBody(bodyB);
  if (bodyA === bodyB) throw new Error('Need two different bodies');
  const bound = MAX_SPEED[bodyA] + MAX_SPEED[bodyB];
  const targets = angle % 180 === 0 ? [angle] : [angle, -angle];
  const start = ut0(date);
  let best = null;
  for (const target of targets) {
    const f = (ut) => wrap180(lonAt(bodyA, ut) - lonAt(bodyB, ut) - target);
    const limit = best === null ? limitDays : Math.abs(best - start);
    const t = safeStepSearch(f, bound, start, direction, limit, 0.1 / bound);
    if (t !== null && (best === null || Math.abs(t - start) < Math.abs(best - start))) best = t;
  }
  if (best === null) return null;
  const tm = A.MakeTime(best);
  return {
    date: tm.date, bodyA, bodyB, angle,
    longitudeA: apparentLongitude(bodyA, tm), longitudeB: apparentLongitude(bodyB, tm),
  };
}

const STATION_STEP = { mercury: 1, venus: 2, mars: 2, jupiter: 4, saturn: 4, uranus: 5, neptune: 5, pluto: 5 };

/**
 * Next station (longitude speed changes sign) of a planet (not Sun or Moon).
 * Returns {date, body, type: 'retrograde' (turning backward) | 'direct', longitude} or null.
 */
export function findStation(body, date, { direction = 1, limitDays = 365.25 * 3 } = {}) {
  checkBody(body);
  if (!STATION_STEP[body]) throw new Error(`${body} never stations`);
  const step = STATION_STEP[body];
  const f = (ut) => longitudeSpeed(body, A.MakeTime(ut));
  const start = ut0(date);
  const end = start + direction * limitDays;
  let t = start + direction * NUDGE_DAYS;
  let ft = f(t);
  while (direction > 0 ? t < end : t > end) {
    const t2 = t + direction * step;
    const f2 = f(t2);
    if ((ft < 0) !== (f2 < 0)) {
      const root = direction > 0 ? bisect(f, t, t2, ft, TOL_DAYS) : bisect(f, t2, t, f2, TOL_DAYS);
      const speedBefore = direction > 0 ? ft : f2; // speed just before the station, in forward time
      const tm = A.MakeTime(root);
      return { date: tm.date, body, type: speedBefore > 0 ? 'retrograde' : 'direct', longitude: apparentLongitude(body, tm) };
    }
    t = t2;
    ft = f2;
  }
  return null;
}

/**
 * Next sign ingress of a body (it crosses a multiple of 30 deg, including retrograde re-entries).
 * options.signIndex: only return an ingress INTO that sign (0 = Aries).
 * Returns {date, body, signIndex, sign, fromSignIndex, longitude, retrograde} or null.
 * "into"/"from" are in forward time even when searching backward.
 */
export function findIngress(body, date, { direction = 1, limitDays = 365.25 * 300, signIndex = null } = {}) {
  checkBody(body);
  const bound = MAX_SPEED[body];
  const start = ut0(date);
  const end = start + direction * limitDays;
  const minStep = 0.01 / bound;
  let t = start + direction * NUDGE_DAYS;
  let lon = lonAt(body, t);
  while (direction > 0 ? t < end : t > end) {
    const inSign = lon % 30;
    const step = Math.max(minStep, (0.95 * Math.min(inSign, 30 - inSign)) / bound);
    const t2 = t + direction * step;
    const lon2 = lonAt(body, t2);
    const s1 = Math.floor(lon / 30), s2 = Math.floor(lon2 / 30);
    if (s1 !== s2) {
      // -1 while still in the starting sign s1, +1 after leaving it.
      const g = (ut) => (Math.floor(lonAt(body, ut) / 30) === s1 ? -1 : 1);
      const root = direction > 0 ? bisect(g, t, t2, -1, TOL_DAYS) : bisect(g, t2, t, 1, TOL_DAYS);
      const tm = A.MakeTime(root);
      const from = direction > 0 ? s1 : s2;
      const into = direction > 0 ? s2 : s1;
      if (signIndex === null || signIndex === into) {
        return {
          date: tm.date, body, signIndex: into, sign: SIGNS[into].name, fromSignIndex: from,
          longitude: norm360(apparentLongitude(body, tm)), retrograde: longitudeSpeed(body, tm) < 0,
        };
      }
    }
    t = t2;
    lon = lon2;
  }
  return null;
}

const PHASE_ANGLES = { new: 0, firstQuarter: 90, full: 180, lastQuarter: 270 };

/**
 * Next moon phase. phase: 'new' | 'firstQuarter' | 'full' | 'lastQuarter', or an elongation in degrees.
 * Returns {date, phase, elongation} or null.
 */
export function findMoonPhase(phase, date, { direction = 1 } = {}) {
  const target = typeof phase === 'number' ? phase : PHASE_ANGLES[phase];
  if (target === undefined) throw new Error(`Unknown phase: ${phase}`);
  const start = A.MakeTime(date).AddDays(direction * NUDGE_DAYS);
  const t = A.SearchMoonPhase(target, start, direction * 40);
  return t ? { date: t.date, phase, elongation: target } : null;
}

/** Equinoxes and solstices of an (astronomical-numbered) year, as Dates. */
export function seasons(year) {
  const s = A.Seasons(year);
  return {
    marchEquinox: s.mar_equinox.date,
    juneSolstice: s.jun_solstice.date,
    septemberEquinox: s.sep_equinox.date,
    decemberSolstice: s.dec_solstice.date,
  };
}
