// Utilitaires 3D partagés entre les prévisualisations de modèles GLB.
// Centralise fitModel (ajustement d'échelle + centrage) et les constantes
// d'animation GSAP (durées, easings) utilisées par menuPreview3D et reliquesPreview3D.

import * as THREE from 'three';

// ── Constantes d'animation GSAP ───────────────────────────────────────────────

/** Durée de la transition d'entrée d'un modèle (apparition). */
export const ANIM_DURATION_IN = 0.35;
/** Durée de la transition de sortie d'un modèle (disparition). */
export const ANIM_DURATION_OUT = 0.22;
/** Easing entrée : légère élastique pour un effet de "rebond". */
export const ANIM_EASE_IN = 'back.out(1.3)';
/** Easing sortie : accélération douce vers la fin. */
export const ANIM_EASE_OUT = 'power2.in';

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Ajuste l'échelle d'un modèle 3D pour que sa dimension maximale corresponde
 * à `targetDimension`, puis le recentre sur l'origine locale de son groupe parent.
 *
 * @param model           - Objet THREE.js à mettre à l'échelle et centrer
 * @param targetDimension - Taille cible en unités monde (axe le plus long)
 */
export const fitModel = (model: THREE.Object3D, targetDimension: number): void => {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = maxDim > 0 ? targetDimension / maxDim : 1;
  model.scale.setScalar(scale);

  // Recentrage sur l'origine locale du groupe
  const scaledBox = new THREE.Box3().setFromObject(model);
  const center = scaledBox.getCenter(new THREE.Vector3());
  model.position.sub(center);
};
