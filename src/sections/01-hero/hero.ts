import gsap from 'gsap';
import type { SectionInitializer } from '../types';

const splitHeroTitleIntoLetters = (): HTMLElement[] => {
  const titleElement = document.querySelector('[data-hero-title]');

  if (!(titleElement instanceof HTMLElement)) {
    return [];
  }

  const text = (titleElement.dataset.label ?? titleElement.textContent ?? '').trim();
  titleElement.textContent = '';

  const letterElements: HTMLElement[] = [];

  for (const character of text) {
    const span = document.createElement('span');
    span.className = 'hero-letter';
    span.textContent = character === ' ' ? '\u00A0' : character;
    titleElement.appendChild(span);
    letterElements.push(span);
  }

  return letterElements;
};

const createLetterHoverEffect = (letterElements: HTMLElement[]): (() => void)[] => {
  return letterElements.map((letterElement) => {
    const onEnter = (): void => {
      gsap.to(letterElement, {
        y: -8,
        scale: 1.06,
        duration: 0.2,
        ease: 'power2.out',
      });
    };

    const onLeave = (): void => {
      gsap.to(letterElement, {
        y: 0,
        scale: 1,
        duration: 0.25,
        ease: 'power2.out',
      });
    };

    letterElement.addEventListener('pointerenter', onEnter);
    letterElement.addEventListener('pointerleave', onLeave);

    return () => {
      letterElement.removeEventListener('pointerenter', onEnter);
      letterElement.removeEventListener('pointerleave', onLeave);
    };
  });
};

const initHeroSection: SectionInitializer = (_context) => {
  const letterElements = splitHeroTitleIntoLetters();
  const removeListeners = createLetterHoverEffect(letterElements);
  const heroTimeline = _context.scrollManager.createSectionTimeline({
    sectionId: 'hero',
    start: 'top top',
    end: 'bottom top',
    scrub: true,
  });

  if (heroTimeline) {
    heroTimeline
      .fromTo(
        '[data-hero-title]',
        {
          opacity: 1,
          y: 0,
        },
        {
          opacity: 0.35,
          y: -70,
          ease: 'none',
        },
      )
      .fromTo(
        '.hero-letter',
        {
          rotationX: 0,
        },
        {
          rotationX: 18,
          stagger: 0.015,
          ease: 'none',
        },
        0,
      );
  }

  return {
    update: () => {
      return;
    },
    dispose: () => {
      removeListeners.forEach((removeListener) => removeListener());
      heroTimeline?.kill();
      gsap.killTweensOf(letterElements);
    },
  };
};

export default initHeroSection;
