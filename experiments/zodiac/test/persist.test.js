import { describe, it, expect } from 'vitest';
import {
  memoryStorage, createTaskGate, loadTourProgress, saveTourProgress, loadCharts, saveCharts,
  upsertChart, renameChart, removeChart, findChartByMoment, sameMoment,
} from '../src/ui/persist.js';
import { tour } from '../src/content/tour.js';

// Fictional test input only: never put real people's birth data in this public repo.
const INPUT = { name: 'Test', year: 2000, month: 1, day: 1, hour: 12, minute: 0, timeKnown: true, place: { name: 'Greenwich', lat: 51.4769, lon: 0, tz: 'Europe/London' } };

describe('task gate', () => {
  it('state checks must become true after the step starts', () => {
    const g = createTaskGate({ type: 'risingSign', sign: 'leo' });
    expect(g.observe(true)).toBe(false); // already true when the step opened: not counted
    expect(g.observe(true)).toBe(false);
    expect(g.observe(false)).toBe(false);
    expect(g.observe(true)).toBe(true);
    expect(g.done).toBe(true);
    expect(g.observe(true)).toBe(false); // completes once
  });
  it('clicked counts the first click', () => {
    const g = createTaskGate({ type: 'clicked', id: 'mars' });
    expect(g.observe(true)).toBe(true);
  });
  it('view needs a user view change, never the scene itself', () => {
    const g = createTaskGate({ type: 'view', view: 'geo' });
    expect(g.observe(true)).toBe(false);
    g.noteViewChange();
    expect(g.observe(true)).toBe(true);
  });
  it('remembers completed tasks', () => {
    expect(createTaskGate({ type: 'clicked', id: 'x' }, { alreadyDone: true }).done).toBe(true);
    expect(createTaskGate(null).done).toBe(true);
  });
  it('every tour task uses a check type the gate understands', () => {
    const known = ['clicked', 'view', 'bodyInSign', 'aspect', 'retrograde', 'risingSign', 'birthEntered'];
    for (const s of tour.filter((x) => x.task)) expect(known).toContain(s.task.check.type);
  });
});

describe('tour progress', () => {
  it('round-trips and clamps', () => {
    const st = memoryStorage();
    expect(loadTourProgress(st, 40)).toEqual({ index: 0, active: false, done: {}, visited: {} });
    saveTourProgress(st, { index: 99, active: true, done: { a: true }, visited: {} });
    const p = loadTourProgress(st, 40);
    expect(p.index).toBe(39);
    expect(p.active).toBe(true);
    expect(p.done.a).toBe(true);
  });
  it('survives junk', () => {
    const st = memoryStorage();
    st.setItem('zodiac.tour', '{not json');
    expect(loadTourProgress(st, 40).index).toBe(0);
  });
});

describe('saved charts', () => {
  it('add, rename, update, delete', () => {
    const st = memoryStorage();
    let { list, entry } = upsertChart(loadCharts(st), INPUT);
    expect(list).toHaveLength(1);
    ({ list } = upsertChart(list, { ...INPUT, name: 'Friend', day: 2 }));
    expect(list).toHaveLength(2);
    list = renameChart(list, entry.id, '  Renamed  ');
    expect(list[0].input.name).toBe('Renamed');
    ({ list } = upsertChart(list, { ...INPUT, hour: 13 }, entry.id));
    expect(list).toHaveLength(2);
    expect(list[0].input.hour).toBe(13);
    saveCharts(st, list);
    expect(loadCharts(st)).toEqual(list);
    list = removeChart(list, entry.id);
    expect(list.map((c) => c.input.name)).toEqual(['Friend']);
  });
  it('recognises the same moment regardless of names', () => {
    const { list } = upsertChart([], INPUT);
    expect(findChartByMoment(list, { ...INPUT, name: 'Other', place: { ...INPUT.place, name: 'X' } })).toBeTruthy();
    expect(sameMoment(INPUT, { ...INPUT, minute: 1 })).toBe(false);
    expect(sameMoment({ ...INPUT, timeKnown: false, hour: 3 }, { ...INPUT, timeKnown: false, hour: 12 })).toBe(true);
  });
});
