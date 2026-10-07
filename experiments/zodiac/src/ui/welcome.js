// First-visit welcome: "Take the tour" or "Explore freely". The choice is remembered, so the
// overlay appears once per browser.

import { ui } from '../content/index.js';
import { h } from './dom.js';
import { browserStorage, getItem, setItem, KEYS } from './persist.js';

export function welcomeChoice() {
  return getItem(browserStorage(), KEYS.welcome);
}

export function showWelcome(ctx, { onTour, onExplore }) {
  const storage = browserStorage();
  const modal = document.getElementById('modal');
  let close = null;
  const choose = (choice) => {
    setItem(storage, KEYS.welcome, choice);
    close?.();
    if (choice === 'tour') onTour(); else onExplore();
  };
  const tourBtn = h('button.brass-btn.big', { type: 'button', onclick: () => choose('tour') }, '✦ Take the tour');
  close = ctx.openModal(h('div.welcome', {},
    h('div.w-orn', { 'aria-hidden': 'true' }, '✦'),
    h('h2.w-title', {}, ui.appTitle),
    h('div.w-sub', {}, ui.appSubtitle),
    h('p', {}, 'A horoscope is a description of the sky. This is that sky, live: the Sun, Moon and planets where they really are, seen from Earth against the twelve signs.'),
    h('p', {}, 'The guided tour takes about twenty minutes in fifteen short chapters, from the solar system to reading your own birth chart. You can leave at any point and pick up where you left off.'),
    h('div.w-actions', {},
      tourBtn,
      h('button.ghost-btn.big', { type: 'button', onclick: () => choose('explore') }, 'Explore freely')),
    h('p.w-fine', {}, ui.birthForm.privacy),
  ), { onClose: () => { /* closed without choosing (Esc): ask again next visit */ } });
  // a stray click on the backdrop should not dismiss the first-run choice
  modal.onclick = null;
  modal.firstElementChild?.classList.add('welcome-card');
  tourBtn.focus();
}
