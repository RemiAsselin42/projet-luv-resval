import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { querySectionElement } from '../utils/dom';

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
  scrollToSection: (sectionId: string) => void;
  stop: () => void;
  start: () => void;
  dispose: () => void;
}

gsap.registerPlugin(ScrollTrigger);

const SNAP_COOLDOWN_MS = 450; // Durée minimale entre deux snaps consécutifs
const SNAP_ANCHOR_RATIO_DOWN = 0.7; // Sensibilité de snap vers le bas - 0 = pas de snap, 1 = snap dès que la section entre dans le viewport
const SNAP_ANCHOR_RATIO_UP = 0.7; // Sensibilité de snap vers le haut - 0 = pas de snap, 1 = snap dès que la section entre dans le viewport

const getSectionIndexAtViewportAnchor = (
  sectionElements: HTMLElement[],
  currentScrollY: number,
  isScrollingDown: boolean,
): number => {
  if (sectionElements.length === 0) return -1;

  const anchorRatio = isScrollingDown ? SNAP_ANCHOR_RATIO_DOWN : SNAP_ANCHOR_RATIO_UP;
  const viewportAnchor = currentScrollY + window.innerHeight * anchorRatio;

  for (const [index, section] of sectionElements.entries()) {
    const top = section.offsetTop;
    const bottom = top + section.offsetHeight;

    if (viewportAnchor >= top && viewportAnchor < bottom) {
      return index;
    }
  }

  return sectionElements.length - 1;
};

const createSectionTimeline = (options: SectionTimelineOptions): gsap.core.Timeline | null => {
  const sectionElement = querySectionElement(options.sectionId);

  if (!sectionElement) return null;

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

const createTrigger = (options: ScrollTrigger.Vars): ScrollTrigger =>
  ScrollTrigger.create(options);

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

  let isManualScrolling = false;

  const snapToSectionIfNeeded = (currentScrollY: number, isScrollingDown: boolean): void => {
    // Ne pas snapper si on est en scroll manuel (clic menu)
    if (isManualScrolling) {
      return;
    }

    const sectionIndex = getSectionIndexAtViewportAnchor(sectionElements, currentScrollY, isScrollingDown);

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
    const previousScrollY = scrollY;
    scrollY = event.scroll;
    const isScrollingDown = scrollY >= previousScrollY;
    snapToSectionIfNeeded(scrollY, isScrollingDown);
    emit();
    ScrollTrigger.update();
  });

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
    stop: () => {
      // Bloque Lenis en premier pour qu'il n'intercepte pas le scrollTo suivant.
      lenis.stop();
      // Remet la page en haut : évite que le CRT du loader soit invisible au reload
      // quand la page était scrollée (ScrollTrigger applique setFade(0) si scroll > reliques).
      window.scrollTo(0, 0);
      scrollY = 0;
      ScrollTrigger.update();
    },
    start: () => {
      lenis.start();
    },
    scrollToSection: (sectionId: string) => {
      const targetElement = querySectionElement(sectionId);

      if (!targetElement) {
        console.warn(`Section not found: ${sectionId}`);
        return;
      }

      const targetTop = targetElement.offsetTop;
      const targetIndex = sectionElements.findIndex((el) => el === targetElement);

      // Bypass temporairement le système de snap
      isManualScrolling = true;
      isSnapping = true;
      lastSnapTimestamp = window.performance.now();

      if (targetIndex !== -1) {
        activeSectionIndex = targetIndex;
      }

      lenis.scrollTo(targetTop, {
        duration: 1.2,
        force: true,
        lock: true,
        easing: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
        onComplete: () => {
          isSnapping = false;
          isManualScrolling = false;
        },
      });
    },
    dispose: () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      lenis.destroy();
      listeners.clear();
    },
  };
};
