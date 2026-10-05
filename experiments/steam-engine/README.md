# Prometheus: The Steam Locomotive Explained

An interactive, fully animated 3D exhibit of a Victorian 4-4-0 express locomotive, set in a
Victorian Hall of Engineering at dusk. It's built for teaching: cut the engine open, follow the
fire, water and steam, and drive it yourself.

## Running it

```bash
cd experiments/steam-engine
npm install      # first time only
npm run dev      # then open http://localhost:5317
```

`npm run build` produces a static site in `dist/` that can be hosted anywhere.

## What's inside

- **A real simulation, not a canned animation.** The Walschaerts valve gear is solved
  kinematically each frame (`src/valvegear.js`). The slide valve's port openings drive a
  thermodynamic model of each end of each cylinder (`src/sim.js`). That gives the piston
  force, the torque on the wheels, the exhaust beats (four per turn), the blastpipe draught
  on the fire, boiler pressure, water level and the safety valves.
- **Cutaway mode.** Animated section planes open the boiler, firebox, smokebox, chimney,
  dome, cylinders, steam chests and tender. Cut edges are painted red, as on museum
  sectioned engines. The planes always cut the half facing you.
- **Flow paths.** Colour-coded particles trace the feed water, hot fire gases, live steam
  and exhaust steam. Each stream's strength comes straight from the simulation.
- **Cylinder section and indicator diagram.** A live, engraving-style drawing of the slide
  valve and piston, with the pressure/volume loop engineers used to measure power.
- **Guided tour.** 14 steps follow the energy from coal to wheel. You can also click any
  part for an info card, or switch on labels.
- **Procedural sound.** Every sound is synthesised in the browser: chuffs, fire roar,
  safety valves, whistle, injector, drain cocks, rod clank and the hall's reverb.

## Controls

| Key | Action |
| --- | --- |
| Drag / scroll | Look around / approach |
| `W` (hold) | Whistle |
| `C` `F` `L` `V` | Cutaway, flow paths, labels, cylinder section |
| `I` `D` | Injector, drain cocks |
| `Space` | Pause / resume time |
| `1`–`9` | Vantage points |
| `O` `M` `H` | Slow orbit, sound, hide the interface |
| `←` `→` | Previous / next tour step |
| `Esc` | Close cards |

The **"Fireman tends the fire & water"** switch keeps the fire and boiler water managed
for casual visitors. Turn it off to fire the engine yourself.

## Code map

| File | Purpose |
| --- | --- |
| `src/valvegear.js` | Crank, connecting rod and Walschaerts gear kinematics; slide valve ports |
| `src/sim.js` | Boiler, fire, draught, cylinders and dynamics |
| `src/locomotive.js` | The engine's geometry, materials, cutaways and per-frame animation |
| `src/hall.js` | The exhibition hall, test-bed rollers, lamps and environment map |
| `src/particles.js` | Steam, smoke and spark particles |
| `src/flows.js` | Flow-path visualisation |
| `src/diagram.js` | 2D cylinder section and indicator diagram |
| `src/audio.js` | Procedural sound |
| `src/content.js` | Part descriptions, camera views and the guided tour |
| `src/ui.js`, `src/style.css` | Brass gauges, regulator lever, labels, cards |
