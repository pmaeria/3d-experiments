// Glossary. Every [[term]] or [[term|display text]] link anywhere in the content
// resolves to a key here via glossaryKey(): lowercased, trimmed, spaces -> hyphens.
// kind: 'astronomy' (measurable sky), 'astrology' (the tradition's reading), 'both'.

export function glossaryKey(raw) {
  return String(raw).trim().toLowerCase().replace(/\s+/g, '-');
}

export function resolveTerm(raw) {
  return glossary[glossaryKey(raw)] ?? null;
}

// Matches [[key]] and [[key|display text]].
export const LINK_PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

// Split a text into plain strings and link objects for rendering:
// parseLinks('The [[ecliptic]] is...') -> [{ key: 'ecliptic', text: 'ecliptic' }, ' is...']
export function parseLinks(text) {
  const s = String(text);
  const out = [];
  let last = 0;
  for (const m of s.matchAll(LINK_PATTERN)) {
    if (m.index > last) out.push(s.slice(last, m.index));
    out.push({ key: glossaryKey(m[1]), text: m[2] ?? m[1] });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

// Strip link markup, keeping the display text.
export function plainText(text) {
  return String(text).replace(LINK_PATTERN, (_, key, display) => display ?? key);
}

export const glossary = {
  astronomy: {
    term: 'Astronomy',
    kind: 'astronomy',
    short: `The science of everything beyond Earth's atmosphere: what is out there, how it moves and why, based on measurement.`,
    more: `Astronomy measures the positions, distances, motions and make-up of planets, stars and galaxies, and explains them with physics. Every position in this app comes from astronomical calculation, the same kind used to plan spacecraft journeys and predict eclipses. Text marked Astronomy describes things you could check with a telescope, a clock and patience.`,
    related: ['astrology', 'orrery', 'celestial-sphere'],
  },
  astrology: {
    term: 'Astrology',
    kind: 'astrology',
    short: `A tradition, thousands of years old, of reading meaning in the positions of the Sun, Moon and planets.`,
    more: `Astrology began in Mesopotamia as the reading of omens in the sky, was systematised by Greek-speaking astronomers in Hellenistic Egypt, and grew into the Western and Indian traditions practised today. It treats the sky at a moment as a symbolic map. Text marked Astrology describes what astrologers read into that map: a tradition of interpretation, not an established science.`,
    related: ['astronomy', 'natal-chart', 'tropical-zodiac', 'sidereal-zodiac'],
  },
  ecliptic: {
    term: 'Ecliptic',
    kind: 'astronomy',
    short: `The Sun's yearly path around the sky as seen from Earth; the Moon and planets always stay close to it.`,
    more: `As Earth goes around the Sun, the Sun seems to drift once around the background stars each year. The line it traces is the ecliptic: the plane of Earth's orbit, extended out onto the sky. Because all the planets orbit in nearly the same plane, they too are always found within a few degrees of this line. The zodiac is a band centred on it.`,
    related: ['zodiac', 'celestial-sphere', 'obliquity', 'sign'],
  },
  zodiac: {
    term: 'Zodiac',
    kind: 'both',
    short: `The band of sky along the ecliptic where the Sun, Moon and planets travel, divided into twelve signs.`,
    more: `The name comes from Greek for "circle of little animals", since most of its signs are creatures. Astronomically it is a band about 8° either side of the ecliptic, wide enough to hold the Moon and the planets. In astrology it is cut into twelve equal signs of 30°, counted from the March equinox point.`,
    related: ['ecliptic', 'sign', 'constellation', 'tropical-zodiac'],
  },
  sign: {
    term: 'Sign',
    kind: 'both',
    short: `One of the twelve equal 30° slices of the zodiac, such as Aries or Leo.`,
    more: `Signs are measured from the March equinox: 0° to 30° is Aries, 30° to 60° Taurus, and so on round to Pisces. A planet "in" a sign lies in that direction as seen from Earth. Signs are not the [[constellation|constellations]] they are named after; they are equal slices tied to the seasons. In astrology each sign describes a style or manner.`,
    related: ['zodiac', 'constellation', 'degree', 'element', 'modality'],
  },
  constellation: {
    term: 'Constellation',
    kind: 'astronomy',
    short: `A recognised pattern or region of stars, such as Orion or Leo; 88 official ones cover the whole sky.`,
    more: `Constellations are star pictures inherited from many cultures, with official boundaries fixed by the International Astronomical Union in 1930. Thirteen of them straddle the ecliptic, including Ophiuchus, and they are very unequal in size. The zodiac signs were named after twelve of them, but because of [[precession]] signs and constellations no longer line up.`,
    related: ['sign', 'precession', 'ophiuchus', 'sidereal-zodiac'],
  },
  'tropical-zodiac': {
    term: 'Tropical zodiac',
    kind: 'astrology',
    short: `The zodiac measured from the March equinox, so the signs stay tied to the seasons; used in Western astrology.`,
    more: `In the tropical zodiac, 0° Aries is by definition where the Sun stands at the March equinox. The signs move with the equinox as it precesses, so the Sun always enters Aries around 20 March and Cancer at the June solstice. Ptolemy set it out in the 2nd century AD, and it is the system this app uses.`,
    related: ['sidereal-zodiac', 'equinox', 'precession', 'zodiac'],
  },
  'sidereal-zodiac': {
    term: 'Sidereal zodiac',
    kind: 'astrology',
    short: `The zodiac anchored to the background stars instead of the seasons; used in Indian (Vedic) astrology.`,
    more: `Sidereal means "of the stars". This zodiac keeps twelve equal 30° signs but pins them to the stars, so they roughly match their namesake constellations. Because of [[precession]] it is currently offset from the tropical zodiac by about 24°, a gap that grows by 1° every 72 years. Most people's sidereal Sun sign is the sign before their tropical one.`,
    related: ['tropical-zodiac', 'ayanamsa', 'precession', 'constellation'],
  },
  ayanamsa: {
    term: 'Ayanamsa',
    kind: 'astrology',
    short: `The gap in degrees between the tropical and sidereal zodiacs, currently about 24°.`,
    more: `A Sanskrit term, roughly "portion of the movement": how far the March equinox has slipped against the stars since the two zodiacs coincided. Sidereal astrologers subtract it from tropical positions. Traditions start the count at slightly different dates, so values differ by a degree or so; the Indian standard, Lahiri, is about 24.2° in the mid-2020s.`,
    related: ['sidereal-zodiac', 'precession'],
  },
  precession: {
    term: 'Precession',
    kind: 'astronomy',
    short: `The slow wobble of Earth's axis, one turn every 25,800 years, which slides the equinoxes backward against the stars.`,
    more: `Earth spins like a top, and like a top its axis slowly traces a circle, tugged by the Sun's and Moon's gravity on Earth's bulging middle. As it does, the equinox points creep backward along the ecliptic by about 1° every 72 years. That is why the tropical signs have drifted about 24° from their constellations since they roughly matched some 2,000 years ago.`,
    related: ['equinox', 'tropical-zodiac', 'sidereal-zodiac', 'ayanamsa'],
  },
  equinox: {
    term: 'Equinox',
    kind: 'both',
    short: `One of two moments a year, around 20 March and 22 September, when the Sun crosses the celestial equator.`,
    more: `At an equinox (Latin for "equal night") day and night are roughly equal everywhere on Earth. The March equinox starts spring in the north and autumn in the south, and it defines 0° Aries, the start of the tropical zodiac. The September equinox is 0° Libra.`,
    related: ['solstice', 'celestial-equator', 'tropical-zodiac', 'obliquity'],
  },
  solstice: {
    term: 'Solstice',
    kind: 'both',
    short: `One of two moments a year, around 21 June and 21 December, when the Sun reaches its farthest north or south.`,
    more: `At a solstice (Latin for "Sun standing still") the Sun's midday height stops climbing or falling and turns back. The June solstice brings the longest day in the northern hemisphere and the shortest in the southern; December's does the reverse. In the tropical zodiac the June solstice is 0° Cancer and the December solstice 0° Capricorn.`,
    related: ['equinox', 'obliquity', 'modality'],
  },
  ophiuchus: {
    term: 'Ophiuchus',
    kind: 'astronomy',
    short: `The Serpent-bearer: a constellation the Sun crosses from about 29 November to 17 December, but not a zodiac sign.`,
    more: `Ophiuchus lies between Scorpius and Sagittarius, and the ecliptic cuts across its lower part, so the Sun spends longer in front of it than in front of Scorpius. It was never a sign because the zodiac was defined as twelve equal slices, not as constellations. Stories about a "13th sign" mix up the two.`,
    related: ['constellation', 'sign', 'sidereal-zodiac'],
  },
  'celestial-sphere': {
    term: 'Celestial sphere',
    kind: 'astronomy',
    short: `An imaginary giant globe around Earth on which all the stars and planets appear to sit.`,
    more: `By eye we cannot judge how far away a star is, only its direction. So astronomers describe the sky as if everything were painted on the inside of a huge sphere centred on Earth, and draw lines on it such as the [[ecliptic]], the [[celestial-equator|celestial equator]] and the [[meridian]]. It is a map of directions, not of places.`,
    related: ['ecliptic', 'celestial-equator', 'horizon', 'geocentric'],
  },
  'celestial-equator': {
    term: 'Celestial equator',
    kind: 'astronomy',
    short: `Earth's equator projected out onto the sky; it divides the sky into northern and southern halves.`,
    more: `Extend the plane of Earth's equator outwards and it draws a great circle around the sky. Because Earth's axis is tilted, this circle is tilted 23.4° to the [[ecliptic]], and the two cross at the [[equinox]] points. Stars on the celestial equator rise due east and set due west from anywhere on Earth.`,
    related: ['ecliptic', 'obliquity', 'equinox', 'celestial-sphere'],
  },
  obliquity: {
    term: 'Obliquity',
    kind: 'astronomy',
    short: `The 23.4° tilt between Earth's equator and the plane of its orbit; it causes the seasons.`,
    more: `Earth's axis is tipped 23.4° relative to its orbit. That tilt makes the Sun's path swing north and south of the celestial equator through the year, giving us seasons, equinoxes and solstices. It also makes the zodiac meet the horizon at changing angles through the day, which is why some signs rise faster than others.`,
    related: ['celestial-equator', 'ecliptic', 'solstice', 'equinox'],
  },
  horizon: {
    term: 'Horizon',
    kind: 'both',
    short: `The boundary between ground and sky all around you; everything below it is hidden by Earth.`,
    more: `In astronomy the horizon is an idealised flat circle around the observer, 90° from the point overhead. Bodies rise as they cross it in the east and set as they cross it in the west. In astrology it is the line from the [[ascendant]] to the [[descendant]], splitting the chart into a visible upper half and a hidden lower half.`,
    related: ['ascendant', 'descendant', 'zenith', 'meridian'],
  },
  meridian: {
    term: 'Meridian',
    kind: 'astronomy',
    short: `The imaginary line across the sky from due north, through the point overhead, to due south.`,
    more: `Everything in the sky reaches its highest point of the day as it crosses your meridian; the Sun does so at local midday, which is where the word comes from. The point where the zodiac crosses the meridian above the horizon is the [[midheaven]]; below the horizon, the [[ic|IC]].`,
    related: ['midheaven', 'ic', 'zenith', 'horizon'],
  },
  zenith: {
    term: 'Zenith',
    kind: 'astronomy',
    short: `The point in the sky directly above your head.`,
    more: `The zenith is 90° above the horizon in every direction. It is not the same as the [[midheaven]]: the Midheaven is where the tilted zodiac crosses the meridian, which is usually lower. Only from the tropics can the Sun ever pass exactly overhead.`,
    related: ['meridian', 'horizon', 'midheaven'],
  },
  degree: {
    term: 'Degree',
    kind: 'both',
    short: `One 360th of a full circle; each sign is 30° wide, so positions read like 15° Leo.`,
    more: `Positions along the zodiac are given in degrees, written with the ° symbol. 15° Leo means 15 degrees into the Leo slice, halfway through it. For finer detail each degree splits into 60 minutes of arc. A fist held at arm's length covers about 10° of sky; the full Moon covers about half a degree.`,
    related: ['sign', 'aspect', 'orb'],
  },
  geocentric: {
    term: 'Geocentric',
    kind: 'both',
    short: `Earth-centred: describing positions as they appear from Earth. Astrology and the Earth-centred view use it.`,
    more: `A geocentric description puts Earth in the middle and records where everything appears from here. It is not a claim about what orbits what; it is a choice of viewpoint, like describing a race from the stands. Birth charts are geocentric because they record the sky as it looked from a place on Earth.`,
    related: ['heliocentric', 'celestial-sphere', 'chart-wheel'],
  },
  heliocentric: {
    term: 'Heliocentric',
    kind: 'astronomy',
    short: `Sun-centred: describing the solar system from outside, with the planets orbiting the Sun.`,
    more: `The heliocentric picture, argued by Copernicus in 1543 and confirmed by Kepler, Galileo and Newton, shows how the solar system really moves. It makes effects like [[retrograde]] motion easy to understand. The Sun-centred view in this app is a heliocentric [[orrery]].`,
    related: ['geocentric', 'orrery', 'retrograde'],
  },
  orrery: {
    term: 'Orrery',
    kind: 'astronomy',
    short: `A model of the solar system showing the planets moving around the Sun.`,
    more: `Named after the 4th Earl of Orrery, for whom an early one was built in the 1710s. Traditional orreries are clockwork; this app's Sun-centred view is a digital one driven by real orbital calculations. Like most orreries it enlarges the planets and squeezes the distances so everything fits on screen.`,
    related: ['heliocentric', 'au'],
  },
  au: {
    term: 'Astronomical unit (AU)',
    kind: 'astronomy',
    short: `The average distance from Earth to the Sun, about 150 million km; a handy yardstick for the solar system.`,
    more: `Jupiter orbits about 5.2 AU from the Sun, Saturn 9.5, Uranus 19, Neptune 30 and Pluto about 39 on average. Sunlight takes about 8 minutes 20 seconds to cross one AU. The Sun-centred view compresses these distances so the outer planets fit on screen; this unit gives the real numbers.`,
    related: ['orrery', 'heliocentric'],
  },
  planet: {
    term: 'Planet',
    kind: 'both',
    short: `A large world orbiting the Sun; in astrology the word also covers the Sun, the Moon and Pluto.`,
    more: `The Greek planetes means "wanderer": the ancients saw seven lights moving against the fixed stars, the Sun, Moon, Mercury, Venus, Mars, Jupiter and Saturn. Astronomy now counts eight planets, not including the Sun, the Moon or Pluto, which became a dwarf planet in 2006. Astrology keeps the older usage and calls all ten chart bodies planets.`,
    related: ['luminary', 'personal-planets', 'social-planets', 'generational-planets'],
  },
  luminary: {
    term: 'Luminary',
    kind: 'astrology',
    short: `The Sun or the Moon, the two great lights; astrologers treat them as the most important bodies in a chart.`,
    more: `Astrology sets the Sun and Moon apart from the other planets because they are by far the brightest and rule day and night. Astrologers read them as the two poles of a person: the Sun as conscious identity and purpose, the Moon as feelings and needs.`,
    related: ['planet', 'big-three', 'new-moon', 'full-moon'],
  },
  'personal-planets': {
    term: 'Personal planets',
    kind: 'astrology',
    short: `The Sun, Moon, Mercury, Venus and Mars: fast movers whose signs differ even between people born weeks apart.`,
    more: `Because they change sign every few days to every few weeks, these bodies vary a lot from person to person, so astrologers read them as the most individual parts of a chart: identity, feelings, mind, love and drive.`,
    related: ['social-planets', 'generational-planets', 'planet'],
  },
  'social-planets': {
    term: 'Social planets',
    kind: 'astrology',
    short: `Jupiter and Saturn: slower planets, about 1 and 2.5 years per sign, shared by people of a similar age.`,
    more: `Astrologers read Jupiter (growth, belief) and Saturn (structure, responsibility) as a bridge between the personal and the collective: how you fit into society, and the attitudes of your school year or age group.`,
    related: ['personal-planets', 'generational-planets', 'great-conjunction'],
  },
  'generational-planets': {
    term: 'Generational planets',
    kind: 'astrology',
    short: `Uranus, Neptune and Pluto: so slow, 7 to 30 years per sign, that whole generations share their signs.`,
    more: `Since everyone born within several years shares their signs, astrologers read these planets' signs as the mood of a generation, and their houses and aspects as where those collective themes touch one life. Ancient astrology did not know them: Uranus was discovered in 1781, Neptune in 1846 and Pluto in 1930.`,
    related: ['personal-planets', 'social-planets'],
  },
  'orbital-period': {
    term: 'Orbital period',
    kind: 'astronomy',
    short: `The time a body takes to go once around what it orbits: 365.25 days for Earth, 687 for Mars.`,
    more: `Periods grow quickly with distance: Mercury 88 days, Venus 225, Earth 365, Mars 687, Jupiter 11.9 years, Saturn 29.5, Uranus 84, Neptune 165, Pluto 248. Seen from Earth, an outer planet takes on average the same time to circle the zodiac, which is why slow planets stay in a sign for years. Mercury and Venus, tied to the Sun, average one lap a year.`,
    related: ['planet', 'retrograde', 'au'],
  },
  'synodic-month': {
    term: 'Lunar month (synodic month)',
    kind: 'astronomy',
    short: `The 29.5 days from one new moon to the next: the cycle of the Moon's phases.`,
    more: `Phases depend on the angle between Sun and Moon as seen from Earth. While the Moon circles the zodiac, the Sun moves on too, so the Moon needs about two days beyond its 27.3-day [[sidereal-month|sidereal month]] to catch up and line up with the Sun again.`,
    related: ['sidereal-month', 'lunar-phase', 'new-moon'],
  },
  'sidereal-month': {
    term: 'Sidereal month',
    kind: 'astronomy',
    short: `The 27.3 days the Moon takes to circle the zodiac once and return to the same stars.`,
    more: `Measured against the background stars, the Moon completes an orbit in 27.3 days, moving about 13° a day and spending around two and a half days in each sign. That is the speed you see in a chart. Its phases follow the slightly longer [[synodic-month|lunar month]].`,
    related: ['synodic-month', 'lunar-phase'],
  },
  'lunar-phase': {
    term: 'Lunar phase',
    kind: 'both',
    short: `How much of the Moon's sunlit half we can see, set by the angle between Sun and Moon.`,
    more: `Half the Moon is always lit by the Sun. As the Sun-Moon angle seen from Earth opens from 0° to 180°, we see a crescent, a half Moon (first quarter, 90°), a gibbous Moon, then a full Moon, and then it closes again. Astrologers read the phase at birth as a hint about temperament, and the monthly phases as a rhythm of beginnings and culminations.`,
    related: ['new-moon', 'full-moon', 'synodic-month', 'aspect'],
  },
  'new-moon': {
    term: 'New moon',
    kind: 'both',
    short: `When the Moon is in the same direction as the Sun, its lit side facing away, so it cannot be seen.`,
    more: `At new moon the Sun and Moon are in [[conjunction]]. The Moon rises and sets with the Sun and is lost in daylight. If the alignment falls close to a [[lunar-node|lunar node]], the Moon covers the Sun: a solar eclipse. Astrologers associate new moons with beginnings and setting intentions.`,
    related: ['full-moon', 'conjunction', 'lunar-phase', 'eclipse'],
  },
  'full-moon': {
    term: 'Full moon',
    kind: 'both',
    short: `When the Moon is opposite the Sun in the sky, its whole lit face towards us; it rises at sunset.`,
    more: `At full moon the Sun and Moon are in [[opposition]], on opposite sides of Earth, so the Moon sits in the sign opposite the Sun's. If the alignment falls close to a [[lunar-node|lunar node]], Earth's shadow falls on the Moon: a lunar eclipse. Astrologers associate full moons with culmination, release and heightened emotion.`,
    related: ['new-moon', 'opposition', 'lunar-phase', 'eclipse'],
  },
  'lunar-node': {
    term: 'Lunar node',
    kind: 'both',
    short: `One of the two points where the Moon's tilted orbit crosses the ecliptic; eclipses happen only near them.`,
    more: `The north (ascending) node is where the Moon crosses the ecliptic heading north, the south node where it heads south; they are always exactly opposite. They slide backward around the zodiac every 18.6 years. Astrologers read the North Node as a direction of growth and the South Node as familiar habits and gifts.`,
    related: ['eclipse', 'new-moon', 'full-moon'],
  },
  eclipse: {
    term: 'Eclipse',
    kind: 'both',
    short: `When the Sun, Moon and Earth line up in three dimensions, so one body's shadow falls on another.`,
    more: `A solar eclipse happens at a new moon, when the Moon passes in front of the Sun; a lunar eclipse at a full moon, when the Moon passes through Earth's shadow. Because the Moon's orbit is tilted, this only happens when the new or full moon falls near a [[lunar-node|lunar node]], in two eclipse seasons a year. Astrologers have long treated eclipses as markers of major change.`,
    related: ['lunar-node', 'new-moon', 'full-moon'],
  },
  retrograde: {
    term: 'Retrograde',
    kind: 'both',
    short: `A planet's apparent backward drift through the zodiac, caused by Earth overtaking it or being overtaken.`,
    more: `All planets orbit the Sun in the same direction and never reverse. But when Earth, on its faster inside track, passes an outer planet, that planet seems to slide backward against the stars, like a slower car drifting back as you overtake it. Mercury and Venus look retrograde when they overtake us. Astrologers read a retrograde planet as turning its energy inward: reviewing, revisiting, redoing.`,
    related: ['station', 'direct', 'heliocentric'],
  },
  station: {
    term: 'Station',
    kind: 'both',
    short: `The moment a planet appears to stand still before switching between forward and backward motion.`,
    more: `Before and after a retrograde period a planet seems to slow to a halt for a few days: stationary retrograde as it turns backward, stationary direct as it resumes. Astrologers consider a planet especially emphasised while it is stationary.`,
    related: ['retrograde', 'direct'],
  },
  direct: {
    term: 'Direct',
    kind: 'both',
    short: `Normal forward motion through the zodiac, in the order Aries, Taurus, Gemini and onward.`,
    more: `Most of the time every planet moves direct. When a retrograde period ends, astrologers say the planet "goes direct", and read it as the moment stalled matters start moving again.`,
    related: ['retrograde', 'station'],
  },
  ingress: {
    term: 'Ingress',
    kind: 'both',
    short: `The moment a planet enters a new sign.`,
    more: `The Sun's ingress into Aries is the March equinox; its ingress into Cancer is the June solstice. Slow planets make headlines when they change sign, as when Pluto entered Aquarius in 2024. Astrologers read an ingress as a change in the style of that planet's influence for everyone.`,
    related: ['sign', 'transit'],
  },
  transit: {
    term: 'Transit',
    kind: 'both',
    short: `In astrology, where a planet is now, compared with where things were in a birth chart.`,
    more: `In astronomy a transit is one body crossing in front of another, like Venus crossing the face of the Sun. In astrology it means a planet's current position, especially when it makes an [[aspect]] to a point in someone's [[natal-chart|natal chart]]. Astrologers use transits for timing, such as Saturn returning to its birth position around age 29.`,
    related: ['natal-chart', 'aspect', 'ingress'],
  },
  'natal-chart': {
    term: 'Natal chart',
    kind: 'both',
    short: `A map of where the Sun, Moon and planets were, seen from the place and moment of someone's birth.`,
    more: `Also called a birth chart or horoscope. It records each body's sign and degree, the [[ascendant]] and [[midheaven]], the twelve [[house|houses]] and the [[aspect|aspects]] between bodies. Astronomically it is a precise snapshot of the sky; astrologically it is read as a symbolic portrait of a person.`,
    related: ['chart-wheel', 'big-three', 'house', 'aspect'],
  },
  'chart-wheel': {
    term: 'Chart wheel',
    kind: 'both',
    short: `The circular diagram of a chart: the sky around Earth flattened onto a disc.`,
    more: `Earth is at the centre, the zodiac runs anticlockwise around the rim, and the horizon is a horizontal line with the [[ascendant]] on the left (east). Planets above the line were in the visible sky; those below were under the horizon. Spokes mark the houses, and lines across the middle show aspects.`,
    related: ['natal-chart', 'geocentric', 'angles', 'house'],
  },
  ascendant: {
    term: 'Ascendant (rising sign)',
    kind: 'both',
    short: `The point of the zodiac rising on the eastern horizon at a given moment and place.`,
    more: `As Earth turns, the whole zodiac rises in the east over a day, so the Ascendant changes sign roughly every two hours. Astrologers read it as your outward manner and approach to life, and start the first [[house]] from it. It is the main reason birth time and place matter.`,
    related: ['descendant', 'horizon', 'angles', 'big-three'],
  },
  descendant: {
    term: 'Descendant',
    kind: 'both',
    short: `The point of the zodiac setting on the western horizon, exactly opposite the Ascendant.`,
    more: `The Descendant starts the seventh house. Astrologers associate it with partners and close relationships: the qualities we look for in others, or meet in them.`,
    related: ['ascendant', 'horizon', 'angles'],
  },
  midheaven: {
    term: 'Midheaven (MC)',
    kind: 'both',
    short: `The point of the zodiac crossing the meridian above the horizon: the top of the chart.`,
    more: `From the Latin medium coeli, "middle of the sky". From the northern hemisphere it lies due south. Astrologers read it as career, reputation and public direction, and in most house systems it starts the tenth house.`,
    related: ['ic', 'meridian', 'angles', 'zenith'],
  },
  ic: {
    term: 'IC (Imum Coeli)',
    kind: 'both',
    short: `The point of the zodiac crossing the meridian below the horizon, opposite the Midheaven: the bottom of the chart.`,
    more: `Latin for "bottom of the sky". It lies below your feet, hidden by Earth. Astrologers associate it with home, family, roots and private life, and in most house systems it starts the fourth house.`,
    related: ['midheaven', 'meridian', 'angles'],
  },
  angles: {
    term: 'Angles',
    kind: 'both',
    short: `The four key points of a chart, Ascendant, Descendant, Midheaven and IC, where the zodiac meets horizon and meridian.`,
    more: `The angles depend on the exact time and place, so they are the most personal and time-sensitive points in a chart. Astrologers read planets close to an angle as especially prominent. Together the angles form a cross that divides the chart into quarters.`,
    related: ['ascendant', 'descendant', 'midheaven', 'ic'],
  },
  house: {
    term: 'House',
    kind: 'both',
    short: `One of twelve sectors of the local sky, read in astrology as an area of life such as home, work or love.`,
    more: `Signs divide the zodiac; houses divide the sky around one place at one moment, starting from the [[ascendant]]. Houses 1 to 6 lie below the horizon and 7 to 12 above it. Each planet falls in one house, which astrologers read as where in life that planet's drive plays out.`,
    related: ['house-system', 'cusp', 'ascendant', 'whole-sign-houses'],
  },
  'house-system': {
    term: 'House system',
    kind: 'astrology',
    short: `A method of dividing the local sky into twelve houses; astrologers use several.`,
    more: `All systems start from the horizon and meridian but disagree on how to divide the space between them. Popular ones include [[whole-sign-houses|Whole Sign]], [[placidus|Placidus]], Koch and Equal. This app uses Whole Sign by default and offers Placidus.`,
    related: ['house', 'whole-sign-houses', 'placidus'],
  },
  'whole-sign-houses': {
    term: 'Whole Sign houses',
    kind: 'astrology',
    short: `The oldest house system: the rising sign is the first house, the next sign the second, and so on.`,
    more: `Each house is exactly one sign, so houses and signs line up. The method goes back to Hellenistic astrology about 2,000 years ago, is standard in Indian astrology and has been revived by many Western astrologers. It works at any latitude, and the [[midheaven]] can fall in a house other than the tenth.`,
    related: ['house-system', 'placidus', 'ascendant'],
  },
  placidus: {
    term: 'Placidus houses',
    kind: 'astrology',
    short: `A house system that divides the sky by time, giving houses of unequal size; common in modern Western astrology.`,
    more: `Named after the 17th-century monk Placidus de Titis, it splits the time each degree of the zodiac takes to travel between horizon and meridian into thirds. The [[ascendant]] starts the first house and the [[midheaven]] the tenth. At high latitudes houses become very uneven, and beyond the polar circles the method breaks down.`,
    related: ['house-system', 'whole-sign-houses', 'midheaven'],
  },
  cusp: {
    term: 'Cusp',
    kind: 'astrology',
    short: `A boundary: the starting line of a house, or loosely, the border between two signs.`,
    more: `The first house cusp is the [[ascendant]]. People born when the Sun was near the edge of a sign sometimes say they were "born on the cusp"; the Sun is still in one sign or the other, and the exact year and time settle which.`,
    related: ['house', 'sign', 'ascendant'],
  },
  aspect: {
    term: 'Aspect',
    kind: 'both',
    short: `The angle between two bodies as seen from Earth, when it matches one of a few key angles.`,
    more: `Astrologers use five main aspects: [[conjunction]] 0°, [[sextile]] 60°, [[square]] 90°, [[trine]] 120° and [[opposition]] 180°. An aspect is about directions, not distances: two planets in conjunction may be hundreds of millions of kilometres apart. Astrologers read aspects as how two planets talk to each other.`,
    related: ['orb', 'conjunction', 'opposition', 'applying'],
  },
  orb: {
    term: 'Orb',
    kind: 'astrology',
    short: `The leeway allowed around an exact aspect angle, for example within 8° of a perfect opposition.`,
    more: `Exact aspects are rare, so astrologers count an aspect when the angle is within a few degrees of the ideal. Conjunctions, oppositions and anything involving the Sun or Moon get wider orbs; sextiles narrower ones. The closer to exact, the stronger the aspect is read. Orbs are conventions and vary between astrologers.`,
    related: ['aspect', 'applying', 'separating'],
  },
  applying: {
    term: 'Applying aspect',
    kind: 'astrology',
    short: `An aspect that is getting closer to exact, because the faster body is still closing in.`,
    more: `Astrologers read an applying aspect as building, still heading for its peak. In timing work it suggests something still to come.`,
    related: ['separating', 'aspect', 'orb'],
  },
  separating: {
    term: 'Separating aspect',
    kind: 'astrology',
    short: `An aspect that has already passed exact, with the faster body moving away.`,
    more: `Astrologers read a separating aspect as fading, its main effect already felt. Whether an aspect is applying or separating depends on which body is faster and which way it is heading.`,
    related: ['applying', 'aspect', 'orb'],
  },
  conjunction: {
    term: 'Conjunction',
    kind: 'both',
    short: `Two bodies in the same direction from Earth (0° apart); astrologers read their drives as fused.`,
    more: `The two bodies only look close; in space they can be very far apart. The Sun-Moon conjunction is the new moon. Astrologers treat the conjunction as the most powerful aspect and the start of a cycle between two planets.`,
    related: ['aspect', 'opposition', 'new-moon', 'great-conjunction'],
  },
  sextile: {
    term: 'Sextile',
    kind: 'both',
    short: `Two bodies 60° apart from Earth; astrologers read a friendly, cooperative link that needs a little effort.`,
    more: `A sixth of the circle, usually two signs apart, linking compatible elements: fire with air, earth with water. Astrologers read it as an opportunity, helpful if acted on.`,
    related: ['aspect', 'trine'],
  },
  square: {
    term: 'Square',
    kind: 'both',
    short: `Two bodies 90° apart from Earth; astrologers read friction that pushes for action.`,
    more: `A quarter of the circle, usually three signs apart, in signs that share a [[modality]] but not an element. The first- and last-quarter Moons are Sun-Moon squares. Astrologers read squares as challenging but productive.`,
    related: ['aspect', 'opposition', 'modality'],
  },
  trine: {
    term: 'Trine',
    kind: 'both',
    short: `Two bodies 120° apart from Earth; astrologers read an easy, harmonious flow.`,
    more: `A third of the circle, usually four signs apart, linking signs of the same [[element]]. Astrologers read trines as natural talents: easy to use, and easy to take for granted.`,
    related: ['aspect', 'sextile', 'element'],
  },
  opposition: {
    term: 'Opposition',
    kind: 'both',
    short: `Two bodies 180° apart, on opposite sides of the sky from Earth; astrologers read a tug-of-war seeking balance.`,
    more: `The full moon is a Sun-Moon opposition. An outer planet opposite the Sun is at its closest and brightest, midway through its retrograde loop. Astrologers read oppositions as polarity, often experienced through other people.`,
    related: ['aspect', 'conjunction', 'full-moon', 'retrograde'],
  },
  'great-conjunction': {
    term: 'Great conjunction',
    kind: 'both',
    short: `A conjunction of Jupiter and Saturn, which happens about every 20 years.`,
    more: `On 21 December 2020 Jupiter and Saturn appeared just 0.1° apart, the closest since 1623, though more than 700 million km separated them in space. Astrologers have tracked these meetings for centuries as markers of social and political eras.`,
    related: ['conjunction', 'social-planets'],
  },
  element: {
    term: 'Element',
    kind: 'astrology',
    short: `One of four qualities astrologers give the signs: fire, earth, air and water.`,
    more: `Each element covers three signs spaced evenly round the zodiac. Fire (Aries, Leo, Sagittarius) is read as spirited, earth (Taurus, Virgo, Capricorn) as practical, air (Gemini, Libra, Aquarius) as social and mental, water (Cancer, Scorpio, Pisces) as emotional. The idea comes from ancient Greek natural philosophy.`,
    related: ['modality', 'polarity', 'sign', 'trine'],
  },
  modality: {
    term: 'Modality',
    kind: 'astrology',
    short: `One of three modes astrologers give the signs: cardinal (starting), fixed (sustaining) and mutable (adapting).`,
    more: `Cardinal signs (Aries, Cancer, Libra, Capricorn) begin at an equinox or solstice, as each season starts; fixed signs (Taurus, Leo, Scorpio, Aquarius) fall mid-season; mutable signs (Gemini, Virgo, Sagittarius, Pisces) close it. Also called qualities or modes.`,
    related: ['element', 'square', 'equinox', 'solstice'],
  },
  polarity: {
    term: 'Polarity',
    kind: 'astrology',
    short: `The split of the signs into two alternating groups: active (fire and air) and receptive (earth and water).`,
    more: `Going round the zodiac, signs alternate between active, outward-going (called yang or masculine in older texts) and receptive, inward-going (yin or feminine). Astrologers use the balance between them as a broad first sketch of a chart.`,
    related: ['element', 'modality'],
  },
  ruler: {
    term: 'Ruler (rulership)',
    kind: 'astrology',
    short: `The planet astrologers associate with a sign, said to be most at home there.`,
    more: `Each sign has a ruling planet: Mars rules Aries, Venus rules Taurus and Libra, and so on. The traditional scheme used only the seven visible bodies; modern astrologers gave Aquarius to Uranus, Pisces to Neptune and Scorpio to Pluto, often keeping the old rulers as co-rulers. The ruler of the rising sign is called the chart ruler.`,
    related: ['sign', 'ascendant'],
  },
  'big-three': {
    term: 'Big three',
    kind: 'astrology',
    short: `The Sun sign, Moon sign and rising sign: the three placements astrologers treat as the core of a chart.`,
    more: `The Sun is read as identity, the Moon as emotional needs and the rising sign as outward style. Together they give a quick sketch of a person. The Sun needs only a birth date; the Moon the date and sometimes the time; the rising sign needs both the time and the place.`,
    related: ['luminary', 'ascendant', 'natal-chart'],
  },
  'diurnal-motion': {
    term: 'Daily motion (diurnal motion)',
    kind: 'astronomy',
    short: `The daily rising and setting of everything in the sky, caused by Earth spinning once a day.`,
    more: `Earth's spin carries the whole sky, zodiac included, round once in 23 hours 56 minutes relative to the stars: a sidereal day. The ordinary 24-hour day is about four minutes longer because Earth also moves along its orbit and must turn a little more to bring the Sun back. This daily turn moves the [[ascendant]] and the [[house|houses]] hour by hour.`,
    related: ['ascendant', 'horizon', 'meridian'],
  },
};
