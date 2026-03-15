import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createSectionManager } from './sectionManager';
import type { SectionContext, SectionLoader } from './types';

class IntersectionObserverMock {
  static instances: IntersectionObserverMock[] = [];

  readonly callback: IntersectionObserverCallback;
  readonly observed = new Set<Element>();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    IntersectionObserverMock.instances.push(this);
  }

  observe = (target: Element): void => {
    this.observed.add(target);
  };

  unobserve = (target: Element): void => {
    this.observed.delete(target);
  };

  disconnect = (): void => {
    this.observed.clear();
  };

  trigger = (target: Element, isIntersecting: boolean): void => {
    const entry = {
      target,
      isIntersecting,
      intersectionRatio: isIntersecting ? 1 : 0,
      boundingClientRect: target.getBoundingClientRect(),
      intersectionRect: target.getBoundingClientRect(),
      rootBounds: null,
      time: Date.now(),
    } as IntersectionObserverEntry;

    this.callback([entry], this as unknown as IntersectionObserver);
  };
}

const createTestContext = () => {
  const refresh = vi.fn();
  const preloadSectionOnce: SectionContext['assetLoader']['preloadSectionOnce'] = async <T>(
    _key: string,
    importer: () => Promise<T>,
  ) => importer();

  const context: SectionContext = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    renderer: {} as THREE.WebGLRenderer,
    canvasContainer: document.createElement('div'),
    scrollManager: {
      update: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
      createSectionTimeline: vi.fn(() => null),
      createTrigger: vi.fn(),
      refresh,
      getScrollY: vi.fn(() => 0),
      scrollToSection: vi.fn(),
      stop: vi.fn(),
      start: vi.fn(),
      dispose: vi.fn(),
    },
    assetLoader: {
      preloadSectionOnce,
      dispose: vi.fn(),
    },
  };

  return {
    context,
    refresh,
  };
};

const createLoader = (
  id: string,
  events: string[],
  options: { delayMs?: number } = {},
): SectionLoader => {
  return {
    id,
    load: async () => {
      if (options.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      }

      return () => {
        events.push(`init:${id}`);

        return {
          update: () => {
            return;
          },
          dispose: () => {
            events.push(`dispose:${id}`);
          },
        };
      };
    },
  };
};

describe('sectionManager integration', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    IntersectionObserverMock.instances = [];
    vi.restoreAllMocks();

    vi.stubGlobal(
      'IntersectionObserver',
      IntersectionObserverMock as unknown as typeof IntersectionObserver,
    );
  });

  it('initialise les sections proches dans l’ordre du registre', async () => {
    const events: string[] = [];
    const { context } = createTestContext();

    const hero = document.createElement('section');
    hero.dataset.section = 'hero';
    hero.getBoundingClientRect = () => ({
      top: 0,
      bottom: 400,
      left: 0,
      right: 0,
      width: 100,
      height: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    const face = document.createElement('section');
    face.dataset.section = 'face-vader';
    face.getBoundingClientRect = () => ({
      top: 200,
      bottom: 600,
      left: 0,
      right: 0,
      width: 100,
      height: 400,
      x: 0,
      y: 200,
      toJSON: () => ({}),
    });

    document.body.append(hero, face);

    const sectionManager = createSectionManager(context);
    await sectionManager.initialize([
      createLoader('hero', events, { delayMs: 5 }),
      createLoader('face-vader', events),
    ]);

    expect(events).toEqual(['init:hero', 'init:face-vader']);
  });

  it('évite la double initialisation d’une même section', async () => {
    const events: string[] = [];
    const { context } = createTestContext();

    const face = document.createElement('section');
    face.dataset.section = 'face-vader';
    face.getBoundingClientRect = () => ({
      top: 2000,
      bottom: 2400,
      left: 0,
      right: 0,
      width: 100,
      height: 400,
      x: 0,
      y: 2000,
      toJSON: () => ({}),
    });

    document.body.append(face);

    const sectionManager = createSectionManager(context);
    await sectionManager.initialize([createLoader('face-vader', events)]);

    const observer = IntersectionObserverMock.instances[0];
    expect(observer).toBeDefined();

    observer?.trigger(face, true);
    observer?.trigger(face, true);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(events.filter((event) => event === 'init:face-vader')).toHaveLength(1);
  });

  it('dispose les sections dans l’ordre inverse et nettoie l’observer', async () => {
    const events: string[] = [];
    const { context } = createTestContext();

    const hero = document.createElement('section');
    hero.dataset.section = 'hero';
    hero.getBoundingClientRect = () => ({
      top: 0,
      bottom: 400,
      left: 0,
      right: 0,
      width: 100,
      height: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    const face = document.createElement('section');
    face.dataset.section = 'face-vader';
    face.getBoundingClientRect = () => ({
      top: 100,
      bottom: 500,
      left: 0,
      right: 0,
      width: 100,
      height: 400,
      x: 0,
      y: 100,
      toJSON: () => ({}),
    });

    document.body.append(hero, face);

    const sectionManager = createSectionManager(context);
    await sectionManager.initialize([
      createLoader('hero', events),
      createLoader('face-vader', events),
    ]);

    sectionManager.dispose();
    expect(events).toEqual(['init:hero', 'init:face-vader', 'dispose:face-vader', 'dispose:hero']);
    expect(IntersectionObserverMock.instances[0]?.observed.size ?? 0).toBe(0);
  });
});
