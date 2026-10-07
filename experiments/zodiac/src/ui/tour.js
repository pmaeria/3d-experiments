// The guided tour player. Renders into #modePanel while state.mode === 'tour': chapter list and
// progress, the step text with glossary links, "Tell me more", the "Look for" pointer, the
// step's task, Back / Next, and keyboard ← →. Each step resets the click log, then applies its
// scene; the tour sets the scene up but never locks it. Progress lives in localStorage.

import { ui, tour, chapters } from '../content/index.js';
import { resolveScene, resolveDate } from '../scene/applyScene.js';
import { h, richText } from './dom.js';
import { browserStorage, loadTourProgress, saveTourProgress, createTaskGate } from './persist.js';

const VOICE_LABEL = { astronomy: ui.voices.astronomy.label, astrology: ui.voices.astrology.label, both: ui.voices.both.label };
const chapterIndex = Object.fromEntries(chapters.map((c, i) => [c.id, i]));
const firstStepOf = (chapterId) => tour.findIndex((s) => s.chapter === chapterId);
const fmt = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k]);

export function initTour(ctx) {
  const { app, store } = ctx;
  const storage = browserStorage();
  const root = document.getElementById('modePanel');
  const fade = document.getElementById('sceneFade');
  const progress = loadTourProgress(storage, tour.length);

  let index = progress.index;
  let gate = null;
  let applying = false;
  let birthMissing = false;
  let chaptersOpen = false;
  let pendingTimer = null;
  let el = null; // rendered refs

  const save = () => saveTourProgress(storage, progress);
  const active = () => store.get().mode === 'tour';
  const term = (k, a) => ctx.openTerm(k, a);

  // a user view switch is what a 'view' task waits for; the scene's own switch never counts
  store.subscribe(() => { if (!applying && active()) gate?.noteViewChange(); }, ['view']);

  // ---------------------------------------------------------------- scene
  function applyStep(step) {
    applying = true;
    let res;
    try {
      app.checks.reset();
      res = app.applyScene(step.scene);
    } finally { applying = false; }
    if (res?.errors?.length) console.warn('Tour scene:', step.id, res.errors);
    birthMissing = !!res?.birthMissing;
    gate = step.task ? createTaskGate(step.task.check, { alreadyDone: !!progress.done[step.id] }) : null;
    render();
  }

  /** Should the change of scene dip to dark? Not when the view morphs (let it play). */
  function wantsFade(step) {
    if (app.reduced) return false;
    const st = store.get();
    const d = resolveScene(step.scene);
    if (d.view !== st.view) return false;
    let target;
    try { target = resolveDate(d.date, { chart: st.chart }).date; } catch { return false; }
    const jump = Math.abs(target.getTime() - st.date.getTime()) > 2 * 86400000;
    return jump || (d.zoom ?? 'inner') !== st.zoom;
  }

  function goTo(i, { animate = true } = {}) {
    index = Math.max(0, Math.min(tour.length - 1, i));
    const step = tour[index];
    progress.index = index;
    progress.visited[step.id] = true;
    save();
    gate = null;
    chaptersOpen = false;
    clearTimeout(pendingTimer);
    if (animate && wantsFade(step)) {
      fade.classList.add('on');
      pendingTimer = setTimeout(() => {
        applyStep(step);
        requestAnimationFrame(() => fade.classList.remove('on'));
      }, 190);
      render(); // the text changes at once; the scene follows under the dip
    } else {
      fade.classList.remove('on');
      applyStep(step);
    }
  }

  // ---------------------------------------------------------------- enter / leave
  function enter({ at = null } = {}) {
    if (ctx.modes.current() === 'chart') ctx.modes.leaveChart({ silent: true });
    progress.active = true;
    save();
    store.patch({ mode: 'tour', panelOpen: true, wheelExpanded: false });
    store.emit('mode', { mode: 'tour' });
    goTo(at ?? index, { animate: true });
  }

  function leave({ finished = false } = {}) {
    clearTimeout(pendingTimer);
    fade.classList.remove('on');
    gate = null;
    progress.active = false;
    save();
    if (store.get().mode === 'tour') {
      store.patch({ mode: 'explore', highlight: { signs: [], bodies: [], aspect: null }, stopAt: null, birthMissing: false, selection: null });
      store.emit('mode', { mode: 'explore' });
    }
    root.replaceChildren();
    if (finished) ctx.toast('Tour complete. The sky is yours: everything stays as it is.', 4200);
  }

  // ---------------------------------------------------------------- render
  function progressBar() {
    const bar = h('div.tour-progress', { role: 'img', 'aria-label': fmt(ui.tour.stepOf, { n: index + 1, total: tour.length }) });
    let lastChapter = null;
    tour.forEach((s, i) => {
      if (s.chapter !== lastChapter && lastChapter !== null) bar.append(h('span.gap'));
      lastChapter = s.chapter;
      const cls = i === index ? 'cur' : progress.visited[s.id] ? 'seen' : '';
      bar.append(h('span', { class: `seg ${cls}`, title: `${chapters[chapterIndex[s.chapter]].number}. ${s.title}` }));
    });
    return bar;
  }

  function chapterList() {
    const list = h('ol.tour-chapters', { 'aria-label': 'Chapters' });
    for (const c of chapters) {
      const steps = tour.filter((s) => s.chapter === c.id);
      const seen = steps.filter((s) => progress.visited[s.id]).length;
      const cur = tour[index].chapter === c.id;
      list.append(h('li', {}, h('button', {
        type: 'button', class: cur ? 'cur' : '', 'aria-current': cur ? 'step' : null,
        onclick: () => goTo(firstStepOf(c.id)),
      },
      h('span.num', {}, String(c.number)),
      h('span.txt', {}, h('b', {}, c.title), h('small', {}, c.summary)),
      h('span.cnt', { title: `${seen} of ${steps.length} steps seen` }, seen === steps.length ? '✓' : `${seen}/${steps.length}`))));
    }
    list.append(h('li.restart', {}, h('button.link-btn', {
      type: 'button',
      onclick: () => { progress.done = {}; progress.visited = {}; goTo(0); },
    }, ui.tour.restart)));
    return list;
  }

  function taskBox(step) {
    const done = gate?.done;
    const already = gate?.alreadyTrue;
    const box = h('div', { class: `tour-task${done ? ' done' : ''}`, role: 'status' },
      h('span.tick', { 'aria-hidden': 'true' }, done ? '✓' : ''),
      h('div', {},
        h('div.task-label', {}, done ? ui.tour.taskDone : 'Your turn'),
        h('div.task-prompt', {}, step.task.prompt),
        done ? null : h('div.note', {}, already
          ? 'That happens to be true at this very moment. Let time run on and watch it come round again.'
          : ui.tour.taskHint)));
    return box;
  }

  /** Swap just the task box and the Next button (keeps "Tell me more" and scroll as they are). */
  let taskShown = '';
  function refreshTask() {
    const step = tour[index];
    if (!step.task || !el?.wrap?.isConnected) return;
    const key = `${step.id}|${gate?.done}|${gate?.alreadyTrue}`;
    if (key === taskShown) return;
    taskShown = key;
    root.querySelector('.tour-task')?.replaceWith(taskBox(step));
    const isLast = index === tour.length - 1;
    const pending = gate && !gate.done;
    el.next.className = `brass-btn next${pending ? ' skip' : gate?.done ? ' ready' : ''}`;
    el.next.textContent = isLast ? 'Finish' : pending ? 'Skip ▸' : `${ui.tour.next} ▸`;
  }

  function extras(step) {
    const out = [];
    const st = store.get();
    const usesBirth = step.scene.date === 'birth' || step.scene.location === 'birth';
    if (usesBirth && birthMissing) {
      out.push(h('div.tour-hint', {},
        h('p', {}, `This step shows a birth sky, but no birth details are entered yet, so you are seeing today's sky over ${st.location.name}.`),
        h('button.brass-btn', { type: 'button', onclick: () => ctx.modes.openBirthForm() }, 'Enter birth details')));
    } else if (usesBirth && st.chart) {
      const nm = st.chart.input.name;
      const row = h('div.tour-hint.ok', {},
        h('p', {}, nm ? `Showing the birth sky of ${nm}.` : 'Showing the birth sky you entered.'),
        h('div.row', {},
          h('button.ghost-btn', { type: 'button', onclick: () => ctx.modes.openBirthForm({ edit: true }) }, 'Change birth details'),
          step.id === 'yours-share' ? h('button.brass-btn', { type: 'button', onclick: () => ctx.modes.copyLink() }, 'Copy share link') : null,
          h('button.ghost-btn', { type: 'button', onclick: () => ctx.modes.enterChart() }, 'Open in Your chart')));
      out.push(row);
    }
    return out;
  }

  function render() {
    if (!active()) return;
    const step = tour[index];
    const ch = chapters[chapterIndex[step.chapter]];
    const isLast = index === tour.length - 1;
    const taskPending = gate && !gate.done;

    const deeper = step.deeper ? h('div.tour-deeper', { hidden: true }, richText(step.deeper, term)) : null;
    const moreBtn = step.deeper ? h('button.link-btn', {
      type: 'button', 'aria-expanded': 'false',
      onclick: () => {
        const open = deeper.hidden;
        deeper.hidden = !open;
        moreBtn.textContent = open ? ui.cards.showLess : ui.tour.tellMeMore;
        moreBtn.setAttribute('aria-expanded', String(open));
      },
    }, ui.tour.tellMeMore) : null;

    const back = h('button.ghost-btn', { type: 'button', disabled: index === 0, onclick: () => goTo(index - 1), title: `${ui.tour.back} (←)` }, `◂ ${ui.tour.back}`);
    const next = h('button', {
      type: 'button', class: `brass-btn next${taskPending ? ' skip' : gate?.done ? ' ready' : ''}`,
      title: `${isLast ? 'Finish the tour' : taskPending ? 'Skip this task' : ui.tour.next} (→)`,
      onclick: () => (isLast ? leave({ finished: true }) : goTo(index + 1)),
    }, isLast ? 'Finish' : taskPending ? 'Skip ▸' : `${ui.tour.next} ▸`);

    const stepEl = h('div.tour-step', {},
      h('div', { class: `voice-tag tv-${step.voice}`, title: ui.voices[step.voice].help }, VOICE_LABEL[step.voice]),
      h('h2.tour-title', {}, step.title),
      h('div', { class: `voice ${step.voice} tour-body` }, richText(step.body, term), deeper, moreBtn ? h('div.disclose', {}, moreBtn) : null),
      step.lookFor ? h('div.look-for', {}, h('span.lf-icon', { 'aria-hidden': 'true' }, '◎'), h('span', {}, h('b', {}, `${ui.tour.lookFor}: `), step.lookFor)) : null,
      ...extras(step),
      step.task ? taskBox(step) : null,
      h('div.tour-reset', {}, h('button.link-btn', { type: 'button', title: 'Put the scene back the way this step set it up', onclick: () => goTo(index, { animate: false }) }, 'Reset this step')),
    );

    const top = h('div.tour-top', {},
      h('button.tour-ch-btn', {
        type: 'button', 'aria-expanded': String(chaptersOpen), title: 'All chapters',
        onclick: () => { chaptersOpen = !chaptersOpen; render(); },
      }, h('span.ch-n', {}, `${ui.tour.chapter} ${ch.number} of ${chapters.length}`), h('span.ch-t', {}, ch.title), h('span.caret', { 'aria-hidden': 'true' }, chaptersOpen ? '▴' : '▾')),
      h('button.card-close', { type: 'button', title: 'Leave the tour (you can resume where you left off)', 'aria-label': 'Leave the tour', onclick: () => leave() }, '×'));

    const prevStep = el?.stepId;
    const wrap = h('div.tour', { role: 'region', 'aria-label': 'Guided tour' },
      top,
      progressBar(),
      chaptersOpen ? chapterList() : stepEl,
      h('div.tour-nav', {}, back, h('span.tour-count', {}, fmt(ui.tour.stepOf, { n: index + 1, total: tour.length })), next));
    root.replaceChildren(wrap);
    if (prevStep !== step.id && !chaptersOpen) stepEl.classList.add('enter');
    el = { stepId: step.id, next, wrap };
    taskShown = `${step.id}|${gate?.done}|${gate?.alreadyTrue}`;
  }

  function celebrate() {
    const step = tour[index];
    progress.done[step.id] = true;
    save();
    refreshTask();
    const box = root.querySelector('.tour-task');
    if (box && !app.reduced) {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        box.append(h('span.spark', { 'aria-hidden': 'true', style: { '--dx': `${Math.cos(a) * 46}px`, '--dy': `${Math.sin(a) * 30}px`, animationDelay: `${i * 18}ms` } }, '✦'));
      }
    }
    // a card may be covering the tour panel (clicked tasks open cards): tell them anyway
    ctx.toast(`✓ ${ui.tour.taskDone}${index < tour.length - 1 ? ' Next is unlocked.' : ''}`, 2600);
  }

  // ---------------------------------------------------------------- keyboard ← →
  window.addEventListener('keydown', (e) => {
    if (!active()) return;
    if (e.key === 'Escape' && chaptersOpen) { chaptersOpen = false; render(); e.stopImmediatePropagation(); return; }
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    const t = e.target;
    const tag = t?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (t?.classList?.contains('track') || t?.closest?.('#timedial, .menu, #modal:not([hidden])')) return;
    if (!document.getElementById('modal').hidden) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.key === 'ArrowRight') { if (index < tour.length - 1) goTo(index + 1); }
    else if (index > 0) goTo(index - 1);
  }, true);

  return {
    enter, leave,
    /** Jump to step i (0-based) while the tour is open. */
    goTo: (i, opts) => { if (active()) goTo(i, opts); },
    get index() { return index; },
    get taskDone() { return !!gate?.done; },
    get resumable() { return progress.index > 0 || Object.keys(progress.visited).length > 0; },
    get wasActive() { return progress.active; },
    /** Re-apply the current step (e.g. after the birth form fills in the chart). */
    reapply() { if (active()) goTo(index, { animate: false }); },
    frame() {
      if (!active() || !gate || gate.done || applying) return;
      const step = tour[index];
      if (gate.observe(app.check(step.task.check))) celebrate();
      else refreshTask();
    },
  };
}
