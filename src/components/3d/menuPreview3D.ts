// Gère les prévisualisations 3D du menu CRT (casque Vador, caméra CCTV, MPC, cassette).
// Chaque modèle est rendu dans une mini-scène isolée avec un effet "dessin au trait".
// La texture produite est ensuite injectée dans le shader CRT pour apparaître
// à l'intérieur de l'écran quand l'utilisateur survole un item du menu.

import * as THREE from 'three';
import gsap from 'gsap';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { GpuTier } from '../../core/gpuCapabilities';
import { loadGlbWithDracoFallback } from './glbLoader';

// ── Render Target ──────────────────────────────────────────────────────────────
// Le modèle est rendu dans une mini-scène isolée, dont la texture est ensuite
// injectée dans le shader CRT AVANT les effets (scanlines, barrel distortion…).
// Ainsi le modèle apparaît réellement "à l'intérieur" de l'écran.
const DEFAULT_RENDER_TARGET_SIZE = 512;

// Taille cible par défaut du modèle dans la mini-scène.
// Caméra FOV 45° à z=3 → hauteur visible ≈ 2.49 u.
const DEFAULT_TARGET_DIMENSION = 2.5;

// Durées des transitions
const DURATION_IN = 0.35;
const DURATION_OUT = 0.22;
const EASE_IN = 'back.out(1.3)';
const EASE_OUT = 'power2.in';

// Vitesse de rotation automatique (radians/seconde)
const DEFAULT_ROTATION_SPEED = 0.9;

// ── Types ──────────────────────────────────────────────────────────────────────

export interface MenuPreviewQualityOptions {
  renderTargetSize: number;
  rotationSpeed: number;
  renderFrameInterval: number;
  /** Aspect ratio de la caméra mini-scène (largeur/hauteur du rect d'affichage sur le CRT). */
  cameraAspect: number;
}

export const getMenuPreviewQualityOptions = (
  gpuTier: GpuTier,
  cameraAspect: number,
): MenuPreviewQualityOptions => {
  if (gpuTier === 'low') {
    return {
      renderTargetSize: 256,
      rotationSpeed: 0.72,
      renderFrameInterval: 2,
      cameraAspect,
    };
  }

  return {
    renderTargetSize: 512,
    rotationSpeed: 0.9,
    renderFrameInterval: 1,
    cameraAspect,
  };
};

// ── Masque de forme pour contour shader ───────────────────────────────────────
// Le shader CRT calcule ensuite la bordure externe depuis l'alpha du render target.
const INTERNAL_EDGE_THRESHOLD_DEGREES = 15;
const INTERNAL_EDGE_LINE_WIDTH_PX = 2;

const applyModelMask = (
  root: THREE.Object3D,
  renderTargetSize: number,
): void => {
  const meshesToProcess: THREE.Mesh[] = [];

  root.traverse((node) => {
    if (node instanceof THREE.Mesh) meshesToProcess.push(node);
  });

  for (const mesh of meshesToProcess) {
    // Remplacer les matériaux d'origine par un matériau noir opaque.
    // RGB noir = pas de remplissage visible dans le shader ; alpha = masque silhouette.
    const oldMaterials: THREE.Material[] = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    oldMaterials.forEach((m) => m.dispose());

    mesh.material = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: false,
      opacity: 1,
      side: THREE.FrontSide,
      depthTest: true,
      depthWrite: true,
    });

    // Ajouter les arêtes internes en blanc, visibles dans le render target.
    const edgesGeo = new THREE.EdgesGeometry(
      mesh.geometry,
      INTERNAL_EDGE_THRESHOLD_DEGREES,
    );
    const positionAttr = edgesGeo.getAttribute('position');
    if (positionAttr) {
      const fatGeometry = new LineSegmentsGeometry();
      fatGeometry.setPositions(
        Array.from(positionAttr.array as ArrayLike<number>),
      );

      const fatMaterial = new LineMaterial({
        color: 0xffffff,
        linewidth: INTERNAL_EDGE_LINE_WIDTH_PX,
        transparent: true,
        opacity: 1,
        depthTest: true,
        depthWrite: false,
      });
      fatMaterial.resolution.set(renderTargetSize, renderTargetSize);

      const lines = new LineSegments2(fatGeometry, fatMaterial);
      lines.computeLineDistances();
      mesh.add(lines);
    }
    edgesGeo.dispose();
  }
};

// ── Fit + centrage du modèle ───────────────────────────────────────────────────

const fitModel = (model: THREE.Object3D, targetDimension: number): void => {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const safeTargetDimension =
    targetDimension > 0 ? targetDimension : DEFAULT_TARGET_DIMENSION;
  const scale = maxDim > 0 ? safeTargetDimension / maxDim : 1;
  model.scale.setScalar(scale);

  // Recentrage sur l'origine locale du groupe
  const scaledBox = new THREE.Box3().setFromObject(model);
  const center = scaledBox.getCenter(new THREE.Vector3());
  model.position.sub(center);
};

// ── Interface publique ─────────────────────────────────────────────────────────

export interface MenuPreviewItem {
  /** Index de l'item dans le menu CRT (0-based, dans la liste crtMenuItems) */
  menuIndex: number;
  /** URL du fichier GLB à afficher */
  modelUrl: string;
  /** Taille cible propre à ce modèle (unités monde) */
  targetDimension: number;
  /** Rotation initiale statique appliquée au modèle (radians) */
  initialRotation?: { x?: number; y?: number; z?: number };
}

export interface MenuPreview3D {
  /** Mettre à jour l'index survolé (-1 = aucun) */
  setHoveredIndex: (index: number) => void;
  /** Appeler à chaque frame pour la rotation automatique */
  update: (deltaSeconds: number) => void;
  /** Rend la mini-scène dans le render target. Appeler avant le rendu principal. */
  renderPreview: () => void;
  /** Texture du render target à passer au shader CRT. */
  getTexture: () => THREE.Texture;
  /** Taille d'un texel UV du render target (1/width, 1/height). */
  getTexelSize: () => THREE.Vector2;
  /** Opacité courante (0-1) pour le shader CRT. */
  getOpacity: () => number;
  dispose: () => void;
  /** Démarre le chargement de tous les modèles immédiatement (sans attendre le survol). */
  preloadAll: () => void;
  /** Proportion de modèles settled (ready ou failed) sur total items. 0..1 */
  getPreloadProgress: () => number;
}

interface ModelEntry {
  /** Groupe contenant le modèle chargé + centré */
  group: THREE.Group;
  /** Proxy animé par GSAP { opacity, scale } */
  proxy: { opacity: number; scale: number };
  /** Tween en cours (pour annulation si besoin) */
  tween: gsap.core.Tween | null;
  /** Chargement terminé */
  ready: boolean;
  /** Chargement en échec */
  failed: boolean;
  /** Promesse de chargement du modèle */
  loading: Promise<void> | null;
  /** Version de chargement pour invalider les callbacks obsolètes */
  loadVersion: number;
}

// ── Helpers niveau module ──────────────────────────────────────────────────────

const disposeDetachedObject3D = (object: THREE.Object3D): void => {
  object.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;

    node.geometry?.dispose();

    const materials: THREE.Material[] = Array.isArray(node.material)
      ? node.material
      : [node.material];

    materials.forEach((material) => {
      material.dispose();
    });
  });
};

const groupCleanup = (group: THREE.Group): void => {
  if (group.children.length === 0) return;

  for (const child of [...group.children]) {
    disposeDetachedObject3D(child);
    group.remove(child);
  }
};

const hideEntry = (entry: ModelEntry): void => {
  entry.tween?.kill();
  entry.tween = gsap.to(entry.proxy, {
    opacity: 0,
    scale: 0,
    duration: DURATION_OUT,
    ease: EASE_OUT,
    onUpdate: () => {
      entry.group.scale.setScalar(entry.proxy.scale);
    },
    onComplete: () => {
      entry.group.visible = false;
    },
  });
};

const showEntry = (entry: ModelEntry): void => {
  entry.group.visible = true;
  entry.tween?.kill();
  entry.tween = gsap.to(entry.proxy, {
    opacity: 1,
    scale: 1,
    duration: DURATION_IN,
    ease: EASE_IN,
    onUpdate: () => {
      entry.group.scale.setScalar(entry.proxy.scale);
    },
  });
};

/** Rend la mini-scène dans le render target en sauvegardant/restaurant l'état du renderer. */
const renderMiniScene = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderTarget: THREE.WebGLRenderTarget,
): void => {
  const prevTarget = renderer.getRenderTarget();
  const prevClearColor = new THREE.Color();
  const prevClearAlpha = renderer.getClearAlpha();
  renderer.getClearColor(prevClearColor);

  renderer.setRenderTarget(renderTarget);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, camera);

  // Restaurer l'état précédent
  renderer.setRenderTarget(prevTarget);
  renderer.setClearColor(prevClearColor, prevClearAlpha);
};

/** Nettoie une entrée modèle : annule les tweens, dispose les géométries/matériaux, retire de la scène. */
const disposeModelEntry = (entry: ModelEntry, scene: THREE.Scene): void => {
  entry.loadVersion += 1;
  entry.tween?.kill();
  entry.group.traverse((node) => {
    if (node instanceof LineSegments2) {
      node.geometry?.dispose();
      if (node.material instanceof THREE.Material) {
        node.material.dispose();
      }
      return;
    }
    if (!(node instanceof THREE.Mesh)) return;
    node.geometry?.dispose();
    const mats: THREE.Material[] = Array.isArray(node.material)
      ? node.material
      : [node.material];
    mats.forEach((m) => m.dispose());
  });
  scene.remove(entry.group);
};

interface MiniScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderTarget: THREE.WebGLRenderTarget;
  texelSize: THREE.Vector2;
}

const createMiniScene = (renderTargetSize: number, cameraAspect: number): MiniScene => {
  // Isolée de la scène principale ; rendue dans un WebGLRenderTarget carré.
  // Pas de lumières nécessaires : le rendu est en arêtes seules (LineSegments).
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, cameraAspect, 0.1, 20);
  camera.position.set(0, 0.1, 3);
  camera.lookAt(0, 0, 0);

  // Render target carré avec canal alpha transparent (fond = 0,0,0,0)
  const renderTarget = new THREE.WebGLRenderTarget(
    renderTargetSize,
    renderTargetSize,
    {
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    },
  );

  const texelSize = new THREE.Vector2(
    1 / renderTargetSize,
    1 / renderTargetSize,
  );

  return { scene, camera, renderTarget, texelSize };
};

// ── Factory principale ─────────────────────────────────────────────────────────

export const createMenuPreview3D = (
  renderer: THREE.WebGLRenderer,
  items: MenuPreviewItem[],
  quality: Partial<MenuPreviewQualityOptions> = {},
): MenuPreview3D => {
  const renderTargetSize =
    quality.renderTargetSize ?? DEFAULT_RENDER_TARGET_SIZE;
  const rotationSpeed = quality.rotationSpeed ?? DEFAULT_ROTATION_SPEED;
  const renderFrameInterval = Math.max(
    1,
    Math.floor(quality.renderFrameInterval ?? 1),
  );
  const cameraAspect = quality.cameraAspect ?? 1;

  const {
    scene: miniScene,
    camera: miniCamera,
    renderTarget,
    texelSize,
  } = createMiniScene(renderTargetSize, cameraAspect);

  // Map menuIndex → entry
  const entries = new Map<number, ModelEntry>();
  const itemMap = new Map(items.map((it) => [it.menuIndex, it]));
  let currentIndex = -1;
  let frameCounter = 0;
  let isDisposed = false;

  // ── Chargement à la demande ──────────────────────────────────────────────────

  const startLoading = (entry: ModelEntry, item: MenuPreviewItem): void => {
    const loadVersion = entry.loadVersion + 1;
    entry.loadVersion = loadVersion;
    entry.ready = false;
    entry.failed = false;

    entry.loading = loadGlbWithDracoFallback(item.modelUrl)
      .then((gltf) => {
        if (isDisposed || loadVersion !== entry.loadVersion) {
          disposeDetachedObject3D(gltf.scene);
          gltf.scene.clear();
          return;
        }

        fitModel(gltf.scene, item.targetDimension);
        if (item.initialRotation) {
          gltf.scene.rotation.x = item.initialRotation.x ?? 0;
          gltf.scene.rotation.y = item.initialRotation.y ?? 0;
          gltf.scene.rotation.z = item.initialRotation.z ?? 0;
        }
        groupCleanup(entry.group);
        entry.group.add(gltf.scene);
        applyModelMask(entry.group, renderTargetSize);
        entry.ready = true;
        entry.failed = false;
      })
      .catch((err: unknown) => {
        if (isDisposed || loadVersion !== entry.loadVersion) {
          return;
        }
        entry.failed = true;
        // eslint-disable-next-line no-console
        console.error(
          `[MenuPreview3D] Échec du chargement : ${item.modelUrl}`,
          err,
        );
      })
      .finally(() => {
        if (loadVersion === entry.loadVersion) {
          entry.loading = null;
        }
      });
  };

  const ensureLoaded = (item: MenuPreviewItem): ModelEntry => {
    const existing = entries.get(item.menuIndex);
    if (existing) {
      if (existing.failed && !existing.loading) {
        startLoading(existing, item);
      }
      return existing;
    }

    const group = new THREE.Group();
    group.visible = false;
    group.scale.setScalar(0);
    miniScene.add(group);

    const proxy: { opacity: number; scale: number } = { opacity: 0, scale: 0 };
    const entry: ModelEntry = {
      group,
      proxy,
      tween: null,
      ready: false,
      failed: false,
      loading: null,
      loadVersion: 0,
    };
    entries.set(item.menuIndex, entry);
    startLoading(entry, item);

    return entry;
  };

  // ── Préchargement immédiat ────────────────────────────────────────────────────

  const preloadAll = (): void => {
    if (isDisposed) return;
    for (const item of items) {
      ensureLoaded(item);
    }
  };

  const getPreloadProgress = (): number => {
    if (items.length === 0) return 1;
    let settled = 0;
    for (const item of items) {
      const entry = entries.get(item.menuIndex);
      if (entry && (entry.ready || entry.failed)) settled += 1;
    }
    return settled / items.length;
  };

  // ── API publique ─────────────────────────────────────────────────────────────

  const setHoveredIndex = (index: number): void => {
    if (isDisposed) return;
    if (index === currentIndex) return;

    if (currentIndex !== -1) {
      const prev = entries.get(currentIndex);
      if (prev) hideEntry(prev);
    }

    currentIndex = index;

    const item = itemMap.get(index);
    if (!item) return;

    const entry = ensureLoaded(item);

    if (entry.failed && !entry.loading) {
      startLoading(entry, item);
    }

    if (entry.ready) {
      showEntry(entry);
      return;
    }

    void entry.loading?.then(() => {
      if (currentIndex === index && entry.ready) {
        showEntry(entry);
      }
    });
  };

  const update = (deltaSeconds: number): void => {
    if (isDisposed) return;
    for (const [, entry] of entries) {
      if (entry.group.visible && entry.proxy.opacity > 0) {
        entry.group.rotation.y += rotationSpeed * deltaSeconds;
      }
    }
  };

  const getTexelSize = (): THREE.Vector2 => texelSize;

  const getOpacity = (): number => {
    let max = 0;
    for (const [, entry] of entries) {
      if (entry.proxy.opacity > max) max = entry.proxy.opacity;
    }
    return max;
  };

  const getTexture = (): THREE.Texture => renderTarget.texture;

  const renderPreview = (): void => {
    if (isDisposed) return;
    if (getOpacity() <= 0) return;
    frameCounter = (frameCounter + 1) % renderFrameInterval;
    if (frameCounter !== 0) return;

    renderMiniScene(renderer, miniScene, miniCamera, renderTarget);
  };

  const dispose = (): void => {
    isDisposed = true;
    for (const [, entry] of entries) {
      disposeModelEntry(entry, miniScene);
    }
    entries.clear();
    renderTarget.dispose();
  };

  return {
    setHoveredIndex,
    update,
    renderPreview,
    getTexture,
    getOpacity,
    getTexelSize,
    dispose,
    preloadAll,
    getPreloadProgress,
  };
};
