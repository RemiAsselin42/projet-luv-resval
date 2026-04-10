// Animations de parallax de la section hero au scroll.
// Au fil du défilement, la télévision CRT recule progressivement dans la scène 3D
// pour créer un effet de profondeur et laisser place au menu.

import gsap from 'gsap';
import * as THREE from 'three';

interface HeroScrollTimelines {
  heroTimeline: gsap.core.Timeline | null;
}

export const createHeroScrollTimelines = (
  heroElement: Element | null,
  menuElement: Element | null,
  crt: { mesh: { position: THREE.Vector3 }; setFade: (v: number) => void },
): HeroScrollTimelines => {
  const heroTimeline =
    heroElement && menuElement
      ? gsap.timeline({
        scrollTrigger: {
          trigger: heroElement,
          start: 'top top',
          endTrigger: menuElement,
          end: 'bottom top',
          scrub: true,
        },
      })
      : null;

  if (heroTimeline) {
    heroTimeline.to(crt.mesh.position, { z: -2.5, ease: 'none' });
  }

  return { heroTimeline };
};
