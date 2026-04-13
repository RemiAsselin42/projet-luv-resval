// Centralise les animations Z de la TV CRT liées au scroll global.
// Les positions Z définissent la profondeur apparente de la TV selon la section active.
// Note : le retour à Z=0 pour le crash outro est géré dans crashOutro.ts (transitionTimeline).

import gsap from 'gsap';
import type * as THREE from 'three';

// ── Constantes Z ────────────────────────────────────────────────────────────

/** Positions Z de référence de la TV CRT (axe caméra : positif = plus proche). */
export const CRT_Z = {
  /** Début (hero) et fin (crash outro) — TV au premier plan. */
  NEAR:  0,
  /** Après le parallax hero. Valeur stable sur le menu et les Reliques. */
  MID:  -0.5,
  /** Après le parallax MPC. Valeur au moment d'entrer dans le crash outro. */
  FAR:  -2.0,
} as const;

// ── Factory ─────────────────────────────────────────────────────────────────

export interface CrtZParallax {
  dispose(): void;
}

/**
 * Crée les parallaxes Z de la TV CRT pour le hero et la section MPC.
 *
 *   Hero  :  0   → -0.5   (du top du hero jusqu'à sa sortie)
 *   MPC   : -0.5 → -2.0   (start: top top, end: bottom 80%)
 *
 * Pourquoi `end: 'bottom 80%'` pour le dezoom MPC ?
 *   La transitionTimeline de crashOutro démarre à 'top 80%', ce qui correspond
 *   (pour des sections adjacentes) au même scroll que 'bottom 80%' sur mpcEl.
 *   Le dezoom se termine donc juste avant que crashOutro reprenne Z via son
 *   propre scrub (FAR → NEAR). Sans ça, mpcZTimeline continuerait d'écrire
 *   mesh.position.z après la fin de la transitionTimeline et ferait rétrécir
 *   la TV dans l'outro.
 *
 * @param heroEl  Element de la section hero
 * @param mpcEl   Element de la section MPC
 * @param mesh    Mesh Three.js de la TV CRT
 */
export const createCrtZParallax = (
  heroEl: Element,
  mpcEl: Element,
  mesh: THREE.Mesh,
): CrtZParallax => {

  // ── Hero : 0 → -0.5 ────────────────────────────────────────────────────────
  const heroZState = { z: CRT_Z.NEAR };
  const heroZTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: heroEl,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
    },
  }).to(heroZState, {
    z: CRT_Z.MID,
    ease: 'none',
    onUpdate: () => { mesh.position.z = heroZState.z; },
  });

  // ── MPC : -0.5 → -2.0 ──────────────────────────────────────────────────────
  // `end: 'bottom 80%'` : le dezoom se termine au même scroll que le début de
  // la transitionTimeline du crash outro ('top 80%'), évitant le conflit Z.
  const mpcZState = { z: CRT_Z.MID };
  const mpcZTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: mpcEl,
      start: 'top top',
      end: 'bottom 80%',
      scrub: true,
    },
  }).to(mpcZState, {
    z: CRT_Z.FAR,
    ease: 'none',
    onUpdate: () => { mesh.position.z = mpcZState.z; },
  });

  return {
    dispose: () => {
      heroZTimeline.scrollTrigger?.kill();
      heroZTimeline.kill();
      mpcZTimeline.scrollTrigger?.kill();
      mpcZTimeline.kill();
    },
  };
};
