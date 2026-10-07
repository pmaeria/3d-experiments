// The twelve tropical signs, plus elements, modalities and polarities.
// Voices: short/more/deep/shadow/keywords/howPhrase/bodyPart are the ASTROLOGY voice.
// `astronomy` and `constellation` are the ASTRONOMY voice.
// howPhrase completes "...in a ___ way/style".
// constellation.sunActuallyThere = approximate dates the Sun is in front of the
// namesake IAU constellation today (varies by a day year to year).

const T = '︎';

export const signOrder = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

export const signs = {
  aries: {
    id: 'aries', name: 'Aries', glyph: `♈${T}`, index: 0, startDeg: 0,
    dates: '21 March - 19 April', symbol: 'The Ram',
    element: 'fire', modality: 'cardinal', ruler: 'mars', traditionalRuler: 'mars', polarity: 'active',
    color: '#e4572e',
    keywords: ['initiative', 'courage', 'directness', 'energy', 'independence', 'impatience'],
    short: `Astrologers read Aries as the spark: first off the mark, direct, brave, and happiest when starting something.`,
    more: `Aries opens the zodiac, beginning at the point where the Sun stands at the March equinox. Astrologers take that literally as its character: the first push of spring, the drive to begin. Planets in Aries are read as acting quickly, honestly and competitively, with more appetite for the start of a project than for its upkeep. The tradition associates it with pioneers, athletes and anyone who would rather ask forgiveness than permission. It is a [[element|fire]] sign, [[modality|cardinal]], and ruled by Mars.`,
    deep: `The zodiac is often read as twelve stages of a cycle, from birth to dissolution, and Aries is the first. It stands for raw selfhood: "I am", the newborn's cry, the green shoot breaking the soil. Its symbol, the ram, charges head first, and the tradition links the sign with the head and face.

Astrologers associate Aries placements with courage and candour, little tolerance for waiting, and a need to feel personally alive in what they do. At their best they are read as brave, generous with energy, quick to forgive and good in a crisis; on a bad day as impulsive, combative or easily bored. Mars rules Aries, so the sign shares Mars's themes of assertion and action, and the Sun is traditionally said to be exalted, at its strongest, here: a nod to the strengthening light of spring in the northern hemisphere, where the system grew up.

Aries sits opposite Libra, and astrologers describe the pair as an axis: self and other, my way and our way. Many readings involve finding the balance across an opposite pair like this.`,
    shadow: `Read on a bad day as impatient, combative, or charging ahead without looking.`,
    howPhrase: 'bold, direct, first-off-the-mark',
    bodyPart: 'head and face',
    astronomy: {
      short: `The 0° to 30° slice of the ecliptic, starting at the March equinox point; the Sun crosses it from about 21 March to 19 April.`,
    },
    constellation: {
      note: `The constellation Aries, the Ram, is small and faint, marked by a short line of three stars. Around 2,000 years ago the March equinox point lay near its edge, which is why the sign starts here. Precession has since carried that point into the constellation Pisces.`,
      sunActuallyThere: 'about 19 April - 14 May',
    },
  },

  taurus: {
    id: 'taurus', name: 'Taurus', glyph: `♉${T}`, index: 1, startDeg: 30,
    dates: '20 April - 20 May', symbol: 'The Bull',
    element: 'earth', modality: 'fixed', ruler: 'venus', traditionalRuler: 'venus', polarity: 'receptive',
    color: '#6a9f58',
    keywords: ['steadiness', 'sensuality', 'patience', 'security', 'loyalty', 'stubbornness'],
    short: `Astrologers read Taurus as steady and sensual: patient, loyal, rooted in the body, and set on building lasting comfort.`,
    more: `Taurus follows the first burst of Aries with consolidation: in the northern spring the sprouting seed now puts down roots. Astrologers associate it with stability, patience, physical pleasure, money and possessions, and a strong, slow-moving will. Planets in Taurus are read as unhurried, practical, loyal and hard to push around. Ruled by Venus, it is the earthy side of Venus, beauty you can touch: food, gardens, fabric, music, a well-made thing. It is an [[element|earth]] sign and [[modality|fixed]].`,
    deep: `The bull is a good emblem for how astrologers describe Taurus: calm until provoked, very strong, attached to its pasture. Taurus is read as the sign of what we value and keep, both money and, more deeply, whatever makes us feel secure. People with strong Taurus placements are often described as having good taste and good sense, enjoying a slow meal or a long walk, and liking their routines.

Its [[modality|fixed]] quality is read as staying power. Taurus is associated with finishing what it starts, keeping promises and building things meant to last, relationships and savings included. The flip side, as astrologers see it, is resistance to change, possessiveness, and comfort-seeking that turns into inertia. The Moon is traditionally said to be exalted in Taurus, an image of emotional security grounded in the body. The tradition links the sign with the throat and neck, and many astrologers note a connection with the voice and singing.

Taurus sits opposite Scorpio. Together they form the axis of resources: what is mine and what is shared, what I hold on to and what I am willing to transform.`,
    shadow: `Read on a bad day as stubborn, possessive, or stuck in comfort.`,
    howPhrase: 'steady, sensual, patient',
    bodyPart: 'throat and neck',
    astronomy: {
      short: `The 30° to 60° slice of the ecliptic; the Sun crosses it from about 20 April to 20 May.`,
    },
    constellation: {
      note: `The constellation Taurus, the Bull, is one of the most striking in the sky, with the orange giant Aldebaran as its eye and the Pleiades star cluster on its shoulder. The Sun now passes in front of it from mid-May to late June, roughly while the sign Gemini runs.`,
      sunActuallyThere: 'about 14 May - 21 June',
    },
  },

  gemini: {
    id: 'gemini', name: 'Gemini', glyph: `♊${T}`, index: 2, startDeg: 60,
    dates: '21 May - 20 June', symbol: 'The Twins',
    element: 'air', modality: 'mutable', ruler: 'mercury', traditionalRuler: 'mercury', polarity: 'active',
    color: '#e8d36b',
    keywords: ['curiosity', 'communication', 'wit', 'versatility', 'connection', 'restlessness'],
    short: `Astrologers read Gemini as curious and quick: talkative, adaptable, playful, and hungry for information and variety.`,
    more: `Gemini closes out spring with a burst of activity, and astrologers associate it with the mind at its liveliest: curiosity, conversation, wit, learning, local connections and juggling several things at once. Planets in Gemini are read as quick, adaptable and sociable, comfortable seeing two sides of a question, and easily bored. Its symbol, the twins, points to duality and to siblings and peers. It is an [[element|air]] sign, [[modality|mutable]], and ruled by Mercury, the messenger.`,
    deep: `Astrologers often describe Gemini as the sign of the network: it links people, ideas and places, carries news, makes introductions and translates between worlds. Gemini placements are associated with a light touch, a good ear for language and humour, and a mind that learns by asking questions and trying things out. The tradition links the sign with the arms, hands and lungs: the organs of reaching, gesturing and breathing.

As a [[modality|mutable]] sign Gemini is read as flexible and changeable, good at adapting and less keen on committing. The usual complaint about Gemini, that it is two-faced or scattered, is the shadow of the trait astrologers praise in it: the ability to hold more than one point of view at once. Mercury rules both Gemini and Virgo, and astrologers distinguish the two: Gemini is Mercury gathering and sharing, Virgo is Mercury sorting and refining.

Gemini sits opposite Sagittarius. Astrologers describe that axis as the difference between information and meaning: the many facts of Gemini and the big picture of Sagittarius, the local street and the long journey.`,
    shadow: `Read on a bad day as scattered, superficial, or restless for novelty.`,
    howPhrase: 'curious, quick-witted, versatile',
    bodyPart: 'arms, hands and lungs',
    astronomy: {
      short: `The 60° to 90° slice of the ecliptic, ending at the June solstice point; the Sun crosses it from about 21 May to 20 June.`,
    },
    constellation: {
      note: `The constellation Gemini is marked by two bright stars, Castor and Pollux, the heads of the twins. The Sun passes in front of it from late June to late July, roughly while the sign Cancer runs.`,
      sunActuallyThere: 'about 21 June - 20 July',
    },
  },

  cancer: {
    id: 'cancer', name: 'Cancer', glyph: `♋${T}`, index: 3, startDeg: 90,
    dates: '21 June - 22 July', symbol: 'The Crab',
    element: 'water', modality: 'cardinal', ruler: 'moon', traditionalRuler: 'moon', polarity: 'receptive',
    color: '#8fb8c9',
    keywords: ['care', 'belonging', 'memory', 'protection', 'sensitivity', 'home'],
    short: `Astrologers read Cancer as caring and protective: emotionally tuned in, loyal to its own, and devoted to home and belonging.`,
    more: `Cancer begins at the June solstice, when the Sun stands highest in the northern sky, and astrologers associate it with the season of nurture: home, family, belonging and emotional security. Planets in Cancer are read as sensitive, protective and intuitive, with long memories and a strong instinct to look after others. Its symbol, the crab, carries its home on its back and wears a hard shell over a soft body. It is a [[element|water]] sign, [[modality|cardinal]], and ruled by the Moon.`,
    deep: `Being [[modality|cardinal]], Cancer is a starting sign, but it starts things in the emotional world: it founds families, makes homes, gathers people round a table. Astrologers read it as one of the most quietly determined signs, because its drive comes from the wish to protect what it loves. The crab's sideways walk is often taken as a picture of Cancer's indirect approach: it rarely charges, but it seldom lets go.

Cancer placements are associated with emotional intelligence, caregiving, a feel for history and tradition, and a talent for making others feel at home. On a bad day astrologers read them as moody, defensive, clingy, or retreating into the shell. The tradition links Cancer with the chest and stomach, with food and nourishment, and with the mother. Jupiter is said to be exalted here, an image of generosity rooted in care.

Cancer sits opposite Capricorn, completing the axis astrologers describe as home and career, private and public life: where we come from, and where we are going.`,
    shadow: `Read on a bad day as moody, defensive, or clinging to the past.`,
    howPhrase: 'protective, caring, emotionally attuned',
    bodyPart: 'chest and stomach',
    astronomy: {
      short: `The 90° to 120° slice, starting at the June solstice point; the Sun crosses it from about 21 June to 22 July.`,
    },
    constellation: {
      note: `The constellation Cancer, the Crab, is the faintest of the zodiac constellations, with no bright stars, though it holds the Beehive star cluster. The Sun passes in front of it for only about three weeks, from late July to early August.`,
      sunActuallyThere: 'about 20 July - 10 August',
    },
  },

  leo: {
    id: 'leo', name: 'Leo', glyph: `♌${T}`, index: 4, startDeg: 120,
    dates: '23 July - 22 August', symbol: 'The Lion',
    element: 'fire', modality: 'fixed', ruler: 'sun', traditionalRuler: 'sun', polarity: 'active',
    color: '#f29e38',
    keywords: ['warmth', 'creativity', 'pride', 'generosity', 'play', 'recognition'],
    short: `Astrologers read Leo as warm and expressive: generous, proud, creative, and at its best when its heart is on show.`,
    more: `Leo falls at the height of the northern summer, and astrologers associate it with the Sun, its ruler: warmth, light, creativity and the urge to be seen. Planets in Leo are read as expressive, generous, loyal and playful, with a flair for performance and a strong sense of personal dignity. The tradition links Leo with children, romance, games, art and leadership by inspiration. It is a [[element|fire]] sign and [[modality|fixed]], which astrologers read as warmth that lasts: a steady glow more than a spark.`,
    deep: `Astrologers describe Leo as the sign of the heart, both the organ (the tradition links Leo with the heart, spine and upper back) and the quality of wholeheartedness. Leo placements are associated with the courage it takes to stand up in front of people, a need to create something that carries your signature, and loyalty to those you love. The lion is the obvious emblem: regal, protective, sun-coloured, happy to lie in the warmth.

The shadow astrologers name is the same need turned around: a craving for attention, pride that cannot admit fault, or drama when the applause stops. Many astrologers frame Leo's lesson as learning to shine without needing to be told you are shining. Because the Sun rules Leo, Leo is also read as the purest expression of what the Sun stands for in any chart: self-expression and vitality.

Leo sits opposite Aquarius. Astrologers read this axis as the individual and the group: one person's creative spark set against the needs and ideals of the collective, the star and the audience.`,
    shadow: `Read on a bad day as attention-seeking, proud, or dramatic.`,
    howPhrase: 'warm, expressive, big-hearted',
    bodyPart: 'heart, spine and upper back',
    astronomy: {
      short: `The 120° to 150° slice; the Sun crosses it from about 23 July to 22 August.`,
    },
    constellation: {
      note: `The constellation Leo genuinely looks like a crouching lion, with a sickle of stars for its mane and the bright star Regulus at its heart; Regulus lies almost exactly on the ecliptic. The Sun passes in front of Leo from mid-August to mid-September.`,
      sunActuallyThere: 'about 10 August - 16 September',
    },
  },

  virgo: {
    id: 'virgo', name: 'Virgo', glyph: `♍${T}`, index: 5, startDeg: 150,
    dates: '23 August - 22 September', symbol: 'The Maiden',
    element: 'earth', modality: 'mutable', ruler: 'mercury', traditionalRuler: 'mercury', polarity: 'receptive',
    color: '#9aa65a',
    keywords: ['craft', 'analysis', 'service', 'health', 'precision', 'improvement'],
    short: `Astrologers read Virgo as precise and helpful: observant, practical, modest, and always seeing how something could work better.`,
    more: `Virgo falls at harvest time in the northern hemisphere, and astrologers associate it with the work of sorting wheat from chaff: analysis, skill, service, health and daily routine. Planets in Virgo are read as attentive to detail, practical, modest and useful, with a strong urge to improve things and to help. Its symbol is a maiden, often shown holding a sheaf of wheat. It is an [[element|earth]] sign, [[modality|mutable]], and ruled by Mercury, here in its sorting, refining mode.`,
    deep: `Virgo is the sign astrologers associate with craft: the skilled hand, the editor's eye, the nurse, the mechanic, the analyst. It is read as practical intelligence turned to making things healthy and functional, the body included; the tradition links Virgo with the digestive system, the organ that breaks things down and keeps what is useful.

Virgo placements are described as observant and conscientious, honest about what is not working and quietly devoted to doing things properly. Astrologers stress that this is service in the best sense, not servility: the satisfaction of being good at something useful. The shadow is perfectionism, worry, and criticism turned on others or, more often, on oneself. Mercury is said to be both ruler and exalted in Virgo, a doubly strong placement for the thinking planet.

Virgo sits opposite Pisces. Astrologers describe this axis as order and surrender: Virgo's analysis and routine against Pisces's imagination and acceptance, the map and the ocean. Many readings involve finding a place for both.`,
    shadow: `Read on a bad day as anxious, critical, or lost in perfectionism.`,
    howPhrase: 'precise, practical, quietly helpful',
    bodyPart: 'digestive system',
    astronomy: {
      short: `The 150° to 180° slice, ending at the September equinox point; the Sun crosses it from about 23 August to 22 September.`,
    },
    constellation: {
      note: `The constellation Virgo is the largest in the zodiac and the second-largest in the whole sky, so the Sun takes about 45 days to cross it, from mid-September to the end of October. Its brightest star, Spica, is named for an ear of wheat.`,
      sunActuallyThere: 'about 16 September - 31 October',
    },
  },

  libra: {
    id: 'libra', name: 'Libra', glyph: `♎${T}`, index: 6, startDeg: 180,
    dates: '23 September - 22 October', symbol: 'The Scales',
    element: 'air', modality: 'cardinal', ruler: 'venus', traditionalRuler: 'venus', polarity: 'active',
    color: '#b9c4e8',
    keywords: ['balance', 'partnership', 'fairness', 'grace', 'diplomacy', 'indecision'],
    short: `Astrologers read Libra as relational and fair-minded: graceful, diplomatic, artistic, always weighing how things look from the other side.`,
    more: `Libra begins at the September equinox, when day and night are equal everywhere, and its symbol, the scales, is the only one in the zodiac that is an object rather than a creature. Astrologers associate it with balance, fairness, partnership, beauty and diplomacy. Planets in Libra are read as sociable, considerate and aesthetic, at their best in collaboration and sometimes slow to decide because they can see every side. It is an [[element|air]] sign, [[modality|cardinal]], and ruled by Venus, here in its social, harmonising mode.`,
    deep: `Libra opens the second half of the zodiac, and astrologers describe a shift there from the self towards others: the first six signs are often read as personal development, the last six as relationship and society. Libra is where that turn begins. It is associated with marriage and contracts, justice, negotiation, art and design, and the pleasure of a beautiful, well-balanced thing.

As a [[modality|cardinal]] sign Libra is read as an initiator, but its initiative goes into relationships: proposing, mediating, bringing people together. Astrologers often say Libra placements are tougher than they look, because what they really care about is fairness, and they will fight for it politely. The shadow is people-pleasing, indecision, or keeping the peace at the cost of honesty. Saturn is said to be exalted in Libra, which astrologers read as an image of justice: fair rules and committed partnerships. The tradition links Libra with the kidneys and lower back, organs of balance and filtering.

Libra sits opposite Aries: other and self, the pair through which astrologers describe every relationship.`,
    shadow: `Read on a bad day as indecisive, people-pleasing, or avoiding necessary conflict.`,
    howPhrase: 'graceful, diplomatic, fair-minded',
    bodyPart: 'kidneys and lower back',
    astronomy: {
      short: `The 180° to 210° slice, starting at the September equinox point; the Sun crosses it from about 23 September to 22 October.`,
    },
    constellation: {
      note: `The constellation Libra is faint, and in ancient times its stars were counted as the claws of the neighbouring Scorpion. The Sun passes in front of it from the end of October to late November.`,
      sunActuallyThere: 'about 31 October - 23 November',
    },
  },

  scorpio: {
    id: 'scorpio', name: 'Scorpio', glyph: `♏${T}`, index: 7, startDeg: 210,
    dates: '23 October - 21 November', symbol: 'The Scorpion',
    element: 'water', modality: 'fixed', ruler: 'pluto', traditionalRuler: 'mars', polarity: 'receptive',
    color: '#7a3b6b',
    keywords: ['intensity', 'depth', 'loyalty', 'transformation', 'privacy', 'power'],
    short: `Astrologers read Scorpio as intense and deep: private, loyal, perceptive, and drawn to what is hidden, powerful or taboo.`,
    more: `Scorpio falls in the northern autumn as leaves fall and the year turns towards decay, and astrologers associate it with depth, intimacy, transformation and everything under the surface: sex, death, secrets, shared money, power. Planets in Scorpio are read as intense, perceptive, emotionally all-in and hard to fool, with great staying power and a long memory for loyalty and betrayal. It is a [[element|water]] sign, [[modality|fixed]], ruled by Pluto in modern astrology and by Mars traditionally.`,
    deep: `Of all the signs, Scorpio is the one astrologers most often call misunderstood. Its reputation for jealousy and secrecy points to what they see as its real strength: an unwillingness to stay on the surface of anything. Scorpio placements are read as wanting the truth of a person or situation, investing deeply, and being able to face difficult things, illness, grief, crisis, that others look away from. That is why astrologers link the sign with healers, researchers, investigators and therapists.

Being [[modality|fixed]] water, Scorpio is read as feeling that runs deep and still: slow to show, slow to fade. The scorpion is the classic symbol, but older traditions also gave Scorpio the eagle and the phoenix, a ladder from sting to soaring to rebirth that astrologers use to describe how the sign's intensity can transform. The shadow is control, suspicion and holding grudges. The tradition links Scorpio with the reproductive organs.

Scorpio sits opposite Taurus: shared and owned resources, transformation and stability, letting go and holding on.`,
    shadow: `Read on a bad day as controlling, suspicious, or unwilling to forgive.`,
    howPhrase: 'intense, private, penetrating',
    bodyPart: 'reproductive organs',
    astronomy: {
      short: `The 210° to 240° slice; the Sun crosses it from about 23 October to 21 November.`,
    },
    constellation: {
      note: `The constellation Scorpius is one of the few that resembles its name, a hooked tail of stars with the red supergiant Antares at its heart. But the ecliptic only clips its top corner, so the Sun spends only about a week in front of it before moving into Ophiuchus.`,
      sunActuallyThere: 'about 23 - 29 November',
    },
  },

  sagittarius: {
    id: 'sagittarius', name: 'Sagittarius', glyph: `♐${T}`, index: 8, startDeg: 240,
    dates: '22 November - 21 December', symbol: 'The Archer',
    element: 'fire', modality: 'mutable', ruler: 'jupiter', traditionalRuler: 'jupiter', polarity: 'active',
    color: '#d9733b',
    keywords: ['adventure', 'meaning', 'optimism', 'honesty', 'freedom', 'philosophy'],
    short: `Astrologers read Sagittarius as adventurous and searching: optimistic, frank, freedom-loving, always aiming at a bigger horizon.`,
    more: `Sagittarius closes the northern autumn, and astrologers associate it with the urge to go further: travel, study, philosophy, belief and the search for meaning. Planets in Sagittarius are read as enthusiastic, candid, generous and restless, more interested in the big picture than the small print. Its symbol is the archer, a centaur aiming an arrow at a distant target. It is a [[element|fire]] sign, [[modality|mutable]], and ruled by Jupiter, the planet of expansion.`,
    deep: `The archer's arrow is how astrologers usually explain Sagittarius: aim high, shoot far, follow the arrow. The sign is associated with long journeys, foreign cultures, higher education, publishing, religion and law, anything that widens the world or makes sense of it. Sagittarius placements are read as optimistic, funny, honest to the point of bluntness, and allergic to being fenced in.

The centaur, half human and half horse, carries a meaning astrologers point to as well: the sign joins animal energy with the human search for wisdom, the body that wants to run and the mind that wants to understand. As a [[modality|mutable]] fire sign it is read as adaptable and restless, fired by new horizons more than by settling down. The shadow is overpromising, preaching, carelessness with details, or never staying long enough to finish. The tradition links Sagittarius with the hips and thighs, the body's long-distance engine.

Sagittarius sits opposite Gemini: wisdom and information, the long journey and the local street.`,
    shadow: `Read on a bad day as tactless, overconfident, or unable to commit.`,
    howPhrase: 'adventurous, optimistic, big-picture',
    bodyPart: 'hips and thighs',
    astronomy: {
      short: `The 240° to 270° slice, ending at the December solstice point; the Sun crosses it from about 22 November to 21 December.`,
    },
    constellation: {
      note: `The constellation Sagittarius lies towards the centre of our galaxy, and its brightest stars form the shape known as the Teapot. Today the Sun passes in front of it from mid-December to around 20 January, mostly while the sign Capricorn runs.`,
      sunActuallyThere: 'about 18 December - 20 January',
    },
  },

  capricorn: {
    id: 'capricorn', name: 'Capricorn', glyph: `♑${T}`, index: 9, startDeg: 270,
    dates: '22 December - 19 January', symbol: 'The Sea-goat',
    element: 'earth', modality: 'cardinal', ruler: 'saturn', traditionalRuler: 'saturn', polarity: 'receptive',
    color: '#7c7a5a',
    keywords: ['ambition', 'discipline', 'responsibility', 'endurance', 'structure', 'realism'],
    short: `Astrologers read Capricorn as ambitious and disciplined: patient, responsible, realistic, and willing to climb for as long as it takes.`,
    more: `Capricorn begins at the December solstice, the darkest point of the northern year, and astrologers associate it with endurance and long-term building: ambition, responsibility, structure, reputation and authority earned over time. Planets in Capricorn are read as serious, capable, self-controlled and dryly funny, with a strong sense of duty. Its symbol is the sea-goat, a mountain goat with a fish's tail. It is an [[element|earth]] sign, [[modality|cardinal]], and ruled by Saturn, the planet of time.`,
    deep: `Astrologers often picture Capricorn as a mountain goat climbing a steep slope one sure-footed step at a time. The sign is associated with strategy, management, institutions, tradition and the long view, and with people who become more themselves with age and prefer to be judged on results. Being [[modality|cardinal]], it is read as an initiator, but of the kind that starts companies, systems and careers rather than adventures.

The older sea-goat symbol adds depth: a creature that can climb out of the waters of feeling onto the hard rock of the world, carrying both. Astrologers say Capricorn placements often feel more than they show. The shadow is coldness, pessimism, rigid control, or treating worth as the same thing as achievement. Mars is said to be exalted in Capricorn, read as drive harnessed to discipline. The tradition links the sign with the bones, knees, teeth and skin, the body's structure and boundaries, echoing Saturn's themes.

Capricorn sits opposite Cancer: public role and private home, the career and the hearth.`,
    shadow: `Read on a bad day as cold, controlling, or equating self-worth with status.`,
    howPhrase: 'disciplined, strategic, quietly ambitious',
    bodyPart: 'bones, knees and skin',
    astronomy: {
      short: `The 270° to 300° slice, starting at the December solstice point; the Sun crosses it from about 22 December to 19 January.`,
    },
    constellation: {
      note: `The constellation Capricornus is a faint triangle of stars. The Sun passes in front of it from about 20 January to mid-February, roughly while the sign Aquarius runs.`,
      sunActuallyThere: 'about 20 January - 16 February',
    },
  },

  aquarius: {
    id: 'aquarius', name: 'Aquarius', glyph: `♒${T}`, index: 10, startDeg: 300,
    dates: '20 January - 18 February', symbol: 'The Water-bearer',
    element: 'air', modality: 'fixed', ruler: 'uranus', traditionalRuler: 'saturn', polarity: 'active',
    color: '#5fc2d9',
    keywords: ['independence', 'originality', 'community', 'ideals', 'reason', 'detachment'],
    short: `Astrologers read Aquarius as independent and forward-looking: inventive, principled, friendly but detached, devoted to the group's future.`,
    more: `Despite the water in its symbol, Aquarius is an [[element|air]] sign: the water-bearer pours out ideas, knowledge and help for everyone. Astrologers associate it with friendship, community, science, technology, social causes and the future. Planets in Aquarius are read as original, humane, rational and stubbornly their own person, warm towards humanity in general and sometimes cooler in one-to-one closeness. It is [[modality|fixed]], ruled by Uranus in modern astrology and by Saturn traditionally.`,
    deep: `Its two rulers explain how astrologers read Aquarius. From Saturn comes structure and principle: Aquarius is associated with systems, rules worth keeping and loyalty to ideals. From Uranus comes rebellion and invention: Aquarius is also associated with breaking the rules that are not worth keeping, and imagining better ones. The combination is read as the reformer, the scientist, the activist, the friend who never quite fits in and never wants to.

Being [[modality|fixed]] air, Aquarius is described as holding firm opinions and principles, which can make it the most stubborn of the air signs. Aquarius placements are associated with a need for space and equality in relationships, a dry humour, and an interest in what makes people tick collectively. The shadow is aloofness, contrarianism, or loving humanity while finding individual people inconvenient. The tradition links Aquarius with the ankles, calves and circulation.

Aquarius sits opposite Leo: the group and the individual, the network and the star. It is also the sign of the much-discussed "Age of Aquarius", an idea built on precession that you will meet in this tour.`,
    shadow: `Read on a bad day as aloof, contrarian, or rigidly principled.`,
    howPhrase: 'independent, inventive, principled',
    bodyPart: 'ankles, calves and circulation',
    astronomy: {
      short: `The 300° to 330° slice; the Sun crosses it from about 20 January to 18 February.`,
    },
    constellation: {
      note: `The constellation Aquarius is large but faint, a scatter of stars around a small pattern called the Water Jar. The Sun passes in front of it from mid-February to mid-March, roughly while the sign Pisces runs. The March equinox point is drifting towards it, which is where the idea of the Age of Aquarius comes from.`,
      sunActuallyThere: 'about 16 February - 11 March',
    },
  },

  pisces: {
    id: 'pisces', name: 'Pisces', glyph: `♓${T}`, index: 11, startDeg: 330,
    dates: '19 February - 20 March', symbol: 'The Fishes',
    element: 'water', modality: 'mutable', ruler: 'neptune', traditionalRuler: 'jupiter', polarity: 'receptive',
    color: '#6c8fd6',
    keywords: ['compassion', 'imagination', 'intuition', 'surrender', 'spirituality', 'escape'],
    short: `Astrologers read Pisces as imaginative and compassionate: intuitive, receptive, artistic, and drawn to what lies beyond ordinary boundaries.`,
    more: `Pisces closes the zodiac in the last weeks of the northern winter, before the equinox starts the cycle again. Astrologers associate it with endings and dissolving: imagination, compassion, spirituality, music, dreams, and the sense that everything is connected. Planets in Pisces are read as empathetic, adaptable, artistic and porous to other people's feelings, sometimes to the point of losing themselves. It is a [[element|water]] sign, [[modality|mutable]], ruled by Neptune in modern astrology and by Jupiter traditionally.`,
    deep: `As the last sign, Pisces is read as holding a little of all the others; the tradition describes it as the sea into which all rivers run. Its symbol, two fish tied together and swimming in opposite directions, is often explained as the pull between the everyday world and something larger, between being here and wanting to drift away.

Astrologers associate Pisces placements with kindness, creative and spiritual gifts, a feel for atmosphere and a capacity to forgive. Being [[modality|mutable]] water, the sign is read as the most fluid in the zodiac, able to take the shape of whatever holds it. That is its talent in art, healing and care, and also its risk: the shadow astrologers name is escapism, vagueness, martyrdom or trouble with boundaries. Venus is said to be exalted in Pisces, read as love at its most unconditional. The tradition links Pisces with the feet.

Pisces sits opposite Virgo: the ocean and the map. And because the March equinox point now lies among the stars of the constellation Pisces, this is the "Age of Pisces" that astrologers say is slowly giving way to Aquarius.`,
    shadow: `Read on a bad day as escapist, vague, or losing itself in others.`,
    howPhrase: 'intuitive, imaginative, compassionate',
    bodyPart: 'feet',
    astronomy: {
      short: `The 330° to 360° slice, ending where the zodiac begins again; the Sun crosses it from about 19 February to 20 March.`,
    },
    constellation: {
      note: `The constellation Pisces is a wide, faint V of stars. The March equinox point, which defines 0° of the sign Aries, has lain inside it since about 70 BC. The Sun passes in front of Pisces from mid-March to mid-April.`,
      sunActuallyThere: 'about 12 March - 18 April',
    },
  },
};

// Ophiuchus is not a sign; listed so the constellation overlay can label it.
export const ophiuchus = {
  id: 'ophiuchus',
  name: 'Ophiuchus',
  symbol: 'The Serpent-bearer',
  note: `A large constellation the ecliptic crosses between Scorpius and Sagittarius. The Sun spends longer in front of it than in front of Scorpius, but it was never one of the twelve signs.`,
  sunActuallyThere: 'about 29 November - 17 December',
};

export const elements = {
  fire: {
    id: 'fire', name: 'Fire', signs: ['aries', 'leo', 'sagittarius'], polarity: 'active', color: '#e4572e',
    keywords: ['enthusiasm', 'courage', 'inspiration', 'action'],
    short: `Astrologers read fire as spirited energy: enthusiasm, courage, inspiration and the urge to act.`,
    more: `Fire signs are associated with warmth, confidence, spontaneity and a need to express themselves and be inspired. Astrologers read people with many fire placements as lively, direct and motivating, quick to start and sometimes quick to burn out. Too little fire is read as a need to cultivate enthusiasm and self-belief. Fire counts as active in [[polarity]].`,
  },
  earth: {
    id: 'earth', name: 'Earth', signs: ['taurus', 'virgo', 'capricorn'], polarity: 'receptive', color: '#6a9f58',
    keywords: ['practicality', 'patience', 'realism', 'the senses'],
    short: `Astrologers read earth as practical and grounded: patience, realism, the senses and things that last.`,
    more: `Earth signs are associated with the physical world: work, money, the body, craft and nature. Astrologers read people with many earth placements as dependable, patient and productive, preferring proof to promises, and sometimes slow to change. Too little earth is read as difficulty with routine, money or practical follow-through. Earth counts as receptive in [[polarity]].`,
  },
  air: {
    id: 'air', name: 'Air', signs: ['gemini', 'libra', 'aquarius'], polarity: 'active', color: '#e8d36b',
    keywords: ['ideas', 'communication', 'perspective', 'connection'],
    short: `Astrologers read air as social and mental: ideas, words, perspective and connection.`,
    more: `Air signs are associated with thought, communication, relationships and the exchange of ideas. Astrologers read people with many air placements as curious, articulate, fair-minded and good at stepping back to see the whole, and sometimes detached from their feelings. Too little air is read as difficulty getting perspective or putting things into words. Air counts as active in [[polarity]].`,
  },
  water: {
    id: 'water', name: 'Water', signs: ['cancer', 'scorpio', 'pisces'], polarity: 'receptive', color: '#6c8fd6',
    keywords: ['emotion', 'intuition', 'empathy', 'memory'],
    short: `Astrologers read water as feeling: emotion, intuition, empathy, memory and the bonds between people.`,
    more: `Water signs are associated with the emotional and the unseen: moods, care, imagination, intimacy and intuition. Astrologers read people with many water placements as sensitive, protective and perceptive about others, and sometimes overwhelmed or guarded. Too little water is read as difficulty recognising or expressing feelings. Water counts as receptive in [[polarity]].`,
  },
};

export const modalities = {
  cardinal: {
    id: 'cardinal', name: 'Cardinal', signs: ['aries', 'cancer', 'libra', 'capricorn'],
    keywords: ['initiative', 'leadership', 'beginnings'],
    short: `Astrologers read cardinal signs as starters: initiative, leadership and getting things moving.`,
    more: `Each cardinal sign begins at one of the four turning points of the year: Aries at the March [[equinox]], Cancer at the June [[solstice]], Libra at the September equinox, Capricorn at the December solstice. The name comes from the Latin for hinge. Astrologers read them as the energy that opens a season: enterprising, ambitious and direct, better at launching than maintaining.`,
    sky: `Each cardinal sign starts at an equinox or a solstice.`,
  },
  fixed: {
    id: 'fixed', name: 'Fixed', signs: ['taurus', 'leo', 'scorpio', 'aquarius'],
    keywords: ['determination', 'loyalty', 'staying power'],
    short: `Astrologers read fixed signs as sustainers: determination, loyalty, focus and staying power.`,
    more: `Fixed signs fall in the middle of each season, when it is most settled: the height of spring, summer, autumn and winter in the north. Astrologers read them as steady, persistent and reliable, good at finishing and protecting what has been started, and sometimes stubborn and resistant to change.`,
    sky: `Each fixed sign falls in the middle of a season.`,
  },
  mutable: {
    id: 'mutable', name: 'Mutable', signs: ['gemini', 'virgo', 'sagittarius', 'pisces'],
    keywords: ['flexibility', 'versatility', 'adaptation'],
    short: `Astrologers read mutable signs as adapters: flexibility, versatility and preparing for change.`,
    more: `Mutable signs close each season, as one gives way to the next. Astrologers read them as flexible, curious and adaptable, good at responding, learning and connecting, and sometimes scattered or indecisive. They are the bridge between an ending and a new beginning.`,
    sky: `Each mutable sign ends a season, just before an equinox or solstice.`,
  },
};

export const polarities = {
  active: {
    id: 'active', name: 'Active', elements: ['fire', 'air'],
    short: `Fire and air signs: read as outgoing, expressive and initiating; called yang or masculine in older texts.`,
  },
  receptive: {
    id: 'receptive', name: 'Receptive', elements: ['earth', 'water'],
    short: `Earth and water signs: read as inward, absorbing and sustaining; called yin or feminine in older texts.`,
  },
};
