// Static reference tables: bodies, signs, aspects, elements, modalities.
// Pure data, no astronomy here.

/** Body ids in canonical display order. */
export const BODY_IDS = [
  'sun', 'moon', 'mercury', 'venus', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
];

/** Display metadata for each body. `aeName` is the astronomy-engine Body enum key. */
export const BODIES = {
  sun:     { id: 'sun',     name: 'Sun',     glyph: '☉', aeName: 'Sun',     luminary: true },
  moon:    { id: 'moon',    name: 'Moon',    glyph: '☽', aeName: 'Moon',    luminary: true },
  mercury: { id: 'mercury', name: 'Mercury', glyph: '☿', aeName: 'Mercury' },
  venus:   { id: 'venus',   name: 'Venus',   glyph: '♀', aeName: 'Venus' },
  mars:    { id: 'mars',    name: 'Mars',    glyph: '♂', aeName: 'Mars' },
  jupiter: { id: 'jupiter', name: 'Jupiter', glyph: '♃', aeName: 'Jupiter' },
  saturn:  { id: 'saturn',  name: 'Saturn',  glyph: '♄', aeName: 'Saturn' },
  uranus:  { id: 'uranus',  name: 'Uranus',  glyph: '♅', aeName: 'Uranus' },
  neptune: { id: 'neptune', name: 'Neptune', glyph: '♆', aeName: 'Neptune' },
  pluto:   { id: 'pluto',   name: 'Pluto',   glyph: '♇', aeName: 'Pluto' },
};

/**
 * Upper bounds on |geocentric ecliptic longitude speed| in deg/day, with margin.
 * Used by the event finder to take safe steps. (Mercury peaks near 2.2, Venus 1.27,
 * Mars 0.79, the Moon 15.4.)
 */
export const MAX_SPEED = {
  sun: 1.03, moon: 15.6, mercury: 2.4, venus: 1.35, mars: 0.85,
  jupiter: 0.26, saturn: 0.14, uranus: 0.07, neptune: 0.045, pluto: 0.045,
};

export const ELEMENTS = ['fire', 'earth', 'air', 'water'];
export const MODALITIES = ['cardinal', 'fixed', 'mutable'];

/** The 12 tropical signs, index 0 = Aries (0-30 deg). */
export const SIGNS = [
  { index: 0,  id: 'aries',       name: 'Aries',       glyph: '♈', element: 'fire',  modality: 'cardinal', ruler: 'mars' },
  { index: 1,  id: 'taurus',      name: 'Taurus',      glyph: '♉', element: 'earth', modality: 'fixed',    ruler: 'venus' },
  { index: 2,  id: 'gemini',      name: 'Gemini',      glyph: '♊', element: 'air',   modality: 'mutable',  ruler: 'mercury' },
  { index: 3,  id: 'cancer',      name: 'Cancer',      glyph: '♋', element: 'water', modality: 'cardinal', ruler: 'moon' },
  { index: 4,  id: 'leo',         name: 'Leo',         glyph: '♌', element: 'fire',  modality: 'fixed',    ruler: 'sun' },
  { index: 5,  id: 'virgo',       name: 'Virgo',       glyph: '♍', element: 'earth', modality: 'mutable',  ruler: 'mercury' },
  { index: 6,  id: 'libra',       name: 'Libra',       glyph: '♎', element: 'air',   modality: 'cardinal', ruler: 'venus' },
  { index: 7,  id: 'scorpio',     name: 'Scorpio',     glyph: '♏', element: 'water', modality: 'fixed',    ruler: 'mars' },
  { index: 8,  id: 'sagittarius', name: 'Sagittarius', glyph: '♐', element: 'fire',  modality: 'mutable',  ruler: 'jupiter' },
  { index: 9,  id: 'capricorn',   name: 'Capricorn',   glyph: '♑', element: 'earth', modality: 'cardinal', ruler: 'saturn' },
  { index: 10, id: 'aquarius',    name: 'Aquarius',    glyph: '♒', element: 'air',   modality: 'fixed',    ruler: 'saturn' },
  { index: 11, id: 'pisces',      name: 'Pisces',      glyph: '♓', element: 'water', modality: 'mutable',  ruler: 'jupiter' },
];

/** The five major (Ptolemaic) aspects. `orb` is the default orb in degrees. */
export const ASPECTS = [
  { id: 'conjunction', name: 'Conjunction', angle: 0,   glyph: '☌', orb: 8 },
  { id: 'sextile',     name: 'Sextile',     angle: 60,  glyph: '⚹', orb: 5 },
  { id: 'square',      name: 'Square',      angle: 90,  glyph: '□', orb: 7 },
  { id: 'trine',       name: 'Trine',       angle: 120, glyph: '△', orb: 7 },
  { id: 'opposition',  name: 'Opposition',  angle: 180, glyph: '☍', orb: 8 },
];

/** Extra orb added when the Sun or Moon is one of the pair. */
export const LUMINARY_ORB_BONUS = 2;

/**
 * The 13 constellations the ecliptic passes through (IAU 3-letter codes).
 * The first 12 are the zodiac constellations in ecliptic order; Ophiuchus is the 13th.
 */
export const ZODIAC_CONSTELLATIONS = ['Ari', 'Tau', 'Gem', 'Cnc', 'Leo', 'Vir', 'Lib', 'Sco', 'Sgr', 'Cap', 'Aqr', 'Psc'];
export const ECLIPTIC_CONSTELLATIONS = [...ZODIAC_CONSTELLATIONS, 'Oph'];

/** Moon phase names by elongation octant (centred on 0, 45, 90 ... deg). */
export const MOON_PHASES = [
  'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
  'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
];
