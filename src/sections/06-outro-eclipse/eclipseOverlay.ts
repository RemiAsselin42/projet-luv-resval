import type { ScrollManager } from '../../core/scrollManager';
import type { BtnLayout } from './eclipse403Canvas';
import { SECTION_IDS } from '../definitions';

const YOUTUBE_URL = 'https://youtu.be/G02QEhmleYA';

export interface EclipseOverlay {
  show: () => void;
  hide: () => void;
  dispose: () => void;
}

/**
 * Crée les boutons [RESTART] et [SEE MORE] comme éléments HTML accessibles
 * positionnés derrière le canvas Three.js (z-index inférieur).
 * L'apparence visuelle est rendue sur le canvas 403 (eclipse403Canvas.ts).
 *
 * btnLayout  : source unique de vérité pour les positions (issues du canvas).
 * onHoverChange : met à jour le canvas quand la souris survole un bouton.
 */
export const createEclipseOverlay = (
  scrollManager: ScrollManager,
  onHoverChange: (which: 'restart' | 'see-more' | null) => void,
  btnLayout: BtnLayout,
  onRestart?: () => void,
): EclipseOverlay => {
  const container = document.createElement('div');
  container.className = 'eclipse-overlay';

  // Chaque bouton est positionné individuellement en fixed pour correspondre
  // exactement à son homologue dessiné sur le canvas CRT.
  const positionBtn = (btn: HTMLButtonElement, xRatio: number) => {
    btn.style.position = 'fixed';
    btn.style.bottom = `${(1 - btnLayout.yRatio) * 100}%`;
    if (btnLayout.centered) {
      btn.style.left = `${xRatio * 100}%`;
      btn.style.transform = 'translateX(-50%)';
    } else {
      btn.style.left = `${xRatio * 100}%`;
    }
  };

  const makeBtn = (
    label: string,
    xRatio: number,
    hoverKey: 'restart' | 'see-more',
    onClick: () => void,
  ): HTMLButtonElement => {
    const btn = document.createElement('button');
    btn.className = 'eclipse-overlay__btn';
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

  // Les boutons sont créés directement avec const pour éviter les réassignations
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
