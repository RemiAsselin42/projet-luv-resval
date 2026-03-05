import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

type ScrollListener = (scrollY: number) => void;

interface LenisScrollEvent {
  scroll: number;
}

export interface SectionTimelineOptions {
  sectionId: string;
  start?: string;
  end?: string;
  scrub?: boolean | number;
  markers?: boolean;
  once?: boolean;
}

export interface ScrollManager {
  update: (time: number) => void;
  subscribe: (listener: ScrollListener) => () => void;
  createSectionTimeline: (options: SectionTimelineOptions) => gsap.core.Timeline | null;
  createTrigger: (options: ScrollTrigger.Vars) => ScrollTrigger;
  refresh: () => void;
  getScrollY: () => number;
  dispose: () => void;
}

gsap.registerPlugin(ScrollTrigger);

const SNAP_COOLDOWN_MS = 500;

export const createScrollManager = (): ScrollManager => {
  const listeners = new Set<ScrollListener>();
  const lenis = new Lenis({
    autoRaf: false,
    smoothWheel: true,
    lerp: 0.1,
    syncTouch: true,
  });
  const sectionElements = Array.from(
    document.querySelectorAll<HTMLElement>('.experience-section[data-section]'),
  );

  let scrollY = window.scrollY;
  let activeSectionIndex = -1;
  let isSnapping = false;
  let lastSnapTimestamp = 0;

  const emit = (): void => {
    listeners.forEach((listener) => listener(scrollY));
  };

  const getSectionIndexAtViewportCenter = (currentScrollY: number): number => {
    if (sectionElements.length === 0) {
      return -1;
    }

    const viewportCenter = currentScrollY + window.innerHeight * 0.5;

    for (const [index, section] of sectionElements.entries()) {
      const top = section.offsetTop;
      const bottom = top + section.offsetHeight;

      if (viewportCenter >= top && viewportCenter < bottom) {
        return index;
      }
    }

    return sectionElements.length - 1;
  };

  const snapToSectionIfNeeded = (currentScrollY: number): void => {
    const sectionIndex = getSectionIndexAtViewportCenter(currentScrollY);

    if (sectionIndex === -1) {
      return;
    }

    if (activeSectionIndex === -1) {
      activeSectionIndex = sectionIndex;
      return;
    }

    if (sectionIndex === activeSectionIndex || isSnapping) {
      return;
    }

    const now = window.performance.now();

    if (now - lastSnapTimestamp < SNAP_COOLDOWN_MS) {
      activeSectionIndex = sectionIndex;
      return;
    }

    const targetSection = sectionElements[sectionIndex];
    const targetTop = targetSection?.offsetTop;

    if (targetTop === undefined) {
      activeSectionIndex = sectionIndex;
      return;
    }

    isSnapping = true;
    activeSectionIndex = sectionIndex;
    lastSnapTimestamp = now;

    lenis.scrollTo(targetTop, {
      duration: 0.7,
      force: true,
      lock: true,
      onComplete: () => {
        isSnapping = false;
      },
    });
  };

  lenis.on('scroll', (event: LenisScrollEvent) => {
    scrollY = event.scroll;
    snapToSectionIfNeeded(scrollY);
    emit();
    ScrollTrigger.update();
  });

  const createSectionTimeline = (options: SectionTimelineOptions): gsap.core.Timeline | null => {
    const sectionElement = document.querySelector<HTMLElement>(
      `[data-section="${options.sectionId}"]`,
    );

    if (!sectionElement) {
      return null;
    }

    return gsap.timeline({
      scrollTrigger: {
        trigger: sectionElement,
        start: options.start ?? 'top 80%',
        end: options.end ?? 'bottom top',
        scrub: options.scrub ?? true,
        markers: options.markers ?? false,
        once: options.once,
      },
    });
  };

  const createTrigger = (options: ScrollTrigger.Vars): ScrollTrigger => {
    return ScrollTrigger.create(options);
  };

  return {
    update: (time: number) => {
      lenis.raf(time);
    },
    subscribe: (listener: ScrollListener) => {
      listeners.add(listener);
      listener(scrollY);

      return () => {
        listeners.delete(listener);
      };
    },
    createSectionTimeline,
    createTrigger,
    refresh: () => {
      ScrollTrigger.refresh();
    },
    getScrollY: () => scrollY,
    dispose: () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      lenis.destroy();
      listeners.clear();
    },
  };
};
