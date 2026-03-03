import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import mpd218ModelUrl from '../../3d-models/MPD218.obj?url';

interface MaterialPreset {
  color: string;
  roughness: number;
  metalness: number;
  emissive: string;
  emissiveIntensity: number;
}

const MATERIAL_PRESETS: Record<string, MaterialPreset> = {
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

const MODEL_VIEW_CONFIG = {
  targetDimension: 1,
  objectRotationX: 0.5,
  objectRotationY: Math.PI * 5,
  objectRotationZ: 0,
  minCameraDistance: 2.8,
  cameraDistancePadding: 1.35,
  cameraHeightFactor: 0.35,
} as const;

interface MeshStat {
  node: THREE.Mesh;
  mainArea: number;
  thickness: number;
  volume: number;
  areaRatio: number;
  thinRatio: number;
  name: string;
}

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
      mainArea,
      thickness,
      volume,
      areaRatio: mainArea / globalMainArea,
      thinRatio: thickness / Math.max(meshX, meshY, 1e-6),
      name: (node.name ?? '').toLowerCase(),
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

const addFallbackMesh = (modelGroup: THREE.Group): void => {
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

const finalizeLoadedModel = (
  model: THREE.Object3D,
  modelGroup: THREE.Group,
  camera: THREE.PerspectiveCamera,
): void => {
  ensureObjMeshVisibility(model);
  removeBlenderArtifactMeshes(model);

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);
  const scale = maxDimension > 0 ? MODEL_VIEW_CONFIG.targetDimension / maxDimension : 1;

  model.position.sub(center);
  model.scale.setScalar(scale);
  model.rotation.x = MODEL_VIEW_CONFIG.objectRotationX;
  model.rotation.y = MODEL_VIEW_CONFIG.objectRotationY;
  model.rotation.z = MODEL_VIEW_CONFIG.objectRotationZ;

  disposeGroup(modelGroup);
  modelGroup.add(model);

  const fittedBox = new THREE.Box3().setFromObject(model);
  const fittedSize = fittedBox.getSize(new THREE.Vector3());
  const fittedCenter = fittedBox.getCenter(new THREE.Vector3());
  const boundingRadius = Math.max(fittedSize.x, fittedSize.y, fittedSize.z) * 0.5;
  const fovRad = (camera.fov * Math.PI) / 180;
  const cameraDistance = Math.max(
    MODEL_VIEW_CONFIG.minCameraDistance,
    (boundingRadius / Math.tan(fovRad / 2)) * MODEL_VIEW_CONFIG.cameraDistancePadding,
  );

  camera.near = Math.max(0.01, cameraDistance / 100);
  camera.far = Math.max(100, cameraDistance * 20);
  camera.updateProjectionMatrix();

  camera.position.set(
    fittedCenter.x,
    fittedCenter.y + boundingRadius * MODEL_VIEW_CONFIG.cameraHeightFactor,
    cameraDistance,
  );
  camera.lookAt(0, 0, 0);
};

interface Mpd218ModelComponent {
  modelGroup: THREE.Group;
  dispose: () => void;
}

export const createMpd218ModelComponent = (
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): Mpd218ModelComponent => {
  const modelGroup = new THREE.Group();
  scene.add(modelGroup);

  const loader = new OBJLoader();
  loader.load(
    mpd218ModelUrl,
    (model) => finalizeLoadedModel(model, modelGroup, camera),
    undefined,
    () => addFallbackMesh(modelGroup),
  );

  return {
    modelGroup,
    dispose: () => {
      disposeGroup(modelGroup);
      scene.remove(modelGroup);
    },
  };
};
