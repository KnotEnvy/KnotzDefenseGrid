import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative asset paths: the built game can be hosted from any subpath (e.g. GitHub Pages)
  build: {
    chunkSizeWarningLimit: 2000 // Phaser itself is ~1.4 MB minified (about 400 kB gzipped)
  }
});
