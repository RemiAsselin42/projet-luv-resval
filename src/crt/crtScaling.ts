// Calcule la mise à l'échelle du mesh CRT selon la taille de l'écran.
// Sur grand écran (16:9 et plus large), le CRT occupe toute la hauteur du viewport.
// Sur écran plus étroit (mobile, tablette), il réduit pour rester entièrement visible.

// ── Constantes de scaling CRT ──────────────────────────────────────────────────

/** Seuil de largeur viewport (px) séparant desktop et mobile pour le calcul du CRT scale. */
export const VIEWPORT_DESKTOP_BREAKPOINT_PX = 1366;
/** Ratio d'aspect minimum pour vérouiller la hauteur sur desktop (16:10, MacBook, ultrawide). */
export const HEIGHT_LOCK_ASPECT_DESKTOP = 1.6;
/** Ratio d'aspect minimum pour vérouiller la hauteur sur mobile/tablet. */
export const HEIGHT_LOCK_ASPECT_MOBILE = 1.2;
/** Epsilon de sécurité pour éviter la division par zéro. */
export const SAFE_MIN_VALUE = 0.0001;

/**
 * Compute CRT mesh scale to fit the viewport responsively.
 *
 * Strategy: Lock to viewport height on widescreen displays (≥16:9 aspect ratio).
 * On narrower screens (tablets, older monitors), scale down to "contain" fit
 * to avoid cutting off left/right content.
 *
 * The aspect ratio breakpoint is dynamically computed from viewport width:
 * - Desktop (>=1366px): Use 1.6 (accommodates 16:10, MacBook, common ultrawide monitors)
 * - Mobile/Tablet (<1366px): Use 1.2 (responsive to portrait/landscape transitions)
 *
 * This ensures:
 * 1. CRT height is stable (no vertical black bars)
 * 2. CRT width scales naturally with viewport
 * 3. Menu and content remain accessible on all aspect ratios
 *
 * @example
 * - 1920×1080 (16:9): heightLockedScale
 * - 1440×900 (16:10): min(heightLockedScale, containScale) → slight shrink
 * - iPhone 15 (390×844, 9:19.6): strong contain fit → CRT much smaller
 *
 * @param visibleHeight - Visible world-space height from camera FOV
 * @param viewportAspectRatio - window.innerWidth / window.innerHeight
 * @param basePlaneWidth - Base CRT mesh width (constant 6.222)
 * @param basePlaneHeight - Base CRT mesh height (see CRT_PLANE_HEIGHT in crtConfig.ts)
 * @param viewportWidth - Viewport width in pixels (default: window.innerWidth)
 * @returns Scale multiplier for the CRT mesh
 */
export const computeCrtScale = (
  visibleHeight: number,
  viewportAspectRatio: number,
  basePlaneWidth: number,
  basePlaneHeight: number,
  viewportWidth: number = window.innerWidth,
): number => {
  const safeVisibleHeight = Math.max(visibleHeight, SAFE_MIN_VALUE);
  const safeViewportAspect = Math.max(viewportAspectRatio, SAFE_MIN_VALUE);

  const heightLockedScale = safeVisibleHeight / basePlaneHeight;

  const heightLockBreakpoint =
    viewportWidth >= VIEWPORT_DESKTOP_BREAKPOINT_PX
      ? HEIGHT_LOCK_ASPECT_DESKTOP
      : HEIGHT_LOCK_ASPECT_MOBILE;

  if (safeViewportAspect >= heightLockBreakpoint) {
    return heightLockedScale;
  }

  const visibleWidth = safeVisibleHeight * safeViewportAspect;
  const containScale = Math.min(
    heightLockedScale,
    visibleWidth / basePlaneWidth,
  );
  return containScale;
};
