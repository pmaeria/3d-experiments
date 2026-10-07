import { defineConfig } from 'vite';

// Relative base so the build works under any sub-path (e.g. GitHub Pages /3d-experiments/zodiac/).
export default defineConfig({
  base: './',
  // one bundle: three.js + astronomy-engine + content (~300 KB gzipped) is expected
  build: { chunkSizeWarningLimit: 1200 },
  test: {
    include: ['test/**/*.test.js'],
    environment: 'node',
  },
});
