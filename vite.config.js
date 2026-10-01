import { defineConfig } from 'vite';

// base: './' makes every asset path relative, so the built `dist/` folder
// works on GitHub Pages sub-paths (username.github.io/repo/), Netlify and Vercel.
export default defineConfig({
  base: './',
  server: {
    host: true, // lets you open the dev server from your phone on the same Wi-Fi
    port: 5173,
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000, // Phaser itself is ~1.2 MB, that's expected
  },
});
