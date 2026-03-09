/**
 * Mathematical utility functions for common operations.
 */

/**
 * Clamps a value between a minimum and maximum.
 * @param value The value to clamp
 * @param min Minimum bound
 * @param max Maximum bound
 * @returns The clamped value
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Clamps a value between 0 and 1.
 * @param value The value to clamp
 * @returns The clamped value in range [0, 1]
 */
export const clamp01 = (value: number): number => {
  return clamp(value, 0, 1);
};

/**
 * Linear interpolation between two values.
 * @param a Start value
 * @param b End value
 * @param t Interpolation factor (0 = a, 1 = b)
 * @returns Interpolated value
 */
export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * clamp01(t);
};

/**
 * Maps a value from one range to another.
 * @param value The input value
 * @param inMin Input range minimum
 * @param inMax Input range maximum
 * @param outMin Output range minimum
 * @param outMax Output range maximum
 * @returns The mapped value
 */
export const mapRange = (
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number => {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
};
