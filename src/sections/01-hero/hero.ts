import * as THREE from 'three';
import gsap from 'gsap';
import type { SectionInitializer } from '../types';
import { createCrtScreen } from './crtShader';
import { clamp01 } from '../../utils/math';
import { CRT_MENU_CONFIG, getCrtMenuStartY } from './crtConfig';
import { hasWebGLSupport, detectGpuTier, getShaderComplexity } from '../../core/gpuCapabilities';
import initHeroFallback from './heroFallback';
import { getSectionSelector, SECTION_IDS, crtMenuSectionIds } from '../definitions';

const HEIGHT_LOCK_MIN_ASPECT_RATIO = 1.6;

export const computeCrtScale = (
  visibleHeight: number,
  viewportAspectRatio: number,
  basePlaneWidth: number,
  basePlaneHeight: number,
): number => {
  const safeVisibleHeight = Math.max(visibleHeight, 0.0001);
  const safeViewportAspect = Math.max(viewportAspectRatio, 0.0001);

  const heightLockedScale = safeVisibleHeight / basePlaneHeight;

  if (safeViewportAspect >= HEIGHT_LOCK_MIN_ASPECT_RATIO) {
    return heightLockedScale;
  }

  const visibleWidth = safeVisibleHeight * safeViewportAspect;
  const containScale = Math.min(heightLockedScale, visibleWidth / basePlaneWidth);
  return containScale;
};

const initHeroSection: SectionInitializer = async (context) => {
  // Fallback for browsers without WebGL support
  if (!hasWebGLSupport()) {
    console.warn('WebGL not supported, using HTML fallback for hero section');
    const fallbackResult = initHeroFallback(context);
    return fallbackResult instanceof Promise ? await fallbackResult : fallbackResult;
  }

  const { scene, camera, renderer } = context;

  // Detect GPU tier for performance optimization
  const gpuTier = detectGpuTier();
  const shaderSettings = getShaderComplexity(gpuTier);

  if (gpuTier === 'low') {
    // eslint-disable-next-line no-console
    console.debug('Low-tier GPU detected, using simplified CRT effects');
  }

  // ── Écran CRT 3D ──────────────────────────────────────────────
  // Await font loading for crisp text rendering on the CRT screen
  const CRT_ASPECT = 16 / 9;
  const BASE_PLANE_HEIGHT = 3.5;
  const BASE_PLANE_WIDTH = BASE_PLANE_HEIGHT * CRT_ASPECT;

  const crt = await createCrtScreen(CRT_ASPECT, shaderSettings.textureResolution);
  crt.mesh.position.set(0, 0, 0);
  scene.add(crt.mesh);

  // ── Responsive sizing du CRT ───────────────────────────────────────
  // On verrouille la taille apparente sur la hauteur du viewport.
  // Le mode "contain" (min(width,height)) rétrécit le CRT sur des ratios
  // plus étroits que 16:9 (ex: 16:10 sur MacBook), ce qui explique le
  // rendu visuellement plus petit sur certaines résolutions/écrans.
  const fitCrtToViewport = (): void => {
    const fovRad = (camera.fov * Math.PI) / 180;
    // Distance caméra → mesh (camera z=4, mesh initial z=0)
    const distToMesh = camera.position.z;
    const visibleHeight = 2 * distToMesh * Math.tan(fovRad / 2);
    const viewportAspect = window.innerWidth / Math.max(window.innerHeight, 1);
    // Taille stable sur les ratios proches de 16:9, avec fallback contain-fit
    // sur écrans très étroits pour éviter de couper excessivement le menu.
    const scale = computeCrtScale(visibleHeight, viewportAspect, BASE_PLANE_WIDTH, BASE_PLANE_HEIGHT);
    crt.mesh.scale.set(scale, scale, 1);
  };

  fitCrtToViewport();

  // ── Animation d'allumage (power-on) ───────────────────────────
  const powerOnState = { value: 0 };

  gsap.to(powerOnState, {
    value: 1,
    duration: 2.5,
    delay: 0.4,
    ease: 'power2.inOut',
    onUpdate: () => {
      crt.setPowerOn(powerOnState.value);
    },
  });

  // ── Parallax au scroll ────────────────────────────────────────
  // La télévision reste visible pendant hero + menu (2 sections)
  const heroElement = document.querySelector(getSectionSelector(SECTION_IDS.HERO));
  const menuElement = document.querySelector(getSectionSelector(SECTION_IDS.MENU));

  const heroTimeline =
    heroElement && menuElement
      ? gsap.timeline({
        scrollTrigger: {
          trigger: heroElement,
          start: 'top top',
          endTrigger: menuElement,
          end: 'bottom top',
          scrub: true,
        },
      })
      : null;

  if (heroTimeline) {
    heroTimeline.to(crt.mesh.position, {
      z: -2.5,
      ease: 'none',
    });
  }

  // ── Détection hover menu via raycaster ─────────────────────

  const raycaster = new THREE.Raycaster();
  const mouseNDC = new THREE.Vector2();
  let hoverMenuIndex = -1;
  let currentMenuOpacity = 0;

  // ── Création d'un élément invisible focusable pour la section hero ────
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

  if (heroElement) {
    heroElement.appendChild(heroFocusElement);
  }

  // ── Création des boutons accessibles pour le menu ────────────
  const menuAccessibilityContainer = document.createElement('nav');
  menuAccessibilityContainer.setAttribute('aria-label', 'Menu de navigation CRT');
  menuAccessibilityContainer.className = 'crt-menu-accessibility';

  // Style du conteneur (positionné par-dessus le canvas)
  Object.assign(menuAccessibilityContainer.style, {
    position: 'fixed',
    top: '50%',
    left: '8%',
    transform: 'translateY(-50%)',
    zIndex: '10',
    pointerEvents: 'none', // Ne pas bloquer le raycasting
    display: 'none',
    flexDirection: 'column',
    gap: '0',
  });

  const accessibilityButtons: HTMLButtonElement[] = [];

  for (const [index, item] of CRT_MENU_CONFIG.ITEMS.entries()) {
    const button = document.createElement('button');
    button.textContent = item;
    button.className = 'crt-menu-button';
    button.setAttribute('aria-label', `Naviguer vers ${item}`);

    // Style du bouton : transparent mais accessible au focus
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

    // Commencer avec tabIndex -1 car les boutons sont invisibles au départ
    button.tabIndex = -1;

    // Focus visible pour l'accessibilité
    button.addEventListener('focus', () => {
      hoverMenuIndex = index;
      button.style.outline = '2px solid rgba(255, 255, 255, 0.8)';
      button.style.outlineOffset = '4px';
      button.style.color = 'rgba(255, 255, 255, 0.9)';
    });

    button.addEventListener('blur', () => {
      hoverMenuIndex = -1;
      button.style.outline = 'none';
      button.style.color = 'transparent';
    });

    button.addEventListener('click', () => {
      const targetSectionId = crtMenuSectionIds[index];
      if (targetSectionId) {
        context.scrollManager.scrollToSection(targetSectionId);
      }
    });

    accessibilityButtons.push(button);
    menuAccessibilityContainer.appendChild(button);
  }

  document.body.appendChild(menuAccessibilityContainer);

  const getHoverMenuIndexFromPointer = (clientX: number, clientY: number): number => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouseNDC, camera);
    const hits = raycaster.intersectObject(crt.mesh);

    if (hits.length === 0 || !hits[0]?.uv) {
      return -1;
    }

    // UV.y=0 en bas, UV.y=1 en haut -> canvas Y inverse
    const canvasRelY = 1 - hits[0].uv.y;
    // Reproduit exactement la meme logique verticale que le draw canvas.
    const menuStartY = getCrtMenuStartY(currentMenuOpacity);
    const relativeY = canvasRelY - menuStartY;
    const idx = Math.floor(relativeY / CRT_MENU_CONFIG.LINE_HEIGHT);

    return idx >= 0 && idx < CRT_MENU_CONFIG.MENU_COUNT ? idx : -1;
  };

  // Indique si le scroll a atteint la section menu
  const isAtMenuSection = (): boolean => {
    const currentScrollY = context.scrollManager.getScrollY();
    const menuTop = menuElement instanceof HTMLElement ? menuElement.offsetTop : Infinity;
    return currentScrollY >= menuTop - Math.max(window.innerHeight, 1) * 0.2;
  };

  const onMouseMove = (event: MouseEvent): void => {
    // Hors section menu : pas de hover sur les items (évite les highlights fantômes)
    if (!isAtMenuSection()) {
      hoverMenuIndex = -1;
      return;
    }
    try {
      hoverMenuIndex = getHoverMenuIndexFromPointer(event.clientX, event.clientY);
    } catch (error) {
      console.warn('Raycasting hover detection failed:', error);
      hoverMenuIndex = -1;
    }
  };

  // ── Gestion du clic sur le mesh CRT ───────────────────────────

  const onClick = (event: MouseEvent): void => {
    // Vérifier d'abord si le clic a touché le mesh CRT
    const rect = renderer.domElement.getBoundingClientRect();
    mouseNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseNDC, camera);
    const hits = raycaster.intersectObject(crt.mesh);

    if (hits.length === 0) return; // Clic hors du mesh CRT

    if (!isAtMenuSection()) {
      // Dans la section hero : tout clic sur la TV scroll vers le menu
      context.scrollManager.scrollToSection(SECTION_IDS.MENU);
      return;
    }

    // Dans la section menu : naviguer vers l'item cliqué
    hoverMenuIndex = getHoverMenuIndexFromPointer(event.clientX, event.clientY);
    if (hoverMenuIndex >= 0 && hoverMenuIndex < crtMenuSectionIds.length) {
      const targetSectionId = crtMenuSectionIds[hoverMenuIndex];
      if (targetSectionId) context.scrollManager.scrollToSection(targetSectionId);
    }
  };

  const onViewportResize = (): void => {
    fitCrtToViewport();
  };

  window.addEventListener('resize', onViewportResize);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('click', onClick);

  // ── Fondu de sortie TV quand face-vader arrive ─────────────────────
  const faceVaderElement = document.querySelector(getSectionSelector(SECTION_IDS.FACE_VADER));
  const fadeTvState = { fade: 1 };
  const faceVaderFadeTimeline = faceVaderElement
    ? gsap.timeline({
      scrollTrigger: {
        trigger: faceVaderElement,
        start: 'top 80%',
        end: 'top top',
        scrub: true,
      },
    })
    : null;

  if (faceVaderFadeTimeline) {
    faceVaderFadeTimeline.to(fadeTvState, {
      fade: 0,
      ease: 'none',
      onUpdate: () => {
        crt.setFade(fadeTvState.fade);
      },
    });
  }

  return {
    update: (_deltaSeconds: number, elapsedSeconds: number) => {
      crt.update(elapsedSeconds);

      const viewportHeight = Math.max(window.innerHeight, 1);
      const scrollY = context.scrollManager.getScrollY();

      // Titre : monte et sort du canvas pendant le scroll hero
      const heroProgress = clamp01(scrollY / viewportHeight);
      // Menu opacité : préchargé à 50% du hero scroll → pleinement visible à l'entrée de la section menu
      const menuOpacity = clamp01((scrollY / viewportHeight - 0.5) / 0.5);
      currentMenuOpacity = menuOpacity;
      crt.setUiProgress(heroProgress, menuOpacity, hoverMenuIndex);

      // Afficher/masquer les boutons d'accessibilité en fonction de la visibilité du menu ET de la position du scroll
      if (menuOpacity > 0.3 && isAtMenuSection()) {
        menuAccessibilityContainer.style.display = 'flex';
        menuAccessibilityContainer.style.opacity = String(menuOpacity);
        // Activer les boutons quand le menu est visible ET qu'on est dans la section menu
        accessibilityButtons.forEach((btn) => {
          btn.style.pointerEvents = 'auto';
          btn.tabIndex = 0;
        });
      } else {
        menuAccessibilityContainer.style.display = 'none';
        // Désactiver les boutons et retirer le focus si on n'est pas dans la section menu
        accessibilityButtons.forEach((btn) => {
          btn.style.pointerEvents = 'none';
          btn.tabIndex = -1;
          // Si un bouton a le focus, le retirer immédiatement
          if (document.activeElement === btn) {
            btn.blur();
          }
        });
      }
    },
    dispose: () => {
      window.removeEventListener('resize', onViewportResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClick);
      heroTimeline?.kill();
      faceVaderFadeTimeline?.kill();

      // Nettoyer les boutons d'accessibilité
      if (menuAccessibilityContainer.parentNode) {
        menuAccessibilityContainer.parentNode.removeChild(menuAccessibilityContainer);
      }

      // Nettoyer l'élément de focus hero
      if (heroFocusElement.parentNode) {
        heroFocusElement.parentNode.removeChild(heroFocusElement);
      }

      scene.remove(crt.mesh);
      crt.dispose();
    },
  };
};

export default initHeroSection;
