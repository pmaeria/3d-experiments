// The guided tour: ordered steps grouped in chapters.
// Each step: { id, chapter, title, voice, body, deeper?, lookFor?, scene, task? }
// voice: 'astronomy' | 'astrology' | 'both' - which voice the body text speaks in.
//
// Scene conventions (for the UI agent):
// - Each scene is self-contained. Top-level keys omitted from a scene take the
//   value in sceneDefaults below; `show` keys omitted are false.
// - `bodies` may include 'earth' (Sun-centred view only) and the chart points
//   'ascendant' and 'midheaven' in addition to the ten planet ids. 'all' means
//   the ten planets, plus Earth in the Sun-centred view.
// - Event dates ({ event }) for retrogrades should land a few weeks BEFORE the
//   station, so the reader sees the planet slow down and turn.

export const sceneDefaults = {
  view: 'geo',
  date: 'now',
  rate: 1,
  location: { name: 'London', lat: 51.5074, lon: -0.1278 },
  bodies: 'all',
  show: {
    ring: false, signLabels: false, constellations: false, sightLines: false,
    aspects: false, trails: false, orbits: false, horizon: false, houses: false,
    wheel: false, earthAxis: false,
  },
};

const LONDON = { name: 'London', lat: 51.5074, lon: -0.1278 };
const PLANETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const WITH_ANGLES = [...PLANETS, 'ascendant', 'midheaven'];
const EARLY_DECEMBER = '2025-12-05T12:00:00Z'; // Sun about 13° Sagittarius, in front of Ophiuchus

export const chapters = [
  { id: 'welcome', number: 1, title: 'Welcome', summary: 'The sky as a clock; what this is and is not.' },
  { id: 'flat', number: 2, title: 'A flat solar system', summary: 'One shared plane, so one band of sky.' },
  { id: 'ring', number: 3, title: 'The ring of twelve', summary: 'Thirty-degree slices, and where 0° Aries comes from.' },
  { id: 'pov', number: 4, title: 'Point of view', summary: 'Riding along with Earth; what "Sun in Sagittarius" means.' },
  { id: 'year', number: 5, title: 'A year of Sun signs', summary: 'Months, seasons, equinoxes and solstices.' },
  { id: 'moon', number: 6, title: 'The Moon', summary: 'A fast lap; phases as Sun-Moon angles.' },
  { id: 'planets', number: 7, title: 'The planets', summary: 'Three speed tiers and what each planet stands for.' },
  { id: 'aspects', number: 8, title: 'Aspects', summary: 'Angles between bodies, starting with the 2020 great conjunction.' },
  { id: 'retrograde', number: 9, title: 'Retrograde', summary: 'Why planets seem to walk backwards.' },
  { id: 'precession', number: 10, title: 'Signs are not constellations', summary: 'Precession, Ophiuchus, tropical and sidereal.' },
  { id: 'sky', number: 11, title: 'Standing on Earth', summary: 'The dome, the daily turn, the rising sign and Midheaven.' },
  { id: 'houses', number: 12, title: 'Houses', summary: 'Twelve sectors of your local sky.' },
  { id: 'wheel', number: 13, title: 'The chart wheel', summary: 'The sky flattened; reading the symbols.' },
  { id: 'reading', number: 14, title: 'Reading a chart', summary: 'What, how, where; elements and modes; the big three.' },
  { id: 'yours', number: 15, title: 'Your own sky', summary: 'Your birth sky, sharing it, and the open sandbox.' },
];

export const tour = [
  // 1. Welcome
  {
    id: 'welcome-clock',
    chapter: 'welcome',
    title: 'The sky is a clock',
    voice: 'astronomy',
    body: `Everything here is real and moving right now: the Sun in the middle, the planets on their tracks, Earth third from the centre. Each world keeps its own steady pace, like the hands of a clock. Astrology began as people reading the time on that clock from Earth. In this tour you will learn to read it too: first what is really out there, then what astrologers take it to mean.`,
    deeper: `This is an [[orrery]], a model of the solar system seen from outside. Sizes and distances are not to scale: at true scale the planets would be invisible specks and the outer ones far off the screen. Directions and speeds are real, though, calculated with the same kind of equations astronomers use. The clock is running at two days per second.`,
    lookFor: 'Earth, the blue dot on the third track from the Sun.',
    scene: {
      view: 'helio', zoom: 'outer', date: 'now', rate: 2, bodies: 'all',
      show: { orbits: true },
    },
  },
  {
    id: 'welcome-voices',
    chapter: 'welcome',
    title: 'Two voices',
    voice: 'both',
    body: `Astronomy and astrology are often mixed up. Astronomy is the science of what is out there and how it moves; everything it says can be measured. Astrology is a much older tradition of reading meaning into those movements. This tour keeps them apart: text marked Astronomy describes the sky, and text marked Astrology describes what astrologers read into it, offered as a tradition rather than proven fact. You can enjoy one without signing up for the other.`,
    deeper: `For most of history they were one subject: the same people tracked the planets and cast horoscopes, and the demand for good predictions drove better astronomy. They parted ways in the 17th century, as physics explained the planets' motions without reference to human affairs. Today [[astronomy]] is a science and [[astrology]] a symbolic language that many people use for reflection. Underlined words like these open a short definition; you can always ask for more.`,
    lookFor: 'The Astronomy and Astrology labels on the text panels.',
    scene: {
      view: 'helio', zoom: 'outer', date: 'now', rate: 5, bodies: 'all',
      show: { orbits: true },
    },
  },

  // 2. A flat solar system
  {
    id: 'flat-tabletop',
    chapter: 'flat',
    title: 'Orbits on a tabletop',
    voice: 'astronomy',
    body: `Drag the view to tilt it and look at the planets' tracks from the side. They nearly all lie in one flat plane, like grooves on a vinyl record. That is no accident: the solar system formed from a spinning disc of gas and dust, and the planets still circle the Sun in the same direction, in almost the same plane. Only little Mercury and distant Pluto tilt noticeably.`,
    deeper: `Measured against Earth's orbit, Venus's is tilted 3.4°, Mars's under 2°, Jupiter's 1.3° and Saturn's 2.5°. Mercury's is tilted 7° and dwarf planet Pluto's 17°. The Moon's orbit around Earth is tipped about 5°. All of these are small enough that, seen from Earth, every one of these bodies stays inside a narrow band of sky.`,
    lookFor: 'Tilt until the orbits flatten into a near-straight line.',
    scene: {
      view: 'helio', zoom: 'inner', date: 'now', rate: 5, bodies: 'all',
      show: { orbits: true },
    },
  },
  {
    id: 'flat-band',
    chapter: 'flat',
    title: 'One band of sky',
    voice: 'astronomy',
    body: `Now imagine standing on Earth and looking out at the others. Because we sit inside that same flat disc, every planet, and the Sun itself, always appears along one narrow strip of our sky. Picture a running track seen from the inside lane: every runner, near or far, is somewhere around the same ring. That strip is called the [[ecliptic]], and everything in a horoscope happens along it.`,
    deeper: `Strictly, the ecliptic is the Sun's apparent path through the year: the plane of Earth's orbit projected onto the sky. The planets wander a few degrees above and below it, the Moon up to about 5°. Astronomers draw it on an imaginary [[celestial-sphere|celestial sphere]], a giant globe around Earth on which every star and planet seems to sit. Nothing is really painted on a sphere, but directions are all we can see.`,
    lookFor: 'The lines from Earth to each planet, all lying nearly flat in one plane.',
    scene: {
      view: 'helio', zoom: 'outer', date: 'now', rate: 5, bodies: 'all',
      show: { orbits: true, ring: true, sightLines: 'all' },
    },
  },

  // 3. The ring of twelve
  {
    id: 'ring-twelve',
    chapter: 'ring',
    title: 'Cut the band into twelve',
    voice: 'both',
    body: `Here is that band of sky drawn as a ring around us and cut into twelve equal slices of 30°, like the hours on a clock face. Each slice is a [[sign]] of the [[zodiac]]: Aries, Taurus, Gemini and on round to Pisces. The ring is far bigger than the solar system because it stands for directions, not places. When astrologers say a planet is "in Leo", they mean it lies in the Leo direction.`,
    deeper: `Twelve probably comes from the Moon: there are about twelve lunar months in a year, and the Babylonian astronomers who standardised the zodiac, around the 5th century BC, used a calendar built on them. Twelve also divides neatly by 2, 3, 4 and 6, which matters for the geometry of aspects later on. A full circle is 360 [[degree|degrees]], so each sign is 30° wide, and positions are given within a sign: 15° Leo is halfway through Leo.`,
    lookFor: 'The twelve labelled slices of the ring, each 30° wide.',
    scene: {
      view: 'helio', zoom: 'outer', date: 'now', rate: 5, bodies: 'all',
      show: { orbits: true, ring: true, signLabels: true },
    },
  },
  {
    id: 'ring-zero',
    chapter: 'ring',
    title: 'Where the ring starts',
    voice: 'both',
    body: `A ring needs a starting point. The zodiac starts where the Sun stands at the [[equinox|March equinox]], around 20 March, when day and night are equal and spring begins in the north. That direction is 0° Aries, and the slices are counted on from there in the direction the Sun moves. So the signs are pinned to Earth's seasons, not to any stars. Keep that in mind; it matters in chapter 10.`,
    deeper: `At an equinox the Sun crosses the [[celestial-equator|celestial equator]], Earth's equator projected onto the sky. The ecliptic is tilted 23.4° to it, the same tilt, called [[obliquity]], that gives us seasons, so the two circles cross at two points. The March crossing, where the Sun moves from south to north, is 0° Aries; the September one is 0° Libra. Counting from the equinox like this is the [[tropical-zodiac|tropical zodiac]], the standard in Western astrology.`,
    lookFor: 'The line from Earth through the Sun, pointing at the start of Aries.',
    scene: {
      view: 'helio', zoom: 'earthSun', date: { event: 'marchEquinox' }, rate: 0, bodies: ['sun', 'earth'],
      show: { ring: true, signLabels: true, sightLines: ['sun'], earthAxis: true },
      highlight: { signs: ['aries'] },
    },
    task: { prompt: 'Click the Aries slice of the ring.', check: { type: 'clicked', id: 'aries' } },
  },

  // 4. Point of view
  {
    id: 'pov-ride',
    chapter: 'pov',
    title: 'Riding on Earth',
    voice: 'astronomy',
    body: `Here are just two bodies: the Sun, and Earth on its yearly lap. The zodiac ring is now centred on Earth, because that is where we watch from. Follow the line from Earth through the Sun out to the ring. As Earth moves, the line swings round and sweeps through the signs. It is like a carousel: as you ride, the lamp at the centre lines up with different stalls at the edge of the fairground.`,
    lookFor: 'The sight line from Earth through the Sun, and the sign it points at.',
    scene: {
      view: 'helio', zoom: 'earthSun', date: 'now', rate: 10, bodies: ['sun', 'earth'],
      show: { ring: true, signLabels: true, sightLines: ['sun'] },
      focus: 'earth',
    },
  },
  {
    id: 'pov-sunin',
    chapter: 'pov',
    title: 'What "Sun in Sagittarius" means',
    voice: 'both',
    body: `This is early December. The line from Earth through the Sun points into the Sagittarius slice. That is all "Sun in Sagittarius" means: on that day, seen from Earth, the Sun lay in the Sagittarius direction. Notice the twist: you can never see the stars there at this time of year, because the Sun is right in front of them, in daylight. Six months later they are on show on summer nights.`,
    deeper: `Your Sun sign is just your birthday translated into this direction. That is why it can be read off a calendar: the Sun takes a year to go round, so on any given date it is in nearly the same place every year. Near the boundaries the changeover shifts by a day or so between years, because a year is not a whole number of days. People born on a sign's [[cusp]] need the exact year and time to be sure.`,
    lookFor: 'The sight line ending in the highlighted Sagittarius slice.',
    scene: {
      view: 'helio', zoom: 'earthSun', date: EARLY_DECEMBER, rate: 0, bodies: ['sun', 'earth'],
      show: { ring: true, signLabels: true, sightLines: ['sun'] },
      focus: 'earth',
      highlight: { signs: ['sagittarius'] },
    },
  },
  {
    id: 'pov-flip',
    chapter: 'pov',
    title: 'Flip the point of view',
    voice: 'astronomy',
    body: `Now keep Earth still and let everything else move around it: switch to the Earth-centred view. Nothing in the sky changes, only the reference point. From here the Sun seems to circle us once a year, and the sight line becomes simply the direction of the Sun. This [[geocentric]] view is the one astrology uses, because it describes what an observer on Earth sees.`,
    deeper: `The Sun-centred, or [[heliocentric]], view is better for understanding why things move as they do. The Earth-centred view is better for describing where things appear from where we stand, which is the question both astrology and practical stargazing ask. Switching between them is just a change of viewpoint, like describing a car journey from the driver's seat or from a helicopter overhead. Astronomers use both.`,
    lookFor: 'The view switch labelled Earth-centred.',
    scene: {
      view: 'helio', zoom: 'earthSun', date: EARLY_DECEMBER, rate: 0, bodies: ['sun', 'earth'],
      show: { ring: true, signLabels: true, sightLines: ['sun'] },
      highlight: { signs: ['sagittarius'] },
    },
    task: { prompt: 'Switch to the Earth-centred view.', check: { type: 'view', view: 'geo' } },
  },
  {
    id: 'pov-everyone',
    chapter: 'pov',
    title: 'Everyone gets a sign',
    voice: 'both',
    body: `Now bring back the rest of the solar system, still seen from Earth. Every planet gets the same treatment: draw a line from Earth to it, follow it out to the ring, and read off the sign. Mars lands in one slice, Jupiter in another, the Moon somewhere else again. A birth chart is simply this list for one moment: which direction every body lay in, as seen from where you were born.`,
    lookFor: 'One sight line per body, each ending in a sign.',
    scene: {
      view: 'geo', date: EARLY_DECEMBER, rate: 1, bodies: 'all',
      show: { ring: true, signLabels: true, sightLines: 'all' },
    },
  },

  // 5. A year of Sun signs
  {
    id: 'year-month',
    chapter: 'year',
    title: 'A sign a month',
    voice: 'astronomy',
    body: `Watch the Sun at ten days per second. It moves steadily round the ring, about one degree a day, so it spends about a month in each sign and comes back to the same place after a year. That is why the familiar Sun-sign dates barely change from year to year. The Sun never goes backwards and never skips a sign: it is the steady beat of the whole system.`,
    deeper: `The Sun moves slightly faster in early January, when Earth is closest to it, and slightly slower in early July, when Earth is farthest away. So it crosses Capricorn in about 29 and a half days and Cancer in about 31 and a half.`,
    lookFor: 'The Sun crossing the boundaries between signs.',
    scene: {
      view: 'geo', date: 'now', rate: 10, bodies: ['sun'],
      show: { ring: true, signLabels: true, sightLines: ['sun'], trails: ['sun'] },
    },
  },
  {
    id: 'year-turning',
    chapter: 'year',
    title: 'Four turning points',
    voice: 'both',
    body: `Four signs are highlighted. Each begins at a turning point of the year: Aries at the March [[equinox]], Cancer at the June [[solstice]], Libra at the September equinox and Capricorn at the December solstice. Astrologers call these the [[modality|cardinal]] signs, from the Latin for hinge, and read them as starters because each opens a season. South of the equator the seasons are reversed, but the signs stay the same.`,
    deeper: `The seasons come from the 23.4° tilt of Earth's axis. In June the northern hemisphere leans towards the Sun, so the Sun climbs high and days are long; in December it leans away. At the equinoxes neither hemisphere leans towards the Sun, and day and night are about equal everywhere. Because the tropical zodiac is anchored to these points, every sign has a fixed place in the seasonal cycle, and the traditional sign meanings were written with the northern seasons in mind.`,
    lookFor: 'The four highlighted cardinal signs at the quarter points of the ring.',
    scene: {
      view: 'geo', date: { event: 'marchEquinox' }, rate: 5, bodies: ['sun'],
      show: { ring: true, signLabels: true, sightLines: ['sun'], earthAxis: true },
      highlight: { signs: ['aries', 'cancer', 'libra', 'capricorn'] },
    },
  },
  {
    id: 'year-task',
    chapter: 'year',
    title: 'Your turn: move the Sun along',
    voice: 'astronomy',
    body: `Time is stopped in mid-October, with the Sun in Libra. Now you drive. Use the time controls to move the date forward until the Sun crosses into the next slice, Scorpio, and watch the date as it happens: around 23 October. The moment a body enters a new sign is called an [[ingress]]. Astrologers watch ingresses closely; the Sun's mark the changeover of the familiar Sun-sign months.`,
    lookFor: 'The time controls, and the border between Libra and Scorpio.',
    scene: {
      view: 'geo', date: '2025-10-12T12:00:00Z', rate: 0, bodies: ['sun'],
      show: { ring: true, signLabels: true, sightLines: ['sun'] },
      highlight: { signs: ['libra', 'scorpio'] },
    },
    task: { prompt: 'Move time forward until the Sun enters Scorpio.', check: { type: 'bodyInSign', body: 'sun', sign: 'scorpio' } },
  },

  // 6. The Moon
  {
    id: 'moon-lap',
    chapter: 'moon',
    title: 'The fast lap',
    voice: 'both',
    body: `Now the Moon, at one day per second. It is the fastest thing in a chart: a full lap of the zodiac in 27.3 days, about two and a half days in each sign. While the Sun crawls through a single sign, the Moon goes all the way round. That is why astrologers say the Moon's sign needs the birth date and, on some days, the birth time too.`,
    lookFor: 'The Moon racing ahead of the Sun around the ring.',
    scene: {
      view: 'geo', date: 'now', rate: 1, bodies: ['sun', 'moon'],
      show: { ring: true, signLabels: true, sightLines: ['moon'], trails: ['moon'] },
    },
  },
  {
    id: 'moon-phases',
    chapter: 'moon',
    title: 'Phases are angles',
    voice: 'both',
    body: `We are at a [[new-moon|new moon]]: Moon and Sun in the same direction, the Moon dark because its lit side faces away from us. Move time forward and watch the angle between them open. At 90° we see a half Moon; at 180°, opposite the Sun, a [[full-moon|full moon]]. Every phase is just a Sun-Moon angle seen from Earth. Keep going until the Moon stands directly opposite the Sun.`,
    deeper: `A full cycle of phases takes 29.5 days, two days longer than the Moon's lap of the zodiac: by the time the Moon is back at the same stars, the Sun has moved on and the Moon needs a couple of days to catch up. In astrology the new moon is a Sun-Moon [[conjunction]] and the full moon an [[opposition]], two of the aspects in chapter 8. When either happens near the Moon's [[lunar-node|nodes]], it becomes an [[eclipse]].`,
    lookFor: 'The angle between the Sun and Moon lines opening day by day.',
    scene: {
      view: 'geo', date: { event: 'nextNewMoon' }, rate: 0, bodies: ['sun', 'moon'],
      show: { ring: true, signLabels: true, sightLines: ['sun', 'moon'], aspects: true },
      highlight: { aspect: ['sun', 'moon'] },
    },
    task: { prompt: 'Move time forward until the Moon is opposite the Sun: a full moon.', check: { type: 'aspect', a: 'sun', b: 'moon', aspect: 'opposition' } },
  },

  // 7. The planets
  {
    id: 'planets-tiers',
    chapter: 'planets',
    title: 'Three speeds',
    voice: 'both',
    body: `At thirty days per second the bodies sort themselves into speed tiers. The Moon, Sun, Mercury, Venus and Mars cross a sign in days to weeks. Jupiter and Saturn take one to two and a half years. Uranus, Neptune and Pluto barely move, taking seven to thirty years per sign. Astrologers group them the same way, as [[personal-planets|personal]], [[social-planets|social]] and [[generational-planets|generational]] planets: the slower the planet, the more people share its sign.`,
    deeper: `Typical stays in one sign: Moon 2.5 days; Sun about a month; Mercury 2 to 3 weeks; Venus 3 to 4 weeks; Mars 6 to 7 weeks; Jupiter about a year; Saturn about 2.5 years; Uranus about 7; Neptune about 14; Pluto 12 to 30. Mercury and Venus never stray far from the Sun, so they always sit in or near your Sun sign. A retrograde loop can stretch any of these stays by months.`,
    lookFor: 'The trails: long for the fast planets, short for the slow ones.',
    scene: {
      view: 'geo', date: 'now', rate: 30, bodies: 'all',
      show: { ring: true, signLabels: true, trails: ['mercury', 'venus', 'mars', 'jupiter', 'saturn'] },
    },
  },
  {
    id: 'planets-meanings',
    chapter: 'planets',
    title: 'What each planet stands for',
    voice: 'astrology',
    body: `In astrology each planet stands for a basic drive: the "what" of a chart. Astrologers read the Sun as identity, the Moon as feelings and needs, Mercury as the mind, Venus as love and values, and Mars as drive. Jupiter is growth and Saturn structure; Uranus, Neptune and Pluto stand for change, dreams and transformation across generations. Click any planet to open its full profile in both voices.`,
    lookFor: 'Click a planet to open its card.',
    scene: {
      view: 'geo', date: 'now', rate: 2, bodies: 'all',
      show: { ring: true, signLabels: true, sightLines: 'all' },
      highlight: { bodies: ['sun', 'moon', 'mercury', 'venus', 'mars'] },
    },
    task: { prompt: 'Click Mars to open its card.', check: { type: 'clicked', id: 'mars' } },
  },

  // 8. Aspects
  {
    id: 'aspects-great',
    chapter: 'aspects',
    title: 'Conjunction: the same direction',
    voice: 'both',
    body: `21 December 2020. Seen from Earth, Jupiter and Saturn sat almost exactly in the same direction, a tenth of a degree apart, right at the start of Aquarius. People around the world saw them low in the evening twilight as one bright double star. When two bodies point the same way like this, it is called a [[conjunction]], and astrologers read the two planets' meanings as merging into one.`,
    deeper: `Jupiter and Saturn meet about every 20 years, a [[great-conjunction|great conjunction]], but this one was the closest since 1623. Astrologers made much of it: for about two centuries these meetings had fallen mostly in earth signs, and 2020's opened a long series in air signs, which they read as a shift from material concerns towards information and networks.`,
    lookFor: 'Two sight lines, to Jupiter and to Saturn, almost on top of each other.',
    scene: {
      view: 'geo', zoom: 'outer', date: { event: 'greatConjunction2020' }, rate: 0, bodies: ['sun', 'jupiter', 'saturn'],
      show: { ring: true, signLabels: true, sightLines: ['jupiter', 'saturn'], aspects: true },
      focus: 'jupiter',
      highlight: { signs: ['aquarius'], aspect: ['jupiter', 'saturn'] },
    },
  },
  {
    id: 'aspects-outside',
    chapter: 'aspects',
    title: 'Lined up, yet far apart',
    voice: 'astronomy',
    body: `The same moment, seen from outside the solar system. The two sight lines from Earth still nearly coincide, but look how far apart the planets really are: Jupiter about 890 million km from us, Saturn about 1.6 billion. More than 700 million km separated them. A conjunction is a lining-up of directions, like two streetlights on the same road that look stacked from where you stand. Aspects are always about directions seen from Earth.`,
    lookFor: 'Earth, Jupiter and Saturn strung out along nearly one line.',
    scene: {
      view: 'helio', zoom: 'outer', date: { event: 'greatConjunction2020' }, rate: 0, bodies: ['sun', 'earth', 'jupiter', 'saturn'],
      show: { ring: true, orbits: true, sightLines: ['jupiter', 'saturn'] },
    },
  },
  {
    id: 'aspects-five',
    chapter: 'aspects',
    title: 'Five angles',
    voice: 'both',
    body: `An [[aspect]] is the angle between two bodies as seen from Earth. Astrologers use five main ones, all neat fractions of the circle: [[conjunction]] 0°, [[sextile]] 60°, [[square]] 90°, [[trine]] 120° and [[opposition]] 180°. The coloured lines connect pairs of planets that are at one of these angles right now. Astrologers read them as conversations: easy for sextiles and trines, tense for squares and oppositions, fused for conjunctions.`,
    deeper: `Why these angles? They divide the circle by 1, 2, 3, 4 and 6, the same divisions that give the signs their pattern. Planets in trine usually share an [[element]]; planets in square usually share a [[modality]] but clash in element; opposite signs are complementary partners. Astrologers also use minor aspects, such as the 150° quincunx, but these five are the core grammar.`,
    lookFor: 'Coloured lines linking planets; each colour is one kind of aspect.',
    scene: {
      view: 'geo', date: 'now', rate: 2, bodies: 'all',
      show: { ring: true, signLabels: true, aspects: true },
    },
  },
  {
    id: 'aspects-orb',
    chapter: 'aspects',
    title: 'Close enough counts',
    voice: 'both',
    body: `Planets rarely hit an exact angle, so astrologers allow some leeway, called the [[orb]]: up to about 8° for a conjunction or opposition, less for a sextile. Inside the orb the aspect counts, and the closer to exact, the stronger it is read. Try it: from this new moon, move time forward until the Moon is a third of the circle ahead of the Sun. The trine lights up as the Moon enters the orb.`,
    deeper: `Astrologers also care whether an aspect is [[applying]], with the faster body still closing in on the exact angle, or [[separating]], already past it. Applying aspects are read as building, separating ones as fading. Orbs are a convention, not a law of nature, and they differ between schools; each aspect's card shows the values this app uses.`,
    lookFor: 'The Sun-Moon line changing colour as each aspect comes into orb.',
    scene: {
      view: 'geo', date: { event: 'nextNewMoon' }, rate: 0, bodies: ['sun', 'moon'],
      show: { ring: true, signLabels: true, sightLines: ['sun', 'moon'], aspects: true },
      highlight: { aspect: ['sun', 'moon'] },
    },
    task: { prompt: 'Move time forward until the Moon makes a trine (120°) to the Sun.', check: { type: 'aspect', a: 'sun', b: 'moon', aspect: 'trine' } },
  },

  // 9. Retrograde
  {
    id: 'retro-mars',
    chapter: 'retrograde',
    title: 'Mars walks backwards',
    voice: 'astronomy',
    body: `Mars normally moves forward through the signs, the same way as the Sun. But watch its trail over the coming months. It slows, stops, drifts backward for about ten weeks, stops again, then carries on. The backward stretch is called [[retrograde]] motion, and the pauses are [[station|stations]]. Against the stars the trail draws a loop or a zigzag. Ancient astronomers spent centuries trying to explain it.`,
    lookFor: 'The Mars trail turning back on itself.',
    scene: {
      view: 'geo', date: { event: 'nextMarsRetrograde' }, rate: 3, bodies: ['sun', 'mars'],
      show: { ring: true, signLabels: true, sightLines: ['mars'], trails: ['mars'] },
      focus: 'mars',
    },
    task: { prompt: 'Let time run until Mars turns backwards.', check: { type: 'retrograde', body: 'mars' } },
  },
  {
    id: 'retro-overtake',
    chapter: 'retrograde',
    title: 'Overtaking on the motorway',
    voice: 'astronomy',
    body: `The same months, seen from above. Earth, on the inside lane, moves faster than Mars and catches up with it. As we overtake, the line from Earth to Mars swings backward against the distant ring, just as a slower car seems to slide backward past you when you overtake it on the motorway. Nothing actually reverses. Mars keeps moving forward the whole time; only our viewpoint changes.`,
    deeper: `This happens every 26 months for Mars and every year for the slower outer planets. In the middle of the backward stretch the planet stands opposite the Sun in our sky: Earth is between them, so the planet is at its closest and brightest and visible all night. Mercury and Venus turn retrograde for the mirror-image reason: they are on faster inside lanes and overtake us. Putting the Sun at the centre explained all this neatly, one of the strongest early arguments for Copernicus.`,
    lookFor: 'The Earth-Mars sight line swinging backward as Earth passes Mars.',
    scene: {
      view: 'helio', zoom: 'inner', date: { event: 'nextMarsRetrograde' }, rate: 3, bodies: ['sun', 'earth', 'mars'],
      show: { orbits: true, ring: true, signLabels: true, sightLines: ['mars'] },
    },
  },
  {
    id: 'retro-mercury',
    chapter: 'retrograde',
    title: 'Mercury retrograde',
    voice: 'both',
    body: `Mercury loops backward about three times a year, for roughly three weeks each time, as it overtakes Earth on the inside. In astrology a retrograde planet is read as turning its energy inward: reviewing, revisiting, redoing. "Mercury retrograde" is the famous one. Astrologers associate it with crossed wires, delays and second thoughts, and often suggest using it to edit and reconnect rather than to launch new things.`,
    deeper: `When a planet ends its backward phase and moves forward again, astrologers say it goes [[direct]]. People born during a retrograde have that planet retrograde in their chart, which astrologers read as a more inward or unconventional expression of it. The Sun and Moon never go retrograde, while the outer planets spend roughly a third or more of every year retrograde, so retrograde planets are common in charts.`,
    lookFor: "Mercury's trail doubling back while staying close to the Sun.",
    scene: {
      view: 'geo', date: { event: 'nextMercuryRetrograde' }, rate: 2, bodies: ['sun', 'mercury'],
      show: { ring: true, signLabels: true, sightLines: ['sun', 'mercury'], trails: ['mercury'] },
    },
  },

  // 10. Signs are not constellations
  {
    id: 'prec-pictures',
    chapter: 'precession',
    title: 'Signs versus star pictures',
    voice: 'astronomy',
    body: `Now the real star patterns are switched on: the [[constellation|constellations]] the signs were named after. Look closely and you will see they do not line up with the slices. Most sit about one sign further round than their namesake, and they are not equal in size either: Virgo is huge, Scorpius barely touches the band. Signs are equal 30° divisions anchored to the seasons; constellations are irregular pictures anchored to the stars.`,
    lookFor: 'Each constellation outline sitting roughly one slice along from its sign.',
    scene: {
      view: 'geo', date: 'now', rate: 1, bodies: ['sun'],
      show: { ring: true, signLabels: true, constellations: true, sightLines: ['sun'] },
    },
  },
  {
    id: 'prec-slide',
    chapter: 'precession',
    title: 'The 2,000-year slide',
    voice: 'astronomy',
    body: `The clock now runs at a century per second, starting in the year 1. Watch the star pictures creep along the ring while the signs stay put. Earth's axis wobbles like a slowing spinning top, a motion called [[precession]] that takes about 25,800 years per cycle. It drags the equinox, and with it the whole zodiac, backward through the stars by about 1° every 72 years. Two thousand years ago signs and constellations roughly matched; today they are about 24° apart.`,
    deeper: `Tropical signs are defined by the equinox, so they move with it and keep their place in the seasons; the stars do not. Western astrology kept the seasonal definition, set out by Ptolemy in the 2nd century AD, while Indian astrology kept a star-based one. Neither is a mistake: they are two reference frames that happened to agree around two thousand years ago. Precession also gives astrology its "ages": the March equinox point lies in the constellation Pisces and is drifting towards Aquarius, though nobody agrees exactly when the Age of Aquarius begins.`,
    lookFor: 'The constellation outlines sliding along the ring while the signs stay fixed.',
    scene: {
      view: 'geo', date: '0001-03-22T12:00:00Z', rate: 36525, bodies: [],
      show: { ring: true, signLabels: true, constellations: true, earthAxis: true },
      highlight: { signs: ['aries'] },
    },
  },
  {
    id: 'prec-ophiuchus',
    chapter: 'precession',
    title: 'The thirteenth constellation',
    voice: 'both',
    body: `Back to early December. The tropical Sun is in Sagittarius, but the stars actually behind it belong to [[ophiuchus|Ophiuchus]], the Serpent-bearer, which the Sun crosses from about 29 November to 17 December. It was never a sign, because the zodiac was defined as twelve equal slices, not as the constellations. [[sidereal-zodiac|Sidereal]] astrology, used in India, ties the signs to the stars instead, but it still uses twelve, not thirteen.`,
    deeper: `Sidereal astrologers keep equal 30° signs but shift them to line up with the stars, using an offset called the [[ayanamsa]], currently about 24°. So most people's sidereal Sun sign is one sign earlier than their tropical one: a tropical Sagittarius born in early December is a sidereal Scorpio. The newspaper stories that appear every few years claiming "your sign has changed" mix up these two systems. This app uses the tropical zodiac, like nearly all Western astrology.`,
    lookFor: 'The Ophiuchus outline behind the Sun, inside the Sagittarius slice.',
    scene: {
      view: 'geo', date: EARLY_DECEMBER, rate: 0, bodies: ['sun'],
      show: { ring: true, signLabels: true, constellations: true, sightLines: ['sun'] },
      highlight: { signs: ['sagittarius'] },
    },
  },

  // 11. Standing on Earth
  {
    id: 'sky-dome',
    chapter: 'sky',
    title: 'Standing on Earth',
    voice: 'astronomy',
    body: `Now you are standing on the ground in London, with the sky as a dome overhead. The flat line is your [[horizon]]; facing south, east is on your left. Half the zodiac ring is below the ground, hidden by Earth itself. Time runs at about an hour per second: Earth's spin carries the whole ring past you, so signs and planets rise in the east, arc across the south and set in the west, once a day.`,
    deeper: `This daily wheel is separate from the slow drift through the signs you saw earlier: picture a clock face spinning once a day while its hands, the planets, creep slowly round it. The ring comes back to the same position every 23 hours 56 minutes, a sidereal day, slightly shorter than a solar day because Earth also moves along its orbit (see [[diurnal-motion|daily motion]]). Because the ecliptic is tilted, the ring does not turn evenly against your horizon: it rides high at some times of day and low at others.`,
    lookFor: 'The horizon line, and signs climbing over it in the east.',
    scene: {
      view: 'sky', date: 'now', rate: 0.04, location: LONDON, bodies: PLANETS,
      show: { horizon: true, ring: true, signLabels: true },
    },
  },
  {
    id: 'sky-rising',
    chapter: 'sky',
    title: 'The rising sign',
    voice: 'both',
    body: `The point where the ring crosses the eastern horizon is the [[ascendant]], and the sign it falls in is the rising sign. Because the whole ring passes through in a day, the rising sign changes about every two hours. That is why astrologers ask for a birth time: two people born on the same day share a Sun sign but may have different rising signs. Try it: run time until Leo is rising.`,
    deeper: `Not every sign takes two hours to rise. From London, Pisces and Aries climb over the horizon steeply and quickly, in about an hour, while Virgo and Libra slant up slowly and take three hours or more. Closer to the poles the difference becomes extreme. The point opposite the Ascendant, setting in the west, is the [[descendant]].`,
    lookFor: 'The AC marker where the ring meets the eastern horizon.',
    scene: {
      view: 'sky', date: 'now', rate: 0.04, location: LONDON, bodies: WITH_ANGLES,
      show: { horizon: true, ring: true, signLabels: true },
      highlight: { bodies: ['ascendant'] },
    },
    task: { prompt: 'Run time until Leo is rising on the eastern horizon.', check: { type: 'risingSign', sign: 'leo' } },
  },
  {
    id: 'sky-mc',
    chapter: 'sky',
    title: 'The top of the sky',
    voice: 'both',
    body: `Picture a line across the sky from due north, over your head, to due south: the [[meridian]]. Everything reaches its highest point as it crosses it; the Sun does so at midday. The point where the ring crosses the meridian on the southern side is the [[midheaven]], or MC. Astrologers read it as public direction and career, and with the Ascendant it is one of the chart's [[angles]], its most time-sensitive points.`,
    deeper: `From the southern hemisphere the Midheaven is usually seen to the north instead. Below the horizon, hidden by Earth, the meridian meets the ring again at the [[ic|IC]], the lowest point, which astrologers associate with home and roots. Ascendant, Descendant, Midheaven and IC together form the four angles, the cross that divides a chart into quarters.`,
    lookFor: 'The MC marker at the highest point of the ring, due south.',
    scene: {
      view: 'sky', date: 'now', rate: 0.03, location: LONDON, bodies: WITH_ANGLES,
      show: { horizon: true, ring: true, signLabels: true },
      highlight: { bodies: ['midheaven'] },
    },
  },

  // 12. Houses
  {
    id: 'houses-sectors',
    chapter: 'houses',
    title: 'Twelve sectors of your sky',
    voice: 'both',
    body: `Signs divide the zodiac; [[house|houses]] divide your local sky. Starting at the Ascendant and running down under the eastern horizon, the sky around you is cut into twelve sectors numbered 1 to 12. Houses 1 to 6 lie below the horizon, 7 to 12 above. Each planet sits in one house as well as one sign, and astrologers read the house as the area of life where its drive plays out: work, home, love, friends.`,
    deeper: `House numbers run against the daily motion, so a planet that has just risen is in the 12th house, then the 11th, reaching the 10th just before its highest point. That makes a neat birth-time clue: the Sun in the 12th means birth in the couple of hours after sunrise, in the 10th or 9th around midday, in the 7th before sunset, and in the 4th or 3rd around midnight.`,
    lookFor: 'The twelve numbered sectors, with house 1 just below the eastern horizon.',
    scene: {
      view: 'sky', date: 'now', rate: 0, location: LONDON, bodies: WITH_ANGLES,
      show: { horizon: true, ring: true, signLabels: true, houses: true },
    },
  },
  {
    id: 'houses-systems',
    chapter: 'houses',
    title: 'Two ways to cut the sky',
    voice: 'astrology',
    body: `Astrologers disagree on where to draw the house lines. This app uses [[whole-sign-houses|Whole Sign houses]] by default, the oldest method: the whole rising sign becomes the 1st house, the next sign the 2nd, and so on, so houses and signs line up. You can switch to [[placidus|Placidus]], popular in the 20th century, which divides the sky by time and gives unequal houses. The planets stay put; only the boundaries move.`,
    deeper: `Whole Sign houses come from Hellenistic astrology about 2,000 years ago and remain standard in Indian astrology; many Western astrologers have returned to them. Placidus divides the time each degree takes to climb from the horizon to the meridian into thirds. It ties the 10th house exactly to the Midheaven, but at high latitudes it produces very lopsided houses, and beyond the polar circles it cannot be calculated. A planet near a house boundary may change house when you switch.`,
    lookFor: 'The house-system switch in the settings panel.',
    scene: {
      view: 'sky', date: 'now', rate: 0, location: LONDON, bodies: WITH_ANGLES,
      show: { horizon: true, ring: true, signLabels: true, houses: true },
    },
  },

  // 13. The chart wheel
  {
    id: 'wheel-flatten',
    chapter: 'wheel',
    title: 'The sky, flattened',
    voice: 'both',
    body: `Now the dome is flattened into a circle: a [[chart-wheel|chart wheel]]. Earth is the dot in the middle, the zodiac runs round the edge, and the horizon is the horizontal line, with the Ascendant on the left (east) and the Descendant on the right (west). The Midheaven sits near the top. Above the line is the visible sky, below it the hidden half. A chart is a snapshot of this for one moment and one place.`,
    deeper: `The wheel is drawn as if you were facing south from the northern hemisphere, which is why east is on the left, unlike on a map. The zodiac runs anticlockwise around it, and the daily turn carries everything clockwise: planets rise at the left, reach the top and set at the right. Most chart software draws it this way, though details vary.`,
    lookFor: 'The horizontal horizon line, with AC on the left and MC near the top.',
    scene: {
      view: 'geo', date: 'now', rate: 0, location: LONDON, bodies: WITH_ANGLES,
      show: { ring: true, signLabels: true, houses: true, wheel: true },
    },
  },
  {
    id: 'wheel-symbols',
    chapter: 'wheel',
    title: 'Reading the symbols',
    voice: 'both',
    body: `Charts use an old shorthand. A circle with a dot is the Sun, a crescent the Moon, a circle with an arrow Mars, and so on; each sign has a symbol too, such as the arrow of Sagittarius. Beside each planet is its position, for example 13° Sagittarius. Hover over any symbol to see its name. Planets bunched together on the wheel are in [[conjunction]]; planets on opposite sides are in [[opposition]].`,
    lookFor: 'The planet symbols around the wheel, each with its degree.',
    scene: {
      view: 'geo', date: 'now', rate: 0, location: LONDON, bodies: WITH_ANGLES,
      show: { ring: true, signLabels: true, houses: true, wheel: true },
    },
    task: { prompt: "Click the Sun's symbol on the wheel.", check: { type: 'clicked', id: 'sun' } },
  },

  // 14. Reading a chart
  {
    id: 'reading-grammar',
    chapter: 'reading',
    title: 'What, how, where',
    voice: 'astrology',
    body: `Astrologers read a chart like a sentence. The planet is the what (a drive: identity, love, ambition), the sign is the how (its style), and the house is the where (an area of life). So the Sun in Sagittarius in the 10th house reads as identity, expressed adventurously, through career and public life. Aspects add the verbs: how two planets talk, easily in a trine, with friction in a square, as one voice in a conjunction.`,
    deeper: `Astrologers weigh aspects by how exact they are, which bodies are involved (the Sun, the Moon and the [[ruler]] of the rising sign count most) and whether several aspects link up into a pattern. Much of chart reading is deciding which few conversations are the loudest. Click any planet on the wheel to see its sentence assembled, or any line to hear what that pair is said to be discussing.`,
    lookFor: 'The sentence builder on a planet card.',
    scene: {
      view: 'geo', date: 'now', rate: 0, location: LONDON, bodies: WITH_ANGLES,
      show: { ring: true, signLabels: true, houses: true, wheel: true, aspects: true },
      highlight: { bodies: ['sun'] },
    },
  },
  {
    id: 'reading-elements',
    chapter: 'reading',
    title: 'Elements and modes',
    voice: 'astrology',
    body: `Every sign has an [[element]] and a [[modality]]. The elements are fire (Aries, Leo, Sagittarius: spirited), earth (practical), air (social, mental) and water (emotional). The modalities are cardinal (starting), fixed (sustaining) and mutable (adapting). Each sign is one unique pairing: Aries is cardinal fire, Taurus fixed earth. Astrologers count the planets in each to sketch a chart's overall temperament before reading any details.`,
    deeper: `The elements come from Greek natural philosophy, and they cycle in a fixed order round the ring: fire, earth, air, water, then fire again. That is why signs a trine apart share an element and signs a square apart share a modality. Astrologers often say a chart that lacks an element points to a quality the person has to work at, or looks for in others.`,
    lookFor: 'The three fire signs, evenly spaced around the ring.',
    scene: {
      view: 'geo', date: 'now', rate: 0, location: LONDON, bodies: WITH_ANGLES,
      show: { ring: true, signLabels: true, wheel: true },
      highlight: { signs: ['aries', 'leo', 'sagittarius'] },
    },
  },
  {
    id: 'reading-big3',
    chapter: 'reading',
    title: 'The big three',
    voice: 'astrology',
    body: `If you remember only three placements, astrologers suggest these: the [[big-three|big three]]. The Sun sign is read as core identity, the Moon sign as emotional needs, and the rising sign as outward style and first impression. Together they make a quick portrait: someone with a Sagittarius Sun, Cancer Moon and Virgo rising might be read as an adventurer at heart who needs a safe home base and meets the world carefully.`,
    lookFor: 'The Sun, Moon and Ascendant, highlighted on the wheel.',
    scene: {
      view: 'geo', date: 'now', rate: 0, location: LONDON, bodies: WITH_ANGLES,
      show: { ring: true, signLabels: true, houses: true, wheel: true },
      highlight: { bodies: ['sun', 'moon', 'ascendant'] },
    },
  },

  // 15. Your own sky
  {
    id: 'yours-enter',
    chapter: 'yours',
    title: 'Your birth sky',
    voice: 'astronomy',
    body: `Now it is your turn. Enter a birth date, time and place in the form, and the whole scene jumps to that moment and that spot on Earth: the planets move to where they really were, and the sight lines show which sign each lay in. The more accurate the time, the more reliable the Moon, the Ascendant and the houses. No birth time? You still get every planet's sign.`,
    deeper: `The place matters because the Ascendant, Midheaven and houses depend on your horizon. The time is converted to Universal Time using the time zone and daylight-saving rules in force at that place on that date. Everything is calculated in your browser; nothing is sent to a server.`,
    lookFor: 'The birth details form.',
    scene: {
      view: 'geo', date: 'birth', rate: 0, location: 'birth', bodies: WITH_ANGLES,
      show: { ring: true, signLabels: true, sightLines: 'all' },
    },
  },
  {
    id: 'yours-share',
    chapter: 'yours',
    title: 'Read it, share it',
    voice: 'both',
    body: `Here is that moment drawn as a wheel. Walk it the way you learned: the big three first, then each planet's what, how and where, then the loudest aspects. To show someone else, use Share: it makes a link with the birth details written into the web address itself, so anyone with the link sees the same sky. Share only charts whose owners are happy to have them shared.`,
    lookFor: 'The Share button.',
    scene: {
      view: 'geo', date: 'birth', rate: 0, location: 'birth', bodies: WITH_ANGLES,
      show: { ring: true, signLabels: true, houses: true, wheel: true, aspects: true },
      highlight: { bodies: ['sun', 'moon', 'ascendant'] },
    },
  },
  {
    id: 'yours-sandbox',
    chapter: 'yours',
    title: 'The sky is yours',
    voice: 'both',
    body: `The tour ends here, but the sky keeps turning. Switch views, toggle sight lines, constellations and houses, change the speed, or run time backwards. The jump buttons take you straight to the next new or full moon, the next March equinox, or the next Mercury or Mars retrograde, so you can watch each one unfold. Whenever a word is underlined, there is more behind it.`,
    lookFor: 'The jump-to-event buttons beside the time controls.',
    scene: {
      view: 'geo', date: 'now', rate: 1, location: 'user', bodies: 'all',
      show: { ring: true, signLabels: true, aspects: true },
    },
  },
];
