// What every part is, what it does, and the guided tour. Written for curious
// visitors; the "detail" lines are for those who want the engineer's view.

export const PARTS = {
  firebox: {
    name: 'Firebox',
    text: 'The furnace at the heart of the engine. Coal burns on the grate at well over 1,000 °C. The firebox is a copper box surrounded on every side by water, so its heat goes straight into the boiler.',
    detail: 'The inner firebox is copper because it conducts heat superbly and tolerates the stress of heating and cooling. Thousands of stays hold it to the outer wrapper against the steam pressure.',
  },
  grate: {
    name: 'Grate & Fire',
    text: 'Firebars hold the burning coal. Air rushes up through the gaps from the ashpan below. The fireman spreads fresh coal across the bed every few moments.',
    detail: 'A good fire is thin and bright. Pile on too much and it chokes, and you get black smoke, which is unburnt fuel wasted out of the chimney.',
  },
  firehole: {
    name: 'Firehole Doors',
    text: 'The fireman’s window into the furnace. They open only for a moment with each shovelful, so that cold air does not chill the tubes.',
  },
  brickarch: {
    name: 'Brick Arch',
    text: 'A shelf of firebrick inside the firebox. It forces the flames to travel further, so the gases burn completely before they reach the tubes.',
    detail: 'It also shields the tube ends from blasts of cold air when the doors are opened, and stores heat like an oven.',
  },
  tubes: {
    name: 'Fire Tubes',
    text: 'Dozens of tubes carry the hot gases from the firebox, through the water, to the smokebox. All that tube surface passes the fire’s heat into the water around it.',
    detail: 'This "multi-tubular" boiler, famously used on Stephenson’s Rocket of 1829, gives a vast heating surface in a small space. It was the breakthrough that made fast locomotives possible.',
  },
  boiler: {
    name: 'Boiler Barrel',
    text: 'A long drum of riveted iron plates full of water, with steam collecting in the space above. Under pressure the water boils at nearly 190 °C.',
    detail: 'The barrel is lagged under its painted cladding to keep the heat in. At 160 lb per square inch, every square foot of plate is holding back over ten tons.',
  },
  water: {
    name: 'Boiling Water',
    text: 'The water must always cover the top of the firebox. Watch the bubbles: the hotter the fire, the faster steam is made.',
    detail: 'If the level falls too far, a lead fusible plug in the firebox crown melts and lets steam into the fire as a last-ditch warning.',
  },
  dome: {
    name: 'Steam Dome',
    text: 'The highest point of the boiler, polished brass on this engine. Steam is collected up here, as far as possible from the splashing water below, so it is dry.',
  },
  regulator: {
    name: 'Regulator (Throttle)',
    text: 'A valve in the dome that the driver opens with the regulator handle in the cab. Open it a little and a little steam flows to the cylinders. Open it wide for full power.',
  },
  safety: {
    name: 'Safety Valves',
    text: 'Spring-loaded valves that lift and roar when the pressure reaches its limit, letting steam escape so the boiler can never burst.',
    detail: 'Ramsbottom’s design of 1856 uses two valves held down by one spring and lever, which makes them very hard for a crew to tamper with.',
  },
  whistle: {
    name: 'Whistle',
    text: 'Steam blown across the lip of a brass bell. It warns workers on the line and signals to the guard.',
  },
  steampipe: {
    name: 'Steam Pipes',
    text: 'From the regulator a pipe carries live steam forward through the boiler to the smokebox. There it divides into two pipes, one down to each cylinder.',
  },
  smokebox: {
    name: 'Smokebox',
    text: 'The chamber at the front where the hot gases leave the tubes. It must be airtight: the partial vacuum in here is what draws air through the fire.',
  },
  blastpipe: {
    name: 'Blastpipe',
    text: 'Used steam from the cylinders blasts up this nozzle and out of the chimney. Each puff drags the smokebox gases with it and pulls fresh air through the fire.',
    detail: 'This is the locomotive’s self-regulating secret: the harder it works, the stronger the blast, the fiercer the fire, and the more steam it makes.',
  },
  chimney: {
    name: 'Chimney',
    text: 'Exhaust steam and smoke leave here, four puffs to every turn of the driving wheels. That is the famous "chuff" of a steam engine.',
  },
  steamchest: {
    name: 'Steam Chest',
    text: 'A box on top of each cylinder, filled with live steam waiting to be let in. Inside, the slide valve decides where the steam goes.',
  },
  valve: {
    name: 'Slide Valve',
    text: 'A D-shaped valve sliding back and forth over three ports. It lets steam into one end of the cylinder while the used steam from the other end escapes through its hollow underside to the exhaust.',
    detail: 'The valve overlaps the ports slightly (the "lap"). This lets it shut off steam early in the stroke so the steam’s own expansion does the rest of the work.',
  },
  cylinder: {
    name: 'Cylinder',
    text: 'Where steam becomes motion. Steam pushes the piston one way, then the other. The colours show the pressure in each end: red is live steam, orange is expanding, violet is exhausting.',
    detail: 'Cylinder drain cocks underneath are opened when starting from cold, to blow out water that has condensed inside.',
  },
  piston: {
    name: 'Piston',
    text: 'A disc sealed by springy rings, pushed by steam first from behind and then from in front. Its rod passes out of the cylinder through a packed gland.',
  },
  draincocks: {
    name: 'Cylinder Drain Cocks',
    text: 'Small valves beneath each cylinder. Opened when starting, they blow out condensed water, which cannot be compressed and could crack a cylinder cover.',
  },
  crosshead: {
    name: 'Crosshead & Slide Bars',
    text: 'The piston rod drives a crosshead that slides between polished bars, keeping the rod perfectly straight while the connecting rod swings.',
  },
  conrod: {
    name: 'Connecting Rod',
    text: 'The great rod that turns back-and-forth motion into rotation, pushing and pulling the crank pin on the driving wheel.',
  },
  couplingrod: {
    name: 'Coupling Rod',
    text: 'Links the two driving wheels so they turn together and share the effort. The engine can then grip the rails without slipping.',
  },
  drivers: {
    name: 'Driving Wheels',
    text: 'Six-and-a-half-foot express wheels. Each turn moves the train over six metres. Weights cast into the wheels between the spokes balance the heavy rods.',
    detail: 'The two sides are set a quarter-turn apart, so one cylinder is always able to push. The engine can never stop "on dead centre".',
  },
  splasher: { name: 'Splashers', text: 'Curved covers over the big driving wheels, edged in polished brass.' },
  nameplate: { name: 'Nameplate', text: '"Prometheus" was the Titan who stole fire from the gods and gave it to mankind. A fitting name for an engine that turns fire into motion.' },
  valvegear: {
    name: 'Walschaerts Valve Gear',
    text: 'The clever linkage that moves the slide valve at exactly the right moments. It takes one motion from a return crank on the wheel and another from the crosshead, and adds them together.',
    detail: 'Moving the die block up or down the curved expansion link reverses the engine or shortens the "cut-off". Steam is then admitted for only part of each stroke and left to expand, which saves coal and water.',
  },
  reverser: {
    name: 'Reverser',
    text: 'The driver’s lever that sets direction and cut-off. Full forward gives maximum power for starting. As speed rises the driver "notches up" towards mid-gear to work the steam expansively.',
  },
  bogie: {
    name: 'Leading Bogie',
    text: 'A swivelling four-wheeled truck under the front. It guides the engine smoothly into curves at speed.',
  },
  frames: {
    name: 'Frames & Footplate',
    text: 'Stout iron plates forming the backbone of the engine. Everything else is bolted to them. The running board along the top is edged in brass.',
  },
  tender: {
    name: 'Tender',
    text: 'The engine’s larder, towed behind. It carries about four tons of coal and nearly three thousand gallons of water.',
  },
  coal: { name: 'Coal Space', text: 'Best Welsh steam coal, shovelled by hand. On a long run the fireman may move several tons of it.' },
  tenderwater: { name: 'Water Tank', text: 'Water for the boiler, carried in the tender. A thirsty express engine could drain it in under two hours.' },
  injector: {
    name: 'Injector',
    text: 'A wonderful device with no moving parts. A jet of boiler steam drags water from the tender and forces it into the boiler, even against the boiler’s own pressure.',
    detail: 'Invented by Henri Giffard in 1858. The steam condenses in the cone and its momentum carries the water past the clack valve.',
  },
  clack: { name: 'Clack Valve', text: 'A one-way valve where the feed water enters the boiler. It "clacks" shut so boiler water cannot escape back down the pipe.' },
  gauges: { name: 'Pressure Gauge & Water Glass', text: 'The driver’s two most important instruments. One shows the steam pressure; the glass tube shows the water level in the boiler.' },
  backhead: { name: 'Backhead', text: 'The back plate of the firebox, inside the cab, carrying the gauges, valves and the firehole.' },
  cab: { name: 'Cab', text: 'The crew’s workplace: driver on one side, fireman on the other. Victorian cabs gave little shelter, just a weatherboard with two round spectacle windows.' },
};

// camera targets [position, lookAt]
export const VIEWS = {
  overview: { label: 'Grand View', pos: [11.6, 3.1, 12.6], target: [-0.9, 1.75, 0] },
  firebox: { label: 'Firebox', pos: [-0.2, 2.9, 5.6], target: [-1.5, 2.05, 0] },
  boiler: { label: 'Boiler & Tubes', pos: [1.7, 3.3, 5.6], target: [1.0, 2.35, 0] },
  smokebox: { label: 'Smokebox & Chimney', pos: [6.8, 3.6, 4.2], target: [4.0, 2.8, 0] },
  cylinders: { label: 'Cylinder & Valve', pos: [5.0, 1.55, 4.7], target: [4.45, 1.25, 1.12] },
  motion: { label: 'Valve Gear & Rods', pos: [3.3, 1.45, 6.3], target: [2.85, 1.22, 1.1] },
  cab: { label: 'Footplate', pos: [-3.7, 3.55, 2.7], target: [-2.6, 2.5, 0] },
  tender: { label: 'Tender', pos: [-3.6, 4.3, 8.4], target: [-6.0, 1.9, 0] },
  wheel: { label: 'Rail Level', pos: [7.2, 0.35, 3.3], target: [0.5, 1.4, 0.8] },
};

export const TOUR = [
  {
    title: 'Prometheus',
    text: 'Welcome to the Hall of Engineering. Before you stands an express locomotive of the 1850s. It is a machine that turns coal and water into motion. Let us follow the journey of energy through it, from fire to wheel.',
    view: 'overview', set: { cut: false, flows: false, slow: 1 },
  },
  {
    title: 'I · Coal & Water',
    text: 'Everything begins in the tender. It carries the two things the engine consumes: coal for the fire and water for the boiler. A hard-working engine burns about a ton of coal an hour and drinks far more in water.',
    view: 'tender', part: 'tender', set: { cut: true, flows: false },
  },
  {
    title: 'II · The Fire',
    text: 'In the firebox, coal burns on the grate at over 1,000 °C. Notice the fire is surrounded by water on every side: the firebox is a copper box sitting inside the boiler. The brick arch makes the flames travel the long way round, so the coal burns completely.',
    view: 'firebox', part: 'firebox', set: { cut: true, flows: true },
  },
  {
    title: 'III · Fire Tubes',
    text: 'The hot gases (orange) rush forward through dozens of tubes running through the water. The tubes glow where the gases enter, then cool as they give up their heat. The bubbles show water boiling into steam all along them.',
    view: 'boiler', part: 'tubes', set: { cut: true, flows: true },
  },
  {
    title: 'IV · Steam is Gathered',
    text: 'Steam rises to the space above the water and collects in the brass dome, the highest and driest point. The regulator valve sits inside it. When the driver opens the regulator, live steam (red) flows forward along the main steam pipe.',
    view: 'boiler', part: 'dome', set: { cut: true, flows: true },
    action: { regulator: 0.45 },
  },
  {
    title: 'V · Safety First',
    text: 'If the fire makes steam faster than the engine uses it, the pressure climbs. At 160 lb per square inch the safety valves lift with a roar and the boiler is protected. Try it later: close the regulator and pile on coal.',
    view: 'boiler', part: 'safety', set: { cut: false, flows: false },
  },
  {
    title: 'VI · To the Cylinders',
    text: 'In the smokebox the steam pipe divides, one branch to each side of the engine. The steam waits in the steam chest above each cylinder, ready to be admitted.',
    view: 'smokebox', part: 'steampipe', set: { cut: true, flows: true },
  },
  {
    title: 'VII · The Slide Valve',
    text: 'Here is the clever part. The slide valve moves to and fro, letting steam into one end of the cylinder while used steam escapes from the other. Watch the section diagram below, slowed right down.',
    view: 'cylinders', part: 'valve', set: { cut: true, flows: true, slow: 0.12, diagram: true },
  },
  {
    title: 'VIII · Piston Power',
    text: 'Steam pushes the piston one way, then the valve switches and pushes it back. Red means fresh, high-pressure steam; orange means it is expanding and still working; violet means it is spent and escaping. Two cylinders, set a quarter-turn apart, mean the engine can always start.',
    view: 'cylinders', part: 'cylinder', set: { cut: true, flows: true, slow: 0.12, diagram: true },
  },
  {
    title: 'IX · Rods & Wheels',
    text: 'The piston rod drives the crosshead along its slide bars. The connecting rod turns that push-and-pull into rotation of the driving wheel. The coupling rod shares the effort with the second pair of wheels.',
    view: 'motion', part: 'conrod', set: { cut: false, flows: false, slow: 0.25 },
  },
  {
    title: 'X · Walschaerts Valve Gear',
    text: 'This elegant linkage times the valve. It combines a motion from the return crank on the wheel with a motion from the crosshead. Moving the reverser slides the die block in the curving link to change direction, or to cut off the steam early and let it expand.',
    view: 'motion', part: 'valvegear', set: { cut: false, flows: false, slow: 0.2 },
  },
  {
    title: 'XI · Exhaust & Draught',
    text: 'Spent steam (violet) is not wasted. It blasts up the blastpipe and out of the chimney, dragging the smokebox gases with it and pulling air through the fire. Work the engine harder and the fire burns hotter. Four beats to each turn of the wheels: chuff, chuff, chuff, chuff.',
    view: 'smokebox', part: 'blastpipe', set: { cut: true, flows: true, slow: 0.5 },
  },
  {
    title: 'XII · Feeding the Boiler',
    text: 'The water boiled away must be replaced. The injector uses a jet of steam to force cold water from the tender into the boiler, against the boiler’s own pressure, through the clack valve. Watch the blue stream.',
    view: 'cab', part: 'injector', set: { cut: true, flows: true, slow: 1 },
    action: { injector: true },
  },
  {
    title: 'The Footplate is Yours',
    text: 'You have followed the energy from fire to wheel. Now take the controls. Open the regulator, notch up the reverser as speed rises, keep the water in the glass and the pressure near the red line. Good luck, driver!',
    view: 'overview', set: { cut: false, flows: false, slow: 1 },
  },
];

export const LABELS = ['firebox', 'tubes', 'dome', 'safety', 'chimney', 'smokebox', 'steamchest', 'cylinder', 'crosshead', 'conrod', 'couplingrod', 'drivers', 'valvegear', 'tender', 'injector', 'cab', 'bogie', 'whistle'];
