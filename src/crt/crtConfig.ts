// Constantes de configuration de l'écran CRT.
// Regroupe toutes les valeurs utilisées pour positionner et dimensionner
// les éléments de l'interface : menu, barre de chargement, titre, bouton PLAY,
// breakpoints responsives et taille du plan 3D.

import { crtMenuItems } from '../sections/definitions';

/**
 * Hauteur de viewport de référence pour le timing hero/menu piloté par le scroll.
 *
 * Note : cette constante ne pilote plus l'échelle de texte CRT.
 * L'échelle du texte est désormais basée sur la largeur via getResponsiveTextScale()
 * afin de conserver un rendu stable entre les résolutions HD et WQHD.
 *
 * @example
 * // Animation du titre (vitesse constante sur tous les écrans)
 * const heroProgress = scrollY / BASELINE_VIEWPORT_HEIGHT; // 0–1 pendant le scroll
 */
export const BASELINE_VIEWPORT_HEIGHT = 1080;

const TEXT_SCALE_MOBILE = 0.9;
const TEXT_SCALE_TABLET_SM = 0.95;
const TEXT_SCALE_DEFAULT = 1;

/**
 * Mise à l'échelle responsive du texte pour le contenu CRT.
 *
 * Objectif : conserver une taille visuelle homogène entre les résolutions desktop
 * (ex. 1080p vs 1440p) afin que la mise en page ne dérive pas selon la hauteur de l'écran.
 *
 * On évite intentionnellement le scaling basé sur la hauteur ; seules de petites
 * réductions explicites sont appliquées sur les viewports étroits pour la lisibilité.
 *
 * @returns Facteur d'échelle du texte calculé (1.0 sur desktop/tablette)
 */
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
 * Points de rupture responsive pour les ajustements CRT.
 * Utilisés pour exposer différentes tailles de police et configurations selon la taille de l'écran.
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
 * Retourne la catégorie de breakpoint courante selon la largeur du viewport.
 *
 * @returns Clé du breakpoint actif parmi RESPONSIVE_BREAKPOINTS
 */
export const getCurrentBreakpoint = (): keyof typeof RESPONSIVE_BREAKPOINTS => {
  const width = window.innerWidth;
  if (width <= RESPONSIVE_BREAKPOINTS.MOBILE) return 'MOBILE';
  if (width <= RESPONSIVE_BREAKPOINTS.TABLET_SM) return 'TABLET_SM';
  if (width <= RESPONSIVE_BREAKPOINTS.TABLET_MD) return 'TABLET_MD';
  return 'DESKTOP';
};

/**
 * Constantes de configuration de la mise en page de l'interface écran CRT.
 * Centralisées pour éviter la duplication entre hero.ts et crtShader.ts.
 */

export const CRT_MENU_CONFIG = {
  /**
   * Base height (world units) of the CRT plane mesh.
   * Centralised here so hero.ts and any future consumer share the same value.
   * CRT aspect 16:9 → planeWidth = PLANE_HEIGHT × (16/9) ≈ 6.222
   */
  PLANE_HEIGHT: 3.5,
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

/**
 * Calcule la position Y de départ du menu CRT selon l'opacité de l'animation de reveal.
 *
 * Combine la position de base Y_START avec un décalage vers le bas proportionnel à
 * (1 - opacité) pour créer un effet de glissement vers le haut lors de l'apparition.
 *
 * @param menuOpacity - Opacité courante du menu (0 = masqué en bas, 1 = position finale)
 * @returns Position Y de départ du menu en espace canvas (0–1)
 */
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
 * Constantes d'animation de pulsation du bouton PLAY.
 * opacity = PLAY_BUTTON_PULSE_BASE + PLAY_BUTTON_PULSE_AMP * sin(t / PLAY_BUTTON_PULSE_PERIOD_MS)
 * Plage : [BASE - AMP, BASE + AMP] — doit rester dans (0, 1].
 */
/** Base opacity of the PLAY button pulse (idle state) */
export const PLAY_BUTTON_PULSE_BASE = 0.72;
/** Amplitude of the PLAY button pulse oscillation */
export const PLAY_BUTTON_PULSE_AMP = 0.28;
/** Period of the PLAY button pulse in milliseconds */
export const PLAY_BUTTON_PULSE_PERIOD_MS = 380;

/**
 * Limites UV de la zone de clic du bouton PLAY sur le mesh CRT (espace UV, y=0 en bas).
 *
 * Ces valeurs sont dérivées de la mise en page du panneau de chargement dans crtCanvasTexture.ts :
 *   - Bas du panneau ≈ PANEL_Y_RATIO (0.48) + PANEL_HEIGHT_RATIO (~0.058) + gap (~0.022) = ~0.56
 *   - Hauteur du label bouton ≈ 0.07 (label ~30px / hauteur canvas 576px à 1024×576)
 *   - Centre canvas-Y du bouton ≈ 0.56 + 0.035 ≈ 0.595 → bas du label canvas-Y ≈ 0.63
 *   - Canvas-Y → UV.y : uv.y = 1 - canvas-Y
 *     → Centre UV.y ≈ 0.405, zone ± 0.09 → [0.315, 0.495] élargie à [0.20, 0.38] par tolérance
 *   - Zone horizontale large (texte centré, zone de clic tolérante) : [0.20, 0.80]
 *
 * Si la mise en page du panneau de chargement est modifiée (PANEL_Y_RATIO, PANEL_HEIGHT_RATIO,
 * gap, taille de police), mettre à jour les constantes ci-dessous et les tests associés dans
 * crtConfig.test.ts.
 *
 * @returns Objet avec les bornes UV { xMin, xMax, yMin, yMax } en espace UV (y=0 en bas).
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
