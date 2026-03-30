import gsap from 'gsap';
import * as THREE from 'three';

interface HeroScrollTimelines {
  heroTimeline: gsap.core.Timeline | null;
  faceVaderFadeTimeline: gsap.core.Timeline | null;
  /** Retourne l'opacité courante du CRT (1 = visible, 0 = éteint). */
  getCrtFade: () => number;
}

export const createHeroScrollTimelines = (
  heroElement: Element | null,
  menuElement: Element | null,
  faceVaderElement: Element | null,
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

  const fadeTvState = { fade: 1 };
  const faceVaderFadeTimeline = faceVaderElement
    ? gsap.timeline({
      scrollTrigger: {
        trigger: faceVaderElement,
        start: 'top bottom',
        end: 'top 40%',
        scrub: true,
      },
    })
    : null;

  if (faceVaderFadeTimeline) {
    faceVaderFadeTimeline.to(fadeTvState, {
      fade: 0,
      ease: 'none',
      onUpdate: () => crt.setFade(fadeTvState.fade),
    });
  }

  return { heroTimeline, faceVaderFadeTimeline };
};
