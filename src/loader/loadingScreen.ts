import * as THREE from 'three';
import { createCrtScreen, CRT_MODEL_PREVIEW_ASPECT } from '../sections/01-hero/crt/crtShader';
import type { CrtScreen } from '../sections/01-hero/crt/crtShader';
import { applyCrtModelPreview } from '../sections/01-hero/crt/crtModelPreview';
import {
  CRT_MENU_CONFIG,
  getPlayButtonUVBounds,
} from '../sections/01-hero/crt/crtConfig';
import { detectGpuTier, getShaderComplexity } from '../core/gpuCapabilities';
import {
  createMenuPreview3D,
  getMenuPreviewQualityOptions,
  type MenuPreview3D,
} from '../components/3d/menuPreview3D';
import darthVaderHelmetUrl from '../3d-models/darth_vader_helmet.glb?url';
import cctvCameraUrl from '../3d-models/cctv_camera.glb?url';
import mpcUrl from '../3d-models/mpc.glb?url';
import tapeUrl from '../3d-models/tape.glb?url';
import { createLoadingController } from '../sections/01-hero/heroLoader';
import { createHeroRaycaster } from '../sections/01-hero/heroRaycaster';
import { computeCrtScale } from '../sections/01-hero/crt/crtScaling';
import type { ScrollManager } from '../core/scrollManager';
import type { AudioManager } from '../audio/types';

// ── Constants ──────────────────────────────────────────────────────────────────

const MENU_PREVIEW_TARGET_DIMENSIONS = {
  RELIQUES: 2.5,
  BIG_BROTHER: 1.62,
  MPC: 1.6,
  ECLIPSE: 1.5,
} as const;

// ── Public interface ───────────────────────────────────────────────────────────

export interface LoadingScreenResources {
  crt: CrtScreen;
  menuPreview: MenuPreview3D;
}

export interface LoadingScreen {
  /** Appeler chaque frame pendant la phase loading. */
  update: (deltaSeconds: number, elapsedSeconds: number) => void;
  /**
   * Retourne `crt` et `menuPreview` immédiatement après la création du loading screen,
   * sans attendre le clic PLAY. Permet de pré-initialiser le sectionManager en parallèle
   * de l'animation de loading.
   *
   * **Attention** : ces ressources sont toujours sous le contrôle du loading screen.
   * Ne pas les disposer avant d'avoir appelé `dispose()` sur ce loading screen.
   */
  getResources: () => LoadingScreenResources;
  /**
   * Résout quand PLAY est cliqué et la transition de fondu terminée (loadingProgress >= 2).
   *
   * **Transfert de propriété** : les ressources {@link LoadingScreenResources} retournées
   * (`crt` et `menuPreview`) sont désormais sous la responsabilité de l'appelant.
   * `dispose()` sur ce loading screen ne les détruira **pas** — c'est la section hero qui
   * devra appeler `crt.dispose()` et `menuPreview.dispose()` lors de son propre cycle de vie.
   *
   * La promesse ne se résout qu'une seule fois ; les appels ultérieurs à `update()` après
   * la résolution n'ont aucun effet sur la promesse.
   */
  waitForPlay: () => Promise<LoadingScreenResources>;
  /**
   * Nettoie les event listeners de la phase loading (mousemove, click, resize).
   * **Ne dispose pas** `crt` ni `menuPreview` — ces ressources ont été transférées
   * à la section hero via `waitForPlay()`.
   * Idempotent : peut être appelé plusieurs fois sans effet de bord.
   */
  dispose: () => void;
}

// ── Factory ────────────────────────────────────────────────────────────────────

export const createLoadingScreen = async (
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  scrollManager: ScrollManager,
  audioManager: AudioManager,
): Promise<LoadingScreen> => {
  const gpuTier = detectGpuTier();
  const shaderSettings = getShaderComplexity(gpuTier);

  const CRT_ASPECT = 16 / 9;
  const BASE_PLANE_HEIGHT = CRT_MENU_CONFIG.PLANE_HEIGHT;
  const BASE_PLANE_WIDTH = BASE_PLANE_HEIGHT * CRT_ASPECT;

  // ── CRT Screen ──────────────────────────────────────────────────────────────
  const crt = await createCrtScreen(CRT_ASPECT, shaderSettings.textureResolution);
  crt.mesh.position.set(0, 0, 0);
  scene.add(crt.mesh);

  // ── Menu preview (4 GLBs) ───────────────────────────────────────────────────
  const menuPreviewQuality = getMenuPreviewQualityOptions(gpuTier, CRT_MODEL_PREVIEW_ASPECT);
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

  // Lance les 4 téléchargements GLB immédiatement, en parallèle de l'animation
  menuPreview.preloadAll();

  // ── Responsive CRT sizing ───────────────────────────────────────────────────
  const fitCrtToViewport = (): void => {
    const fovRad = (camera.fov * Math.PI) / 180;
    const visibleHeight = 2 * camera.position.z * Math.tan(fovRad / 2);
    const viewportAspect = window.innerWidth / Math.max(window.innerHeight, 1);
    const scale = computeCrtScale(
      visibleHeight,
      viewportAspect,
      BASE_PLANE_WIDTH,
      BASE_PLANE_HEIGHT,
    );
    crt.mesh.scale.set(scale, scale, 1);
  };
  fitCrtToViewport();

  // ── Loading controller ──────────────────────────────────────────────────────
  const loadingCtrl = createLoadingController(
    crt,
    scrollManager,
    () => menuPreview.getPreloadProgress(),
  );

  // ── Raycaster (PLAY button UV detection uniquement) ─────────────────────────
  // menuElement = null : isAtMenuSection() retournera toujours false (correct pendant loading)
  const raycaster = createHeroRaycaster(camera, renderer, crt.mesh, null);
  const playButtonUVBounds = getPlayButtonUVBounds();
  let playButtonHovered = false;

  const isPointerOnPlayButton = (clientX: number, clientY: number): boolean => {
    const uv = raycaster.getClickUV(clientX, clientY);
    return (
      uv !== null &&
      uv.x >= playButtonUVBounds.xMin &&
      uv.x <= playButtonUVBounds.xMax &&
      uv.y >= playButtonUVBounds.yMin &&
      uv.y <= playButtonUVBounds.yMax
    );
  };

  // ── Play promise ────────────────────────────────────────────────────────────
  let resolvePlay: ((resources: LoadingScreenResources) => void) | null = null;
  const playPromise = new Promise<LoadingScreenResources>((resolve) => {
    resolvePlay = resolve;
  });

  // ── Event listeners (phase loading uniquement) ──────────────────────────────
  const onMouseMove = (event: MouseEvent): void => {
    if (!loadingCtrl.isStillLoading()) return;
    const prevHovered = playButtonHovered;
    if (loadingCtrl.isBarComplete()) {
      playButtonHovered = isPointerOnPlayButton(event.clientX, event.clientY);
      if (playButtonHovered && !prevHovered) {
        audioManager.playUiFx();
      }
    } else {
      playButtonHovered = false;
    }
  };

  const onClick = (event: MouseEvent): void => {
    if (!loadingCtrl.isStillLoading()) return;
    if (
      loadingCtrl.isBarComplete() &&
      isPointerOnPlayButton(event.clientX, event.clientY)
    ) {
      loadingCtrl.triggerPlay();
      audioManager.startExperience();
      audioManager.playUiFx();
    }
  };

  const onViewportResize = (): void => {
    fitCrtToViewport();
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('click', onClick);
  window.addEventListener('resize', onViewportResize);

  let isDisposed = false;

  return {
    getResources: (): LoadingScreenResources => ({ crt, menuPreview }),

    update: (deltaSeconds: number, elapsedSeconds: number): void => {
      if (isDisposed) return;

      crt.update(elapsedSeconds);

      const loadingProgress = loadingCtrl.getLoadingProgress();

      // Pendant le loading : heroProgress=0, menuOpacity=0, aucun hover menu
      crt.setUiProgress(0, 0, -1, loadingProgress, playButtonHovered);

      menuPreview.update(deltaSeconds);
      menuPreview.renderPreview();
      applyCrtModelPreview(crt, {
        texture: menuPreview.getTexture(),
        opacity: menuPreview.getOpacity(),
        texelSize: menuPreview.getTexelSize(),
      });

      // Transition complète (loadingProgress >= 2) → résoudre la promesse
      if (loadingProgress >= 2 && resolvePlay) {
        const resolve = resolvePlay;
        resolvePlay = null;
        resolve({ crt, menuPreview });
      }
    },

    waitForPlay: (): Promise<LoadingScreenResources> => playPromise,

    dispose: (): void => {
      if (isDisposed) return;
      isDisposed = true;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClick);
      window.removeEventListener('resize', onViewportResize);
      loadingCtrl.dispose();
      // Note : crt et menuPreview ne sont PAS disposés ici — ils sont transmis à hero section
    },
  };
};
