import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Mock gsap so that gsap.to() calls onUpdate synchronously with the final value
// and onComplete immediately. This ensures loaderStartTime is initialised
// in createLoadingController without waiting for a real animation frame.
vi.mock('gsap', () => ({
  default: {
    to: vi.fn((target: Record<string, number>, vars: {
      onUpdate?: () => void;
      onComplete?: () => void;
      [key: string]: unknown;
    }) => {
      // Apply the final value to the target
      for (const [key, value] of Object.entries(vars)) {
        if (key !== 'onUpdate' && key !== 'onComplete' && key !== 'duration' &&
            key !== 'delay' && key !== 'ease') {
          (target as Record<string, unknown>)[key] = value;
        }
      }
      vars.onUpdate?.();
      vars.onComplete?.();
      return { kill: vi.fn() };
    }),
    timeline: vi.fn(() => ({
      to: vi.fn(),
      kill: vi.fn(),
    })),
  },
  ScrollTrigger: { create: vi.fn(), refresh: vi.fn() },
}));

import { computeCrtScale, computeLoadingProgress, createLoadingController, LOADER_TOTAL_DURATION_SECONDS, LOADER_TRANSITION_SECONDS } from './hero';

describe('computeCrtScale', () => {
  const BASE_PLANE_HEIGHT = 3.5;
  const BASE_PLANE_WIDTH = (16 / 9) * BASE_PLANE_HEIGHT;
  const VISIBLE_HEIGHT = 4;

  it('uses height-locked scaling on 16:9 viewport', () => {
    const scale = computeCrtScale(VISIBLE_HEIGHT, 16 / 9, BASE_PLANE_WIDTH, BASE_PLANE_HEIGHT);

    expect(scale).toBeCloseTo(VISIBLE_HEIGHT / BASE_PLANE_HEIGHT, 6);
  });

  it('keeps height-locked scaling on 16:10 viewport', () => {
    const scale = computeCrtScale(VISIBLE_HEIGHT, 16 / 10, BASE_PLANE_WIDTH, BASE_PLANE_HEIGHT);

    expect(scale).toBeCloseTo(VISIBLE_HEIGHT / BASE_PLANE_HEIGHT, 6);
  });

  it('falls back to contain scaling on very narrow viewport', () => {
    const narrowAspect = 4 / 3;
    const scale = computeCrtScale(VISIBLE_HEIGHT, narrowAspect, BASE_PLANE_WIDTH, BASE_PLANE_HEIGHT, 1920);

    const heightLockedScale = VISIBLE_HEIGHT / BASE_PLANE_HEIGHT;
    const containScale = Math.min(heightLockedScale, (VISIBLE_HEIGHT * narrowAspect) / BASE_PLANE_WIDTH);

    expect(scale).toBeCloseTo(containScale, 6);
    expect(scale).toBeLessThan(heightLockedScale);
  });

  it('uses the 1.2 breakpoint below 1366px width', () => {
    const scale = computeCrtScale(VISIBLE_HEIGHT, 4 / 3, BASE_PLANE_WIDTH, BASE_PLANE_HEIGHT, 1365);
    const heightLockedScale = VISIBLE_HEIGHT / BASE_PLANE_HEIGHT;

    expect(scale).toBeCloseTo(heightLockedScale, 6);
  });

  it('uses contain fallback at 1366px width with 4:3 aspect', () => {
    const scale = computeCrtScale(VISIBLE_HEIGHT, 4 / 3, BASE_PLANE_WIDTH, BASE_PLANE_HEIGHT, 1366);
    const heightLockedScale = VISIBLE_HEIGHT / BASE_PLANE_HEIGHT;
    const containScale = Math.min(heightLockedScale, (VISIBLE_HEIGHT * (4 / 3)) / BASE_PLANE_WIDTH);

    expect(scale).toBeCloseTo(containScale, 6);
    expect(scale).toBeLessThan(heightLockedScale);
  });

  it('guards against zero or negative values', () => {
    const scale = computeCrtScale(0, 0, BASE_PLANE_WIDTH, BASE_PLANE_HEIGHT);

    expect(scale).toBeGreaterThan(0);
  });
});

describe('computeLoadingProgress', () => {
  it('clamps negative elapsed time to 0', () => {
    expect(computeLoadingProgress(-1)).toBe(0);
    expect(computeLoadingProgress(-10)).toBe(0);
  });

  it('starts at 0 and ends at 1', () => {
    expect(computeLoadingProgress(0)).toBe(0);
    expect(computeLoadingProgress(LOADER_TOTAL_DURATION_SECONDS)).toBe(1);
    expect(computeLoadingProgress(LOADER_TOTAL_DURATION_SECONDS + 2)).toBe(1);
  });

  it('is monotonic across key checkpoints', () => {
    const checkpoints = [0, 0.3, 0.6, 1.2, 1.8, 2.4, 3.0, LOADER_TOTAL_DURATION_SECONDS];
    const values = checkpoints.map((time) => computeLoadingProgress(time));

    for (let index = 1; index < values.length; index += 1) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(values[index]).toBeGreaterThanOrEqual(values[index - 1]!);
    }
  });

  it('uses non-linear progression', () => {
    const linearAtHalf = 0.5;
    const valueAtHalfTime = computeLoadingProgress(LOADER_TOTAL_DURATION_SECONDS / 2);

    expect(Math.abs(valueAtHalfTime - linearAtHalf)).toBeGreaterThan(0.05);
  });
});

describe('LOADER_TRANSITION_SECONDS', () => {
  it('is a positive finite number', () => {
    expect(LOADER_TRANSITION_SECONDS).toBeGreaterThan(0);
    expect(Number.isFinite(LOADER_TRANSITION_SECONDS)).toBe(true);
  });
});

// ── Helpers pour createLoadingController ──────────────────────────────────────

const makeScrollManager = () => ({
  stop: vi.fn(),
  start: vi.fn(),
});

const makeCrt = () => ({
  setPowerOn: vi.fn(),
});

describe('createLoadingController — isBarComplete()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns false initially before the bar animation has started', () => {
    const crt = makeCrt();
    const scrollManager = makeScrollManager();
    const ctrl = createLoadingController(crt, scrollManager);

    // loaderStartTime est null → getElapsed() = 0 < LOADER_TOTAL_DURATION_SECONDS
    expect(ctrl.isBarComplete()).toBe(false);

    ctrl.dispose();
  });

  it('returns true once elapsed time exceeds LOADER_TOTAL_DURATION_SECONDS', () => {
    const crt = makeCrt();
    const scrollManager = makeScrollManager();

    // Fixe performance.now à un point dans le passé de façon que l'elapsed soit suffisant.
    // gsap mock appelle onUpdate immédiatement avec value=1 (≥ 0.3) → loaderStartTime = now.
    const startTime = 1000;
    vi.spyOn(performance, 'now').mockReturnValue(startTime);

    const ctrl = createLoadingController(crt, scrollManager);

    // Avance le temps virtuel au-delà de la durée totale
    vi.spyOn(performance, 'now').mockReturnValue(
      startTime + (LOADER_TOTAL_DURATION_SECONDS + 0.1) * 1000,
    );

    expect(ctrl.isBarComplete()).toBe(true);

    ctrl.dispose();
  });

  it('stops the scroll on creation', () => {
    const crt = makeCrt();
    const scrollManager = makeScrollManager();
    const ctrl = createLoadingController(crt, scrollManager);

    expect(scrollManager.stop).toHaveBeenCalledOnce();

    ctrl.dispose();
  });

  it('returns false just below the threshold', () => {
    const crt = makeCrt();
    const scrollManager = makeScrollManager();

    const startTime = 1000;
    vi.spyOn(performance, 'now').mockReturnValue(startTime);

    const ctrl = createLoadingController(crt, scrollManager);

    // juste en-dessous du seuil
    vi.spyOn(performance, 'now').mockReturnValue(
      startTime + (LOADER_TOTAL_DURATION_SECONDS - 0.1) * 1000,
    );

    expect(ctrl.isBarComplete()).toBe(false);

    ctrl.dispose();
  });
});

describe('createLoadingController — triggerPlay()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not trigger play if the bar is not yet complete', () => {
    const crt = makeCrt();
    const scrollManager = makeScrollManager();
    const startTime = 1000;
    vi.spyOn(performance, 'now').mockReturnValue(startTime);

    const ctrl = createLoadingController(crt, scrollManager);

    // Bar not complete → triggerPlay is a no-op
    ctrl.triggerPlay();

    // getLoadingProgress should still return < 1 (bar still running at t=0)
    const progress = ctrl.getLoadingProgress();
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(1);

    ctrl.dispose();
  });

  it('starts the crossfade transition after triggerPlay() when bar is complete', () => {
    const crt = makeCrt();
    const scrollManager = makeScrollManager();

    const startTime = 1000;
    vi.spyOn(performance, 'now').mockReturnValue(startTime);

    const ctrl = createLoadingController(crt, scrollManager);

    // Avance le temps pour que la barre soit complète
    vi.spyOn(performance, 'now').mockReturnValue(
      startTime + (LOADER_TOTAL_DURATION_SECONDS + 0.1) * 1000,
    );

    expect(ctrl.isBarComplete()).toBe(true);
    expect(ctrl.getLoadingProgress()).toBe(1);

    // Déclenche le PLAY
    ctrl.triggerPlay();

    // Juste après le clic PLAY : transitionElapsed ≈ 0 → progress ≈ 1
    const progressJustAfterPlay = ctrl.getLoadingProgress();
    expect(progressJustAfterPlay).toBeGreaterThanOrEqual(1);
    expect(progressJustAfterPlay).toBeLessThanOrEqual(2);

    ctrl.dispose();
  });

  it('completes the transition progress at 2 after LOADER_TRANSITION_SECONDS', () => {
    const crt = makeCrt();
    const scrollManager = makeScrollManager();

    const startTime = 1000;
    vi.spyOn(performance, 'now').mockReturnValue(startTime);

    const ctrl = createLoadingController(crt, scrollManager);

    // Barre complète
    vi.spyOn(performance, 'now').mockReturnValue(
      startTime + (LOADER_TOTAL_DURATION_SECONDS + 0.1) * 1000,
    );

    ctrl.triggerPlay();

    const playTime = performance.now();

    // Avance exactement la durée de la transition
    vi.spyOn(performance, 'now').mockReturnValue(
      playTime + LOADER_TRANSITION_SECONDS * 1000,
    );

    const progress = ctrl.getLoadingProgress();
    expect(progress).toBeCloseTo(2, 1);

    ctrl.dispose();
  });

  it('is a no-op after dispose() (isLoading already false)', () => {
    const crt = makeCrt();
    const scrollManager = makeScrollManager();

    const startTime = 1000;
    vi.spyOn(performance, 'now').mockReturnValue(startTime);

    const ctrl = createLoadingController(crt, scrollManager);

    vi.spyOn(performance, 'now').mockReturnValue(
      startTime + (LOADER_TOTAL_DURATION_SECONDS + 0.1) * 1000,
    );

    ctrl.dispose();

    // Appel après dispose : doit rester sans effet
    ctrl.triggerPlay();

    // isStillLoading est déjà false, start ne doit pas être appelé une 2e fois
    expect(scrollManager.start).toHaveBeenCalledOnce();
  });

  it('calling triggerPlay() twice has no effect (idempotent)', () => {
    const crt = makeCrt();
    const scrollManager = makeScrollManager();

    const startTime = 1000;
    vi.spyOn(performance, 'now').mockReturnValue(startTime);

    const ctrl = createLoadingController(crt, scrollManager);

    // Barre complète
    vi.spyOn(performance, 'now').mockReturnValue(
      startTime + (LOADER_TOTAL_DURATION_SECONDS + 0.1) * 1000,
    );

    ctrl.triggerPlay();
    const playTime = performance.now();

    // Avance d'un peu
    vi.spyOn(performance, 'now').mockReturnValue(playTime + 100);
    const progressAfterFirstPlay = ctrl.getLoadingProgress();

    // Deuxième appel : ne doit pas réinitialiser playTriggeredTime
    ctrl.triggerPlay();
    const progressAfterSecondPlay = ctrl.getLoadingProgress();

    // Les deux valeurs doivent être identiques (même timestamp de référence)
    expect(progressAfterSecondPlay).toBeCloseTo(progressAfterFirstPlay, 5);

    ctrl.dispose();
  });

  it('unlocks scroll and marks isStillLoading false after triggerPlay transition', () => {
    const crt = makeCrt();
    const scrollManager = makeScrollManager();

    const startTime = 1000;
    vi.spyOn(performance, 'now').mockReturnValue(startTime);

    const ctrl = createLoadingController(crt, scrollManager);

    // Barre complète
    vi.spyOn(performance, 'now').mockReturnValue(
      startTime + (LOADER_TOTAL_DURATION_SECONDS + 0.1) * 1000,
    );

    ctrl.triggerPlay();
    const playTime = performance.now();

    // Légèrement après le clic : la transition commence → unlockAfterLoading est appelé
    vi.spyOn(performance, 'now').mockReturnValue(playTime + 50);

    // Appel de getLoadingProgress déclenche unlockAfterLoading()
    ctrl.getLoadingProgress();

    expect(ctrl.isStillLoading()).toBe(false);
    expect(scrollManager.start).toHaveBeenCalledOnce();

    ctrl.dispose();
  });
});

describe('createLoadingController — dispose()', () => {
  it('unlocks scroll when disposed while still loading', () => {
    const crt = makeCrt();
    const scrollManager = makeScrollManager();
    const ctrl = createLoadingController(crt, scrollManager);

    ctrl.dispose();

    expect(scrollManager.start).toHaveBeenCalledOnce();
    expect(ctrl.isStillLoading()).toBe(false);
  });

  it('does not call scrollManager.start twice if already unlocked', () => {
    const crt = makeCrt();
    const scrollManager = makeScrollManager();

    const startTime = 1000;
    vi.spyOn(performance, 'now').mockReturnValue(startTime);

    const ctrl = createLoadingController(crt, scrollManager);

    // Barre complète + play + avance après transition
    vi.spyOn(performance, 'now').mockReturnValue(
      startTime + (LOADER_TOTAL_DURATION_SECONDS + 0.1) * 1000,
    );
    ctrl.triggerPlay();
    const playTime = performance.now();
    vi.spyOn(performance, 'now').mockReturnValue(playTime + 50);
    ctrl.getLoadingProgress(); // déclenche unlockAfterLoading

    // dispose ne doit pas appeler start une deuxième fois
    ctrl.dispose();
    expect(scrollManager.start).toHaveBeenCalledOnce();

    vi.restoreAllMocks();
  });
});
