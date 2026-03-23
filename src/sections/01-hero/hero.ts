import * as THREE from 'three';
import gsap from 'gsap';
import type { SectionInitializer } from '../types';
import { createCrtScreen } from './crtShader';
import { applyCrtModelPreview } from './crtModelPreview';
import { clamp01 } from '../../utils/math';
import {
  CRT_MENU_CONFIG,
  getCrtMenuStartY,
  BASELINE_VIEWPORT_HEIGHT,
  getPlayButtonUVBounds,
} from './crtConfig';
import {
  hasWebGLSupport,
  detectGpuTier,
  getShaderComplexity,
} from '../../core/gpuCapabilities';
import initHeroFallback from './heroFallback';
import {
  getSectionSelector,
  SECTION_IDS,
  crtMenuSectionIds,
} from '../definitions';
import {
  createMenuPreview3D,
  getMenuPreviewQualityOptions,
} from '../../components/3d/menuPreview3D';
import darthVaderHelmetUrl from '../../3d-models/darth_vader_helmet.glb?url';
import cctvCameraUrl from '../../3d-models/low-poly_cctv_camera.glb?url';

const MENU_PREVIEW_TARGET_DIMENSIONS = {
  RELIQUES: 2.5,
  BIG_BROTHER: 1.8,
} as const;

// Seuil de largeur viewport (px) séparant desktop et mobile pour le calcul du CRT scale
const VIEWPORT_DESKTOP_BREAKPOINT_PX = 1366;
// Ratio d'aspect minimum pour vérouiller la hauteur sur desktop (16:10, MacBook, ultrawide)
const HEIGHT_LOCK_ASPECT_DESKTOP = 1.6;
// Ratio d'aspect minimum pour vérouiller la hauteur sur mobile/tablet
const HEIGHT_LOCK_ASPECT_MOBILE = 1.2;
// Epsilon de sécurité pour éviter la division par zéro
const SAFE_MIN_VALUE = 0.0001;

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
 * @param basePlaneHeight - Base CRT mesh height (constant 3.5)
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

  // Calculate scale needed to fill viewport height
  const heightLockedScale = safeVisibleHeight / basePlaneHeight;

  // Determine aspect ratio breakpoint based on viewport
  // Desktop/widescreen (≥1366px): use 1.6 (standard for 16:9 and 16:10)
  // Mobile (< 1366px): use 1.2 (handles portrait/landscape phone transitions)
  const heightLockBreakpoint =
    viewportWidth >= VIEWPORT_DESKTOP_BREAKPOINT_PX
      ? HEIGHT_LOCK_ASPECT_DESKTOP
      : HEIGHT_LOCK_ASPECT_MOBILE;

  if (safeViewportAspect >= heightLockBreakpoint) {
    // Wide screen: lock CRT to visible height (stable, no vertical bars)
    return heightLockedScale;
  }

  // Narrow screen: scale to fit both width and height (contain logic)
  // This prevents cutting off left/right content on phones and tablets
  const visibleWidth = safeVisibleHeight * safeViewportAspect;
  const containScale = Math.min(
    heightLockedScale,
    visibleWidth / basePlaneWidth,
  );
  return containScale;
};

export const LOADER_TOTAL_DURATION_SECONDS = 3.8;
export const LOADER_HOLD_SECONDS = 2.0;
// Durée du fondu croisé entre l'écran de chargement et le contenu héro.
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

// ── Helpers niveau module ──────────────────────────────────────────────────────

interface AccessibilityMenu {
  container: HTMLElement;
  buttons: HTMLButtonElement[];
  updateVisibility: (menuOpacity: number, isAtMenu: boolean) => void;
  dispose: () => void;
}

const createAccessibilityMenu = (
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
      button.style.outline = '2px solid rgba(255, 255, 255, 0.8)';
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

interface HeroScrollTimelines {
  heroTimeline: gsap.core.Timeline | null;
  faceVaderFadeTimeline: gsap.core.Timeline | null;
}

const createHeroScrollTimelines = (
  heroElement: Element | null,
  menuElement: Element | null,
  faceVaderElement: Element | null,
  crt: { mesh: { position: THREE.Vector3 }; setFade: (v: number) => void },
): HeroScrollTimelines => {
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
    heroTimeline.to(crt.mesh.position, { z: -2.5, ease: 'none' });
  }

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
      onUpdate: () => crt.setFade(fadeTvState.fade),
    });
  }

  return { heroTimeline, faceVaderFadeTimeline };
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

// ── Raycaster hero ─────────────────────────────────────────────────────────────

interface HeroRaycaster {
  /** Retourne l'index du menu survolé (-1 si aucun). */
  getHoverMenuIndexFromPointer: (clientX: number, clientY: number, menuOpacity: number) => number;
  /** Vérifie si un clic touche le mesh CRT. */
  isClickOnCrt: (clientX: number, clientY: number) => boolean;
  /** Retourne les coordonnées UV du clic sur le CRT (null si pas de hit). */
  getClickUV: (clientX: number, clientY: number) => THREE.Vector2 | null;
  /** Indique si le scroll a atteint la section menu. */
  isAtMenuSection: () => boolean;
}

const createHeroRaycaster = (
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  crtMesh: THREE.Mesh,
  menuElement: Element | null,
  scrollManager: { getScrollY: () => number },
): HeroRaycaster => {
  const raycaster = new THREE.Raycaster();
  const mouseNDC = new THREE.Vector2();

  const updateNDC = (clientX: number, clientY: number): void => {
    const rect = renderer.domElement.getBoundingClientRect();
    mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseNDC, camera);
  };

  return {
    getHoverMenuIndexFromPointer: (clientX, clientY, menuOpacity) => {
      updateNDC(clientX, clientY);
      const hits = raycaster.intersectObject(crtMesh);

      if (hits.length === 0 || !hits[0]?.uv) {
        return -1;
      }

      // UV.y=0 en bas, UV.y=1 en haut -> canvas Y inverse
      const canvasRelY = 1 - hits[0].uv.y;
      // Reproduit exactement la même logique verticale que le draw canvas.
      const menuStartY = getCrtMenuStartY(menuOpacity);
      const relativeY = canvasRelY - menuStartY;
      const idx = Math.floor(relativeY / CRT_MENU_CONFIG.LINE_HEIGHT);

      return idx >= 0 && idx < CRT_MENU_CONFIG.MENU_COUNT ? idx : -1;
    },

    isClickOnCrt: (clientX, clientY) => {
      updateNDC(clientX, clientY);
      return raycaster.intersectObject(crtMesh).length > 0;
    },

    getClickUV: (clientX, clientY) => {
      updateNDC(clientX, clientY);
      const hits = raycaster.intersectObject(crtMesh);
      if (hits.length === 0 || !hits[0]?.uv) return null;
      return hits[0].uv.clone();
    },

    isAtMenuSection: () => {
      const currentScrollY = scrollManager.getScrollY();
      const menuTop =
        menuElement instanceof HTMLElement ? menuElement.offsetTop : Infinity;
      return currentScrollY >= menuTop - Math.max(window.innerHeight, 1) * 0.2;
    },
  };
};

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

  const crt = await createCrtScreen(
    CRT_ASPECT,
    shaderSettings.textureResolution,
  );
  crt.mesh.position.set(0, 0, 0);
  scene.add(crt.mesh);
  const menuPreviewQuality = getMenuPreviewQualityOptions(gpuTier);

  // ── Preview 3D au survol des items du menu ────────────────────────────────
  // Le modèle est rendu dans un WebGLRenderTarget dédié et compacté dans
  // le fragment shader CRT avant les effets, pour apparaître à l'intérieur de l'écran.
  // Mapping modulaire : menuIndex → modèle GLB
  // Index 1 = 'LES RELIQUES'
  // Index 2 = 'BIG BROTHER'
  const menuPreview = createMenuPreview3D(
    renderer,
    [
      {
        menuIndex: 1,
        modelUrl: darthVaderHelmetUrl,
        targetDimension: MENU_PREVIEW_TARGET_DIMENSIONS.RELIQUES,
      },
      {
        menuIndex: 2,
        modelUrl: cctvCameraUrl,
        targetDimension: MENU_PREVIEW_TARGET_DIMENSIONS.BIG_BROTHER,
      },
    ],
    menuPreviewQuality,
  );

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
    const scale = computeCrtScale(
      visibleHeight,
      viewportAspect,
      BASE_PLANE_WIDTH,
      BASE_PLANE_HEIGHT,
    );
    crt.mesh.scale.set(scale, scale, 1);
  };

  fitCrtToViewport();

  // ── Contrôleur de chargement (power-on, skip, transition croisée) ────────────
  const loadingCtrl = createLoadingController(crt, context.scrollManager);

  // ── Parallax et fondu-sortie TV ───────────────────────────────────────
  const heroElement = document.querySelector(
    getSectionSelector(SECTION_IDS.HERO),
  );
  const menuElement = document.querySelector(
    getSectionSelector(SECTION_IDS.MENU),
  );
  const faceVaderElement = document.querySelector(
    getSectionSelector(SECTION_IDS.FACE_VADER),
  );

  const { heroTimeline, faceVaderFadeTimeline } = createHeroScrollTimelines(
    heroElement,
    menuElement,
    faceVaderElement,
    crt,
  );

  // ── Détection hover menu via raycaster ─────────────────────

  const heroRaycaster = createHeroRaycaster(
    camera,
    renderer,
    crt.mesh,
    menuElement,
    context.scrollManager,
  );
  let hoverMenuIndex = -1;
  let currentMenuOpacity = 0;
  let playButtonHovered = false;

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

  // UV bounds du bouton PLAY, calculées depuis la config de layout du loader (crtConfig.ts).
  // En centralisant ici, tout ajustement du layout (PANEL_Y_RATIO, taille police…)
  // se répercute automatiquement sur la détection de clic et de hover.
  const playButtonUVBounds = getPlayButtonUVBounds();

  const isPointerOnPlayButton = (clientX: number, clientY: number): boolean => {
    const uv = heroRaycaster.getClickUV(clientX, clientY);
    return (
      uv !== null &&
      uv.x >= playButtonUVBounds.xMin && uv.x <= playButtonUVBounds.xMax &&
      uv.y >= playButtonUVBounds.yMin && uv.y <= playButtonUVBounds.yMax
    );
  };

  const onMouseMove = (event: MouseEvent): void => {
    // Hover du bouton PLAY pendant le chargement (barre complète, avant le play)
    if (loadingCtrl.isStillLoading() && loadingCtrl.isBarComplete()) {
      playButtonHovered = isPointerOnPlayButton(event.clientX, event.clientY);
      hoverMenuIndex = -1;
      return;
    }
    playButtonHovered = false;

    // Hors section menu : pas de hover sur les items (évite les highlights fantômes)
    if (!heroRaycaster.isAtMenuSection()) {
      hoverMenuIndex = -1;
      return;
    }
    try {
      hoverMenuIndex = heroRaycaster.getHoverMenuIndexFromPointer(
        event.clientX,
        event.clientY,
        currentMenuOpacity,
      );
    } catch (error) {
      console.warn('Raycasting hover detection failed:', error);
      hoverMenuIndex = -1;
    }
  };

  // ── Gestion du clic sur le mesh CRT ───────────────────────────

  const onClick = (event: MouseEvent): void => {
    if (loadingCtrl.isStillLoading()) {
      // Barre complète → détecter le clic sur le bouton PLAY via UV
      if (loadingCtrl.isBarComplete() && isPointerOnPlayButton(event.clientX, event.clientY)) {
        loadingCtrl.triggerPlay();
      }
      return;
    }

    // Vérifier d'abord si le clic a touché le mesh CRT
    if (!heroRaycaster.isClickOnCrt(event.clientX, event.clientY)) return;

    if (!heroRaycaster.isAtMenuSection()) {
      // Dans la section hero : tout clic sur la TV scroll vers le menu
      context.scrollManager.scrollToSection(SECTION_IDS.MENU);
      return;
    }

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
  };

  const onViewportResize = (): void => {
    fitCrtToViewport();
  };

  window.addEventListener('resize', onViewportResize);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('click', onClick);

  return {
    update: (_deltaSeconds: number, elapsedSeconds: number) => {
      crt.update(elapsedSeconds);

      const scrollY = context.scrollManager.getScrollY();

      // Titre : monte et sort du canvas pendant le scroll hero
      // Normalized by baseline 1080p for consistent animation speed across all screen sizes.
      // Without normalization: 4K would show 50% slower animation, mobile 28% faster.
      // This ensures the same scroll distance produces identical title progression universally.
      const heroProgress = clamp01(scrollY / BASELINE_VIEWPORT_HEIGHT);

      // Menu opacité : préchargé à 50% du hero scroll → pleinement visible à l'entrée de la section menu
      const menuOpacity = clamp01(
        (scrollY / BASELINE_VIEWPORT_HEIGHT - 0.5) / 0.5,
      );
      currentMenuOpacity = menuOpacity;
      const loadingProgress = loadingCtrl.getLoadingProgress();
      crt.setUiProgress(
        heroProgress,
        menuOpacity,
        hoverMenuIndex,
        loadingProgress,
        playButtonHovered,
      );
      menuPreview.setHoveredIndex(heroRaycaster.isAtMenuSection() ? hoverMenuIndex : -1);
      menuPreview.update(_deltaSeconds);
      menuPreview.renderPreview();
      applyCrtModelPreview(crt, {
        texture: menuPreview.getTexture(),
        opacity: menuPreview.getOpacity(),
        texelSize: menuPreview.getTexelSize(),
      });

      accessibilityMenu.updateVisibility(menuOpacity, heroRaycaster.isAtMenuSection());
    },
    dispose: () => {
      window.removeEventListener('resize', onViewportResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClick);
      loadingCtrl.dispose();
      heroTimeline?.kill();
      faceVaderFadeTimeline?.kill();
      accessibilityMenu.dispose();

      if (heroFocusElement.parentNode) {
        heroFocusElement.parentNode.removeChild(heroFocusElement);
      }

      menuPreview.dispose();
      scene.remove(crt.mesh);
      crt.dispose();
    },
  };
};
