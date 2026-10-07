// Planets, angles and points.
// Voices: top-level short/more/deep/keywords/whatPhrase are the ASTROLOGY voice
// (what the tradition reads). The `astronomy` sub-object is the ASTRONOMY voice.
// Glyphs carry U+FE0E (text presentation) so they never render as colour emoji.
// whatPhrase completes "...describes ___".

const T = '︎';

export const planetOrder = [
  'sun', 'moon', 'mercury', 'venus', 'mars',
  'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
];
export const pointOrder = ['ascendant', 'midheaven', 'northNode'];

export const planetGroups = {
  luminary: { name: 'Luminaries', short: `The Sun and Moon, the two great lights. Astrologers treat them as the core of a chart.` },
  personal: { name: 'Personal planets', short: `Mercury, Venus and Mars: fast movers read as the individual mind, heart and drive.` },
  social: { name: 'Social planets', short: `Jupiter and Saturn: about 1 and 2.5 years per sign, read as how you meet society.` },
  generational: { name: 'Generational planets', short: `Uranus, Neptune and Pluto: years to decades per sign, read as the mood of a generation.` },
  angle: { name: 'Angles', short: `Points where the zodiac meets your horizon and meridian; they depend on exact birth time and place.` },
  point: { name: 'Points', short: `Calculated points rather than bodies, such as the lunar nodes.` },
};

// Earth appears as a body in the Sun-centred view only; it is never "in a sign" itself.
export const earth = {
  id: 'earth',
  name: 'Earth',
  glyph: `⊕${T}`,
  color: '#4f8fdc',
  short: `Our planet, third from the Sun. Every sign position in a chart is a direction measured from here.`,
  astronomy: {
    short: `Earth orbits the Sun once every 365.25 days at about 150 million km, its axis tilted 23.4°.`,
    orbitalPeriod: '365.25 days around the Sun',
  },
};

export const planets = {
  sun: {
    id: 'sun',
    name: 'Sun',
    glyph: `☉${T}`,
    color: '#ffcc33',
    group: 'luminary',
    keywords: ['identity', 'vitality', 'purpose', 'will', 'self-expression'],
    short: `Astrologers read the Sun as your core self: the steady centre you grow into, and the vitality you run on.`,
    more: `In a chart the Sun is the headline. Astrologers associate it with identity, purpose, willpower and whatever makes you feel most alive. Its sign is the one people mean by "what's your sign?", because it is the only placement you can work out from a birthday alone. The tradition treats the Sun less as a fixed personality and more as a direction of growth: the self you become by living fully. With the Moon it is one of the two [[luminary|luminaries]], and it is the [[ruler]] of Leo.`,
    deep: `Ancient astrologers built their picture of the sky around the Sun, because it sets the day, the year and the seasons. That status carries into the chart: astrologers read the Sun as the organising principle, the conscious self that the other planets report to. Its sign describes the style of that self, its [[house]] the area of life where you most want to shine, and its [[aspect|aspects]] the other drives it has to negotiate with. A Sun closely linked to Saturn is often read as seriousness and late-blooming confidence; one tied to Jupiter as expansiveness and optimism.

Modern astrologers stress that the Sun is only one factor among many. Two people born on the same day share a Sun sign but may have different Moons, different rising signs and very different houses. That is why a Sun-sign column in a magazine and a full [[natal-chart|birth chart]] reading can feel so different: the first uses one twelfth of the information, the second uses the whole sky at one precise moment and place. The tradition also links the Sun with the heart, with fathers and authority figures, and with gold.`,
    astronomy: {
      short: `A star at the centre of the solar system; seen from Earth it slides about 1° a day along the [[ecliptic]], one lap a year.`,
      more: `The Sun does not really travel around us. Earth travels around the Sun, and as we move the Sun appears in front of different background stars, the way a lamp in the middle of a carousel seems to sweep past different stalls at the edge as you ride. One lap of Earth's orbit takes a year, so the Sun's apparent lap of the zodiac takes a year too: about 1° per day, about one sign per month. It moves slightly faster in early January, when Earth is closest to it.`,
      orbitalPeriod: 'Earth orbits it in 365.25 days, so it appears to circle the zodiac once a year',
      timePerSign: 'about 30 days',
      retrograde: 'Never. Its apparent motion is just Earth going round it, which never reverses.',
    },
    rules: ['leo'],
    traditionalRules: ['leo'],
    whatPhrase: 'your core identity, vitality and sense of purpose',
  },

  moon: {
    id: 'moon',
    name: 'Moon',
    glyph: `☽${T}`,
    color: '#d9d9e0',
    group: 'luminary',
    keywords: ['emotions', 'instinct', 'needs', 'comfort', 'memory', 'home'],
    short: `Astrologers read the Moon as your emotional body: instincts, moods, needs and what makes you feel safe.`,
    more: `Where the Sun is the self you grow into, the Moon in astrology is the self you fall back on: habits, reactions and the needs you had before you had words for them. Astrologers associate it with comfort, memory, home, the body's rhythms and the way you care for others and want to be cared for. Because it moves so fast, people born only a couple of days apart can have very different Moons. It is one of the two [[luminary|luminaries]] and part of the [[big-three|big three]].`,
    deep: `The Moon has always been the most visibly changing thing in the sky, waxing and waning every month and rising about fifty minutes later each night. Astrologers took that changeability as its character: the Moon describes what fluctuates in us, moods, appetites, the need for rest and reassurance. Its sign is read as the style of your emotional responses (a fire Moon flares and recovers quickly; an earth Moon wants routine and physical comfort), and its house as where you look for belonging.

The tradition also links the Moon to the mother or main caregiver, to childhood, to the public, and to Cancer, the sign it rules. Some astrologers pay attention to the [[lunar-phase|phase]] at birth: being born at a [[new-moon|new moon]], with Sun and Moon together, is read as a more single-minded, instinctive temperament; at a [[full-moon|full moon]], with the two opposite, as someone who lives with an inner pull between head and heart and tries to balance it. Because the Moon changes sign every two and a half days, if you do not know your birth time it is worth checking whether the Moon changed sign on your birthday.`,
    astronomy: {
      short: `Earth's natural satellite; it laps the zodiac in 27.3 days, about 13° a day, the fastest-moving body in a chart.`,
      more: `The Moon orbits Earth, about 384,000 km away, and travels around the Sun with us. Its orbit is tilted about 5° to the [[ecliptic]], so it wanders a little above and below the Sun's path but always stays in the zodiac band. It completes a lap against the stars in 27.3 days (the [[sidereal-month|sidereal month]]), spending about two and a half days in each sign. Its phases repeat a little more slowly, every 29.5 days, because by the time the Moon returns to the same stars the Sun has moved on.`,
      orbitalPeriod: '27.3 days around Earth relative to the stars; 29.5 days from one new moon to the next',
      timePerSign: 'about 2.5 days',
      retrograde: 'Never. It always moves forward through the zodiac.',
    },
    rules: ['cancer'],
    traditionalRules: ['cancer'],
    whatPhrase: 'your emotional needs, instincts and sense of safety',
  },

  mercury: {
    id: 'mercury',
    name: 'Mercury',
    glyph: `☿${T}`,
    color: '#a9a29a',
    group: 'personal',
    keywords: ['thinking', 'speech', 'learning', 'connection', 'trade', 'nerves'],
    short: `Astrologers read Mercury as your mind in motion: how you think, speak, learn and swap information.`,
    more: `Mercury, named after the quick messenger of the Roman gods, is associated in astrology with the mind's daily traffic: noticing, naming, reasoning, writing, talking, bargaining, commuting. Its sign is read as your thinking style, quick or deliberate, factual or imaginative, and its house as the subject your mind keeps returning to. In the sky Mercury is never more than 28° from the Sun, so it is always in your Sun sign or one of the signs next to it. It rules Gemini and Virgo.`,
    deep: `Mercury is a planet of connection and translation. Astrologers link it with language and numbers, siblings and neighbours, short trips, the hands and the nervous system, and commerce: the movement of goods and messages. In a chart it describes how you take in the world and hand it back in words.

Mercury is also behind the best-known piece of astrological folklore, "Mercury retrograde". About three times a year, for roughly three weeks, Mercury appears to slide backward. Astrologers associate these periods with miscommunication, delays, travel snags and technology hiccups, and often suggest using them for reviewing, revising and reconnecting rather than launching. People born with Mercury [[retrograde]], around one in five, are read as more inward or idiosyncratic thinkers who process before they speak.

Because it stays so close to the Sun, Mercury's sign often matches the Sun sign. When it falls in the sign before or after, astrologers read a mind that works in a different key from the core identity: a useful contrast rather than a conflict.`,
    astronomy: {
      short: `The smallest planet and closest to the Sun; it laps the Sun in 88 days and never strays far from it in our sky.`,
      more: `Because Mercury's orbit lies inside Earth's, we always see it near the Sun, at most about 28° away, low in the twilight after sunset or before sunrise. It races round the Sun in 88 days, so from Earth it seems to swing back and forth either side of the Sun, sometimes ahead of it in the zodiac and sometimes behind. Each time it passes between Earth and the Sun it overtakes us on the inside lane and appears to move backward for about three weeks, about three times a year.`,
      orbitalPeriod: '88 days around the Sun',
      timePerSign: 'about 2 to 3 weeks; up to 2 months when it turns retrograde in a sign',
      retrograde: 'About 3 times a year, for about 3 weeks each time.',
    },
    rules: ['gemini', 'virgo'],
    traditionalRules: ['gemini', 'virgo'],
    whatPhrase: 'how you think, learn and communicate',
  },

  venus: {
    id: 'venus',
    name: 'Venus',
    glyph: `♀${T}`,
    color: '#f1d9a6',
    group: 'personal',
    keywords: ['love', 'attraction', 'beauty', 'pleasure', 'values', 'harmony'],
    short: `Astrologers read Venus as what you value and enjoy: love, attraction, beauty, pleasure, and how you make peace.`,
    more: `Venus carries the name of the Roman goddess of love, and astrology keeps the association. It is read as the principle of attraction: what you find beautiful, whom you are drawn to, how you show affection, what you will spend money on, how you smooth things over. Its sign describes your taste and your style in relationships, its house where you look for pleasure and harmony. Like Mercury it stays close to the Sun, never more than 47° away, so it sits in your Sun sign or within two signs of it. It rules Taurus and Libra.`,
    deep: `Astrologers describe Venus as the planet of relating and valuing. In one direction it points to love and friendship, charm, diplomacy and the art of meeting others halfway; in the other to money, possessions and the senses, the things we hold dear. Its two signs show the two sides: Taurus, the earthy enjoyment of comfort, food and touch, and Libra, the airy pleasure of balance, fairness and good company.

Venus is the brightest planet in our sky, known as the morning or evening star depending on which side of the Sun it appears. Some astrologers distinguish a Venus that rises before the Sun, read as more impulsive in love, from one that sets after it, read as more reflective. About every 19 months Venus turns [[retrograde]] for around six weeks; astrologers associate those periods with old flames returning, reconsidering relationships and values, and caution about big purchases or makeovers. Over eight years Venus traces a near-perfect five-petalled pattern in the sky, because five of its cycles fit almost exactly into eight Earth years, one reason it has been linked with harmony and design since antiquity.`,
    astronomy: {
      short: `The second planet, wrapped in bright cloud; it laps the Sun in 225 days and never strays more than 47° from it in our sky.`,
      more: `Venus is almost Earth's size but hidden under thick, reflective clouds, which is why it is the brightest thing in the night sky after the Moon. Its orbit lies inside ours, so like Mercury it always appears near the Sun: the evening star after sunset or the morning star before dawn, never in the middle of the night. It goes round the Sun in 225 days. When it passes between Earth and the Sun, roughly every 19 months, it appears to move backward for about six weeks.`,
      orbitalPeriod: '225 days around the Sun',
      timePerSign: 'about 3 to 4 weeks; up to 4 months when it turns retrograde in a sign',
      retrograde: 'About every 19 months, for about 6 weeks.',
    },
    rules: ['taurus', 'libra'],
    traditionalRules: ['taurus', 'libra'],
    whatPhrase: 'what you love, value and find beautiful',
  },

  mars: {
    id: 'mars',
    name: 'Mars',
    glyph: `♂${T}`,
    color: '#d0613b',
    group: 'personal',
    keywords: ['drive', 'courage', 'desire', 'competition', 'anger', 'action'],
    short: `Astrologers read Mars as your drive: how you go after what you want, assert yourself, compete and get angry.`,
    more: `Named for the Roman god of war and coloured rust-red in the sky, Mars is read in astrology as the engine of action. It describes desire turned into effort: courage, ambition, competitiveness, sexuality, physical energy and temper. Its sign shows your style of going for things, head-on or strategically, in bursts or with stamina, and its house where you are most willing to fight or work hard. Astrologers often say Venus shows what you are drawn to and Mars how you pursue it. It rules Aries, and traditionally Scorpio too.`,
    deep: `Mars is the first planet beyond Earth, and the first that can stand opposite the Sun in our sky. Astrologers treat it as the principle of assertion: the part of us that says "I want" and "no", that cuts, defends, competes and starts. A well-used Mars is read as courage, initiative and the energy to finish things; a frustrated one as irritability, rashness or conflict.

Because it takes about two years to circle the zodiac, Mars is the slowest of the [[personal-planets|personal planets]], and its sign is shared by people born within a few weeks of each other. Every 26 months it turns [[retrograde]] for about ten weeks, usually while it is at its brightest in the night sky. Astrologers associate these periods with stalled initiatives, revisited fights and energy turned inward; being born with Mars retrograde is read as drive that is more internal, strategic or slow to ignite. Traditional astrology called Mars the "lesser malefic", a bringer of trouble, but modern astrologers mostly frame it as a neutral force that needs a constructive outlet.`,
    astronomy: {
      short: `The red planet, fourth from the Sun; it laps the Sun in 687 days and spends about six weeks in each sign.`,
      more: `Mars orbits outside Earth, taking 687 days, nearly two years, for one lap. Seen from Earth it takes about two years to go round the zodiac, longer when it loops backward. About every 26 months Earth catches up with Mars and overtakes it on the inside lane. Around then Mars is closest, brightest and up all night, standing opposite the Sun, and for about ten weeks it appears to drift backward against the stars, tracing a loop or a zigzag.`,
      orbitalPeriod: '687 days (1.9 years) around the Sun',
      timePerSign: 'about 6 to 7 weeks; up to 7 months when it turns retrograde in a sign',
      retrograde: 'About every 26 months, for about 10 weeks.',
    },
    rules: ['aries'],
    traditionalRules: ['aries', 'scorpio'],
    whatPhrase: 'your drive, courage and way of going after what you want',
  },

  jupiter: {
    id: 'jupiter',
    name: 'Jupiter',
    glyph: `♃${T}`,
    color: '#d8b38a',
    group: 'social',
    keywords: ['growth', 'optimism', 'meaning', 'generosity', 'luck', 'excess'],
    short: `Astrologers read Jupiter as growth and meaning: where you expand, find luck, seek wisdom and sometimes overdo it.`,
    more: `The largest planet carries the name of the king of the Roman gods, and astrology treats it as the principle of expansion. Jupiter is associated with optimism, generosity, faith, teaching, travel, law and the search for meaning, and also with excess: too much, too big, too sure. Its sign describes the style in which you grow and trust life; its house is read as an area where opportunities tend to come easily. Spending about a year in each sign, it is the first of the [[social-planets|social planets]]. It rules Sagittarius, and traditionally Pisces.`,
    deep: `Traditional astrology called Jupiter the "greater benefic", the planet of good fortune. Modern astrologers keep the warmth but add nuance: Jupiter magnifies whatever it touches, which can mean abundance or simply more of something, wanted or not. It is associated with higher education, philosophy and religion, long journeys and foreign cultures, mentors, and the generosity that comes from feeling there is enough to go round.

Jupiter's roughly twelve-year lap of the zodiac gives it a special role in timing. Astrologers speak of the "Jupiter return", when it comes back to its birth position around ages 12, 24, 36, 48 and so on, and associate those years with fresh starts and widening horizons. Because everyone born within the same year or so shares a Jupiter sign, astrologers read it partly as a social placement: it says something about what your age group believes in and hopes for, as well as about you. Its meeting with Saturn every twenty years, the [[great-conjunction|great conjunction]], was historically one of the major turning points of the sky, and you will see the 2020 one in this tour.`,
    astronomy: {
      short: `The largest planet, a gas giant five times farther from the Sun than Earth; one lap takes 11.9 years, about a year per sign.`,
      more: `Jupiter has more than 300 times Earth's mass, is made mostly of hydrogen and helium, and orbits about 5.2 [[au]] from the Sun, 5.2 times Earth's distance. It takes 11.9 years to go round, so it moves slowly against the stars, about one sign a year. Once a year Earth overtakes it on the inside, and for about four months Jupiter appears to move backward. It is usually one of the brightest points in the night sky, a steady cream-coloured light.`,
      orbitalPeriod: '11.9 years around the Sun',
      timePerSign: 'about 1 year',
      retrograde: 'Every year, for about 4 months.',
    },
    rules: ['sagittarius'],
    traditionalRules: ['sagittarius', 'pisces'],
    whatPhrase: 'where and how you grow, trust life and find meaning',
  },

  saturn: {
    id: 'saturn',
    name: 'Saturn',
    glyph: `♄${T}`,
    color: '#e3cf8f',
    group: 'social',
    keywords: ['structure', 'time', 'discipline', 'responsibility', 'limits', 'mastery'],
    short: `Astrologers read Saturn as structure and time: limits, responsibility, discipline, and what you build slowly the hard way.`,
    more: `Saturn was the farthest planet the ancients could see, the slow edge of the known sky, and astrology made it the planet of boundaries. It is associated with time, rules, duty, patience, ambition built over decades, and with fear, restriction and the lessons that only arrive through effort. Its sign shows how you handle authority and pressure; its house is read as an area of life that feels heavy at first and becomes a source of mastery later. It rules Capricorn, and traditionally Aquarius.`,
    deep: `Traditional astrology called Saturn the "greater malefic": cold, slow and limiting. Modern astrologers often describe it instead as the planet of form and maturity. Without Saturn's limits nothing holds its shape: no skeleton, no walls, no deadlines, no commitments. In a chart it points to where you are tested and where, with time, you earn real authority.

Saturn's 29.5-year cycle gives astrology one of its best-known milestones, the "Saturn return", when Saturn comes back to where it was at your birth, around ages 29, 58 and 87. Astrologers associate these periods with reckonings and grown-up choices: careers committed to or abandoned, relationships made formal or ended, a sharper sense of what you will and will not carry. Saturn spends about two and a half years in each sign, so it describes the pressures a whole school year grew up under as well as personal ones. Together with Jupiter it forms the pair of [[social-planets|social planets]]: Jupiter the impulse to grow, Saturn the need to consolidate.`,
    astronomy: {
      short: `The ringed gas giant, nine and a half times Earth's distance from the Sun; one lap takes 29.5 years, about 2.5 years per sign.`,
      more: `Saturn orbits at about 9.5 [[au]], almost twice as far out as Jupiter, and takes 29.5 years to go round. Its famous rings are mostly ice, hundreds of thousands of kilometres across but mostly less than a kilometre thick. Seen from Earth it creeps along the zodiac, spending about two and a half years in a sign. Like every outer planet it appears to move backward for part of each year, about four and a half months, as Earth passes it on the inside lane.`,
      orbitalPeriod: '29.5 years around the Sun',
      timePerSign: 'about 2.5 years',
      retrograde: 'Every year, for about 4.5 months.',
    },
    rules: ['capricorn'],
    traditionalRules: ['capricorn', 'aquarius'],
    whatPhrase: 'your sense of duty, limits and long-term mastery',
  },

  uranus: {
    id: 'uranus',
    name: 'Uranus',
    glyph: `♅${T}`,
    color: '#9fd8e0',
    group: 'generational',
    keywords: ['freedom', 'invention', 'surprise', 'rebellion', 'originality', 'change'],
    short: `Astrologers read Uranus as the urge to break free: invention, surprise, rebellion and sudden change.`,
    more: `Uranus was the first planet found with a telescope, by William Herschel in 1781, in the decade of the American and French revolutions, and astrologers have linked it ever since with upheaval, liberation and invention. It is associated with originality, independence, technology, sudden insight and breaks with tradition. Because it stays about seven years in a sign, its sign mostly describes the spirit of a generation; its house in your chart is read as where you need freedom and where life can change suddenly. Modern astrologers made it the ruler of Aquarius.`,
    deep: `Uranus has no traditional rulership, because the ancient system had only the seven bodies visible to the naked eye. When it was discovered, astrologers had to work out what it meant, and they did so partly from the times, with revolutions, electricity and industrial change, and partly from its odd behaviour: Uranus rolls around the Sun tipped on its side. It became the planet of the unexpected and the unconventional.

In a chart, Uranus is read most strongly when it touches a personal planet or an angle. Uranus close to the Moon, for example, is associated with an emotional life that needs space and thrives on change; close to Mercury, with a quick, unusual mind. Its 84-year orbit means it reaches the opposite side of the zodiac from its birth position around the early forties, and astrologers link this "Uranus opposition" with the midlife urge to shake things up. Two people born seven years apart usually have Uranus in neighbouring signs, which is the generational layer of the chart at work.`,
    astronomy: {
      short: `An ice giant tipped on its side, nineteen times Earth's distance from the Sun; one lap takes 84 years, about 7 years per sign.`,
      more: `Uranus orbits at about 19 [[au]] and sits right at the limit of naked-eye visibility under dark skies, which is why nobody recognised it as a planet until 1781. Its axis is tilted about 98°, so it rolls along its orbit on its side. It takes 84 years to go round, crossing roughly one sign every seven years, and it appears to move backward for about five months of every year as Earth swings past on the inside.`,
      orbitalPeriod: '84 years around the Sun',
      timePerSign: 'about 7 years',
      retrograde: 'Every year, for about 5 months.',
    },
    rules: ['aquarius'],
    traditionalRules: [],
    whatPhrase: 'your urge for freedom, originality and sudden change',
  },

  neptune: {
    id: 'neptune',
    name: 'Neptune',
    glyph: `♆${T}`,
    color: '#5b7fe0',
    group: 'generational',
    keywords: ['imagination', 'compassion', 'longing', 'spirituality', 'illusion', 'art'],
    short: `Astrologers read Neptune as the pull beyond the ordinary: imagination, compassion, longing and spirituality, and also illusion.`,
    more: `Neptune was found in 1846 after mathematicians predicted its position from the way it tugged on Uranus. Astrology linked it to the sea god whose name it carries, and to everything without hard edges: dreams, art, music, film, mysticism, compassion, intoxication, escapism and deception. Its sign, held for about fourteen years, is read as a generation's ideals and fantasies; its house in your chart as where you seek something transcendent and where you may see what you hope to see rather than what is there. It is the modern ruler of Pisces.`,
    deep: `Neptune dissolves. That is the shortest way astrologers describe it: where Saturn draws boundaries, Neptune blurs them, between self and others, real and imagined, sacred and everyday. That can be beautiful, as in empathy, artistic inspiration and a sense of unity, or confusing, as in idealisation, self-deception and avoidance.

Because it spends about fourteen years in each sign, Neptune's sign is shared by a whole generation, and astrologers often read it alongside the cultural mood of an era: its music, its utopias, its shared illusions. Personally, Neptune matters most when it sits close to the Sun, the Moon, an angle or a personal planet; Neptune with Venus, for example, is associated with romantic idealism and a strong artistic sense.

Neptune moves so slowly that in 2011 it completed its first full orbit since its discovery. It is also the first planet that cannot be seen without a telescope, a fact some astrologers find fitting for the planet of the unseen.`,
    astronomy: {
      short: `A deep-blue ice giant thirty times Earth's distance from the Sun; one lap takes 165 years, about 14 years per sign.`,
      more: `Neptune orbits at about 30 [[au]], so far away that sunlight takes about four hours to reach it, and it is too faint to see without a telescope. One orbit takes 165 years; since its discovery in 1846 it has gone round just once. From Earth it creeps along the zodiac at about two degrees a year, spending about fourteen years in each sign, and like all the outer planets it appears to drift backward for about five months each year.`,
      orbitalPeriod: '165 years around the Sun',
      timePerSign: 'about 14 years',
      retrograde: 'Every year, for about 5 months.',
    },
    rules: ['pisces'],
    traditionalRules: [],
    whatPhrase: 'your imagination, ideals and longing for something beyond',
  },

  pluto: {
    id: 'pluto',
    name: 'Pluto',
    glyph: `♇${T}`,
    color: '#b9a493',
    group: 'generational',
    keywords: ['transformation', 'power', 'intensity', 'endings', 'rebirth', 'depth'],
    short: `Astrologers read Pluto as deep transformation: power, intensity, endings and rebirth, and what lies hidden below the surface.`,
    more: `Pluto was discovered in 1930 and named for the Roman god of the underworld, and astrology took the name to heart. It is associated with power and control, crisis and regeneration, obsession, taboo, and the slow, irreversible change that strips something to its core. Pluto's sign is shared by people born across one to three decades, so it is read as generational; its house in your chart as where life asks you to let go and be remade. Modern astrologers made it the ruler of Scorpio, and kept using it after its 2006 reclassification as a dwarf planet.`,
    deep: `Astrologers often compare Pluto to compost: it breaks things down so something new can grow. In a chart it marks an area of intensity, where you may meet power struggles, loss or compulsion, and where you can develop real depth and resilience. Pluto touching a personal planet or an angle is read as a strong, sometimes all-or-nothing temperament.

Pluto's orbit is the most stretched of any body in the chart, and tilted 17° to the [[ecliptic]], so it can sit noticeably above or below the other planets. Its oval path makes its time in a sign vary enormously: about 12 years in Scorpio, where it is closest to the Sun and moves fastest, and over 30 in Taurus, where it is far out and slow. That uneven pace makes Pluto's generations uneven too. When astronomers reclassified Pluto as a dwarf planet in 2006, nearly all astrologers kept it, reasoning that its meaning comes from its observed movement and the record of its use, not from a size category. Pluto entered Aquarius in 2024 and will stay there until about 2044.`,
    astronomy: {
      short: `A Kuiper-belt dwarf planet about 40 times Earth's distance from the Sun; one lap takes 248 years, 12 to 30 per sign.`,
      more: `Pluto is smaller than our Moon and follows a stretched, tilted path between about 30 and 49 [[au]] from the Sun, sometimes coming closer than Neptune. A full orbit takes 248 years, so since its discovery in 1930 it has not completed even half an orbit, though, having moved fastest near the Sun, it has crossed more than half the zodiac. It races through some signs in about 12 years and lingers in others for about 30, and each year it appears to move backward for five to six months.`,
      orbitalPeriod: '248 years around the Sun',
      timePerSign: '12 to 30 years, because its orbit is so oval',
      retrograde: 'Every year, for about 5 to 6 months.',
    },
    rules: ['scorpio'],
    traditionalRules: [],
    whatPhrase: 'your capacity for deep transformation, power and renewal',
  },

  ascendant: {
    id: 'ascendant',
    name: 'Ascendant',
    glyph: 'AC',
    color: '#ff9f6b',
    group: 'angle',
    keywords: ['first impressions', 'manner', 'body', 'approach', 'beginnings'],
    short: `Astrologers read the Ascendant, or rising sign, as your front door: first impressions, physical presence and instinctive approach to life.`,
    more: `The Ascendant is the degree of the zodiac that was rising over the eastern horizon at the moment and place of your birth. Astrologers treat it as one of the most personal points in a chart, because it depends on the exact time and place, not just the date. It is read as the style you meet the world with: your manner, your body and appearance, the way you start things, the mask you wear before people know you. It begins the first [[house]] and is one of the [[big-three|big three]].`,
    deep: `If the Sun is who you are becoming and the Moon is what you need, astrologers describe the rising sign as how you go about it: the lens through which the rest of the chart meets daily life. Many people feel their rising sign fits their first impression better than their Sun sign does, which is part of why astrologers rate it so highly.

The rising sign also sets up the rest of the chart. In [[whole-sign-houses|Whole Sign houses]] the rising sign is the first house and every sign after it becomes the next house in order. The planet that [[ruler|rules]] the rising sign is called the chart ruler and is read as a kind of guide to the life story; with Libra rising, for instance, Venus becomes the chart ruler and its sign and house take on extra weight.

Because the whole zodiac rises over the course of a day, the rising sign changes about every two hours, faster for some signs and slower for others depending on latitude. Being twenty minutes out in the birth time can be enough to change it if you were born near the edge of a sign. Twins usually share it; people born on the same day in the morning and in the evening do not.`,
    astronomy: {
      short: `The point of the ecliptic crossing the eastern horizon at a given moment and place; it sweeps through all twelve signs every day.`,
      more: `As Earth spins, the whole ring of the zodiac is carried up over the eastern horizon and down in the west once a day. At any instant one particular degree of the [[ecliptic]] is exactly on the eastern horizon: that is the Ascendant. Because the ring is tilted to the horizon, some signs rise steeply and quickly and others at a shallow slant and slowly, so at mid-latitudes a sign takes anything from under an hour to over three hours to rise. The average is two hours.`,
      orbitalPeriod: 'Goes round once a day with Earth\'s spin (23 h 56 min relative to the stars)',
      timePerSign: 'about 2 hours on average; from under 1 to over 3 hours, depending on sign and latitude',
      retrograde: 'Not applicable: it is a point, not a body, and always moves forward through the signs.',
    },
    rules: [],
    traditionalRules: [],
    whatPhrase: 'your outward manner, first impressions and approach to life',
  },

  midheaven: {
    id: 'midheaven',
    name: 'Midheaven',
    glyph: 'MC',
    color: '#7fd6ff',
    group: 'angle',
    keywords: ['vocation', 'reputation', 'ambition', 'public life', 'legacy'],
    short: `Astrologers read the Midheaven as your public direction: vocation, reputation, and what you aim to be known for.`,
    more: `The Midheaven, written MC from the Latin medium coeli, "middle of the sky", is the degree of the zodiac that was crossing the [[meridian]] above the horizon at your birth, the line the Sun crosses at midday. Astrologers treat it as the top of the chart in every sense: ambition, career, standing in the world and the legacy you work towards. Its sign describes the style of your public role; the opposite point, the [[ic|IC]], describes home and roots. Like the Ascendant, it depends on the birth time.`,
    deep: `Four points form the cross of a chart, called the [[angles]]: the Ascendant in the east, the [[descendant|Descendant]] in the west, the Midheaven at the top and the IC at the bottom. Astrologers read planets close to any of them as especially prominent, and the Midheaven as the most visible of all, since it is literally the highest the zodiac reaches over your birthplace.

The Midheaven is usually associated with career, but astrologers mean something broader: the role you grow into in public, the contribution you are recognised for, and the parents or mentors who model it. A Capricorn Midheaven is read as an aim for responsibility and recognition built step by step; a Pisces one as a calling towards art, care or the intangible. In Placidus and most other quadrant house systems the Midheaven starts the tenth house. In Whole Sign houses it usually falls in the ninth, tenth or eleventh, and astrologers read it as a sensitive point in its own right. Far from the equator, the Midheaven and Ascendant can be much more or less than 90° apart: a reminder that the local sky, not a fixed template, shapes the chart.`,
    astronomy: {
      short: `The point of the ecliptic crossing your meridian above the horizon: due south from northern latitudes, due north from southern ones.`,
      more: `Imagine a line across the sky from due north, over your head, to due south: the [[meridian]]. Anything crossing it is at its highest point of the day; the Sun crosses it at local midday. The Midheaven is the degree of the zodiac crossing that line above the horizon at a given moment. Like the Ascendant it travels through all twelve signs in a day, though more evenly. It is usually not straight overhead, at the [[zenith]], because the zodiac ring is tilted.`,
      orbitalPeriod: 'Goes round once a day with Earth\'s spin',
      timePerSign: 'about 2 hours on average, more evenly than the Ascendant',
      retrograde: 'Not applicable: it is a point, not a body.',
    },
    rules: [],
    traditionalRules: [],
    whatPhrase: 'your public direction, vocation and reputation',
  },

  northNode: {
    id: 'northNode',
    name: 'North Node',
    glyph: `☊${T}`,
    color: '#b48cff',
    group: 'point',
    keywords: ['growth', 'direction', 'destiny', 'unfamiliar territory', 'eclipses'],
    short: `Astrologers read the North Node as a direction of growth: unfamiliar territory the tradition says you are meant to move towards.`,
    more: `The [[lunar-node|lunar nodes]] are the two points where the Moon's tilted orbit crosses the Sun's path. Astrology pays most attention to the North Node, where the Moon crosses heading north, and its opposite, the South Node. Modern astrologers read the South Node as familiar talents and habits you lean on by default, and the North Node as the less comfortable direction that brings growth. Everyone born within about a year and a half shares the pair, and eclipses happen only near them, which is why astrologers associate the nodes with turning points.`,
    deep: `The nodes are not objects; they are crossing points, and that is part of why they fascinated early sky-watchers. [[eclipse|Eclipses]] only happen when a new or full Moon falls close to one of them, because only then do Sun, Moon and Earth line up in three dimensions rather than just in direction. In Indian astrology the nodes are personified as Rahu (north) and Ketu (south), the head and tail of a celestial serpent said to swallow the Sun or Moon during an eclipse.

Western astrology took up the nodes as a story axis. Contemporary astrologers often read them as a path from past to future: the South Node's sign and house show what comes naturally, perhaps too naturally; the North Node's show qualities that feel awkward but rewarding to develop. Someone with the North Node in Libra and the South Node in Aries, for example, is read as moving from self-reliance towards partnership. The nodes travel backward through the zodiac, completing a lap in 18.6 years, so the "nodal return" falls around ages 19, 37, 56 and 74, ages astrologers associate with shifts in life direction.`,
    astronomy: {
      short: `Where the Moon's orbit crosses the ecliptic heading north; it slides backward around the zodiac once every 18.6 years.`,
      more: `The Moon's orbit is tilted about 5° to the plane of Earth's orbit, so twice a month the Moon crosses the [[ecliptic]]: once going north, at the north or ascending node, and once going south, at the south node, always exactly opposite. The Sun's gravity slowly twists the Moon's orbit, so these crossing points drift backward along the zodiac, completing a circuit in 18.6 years, about a year and a half per sign. Eclipses happen only when a new or full moon falls near one of the nodes.`,
      orbitalPeriod: 'Moves backward around the zodiac once every 18.6 years',
      timePerSign: 'about 18 months',
      retrograde: 'Almost always: its average motion is backward; the true node wobbles but mostly regresses.',
    },
    rules: [],
    traditionalRules: [],
    whatPhrase: 'the direction of growth your chart points towards',
  },
};
