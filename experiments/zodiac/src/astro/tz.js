// Civil local time <-> UTC using historical IANA zone rules from the runtime's Intl (ICU tzdb).
// No library needed: Intl.DateTimeFormat already knows every historical offset (including
// Local Mean Time before standard time, wartime and double summer time).
//
// Special zone ids accepted everywhere a tz is expected:
//   'UTC'  - offset 0
//   'LMT'  - local mean time of the place: offset = longitude / 15 hours (needs lon)

import { makeUtcDate } from './time.js';

const MIN = 60000;
const formatters = new Map();

function formatter(tz) {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', era: 'short',
      year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
    });
    formatters.set(tz, f);
  }
  return f;
}

/** True if the runtime knows this IANA zone id (or it is 'UTC' / 'LMT'). */
export function isValidTimeZone(tz) {
  if (tz === 'UTC' || tz === 'LMT') return true;
  try { formatter(tz); return true; } catch { return false; }
}

/**
 * UTC offset in minutes (may be fractional for LMT) of zone `tz` at UTC instant `date`.
 * Positive east of Greenwich (e.g. +480 for UTC+8).
 */
export function zoneOffsetMinutes(tz, date, lon = null) {
  if (tz === 'UTC') return 0;
  if (tz === 'LMT') {
    if (lon === null || lon === undefined) throw new Error('LMT needs a longitude');
    return (lon / 15) * 60;
  }
  const ms = Math.floor(date.getTime() / 1000) * 1000;
  const p = {};
  for (const part of formatter(tz).formatToParts(new Date(ms))) p[part.type] = part.value;
  let year = Number(p.year);
  if (p.era === 'BC' || p.era === 'B') year = 1 - year;
  const wall = makeUtcDate(year, Number(p.month), Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
  return (wall.getTime() - ms) / MIN;
}

/** Format an offset in minutes as "UTC+07:30" ("UTC+00:53:28" when seconds are present). */
export function formatOffset(minutes) {
  const sign = minutes < 0 ? '-' : '+';
  const totalSec = Math.round(Math.abs(minutes) * 60);
  const h = Math.floor(totalSec / 3600), m = Math.floor((totalSec % 3600) / 60), s = totalSec % 60;
  const base = `UTC${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return s ? `${base}:${String(s).padStart(2, '0')}` : base;
}

/**
 * Convert a civil local date-time in an IANA zone to UTC.
 *
 * local: {year, month (1-12), day, hour = 0, minute = 0, second = 0}
 * tz:    IANA id ('Asia/Kuala_Lumpur'), 'UTC' or 'LMT' (then pass options.lon)
 * options.disambiguation: what to do with clock times that occur twice (DST ends) or never
 *   (DST starts). 'compatible' (default, same as Temporal and most software): ambiguous ->
 *   earlier instant (the pre-transition offset); skipped -> shift forward by the gap.
 *   'earlier' / 'later' pick the corresponding instant in both cases.
 *
 * Returns {
 *   date: Date (UTC instant),
 *   offsetMinutes: offset actually used (positive east), offsetLabel: 'UTC+07:30',
 *   status: 'ok' | 'ambiguous' | 'skipped',
 *   alternatives: [{date, offsetMinutes}] - both candidates when ambiguous; for skipped, the
 *     offsets before/after the gap,
 *   wallClock: {year, month, day, hour, minute, second, offsetMinutes} the zone's clock reading at
 *     `date` (differs from the input only for skipped times),
 *   isLocalMeanTime: true when the zone rule in force is a Local Mean Time entry (offset not a
 *     whole minute, typical before ~1900); the UI may prefer the place's own LMT then.
 * }
 */
export function localToUtc(local, tz, { disambiguation = 'compatible', lon = null } = {}) {
  const { year, month, day, hour = 0, minute = 0, second = 0 } = local;
  const W = makeUtcDate(year, month, day, hour, minute, second).getTime();
  if (Number.isNaN(W)) throw new RangeError('Invalid local date');

  if (tz === 'UTC' || tz === 'LMT') {
    const off = zoneOffsetMinutes(tz, new Date(W), lon);
    const date = new Date(W - off * MIN);
    return {
      date, offsetMinutes: off, offsetLabel: formatOffset(off), status: 'ok',
      alternatives: [{ date, offsetMinutes: off }],
      wallClock: { year, month, day, hour, minute, second, offsetMinutes: off },
      isLocalMeanTime: tz === 'LMT',
    };
  }

  const off = (ms) => zoneOffsetMinutes(tz, new Date(ms));
  // Offsets in force around this wall time; transitions are never closer than ~a day apart.
  const offsets = [...new Set([off(W - 36 * 3600e3), off(W), off(W + 36 * 3600e3)])];
  const candidates = [];
  for (const o of offsets) {
    const t = W - o * MIN;
    if (Math.abs(off(t) - o) < 1e-9 && !candidates.some((c) => c.date.getTime() === t)) {
      candidates.push({ date: new Date(t), offsetMinutes: o });
    }
  }
  candidates.sort((a, b) => a.date - b.date);

  let status, pick, alternatives = candidates;
  if (candidates.length === 1) {
    status = 'ok';
    pick = candidates[0];
  } else if (candidates.length > 1) {
    status = 'ambiguous';
    pick = disambiguation === 'later' ? candidates[candidates.length - 1] : candidates[0];
  } else {
    // Skipped wall time: offsets before and after the gap.
    status = 'skipped';
    const before = off(W - 36 * 3600e3), after = off(W + 36 * 3600e3);
    alternatives = [before, after].map((o) => ({ date: new Date(W - o * MIN), offsetMinutes: o }));
    // 'compatible' and 'later' interpret the time with the pre-gap offset => lands after the gap.
    pick = disambiguation === 'earlier' ? alternatives[1] : alternatives[0];
  }
  // For skipped times, report the offset actually in force at the resulting instant (whose
  // wall clock reads e.g. 03:30 for a requested 02:30); `wallClock` shows that clock reading.
  const o = status === 'skipped' ? off(pick.date.getTime()) : pick.offsetMinutes;
  return {
    date: pick.date,
    offsetMinutes: o,
    offsetLabel: formatOffset(o),
    status,
    alternatives,
    wallClock: utcToLocal(pick.date, tz),
    isLocalMeanTime: Math.abs(o * 60 - Math.round(o) * 60) > 0.5,
  };
}

/** UTC instant to civil local fields in a zone: {year, month, day, hour, minute, second, offsetMinutes}. */
export function utcToLocal(date, tz, { lon = null } = {}) {
  const o = zoneOffsetMinutes(tz, date, lon);
  const w = new Date(date.getTime() + o * MIN);
  return {
    year: w.getUTCFullYear(), month: w.getUTCMonth() + 1, day: w.getUTCDate(),
    hour: w.getUTCHours(), minute: w.getUTCMinutes(), second: w.getUTCSeconds() + w.getUTCMilliseconds() / 1000,
    offsetMinutes: o,
  };
}
