import { describe, expect, it } from 'vitest';
import {
  CRT_MENU_CONFIG,
  CRT_LOADER_CONFIG,
  getCrtMenuStartY,
  getPlayButtonUVBounds,
  getResponsiveTextScale,
  getCurrentBreakpoint,
} from './crtConfig';
import {
  PLAY_BUTTON_PULSE_BASE,
  PLAY_BUTTON_PULSE_AMP,
  PLAY_BUTTON_PULSE_PERIOD_MS,
} from './crtConfig';
import { isPlayButtonPulsing } from './crtCanvasTexture';

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

describe('getResponsiveTextScale', () => {
  it('returns mobile scale at 480px', () => {
    const originalInnerWidth = window.innerWidth;

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 480,
    });

    try {
      expect(getResponsiveTextScale()).toBe(0.9);
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalInnerWidth,
      });
    }
  });

  it('returns tablet-sm scale at 481px', () => {
    const originalInnerWidth = window.innerWidth;

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 481,
    });

    try {
      expect(getResponsiveTextScale()).toBe(0.95);
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalInnerWidth,
      });
    }
  });

  it('returns tablet-sm scale at 768px', () => {
    const originalInnerWidth = window.innerWidth;

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 768,
    });

    try {
      expect(getResponsiveTextScale()).toBe(0.95);
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalInnerWidth,
      });
    }
  });

  it('returns desktop scale at 769px', () => {
    const originalInnerWidth = window.innerWidth;

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 769,
    });

    try {
      expect(getResponsiveTextScale()).toBe(1);
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalInnerWidth,
      });
    }
  });

  it('returns stable desktop scale on 1080p', () => {
    const originalInnerWidth = window.innerWidth;

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1920,
    });

    try {
      expect(getResponsiveTextScale()).toBeCloseTo(1, 6);
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalInnerWidth,
      });
    }
  });

  it('keeps same desktop scale on 1440p ultrawide', () => {
    const originalInnerWidth = window.innerWidth;

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 3440,
    });

    try {
      expect(getResponsiveTextScale()).toBeCloseTo(1, 6);
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalInnerWidth,
      });
    }
  });

  it('uses reduced scale on mobile viewport', () => {
    const originalInnerWidth = window.innerWidth;

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 430,
    });

    try {
      expect(getResponsiveTextScale()).toBe(0.9);
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalInnerWidth,
      });
    }
  });

  it('uses slight reduction on small tablets', () => {
    const originalInnerWidth = window.innerWidth;

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 700,
    });

    try {
      expect(getResponsiveTextScale()).toBe(0.95);
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalInnerWidth,
      });
    }
  });
});

describe('getCurrentBreakpoint', () => {
  it('returns MOBILE at or below 480px', () => {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 480,
    });

    try {
      expect(getCurrentBreakpoint()).toBe('MOBILE');
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalInnerWidth,
      });
    }
  });

  it('returns TABLET_SM in 481-768 range', () => {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 700,
    });

    try {
      expect(getCurrentBreakpoint()).toBe('TABLET_SM');
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalInnerWidth,
      });
    }
  });

  it('returns TABLET_MD in 769-1024 range', () => {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 900,
    });

    try {
      expect(getCurrentBreakpoint()).toBe('TABLET_MD');
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalInnerWidth,
      });
    }
  });

  it('returns DESKTOP above 1024px', () => {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1440,
    });

    try {
      expect(getCurrentBreakpoint()).toBe('DESKTOP');
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        configurable: true,
        value: originalInnerWidth,
      });
    }
  });
});

describe('getPlayButtonUVBounds()', () => {
  it('returns an object with xMin, xMax, yMin, yMax', () => {
    const bounds = getPlayButtonUVBounds();

    expect(bounds).toHaveProperty('xMin');
    expect(bounds).toHaveProperty('xMax');
    expect(bounds).toHaveProperty('yMin');
    expect(bounds).toHaveProperty('yMax');
  });

  it('x range is strictly inside [0, 1]', () => {
    const { xMin, xMax } = getPlayButtonUVBounds();

    expect(xMin).toBeGreaterThanOrEqual(0);
    expect(xMax).toBeLessThanOrEqual(1);
    expect(xMin).toBeLessThan(xMax);
  });

  it('y range is strictly inside [0, 1]', () => {
    const { yMin, yMax } = getPlayButtonUVBounds();

    expect(yMin).toBeGreaterThanOrEqual(0);
    expect(yMax).toBeLessThanOrEqual(1);
    expect(yMin).toBeLessThan(yMax);
  });

  it('yMax is derived from PANEL_Y_RATIO and PANEL_HEIGHT_RATIO (layout sync check)', () => {
    const { yMin, yMax } = getPlayButtonUVBounds();
    const btnCenterUVy = 1 - (
      CRT_LOADER_CONFIG.PANEL_Y_RATIO +
      CRT_LOADER_CONFIG.PANEL_HEIGHT_RATIO +
      0.022 + // PLAY_BUTTON_GAP_RATIO
      0.07    // PLAY_BUTTON_LABEL_HEIGHT_RATIO
    );
    const UV_Y_TOLERANCE = 0.09;

    expect(yMin).toBeCloseTo(btnCenterUVy - UV_Y_TOLERANCE, 5);
    expect(yMax).toBeCloseTo(btnCenterUVy + UV_Y_TOLERANCE, 5);
  });

  it('returns identical values on successive calls (pure function)', () => {
    const a = getPlayButtonUVBounds();
    const b = getPlayButtonUVBounds();

    expect(a).toEqual(b);
  });
});

describe('playButtonPulsing constants', () => {
  it('PLAY_BUTTON_PULSE_BASE is in (0, 1)', () => {
    expect(PLAY_BUTTON_PULSE_BASE).toBeGreaterThan(0);
    expect(PLAY_BUTTON_PULSE_BASE).toBeLessThan(1);
  });

  it('PLAY_BUTTON_PULSE_AMP is positive and non-zero', () => {
    expect(PLAY_BUTTON_PULSE_AMP).toBeGreaterThan(0);
  });

  it('pulse opacity stays within (0, 1] at all phases', () => {
    // opacity = PULSE_BASE + PULSE_AMP * sin(t / PERIOD)
    // min value = PULSE_BASE - PULSE_AMP, max value = PULSE_BASE + PULSE_AMP
    const minOpacity = PLAY_BUTTON_PULSE_BASE - PLAY_BUTTON_PULSE_AMP;
    const maxOpacity = PLAY_BUTTON_PULSE_BASE + PLAY_BUTTON_PULSE_AMP;

    expect(minOpacity).toBeGreaterThan(0);
    expect(maxOpacity).toBeLessThanOrEqual(1);
  });

  it('PLAY_BUTTON_PULSE_PERIOD_MS is a positive number in ms', () => {
    expect(PLAY_BUTTON_PULSE_PERIOD_MS).toBeGreaterThan(0);
    expect(Number.isFinite(PLAY_BUTTON_PULSE_PERIOD_MS)).toBe(true);
  });

  it('pulse formula produces values in expected range across a full cycle', () => {
    const results: number[] = [];

    for (let i = 0; i < 100; i++) {
      const t = (i / 100) * PLAY_BUTTON_PULSE_PERIOD_MS * 2 * Math.PI;
      const pulse = PLAY_BUTTON_PULSE_BASE + PLAY_BUTTON_PULSE_AMP * Math.sin(t / PLAY_BUTTON_PULSE_PERIOD_MS);
      results.push(pulse);
    }

    const min = Math.min(...results);
    const max = Math.max(...results);

    expect(min).toBeGreaterThan(0);
    expect(max).toBeLessThanOrEqual(1);
    // The range should be visible (not flat)
    expect(max - min).toBeGreaterThan(0.1);
  });
});

describe('isPlayButtonPulsing', () => {
  it('returns false while the bar is still filling (progress < 1)', () => {
    expect(isPlayButtonPulsing(0)).toBe(false);
    expect(isPlayButtonPulsing(0.5)).toBe(false);
    expect(isPlayButtonPulsing(0.999)).toBe(false);
  });

  it('returns true at exactly progress = 1 (bar complete, PLAY not yet clicked)', () => {
    expect(isPlayButtonPulsing(1)).toBe(true);
  });

  it('returns false during the crossfade transition (progress > 1)', () => {
    expect(isPlayButtonPulsing(1.0001)).toBe(false);
    expect(isPlayButtonPulsing(1.5)).toBe(false);
    expect(isPlayButtonPulsing(2)).toBe(false);
  });

  it('returns false for negative values (guards against underflow)', () => {
    expect(isPlayButtonPulsing(-1)).toBe(false);
  });

  it('clamps negative input: progress = -0 is treated as 0', () => {
    expect(isPlayButtonPulsing(-0)).toBe(false);
  });
});
