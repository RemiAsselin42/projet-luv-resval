import * as THREE from 'three';
import { emitTelemetry } from '../../core/telemetry';

export interface ModelViewConfig {
  /** Dimension maximale cible en unités monde (défaut : 1.5) */
  targetDimension: number;
  /** Rotation initiale en radians */
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  /** Décalage vertical en unités monde */
  positionY: number;
}

const DEFAULT_VIEW_CONFIG: ModelViewConfig = {
  targetDimension: 1.5,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
  positionY: 0,
};

export interface GlbModelComponent {
  modelGroup: THREE.Group;
  loaded: Promise<void>;
  setVisible: (visible: boolean) => void;
  setOpacity: (opacity: number) => void;
  /** Scale uniforme relatif (1 = taille d'origine). Appliqué sur le groupe centré. */
  setScale: (factor: number) => void;
  dispose: () => void;
}

const disposeObject3D = (object: THREE.Object3D): void => {
  object.traverse((node) => {
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
};

interface DracoLoaderLike {
  setDecoderPath: (path: string) => void;
  setDecoderConfig: (config: { type: 'js' }) => void;
}

interface GltfLoaderLike {
  setDRACOLoader: (loader: DracoLoaderLike) => GltfLoaderLike;
  load: (
    url: string,
    onLoad: (gltf: { scene: THREE.Object3D }) => void,
    onProgress?: (event: ProgressEvent<EventTarget>) => void,
    onError?: (error: unknown) => void,
  ) => void;
}

interface ThreeExampleLoaders {
  GLTFLoader: new () => GltfLoaderLike;
  DRACOLoader: new () => DracoLoaderLike;
}

let sharedDracoLoader: DracoLoaderLike | null = null;
let sharedThreeExampleLoadersPromise: Promise<ThreeExampleLoaders> | null = null;

const DRACO_DECODER_PATHS = [
  `${import.meta.env.BASE_URL}draco/`,
  'https://www.gstatic.com/draco/versioned/decoders/1.5.7/',
  'https://www.gstatic.com/draco/v1/decoders/',
] as const;

const loadThreeExampleLoaders = async (): Promise<ThreeExampleLoaders> => {
  if (!sharedThreeExampleLoadersPromise) {
    sharedThreeExampleLoadersPromise = Promise.all([
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      import('three/examples/jsm/loaders/DRACOLoader.js'),
    ]).then(([gltfLoaderModule, dracoLoaderModule]) => {
      return {
        GLTFLoader: gltfLoaderModule.GLTFLoader as unknown as new () => GltfLoaderLike,
        DRACOLoader: dracoLoaderModule.DRACOLoader as unknown as new () => DracoLoaderLike,
      };
    });
  }

  return sharedThreeExampleLoadersPromise;
};

const getDracoLoader = async (): Promise<DracoLoaderLike> => {
  if (!sharedDracoLoader) {
    const { DRACOLoader } = await loadThreeExampleLoaders();
    sharedDracoLoader = new DRACOLoader();
    sharedDracoLoader.setDecoderPath(DRACO_DECODER_PATHS[0]);
    sharedDracoLoader.setDecoderConfig({ type: 'js' });
  }

  return sharedDracoLoader;
};

const buildModelFromGltf = (
  modelGroup: THREE.Group,
  gltf: { scene: THREE.Object3D },
  config: ModelViewConfig,
): void => {
  const model = gltf.scene;

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);
  const scale = maxDimension > 0 ? config.targetDimension / maxDimension : 1;

  model.scale.setScalar(scale);
  model.rotation.set(config.rotationX, config.rotationY, config.rotationZ);

  const scaledBox = new THREE.Box3().setFromObject(model);
  const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
  model.position.sub(scaledCenter);

  modelGroup.add(model);
  modelGroup.position.y = config.positionY;
};

const setMaterialsTransparentOnGroup = (modelGroup: THREE.Group): void => {
  modelGroup.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;

    const materials: THREE.Material[] = Array.isArray(node.material)
      ? node.material
      : [node.material];

    materials.forEach((material) => {
      material.transparent = true;
      material.needsUpdate = true;
    });
  });
};

const loadWithDracoFallback = (
  modelUrl: string,
  dracoPathIndex: number,
): Promise<{ scene: THREE.Object3D; decoderPath: string }> => {
  return (async () => {
    const decoderPath = DRACO_DECODER_PATHS[dracoPathIndex];
    if (!decoderPath) {
      throw new Error('Aucun chemin de fallback Draco disponible.');
    }

    const [{ GLTFLoader }, dracoLoader] = await Promise.all([
      loadThreeExampleLoaders(),
      getDracoLoader(),
    ]);

    dracoLoader.setDecoderPath(decoderPath);

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    return await new Promise<{ scene: THREE.Object3D; decoderPath: string }>((resolve, reject) => {
      gltfLoader.load(
        modelUrl,
        (gltf) => {
          resolve({ scene: gltf.scene, decoderPath });
        },
        undefined,
        (error: unknown) => {
          const hasNextFallback = dracoPathIndex + 1 < DRACO_DECODER_PATHS.length;

          if (hasNextFallback) {
            void loadWithDracoFallback(modelUrl, dracoPathIndex + 1)
              .then(resolve)
              .catch(reject);
            return;
          }

          reject(error instanceof Error ? error : new Error(String(error)));
        },
      );
    });
  })();
};

export const createGlbModelComponent = (
  scene: THREE.Scene,
  modelUrl: string,
  viewConfig: Partial<ModelViewConfig> = {},
): GlbModelComponent => {
  const config: ModelViewConfig = { ...DEFAULT_VIEW_CONFIG, ...viewConfig };
  const modelGroup = new THREE.Group();
  modelGroup.visible = false;
  scene.add(modelGroup);

  const loaded = new Promise<void>((resolve, reject) => {
    const loadStart = performance.now();

    void loadWithDracoFallback(modelUrl, 0)
      .then((gltf) => {
        buildModelFromGltf(modelGroup, gltf, config);
        setMaterialsTransparentOnGroup(modelGroup);

        emitTelemetry({
          category: 'model_load',
          name: 'glb_model_loaded',
          status: 'success',
          durationMs: performance.now() - loadStart,
          meta: {
            modelUrl,
            decoderPath: gltf.decoderPath,
          },
        });

        resolve();
      })
      .catch((error: unknown) => {
        console.error(`Échec du chargement du modèle GLB : ${modelUrl}`, error);

        emitTelemetry({
          category: 'model_load',
          name: 'glb_model_loaded',
          status: 'error',
          durationMs: performance.now() - loadStart,
          meta: {
            modelUrl,
            error: error instanceof Error ? error.message : String(error),
          },
        });

        reject(error instanceof Error ? error : new Error(String(error)));
      });
  });

  const setOpacity = (opacity: number): void => {
    const clamped = Math.max(0, Math.min(1, opacity));
    modelGroup.visible = clamped > 0;

    modelGroup.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;

      const materials: THREE.Material[] = Array.isArray(node.material)
        ? node.material
        : [node.material];

      materials.forEach((material) => {
        (material as THREE.Material & { opacity: number }).opacity = clamped;
      });
    });
  };

  const setScale = (factor: number): void => {
    modelGroup.scale.setScalar(factor);
  };

  return {
    modelGroup,
    loaded,
    setVisible: (visible: boolean) => {
      modelGroup.visible = visible;
    },
    setOpacity,
    setScale,
    dispose: () => {
      disposeObject3D(modelGroup);
      modelGroup.clear();
      scene.remove(modelGroup);
    },
  };
};
