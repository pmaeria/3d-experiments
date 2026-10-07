// Time helpers. All instants are JS Dates (UTC). Calendar is proleptic Gregorian with
// astronomical year numbering (year 0 = 1 BCE, year -99 = 100 BCE), the same as JS Date.

import * as A from 'astronomy-engine';

const MS_PER_DAY = 86400000;

/**
 * Supported date range (years, astronomical numbering), measured against JPL Horizons (DE441)
 * apparent ecliptic-of-date longitudes in Terrestrial Time. See README "Date range".
 *  - accurate  1000..3000 CE: Sun, Moon and planets within 0.05 deg.
 *  - good     -1000..4000:    planets within ~0.3 deg (Pluto ~0.6), Moon within ~0.6 deg.
 *  - supported -3000..6000:   computed but approximate: planets up to ~0.6 deg (Pluto ~0.7), Moon up to ~2 deg.
 *  Outside `supported`, getSkyState throws RangeError; use clampDate for scrubbers.
 * On top of this, Delta T (Earth-rotation) uncertainty grows before ~1600, which shifts the
 * Moon and especially the Ascendant/houses for a given clock time.
 */
export const DATE_RANGE = Object.freeze({
  accurate: Object.freeze({ minYear: 1000, maxYear: 3000 }),
  good: Object.freeze({ minYear: -1000, maxYear: 4000 }),
  supported: Object.freeze({ minYear: -3000, maxYear: 6000 }),
});

/** Convert Date | AstroTime | number (UT days since J2000) to an astronomy-engine AstroTime. */
export function toTime(date) {
  return A.MakeTime(date);
}

/** Build a UTC Date from calendar fields. Works for years < 100 and negative years. */
export function makeUtcDate(year, month = 1, day = 1, hour = 0, minute = 0, second = 0) {
  const d = new Date(Date.UTC(2000, 0, 1, 0, 0, 0));
  d.setUTCFullYear(year, month - 1, day);
  d.setUTCHours(hour, minute, 0, 0);
  return new Date(d.getTime() + second * 1000);
}

/** Add (fractional) days to a Date, returning a new Date. */
export function addDays(date, days) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/** Decimal year of a Date (UTC). */
export function decimalYear(date) {
  const y = date.getUTCFullYear();
  const start = makeUtcDate(y, 1, 1).getTime();
  const end = makeUtcDate(y + 1, 1, 1).getTime();
  return y + (date.getTime() - start) / (end - start);
}

/** "2020 CE", "131 BCE" style label for an astronomical year number. */
export function formatYear(year) {
  return year <= 0 ? `${1 - year} BCE` : `${year} CE`;
}

/**
 * How well the engine supports a date.
 * Returns {level: 'accurate'|'good'|'approximate'|'unsupported', year, notes: string[]}.
 */
export function dateSupport(date) {
  const year = decimalYear(date);
  const notes = [];
  const { accurate, good, supported } = DATE_RANGE;
  const inside = (r) => year >= r.minYear && year < r.maxYear + 1;
  let level;
  if (inside(accurate)) level = 'accurate';
  else if (inside(good)) {
    level = 'good';
    notes.push('Far from 2000 CE: planet positions good to a few tenths of a degree, the Moon to about half a degree.');
  } else if (inside(supported)) {
    level = 'approximate';
    notes.push('Very far from 2000 CE: planets may be off by up to ~0.5 degree and the Moon by up to ~2 degrees.');
  } else {
    level = 'unsupported';
    notes.push(`Outside ${formatYear(supported.minYear)} to ${formatYear(supported.maxYear)}: not computed.`);
  }
  if (year < 1600 && level !== 'unsupported') {
    notes.push('Earth-rotation (Delta T) is uncertain before ~1600, so the Moon, Ascendant and houses for a given clock time are uncertain.');
  }
  if (year < 1582.8) notes.push('Dates are proleptic Gregorian (not the Julian calendar used historically).');
  return { level, year, notes };
}

/** Clamp a Date into DATE_RANGE.supported. */
export function clampDate(date) {
  const { minYear, maxYear } = DATE_RANGE.supported;
  const min = makeUtcDate(minYear, 1, 1).getTime();
  const max = makeUtcDate(maxYear, 12, 31, 23, 59).getTime();
  const t = date.getTime();
  return t < min ? new Date(min) : t > max ? new Date(max) : date;
}

/** Throw a RangeError if the date is outside the supported range. */
export function assertSupported(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) throw new TypeError('Expected a valid Date');
  const s = dateSupport(date);
  if (s.level === 'unsupported') throw new RangeError(s.notes[0]);
  return s;
}

export { MS_PER_DAY };
