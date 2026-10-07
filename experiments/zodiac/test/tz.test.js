// Civil time -> UTC with historical zone rules.

import { describe, it, expect } from 'vitest';
import { localToUtc, utcToLocal, formatOffset, zoneOffsetMinutes, isValidTimeZone } from '../src/astro/index.js';

describe('historical offsets', () => {
  it('Asia/Kuala_Lumpur: UTC+7:30 in 1981, UTC+8 from 1982', () => {
    const a = localToUtc({ year: 1981, month: 6, day: 15, hour: 12 }, 'Asia/Kuala_Lumpur');
    expect(a.offsetMinutes).toBe(450);
    expect(a.offsetLabel).toBe('UTC+07:30');
    expect(a.date.toISOString()).toBe('1981-06-15T04:30:00.000Z');
    const b = localToUtc({ year: 1982, month: 6, day: 15, hour: 12 }, 'Asia/Kuala_Lumpur');
    expect(b.offsetMinutes).toBe(480);
    expect(b.date.toISOString()).toBe('1982-06-15T04:00:00.000Z');
  });

  it('Europe/London mid-1970 was UTC+1 (British Standard Time, all year 1968-71)', () => {
    expect(localToUtc({ year: 1970, month: 7, day: 1, hour: 12 }, 'Europe/London').offsetMinutes).toBe(60);
    expect(localToUtc({ year: 1970, month: 1, day: 15, hour: 12 }, 'Europe/London').offsetMinutes).toBe(60);
    expect(localToUtc({ year: 1975, month: 1, day: 15, hour: 12 }, 'Europe/London').offsetMinutes).toBe(0);
  });

  it('wartime double summer time (Europe/London 1944 = UTC+2)', () => {
    expect(localToUtc({ year: 1944, month: 6, day: 6, hour: 12 }, 'Europe/London').offsetMinutes).toBe(120);
  });

  it('Local Mean Time before standard time is flagged', () => {
    const r = localToUtc({ year: 1850, month: 1, day: 1, hour: 12 }, 'America/New_York');
    expect(r.offsetLabel).toBe('UTC-04:56:02');
    expect(r.isLocalMeanTime).toBe(true);
  });
});

describe('DST gaps and overlaps (America/New_York 2021)', () => {
  it('gap: 02:30 on 14 March did not exist', () => {
    const r = localToUtc({ year: 2021, month: 3, day: 14, hour: 2, minute: 30 }, 'America/New_York');
    expect(r.status).toBe('skipped');
    // 'compatible' (default): pushed forward by the gap -> 03:30 EDT = 07:30 UTC.
    expect(r.date.toISOString()).toBe('2021-03-14T07:30:00.000Z');
    expect(r.offsetMinutes).toBe(-240);
    expect(r.wallClock.hour).toBe(3);
    const e = localToUtc({ year: 2021, month: 3, day: 14, hour: 2, minute: 30 }, 'America/New_York', { disambiguation: 'earlier' });
    expect(e.date.toISOString()).toBe('2021-03-14T06:30:00.000Z');
    expect(e.wallClock.hour).toBe(1);
  });

  it('overlap: 01:30 on 7 November happened twice', () => {
    const r = localToUtc({ year: 2021, month: 11, day: 7, hour: 1, minute: 30 }, 'America/New_York');
    expect(r.status).toBe('ambiguous');
    expect(r.alternatives).toHaveLength(2);
    expect(r.date.toISOString()).toBe('2021-11-07T05:30:00.000Z'); // first (EDT)
    expect(r.offsetMinutes).toBe(-240);
    const l = localToUtc({ year: 2021, month: 11, day: 7, hour: 1, minute: 30 }, 'America/New_York', { disambiguation: 'later' });
    expect(l.date.toISOString()).toBe('2021-11-07T06:30:00.000Z'); // second (EST)
    expect(l.offsetMinutes).toBe(-300);
  });

  it('ordinary times are unambiguous', () => {
    const r = localToUtc({ year: 2021, month: 7, day: 4, hour: 9, minute: 15 }, 'America/New_York');
    expect(r.status).toBe('ok');
    expect(r.date.toISOString()).toBe('2021-07-04T13:15:00.000Z');
  });
});

describe('special zones and helpers', () => {
  it('UTC and LMT', () => {
    expect(localToUtc({ year: 2000, month: 1, day: 1, hour: 0 }, 'UTC').date.toISOString()).toBe('2000-01-01T00:00:00.000Z');
    const lmt = localToUtc({ year: 1, month: 3, day: 1, hour: 12 }, 'LMT', { lon: 30 });
    expect(lmt.offsetMinutes).toBe(120);
    expect(lmt.date.toISOString()).toBe('0001-03-01T10:00:00.000Z');
  });

  it('southern hemisphere DST (Australia/Sydney January = UTC+11)', () => {
    expect(localToUtc({ year: 2024, month: 1, day: 15, hour: 12 }, 'Australia/Sydney').offsetMinutes).toBe(660);
    expect(localToUtc({ year: 2024, month: 7, day: 15, hour: 12 }, 'Australia/Sydney').offsetMinutes).toBe(600);
  });

  it('utcToLocal inverts localToUtc', () => {
    const r = localToUtc({ year: 1995, month: 8, day: 9, hour: 21, minute: 45 }, 'Asia/Kolkata');
    const back = utcToLocal(r.date, 'Asia/Kolkata');
    expect([back.year, back.month, back.day, back.hour, back.minute]).toEqual([1995, 8, 9, 21, 45]);
    expect(zoneOffsetMinutes('Asia/Kolkata', r.date)).toBe(330);
  });

  it('formatOffset and isValidTimeZone', () => {
    expect(formatOffset(-210)).toBe('UTC-03:30');
    expect(formatOffset(0)).toBe('UTC+00:00');
    expect(isValidTimeZone('Europe/Paris')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus_Mons')).toBe(false);
  });
});
