// Écran de chargement affiché avant le début de l'expérience.
// Montre une barre de progression, attend que les modèles 3D soient téléchargés,
// puis affiche le bouton PLAY. Un clic dessus déclenche la musique et
// lance la transition vers la section héro.

import * as THREE from 'three';
import { CRT_MODEL_PREVIEW_ASPECT } from '../crt/crtShader';
import { applyCrtModelPreview } from '../crt/crtModelPreview';
import { getPlayButtonUVBounds } from '../crt/crtConfig';
import type { CrtManager } from '../crt/crtManager';
import { detectGpuTier } from '../core/gpuCapabilities';
import {
  createMenuPreview3D,
  getMenuPreviewQualityOptions,
  type MenuPreview3D,
} from '../components/3d/menuPreview3D';
import darthVaderHelmetUrl from '../3d-models/darth_vader_helmet.glb?url';
import cctvCameraUrl from '../3d-models/cctv_camera.glb?url';
import mpcUrl from '../3d-models/mpc.glb?url';
import tapeUrl from '../3d-models/tape.glb?url';
import anakinUrl from '../3d-models/anakin_skywalker.glb?url';
import batmanUrl from '../3d-models/batman.glb?url';
import minotaurUrl from '../3d-models/minotaur.glb?url';
import linkUrl from '../3d-models/link.glb?url';
import { loadGlbWithDracoFallback } from '../components/3d/glbLoader';
import { createLoadingController } from '../sections/01-hero/heroLoader';
import { createHeroRaycaster } from '../sections/01-hero/heroRaycaster';
import type { ScrollManager } from '../core/scrollManager';
import type { AudioManager } from '../audio/types';

// ── Constants ──────────────────────────────────────────────────────────────────

const MENU_PREVIEW_TARGET_DIMENSIONS = {
  RELIQUES: 2.5,
  BIG_BROTHER: 1.62,
  MPC: 1.6,
  CRASH_OUTRO: 1.5,
} as const;

// ── Public interface ───────────────────────────────────────────────────────────

export interface LoadingScreenResources {
  menuPreview: MenuPreview3D;
}

export interface LoadingScreen {
  /** Appeler chaque frame pendant la phase loading. */
  update: (deltaSeconds: number, elapsedSeconds: number) => void;
  /**
   * Retourne `menuPreview` immédiatement après la création du loading screen,
   * sans attendre le clic PLAY. Permet de pré-initialiser le sectionManager en parallèle
   * de l'animation de loading.
   */
  getResources: () => LoadingScreenResources;
  /**
   * Résout quand PLAY est cliqué et la transition de fondu terminée (loadingProgress >= 2).
   *
   * **Transfert de propriété** : `menuPreview` est désormais sous la responsabilité de l'appelant.
   * `dispose()` sur ce loading screen ne le détruira **pas** — c'est la section hero qui
   * devra appeler `menuPreview.dispose()` lors de son propre cycle de vie.
   */
  waitForPlay: () => Promise<LoadingScreenResources>;
  /**
   * Nettoie les event listeners de la phase loading (mousemove, click, resize).
   * **Ne dispose pas** `menuPreview` — transféré à la section hero via `waitForPlay()`.
   * Idempotent : peut être appelé plusieurs fois sans effet de bord.
   */
  dispose: () => void;
}

// ── Factory ────────────────────────────────────────────────────────────────────

export const createLoadingScreen = async (
  crtManager: CrtManager,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  scrollManager: ScrollManager,
  audioManager: AudioManager,
): Promise<LoadingScreen> => {
  const gpuTier = detectGpuTier();

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
        targetDimension: MENU_PREVIEW_TARGET_DIMENSIONS.CRASH_OUTRO,
      },
    ],
    menuPreviewQuality,
  );

  // Lance les 4 téléchargements GLB du menu immédiatement, en parallèle de l'animation
  menuPreview.preloadAll();

  // ── Préchargement des modèles de la section Reliques ───────────────────────
  // Lancés ici pour que la section Reliques trouve les modèles déjà en cache
  // via loadGlbWithDracoFallback (pas de double téléchargement).
  const reliquesUrls = [anakinUrl, batmanUrl, minotaurUrl, linkUrl];
  let reliquesSettled = 0;
  for (const url of reliquesUrls) {
    void loadGlbWithDracoFallback(url).finally(() => { reliquesSettled++; });
  }
  const getReliquesProgress = (): number => reliquesSettled / reliquesUrls.length;

  // ── Responsive CRT sizing ───────────────────────────────────────────────────
  crtManager.fitToViewport(camera);

  // ── Loading controller ──────────────────────────────────────────────────────
  const loadingCtrl = createLoadingController(
    crtManager,
    scrollManager,
    () => (menuPreview.getPreloadProgress() + getReliquesProgress()) / 2,
  );

  // ── Raycaster (PLAY button UV detection uniquement) ─────────────────────────
  const raycaster = createHeroRaycaster(camera, renderer, crtManager.mesh, null);
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
    crtManager.fitToViewport(camera);
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('click', onClick);
  window.addEventListener('resize', onViewportResize);

  let isDisposed = false;

  return {
    getResources: (): LoadingScreenResources => ({ menuPreview }),

    update: (deltaSeconds: number, elapsedSeconds: number): void => {
      if (isDisposed) return;

      // crtManager.update() est appelé centralement dans main.ts — ne pas le rappeler ici.
      const loadingProgress = loadingCtrl.getLoadingProgress();

      // Pendant le loading : heroProgress=0, menuOpacity=0, aucun hover menu
      crtManager.setUiProgress(0, 0, -1, loadingProgress, playButtonHovered, elapsedSeconds * 1000);

      menuPreview.update(deltaSeconds);
      menuPreview.renderPreview();
      applyCrtModelPreview(crtManager, {
        texture: menuPreview.getTexture(),
        opacity: menuPreview.getOpacity(),
        texelSize: menuPreview.getTexelSize(),
      });

      // Transition complète (loadingProgress >= 2) → résoudre la promesse
      if (loadingProgress >= 2 && resolvePlay) {
        const resolve = resolvePlay;
        resolvePlay = null;
        resolve({ menuPreview });
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
    },
  };
};
