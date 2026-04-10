// Version de secours de la section hero pour les navigateurs sans WebGL.
// Si le navigateur ne supporte pas la 3D, affiche simplement le titre
// "LUV RESVAL" en CSS avec une animation de scroll basique.

import gsap from 'gsap';
import type { SectionInitializer } from '../types';
import { getSectionSelector, SECTION_IDS } from '../definitions';

/**
 * Fallback HTML/CSS implementation of the hero section
 * for browsers without WebGL support.
 */
const initHeroFallback: SectionInitializer = (_context) => {
  const heroElement = document.querySelector(getSectionSelector(SECTION_IDS.HERO));
  if (!heroElement) {
    console.warn('Hero section element not found for fallback');
    return {
      update: () => undefined,
      dispose: () => undefined,
    };
  }

  // Create fallback title element
  const titleContainer = document.createElement('div');
  titleContainer.className = 'hero-fallback-title';
  titleContainer.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: clamp(2.6rem, 11vw, 8rem);
    font-weight: 800;
    letter-spacing: 0.06em;
    color: #ffffff;
    text-align: center;
    z-index: 10;
    pointer-events: none;
    text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
  `;
  titleContainer.textContent = 'LUV RESVAL';

  const contentDiv = heroElement.querySelector('.section-content');
  if (contentDiv) {
    contentDiv.appendChild(titleContainer);
  }

  // Animate title on scroll
  const timeline = gsap.timeline({
    scrollTrigger: {
      trigger: heroElement,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    },
  });

  timeline
    .to(titleContainer, {
      opacity: 0.35,
      y: -70,
      ease: 'none',
    })
    .to(
      titleContainer,
      {
        scale: 0.85,
        ease: 'none',
      },
      0,
    );

  return {
    update: () => undefined,
    dispose: () => {
      timeline.kill();
      titleContainer.remove();
    },
  };
};

export default initHeroFallback;
