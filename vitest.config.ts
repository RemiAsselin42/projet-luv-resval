import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    globals: false,
    clearMocks: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      // Only measure coverage for production source files in src/
      include: ['src/**/*.ts'],
      exclude: [
        // Test files
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        // Type declarations only — no runtime logic
        'src/**/*.d.ts',
        'src/vite-env.d.ts',
        'src/audio/types.ts',
        'src/sections/types.ts',
        'src/sections/01-hero/crtTypes.ts',
        // GLSL shader strings — no testable JS logic
        'src/sections/01-hero/crtShaders.ts',
        // Application entry point — integration/E2E only
        'src/main.ts',
        // Re-export with no logic
        'src/sections/registry.ts',
        // Stub sections — no implementation yet (test when implemented)
        'src/sections/03-les-reliques/reliques.ts',
        'src/sections/04-oeil-big-brother/bigBrother.ts',
        'src/sections/05-mpc-3d/mpc3d.ts',
        'src/sections/06-outro-eclipse/eclipse.ts',
        // Three.js scene bootstrapping — WebGLRenderer not testable in jsdom
        // (testable logic: getRecommendedPixelRatio is covered via scene.test.ts)
        'src/core/scene.ts',
        // Three.js hero scene setup — most code is untestable WebGL glue in jsdom
        // (pure logic: computeCrtScale, computeLoadingProgress, createLoadingController
        //  are covered via hero.test.ts which imports them from this file)
        'src/sections/01-hero/hero.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
      },
    },
  },
});
