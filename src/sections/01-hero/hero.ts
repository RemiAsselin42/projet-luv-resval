import type { SectionInitializer } from '../types';
import { applyCrtModelPreview } from '../../crt/crtModelPreview';
import { clamp01 } from '../../utils/math';
import { BASELINE_VIEWPORT_HEIGHT } from '../../crt/crtConfig';
import { hasWebGLSupport } from '../../core/gpuCapabilities';
import initHeroFallback from './heroFallback';
import {
  getSectionSelector,
  SECTION_IDS,
  crtMenuSectionIds,
} from '../definitions';
import type { MenuPreview3D } from '../../components/3d/menuPreview3D';
import { createAccessibilityMenu } from './heroAccessibility';
import { createHeroRaycaster } from './heroRaycaster';
import { createHeroScrollTimelines } from './heroTimelines';

// Réexports pour la compatibilité des tests existants (hero.test.ts)
export {
  computeLoadingProgress,
  createLoadingController,
  LOADER_TOTAL_DURATION_SECONDS,
  LOADER_TRANSITION_SECONDS,
} from './heroLoader';
export type { LoadingController } from './heroLoader';

// Réexport de computeCrtScale depuis le module partagé (compatibilité hero.test.ts)
export { computeCrtScale } from '../../crt/crtScaling';

// ── Type guard pour context.extras ────────────────────────────────────────────

/** Extras typés transmis par le loading screen à la section hero. */
interface HeroExtras {
  menuPreview: MenuPreview3D;
}

const isHeroExtras = (extras: unknown): extras is HeroExtras =>
  typeof extras === 'object' && extras !== null &&
  'menuPreview' in extras &&
  typeof (extras as Record<string, unknown>).menuPreview === 'object' &&
  (extras as Record<string, unknown>).menuPreview !== null &&
  'getTexture' in ((extras as Record<string, unknown>).menuPreview as object) &&
  'preloadAll' in ((extras as Record<string, unknown>).menuPreview as object);

// ── Section initializer ────────────────────────────────────────────────────────

export const initHeroSection: SectionInitializer = async (context) => {
  // Fallback for browsers without WebGL support
  if (!hasWebGLSupport()) {
    console.warn('WebGL not supported, using HTML fallback for hero section');
    const fallbackResult = initHeroFallback(context);
    return fallbackResult instanceof Promise
      ? await fallbackResult
      : fallbackResult;
  }

  const { camera, renderer, crtManager } = context;

  // ── Récupération du menuPreview pré-créé par le loading screen ────────────
  if (!isHeroExtras(context.extras)) {
    throw new Error('[hero] menuPreview est requis dans context.extras (initialisé par loadingScreen)');
  }

  const { menuPreview } = context.extras;

  // ── Parallax TV ──────────────────────────────────────────────────────────
  const heroElement = document.querySelector(
    getSectionSelector(SECTION_IDS.HERO),
  );
  const menuElement = document.querySelector(
    getSectionSelector(SECTION_IDS.MENU),
  );

  const { heroTimeline } = createHeroScrollTimelines(
    heroElement,
    menuElement,
    crtManager,
  );

  // ── Détection hover menu via raycaster ─────────────────────
  const heroRaycaster = createHeroRaycaster(
    camera,
    renderer,
    crtManager.mesh,
    menuElement,
  );
  let hoverMenuIndex = -1;
  let currentMenuOpacity = 0;

  // ── Élément invisible focusable pour la section hero ────
  const heroFocusElement = document.createElement('button');
  heroFocusElement.setAttribute('aria-label', 'Section Hero - Luv Resval');
  heroFocusElement.className = 'hero-focus-anchor';
  heroFocusElement.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
    overflow: hidden;
  `;

  if (heroElement) heroElement.appendChild(heroFocusElement);

  // ── Boutons accessibles pour le menu ────────────────────────
  const accessibilityMenu = createAccessibilityMenu(
    (index) => {
      const targetSectionId = crtMenuSectionIds[index];
      if (targetSectionId)
        context.scrollManager.scrollToSection(targetSectionId);
    },
    (index) => {
      hoverMenuIndex = index;
    },
  );

  // ── Interactions post-loading ──────────────────────────────────────────────

  const onMouseMove = (event: MouseEvent): void => {
    if (!heroRaycaster.isAtMenuSection()) {
      hoverMenuIndex = -1;
      return;
    }
    try {
      const prevHoverMenuIndex = hoverMenuIndex;
      hoverMenuIndex = heroRaycaster.getHoverMenuIndexFromPointer(
        event.clientX,
        event.clientY,
        currentMenuOpacity,
      );
      if (hoverMenuIndex !== prevHoverMenuIndex && hoverMenuIndex >= 0) {
        context.audioManager.playUiFx();
      }
    } catch (error) {
      console.warn('Raycasting hover detection failed:', error);
      hoverMenuIndex = -1;
    }
  };

  const onClick = (event: MouseEvent): void => {
    if (!heroRaycaster.isClickOnCrt(event.clientX, event.clientY)) return;

    if (heroRaycaster.isAtMenuSection()) {
      // Dans la section menu : naviguer vers l'item cliqué
      hoverMenuIndex = heroRaycaster.getHoverMenuIndexFromPointer(
        event.clientX,
        event.clientY,
        currentMenuOpacity,
      );
      if (hoverMenuIndex >= 0 && hoverMenuIndex < crtMenuSectionIds.length) {
        const targetSectionId = crtMenuSectionIds[hoverMenuIndex];
        if (targetSectionId)
          context.scrollManager.scrollToSection(targetSectionId);
      }
      return;
    }

    // On est passé après le menu (sections 1/2/3, Outro) → ignorer le clic
    if (menuElement instanceof HTMLElement && menuElement.getBoundingClientRect().bottom <= 0) {
      return;
    }

    // Dans la section hero : tout clic sur la TV scroll vers le menu.
    context.scrollManager.scrollToSection(SECTION_IDS.MENU, BASELINE_VIEWPORT_HEIGHT);
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('click', onClick);

  return {
    update: (_deltaSeconds: number, _elapsedSeconds: number) => {
      // crtManager.update() est appelé centralement dans main.ts — ne pas le rappeler ici.
      const scrollY = context.scrollManager.getScrollY();

      const heroProgress = clamp01(scrollY / BASELINE_VIEWPORT_HEIGHT);
      const menuOpacity = clamp01(
        (scrollY / BASELINE_VIEWPORT_HEIGHT - 0.5) / 0.5,
      );
      currentMenuOpacity = menuOpacity;

      // loadingProgress = 2 : transition loading complète, vue héro active
      crtManager.setUiProgress(heroProgress, menuOpacity, hoverMenuIndex, 2, false);

      menuPreview.setHoveredIndex(heroRaycaster.isAtMenuSection() ? hoverMenuIndex : -1);
      menuPreview.update(_deltaSeconds);
      menuPreview.renderPreview();
      applyCrtModelPreview(crtManager, {
        texture: menuPreview.getTexture(),
        opacity: menuPreview.getOpacity(),
        texelSize: menuPreview.getTexelSize(),
      });

      accessibilityMenu.updateVisibility(menuOpacity, heroRaycaster.isAtMenuSection());
    },
    dispose: () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClick);
      heroTimeline?.kill();
      accessibilityMenu.dispose();

      if (heroFocusElement.parentNode) {
        heroFocusElement.parentNode.removeChild(heroFocusElement);
      }

      menuPreview.dispose();
      // Note : le CRT mesh n'est PAS disposé ici — il est global et géré par main.ts
    },
  };
};
