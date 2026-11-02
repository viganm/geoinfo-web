import { defineConfig } from 'vite';

export default defineConfig({
  // relative asset paths so the build works under a GitHub Pages project subpath
  base: './',
  build: { target: 'es2022', cssMinify: true },
  server: { port: 5180 },
  optimizeDeps: { include: ['gsap', 'gsap/ScrollTrigger', 'gsap/SplitText', 'lenis', 'd3-contour'] },
});
