// Contrôleur de l'animation de chargement affichée sur l'écran CRT.
// Orchestre : l'animation d'allumage de la TV (power-on), la barre de progression
// qui se remplit sur ~4 secondes, puis l'attente du clic sur le bouton PLAY.
// Un clic n'importe où accélère la barre ; seul le clic sur PLAY déclenche la suite.

import gsap from 'gsap';
import { easeOutCubic, easeInOutSine, easeOutQuad, easeInOutQuad, easeOutExpo } from '../../utils/math';

// ── Constantes et contrôleur du loading screen ───────────────────────────────

export const LOADER_TOTAL_DURATION_SECONDS = 3.8;
/** Durée du fondu croisé entre l'écran de chargement et le contenu héro. */
export const LOADER_TRANSITION_SECONDS = 0.6;

/**
 * Calcule la progression visuelle de la barre de chargement (0..1) en fonction
 * du temps écoulé depuis le démarrage du loader.
 *
 * Les paliers sont des valeurs empiriques calées pour simuler un vrai chargement :
 * une montée rapide initiale donne l'impression de réactivité, puis la barre ralentit
 * et s'étire sur les phases intermédiaires — mimant les temps d'attente réseau —
 * avant de sprinter vers 100 % en fin d'animation.
 *
 * Découpage temporel (total : 3.8 s) :
 *
 *  [0 s – 0.6 s]   → 0 %  → 18 %  — palier de démarrage rapide (easeOutCubic) :
 *                              la barre bondit pour signaler l'activité immédiate.
 *
 *  [0.6 s – 1.45 s] → 18 % → 47 %  — progression régulière (easeInOutSine) :
 *                              rythme de croisière, simule le chargement des assets principaux.
 *
 *  [1.45 s – 2.3 s] → 47 % → 76 %  — accélération modérée (easeOutQuad) :
 *                              phase "presque là", la barre semble de plus en plus proche.
 *
 *  [2.3 s – 3.05 s] → 76 % → 93 %  — ralentissement volontaire (easeInOutQuad) :
 *                              la barre "coince" avant la fin, tension visuelle classique.
 *
 *  [3.05 s – 3.8 s] → 93 % → 100 % — sprint final (easeOutExpo) :
 *                              accélération soudaine vers 100 % ; débloque le bouton PLAY.
 *
 * @param elapsedSeconds - Temps écoulé en secondes depuis le début du chargement (≥ 0)
 * @returns Progression de la barre dans [0, 1]
 */
export const computeLoadingProgress = (elapsedSeconds: number): number => {
  const t = Math.max(elapsedSeconds, 0);

  if (t >= LOADER_TOTAL_DURATION_SECONDS) {
    return 1;
  }

  // Phase 1 : démarrage rapide (0 → 18 %)
  if (t < 0.6) {
    const localT = t / 0.6;
    return 0.18 * easeOutCubic(localT);
  }

  // Phase 2 : progression régulière (18 → 47 %)
  if (t < 1.45) {
    const localT = (t - 0.6) / 0.85;
    return 0.18 + (0.47 - 0.18) * easeInOutSine(localT);
  }

  // Phase 3 : accélération modérée (47 → 76 %)
  if (t < 2.3) {
    const localT = (t - 1.45) / 0.85;
    return 0.47 + (0.76 - 0.47) * easeOutQuad(localT);
  }

  // Phase 4 : ralentissement volontaire (76 → 93 %)
  if (t < 3.05) {
    const localT = (t - 2.3) / 0.75;
    return 0.76 + (0.93 - 0.76) * easeInOutQuad(localT);
  }

  // Phase 5 : sprint final vers 100 % (93 → 100 %)
  const localT = (t - 3.05) / (LOADER_TOTAL_DURATION_SECONDS - 3.05);
  return 0.93 + (1 - 0.93) * easeOutExpo(localT);
};

// ── Contrôleur de chargement (power-on + skip + transition croisée) ────────────

export interface LoadingController {
  /** Calcule le loadingProgress courant (0..2). Déclenche unlockAfterLoading au moment de la transition. */
  getLoadingProgress: () => number;
  /** Indique si le chargement est toujours en cours. */
  isStillLoading: () => boolean;
  /** Indique si la barre a atteint 100% (bouton PLAY visible). */
  isBarComplete: () => boolean;
  /** Déclenche la transition loader → héro (appelé par le clic sur le bouton PLAY). */
  triggerPlay: () => void;
  /** Nettoie les listeners et débloque le scroll si nécessaire. */
  dispose: () => void;
}

export const createLoadingController = (
  crt: { setPowerOn: (v: number) => void },
  scrollManager: { stop: () => void; start: () => void },
  getExternalProgress?: () => number,
): LoadingController => {
  const powerOnState = { value: 0 };
  // Timestamp déclenché une seule fois quand l'image CRT devient visible (uPowerOn ≥ 0.3).
  let loaderStartTime: number | null = null;

  // isLoading = true pendant toute la phase loader (barre 0→100% + attente PLAY).
  let isLoading = true;
  // Temps virtuel injecté dans le calcul d'elapsed quand l'utilisateur skip la barre.
  let forcedElapsed: number | null = null;
  // Déclenché par triggerPlay() : timestamp du moment où l'utilisateur clique PLAY.
  let playTriggered = false;
  let playTriggeredTime: number | null = null;

  // Bloque le scroll dès maintenant, avant même l'allumage CRT.
  scrollManager.stop();

  // ── Elapsed courant (hors transition) ────────────────────────
  const getElapsed = (): number => {
    if (loaderStartTime === null) return 0;
    if (forcedElapsed !== null) return forcedElapsed;
    return (performance.now() - loaderStartTime) / 1000;
  };

  // ── Skip de l'animation de barre uniquement ──────────────────
  const skipBar = (): void => {
    if (!isLoading || playTriggered) return;
    if (loaderStartTime === null) loaderStartTime = performance.now();
    const currentElapsed = getElapsed();
    if (currentElapsed >= LOADER_TOTAL_DURATION_SECONDS) return;
    const proxy = { e: currentElapsed };
    gsap.to(proxy, {
      e: LOADER_TOTAL_DURATION_SECONDS,
      duration: 0.4,
      ease: 'power2.out',
      onUpdate: () => { forcedElapsed = proxy.e; },
      onComplete: () => { forcedElapsed = LOADER_TOTAL_DURATION_SECONDS; },
    });
  };

  // Pendant l'animation de barre, un clic anywhere accélère la barre.
  // Une fois la barre complète, seul le clic sur le bouton PLAY déclenche la suite.
  const onLoadingClick = (_event: MouseEvent): void => {
    if (!isLoading || playTriggered) return;
    if (getElapsed() < LOADER_TOTAL_DURATION_SECONDS) {
      skipBar();
    }
  };

  window.addEventListener('click', onLoadingClick);

  const unlockAfterLoading = (): void => {
    window.removeEventListener('click', onLoadingClick);
    scrollManager.start();
    isLoading = false;
  };

  // ── Animation power-on CRT ───────────────────────────────────
  gsap.to(powerOnState, {
    value: 1,
    duration: 2.5,
    delay: 0.4,
    ease: 'power2.inOut',
    onUpdate: () => {
      crt.setPowerOn(powerOnState.value);
      if (loaderStartTime === null && powerOnState.value >= 0.3) {
        loaderStartTime = performance.now();
      }
    },
  });

  const isBarComplete = (): boolean => {
    if (getElapsed() < LOADER_TOTAL_DURATION_SECONDS) return false;
    if (getExternalProgress && getExternalProgress() < 1) return false;
    return true;
  };

  return {
    getLoadingProgress: () => {
      const elapsed = getElapsed();
      const animationProgress = computeLoadingProgress(elapsed);

      if (!isBarComplete()) {
        // Cas nominal : realProgress = 1 avant 3.8s → cap = 1 → comportement identique à l'actuel.
        // Filet de sécurité : si connexion très lente, cap à 0.99 jusqu'à la fin du chargement.
        const realProgress = getExternalProgress ? getExternalProgress() : 1;
        const cap = realProgress < 1 ? 0.99 : 1;
        return Math.min(animationProgress, cap);
      }

      // Barre complète : on attend le clic sur le bouton PLAY
      if (!playTriggered || playTriggeredTime === null) {
        return 1;
      }

      // PLAY cliqué : fondu croisé loader → héro sur LOADER_TRANSITION_SECONDS
      if (isLoading) unlockAfterLoading();
      const transitionElapsed = (performance.now() - playTriggeredTime) / 1000;
      return 1 + Math.min(transitionElapsed / LOADER_TRANSITION_SECONDS, 1);
    },

    isStillLoading: () => isLoading,

    isBarComplete,

    triggerPlay: () => {
      if (!isLoading || playTriggered) return;
      playTriggered = true;
      playTriggeredTime = performance.now();
    },

    dispose: () => {
      window.removeEventListener('click', onLoadingClick);
      if (isLoading) {
        scrollManager.start();
        isLoading = false;
      }
    },
  };
};
