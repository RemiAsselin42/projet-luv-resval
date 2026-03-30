import gsap from 'gsap';
import type { ReliqueData } from '../data/reliques-data';

export type SelectionListener = (relique: ReliqueData) => void;

export interface ObjectSelector {
  selectById: (id: string) => void;
  dispose: () => void;
}

const DRAW_DURATION = 1.1; // seconds for ink draw animation

/**
 * Computes stroke-dasharray for an SVG element's paths by measuring total path lengths.
 * This allows the ink-draw animation to work regardless of path complexity.
 */
const initInkPaths = (svgEl: SVGSVGElement): void => {
  const paths = svgEl.querySelectorAll<SVGGeometryElement>('path, circle, ellipse, rect, line');
  paths.forEach((path) => {
    const length = path.getTotalLength?.() ?? 200;
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;
  });
};

/**
 * Animates all paths in the SVG using GSAP stroke-dashoffset trick.
 */
const playInkDraw = (svgEl: SVGSVGElement, onComplete?: () => void): gsap.core.Timeline => {
  const paths = Array.from(
    svgEl.querySelectorAll<SVGGeometryElement>('path, circle, ellipse, rect, line'),
  );

  // Reset before animating
  paths.forEach((p) => {
    const length = parseFloat(p.style.strokeDasharray) || 200;
    p.style.strokeDashoffset = `${length}`;
  });

  return gsap.timeline({ onComplete }).to(paths, {
    strokeDashoffset: 0,
    duration: DRAW_DURATION,
    ease: 'power2.inOut',
    stagger: 0.08,
  });
};

export const createObjectSelector = (
  gridEl: HTMLElement,
  reliques: readonly ReliqueData[],
  onSelect: SelectionListener,
): ObjectSelector => {
  let activeId: string | null = null;
  let activeGlowTween: gsap.core.Tween | null = null;
  let activeInkTl: gsap.core.Timeline | null = null;

  const slotElements = new Map<string, HTMLElement>();
  const svgElements = new Map<string, SVGSVGElement>();

  // Build and inject object slots
  reliques.forEach((relique) => {
    const slot = gridEl.querySelector<HTMLElement>(`[data-relique-id="${relique.id}"]`);
    if (!slot) return;

    slotElements.set(relique.id, slot);

    const svgEl = slot.querySelector<SVGSVGElement>('svg');
    if (svgEl) {
      svgElements.set(relique.id, svgEl);
      initInkPaths(svgEl);
    }

    const handleClick = (): void => {
      selectById(relique.id);
    };

    const handleKeydown = (e: KeyboardEvent): void => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectById(relique.id);
      }
    };

    slot.addEventListener('click', handleClick);
    slot.addEventListener('keydown', handleKeydown);
    slot.dataset.handler = 'bound'; // mark for cleanup
  });

  const selectById = (id: string): void => {
    if (activeId === id) return;

    // Deactivate previous slot
    if (activeId) {
      const prevSlot = slotElements.get(activeId);
      if (prevSlot) {
        prevSlot.classList.remove('is-active');
        prevSlot.setAttribute('aria-selected', 'false');
        // Kill glow pulse on deselect
        gsap.killTweensOf(prevSlot.querySelector('.grimoire__rune'));
        gsap.to(prevSlot.querySelector('.grimoire__rune'), {
          opacity: 0,
          duration: 0.4,
        });
      }
    }

    activeId = id;

    const slot = slotElements.get(id);
    const svgEl = svgElements.get(id);
    const relique = reliques.find((r) => r.id === id);

    if (!slot || !relique) return;

    slot.classList.add('is-active');
    slot.setAttribute('aria-selected', 'true');

    // Update CSS custom property for glow color
    slot.style.setProperty('--glow-color', relique.glowColor);
    const rightPage = gridEl.closest('.grimoire')?.querySelector('.grimoire__page--right');
    if (rightPage instanceof HTMLElement) {
      rightPage.style.setProperty('--active-glow', relique.glowColor);
    }

    // Ink draw animation
    if (activeInkTl) {
      activeInkTl.kill();
      activeInkTl = null;
    }
    if (svgEl) {
      activeInkTl = playInkDraw(svgEl);
    }

    // Rune pulse animation
    const runeEl = slot.querySelector<HTMLElement>('.grimoire__rune');
    if (runeEl) {
      if (activeGlowTween) {
        activeGlowTween.kill();
        activeGlowTween = null;
      }
      gsap.fromTo(
        runeEl,
        { opacity: 0 },
        {
          opacity: 0.18,
          duration: 1.2,
          ease: 'power2.out',
          onComplete: () => {
            activeGlowTween = gsap.to(runeEl, {
              opacity: 0.08,
              duration: 2.2,
              ease: 'sine.inOut',
              yoyo: true,
              repeat: -1,
            });
          },
        },
      );
    }

    onSelect(relique);
  };

  const dispose = (): void => {
    activeGlowTween?.kill();
    activeInkTl?.kill();
    // Remove event listeners by re-cloning each slot (simplest cleanup)
    slotElements.forEach((slot) => {
      const clone = slot.cloneNode(true) as HTMLElement;
      slot.replaceWith(clone);
    });
    slotElements.clear();
    svgElements.clear();
  };

  return { selectById, dispose };
};
