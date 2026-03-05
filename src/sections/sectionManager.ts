import type { SectionContext, SectionLifecycle, SectionLoader } from './types';

export interface SectionManager {
  initialize: (loaders: SectionLoader[]) => Promise<void>;
  update: (deltaSeconds: number, elapsedSeconds: number) => void;
  dispose: () => void;
}

export const createSectionManager = (context: SectionContext): SectionManager => {
  const lifecycles: SectionLifecycle[] = [];

  return {
    initialize: async (loaders: SectionLoader[]): Promise<void> => {
      for (const loader of loaders) {
        const initializer = await context.assetLoader.preloadSectionOnce(loader.id, loader.load);
        const lifecycle = await initializer(context);
        lifecycles.push(lifecycle);
      }
    },
    update: (deltaSeconds: number, elapsedSeconds: number): void => {
      lifecycles.forEach((lifecycle) => lifecycle.update(deltaSeconds, elapsedSeconds));
    },
    dispose: (): void => {
      for (let index = lifecycles.length - 1; index >= 0; index -= 1) {
        lifecycles[index]?.dispose();
      }

      lifecycles.length = 0;
    },
  };
};
