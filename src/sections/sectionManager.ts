import type { SectionContext, SectionLifecycle, SectionLoader } from './types';
import { emitTelemetry } from '../core/telemetry';
import { querySectionElement } from '../utils/dom';

export interface SectionManager {
  initialize: (loaders: SectionLoader[]) => Promise<void>;
  update: (deltaSeconds: number, elapsedSeconds: number) => void;
  dispose: () => void;
}

// Le sectionManager distingue deux modes d'initialisation des sections :
//
// - Sections "immédiates" : pas d'élément HTML dans le DOM (ex. : spacers, hero).
//   Elles sont initialisées au démarrage, avant même que l'utilisateur ne scrolle.
//
// - Sections "différées" : possèdent un élément HTML (data-section="…") dans la page.
//   Elles sont initialisées à la demande, via un IntersectionObserver qui surveille
//   leur entrée dans le viewport. Cela évite de charger inutilement les sections
//   qui ne seront peut-être jamais visitées.
//
// L'IntersectionObserver est un mécanisme natif du navigateur qui notifie quand
// un élément devient visible à l'écran, sans avoir besoin de vérifier en permanence.

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

// ── Helpers niveau module ──────────────────────────────────────────────────────

interface DeferredEntry {
  loader: SectionLoader;
  element: HTMLElement;
}

interface CategorizedLoaders {
  immediate: SectionLoader[];
  deferred: DeferredEntry[];
}

/**
 * Sépare les loaders en deux catégories :
 * - « immédiats » : aucun élément HTML correspondant dans le DOM → init dès le démarrage
 * - « différés »  : élément HTML trouvé → init retardée jusqu'à l'entrée dans le viewport
 */
const categorizeLoaders = (loaders: SectionLoader[]): CategorizedLoaders => {
  const immediate: SectionLoader[] = [];
  const deferred: DeferredEntry[] = [];

  for (const loader of loaders) {
    const element = querySectionElement(loader.id);
    if (element) {
      deferred.push({ loader, element });
    } else {
      immediate.push(loader);
    }
  }

  return { immediate, deferred };
};

/**
 * Crée un IntersectionObserver qui initialise les sections différées
 * dès qu'elles entrent dans le viewport (avec la marge définie par SECTION_OBSERVER_OPTIONS).
 */
const createDeferredSectionObserver = (
  remainingEntries: DeferredEntry[],
  onIntersect: (loader: SectionLoader) => Promise<void>,
): IntersectionObserver => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const target = entry.target as HTMLElement;
      const sectionId = target.dataset.section;

      if (!sectionId) {
        observer.unobserve(target);
        return;
      }

      const deferredEntry = remainingEntries.find(({ loader }) => loader.id === sectionId);

      if (!deferredEntry) {
        observer.unobserve(target);
        return;
      }

      observer.unobserve(target);

      void onIntersect(deferredEntry.loader).catch((error: unknown) => {
        console.error(
          `Échec de l'initialisation de la section ${deferredEntry.loader.id}.`,
          error,
        );
      });
    });
  }, SECTION_OBSERVER_OPTIONS);

  remainingEntries.forEach(({ element }) => {
    observer.observe(element);
  });

  return observer;
};

// ── Factory ────────────────────────────────────────────────────────────────────

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
      const { immediate, deferred } = categorizeLoaders(loaders);

      for (const loader of immediate) {
        await initializeSection(loader);
      }

      const eagerEntries = deferred.filter(({ element }) => isSectionNearViewport(element));

      for (const { loader } of eagerEntries) {
        await initializeSection(loader);
      }

      const remainingEntries = deferred.filter(
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

      sectionObserver = createDeferredSectionObserver(remainingEntries, initializeSection);

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
