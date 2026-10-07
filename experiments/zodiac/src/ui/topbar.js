// Top bar: view switcher with the one-line descriptions, the mode buttons (Tour, Your chart) and the
// "What am I looking at?" button.

import { ui } from '../content/index.js';
import { h } from './dom.js';

const VIEWS = ['helio', 'geo', 'sky'];
const SCALE_NOTE = {
  helio: 'Directions and distances true · body sizes enlarged, not to scale',
  geoCompressed: 'Directions exact · distances squeezed so all ten fit · sizes enlarged',
  geoTrue: 'Directions exact · true distances · sizes enlarged',
  sky: 'Directions exact · drag to look around · scroll to zoom',
};

export function initTopbar(ctx) {
  const { store } = ctx;
  const nav = document.getElementById('views');
  const buttons = {};
  VIEWS.forEach((v, i) => {
    const b = h('button', {
      type: 'button', 'aria-pressed': 'false', title: ui.views[v].sentence,
      onclick: () => store.patch({ view: v }),
    }, ui.views[v].label, h('kbd', {}, String(i + 1)));
    buttons[v] = b;
    nav.append(b);
  });

  const modes = document.getElementById('modes');
  // Mode buttons: the tour player (ui/tour.js) and Your chart (ui/chartmode.js), coordinated
  // by ctx.modes (ui/index.js). Both set state.mode and emit 'mode' on the store.
  const tourBtn = h('button.brass-btn', {
    type: 'button', 'aria-pressed': 'false', title: ui.tour.start,
    onclick: () => ctx.modes.toggleTour(),
  }, '✦ Tour');
  const chartBtn = h('button.brass-btn', {
    type: 'button', 'aria-pressed': 'false', title: ui.birthForm.intro,
    onclick: () => ctx.modes.toggleChart(),
  }, 'Your chart');
  const help = h('button.brass-btn#helpBtn', {
    type: 'button', title: ui.tour.whatAmI, 'aria-label': ui.tour.whatAmI,
    onclick: () => ctx.select({ kind: 'explainer', id: store.get().view }, 'help'),
  }, '?');
  const info = h('button.brass-btn#infoBtn', {
    type: 'button', title: 'Show or hide the information panel', 'aria-label': 'Information panel', 'aria-pressed': 'true',
    onclick: () => store.patch({ panelOpen: !store.get().panelOpen }),
  }, 'Info');
  modes.append(tourBtn, chartBtn, info, help);

  const sentence = document.getElementById('viewSentence');
  const render = (s) => {
    for (const v of VIEWS) buttons[v].setAttribute('aria-pressed', String(s.view === v));
    tourBtn.setAttribute('aria-pressed', String(s.mode === 'tour'));
    tourBtn.title = s.mode === 'tour' ? 'Leave the tour (you can resume later)' : ctx.modes?.tourResumable ? ui.tour.resume : ui.tour.start;
    info.setAttribute('aria-pressed', String(s.panelOpen));
    chartBtn.setAttribute('aria-pressed', String(s.mode === 'chart'));
    const note = s.view === 'helio' ? SCALE_NOTE.helio : s.view === 'sky' ? SCALE_NOTE.sky : (s.compression ? SCALE_NOTE.geoCompressed : SCALE_NOTE.geoTrue);
    sentence.replaceChildren(ui.views[s.view].sentence, h('span.scale-note', {}, note));
  };
  render(store.get());
  store.subscribe(render, ['view', 'mode', 'compression', 'panelOpen']);
  return {};
}
