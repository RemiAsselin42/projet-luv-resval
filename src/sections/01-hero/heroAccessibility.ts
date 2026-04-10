// Crée des boutons HTML invisibles correspondant aux items du menu CRT.
// Le menu est visuellement rendu sur canvas (dans l'écran CRT), mais pour
// l'accessibilité (lecteurs d'écran, navigation clavier), de vrais boutons HTML
// sont superposés aux mêmes positions pour permettre la navigation.

import { CRT_MENU_CONFIG } from '../../crt/crtConfig';

export interface AccessibilityMenu {
  container: HTMLElement;
  buttons: HTMLButtonElement[];
  updateVisibility: (menuOpacity: number, isAtMenu: boolean) => void;
  dispose: () => void;
}

export const createAccessibilityMenu = (
  onItemClick: (index: number) => void,
  onHoverChange: (index: number) => void,
): AccessibilityMenu => {
  const container = document.createElement('nav');
  container.setAttribute('aria-label', 'Menu de navigation CRT');
  container.className = 'crt-menu-accessibility';

  Object.assign(container.style, {
    position: 'fixed',
    top: '50%',
    left: '8%',
    transform: 'translateY(-50%)',
    zIndex: '10',
    pointerEvents: 'none',
    display: 'none',
    flexDirection: 'column',
    gap: '0',
  });

  const buttons: HTMLButtonElement[] = [];

  for (const [index, item] of CRT_MENU_CONFIG.ITEMS.entries()) {
    const button = document.createElement('button');
    button.textContent = item;
    button.className = 'crt-menu-button';
    button.setAttribute('aria-label', `Naviguer vers ${item}`);

    Object.assign(button.style, {
      opacity: '0',
      background: 'transparent',
      border: 'none',
      color: 'transparent',
      padding: '0.5em 1em',
      cursor: 'pointer',
      fontSize: '1.2em',
      textAlign: 'left',
      pointerEvents: 'none',
      outline: 'none',
      transition: 'all 0.2s ease',
    });

    button.tabIndex = -1;

    button.addEventListener('focus', () => {
      onHoverChange(index);
      button.style.outline = '0px solid rgba(255, 255, 255, 0.8)';
      button.style.outlineOffset = '4px';
      button.style.color = 'rgba(255, 255, 255, 0.9)';
    });

    button.addEventListener('blur', () => {
      onHoverChange(-1);
      button.style.outline = 'none';
      button.style.color = 'transparent';
    });

    button.addEventListener('click', () => onItemClick(index));

    buttons.push(button);
    container.appendChild(button);
  }

  document.body.appendChild(container);

  return {
    container,
    buttons,
    updateVisibility: (menuOpacity: number, isAtMenu: boolean) => {
      if (menuOpacity > 0.3 && isAtMenu) {
        container.style.display = 'flex';
        container.style.opacity = String(menuOpacity);
        buttons.forEach((btn) => {
          btn.style.pointerEvents = 'auto';
          btn.tabIndex = 0;
        });
      } else {
        container.style.display = 'none';
        buttons.forEach((btn) => {
          btn.style.pointerEvents = 'none';
          btn.tabIndex = -1;
          if (document.activeElement === btn) btn.blur();
        });
      }
    },
    dispose: () => {
      if (container.parentNode) container.parentNode.removeChild(container);
    },
  };
};
