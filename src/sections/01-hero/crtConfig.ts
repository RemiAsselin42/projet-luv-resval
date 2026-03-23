import { crtMenuItems } from '../definitions';

/**
 * Baseline viewport height used for scroll-driven hero/menu timing.
 *
 * Note: this constant no longer drives CRT text scale.
 * Text scale is now width-based via getResponsiveTextScale() to keep
 * a stable desktop look between HD and WQHD displays.
 *
 * @example
 * // Title animation (consistent speed on all screens)
 * const heroProgress = scrollY / BASELINE_VIEWPORT_HEIGHT; // 0–1 as user scrolls
 */
export const BASELINE_VIEWPORT_HEIGHT = 1080;

/**
 * Responsive text scaling for CRT content.
 *
 * Goal: keep a consistent visual size across desktop resolutions (e.g. 1080p vs 1440p)
 * so layout does not drift between screens with different pixel heights.
 *
 * We intentionally avoid height-based scaling here and only apply small, explicit
 * reductions on narrow viewports for readability.
 *
 * @returns Computed text scale factor (1.0 on desktop/tablet)
 */
const TEXT_SCALE_MOBILE = 0.9;
const TEXT_SCALE_TABLET_SM = 0.95;
const TEXT_SCALE_DEFAULT = 1;

export const getResponsiveTextScale = (): number => {
  const viewportWidth = Math.max(window.innerWidth, 1);

  if (viewportWidth <= RESPONSIVE_BREAKPOINTS.MOBILE) {
    return TEXT_SCALE_MOBILE;
  }

  if (viewportWidth <= RESPONSIVE_BREAKPOINTS.TABLET_SM) {
    return TEXT_SCALE_TABLET_SM;
  }

  return TEXT_SCALE_DEFAULT;
};

/**
 * Mobile-first media query breakpoints for CRT responsive adjustments.
 * Used to expose different font sizes and configurations based on screen size.
 */
export const RESPONSIVE_BREAKPOINTS = {
  /** Mobile: ≤480px (phones) */
  MOBILE: 480,
  /** Tablet: 481–768px (small tablets, landscape phones) */
  TABLET_SM: 768,
  /** Tablet: 769–1024px (iPad, medium tablets) */
  TABLET_MD: 1024,
  /** Desktop: ≥1025px */
  DESKTOP: 1025,
} as const;

/**
 * Get current breakpoint category based on viewport width.
 */
export const getCurrentBreakpoint = (): keyof typeof RESPONSIVE_BREAKPOINTS => {
  const width = window.innerWidth;
  if (width <= RESPONSIVE_BREAKPOINTS.MOBILE) return 'MOBILE';
  if (width <= RESPONSIVE_BREAKPOINTS.TABLET_SM) return 'TABLET_SM';
  if (width <= RESPONSIVE_BREAKPOINTS.TABLET_MD) return 'TABLET_MD';
  return 'DESKTOP';
};

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
  PANEL_WIDTH_RATIO: 0.504,
  /** Panel height as a ratio of canvas height */
  PANEL_HEIGHT_RATIO: 0.0585,
  /** Minimum panel height in pixels */
  PANEL_HEIGHT_MIN_PX: 54,
  /** Panel vertical position as a ratio of canvas height */
  PANEL_Y_RATIO: 0.48,
} as const;

/**
 * UV bounds of the PLAY button hit zone on the CRT mesh (UV space, y=0 at bottom).
 *
 * These values are derived from the loader panel layout in crtCanvasTexture.ts:
 *   - Panel top  ≈ PANEL_Y_RATIO (0.48) + PANEL_HEIGHT_RATIO (~0.058) + gap (~0.022) = ~0.56
 *   - Button label height ≈ 0.07 (label ~30px / canvas height 576px at 1024×576)
 *   - Button center canvas-Y ≈ 0.56 + 0.035 ≈ 0.595 → label bottom canvas-Y ≈ 0.63
 *   - Canvas-Y → UV.y: uv.y = 1 - canvas-Y
 *     → UV.y center ≈ 0.405, zone ± 0.09 → [0.315, 0.495] padded to [0.20, 0.38] for tolerance
 *   - Horizontal zone is wide (centred text, tolerant hit area): [0.20, 0.80]
 *
 * If the loader panel layout is adjusted (PANEL_Y_RATIO, PANEL_HEIGHT_RATIO, gap, font size),
 * update the constants below and the corresponding tests in crtConfig.test.ts.
 *
 * @returns Object with UV bounds { xMin, xMax, yMin, yMax } in UV space (y=0 at bottom).
 */
export const getPlayButtonUVBounds = (): {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
} => {
  // Approximate canvas-Y of the panel bottom edge (top + height)
  const panelBottomCanvasY =
    CRT_LOADER_CONFIG.PANEL_Y_RATIO + CRT_LOADER_CONFIG.PANEL_HEIGHT_RATIO;
  // Gap between bar bottom and PLAY button text centre (matches PLAY_BUTTON_GAP_RATIO in crtCanvasTexture.ts)
  const PLAY_BUTTON_GAP_RATIO = 0.022;
  // Approximate label height as a ratio of canvas height (30px label / ~576px canvas at 1024-wide)
  const PLAY_BUTTON_LABEL_HEIGHT_RATIO = 0.07;
  // Canvas-Y of the PLAY button text centre
  const btnCenterCanvasY =
    panelBottomCanvasY + PLAY_BUTTON_GAP_RATIO + PLAY_BUTTON_LABEL_HEIGHT_RATIO;
  // Convert canvas-Y → UV.y (UV.y = 1 - canvas-Y, y=0 at bottom in UV space)
  const btnCenterUVy = 1 - btnCenterCanvasY;
  // Vertical tolerance (±) around the button centre
  const UV_Y_TOLERANCE = 0.09;
  // Wide horizontal hit zone (centred text, tolerant)
  const UV_X_MIN = 0.20;
  const UV_X_MAX = 0.80;

  return {
    xMin: UV_X_MIN,
    xMax: UV_X_MAX,
    yMin: btnCenterUVy - UV_Y_TOLERANCE,
    yMax: btnCenterUVy + UV_Y_TOLERANCE,
  };
};

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
  TITLE_FONT_SIZE: 240,
  /** Subtitle font size in pixels */
  SUBTITLE_FONT_SIZE: 50,
  /** Date font size in pixels */
  DATE_FONT_SIZE: 16,
} as const;
