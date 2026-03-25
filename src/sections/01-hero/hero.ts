import type { SectionInitializer } from '../types';
import { createCrtScreen, CRT_MODEL_PREVIEW_ASPECT } from './crtShader';
import { applyCrtModelPreview } from './crtModelPreview';
import { clamp01 } from '../../utils/math';
import {
  CRT_MENU_CONFIG,
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
import cctvCameraUrl from '../../3d-models/cctv_camera.glb?url';
import mpcUrl from '../../3d-models/mpc.glb?url';
import tapeUrl from '../../3d-models/tape.glb?url';
import { createAccessibilityMenu } from './heroAccessibility';
import { createHeroRaycaster } from './heroRaycaster';
import { createLoadingController } from './heroLoader';
import { createHeroScrollTimelines } from './heroTimelines';

// Réexports pour la compatibilité des tests existants (hero.test.ts)
export {
  computeLoadingProgress,
  createLoadingController,
  LOADER_TOTAL_DURATION_SECONDS,
  LOADER_TRANSITION_SECONDS,
} from './heroLoader';
export type { LoadingController } from './heroLoader';

const MENU_PREVIEW_TARGET_DIMENSIONS = {
  RELIQUES: 2.5,
  BIG_BROTHER: 1.62,
  MPC: 1.6,
  ECLIPSE: 1.5,
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
 * @param basePlaneHeight - Base CRT mesh height (see CRT_PLANE_HEIGHT in crtConfig.ts)
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
  const BASE_PLANE_HEIGHT = CRT_MENU_CONFIG.PLANE_HEIGHT;
  const BASE_PLANE_WIDTH = BASE_PLANE_HEIGHT * CRT_ASPECT;

  const crt = await createCrtScreen(
    CRT_ASPECT,
    shaderSettings.textureResolution,
  );
  crt.mesh.position.set(0, 0, 0);
  scene.add(crt.mesh);
  const menuPreviewQuality = getMenuPreviewQualityOptions(gpuTier, CRT_MODEL_PREVIEW_ASPECT);

  // ── Preview 3D au survol des items du menu ────────────────────────────────
  // Le modèle est rendu dans un WebGLRenderTarget dédié et compacté dans
  // le fragment shader CRT avant les effets, pour apparaître à l'intérieur de l'écran.
  // Mapping modulaire : menuIndex → modèle GLB
  // Index 0 = 'LES RELIQUES'
  // Index 1 = 'BIG BROTHER'
  // Index 2 = 'MPC'
  // Index 3 = "L'ECLIPSE"
  const menuPreview = createMenuPreview3D(
    renderer,
    [
      {
        menuIndex: 0,
        modelUrl: darthVaderHelmetUrl,
        targetDimension: MENU_PREVIEW_TARGET_DIMENSIONS.RELIQUES,
      },
      {
        menuIndex: 1,
        modelUrl: cctvCameraUrl,
        targetDimension: MENU_PREVIEW_TARGET_DIMENSIONS.BIG_BROTHER,
      },
      {
        menuIndex: 2,
        modelUrl: mpcUrl,
        targetDimension: MENU_PREVIEW_TARGET_DIMENSIONS.MPC,
        initialRotation: { x: Math.PI / 5 },
      },
      {
        menuIndex: 3,
        modelUrl: tapeUrl,
        targetDimension: MENU_PREVIEW_TARGET_DIMENSIONS.ECLIPSE,
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
    const prevPlayButtonHovered = playButtonHovered;
    const prevHoverMenuIndex = hoverMenuIndex;

    // Pendant le chargement : seul le hover du bouton PLAY est actif (barre complète uniquement).
    // Toute autre interaction (hover menu, raycasting) est désactivée pour éviter les highlights
    // fantômes si la page est rechargée avec un scroll non nul.
    if (loadingCtrl.isStillLoading()) {
      if (loadingCtrl.isBarComplete()) {
        playButtonHovered = isPointerOnPlayButton(event.clientX, event.clientY);
        if (playButtonHovered && !prevPlayButtonHovered) {
          context.audioManager.playUiFx();
        }
      } else {
        playButtonHovered = false;
      }
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

    if (hoverMenuIndex !== prevHoverMenuIndex && hoverMenuIndex >= 0) {
      context.audioManager.playUiFx();
    }
  };

  // ── Gestion du clic sur le mesh CRT ───────────────────────────

  const onClick = (event: MouseEvent): void => {
    if (loadingCtrl.isStillLoading()) {
      // Barre complète → détecter le clic sur le bouton PLAY via UV
      if (loadingCtrl.isBarComplete() && isPointerOnPlayButton(event.clientX, event.clientY)) {
        loadingCtrl.triggerPlay();
        context.audioManager.startExperience();
        context.audioManager.playUiFx();
      }
      return;
    }

    // Vérifier d'abord si le clic a touché le mesh CRT
    if (!heroRaycaster.isClickOnCrt(event.clientX, event.clientY)) return;

    if (!heroRaycaster.isAtMenuSection()) {
      // Dans la section hero : tout clic sur la TV scroll vers le menu.
      // minScrollY = BASELINE_VIEWPORT_HEIGHT garantit que menuOpacity atteint 1
      // sur tous les écrans (< 1080px de hauteur viewport).
      context.scrollManager.scrollToSection(SECTION_IDS.MENU, BASELINE_VIEWPORT_HEIGHT);
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
