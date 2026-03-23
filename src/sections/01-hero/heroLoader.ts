import gsap from 'gsap';

// ── Constantes du loader (réexportées par hero.ts pour la compatibilité des tests) ──

export const LOADER_TOTAL_DURATION_SECONDS = 3.8;
/**
 * Durée de maintien avant que la barre atteigne 100 % (phase d'attente intentionnelle).
 * Non utilisée directement dans le calcul de progression — la courbe multi-segment de
 * computeLoadingProgress() intègre déjà ce délai implicitement.
 * @deprecated Conserver pour référence de conception ; supprimer si la courbe est refactorisée.
 */
export const LOADER_HOLD_SECONDS = 2.0;
/** Durée du fondu croisé entre l'écran de chargement et le contenu héro. */
export const LOADER_TRANSITION_SECONDS = 0.6;

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;
const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;
const easeOutQuad = (t: number): number => 1 - (1 - t) * (1 - t);
const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
const easeOutExpo = (t: number): number => (t === 1 ? 1 : 1 - 2 ** (-10 * t));

export const computeLoadingProgress = (elapsedSeconds: number): number => {
  const t = Math.max(elapsedSeconds, 0);

  if (t >= LOADER_TOTAL_DURATION_SECONDS) {
    return 1;
  }

  if (t < 0.6) {
    const localT = t / 0.6;
    return 0.18 * easeOutCubic(localT);
  }

  if (t < 1.45) {
    const localT = (t - 0.6) / 0.85;
    return 0.18 + (0.47 - 0.18) * easeInOutSine(localT);
  }

  if (t < 2.3) {
    const localT = (t - 1.45) / 0.85;
    return 0.47 + (0.76 - 0.47) * easeOutQuad(localT);
  }

  if (t < 3.05) {
    const localT = (t - 2.3) / 0.75;
    return 0.76 + (0.93 - 0.76) * easeInOutQuad(localT);
  }

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

  const isBarComplete = (): boolean =>
    getElapsed() >= LOADER_TOTAL_DURATION_SECONDS;

  return {
    getLoadingProgress: () => {
      const elapsed = getElapsed();
      const barProgress = computeLoadingProgress(elapsed);

      if (elapsed < LOADER_TOTAL_DURATION_SECONDS) {
        return barProgress;
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
