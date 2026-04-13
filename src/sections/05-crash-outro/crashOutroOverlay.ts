// Boutons HTML accessibles de l'écran d'erreur 403 (fin de la section Crash Outro).
// Les boutons [RESTART] et [SEE MORE] sont des éléments HTML vrais superposés
// au canvas CRT, positionnés mathématiquement pour correspondre exactement
// à leur rendu visuel (en tenant compte de la déformation de l'écran bombé).

import type { ScrollManager } from '../../core/scrollManager';
import type { BtnLayout } from './crashOutro403Canvas';
import { SECTION_IDS } from '../definitions';

const YOUTUBE_URL = 'https://youtu.be/G02QEhmleYA';

// Synchronisé avec crtShaders.ts : barrelDistortion(vUv, 0.8)
const BARREL_STRENGTH = 0.8;

/**
 * Inverse de la distorsion en barillet du shader CRT.
 * Convertit des ratios canvas (0–1) en ratios viewport pour le positionnement CSS.
 *
 * La distorsion forward est : c_out = c_in · (1 + r² · strength)
 * où r² = c_x² + c_y² et c = coordonnée centrée sur 0.5.
 * La direction est préservée → k = c_x/c_y constant → on résout en 1D (Newton-Raphson).
 * Convergence garantie en < 5 itérations.
 */
const invBarrelRatio = (canvasYRatio: number, canvasXRatio: number): { x: number; y: number } => {
  const cy_c = canvasYRatio - 0.5;
  if (cy_c === 0) return { x: canvasXRatio, y: 0.5 };
  const cx_c = canvasXRatio - 0.5;
  const k = cx_c / cy_c;
  const factor = (k * k + 1) * BARREL_STRENGTH;
  // Résout : cy + factor·cy³ = cy_c
  let cy = cy_c;
  for (let i = 0; i < 10; i++) {
    const f = cy + factor * cy * cy * cy - cy_c;
    const df = 1 + 3 * factor * cy * cy;
    cy -= f / df;
  }
  return { x: k * cy + 0.5, y: cy + 0.5 };
};

export interface CrashOutroOverlay {
  show: () => void;
  hide: () => void;
  dispose: () => void;
}

/**
 * Crée les boutons [RESTART] et [SEE MORE] comme éléments HTML accessibles
 * positionnés derrière le canvas Three.js (z-index inférieur).
 * L'apparence visuelle est rendue sur le canvas 403 (crashOutro403Canvas.ts).
 *
 * btnLayout  : source unique de vérité pour les positions (issues du canvas).
 * onHoverChange : met à jour le canvas quand la souris survole un bouton.
 */
export const createCrashOutroOverlay = (
  scrollManager: ScrollManager,
  onHoverChange: (which: 'restart' | 'see-more' | null) => void,
  btnLayout: BtnLayout,
  onRestart?: () => void,
): CrashOutroOverlay => {
  const container = document.createElement('div');
  container.className = 'crash-outro-overlay';

  // Chaque bouton est positionné individuellement en fixed pour correspondre
  // exactement à son homologue dessiné sur le canvas CRT.
  const positionBtn = (btn: HTMLButtonElement, xRatio: number) => {
    const vp = invBarrelRatio(btnLayout.yRatio, xRatio);
    btn.style.position = 'fixed';
    btn.style.bottom = `${(1 - vp.y) * 100}%`;
    if (btnLayout.centered) {
      btn.style.left = `${vp.x * 100}%`;
      btn.style.transform = 'translateX(-50%)';
    } else {
      btn.style.left = `${vp.x * 100}%`;
    }
  };

  const makeBtn = (
    label: string,
    xRatio: number,
    hoverKey: 'restart' | 'see-more',
    onClick: () => void,
  ): HTMLButtonElement => {
    const btn = document.createElement('button');
    btn.className = 'crash-outro-overlay__btn';
    btn.textContent = label;
    btn.tabIndex = -1;
    positionBtn(btn, xRatio);
    btn.addEventListener('click', onClick);
    btn.addEventListener('mouseenter', () => onHoverChange(hoverKey));
    btn.addEventListener('mouseleave', () => onHoverChange(null));
    btn.addEventListener('focus', () => {
      onHoverChange(hoverKey);
      btn.style.outline = '0px solid rgba(255, 255, 255, 0.8)';
      btn.style.outlineOffset = '4px';
    });
    btn.addEventListener('blur', () => {
      onHoverChange(null);
      btn.style.outline = 'none';
    });
    return btn;
  };

  const restartBtn = makeBtn('[RESTART]', btnLayout.restartXRatio, 'restart', () => {
    hide();
    onRestart?.();
    scrollManager.start(); // Déverrouille le scroll avant de naviguer
    scrollManager.scrollToSection(SECTION_IDS.HERO);
  });

  const seeMoreBtn = makeBtn('[SEE MORE]', btnLayout.seeMoreXRatio, 'see-more', () => {
    window.open(YOUTUBE_URL, '_blank', 'noopener,noreferrer');
  });

  const show = () => {
    container.classList.add('is-visible');
    restartBtn.tabIndex = 0;
    seeMoreBtn.tabIndex = 0;
  };

  const hide = () => {
    container.classList.remove('is-visible');
    restartBtn.tabIndex = -1;
    seeMoreBtn.tabIndex = -1;
  };

  container.appendChild(restartBtn);
  container.appendChild(seeMoreBtn);
  document.body.appendChild(container);

  const dispose = () => {
    container.remove();
  };

  return { show, hide, dispose };
};
