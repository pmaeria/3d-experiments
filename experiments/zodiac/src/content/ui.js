// Short UI strings: labels and one-line help for every control in the scene
// vocabulary, view explainers, birth-form help, and the about note.

export const ui = {
  appTitle: 'Zodiac',
  appSubtitle: 'The sky behind your birth chart',

  voices: {
    astronomy: { label: 'Astronomy', help: 'What is measurably happening in the sky.' },
    astrology: { label: 'Astrology', help: 'What the astrological tradition reads into it.' },
    both: { label: 'Astronomy and astrology', help: 'The sky first, then what astrologers make of it.' },
  },

  views: {
    helio: {
      label: 'Sun-centred',
      sentence: 'The solar system from outside, with the planets circling the Sun: how things really move.',
      whatAmI: {
        short: `You are looking at the solar system from outside, Sun in the middle, planets on their real orbits.`,
        more: `This is an [[orrery]]. Directions and speeds are real; sizes are enlarged and distances squeezed so everything fits. Earth is the blue dot on the third track. If the zodiac ring is shown, it is centred on Earth, because signs are directions seen from here. Lines from Earth to each body show which sign that body lies in, as seen from Earth.`,
      },
    },
    geo: {
      label: 'Earth-centred',
      sentence: 'Earth held still in the middle, with everything else seen from here against the zodiac ring.',
      whatAmI: {
        short: `You are looking from Earth at the middle: each body sits in the direction we see it, against the ring of twelve signs.`,
        more: `This is the [[geocentric]] view astrology uses. It is not a claim that things orbit Earth; it is simply what the sky looks like from here. The ring is the [[zodiac]], the band of sky the Sun, Moon and planets travel along, cut into twelve 30° signs. A body's sign is the slice its sight line points into.`,
      },
    },
    sky: {
      label: 'On the ground',
      sentence: 'Standing at one place on Earth, looking up at the sky dome above your horizon.',
      whatAmI: {
        short: `You are standing at one spot on Earth, looking at the sky as a dome, with the ground hiding the lower half.`,
        more: `The flat line is your [[horizon]]: east is on the left when you face south. Earth's daily spin carries the whole zodiac ring up in the east and down in the west. The point rising in the east is the [[ascendant]]; the highest point of the ring is the [[midheaven]]. This is why birth time and place matter.`,
      },
    },
  },

  controls: {
    view: { label: 'View', help: 'Switch between Sun-centred, Earth-centred and on-the-ground views.' },
    zoom: {
      label: 'Zoom',
      help: 'Frame the scene closer or wider.',
      options: {
        earthSun: { label: 'Earth and Sun', help: 'Close in on Earth and the Sun.' },
        inner: { label: 'Inner planets', help: 'Out to Mars.' },
        outer: { label: 'Whole system', help: 'Out to Pluto.' },
      },
    },
    date: {
      label: 'Date and time',
      help: 'The moment the sky is shown for, in your local time.',
      now: { label: 'Now', help: 'Jump back to the present moment.' },
      birth: { label: 'Birth moment', help: 'Jump to the birth date and time you entered.' },
    },
    rate: {
      label: 'Speed',
      help: 'How many days of sky time pass each real second. Negative runs time backwards.',
      pause: 'Pause',
      play: 'Play',
      reverse: 'Run backwards',
      perSecond: 'per second',
    },
    location: {
      label: 'Place',
      help: 'Where on Earth you are watching from; it sets the horizon, rising sign and houses.',
      birth: { label: 'Birth place', help: 'Use the birth place you entered.' },
      user: { label: 'My location', help: 'Use your current location, if you allow it; it never leaves your browser.' },
    },
    bodies: { label: 'Bodies', help: 'Choose which planets and points appear.' },
    focus: { label: 'Follow', help: 'Keep the camera centred on one body.' },
    highlight: { label: 'Highlight', help: 'Brighten particular signs, bodies or an aspect line.' },
    houseSystem: {
      label: 'House system',
      help: 'How the local sky is divided into twelve houses.',
      options: {
        wholeSign: { label: 'Whole Sign', help: 'Each house is one whole sign, starting with the rising sign. The default.' },
        placidus: { label: 'Placidus', help: 'Houses divided by time; unequal sizes, cusps at the Ascendant and Midheaven.' },
      },
    },
  },

  toggles: {
    ring: { label: 'Zodiac ring', help: 'The band of twelve 30° signs the Sun, Moon and planets travel through.' },
    signLabels: { label: 'Sign names', help: 'Label each slice of the ring with its sign and symbol.' },
    constellations: { label: 'Constellations', help: 'The real star patterns, which no longer line up with the signs.' },
    sightLines: { label: 'Sight lines', help: 'Lines from Earth to each body, showing which sign it lies in.' },
    aspects: { label: 'Aspects', help: 'Lines between bodies at key angles: 0°, 60°, 90°, 120° or 180°.' },
    trails: { label: 'Trails', help: 'The path each body has traced recently; retrograde loops show up here.' },
    orbits: { label: 'Orbits', help: 'The tracks the planets follow around the Sun.' },
    horizon: { label: 'Horizon', help: 'The line between ground and sky for the chosen place.' },
    houses: { label: 'Houses', help: 'Twelve sectors of the local sky, starting from the Ascendant.' },
    wheel: { label: 'Chart wheel', help: 'Flatten the sky into the familiar circular birth-chart diagram.' },
    earthAxis: { label: "Earth's axis", help: "The tilted line Earth spins around; its 23.4° tilt makes the seasons." },
  },

  events: {
    marchEquinox: { label: 'March equinox', help: 'The Sun reaches 0° Aries, the start of the zodiac.' },
    greatConjunction2020: { label: 'Great conjunction 2020', help: 'Jupiter and Saturn a tenth of a degree apart, 21 December 2020.' },
    nextMarsRetrograde: { label: 'Next Mars retrograde', help: 'Watch Mars slow, loop backwards and resume.' },
    nextFullMoon: { label: 'Next full moon', help: 'Moon opposite the Sun.' },
    nextNewMoon: { label: 'Next new moon', help: 'Moon in the same direction as the Sun.' },
    nextMercuryRetrograde: { label: 'Next Mercury retrograde', help: 'Mercury appears to move backwards for about three weeks.' },
    jumpTo: 'Jump to',
  },

  tour: {
    start: 'Start the tour',
    next: 'Next',
    back: 'Back',
    skip: 'Skip tour',
    resume: 'Resume tour',
    restart: 'Start again',
    chapter: 'Chapter',
    stepOf: 'Step {n} of {total}',
    tellMeMore: 'Tell me more',
    lookFor: 'Look for',
    taskDone: 'Nicely done.',
    taskHint: 'Try it on the scene; Next unlocks when you are done, or skip ahead.',
    whatAmI: 'What am I looking at?',
  },

  cards: {
    showMore: 'More',
    showDeep: 'Go deeper',
    showLess: 'Less',
    glossary: 'Glossary',
    related: 'Related',
    grammar: 'How the meaning is built',
    timePerSign: 'Time in each sign',
    orbitalPeriod: 'Orbit',
    retrograde: 'Retrograde',
    rules: 'Rules',
    traditionalRules: 'Traditionally rules',
    element: 'Element',
    modality: 'Mode',
    ruler: 'Ruler',
    constellation: 'The constellation',
    sunActuallyThere: 'Sun actually in front of these stars',
    shadow: 'On a bad day',
  },

  birthForm: {
    title: 'Your birth sky',
    intro: 'Enter a birth date, time and place to see the sky at that moment.',
    date: { label: 'Birth date', help: 'Day, month and year. The year matters: planets are in different places every year.' },
    time: { label: 'Birth time', help: 'Local clock time at the birth place. Birth certificates or family records often have it.' },
    unknownTime: {
      label: "I don't know the birth time",
      help: `No problem: we will use midday. Every planet's sign will almost always be right, but the Moon may be one sign out if it changed sign that day, and the rising sign, Midheaven and houses cannot be known. We will flag anything uncertain.`,
    },
    place: { label: 'Birth place', help: 'Start typing a town or city. We use its latitude, longitude and historical time zone.' },
    whyTimeAndPlace: `The sky turns once a day, so the rising sign changes about every two hours and the houses move with it. The place sets your horizon. Together, time and place fix the Ascendant, Midheaven and houses; the planets' signs need only the date.`,
    privacy: `Everything is calculated in your browser. Nothing you enter is sent to a server or stored anywhere except your own device.`,
    shareNote: `Share creates a link with the birth details written into the web address, so anyone with the link sees the same sky. Only share charts whose owners are happy to share them.`,
    submit: 'Show this sky',
    share: 'Share',
    copied: 'Link copied',
    clear: 'Clear',
  },

  about: {
    title: 'About astronomy and astrology',
    text: `Astronomy measures what is in the sky and how it moves, and every position you see here comes from it. Astrology is a much older tradition of reading meaning into those positions; it is offered here as what astrologers take the sky to mean, not as established science, since controlled studies have not found that it predicts character or events.`,
  },
};
