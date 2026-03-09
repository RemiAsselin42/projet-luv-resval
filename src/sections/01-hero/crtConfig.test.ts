import { describe, expect, it } from 'vitest';
import { CRT_MENU_CONFIG, getCrtMenuStartY } from './crtConfig';

describe('getCrtMenuStartY', () => {
  it('returns the fully visible menu start position when opacity is 1', () => {
    const totalMenuHeight = CRT_MENU_CONFIG.MENU_COUNT * CRT_MENU_CONFIG.LINE_HEIGHT;
    const expected = CRT_MENU_CONFIG.Y_START - totalMenuHeight / 2;

    expect(getCrtMenuStartY(1)).toBeCloseTo(expected, 6);
  });

  it('applies full slide offset when opacity is 0', () => {
    const totalMenuHeight = CRT_MENU_CONFIG.MENU_COUNT * CRT_MENU_CONFIG.LINE_HEIGHT;
    const expected = CRT_MENU_CONFIG.Y_START - totalMenuHeight / 2 + CRT_MENU_CONFIG.SLIDE_DISTANCE;

    expect(getCrtMenuStartY(0)).toBeCloseTo(expected, 6);
  });

  it('clamps opacity outside [0, 1]', () => {
    expect(getCrtMenuStartY(-5)).toBeCloseTo(getCrtMenuStartY(0), 6);
    expect(getCrtMenuStartY(3)).toBeCloseTo(getCrtMenuStartY(1), 6);
  });
});
