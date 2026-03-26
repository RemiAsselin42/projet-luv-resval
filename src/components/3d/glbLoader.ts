import * as THREE from 'three';
import { publicUrl } from '../../utils/publicUrl';

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

const DRACO_DECODER_PATHS = [
  publicUrl('draco/'),
  'https://www.gstatic.com/draco/versioned/decoders/1.5.7/',
  'https://www.gstatic.com/draco/v1/decoders/',
] as const;

let sharedThreeExampleLoadersPromise: Promise<ThreeExampleLoaders> | null = null;

const loadThreeExampleLoaders = async (): Promise<ThreeExampleLoaders> => {
  if (!sharedThreeExampleLoadersPromise) {
    sharedThreeExampleLoadersPromise = Promise.all([
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      import('three/examples/jsm/loaders/DRACOLoader.js'),
    ]).then(([gltfLoaderModule, dracoLoaderModule]) => ({
      GLTFLoader: gltfLoaderModule.GLTFLoader as unknown as new () => GltfLoaderLike,
      DRACOLoader: dracoLoaderModule.DRACOLoader as unknown as new () => DracoLoaderLike,
    }));
  }

  return sharedThreeExampleLoadersPromise;
};

const createDracoLoader = async (decoderPath: string): Promise<DracoLoaderLike> => {
  const { DRACOLoader } = await loadThreeExampleLoaders();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(decoderPath);
  dracoLoader.setDecoderConfig({ type: 'js' });
  return dracoLoader;
};

export const loadGlbWithDracoFallback = (
  modelUrl: string,
  dracoPathIndex: number = 0,
): Promise<{ scene: THREE.Object3D; decoderPath: string }> => {
  return (async () => {
    const decoderPath = DRACO_DECODER_PATHS[dracoPathIndex];
    if (!decoderPath) {
      throw new Error('Aucun chemin de fallback Draco disponible.');
    }

    const [{ GLTFLoader }, dracoLoader] = await Promise.all([
      loadThreeExampleLoaders(),
      createDracoLoader(decoderPath),
    ]);

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
            void loadGlbWithDracoFallback(modelUrl, dracoPathIndex + 1)
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
