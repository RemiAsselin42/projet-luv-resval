import { describe, expect, it } from 'vitest';
import {
  CRT_MENU_CONFIG,
  getCrtMenuStartY,
  getResponsiveTextScale,
  getCurrentBreakpoint,
} from './crtConfig';

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
  it('uses baseline scale on 1080p desktop', () => {
    const originalInnerHeight = window.innerHeight;
    const originalDpr = window.devicePixelRatio;

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 1080,
    });
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: 1,
    });

    try {
      expect(getResponsiveTextScale()).toBeCloseTo(1, 6);
    } finally {
      Object.defineProperty(window, 'innerHeight', {
        configurable: true,
        value: originalInnerHeight,
      });
      Object.defineProperty(window, 'devicePixelRatio', {
        configurable: true,
        value: originalDpr,
      });
    }
  });

  it('clamps aggressively on mobile viewport', () => {
    const originalInnerHeight = window.innerHeight;
    const originalDpr = window.devicePixelRatio;

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 430,
    });
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: 4,
    });

    try {
      expect(getResponsiveTextScale()).toBe(1.4);
    } finally {
      Object.defineProperty(window, 'innerHeight', {
        configurable: true,
        value: originalInnerHeight,
      });
      Object.defineProperty(window, 'devicePixelRatio', {
        configurable: true,
        value: originalDpr,
      });
    }
  });

  it('clamps desktop scale upper bound', () => {
    const originalInnerHeight = window.innerHeight;
    const originalDpr = window.devicePixelRatio;

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 4000,
    });
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: 2,
    });

    try {
      expect(getResponsiveTextScale()).toBe(2.5);
    } finally {
      Object.defineProperty(window, 'innerHeight', {
        configurable: true,
        value: originalInnerHeight,
      });
      Object.defineProperty(window, 'devicePixelRatio', {
        configurable: true,
        value: originalDpr,
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
