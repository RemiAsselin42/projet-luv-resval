import { crtMenuItems } from '../definitions';

/**
 * Configuration constants for the CRT screen UI layout.
 * Centralized to avoid duplication between hero.ts and crtShader.ts.
 */

export const CRT_MENU_CONFIG = {
  /** Vertical position where the menu starts (0-1, canvas space) */
  Y_START: 0.5,
  /** Height of each menu line (0-1, canvas space) */
  LINE_HEIGHT: 0.075,
  /** Number of menu items */
  MENU_COUNT: crtMenuItems.length,
  /** Font size relative to canvas width (0-1) */
  FONT_SIZE_RATIO: 0.028,
  /** Menu items */
  ITEMS: crtMenuItems,
  /** Font family for the menu */
  FONT_FAMILY: 'Futura-Medium',
  /** Font weight for the menu */
  FONT_WEIGHT: '500',
  /** Vertical slide distance used by menu reveal animation (0-1, canvas space) */
  SLIDE_DISTANCE: 0.25,
  /** Hover highlight horizontal padding in pixels */
  HIGHLIGHT_PADDING_X: 8,
  /** Hover highlight vertical padding in pixels */
  HIGHLIGHT_PADDING_Y: 4,
  /** Vertical offset applied to menu item text in pixels */
  ITEM_VERTICAL_OFFSET: 2,
} as const;

export const getCrtMenuStartY = (menuOpacity: number): number => {
  const clampedOpacity = Math.min(Math.max(menuOpacity, 0), 1);
  const totalMenuHeight = CRT_MENU_CONFIG.MENU_COUNT * CRT_MENU_CONFIG.LINE_HEIGHT;
  const slideUpOffset = (1 - clampedOpacity) * CRT_MENU_CONFIG.SLIDE_DISTANCE;
  return CRT_MENU_CONFIG.Y_START - totalMenuHeight / 2 + slideUpOffset;
};

export const CRT_LOADER_CONFIG = {
  /** Panel width as a ratio of canvas width */
  PANEL_WIDTH_RATIO: 0.56,
  /** Panel height as a ratio of canvas height */
  PANEL_HEIGHT_RATIO: 0.045,
  /** Minimum panel height in pixels */
  PANEL_HEIGHT_MIN_PX: 40,
  /** Panel vertical position as a ratio of canvas height */
  PANEL_Y_RATIO: 0.53,
  /** Vertical offset of the label above the bar in pixels (before textScale) */
  LABEL_OFFSET_PX: 26,
} as const;

export const CRT_TITLE_CONFIG = {
  /** Title text to display */
  TEXT: 'LUV RESVAL',
  /** Subtitle text to display under title */
  SUBTITLE_TEXT: 'GRUNT #45',
  /** Date text to display under subtitle */
  DATE_TEXT: '30/04/2021',
  /** Font weight for the title */
  FONT_WEIGHT: 'normal',
  /** Font weight for the subtitle */
  SUBTITLE_FONT_WEIGHT: '800',
  /** Font weight for the date */
  DATE_FONT_WEIGHT: '500',
  /** Font family for the title */
  FONT_FAMILY: 'Silvermist-Italic, Silvermist-Regular',
  /** Font family for the subtitle */
  SUBTITLE_FONT_FAMILY: 'Futura-CondensedExtraBold, Futura-Medium',
  /** Font family for the date */
  DATE_FONT_FAMILY: 'Futura-Medium',
  /** Title font size in pixels */
  TITLE_FONT_SIZE: 120,
  /** Subtitle font size in pixels */
  SUBTITLE_FONT_SIZE: 25,
  /** Date font size in pixels */
  DATE_FONT_SIZE: 8,
} as const;
