// Système de cache pour le chargement des sections.
// Garantit que le code JavaScript de chaque section n'est téléchargé et exécuté
// qu'une seule fois, même si plusieurs parties du code en font la demande en même temps.

export interface AssetLoader {
  preloadSectionOnce: <T>(key: string, importer: () => Promise<T>) => Promise<T>;
  dispose: () => void;
}

export const createAssetLoader = (): AssetLoader => {
  const sectionCache = new Map<string, Promise<unknown>>();

  const preloadSectionOnce = <T>(key: string, importer: () => Promise<T>): Promise<T> => {
    const existingPromise = sectionCache.get(key);

    if (existingPromise) {
      return existingPromise as Promise<T>;
    }

    const nextPromise = importer();
    sectionCache.set(key, nextPromise as Promise<unknown>);

    return nextPromise;
  };

  return {
    preloadSectionOnce,
    dispose: () => {
      sectionCache.clear();
    },
  };
};
