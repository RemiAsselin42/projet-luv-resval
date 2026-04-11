// Gère le défilement de toute la page.
// Utilise Lenis pour un scroll fluide et GSAP ScrollTrigger pour les animations au scroll.
// Implémente aussi un "snap" : quand l'utilisateur scrolle vers une section,
// la page se cale automatiquement dessus.

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
  scrollToSection: (sectionId: string, minScrollY?: number) => void;
  registerSection: (element: HTMLElement) => void;
  unregisterSection: (element: HTMLElement) => void;
  stop: () => void;
  lock: () => void;
  start: () => void;
  dispose: () => void;
}

gsap.registerPlugin(ScrollTrigger);

const SNAP_COOLDOWN_MS = 450; // Durée minimale entre deux snaps consécutifs
const SNAP_ANCHOR_RATIO_DOWN = 0.7; // Sensibilité de snap vers le bas - 0 = pas de snap, 1 = snap dès que la section entre dans le viewport
const SNAP_ANCHOR_RATIO_UP = 0.7; // Sensibilité de snap vers le haut - 0 = pas de snap, 1 = snap dès que la section entre dans le viewport

/**
 * Renvoie l'index de la section qui se trouve sous le "point d'ancrage" du viewport.
 *
 * Le point d'ancrage est une position virtuelle dans la fenêtre (par ex. 70% de la hauteur)
 * qui se déplace avec le scroll. Quand ce point entre dans une section, cette section
 * devient "active" et le scroll s'y accroche automatiquement (effet snap).
 *
 * @param sectionElements Liste des éléments HTML de section, triés par position verticale
 * @param currentScrollY Position de scroll actuelle (pixels depuis le haut de la page)
 * @param isScrollingDown true si l'utilisateur scrolle vers le bas, false vers le haut
 * @returns Index de la section active, ou -1 si aucune section n'est trouvée
 */
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
  const sectionElements: HTMLElement[] = [];

  let scrollY = window.scrollY;
  let activeSectionIndex = -1;
  let isSnapping = false;
  let lastSnapTimestamp = 0;

  const emit = (): void => {
    listeners.forEach((listener) => listener(scrollY));
  };

  // isManualScrolling est activé pendant une navigation déclenchée par le menu CRT.
  // Il désactive temporairement le snap automatique pour éviter qu'il n'entre en conflit
  // avec le défilement programmé (lenis.scrollTo) vers la section cible.
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
      // scrollManager est le seul acteur autorisé à modifier document.body.style.overflow.
      // Bloque le scroll natif (overflow both axes) + Lenis pour qu'aucun scroll ne soit possible.
      document.body.style.overflow = 'hidden';
      lenis.stop();
      // Remet la page en haut : évite que le CRT du loader soit invisible au reload
      // quand la page était scrollée (ScrollTrigger applique setFade(0) si scroll > reliques).
      window.scrollTo(0, 0);
      scrollY = 0;
      ScrollTrigger.update();
    },
    lock: () => {
      // Gèle le scroll sans réinitialiser la position (usage : état crash outro).
      document.body.style.overflow = 'hidden';
      lenis.stop();
    },
    start: () => {
      // Supprime l'override inline pour laisser le CSS statique (overflow-x: hidden sur body)
      // reprendre le dessus, puis relance Lenis pour le scroll vertical.
      document.body.style.overflow = '';
      lenis.start();
    },
    scrollToSection: (sectionId: string, minScrollY?: number) => {
      const targetElement = querySectionElement(sectionId);

      if (!targetElement) {
        console.warn(`Section not found: ${sectionId}`);
        return;
      }

      const targetTop = Math.max(targetElement.offsetTop, minScrollY ?? 0);
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
    registerSection: (element: HTMLElement) => {
      if (!sectionElements.includes(element)) {
        sectionElements.push(element);
        sectionElements.sort((a, b) => a.offsetTop - b.offsetTop);
      }
    },
    unregisterSection: (element: HTMLElement) => {
      const index = sectionElements.indexOf(element);
      if (index !== -1) {
        sectionElements.splice(index, 1);
        if (activeSectionIndex >= sectionElements.length) {
          activeSectionIndex = sectionElements.length - 1;
        }
      }
    },
    dispose: () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      lenis.destroy();
      listeners.clear();
    },
  };
};
