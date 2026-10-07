# 3D Experiments

A collection of interactive 3D experiments that run in the browser, published at
**https://pmaeria.github.io/3d-experiments/**.

| Experiment | Live | Source |
| --- | --- | --- |
| Prometheus: The Steam Locomotive Explained | [Launch](https://pmaeria.github.io/3d-experiments/steam-engine/) | [`experiments/steam-engine`](experiments/steam-engine) |
| Zodiac: The Sky Behind Your Birth Chart | [Launch](https://pmaeria.github.io/3d-experiments/zodiac/) | [`experiments/zodiac`](experiments/zodiac) |

## Layout

```
site/                 the homepage (index.html, experiments.js, thumbs/)
experiments/<slug>/   one self-contained Vite project per experiment
scripts/build.sh      builds everything into _site/
.github/workflows/    builds and deploys to GitHub Pages on every push to main
```

## Adding an experiment

1. Create `experiments/<slug>/` with a `package.json` whose `npm run build` writes to `dist/`.
   For Vite, set `base: './'` in `vite.config.js` so it works under a sub-path.
2. Add a 1200×750 thumbnail at `site/thumbs/<slug>.jpg`.
3. Add an entry to `site/experiments.js`.
4. Push to `main`. The site rebuilds and the experiment appears at `/3d-experiments/<slug>/`.

## Running locally

```bash
cd experiments/steam-engine && npm install && npm run dev   # one experiment
./scripts/build.sh && npx serve _site                       # the whole site as published
```
