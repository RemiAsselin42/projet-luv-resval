import type { SectionContext, SectionLifecycle, SectionLoader } from './types';
import { emitTelemetry } from '../core/telemetry';

export interface SectionManager {
  initialize: (loaders: SectionLoader[]) => Promise<void>;
  update: (deltaSeconds: number, elapsedSeconds: number) => void;
  dispose: () => void;
}

// Marge de préchargement : déclenche l'init 120% de la hauteur viewport avant/après.
const SECTION_OBSERVER_OPTIONS: IntersectionObserverInit = {
  root: null,
  rootMargin: '120% 0px 120% 0px',
  threshold: 0.01,
};

const isSectionNearViewport = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const preloadTop = -viewportHeight * 0.5;
  const preloadBottom = viewportHeight * 1.5;

  return rect.bottom >= preloadTop && rect.top <= preloadBottom;
};

export const createSectionManager = (context: SectionContext): SectionManager => {
  const lifecycles: SectionLifecycle[] = [];
  const initializedSectionIds = new Set<string>();
  let sectionObserver: IntersectionObserver | null = null;

  const initializeSection = async (loader: SectionLoader): Promise<void> => {
    if (initializedSectionIds.has(loader.id)) {
      return;
    }

    const initStart = performance.now();
    initializedSectionIds.add(loader.id);

    try {
      const initializer = await context.assetLoader.preloadSectionOnce(loader.id, loader.load);
      const lifecycle = await initializer(context);
      lifecycles.push(lifecycle);
      context.scrollManager.refresh();

      emitTelemetry({
        category: 'section_init',
        name: 'section_initialized',
        status: 'success',
        durationMs: performance.now() - initStart,
        meta: {
          sectionId: loader.id,
        },
      });
    } catch (error: unknown) {
      initializedSectionIds.delete(loader.id);

      emitTelemetry({
        category: 'section_init',
        name: 'section_initialized',
        status: 'error',
        durationMs: performance.now() - initStart,
        meta: {
          sectionId: loader.id,
          error: error instanceof Error ? error.message : String(error),
        },
      });

      throw error;
    }
  };

  return {
    initialize: async (loaders: SectionLoader[]): Promise<void> => {
      const deferredEntries: Array<{ loader: SectionLoader; element: HTMLElement }> = [];

      for (const loader of loaders) {
        const sectionElement = document.querySelector<HTMLElement>(`[data-section="${loader.id}"]`);

        if (!sectionElement) {
          await initializeSection(loader);
          continue;
        }

        deferredEntries.push({ loader, element: sectionElement });
      }

      const eagerEntries = deferredEntries.filter(({ element }) => isSectionNearViewport(element));

      for (const { loader } of eagerEntries) {
        await initializeSection(loader);
      }

      const remainingEntries = deferredEntries.filter(
        ({ loader }) => !initializedSectionIds.has(loader.id),
      );

      if (remainingEntries.length === 0) {
        return;
      }

      if (!('IntersectionObserver' in window)) {
        for (const { loader } of remainingEntries) {
          await initializeSection(loader);
        }

        return;
      }

      sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const target = entry.target as HTMLElement;
          const sectionId = target.dataset.section;

          if (!sectionId) {
            sectionObserver?.unobserve(target);
            return;
          }

          const deferredEntry = remainingEntries.find(({ loader }) => loader.id === sectionId);

          if (!deferredEntry) {
            sectionObserver?.unobserve(target);
            return;
          }

          sectionObserver?.unobserve(target);

          void initializeSection(deferredEntry.loader).catch((error: unknown) => {
            console.error(
              `Échec de l'initialisation de la section ${deferredEntry.loader.id}.`,
              error,
            );
          });
        });
      }, SECTION_OBSERVER_OPTIONS);

      remainingEntries.forEach(({ element }) => {
        sectionObserver?.observe(element);
      });

      emitTelemetry({
        category: 'section_init',
        name: 'section_observer_ready',
        status: 'info',
        meta: {
          deferredCount: remainingEntries.length,
        },
      });
    },
    update: (deltaSeconds: number, elapsedSeconds: number): void => {
      lifecycles.forEach((lifecycle) => lifecycle.update(deltaSeconds, elapsedSeconds));
    },
    dispose: (): void => {
      sectionObserver?.disconnect();
      sectionObserver = null;

      for (let index = lifecycles.length - 1; index >= 0; index -= 1) {
        lifecycles[index]?.dispose();
      }

      lifecycles.length = 0;
      initializedSectionIds.clear();
    },
  };
};
