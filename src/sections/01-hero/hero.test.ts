import { describe, expect, it } from 'vitest';
import { computeCrtScale, computeLoadingProgress, LOADER_TOTAL_DURATION_SECONDS, LOADER_TRANSITION_SECONDS } from './hero';

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
    const scale = computeCrtScale(VISIBLE_HEIGHT, narrowAspect, BASE_PLANE_WIDTH, BASE_PLANE_HEIGHT);

    const heightLockedScale = VISIBLE_HEIGHT / BASE_PLANE_HEIGHT;
    const containScale = Math.min(heightLockedScale, (VISIBLE_HEIGHT * narrowAspect) / BASE_PLANE_WIDTH);

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
