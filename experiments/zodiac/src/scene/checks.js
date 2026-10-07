// Task checks for the tour: evaluate a `task.check` from src/content/tour.js against the
// current state and sky frame. All return booleans.
//
//   {type: 'bodyInSign', body, sign}         body's tropical sign
//   {type: 'aspect', a, b, aspect, orb?}     aspect present within `orb` degrees of exact
//                                             (default 3; the engine's full orb is wider)
//   {type: 'view', view}
//   {type: 'clicked', id}                    a body, sign slice, house or aspect was clicked
//                                             (3D scene, ring token, wheel or panel) since reset()
//   {type: 'retrograde', body}
//   {type: 'risingSign', sign}               sign of the Ascendant for the current place
//   {type: 'birthEntered'}                   a birth chart is set (state.chart)

import { signOrder } from '../content/index.js';

/** Records 'click' events from the store; reset() at the start of each tour step. */
export function createCheckTracker(store) {
  const clicks = [];
  store.on('click', (c) => clicks.push({ ...c, t: Date.now() }));
  return {
    reset() { clicks.length = 0; },
    has: (id, kind = null) => clicks.some((c) => String(c.id) === String(id) && (!kind || c.kind === kind)),
    list: () => clicks.slice(),
  };
}

export function evaluateCheck(check, { state, frame, clicks }) {
  if (!check) return true;
  switch (check.type) {
    case 'bodyInSign': {
      const p = frame.points[check.body];
      return !!p && signOrder[p.signIndex] === check.sign;
    }
    case 'aspect': {
      const tol = check.orb ?? 3;
      return frame.aspects.some((x) => x.aspect === check.aspect && x.orb <= tol
        && ((x.a === check.a && x.b === check.b) || (x.a === check.b && x.b === check.a)));
    }
    case 'view': return state.view === check.view;
    case 'clicked': return !!clicks?.has(check.id, check.kind ?? null);
    case 'retrograde': return !!frame.sky.bodies[check.body]?.retrograde;
    case 'risingSign': return frame.risingSign === check.sign;
    case 'birthEntered': return !!state.chart;
    default:
      console.warn(`Unknown check type: ${check.type}`);
      return false;
  }
}
