import { crtMenuItems } from '../definitions';

/**
 * Baseline viewport height (1080p desktop standard) used for all responsive calculations.
 * 
 * This constant ensures consistent animation speeds, text scaling, and responsive behavior
 * across all screen sizes:
 * - Without normalization: 4K displays (2160px) would show animations 2x slower
 * - animation/scroll progress would differ per resolution
 * - text scale would compound viewport differences
 * 
 * All viewport-dependent calculations should normalize by this constant to ensure
 * universal responsive behavior:
 * 
 * @example
 * // Title animation (consistent speed on all screens)
 * const heroProgress = scrollY / BASELINE_VIEWPORT_HEIGHT; // 0–1 as user scrolls
 * 
 * // Text scaling (DPR-aware, relative to 1080p baseline)
 * const textScale = window.innerHeight / BASELINE_VIEWPORT_HEIGHT * window.devicePixelRatio;
 */
export const BASELINE_VIEWPORT_HEIGHT = 1080;

/**
 * Responsive text scaling for CRT content.
 * 
 * Strategy:
 * 1. Scale based on window.innerHeight relative to BASELINE_VIEWPORT_HEIGHT (1080p)
 * 2. Apply device pixel ratio (DPR) to ensure sharp text on Retina/4K displays
 * 3. Clamp to reasonable range to prevent extreme scaling on very large/small screens
 * 4. Apply mobile-specific adjustments for screens < 768px
 * 
 * This function works in tandem with heroProgress normalization to ensure consistent
 * layout: if animations are normalized by 1080p, text scaling should be too.
 * 
 * Example outputs:
 * - 1080p desktop, DPR=1: scale ≈ 1.0
 * - 1440p desktop, DPR=1: scale ≈ 1.33
 * - MacBook Retina (1440p logical, DPR=2): scale ≈ 1.33 × 2 = 2.66 (but clamped)
 * - iPhone 15 (430px, DPR=3): scale ≈ 0.4 × 3 = 1.2 (mobile adjusted)
 * 
 * @returns Computed text scale factor (1.0 = baseline 1080p display)
 */
export const getResponsiveTextScale = (): number => {
  const viewportHeight = Math.max(window.innerHeight, 1);
  const dpr = Math.max(window.devicePixelRatio || 1, 1);
  
  // Base scaling relative to 1080p baseline
  let scale = viewportHeight / BASELINE_VIEWPORT_HEIGHT;
  
  // Apply DPR for sharp text on high-density screens
  // But cap at reasonable max to avoid text being too large
  scale *= dpr;
  
  // Mobile-specific adjustment: reduce max scale on small viewports
  if (viewportHeight < 768) {
    // Mobile: clamp more aggressively to keep text readable
    // On a 430px phone with DPR=3: (430/1080) * 3 = 1.19 → clamp to [0.8, 1.4]
    return Math.max(0.8, Math.min(scale, 1.4));
  }
  
  // Tablet/Desktop: more generous range
  // On a 2560px 4K display with DPR=1: (2560/1080) * 1 = 2.37 → clamp to [0.8, 2.5]
  return Math.max(0.8, Math.min(scale, 2.5));
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
