import { describe, it, expect } from 'vitest';
import { clamp, clamp01, lerp, mapRange } from './math';

describe('math utilities', () => {
  describe('clamp', () => {
    it('returns the value if within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });

    it('clamps to minimum if value is too low', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(-100, -50, 50)).toBe(-50);
    });

    it('clamps to maximum if value is too high', () => {
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(100, -50, 50)).toBe(50);
    });

    it('handles negative ranges', () => {
      expect(clamp(-5, -10, -1)).toBe(-5);
      expect(clamp(-15, -10, -1)).toBe(-10);
      expect(clamp(0, -10, -1)).toBe(-1);
    });
  });

  describe('clamp01', () => {
    it('returns the value if between 0 and 1', () => {
      expect(clamp01(0.5)).toBe(0.5);
      expect(clamp01(0)).toBe(0);
      expect(clamp01(1)).toBe(1);
    });

    it('clamps to 0 if value is negative', () => {
      expect(clamp01(-0.5)).toBe(0);
      expect(clamp01(-10)).toBe(0);
    });

    it('clamps to 1 if value is greater than 1', () => {
      expect(clamp01(1.5)).toBe(1);
      expect(clamp01(100)).toBe(1);
    });
  });

  describe('lerp', () => {
    it('interpolates between two values', () => {
      expect(lerp(0, 10, 0)).toBe(0);
      expect(lerp(0, 10, 0.5)).toBe(5);
      expect(lerp(0, 10, 1)).toBe(10);
    });

    it('works with negative values', () => {
      expect(lerp(-10, 10, 0.5)).toBe(0);
      expect(lerp(-10, -5, 0.5)).toBe(-7.5);
    });

    it('clamps t parameter to [0, 1]', () => {
      expect(lerp(0, 10, 1.5)).toBe(10); // t clamped to 1
      expect(lerp(0, 10, -0.5)).toBe(0); // t clamped to 0
    });

    it('handles decimal interpolation factors', () => {
      expect(lerp(0, 100, 0.25)).toBe(25);
      expect(lerp(0, 100, 0.75)).toBe(75);
    });
  });

  describe('mapRange', () => {
    it('maps values from one range to another', () => {
      expect(mapRange(5, 0, 10, 0, 100)).toBe(50);
      expect(mapRange(0, 0, 10, 0, 100)).toBe(0);
      expect(mapRange(10, 0, 10, 0, 100)).toBe(100);
    });

    it('handles negative ranges', () => {
      expect(mapRange(0, -10, 10, 0, 100)).toBe(50);
      expect(mapRange(-10, -10, 10, 0, 100)).toBe(0);
    });

    it('inverts ranges correctly', () => {
      expect(mapRange(5, 0, 10, 100, 0)).toBe(50);
      expect(mapRange(0, 0, 10, 100, 0)).toBe(100);
      expect(mapRange(10, 0, 10, 100, 0)).toBe(0);
    });

    it('handles decimal values', () => {
      expect(mapRange(2.5, 0, 10, 0, 1)).toBeCloseTo(0.25, 5);
      expect(mapRange(7.5, 0, 10, 0, 1)).toBeCloseTo(0.75, 5);
    });

    it('maps outside input range correctly', () => {
      expect(mapRange(15, 0, 10, 0, 100)).toBe(150);
      expect(mapRange(-5, 0, 10, 0, 100)).toBe(-50);
    });
  });
});
