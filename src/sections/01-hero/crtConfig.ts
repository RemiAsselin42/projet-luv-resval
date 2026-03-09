/**
 * Configuration constants for the CRT screen UI layout.
 * Centralized to avoid duplication between hero.ts and crtShader.ts.
 */

export const CRT_MENU_CONFIG = {
  /** Vertical position where the menu starts (0-1, canvas space) */
  Y_START: 0.15,
  /** Height of each menu line (0-1, canvas space) */
  LINE_HEIGHT: 0.075,
  /** Number of menu items */
  MENU_COUNT: 7,
  /** Font size relative to canvas width (0-1) */
  FONT_SIZE_RATIO: 0.028,
  /** Menu items */
  ITEMS: [
    'HERO',
    'FACE VADER',
    'OBJETS',
    'BIG BROTHER',
    'BEATMAKER',
    'CRAWL',
    'GRUNT',
  ] as const,
} as const;

export const CRT_TITLE_CONFIG = {
  /** Title text to display */
  TEXT: 'LUV RESVAL',
  /** Font weight for the title */
  FONT_WEIGHT: '800',
  /** Font family for the title */
  FONT_FAMILY:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
} as const;
