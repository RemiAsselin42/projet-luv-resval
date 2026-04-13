// Fonctions mathématiques utilitaires réutilisées dans tout le projet.
// Inclut : blocage de valeur (clamp), et plusieurs courbes d'accélération/décélération
// (easing) pour les animations.

/**
 * Bloque une valeur entre un minimum et un maximum.
 * @param value La valeur à bloquer
 * @param min Borne minimale
 * @param max Borne maximale
 * @returns La valeur bloquée dans l'intervalle [min, max]
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Bloque une valeur entre 0 et 1.
 * @param value La valeur à bloquer
 * @returns La valeur bloquée dans l'intervalle [0, 1]
 */
export const clamp01 = (value: number): number => {
  return clamp(value, 0, 1);
};

// ── Fonctions d'easing ────────────────────────────────────────────────────────

/** Décélération cubique : rapide au départ, ralentit à l'arrivée. */
export const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

/** Accélération/décélération en cosinus (doux des deux côtés). */
export const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

/** Décélération quadratique. */
export const easeOutQuad = (t: number): number => 1 - (1 - t) * (1 - t);

/** Accélération/décélération quadratique. */
export const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

/** Décélération exponentielle : très rapide au départ, quasi-immobile à l'arrivée. */
export const easeOutExpo = (t: number): number => (t === 1 ? 1 : 1 - 2 ** (-10 * t));
