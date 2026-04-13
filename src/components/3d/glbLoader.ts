// Charge un fichier 3D au format GLB (modèles compressés).
// Utilise le décodeur DRACO pour les modèles optimisés.
// Si le décodeur local est indisponible, bascule automatiquement sur
// des serveurs de secours (CDN Google) pour garantir le chargement.

import * as THREE from 'three';
import { publicUrl } from '../../utils/publicUrl';

interface DracoLoaderLike {
  setDecoderPath: (path: string) => void;
  setDecoderConfig: (config: { type: 'js' }) => void;
}

interface GltfLoaderLike {
  setDRACOLoader: (loader: DracoLoaderLike) => GltfLoaderLike;
  register: (callback: (parser: unknown) => { name: string }) => GltfLoaderLike;
  load: (
    url: string,
    onLoad: (gltf: { scene: THREE.Object3D; animations: THREE.AnimationClip[] }) => void,
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

/** Cache URL → promesse de chargement. Évite les doubles téléchargements entre preload et section. */
const glbCache = new Map<string, Promise<{ scene: THREE.Object3D; animations: THREE.AnimationClip[]; decoderPath: string }>>();

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
): Promise<{ scene: THREE.Object3D; animations: THREE.AnimationClip[]; decoderPath: string }> => {
  // Retourner la promesse en cache si disponible (les retries internes contournent le cache).
  if (dracoPathIndex === 0) {
    const cached = glbCache.get(modelUrl);
    if (cached) return cached;
  }

  const promise = (async () => {
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
    // Enregistrer un plugin no-op pour KHR_materials_pbrSpecularGlossiness.
    // Cette extension a été retirée de THREE r152+ ; sans ce handler le loader
    // émet un warning pour chaque GLB qui l'utilise. Les matériaux sont chargés
    // avec le fallback MeshStandardMaterial de THREE (comportement inchangé).
    gltfLoader.register(() => ({ name: 'KHR_materials_pbrSpecularGlossiness' }));

    return await new Promise<{ scene: THREE.Object3D; animations: THREE.AnimationClip[]; decoderPath: string }>((resolve, reject) => {
      gltfLoader.load(
        modelUrl,
        (gltf) => {
          resolve({ scene: gltf.scene, animations: gltf.animations, decoderPath });
        },
        undefined,
        (error: unknown) => {
          const hasNextFallback = dracoPathIndex + 1 < DRACO_DECODER_PATHS.length;

          if (hasNextFallback) {
            void loadGlbWithDracoFallback(modelUrl, dracoPathIndex + 1)
              .then((result) => resolve(result))
              .catch(reject);
            return;
          }

          reject(error instanceof Error ? error : new Error(String(error)));
        },
      );
    });
  })();

  if (dracoPathIndex === 0) {
    // Mettre en cache ; retirer si échec pour permettre un retry ultérieur.
    glbCache.set(modelUrl, promise);
    promise.catch(() => glbCache.delete(modelUrl));
  }

  return promise;
};
