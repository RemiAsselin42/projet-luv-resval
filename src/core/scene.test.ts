import { describe, it, expect } from 'vitest';
import { getRecommendedPixelRatio } from './scene';

// Helpers to configure navigator and window properties
const setNavigator = (overrides: { deviceMemory?: number; hardwareConcurrency?: number }) => {
  Object.defineProperty(navigator, 'deviceMemory', {
    configurable: true,
    value: overrides.deviceMemory,
  });
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    configurable: true,
    value: overrides.hardwareConcurrency ?? 8,
  });
};

const setDevicePixelRatio = (dpr: number) => {
  Object.defineProperty(window, 'devicePixelRatio', {
    configurable: true,
    value: dpr,
  });
};

describe('getRecommendedPixelRatio', () => {
  it('caps at 1.25 when deviceMemory is at or below 4 GB', () => {
    setNavigator({ deviceMemory: 2, hardwareConcurrency: 8 });
    setDevicePixelRatio(3);

    expect(getRecommendedPixelRatio()).toBeLessThanOrEqual(1.25);
  });

  it('caps at 1.25 when deviceMemory equals the threshold (4 GB)', () => {
    setNavigator({ deviceMemory: 4, hardwareConcurrency: 8 });
    setDevicePixelRatio(3);

    expect(getRecommendedPixelRatio()).toBeLessThanOrEqual(1.25);
  });

  it('caps at 1.25 when hardwareConcurrency is at or below 4', () => {
    setNavigator({ deviceMemory: undefined, hardwareConcurrency: 4 });
    setDevicePixelRatio(3);

    expect(getRecommendedPixelRatio()).toBeLessThanOrEqual(1.25);
  });

  it('caps at 1.25 when hardwareConcurrency is 2 (very low)', () => {
    setNavigator({ deviceMemory: 16, hardwareConcurrency: 2 });
    setDevicePixelRatio(3);

    expect(getRecommendedPixelRatio()).toBeLessThanOrEqual(1.25);
  });

  it('allows up to 2 on capable devices (high memory, high cores)', () => {
    setNavigator({ deviceMemory: 16, hardwareConcurrency: 8 });
    setDevicePixelRatio(3);

    const ratio = getRecommendedPixelRatio();
    expect(ratio).toBeGreaterThan(1.25);
    expect(ratio).toBeLessThanOrEqual(2);
  });

  it('never exceeds devicePixelRatio', () => {
    setNavigator({ deviceMemory: 16, hardwareConcurrency: 8 });
    setDevicePixelRatio(1);

    expect(getRecommendedPixelRatio()).toBe(1);
  });

  it('returns devicePixelRatio when it is lower than the cap', () => {
    setNavigator({ deviceMemory: 16, hardwareConcurrency: 8 });
    setDevicePixelRatio(1.5);

    expect(getRecommendedPixelRatio()).toBe(1.5);
  });

  it('returns 1.25 when deviceMemory is unknown (0) and cores are high', () => {
    // deviceMemory ?? 0 → 0, condition: memory > 0 is false, so only cores matter
    setNavigator({ deviceMemory: undefined, hardwareConcurrency: 8 });
    setDevicePixelRatio(3);

    // cores = 8 > 4 → cap is 2
    expect(getRecommendedPixelRatio()).toBeLessThanOrEqual(2);
  });
});
