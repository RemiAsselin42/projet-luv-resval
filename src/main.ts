import './style.scss';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import mpd218ModelUrl from './3d-models/MPD218.obj?url';

// ---------------------------------------------------------------------------
// Conteneur DOM
// ---------------------------------------------------------------------------

const canvasContainer = document.getElementById('canvas-container');

if (!canvasContainer) {
  throw new Error('Conteneur #canvas-container introuvable.');
}

const debug3dFromQuery = new URLSearchParams(window.location.search).get('debug3d') === '1';
const debug3dFromStorage = window.localStorage.getItem('debug3d') === 'true';
const DEBUG_3D = import.meta.env.DEV || debug3dFromQuery || debug3dFromStorage;

const log3d = (...args: unknown[]): void => {
  if (!DEBUG_3D) {
    return;
  }
  console.log('[3D]', ...args);
};

const warn3d = (...args: unknown[]): void => {
  if (!DEBUG_3D) {
    return;
  }
  console.warn('[3D]', ...args);
};

const countMeshes = (root: THREE.Object3D): number => {
  let count = 0;
  root.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      count += 1;
    }
  });
  return count;
};

const countVertices = (root: THREE.Object3D): number => {
  let total = 0;
  root.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      total += node.geometry?.attributes?.position?.count ?? 0;
    }
  });
  return total;
};

log3d('Debug activé', {
  dev: import.meta.env.DEV,
  debug3dFromQuery,
  debug3dFromStorage,
});
log3d('Conteneur canvas trouvé', {
  width: canvasContainer.clientWidth,
  height: canvasContainer.clientHeight,
});

// ---------------------------------------------------------------------------
// Scène, caméra, renderer
// ---------------------------------------------------------------------------

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.5, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
canvasContainer.appendChild(renderer.domElement);

log3d('Renderer initialisé', {
  width: window.innerWidth,
  height: window.innerHeight,
  pixelRatio: renderer.getPixelRatio(),
  alpha: false,
  sceneBackground: '#000000',
});
log3d('Caméra initialisée', {
  fov: camera.fov,
  near: camera.near,
  far: camera.far,
  position: camera.position.toArray(),
});

// ---------------------------------------------------------------------------
// Éclairage
// ---------------------------------------------------------------------------

const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.7);
keyLight.position.set(5, 6, 5);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.7);
fillLight.position.set(-4, 2, -4);
scene.add(fillLight);

// ---------------------------------------------------------------------------
// Groupe modèle 3D
// ---------------------------------------------------------------------------

const modelGroup = new THREE.Group();
scene.add(modelGroup);

// ---------------------------------------------------------------------------
// Presets de matériaux
// ---------------------------------------------------------------------------

interface MaterialPreset {
  color: string;
  roughness: number;
  metalness: number;
  emissive: string;
  emissiveIntensity: number;
}

const MATERIAL_PRESETS: Record<string, MaterialPreset> = {
  // Note : la couleur "black" correspond au corps beige/crème du MPD218 (nom hérité du .mtl Blender)
  black: {
    color: '#f1e1cc',
    roughness: 0.9,
    metalness: 0.03,
    emissive: '#313131',
    emissiveIntensity: 0,
  },
  black_gloss: {
    color: '#2b2b2b',
    roughness: 0.25,
    metalness: 0.25,
    emissive: '#2b2b2b',
    emissiveIntensity: 0,
  },
  'material.001': {
    color: '#2b2b2b',
    roughness: 0.45,
    metalness: 0.65,
    emissive: '#313131',
    emissiveIntensity: 0,
  },
  red_glow: {
    color: '#b41624',
    roughness: 0.4,
    metalness: 0.15,
    emissive: '#8f0f1d',
    emissiveIntensity: 1.1,
  },
  red_normal: {
    color: '#9b1420',
    roughness: 0.6,
    metalness: 0.08,
    emissive: '#1a0306',
    emissiveIntensity: 0.2,
  },
};

const getMaterialPreset = (name: string | undefined): MaterialPreset | null => {
  const normalized = (name ?? '').toLowerCase().trim();

  const directPreset = MATERIAL_PRESETS[normalized];
  if (directPreset) {
    return directPreset;
  }

  if (normalized.includes('red') && normalized.includes('glow')) {
    return MATERIAL_PRESETS.red_glow ?? null;
  }
  if (normalized.includes('red')) {
    return MATERIAL_PRESETS.red_normal ?? null;
  }
  if (normalized.includes('black') && normalized.includes('gloss')) {
    return MATERIAL_PRESETS.black_gloss ?? null;
  }
  if (normalized.includes('black')) {
    return MATERIAL_PRESETS.black ?? null;
  }
  if (normalized.includes('material')) {
    return MATERIAL_PRESETS['material.001'] ?? null;
  }

  return null;
};

// ---------------------------------------------------------------------------
// Traitement du modèle chargé
// ---------------------------------------------------------------------------

const ensureObjMeshVisibility = (root: THREE.Object3D): void => {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }

    if (!node.geometry.attributes.normal) {
      node.geometry.computeVertexNormals();
    }

    if (!node.material) {
      node.material = new THREE.MeshStandardMaterial({
        color: 0xbcbcbc,
        roughness: 0.7,
        metalness: 0.1,
      });
    }

    const materials: THREE.Material[] = Array.isArray(node.material)
      ? node.material
      : [node.material];

    materials.forEach((material) => {
      const preset = getMaterialPreset(material.name);

      const materialProps = material as THREE.Material & {
        color?: THREE.Color;
        roughness?: number;
        metalness?: number;
        emissive?: THREE.Color;
        emissiveIntensity?: number;
      };

      if (preset && materialProps.color) {
        materialProps.color.set(preset.color);

        if (typeof materialProps.roughness === 'number') {
          materialProps.roughness = preset.roughness;
        }

        if (typeof materialProps.metalness === 'number') {
          materialProps.metalness = preset.metalness;
        }

        if (materialProps.emissive) {
          materialProps.emissive.set(preset.emissive);
        }

        if (typeof materialProps.emissiveIntensity === 'number') {
          materialProps.emissiveIntensity = preset.emissiveIntensity;
        }
      } else if (materialProps.color) {
        materialProps.color.set('#e3d2bb');

        if (typeof materialProps.roughness === 'number') {
          materialProps.roughness = 0.72;
        }

        if (typeof materialProps.metalness === 'number') {
          materialProps.metalness = 0.1;
        }

        if (materialProps.emissive) {
          materialProps.emissive.set('#2a1b12');
        }

        if (typeof materialProps.emissiveIntensity === 'number') {
          materialProps.emissiveIntensity = 0.18;
        }
      }

      material.side = THREE.DoubleSide;
      material.needsUpdate = true;
    });

    node.castShadow = false;
    node.receiveShadow = false;
  });
};

interface MeshStat {
  node: THREE.Mesh;
  sorted: number[];
  mainArea: number;
  thickness: number;
  volume: number;
  areaRatio: number;
  volumeRatio: number;
  thinRatio: number;
  cubeRatio: number;
  name: string;
  vertexCount: number;
}

const removeBlenderArtifactMeshes = (root: THREE.Object3D): void => {
  const globalBox = new THREE.Box3().setFromObject(root);
  const globalSize = globalBox.getSize(new THREE.Vector3());
  const sortedGlobal = [globalSize.x, globalSize.y, globalSize.z].sort((a, b) => b - a);
  const [globalX = 0, globalY = 0, globalZ = 0] = sortedGlobal;
  const globalMainArea = globalX * globalY;
  const globalVolume = globalX * globalY * globalZ;

  if (!Number.isFinite(globalMainArea) || globalMainArea <= 0 || globalVolume <= 0) {
    return;
  }

  const meshStats: MeshStat[] = [];

  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }

    const meshBox = new THREE.Box3().setFromObject(node);
    if (meshBox.isEmpty()) {
      return;
    }

    const meshSize = meshBox.getSize(new THREE.Vector3());
    const sorted = [meshSize.x, meshSize.y, meshSize.z].sort((a, b) => b - a);
    const [meshX = 0, meshY = 0, meshZ = 0] = sorted;
    const mainArea = meshX * meshY;
    const thickness = meshZ;
    const volume = meshX * meshY * meshZ;

    if (!Number.isFinite(mainArea) || mainArea <= 0 || !Number.isFinite(volume) || volume <= 0) {
      return;
    }

    meshStats.push({
      node,
      sorted,
      mainArea,
      thickness,
      volume,
      areaRatio: mainArea / globalMainArea,
      volumeRatio: volume / globalVolume,
      thinRatio: thickness / Math.max(meshX, meshY, 1e-6),
      cubeRatio: meshZ / Math.max(meshX, 1e-6),
      name: (node.name ?? '').toLowerCase(),
      vertexCount: node.geometry?.attributes?.position?.count ?? 0,
    });
  });

  if (meshStats.length === 0) {
    return;
  }

  const removable: THREE.Mesh[] = [];

  meshStats.forEach((stat) => {
    const looksLikeNamedBackdrop = /(plane|background|backdrop|ground|floor|quad)/.test(stat.name);
    const isPlanarOutlier = stat.thinRatio < 0.01 && stat.areaRatio > 0.65;
    const isNamedBigPlanar =
      looksLikeNamedBackdrop && stat.areaRatio > 0.25 && stat.thinRatio < 0.08;

    if (isNamedBigPlanar || isPlanarOutlier) {
      removable.push(stat.node);
    }
  });

  if (removable.length === 0 || removable.length >= meshStats.length) {
    return;
  }

  removable.forEach((mesh) => {
    mesh.parent?.remove(mesh);
  });
};

// ---------------------------------------------------------------------------
// Nettoyage mémoire GPU
// ---------------------------------------------------------------------------

const disposeGroup = (group: THREE.Object3D): void => {
  group.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }

    node.geometry?.dispose();

    const materials: THREE.Material[] = Array.isArray(node.material)
      ? node.material
      : [node.material];

    materials.forEach((material) => {
      // Dispose des textures associées au matériau
      Object.values(material).forEach((value: unknown) => {
        if (value instanceof THREE.Texture) {
          value.dispose();
        }
      });
      material.dispose();
    });
  });

  if (group instanceof THREE.Group) {
    group.clear();
  }
};

// ---------------------------------------------------------------------------
// Finalisation et fallback
// ---------------------------------------------------------------------------

const finalizeLoadedModel = (model: THREE.Object3D): void => {
  const meshCountBefore = countMeshes(model);
  const verticesBefore = countVertices(model);
  log3d('Modèle OBJ reçu', {
    meshCountBefore,
    verticesBefore,
  });

  ensureObjMeshVisibility(model);

  const meshCountAfterMaterialPass = countMeshes(model);
  removeBlenderArtifactMeshes(model);

  const meshCountAfterCleanup = countMeshes(model);
  const verticesAfterCleanup = countVertices(model);
  log3d('Après préparation du modèle', {
    meshCountAfterMaterialPass,
    meshCountAfterCleanup,
    verticesAfterCleanup,
  });

  if (meshCountAfterCleanup === 0) {
    warn3d('Aucun mesh visible après nettoyage.');
  }

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);
  const targetDimension = 1.8;
  const scale = maxDimension > 0 ? targetDimension / maxDimension : 1;

  model.position.sub(center);
  model.scale.setScalar(scale);

  // Retourne le modèle de 180° pour qu'il fasse face à l'utilisateur
  model.rotation.y = Math.PI;

  disposeGroup(modelGroup);
  modelGroup.add(model);

  const fittedBox = new THREE.Box3().setFromObject(model);
  const fittedSize = fittedBox.getSize(new THREE.Vector3());
  const fittedCenter = fittedBox.getCenter(new THREE.Vector3());
  const boundingRadius = Math.max(fittedSize.x, fittedSize.y, fittedSize.z) * 0.5;
  const fovRad = (camera.fov * Math.PI) / 180;
  const cameraDistance = Math.max(2.8, (boundingRadius / Math.tan(fovRad / 2)) * 1.35);

  camera.near = Math.max(0.01, cameraDistance / 100);
  camera.far = Math.max(100, cameraDistance * 20);
  camera.updateProjectionMatrix();

  camera.position.set(fittedCenter.x, fittedCenter.y + boundingRadius * 0.35, cameraDistance);
  camera.lookAt(0, 0, 0);

  log3d('Modèle finalisé', {
    boxCenter: center.toArray(),
    boxSize: size.toArray(),
    scale,
    fittedCenter: fittedCenter.toArray(),
    fittedSize: fittedSize.toArray(),
    cameraDistance,
    cameraNear: camera.near,
    cameraFar: camera.far,
    cameraPosition: camera.position.toArray(),
    modelGroupChildren: modelGroup.children.length,
  });
};

const onModelLoadError = (error: unknown): void => {
  warn3d('Erreur de chargement OBJ, fallback activé', error);
  const fallbackGeometry = new THREE.BoxGeometry(2.5, 0.8, 1.7);
  const fallbackMaterial = new THREE.MeshStandardMaterial({
    color: 0xe6c8a6,
    roughness: 0.55,
    metalness: 0.1,
    emissive: 0x2a1208,
    emissiveIntensity: 0.25,
  });
  const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
  modelGroup.add(fallbackMesh);
};

// ---------------------------------------------------------------------------
// Chargement du modèle OBJ
// ---------------------------------------------------------------------------

const loader = new OBJLoader();
const onModelLoadProgress = (event: ProgressEvent<EventTarget>): void => {
  if (!DEBUG_3D) {
    return;
  }

  const hasTotal = Number.isFinite(event.total) && event.total > 0;
  const percent = hasTotal ? Math.round((event.loaded / event.total) * 100) : null;

  log3d('Progression chargement OBJ', {
    loaded: event.loaded,
    total: event.total,
    percent,
  });
};

log3d('Démarrage chargement OBJ', {
  url: mpd218ModelUrl,
});

loader.load(mpd218ModelUrl, finalizeLoadedModel, onModelLoadProgress, onModelLoadError);

// ---------------------------------------------------------------------------
// Rotation interactive (souris + tactile)
// ---------------------------------------------------------------------------

interface RotationAxes {
  x: number;
  y: number;
  z: number;
}

const BASE_ROTATION: Readonly<RotationAxes> = {
  x: 0.35,
  y: 0,
  z: 0,
} as const;

const targetRotation: RotationAxes = { ...BASE_ROTATION };
const currentRotation: RotationAxes = { ...BASE_ROTATION };

const HOVER_RANGE_Y = 0.08; // amplitude de rotation horizontale (axe Y)
const HOVER_RANGE_X = 0.15; // amplitude de rotation verticale (axe X)
const HOVER_RANGE_Z = 0.2; // amplitude de rotation latérale (axe Z)
const LERP_SPEED = 0.06; // fluidité du mouvement

const updateTargetRotation = (normalizedX: number, normalizedY: number): void => {
  targetRotation.y = BASE_ROTATION.y + normalizedX * HOVER_RANGE_Y;
  targetRotation.x = BASE_ROTATION.x + normalizedY * HOVER_RANGE_X;
  targetRotation.z = BASE_ROTATION.z - normalizedX * HOVER_RANGE_Z;
};

const resetTargetRotation = (): void => {
  targetRotation.x = BASE_ROTATION.x;
  targetRotation.y = BASE_ROTATION.y;
  targetRotation.z = BASE_ROTATION.z;
};

const onMouseMove = (event: MouseEvent): void => {
  const rect = canvasContainer.getBoundingClientRect();
  const normalizedX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const normalizedY = ((event.clientY - rect.top) / rect.height) * 2 - 1;
  updateTargetRotation(normalizedX, normalizedY);
};

const onTouchMove = (event: TouchEvent): void => {
  const touch = event.touches[0];
  if (!touch) {
    return;
  }
  const rect = canvasContainer.getBoundingClientRect();
  const normalizedX = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
  const normalizedY = ((touch.clientY - rect.top) / rect.height) * 2 - 1;
  updateTargetRotation(normalizedX, normalizedY);
};

canvasContainer.addEventListener('mousemove', onMouseMove);
canvasContainer.addEventListener('mouseleave', resetTargetRotation);
canvasContainer.addEventListener('touchmove', onTouchMove, { passive: true });
canvasContainer.addEventListener('touchend', resetTargetRotation);

// ---------------------------------------------------------------------------
// Boucle de rendu
// ---------------------------------------------------------------------------

let animationFrameId: number | null = null;
let renderFrameCount = 0;
let hasLoggedFirstRenderFrames = false;

const renderLoop = (): void => {
  renderFrameCount += 1;

  currentRotation.x += (targetRotation.x - currentRotation.x) * LERP_SPEED;
  currentRotation.y += (targetRotation.y - currentRotation.y) * LERP_SPEED;
  currentRotation.z += (targetRotation.z - currentRotation.z) * LERP_SPEED;

  modelGroup.rotation.x = currentRotation.x;
  modelGroup.rotation.y = currentRotation.y;
  modelGroup.rotation.z = currentRotation.z;

  if (DEBUG_3D && !hasLoggedFirstRenderFrames && renderFrameCount >= 30) {
    hasLoggedFirstRenderFrames = true;
    log3d('État rendu après 30 frames', {
      modelGroupChildren: modelGroup.children.length,
      meshCountInGroup: countMeshes(modelGroup),
      rendererInfo: {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        points: renderer.info.render.points,
        lines: renderer.info.render.lines,
      },
      cameraPosition: camera.position.toArray(),
      rotation: {
        x: modelGroup.rotation.x,
        y: modelGroup.rotation.y,
        z: modelGroup.rotation.z,
      },
    });
  }

  renderer.render(scene, camera);
  animationFrameId = window.requestAnimationFrame(renderLoop);
};

renderLoop();

// ---------------------------------------------------------------------------
// Redimensionnement
// ---------------------------------------------------------------------------

const onResize = (): void => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  log3d('Resize', {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: renderer.getPixelRatio(),
    cameraAspect: camera.aspect,
  });
};

window.addEventListener('resize', onResize);

// ---------------------------------------------------------------------------
// Nettoyage HMR (Vite)
// ---------------------------------------------------------------------------

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (animationFrameId !== null) {
      window.cancelAnimationFrame(animationFrameId);
    }

    canvasContainer.removeEventListener('mousemove', onMouseMove);
    canvasContainer.removeEventListener('mouseleave', resetTargetRotation);
    canvasContainer.removeEventListener('touchmove', onTouchMove);
    canvasContainer.removeEventListener('touchend', resetTargetRotation);
    window.removeEventListener('resize', onResize);

    disposeGroup(modelGroup);
    renderer.dispose();
    renderer.domElement.remove();
  });
}
