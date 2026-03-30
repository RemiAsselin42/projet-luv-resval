import gsap from 'gsap';
import type { ReliqueData } from '../data/reliques-data';

export interface TextReveal {
  reveal: (relique: ReliqueData) => void;
  dispose: () => void;
}

export const createTextReveal = (
  titleEl: HTMLElement,
  subtitleEl: HTMLElement,
  bodyEl: HTMLElement,
): TextReveal => {
  let currentTl: gsap.core.Timeline | null = null;

  const reveal = (relique: ReliqueData): void => {
    // Kill previous animation immediately
    if (currentTl) {
      currentTl.kill();
      currentTl = null;
    }

    const tl = gsap.timeline();
    currentTl = tl;

    // Fade out current content
    tl.to([titleEl, subtitleEl, bodyEl], {
      opacity: 0,
      y: -6,
      filter: 'blur(3px)',
      duration: 0.22,
      ease: 'power2.in',
      stagger: 0.04,
    });

    // Swap content mid-transition
    tl.add(() => {
      titleEl.textContent = relique.name;
      subtitleEl.textContent = relique.subtitle;
      bodyEl.innerHTML = relique.description;
    });

    // Reveal new content — ink settling on paper effect
    tl.fromTo(
      titleEl,
      { opacity: 0, y: 10, filter: 'blur(4px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.55, ease: 'power2.out' },
    );

    tl.fromTo(
      subtitleEl,
      { opacity: 0, y: 8, filter: 'blur(3px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.45, ease: 'power2.out' },
      '<0.1',
    );

    // Reveal body paragraphs one by one
    const paragraphs = Array.from(bodyEl.querySelectorAll('p, em, strong'));
    const targets = paragraphs.length > 0 ? paragraphs : [bodyEl];

    tl.fromTo(
      targets,
      { opacity: 0, y: 6, filter: 'blur(2px)' },
      {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.5,
        ease: 'power2.out',
        stagger: 0.12,
      },
      '<0.15',
    );
  };

  const dispose = (): void => {
    currentTl?.kill();
    currentTl = null;
  };

  return { reveal, dispose };
};
