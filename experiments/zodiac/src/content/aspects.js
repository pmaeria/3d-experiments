// The five major aspects.
// Voices: short/more/deep/keywords/talkPhrase are the ASTROLOGY voice;
// `astronomy` is the ASTRONOMY voice.
// talkPhrase completes "the two ___" (see composeAspect in placements.js).
// orb: default orb in degrees (matches src/astro/constants.js; Sun/Moon get +2 there).

const T = '︎';

export const aspectOrder = ['conjunction', 'sextile', 'square', 'trine', 'opposition'];

export const aspects = {
  conjunction: {
    id: 'conjunction',
    name: 'Conjunction',
    verb: 'conjunct',
    glyph: `☌${T}`,
    angle: 0,
    orb: 8,
    nature: 'blend',
    color: '#f2c14e',
    keywords: ['fusion', 'emphasis', 'beginnings', 'intensity'],
    short: `Two bodies in the same direction from Earth; astrologers read their drives as fused, amplifying and colouring each other.`,
    more: `A conjunction is the simplest aspect: two bodies at nearly the same [[degree]] of the zodiac, so that from Earth they appear side by side in the sky. Astrologers read the two planets' meanings as fused into one drive, acting together for better or worse. Venus conjunct Mars, for example, is read as attraction and desire welded together; Saturn conjunct the Moon as feelings shaped by duty or restraint. The result depends on how well the two get on: some conjunctions are easy alliances, others a tight partnership of opposites.`,
    deep: `Astrologers usually count the conjunction as the most powerful aspect, because the two planets are not just in conversation but speaking with one voice. They also tend to share a sign and often a house, so the blend is reinforced by the same style and the same area of life. Three or more planets bunched together are called a stellium, read as a strong concentration of energy in one sign or house.

Conjunctions with the Sun have special names in the tradition. A planet within about eight degrees of the Sun is called combust, its voice burned out by the glare, which matches the sky: the planet really is lost in the Sun's light. Within about a quarter of a degree it becomes cazimi, "in the heart of the Sun", read as specially empowered.

Conjunctions also mark the start of cycles. The Sun-Moon conjunction is the [[new-moon|new moon]], the start of the lunar month; the Jupiter-Saturn conjunction every twenty years begins a social cycle astrologers have tracked for centuries. From the conjunction the faster planet pulls ahead, through sextile, square, trine and opposition, and comes round to meet the slower one again.`,
    astronomy: {
      short: `Same direction as seen from Earth, not close together in space: the two may be hundreds of millions of kilometres apart.`,
      more: `A conjunction is a line-of-sight effect, like two streetlights on the same road that look stacked from where you stand. In December 2020 Jupiter and Saturn appeared closer than at any time since 1623, about a tenth of a degree apart, yet Saturn was more than 700 million km beyond Jupiter. A planet conjunct the Sun sits behind it, or for Mercury and Venus possibly in front of it, lost in the glare. The Sun-Moon conjunction is the new moon; near a [[lunar-node|lunar node]] it becomes a solar eclipse.`,
    },
    talkPhrase: 'speak with one voice, fusing into a single drive',
  },

  sextile: {
    id: 'sextile',
    name: 'Sextile',
    verb: 'sextile',
    glyph: `⚹${T}`,
    angle: 60,
    orb: 5,
    nature: 'opportunity',
    color: '#5fb7e5',
    keywords: ['opportunity', 'cooperation', 'stimulation', 'ease'],
    short: `Two bodies 60° apart, a sixth of the circle; astrologers read a friendly, cooperative link that rewards a little effort.`,
    more: `In a sextile the two bodies are 60° apart, usually two signs apart, in signs whose [[element|elements]] get along: fire with air, earth with water. Astrologers read it as a supportive, sociable connection, an open door rather than a free gift: the two planets help each other once you make use of them. Mercury sextile Mars, for example, is read as a quick, decisive mind that turns ideas into action when called on. It is often described as a milder, more active cousin of the trine.`,
    deep: `The sextile divides the circle into six, and its geometry shapes how it is read. Signs two apart always have compatible elements (fire feeds on air, earth is nourished by water) and share the same [[polarity]], but they differ in [[modality]], so the two planets bring different styles to a shared purpose. Astrologers compare it to a colleague you get on with: friendly, stimulating, and productive when you actually pick up the phone.

Traditionally the sextile was counted among the harmonious aspects along with the trine, and astrologers still read it as easy, but more active. Where a trine describes a talent that flows by itself, a sextile is often said to describe an opportunity: something that works if you act on it and quietly does nothing if you do not. Astrologers give it a tighter [[orb]], typically 4° to 6°, because they consider it a little weaker than the major aspects built on halves and quarters of the circle.

In the sky, the Sun and Moon form a sextile twice a month: with the young crescent Moon a few days after new moon, and again with the old crescent a few days before the next one.`,
    astronomy: {
      short: `Two bodies one sixth of the way round the sky from each other, as seen from Earth.`,
      more: `A fist at arm's length covers about 10° of sky, so a sextile is about six fists along the zodiac. The thin crescent Moon in the evening twilight, about five days after new moon, is roughly sextile the Sun. Neither Mercury nor Venus can ever be sextile the Sun from Earth, because their orbits keep them closer to it than 60°.`,
    },
    talkPhrase: 'are on friendly terms, opening doors when you act on them',
  },

  square: {
    id: 'square',
    name: 'Square',
    verb: 'square',
    glyph: `□${T}`,
    angle: 90,
    orb: 7,
    nature: 'friction',
    color: '#e5533d',
    keywords: ['friction', 'challenge', 'action', 'growth'],
    short: `Two bodies a quarter-circle apart; astrologers read friction, two drives pulling across each other and demanding action.`,
    more: `A square puts two bodies 90° apart, usually three signs apart, in signs that share a [[modality]] but clash in [[element]]: fire and water, earth and air. Astrologers read it as tension that will not sit still: the two planets want different things at the same time, so you are pushed to act, adjust, or build something that satisfies both. Moon square Saturn, for example, is read as feelings that bump into duty. Many astrologers treat squares as the engine of achievement in a chart: uncomfortable but productive.`,
    deep: `Classical astrology counted the square as a difficult aspect, a source of conflict. Modern astrologers mostly read it as friction in the useful sense: what makes a match light. The two planets sit in signs of the same [[modality]], both cardinal, both fixed or both mutable, so they share a kind of energy, but their [[element|elements]] do not mix, so they keep crossing each other's path. Cardinal squares are read as clashes of initiative, fixed squares as stand-offs between strong wills, mutable squares as scattered or competing priorities.

In a birth chart astrologers often point to squares as the places where people grow most, because the tension never quite resolves and keeps asking for effort. In the movements of the moment, squares mark the turning points of cycles. The Moon's first and last quarters are Sun-Moon squares. And when Saturn moves to a square from its birth position, around ages 7 and 22, with its opposition at about 14 or 15 in between, astrologers read a test of the structures being built at that stage of life.`,
    astronomy: {
      short: `Two bodies 90° apart as seen from Earth: one quarter of the way round the sky.`,
      more: `The half-lit first-quarter Moon is the clearest example: at sunset it stands high in the sky, 90° east of the Sun. The last-quarter Moon is 90° on the other side, high at dawn. When an outer planet is 90° from the Sun, astronomers call it quadrature: Sun and planet form a right angle with Earth at the corner. Mercury and Venus never get far enough from the Sun to square it.`,
    },
    talkPhrase: 'rub against each other, creating friction that pushes for action',
  },

  trine: {
    id: 'trine',
    name: 'Trine',
    verb: 'trine',
    glyph: `△${T}`,
    angle: 120,
    orb: 7,
    nature: 'flow',
    color: '#4fbf7f',
    keywords: ['harmony', 'talent', 'ease', 'support'],
    short: `Two bodies a third of the circle apart; astrologers read an easy flow, natural talent and mutual support.`,
    more: `A trine puts two bodies 120° apart, usually four signs apart, almost always in signs of the same [[element]]: fire with fire, water with water. Astrologers read it as the most harmonious aspect: the planets speak the same language, so their energies combine easily into gifts that feel natural. Venus trine Neptune, for example, is read as effortless artistic sensitivity. The catch, astrologers say, is that ease can breed complacency: trines describe what you are good at without trying, not what you are pushed to develop.`,
    deep: `The trine was the classic favourable aspect of traditional astrology, and its logic is elemental. Count four signs on from Aries and you reach Leo; four more and you reach Sagittarius; four more and you are back at Aries. The three fire signs form a perfect triangle around the zodiac, and the same is true for earth, air and water. Two planets in trine share an element, so astrologers read them as cooperating without effort, like old friends who finish each other's sentences.

Three planets in mutual trine make a grand trine, read as a closed circuit of talent in one element: abundant, but sometimes self-contained. Astrologers often say that a chart full of trines and no squares belongs to someone gifted who may never be forced to use the gift, while a mix of the two gives both ability and motivation.

Because signs are 30° wide, a trine between the end of one sign and the start of another can link signs of different elements. Astrologers call that an out-of-sign trine and usually read it as weaker, or as harmony with an unexpected twist.`,
    astronomy: {
      short: `Two bodies 120° apart as seen from Earth: a third of the way round the sky.`,
      more: `A Sun-Moon trine happens twice a month: once with the fat waxing gibbous Moon about ten days after new moon, and once with the waning gibbous Moon about five days after full. The outer planets reach trines with the Sun twice a year. Mercury and Venus never can, since they never stray that far from the Sun.`,
    },
    talkPhrase: 'flow together easily, as talents that come naturally',
  },

  opposition: {
    id: 'opposition',
    name: 'Opposition',
    verb: 'opposite',
    glyph: `☍${T}`,
    angle: 180,
    orb: 8,
    nature: 'tension',
    color: '#e8823a',
    keywords: ['polarity', 'awareness', 'balance', 'relationship'],
    short: `Two bodies on opposite sides of the sky from Earth; astrologers read a tug-of-war that seeks balance, often through other people.`,
    more: `In an opposition the two bodies stand 180° apart, in opposite signs, so that when one rises the other sets. Astrologers read it as polarity: two drives pulling in opposite directions, each making the other visible. Unlike in a square, the opposite signs have compatible elements, fire with air and earth with water, so the challenge is awareness and balance rather than outright clash. Astrologers say oppositions often play out through relationships, where we meet the other end of the rope in someone else.`,
    deep: `Each sign has an opposite partner, and astrologers read the six resulting axes as basic life polarities: self and other (Aries-Libra), mine and ours (Taurus-Scorpio), facts and meaning (Gemini-Sagittarius), home and world (Cancer-Capricorn), individual and group (Leo-Aquarius), order and surrender (Virgo-Pisces). An opposition between two planets is read as one of these tensions coming alive in the chart: you swing between the two ends, or meet one of them in the people around you, until you can hold both.

The biggest opposition in the sky is the [[full-moon|full moon]], with Sun and Moon on opposite sides of Earth. Astrologers associate full moons with culmination, visibility and heightened feeling: the high point of a cycle that began at the new moon. For the outer planets, opposition to the Sun is when they are closest and brightest, and it always falls in the middle of their [[retrograde]] period. Astrologers read oppositions in the passing sky as moments of awareness: what began at a conjunction comes to a head, and you see it from outside.`,
    astronomy: {
      short: `Two bodies 180° apart as seen from Earth, on opposite sides of the sky: one rising as the other sets.`,
      more: `A full moon is a Sun-Moon opposition: the Moon is on the far side of Earth from the Sun, fully lit, rising at sunset. When an outer planet is opposite the Sun, Earth sits roughly between them, so the planet is at its closest and brightest and visible all night; this is the middle of its retrograde loop, and astronomers simply call it opposition. Mercury and Venus can never be opposite the Sun, because they orbit inside Earth's path.`,
    },
    talkPhrase: 'pull from opposite sides, seeking a balance, often through other people',
  },
};

export const orbText = {
  short: `The orb is the leeway astrologers allow around an exact aspect angle; the closer to exact, the stronger it is read.`,
  more: `Two planets are rarely exactly 90° or 120° apart, so astrologers count an aspect as long as the angle is within a few degrees of the ideal. This app uses 8° for conjunctions and oppositions, 7° for squares and trines and 5° for sextiles, with 2° extra whenever the Sun or Moon is involved. These are common conventions, not laws of nature, and different astrologers use different values.`,
};

export const applyingSeparatingText = {
  short: `An aspect is applying while the faster body closes in on the exact angle, and separating once it has passed.`,
  more: `Watch two planets over a few days and you will see an aspect form, peak and fade. While the faster body is still closing in, astrologers call the aspect [[applying]] and read it as building, its effect still to come. After the exact moment it is [[separating]], read as fading. Retrograde motion can complicate this, since a planet can back away from an aspect and return to it.`,
};
