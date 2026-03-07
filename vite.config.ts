import { defineConfig } from 'vite';

export default defineConfig({
  base: '/projet-luv-resval/',
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/examples/jsm/')) {
            return 'three-examples';
          }

          if (id.includes('node_modules/three/')) {
            return 'three';
          }

          if (id.includes('node_modules/gsap/')) {
            return 'gsap';
          }

          if (id.includes('/src/sections/')) {
            return 'sections';
          }

          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
