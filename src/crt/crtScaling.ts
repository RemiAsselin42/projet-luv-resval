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
 * Calcule l'échelle du mesh CRT pour s'adapter au viewport de manière responsive.
 *
 * Stratégie : verrouillage sur la hauteur du viewport pour les écrans larges (ratio ≥ 16:9).
 * Sur les écrans plus étroits (tablettes, anciens moniteurs), réduction en mode "contain"
 * pour éviter de couper le contenu gauche/droit.
 *
 * Le seuil de ratio d'aspect est calculé dynamiquement depuis la largeur du viewport :
 * - Desktop (>=1366px) : 1.6 (couvre 16:10, MacBook, ultrawide courants)
 * - Mobile/Tablette (<1366px) : 1.2 (responsive aux transitions portrait/paysage)
 *
 * Cela garantit :
 * 1. La hauteur CRT est stable (pas de bandes noires verticales)
 * 2. La largeur CRT s'adapte naturellement au viewport
 * 3. Le menu et le contenu restent accessibles à tous les ratios d'aspect
 *
 * @example
 * - 1920×1080 (16:9) : heightLockedScale
 * - 1440×900 (16:10) : min(heightLockedScale, containScale) → légère réduction
 * - iPhone 15 (390×844, 9:19.6) : contain fort → CRT beaucoup plus petit
 *
 * @param visibleHeight - Hauteur visible en espace monde depuis le FOV caméra
 * @param viewportAspectRatio - window.innerWidth / window.innerHeight
 * @param basePlaneWidth - Largeur de base du mesh CRT (constante 6.222)
 * @param basePlaneHeight - Hauteur de base du mesh CRT (voir CRT_PLANE_HEIGHT dans crtConfig.ts)
 * @param viewportWidth - Largeur du viewport en pixels (défaut : window.innerWidth)
 * @returns Multiplicateur d'échelle pour le mesh CRT
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
