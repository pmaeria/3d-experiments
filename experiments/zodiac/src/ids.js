// The one place where engine ids and content ids meet.
//
// Engine (src/astro): chart angles are 'asc' / 'mc'; house systems are 'whole' / 'placidus'.
// Content (src/content), state and UI: 'ascendant' / 'midheaven'; 'wholeSign' / 'placidus'.
// Everything outside src/astro speaks the content dialect; convert at the boundary with these.

import { BODY_IDS } from './astro/index.js';

export const PLANET_IDS = BODY_IDS; // sun, moon, mercury ... pluto
export const ANGLE_IDS = ['ascendant', 'midheaven'];

const ENGINE_TO_CONTENT = { asc: 'ascendant', mc: 'midheaven' };
const CONTENT_TO_ENGINE = { ascendant: 'asc', midheaven: 'mc' };

/** 'asc' -> 'ascendant', 'mc' -> 'midheaven'; other ids pass through. */
export const toContentId = (id) => ENGINE_TO_CONTENT[id] ?? id;
/** 'ascendant' -> 'asc', 'midheaven' -> 'mc'; other ids pass through. */
export const toEngineId = (id) => CONTENT_TO_ENGINE[id] ?? id;

const HS_TO_ENGINE = { wholeSign: 'whole', whole: 'whole', placidus: 'placidus' };
const HS_TO_CONTENT = { whole: 'wholeSign', wholeSign: 'wholeSign', placidus: 'placidus' };
/** 'wholeSign' -> 'whole' (engine). */
export const houseSystemToEngine = (s) => HS_TO_ENGINE[s] ?? 'whole';
/** 'whole' -> 'wholeSign' (content/state). */
export const houseSystemToContent = (s) => HS_TO_CONTENT[s] ?? 'wholeSign';

export const isPlanet = (id) => PLANET_IDS.includes(id);
export const isAngle = (id) => ANGLE_IDS.includes(id);
