import { describe, expect, it } from 'vitest';
import { computeCrtScale } from './hero';

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
